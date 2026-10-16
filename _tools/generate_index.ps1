# generate_index.ps1 — 走訪 Htmls\ 整個樹狀結構（不限層數），產生根目錄的 index.html
#
# 規則：
#   * 收錄 .html / .htm
#   * 名稱以 _ 或 . 開頭的檔案與資料夾不列入索引（例如 _草稿、_備份）
#   * 資料夾內有 index.html：資料夾本身可以直接點開（「首頁」），index.html 不再重複列出
#   * 沒有任何網頁的資料夾（例如只放圖片、js 的 assets）不顯示
#   * 版型在 _tools\index_template.html，要改外觀改那個檔，index.html 是產生出來的
param(
    [string]$HtmlsDir,
    [string]$OutFile,
    [string]$ConfigFile,
    [string]$Template
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not $HtmlsDir)   { $HtmlsDir   = Join-Path $root 'Htmls' }
if (-not $OutFile)    { $OutFile    = Join-Path $root 'index.html' }
if (-not $ConfigFile) { $ConfigFile = Join-Path $root 'site-config.json' }
if (-not $Template)   { $Template   = Join-Path $PSScriptRoot 'index_template.html' }

$utf8 = New-Object System.Text.UTF8Encoding $false
$htmlsName = Split-Path -Leaf $HtmlsDir

# 自然排序：「單元2」排在「單元10」前面
function SortKey([string]$s) { [regex]::Replace($s.ToLower(), '\d+', { param($m) $m.Value.PadLeft(8, '0') }) }

function J([string]$s) {
    if ($null -eq $s) { return 'null' }
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.Append('"')
    foreach ($ch in $s.ToCharArray()) {
        switch ($ch) {
            '"'  { [void]$sb.Append('\"') }
            '\'  { [void]$sb.Append('\\') }
            '<'  { [void]$sb.Append('<') }
            '>'  { [void]$sb.Append('>') }
            '&'  { [void]$sb.Append('&') }
            default {
                if ([int]$ch -lt 32 -or [int]$ch -eq 0x2028 -or [int]$ch -eq 0x2029) { [void]$sb.AppendFormat('\u{0:x4}', [int]$ch) }
                else { [void]$sb.Append($ch) }
            }
        }
    }
    [void]$sb.Append('"')
    return $sb.ToString()
}

# 讀網頁的 <title>（只讀前 64KB，檔案很多時才快）
function Get-PageTitle([string]$path) {
    try {
        $sr = New-Object System.IO.StreamReader($path, $utf8, $true)
        $buf = New-Object char[] 65536
        $n = $sr.Read($buf, 0, $buf.Length)
        $sr.Close()
        $text = New-Object string($buf, 0, $n)
        $m = [regex]::Match($text, '<title[^>]*>([\s\S]*?)</title>', 'IgnoreCase')
        if (-not $m.Success) { return '' }
        $t = [System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value) -replace '\s+', ' '
        $t = $t.Trim()
        if ($t.Contains([char]0xFFFD)) { return '' }   # 不是 UTF-8 的檔案，標題會變亂碼，乾脆不顯示
        return $t
    } catch { return '' }
}

function Fmt([datetime]$d) { $d.ToString('yyyy-MM-dd HH:mm') }

$script:pageCount = 0
$script:folderCount = 0

# 回傳 @{ json; count; mtime }；資料夾裡沒有網頁就回傳 $null
function Build-Node([System.IO.DirectoryInfo]$dir, [string]$rel, [bool]$isRoot) {
    $items = @(Get-ChildItem -LiteralPath $dir.FullName -Force -ErrorAction SilentlyContinue |
               Where-Object { -not $_.Name.StartsWith('_') -and -not $_.Name.StartsWith('.') })
    $files = @($items | Where-Object { -not $_.PSIsContainer -and $_.Extension -match '^\.html?$' } |
               Sort-Object { SortKey $_.Name })
    $dirs  = @($items | Where-Object { $_.PSIsContainer } | Sort-Object { SortKey $_.Name })

    $indexFile = $null
    if (-not $isRoot) {
        $indexFile = $files | Where-Object { $_.Name -ieq 'index.html' -or $_.Name -ieq 'index.htm' } | Select-Object -First 1
        if ($indexFile) { $files = @($files | Where-Object { $_.FullName -ne $indexFile.FullName }) }
    }

    $count = 0
    $latest = [datetime]::MinValue
    $childJson = New-Object System.Collections.Generic.List[string]
    foreach ($d in $dirs) {
        $sub = Build-Node $d ($rel + '/' + $d.Name) $false
        if ($sub) {
            $childJson.Add($sub.json); $count += $sub.count
            if ($sub.mtime -gt $latest) { $latest = $sub.mtime }
        }
    }
    foreach ($f in $files) {
        $t = Get-PageTitle $f.FullName
        $childJson.Add('{"t":"f","name":' + (J ([IO.Path]::GetFileNameWithoutExtension($f.Name))) +
                       ',"title":' + (J $t) + ',"path":' + (J ($rel + '/' + $f.Name)) +
                       ',"mtime":' + (J (Fmt $f.LastWriteTime)) + '}')
        $count++; $script:pageCount++
        if ($f.LastWriteTime -gt $latest) { $latest = $f.LastWriteTime }
    }
    $indexJson = 'null'
    if ($indexFile) {
        $count++; $script:pageCount++
        if ($indexFile.LastWriteTime -gt $latest) { $latest = $indexFile.LastWriteTime }
        $indexJson = '{"path":' + (J ($rel + '/' + $indexFile.Name)) + ',"title":' + (J (Get-PageTitle $indexFile.FullName)) +
                     ',"mtime":' + (J (Fmt $indexFile.LastWriteTime)) + '}'
    }
    if ($count -eq 0) { return $null }
    if (-not $isRoot) { $script:folderCount++ }

    $json = '{"t":"d","name":' + (J $dir.Name) + ',"path":' + (J $rel) + ',"count":' + $count +
            ',"mtime":' + (J (Fmt $latest)) + ',"index":' + $indexJson + ',"children":[' + ($childJson -join ',') + ']}'
    return @{ json = $json; count = $count; mtime = $latest }
}

# ---------- 網站設定 ----------
$siteTitle = '我的網頁小天地'
$siteSub = '點一下資料夾就能展開，點網頁就能開啟'
# 字型：huninn 粉圓體／chiron 昭源圓體／iansui 芫荽／wenkai 霞鶩文楷／system 微軟正黑體
$siteFont = 'huninn'
if (Test-Path $ConfigFile) {
    try {
        $cfg = [IO.File]::ReadAllText($ConfigFile, $utf8) | ConvertFrom-Json
        if ($cfg.title) { $siteTitle = [string]$cfg.title }
        if ($cfg.subtitle) { $siteSub = [string]$cfg.subtitle }
        if ($cfg.font) { $siteFont = [string]$cfg.font }
    } catch { Write-Host "  [注意] site-config.json 格式有誤，使用預設標題" -ForegroundColor Yellow }
}

# ---------- 走訪 ----------
if (Test-Path -LiteralPath $HtmlsDir) {
    $tree = Build-Node (Get-Item -LiteralPath $HtmlsDir) $htmlsName $true
} else { $tree = $null }
$treeJson = if ($tree) { $tree.json } else { '{"t":"d","name":' + (J $htmlsName) + ',"path":' + (J $htmlsName) + ',"count":0,"mtime":"","index":null,"children":[]}' }

$generated = Fmt (Get-Date)
$data = '{"title":' + (J $siteTitle) + ',"subtitle":' + (J $siteSub) + ',"font":' + (J $siteFont) + ',"generated":' + (J $generated) +
        ',"pages":' + $script:pageCount + ',"folders":' + $script:folderCount + ',"tree":' + $treeJson + '}'

$tpl = [IO.File]::ReadAllText($Template, $utf8)
$html = $tpl.Replace('__SITE_TITLE__', [System.Net.WebUtility]::HtmlEncode($siteTitle)).Replace('__SITE_DATA__', $data)
[IO.File]::WriteAllText($OutFile, $html, $utf8)
Write-Host "  [OK] 索引已更新：$($script:pageCount) 個網頁、$($script:folderCount) 個資料夾" -ForegroundColor Green
