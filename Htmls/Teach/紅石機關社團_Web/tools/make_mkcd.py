# -*- coding: utf-8 -*-
"""把 tools/lessons.py 裡每堂的 MakeCode 程式輸出成 .mkcd（MakeCode for Minecraft 專案檔）。

用法：python tools/make_mkcd.py
輸出：makecode/第02堂_聊天指令遙控開關.mkcd …

.mkcd 格式：{"meta": {...}, "source": "<各檔案內容的 JSON>"}，整段用 LZMA（alone 格式）壓縮。
main.blocks 用 tools/_blocks/<名稱>.xml（由 check_mkcd.py --save 從官方編輯器轉出來），
這樣一打開就是積木畫面；沒有 xml 時留空，MakeCode 會先開在 JavaScript，按「積木」也會自動轉換。
不放 README.md：MakeCode 匯入時會把 README 開在右側欄，擋住積木。
"""
import json
import lzma
import re
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lessons import L  # noqa: E402

OUT = ROOT / 'makecode'


def lzma_alone(data: bytes) -> bytes:
    """LZMA alone 格式；把標頭的「原始長度」填成實際長度（MakeCode 用的 LZMA-JS 也這樣寫）。"""
    comp = lzma.compress(data, format=lzma.FORMAT_ALONE, filters=[{'id': lzma.FILTER_LZMA1, 'preset': 7, 'dict_size': 1 << 20}])
    return comp[:5] + struct.pack('<Q', len(data)) + comp[13:]


def project(name, ts):
    xml = ROOT / 'tools' / '_blocks' / f'{name}.xml'
    files = {
        'main.blocks': xml.read_text(encoding='utf-8') if xml.exists() else '',
        'main.ts': ts.rstrip() + '\n',
        'pxt.json': json.dumps({
            'name': name,
            'dependencies': {'core': '*'},
            'description': '',
            'files': ['main.blocks', 'main.ts'],
        }, ensure_ascii=False, indent=4),
    }
    meta = {'cloudId': 'pxt/minecraft', 'editor': 'blocksprj', 'name': name}
    return json.dumps({'meta': meta, 'source': json.dumps(files, ensure_ascii=False, indent=2)}, ensure_ascii=False, indent=2)


def mkcd_name(l):
    name = f'第{l["n"]:02d}堂_{l["mc"]["title"].replace("（選用）", "")}'
    return re.sub(r'[\\/:*?"<>|：，、　 ]+', '_', name).strip('_')


def main():
    OUT.mkdir(exist_ok=True)
    made = []
    for l in L:
        mc = l.get('mc')
        if not mc:
            continue
        name = mkcd_name(l)
        data = project(name, mc['js']).encode('utf-8')
        (OUT / f'{name}.mkcd').write_bytes(lzma_alone(data))
        made.append(name + ('' if (ROOT / 'tools' / '_blocks' / f'{name}.xml').exists() else '（尚無積木 xml）'))
    print('\n'.join(made))
    print(f'共 {len(made)} 個 .mkcd → {OUT}')


if __name__ == '__main__':
    main()
