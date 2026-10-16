# -*- coding: utf-8 -*-
"""教學網頁的瀏覽器測試（Playwright）：每一頁都開一次，檢查 console 錯誤、積木圖、手機寬度、深色模式，
並實際操作 9 個試玩台，核對結果和 .sb3（test_library.js）是同一套規則。

    python tools/test_web.py

截圖存在 tools/_截圖/。
"""
import os, sys, asyncio, pathlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'tools', '_截圖')
os.makedirs(OUT, exist_ok=True)
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright
STU = pathlib.Path(ROOT) / 'student'
PAGES = ['index'] + ['c%d' % i for i in range(1, 9)]
ok = bad = 0


def check(c, msg):
    global ok, bad
    if c:
        ok += 1
    else:
        bad += 1; print('   ✗', msg)


async def open_page(b, name, **kw):
    pg = await b.new_page(**kw)
    errs = []
    # Google 字型在離線／測試環境載不到是正常的（網頁會退回系統字型），其他資源載不到才算錯
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    pg.on('requestfailed', lambda r: errs.append('載入失敗 ' + r.url) if 'fonts.g' not in r.url else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto((STU / (name + '.html')).as_uri())
    await pg.wait_for_timeout(700)
    return pg, errs


async def txt(pg, sel):
    return (await pg.locator(sel).inner_text()).strip()


async def labs(b):
    # ---- 1 文字
    pg, errs = await open_page(b, 'c1', viewport={'width': 1280, 'height': 900})
    await pg.fill('#sp1', '0.02') if False else None
    await pg.evaluate("document.getElementById('sp1').value=0.02;document.getElementById('sp1').dispatchEvent(new Event('input'))")
    await pg.click('#b11'); await pg.wait_for_timeout(200)
    mid = await pg.evaluate("document.querySelectorAll('#s1 .mst-bub')[0].textContent")
    await pg.wait_for_timeout(1500)
    full = await pg.evaluate("document.querySelectorAll('#s1 .mst-bub')[0].textContent")
    check(0 < len(mid) < len(full) and full == '嗨！我是圓圓。打字機效果會讓字一個一個出現。', '試玩台 1：打字機（%s → %s）' % (mid, full))
    check('打字機說' in await txt(pg, '#c1'), '試玩台 1：顯示等於呼叫的積木')
    await pg.fill('#k1', 'Scratch函式庫'); await pg.fill('#k2', '8'); await pg.fill('#k3', '10')
    check(await txt(pg, '#k4') == '函式庫', '試玩台 1：取出片段 8～10')
    await pg.fill('#p1', '7'); await pg.fill('#p2', '3')
    check(await txt(pg, '#p3') == '007' and '成立' in await txt(pg, '#p4'), '試玩台 1：補零 007、= 7 成立')
    await pg.click('#b13')
    both = 0; spk = set()
    for _ in range(90):
        bubs = await pg.evaluate("[...document.querySelectorAll('#s1 .mst-bub')].map(b=>b.style.display!=='none'?b.textContent:'')")
        if bubs[0] and bubs[1]: both += 1
        spk |= {i for i in (0, 1) if bubs[i]}
        await pg.wait_for_timeout(50)
    check(both == 0 and spk == {0, 1}, '試玩台 1：對話輪流說，不會兩個同時說（同時 %d 次）' % both)
    await pg.screenshot(path=os.path.join(OUT, 'web_c1_lab.png'), full_page=False)
    check(not errs, 'c1 試玩：沒有錯誤 %s' % errs[:2]); await pg.close()
    # ---- 2 出場
    pg, errs = await open_page(b, 'c2', viewport={'width': 1280, 'height': 900})
    btn = pg.locator('#fx2 .fxrow button')
    await btn.nth(1).click(); await pg.wait_for_timeout(1300)
    check(await txt(pg, '#q2v') == '隱藏' and await txt(pg, '#q2g') == '0', '試玩台 2：淡出 → 隱藏、幻影 0')
    await btn.nth(0).click(); await pg.wait_for_timeout(500)
    g = int(await txt(pg, '#q2g'))
    check(20 < g < 80, '試玩台 2：淡入一半（幻影 %d）' % g)
    await pg.wait_for_timeout(800)
    await btn.nth(4).click(); await pg.wait_for_timeout(3000)
    check(await txt(pg, '#q2y') == '-30', '試玩台 2：彈跳落下停在 −30')
    await btn.nth(5).click(); await pg.wait_for_timeout(100)
    x = int(await txt(pg, '#q2x'))
    check(x < -200, '試玩台 2：從左邊滑入（x %d，被擋在舞台邊）' % x)
    await pg.wait_for_timeout(1000)
    check(await txt(pg, '#q2x') == '-40', '試玩台 2：滑回原位')
    check(not errs, 'c2 試玩：沒有錯誤 %s' % errs[:2]); await pg.close()
    # ---- 3 特效
    pg, errs = await open_page(b, 'c3', viewport={'width': 1280, 'height': 900})
    btn = pg.locator('#fx3 .fxrow button')
    await btn.nth(5).click()
    seen = set()
    for _ in range(40):
        seen.add(await txt(pg, '#q3c')); await pg.wait_for_timeout(20)
    check(seen >= {'1', '2', '3', '4'}, '試玩台 3：播放造型 1～4（%s）' % sorted(seen))
    await btn.nth(6).click(); await pg.wait_for_timeout(50)
    check(await txt(pg, '#q3c') == '3', '試玩台 3：換到第 3 個造型')
    await btn.nth(3).click(); await pg.wait_for_timeout(2300)
    check(await txt(pg, '#q3d') == '90', '試玩台 3：擺動結束回到 90 度')
    check(not errs, 'c3 試玩：沒有錯誤 %s' % errs[:2]); await pg.close()
    # ---- 4 角色管理
    pg, errs = await open_page(b, 'c4', viewport={'width': 1280, 'height': 900})
    await pg.click('#b44'); await pg.wait_for_timeout(100)
    info = await txt(pg, '#k4info')
    check('本體的編號：0' in info and '1、2、3、4、5' in info, '試玩台 4：分身編號（%s）' % info)
    await pg.click('#b42'); await pg.wait_for_timeout(100)
    check('（沒有）' in await txt(pg, '#k4info'), '試玩台 4：清除所有分身')
    await pg.click('#b47')
    box = await pg.locator('#s4').bounding_box()
    await pg.mouse.move(box['x'] + box['width'] * 0.99, box['y'] + box['height'] * 0.5)
    await pg.wait_for_timeout(1500)
    xs = await pg.evaluate("document.querySelectorAll('#s4 .mst-s')[1].style.transform")
    check('translate(435px' in xs, '試玩台 4：跟隨＋限制在舞台內 → x = 195（%s）' % xs[:30])
    await pg.screenshot(path=os.path.join(OUT, 'web_c4_lab.png'))
    check(not errs, 'c4 試玩：沒有錯誤 %s' % errs[:2]); await pg.close()
    # ---- 5 計時
    pg, errs = await open_page(b, 'c5', viewport={'width': 1280, 'height': 900})
    await pg.fill('#cdn', '2'); await pg.click('#cdgo'); await pg.wait_for_timeout(1300)
    check(await txt(pg, '#cd') == '1', '試玩台 5：倒數剩 1')
    await pg.wait_for_timeout(1000)
    check(await txt(pg, '#cd') == '0' and '時間到' in await txt(pg, '#cdmsg'), '試玩台 5：時間到')
    await pg.click('#fire'); await pg.click('#fire')
    check('冷卻中' in await txt(pg, '#firemsg'), '試玩台 5：連點 → 冷卻中')
    await pg.click('#w1'); await pg.wait_for_timeout(400); await pg.click('#w2'); await pg.wait_for_timeout(200)
    check('被跳過' in await txt(pg, '#wmsg') and await txt(pg, '#skipv') == '0', '試玩台 5：跳過並設回 0')
    await pg.fill('#mm', '125')
    check(await txt(pg, '#mmr') == '02:05', '試玩台 5：125 → 02:05')
    await pg.click('[data-sc="遊戲"]')
    check(await pg.locator('.scard.on').count() == 2, '試玩台 5：切到遊戲畫面，2 個角色顯示')
    check(not errs, 'c5 試玩：沒有錯誤 %s' % errs[:2]); await pg.close()
    # ---- 6 數學
    pg, errs = await open_page(b, 'c6', viewport={'width': 1280, 'height': 900})
    check(await txt(pg, '#r61') == '100' and await txt(pg, '#r63') == '0', '試玩台 6：150 限制在 ±100 → 100、不在範圍內')
    check(await txt(pg, '#r64') == '3.14', '試玩台 6：四捨五入 3.14')
    got = []
    for _ in range(6):
        await pg.click('#g65'); got.append(await txt(pg, '#r65'))
    check(sorted(got) == ['1', '2', '3', '4', '5', '6'], '試玩台 6：不重複隨機 6 次（%s）' % got)
    check('150' in await txt(pg, '#r62') or '√' in await txt(pg, '#r62'), '試玩台 6：兩點距離有算式')
    check(not errs, 'c6 試玩：沒有錯誤 %s' % errs[:2]); await pg.close()
    # ---- 7 清單
    pg, errs = await open_page(b, 'c7', viewport={'width': 1280, 'height': 900})
    await pg.evaluate("document.getElementById('spd7').value=10;document.getElementById('spd7').dispatchEvent(new Event('input'))")
    await pg.click('#l2'); await pg.wait_for_timeout(4500)
    vals = await pg.evaluate("[...document.querySelectorAll('#bars .bar b')].map(b=>b.textContent)")
    check(vals == ['7', '15', '30', '42', '63', '88'], '試玩台 7：排序（%s）' % vals)
    check(await txt(pg, '#cmp7') == '25', '試玩台 7：6 項比較 25 次（%s）' % await txt(pg, '#cmp7'))
    await pg.click('#l4'); await pg.wait_for_timeout(900)
    check(await txt(pg, '#r7') == '245', '試玩台 7：加總 245')
    await pg.fill('#sp7', '蘋果,香蕉,芭樂'); await pg.click('#l6'); await pg.fill('#j7', '、'); await pg.click('#l7')
    check(await txt(pg, '#r7') == '蘋果、香蕉、芭樂', '試玩台 7：拆成清單再合併')
    await pg.fill('#sp7', '10,9,100,2'); await pg.click('#l6'); await pg.click('#l2'); await pg.wait_for_timeout(2500)
    vals = await pg.evaluate("[...document.querySelectorAll('#bars .bar b')].map(b=>b.textContent)")
    check(vals == ['2', '9', '10', '100'], '試玩台 7：拆出來的數字文字也照大小排（%s）' % vals)
    check(not errs, 'c7 試玩：沒有錯誤 %s' % errs[:2]); await pg.close()
    # ---- 8 遊戲
    pg, errs = await open_page(b, 'c8', viewport={'width': 1280, 'height': 900})
    await pg.click('#go8'); await pg.wait_for_timeout(200)
    await pg.keyboard.down('ArrowUp'); await pg.wait_for_timeout(80); await pg.keyboard.up('ArrowUp'); await pg.wait_for_timeout(200)
    vy = float(await txt(pg, '#vy8'))
    check(vy != 0, '試玩台 8：↑ 起跳（上下速度 %s）' % vy)
    await pg.wait_for_timeout(9000)
    hp = int(await txt(pg, '#hp8'))
    check(hp < 3, '試玩台 8：站著不動會被刺球撞（生命 %d）' % hp)
    await pg.screenshot(path=os.path.join(OUT, 'web_c8_lab.png'))
    check(not errs, 'c8 試玩：沒有錯誤 %s' % errs[:2]); await pg.close()
    # ---- 首頁 實驗 0、函式地圖
    pg, errs = await open_page(b, 'index', viewport={'width': 1280, 'height': 900})
    check(await pg.locator('[data-map] .fchip').count() == 51, '首頁：函式地圖 51 個')
    await pg.click('#w0go'); await pg.wait_for_timeout(5000)
    check('格畫面' in await txt(pg, '#w0at'), '首頁：實驗 0 跑完（%s）' % await txt(pg, '#w0at'))
    # JS 版函式和 .sb3 同規則（抽查，數字和 test_library.js 一樣）
    r = await pg.evaluate("""(()=>{const B=LIB_TEST.Bf;return [B.cut('abc',2,9),B.pad(123,2),B.mmss(59.7),B.mmss(3600),B.clamp(-150,-100,100),
        B.dist(-10,5,-10,-20),B.inRange(100,-100,100),B.inRange(100.5,-100,100),B.round(2.675,1),LIB_TEST.scratchGt('10','9')]})()""")
    check(r == ['bc', '123', '00:59', '60:00', -100, 25, 1, 0, 2.7, True], '網頁 JS 版函式和 .sb3 規則一致（%s）' % r)
    check(not errs, '首頁：沒有錯誤 %s' % errs[:2]); await pg.close()


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name in PAGES:
            for mode, kw in (('桌面', dict(viewport={'width': 1280, 'height': 900})),
                             ('手機', dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2)),
                             ('深色', dict(viewport={'width': 1280, 'height': 900}, color_scheme='dark'))):
                pg, errs = await open_page(b, name, **kw)
                miss = await pg.locator('text=找不到積木').count()
                nblk = await pg.locator('.bscript').count()
                sw = await pg.evaluate('document.documentElement.scrollWidth')
                cw = await pg.evaluate('document.documentElement.clientWidth')
                check(not errs, '%s %s：console 錯誤 %s' % (name, mode, errs[:2]))
                check(miss == 0, '%s %s：找不到積木 %d 處' % (name, mode, miss))
                check(sw <= cw, '%s %s：沒有橫向捲動（%d > %d）' % (name, mode, sw, cw))
                if mode == '桌面':
                    print('%-6s 積木圖 %3d 段' % (name, nblk))
                if name in ('index', 'c2', 'c7') or mode == '手機' and name == 'c8':
                    await pg.screenshot(path=os.path.join(OUT, 'web_%s_%s.png' % (name, mode)), full_page=(mode != '手機'))
                await pg.close()
        await labs(b)
        await b.close()
    print('\n網頁測試：通過 %d，失敗 %d' % (ok, bad))
    sys.exit(1 if bad else 0)


asyncio.run(main())
