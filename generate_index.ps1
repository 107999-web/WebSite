$htmlsFolder = Join-Path $PSScriptRoot "Htmls"
$files = Get-ChildItem -Path $htmlsFolder -Filter "*.html" -ErrorAction SilentlyContinue |
         Sort-Object Name

$cards = ""
foreach ($file in $files) {
    $name = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    $modified = $file.LastWriteTime.ToString("yyyy-MM-dd HH:mm")
    $cards += "    <a class=`"card`" href=`"./Htmls/$($file.Name)`">`n"
    $cards += "      <div class=`"card-icon`">&#128196;</div>`n"
    $cards += "      <div class=`"card-info`">`n"
    $cards += "        <div class=`"card-title`">$name</div>`n"
    $cards += "        <div class=`"card-date`">$modified</div>`n"
    $cards += "      </div>`n"
    $cards += "    </a>`n"
}

if ($cards -eq "") {
    $cards = "    <p class=`"empty`">&#30446;&#21069;&#27809;&#26377;&#20219;&#20309;&#32178;&#38913;&#12290;</p>`n"
}

$count = $files.Count
$generated = Get-Date -Format "yyyy-MM-dd HH:mm"

$html = "<!DOCTYPE html>`n"
$html += "<html lang=`"zh-TW`">`n"
$html += "<head>`n"
$html += "  <meta charset=`"UTF-8`">`n"
$html += "  <meta name=`"viewport`" content=`"width=device-width, initial-scale=1.0`">`n"
$html += "  <title>&#32178;&#38913;&#32034;&#24341;</title>`n"
$html += "  <style>`n"
$html += "    * { box-sizing: border-box; margin: 0; padding: 0; }`n"
$html += "    body { font-family: 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; padding: 40px 20px; }`n"
$html += "    header { text-align: center; margin-bottom: 48px; }`n"
$html += "    header h1 { font-size: 2.2rem; font-weight: 700; background: linear-gradient(90deg, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px; }`n"
$html += "    header p { color: #94a3b8; font-size: 0.95rem; }`n"
$html += "    .stats { display: flex; justify-content: center; gap: 32px; margin-bottom: 40px; }`n"
$html += "    .stat { text-align: center; }`n"
$html += "    .stat-num { font-size: 2rem; font-weight: 700; color: #38bdf8; }`n"
$html += "    .stat-label { font-size: 0.8rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }`n"
$html += "    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; max-width: 1000px; margin: 0 auto; }`n"
$html += "    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 16px; text-decoration: none; color: inherit; transition: all 0.2s ease; }`n"
$html += "    .card:hover { border-color: #38bdf8; background: #1e3a5f; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(56,189,248,0.15); }`n"
$html += "    .card-icon { font-size: 2rem; flex-shrink: 0; }`n"
$html += "    .card-title { font-size: 1.05rem; font-weight: 600; color: #f1f5f9; margin-bottom: 4px; }`n"
$html += "    .card-date { font-size: 0.78rem; color: #64748b; }`n"
$html += "    .empty { text-align: center; color: #475569; grid-column: 1/-1; padding: 40px; }`n"
$html += "    footer { text-align: center; margin-top: 60px; color: #334155; font-size: 0.8rem; }`n"
$html += "  </style>`n"
$html += "</head>`n"
$html += "<body>`n"
$html += "  <header>`n"
$html += "    <h1>&#127760; JyunHan &#32178;&#38913;&#32034;&#24341;</h1>`n"
$html += "    <p>&#40670;&#36984;&#21345;&#29255;&#21363;&#21487;&#38283;&#21855;&#35442;&#32178;&#38913;</p>`n"
$html += "  </header>`n"
$html += "  <div class=`"stats`">`n"
$html += "    <div class=`"stat`"><div class=`"stat-num`">$count</div><div class=`"stat-label`">&#32178;&#38913;&#25976;&#37327;</div></div>`n"
$html += "    <div class=`"stat`"><div class=`"stat-num`">&#10003;</div><div class=`"stat-label`">&#24050;&#21516;&#27493;</div></div>`n"
$html += "  </div>`n"
$html += "  <div class=`"grid`">`n"
$html += $cards
$html += "  </div>`n"
$html += "  <footer>&#26368;&#24460;&#26356;&#26032;&#65306;$generated</footer>`n"
$html += "</body>`n"
$html += "</html>`n"

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Join-Path $PSScriptRoot "index.html"), $html, $utf8NoBom)
Write-Host "index.html generated with $count pages."
