# -*- coding: utf-8 -*-
"""Scratch 基礎函式庫：產生 8 個分類示範 .sb3、1 個完整函式庫 .sb3、7 個 .sprite3。

    python build_library.py            # 全部產生到 ../student/sb3/ 與 ../student/sprite3/
    python build_library.py 3          # 只產生第 3 類（0 ＝ 完整函式庫）

兩種函式（和教材第 0 章一致）
* A 型「角色自己用」：放在角色裡，動的是角色自己（淡入、抖動、打字機…）。
  內部用「僅適用當前角色」的變數，所以整個角色可以匯出成 .sprite3 帶到別的作品。
* B 型「舞台服務台」：放在舞台，負責計算（數學、清單、計時）。
  任何角色都能用：把輸入寫進「參數1～參數4」→「廣播 (函式名稱) 並等待」→ 讀「結果」。

需要 20260923_Scratch專案產生器 的 sb3lib.py / svgkit.py。
"""
import sys, os, json, zipfile, math

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WS = os.path.dirname(ROOT)                                   # 01_專案
sys.path.insert(0, os.path.join(WS, '20260923_Scratch專案產生器'))
from sb3lib import *            # noqa
from sb3lib import B, ASSETS    # noqa
import svgkit as K

OUT = os.path.join(ROOT, 'student', 'sb3')
OUT_SP = os.path.join(ROOT, 'student', 'sprite3')

CATS = {
    1: ('文字與對話', '#9966FF'),
    2: ('出場與退場', '#FF6680'),
    3: ('持續特效', '#FF8C1A'),
    4: ('角色管理', '#4C97FF'),
    5: ('計時與流程', '#0FBD8C'),
    6: ('數學小工具', '#59C059'),
    7: ('清單工具', '#FF661A'),
    8: ('遊戲機制', '#E8544B'),
    0: ('完整函式庫', '#3F4A56'),
}


def filename(n):
    return '完整函式庫.sb3' if n == 0 else '%d_%s.sb3' % (n, CATS[n][0])


# ================================================================ 積木擴充
class T(Target):
    """sb3lib.Target ＋ 本專案用到的其他積木。"""

    def clear_fx(self): return self.add('looks_cleargraphiceffects')

    def set_fx(self, eff, v):
        return self.add('looks_seteffectto', {'VALUE': self.val(v, NUM)}, {'EFFECT': [eff, None]})

    def direction(self): return self.add('motion_direction')

    def rot_style(self, s):
        return self.add('motion_setrotationstyle', {}, {'STYLE': [s, None]})

    def mop(self, op, x): return self.mathop(op, x)

    def neg(self, x): return self.sub_(0, x)

    def lv(self, name, init=0):
        """僅適用當前角色的變數（沒有就建立）。"""
        if name not in self.variables:
            self.variables[name] = Var(name, init)
        return self.variables[name]

    def front_(self): return self.front('front')


class Ctx:
    """一個檔案的產生過程：全域變數、清單、廣播都放在舞台，避免重複建立。"""

    def __init__(self, stage):
        self.stage, self.V, self.L, self.M = stage, {}, {}, {}

    def v(self, name, init=0):
        if name not in self.V:
            self.V[name] = Var(name, init)
            self.stage.variables[name] = self.V[name]
        return self.V[name]

    def l(self, name, items=None):
        if name not in self.L:
            self.L[name] = Lst(name, list(items or []))
            self.stage.lists[name] = self.L[name]
        return self.L[name]

    def m(self, name):
        if name not in self.M:
            self.M[name] = Msg(name)
            self.stage.broadcasts[name] = self.M[name]
        return self.M[name]


def P(c, i):
    return c.v('參數%d' % i, '')


# ================================================================ 函式清單（網頁也讀這份）
# id, 分類, 型, 自訂積木 proccode, 參數名, 輸入說明, 輸出說明, 一句話
FUNCS = []


def fn(fid, cat, typ, code, args, inp, out, desc, warp=True):
    FUNCS.append(dict(id=fid, cat=cat, type=typ, code=code, args=list(args), inp=inp, out=out,
                      desc=desc, warp=warp))
    return code


def comment_text(fid):
    f = [x for x in FUNCS if x['id'] == fid][0]
    head = '【%s】%s（%s 型）' % (f['id'], f['code'].replace('%s', '( )'),
                              'A 角色自己用' if f['type'] == 'A' else 'B 舞台服務台')
    return '%s\n輸入：%s\n輸出：%s\n\n%s' % (head, f['inp'], f['out'], f['desc'])


def cm(t, h, fid, extra='', w=380, hgt=None):
    txt = comment_text(fid) + (('\n\n' + extra) if extra else '')
    lines = sum(1 + len(s) // 24 for s in txt.split('\n'))
    t.comment(h, txt, w, hgt or max(110, lines * 19 + 20))


# ---------------------------------------------------------------- ① 文字與對話
F_TYPE = fn('1-1', 1, 'A', '打字機說 %s 每字 %s 秒', ['文字', '每字秒數'],
            '文字、每個字的間隔秒數', '（角色的對話框）',
            '一個字一個字說出來。做法：用「字串的第 n 字」把字一個一個接到「打字內容」後面，每接一個就說一次。')
F_SUB = fn('1-2', 1, 'A', '打字機字幕 %s 每字 %s 秒', ['文字', '每字秒數'],
           '文字、每個字的間隔秒數', '字幕（所有角色適用的變數，用「大型監看」顯示在舞台上）',
           '和打字機說一樣，但字是寫進變數「字幕」。把「字幕」的監看改成「大型顯示」，就是旁白字幕。')
F_DLG = fn('1-3', 1, 'B', '播放對話', [],
           '清單「對話角色」「對話內容」（同一行是同一句）', '目前說話者、目前台詞＋廣播「說台詞」',
           '一行一行讀清單，把說話者和台詞放進變數，再廣播「說台詞」並等待。'
           '每個角色收到後，只要檢查「目前說話者 = 我的名字」就知道輪到自己。換劇本只要改清單，不用改程式。',
           warp=False)
F_CUT = fn('1-4', 1, 'B', '取出片段 %s 從 %s 到 %s', ['文字', '從', '到'],
           '文字、從第幾個字、到第幾個字', '結果',
           'Scratch 只有「字串的第 n 字」，一次只能拿一個字。用迴圈從第「從」個字拿到第「到」個字，接起來就是一段。')
F_PAD = fn('1-5', 1, 'B', '補零 %s 補到 %s 位', ['數字', '位數'],
           '數字、要幾位數', '結果（文字，例如 007）',
           '字數不夠就在前面接一個「0」，直到夠長為止。計時器、分數、關卡編號顯示成 007、01:05 都要用它。\n'
           '⚠ 結果是「文字」：拿 007 和 7 用「＝」比，Scratch 會當成數字比，結果「成立」。')


def f_typewriter(t, c):
    內容 = t.lv('打字內容', ''); 位置 = t.lv('打字位置')
    h = t.define(F_TYPE, ['文字', '每字秒數'])
    t.script(h, t.setv(內容, ''), t.setv(位置, 0),
             t.repeat(t.length(t.arg('文字')),
                      t.chv(位置, 1),
                      t.setv(內容, t.join(內容, t.letter(位置, t.arg('文字')))),
                      t.say(內容),
                      t.wait(t.arg('每字秒數'))))
    cm(t, h, '1-1', '沒有勾「執行時不重新整理畫面」：要一個字一個字「被看見」，每次都要讓畫面更新。')


def f_subtitle(t, c):
    位置 = t.lv('打字位置'); 字幕 = c.v('字幕', '')
    h = t.define(F_SUB, ['文字', '每字秒數'])
    t.script(h, t.setv(字幕, ''), t.setv(位置, 0),
             t.repeat(t.length(t.arg('文字')),
                      t.chv(位置, 1),
                      t.setv(字幕, t.join(字幕, t.letter(位置, t.arg('文字')))),
                      t.wait(t.arg('每字秒數'))))
    cm(t, h, '1-2')


def f_dialog(st, c):
    行 = c.v('對話行'); 角 = c.l('對話角色'); 詞 = c.l('對話內容')
    h = st.define(F_DLG, [])
    st.script(h, st.setv(行, 0),
              st.repeat(st.llen(角),
                        st.chv(行, 1),
                        st.setv(c.v('目前說話者', ''), st.item(行, 角)),
                        st.setv(c.v('目前台詞', ''), st.item(行, 詞)),
                        st.broadcast(c.m('說台詞'), True),
                        st.wait(0.8)),
              st.broadcast(c.m('對話結束')))
    cm(st, h, '1-3', '「廣播並等待」會等到所有收到訊息的程式都跑完 —— 也就是說話的角色打完字，才讀下一行。')


def f_cut(st, c):
    結果 = c.v('結果', ''); 第 = c.v('片段位置')
    h = st.define(F_CUT, ['文字', '從', '到'], warp=True)
    st.script(h, st.setv(結果, ''), st.setv(第, st.arg('從')),
              st.repeat(st.add_(st.sub_(st.arg('到'), st.arg('從')), 1),
                        st.setv(結果, st.join(結果, st.letter(第, st.arg('文字')))),
                        st.chv(第, 1)))
    cm(st, h, '1-4')


def f_pad(st, c):
    結果 = c.v('結果', '')
    h = st.define(F_PAD, ['數字', '位數'], warp=True)
    st.script(h, st.setv(結果, st.arg('數字')),
              st.repeat_until(st.not_(st.lt(st.length(結果), st.arg('位數'))),
                              st.setv(結果, st.join('0', 結果))))
    cm(st, h, '1-5')


def f_dialog_listener(t, c, name):
    """每個會說話的角色都要有：收到「說台詞」→ 輪到我才說。"""
    我 = t.lv('我的名字', name)
    h = t.when_msg(c.m('說台詞'))
    t.script(h, t.if_else(t.eq(c.v('目前說話者', ''), 我),
                          [t.call(F_TYPE, c.v('目前台詞', ''), 0.06)],
                          [t.say('')]))
    t.comment(h, '【配合 1-3 播放對話】每個會說話的角色都放這一段。\n'
                 '「我的名字」是這個角色自己的變數，要和清單「對話角色」裡寫的一樣。', 340, 90)
    t.script(t.when_msg(c.m('對話結束')), t.say(''))


# ---------------------------------------------------------------- ② 出場與退場
F_FIN = fn('2-1', 2, 'A', '淡入 %s 秒', ['秒數'], '秒數', '（角色慢慢出現）',
           '幻影效果從 100（看不見）變到 0。用「計時器」算經過了幾秒，所以不管電腦快慢，幾秒就是幾秒。', warp=False)
F_FOUT = fn('2-2', 2, 'A', '淡出 %s 秒', ['秒數'], '秒數', '（角色慢慢消失，最後隱藏）',
            '幻影效果從 0 變到 100，最後「隱藏」並把幻影設回 0 —— 下次顯示時才不會是透明的。', warp=False)
F_POP = fn('2-3', 2, 'A', '彈出放大到尺寸 %s', ['尺寸'], '最後的尺寸', '（角色「啵」一聲跳出來）',
           '先在 0.2 秒內放大到目標的 1.2 倍（衝過頭），再用 0.1 秒縮回目標尺寸。衝過頭再彈回，看起來就有彈性。', warp=False)
F_SHR = fn('2-4', 2, 'A', '縮小消失 %s 秒', ['秒數'], '秒數', '（角色縮小到不見，最後隱藏）',
           '先記住原本的尺寸，縮到 0 之後隱藏，再把尺寸設回原本的大小。「先記住、最後還原」是動畫函式的好習慣。', warp=False)
F_DROP = fn('2-5', 2, 'A', '彈跳落到 y %s', ['地面y'], '落地的 y 座標', '（角色從上方掉下來，彈幾下停住）',
            '每一格：速度減掉重力、y 加上速度。碰到地面就把速度反過來並打折（×−0.55），彈得越來越低，速度很小就停。', warp=False)
F_SLIDE = fn('2-6', 2, 'A', '從 %s 邊滑入 %s 秒', ['方向', '秒數'], '方向（左／右／上／下）、秒數',
             '（角色從舞台邊緣滑回原位）',
             '先記住現在的位置，跳到舞台邊緣，再用「滑行」回到記住的位置。所以先把角色擺在想要的位置，再呼叫它。', warp=False)


def elapsed(t, v):
    return t.sub_(t.timer(), v)


def f_fadein(t, c):
    起 = t.lv('動畫起點')
    h = t.define(F_FIN, ['秒數'])
    t.script(h, t.set_fx('GHOST', 100), t.show(), t.setv(起, t.timer()),
             t.repeat_until(t.gt(elapsed(t, 起), t.arg('秒數')),
                            t.set_fx('GHOST', t.sub_(100, t.mul(100, t.div(elapsed(t, 起), t.arg('秒數')))))),
             t.set_fx('GHOST', 0))
    cm(t, h, '2-1', '⚠ 不要寫成「重複 10 次：幻影改變 −10、等待 0.1 秒」：等待會一點一點累積誤差，電腦慢的時候整個變慢。')


def f_fadeout(t, c):
    起 = t.lv('動畫起點')
    h = t.define(F_FOUT, ['秒數'])
    t.script(h, t.set_fx('GHOST', 0), t.setv(起, t.timer()),
             t.repeat_until(t.gt(elapsed(t, 起), t.arg('秒數')),
                            t.set_fx('GHOST', t.mul(100, t.div(elapsed(t, 起), t.arg('秒數'))))),
             t.hide(), t.set_fx('GHOST', 0))
    cm(t, h, '2-2')


def f_pop(t, c):
    起 = t.lv('動畫起點')
    h = t.define(F_POP, ['尺寸'])
    t.script(h, t.size(0), t.show(), t.setv(起, t.timer()),
             t.repeat_until(t.gt(elapsed(t, 起), 0.2),
                            t.size(t.mul(t.mul(t.arg('尺寸'), 1.2), t.div(elapsed(t, 起), 0.2)))),
             t.setv(起, t.timer()),
             t.repeat_until(t.gt(elapsed(t, 起), 0.1),
                            t.size(t.mul(t.arg('尺寸'), t.sub_(1.2, t.mul(0.2, t.div(elapsed(t, 起), 0.1)))))),
             t.size(t.arg('尺寸')))
    cm(t, h, '2-3')


def f_shrink(t, c):
    起 = t.lv('動畫起點'); 原 = t.lv('原本尺寸', 100)
    h = t.define(F_SHR, ['秒數'])
    t.script(h, t.setv(原, t.size_of()), t.setv(起, t.timer()),
             t.repeat_until(t.gt(elapsed(t, 起), t.arg('秒數')),
                            t.size(t.mul(原, t.sub_(1, t.div(elapsed(t, 起), t.arg('秒數')))))),
             t.hide(), t.size(原))
    cm(t, h, '2-4')


def f_drop(t, c):
    速 = t.lv('落下速度')
    h = t.define(F_DROP, ['地面y'])
    t.script(h, t.set_y(170), t.show(), t.setv(速, 0),
             t.repeat_until(t.and_(t.eq(速, 0), t.eq(t.y_pos(), t.arg('地面y'))),
                            t.chv(速, -1.2),
                            t.change_y(速),
                            t.if_(t.lt(t.y_pos(), t.arg('地面y')),
                                  t.set_y(t.arg('地面y')),
                                  t.setv(速, t.mul(速, -0.55)),
                                  t.if_(t.lt(速, 2), t.setv(速, 0)))))
    cm(t, h, '2-5', '這個是「一格一格」的物理：每一格畫面算一次。和計時器寫法不同，但落點一定準。')


def f_slide(t, c):
    X = t.lv('記住x'); Y = t.lv('記住y')
    h = t.define(F_SLIDE, ['方向', '秒數'])
    t.script(h, t.setv(X, t.x_pos()), t.setv(Y, t.y_pos()),
             t.if_(t.eq(t.arg('方向'), '左'), t.goto(-300, Y)),
             t.if_(t.eq(t.arg('方向'), '右'), t.goto(300, Y)),
             t.if_(t.eq(t.arg('方向'), '上'), t.goto(X, 240)),
             t.if_(t.eq(t.arg('方向'), '下'), t.goto(X, -240)),
             t.show(),
             t.glide(t.arg('秒數'), X, Y))
    cm(t, h, '2-6', '定位到 x: −300 時，Scratch 會把角色留一點點在舞台邊（不會整個跑出去），所以看起來是從邊緣滑進來。')


# ---------------------------------------------------------------- ③ 持續特效
F_SHAKE = fn('3-1', 3, 'A', '抖動 %s 次 強度 %s', ['次數', '強度'], '次數、左右移動幾步', '（角色左右抖，最後回原位）',
             '記住原本的 x，左右來回跳，最後回到原本的 x。適合「被打到」「答錯了」。', warp=False)
F_BLINK = fn('3-2', 3, 'A', '閃爍 %s 次 間隔 %s 秒', ['次數', '間隔'], '次數、間隔秒數', '（角色一閃一閃，最後顯示）',
             '隱藏、等、顯示、等，重複幾次。最後一定是「顯示」的狀態。', warp=False)
F_BREATH = fn('3-3', 3, 'A', '呼吸 %s 秒 幅度 %s', ['秒數', '幅度'], '秒數、尺寸變化多少', '（角色一大一小，最後回原尺寸）',
              '尺寸 ＝ 原本尺寸 ＋ 幅度 × sin(經過秒數 × 360)。sin 會在 −1 到 1 之間來回，所以尺寸會一大一小，一秒一次。', warp=False)
F_SWING = fn('3-4', 3, 'A', '擺動 %s 秒 角度 %s', ['秒數', '角度'], '秒數、最多轉幾度', '（角色左右搖擺，最後回原方向）',
             '方向 ＝ 原本方向 ＋ 角度 × sin(經過秒數 × 360)。⚠ 角色的旋轉方式要是「任意旋轉」才看得到。', warp=False)
F_FLOAT = fn('3-5', 3, 'A', '漂浮 %s 秒 高度 %s', ['秒數', '高度'], '秒數、上下飄多高', '（角色上下飄，最後回原位）',
             'y ＝ 原本 y ＋ 高度 × sin(經過秒數 × 180)，兩秒上下一次，比呼吸慢，像飄在水上。', warp=False)
F_ANIM = fn('3-6', 3, 'A', '播放造型 %s 到 %s 每格 %s 秒', ['第一格', '最後一格', '每格秒數'],
            '第一個、最後一個造型的編號、每格秒數', '（造型動畫播一次）',
            '先用「換到第 n 個造型」跳到第一格，再「下一個造型」一格一格播到最後一格。', warp=False)
F_GOTO_C = fn('3-7', 3, 'A', '換到第 %s 個造型', ['編號'], '造型編號', '（換好造型）',
              '一直按「下一個造型」直到造型編號等於目標（最多 50 次，不會卡住）。'
              '勾了「執行時不重新整理畫面」，所以一瞬間就換好，看不到中間的造型。')


def f_shake(t, c):
    原 = t.lv('抖動原x')
    h = t.define(F_SHAKE, ['次數', '強度'])
    t.script(h, t.setv(原, t.x_pos()),
             t.repeat(t.arg('次數'),
                      t.set_x(t.add_(原, t.arg('強度'))), t.wait(0.03),
                      t.set_x(t.sub_(原, t.arg('強度'))), t.wait(0.03)),
             t.set_x(原))
    cm(t, h, '3-1')


def f_blink(t, c):
    h = t.define(F_BLINK, ['次數', '間隔'])
    t.script(h, t.repeat(t.arg('次數'), t.hide(), t.wait(t.arg('間隔')), t.show(), t.wait(t.arg('間隔'))))
    cm(t, h, '3-2')


def sine_fx(t, fid, code, startv, orig_v, getter, setter, speed):
    起 = t.lv(startv); 原 = t.lv(orig_v)
    a0, a1 = [x for x in FUNCS if x['id'] == fid][0]['args']
    h = t.define(code, [a0, a1])
    t.script(h, t.setv(原, getter()), t.setv(起, t.timer()),
             t.repeat_until(t.gt(elapsed(t, 起), t.arg(a0)),
                            setter(t.add_(原, t.mul(t.arg(a1), t.mop('sin', t.mul(elapsed(t, 起), speed)))))),
             setter(原))
    cm(t, h, fid)


def f_breath(t, c): sine_fx(t, '3-3', F_BREATH, '呼吸起點', '呼吸原尺寸', t.size_of, t.size, 360)
def f_swing(t, c): sine_fx(t, '3-4', F_SWING, '擺動起點', '擺動原方向', t.direction, t.point, 360)
def f_float(t, c): sine_fx(t, '3-5', F_FLOAT, '漂浮起點', '漂浮原y', t.y_pos, t.set_y, 180)


def f_goto_costume(t, c):
    h = t.define(F_GOTO_C, ['編號'], warp=True)
    t.script(h, t.repeat(50, t.if_(t.not_(t.eq(t.costume_number(), t.arg('編號'))), t.next_costume())))
    cm(t, h, '3-7', '為什麼不直接「造型換成 (編號)」？那個積木收到數字會當「第幾個」、收到文字會當「造型名稱」，很容易搞混。'
                    '這樣寫一定是「第幾個」。')


def f_anim(t, c):
    include(t, c, ['3-7'])
    h = t.define(F_ANIM, ['第一格', '最後一格', '每格秒數'])
    t.script(h, t.call(F_GOTO_C, t.arg('第一格')),
             t.repeat(t.sub_(t.arg('最後一格'), t.arg('第一格')),
                      t.wait(t.arg('每格秒數')), t.next_costume()),
             t.wait(t.arg('每格秒數')))
    cm(t, h, '3-6', '函式裡面可以呼叫別的函式：這裡用到 3-7「換到第 n 個造型」。')


# ---------------------------------------------------------------- ④ 角色管理
F_RESET = fn('4-1', 4, 'A', '重設角色', [], '（無）', '（角色回到乾淨的樣子）',
             '清除圖像效果、尺寸 100、面朝 90 度、不說話、顯示、移到最上層。動畫被中斷時，角色常常卡在半透明或縮小的狀態，呼叫它就恢復。')
F_CLR = fn('4-2', 4, 'B', '清除所有分身', [], '（無）', '廣播「清除分身」',
           'Scratch 沒有「刪除所有分身」的積木。做法：廣播「清除分身」，每個會產生分身的角色都放一段'
           '「當收到清除分身 → 刪除這個分身」。本體收到也沒關係，「刪除這個分身」對本體沒有作用。')
F_EMPTY = fn('4-3', 4, 'B', '清空舞台', [], '（無）', '廣播「全部隱藏」「清除分身」',
             '換關卡、換畫面時用：所有角色收到「全部隱藏」就隱藏，分身全部刪掉。標題、按鈕這些「介面」角色不要接這個訊息。')
F_CLONES = fn('4-4', 4, 'A', '建立分身群 %s 個', ['個數'], '要幾個分身', '每個分身的「編號」（1、2、3…，本體是 0）',
              '「編號」是僅適用當前角色的變數：建立分身的那一瞬間，分身會複製一份當時的值。'
              '所以先設好編號再建立分身，每個分身就有自己的號碼。最後把本體的編號設回 0。')
F_RAND = fn('4-5', 4, 'A', '移到隨機位置 留邊 %s', ['留邊'], '離舞台邊緣至少幾步', '（角色跳到隨機位置）',
            '舞台 x 是 −240～240、y 是 −180～180。兩邊各留一點，角色才不會一半在舞台外。')
F_FENCE = fn('4-6', 4, 'A', '限制在舞台內 留邊 %s', ['留邊'], '離舞台邊緣至少幾步', '（角色被拉回舞台內）',
             '超出右邊就設回右邊界、超出左邊就設回左邊界，上下也一樣。放在「重複無限次」裡，角色就跑不出去。')
F_FOLLOW = fn('4-7', 4, 'A', '平滑跟隨 x %s y %s 比例 %s', ['目標x', '目標y', '比例'], '目標的 x、y、每次靠近的比例（0～1）',
              '（角色往目標靠近一點）',
              '每次只走「剩下距離 × 比例」。離得遠走得快，快到了走得慢，看起來很柔順（這叫做緩動）。放在迴圈裡一直呼叫。')


def f_reset(t, c):
    h = t.define(F_RESET, [], warp=True)
    t.script(h, t.clear_fx(), t.size(100), t.point(90), t.say(''), t.show(), t.front_())
    cm(t, h, '4-1')


def f_clear_clones(st, c):
    h = st.define(F_CLR, [], warp=True)
    st.script(h, st.broadcast(c.m('清除分身')))
    cm(st, h, '4-2')


def f_empty(st, c):
    h = st.define(F_EMPTY, [], warp=True)
    st.script(h, st.broadcast(c.m('全部隱藏')), st.broadcast(c.m('清除分身')))
    cm(st, h, '4-3')


def listeners_clear(t, c, hide=True):
    t.script(t.when_msg(c.m('清除分身')), t.delete_clone())
    if hide:
        t.script(t.when_msg(c.m('全部隱藏')), t.hide())


def f_clones(t, c):
    計 = t.lv('分身計數'); 編 = t.lv('編號')
    h = t.define(F_CLONES, ['個數'], warp=True)
    t.script(h, t.setv(計, 0),
             t.repeat(t.arg('個數'), t.chv(計, 1), t.setv(編, 計), t.clone_self()),
             t.setv(編, 0))
    cm(t, h, '4-4', '（踩過的坑）本體不要直接拿「編號」數數：本體的編號永遠是 0，才分得出誰是本體。')


def f_rand(t, c):
    h = t.define(F_RAND, ['留邊'], warp=True)
    t.script(h, t.goto(t.random(t.sub_(t.arg('留邊'), 240), t.sub_(240, t.arg('留邊'))),
                       t.random(t.sub_(t.arg('留邊'), 180), t.sub_(180, t.arg('留邊')))))
    cm(t, h, '4-5')


def f_fence(t, c):
    h = t.define(F_FENCE, ['留邊'], warp=True)
    右 = lambda: t.sub_(240, t.arg('留邊')); 上 = lambda: t.sub_(180, t.arg('留邊'))
    t.script(h,
             t.if_(t.gt(t.x_pos(), 右()), t.set_x(右())),
             t.if_(t.lt(t.x_pos(), t.neg(右())), t.set_x(t.neg(右()))),
             t.if_(t.gt(t.y_pos(), 上()), t.set_y(上())),
             t.if_(t.lt(t.y_pos(), t.neg(上())), t.set_y(t.neg(上()))))
    cm(t, h, '4-6')


def f_follow(t, c):
    h = t.define(F_FOLLOW, ['目標x', '目標y', '比例'], warp=True)
    t.script(h, t.change_x(t.mul(t.sub_(t.arg('目標x'), t.x_pos()), t.arg('比例'))),
             t.change_y(t.mul(t.sub_(t.arg('目標y'), t.y_pos()), t.arg('比例'))))
    cm(t, h, '4-7')


# ---------------------------------------------------------------- ⑤ 計時與流程
F_WAIT = fn('5-1', 5, 'A', '等待 %s 秒（可跳過）', ['秒數'], '秒數', '（等完或被跳過才往下）',
            '取代內建的「等待」：一直檢查「時間到了嗎？」或「變數 跳過 ＝ 1 嗎？」，哪個先成立就結束。'
            '結束時如果是被跳過的，把「跳過」設回 0 —— 按一次只跳過一段。', warp=False)
F_CD = fn('5-2', 5, 'B', '開始倒數 %s 秒', ['秒數'], '秒數', '倒數中＝1；由「更新計時」算出剩餘秒數',
          '只記住「什麼時候結束」（倒數終點 ＝ 計時器 ＋ 秒數），真正的倒數交給「更新計時」。')
F_TICK = fn('5-3', 5, 'B', '更新計時', [], '（無，放在舞台的重複無限次裡）', '剩餘秒數、碼錶秒數＋時間到時廣播「時間到」',
            '剩餘秒數 ＝ 無條件進位(倒數終點 − 計時器)。碼錶秒數 ＝ 計時器 − 碼錶起點（取到小數一位）。')
F_SW1 = fn('5-4', 5, 'B', '碼錶開始', [], '（無）', '碼錶中＝1', '記住「碼錶起點 ＝ 計時器」。')
F_SW2 = fn('5-5', 5, 'B', '碼錶停止', [], '（無）', '碼錶秒數（小數兩位）、碼錶中＝0', '停下來的那一刻，算出經過幾秒，取到小數兩位。')
F_COOL = fn('5-6', 5, 'A', '冷卻檢查 %s 秒', ['冷卻秒數'], '冷卻秒數', '可以用（角色自己的變數：1 可以，0 還在冷卻）',
            '距離上一次成功使用超過冷卻秒數 → 可以用＝1，並記下這次的時間；否則可以用＝0。適合技能、發射子彈、按鈕防連點。\n'
            '⚠ 按綠旗時計時器會歸零，所以綠旗要把「上次使用」設成 −999。')
F_MMSS = fn('5-7', 5, 'B', '秒數轉時間 %s', ['秒數'], '秒數（例如 125）', '結果（例如 02:05）',
            '分 ＝ 無條件捨去(秒數 ÷ 60)，秒 ＝ 秒數 除以 60 的餘數。兩個都用 1-5「補零」補到 2 位，中間接「:」。')
F_SCENE = fn('5-8', 5, 'B', '切換畫面 %s', ['畫面名稱'], '畫面名稱（例如 選單、遊戲）', '畫面＋廣播「畫面換了」',
             '用一個變數「畫面」管理所有畫面。每個角色收到「畫面換了」只問一件事：「現在是我的畫面嗎？」'
             '要加新畫面，舊的角色都不用改。（來自〈貓咪甜點店〉）', warp=False)


def f_wait(t, c):
    到 = t.lv('等到'); 跳 = c.v('跳過')
    h = t.define(F_WAIT, ['秒數'])
    t.script(h, t.setv(到, t.add_(t.timer(), t.arg('秒數'))),
             t.repeat_until(t.or_(t.gt(t.timer(), 到), t.eq(跳, 1))),
             t.if_(t.eq(跳, 1), t.setv(跳, 0)))
    cm(t, h, '5-1', '「跳過」是所有角色適用的變數：按空白鍵、點跳過鈕的程式只要把它設成 1。')


def f_countdown(st, c):
    h = st.define(F_CD, ['秒數'], warp=True)
    st.script(h, st.setv(c.v('倒數終點'), st.add_(st.timer(), st.arg('秒數'))),
              st.setv(c.v('剩餘秒數'), st.arg('秒數')), st.setv(c.v('倒數中'), 1))
    cm(st, h, '5-2')


def f_tick(st, c):
    剩 = c.v('剩餘秒數'); 中 = c.v('倒數中'); 碼中 = c.v('碼錶中')
    h = st.define(F_TICK, [], warp=True)
    st.script(h,
              st.if_(st.eq(中, 1),
                     st.setv(剩, st.mop('ceiling', st.sub_(c.v('倒數終點'), st.timer()))),
                     st.if_(st.lt(剩, 1), st.setv(剩, 0), st.setv(中, 0), st.broadcast(c.m('時間到')))),
              st.if_(st.eq(碼中, 1),
                     st.setv(c.v('碼錶秒數'), st.div(st.round_(st.mul(st.sub_(st.timer(), c.v('碼錶起點')), 10)), 10))))
    cm(st, h, '5-3', '只廣播一次「時間到」：廣播的同時把「倒數中」設成 0，下一輪就不會再進來。')


def f_sw(st, c):
    h = st.define(F_SW1, [], warp=True)
    st.script(h, st.setv(c.v('碼錶起點'), st.timer()), st.setv(c.v('碼錶秒數'), 0), st.setv(c.v('碼錶中'), 1))
    cm(st, h, '5-4')
    h = st.define(F_SW2, [], warp=True)
    st.script(h, st.if_(st.eq(c.v('碼錶中'), 1),
                        st.setv(c.v('碼錶中'), 0),
                        st.setv(c.v('碼錶秒數'), st.div(st.round_(st.mul(st.sub_(st.timer(), c.v('碼錶起點')), 100)), 100))))
    cm(st, h, '5-5')


def f_cool(t, c):
    上 = t.lv('上次使用', -999); 可 = t.lv('可以用')
    h = t.define(F_COOL, ['冷卻秒數'], warp=True)
    t.script(h, t.if_else(t.gt(t.sub_(t.timer(), 上), t.arg('冷卻秒數')),
                          [t.setv(可, 1), t.setv(上, t.timer())],
                          [t.setv(可, 0)]))
    cm(t, h, '5-6')


def f_mmss(st, c):
    include(st, c, ['1-5'])
    結果 = c.v('結果', ''); 暫 = c.v('分鐘文字', '')
    h = st.define(F_MMSS, ['秒數'], warp=True)
    st.script(h,
              st.call(F_PAD, st.mop('floor', st.div(st.arg('秒數'), 60)), 2),
              st.setv(暫, 結果),
              st.call(F_PAD, st.mop('floor', st.mod(st.arg('秒數'), 60)), 2),
              st.setv(結果, st.join(暫, st.join(':', 結果))))
    cm(st, h, '5-7', '先把分鐘的結果搬到「分鐘文字」，因為第二次呼叫「補零」會把「結果」蓋掉。')


def f_scene(st, c):
    h = st.define(F_SCENE, ['畫面名稱'])
    st.script(h, st.setv(c.v('畫面', ''), st.arg('畫面名稱')), st.setv(c.v('跳過'), 0),
              st.broadcast(c.m('畫面換了'), True))
    cm(st, h, '5-8')


# ---------------------------------------------------------------- ⑥ 數學小工具
F_CLAMP = fn('6-1', 6, 'B', '限制範圍 %s 最小 %s 最大 %s', ['值', '最小', '最大'], '值、最小值、最大值', '結果',
             '比最小還小就用最小，比最大還大就用最大。生命值不能小於 0、音量不能超過 100 都用它。')
F_DIST = fn('6-2', 6, 'B', '兩點距離 x1 %s y1 %s x2 %s y2 %s', ['x1', 'y1', 'x2', 'y2'], '兩個點的 x、y', '結果',
            '畢氏定理：橫的差 × 橫的差 ＋ 直的差 × 直的差，再開平方根。'
            '（Scratch 有「到 鼠標 的距離」，但只能量「角色到某個東西」；這個可以量任意兩點。）')
F_IN = fn('6-3', 6, 'B', '在範圍內嗎 %s 最小 %s 最大 %s', ['值', '最小', '最大'], '值、最小值、最大值', '結果（1 在範圍內，0 不在）',
          '「不小於最小」而且「不大於最大」。用「不成立 ＜」代替「≧」，因為 Scratch 沒有 ≧ 積木。')
F_ROUND = fn('6-4', 6, 'B', '四捨五入 %s 到小數 %s 位', ['值', '位數'], '值、要留幾位小數', '結果',
             'Scratch 的「四捨五入」只能到整數。先乘 10 的「位數」次方，四捨五入，再除回去。例如 3.14159 到 2 位 → 314.159 → 314 → 3.14。')
F_NOREP = fn('6-5', 6, 'B', '不重複隨機 %s 到 %s', ['最小', '最大'], '最小、最大（整數）', '結果',
             '把所有數字放進「抽籤袋」清單，每次隨機抽一個並把它刪掉，所以不會重複。袋子空了（或範圍改了）就重新裝滿。出題、洗牌都用得到。')


def f_clamp(st, c):
    結果 = c.v('結果', '')
    h = st.define(F_CLAMP, ['值', '最小', '最大'], warp=True)
    st.script(h, st.setv(結果, st.arg('值')),
              st.if_(st.lt(st.arg('值'), st.arg('最小')), st.setv(結果, st.arg('最小'))),
              st.if_(st.gt(st.arg('值'), st.arg('最大')), st.setv(結果, st.arg('最大'))))
    cm(st, h, '6-1')


def f_dist(st, c):
    結果 = c.v('結果', '')
    h = st.define(F_DIST, ['x1', 'y1', 'x2', 'y2'], warp=True)
    dx = lambda: st.sub_(st.arg('x2'), st.arg('x1'))
    dy = lambda: st.sub_(st.arg('y2'), st.arg('y1'))
    st.script(h, st.setv(結果, st.mop('sqrt', st.add_(st.mul(dx(), dx()), st.mul(dy(), dy())))))
    cm(st, h, '6-2')


def f_in(st, c):
    結果 = c.v('結果', '')
    h = st.define(F_IN, ['值', '最小', '最大'], warp=True)
    st.script(h, st.if_else(st.and_(st.not_(st.lt(st.arg('值'), st.arg('最小'))),
                                    st.not_(st.gt(st.arg('值'), st.arg('最大')))),
                            [st.setv(結果, 1)], [st.setv(結果, 0)]))
    cm(st, h, '6-3')


def f_round(st, c):
    結果 = c.v('結果', ''); 倍 = c.v('倍數', 1)
    h = st.define(F_ROUND, ['值', '位數'], warp=True)
    st.script(h, st.setv(倍, st.mop('10 ^', st.arg('位數'))),
              st.setv(結果, st.div(st.round_(st.mul(st.arg('值'), 倍)), 倍)))
    cm(st, h, '6-4')


def f_norep(st, c):
    結果 = c.v('結果', ''); 袋 = c.l('抽籤袋'); 範 = c.v('抽籤範圍', ''); 數 = c.v('抽籤數'); 第 = c.v('抽到第')
    h = st.define(F_NOREP, ['最小', '最大'], warp=True)
    rng = lambda: st.join(st.arg('最小'), st.join('~', st.arg('最大')))
    st.script(h,
              st.if_(st.or_(st.eq(st.llen(袋), 0), st.not_(st.eq(範, rng()))),
                     st.lclear(袋), st.setv(範, rng()), st.setv(數, st.arg('最小')),
                     st.repeat(st.add_(st.sub_(st.arg('最大'), st.arg('最小')), 1),
                               st.ladd(數, 袋), st.chv(數, 1))),
              st.setv(第, st.random(1, st.llen(袋))),
              st.setv(結果, st.item(第, 袋)),
              st.delete_item(第, 袋))
    cm(st, h, '6-5')


# ---------------------------------------------------------------- ⑦ 清單工具（都處理清單「工作清單」）
F_SHUF = fn('7-1', 7, 'B', '清單洗牌', [], '工作清單', '工作清單（順序打亂）',
            '從最後一項往前：每次隨機挑一個「還沒洗到的位置」和它交換（費雪-耶茨洗牌法）。每種順序出現的機會都一樣。')
F_SORT = fn('7-2', 7, 'B', '清單排序', [], '工作清單', '工作清單（小到大）',
            '氣泡排序：從頭比到尾，相鄰兩項前面比較大就交換；這樣重複「項目數 − 1」輪。大的數字會像氣泡一樣慢慢浮到後面。')
F_MAX = fn('7-3', 7, 'B', '清單最大值', [], '工作清單', '結果（最大的值）、位置（第幾項）',
           '先假設第 1 項最大，再一項一項看，遇到更大的就換掉。')
F_SUM = fn('7-4', 7, 'B', '清單加總', [], '工作清單', '結果（總和）', '結果從 0 開始，一項一項加上去。')
F_AVG = fn('7-5', 7, 'B', '清單平均', [], '工作清單', '結果（平均）',
           '呼叫「清單加總」，再除以項目數。清單是空的就回答 0（不能除以 0）。')
F_SPLIT = fn('7-6', 7, 'B', '拆成清單 %s 用 %s 分開', ['文字', '分隔'], '文字、分隔符號（例如 ,）', '工作清單',
             '一個字一個字看：不是分隔符號就接到「這一段」，是分隔符號就把「這一段」加進清單、重新開始。一次輸入很多題目、很多名字時很好用。')
F_JOIN = fn('7-7', 7, 'B', '合併成文字 用 %s 連接', ['連接'], '連接用的符號（例如 、）', '結果',
            '把清單每一項接成一行文字，中間放連接符號。（直接把清單放進「說出」也會接起來，但中間一律是空格。）')


def f_shuffle(st, c):
    L = c.l('工作清單'); 到 = c.v('洗到'); 換 = c.v('換到'); 暫 = c.v('暫存', '')
    h = st.define(F_SHUF, [], warp=True)
    st.script(h, st.setv(到, st.llen(L)),
              st.repeat_until(st.lt(到, 2),
                              st.setv(換, st.random(1, 到)),
                              st.setv(暫, st.item(到, L)),
                              st.replace_item(到, L, st.item(換, L)),
                              st.replace_item(換, L, 暫),
                              st.chv(到, -1)))
    cm(st, h, '7-1')


def f_sort(st, c):
    L = c.l('工作清單'); 比 = c.v('比到'); 暫 = c.v('暫存', '')
    h = st.define(F_SORT, [], warp=True)
    st.script(h, st.repeat(st.sub_(st.llen(L), 1),
                           st.setv(比, 1),
                           st.repeat(st.sub_(st.llen(L), 1),
                                     st.if_(st.gt(st.item(比, L), st.item(st.add_(比, 1), L)),
                                            st.setv(暫, st.item(比, L)),
                                            st.replace_item(比, L, st.item(st.add_(比, 1), L)),
                                            st.replace_item(st.add_(比, 1), L, 暫)),
                                     st.chv(比, 1))))
    cm(st, h, '7-2', '清單裡是數字就照大小排；是文字就照字母（筆畫編碼）排。')


def f_max(st, c):
    L = c.l('工作清單'); 結果 = c.v('結果', ''); 位 = c.v('位置'); 第 = c.v('看到第')
    h = st.define(F_MAX, [], warp=True)
    st.script(h, st.setv(結果, st.item(1, L)), st.setv(位, 1), st.setv(第, 1),
              st.repeat(st.llen(L),
                        st.if_(st.gt(st.item(第, L), 結果), st.setv(結果, st.item(第, L)), st.setv(位, 第)),
                        st.chv(第, 1)),
              st.if_(st.eq(st.llen(L), 0), st.setv(位, 0)))
    cm(st, h, '7-3')


def f_sum(st, c):
    L = c.l('工作清單'); 結果 = c.v('結果', ''); 第 = c.v('看到第')
    h = st.define(F_SUM, [], warp=True)
    st.script(h, st.setv(結果, 0), st.setv(第, 1),
              st.repeat(st.llen(L), st.chv(結果, st.item(第, L)), st.chv(第, 1)))
    cm(st, h, '7-4')


def f_avg(st, c):
    include(st, c, ['7-4'])
    L = c.l('工作清單'); 結果 = c.v('結果', '')
    h = st.define(F_AVG, [], warp=True)
    st.script(h, st.call(F_SUM),
              st.if_else(st.gt(st.llen(L), 0), [st.setv(結果, st.div(結果, st.llen(L)))], [st.setv(結果, 0)]))
    cm(st, h, '7-5')


def f_split(st, c):
    L = c.l('工作清單'); 段 = c.v('這一段', ''); 第 = c.v('看到第'); 字 = c.v('這個字', '')
    h = st.define(F_SPLIT, ['文字', '分隔'], warp=True)
    st.script(h, st.lclear(L), st.setv(段, ''), st.setv(第, 1),
              st.repeat(st.length(st.arg('文字')),
                        st.setv(字, st.letter(第, st.arg('文字'))),
                        st.if_else(st.eq(字, st.arg('分隔')),
                                   [st.ladd(段, L), st.setv(段, '')],
                                   [st.setv(段, st.join(段, 字))]),
                        st.chv(第, 1)),
              st.ladd(段, L))
    cm(st, h, '7-6')


def f_joinlist(st, c):
    L = c.l('工作清單'); 結果 = c.v('結果', ''); 第 = c.v('看到第')
    h = st.define(F_JOIN, ['連接'], warp=True)
    st.script(h, st.setv(結果, st.item(1, L)), st.setv(第, 2),
              st.repeat(st.sub_(st.llen(L), 1),
                        st.setv(結果, st.join(結果, st.join(st.arg('連接'), st.item(第, L)))),
                        st.chv(第, 1)))
    cm(st, h, '7-7')


# ---------------------------------------------------------------- ⑧ 遊戲機制
F_MOVE = fn('8-1', 8, 'A', '左右鍵移動 速度 %s', ['速度'], '每一格走幾步', '（角色往左右走）',
            '按 → 或 D 往右、按 ← 或 A 往左。放在「重複無限次」裡呼叫，所以按住就會一直走，比「當 → 鍵被按下」順很多。')
F_JUMP = fn('8-2', 8, 'A', '重力跳躍 重力 %s 跳躍力 %s 地面 %s', ['重力', '跳躍力', '地面y'],
            '重力（每格速度減多少）、跳躍力（起跳速度）、地面的 y', '（角色的 y 與「上下速度」）',
            '每一格：上下速度減掉重力、y 加上上下速度。掉到地面以下就站回地面、速度歸零。站在地上又按 ↑ 才能起跳（不能在空中連跳）。')
F_HURT = fn('8-3', 8, 'A', '受傷 %s 無敵 %s 秒', ['傷害', '無敵秒數'], '扣幾點生命、受傷後無敵幾秒', '生命值（所有角色適用）、無敵到',
            '如果現在不是無敵：生命值扣掉傷害，並設定「無敵到 ＝ 計時器 ＋ 無敵秒數」。'
            '碰到敵人的那幾格都會呼叫，但只有第一次會扣血。')
F_FLASH = fn('8-4', 8, 'A', '無敵閃爍', [], '（無，放在迴圈裡）', '（無敵時角色一閃一閃）',
             '無敵中：幻影 ＝（四捨五入(計時器 × 10) 除以 2 的餘數）× 70，每 0.1 秒切換一次；不是無敵就設回 0。')
F_HISC = fn('8-5', 8, 'B', '更新最高分', [], '分數、最高分', '最高分、破紀錄（1／0）',
            '分數比最高分高，就更新最高分並把「破紀錄」設成 1。（最高分會跟著專案存檔，但重新開網頁就沒了。）')
F_SCROLL = fn('8-6', 8, 'A', '無限捲動 速度 %s', ['速度'], '每一格往左移幾步', '（角色往左移，出去後從右邊回來）',
              '往左移；x 小於 −250 就搬到 x ＝ 250。放幾個分身（雲、樹、障礙物）一起捲，就像背景一直往後跑。')


def f_move(t, c):
    h = t.define(F_MOVE, ['速度'], warp=True)
    t.script(h,
             t.if_(t.or_(t.keypressed('right arrow'), t.keypressed('d')), t.change_x(t.arg('速度'))),
             t.if_(t.or_(t.keypressed('left arrow'), t.keypressed('a')), t.change_x(t.neg(t.arg('速度')))))
    cm(t, h, '8-1')


def f_jump(t, c):
    速 = t.lv('上下速度')
    h = t.define(F_JUMP, ['重力', '跳躍力', '地面y'], warp=True)
    t.script(h, t.chv(速, t.neg(t.arg('重力'))), t.change_y(速),
             t.if_(t.lt(t.y_pos(), t.arg('地面y')), t.set_y(t.arg('地面y')), t.setv(速, 0)),
             t.if_(t.and_(t.keypressed('up arrow'), t.eq(t.y_pos(), t.arg('地面y'))), t.setv(速, t.arg('跳躍力'))))
    cm(t, h, '8-2')


def f_hurt(t, c):
    到 = t.lv('無敵到')
    h = t.define(F_HURT, ['傷害', '無敵秒數'], warp=True)
    t.script(h, t.if_(t.gt(t.timer(), 到),
                      t.chv(c.v('生命值', 3), t.neg(t.arg('傷害'))),
                      t.setv(到, t.add_(t.timer(), t.arg('無敵秒數')))))
    cm(t, h, '8-3', '⚠ 按綠旗計時器會歸零：綠旗要把「無敵到」設成 0。')


def f_flash(t, c):
    到 = t.lv('無敵到')
    h = t.define(F_FLASH, [], warp=True)
    t.script(h, t.if_else(t.lt(t.timer(), 到),
                          [t.set_fx('GHOST', t.mul(t.mod(t.round_(t.mul(t.timer(), 10)), 2), 70))],
                          [t.set_fx('GHOST', 0)]))
    cm(t, h, '8-4')


def f_hisc(st, c):
    h = st.define(F_HISC, [], warp=True)
    st.script(h, st.if_else(st.gt(c.v('分數'), c.v('最高分')),
                            [st.setv(c.v('最高分'), c.v('分數')), st.setv(c.v('破紀錄'), 1)],
                            [st.setv(c.v('破紀錄'), 0)]))
    cm(st, h, '8-5')


def f_scroll(t, c):
    h = t.define(F_SCROLL, ['速度'], warp=True)
    t.script(h, t.change_x(t.neg(t.arg('速度'))),
             t.if_(t.lt(t.x_pos(), -250), t.set_x(250)))
    cm(t, h, '8-6', '為什麼是 ±250 而不是 ±480？Scratch 會把角色留一點在舞台上（不能整個移出去），小角色的 x 最多大約到 ±260。')


# 每個函式的產生器（id → (函式, A 或 B)）
BUILDERS = {
    '1-1': f_typewriter, '1-2': f_subtitle, '1-3': f_dialog, '1-4': f_cut, '1-5': f_pad,
    '2-1': f_fadein, '2-2': f_fadeout, '2-3': f_pop, '2-4': f_shrink, '2-5': f_drop, '2-6': f_slide,
    '3-1': f_shake, '3-2': f_blink, '3-3': f_breath, '3-4': f_swing, '3-5': f_float, '3-6': f_anim, '3-7': f_goto_costume,
    '4-1': f_reset, '4-2': f_clear_clones, '4-3': f_empty, '4-4': f_clones, '4-5': f_rand, '4-6': f_fence, '4-7': f_follow,
    '5-1': f_wait, '5-2': f_countdown, '5-3': f_tick, '5-4': f_sw, '5-6': f_cool, '5-7': f_mmss, '5-8': f_scene,
    '6-1': f_clamp, '6-2': f_dist, '6-3': f_in, '6-4': f_round, '6-5': f_norep,
    '7-1': f_shuffle, '7-2': f_sort, '7-3': f_max, '7-4': f_sum, '7-5': f_avg, '7-6': f_split, '7-7': f_joinlist,
    '8-1': f_move, '8-2': f_jump, '8-3': f_hurt, '8-4': f_flash, '8-5': f_hisc, '8-6': f_scroll,
}
# 5-5 碼錶停止和 5-4 在同一個產生器裡


def svc_name(fid):
    f = [x for x in FUNCS if x['id'] == fid][0]
    return f['code'].split(' ')[0]


for _f in FUNCS:
    _f['msg'] = svc_name(_f['id']) if _f['type'] == 'B' and _f['id'] != '5-3' else ''


def service(st, c, fid):
    """舞台服務台：收到「函式名稱」的廣播，就用 參數1～參數4 呼叫那個函式。"""
    f = [x for x in FUNCS if x['id'] == fid][0]
    h = st.when_msg(c.m(f['msg']))
    st.script(h, st.call(f['code'], *[P(c, i + 1) for i in range(len(f['args']))]))
    return h


# ================================================================ 造型（原創角色，不使用任何既有角色）
INK = '#3F3327'


def yuanyuan(frame=1, color='#FFB347'):
    """圓圓：一顆橘色圓滾滾的小生物。frame 1～4：一般、舉手、雙手、眨眼。"""
    w, h = 110, 110
    arms = {1: ('M20 70 q-10 6 -8 16', 'M90 70 q10 6 8 16'),
            2: ('M20 70 q-10 6 -8 16', 'M90 62 q14 -8 10 -26'),
            3: ('M20 62 q-14 -8 -10 -26', 'M90 62 q14 -8 10 -26'),
            4: ('M20 70 q-10 6 -8 16', 'M90 70 q10 6 8 16')}[frame]
    eyes = ('<path d="M38 52 h12 M62 52 h12" stroke="%s" stroke-width="4" stroke-linecap="round"/>' % INK
            if frame == 4 else
            '<circle cx="44" cy="52" r="6" fill="%s"/><circle cx="68" cy="52" r="6" fill="%s"/>'
            '<circle cx="46" cy="50" r="2" fill="#fff"/><circle cx="70" cy="50" r="2" fill="#fff"/>' % (INK, INK))
    b = ('<path d="%s" stroke="%s" stroke-width="5" fill="none" stroke-linecap="round"/>'
         '<path d="%s" stroke="%s" stroke-width="5" fill="none" stroke-linecap="round"/>' % (arms[0], INK, arms[1], INK) +
         '<ellipse cx="42" cy="100" rx="11" ry="6" fill="%s"/><ellipse cx="70" cy="100" rx="11" ry="6" fill="%s"/>' % (INK, INK) +
         '<circle cx="56" cy="62" r="38" fill="%s" stroke="%s" stroke-width="4"/>' % (color, INK) +
         '<path d="M40 30 q6 -18 14 -6 M58 26 q10 -16 14 2" stroke="%s" stroke-width="4" fill="none" stroke-linecap="round"/>' % INK +
         eyes +
         '<circle cx="34" cy="68" r="6" fill="#FF7B7B" opacity=".5"/><circle cx="78" cy="68" r="6" fill="#FF7B7B" opacity=".5"/>'
         '<path d="M48 72 q8 8 16 0" stroke="%s" stroke-width="4" fill="none" stroke-linecap="round"/>' % INK)
    return K.svg(w, h, b), 56, 62


def fangfang(color='#6EC6FF'):
    """方方：一塊方方正正的小方塊。"""
    b = ('<rect x="14" y="14" width="76" height="76" rx="18" fill="%s" stroke="%s" stroke-width="4"/>' % (color, INK) +
         '<rect x="36" y="42" width="8" height="12" rx="4" fill="%s"/><rect x="60" y="42" width="8" height="12" rx="4" fill="%s"/>' % (INK, INK) +
         '<path d="M42 66 h20" stroke="%s" stroke-width="4" stroke-linecap="round"/>' % INK +
         '<path d="M52 14 v-10" stroke="%s" stroke-width="4" stroke-linecap="round"/><circle cx="52" cy="4" r="4" fill="#FFC83D" stroke="%s" stroke-width="2"/>' % (INK, INK))
    return K.svg(104, 100, b), 52, 52


def star(color='#FFC83D', r=26):
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.45
        pts.append('%.1f,%.1f' % (r + 4 + rr * math.cos(a), r + 4 + rr * math.sin(a)))
    b = '<polygon points="%s" fill="%s" stroke="%s" stroke-width="3" stroke-linejoin="round"/>' % (' '.join(pts), color, INK)
    return K.svg(2 * r + 8, 2 * r + 8, b), r + 4, r + 4


def cloud():
    b = ('<g fill="#fff" stroke="#9FB8C8" stroke-width="3">'
         '<ellipse cx="30" cy="30" rx="22" ry="16"/><ellipse cx="55" cy="22" rx="24" ry="20"/><ellipse cx="78" cy="32" rx="20" ry="14"/>'
         '</g><rect x="14" y="30" width="80" height="16" fill="#fff"/>')
    return K.svg(104, 50, b), 52, 25


def spike():
    pts = []
    for i in range(16):
        a = i * math.pi / 8
        rr = 22 if i % 2 == 0 else 14
        pts.append('%.1f,%.1f' % (26 + rr * math.cos(a), 26 + rr * math.sin(a)))
    b = ('<polygon points="%s" fill="#8E6BE0" stroke="%s" stroke-width="3" stroke-linejoin="round"/>'
         '<circle cx="21" cy="23" r="3" fill="#fff"/><circle cx="31" cy="23" r="3" fill="#fff"/>' % (' '.join(pts), INK))
    return K.svg(52, 52, b), 26, 26


def card_lines(lines, color, w=220, size=14):
    """按鍵說明牌。lines：[(按鍵, 說明)]"""
    lh = size + 8
    h = 34 + lh * len(lines)
    b = ['<rect x="3" y="3" width="%d" height="%d" rx="14" fill="#FFFFFF" fill-opacity=".92" stroke="%s" stroke-width="3"/>'
         % (w - 6, h - 6, color),
         '<text x="14" y="24" font-family="Sans Serif" font-size="%d" font-weight="bold" fill="%s">按鍵試試看</text>' % (size, color)]
    for i, (k, d) in enumerate(lines):
        y = 24 + lh * (i + 1)
        kw = max(22, 9 * len(k) + 12)
        b.append('<rect x="12" y="%d" width="%d" height="%d" rx="5" fill="%s"/>' % (y - size + 1, kw, size + 4, color))
        b.append('<text x="%d" y="%d" font-family="Sans Serif" font-size="%d" font-weight="bold" fill="#fff" '
                 'text-anchor="middle">%s</text>' % (12 + kw / 2, y + 1, size - 1, k))
        b.append('<text x="%d" y="%d" font-family="Sans Serif" font-size="%d" fill="#3F4A56">%s</text>'
                 % (20 + kw, y + 1, size - 1, d))
    return K.svg(w, h, ''.join(b)), w / 2, h / 2, h


# ================================================================ 共用角色
def sp_title(n):
    s = T('標題')
    label = 'Scratch 函式庫' if n == 0 else '%d %s' % (n, CATS[n][0])
    col = CATS[n][1]
    w = 200
    body = ('<rect x="2" y="2" width="%d" height="36" rx="18" fill="%s" stroke="#fff" stroke-width="3"/>'
            '<text x="%d" y="27" font-family="Sans Serif" font-size="19" font-weight="bold" fill="#fff" '
            'text-anchor="middle">%s</text>' % (w - 4, col, w / 2, label))
    s.add_costume('標題', K.svg(w, 40, body), 'svg', w / 2, 20)
    s.script(s.when_flag(), s.goto(132, 158), s.front_(), s.show())
    return s


def sp_legend(n, lines, w=220):
    s = T('按鍵說明')
    svg_, cx, cy, h = card_lines(lines, CATS[n][1], w)
    s.add_costume('說明', svg_, 'svg', cx, cy)
    s.script(s.when_flag(), s.goto(240 - w / 2 - 6, 134 - h / 2), s.show())
    return s


def actor(name='圓圓', frames=True):
    t = T(name)
    for i in (1, 2, 3, 4) if frames else (1,):
        cc, cx, cy = yuanyuan(i)
        t.add_costume('圓圓%d' % i, cc, 'svg', cx, cy)
    t.props['rotationStyle'] = 'all around'
    return t


def backdrop_stage(st, name='舞台', ground=None, top='#DFF3FF', bottom='#FFF6E5'):
    cc, cx, cy = K.backdrop(top, bottom, ground, '#9ED28B')
    st.add_costume(name, cc, 'svg', cx, cy)


# ================================================================ 組裝工具
def include(t, c, ids):
    """把函式放進角色／舞台（已經放過的不會重複）。"""
    done = t.__dict__.setdefault('_built', set())
    for fid in ids:
        if fid == '5-5':
            fid = '5-4'
        if fid in done:
            continue
        done.add(fid)
        BUILDERS[fid](t, c)


def services(st, c, ids):
    for fid in ids:
        f = [x for x in FUNCS if x['id'] == fid][0]
        if f['msg']:
            service(st, c, fid)


def call_svc(t, c, fid, *vals):
    """角色使用 B 型函式：寫參數 → 廣播並等待。回傳積木串列。"""
    f = [x for x in FUNCS if x['id'] == fid][0]
    return [t.setv(P(c, i + 1), v) for i, v in enumerate(vals)] + [t.broadcast(c.m(f['msg']), True)]


def layout(t, gap=36):
    bl = t.blocks

    def count(i):
        n = 0
        while i:
            b = bl[i]; n += 1
            for k, v in b['inputs'].items():
                if k.startswith('SUBSTACK') and v and v[1]:
                    n += count(v[1]) + 1
            i = b['next']
        return n
    y = 0
    for k in [k for k, b in bl.items() if b.get('topLevel')]:
        bl[k]['x'], bl[k]['y'] = 20, y
        h = count(k) * 48 + 60
        if 'comment' in bl[k]:
            cmt = t.comments[bl[k]['comment']]
            cmt['x'], cmt['y'] = 820, y
            h = max(h, cmt['height'] + 30)
        y += h + gap


def initial_props(t):
    """還沒按綠旗時的畫面就和執行時一樣（照綠旗程式開頭的定位／尺寸／顯示・隱藏）。"""
    bl = t.blocks
    for b in list(bl.values()):
        if b.get('topLevel') and b['opcode'] in ('event_whenflagclicked',):
            i = b['next']
            while i:
                x = bl[i]; op = x['opcode']
                lit = lambda k: float(x['inputs'][k][1][1]) if x['inputs'][k][0] == 1 else None
                if op == 'motion_gotoxy' and lit('X') is not None and lit('Y') is not None:
                    t.props.update(x=lit('X'), y=lit('Y'))
                elif op == 'looks_setsizeto' and lit('SIZE') is not None:
                    t.props['size'] = lit('SIZE')
                elif op == 'looks_hide':
                    t.props['visible'] = False
                elif op == 'looks_show':
                    t.props['visible'] = True
                elif op.startswith('control_') or op.startswith('event_'):
                    break
                i = x['next']


def list_monitor(l, x, y, w=130, h=200):
    return {'id': l.id, 'mode': 'list', 'opcode': 'data_listcontents', 'params': {'LIST': l.name},
            'spriteName': None, 'value': l.items, 'width': w, 'height': h, 'x': x, 'y': y, 'visible': True}


def local_monitor(t, name, x, y):
    v = t.variables[name]
    m = monitor(v, x, y)
    m['spriteName'] = t.name
    return m


A_OF = lambda n: [f['id'] for f in FUNCS if f['cat'] == n and f['type'] == 'A']
B_OF = lambda n: [f['id'] for f in FUNCS if f['cat'] == n and f['type'] == 'B']


# ================================================================ ① 文字與對話
DIALOG = [('圓圓', '方方，你知道什麼是「函式」嗎？'), ('方方', '就是把一段程式包起來，取一個名字！'),
          ('圓圓', '那要用的時候呢？'), ('方方', '喊它的名字就好，還可以給它不同的輸入。')]


def demo1(st, c):
    c.l('對話角色', [a for a, _ in DIALOG]); c.l('對話內容', [b for _, b in DIALOG])
    include(st, c, B_OF(1)); services(st, c, B_OF(1))
    st.script(st.when_flag(), st.setv(c.v('字幕', ''), ''), st.setv(c.v('結果', ''), ''))
    st.script(st.when_key('3'), st.call(F_DLG))
    y = actor('圓圓'); include(y, c, ['1-1', '1-2']); f_dialog_listener(y, c, '圓圓')
    y.script(y.when_flag(), y.goto(-150, -90), y.show(), y.say(''))
    y.script(y.when_key('1'), y.call(F_TYPE, '嗨！我是圓圓。打字機效果會讓字一個一個出現。', 0.06))
    y.script(y.when_key('2'), y.call(F_SUB, '很久很久以前，森林裡住著一顆愛說話的圓圓……', 0.08))
    y.script(y.when_key('4'), *call_svc(y, c, '1-4', 'Scratch函式庫', 1, 7),
             y.say(y.join('第 1～7 個字：', c.v('結果'))))
    y.script(y.when_key('5'), *call_svc(y, c, '1-5', 7, 3),
             y.say(y.join('7 補到 3 位：', c.v('結果'))))
    f = T('方方'); cc, cx, cy = fangfang(); f.add_costume('方方', cc, 'svg', cx, cy)
    include(f, c, ['1-1']); f_dialog_listener(f, c, '方方')
    f.script(f.when_flag(), f.goto(90, -115), f.show(), f.say(''))
    lg = sp_legend(1, [('1', '打字機說'), ('2', '打字機字幕'), ('3', '播放對話'), ('4', '取出片段'), ('5', '補零')])
    mon = [monitor(c.V['結果'], 5, 5), monitor(c.V['目前說話者'], 5, 32)]
    big = monitor(c.V['字幕'], 12, 318, big=True)
    return [y, f, lg], mon + [big]


# ================================================================ ② 出場與退場
def demo2(st, c):
    y = actor('圓圓'); include(y, c, A_OF(2) + ['4-1'])
    y.script(y.when_flag(), y.goto(-40, -30), y.call(F_RESET))
    keys = [('1', y.call(F_FIN, 1)), ('2', y.call(F_FOUT, 1)), ('3', y.call(F_POP, 100)),
            ('4', y.call(F_SHR, 0.6)), ('5', y.call(F_DROP, -30)), ('6', y.call(F_SLIDE, '左', 0.8)),
            ('7', y.call(F_SLIDE, '上', 0.8))]
    for k, blk in keys:
        y.script(y.when_key(k), blk)
    y.script(y.when_key('r'), y.goto(-40, -30), y.call(F_RESET))
    lg = sp_legend(2, [('1', '淡入 1 秒'), ('2', '淡出 1 秒'), ('3', '彈出放大'), ('4', '縮小消失'),
                       ('5', '彈跳落下'), ('6', '從左邊滑入'), ('7', '從上面滑入'), ('R', '重設角色')])
    return [y, lg], []


# ================================================================ ③ 持續特效
def demo3(st, c):
    y = actor('圓圓'); include(y, c, A_OF(3) + ['4-1'])
    y.script(y.when_flag(), y.goto(-40, -30), y.call(F_RESET), y.call(F_GOTO_C, 1))
    y.script(y.when_key('1'), y.call(F_SHAKE, 6, 10))
    y.script(y.when_key('2'), y.call(F_BLINK, 4, 0.15))
    y.script(y.when_key('3'), y.call(F_BREATH, 2, 12))
    y.script(y.when_key('4'), y.call(F_SWING, 2, 20))
    y.script(y.when_key('5'), y.call(F_FLOAT, 2, 20))
    y.script(y.when_key('6'), y.repeat(2, y.call(F_ANIM, 1, 4, 0.15)), y.call(F_GOTO_C, 1))
    y.script(y.when_key('r'), y.goto(-40, -30), y.call(F_RESET), y.call(F_GOTO_C, 1))
    lg = sp_legend(3, [('1', '抖動'), ('2', '閃爍'), ('3', '呼吸'), ('4', '擺動'), ('5', '漂浮'),
                       ('6', '播放造型'), ('R', '重設角色')])
    return [y, lg], []


# ================================================================ ④ 角色管理
def demo4(st, c):
    include(st, c, B_OF(4)); services(st, c, B_OF(4))
    st.script(st.when_key('2'), st.call(F_CLR))
    st.script(st.when_key('4'), st.call(F_EMPTY))
    y = actor('圓圓'); include(y, c, ['4-1', '4-5', '4-6', '4-7']); listeners_clear(y, c)
    跟 = y.lv('跟隨中')
    y.script(y.when_flag(), y.goto(-140, 10), y.call(F_RESET), y.setv(跟, 0),
             y.forever(y.if_(y.eq(跟, 1), y.call(F_FOLLOW, y.mouse_x(), y.mouse_y(), 0.15)),
                       y.call(F_FENCE, 45)))
    y.script(y.when_key('3'), y.call(F_RAND, 50))
    y.script(y.when_key('5'), y.goto(-140, 10), y.call(F_RESET))
    y.script(y.when_key('m'), y.setv(跟, y.sub_(1, 跟)))
    s = T('星星'); cc, cx, cy = star(); s.add_costume('星星', cc, 'svg', cx, cy)
    include(s, c, ['4-4']); listeners_clear(s, c)
    s.script(s.when_flag(), s.hide())
    s.script(s.when_key('1'), s.call(F_CLONES, 5))
    h = s.when_clone()
    s.script(h, s.goto(s.sub_(s.mul(s.lv('編號'), 80), 240), -125), s.show(), s.say(s.lv('編號')))
    s.comment(h, '每個分身都用自己的「編號」決定位置：編號 1 在 x = −160，編號 2 在 x = −80……', 300, 70)
    lg = sp_legend(4, [('1', '建立 5 個分身'), ('2', '清除所有分身'), ('3', '移到隨機位置'), ('4', '清空舞台'),
                       ('5', '重設角色'), ('M', '開關：跟隨滑鼠')])
    return [y, s, lg], [local_monitor(y, '跟隨中', 5, 5)]


# ================================================================ ⑤ 計時與流程
def demo5(st, c):
    cc, cx, cy = K.backdrop('#2D3E50', '#51708C')
    st.add_costume('遊戲', cc, 'svg', cx, cy)
    ids = B_OF(5)
    include(st, c, ids + ['1-5']); services(st, c, ids)
    st.script(st.when_flag(), st.setv(c.v('倒數中'), 0), st.setv(c.v('碼錶中'), 0), st.setv(c.v('剩餘秒數'), 0),
              st.setv(c.v('碼錶秒數'), 0), st.setv(c.v('跳過'), 0), st.call(F_SCENE, '選單'),
              st.forever(st.call(F_TICK), st.wait(0.03)))
    st.script(st.when_key('1'), st.call(F_CD, 10))
    st.script(st.when_key('2'), st.call(F_SW1))
    st.script(st.when_key('3'), st.call(F_SW2))
    st.script(st.when_key('space'), st.setv(c.v('跳過'), 1))
    st.script(st.when_key('7'), st.call(F_SCENE, '選單'))
    st.script(st.when_key('8'), st.call(F_SCENE, '遊戲'))
    st.script(st.when_msg(c.m('畫面換了')),
              st.if_else(st.eq(c.v('畫面'), '遊戲'), [st.backdrop('遊戲')], [st.backdrop('舞台')]))
    y = actor('圓圓'); include(y, c, A_OF(5))
    y.script(y.when_flag(), y.goto(-130, -70), y.show(), y.say(''), y.setv(y.lv('上次使用'), -999))
    y.script(y.when_key('4'), y.say('等 5 秒……（按空白鍵跳過）'), y.call(F_WAIT, 5), y.say_secs('等完了！', 1.5))
    y.script(y.when_key('5'), y.call(F_COOL, 1),
             y.if_else(y.eq(y.lv('可以用'), 1), [y.say('發射！')], [y.say('冷卻中……')]))
    y.script(y.when_key('6'), *call_svc(y, c, '5-7', 125), y.say_secs(y.join('125 秒 ＝ ', c.v('結果')), 2))
    y.script(y.when_msg(c.m('時間到')), y.say_secs('時間到！', 2))
    s = T('畫面牌')
    for nm, col in (('選單', '#0FBD8C'), ('遊戲', '#E8544B')):
        cc, cx, cy = K.badge('現在是：%s畫面' % nm, col, w=220)
        s.add_costume(nm + '畫面', cc, 'svg', cx, cy)
    s.script(s.when_msg(c.m('畫面換了')), s.costume(s.join(c.v('畫面'), '畫面')), s.show())
    s.script(s.when_flag(), s.goto(60, -140), s.show())
    lg = sp_legend(5, [('1', '倒數 10 秒'), ('2', '碼錶開始'), ('3', '碼錶停止'), ('4', '等待（可跳過）'),
                       ('空白', '跳過'), ('5', '冷卻 1 秒'), ('6', '125 秒轉時間'), ('7/8', '切換畫面')], w=230)
    mon = [monitor(c.V[n], 5, 5 + 27 * i) for i, n in enumerate(['剩餘秒數', '倒數中', '碼錶秒數', '畫面', '跳過'])]
    mon.append(local_monitor(y, '可以用', 5, 5 + 27 * 5))
    return [y, s, lg], mon


# ================================================================ ⑥ 數學小工具
def demo6(st, c):
    include(st, c, B_OF(6)); services(st, c, B_OF(6))
    y = actor('圓圓'); 結果 = c.v('結果', '')
    y.script(y.when_flag(), y.goto(-60, -80), y.show(), y.say('按 1～5 請舞台幫我算'))
    y.script(y.when_key('1'), *call_svc(y, c, '6-1', y.random(-300, 300), -200, 200),
             y.say(y.join(P(c, 1), y.join(' 限制在 −200～200 → ', 結果))))
    y.script(y.when_key('2'), *call_svc(y, c, '6-2', y.x_pos(), y.y_pos(), y.mouse_x(), y.mouse_y()),
             y.say(y.join('我到滑鼠的距離：', y.round_(結果))))
    y.script(y.when_key('3'), *call_svc(y, c, '6-3', y.mouse_x(), -100, 100),
             y.if_else(y.eq(結果, 1), [y.say('滑鼠在中間（−100～100）')], [y.say('滑鼠在兩邊')]))
    y.script(y.when_key('4'), *call_svc(y, c, '6-4', 3.14159, 2), y.say(y.join('3.14159 到小數 2 位 → ', 結果)))
    y.script(y.when_key('5'), *call_svc(y, c, '6-5', 1, 6), y.say(y.join('骰子抽到：', 結果)))
    lg = sp_legend(6, [('1', '限制範圍'), ('2', '到滑鼠的距離'), ('3', '滑鼠在範圍內嗎'), ('4', '四捨五入到小數'),
                       ('5', '不重複隨機 1～6')], w=230)
    mon = [monitor(c.V['參數%d' % i], 5, 5 + 27 * (i - 1)) for i in range(1, 5)] + [monitor(結果, 5, 113)]
    mon.append(list_monitor(c.L['抽籤袋'], 5, 145, 110, 150))
    return [y, lg], mon


# ================================================================ ⑦ 清單工具
def demo7(st, c):
    L = c.l('工作清單', [42, 7, 88, 15, 63, 30])
    include(st, c, B_OF(7)); services(st, c, B_OF(7))
    fill = [st.lclear(L), st.repeat(6, st.ladd(st.random(1, 99), L))]
    st.script(st.when_key('0'), *fill)
    y = actor('圓圓'); 結果 = c.v('結果', '')
    y.script(y.when_flag(), y.goto(-30, -115), y.show(), y.say('按 0～7 整理左邊的清單'))
    y.script(y.when_key('1'), *call_svc(y, c, '7-1'), y.say('洗好了！'))
    y.script(y.when_key('2'), *call_svc(y, c, '7-2'), y.say('從小排到大！'))
    y.script(y.when_key('3'), *call_svc(y, c, '7-3'),
             y.say(y.join('最大是 ', y.join(結果, y.join('，在第 ', y.join(c.v('位置'), ' 項'))))))
    y.script(y.when_key('4'), *call_svc(y, c, '7-4'), y.say(y.join('總和：', 結果)))
    y.script(y.when_key('5'), *call_svc(y, c, '7-5'), y.say(y.join('平均：', 結果)))
    y.script(y.when_key('6'), *call_svc(y, c, '7-6', '蘋果,香蕉,芭樂,西瓜', ','), y.say('用逗號拆好了！'))
    y.script(y.when_key('7'), *call_svc(y, c, '7-7', '、'), y.say(結果))
    lg = sp_legend(7, [('0', '重新填 6 個數字'), ('1', '洗牌'), ('2', '排序'), ('3', '最大值'), ('4', '加總'),
                       ('5', '平均'), ('6', '拆成清單'), ('7', '合併成文字')], w=230)
    mon = [list_monitor(L, 5, 5, 130, 200), monitor(結果, 5, 250), monitor(c.V['位置'], 5, 277)]
    return [y, lg], mon


# ================================================================ ⑧ 遊戲機制
GROUND = -78


def demo8(st, c):
    st.costumes.clear(); backdrop_stage(st, '草地', ground=70)
    include(st, c, B_OF(8)); services(st, c, B_OF(8))
    分 = c.v('分數'); 高 = c.v('最高分'); 命 = c.v('生命值', 3); 中 = c.v('遊戲中'); c.v('破紀錄')
    st.script(st.when_flag(), st.setv(高, 0), st.setv(分, 0), st.setv(命, 3), st.setv(中, 1), st.broadcast(c.m('開始遊戲')))
    h = st.when_key('r')
    st.script(h, st.setv(分, 0), st.setv(命, 3), st.setv(中, 1), st.broadcast(c.m('開始遊戲')))
    st.comment(h, '（踩過的坑）先把分數、生命值設好，再廣播「開始遊戲」。\n'
                  '如果改成收到廣播才設生命值，玩家的程式可能先跑，讀到舊的生命值 0，一開始就「遊戲結束」。', 340, 90)
    st.script(st.when_msg(c.m('開始遊戲')),
              st.repeat_until(st.eq(中, 0), st.wait(1), st.if_(st.eq(中, 1), st.chv(分, 1))))
    st.script(st.when_msg(c.m('遊戲結束')), st.setv(中, 0), st.call(F_HISC))

    p = actor('玩家'); include(p, c, ['8-1', '8-2', '8-3', '8-4', '4-6', '4-1'])
    h = p.when_msg(c.m('開始遊戲'))
    p.script(h, p.call(F_RESET), p.size(70), p.goto(-150, GROUND),
             p.setv(p.lv('無敵到'), 0), p.setv(p.lv('上下速度'), 0),
             p.repeat_until(p.lt(命, 1),
                            p.call(F_MOVE, 5), p.call(F_JUMP, 1.2, 18, GROUND), p.call(F_FENCE, 30), p.call(F_FLASH),
                            p.if_(p.touching('刺球'), p.call(F_HURT, 1, 1.5))),
             p.set_fx('GHOST', 0), p.broadcast(c.m('遊戲結束')), p.say('遊戲結束！按 R 再玩一次'))
    p.comment(h, '遊戲主迴圈：每一格依序呼叫 5 個函式。\n程式變得很短，一眼就看得出每一格在做什麼。', 320, 70)
    p.script(p.when_key('h'), p.call(F_HURT, 1, 1.5))
    p.script(p.when_flag(), p.goto(-150, GROUND), p.size(70), p.show())

    cl = T('雲'); cc, cx, cy = cloud(); cl.add_costume('雲', cc, 'svg', cx, cy)
    include(cl, c, ['8-6', '4-4']); listeners_clear(cl, c, hide=False)
    cl.script(cl.when_flag(), cl.hide(), cl.call(F_CLONES, 3))
    cl.script(cl.when_clone(), cl.goto(cl.sub_(cl.mul(cl.lv('編號'), 170), 250), cl.add_(60, cl.mul(cl.lv('編號'), 25))),
              cl.show(), cl.forever(cl.call(F_SCROLL, 1)))

    sp = T('刺球'); cc, cx, cy = spike(); sp.add_costume('刺球', cc, 'svg', cx, cy)
    sp.props['rotationStyle'] = 'all around'
    include(sp, c, ['8-6'])
    sp.script(sp.when_flag(), sp.goto(250, -84), sp.show())
    sp.script(sp.when_msg(c.m('開始遊戲')), sp.goto(250, -84), sp.show(),
              sp.repeat_until(sp.eq(中, 0), sp.call(F_SCROLL, 4), sp.turn_left(8)))
    lg = sp_legend(8, [('← →', '左右移動'), ('↑', '跳'), ('H', '假裝被撞'), ('R', '重新開始')], w=190)
    mon = [monitor(分, 5, 5), monitor(高, 5, 32), monitor(命, 5, 59)]
    return [cl, sp, p, lg], mon


DEMOS = {1: demo1, 2: demo2, 3: demo3, 4: demo4, 5: demo5, 6: demo6, 7: demo7, 8: demo8}
SP3 = {1: ['1-1', '1-2'], 2: A_OF(2) + ['4-1'], 3: A_OF(3) + ['4-1'], 4: A_OF(4),
       5: A_OF(5), 8: A_OF(8) + ['4-6', '4-4']}


# ================================================================ 完整函式庫
def helper_sprite(c, ids, name='函式小幫手', dialog=True, clear=True):
    y = actor(name)
    include(y, c, ids)
    if dialog and '1-1' in ids:
        f_dialog_listener(y, c, name)
    if clear:
        listeners_clear(y, c)
    h = y.when_flag()
    y.script(h, y.setv(y.lv('上次使用', -999), -999) if '5-6' in ids else None,
             y.setv(y.lv('無敵到'), 0) if '8-3' in ids else None, y.show())
    y.comment(h, '【%s】這個角色裝了 A 型函式（角色自己用）。\n'
                 '用法：從「函式積木」分類拖出來就能用。\n'
                 '要給別的角色用：把這個角色匯出（右鍵 → 匯出），或把「定義」積木拖到背包再拖給別的角色。' % name, 360, 110)
    return y


def demo0(st, c):
    c.l('對話角色', ['函式小幫手']); c.l('對話內容', ['把你的劇本寫在「對話角色」和「對話內容」清單裡。'])
    c.l('工作清單', [5, 3, 8])
    bids = [f['id'] for f in FUNCS if f['type'] == 'B']
    include(st, c, bids); services(st, c, bids)
    h = st.when_flag()
    st.script(h, st.setv(c.v('倒數中'), 0), st.setv(c.v('碼錶中'), 0), st.setv(c.v('跳過'), 0),
              st.forever(st.call(F_TICK), st.wait(0.03)))
    st.comment(h, '【舞台 ＝ 服務台】這裡裝了所有 B 型函式。\n'
                  '舞台自己可以直接呼叫；角色要用的話：\n'
                  '① 把輸入寫進「參數1」「參數2」……\n'
                  '② 廣播（函式名稱）並等待\n'
                  '③ 讀「結果」\n'
                  '（「更新計時」要一直呼叫，倒數和碼錶才會動。）', 360, 150)
    st.script(st.when_key('space'), st.setv(c.v('跳過'), 1))
    y = helper_sprite(c, [f['id'] for f in FUNCS if f['type'] == 'A'])
    return [y], [monitor(c.V['結果'], 5, 5)]


# ================================================================ 產生
def build(n, out_path):
    reset()
    st = T('Stage', stage=True)
    backdrop_stage(st)
    c = Ctx(st)
    for i in range(1, 5):
        P(c, i)
    c.v('結果', '')
    sprites, mons = (DEMOS[n] if n else demo0)(st, c)
    if n:
        sprites.insert(0, sp_title(n))
    for s in [st] + sprites:
        layout(s)
        if not s.stage:
            initial_props(s)
    return save(out_path, st, sprites, monitors=mons, extensions=[])


def build_sprite3(n, out_path):
    """把 A 型函式裝進一個角色，匯出成 .sprite3（可以在 Scratch 用「上傳角色」加進任何作品）。"""
    reset()
    st = T('Stage', stage=True)
    c = Ctx(st)
    ids = SP3[n] if n else [f['id'] for f in FUNCS if f['type'] == 'A']
    name = '函式小幫手' if n == 0 else '小幫手_%s' % CATS[n][0]
    y = helper_sprite(c, ids, name, dialog=(n in (0, 1)), clear=(n in (0, 4, 8)))
    # 這個角色用到的「所有角色適用」變數，也放一份在角色身上當說明（上傳到新作品時會自動建立）
    layout(y)
    d = y.to_json(1)
    d.pop('layerOrder', None)
    d['objName'] = y.name
    with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('sprite.json', json.dumps(d, ensure_ascii=False))
        for k, v in ASSETS.items():
            z.writestr(k, v)
    return d, sorted(c.V)


def export_funcs(path):
    """網頁用的函式清單。"""
    data = {'cats': {k: {'name': v[0], 'color': v[1]} for k, v in CATS.items()}, 'funcs': FUNCS}
    open(path, 'w', encoding='utf-8').write(
        '/* 自動產生：tools/build_library.py，請勿手動修改 */\nvar LIB_FUNCS = ' +
        json.dumps(data, ensure_ascii=False) + ';\n')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    os.makedirs(OUT, exist_ok=True); os.makedirs(OUT_SP, exist_ok=True)
    which = [int(a) for a in sys.argv[1:]] or list(range(1, 9)) + [0]
    for n in which:
        p = os.path.join(OUT, filename(n))
        proj = build(n, p)
        nb = sum(len(t['blocks']) for t in proj['targets'])
        nf = sum(1 for t in proj['targets'] for b in t['blocks'].values() if b['opcode'] == 'procedures_definition')
        print('%-16s %2d 角色  %2d 函式  %4d 積木  %6.1f KB' % (filename(n), len(proj['targets']) - 1, nf, nb,
                                                        os.path.getsize(p) / 1024))
    for n in [k for k in (1, 2, 3, 4, 5, 8, 0) if not sys.argv[1:] or k in which]:
        nm = '函式小幫手_全部.sprite3' if n == 0 else '小幫手_%d_%s.sprite3' % (n, CATS[n][0])
        d, gv = build_sprite3(n, os.path.join(OUT_SP, nm))
        print('%-24s %3d 積木  用到的全域變數：%s' % (nm, len(d['blocks']), '、'.join(gv) or '（無）'))
    export_funcs(os.path.join(ROOT, 'student', 'assets', 'funcs_data.js'))
    # 網頁試玩台用的造型（和 .sb3 裡的一模一樣）
    img = os.path.join(ROOT, 'student', 'assets', 'img'); os.makedirs(img, exist_ok=True)
    arts = {'yy%d' % i: yuanyuan(i) for i in (1, 2, 3, 4)}
    arts.update(ff=fangfang(), star=star(), cloud=cloud(), spike=spike())
    for k, (svg_, cx, cy) in arts.items():
        open(os.path.join(img, k + '.svg'), 'w', encoding='utf-8').write(svg_)
    print('函式總數：%d（A 型 %d、B 型 %d）' % (len(FUNCS), sum(f['type'] == 'A' for f in FUNCS),
                                           sum(f['type'] == 'B' for f in FUNCS)))
