# -*- coding: utf-8 -*-
"""把 makecode/*.mkcd 匯入官方 MakeCode for Minecraft 網頁編輯器（需要網路）檢查：
  1. 匯入成功、JavaScript 沒有編譯錯誤（Monaco 錯誤標記 0）
  2. 切到「積木」後全部轉得成積木（沒有灰色的 typescript_statement）
  3. 把編輯器轉出的積木 XML 存到 tools/_blocks/，make_mkcd.py 會放進 main.blocks，
     這樣檔案一打開就是積木畫面
用法：python tools/check_mkcd.py [--save]
"""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SAVE = '--save' in sys.argv
BLK = ROOT / 'tools' / '_blocks'
BLK.mkdir(exist_ok=True)

READ = '''async (name) => {
  const open = n => new Promise((ok, no) => { const r = indexedDB.open(n); r.onsuccess = () => ok(r.result); r.onerror = no; });
  const db = await open('__pxt_idb_workspace_minecraft___default');
  const get = s => new Promise(ok => { const r = db.transaction(s).objectStore(s).getAll(); r.onsuccess = () => ok(r.result); });
  const hs = (await get('headers')).filter(h => h.name === name && !h.isDeleted).sort((a, b) => b.modificationTime - a.modificationTime);
  if (!hs.length) return null;
  const t = (await get('texts')).find(x => x.id === hs[0].id);
  return t ? t.files : null;
}'''

bad = 0
with sync_playwright() as p:
    b = p.chromium.launch()
    for f in sorted((ROOT / 'makecode').glob('*.mkcd')):
        ctx = b.new_context(viewport={'width': 1400, 'height': 900})
        pg = ctx.new_page()
        opened = False
        for attempt in range(3):   # 首頁還沒載完就按「匯入」偶爾會沒反應，重試
            pg.goto('https://minecraft.makecode.com/', timeout=90000)
            pg.wait_for_selector('text=匯入', timeout=60000)
            pg.wait_for_timeout(4000)
            pg.get_by_text('匯入', exact=True).first.click(); pg.wait_for_timeout(1200)
            pg.get_by_text('匯入檔案…').click(); pg.wait_for_timeout(1200)
            pg.locator('input[type=file]').first.set_input_files(str(f)); pg.wait_for_timeout(1000)
            pg.locator('.ui.modal button.approve, .ui.modal button.primary').first.click()
            try:
                pg.wait_for_selector('.javascript-menuitem', state='attached', timeout=40000)
                opened = True
                break
            except Exception:
                pass
        if not opened:
            pg.screenshot(path=str(ROOT / 'tools' / '_blocks' / f'fail_{f.stem}.png'))
            print('XX', f.stem, '編輯器沒有開起來（截圖在 tools/_blocks）'); bad += 1; ctx.close(); continue
        pg.wait_for_timeout(3000)
        start = 'JS' if pg.locator('.javascript-menuitem.selected').count() else '積木'
        if start == '積木':
            pg.locator('.javascript-menuitem').locator('visible=true').first.click()
        pg.wait_for_function('typeof monaco === "object" && monaco.editor.getModels().length > 0', timeout=60000)
        pg.wait_for_timeout(4000)
        markers = pg.evaluate('monaco.editor.getModelMarkers({}).filter(m => m.severity >= 8).map(m => m.message)')
        pg.locator('.blocks-menuitem').locator('visible=true').first.click()
        pg.wait_for_timeout(6000)
        files = pg.evaluate(READ, f.stem)
        xml = (files or {}).get('main.blocks', '')
        gray = xml.count('typescript_statement') + xml.count('typescript_expression')
        nblk = xml.count('<block ')
        ok = files is not None and not markers and gray == 0 and nblk > 0
        bad += not ok
        print(f'{"OK" if ok else "XX"}  {f.stem:28} 開啟時：{start:6} 編譯錯誤 {len(markers)} 積木 {nblk:3} 灰色 {gray}  {markers[:2] if markers else ""}')
        if SAVE and ok:
            (BLK / f'{f.stem}.xml').write_text(xml, encoding='utf-8')
        ctx.close()
    b.close()
print('失敗', bad)
sys.exit(1 if bad else 0)
