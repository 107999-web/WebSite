# -*- coding: utf-8 -*-
"""把 student/sb3/ 的每個 .sb3 轉成可離線執行（含攝影機手部偵測）的網頁。

    python make_play.py

輸出到 student/play/<檔名>/index.html。
引擎與手部模型只放一份在 student/play/engine/，所有試玩頁共用（約 26 MB）。
用的是 20260924_SB3轉網頁工具 的 sb3web.convert()。
"""
import os, sys, re, shutil, glob

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WS = os.path.dirname(ROOT)
TOOL = os.path.join(WS, '20260924_SB3轉網頁工具')
sys.path.insert(0, TOOL)
import sb3web  # noqa

SB3 = os.path.join(ROOT, 'student', 'sb3')
PLAY = os.path.join(ROOT, 'student', 'play')
ENGINE = os.path.join(PLAY, 'engine')
SHARED = ['handpose-runtime.js']


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    os.makedirs(ENGINE, exist_ok=True)
    shutil.copy2(os.path.join(TOOL, 'runtime', 'scratch-runtime.js'), ENGINE)
    for f in SHARED:
        shutil.copy2(os.path.join(TOOL, 'runtime', f), ENGINE)
    for p in sorted(glob.glob(os.path.join(SB3, '*.sb3'))):
        name = os.path.splitext(os.path.basename(p))[0]
        out = os.path.join(PLAY, name)
        if os.path.isdir(out):
            shutil.rmtree(out)
        sb3web.convert(p, out, engine_url='../engine/scratch-runtime.js', title=name,
                       log=lambda *a: None)
        html_p = os.path.join(out, 'index.html')
        html = open(html_p, encoding='utf-8').read()
        for f in SHARED:                                  # 改用共用的模型檔
            html = html.replace('src="assets/%s"' % f, 'src="../engine/%s"' % f)
            fp = os.path.join(out, 'assets', f)
            if os.path.exists(fp):
                os.remove(fp)
        open(html_p, 'w', encoding='utf-8').write(html)
        size = sum(os.path.getsize(os.path.join(dp, fn)) for dp, _, fs in os.walk(out) for fn in fs)
        print('%-20s → play/%s/index.html（%.0f KB）' % (name, name, size / 1024))
    total = sum(os.path.getsize(os.path.join(dp, fn)) for dp, _, fs in os.walk(PLAY) for fn in fs)
    print('合計 %.1f MB' % (total / 1048576))


if __name__ == '__main__':
    main()
