# -*- coding: utf-8 -*-
"""student/play/ 網頁版的截圖測試（Playwright＋假攝影機）：按綠旗、切到鍵盤模式按數字鍵，檢查畫面與 console 錯誤。

    python tools/test_play_pages.py

截圖存在 tools/_截圖/。假攝影機畫面是 Chromium 內建的綠色旋轉圖案，不是背景。
"""
import os as _os
ROOT = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))   # 專案資料夾
OUTDIR = _os.path.join(ROOT, 'tools', '_截圖')                             # 截圖輸出
_os.makedirs(OUTDIR, exist_ok=True)
import sys, asyncio, pathlib
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright
PLAY = pathlib.Path(ROOT) / 'student' / 'play'
JOBS = [('模組06_穩定判斷', ['k', '3']), ('模組09_猜拳勝負', ['k', '2', ' ']), ('模組10_手指游標', ['k']),
        ('手勢模組工具箱', ['k', '6']), ('模組05_數手指', []), ('模組01_偵測手', [])]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
        for name, keys in JOBS:
            pg = await b.new_page(viewport={'width': 1000, 'height': 800})
            errs = []
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto((PLAY / name / 'index.html').as_uri())
            await pg.wait_for_timeout(2500)
            await pg.click('#btnGo')
            await pg.wait_for_timeout(2500)
            for k in keys:
                if k in '0123456789':
                    await pg.keyboard.down(k); await pg.wait_for_timeout(400); await pg.keyboard.up(k)
                else:
                    await pg.keyboard.press(k)
                await pg.wait_for_timeout(300)
            if name.startswith('模組09'):
                await pg.wait_for_timeout(1900)
            if name.startswith('模組10'):
                box = await pg.locator('#stage').bounding_box()
                await pg.mouse.move(box['x'] + box['width'] * .5, box['y'] + box['height'] * .5)
                await pg.mouse.down(); await pg.wait_for_timeout(150); await pg.mouse.up()
            await pg.wait_for_timeout(500)
            await pg.screenshot(path=_os.path.join(OUTDIR, f'play_{name}.png'))
            print(name, 'errors:', errs[:3])
            await pg.close()
        await b.close()
asyncio.run(main())
