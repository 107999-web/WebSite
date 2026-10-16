# setup.ps1 — 把「這個資料夾」綁定到一個 GitHub 帳號（由 Setup.bat 呼叫）
# 第一次使用、換帳號、換 repo、token 過期，都是重新執行這個。
# 參數只給自動測試用；平常雙擊 Setup.bat 會一步一步問。
param(
    [string]$Token,
    [string]$Repo,
    [string]$SiteTitle,
    [switch]$Yes,        # 全部用預設值回答
    [switch]$NoDeploy    # 設定完不要馬上部署
)
. (Join-Path $PSScriptRoot 'common.ps1')

function Stop-Setup([string]$msg) { Fail $msg; exit 1 }
function AskYN([string]$q, [bool]$d = $true) { if ($Yes) { return $d }; return (Ask-YesNo $q $d) }

Title '設定這個資料夾要部署到哪個 GitHub 帳號'
Info "資料夾：$($script:SiteRoot)"
if (-not (Test-GitInstalled)) { Stop-Setup '找不到 Git，請先安裝：https://git-scm.com/download/win' }

$old = Get-Binding
if ($old) {
    Info "目前綁定：帳號 $($old.Login)　repo $($old.Repo)"
    Info "網址：$(Get-SiteUrl $old.Login $old.Repo)"
    if (-not (AskYN '要重新設定（換帳號、換 repo 或更新 token）嗎？' $true)) { exit 0 }
} else {
    Info '目前還沒有綁定任何帳號。'
}

# ---------- 1. token ----------
Title '步驟 1：輸入 GitHub token'
if (-not $Token) {
    Say '  token 就像這個資料夾專用的「部署鑰匙」，每個 GitHub 帳號要各自建立一組。'
    Say '  建立方式：登入「要部署的那個帳號」→ 建立 token（classic）→ 勾選 repo 和 workflow。'
    Say '  ※ 瀏覽器若登入的是別的帳號，請先登出或改用無痕視窗。'
    if (Ask-YesNo '要現在開啟建立 token 的網頁嗎？' $true) {
        Start-Process 'https://github.com/settings/tokens/new?scopes=repo,workflow&description=WebSite-Deploy'
    }
    $sec = Read-Host '  請貼上 token（畫面不會顯示，貼上後按 Enter）' -AsSecureString
    $Token = (New-Object System.Net.NetworkCredential('', $sec)).Password
}
$Token = $Token.Trim()
if (-not $Token) { Stop-Setup '沒有輸入 token。' }

$me = Invoke-GitHub GET '/user' $null $Token
if ($me.Status -eq 401) { Stop-Setup 'token 不正確或已過期，請重新建立一組。' }
if ($me.Status -ne 200) { Stop-Setup "無法連到 GitHub：$($me.Error)" }
$login = [string]$me.Data.login
$uid = [string]$me.Data.id
$displayName = if ($me.Data.name) { [string]$me.Data.name } else { $login }
Ok "這組 token 屬於帳號：$login"

$scopes = $null
if ($me.Headers) {
    foreach ($k in $me.Headers.Keys) {
        if ($k -ieq 'X-OAuth-Scopes') { $scopes = @(([string]$me.Headers[$k]).Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ }) }
    }
}
if ($null -ne $scopes) {
    $missing = @('repo', 'workflow' | Where-Object { $scopes -notcontains $_ })
    if ($missing.Count) { Stop-Setup ("token 少了權限：" + ($missing -join '、') + "。請重新建立 token 並勾選 repo 和 workflow。") }
} else {
    Warn '這是 fine-grained token：請確認有這個 repo 的 Contents、Workflows、Pages 讀寫權限（建立新 repo 還需要 Administration）。'
}
if ($old -and $old.Login -ne $login) { Warn "帳號從 $($old.Login) 換成 $login" }

# ---------- 2. repo ----------
Title '步驟 2：選擇 repo（網站的儲存庫）'
$defRepo = if ($old -and $old.Login -eq $login) { $old.Repo } else { 'WebSite' }
if (-not $Repo) {
    if ($Yes) { $Repo = $defRepo } else {
        Say "  網址會是 https://$($login.ToLower()).github.io/<repo 名稱>/"
        $Repo = Read-Host "  repo 名稱（直接按 Enter＝$defRepo）"
        if ([string]::IsNullOrWhiteSpace($Repo)) { $Repo = $defRepo }
    }
}
$Repo = $Repo.Trim()
if ($Repo -notmatch '^[A-Za-z0-9._-]+$') { Stop-Setup 'repo 名稱只能用英文字母、數字、- _ .' }

$r = Invoke-GitHub GET "/repos/$login/$Repo" $null $Token
if ($r.Status -eq 200) {
    $Repo = [string]$r.Data.name
    if ($r.Data.permissions -and -not $r.Data.permissions.push) { Stop-Setup "帳號 $login 沒有 $Repo 的寫入權限。" }
    if ($r.Data.private) { Warn '這個 repo 是私人的：免費帳號的 GitHub Pages 只能用在公開 repo。' }
    Ok "使用既有的 repo：$login/$Repo"
} elseif ($r.Status -eq 404) {
    if (-not (AskYN "GitHub 上還沒有 $login/$Repo，要幫你建立（公開）嗎？" $true)) { Stop-Setup '請先在 GitHub 建立 repo，再重新執行 Setup.bat。' }
    $c = Invoke-GitHub POST '/user/repos' @{ name = $Repo; private = $false; auto_init = $false; description = 'My website (GitHub Pages)' } $Token
    if ($c.Status -ne 201) { Stop-Setup "建立 repo 失敗：$($c.Error)" }
    Ok "已建立 repo：$login/$Repo"
} else {
    Stop-Setup "查詢 repo 失敗：$($r.Error)"
}

# ---------- 3. 網站標題 ----------
Title '步驟 3：網站標題（顯示在首頁最上面）'
$utf8 = New-Object Text.UTF8Encoding $false
$cfg = [PSCustomObject]@{ title = '我的網頁小天地'; subtitle = '點一下資料夾就能展開，點網頁就能開啟' }
if (Test-Path $script:ConfigFile) {
    try { $cfg = [IO.File]::ReadAllText($script:ConfigFile, $utf8) | ConvertFrom-Json } catch {}
}
if (-not $SiteTitle) {
    if ($Yes) { $SiteTitle = $cfg.title } else {
        $SiteTitle = Read-Host "  網站標題（直接按 Enter＝$($cfg.title)）"
        if ([string]::IsNullOrWhiteSpace($SiteTitle)) { $SiteTitle = $cfg.title }
    }
}
$cfg.title = $SiteTitle.Trim()
[IO.File]::WriteAllText($script:ConfigFile, ($cfg | ConvertTo-Json), $utf8)
Ok "網站標題：$($cfg.title)"

# ---------- 4. 本機 git ----------
Title '步驟 4：設定這個資料夾'
if ((Test-IsRepo) -and $old -and ($old.Login -ne $login -or $old.Repo -ne $Repo)) {
    Say "  這個資料夾原本部署到 $($old.Login)/$($old.Repo)，現在要改成 $login/$Repo。"
    Say '  1 = 保留原本的修改紀錄，一起推到新的 repo（一般選這個）'
    Say '  2 = 從頭開始新的紀錄（舊紀錄搬到 _備份\ 資料夾，不會刪除）'
    $choice = if ($Yes) { '1' } else { Read-Host '  請輸入 1 或 2（直接按 Enter＝1）' }
    if ($choice -eq '2') {
        $bak = Join-Path $script:SiteRoot ('_備份\舊的git紀錄_' + (Get-Date).ToString('yyyyMMdd_HHmmss'))
        New-Item -ItemType Directory -Force (Split-Path $bak) | Out-Null
        Move-Item -LiteralPath $script:GitDir -Destination $bak
        Ok "舊紀錄已搬到 $bak"
    }
}
if (-not (Test-IsRepo)) {
    $i = Run-Git init -q
    if ($i.Code -ne 0) { Stop-Setup "git init 失敗：$($i.Out)" }
    Run-Git symbolic-ref HEAD refs/heads/main | Out-Null
    Ok '已建立本機儲存庫'
}
# commit 的作者用 GitHub 提供的 noreply 信箱，公開的 repo 才不會露出真正的 Email
$email = "$uid+$login@users.noreply.github.com"
Set-Binding $login $Repo $displayName $email
Save-Token $login $Token
if (-not (Test-GitAuthConfig)) { Stop-Setup '寫入登入設定失敗。' }
Ok "已綁定：$login/$Repo（作者 $displayName <$email>）"

$siteUrl = Get-SiteUrl $login $Repo
[IO.File]::WriteAllText((Join-Path $script:SiteRoot 'MyWebsite.url'), "[InternetShortcut]`r`nURL=$siteUrl`r`n", [Text.Encoding]::ASCII)
Ok "網站捷徑 MyWebsite.url → $siteUrl"

# ---------- 5. 部署 ----------
if ($NoDeploy) { exit 0 }
if (AskYN '要現在就部署一次嗎？' $true) {
    & (Join-Path $PSScriptRoot 'sync.ps1')
    exit $LASTEXITCODE
}
Info '之後雙擊 Sync.bat 就會部署。'
exit 0
