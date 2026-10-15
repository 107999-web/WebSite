# -*- coding: utf-8 -*-
"""Playwright 檢查：21 頁 × 兩種寬度的 console 錯誤、水平捲動；並在瀏覽器裡真的點模擬器過關。
用法：python tools/check_pages.py [截圖資料夾]
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SHOT = Path(sys.argv[1]) if len(sys.argv) > 1 else None
pages = [ROOT / 'index.html'] + sorted((ROOT / 'lessons').glob('lesson*.html'))
bad = 0

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
            pg.wait_for_timeout(400)
            sw = pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            sims = pg.evaluate('document.querySelectorAll(".sim .rs-stage canvas").length')
            want = pg.evaluate('document.querySelectorAll(".sim").length')
            blk = pg.evaluate('document.querySelectorAll(".code .blk").length')
            q = pg.evaluate('document.querySelectorAll(".quiz .q").length')
            ok = not errs and sw <= 0 and sims == want
            bad += not ok
            print(f'{"OK " if ok else "XX "} {w:4} {f.name:15} 模擬器 {sims}/{want} 積木 {blk:2} 測驗 {q} 水平捲動 {sw} {errs[:2] if errs else ""}')
            if SHOT and f.name in ('index.html', 'lesson02.html', 'lesson07.html', 'lesson20.html'):
                pg.screenshot(path=str(SHOT / f'{w}_{f.stem}.png'), full_page=(w == 390 and f.name == 'index.html'))
            pg.close()
        ctx.close()

    # 真的在瀏覽器裡解題：第 2 堂反向燈放火把、第 8 堂時鐘放中繼器（要轉方向）
    ctx = b.new_context(viewport={'width': 1280, 'height': 900})
    pg = ctx.new_page()
    pg.goto((ROOT / 'lessons' / 'lesson02.html').as_uri())
    sim = pg.locator('.sim[data-sim="s02a"]')
    sim.locator('.rs-tool', has_text='紅石火把').click()
    cv = sim.locator(".rs-stage canvas")
    box = cv.bounding_box()
    cs = box['width'] / 8
    cv.click(position={'x': cs * 4.5, 'y': cs * 0.5})
    pg.wait_for_timeout(300)
    sim.locator('.rs-test').click()
    v = sim.locator('.rs-verdict').inner_text()
    print('第 2 堂 反向燈（點擊放火把）：', v)
    bad += '成功' not in v
    # 用 🖐️ 扳拉桿，燈應該熄滅
    sim.locator('.rs-tool', has_text='操作').click()
    cv.click(position={'x': cs * 0.5, 'y': cs * 0.5})
    pg.wait_for_timeout(500)
    lamp = pg.evaluate('''(() => { const c = document.querySelector('.sim[data-sim="s02a"] .rs-stage canvas');
        const g = c.getContext('2d'); const s = c.width / 8; const d = g.getImageData(s * 7.5, s * 0.5, 1, 1).data; return [d[0], d[1], d[2]]; })()''')
    print('  拉桿打開後燈的顏色（應為暗褐色）：', lamp)
    if SHOT:
        sim.screenshot(path=str(SHOT / 'sim_lesson02.png'))

    pg.goto((ROOT / 'lessons' / 'lesson08.html').as_uri())
    sim = pg.locator('.sim[data-sim="s08a"]')
    sim.locator('.rs-tool', has_text='中繼器').click()
    cv = sim.locator(".rs-stage canvas")
    box = cv.bounding_box()
    cs = box['width'] / 5
    for _ in range(3):   # 第 1 下放（朝東），再點 2 下轉到朝西
        cv.click(position={'x': cs * 1.5, 'y': cs * 3.5})
    sim.locator('.rs-tool', has_text='操作').click()
    for _ in range(3):   # 延遲 1 → 4，太快火把會燒壞
        cv.click(position={'x': cs * 1.5, 'y': cs * 3.5})
    sim.locator('.rs-test').click()
    v = sim.locator('.rs-verdict').inner_text()
    print('第 8 堂 時鐘（放中繼器並轉向西）：', v)
    bad += '成功' not in v
    if SHOT:
        sim.screenshot(path=str(SHOT / 'sim_lesson08.png'))

    # 進度：勾任務後總覽頁讀得到
    pg.goto((ROOT / 'lessons' / 'lesson01.html').as_uri())
    pg.locator('.mission .check input').first.check()
    pg.goto((ROOT / 'index.html').as_uri())
    prog = pg.evaluate('document.querySelector(".lesson .prog i").style.width')
    print('總覽頁讀到第 1 堂進度：', prog)
    bad += prog in ('', '0%')
    b.close()

print('\n失敗', bad)
sys.exit(1 if bad else 0)
