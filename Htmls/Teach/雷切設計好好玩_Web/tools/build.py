# -*- coding: utf-8 -*-
"""產生雷切設計好好玩網頁：index.html、lessons/lesson01～20.html、assets/meta.js。

用法：python tools/build.py
教學內容改 tools/lessons.py；互動工具改 assets/tools.js；不要直接改產生出來的 html。
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lessons import L, UNITS, SKILLS, COURSE, SUBTITLE  # noqa: E402

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700;800&family=Nunito:wght@400;700;800&display=swap" rel="stylesheet">')
GEN = '<!-- 由 tools/build.py 產生，請改 tools/lessons.py 後重新產生 -->'
TOOL_NAMES = {
    'machine': '機器構造', 'safety': '安全駕照', 'star': '星形遊樂場', 'colorsort': '顏色分類', 'laser': '切割模擬器',
    'cuttime': '排隊計算機', 'boolean': '布林運算', 'islands': '孤島檢查器', 'bezier': '貝茲曲線', 'trace': '描圖門檻',
    'keyring': '鑰匙圈檢查', 'offset': '外擴內縮', 'jigsaw': '拼圖產生器', 'ruler': '尺書籤產生器', 'kerf': '卡槽實驗室',
    'crossslot': '十字插接產生器', 'phonestand': '手機架產生器', 'pattern': '鏤空花紋', 'box': '盒子產生器', 'nesting': '排版省材料',
}

strip = lambda s: re.sub(r'<[^>]+>', '', s)
js = lambda o: json.dumps(o, ensure_ascii=False).replace('</', '<\\/')


def check():
    assert len(L) == 20
    for l in L:
        for k in ('flow1', 'flow2'):
            tot = sum(m for m, _, _ in l[k])
            assert tot == 40, f'第 {l["n"]} 堂 {k} 加總 {tot} 分'
        for q in l['quiz']:
            assert 0 <= q[2] < len(q[1]), f'第 {l["n"]} 堂測驗答案超出範圍：{q[0]}'
        for t in l['tools']:
            assert t.split(':')[0] in TOOL_NAMES, t


def slots(flow, period):
    return '\n'.join(f'<div class="slot" data-min="{m}" data-label="{html.escape(f"第{period}節 {name}")}"><b>{m} 分</b>'
                     f'<div><b>{name}</b>：{desc}</div></div>' for m, name, desc in flow)


def tool_div(t):
    name, _, mode = t.partition(':')
    return f'<div class="tool" data-tool="{name}"{f" data-mode={chr(34)}{mode}{chr(34)}" if mode else ""}></div>'


def mission(i, m):
    steps = ''.join(f'<li>{s}</li>' for s in m['steps'])
    lv = ''
    if m.get('lv'):
        lv = (f'<div class="lvrow"><div class="lv c"><b>🐣 三、四年級</b>：{m["lv"][0]}</div>'
              f'<div class="lv f"><b>🦊 五、六年級</b>：{m["lv"][1]}</div></div>')
    return f'''<section class="mission" id="m{i + 1}">
  <header><h3>🛠️ 任務 {i + 1}：{m["title"]}</h3></header>
  <div class="items">🎒 準備：{m["items"]}</div>
  <ol class="steps">{steps}</ol>
  {f'<div class="tip">💡 {m["tip"]}</div>' if m.get('tip') else ''}
  {lv}
</section>'''


def form_section(l):
    if not l.get('form'):
        return ''
    rows = ''.join(f'<label>{lab}</label><textarea data-save="{k}" rows="3" placeholder="{html.escape(ph)}"></textarea>' for k, lab, ph in l['form'])
    return f'''<section class="card cream form">
  <h2>📝 學習單</h2>{rows}
  <p class="small">會自動記在這台電腦的瀏覽器裡（換電腦就不見），可以按列印。</p>
  <div class="row" style="margin-top:10px"><button class="btn green" onclick="window.print()">🖨️ 列印</button></div>
</section>'''


def final_section():
    star = lambda k: f'<select data-save="{k}"><option></option>' + ''.join(f'<option>{"⭐" * i}</option>' for i in range(1, 6)) + '</select>'
    rows = ''.join(f'<tr><td><input type="text" data-save="pr{i}n" placeholder="同學作品"></td><td>{star(f"pr{i}a")}</td><td>{star(f"pr{i}b")}</td>'
                   f'<td>{star(f"pr{i}c")}</td><td><input type="text" data-save="pr{i}d" placeholder="一個讚美＋一個建議"></td></tr>' for i in range(1, 5))
    skills = ''.join(f'<label><input type="checkbox" data-save="sk{i}"> {s}</label>' for i, s in enumerate(SKILLS))
    return f'''<section class="card sky form">
  <h2>⭐ 成果展互評表</h2>
  <div class="tablewrap"><table class="t"><tr><th>作品</th><th>好玩／好看</th><th>實用</th><th>做工</th><th>讚美＋建議</th></tr>{rows}</table></div>
</section>
<section class="card mint form">
  <h2>✅ 20 堂自評：我學會了……</h2>
  <div class="skills">{skills}</div>
  <label>我最得意的作品和原因（🦊 五、六年級寫 50 字）</label><textarea data-save="best" rows="3"></textarea>
</section>
<section class="card certsec">
  <h2 class="noprint">🎓 雷切設計師證書</h2>
  <div class="row noprint"><label>名字：<input type="text" id="certName" data-save="certname" placeholder="輸入你的名字"></label>
    <button class="btn green" onclick="document.body.classList.add('printcert');window.print();document.body.classList.remove('printcert')">🖨️ 列印證書</button></div>
  <div class="cert">
    <h2>🏆 雷切設計師證書 🏆</h2>
    <div class="who" id="certOut">＿＿＿＿＿</div>
    <p>完成「{COURSE}」雷射切割社團 20 堂課程，<br>學會用 Inkscape 設計、用 Flux Beambox 雷射切割，<br>從平面吊飾、鑰匙圈到立體筆筒、寶物盒，並完成自己的創客專題。</p>
    <p class="small">特頒此證，以資鼓勵　<span id="certDate"></span></p>
  </div>
</section>
<script>
(function(){{const n=document.getElementById('certName'),o=document.getElementById('certOut');
const u=()=>o.textContent=n.value||'＿＿＿＿＿';n.addEventListener('input',u);setTimeout(u,60);
document.getElementById('certDate').textContent=new Date().toLocaleDateString('zh-TW');}})();
</script>'''


def lesson_page(l):
    n = l['n']
    uname, ucol, _ = UNITS[l['unit']]
    quiz = [dict(q=q, o=o, a=a, why=w) for q, o, a, w in l['quiz']]
    learn = ''.join(f'<div class="lc"><span class="ic">{ic}</span><b>{nm}</b>{d}</div>' for ic, nm, d in l['learn'])
    points = ''.join(f'<li>{p}</li>' for p in l['points'])
    goals = ''.join(f'<li>{g}</li>' for g in l['goals'])
    tools = ''.join(tool_div(t) for t in l['tools'])
    tool_sec = f'<h2 style="margin-top:26px">🧪 互動實驗室</h2>{tools}' if tools else ''
    keys = ''
    if l['keys']:
        cards = ''.join(f'<div class="key"><div class="in"><div class="f">{html.escape(k)}</div><div class="b">{v}</div></div></div>' for k, v in l['keys'])
        keys = f'''<section class="card">
  <div class="row" style="justify-content:space-between"><h2 style="margin:0">⌨️ Inkscape 快捷鍵小卡</h2><button class="btn sm ghost" data-flipall>全部翻面</button></div>
  <p class="small">先猜猜看這個按鍵是做什麼的，再點卡片翻面。</p>
  <div class="keys">{cards}</div>
</section>'''
    missions = '\n'.join(mission(i, m) for i, m in enumerate(l['missions']))
    teacher = ''.join(f'<li>{t}</li>' for t in l['teacher'])
    return f'''<!doctype html>
{GEN}
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>第 {n} 堂｜{strip(l["title"])}｜{COURSE}</title>
{FONTS}
<link rel="stylesheet" href="../assets/style.css">
</head>
<body data-lesson="{n}">
<main class="wrap">

<section class="hero" style="--u:{ucol}">
  <span class="tag">第 {n} 堂 ／ 單元{l["unit"]}　{uname}</span>
  <h1>{l["title"]} {l["emoji"]}</h1>
  <p>{l["intro"]}</p>
  <div class="chips"><span class="chip">🎁 今日作品：{l["product"]}</span><span class="chip">⏰ 40 分＋下課 10 分＋40 分</span></div>
</section>

<section class="card mint">
  <h2>🎯 今日目標</h2>
  <ol>{goals}</ol>
</section>

<section class="card">
  <h2>🕘 上課流程</h2>
  <div class="period">📗 第 1 節（40 分）</div>
  <div class="schedule">{slots(l["flow1"], 1)}</div>
  <div class="schedule" style="margin-top:10px"><div class="slot rest"><b>☕ 10 分</b><div><b>下課</b>：存檔、起來走走、喝水，讓眼睛休息一下 👀</div></div></div>
  <div class="period">📘 第 2 節（40 分）</div>
  <div class="schedule">{slots(l["flow2"], 2)}</div>
  <p class="small">按「⏱ 計時」會在右下角倒數，投影上課很好用。</p>
</section>

<section class="card sky">
  <h2>📚 魔法小教室</h2>
  <div class="learn">{learn}</div>
  <h3>🔑 今天的重點</h3>
  <ul class="rules">{points}</ul>
</section>

{tool_sec}

{keys}

<h2 style="margin-top:26px">🛠️ 動手做</h2>
<p class="small">每完成一個步驟，點一下打勾 ✓（會記在這台電腦）。</p>
{missions}

{form_section(l)}
{final_section() if l.get('final') else ''}

<section class="card pink">
  <h2>🏆 闖關測驗</h2>
  <div class="quiz"></div>
</section>

<details class="card noprint">
  <summary><b>👩‍🏫 老師備課提醒</b>（點開）</summary>
  <ul>{teacher}</ul>
</details>

</main>
<script>window.QUIZ = {js(quiz)};</script>
<script src="../assets/meta.js"></script>
<script src="../assets/tools.js"></script>
<script src="../assets/app.js"></script>
</body>
</html>
'''


INTRO = ('本社團以雷射切割為主題，對象為國小三至六年級學生，共 20 次課程，每次兩節課。學生使用免費繪圖軟體 Inkscape 設計圖案，'
         '再透過 Flux Beambox 雷射切割機切割 3 mm 密集板。課程由淺入深：先認識雷射原理、機器構造並通過安全駕照考試，'
         '接著學習基本形狀、布林運算、文字、貝茲曲線與點陣圖描圖，製作平面吊飾與鑰匙圈；再學習量測、切縫與卡槽，'
         '完成十字插接造型與手機架；進而設計指接榫筆筒與有蓋寶物盒等立體作品。每堂課搭配互動教學網頁與設計產生器，'
         '任務分為三四年級與五六年級兩個層次。學期末學生自訂主題完成創客專題並舉辦成果展，'
         '培養空間概念、精準量測、設計思考與解決問題的能力。')

MATERIALS = [
    ('3 mm 密集板（MDF，低甲醛 E0／F1 等級）', '裁成 300 × 200 mm，全學期每人約 6～8 張（含試切）'),
    ('Flux Beambox 雷射切割機＋排風', '確認排風管通到室外；Beam Studio 安裝在切割電腦'),
    ('電腦（每人一台）', '安裝 Inkscape 1.3 以上；建立「雷射社團／座號_姓名」資料夾'),
    ('游標卡尺、直尺', '第 11、12 堂起使用，4～6 人一支'),
    ('白膠、橡皮筋、紙膠帶、砂紙（240 號）、濕紙巾', '第 9、16、18 堂組裝用'),
    ('色鉛筆、壓克力顏料、水彩筆', '上色用'),
    ('鑰匙圈金屬環（25 mm）、珠鍊、吊繩', '第 4～9 堂吊飾、鑰匙圈用'),
    ('CO₂ 滅火器、急救箱', '放在雷射切割機旁'),
]
PARAMS = [
    ('切割（紅色）', '5', '60', '切不斷 → 速度調慢或功率調高；邊緣太黑 → 速度調快'),
    ('線刻（藍色）', '20', '20', '線太深 → 功率調低'),
    ('雕刻（黑色填滿）', '200', '25', '顏色太淺 → 功率調高；太焦 → 速度調快'),
]


def index_page():
    units = ''
    for u, (name, col, desc) in UNITS.items():
        cards = ''.join(f'<a class="lcard" data-n="{l["n"]}" style="--u:{col}" href="lessons/lesson{l["n"]:02d}.html"><span class="n">第 {l["n"]} 堂</span>'
                        f'<b>{l["emoji"]} {l["title"]}</b><span class="p">🎁 {l["product"]}</span></a>' for l in L if l['unit'] == u)
        units += f'<div class="unit" style="--u:{col}"><header>單元{u}　{name}<span style="font-weight:400;font-size:.85em">　— {desc}</span></header><div class="lessons">{cards}</div></div>'
    rows = ''.join(f'<tr><td>{l["n"]}</td><td>{UNITS[l["unit"]][0]}</td><td><a href="lessons/lesson{l["n"]:02d}.html">{l["title"]}</a></td><td>{l["product"]}</td>'
                   f'<td>{l["brief"]}</td><td>{"、".join(TOOL_NAMES[t.split(":")[0]] for t in l["tools"]) or "—"}</td></tr>' for l in L)
    mats = ''.join(f'<tr><td>{a}</td><td>{b}</td></tr>' for a, b in MATERIALS)
    params = ''.join(f'<tr><td>{a}</td><td>{b}</td><td>{c}</td><td>{d}</td></tr>' for a, b, c, d in PARAMS)
    return f'''<!doctype html>
{GEN}
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{COURSE}｜雷射切割社團</title>
{FONTS}
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<main class="wrap">
<section class="hero" style="--u:#e8505b">
  <span class="tag">國小三～六年級課後社團　20 堂 × 80 分鐘</span>
  <h1>🔦 {COURSE}</h1>
  <p style="font-size:1.2em"><b>{SUBTITLE}</b></p>
  <p>用 Inkscape 畫圖，用 Flux Beambox 雷射切割 3 mm 密集板，從吊飾、鑰匙圈，一路做到手機架、筆筒和寶物盒！</p>
  <div class="chips"><span class="chip">🖥️ Inkscape 1.3+</span><span class="chip">📡 Beam Studio</span><span class="chip">🪵 3 mm 密集板</span><span class="chip">🧪 20 個互動實驗與產生器</span></div>
</section>

<section class="card cream">
  <h2>📖 課程簡介</h2>
  <p>{INTRO}</p>
  <p class="small">每堂課網頁都有：今日目標、可計時的上課流程（40＋10＋40 分）、魔法小教室、互動實驗室、快捷鍵小卡、可打勾的任務步驟（🐣 三四年級／🦊 五六年級）、闖關測驗、老師備課提醒。</p>
</section>

<h2>🗺️ 20 堂課程地圖</h2>
<div class="units">{units}</div>

<section class="card">
  <h2>📋 課程總表</h2>
  <div class="tablewrap"><table class="t"><tr><th>堂</th><th>單元</th><th>主題</th><th>作品</th><th>教學內容與重點</th><th>互動工具</th></tr>{rows}</table></div>
</section>

<section class="card pink">
  <h2>🦺 雷射教室安全守則</h2>
  <ol>
    <li>雷射切割時<b>一定要有人看著</b>，不可以離開。</li>
    <li>切割前確認<b>排風打開、蓋子關好</b>；不可以打開蓋子看雷射光。</li>
    <li><b>只切老師準備的材料</b>（PVC、人造皮革、不明塑膠會產生有毒氣體）。</li>
    <li>看到持續火焰：<b>按暫停 → 叫老師 → 不要開蓋</b>；滅火器在機器旁。</li>
    <li>切完等 10 秒讓煙抽乾淨再開蓋，作品邊緣可能還熱。</li>
    <li>有「雷射安全駕照」才可以在老師陪同下操作機器。</li>
  </ol>
</section>

<section class="card sky">
  <h2>⚙️ Beam Studio 參數參考起點（Beambox 40W、3 mm 密集板）</h2>
  <div class="tablewrap"><table class="t"><tr><th>工作</th><th>速度 mm/s</th><th>功率 %</th><th>調整方式</th></tr>{params}</table></div>
  <p class="small">⚠️ 這只是起點。每台機器的雷射管老化程度、每批板子的密度與膠量都不同，<b>第 3 堂一定要用測試卡找出自己的數字</b>，存成 Beam Studio 的自訂參數。Beambox Pro（50W）可把速度調快。</p>
</section>

<section class="card">
  <h2>🧰 全學期材料與設備</h2>
  <div class="tablewrap"><table class="t"><tr><th>項目</th><th>說明</th></tr>{mats}</table></div>
  <h3>⏱️ 雷射切割機只有一台怎麼辦？</h3>
  <ul>
    <li>小作品（吊飾、鑰匙圈）：老師把全班的檔案<b>合併成一個 Beam Studio 檔</b>一次切，省下換板、對焦時間。</li>
    <li>大作品（筆筒、寶物盒、專題）：<b>當堂設計 → 課後由老師集中切割 → 下一堂組裝</b>，所以第 15～16、17～18、19～20 堂兩兩成對。</li>
    <li>等待切割的學生：做互動實驗室、闖關測驗、上色組裝或幫同學檢查檔案。</li>
    <li>第 3 堂的「全班切割排隊計算機」可以先試算一堂課切不切得完。</li>
  </ul>
</section>
</main>
<script src="assets/meta.js"></script>
<script src="assets/app.js"></script>
</body>
</html>
'''


def main():
    check()
    meta = [dict(title=strip(l['title']), color=UNITS[l['unit']][1]) for l in L]
    (ROOT / 'assets' / 'meta.js').write_text('/* 由 tools/build.py 產生 */\nwindow.LESSON_META = ' + js(meta) + ';\n', encoding='utf-8')
    (ROOT / 'lessons').mkdir(exist_ok=True)
    for l in L:
        (ROOT / 'lessons' / f'lesson{l["n"]:02d}.html').write_text(lesson_page(l), encoding='utf-8')
    (ROOT / 'index.html').write_text(index_page(), encoding='utf-8')
    print(f'已產生 index.html、{len(L)} 堂課頁面、assets/meta.js')


if __name__ == '__main__':
    main()
