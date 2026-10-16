# -*- coding: utf-8 -*-
"""手勢辨識模組教學：產生 10 個模組的 .sb3 與一個「手勢模組工具箱」。

    python build_modules.py            # 全部產生到 ../student/sb3/
    python build_modules.py 3          # 只產生模組 3

設計原則
* 所有自訂積木（函式）都放在同一個角色「手勢模組」裡 —— 它是「大腦」。
* 函式的輸出一律寫進「所有角色適用」的變數，其他角色（手指燈、數字卡…）只負責「看」。
* 每個模組檔 = 這個模組 ＋ 它用到的前面模組 ＋ 一個小示範。
* 造型與音效沿用 20260924_手勢辨識_數字與猜拳_Web 的範例檔。

需要 20260923_Scratch專案產生器 的 sb3lib.py / svgkit.py。
"""
import sys, os, json, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WS = os.path.dirname(ROOT)                                   # 01_專案
sys.path.insert(0, os.path.join(WS, '20260923_Scratch專案產生器'))
from sb3lib import *            # noqa
from sb3lib import B            # noqa
import svgkit as K

REF = os.path.join(WS, '20260924_手勢辨識_數字與猜拳_Web', 'student', '手勢辨識大挑戰.sb3')
OUT = os.path.join(ROOT, 'student', 'sb3')

# ---------------------------------------------------------------- 參考檔的造型／音效
_ref = zipfile.ZipFile(REF)
_refp = json.loads(_ref.read('project.json'))


def ref_costume(target, name):
    for t in _refp['targets']:
        if t['name'] == target:
            for c in t['costumes']:
                if c['name'] == name:
                    return _ref.read(c['md5ext']), c['rotationCenterX'], c['rotationCenterY']
    raise KeyError((target, name))


def ref_sound(name):
    for t in _refp['targets']:
        for s in t['sounds']:
            if s['name'] == name:
                return _ref.read(s['md5ext']), s['sampleCount']
    raise KeyError(name)


def add_ref_costume(t, new_name, target, name):
    d, cx, cy = ref_costume(target, name)
    t.add_costume(new_name, d, 'svg', cx, cy)


def add_ref_sound(t, name):
    t.add_sound(name, ref_sound(name))


# ---------------------------------------------------------------- 模組清單
MODULES = {
    1: ('偵測手', '看得到手嗎？'),
    2: ('量尺寸', '手長與手寬'),
    3: ('判斷手指', '一根手指伸直了嗎？'),
    4: ('判斷拇指', '拇指換一把尺'),
    5: ('數手指', '手指數與指型'),
    6: ('穩定判斷', '比出數字 0～5'),
    7: ('認猜拳', '剪刀、石頭、布'),
    8: ('比對手勢', '自訂手勢密碼'),
    9: ('猜拳勝負', '誰贏了？'),
    10: ('手指游標', '食指當滑鼠、捏一下'),
}
# 每個檔案包含哪些模組（自己 ＋ 用到的前面模組）
INCLUDES = {
    1: {1}, 2: {1, 2}, 3: {1, 2, 3}, 4: {1, 2, 3, 4}, 5: {1, 2, 3, 4, 5},
    6: {1, 2, 3, 4, 5, 6}, 7: {1, 2, 3, 4, 5, 6, 7}, 8: {1, 2, 3, 4, 5, 6, 8},
    9: {1, 2, 3, 4, 5, 6, 7, 9}, 10: {1, 2, 10},
    0: set(range(1, 11)),                       # 0 ＝ 工具箱
}
COLORS = {1: '#4C97FF', 2: '#9966FF', 3: '#FF8C1A', 4: '#FF6680', 5: '#3FAE6A',
          6: '#0FBD8C', 7: '#E6A000', 8: '#8E6BE0', 9: '#E8544B', 10: '#2BA5C9', 0: '#3F4A56'}

FINGERS = [  # 編號、燈的字、變數名、指尖、第二關節
    (1, '拇', '拇指', 5, None), (2, '食', '食指', 9, 7), (3, '中', '中指', 13, 11),
    (4, '無', '無名指', 17, 15), (5, '小', '小指', 21, 19)]

# 鍵盤模擬：0～9 鍵 → 五位指型（拇食中無小）
KEYMAP = [('0', '00000'), ('1', '01000'), ('2', '01100'), ('3', '01110'), ('4', '01111'),
          ('5', '11111'), ('6', '11001'), ('7', '01001'), ('8', '10001'), ('9', '11000')]
# 模組 8 的手勢清單（? ＝ 這一位不管）
GESTURES = [('石頭', '?0000'), ('剪刀', '?1100'), ('布', '?1111'), ('我愛你', '11001'),
            ('搖滾', '01001'), ('打電話', '10001'), ('手槍', '11000'), ('比一', '01000')]


# ---------------------------------------------------------------- 小工具
def HX(t, n):
    """x 座標；n 可以是數字、變數或積木（例如自訂積木的參數）。"""
    if isinstance(n, (B, Var)):
        m = t.menu('handpose2scratch_menu_landmark', 'landmark', n, '1')
    else:
        m = t.menu('handpose2scratch_menu_landmark', 'landmark', str(n))
    return t.add('handpose2scratch_getX', {'LANDMARK': m})


def HY(t, n):
    if isinstance(n, (B, Var)):
        m = t.menu('handpose2scratch_menu_landmark', 'landmark', n, '1')
    else:
        m = t.menu('handpose2scratch_menu_landmark', 'landmark', str(n))
    return t.add('handpose2scratch_getY', {'LANDMARK': m})


def ABS(t, x): return t.mathop('abs', x)


def layout(t, gap=40):
    """把最上層的程式由上往下排好，並把註解放在程式右邊。"""
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
    tops = [k for k, b in bl.items() if b.get('topLevel')]
    for k in tops:
        bl[k]['x'], bl[k]['y'] = 20, y
        h = count(k) * 48 + 60
        if 'comment' in bl[k]:
            c = t.comments[bl[k]['comment']]
            c['x'], c['y'] = 1080, y
            h = max(h, c['height'] + 30)
        y += h + gap


def initial_props(t):
    """讓還沒按綠旗時的畫面就和執行時一樣：照綠旗程式開頭的
    定位／尺寸／顯示・隱藏，設定角色的初始狀態。"""
    bl = t.blocks
    for b in list(bl.values()):
        if b.get('topLevel') and b['opcode'] == 'event_whenflagclicked':
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
                elif op.startswith('control_'):
                    break
                i = x['next']


class Ctx:
    """一個檔案的產生過程：記住變數、廣播，避免重複建立。"""
    def __init__(self, stage):
        self.stage, self.V, self.L, self.M = stage, {}, {}, {}

    def v(self, name, init=0):
        if name not in self.V:
            self.V[name] = Var(name, init)
            self.stage.variables[name] = self.V[name]
        return self.V[name]

    def l(self, name, items):
        if name not in self.L:
            self.L[name] = Lst(name, items)
            self.stage.lists[name] = self.L[name]
        return self.L[name]

    def m(self, name):
        if name not in self.M:
            self.M[name] = Msg(name)
            self.stage.broadcasts[name] = self.M[name]
        return self.M[name]


# ================================================================= 模組（自訂積木）
def mod1(g, c):
    """模組 1：偵測手 → 看得到手"""
    h = g.define('偵測手', warp=True)
    g.script(h,
        g.if_else(g.and_(g.gt(HX(g, 1), -250), g.gt(HY(g, 10), HY(g, 1))),
                  [g.setv(c.v('看得到手'), 1)],
                  [g.setv(c.v('看得到手'), 0)]))
    g.comment(h, '【模組 1】偵測手\n'
                 '輸入：無　輸出：看得到手（1 ＝ 看得到，0 ＝ 看不到）\n\n'
                 '兩道守門：\n'
                 '① 手腕 (1) 的 x > −250：偵測不到手時，座標積木回傳「空白」。'
                 '空白和數字比大小，結果是「不成立」，所以這一條會擋掉。'
                 '（但空白拿去「定位」會被當成 0，角色會跳到舞台中央 —— 所以一定要先守門。）\n'
                 '② 中指第三關節 (10) 的 y > 手腕 (1) 的 y：手有立起來（手指朝上）。', 400, 200)


def mod2(g, c):
    """模組 2：量尺寸 → 手長、手寬"""
    h = g.define('量尺寸', warp=True)
    g.script(h,
        g.setv(c.v('手長'), g.sub_(HY(g, 10), HY(g, 1))),
        g.setv(c.v('手寬'), ABS(g, g.sub_(HX(g, 6), HX(g, 18)))))
    g.comment(h, '【模組 2】量尺寸\n'
                 '輸入：無　輸出：手長、手寬\n\n'
                 '手長 ＝ 中指第三關節 (10) 的 y − 手腕 (1) 的 y　（直向的尺）\n'
                 '手寬 ＝｜食指第三關節 (6) 的 x − 小指第三關節 (18) 的 x｜（橫向的尺）\n\n'
                 '手靠近鏡頭，兩把尺一起變大；手離遠，一起變小。\n'
                 '之後所有的門檻都用「尺 × 比例」，所以遠近都不影響判斷。', 400, 200)


def mod3(g, c):
    """模組 3：判斷手指 (指尖)(關節)(目前) → 手指結果"""
    h = g.define('判斷手指 %s %s %s', ['指尖', '關節', '目前'], warp=True)
    餘裕 = c.v('餘裕'); 結果 = c.v('手指結果')
    g.script(h,
        g.setv(餘裕, g.mul(c.v('手長'), c.v('餘裕比例'))),
        g.setv(結果, g.arg('目前')),
        g.if_else(g.eq(g.arg('目前'), 1),
            [g.if_(g.lt(HY(g, g.arg('指尖')), g.sub_(HY(g, g.arg('關節')), 餘裕)),
                   g.setv(結果, 0))],
            [g.if_(g.gt(HY(g, g.arg('指尖')), g.add_(HY(g, g.arg('關節')), 餘裕)),
                   g.setv(結果, 1))]))
    g.comment(h, '【模組 3】判斷手指 (指尖) (關節) (目前)\n'
                 '輸入：指尖編號、第二關節編號、這根手指目前的狀態\n'
                 '輸出：手指結果（1 ＝ 伸直，0 ＝ 彎著）\n\n'
                 '規則：指尖的 y > 關節的 y → 伸直\n'
                 '加上「餘裕」（手長 × 餘裕比例）：本來伸直的，要低於關節「餘裕」以上才改成彎；'
                 '本來彎著的，要高出「餘裕」才改成伸直。中間地帶維持原狀，數字就不會抖。\n\n'
                 '同一塊積木用四次：食指 (9)(7)、中指 (13)(11)、無名指 (17)(15)、小指 (21)(19)', 420, 260)


def mod4(g, c):
    """模組 4：判斷拇指 → 拇指"""
    h = g.define('判斷拇指', warp=True)
    跨距 = c.v('拇指跨距'); 門檻 = c.v('拇指門檻'); 餘 = c.v('拇指餘裕'); 拇指 = c.v('拇指')
    g.script(h,
        g.setv(跨距, ABS(g, g.sub_(HX(g, 5), HX(g, 18)))),
        g.setv(門檻, g.mul(c.v('手寬'), c.v('拇指比例'))),
        g.setv(餘, g.mul(c.v('手寬'), c.v('餘裕比例'))),
        g.if_else(g.eq(拇指, 1),
            [g.if_(g.lt(跨距, g.sub_(門檻, 餘)), g.setv(拇指, 0))],
            [g.if_(g.gt(跨距, g.add_(門檻, 餘)), g.setv(拇指, 1))]))
    g.comment(h, '【模組 4】判斷拇指\n'
                 '輸入：無（用到模組 2 的手寬）　輸出：拇指（1／0）\n\n'
                 '拇指是往「旁邊」伸的，y 幾乎不變，所以改量橫向：\n'
                 '拇指跨距 ＝｜拇指尖 (5) 的 x − 小指第三關節 (18) 的 x｜\n'
                 '跨距 > 手寬 × 拇指比例（1.35）→ 伸直\n\n'
                 '★ 量到「小指」那一側，不是食指：拇指收起來時常常整個橫過手掌，'
                 '那時它離食指掌根反而更遠，會被誤判成張開。', 420, 240)


def mod5(g, c):
    """模組 5：數手指 → 五根手指、手指數、指型、四指型"""
    h = g.define('數手指', warp=True)
    V = {n: c.v(n) for _, _, n, _, _ in FINGERS}
    body = [g.call('判斷拇指')]
    for _, _, name, tip, pip in FINGERS[1:]:
        body += [g.call('判斷手指 %s %s %s', tip, pip, V[name]),
                 g.setv(V[name], c.v('手指結果'))]
    a, b_, m, r, p = (V[n] for n in ('拇指', '食指', '中指', '無名指', '小指'))
    body += [
        g.setv(c.v('手指數'), g.add_(g.add_(a, g.add_(b_, m)), g.add_(r, p))),
        g.setv(c.v('指型', '-----'), g.join(g.join(a, b_), g.join(m, g.join(r, p)))),
        g.setv(c.v('四指型', '----'), g.join(g.join(b_, m), g.join(r, p))),
    ]
    g.script(h, *body)
    g.comment(h, '【模組 5】數手指\n'
                 '輸入：無　輸出：拇指～小指、手指數、指型、四指型\n\n'
                 '把模組 3 的「判斷手指」用四次，再加上模組 4 的拇指。\n'
                 '每根手指存成 0 或 1，所以：\n'
                 '・手指數 ＝ 五個加起來（0～5）\n'
                 '・指型 ＝ 五個接起來，順序是「拇 食 中 無 小」，例如 01100\n'
                 '・四指型 ＝ 不含拇指的四位，例如 1100（猜拳用）', 420, 220)


def mod6(g, c):
    """模組 6：穩定判斷＋沒手處理 → 確定手指數、確定指型、確定四指型"""
    h = g.define('穩定判斷', warp=True)
    g.script(h,
        g.setv(c.v('沒手起點'), g.timer()),
        g.if_else(g.eq(c.v('指型', '-----'), c.v('上次指型', '-----')),
            [g.if_(g.gt(g.sub_(g.timer(), c.v('穩定起點')), c.v('穩定門檻')),
                   g.setv(c.v('確定指型', '-----'), c.v('指型')),
                   g.setv(c.v('確定四指型', '----'), c.v('四指型')),
                   g.setv(c.v('確定手指數', -1), c.v('手指數')))],
            [g.setv(c.v('穩定起點'), g.timer()),
             g.setv(c.v('上次指型'), c.v('指型'))]))
    g.comment(h, '【模組 6-1】穩定判斷（看得到手時呼叫）\n'
                 '輸入：無　輸出：確定手指數、確定指型、確定四指型\n\n'
                 '同一個指型要「維持」超過穩定門檻（0.15 秒）才寫進「確定」變數。\n'
                 '★ 要用計時器，不要用次數：「重複無限次」一個畫面會跑好幾百次，'
                 '「連續 5 次一樣」其實 0.01 秒就達成了，等於沒有防抖動。\n\n'
                 '遊戲只讀「確定」開頭的變數。', 420, 220)

    h2 = g.define('沒手處理', warp=True)
    clear = [g.setv(c.v(n), 0) for _, _, n, _, _ in FINGERS]
    clear += [g.setv(c.v('手指數'), -1), g.setv(c.v('指型'), '-----'), g.setv(c.v('四指型'), '----'),
              g.setv(c.v('上次指型'), '-----'), g.setv(c.v('確定指型'), '-----'),
              g.setv(c.v('確定四指型'), '----'), g.setv(c.v('確定手指數'), -1)]
    g.script(h2,
        g.if_(g.gt(g.sub_(g.timer(), c.v('沒手起點')), c.v('掉格容忍')), *clear))
    g.comment(h2, '【模組 6-2】沒手處理（看不到手時呼叫）\n\n'
                  '★ 抓不到手時不要馬上清空：攝影機偶爾會漏掉一格，'
                  '一漏就清空的話，玩家會覺得「怎麼比都沒反應」。\n'
                  '要連續超過「掉格容忍」（0.4 秒）都抓不到，才當作手真的離開。', 400, 170)


def mod7(g, c):
    """模組 7：認猜拳 → 猜拳號"""
    h = g.define('認猜拳', warp=True)
    四 = c.v('確定四指型', '----'); 號 = c.v('猜拳號')
    g.script(h,
        g.if_else(g.eq(四, '0000'), [g.setv(號, 1)], [
            g.if_else(g.eq(四, '1100'), [g.setv(號, 2)], [
                g.if_else(g.eq(四, '1111'), [g.setv(號, 3)], [g.setv(號, 0)])])]))
    g.comment(h, '【模組 7】認猜拳\n'
                 '輸入：無（讀模組 6 的確定四指型）\n'
                 '輸出：猜拳號（1 石頭、2 剪刀、3 布、0 看不懂）\n\n'
                 '只看「四指型」，故意不看拇指：比剪刀時拇指收或翹因人而異，'
                 '算進去的話會常常「看不懂」。\n'
                 '0000 ＝ 石頭　1100 ＝ 剪刀　1111 ＝ 布', 400, 190)


def mod8(g, c):
    """模組 8：比對手勢 (目標) → 符合；認手勢 → 認出手勢"""
    h = g.define('比對手勢 %s', ['目標'], warp=True)
    位置 = c.v('比對位置'); 相同 = c.v('相同數'); 符合 = c.v('符合')
    目標字 = lambda: g.letter(位置, g.arg('目標'))
    g.script(h,
        g.setv(位置, 0), g.setv(相同, 0),
        g.repeat(5,
            g.chv(位置, 1),
            g.if_(g.or_(g.eq(目標字(), '?'), g.eq(目標字(), g.letter(位置, c.v('確定指型', '-----')))),
                  g.chv(相同, 1))),
        g.if_else(g.eq(相同, 5), [g.setv(符合, 1)], [g.setv(符合, 0)]))
    g.comment(h, '【模組 8-1】比對手勢 (目標)\n'
                 '輸入：目標指型，例如 11001　輸出：符合（1／0）\n\n'
                 '一位一位比：目標的第幾個字 ＝ 確定指型的第幾個字，就算一個相同。\n'
                 '五個都相同 → 符合。\n'
                 '目標裡寫「?」代表「這根手指不管」，例如 ?1100 ＝ 剪刀（拇指收或翹都算）。', 420, 190)

    名稱 = c.l('手勢名稱', [n for n, _ in GESTURES])
    密碼 = c.l('手勢密碼', [p for _, p in GESTURES])
    編號 = c.v('手勢編號'); 認出 = c.v('認出手勢', '（沒有）')
    h2 = g.define('認手勢', warp=True)
    g.script(h2,
        g.setv(認出, '（沒有）'), g.setv(編號, 0),
        g.repeat(g.llen(密碼),
            g.chv(編號, 1),
            g.call('比對手勢 %s', g.item(編號, 密碼)),
            g.if_(g.and_(g.eq(符合, 1), g.eq(認出, '（沒有）')),
                  g.setv(認出, g.item(編號, 名稱)))))
    g.comment(h2, '【模組 8-2】認手勢\n'
                  '輸入：無　輸出：認出手勢（名稱）\n\n'
                  '把「手勢密碼」清單一個一個拿去比對，第一個符合的就是答案。\n'
                  '想加新手勢？在「手勢名稱」和「手勢密碼」清單的同一個位置各加一項就好，'
                  '程式完全不用改。', 400, 180)


def mod9(g, c):
    """模組 9：猜拳勝負 (我)(對方) → 勝負"""
    h = g.define('猜拳勝負 %s %s', ['我', '對方'], warp=True)
    勝負 = c.v('勝負', '')
    g.script(h,
        g.if_else(g.eq(g.arg('我'), g.arg('對方')), [g.setv(勝負, '平手')], [
            g.if_else(g.eq(g.add_(g.mod(g.arg('我'), 3), 1), g.arg('對方')),
                      [g.setv(勝負, '贏')], [g.setv(勝負, '輸')])]))
    g.comment(h, '【模組 9】猜拳勝負 (我) (對方)\n'
                 '輸入：兩個猜拳號（1 石頭、2 剪刀、3 布）　輸出：勝負（贏／輸／平手）\n\n'
                 '一條算式取代三條規則：\n'
                 '（我 ÷ 3 的餘數）＋ 1 ＝ 對方 → 我贏\n'
                 '1→2 石頭贏剪刀　2→3 剪刀贏布　3→1 布贏石頭', 400, 190)


def mod10(g, c):
    """模組 10：手指游標 → 游標x、游標y、捏合、捏的次數＋廣播「捏一下」"""
    h = g.define('手指游標', warp=True)
    捏距 = c.v('捏距'); 捏合 = c.v('捏合'); 手長 = c.v('手長')
    g.script(h,
        g.setv(c.v('游標x'), HX(g, 9)), g.setv(c.v('游標y'), HY(g, 9)),
        g.setv(捏距, g.add_(ABS(g, g.sub_(HX(g, 5), HX(g, 9))), ABS(g, g.sub_(HY(g, 5), HY(g, 9))))),
        g.if_else(g.eq(捏合, 1),
            [g.if_(g.gt(捏距, g.mul(手長, c.v('放開比例'))), g.setv(捏合, 0))],
            [g.if_(g.lt(捏距, g.mul(手長, c.v('捏合比例'))),
                   g.setv(捏合, 1), g.chv(c.v('捏的次數'), 1), g.broadcast(c.m('捏一下')))]))
    g.comment(h, '【模組 10】手指游標\n'
                 '輸入：無（用到模組 2 的手長）\n'
                 '輸出：游標x、游標y（食指尖 9）、捏合（1／0）、捏的次數\n'
                 '　　　＋ 捏下去的那一瞬間廣播「捏一下」\n\n'
                 '捏距 ＝｜拇指尖 x − 食指尖 x｜＋｜拇指尖 y − 食指尖 y｜（不用平方根）\n'
                 '捏距 < 手長 × 捏合比例 → 捏住；> 手長 × 放開比例 → 放開。\n'
                 '兩個門檻不一樣（遲滯），手指在中間抖動也不會一直「捏一下」。\n\n'
                 '其他角色只要「當收到訊息 捏一下」＋「碰到 游標？」就能做按鈕。', 440, 270)


def keyboard_block(g, c, mods):
    """鍵盤模擬：沒有攝影機也能上課（K 鍵切換）。"""
    h = g.define('鍵盤模擬', warp=True)
    body = [g.setv(c.v('看得到手'), 1)]
    if 6 in mods:
        指型 = c.v('確定指型', '-----')
        for k, p in KEYMAP:
            if 8 not in mods and k in '6789':
                continue
            body.append(g.if_(g.keypressed(k), g.setv(指型, p)))
        L = lambda i: g.letter(i, 指型)
        body.append(g.if_(g.not_(g.eq(指型, '-----')),
            g.setv(c.v('確定四指型', '----'), g.join(g.join(L(2), L(3)), g.join(L(4), L(5)))),
            g.setv(c.v('確定手指數', -1), g.add_(g.add_(L(1), g.add_(L(2), L(3))), g.add_(L(4), L(5)))),
            *[g.setv(c.v(f[2]), L(f[0])) for f in FINGERS],
            g.setv(c.v('手指數'), c.v('確定手指數')), g.setv(c.v('指型'), 指型)))
    if 10 in mods:
        捏合 = c.v('捏合')
        body += [g.setv(c.v('游標x'), g.mouse_x()), g.setv(c.v('游標y'), g.mouse_y()),
                 g.if_else(g.eq(捏合, 1),
                     [g.if_(g.not_(g.mouse_down()), g.setv(捏合, 0))],
                     [g.if_(g.mouse_down(), g.setv(捏合, 1), g.chv(c.v('捏的次數'), 1),
                            g.broadcast(c.m('捏一下')))])]
    g.script(h, *body)
    txt = '鍵盤模擬（按 K 切換）：沒有攝影機也能測試。\n'
    if 6 in mods:
        txt += '按住數字鍵 ＝ 比出手勢：0～5 ＝ 數字' + ('，6 我愛你、7 搖滾、8 打電話、9 手槍' if 8 in mods else '') + '\n'
    if 10 in mods:
        txt += '滑鼠 ＝ 游標，按下滑鼠 ＝ 捏一下\n'
    g.comment(h, txt, 380, 110)


MOD_FUNCS = {1: mod1, 2: mod2, 3: mod3, 4: mod4, 5: mod5, 6: mod6, 7: mod7, 8: mod8, 9: mod9, 10: mod10}


def main_loop(g, c, mods, n):
    """綠旗：攝影機設定、可調數值、主迴圈。"""
    kb = bool(mods & {6, 10})
    setup = [g.hide(),
             g.add('handpose2scratch_videoToggle', {'VIDEO_STATE': g.menu('handpose2scratch_menu_videoMenu', 'videoMenu', 'on')}),
             g.video_ghost(55), g.ratio('0.75'),
             g.setv(c.v('顯示骨架'), 1)]
    if kb:
        setup.append(g.setv(c.v('鍵盤模式'), 0))
    if 3 in mods or 4 in mods:
        setup.append(g.setv(c.v('餘裕比例', 0.08), 0.08))
    if 4 in mods:
        setup.append(g.setv(c.v('拇指比例', 1.35), 1.35))
    if 6 in mods:
        setup += [g.setv(c.v('穩定門檻', 0.15), 0.15), g.setv(c.v('掉格容忍', 0.4), 0.4)]
    if 10 in mods:
        setup += [g.setv(c.v('捏合比例', 0.25), 0.25), g.setv(c.v('放開比例', 0.4), 0.4),
                  g.setv(c.v('捏合'), 0), g.setv(c.v('捏的次數'), 0)]
    for _, _, name, _, _ in FINGERS:
        if name in c.V:
            setup.append(g.setv(c.V[name], 0))
    if 6 in mods:
        setup += [g.setv(c.v('確定手指數'), -1), g.setv(c.v('確定指型'), '-----'),
                  g.setv(c.v('確定四指型'), '----'), g.setv(c.v('沒手起點'), 0)]

    seen = []
    if 2 in mods:
        seen.append(g.call('量尺寸'))
    if 5 in mods:
        seen.append(g.call('數手指'))
    else:
        if 4 in mods:
            seen.append(g.call('判斷拇指'))
        if 3 in mods:
            seen += [g.call('判斷手指 %s %s %s', 9, 7, c.v('食指')), g.setv(c.v('食指'), c.v('手指結果'))]
    if 6 in mods:
        seen.append(g.call('穩定判斷'))
    if 10 in mods:
        seen.append(g.call('手指游標'))
    lost = []
    if 6 in mods:
        lost.append(g.call('沒手處理'))
    if 10 in mods:
        lost.append(g.setv(c.v('捏合'), 0))
    cam = [g.call('偵測手')]
    if seen or lost:
        cam.append(g.if_else(g.eq(c.v('看得到手'), 1), seen or [g.wait(0)], lost or [g.wait(0)]))
    after = []
    if 7 in mods:
        after.append(g.call('認猜拳'))
    if 8 in mods:
        after.append(g.call('認手勢'))
    if kb:
        loop = [g.if_else(g.eq(c.v('鍵盤模式'), 1), [g.call('鍵盤模擬')], cam)] + after
    else:
        loop = cam + after
    loop.append(g.wait(0.02))
    h = g.when_flag()
    g.script(h, *setup, g.forever(*loop))
    name = '手勢模組工具箱' if n == 0 else '模組 %d：%s' % (n, MODULES[n][0])
    g.comment(h, '【%s】\n這個角色是「大腦」：所有自訂積木都在這裡。\n'
                 '其他角色只讀它算好的變數，不自己偵測。\n\n'
                 '主迴圈每 0.02 秒：偵測手 → 看得到就量、判斷；看不到就等等再清空。\n'
                 '設為 0.08、1.35 這些「比例／門檻」都可以現場直接改。' % name, 400, 170)
    if kb:
        k = g.when_key('k')
        g.script(k, g.setv(c.v('鍵盤模式'), g.sub_(1, c.v('鍵盤模式'))))
    d = g.when_key('d')
    g.script(d, g.setv(c.v('顯示骨架'), g.sub_(1, c.v('顯示骨架'))))


# ================================================================= 顯示用角色
POINTS = {1: [1, 10], 2: [1, 10, 6, 18], 3: [1, 10, 7, 9], 4: [1, 6, 18, 5, 7, 9],
          10: [1, 10, 5, 9]}
ALLPTS = [1, 6, 18, 5, 7, 9, 11, 13, 15, 17, 19, 21]


def point_kind(p):
    return '手腕' if p == 1 else '掌根' if p in (6, 10, 18) else '指尖' if p in (5, 9, 13, 17, 21) else '關節'


def sp_points(c, pts):
    s = Target('骨架點')
    for k in ('手腕', '掌根', '關節', '指尖'):
        add_ref_costume(s, k, '骨架', k)
    編號 = Var('編號', 0); 計數 = Var('計數', 0)
    s.variables['編號'] = 編號; s.variables['計數'] = 計數
    點 = c.l('顯示點', [str(p) for p in pts]); 型 = c.l('點造型', [point_kind(p) for p in pts])
    s.script(s.when_flag(), s.hide(), s.setv(計數, 0),
        s.repeat(s.llen(點), s.chv(計數, 1), s.setv(編號, 計數), s.clone_self()),
        s.setv(編號, 0))
    h = s.when_clone()
    s.script(h, s.costume(s.item(編號, 型)), s.front(),
        s.forever(
            s.if_else(s.and_(s.eq(c.v('顯示骨架'), 1), s.gt(HX(s, 1), -250)),
                [s.goto(HX(s, s.item(編號, 點)), HY(s, s.item(編號, 點))), s.show()],
                [s.hide()])))
    s.comment(h, '每個分身負責一個點：點的編號放在「顯示點」清單裡。\n'
                 '座標積木的下拉選單可以放「清單的第幾項」—— 自訂積木的參數也是這樣用的。\n按 D 開關。', 360, 120)
    return s


def sp_lamps(c, fingers):
    s = Target('手指燈')
    for _, ch, _, _, _ in FINGERS:
        for st in '01':
            add_ref_costume(s, ch + st, '手指燈', ch + st)
    編號 = Var('編號', 0); 計數 = Var('計數', 0); 狀態 = Var('狀態', 0)
    for v in (編號, 計數, 狀態):
        s.variables[v.name] = v
    use = [f for f in FINGERS if f[2] in fingers]
    指名 = c.l('燈的字', [f[1] for f in use])
    n = len(use)
    s.script(s.when_flag(), s.hide(), s.setv(計數, 0),
        s.repeat(n, s.chv(計數, 1), s.setv(編號, 計數), s.clone_self()), s.setv(編號, 0))
    ifs = [s.if_(s.eq(編號, i + 1), s.setv(狀態, c.v(f[2]))) for i, f in enumerate(use)]
    h = s.when_clone()
    s.script(h, s.goto(s.sub_(s.mul(編號, 72), 36 * (n + 1)), -150), s.size(70), s.show(),
        s.forever(*ifs, s.costume(s.join(s.item(編號, 指名), 狀態))))
    s.comment(h, '手指燈只「讀」手勢模組算好的變數。\n造型名稱用字串組合：「食」＋「1」＝ 造型「食1」。', 320, 90)
    return s


def sp_title(n):
    s = Target('標題')
    label = '手勢模組工具箱' if n == 0 else '模組 %d｜%s' % (n, MODULES[n][0])
    col = COLORS[n]
    body = ('<rect x="2" y="2" width="276" height="42" rx="21" fill="%s" stroke="#fff" stroke-width="3"/>'
            '<text x="140" y="31" font-family="sans-serif" font-size="21" font-weight="bold" fill="#fff" '
            'text-anchor="middle">%s</text>' % (col, label))
    s.add_costume('標題', K.svg(280, 46, body), 'svg', 140, 23)
    s.script(s.when_flag(), s.goto(95, 152), s.front(), s.show())
    return s


def sp_badge(name, text, x, y, color='#3F4A56', w=300):
    s = Target(name)
    body = ('<rect x="2" y="2" width="%d" height="36" rx="18" fill="#fff" stroke="%s" stroke-width="3"/>'
            '<text x="%d" y="26" font-family="sans-serif" font-size="17" font-weight="bold" fill="%s" '
            'text-anchor="middle">%s</text>' % (w - 4, color, w // 2, color, text))
    s.add_costume(name, K.svg(w, 40, body), 'svg', w // 2, 20)
    s.script(s.when_flag(), s.goto(x, y), s.show())
    return s


def sp_hand_sign(c):
    """模組 1：看得到手的牌子"""
    s = Target('狀態牌')
    for nm, label, col in [('有手', '看到手了！', '#3FAE6A'), ('沒手', '把手掌立起來，手指朝上', '#9E9E9E')]:
        cc, cx, cy = K.badge(label, col, w=300)
        s.add_costume(nm, cc, 'svg', cx, cy)
    s.script(s.when_flag(), s.goto(0, -150), s.show(),
        s.forever(s.if_else(s.eq(c.v('看得到手'), 1), [s.costume('有手')], [s.costume('沒手')])))
    return s


def sp_ruler(c):
    """模組 2：說出手長、手寬，並提示遠近"""
    s = Target('量尺小幫手')
    cc, cx, cy = K.circle_face('#9966FF')
    s.add_costume('小幫手', cc, 'svg', cx, cy)
    s.script(s.when_flag(), s.goto(-170, -120), s.show(),
        s.forever(
            s.if_else(s.eq(c.v('看得到手'), 1),
                [s.if_else(s.gt(c.v('手長'), 120), [s.say('太近了！手長 ' + '＞120')],
                    [s.if_else(s.lt(c.v('手長'), 45), [s.say('有點遠，靠近一點')],
                        [s.say(s.join('手長 ', s.join(s.round_(c.v('手長')),
                                   s.join('　手寬 ', s.round_(c.v('手寬'))))))])])],
                [s.say('看不到手')])))
    return s


def sp_number(c):
    """模組 6：數字卡（顯示確定手指數）"""
    s = Target('數字卡')
    for i in range(6):
        add_ref_costume(s, '數%d' % i, '題目卡', '數%d' % i)
    h = s.when_flag()
    s.script(h, s.hide(), s.goto(0, 40), s.size(90),
        s.forever(s.if_else(s.gt(c.v('確定手指數'), -1),
                            [s.costume(s.join('數', c.v('確定手指數'))), s.show()], [s.hide()])))
    s.comment(h, '★「造型換成 (確定手指數)」會被當成「第幾個造型」，數字永遠少 1。\n'
                 '一定要用字串組合變成文字：「數」＋ 3 ＝ 造型「數3」。', 340, 90)
    return s


def sp_rps_hand(c, name, x, var, cond=None):
    s = Target(name)
    for i, nm in enumerate(['問號', '石頭', '剪刀', '布']):
        add_ref_costume(s, '拳%d' % i, '我的手', nm)
    y, sz = (10, 80) if cond is None else (-15, 62)
    s.props.update(x=x, y=y)
    show = [s.costume(s.join('拳', var)), s.show()]
    if cond is None:
        s.script(s.when_flag(), s.goto(x, y), s.size(sz), s.forever(*show))
    else:
        s.script(s.when_flag(), s.goto(x, y), s.size(sz), s.hide(),
                 s.forever(s.if_else(cond(s), show, [s.hide()])))
    return s


def sp_gesture_name(c):
    """模組 8：說出認出的手勢"""
    s = Target('手勢播報員')
    cc, cx, cy = K.circle_face('#8E6BE0')
    s.add_costume('播報員', cc, 'svg', cx, cy)
    s.script(s.when_flag(), s.goto(-40, -40), s.size(130), s.show(),
        s.forever(s.say(s.join('我看到：', c.v('認出手勢')))))
    return s


def rps_game(g, c):
    """模組 9 示範：按空白鍵玩一局（程式放在手勢模組裡，因為要呼叫自訂積木）"""
    遊戲中 = c.v('遊戲中'); 我 = c.v('我出拳'); 電腦 = c.v('電腦出拳'); 顯示 = c.v('結果顯示')
    h = g.when_key('space')
    g.script(h,
        g.if_(g.eq(遊戲中, 0),
            g.setv(遊戲中, 1), g.setv(顯示, 0), g.setv(c.v('勝負'), ''),
            g.broadcast(c.m('倒數'), True),
            g.setv(我, c.v('猜拳號')),
            g.if_else(g.eq(我, 0),
                [g.setv(電腦, 0), g.setv(c.v('勝負'), '看不懂')],
                [g.setv(電腦, g.random(1, 3)), g.call('猜拳勝負 %s %s', 我, 電腦),
                 g.chv(c.v('局數'), 1)]),
            g.if_(g.eq(c.v('勝負'), '贏'), g.chv(c.v('贏的次數'), 1)),
            g.setv(顯示, 1),
            g.broadcast(c.m('顯示結果'), True),
            g.wait(1.2), g.setv(顯示, 0), g.setv(遊戲中, 0)))
    g.comment(h, '【模組 9 示範】按空白鍵猜一局\n'
                 '喊完「出拳！」才讀猜拳號 → 電腦隨機出 → 呼叫「猜拳勝負」。\n'
                 '這段放在手勢模組裡，因為自訂積木只能在同一個角色裡呼叫。', 380, 110)


def sp_countdown(c):
    s = Target('倒數')
    for nm in ('剪刀', '石頭', '布', '出拳！'):
        add_ref_costume(s, nm, '倒數', nm)
    add_ref_sound(s, '嗶'); add_ref_sound(s, '出拳')
    s.script(s.when_flag(), s.hide())
    seq = []
    for nm in ('剪刀', '石頭', '布'):
        seq += [s.costume(nm), s.show(), s.play('嗶'), s.wait(0.45)]
    seq += [s.costume('出拳！'), s.play('出拳'), s.wait(0.35), s.hide()]
    s.script(s.when_msg(c.m('倒數')), s.goto(0, 88), s.size(80), s.front(), *seq)
    return s


def sp_result(c):
    s = Target('結果卡')
    for new, old in [('結果贏', '你贏了！'), ('結果輸', '你輸了'), ('結果平手', '平手'), ('結果看不懂', '看不懂')]:
        add_ref_costume(s, new, '結果卡', old)
    for nm in ('贏了', '輸了', '平手'):
        add_ref_sound(s, nm)
    s.script(s.when_flag(), s.hide())
    h = s.when_msg(c.m('顯示結果'))
    s.script(h, s.goto(0, 88), s.size(80), s.costume(s.join('結果', c.v('勝負'))), s.front(), s.show(),
        s.if_(s.eq(c.v('勝負'), '贏'), s.play('贏了')),
        s.if_(s.eq(c.v('勝負'), '輸'), s.play('輸了')),
        s.if_(s.eq(c.v('勝負'), '平手'), s.play('平手')),
        s.wait(1.2), s.hide())
    return s


def sp_cursor(c):
    s = Target('游標')
    cc, cx, cy = K.dot('#2BA5C9', 16); s.add_costume('張開', cc, 'svg', cx, cy)
    cc, cx, cy = K.dot('#FF3B7A', 11); s.add_costume('捏住', cc, 'svg', cx, cy)
    s.script(s.when_flag(), s.hide(), s.front(),
        s.forever(s.if_else(s.eq(c.v('看得到手'), 1),
            [s.goto(c.v('游標x'), c.v('游標y')),
             s.if_else(s.eq(c.v('捏合'), 1), [s.costume('捏住')], [s.costume('張開')]), s.show()],
            [s.hide()])))
    return s


def balloon_svg(col):
    return K.svg(60, 90, '<line x1="30" y1="62" x2="30" y2="88" stroke="#666" stroke-width="2"/>'
                 '<ellipse cx="30" cy="32" rx="26" ry="30" fill="%s" stroke="#fff" stroke-width="3"/>'
                 '<ellipse cx="21" cy="21" rx="6" ry="9" fill="#fff" opacity=".45"/>'
                 '<path d="M25 61 L35 61 L30 67 Z" fill="%s"/>' % (col, col))


def sp_balloons(c):
    s = Target('氣球')
    for i, col in enumerate(['#FF6B8B', '#FFC83D', '#4C97FF']):
        s.add_costume('氣球%d' % (i + 1), balloon_svg(col), 'svg', 30, 32)
    add_ref_sound(s, '叮')
    計數 = Var('計數', 0); s.variables['計數'] = 計數
    分 = c.v('氣球分數')
    s.script(s.when_flag(), s.hide(), s.setv(分, 0), s.setv(計數, 0),
        s.repeat(3, s.chv(計數, 1), s.costume(s.join('氣球', 計數)), s.clone_self()))
    s.script(s.when_clone(), s.goto(s.add_(s.mul(計數, 130), s.random(-230, -170)), s.random(-110, 90)), s.show())
    h = s.when_msg(c.m('捏一下'))
    s.script(h, s.if_(s.touching('游標'),
        s.chv(分, 1), s.play('叮'), s.hide(), s.wait(0.6),
        s.goto(s.add_(s.mul(計數, 130), s.random(-230, -170)), s.random(-110, 90)), s.show()))
    s.comment(h, '做一個「用手指按的按鈕」只要兩件事：\n'
                 '① 當收到訊息「捏一下」　② 碰到「游標」？', 320, 80)
    return s


# ================================================================= 組裝
def build(n, out_path):
    reset()
    mods = INCLUDES[n]
    stage = Target('Stage', stage=True)
    add_ref_costume(stage, '背景', 'Stage', '數字背景')
    c = Ctx(stage)
    g = Target('手勢模組')
    cc, cx, cy = K.dot('#FFFFFF', 4)
    g.add_costume('空', cc, 'svg', cx, cy)
    for k in sorted(mods):
        MOD_FUNCS[k](g, c)
    if mods & {6, 10}:
        keyboard_block(g, c, mods)
    main_loop(g, c, mods, n)
    if n == 9:
        rps_game(g, c)

    sprites = [g]
    fingers = [f[2] for f in FINGERS if f[2] in c.V]
    pts = ALLPTS if n in (0, 5, 6, 7, 8, 9) else POINTS[n]
    sprites.append(sp_points(c, pts))
    if fingers and n not in (9, 10):
        sprites.append(sp_lamps(c, fingers))
    mon = []
    if n == 1:
        sprites.append(sp_hand_sign(c)); mon = ['看得到手']
    elif n == 2:
        sprites.append(sp_ruler(c)); mon = ['看得到手', '手長', '手寬']
    elif n == 3:
        mon = ['看得到手', '手長', '餘裕', '食指']
    elif n == 4:
        mon = ['手寬', '拇指跨距', '拇指門檻', '拇指', '食指']
    elif n == 5:
        mon = ['手指數', '指型', '四指型']
    elif n == 6:
        sprites.append(sp_number(c)); mon = ['手指數', '確定手指數', '確定指型', '鍵盤模式']
    elif n == 7:
        sprites.append(sp_rps_hand(c, '我的手', 0, c.v('猜拳號')))
        mon = ['確定四指型', '猜拳號', '鍵盤模式']
    elif n == 8:
        sprites.append(sp_gesture_name(c)); mon = ['確定指型', '認出手勢', '鍵盤模式']
    elif n == 9:
        sprites.append(sp_rps_hand(c, '我的手', -110, c.v('我出拳'),
                                   lambda s: s.eq(c.v('結果顯示'), 1)))
        sprites.append(sp_rps_hand(c, '電腦手', 110, c.v('電腦出拳'),
                                   lambda s: s.eq(c.v('結果顯示'), 1)))
        sprites.append(sp_countdown(c)); sprites.append(sp_result(c))
        sprites.append(sp_badge('提示', '比好手勢，按「空白鍵」猜拳！', 0, -150, COLORS[9]))
        mon = ['猜拳號', '勝負', '局數', '贏的次數']
    elif n == 10:
        sprites.append(sp_balloons(c)); sprites.append(sp_cursor(c))
        sprites.append(sp_badge('提示', '食指對準氣球，拇指和食指捏一下！', 0, -150, COLORS[10], 340))
        mon = ['捏距', '捏合', '捏的次數', '氣球分數', '鍵盤模式']
    else:  # 工具箱
        sprites.append(sp_cursor(c))
        mon = ['看得到手', '手指數', '確定手指數', '確定指型', '猜拳號', '認出手勢', '捏合', '鍵盤模式']
    sprites.insert(1, sp_title(n))
    for s in sprites:
        layout(s)
        initial_props(s)
    monitors = [monitor(c.V[m], 5, 5 + 27 * i) for i, m in enumerate(mon)]
    return save(out_path, stage, sprites, monitors=monitors, extensions=['handpose2scratch'])


def filename(n):
    return '手勢模組工具箱.sb3' if n == 0 else '模組%02d_%s.sb3' % (n, MODULES[n][0])


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    os.makedirs(OUT, exist_ok=True)
    which = [int(a) for a in sys.argv[1:]] or list(range(1, 11)) + [0]
    for n in which:
        p = os.path.join(OUT, filename(n))
        proj = build(n, p)
        nb = sum(len(t['blocks']) for t in proj['targets'])
        print('%-22s %2d 角色  %4d 積木  %6.1f KB' % (filename(n), len(proj['targets']) - 1, nb,
                                                   os.path.getsize(p) / 1024))
