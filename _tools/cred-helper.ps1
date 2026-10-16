# cred-helper.ps1 — git 的 credential helper（由 git 自動呼叫，不用手動執行）
# 從「這個資料夾的 .git\wsdeploy-account.dat」讀出帳號與加密的 token 交給 git。
# 讀不到或解不開時什麼都不輸出，git 就會直接失敗，不會跳出其他帳號的登入視窗。
param([string]$Op)
if ($Op -ne 'get') { exit 0 }

$req = @{}
while ($null -ne ($line = [Console]::In.ReadLine())) {
    if ($line -eq '') { break }
    $i = $line.IndexOf('=')
    if ($i -gt 0) { $req[$line.Substring(0, $i)] = $line.Substring($i + 1) }
}
if ($req['host'] -ne 'github.com') { exit 0 }

$file = Join-Path (Split-Path -Parent $PSScriptRoot) '.git\wsdeploy-account.dat'
if (-not (Test-Path $file)) { exit 0 }
try {
    $lines = [IO.File]::ReadAllLines($file)
    $login = $lines[0].Trim()
    $ss = ConvertTo-SecureString $lines[1].Trim()
    $token = (New-Object System.Net.NetworkCredential('', $ss)).Password
} catch { exit 0 }
if (-not $login -or -not $token) { exit 0 }

[Console]::Out.Write("username=$login`npassword=$token`n")
