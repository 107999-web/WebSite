# common.ps1 — Setup / Sync 共用的函式
# 每個網站資料夾都是獨立的：帳號、token、遠端位址都存在「這個資料夾的 .git」裡，
# 所以 A 資料夾和 B 資料夾可以各自部署到不同的 GitHub 帳號，互不干擾。

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}
Add-Type -AssemblyName System.Security

$script:SiteRoot    = Split-Path -Parent $PSScriptRoot
$script:GitDir      = Join-Path $script:SiteRoot '.git'
$script:AccountFile = Join-Path $script:GitDir 'wsdeploy-account.dat'
$script:ConfigFile  = Join-Path $script:SiteRoot 'site-config.json'
# 測試用：可改成本機假的 API 伺服器
$script:ApiBase     = if ($env:WSDEPLOY_API) { $env:WSDEPLOY_API.TrimEnd('/') } else { 'https://api.github.com' }
$script:HelperCmd   = '!powershell.exe -NoProfile -ExecutionPolicy Bypass -File _tools/cred-helper.ps1'

Set-Location $script:SiteRoot

# ---------- 畫面輸出 ----------
function Say  ([string]$m) { Write-Host $m }
function Info ([string]$m) { Write-Host "  $m" -ForegroundColor Cyan }
function Ok   ([string]$m) { Write-Host "  [OK] $m" -ForegroundColor Green }
function Warn ([string]$m) { Write-Host "  [注意] $m" -ForegroundColor Yellow }
function Fail ([string]$m) { Write-Host "  [錯誤] $m" -ForegroundColor Red }
function Title([string]$m) { Write-Host ""; Write-Host "=== $m ===" -ForegroundColor Magenta }

function Ask-YesNo([string]$q, [bool]$default = $true) {
    $hint = if ($default) { '(Y/n)' } else { '(y/N)' }
    $a = Read-Host "  $q $hint"
    if ([string]::IsNullOrWhiteSpace($a)) { return $default }
    return $a.Trim().ToLower().StartsWith('y')
}

# ---------- git ----------
# 執行 git，回傳 @{ Code; Out }（stdout+stderr 合併的文字）
function Run-Git {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
    $out = & git @GitArgs 2>&1 | ForEach-Object { "$_" }
    return [PSCustomObject]@{ Code = $LASTEXITCODE; Out = ($out -join "`n") }
}
function Git-Get([string]$key) {
    $r = Run-Git config --local --get $key
    if ($r.Code -eq 0) { return $r.Out.Trim() } else { return $null }
}
function Test-GitInstalled { return [bool](Get-Command git -ErrorAction SilentlyContinue) }
function Test-IsRepo { return (Test-Path (Join-Path $script:GitDir 'HEAD')) }

# 目前這個資料夾綁定的帳號；沒有就回傳 $null
function Get-Binding {
    if (-not (Test-IsRepo)) { return $null }
    $login = Git-Get 'wsdeploy.login'
    $repo  = Git-Get 'wsdeploy.repo'
    if (-not $login -or -not $repo) { return $null }
    return [PSCustomObject]@{ Login = $login; Repo = $repo; Remote = (Git-Get 'remote.origin.url') }
}

function Get-SiteUrl([string]$login, [string]$repo) {
    if ($repo.ToLower() -eq "$($login.ToLower()).github.io") { return "https://$($login.ToLower()).github.io/" }
    return "https://$($login.ToLower()).github.io/$repo/"
}

# 只讓這個資料夾用自己的 token：清掉 Windows 共用的登入（Git Credential Manager），改用 cred-helper.ps1
function Set-GitAuthConfig {
    Run-Git config --local --unset-all credential.helper | Out-Null
    # 空字串＝清空前面（系統、使用者層級）設定的所有 helper。PowerShell 5.1 會吃掉空字串參數，所以寫成 '""'
    & git config --local --add credential.helper '""' 2>&1 | Out-Null
    Run-Git config --local --add credential.helper $script:HelperCmd | Out-Null
}
function Test-GitAuthConfig {
    $r = Run-Git config --local --get-all credential.helper
    $vals = @($r.Out -split "`n" | ForEach-Object { $_.Trim() })
    return ($r.Code -eq 0 -and $vals.Count -eq 2 -and $vals[0] -eq '' -and $vals[1] -eq $script:HelperCmd)
}

function Set-Binding([string]$login, [string]$repo, [string]$name, [string]$email) {
    $remote = "https://$login@github.com/$login/$repo.git"
    if ($env:WSDEPLOY_REMOTE_OVERRIDE) { $remote = $env:WSDEPLOY_REMOTE_OVERRIDE }  # 測試用
    $has = Run-Git remote get-url origin
    if ($has.Code -eq 0) { Run-Git remote set-url origin $remote | Out-Null }
    else { Run-Git remote add origin $remote | Out-Null }
    Run-Git config --local user.name  $name  | Out-Null
    Run-Git config --local user.email $email | Out-Null
    Run-Git config --local wsdeploy.login $login | Out-Null
    Run-Git config --local wsdeploy.repo  $repo  | Out-Null
    Run-Git config --local --unset wsdeploy.pages | Out-Null
    Run-Git config --local core.quotepath false | Out-Null
    Set-GitAuthConfig
}

# ---------- token（Windows DPAPI 加密，只有這台電腦的這個 Windows 帳號解得開） ----------
function Save-Token([string]$login, [string]$token) {
    $enc = ConvertTo-SecureString $token -AsPlainText -Force | ConvertFrom-SecureString
    [IO.File]::WriteAllText($script:AccountFile, "$login`n$enc`n", (New-Object Text.UTF8Encoding $false))
}
function Read-Token {
    if (-not (Test-Path $script:AccountFile)) { return $null }
    try {
        $lines = [IO.File]::ReadAllLines($script:AccountFile)
        $ss = ConvertTo-SecureString $lines[1].Trim()
        return (New-Object System.Net.NetworkCredential('', $ss)).Password
    } catch { return $null }
}

# ---------- GitHub API ----------
function Invoke-GitHub([string]$Method, [string]$Path, $Body, [string]$Token) {
    $headers = @{
        'Authorization'        = "token $Token"
        'Accept'               = 'application/vnd.github+json'
        'User-Agent'           = 'WebSite-V2-Deploy'
        'X-GitHub-Api-Version' = '2022-11-28'
    }
    $params = @{ Uri = "$($script:ApiBase)$Path"; Method = $Method; Headers = $headers; UseBasicParsing = $true; TimeoutSec = 30 }
    if ($null -ne $Body) {
        $params.Body = [Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 5 -Compress))
        $params.ContentType = 'application/json; charset=utf-8'
    }
    try {
        $resp = Invoke-WebRequest @params
        $data = $null
        if ($resp.Content) {
            $text = if ($resp.Content -is [byte[]]) { [Text.Encoding]::UTF8.GetString($resp.Content) } else { [string]$resp.Content }
            if ($text.Trim()) { try { $data = $text | ConvertFrom-Json } catch {} }
        }
        return [PSCustomObject]@{ Status = [int]$resp.StatusCode; Data = $data; Headers = $resp.Headers; Error = $null }
    } catch {
        $status = 0; $msg = $_.Exception.Message
        $r = $_.Exception.Response
        if ($r) {
            $status = [int]$r.StatusCode
            try {
                $sr = New-Object IO.StreamReader($r.GetResponseStream())
                $j = $sr.ReadToEnd() | ConvertFrom-Json
                if ($j.message) { $msg = $j.message }
            } catch {}
        }
        return [PSCustomObject]@{ Status = $status; Data = $null; Headers = $null; Error = $msg }
    }
}

# 確認 GitHub Pages 已開啟，而且來源是 GitHub Actions。回傳 'ok' / 'enabled'（剛開啟）/ 'fail'
function Ensure-Pages([string]$login, [string]$repo, [string]$token) {
    $p = Invoke-GitHub GET "/repos/$login/$repo/pages" $null $token
    if ($p.Status -eq 200) {
        if ($p.Data.build_type -ne 'workflow') {
            $u = Invoke-GitHub PUT "/repos/$login/$repo/pages" @{ build_type = 'workflow' } $token
            if ($u.Status -ge 300) { Warn "無法把 Pages 來源改成 GitHub Actions：$($u.Error)"; return 'fail' }
            return 'enabled'
        }
        return 'ok'
    }
    if ($p.Status -eq 404) {
        $c = Invoke-GitHub POST "/repos/$login/$repo/pages" @{ build_type = 'workflow' } $token
        if ($c.Status -eq 201 -or $c.Status -eq 200) { return 'enabled' }
        Warn "無法自動開啟 GitHub Pages：$($c.Error)"
        return 'fail'
    }
    Warn "查詢 GitHub Pages 狀態失敗：$($p.Error)"
    return 'fail'
}

# 手動觸發一次部署（第一次開啟 Pages 時，push 觸發的那次部署可能已經失敗）
function Start-Deploy([string]$login, [string]$repo, [string]$token) {
    for ($i = 0; $i -lt 5; $i++) {
        $d = Invoke-GitHub POST "/repos/$login/$repo/actions/workflows/deploy.yml/dispatches" @{ ref = 'main' } $token
        if ($d.Status -eq 204) { return $true }
        Start-Sleep -Seconds 3
    }
    return $false
}
