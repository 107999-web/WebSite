# sync.ps1 — 重新產生索引，並推送到「這個資料夾綁定的」GitHub 帳號（由 Sync.bat 呼叫）

. (Join-Path $PSScriptRoot 'common.ps1')

# 不准 git 跳出任何登入視窗或在命令列要帳密：只能用這個資料夾自己的 token
$env:GIT_TERMINAL_PROMPT = '0'
$env:GCM_INTERACTIVE = 'never'

function Stop-Sync([string]$msg) { Fail $msg; exit 1 }

Title '同步網站到 GitHub'
if (-not (Test-GitInstalled)) { Stop-Sync '找不到 Git，請先安裝：https://git-scm.com/download/win' }

$b = Get-Binding
if (-not $b) { Stop-Sync '這個資料夾還沒有綁定 GitHub 帳號，請先執行 Setup.bat。' }
$token = Read-Token
if (-not $token) { Stop-Sync '讀不到這個資料夾的 token（可能換了電腦或 Windows 帳號），請重新執行 Setup.bat。' }
if (-not (Test-GitAuthConfig)) { Set-GitAuthConfig; Info '已修復這個資料夾的登入設定。' }

$siteUrl = Get-SiteUrl $b.Login $b.Repo
Info "資料夾：$($script:SiteRoot)"
Info "帳號：$($b.Login)"
Info "部署到：github.com/$($b.Login)/$($b.Repo)"

# 1. 產生索引
& (Join-Path $PSScriptRoot 'generate_index.ps1')
if (-not $?) { Stop-Sync '產生索引失敗。' }

# 2. 提交本機修改
function Commit-All([string]$msg) {
    Run-Git add -A | Out-Null
    $st = Run-Git diff --cached --quiet
    if ($st.Code -ne 0) {
        $c = Run-Git commit -q -m $msg
        if ($c.Code -ne 0) { Stop-Sync "commit 失敗：`n$($c.Out)" }
        return $true
    }
    return $false
}
$stamp = (Get-Date).ToString('yyyy-MM-dd HH:mm')
if (Commit-All "更新網站 $stamp") { Ok '已記錄這次的修改' } else { Info '這次沒有新的修改' }

# 3. GitHub 上有別處改過的內容就先合併（例如直接在 GitHub 網頁上改過檔案）
$ls = Run-Git ls-remote --heads origin main
if ($ls.Code -ne 0) {
    if ($ls.Out -match '401|403|Authentication failed|could not read Username|Invalid username or password') {
        Stop-Sync "GitHub 拒絕登入：token 可能已過期或權限不足，請重新執行 Setup.bat。`n$($ls.Out)"
    }
    if ($ls.Out -match 'not found|Repository not found') {
        Stop-Sync "GitHub 上找不到 $($b.Login)/$($b.Repo)，請重新執行 Setup.bat。`n$($ls.Out)"
    }
    Stop-Sync "連不到 GitHub，請確認網路。`n$($ls.Out)"
}
if ($ls.Out.Trim()) {
    $f = Run-Git fetch -q origin main
    if ($f.Code -ne 0) { Stop-Sync "下載 GitHub 上的內容失敗：`n$($f.Out)" }
    $m = Run-Git merge --no-edit --allow-unrelated-histories origin/main
    if ($m.Code -ne 0) {
        $conf = @((Run-Git diff --name-only --diff-filter=U).Out -split "`n" | Where-Object { $_.Trim() })
        if ($conf.Count -eq 1 -and $conf[0].Trim() -eq 'index.html') {
            # 索引是產生出來的，衝突就直接重產
            & (Join-Path $PSScriptRoot 'generate_index.ps1') | Out-Null
            Run-Git add index.html | Out-Null
            $c = Run-Git commit -q --no-edit
            if ($c.Code -ne 0) { Stop-Sync "合併失敗：`n$($c.Out)" }
        } else {
            Run-Git merge --abort | Out-Null
            Warn ("本機和 GitHub 上都改了同一個檔案：`n      " + ($conf -join "`n      "))
            Say  '  1 = 用本機的版本（GitHub 上對這些檔案的修改會被蓋掉）'
            Say  '  2 = 用 GitHub 上的版本（本機對這些檔案的修改會被蓋掉）'
            Say  '  3 = 先不要同步，我自己處理（預設）'
            $ans = Read-Host '  請輸入 1、2 或 3'
            $side = switch ($ans) { '1' { 'ours' } '2' { 'theirs' } default { $null } }
            if (-not $side) { Stop-Sync '已取消，沒有推送任何東西，本機檔案也沒有變動。' }
            $m2 = Run-Git merge --no-edit --allow-unrelated-histories -X $side origin/main
            if ($m2.Code -ne 0) {
                Run-Git merge --abort | Out-Null
                Stop-Sync "合併失敗，已還原：`n$($m2.Out)"
            }
            Ok ($(if ($side -eq 'ours') { '已採用本機的版本' } else { '已採用 GitHub 上的版本' }))
        }
    }
    # 合併後可能多了別處新增的網頁，再產生一次索引
    & (Join-Path $PSScriptRoot 'generate_index.ps1') | Out-Null
    if (Commit-All "更新索引 $stamp") { Info '合併後已重新產生索引' }
}

# 4. 推送
Info '推送中…'
$p = Run-Git push -u origin main
if ($p.Code -ne 0) {
    if ($p.Out -match 'workflow') {
        Stop-Sync "token 沒有 workflow 權限，無法推送 .github/workflows。請重新建立 token（勾選 repo 和 workflow）後執行 Setup.bat。`n$($p.Out)"
    }
    if ($p.Out -match '401|403|Authentication failed|could not read Username|Permission') {
        Stop-Sync "GitHub 拒絕推送：token 可能已過期或沒有這個 repo 的權限，請重新執行 Setup.bat。`n$($p.Out)"
    }
    Stop-Sync "推送失敗：`n$($p.Out)"
}
Ok '已推送到 GitHub'

# 5. 第一次：自動開啟 GitHub Pages
if ((Git-Get 'wsdeploy.pages') -ne 'ok') {
    $r = Ensure-Pages $b.Login $b.Repo $token
    if ($r -eq 'enabled') {
        Ok '已開啟 GitHub Pages（來源：GitHub Actions）'
        if (Start-Deploy $b.Login $b.Repo $token) { Ok '已重新觸發部署' }
        else { Warn "請到 https://github.com/$($b.Login)/$($b.Repo)/actions 手動 Re-run 部署" }
    }
    if ($r -ne 'fail') { Run-Git config --local wsdeploy.pages ok | Out-Null }
    else { Warn "請到 https://github.com/$($b.Login)/$($b.Repo)/settings/pages 把 Source 改成 GitHub Actions" }
}

Title '完成'
Ok "約 1 分鐘後網站會更新：$siteUrl"
Info "部署進度：https://github.com/$($b.Login)/$($b.Repo)/actions"
exit 0
