# -*- coding: utf-8 -*-
"""Playwright 檢查：21 頁 × 兩種寬度的 console 錯誤、水平捲動、互動工具是否載入；
再實際操作幾個工具（盒子卡榫 3D 體素檢查、下載 SVG、孤島、切割模擬、測驗）。
用法：python tools/check_pages.py [截圖資料夾]
"""
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parent.parent
SHOT = Path(sys.argv[1]) if len(sys.argv) > 1 else None
pages = [ROOT / 'index.html'] + sorted((ROOT / 'lessons').glob('lesson*.html'))
bad = 0


def report(ok, msg):
    global bad
    bad += not ok
    print(('OK ' if ok else 'XX ') + msg)


VOXEL = '''([W, D, H, closed]) => {
  const F = window.LT._fingerFace, t = 3, k = 0, fw = 10, tp = closed ? 'in' : 'flat';
  const faces = [
    [F(W, H, {top: tp, bottom: 'in', left: 'out', right: 'out'}, t, k, fw), (x, y, z) => y < t, (x, y, z) => [x, H - z]],
    [F(W, H, {top: tp, bottom: 'in', left: 'out', right: 'out'}, t, k, fw), (x, y, z) => y > D - t, (x, y, z) => [x, H - z]],
    [F(D, H, {top: tp, bottom: 'in', left: 'in', right: 'in'}, t, k, fw), (x, y, z) => x < t, (x, y, z) => [y, H - z]],
    [F(D, H, {top: tp, bottom: 'in', left: 'in', right: 'in'}, t, k, fw), (x, y, z) => x > W - t, (x, y, z) => [y, H - z]],
    [F(W, D, {top: 'out', bottom: 'out', left: 'out', right: 'out'}, t, k, fw), (x, y, z) => z < t, (x, y, z) => [x, y]],
  ];
  if (closed) faces.push([F(W, D, {top: 'out', bottom: 'out', left: 'out', right: 'out'}, t, k, fw), (x, y, z) => z > H - t, (x, y, z) => [x, y]]);
  const inside = (P, u, v) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { if ((P[i][1] > v) !== (P[j][1] > v) && u < (P[j][0] - P[i][0]) * (v - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; } return c; };
  const st = 0.5; let over = 0, gap = 0, cells = 0;
  for (let x = st / 2; x < W; x += st) for (let y = st / 2; y < D; y += st) for (let z = st / 2; z < H; z += st) {
    const shell = x < t || x > W - t || y < t || y > D - t || z < t || (closed && z > H - t);
    if (!shell) continue;
    cells++;
    let n = 0;
    for (const [P, slab, uv] of faces) if (slab(x, y, z)) { const [u, v] = uv(x, y, z); if (inside(P, u, v)) n++; }
    if (n > 1) over++; if (n === 0) gap++;
  }
  return {over, gap, cells};
}'''

with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in [(1280, 900), (390, 844)]:
        ctx = b.new_context(viewport={'width': w, 'height': h})
        for f in pages:
            pg = ctx.new_page()
            errs = []
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'fonts.g' not in m.text else None)
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(f.as_uri())
            pg.wait_for_timeout(500)
            sw = pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            want = pg.evaluate('document.querySelectorAll(".tool").length')
            got = pg.evaluate('[...document.querySelectorAll(".tool")].filter(t => t.children.length > 2).length')
            q = pg.evaluate('document.querySelectorAll(".quiz .q").length')
            report(not errs and sw <= 0 and got == want, f'{w:4} {f.name:15} 工具 {got}/{want} 測驗 {q} 水平捲動 {sw} {errs[:2] if errs else ""}')
            if SHOT and (w == 1280 and f.name in ('index.html', 'lesson03.html', 'lesson05.html', 'lesson13.html', 'lesson15.html', 'lesson17.html', 'lesson20.html')
                         or w == 390 and f.name in ('index.html', 'lesson15.html')):
                pg.screenshot(path=str(SHOT / f'{w}_{f.stem}.png'), full_page=True)
            pg.close()
        ctx.close()

    ctx = b.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True)
    pg = ctx.new_page()
    pg.goto((ROOT / 'lessons' / 'lesson15.html').as_uri())
    pg.wait_for_timeout(300)
    for dims in ([60, 50, 40, False], [70, 70, 90, False], [60, 50, 40, True], [83, 47, 55, True]):
        r = pg.evaluate(VOXEL, dims)
        report(r['over'] == 0 and r['gap'] == 0, f'盒子卡榫體素檢查 {dims}：重疊 {r["over"]}、缺口 {r["gap"]}（外殼 {r["cells"]} 格）')

    def dl_svg(page, sel, name):
        with page.expect_download() as d:
            page.locator(sel).first.click()
        path = d.value.path()
        root = ET.parse(path).getroot()
        paths = list(root.iter('{http://www.w3.org/2000/svg}path'))
        cut = [x for x in paths if x.get('stroke') == '#FF0000']
        ok = root.get('width', '').endswith('mm') and len(cut) > 0
        report(ok, f'下載 {name}：{d.value.suggested_filename} 大小 {root.get("width")} × {root.get("height")}，切割路徑 {len(cut)} 條')

    dl_svg(pg, '.tool[data-tool=box] .dl', '筆筒')
    for n, sel, name in [(2, '.tool[data-tool=star] .dl', '星星吊飾'), (8, '.tool[data-tool=keyring] .dl', '鑰匙圈'), (10, '.tool[data-tool=jigsaw] .dl', '拼圖'),
                         (11, '.tool[data-tool=ruler] .dl', '尺'), (12, '.tool[data-tool=kerf] .dl', '卡槽測試尺'), (13, '.tool[data-tool=crossslot] .dl', '十字插接'),
                         (14, '.tool[data-tool=phonestand] .dl', '手機架'), (17, '.tool[data-tool=box] .dl', '寶物盒')]:
        pg.goto((ROOT / 'lessons' / f'lesson{n:02d}.html').as_uri())
        pg.wait_for_timeout(300)
        dl_svg(pg, sel, name)

    # 孤島：「口」鏤空應有 1 個孤島；勾連接條後應為 0
    pg.goto((ROOT / 'lessons' / 'lesson05.html').as_uri())
    tl = pg.locator('.tool[data-tool=islands]')
    tl.locator('[data-k=txt]').fill('口')
    t1 = tl.locator('.res').inner_text()
    tl.locator('[data-k=bar]').check()
    t2 = tl.locator('.res').inner_text()
    report('1塊' in t1.replace(' ', '') and '沒有孤島' in t2, f'孤島「口」：{t1[:30]}… → 加小橋：{t2[:20]}')
    tl.locator('[data-k=bar]').uncheck()
    tl.locator('[data-k=mode]').select_option('cut')
    tl.locator('[data-k=txt]').fill('小明')
    t3 = tl.locator('.res').inner_text()
    report('會散成' in t3, f'剪影「小明」：{t3[:30]}')

    # 切割模擬：正確順序跑完
    pg.goto((ROOT / 'lessons' / 'lesson03.html').as_uri())
    lz = pg.locator('.tool[data-tool=laser]')
    lz.locator('.spd').fill('3')
    lz.locator('.go1').click()
    pg.wait_for_timeout(6500)
    t = lz.locator('.res').inner_text()
    report('正確順序' in t, f'切割模擬（正確）：{t[:30]}')
    lz.locator('.go2').click()
    pg.wait_for_timeout(6500)
    t = lz.locator('.res').inner_text()
    report('歪' in t, f'切割模擬（錯誤）：{t[:30]}')

    # 卡槽：板厚 2.95、切縫 0.15、畫 2.8 → 剛剛好
    pg.goto((ROOT / 'lessons' / 'lesson12.html').as_uri())
    kf = pg.locator('.tool[data-tool=kerf]')
    kf.locator('[data-k=s]').fill('2.8')
    t = kf.locator('.res').inner_text()
    report('剛剛好' in t, f'卡槽 2.8＋0.15 vs 2.95：{t[:24]}')

    # 測驗全對＋步驟打勾後，總覽導覽列出現完成標記
    pg.goto((ROOT / 'lessons' / 'lesson01.html').as_uri())
    for li in pg.locator('.steps > li').all():
        li.click()
    qs = pg.evaluate('window.QUIZ.map(q => q.a)')
    for i, a in enumerate(qs):
        pg.locator('.quiz .q').nth(i).locator('.o').nth(a).click()
    sc = pg.locator('.score').inner_text()
    pg.goto((ROOT / 'index.html').as_uri())
    done = pg.evaluate('document.querySelector(\'.lcard[data-n="1"]\').classList.contains("done")')
    report('全對' in sc and done, f'第 1 堂測驗＋打勾：{sc}；總覽完成標記 {done}')
    if SHOT:
        pg.goto((ROOT / 'lessons' / 'lesson04.html').as_uri())
        pg.locator('.tool[data-tool=boolean] .op[data-op=diff]').click()
        pg.locator('.tool[data-tool=boolean]').screenshot(path=str(SHOT / 'tool_boolean.png'))
        pg.goto((ROOT / 'lessons' / 'lesson14.html').as_uri())
        pg.locator('.tool[data-tool=phonestand]').screenshot(path=str(SHOT / 'tool_phonestand.png'))
        pg.goto((ROOT / 'lessons' / 'lesson05.html').as_uri())
        pg.locator('.tool[data-tool=islands]').screenshot(path=str(SHOT / 'tool_islands.png'))
    b.close()

print('\n全部通過' if not bad else f'\n有 {bad} 項失敗')
sys.exit(1 if bad else 0)
