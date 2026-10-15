# -*- coding: utf-8 -*-
"""把 student/sb3/ 的 .sb3 積木轉成教學網頁用的積木圖資料（student/assets/blocks_data.js）。

    python export_blocks.py

網頁上的積木圖是從真正的 .sb3 轉出來的，所以「網頁看到的」一定等於「檔案裡的」。
格式是 blk.js 的格式（{k:'stack', c:'variables', t:[...]}），沿用 20260925_手勢辨識模組教學_Web。
另外輸出 SB3_USES：每個函式的「定義」在哪一段、哪幾段程式有用到它（網頁的「怎麼用」）。
積木文字對照 Scratch 3 繁體中文介面。
"""
import os, sys, json, zipfile, glob

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SB3 = os.path.join(ROOT, 'student', 'sb3')
OUT = os.path.join(ROOT, 'student', 'assets', 'blocks_data.js')
sys.path.insert(0, HERE)

KEYNAME = {'space': '空白', 'left arrow': '←', 'right arrow': '→', 'up arrow': '↑', 'down arrow': '↓'}
MATH = {'abs': '絕對值', 'sqrt': '平方根', 'floor': '無條件捨去', 'ceiling': '無條件進位', 'sin': 'sin', 'cos': 'cos',
        '10 ^': '10 ^'}
BIN = {'operator_add': '+', 'operator_subtract': '-', 'operator_multiply': '*', 'operator_divide': '/'}
CMP = {'operator_gt': '>', 'operator_lt': '<', 'operator_equals': '='}
EFFECT = {'GHOST': '幻影', 'COLOR': '顏色', 'BRIGHTNESS': '亮度'}


class Conv:
    def __init__(self, blocks):
        self.b = blocks

    def inp(self, blk, key, kind='n'):
        v = blk['inputs'].get(key)
        if not v:
            return {'e': 1} if kind == 'b' else {kind: ''}
        x = v[1]
        if isinstance(x, list):
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
        tb = self.b[x]
        if tb.get('shadow') and tb['opcode'] in ('math_number', 'text', 'math_whole_number', 'math_positive_number', 'math_angle', 'math_integer'):
            val = list(tb['fields'].values())[0][0]
            return {'n': val} if kind == 'n' else {'s': val}
        return self.rep(x)

    def menu(self, blk, key):
        v = blk['inputs'][key]
        top = v[1]
        if isinstance(top, list):
            return {'r': {'c': 'variables', 't': [top[1]]}}
        tb = self.b[top]
        if tb.get('shadow'):
            return {'d': list(tb['fields'].values())[0][0]}
        return self.rep(top)

    def rep(self, i):
        b = self.b[i]; op = b['opcode']; I = lambda k, kind='n': self.inp(b, k, kind)
        R = lambda c, t: {'r': {'c': c, 't': t}}
        Bo = lambda c, t: {'b': {'c': c, 't': t}}
        F = lambda k: b['fields'][k][0]
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
            return R('operators', [{'d': MATH.get(F('OPERATOR'), F('OPERATOR'))}, '數值', I('NUM')])
        if op == 'operator_mod':
            return R('operators', [I('NUM1'), '除以', I('NUM2'), '的餘數'])
        if op == 'operator_join':
            return R('operators', ['字串組合', I('STRING1', 's'), I('STRING2', 's')])
        if op == 'operator_letter_of':
            return R('operators', ['字串', I('STRING', 's'), '的第', I('LETTER'), '字'])
        if op == 'operator_length':
            return R('operators', ['字串', I('STRING', 's'), '的長度'])
        if op == 'operator_random':
            return R('operators', ['隨機取數', I('FROM'), '到', I('TO')])
        if op == 'operator_round':
            return R('operators', ['四捨五入數值', I('NUM')])
        if op == 'argument_reporter_string_number':
            return {'p': F('VALUE')}
        if op == 'data_itemoflist':
            return R('listtone', ['清單', {'d': F('LIST')}, '的第', I('INDEX'), '項'])
        if op == 'data_lengthoflist':
            return R('listtone', ['清單', {'d': F('LIST')}, '的長度'])
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
        if op == 'motion_xposition':
            return R('motion', ['x 座標'])
        if op == 'motion_yposition':
            return R('motion', ['y 座標'])
        if op == 'motion_direction':
            return R('motion', ['方向'])
        if op == 'looks_size':
            return R('looks', ['尺寸'])
        if op == 'looks_costumenumbername':
            return R('looks', ['造型', {'d': {'number': '編號', 'name': '名稱'}[F('NUMBER_NAME')]}])
        return R('control', [op])

    def stmt(self, i):
        b = self.b[i]; op = b['opcode']; I = lambda k, kind='n': self.inp(b, k, kind)
        S = lambda c, t, **kw: dict({'k': 'stack', 'c': c, 't': t}, **kw)
        F = lambda k: b['fields'][k][0]
        sub = lambda k: self.stack(b['inputs'].get(k, [0, None])[1]) if b['inputs'].get(k) else []
        if op == 'procedures_definition':
            proto = self.b[b['inputs']['custom_block'][1]]
            return {'k': 'def', 't': self.proc_parts(proto['mutation'], None)}
        if op == 'procedures_call':
            return S('myblocks', self.proc_parts(b['mutation'], b))
        if op == 'data_setvariableto':
            return S('variables', ['變數', {'d': F('VARIABLE')}, '設為', I('VALUE', 's')])
        if op == 'data_changevariableby':
            return S('variables', ['變數', {'d': F('VARIABLE')}, '改變', I('VALUE')])
        if op == 'data_addtolist':
            return S('listtone', ['添加', I('ITEM', 's'), '到', {'d': F('LIST')}])
        if op == 'data_deletealloflist':
            return S('listtone', ['刪除', {'d': F('LIST')}, '的所有項目'])
        if op == 'data_deleteoflist':
            return S('listtone', ['刪除', {'d': F('LIST')}, '的第', I('INDEX'), '項'])
        if op == 'data_replaceitemoflist':
            return S('listtone', ['替換', {'d': F('LIST')}, '的第', I('INDEX'), '項為', I('ITEM', 's')])
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
        if op == 'control_delete_this_clone':
            return S('control', ['分身刪除'], k='cap')
        if op == 'event_broadcast':
            return S('events', ['廣播訊息', I('BROADCAST_INPUT')])
        if op == 'event_broadcastandwait':
            return S('events', ['廣播訊息', I('BROADCAST_INPUT'), '並等待'])
        if op == 'event_whenflagclicked':
            return {'k': 'hat', 'c': 'events', 't': ['當', {'flag': 1}, '被點擊']}
        if op == 'event_whenkeypressed':
            k = F('KEY_OPTION')
            return {'k': 'hat', 'c': 'events', 't': ['當', {'d': KEYNAME.get(k, k.upper() if len(k) == 1 else k)}, '鍵被按下']}
        if op == 'event_whenbroadcastreceived':
            return {'k': 'hat', 'c': 'events', 't': ['當收到訊息', {'d': F('BROADCAST_OPTION')}]}
        if op == 'control_start_as_clone':
            return {'k': 'hat', 'c': 'control', 't': ['當分身產生']}
        if op == 'looks_hide':
            return S('looks', ['隱藏'])
        if op == 'looks_show':
            return S('looks', ['顯示'])
        if op == 'looks_switchcostumeto':
            return S('looks', ['造型換成', self.menu(b, 'COSTUME')])
        if op == 'looks_switchbackdropto':
            return S('looks', ['背景換成', self.menu(b, 'BACKDROP')])
        if op == 'looks_nextcostume':
            return S('looks', ['造型換成下一個'])
        if op == 'looks_say':
            return S('looks', ['說出', I('MESSAGE', 's')])
        if op == 'looks_sayforsecs':
            return S('looks', ['說出', I('MESSAGE', 's'), '持續', I('SECS'), '秒'])
        if op == 'looks_setsizeto':
            return S('looks', ['尺寸設為', I('SIZE'), '%'])
        if op == 'looks_seteffectto':
            return S('looks', ['圖像效果', {'d': EFFECT.get(F('EFFECT'), F('EFFECT'))}, '設為', I('VALUE')])
        if op == 'looks_cleargraphiceffects':
            return S('looks', ['圖像效果清除'])
        if op == 'looks_gotofrontback':
            return S('looks', ['圖層移到', {'d': '最上層' if F('FRONT_BACK') == 'front' else '最下層'}])
        if op == 'motion_gotoxy':
            return S('motion', ['定位到 x:', I('X'), 'y:', I('Y')])
        if op == 'motion_setx':
            return S('motion', ['x 設為', I('X')])
        if op == 'motion_sety':
            return S('motion', ['y 設為', I('Y')])
        if op == 'motion_changexby':
            return S('motion', ['x 改變', I('DX')])
        if op == 'motion_changeyby':
            return S('motion', ['y 改變', I('DY')])
        if op == 'motion_glidesecstoxy':
            return S('motion', ['滑行', I('SECS'), '秒到 x:', I('X'), 'y:', I('Y')])
        if op == 'motion_pointindirection':
            return S('motion', ['面朝', I('DIRECTION'), '度'])
        if op == 'motion_turnleft':
            return S('motion', ['左轉 ↺', I('DEGREES'), '度'])
        if op == 'sound_play':
            return S('sound', ['播放音效', self.menu(b, 'SOUND_MENU')])
        return S('control', [op])

    def proc_parts(self, mut, call):
        code = mut['proccode']; ids = json.loads(mut['argumentids'])
        names = json.loads(mut.get('argumentnames', '[]')) if call is None else None
        out, k = [], 0
        for w in code.split(' '):
            if w == '%s':
                out.append({'p': names[k]} if call is None else self.inp(call, ids[k], 's'))
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
        return 'def:' + blocks[b['inputs']['custom_block'][1]]['mutation']['proccode']
    if op == 'event_whenflagclicked':
        return 'flag'
    if op == 'event_whenkeypressed':
        return 'key:' + b['fields']['KEY_OPTION'][0]
    if op == 'event_whenbroadcastreceived':
        return 'msg:' + b['fields']['BROADCAST_OPTION'][0]
    if op == 'control_start_as_clone':
        return 'clone'
    return op


def walk(blocks, i):
    """一段程式裡所有積木（含巢狀）。"""
    todo, seen = [i], []
    while todo:
        x = todo.pop()
        if not x or x not in blocks or x in seen:
            continue
        seen.append(x); b = blocks[x]
        todo.append(b.get('next'))
        for v in b['inputs'].values():
            for y in v[1:]:
                if isinstance(y, str):
                    todo.append(y)
    return [blocks[x] for x in seen]


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    import build_library as BL
    data, uses = {}, {}
    for p in sorted(glob.glob(os.path.join(SB3, '*.sb3'))):
        name = os.path.splitext(os.path.basename(p))[0]
        key = '0' if name == '完整函式庫' else name.split('_')[0]
        proj = json.loads(zipfile.ZipFile(p).read('project.json'))
        d = {}; calls = []
        for t in proj['targets']:
            tn = '舞台' if t['isStage'] else t['name']
            c = Conv(t['blocks'])
            for i, b in t['blocks'].items():
                if isinstance(b, dict) and b.get('topLevel') and not b.get('shadow'):
                    sk = script_key(t['blocks'], i)
                    d[tn + '|' + sk] = c.stack(i)
                    body = walk(t['blocks'], i)
                    procs = {x['mutation']['proccode'] for x in body if x['opcode'] == 'procedures_call'}
                    msgs = set()
                    for x in body:
                        if x['opcode'] in ('event_broadcast', 'event_broadcastandwait'):
                            v = x['inputs']['BROADCAST_INPUT'][1]
                            if isinstance(v, list):
                                msgs.add(v[1])
                    calls.append((tn + '|' + sk, sk, procs, msgs))
        data[key] = d
        for f in BL.FUNCS:
            if str(f['cat']) != key and key != '0':
                continue
            u = uses.setdefault(f['id'], {'def': None, 'ex': []}) if key != '0' else None
            for full, sk, procs, msgs in calls:
                if sk == 'def:' + f['code']:
                    if u is not None:
                        u['def'] = key + '|' + full
                elif u is not None and not sk.startswith('def:') and (f['code'] in procs or (f['msg'] and f['msg'] in msgs)):
                    if len(u['ex']) < 2 and not sk.startswith('msg:' + (f['msg'] or '\0')):
                        u['ex'].append(key + '|' + full)
    js = ('/* 自動產生：tools/export_blocks.py（從 student/sb3/*.sb3 轉出），請勿手動修改 */\n'
          'var SB3_BLOCKS = ' + json.dumps(data, ensure_ascii=False) + ';\n'
          'var SB3_USES = ' + json.dumps(uses, ensure_ascii=False) + ';\n')
    open(OUT, 'w', encoding='utf-8').write(js)
    n = sum(len(v) for v in data.values())
    print('輸出 %s：%d 個檔案、%d 段程式（%.0f KB）' % (os.path.relpath(OUT, ROOT), len(data), n, os.path.getsize(OUT) / 1024))
    nodef = [k for k, v in uses.items() if not v['def']]
    noex = [k for k, v in uses.items() if not v['ex']]
    print('找不到定義：', nodef or '無')
    print('沒有使用範例：', noex or '無')
    unk = set()
    for d in data.values():
        for s in json.dumps(d, ensure_ascii=False).split('"t": ["')[1:]:
            w = s.split('"')[0]
            if '_' in w and w.split('_')[0] in ('motion', 'looks', 'control', 'data', 'operator', 'sensing', 'event', 'sound'):
                unk.add(w)
    print('沒有翻譯的積木：', sorted(unk) or '無')


if __name__ == '__main__':
    main()
