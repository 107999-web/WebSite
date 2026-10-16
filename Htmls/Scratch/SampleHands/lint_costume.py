# -*- coding: utf-8 -*-
"""掃描 .sb3：找出「造型換成／背景換成」被餵進『可能是數字』的輸入。
Scratch 規則：這兩個積木的輸入若是『數字』型別，會被當成造型編號而不是名稱。"""
import sys, zipfile, json

SAFE_STRING = {'operator_join', 'operator_letter_of', 'data_itemoflist',
               'sensing_answer', 'sensing_username', 'looks_costumenumbername',
               'looks_backdropnumbername'}
p = sys.argv[1]
proj = json.loads(zipfile.ZipFile(p).read('project.json'))
issues = []
for t in proj['targets']:
    blocks = t['blocks']
    for bid, b in blocks.items():
        op = b.get('opcode')
        if op not in ('looks_switchcostumeto', 'looks_switchbackdropto'):
            continue
        key = 'COSTUME' if op == 'looks_switchcostumeto' else 'BACKDROP'
        inp = b['inputs'].get(key)
        if not inp or inp[0] != 3:
            continue                      # [1, shadow] ＝ 直接從下拉選單選的，安全
        src = inp[1]
        if isinstance(src, list):         # 直接放變數
            issues.append((t['name'], op, '變數「%s」' % src[1]))
        else:
            sop = blocks[src]['opcode']
            if sop not in SAFE_STRING:
                issues.append((t['name'], op, '積木 %s' % sop))
print('掃描：%s' % p)
if issues:
    for name, op, what in issues:
        print('  ✗ %s 的「%s」輸入是 %s —— 可能被當成造型編號' % (name, op, what))
else:
    print('  ✓ 沒有問題：所有動態切換造型的輸入都保證是文字')
sys.exit(1 if issues else 0)
