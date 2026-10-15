# -*- coding: utf-8 -*-
"""用真的 Scratch 編輯器（stretch3.github.io）開 .sb3，截圖看積木與註解的樣子（需要網路）。

    python tools/check_stretch3.py [檔名.sb3 ...]

截圖存在 tools/_截圖/stretch3_*.png。
"""
import os, sys, asyncio, pathlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'tools', '_截圖'); os.makedirs(OUT, exist_ok=True)
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright
SB3 = pathlib.Path(ROOT) / 'student' / 'sb3'
FILES = sys.argv[1:] or ['2_出場與退場.sb3', '7_清單工具.sb3', '完整函式庫.sb3']


async def main():
    proxy = os.environ.get('HTTPS_PROXY')
    async with async_playwright() as p:
        b = await p.chromium.launch(proxy={'server': proxy} if proxy else None)
        for f in FILES:
            pg = await b.new_page(viewport={'width': 1400, 'height': 900}, ignore_https_errors=True)
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto('https://stretch3.github.io/', timeout=90000)
            await pg.wait_for_timeout(6000)
            inp = pg.locator('input[type=file]').first
            await inp.set_input_files(str(SB3 / f))
            await pg.wait_for_timeout(6000)
            sprites = await pg.locator('[class*="sprite-selector-item_sprite-name"]').all_inner_texts()
            await pg.screenshot(path=os.path.join(OUT, 'stretch3_%s.png' % f[:-4]))
            print(f, '角色：', sprites, '錯誤：', errs[:2] or '無')
            await pg.close()
        await b.close()

asyncio.run(main())
