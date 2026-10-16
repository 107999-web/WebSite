# -*- coding: utf-8 -*-
"""產生紅石機關社團網頁：index.html、lessons/lesson01～20.html、assets/meta.js、tools/_sims.json。

用法：python tools/build.py
內容改 tools/lessons.py（教學內容）與 tools/sims.py（模擬器題目），不要直接改產生出來的 html。
改完記得跑 node tools/test_sims.js 驗證題目。
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lessons import L, UNITS  # noqa: E402
from sims import SIMS  # noqa: E402
from make_mkcd import mkcd_name  # noqa: E402

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700;800&family=Nunito:wght@400;700;800&display=swap" rel="stylesheet">')
GEN = '<!-- 由 tools/build.py 產生，請改 tools/lessons.py 或 tools/sims.py 後重新產生 -->'


def strip(s):
    return re.sub(r'<[^>]+>', '', s)


def js(o):
    return json.dumps(o, ensure_ascii=False).replace('</', '<\\/')


def public_sim(s):
    return {k: v for k, v in s.items() if not k.startswith('solution')}


def slots(flow, period):
    out = []
    for i, (m, name, desc) in enumerate(flow):
        label = f'第{period}節 {name}'
        out.append(f'<div class="slot" data-min="{m}" data-label="{html.escape(label)}"><b>{m} 分</b>'
                   f'<div><b>{name}</b>：{desc}</div></div>')
    return '\n'.join(out)


def app_section(i, a):
    sims = ''
    if a.get('sims'):
        sims = '<p class="webfirst">🖥️ 先在網頁試試看</p>' + ''.join(f'<div class="sim" data-sim="{s}"></div>' for s in a['sims'])
    steps = ''.join(f'<li>{s}</li>' for s in a['steps'])
    lv = a.get('lv', {})
    lvhtml = ''
    if lv:
        lvhtml = ('<div class="lvrow">'
                  f'<div class="lv c"><b>🐣 三、四年級</b>：{lv.get("🐣", "")}</div>'
                  f'<div class="lv f"><b>🦊 五、六年級</b>：{lv.get("🦊", "")}</div></div>')
    return f'''<section class="mission" id="m{i + 1}">
  <header><h3>🎮 {a["title"]}</h3></header>
  <div class="items">🎒 準備物品：{a["items"]}</div>
  {sims}
  <h4>🧱 在遊戲裡做</h4>
  <ol class="steps">{steps}</ol>
  {f'<div class="tip">💡 {a["tip"]}</div>' if a.get('tip') else ''}
  {lvhtml}
</section>'''


def mc_section(l):
    mc = l.get('mc')
    if not mc:
        return f'''<section class="card"><h2>💻 MakeCode</h2>
  <p class="nomc">這堂<b>不搭配</b> MakeCode：{l["nomc"]}</p></section>'''
    steps = ''.join(f'<li>{s}</li>' for s in mc['steps'])
    cid = f'js{l["n"]}'
    return f'''<section class="mission" id="mc">
  <header><h3>💻 MakeCode：{mc["title"]}</h3></header>
  <p>{mc["why"]}</p>
  <div class="mcwrap">
    <div><b>積木</b>（積木上的文字可能因版本略有不同）
<pre class="mc">{html.escape(mc["blocks"])}</pre></div>
    <div><div class="row"><b>JavaScript</b><button class="btn sm blue" data-copy="{cid}">📋 複製</button></div>
<pre class="js" id="{cid}">{html.escape(mc["js"])}</pre>
      <p class="small">在 MakeCode 上方切換到「JavaScript」，整段貼上，再切回「積木」就會變成上面的積木。</p></div>
  </div>
  <div class="dl"><a class="btn green" href="../makecode/{mkcd_name(l)}.mkcd" download>⬇️ 下載 MakeCode 檔（.mkcd）</a>
    <span class="small">Minecraft Education 按 <kbd>C</kbd> → MakeCode → <b>匯入</b> → 選這個檔案，打開就是上面的積木，不用自己拼。</span></div>
  <h4>🧪 試試看</h4>
  <ol class="steps">{steps}</ol>
  {f'<div class="note">📌 {mc["note"]}</div>' if mc.get('note') else ''}
</section>'''


def design_section():
    f = lambda key, lab, ph='', rows=3: (f'<label>{lab}</label><textarea data-save="{key}" rows="{rows}" placeholder="{ph}"></textarea>')
    return f'''<section class="card cream form">
  <h2>📋 密室逃脫設計單</h2>
  <label>組名／組員</label><input type="text" data-save="team" placeholder="例如：紅石偵探社（王小明、李小美）">
  {f("story", "故事：為什麼玩家會被關在這裡？", "例如：紅石博士把實驗室鎖起來了，要解開 3 道機關才能逃出去", 2)}
  {f("map", "房間配置：幾個房間？入口和出口在哪？（可以用文字或符號畫）", "", 4)}
  {f("mech1", "機關 1：用什麼紅石？怎麼解開？", "例如：4 根拉桿密碼鎖，密碼藏在書裡")}
  {f("mech2", "機關 2：用什麼紅石？怎麼解開？", "")}
  {f("mech3", "機關 3：用什麼紅石？怎麼解開？", "")}
  {f("logic", "邏輯謎題：用到 AND／OR／XOR／NOT／密碼鎖的哪一個？", "", 2)}
  {f("clue", "線索放在哪裡？", "告示牌、書與筆、NPC、地上的方塊排列……", 2)}
  {f("job", "分工：誰負責建築、誰負責紅石、誰負責故事？", "", 2)}
  <div class="row" style="margin-top:10px"><button class="btn green" onclick="window.print()">🖨️ 列印設計單</button></div>
</section>'''


SKILLS = ['拉桿／按鈕／壓力板', '紅石粉與訊號強度', '紅石火把（NOT）', '中繼器', '活塞與黏性活塞', 'OR 閘', 'AND 閘', 'XOR 閘',
          '時鐘電路', '觀察者', '漏斗與發射器', '比較器', '日光感測器', '標靶方塊', '記憶電路（銅燈）', '幽匿感測器',
          '2×2 活塞門', '密碼鎖', '自動農場', '音符盒音樂', 'MakeCode 遙控紅石']


def final_section():
    rows = ''.join(f'<tr><td><input type="text" data-save="pr{i}g" placeholder="第 ? 組"></td>'
                   f'<td><select data-save="pr{i}a"><option></option>' + ''.join(f'<option>{"⭐" * k}</option>' for k in range(1, 6)) + '</select></td>'
                   f'<td><select data-save="pr{i}b"><option></option>' + ''.join(f'<option>{"⭐" * k}</option>' for k in range(1, 6)) + '</select></td>'
                   f'<td><select data-save="pr{i}c"><option></option>' + ''.join(f'<option>{"⭐" * k}</option>' for k in range(1, 6)) + '</select></td>'
                   f'<td><input type="text" data-save="pr{i}d" placeholder="一個稱讚＋一個建議"></td></tr>' for i in range(1, 5))
    skills = ''.join(f'<label><input type="checkbox" data-save="sk{i}"> {s}</label>' for i, s in enumerate(SKILLS))
    return f'''<section class="card sky form">
  <h2>⭐ 闖關互評表</h2>
  <div style="overflow-x:auto"><table class="t">
    <tr><th>組別</th><th>好玩度</th><th>線索清楚</th><th>機關正常</th><th>稱讚＋建議</th></tr>{rows}
  </table></div>
</section>
<section class="card mint form">
  <h2>✅ 20 堂自評：我學會了……</h2>
  <div class="skills">{skills}</div>
  <label>我最得意的機關（🦊 寫 50 字介紹）</label><textarea data-save="best" rows="3"></textarea>
</section>
<section class="card certsec">
  <h2 class="noprint">🎓 紅石工程師證書</h2>
  <div class="row noprint"><label>名字：<input type="text" id="certName" data-save="certname" placeholder="輸入你的名字"></label>
    <button class="btn green" onclick="document.body.classList.add('printcert');window.print();document.body.classList.remove('printcert')">🖨️ 列印證書</button></div>
  <div class="cert">
    <h2>🏆 紅石工程師證書 🏆</h2>
    <div class="who" id="certOut">＿＿＿＿＿</div>
    <p>完成 Minecraft Education 紅石機關社團 20 堂課程，<br>學會電源、邏輯閘、感測器、記憶電路與自動化機關，<br>並和組員一起設計出自己的密室逃脫。</p>
    <p class="small">特頒此證，以資鼓勵　<span id="certDate"></span></p>
  </div>
</section>'''


def lesson_page(l):
    n = l['n']
    uname, ucol, _ = UNITS[l['unit']]
    sims = {s: public_sim(SIMS[s]) for a in l['apps'] for s in a.get('sims', [])}
    quiz = [dict(q=q, o=o, a=a, why=w) for q, o, a, w in l['quiz']]
    learn = ''.join(f'<div class="lc"><span class="ic">{ic}</span><b>{nm}</b>{d}</div>' for ic, nm, d in l['learn'])
    rules = ''.join(f'<li>{r}</li>' for r in l['rules'])
    goals = ''.join(f'<li>{g}</li>' for g in l['goals'])
    apps = '\n'.join(app_section(i, a) for i, a in enumerate(l['apps']))
    teacher = ''.join(f'<li>{t}</li>' for t in l['teacher'])
    mc_chip = '💻 MakeCode：搭配' if l.get('mc') else '💻 MakeCode：本堂不搭配'
    extra = (design_section() if l.get('design') else '') + (final_section() if l.get('final') else '')
    return f'''<!doctype html>
{GEN}
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>第 {n} 堂｜{strip(l["title"])}</title>
{FONTS}
<link rel="stylesheet" href="../assets/style.css">
</head>
<body data-lesson="{n}">
<main class="wrap">

<section class="hero" style="--u:{ucol}">
  <span class="tag">第 {n} 堂 ／ 單元{l["unit"]}　{uname}</span>
  <h1>{l["title"]} {l["emoji"]}</h1>
  <p>{l["intro"]}</p>
  <div class="chips"><span class="chip">🧱 {'、'.join(l["parts"])}</span><span class="chip">{mc_chip}</span><span class="chip">⏰ 40 分＋下課 10 分＋40 分</span></div>
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
  <p class="small">點右邊的 ⏱ 會在右下角倒數計時，投影上課時很好用。</p>
</section>

<section class="card sky">
  <h2>📚 新元件小教室</h2>
  <div class="learn">{learn}</div>
  <h3>🔑 今天的重點</h3>
  <ul class="rules">{rules}</ul>
  <p class="small">🖥️ 網頁模擬器是「從上往下看」的示意圖：先在這裡想清楚線路，正式結果以遊戲為準。操作：選工具 → 點格子放元件；同一種元件再點一次會轉方向；🖐️ 操作開關；🧽 清除。</p>
</section>

{apps}

{mc_section(l)}

{extra}

<section class="card sky">
  <h2>📝 闖關小測驗</h2>
  <div class="quiz"></div>
</section>

<section class="card cream reflect">
  <h2>💭 紅石日誌</h2>
  <p>{l["reflect"]}</p>
  <textarea data-save="reflect"></textarea>
  <p class="small">日誌只存在這台電腦的瀏覽器裡。</p>
</section>

<details class="teacher">
  <summary>👩‍🏫 教師備註</summary>
  <ul>{teacher}</ul>
</details>

</main>
<script src="../assets/meta.js"></script>
<script src="../assets/redsim.js"></script>
<script>
window.SIM_DATA = {js(sims)};
window.QUIZ = {js(quiz)};
</script>
<script src="../assets/app.js"></script>
</body>
</html>
'''


def index_page():
    units = ''.join(f'<div class="unit" style="background:{c}"><b>單元{k}　{nm}</b>第 {min(x["n"] for x in L if x["unit"] == k)}～{max(x["n"] for x in L if x["unit"] == k)} 堂｜{d}</div>'
                    for k, (nm, c, d) in UNITS.items())
    rows = ''.join(
        f'<tr><td class="c">{l["n"]}</td><td>{UNITS[l["unit"]][0]}</td><td><a href="lessons/lesson{l["n"]:02d}.html">{l["title"]}</a></td>'
        f'<td>{strip(l["apps"][0]["title"])}</td><td>{strip(l["apps"][1]["title"]) if len(l["apps"]) > 1 else ""}</td>'
        f'<td class="c">{"◎ " + l["mc"]["title"] if l.get("mc") else "—"}</td></tr>'
        for l in L)
    nmc = sum(1 for l in L if l.get('mc'))
    return f'''<!doctype html>
{GEN}
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>紅石機關社團</title>
{FONTS}
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<main class="wrap">

<section class="hero">
  <span class="tag">社團課程 ✕ Minecraft Education</span>
  <h1>紅石機關社團：20 堂紅石工程師養成 🔴⚙️</h1>
  <p>從拉桿、紅石粉開始，一路學到邏輯閘、時鐘、感測器、記憶電路，最後分組做出自己的密室逃脫。每堂都有互動教學網頁：上課流程與計時、新元件說明、<b>可以真的接線測試的紅石模擬器</b>、遊戲實作步驟、MakeCode 程式、闖關小測驗與紅石日誌。</p>
  <div class="chips"><span class="chip">👧 國小三～六年級</span><span class="chip">📅 20 堂 × （40 分＋下課 10 分＋40 分）</span><span class="chip">💻 {nmc} 堂搭配 MakeCode</span><span class="chip">🐣 三四年級／🦊 五六年級分層任務</span></div>
</section>

<section class="card">
  <h2>🗺️ 五個單元</h2>
  <div class="units">{units}</div>
</section>

<section class="card mint">
  <h2>📅 20 堂課（點進去上課）</h2>
  <div class="lessons" id="lessons"></div>
  <p class="small">🏅＝這台電腦上已把那堂任務全部打勾；🏆 數字＝通過的模擬器挑戰數。進度只存在這台電腦的瀏覽器。</p>
</section>

<section class="card">
  <h2>📋 課程規劃表</h2>
  <div style="overflow-x:auto"><table class="t wide">
    <tr><th>堂</th><th>單元</th><th>主題</th><th>應用 1</th><th>應用 2</th><th>MakeCode</th></tr>
    {rows}
  </table></div>
</section>

<section class="card sky">
  <h2>🖥️ 紅石模擬器怎麼用</h2>
  <div class="grid2">
    <ul>
      <li>每一堂的網頁裡都有模擬器，是<b>從上往下看</b>的示意圖。</li>
      <li>上面一排是工具：選一種元件，點格子就放上去；<b>同一種元件再點一次會轉方向</b>（或按 <kbd>R</kbd>）。</li>
      <li>🖐️ 操作：扳拉桿、按按鈕、站上壓力板、調中繼器延遲、調音符盒音高、點標靶射箭。</li>
      <li>黃色虛線格＝建議施工的位置；左上角有灰色三角形的元件是題目給的，不能改。</li>
    </ul>
    <ul>
      <li>勾選「顯示訊號強度」可以看到每一格紅石粉的數字（0～15）。</li>
      <li>「走一步」每次前進 0.1 秒（1 紅石刻），適合慢慢看時鐘、記憶電路。</li>
      <li>做完按「🧪 測試我的電路」，會自動檢查每一種開關組合，告訴你哪裡不對。</li>
      <li>模擬器是教學用的簡化模型：方向、強度、延遲的觀念和遊戲一樣，但有些細節（例如紅石粉是否「指向」方塊）以遊戲為準。</li>
    </ul>
  </div>
</section>

<section class="card cream">
  <h2>🧰 課前準備清單</h2>
  <ul>
    <li>每位學生一台電腦，安裝 <b>Minecraft Education</b> 並確認學校帳號可登入；確認版本（第 13 堂銅燈需要 1.21 以上）。</li>
    <li>建立「紅石實驗室」世界：創造模式、平坦世界、<b>開啟作弊（MakeCode 需要）</b>、關閉生物生成、關閉 TNT 爆炸、關閉日夜循環（第 12 堂用程式切換）。</li>
    <li>每人（或每組）一塊建地，用 Border 方塊隔開；專題（第 19、20 堂）每組 30×30。</li>
    <li>教師機可投影；學生電腦可開這個網頁（離線也能用，只有圓體字型需要網路）。</li>
    <li>耳機或小音量喇叭（音符盒、時鐘電路的聲音很多）。</li>
  </ul>
  <div class="tip">每堂流程以「第 1 節 40 分＋下課 10 分＋第 2 節 40 分」設計。每個應用都分 🐣 三四年級（照步驟完成）與 🦊 五六年級（延伸挑戰），混齡分組時可以讓高年級當「紅石小老師」。</div>
</section>

<footer class="foot">Minecraft 是 Mojang／Microsoft 的商標。本網頁為社團自製教學輔助，模擬器為簡化示意，實際結果以遊戲為準。</footer>
</main>
<script src="assets/meta.js"></script>
<script src="assets/app.js"></script>
<script>
(function () {{
  const st = MC.store.get();
  document.getElementById('lessons').innerHTML = MC.META.map((d, i) => {{
    const p = MC.progress(i + 1);
    const pct = p.total ? Math.round(p.done / p.total * 100) : 0;
    return `<a class="lesson ${{MC.lessonDone(i + 1) ? 'done' : ''}}" style="--u:${{d.color}}" href="lessons/lesson${{String(i + 1).padStart(2, '0')}}.html">
      ${{d.mc ? '<span class="mc">💻 MakeCode</span>' : ''}}
      <span class="n">第 ${{i + 1}} 堂 ／ ${{d.unit}}</span><h3>${{d.emoji}} ${{d.title}}</h3><p>${{d.apps}}${{p.sims ? '　🏆' + p.sims : ''}}</p><div class="prog"><i style="width:${{pct}}%"></i></div></a>`;
  }}).join('');
}})();
</script>
</body>
</html>
'''


def main():
    (ROOT / 'lessons').mkdir(exist_ok=True)
    meta = [dict(title=strip(l['title']), emoji=l['emoji'], color=UNITS[l['unit']][1], unit=UNITS[l['unit']][0],
                 mc=bool(l.get('mc')), apps='、'.join(re.sub(r'^應用 \d：', '', strip(a['title'])).strip() for a in l['apps']))
            for l in L]
    (ROOT / 'assets' / 'meta.js').write_text('/* 由 tools/build.py 產生 */\nwindow.LESSON_META = ' + js(meta) + ';\n', encoding='utf-8')
    for l in L:
        for a in l['apps']:
            for s in a.get('sims', []):
                assert s in SIMS, f'第 {l["n"]} 堂找不到模擬器 {s}'
        (ROOT / 'lessons' / f'lesson{l["n"]:02d}.html').write_text(lesson_page(l), encoding='utf-8')
    (ROOT / 'index.html').write_text(index_page(), encoding='utf-8')
    (ROOT / 'tools' / '_sims.json').write_text(json.dumps(SIMS, ensure_ascii=False), encoding='utf-8')
    print(f'產生 {len(L)} 堂課＋index.html，模擬器題目 {len(SIMS)} 個')


if __name__ == '__main__':
    main()
