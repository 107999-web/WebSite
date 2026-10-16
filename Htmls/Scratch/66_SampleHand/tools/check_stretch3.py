# -*- coding: utf-8 -*-
"""用真的 stretch3.github.io 編輯器打開 .sb3 並截圖（需要網路），確認積木、參數、註解排版正常。

    python tools/check_stretch3.py 模組05_數手指.sb3 模組08_比對手勢.sb3

截圖存在 tools/_截圖/。
"""
import os as _os
ROOT = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))   # 專案資料夾
OUTDIR = _os.path.join(ROOT, 'tools', '_截圖')                             # 截圖輸出
_os.makedirs(OUTDIR, exist_ok=True)
import sys, asyncio, re
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright
SB3 = _os.path.join(ROOT, 'student', 'sb3') + _os.sep
async def one(b, f):
    pg = await b.new_page(viewport={'width': 1500, 'height': 950}, locale='zh-TW')
    errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('https://stretch3.github.io/', wait_until='networkidle', timeout=90000)
    await pg.wait_for_timeout(2500)
    await pg.get_by_text('檔案', exact=True).first.click()
    await pg.wait_for_timeout(500)
    async with pg.expect_file_chooser() as fc:
        await pg.get_by_text(re.compile('電腦')).first.click()
    await (await fc.value).set_files(SB3 + f)
    await pg.wait_for_timeout(9000)
    await pg.screenshot(path=_os.path.join(OUTDIR, 'ed_' + f.replace('.sb3', '') + '.png'))
    print(f, 'errors', errs[:2])
    await pg.close()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
        for f in sys.argv[1:]:
            await one(b, f)
        await b.close()
asyncio.run(main())
