# -*- coding: utf-8 -*-
"""把 student/sb3/ 的 .sb3 積木轉成教學網頁用的積木圖資料（student/assets/blocks_data.js）。

    python export_blocks.py

網頁上的積木圖是從真正的 .sb3 轉出來的，所以「網頁看到的」一定等於「檔案裡的」。
格式是 blk.js 的格式（{k:'stack', c:'variables', t:[...]}）。
"""
import os, sys, json, zipfile, glob

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SB3 = os.path.join(ROOT, 'student', 'sb3')
OUT = os.path.join(ROOT, 'student', 'assets', 'blocks_data.js')

LM = {1: '手腕', 2: '拇指根', 3: '拇指第二關節', 4: '拇指第一關節', 5: '拇指尖',
      6: '食指第三關節', 7: '食指第二關節', 8: '食指第一關節', 9: '食指尖',
      10: '中指第三關節', 11: '中指第二關節', 12: '中指第一關節', 13: '中指尖',
      14: '無名指第三關節', 15: '無名指第二關節', 16: '無名指第一關節', 17: '無名指尖',
      18: '小指第三關節', 19: '小指第二關節', 20: '小指第一關節', 21: '小指尖'}
KEYNAME = {'space': '空白', 'left arrow': '←', 'right arrow': '→'}
MATH = {'abs': '絕對值', 'sqrt': '平方根', 'floor': '無條件捨去', 'ceiling': '無條件進位'}
BIN = {'operator_add': '+', 'operator_subtract': '-', 'operator_multiply': '*', 'operator_divide': '/'}
CMP = {'operator_gt': '>', 'operator_lt': '<', 'operator_equals': '='}


class Conv:
    def __init__(self, blocks):
        self.b = blocks

    # ---------- 輸入 ----------
    def inp(self, blk, key, kind='n'):
        v = blk['inputs'].get(key)
        if not v:
            return {'e': 1} if kind == 'b' else {kind: ''}
        x = v[1]
        if isinstance(x, list):                   # 直接的值或變數
            if x[0] == 12:
                return {'r': {'c': 'variables', 't': [x[1]]}}
            if x[0] == 13:
                return {'r': {'c': 'listtone', 't': [x[1]]}}
            if x[0] == 11:
                return {'d': x[1]}
            val = x[1]
            try:
                float(val)
                return {'n': val}
            except (TypeError, ValueError):
                return {'s': val}
        if x is None:
            return {'e': 1}
        return self.rep(x)

    def menu(self, blk, key):
        """下拉選單（影子積木）→ 選項文字；上面蓋了積木就回傳那個積木。"""
        v = blk['inputs'][key]
        top = v[1]
        if isinstance(top, list):
            return {'r': {'c': 'variables', 't': [top[1]]}}
        tb = self.b[top]
        if tb.get('shadow'):
            return {'d': list(tb['fields'].values())[0][0]}
        return self.rep(top)

    # ---------- 報告積木／布林積木 ----------
    def rep(self, i):
        b = self.b[i]; op = b['opcode']; I = lambda k, kind='n': self.inp(b, k, kind)
        R = lambda c, t: {'r': {'c': c, 't': t}}
        Bo = lambda c, t: {'b': {'c': c, 't': t}}
        if op in BIN:
            return R('operators', [I('NUM1'), BIN[op], I('NUM2')])
        if op in CMP:
            return Bo('operators', [I('OPERAND1', 's'), CMP[op], I('OPERAND2', 's')])
        if op == 'operator_and':
            return Bo('operators', [I('OPERAND1', 'b'), '且', I('OPERAND2', 'b')])
        if op == 'operator_or':
            return Bo('operators', [I('OPERAND1', 'b'), '或', I('OPERAND2', 'b')])
        if op == 'operator_not':
            return Bo('operators', ['不成立', I('OPERAND', 'b')])
        if op == 'operator_mathop':
            return R('operators', [{'d': MATH.get(b['fields']['OPERATOR'][0], b['fields']['OPERATOR'][0])}, '數值', I('NUM')])
        if op == 'operator_mod':
            return R('operators', [I('NUM1'), '除以', I('NUM2'), '的餘數'])
        if op == 'operator_join':
            return R('operators', ['字串組合', I('STRING1', 's'), I('STRING2', 's')])
        if op == 'operator_letter_of':
            return R('operators', ['字串', I('STRING', 's'), '的第', I('LETTER'), '字'])
        if op == 'operator_random':
            return R('operators', ['隨機取數', I('FROM'), '到', I('TO')])
        if op == 'operator_round':
            return R('operators', ['四捨五入數值', I('NUM')])
        if op == 'argument_reporter_string_number':
            return {'p': b['fields']['VALUE'][0]}
        if op in ('handpose2scratch_getX', 'handpose2scratch_getY'):
            m = self.menu(b, 'LANDMARK')
            if 'd' in m:
                n = int(m['d']); m = {'d': '%d %s' % (n, LM[n])}
            return R('ext', [m, '的 %s 座標' % op[-1].lower()])
        if op == 'data_itemoflist':
            return R('listtone', ['清單', {'d': b['fields']['LIST'][0]}, '的第', I('INDEX'), '項'])
        if op == 'data_lengthoflist':
            return R('listtone', ['清單', {'d': b['fields']['LIST'][0]}, '的長度'])
        if op == 'sensing_timer':
            return R('sensing', ['計時器'])
        if op == 'sensing_mousex':
            return R('sensing', ['鼠標的 x'])
        if op == 'sensing_mousey':
            return R('sensing', ['鼠標的 y'])
        if op == 'sensing_mousedown':
            return Bo('sensing', ['滑鼠鍵被按下？'])
        if op == 'sensing_keypressed':
            k = self.menu(b, 'KEY_OPTION')
            return Bo('sensing', [{'d': KEYNAME.get(k.get('d'), k.get('d'))}, '鍵被按下？'])
        if op == 'sensing_touchingobject':
            return Bo('sensing', ['碰到', self.menu(b, 'TOUCHINGOBJECTMENU'), '？'])
        return R('control', [op])

    # ---------- 堆疊積木 ----------
    def stmt(self, i):
        b = self.b[i]; op = b['opcode']; I = lambda k, kind='n': self.inp(b, k, kind)
        S = lambda c, t, **kw: dict({'k': 'stack', 'c': c, 't': t}, **kw)
        sub = lambda k: self.stack(b['inputs'].get(k, [0, None])[1]) if b['inputs'].get(k) else []
        if op == 'procedures_definition':
            proto = self.b[b['inputs']['custom_block'][1]]
            return {'k': 'def', 't': self.proc_parts(proto['mutation'], None)}
        if op == 'procedures_call':
            return S('myblocks', self.proc_parts(b['mutation'], b))
        if op == 'data_setvariableto':
            return S('variables', ['變數', {'d': b['fields']['VARIABLE'][0]}, '設為', I('VALUE', 's')])
        if op == 'data_changevariableby':
            return S('variables', ['變數', {'d': b['fields']['VARIABLE'][0]}, '改變', I('VALUE')])
        if op == 'control_if':
            return {'k': 'c', 'c': 'control', 't': ['如果', I('CONDITION', 'b'), '那麼'], 'body': sub('SUBSTACK')}
        if op == 'control_if_else':
            return {'k': 'ce', 'c': 'control', 't': ['如果', I('CONDITION', 'b'), '那麼'],
                    'body': sub('SUBSTACK'), 'body2': sub('SUBSTACK2')}
        if op == 'control_repeat':
            return {'k': 'c', 'c': 'control', 't': ['重複', I('TIMES'), '次'], 'loop': 1, 'body': sub('SUBSTACK')}
        if op == 'control_repeat_until':
            return {'k': 'c', 'c': 'control', 't': ['重複直到', I('CONDITION', 'b')], 'loop': 1, 'body': sub('SUBSTACK')}
        if op == 'control_forever':
            return {'k': 'forever', 'c': 'control', 't': ['重複無限次'], 'body': sub('SUBSTACK')}
        if op == 'control_wait':
            return S('control', ['等待', I('DURATION'), '秒'])
        if op == 'control_create_clone_of':
            return S('control', ['建立', {'d': '自己'}, '的分身'])
        if op == 'event_broadcast':
            return S('events', ['廣播訊息', I('BROADCAST_INPUT')])
        if op == 'event_broadcastandwait':
            return S('events', ['廣播訊息', I('BROADCAST_INPUT'), '並等待'])
        if op == 'event_whenflagclicked':
            return {'k': 'hat', 'c': 'events', 't': ['當', {'flag': 1}, '被點擊']}
        if op == 'event_whenkeypressed':
            k = b['fields']['KEY_OPTION'][0]
            return {'k': 'hat', 'c': 'events', 't': ['當', {'d': KEYNAME.get(k, k)}, '鍵被按下']}
        if op == 'event_whenbroadcastreceived':
            return {'k': 'hat', 'c': 'events', 't': ['當收到訊息', {'d': b['fields']['BROADCAST_OPTION'][0]}]}
        if op == 'control_start_as_clone':
            return {'k': 'hat', 'c': 'control', 't': ['當分身產生']}
        if op == 'handpose2scratch_videoToggle':
            v = self.menu(b, 'VIDEO_STATE').get('d')
            return S('ext', ['將攝影機', {'d': {'on': '鏡像開啟', 'on-flipped': '開啟', 'off': '關閉'}.get(v, v)}])
        if op == 'handpose2scratch_setVideoTransparency':
            return S('ext', ['將攝影機的透明度設為', I('TRANSPARENCY')])
        if op == 'handpose2scratch_setRatio':
            return S('ext', ['將倍率設為', self.menu(b, 'RATIO')])
        if op == 'looks_hide':
            return S('looks', ['隱藏'])
        if op == 'looks_show':
            return S('looks', ['顯示'])
        if op == 'looks_switchcostumeto':
            return S('looks', ['造型換成', self.menu(b, 'COSTUME')])
        if op == 'looks_say':
            return S('looks', ['說出', I('MESSAGE', 's')])
        if op == 'looks_setsizeto':
            return S('looks', ['尺寸設為', I('SIZE'), '%'])
        if op == 'looks_gotofrontback':
            return S('looks', ['圖層移到', {'d': '最上層'}])
        if op == 'motion_gotoxy':
            return S('motion', ['定位到 x:', I('X'), 'y:', I('Y')])
        if op == 'sound_play':
            return S('sound', ['播放音效', self.menu(b, 'SOUND_MENU')])
        return S('control', [op])

    def proc_parts(self, mut, call):
        code = mut['proccode']; ids = json.loads(mut['argumentids'])
        names = json.loads(mut.get('argumentnames', '[]')) if call is None else None
        out, k = [], 0
        for w in code.split(' '):
            if w == '%s':
                if call is None:
                    out.append({'p': names[k]})
                else:
                    out.append(self.inp(call, ids[k], 's'))
                k += 1
            else:
                out.append(w)
        return out

    def stack(self, i):
        out = []
        while i:
            out.append(self.stmt(i)); i = self.b[i]['next']
        return out


def script_key(blocks, i):
    b = blocks[i]; op = b['opcode']
    if op == 'procedures_definition':
        return 'def:' + blocks[b['inputs']['custom_block'][1]]['mutation']['proccode'].replace(' %s', '')
    if op == 'event_whenflagclicked':
        return 'flag'
    if op == 'event_whenkeypressed':
        return 'key:' + b['fields']['KEY_OPTION'][0]
    if op == 'event_whenbroadcastreceived':
        return 'msg:' + b['fields']['BROADCAST_OPTION'][0]
    if op == 'control_start_as_clone':
        return 'clone'
    return op


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    data = {}
    for p in sorted(glob.glob(os.path.join(SB3, '*.sb3'))):
        name = os.path.splitext(os.path.basename(p))[0]
        key = '0' if '工具箱' in name else str(int(name[2:4]))
        proj = json.loads(zipfile.ZipFile(p).read('project.json'))
        d = {}
        for t in proj['targets']:
            if t['isStage']:
                continue
            c = Conv(t['blocks'])
            for i, b in t['blocks'].items():
                if isinstance(b, dict) and b.get('topLevel') and not b.get('shadow'):
                    d[t['name'] + '|' + script_key(t['blocks'], i)] = c.stack(i)
        data[key] = d
    js = ('/* 自動產生：tools/export_blocks.py（從 student/sb3/*.sb3 轉出），請勿手動修改 */\n'
          'var SB3_BLOCKS = ' + json.dumps(data, ensure_ascii=False) + ';\n')
    open(OUT, 'w', encoding='utf-8').write(js)
    n = sum(len(v) for v in data.values())
    print('輸出 %s：%d 個檔案、%d 段程式（%.0f KB）' % (os.path.relpath(OUT, ROOT), len(data), n, os.path.getsize(OUT) / 1024))
    for k in ('3', '10'):
        print(k, list(data[k].keys()))


if __name__ == '__main__':
    main()
