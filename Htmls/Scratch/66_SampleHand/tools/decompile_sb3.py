# -*- coding: utf-8 -*-
"""把 .sb3 的積木印成看得懂的文字（除錯、或從別人的 .sb3 取出邏輯用）。

    python tools/decompile_sb3.py 檔案.sb3 [角色名稱 ...]

參考專案 20260924 沒有留下產生器原始碼，本專案的手勢判斷邏輯就是用這支從 .sb3 拆出來的。
"""
import os as _os
ROOT = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))   # 專案資料夾
OUTDIR = _os.path.join(ROOT, 'tools', '_截圖')                             # 截圖輸出
_os.makedirs(OUTDIR, exist_ok=True)
import zipfile,json,sys
sys.stdout.reconfigure(encoding='utf-8')
p=json.loads(zipfile.ZipFile(sys.argv[1]).read('project.json'))
want=sys.argv[2:]
def inp(bl,b,k):
    v=b['inputs'].get(k)
    if not v: return '?'
    x=v[1]
    if isinstance(x,list):
        if x[0]==12: return '('+x[1]+')'
        if x[0]==13: return '['+x[1]+']'
        return repr(x[1]) if len(x)>1 else '?'
    if x is None: return '_'
    return expr(bl,x)
def expr(bl,i):
    b=bl[i]; op=b['opcode']
    if b.get('shadow') and b['fields']:
        return repr(list(b['fields'].values())[0][0])
    ops={'operator_add':'+','operator_subtract':'-','operator_multiply':'*','operator_divide':'/','operator_gt':'>','operator_lt':'<','operator_equals':'=','operator_and':'and','operator_or':'or','operator_mod':'mod','operator_join':'join'}
    if op in ops:
        ks=list(b['inputs'].keys())
        return '('+inp(bl,b,ks[0])+' '+ops[op]+' '+inp(bl,b,ks[1])+')'
    if op=='operator_not': return 'not '+inp(bl,b,'OPERAND')
    if op=='argument_reporter_string_number': return '<'+b['fields']['VALUE'][0]+'>'
    if op=='operator_mathop': return b['fields']['OPERATOR'][0]+inp(bl,b,'NUM')
    if op.startswith('handpose2scratch_get'): return op[-1].lower()+inp(bl,b,'LANDMARK')
    if op=='data_itemoflist': return b['fields']['LIST'][0]+'['+inp(bl,b,'INDEX')+']'
    if op=='sensing_timer': return 'timer'
    args=' '.join(k+'='+inp(bl,b,k) for k in b['inputs'])
    f=' '.join(str(v[0]) for v in b['fields'].values())
    return op+'('+f+args+')'
def stmt(bl,i,ind):
    while i:
        b=bl[i]; op=b['opcode']
        f=' '.join(str(v[0]) for v in b['fields'].values())
        subs=[k for k in b['inputs'] if k.startswith('SUBSTACK')]
        if op=='procedures_definition':
            pr=bl[b['inputs']['custom_block'][1]]; print(ind+'DEFINE '+pr['mutation']['proccode']+' warp='+pr['mutation']['warp'])
        elif op=='procedures_call': print(ind+'CALL '+b['mutation']['proccode']+' '+' '.join(inp(bl,b,k) for k in b['inputs']))
        else:
            args=' '.join(k+'='+inp(bl,b,k) for k in b['inputs'] if not k.startswith('SUBSTACK'))
            print(ind+op.replace('control_','').replace('data_','')+' '+f+' '+args)
        for k in subs:
            if k=='SUBSTACK2': print(ind+'else:')
            v=b['inputs'][k]
            if v and v[1]: stmt(bl,v[1],ind+'    ')
        i=b['next']
for t in p['targets']:
    if want and t['name'] not in want: continue
    print('=====',t['name'])
    bl=t['blocks']
    for k,b in bl.items():
        if isinstance(b,dict) and b.get('topLevel'):
            stmt(bl,k,''); print()
