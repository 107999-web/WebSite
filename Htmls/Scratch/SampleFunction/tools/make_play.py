# -*- coding: utf-8 -*-
"""把 student/sb3/ 的每個 .sb3 轉成可離線執行的網頁（不需要擴充功能）。

    python make_play.py

輸出到 student/play/<檔名>/index.html；Scratch 引擎只放一份在 student/play/engine/，全部共用（約 9.3 MB）。
用的是 20260924_SB3轉網頁工具 的 sb3web.convert()。
"""
import os, sys, shutil, glob

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WS = os.path.dirname(ROOT)
TOOL = os.path.join(WS, '20260924_SB3轉網頁工具')
sys.path.insert(0, TOOL)
import sb3web  # noqa

SB3 = os.path.join(ROOT, 'student', 'sb3')
PLAY = os.path.join(ROOT, 'student', 'play')
ENGINE = os.path.join(PLAY, 'engine')


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    os.makedirs(ENGINE, exist_ok=True)
    shutil.copy2(os.path.join(TOOL, 'runtime', 'scratch-runtime.js'), ENGINE)
    for p in sorted(glob.glob(os.path.join(SB3, '*.sb3'))):
        name = os.path.splitext(os.path.basename(p))[0]
        out = os.path.join(PLAY, name)
        if os.path.isdir(out):
            shutil.rmtree(out)
        sb3web.convert(p, out, engine_url='../engine/scratch-runtime.js', title=name, log=lambda *a: None)
        # 清單監看：模板把清單包在有底色的數值框裡，清單長一點時會出現一大塊深色底 → 這裡蓋掉
        with open(os.path.join(out, 'assets', 'player.css'), 'a', encoding='utf-8') as f:
            f.write('\n/* Scratch函式庫：清單監看不要數值框的底色 */\n'
                    '.mon.mon-list{flex-direction:column;align-items:stretch}'
                    '.mon.mon-list .mon-value{background:transparent;color:inherit;padding:0;min-width:0}\n')
        size = sum(os.path.getsize(os.path.join(dp, fn)) for dp, _, fs in os.walk(out) for fn in fs)
        print('%-16s → play/%s/index.html（%.0f KB）' % (name, name, size / 1024))
    total = sum(os.path.getsize(os.path.join(dp, fn)) for dp, _, fs in os.walk(PLAY) for fn in fs)
    print('合計 %.1f MB' % (total / 1048576))


if __name__ == '__main__':
    main()
