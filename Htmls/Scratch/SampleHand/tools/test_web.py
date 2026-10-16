# -*- coding: utf-8 -*-
"""教學網頁的瀏覽器測試（Playwright）：console 錯誤、積木圖是否都找得到、11 個互動實驗逐一操作、深色模式、手機寬度。

    python tools/test_web.py

截圖存在 tools/_截圖/。
"""
import os as _os
ROOT = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))   # 專案資料夾
OUTDIR = _os.path.join(ROOT, 'tools', '_截圖')                             # 截圖輸出
_os.makedirs(OUTDIR, exist_ok=True)
import sys, asyncio, pathlib
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright
ROOT = pathlib.Path(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for scheme in ('light', 'dark'):
            pg = await b.new_page(viewport={'width': 1280, 'height': 900}, color_scheme=scheme)
            errs = []
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
            pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
            await pg.goto((ROOT / 'student' / 'index.html').as_uri())
            await pg.wait_for_timeout(1500)
            missing = await pg.evaluate("[...document.querySelectorAll('[data-sb]')].filter(e=>e.textContent.includes('找不到積木')).map(e=>e.dataset.sb)")
            nsb = await pg.evaluate("document.querySelectorAll('[data-sb] .brow').length")
            print(scheme, 'block rows', nsb, 'missing', missing)
            if scheme == 'light':
                # 互動
                await pg.click('#lab0 button[data-i="18"]')
                for k in ('down', 'out', 'none', 'up'):
                    await pg.click(f'#lab1 button[data-k="{k}"]')
                t = await pg.inner_text('#lab1'); print('lab1 up ok:', '看得到手\n1' in t or '看得到手1' in t.replace('\n',''))
                await pg.fill('#l2s', '0.5'); await pg.dispatch_event('#l2s', 'input')
                print('lab2:', (await pg.inner_text('#lab2')).split('\n')[3:6])
                for v in ('3', '-3', '-10', '3', '10'):
                    await pg.fill('#l3d', v); await pg.dispatch_event('#l3d', 'input')
                    t = (await pg.inner_text('#lab3')).replace('\n', ' ')
                    import re; m = re.search(r'手指結果（輸出）\s*(\d)', t); print('lab3 d=', v, '→', m.group(1) if m else t[:80])
                await pg.click('#lab3 button[data-f="小"]')
                print('lab3 call:', 'judge 21 19' if '21' in await pg.inner_text('#lab3 .callbox') else 'FAIL')
                for v, ref in (('-95', None), (None, '6'), ('25', None)):
                    if ref: await pg.click(f'#lab4 button[data-r="{ref}"]')
                    if v: await pg.fill('#l4x', v); await pg.dispatch_event('#l4x', 'input')
                    t = (await pg.inner_text('#lab4')).replace('\n', ' ')
                    print('lab4', v, ref, '判斷錯了' in t, re.search(r'拇指\s*(\d)', t.split('門檻')[1]).group(1))
                await pg.click('#lab5 .presets button[data-p="01110"]')
                print('lab5:', '手指數 ＝ 0 ＋ 1 ＋ 1 ＋ 1 ＋ 0 ＝ 3' in await pg.inner_text('#lab5'))
                await pg.click('#lab5 .fg[data-f="0"]')
                print('lab5 thumb click:', '11110' in await pg.inner_text('#lab5'))
                for k in ('clean','drop','leave','change','noise'):
                    await pg.click(f'#lab6 button[data-k="{k}"]')
                    print('lab6', k, (await pg.inner_text('#lab6 .vrow')).replace('\n',' '))
                await pg.uncheck('#l6c'); print('lab6 no-stable', (await pg.inner_text('#lab6 .vrow')).replace('\n',' '))
                await pg.click('#lab7 .presets button[data-p="11100"]')
                print('lab7 11100:', '剪刀' in await pg.inner_text('#lab7 .vrow'))
                await pg.fill('#l8t', '?1100'); await pg.dispatch_event('#l8t', 'input')
                print('lab8 target ?1100 vs 11001:', (await pg.inner_text('#l8o .vrow')).replace('\n',' '))
                await pg.fill('#l8n', 'OK'); await pg.fill('#l8c', '0?111'); await pg.click('#l8a')
                await pg.click('#lab8 .fg[data-f="0"]')  # 11001 -> 01001
                print('lab8 recog:', (await pg.inner_text('#l8g .vrow')).replace('\n',' '))
                await pg.click('#lab9 button[data-w="me"][data-i="3"]'); await pg.click('#lab9 button[data-w="op"][data-i="1"]')
                print('lab9 3 vs 1:', await pg.inner_text('#lab9 .bigres'))
                # lab10: drag thumb onto index
                await pg.locator('#l10s').scroll_into_view_if_needed(); s = await pg.locator('#l10s').bounding_box()
                def P(x, y): return s['x'] + x / 240 * s['width'], s['y'] + y / 240 * s['height']
                await pg.mouse.move(*P(40, 150)); await pg.mouse.down(); await pg.mouse.move(*P(160, 80), steps=8); await pg.mouse.up()
                print('lab10 pinch:', (await pg.inner_text('#l10o')).replace('\n',' ')[60:200])
                await pg.click('.qz .ops button[data-r]')
                await pg.click('#k1a')
            await pg.screenshot(path=_os.path.join(OUTDIR, f'web_{scheme}_full.png'), full_page=True)
            for sel in ('#intro', '#map', '#m3', '#m6', '#m8', '#m10'):
                el = pg.locator(sel)
                await el.screenshot(path=_os.path.join(OUTDIR, f'web_{scheme}_{sel[1:]}.png'))
            print(scheme, 'errors:', errs[:5])
            await pg.close()
        pg = await b.new_page(viewport={'width': 390, 'height': 800})
        await pg.goto((ROOT / 'student' / 'index.html').as_uri()); await pg.wait_for_timeout(1200)
        ov = await pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        print('mobile horizontal overflow px:', ov)
        await pg.screenshot(path=_os.path.join(OUTDIR, 'web_mobile.png'), full_page=False)
        pg2 = await b.new_page(viewport={'width': 1100, 'height': 800})
        await pg2.goto((ROOT / 'index.html').as_uri()); await pg2.wait_for_timeout(800)
        await pg2.screenshot(path=_os.path.join(OUTDIR, 'web_entry.png'))
        await b.close()
asyncio.run(main())
