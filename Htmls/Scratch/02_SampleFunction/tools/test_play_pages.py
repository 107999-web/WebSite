# -*- coding: utf-8 -*-
"""student/play/ 網頁版的截圖測試（Playwright，用真的畫面引擎）：按綠旗、按鍵，截圖並檢查 console 錯誤。

    python tools/test_play_pages.py

截圖存在 tools/_截圖/。headless 測試（test_library.js）沒有畫面引擎，
「碰到？」、角色被擋在舞台邊緣這些事只有這裡看得到。
"""
import os, sys, asyncio, pathlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTDIR = os.path.join(ROOT, 'tools', '_截圖')
os.makedirs(OUTDIR, exist_ok=True)
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright
PLAY = pathlib.Path(ROOT) / 'student' / 'play'
# (頁面, [(按鍵, 按住毫秒, 之後等待毫秒)], 截圖名)
JOBS = [
    ('1_文字與對話', [('3', 80, 4200)], 'a'), ('1_文字與對話', [('2', 80, 3000)], 'b'),
    ('2_出場與退場', [('3', 80, 150)], 'a'), ('2_出場與退場', [('6', 80, 300)], 'b'),
    ('3_持續特效', [('4', 80, 400)], 'a'),
    ('4_角色管理', [('1', 80, 600)], 'a'), ('4_角色管理', [('4', 80, 400), ('5', 80, 300), ('3', 80, 300)], 'b'),
    ('5_計時與流程', [('1', 80, 1200), ('2', 80, 800), ('8', 80, 500)], 'a'),
    ('6_數學小工具', [('4', 80, 400)], 'a'), ('6_數學小工具', [('5', 80, 200), ('5', 80, 400)], 'b'),
    ('7_清單工具', [('2', 80, 300), ('3', 80, 400)], 'a'),
    ('8_遊戲機制', [('ArrowUp', 60, 250)], 'a'), ('8_遊戲機制', [('ArrowRight', 3500, 400)], 'b'),
    ('完整函式庫', [], 'a'),
]


async def main():
    bad = 0
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, keys, tag in JOBS:
            pg = await b.new_page(viewport={'width': 900, 'height': 760})
            errs = []
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto((PLAY / name / 'index.html').as_uri())
            await pg.wait_for_timeout(1500)
            await pg.click('#btnGo')
            await pg.wait_for_timeout(1200)
            await pg.locator('#stage').click(position={'x': 5, 'y': 5})
            for k, hold, after in keys:
                await pg.keyboard.down(k); await pg.wait_for_timeout(hold); await pg.keyboard.up(k)
                await pg.wait_for_timeout(after)
            out = os.path.join(OUTDIR, 'play_%s_%s.png' % (name, tag))
            await pg.locator('#stage').screenshot(path=out)
            print('%-14s %s  errors: %s' % (name, tag, errs[:2] or '無'))
            bad += len(errs)
            await pg.close()
        await b.close()
    print('console 錯誤合計：%d' % bad)


asyncio.run(main())
