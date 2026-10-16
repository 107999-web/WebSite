/* 紅石機關社團 — 紅石模擬器（俯視 2D 示意）
   引擎（parse／step／runChallenge）不碰 DOM，可在 Node 測試；UI 只在瀏覽器掛載。
   1 tick ＝ 1 紅石刻（0.1 秒）。這是教學用的簡化模型，不是 Minecraft 的完整規則。 */
(function (root) {
  'use strict';

  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];          // 0 東 1 南 2 西 3 北
  const ARROW = { '>': 0, 'v': 1, '<': 2, '^': 3 };
  const ARCH = ['→', '↓', '←', '↑'];
  const back = d => (d + 2) % 4;
  const CAP = { hopper: 320, chest: 1728, drop: 576, disp: 576 };

  const INFO = {
    dust: ['紅石粉', '像電線，把訊號傳出去。每走一格訊號少 1，最多傳 15 格。'],
    lever: ['拉桿', '扳一下打開、再扳一下關掉，打開時會一直供電。'],
    button: ['按鈕', '按一下送出 1 秒鐘的訊號，然後自己關掉。'],
    plate: ['壓力板', '有人站在上面才有訊號。（用 🖐️ 點一下＝站上去／離開）'],
    lamp: ['紅石燈', '收到訊號就會亮。'],
    torch: ['紅石火把', '平常會發電；它<b>背後</b>的方塊或紅石有電時，火把就熄滅（訊號反過來）。'],
    rep: ['紅石中繼器', '把訊號補回 15、只往箭頭方向傳，還能延遲 1～4 格（用 🖐️ 點一下調整）。'],
    comp: ['紅石比較器', '讀出後面的訊號強度，或容器裝了多滿。用 🖐️ 點一下切換「比較／減法」模式。'],
    block: ['石頭方塊', '普通方塊。紅石粉接到它時方塊會帶電，可以讓背後接著它的火把熄滅、讓旁邊的活塞動作。'],
    rblock: ['紅石方塊', '永遠有電的電源，而且可以被活塞推著走。MakeCode 常用它當「程式開關」。'],
    piston: ['活塞', '收到訊號就把前面的方塊推出去（最多 12 個）。'],
    sticky: ['黏性活塞', '跟活塞一樣會推，縮回來時還會把方塊<b>拉回來</b>。'],
    obs: ['觀察者', '臉看著前面那一格，那一格一有變化，就從<b>背後</b>送出一個很短的訊號。'],
    note: ['音符盒', '收到新的訊號就發出聲音。用 🖐️ 點一下會調高一個音（0～24）。'],
    door: ['鐵門', '用手打不開，一定要有紅石訊號。'],
    day: ['日光感測器', '白天越亮訊號越強。用 🖐️ 點一下切換成「夜晚模式」（反相）：天越黑訊號越強。'],
    target: ['標靶方塊', '被箭射中會發出訊號，越靠近中心越強（1～15）。用 🖐️ 點標靶的不同位置射箭。'],
    hopper: ['漏斗', '把東西往箭頭方向送進下一個容器，每 0.4 秒 1 個；收到紅石訊號時會停住。'],
    chest: ['箱子', '可以裝 1728 個物品（27 格 × 64）。比較器可以讀出它裝了多滿。'],
    drop: ['投擲器', '收到新的訊號就把 1 個物品丟出去；前面是容器的話會放進去。'],
    disp: ['發射器', '收到新的訊號就「使用」1 個物品：射箭、放煙火……'],
    sculk: ['幽匿感測器', '聽到附近 8 格內的震動（走路、扳拉桿、活塞、開門）就發出訊號，越近越強。'],
    bulb: ['銅燈', '每收到一次「新的」訊號就切換亮／暗，會記住自己的狀態（T 正反器）。'],
    spot: ['南瓜生長位置', '南瓜莖旁邊的泥土，南瓜會長在這裡。'],
    stem: ['南瓜莖', '會慢慢長出南瓜。用 🖐️ 點一下讓它馬上長。'],
    lect: ['講台＋書', '用 🖐️ 點一下翻頁。比較器可以讀出翻到第幾頁。'],
    head: ['活塞頭', '活塞推出去的部分。'],
  };
  const DIRECTIONAL = { torch: 1, rep: 1, comp: 1, piston: 1, obs: 1, hopper: 1, drop: 1, disp: 1 };

  /* ---------- 解析題目 ----------
     每列一個字串，用空白分隔每一格：
     .  空地   ?  建議施工區（空地）  -  紅石粉   L 拉桿（L* 開）  B 按鈕  P 壓力板  O 紅石燈
     #  石頭   R 紅石方塊   T> 火把（t> 一開始熄滅）  r>2 中繼器延遲 2   c> 比較器  s> 比較器減法
     p> 活塞   k> 黏性活塞   o> 觀察者（看著箭頭方向）  N6 音符盒音高 6   D 鐵門
     S 日光感測器（Si 反相）  X 標靶  h> 漏斗  C 箱子  d> 投擲器  f> 發射器（@數量）
     Q 幽匿感測器  U 銅燈  Y 南瓜位置（Y* 已有南瓜）  Z 南瓜莖  E15 講台（15 頁）
     前面加 ~ ＝學生可以改；後面加 :A ＝標籤；@12 ＝容器裡的物品數                   */
  function parseToken(tok) {
    let lock = true, label = null, items = 0;
    if (tok[0] === '~') { lock = false; tok = tok.slice(1); }
    const li = tok.indexOf(':');
    if (li >= 0) { label = tok.slice(li + 1); tok = tok.slice(0, li); }
    const ai = tok.indexOf('@');
    if (ai >= 0) { items = +tok.slice(ai + 1); tok = tok.slice(0, ai); }
    const ch = tok[0], d = ARROW[tok[1]];
    let c = null, hint = false;
    switch (ch) {
      case '.': break;
      case '?': hint = true; break;
      case '-': c = { t: 'dust', lv: 0 }; break;
      case 'L': c = { t: 'lever', on: tok[1] === '*' }; break;
      case 'B': c = { t: 'button', timer: 0 }; break;
      case 'P': c = { t: 'plate', on: false }; break;
      case 'O': c = { t: 'lamp', on: false }; break;
      case '#': c = { t: 'block', pw: 0 }; break;
      case 'R': c = { t: 'rblock' }; break;
      case 'T': c = { t: 'torch', d, on: true }; break;
      case 't': c = { t: 'torch', d, on: false }; break;
      case 'r': c = { t: 'rep', d, delay: +tok.slice(2) || 1, on: false }; break;
      case 'c': c = { t: 'comp', d, mode: 'cmp', lv: 0 }; break;
      case 's': c = { t: 'comp', d, mode: 'sub', lv: 0 }; break;
      case 'p': c = { t: 'piston', d, sticky: false, ext: false }; break;
      case 'k': c = { t: 'piston', d, sticky: true, ext: false }; break;
      case 'o': c = { t: 'obs', d, timer: 0 }; break;
      case 'N': c = { t: 'note', pitch: +tok.slice(1) || 0, hits: 0 }; break;
      case 'D': c = { t: 'door', open: false }; break;
      case 'S': c = { t: 'day', inv: tok[1] === 'i', lv: 0 }; break;
      case 'X': c = { t: 'target', timer: 0, lv: 0 }; break;
      case 'h': c = { t: 'hopper', d, n: items, cd: 0 }; break;
      case 'C': c = { t: 'chest', n: items }; break;
      case 'd': c = { t: 'drop', d, n: items }; break;
      case 'f': c = { t: 'disp', d, n: items, shots: 0 }; break;
      case 'Q': c = { t: 'sculk', timer: 0, lv: 0, cool: 0 }; break;
      case 'U': c = { t: 'bulb', on: false }; break;
      case 'Y': c = { t: 'spot', pumpkin: tok[1] === '*' }; break;
      case 'Z': c = { t: 'stem', attached: false }; break;
      case 'E': c = { t: 'lect', pages: +tok.slice(1) || 15, page: 1 }; break;
      default: throw new Error('看不懂的格子：' + tok);
    }
    if (c) {
      if (DIRECTIONAL[c.t] && c.d === undefined) c.d = 0;
      if (c.t === 'rep') c.q = [];
      c.lock = lock;
    }
    return { c, label, hint };
  }

  function parse(rows) {
    const grid = rows.map(r => r.trim().split(/\s+/));
    const h = grid.length, w = Math.max(...grid.map(r => r.length));
    const W = { w, h, cells: [], labels: {}, hints: {}, tick: 0, time: 12, harvest: 0, fx: [], vib: [], autoGrow: true };
    for (let y = 0; y < h; y++) {
      W.cells.push([]);
      for (let x = 0; x < w; x++) {
        const p = parseToken(grid[y][x] || '.');
        W.cells[y].push(p.c);
        if (p.label) W.labels[p.label] = [x, y];
        if (p.hint) W.hints[x + ',' + y] = 1;
      }
    }
    return W;
  }

  const clone = W => { const o = JSON.parse(JSON.stringify(W)); o.fx = []; o.vib = []; return o; };
  const at = (W, x, y) => (x >= 0 && y >= 0 && x < W.w && y < W.h) ? W.cells[y][x] : undefined;

  /* 格子 n 往方向 k 送出的訊號強度 */
  function out(n, k) {
    if (!n) return 0;
    switch (n.t) {
      case 'dust': return n.lv || 0;
      case 'lever': case 'plate': return n.on ? 15 : 0;
      case 'button': return n.timer > 0 ? 15 : 0;
      case 'rblock': return 15;
      case 'day': return n.lv || 0;
      case 'target': case 'sculk': return n.timer > 0 ? n.lv : 0;
      case 'torch': return n.on && k !== back(n.d) ? 15 : 0;
      case 'rep': return n.on && k === n.d ? 15 : 0;
      case 'comp': return k === n.d ? (n.lv || 0) : 0;
      case 'obs': return n.timer > 0 && k === back(n.d) ? 15 : 0;
    }
    return 0;
  }
  /* 鄰居 n（在 cell 的 k 方向）送進 cell 的訊號；方塊只送給非紅石粉的元件 */
  function into(n, k, toDust) {
    if (!n) return 0;
    if (n.t === 'block') return (toDust ? (n.strong ? n.pw : 0) : n.pw) || 0;
    return out(n, back(k));
  }
  function inputAt(W, x, y, skip) {
    let m = 0;
    for (let k = 0; k < 4; k++) {
      if (skip !== undefined && (skip === k || (Array.isArray(skip) && skip.includes(k)))) continue;
      m = Math.max(m, into(at(W, x + DX[k], y + DY[k]), k, false));
    }
    return m;
  }
  function fill(n) {
    if (!n) return 0;
    if (CAP[n.t]) return n.n > 0 ? Math.floor(1 + n.n / CAP[n.t] * 14) : 0;
    if (n.t === 'lect') return n.pages > 1 ? Math.floor(1 + (n.page - 1) * 14 / (n.pages - 1)) : 15;
    if (n.t === 'bulb') return n.on ? 15 : 0;
    return null;
  }
  const dayLevel = h => Math.max(0, Math.round(15 * Math.sin(Math.PI * (h - 6) / 12)));

  function sig(n) {
    if (!n) return '';
    return [n.t, n.on, n.lv, n.ext, n.open, n.pumpkin, n.attached, n.n, n.page, n.pitch, n.timer > 0].join('|');
  }

  const PUSHABLE = { block: 1, rblock: 1, lamp: 1, note: 1, target: 1, obs: 1, bulb: 1, sculk: 1, day: 1 };
  const BREAKABLE = { dust: 1, torch: 1, lever: 1, button: 1, plate: 1, rep: 1, comp: 1, door: 1, stem: 1 };
  const isGround = c => c && c.t === 'spot' && !c.pumpkin;

  function vibrate(W, x, y) { W.vib.push([x, y]); }

  function moveCell(W, fx, fy, tx, ty) {
    const o = W.cells[fy][fx];
    W.cells[fy][fx] = o.base || null;
    delete o.base;
    const dst = W.cells[ty][tx];
    if (isGround(dst)) o.base = dst;
    W.cells[ty][tx] = o;
  }
  function harvestAt(W, x, y) {
    const s = W.cells[y][x];
    s.pumpkin = false;
    // 旁邊有漏斗或箱子就收進去，否則算掉在地上被撿走
    for (let k = 0; k < 4; k++) {
      const n = at(W, x + DX[k], y + DY[k]);
      if (n && (n.t === 'hopper' || n.t === 'chest') && n.n < CAP[n.t]) { n.n++; W.fx.push({ k: 'harvest', x, y }); return; }
    }
    W.harvest++;
    W.fx.push({ k: 'harvest', x, y });
  }
  function extend(W, x, y, p) {
    const d = p.d;
    const chain = [];
    let cx = x + DX[d], cy = y + DY[d];
    for (;;) {
      const c = at(W, cx, cy);
      if (c === undefined) return false;                 // 推到邊界外
      if (c === null || isGround(c)) break;
      if (c.t === 'spot' && c.pumpkin) { harvestAt(W, cx, cy); break; }
      if (BREAKABLE[c.t]) { W.cells[cy][cx] = null; W.fx.push({ k: 'break', x: cx, y: cy }); break; }
      if (PUSHABLE[c.t] && !(c.t === 'piston')) {
        chain.push([cx, cy]);
        if (chain.length > 12) return false;
        cx += DX[d]; cy += DY[d];
        continue;
      }
      return false;                                      // 推不動（容器、伸出的活塞……）
    }
    for (let i = chain.length - 1; i >= 0; i--) moveCell(W, chain[i][0], chain[i][1], chain[i][0] + DX[d], chain[i][1] + DY[d]);
    const fx = x + DX[d], fy = y + DY[d];
    const head = { t: 'head', d, lock: true };
    const g = W.cells[fy][fx];
    if (isGround(g)) head.base = g;
    W.cells[fy][fx] = head;
    p.ext = true;
    W.fx.push({ k: 'piston', x, y });
    vibrate(W, x, y);
    return true;
  }
  function retract(W, x, y, p) {
    const d = p.d, fx = x + DX[d], fy = y + DY[d];
    const h = at(W, fx, fy);
    if (h && h.t === 'head') W.cells[fy][fx] = h.base || null;
    p.ext = false;
    if (p.sticky) {
      const c = at(W, fx + DX[d], fy + DY[d]);
      const here = at(W, fx, fy);
      if (c && PUSHABLE[c.t] && (here === null || isGround(here))) moveCell(W, fx + DX[d], fy + DY[d], fx, fy);
    }
    W.fx.push({ k: 'piston', x, y });
    vibrate(W, x, y);
  }

  function transfer(W, from, tx, ty) {
    const t = at(W, tx, ty);
    if (t && CAP[t.t] && t.n < CAP[t.t]) { from.n--; t.n++; return true; }
    return false;
  }

  /* ---------- 前進 1 tick ---------- */
  function step(W) {
    const all = [];
    for (let y = 0; y < W.h; y++) for (let x = 0; x < W.w; x++) { const c = W.cells[y][x]; if (c) all.push([x, y, c]); }

    // 1. 日光感測器
    const dl = dayLevel(W.time);
    all.forEach(([, , c]) => { if (c.t === 'day') c.lv = c.inv ? 15 - dl : dl; });

    // 2. 方塊被中繼器／比較器／拉桿類「強充能」
    all.forEach(([x, y, c]) => {
      if (c.t !== 'block') return;
      let s = 0;
      for (let k = 0; k < 4; k++) {
        const n = at(W, x + DX[k], y + DY[k]);
        if (n && /^(rep|comp|lever|button|plate)$/.test(n.t)) s = Math.max(s, out(n, back(k)));
      }
      c.strong = s > 0; c.pw = s;
    });

    // 3. 紅石粉
    const dusts = all.filter(a => a[2].t === 'dust');
    dusts.forEach(([x, y, c]) => {
      let s = 0;
      for (let k = 0; k < 4; k++) { const n = at(W, x + DX[k], y + DY[k]); if (n && n.t !== 'dust') s = Math.max(s, into(n, k, true)); }
      c.lv = s;
    });
    for (let changed = true, guard = 0; changed && guard < 400; guard++) {
      changed = false;
      dusts.forEach(([x, y, c]) => {
        for (let k = 0; k < 4; k++) {
          const n = at(W, x + DX[k], y + DY[k]);
          if (n && n.t === 'dust' && n.lv - 1 > c.lv) { c.lv = n.lv - 1; changed = true; }
        }
      });
    }

    // 4. 方塊被旁邊的紅石粉「弱充能」
    all.forEach(([x, y, c]) => {
      if (c.t !== 'block') return;
      for (let k = 0; k < 4; k++) { const n = at(W, x + DX[k], y + DY[k]); if (n && n.t === 'dust') c.pw = Math.max(c.pw, n.lv); }
    });

    // 5. 各元件讀輸入
    const next = [];
    const pistons = [];
    all.forEach(([x, y, c]) => {
      switch (c.t) {
        case 'lamp': c.on = inputAt(W, x, y) > 0; break;
        case 'door': { const o = inputAt(W, x, y) > 0; if (o !== c.open) vibrate(W, x, y); c.open = o; break; }
        case 'note': {
          const p = inputAt(W, x, y) > 0;
          if (p && !c.pw) { c.hits++; W.fx.push({ k: 'note', x, y, pitch: c.pitch }); vibrate(W, x, y); }
          c.pw = p; break;
        }
        case 'bulb': { const p = inputAt(W, x, y) > 0; if (p && !c.pw) c.on = !c.on; c.pw = p; break; }
        case 'drop': case 'disp': {
          const p = inputAt(W, x, y) > 0;
          if (p && !c.pw && c.n > 0) {
            if (c.t === 'drop' && transfer(W, c, x + DX[c.d], y + DY[c.d])) { /* 放進前面的容器 */ }
            else { c.n--; if (c.t === 'disp') c.shots = (c.shots || 0) + 1; W.fx.push({ k: c.t, x, y, d: c.d }); vibrate(W, x, y); }
          }
          c.pw = p; break;
        }
        case 'hopper': {
          if (inputAt(W, x, y) > 0) { c.locked = true; break; }
          c.locked = false;
          if (c.n > 0 && ++c.cd >= 4) { c.cd = 0; transfer(W, c, x + DX[c.d], y + DY[c.d]); }
          break;
        }
        case 'torch': {
          const k = back(c.d);
          next.push([c, 'on', !(into(at(W, x + DX[k], y + DY[k]), k, false) > 0)]);
          break;
        }
        case 'rep': {
          const k = back(c.d);
          const i = into(at(W, x + DX[k], y + DY[k]), k, false) > 0;
          if (!c.q || c.q.length !== c.delay - 1) c.q = Array(c.delay - 1).fill(c.on);
          c.q.push(i);
          next.push([c, 'on', c.q.shift()]);
          break;
        }
        case 'comp': {
          const k = back(c.d);
          const bn = at(W, x + DX[k], y + DY[k]);
          let a = fill(bn);
          if (a === null) a = into(bn, k, false);
          let s = 0;
          [(c.d + 1) % 4, (c.d + 3) % 4].forEach(sk => {
            const n = at(W, x + DX[sk], y + DY[sk]);
            if (n && /^(dust|rep|comp|rblock)$/.test(n.t)) s = Math.max(s, out(n, back(sk)));
          });
          const v = c.mode === 'sub' ? Math.max(0, a - s) : (a >= s ? a : 0);
          next.push([c, 'lv', v]);
          break;
        }
        case 'piston': pistons.push([x, y, c, inputAt(W, x, y, c.d) > 0]); break;
        case 'stem': break;
      }
    });

    // 6. 幽匿感測器聽震動
    if (W.vib.length) {
      all.forEach(([x, y, c]) => {
        if (c.t !== 'sculk' || c.timer > 0 || c.cool > 0) return;
        let best = 0;
        W.vib.forEach(([vx, vy]) => {
          if (vx === x && vy === y) return;
          const dist = Math.hypot(vx - x, vy - y);
          if (dist <= 8) best = Math.max(best, Math.max(1, 15 - Math.round(dist)));
        });
        if (best) { c.timer = 15; c.lv = best; c.fresh = true; }
      });
      W.vib = [];
    }

    // 7. 套用延遲元件、計時器倒數
    next.forEach(([c, k, v]) => { c[k] = v; });
    all.forEach(([, , c]) => {
      if (c.t === 'button' && c.timer > 0) c.timer--;
      if (c.t === 'target' && c.timer > 0) c.timer--;
      if (c.t === 'obs' && c.timer > 0 && !c.fresh) c.timer--;
      if (c.t === 'sculk') {
        if (c.fresh) c.fresh = false;
        else if (c.timer > 0) { if (--c.timer === 0) c.cool = 5; }
        else if (c.cool > 0) c.cool--;
      }
      if (c.t === 'obs') c.fresh = false;
    });

    // 8. 活塞
    pistons.forEach(([x, y, c, p]) => {
      if (W.cells[y][x] !== c) return;
      const h = at(W, x + DX[c.d], y + DY[c.d]);
      if (c.ext && !(h && h.t === 'head')) c.ext = false;   // 活塞頭被拿掉了
      if (p && !c.ext) extend(W, x, y, c);
      else if (!p && c.ext) retract(W, x, y, c);
    });

    // 9. 南瓜莖：長南瓜、記錄有沒有接著南瓜
    for (let y = 0; y < W.h; y++) for (let x = 0; x < W.w; x++) {
      const c = W.cells[y][x];
      if (!c || c.t !== 'stem') continue;
      if (W.autoGrow && Math.random() < 0.012) growStem(W, x, y);
      c.attached = false;
      for (let k = 0; k < 4; k++) { const n = at(W, x + DX[k], y + DY[k]); if (n && n.t === 'spot' && n.pumpkin) c.attached = true; }
    }

    // 10. 觀察者看前面那一格有沒有變
    for (let y = 0; y < W.h; y++) for (let x = 0; x < W.w; x++) {
      const c = W.cells[y][x];
      if (!c || c.t !== 'obs') continue;
      const s = sig(at(W, x + DX[c.d], y + DY[c.d]));
      if (c.last !== undefined && c.last !== s) { c.timer = 1; c.fresh = true; }
      c.last = s;
    }
    W.tick++;
  }

  function growStem(W, x, y) {
    for (let k = 0; k < 4; k++) {
      const n = at(W, x + DX[k], y + DY[k]);
      if (n && n.t === 'spot' && !n.pumpkin) { n.pumpkin = true; return true; }
    }
    return false;
  }

  /* ---------- 玩家動作（🖐️） ---------- */
  function interact(W, x, y, fx, fy) {
    const c = at(W, x, y);
    vibrate(W, x, y);
    if (!c) return;
    switch (c.t) {
      case 'lever': c.on = !c.on; break;
      case 'button': c.timer = 10; break;
      case 'plate': c.on = !c.on; break;
      case 'rep': c.delay = c.delay % 4 + 1; c.q = null; break;
      case 'comp': c.mode = c.mode === 'cmp' ? 'sub' : 'cmp'; break;
      case 'note': c.pitch = (c.pitch + 1) % 25; W.fx.push({ k: 'note', x, y, pitch: c.pitch }); break;
      case 'day': c.inv = !c.inv; break;
      case 'lect': c.page = c.page % c.pages + 1; break;
      case 'stem': growStem(W, x, y); break;
      case 'target': {
        const dist = Math.hypot((fx === undefined ? .5 : fx) - .5, (fy === undefined ? .5 : fy) - .5) / .5;
        c.lv = Math.max(1, Math.min(15, Math.round(15 - dist * 14)));
        c.timer = 10;
        W.fx.push({ k: 'arrow', x, y });
        break;
      }
    }
  }

  /* ---------- 自動測試 ---------- */
  function isOn(W, label) {
    if (label === '$harvest') return W.harvest > 0;
    const p = W.labels[label];
    if (!p) throw new Error('找不到標籤 ' + label);
    const c = at(W, p[0], p[1]);
    if (!c) return false;
    switch (c.t) {
      case 'lamp': case 'bulb': case 'lever': case 'plate': case 'torch': case 'rep': return !!c.on;
      case 'door': return !!c.open;
      case 'piston': return !!c.ext;
      case 'note': return c.hits > 0;
      case 'disp': return (c.shots || 0) > 0;
      case 'dust': case 'comp': return c.lv > 0;
      case 'block': case 'rblock': return true;
      case 'spot': return !!c.pumpkin;
    }
    return false;
  }
  function value(W, label) {
    if (label === '$harvest') return W.harvest;
    const p = W.labels[label], c = at(W, p[0], p[1]);
    if (!c) return 0;
    if (c.t === 'note') return c.hits;
    if (c.t === 'disp') return c.shots || 0;
    if (CAP[c.t]) return c.n;
    if (c.t === 'comp' || c.t === 'dust') return c.lv;
    return isOn(W, label) ? 1 : 0;
  }

  /* steps：{set:{A:true}} {press:'B'} {hit:['X',15]} {items:['C',900]} {time:22} {page:['E',5]}
            {grow:'Z'} {vib:'V'} {wait:20} {expect:{L:true}, say:'…'} {atLeast:{C:5}} {blink:'L', ticks:80, min:3} */
  function runChallenge(W0, steps, names) {
    const W = clone(W0);
    W.autoGrow = false;
    W.cells.forEach(r => r.forEach(c => { if (c && c.t === 'note') c.hits = 0; if (c && c.t === 'disp') c.shots = 0; }));
    const nm = l => (names && names[l]) || l;
    const res = [];
    let ctx = [];
    const pos = l => { const p = W.labels[l]; if (!p) throw new Error('找不到標籤 ' + l); return p; };
    const cellOf = l => { const p = pos(l); return at(W, p[0], p[1]); };
    const run = n => { for (let i = 0; i < n; i++) step(W); };
    run(3);
    for (const s of steps) {
      if (s.set) Object.entries(s.set).forEach(([l, v]) => {
        const c = cellOf(l);
        if (!c || (c.t !== 'lever' && c.t !== 'plate')) { ctx.push(`⚠️ ${nm(l)} 不見了`); return; }
        if (c.on !== v) { c.on = v; vibrate(W, ...pos(l)); }
        ctx.push(`${nm(l)}${c.t === 'plate' ? (v ? '有人站' : '沒人') : (v ? '開' : '關')}`);
      });
      if (s.press) { [].concat(s.press).forEach(l => { const c = cellOf(l); if (c && c.t === 'button') { c.timer = 10; vibrate(W, ...pos(l)); } ctx.push(`按 ${nm(l)}`); }); }
      if (s.hit) { const c = cellOf(s.hit[0]); if (c) { c.lv = s.hit[1]; c.timer = 10; } ctx.push(`射中 ${nm(s.hit[0])}（強度 ${s.hit[1]}）`); }
      if (s.items) { const c = cellOf(s.items[0]); if (c) c.n = s.items[1]; ctx.push(`${nm(s.items[0])}裝 ${s.items[1]} 個`); }
      if (s.page) { const c = cellOf(s.page[0]); if (c) c.page = s.page[1]; ctx.push(`翻到第 ${s.page[1]} 頁`); }
      if (s.time !== undefined) { W.time = s.time; ctx.push(s.time >= 6 && s.time <= 18 ? `白天 ${s.time} 點` : `晚上 ${s.time} 點`); }
      if (s.grow) { const p = pos(s.grow); growStem(W, p[0], p[1]); ctx.push('南瓜長出來了'); }
      if (s.vib) { vibrate(W, ...pos(s.vib)); ctx.push(`${nm(s.vib)}發出聲音`); }
      if (s.wait) run(s.wait);
      if (s.expect) {
        run(s.settle === undefined ? 30 : s.settle);
        const parts = [];
        let ok = true;
        Object.entries(s.expect).forEach(([l, v]) => {
          const got = isOn(W, l);
          if (got !== v) ok = false;
          parts.push(`${nm(l)}${v ? '要「開／亮」' : '要「關／暗」'}${got === v ? '' : `（現在${got ? '開／亮' : '關／暗'}）`}`);
        });
        res.push({ ok, text: s.say || `${ctx.join('、') || '一開始'} → ${parts.join('、')}` });
        ctx = [];
      }
      if (s.atLeast) {
        run(s.settle === undefined ? 30 : s.settle);
        let ok = true; const parts = [];
        Object.entries(s.atLeast).forEach(([l, v]) => { const got = value(W, l); if (got < v) ok = false; parts.push(`${nm(l)} 至少 ${v}（現在 ${got}）`); });
        res.push({ ok, text: s.say || `${ctx.join('、') || '等一下'} → ${parts.join('、')}` });
        ctx = [];
      }
      if (s.blink) {
        let changes = 0, last = isOn(W, s.blink);
        for (let i = 0; i < (s.ticks || 80); i++) { step(W); const v = isOn(W, s.blink); if (v !== last) changes++; last = v; }
        const tooFast = s.max !== undefined && changes > s.max;
        const ok = changes >= (s.min || 4) && !tooFast;
        res.push({ ok, text: s.say || `${nm(s.blink)} 要自己一直閃（${((s.ticks || 80) / 10)} 秒內變化 ${changes} 次）` });
        if (s.max !== undefined) res.push({ ok: !tooFast, text: tooFast ? `閃太快了（最多 ${s.max} 次）！遊戲裡火把開關太快會燒壞，用 🖐️ 點中繼器把延遲調大` : `速度剛好，火把不會燒壞（最多 ${s.max} 次）` });
      }
    }
    return { pass: res.length > 0 && res.every(r => r.ok), res, W };
  }

  /* 放元件／清除（給 UI 與測試共用） */
  function makeCell(tool, dir) {
    const m = {
      dust: '-', lever: 'L', button: 'B', plate: 'P', lamp: 'O', block: '#', rblock: 'R', torch: 'T', rep: 'r', comp: 'c',
      piston: 'p', sticky: 'k', obs: 'o', note: 'N', door: 'D', day: 'S', target: 'X', hopper: 'h', chest: 'C', drop: 'd',
      disp: 'f', sculk: 'Q', bulb: 'U', stem: 'Z', spot: 'Y', lect: 'E',
    }[tool];
    const c = parseToken('~' + m + (DIRECTIONAL[tool === 'sticky' ? 'piston' : tool] ? '>' : '')).c;
    if (c.d !== undefined) c.d = dir || 0;
    return c;
  }
  function removeAt(W, x, y) {
    const c = at(W, x, y);
    if (!c) return;
    if (c.t === 'piston' && c.ext) { const h = at(W, x + DX[c.d], y + DY[c.d]); if (h && h.t === 'head') W.cells[y + DY[c.d]][x + DX[c.d]] = h.base || null; }
    if (c.t === 'head') {
      const px = x - DX[c.d], py = y - DY[c.d], p = at(W, px, py);
      if (p && p.t === 'piston') p.ext = false;
    }
    W.cells[y][x] = c.base || null;
  }
  function place(W, x, y, tool, dir) {
    const c = at(W, x, y);
    if (c === undefined) return 'out';
    if (tool === 'erase') { if (c && c.lock) return 'locked'; removeAt(W, x, y); return 'ok'; }
    if (c && c.lock) return 'locked';
    const want = tool === 'sticky' ? 'piston' : tool;
    if (c && c.t === want && (tool !== 'piston' || !c.sticky) && (tool !== 'sticky' || c.sticky) && c.d !== undefined) {
      if (c.t === 'piston' && c.ext) removeAt(W, x, y), W.cells[y][x] = c, c.ext = false;
      c.d = (c.d + 1) % 4; if (c.t === 'obs') delete c.last; return 'rotate';
    }
    if (c) removeAt(W, x, y);
    W.cells[y][x] = makeCell(tool, dir);
    return 'ok';
  }

  const RS = { parse, step, clone, interact, runChallenge, place, isOn, value, INFO, ARCH, DX, DY, dayLevel, fill, growStem };
  root.RedSimCore = RS;
  if (typeof module !== 'undefined' && module.exports) { module.exports = RS; return; }

  /* =================================================================
     以下是瀏覽器 UI
     ================================================================= */
  const TOOL_ORDER = ['dust', 'lever', 'button', 'plate', 'lamp', 'block', 'rblock', 'torch', 'rep', 'comp', 'piston', 'sticky',
    'obs', 'note', 'door', 'day', 'target', 'hopper', 'chest', 'drop', 'disp', 'sculk', 'bulb', 'stem', 'spot', 'lect'];

  let actx = null, muted = false;
  function sound(kind, pitch) {
    if (muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
      o.connect(g); g.connect(actx.destination);
      if (kind === 'note') { o.type = 'triangle'; o.frequency.value = 185 * Math.pow(2, pitch / 12); g.gain.setValueAtTime(.25, t); g.gain.exponentialRampToValueAtTime(.001, t + .6); o.start(t); o.stop(t + .6); }
      else if (kind === 'piston') { o.type = 'square'; o.frequency.value = 90; g.gain.setValueAtTime(.06, t); g.gain.exponentialRampToValueAtTime(.001, t + .09); o.start(t); o.stop(t + .1); }
      else if (kind === 'pop') { o.type = 'sine'; o.frequency.setValueAtTime(500, t); o.frequency.exponentialRampToValueAtTime(1400, t + .15); g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + .2); o.start(t); o.stop(t + .2); }
      else if (kind === 'ding') { o.type = 'sine'; o.frequency.value = 1320; g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + .3); o.start(t); o.stop(t + .3); }
      else { o.type = 'square'; o.frequency.value = 700; g.gain.setValueAtTime(.04, t); g.gain.exponentialRampToValueAtTime(.001, t + .04); o.start(t); o.stop(t + .05); }
    } catch (e) { /* 沒有聲音也沒關係 */ }
  }

  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function arrow(g, d, s, col) {
    g.save(); g.translate(s / 2, s / 2); g.rotate(d * Math.PI / 2);
    g.fillStyle = col; g.beginPath(); g.moveTo(s * .34, 0); g.lineTo(s * .1, -s * .16); g.lineTo(s * .1, s * .16); g.closePath(); g.fill();
    g.restore();
  }
  const dustCol = lv => lv > 0 ? `rgb(${150 + lv * 7},${20 + lv * 2},${20 + lv * 2})` : '#6b2020';
  const CONNECT = { dust: 1, lever: 1, button: 1, plate: 1, rblock: 1, torch: 1, lamp: 1, note: 1, door: 1, piston: 1, disp: 1, drop: 1, target: 1, sculk: 1, day: 1, bulb: 1, block: 1, hopper: 1 };
  function dustLinks(W, x, y) {
    const r = [];
    for (let k = 0; k < 4; k++) {
      const n = at(W, x + DX[k], y + DY[k]);
      if (!n) { r.push(false); continue; }
      if (n.t === 'rep' || n.t === 'comp') r.push(n.d % 2 === k % 2);
      else if (n.t === 'obs') r.push(back(n.d) === back(k));
      else r.push(!!CONNECT[n.t]);
    }
    return r;
  }

  /* 畫一格（g 已平移到格子左上角） */
  function drawCell(g, c, s, W, x, y, showLv) {
    const P = s * .1;
    switch (c.t) {
      case 'dust': {
        const col = dustCol(c.lv), links = W ? dustLinks(W, x, y) : [true, false, true, false];
        g.strokeStyle = col; g.lineWidth = s * .2; g.lineCap = 'round';
        const any = links.some(Boolean);
        for (let k = 0; k < 4; k++) if (links[k] || !any) { g.beginPath(); g.moveTo(s / 2, s / 2); g.lineTo(s / 2 + DX[k] * s / 2, s / 2 + DY[k] * s / 2); if (links[k]) g.stroke(); }
        if (!any) { g.beginPath(); g.moveTo(s * .2, s / 2); g.lineTo(s * .8, s / 2); g.moveTo(s / 2, s * .2); g.lineTo(s / 2, s * .8); g.stroke(); }
        g.fillStyle = col; g.beginPath(); g.arc(s / 2, s / 2, s * .16, 0, 7); g.fill();
        if (c.lv > 0) { g.shadowColor = '#ff3030'; g.shadowBlur = c.lv; g.fill(); g.shadowBlur = 0; }
        if (showLv) { g.fillStyle = '#fff'; g.font = `bold ${s * .26}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c.lv, s / 2, s / 2 + 1); }
        break;
      }
      case 'lever':
        g.fillStyle = '#9e9e9e'; rr(g, s * .28, s * .3, s * .44, s * .4, 4); g.fill();
        g.strokeStyle = '#6d4c41'; g.lineWidth = s * .1; g.lineCap = 'round'; g.beginPath(); g.moveTo(s / 2, s / 2); g.lineTo(c.on ? s * .78 : s * .22, s * .2); g.stroke();
        g.fillStyle = c.on ? '#ff1744' : '#5d1010'; g.beginPath(); g.arc(c.on ? s * .78 : s * .22, s * .2, s * .09, 0, 7); g.fill();
        break;
      case 'button':
        g.fillStyle = c.timer > 0 ? '#757575' : '#bdbdbd'; rr(g, s * .3, s * .32, s * .4, s * .36, 5); g.fill();
        g.strokeStyle = c.timer > 0 ? '#ff1744' : '#9e9e9e'; g.lineWidth = 2; g.stroke();
        break;
      case 'plate':
        g.fillStyle = c.on ? '#9e9e9e' : '#cfd8dc'; rr(g, P * 1.4, P * 1.4, s - P * 2.8, s - P * 2.8, 4); g.fill();
        g.strokeStyle = '#90a4ae'; g.lineWidth = 2; g.stroke();
        if (c.on) { g.font = `${s * .5}px "Segoe UI Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🧍', s / 2, s / 2); }
        break;
      case 'lamp':
        if (c.on) { g.shadowColor = '#ffd54f'; g.shadowBlur = s * .5; }
        g.fillStyle = c.on ? '#ffe082' : '#6d4c41'; rr(g, P, P, s - 2 * P, s - 2 * P, 6); g.fill(); g.shadowBlur = 0;
        g.strokeStyle = c.on ? '#ffb300' : '#4e342e'; g.lineWidth = 2; g.stroke();
        g.strokeStyle = c.on ? '#ffca28' : '#8d6e63'; g.beginPath(); g.moveTo(s / 2, P * 2); g.lineTo(s / 2, s - P * 2); g.moveTo(P * 2, s / 2); g.lineTo(s - P * 2, s / 2); g.stroke();
        break;
      case 'block':
        g.fillStyle = '#9e9e9e'; g.fillRect(1, 1, s - 2, s - 2);
        g.fillStyle = '#bdbdbd'; g.fillRect(s * .15, s * .15, s * .3, s * .2); g.fillRect(s * .55, s * .55, s * .3, s * .2);
        if (c.pw > 0) { g.strokeStyle = 'rgba(255,40,40,.8)'; g.lineWidth = 3; g.strokeRect(2.5, 2.5, s - 5, s - 5); }
        break;
      case 'rblock':
        g.fillStyle = '#c62828'; g.fillRect(1, 1, s - 2, s - 2);
        g.fillStyle = '#ef5350'; for (let i = 0; i < 4; i++) g.fillRect(s * (.15 + (i % 2) * .4), s * (.15 + Math.floor(i / 2) * .4), s * .3, s * .3);
        break;
      case 'torch': {
        g.save(); g.translate(s / 2, s / 2); g.rotate(c.d * Math.PI / 2);
        g.fillStyle = '#8d6e63'; g.fillRect(-s * .5, -s * .07, s * .55, s * .14);
        g.fillStyle = c.on ? '#ff1744' : '#4e1010';
        if (c.on) { g.shadowColor = '#ff1744'; g.shadowBlur = s * .4; }
        g.beginPath(); g.arc(s * .1, 0, s * .17, 0, 7); g.fill(); g.shadowBlur = 0;
        g.restore();
        break;
      }
      case 'rep': case 'comp': {
        g.fillStyle = '#d7ccc8'; rr(g, P * .6, P * .6, s - P * 1.2, s - P * 1.2, 5); g.fill();
        g.strokeStyle = '#a1887f'; g.lineWidth = 1.5; g.stroke();
        const lit = c.t === 'rep' ? c.on : c.lv > 0;
        arrow(g, c.d, s, lit ? '#ff1744' : '#795548');
        g.save(); g.translate(s / 2, s / 2); g.rotate(c.d * Math.PI / 2);
        if (c.t === 'rep') {
          g.fillStyle = lit ? '#ff5252' : '#5d1010';
          for (let i = 0; i < c.delay; i++) g.fillRect(-s * .32 + i * s * .1, -s * .3, s * .07, s * .1);
          g.fillStyle = '#5d4037'; g.font = `bold ${s * .24}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.rotate(-c.d * Math.PI / 2);
          g.fillText(c.delay, s * .28, s * .3);
        } else {
          g.fillStyle = c.mode === 'sub' ? '#ff1744' : '#5d1010'; g.beginPath(); g.arc(s * .3, 0, s * .06, 0, 7); g.fill();
          g.rotate(-c.d * Math.PI / 2); g.fillStyle = '#5d4037'; g.font = `bold ${s * .22}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText((c.mode === 'sub' ? '−' : '') + (c.lv || 0), 0, s * .27);
        }
        g.restore();
        break;
      }
      case 'piston': case 'head': {
        g.save(); g.translate(s / 2, s / 2); g.rotate(c.d * Math.PI / 2); g.translate(-s / 2, -s / 2);
        if (c.t === 'piston') {
          g.fillStyle = '#8d8d8d'; g.fillRect(1, 1, s * .75, s - 2);
          g.fillStyle = c.sticky ? '#9ccc65' : '#c8a26b'; g.fillRect(s * .76, 1, s * .22, s - 2);
          g.fillStyle = '#5d4037'; g.fillRect(s * .3, s * .4, s * .46, s * .2);
        } else {
          g.fillStyle = '#c8a26b'; g.fillRect(0, s * .42, s * .76, s * .16);
          g.fillStyle = c.sticky ? '#9ccc65' : '#c8a26b'; g.fillRect(s * .76, 1, s * .22, s - 2);
        }
        g.restore();
        break;
      }
      case 'obs': {
        g.fillStyle = '#616161'; g.fillRect(1, 1, s - 2, s - 2);
        g.save(); g.translate(s / 2, s / 2); g.rotate(c.d * Math.PI / 2);
        g.fillStyle = '#212121'; g.fillRect(s * .22, -s * .3, s * .22, s * .6);
        g.fillStyle = '#e0e0e0'; g.fillRect(s * .3, -s * .2, s * .1, s * .12); g.fillRect(s * .3, s * .08, s * .1, s * .12);
        g.fillStyle = c.timer > 0 ? '#ff1744' : '#4e1010'; g.beginPath(); g.arc(-s * .32, 0, s * .08, 0, 7); g.fill();
        g.restore();
        break;
      }
      case 'note':
        g.fillStyle = '#795548'; g.fillRect(1, 1, s - 2, s - 2);
        g.fillStyle = '#ffecb3'; g.font = `bold ${s * .42}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('♪', s * .38, s * .45);
        g.font = `bold ${s * .22}px sans-serif`; g.fillText(c.pitch, s * .74, s * .78);
        break;
      case 'door':
        g.fillStyle = '#cfd8dc'; g.fillRect(1, s * .35, s - 2, s * .3);
        g.fillStyle = '#90a4ae';
        if (c.open) { g.fillRect(1, s * .1, s * .14, s * .8); g.fillRect(s - s * .15, s * .1, s * .14, s * .8); g.fillStyle = '#43a047'; g.font = `bold ${s * .22}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('開', s / 2, s / 2); }
        else { g.fillRect(1, s * .35, s - 2, s * .3); g.fillStyle = '#546e7a'; g.fillRect(s / 2 - 1, s * .35, 2, s * .3); }
        break;
      case 'day':
        g.fillStyle = c.inv ? '#3949ab' : '#d7ccc8'; rr(g, P * .6, P * .6, s - P * 1.2, s - P * 1.2, 5); g.fill();
        g.fillStyle = c.inv ? '#c5cae9' : '#90caf9';
        for (let i = 0; i < 9; i++) g.fillRect(s * (.2 + (i % 3) * .22), s * (.2 + Math.floor(i / 3) * .22), s * .15, s * .15);
        g.fillStyle = '#fff'; g.font = `bold ${s * .24}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c.lv, s / 2, s / 2);
        break;
      case 'target':
        [['#fff', .42], ['#e53935', .34], ['#fff', .24], ['#e53935', .12]].forEach(([col, r]) => { g.fillStyle = col; g.beginPath(); g.arc(s / 2, s / 2, s * r, 0, 7); g.fill(); });
        if (c.timer > 0) { g.fillStyle = '#5d4037'; g.font = `bold ${s * .24}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c.lv, s / 2, s / 2); }
        break;
      case 'hopper': case 'chest': case 'drop': case 'disp': {
        const col = { hopper: '#546e7a', chest: '#a1662f', drop: '#78909c', disp: '#78909c' }[c.t];
        g.fillStyle = col; rr(g, 1, 1, s - 2, s - 2, 4); g.fill();
        if (c.t === 'chest') { g.fillStyle = '#5d3a1a'; g.fillRect(1, s * .4, s - 2, s * .06); g.fillStyle = '#ffd54f'; g.fillRect(s * .44, s * .34, s * .12, s * .18); }
        if (c.t === 'hopper') { g.fillStyle = '#37474f'; g.beginPath(); g.moveTo(s * .2, s * .2); g.lineTo(s * .8, s * .2); g.lineTo(s * .5, s * .62); g.closePath(); g.fill(); }
        if (c.t === 'drop' || c.t === 'disp') { g.fillStyle = '#263238'; g.save(); g.translate(s / 2, s / 2); g.rotate(c.d * Math.PI / 2); g.beginPath(); g.arc(s * .28, 0, s * .12, 0, 7); g.fill(); if (c.t === 'disp') g.fillRect(s * .05, -s * .03, s * .2, s * .06); g.restore(); }
        if (c.d !== undefined && c.t === 'hopper') arrow(g, c.d, s, c.locked ? '#ff1744' : '#cfd8dc');
        g.fillStyle = '#fff'; g.font = `bold ${s * .22}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c.n, s / 2, s * .82);
        break;
      }
      case 'sculk': {
        const on = c.timer > 0;
        g.fillStyle = '#004d40'; rr(g, P * .5, s * .35, s - P, s * .6, 4); g.fill();
        g.strokeStyle = on ? '#64ffda' : '#26a69a'; g.lineWidth = s * .07; g.lineCap = 'round';
        if (on) { g.shadowColor = '#64ffda'; g.shadowBlur = s * .4; }
        [[.25, .1], [.5, .05], [.75, .1]].forEach(([a, b]) => { g.beginPath(); g.moveTo(s * a, s * .4); g.lineTo(s * a, s * b + .15 * s); g.stroke(); });
        g.shadowBlur = 0;
        if (on) { g.fillStyle = '#fff'; g.font = `bold ${s * .22}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c.lv, s / 2, s * .7); }
        break;
      }
      case 'bulb':
        if (c.on) { g.shadowColor = '#ffab40'; g.shadowBlur = s * .5; }
        g.fillStyle = c.on ? '#ffcc80' : '#b87333'; rr(g, P, P, s - 2 * P, s - 2 * P, 6); g.fill(); g.shadowBlur = 0;
        g.fillStyle = c.on ? '#fff3e0' : '#7a4a22'; g.beginPath(); g.arc(s / 2, s / 2, s * .16, 0, 7); g.fill();
        break;
      case 'spot':
        g.fillStyle = '#8d6e63'; g.fillRect(1, 1, s - 2, s - 2);
        if (c.pumpkin) { g.fillStyle = '#fb8c00'; g.beginPath(); g.arc(s / 2, s / 2, s * .34, 0, 7); g.fill(); g.strokeStyle = '#e65100'; g.lineWidth = 2; g.beginPath(); g.moveTo(s / 2, s * .18); g.lineTo(s / 2, s * .82); g.stroke(); g.fillStyle = '#558b2f'; g.fillRect(s * .45, s * .08, s * .1, s * .14); }
        break;
      case 'stem':
        g.fillStyle = '#8d6e63'; g.fillRect(1, 1, s - 2, s - 2);
        g.strokeStyle = c.attached ? '#8d6e63' : '#7cb342'; g.strokeStyle = '#7cb342'; g.lineWidth = s * .08;
        g.beginPath(); g.moveTo(s / 2, s * .85); g.quadraticCurveTo(s * .3, s * .5, s / 2, s * .2); g.stroke();
        g.fillStyle = '#9ccc65'; g.beginPath(); g.ellipse(s * .66, s * .4, s * .14, s * .08, -.5, 0, 7); g.fill();
        break;
      case 'lect':
        g.fillStyle = '#a1662f'; rr(g, P, P, s - 2 * P, s - 2 * P, 4); g.fill();
        g.fillStyle = '#fff8e1'; g.fillRect(s * .2, s * .25, s * .6, s * .4);
        g.fillStyle = '#5d4037'; g.font = `bold ${s * .22}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(`${c.page}/${c.pages}`, s / 2, s * .46);
        break;
    }
  }

  function toolIcon(tool, size) {
    const cv = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    cv.width = cv.height = size * dpr; cv.style.width = cv.style.height = size + 'px';
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    if (tool === 'hand' || tool === 'erase') { g.font = `${size * .7}px "Segoe UI Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tool === 'hand' ? '🖐️' : '🧽', size / 2, size / 2 + 1); return cv; }
    const c = makeCell(tool, 0);
    if (tool === 'lamp') c.on = true; if (tool === 'dust') c.lv = 15; if (tool === 'torch') c.on = true; if (tool === 'stem') c.attached = false;
    drawCell(g, c, size, null, 0, 0, false);
    return cv;
  }
  const toolName = t => t === 'hand' ? '操作' : t === 'erase' ? '清除' : INFO[t][0];

  function mount(el, cfg) {
    if (typeof el === 'string') el = document.querySelector(el);
    const W0 = parse(cfg.rows);
    W0.time = cfg.time === undefined ? 12 : cfg.time;
    let W = clone(W0);
    for (let i = 0; i < 20; i++) step(W);
    W.fx = [];
    let tool = 'hand', dir = 0, running = true, speed = 1, showLv = cfg.showLv !== false, sel = null, effects = [];
    const tools = ['hand'].concat(cfg.tools === 'all' ? TOOL_ORDER : (cfg.tools || []), (cfg.tools && cfg.tools.length) || cfg.tools === 'all' ? ['erase'] : []);
    const toks = cfg.rows.join(' ').split(/\s+/).map(t => t.replace(/^~/, ''));
    const hasTool = t => cfg.tools === 'all' || (Array.isArray(cfg.tools) && cfg.tools.includes(t));
    const hasDay = toks.some(t => t[0] === 'S') || hasTool('day');
    const hasCrop = toks.some(t => t[0] === 'Z') || hasTool('stem');

    el.classList.add('rs');
    el.innerHTML = `
      ${cfg.title ? `<div class="rs-title">${cfg.title}</div>` : ''}
      ${cfg.desc ? `<p class="rs-desc">${cfg.desc}</p>` : ''}
      <div class="rs-tools"></div>
      <div class="rs-stage"><canvas></canvas></div>
      <div class="rs-ctl">
        <button class="btn sm rs-play">⏸ 暫停</button>
        <button class="btn sm ghost rs-step">⏭ 走一步</button>
        <label class="rs-sp">速度 <select><option value="0.25">慢 ×¼</option><option value="0.5">慢 ×½</option><option value="1" selected>正常</option><option value="2">快 ×2</option></select></label>
        <label class="rs-lvl"><input type="checkbox" ${showLv ? 'checked' : ''}> 顯示訊號強度</label>
        <button class="btn sm ghost rs-reset">🔄 重來</button>
        <button class="btn sm ghost rs-mute">🔊</button>
        <span class="rs-tick"></span>
      </div>
      ${hasDay ? `<label class="rs-time">🕒 時間：<b></b><input type="range" min="0" max="24" step="0.5" value="${W.time}"></label>` : ''}
      ${hasCrop ? `<div class="rs-crop small">🎃 收成：<b>0</b> 顆（南瓜莖會自己慢慢長，也可以用 🖐️ 點莖讓它馬上長）</div>` : ''}
      <div class="rs-info"></div>
      <div class="rs-ch"></div>`;
    const q = s => el.querySelector(s);
    const cv = q('canvas'), g = cv.getContext('2d');
    let cs = 40;

    // 工具列
    const bar = q('.rs-tools');
    tools.forEach(t => {
      const b = document.createElement('button');
      b.className = 'rs-tool' + (t === tool ? ' on' : '');
      b.title = toolName(t);
      b.appendChild(toolIcon(t, 30));
      const sp = document.createElement('span'); sp.textContent = toolName(t); b.appendChild(sp);
      b.onclick = () => { tool = t; bar.querySelectorAll('.rs-tool').forEach(x => x.classList.toggle('on', x === b)); showInfo(t); };
      bar.appendChild(b);
    });
    if (tools.length > 2) {
      const rb = document.createElement('button');
      rb.className = 'rs-tool rs-rot';
      rb.innerHTML = `<b>${ARCH[dir]}</b><span>方向</span>`;
      rb.title = '新放的元件朝哪個方向（鍵盤 R）';
      rb.onclick = () => { dir = (dir + 1) % 4; rb.querySelector('b').textContent = ARCH[dir]; };
      bar.appendChild(rb);
      el.tabIndex = 0;
      el.addEventListener('keydown', e => { if (e.key === 'r' || e.key === 'R') rb.click(); });
    } else bar.style.display = tools.length > 1 ? '' : 'none';

    function showInfo(t, x, y) {
      const box = q('.rs-info');
      if (t === 'hand') { box.innerHTML = '🖐️ <b>操作</b>：點拉桿、按鈕、壓力板就像在遊戲裡按右鍵。點元件也會顯示它的說明。'; return; }
      if (t === 'erase') { box.innerHTML = '🧽 <b>清除</b>：點一下把元件拿掉（題目給的元件拿不掉，角落有灰色三角形）。'; return; }
      const c = x !== undefined ? at(W, x, y) : null;
      const key = c ? (c.t === 'piston' && c.sticky ? 'sticky' : c.t) : t;
      if (!INFO[key]) { box.innerHTML = ''; return; }
      let extra = '';
      if (c && (CAP[c.t])) {
        extra = `<div class="row" style="margin-top:6px">裡面有 <b>${c.n}</b> 個（最多 ${CAP[c.t]}）
          <button class="btn sm ghost" data-n="1">＋1</button><button class="btn sm ghost" data-n="64">＋64</button><button class="btn sm ghost" data-n="576">＋576</button><button class="btn sm ghost" data-n="-64">－64</button><button class="btn sm ghost" data-n="0">清空</button></div>`;
      }
      if (c && c.d !== undefined && c.t !== 'head') extra += `<div class="small">朝向：${ARCH[c.d]}（用同一種元件再點一下可以轉方向）</div>`;
      box.innerHTML = `<b>${INFO[key][0]}</b>：${INFO[key][1]}${extra}`;
      box.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
        const v = +b.dataset.n;
        c.n = v === 0 ? 0 : Math.max(0, Math.min(CAP[c.t], c.n + v));
        showInfo(t, x, y); draw();
      });
    }
    showInfo('hand');

    function resize() {
      const avail = Math.max(200, q('.rs-stage').clientWidth - 8);
      cs = Math.max(22, Math.min(52, Math.floor(avail / W.w)));
      const dpr = window.devicePixelRatio || 1;
      cv.width = W.w * cs * dpr; cv.height = W.h * cs * dpr;
      cv.style.width = W.w * cs + 'px'; cv.style.height = W.h * cs + 'px';
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      g.clearRect(0, 0, W.w * cs, W.h * cs);
      for (let y = 0; y < W.h; y++) for (let x = 0; x < W.w; x++) {
        g.save(); g.translate(x * cs, y * cs);
        g.fillStyle = (x + y) % 2 ? '#e8e4d8' : '#efebe0'; g.fillRect(0, 0, cs, cs);
        if (W.hints[x + ',' + y]) { g.fillStyle = 'rgba(255,213,79,.35)'; g.fillRect(0, 0, cs, cs); g.strokeStyle = '#ffb300'; g.setLineDash([4, 3]); g.strokeRect(1.5, 1.5, cs - 3, cs - 3); g.setLineDash([]); }
        const c = W.cells[y][x];
        if (c) {
          if (c.base) drawCell(g, c.base, cs, W, x, y, false);
          drawCell(g, c, cs, W, x, y, showLv);
          if (c.lock && tools.length > 2 && c.t !== 'head') { g.fillStyle = 'rgba(80,80,80,.45)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(cs * .22, 0); g.lineTo(0, cs * .22); g.closePath(); g.fill(); }
        }
        if (sel && sel[0] === x && sel[1] === y) { g.strokeStyle = '#2196f3'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, cs - 3, cs - 3); }
        g.restore();
      }
      Object.entries(W.labels).forEach(([l, [x, y]]) => {
        if (l[0] === '$') return;
        g.font = `bold ${Math.max(10, cs * .26)}px sans-serif`;
        const tw = g.measureText(l).width + 6;
        g.fillStyle = 'rgba(33,33,33,.78)'; rr(g, x * cs + cs - tw - 1, y * cs + 1, tw, cs * .3, 4); g.fill();
        g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(l, x * cs + cs - tw / 2 - 1, y * cs + 1 + cs * .15);
      });
      effects = effects.filter(e => e.ttl-- > 0);
      effects.forEach(e => {
        g.save(); g.translate(e.x * cs + cs / 2, e.y * cs + cs / 2);
        g.font = `${cs * .5}px "Segoe UI Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
        const up = (12 - e.ttl) * cs * .05;
        g.globalAlpha = Math.min(1, e.ttl / 6);
        if (e.k === 'note') g.fillText('🎵', 0, -cs * .4 - up);
        if (e.k === 'disp') g.fillText('🎆', DX[e.d] * (cs * .6 + up * 2), DY[e.d] * (cs * .6 + up * 2));
        if (e.k === 'drop') g.fillText('📦', DX[e.d] * (cs * .6 + up), DY[e.d] * (cs * .6 + up));
        if (e.k === 'harvest') g.fillText('🎃', 0, -up);
        if (e.k === 'arrow') g.fillText('🏹', cs * .3, -cs * .3);
        if (e.k === 'break') g.fillText('💥', 0, 0);
        g.restore();
      });
      const tk = q('.rs-tick'); if (tk) tk.textContent = `經過 ${(W.tick / 10).toFixed(1)} 秒`;
      const cr = q('.rs-crop b'); if (cr) cr.textContent = W.harvest;
      const tb = q('.rs-time b'); if (tb) { const h = W.time; tb.textContent = `${Math.floor(h)}:${h % 1 ? '30' : '00'} ${h >= 6 && h <= 18 ? '☀️ 白天' : '🌙 晚上'}（日光強度 ${dayLevel(h)}）`; }
    }

    function drainFx() {
      W.fx.forEach(f => {
        if (f.k === 'note') sound('note', f.pitch);
        else if (f.k === 'piston') sound('piston');
        else if (f.k === 'disp' || f.k === 'drop') sound('pop');
        else if (f.k === 'harvest') sound('ding');
        effects.push(Object.assign({ ttl: 12 }, f));
      });
      W.fx = [];
    }

    function tickOnce() { step(W); drainFx(); draw(); }
    let acc = 0, lastT = performance.now();
    function loop(t) {
      if (!el.isConnected) return;
      const dt = Math.min(500, t - lastT); lastT = t;
      if (running) { acc += dt * speed; while (acc >= 100) { acc -= 100; step(W); drainFx(); } }
      draw();
      requestAnimationFrame(loop);
    }

    cv.addEventListener('pointerdown', e => {
      const r = cv.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width * W.w, py = (e.clientY - r.top) / r.height * W.h;
      const x = Math.floor(px), y = Math.floor(py);
      if (x < 0 || y < 0 || x >= W.w || y >= W.h) return;
      if (tool === 'hand') {
        interact(W, x, y, px - x, py - y);
        const c = at(W, x, y);
        sound('click');
        sel = [x, y];
        showInfo(c ? c.t : 'hand', x, y);
      } else {
        const r2 = place(W, x, y, tool, dir);
        if (r2 === 'locked') toast('這格是題目給的，不能改喔 🔒');
        else { sound('click'); sel = [x, y]; showInfo(tool, x, y); }
      }
      drainFx(); draw();
    });

    q('.rs-play').onclick = function () { running = !running; this.textContent = running ? '⏸ 暫停' : '▶ 播放'; };
    q('.rs-step').onclick = () => { running = false; q('.rs-play').textContent = '▶ 播放'; tickOnce(); };
    q('.rs-sp select').onchange = function () { speed = +this.value; };
    q('.rs-lvl input').onchange = function () { showLv = this.checked; draw(); };
    q('.rs-reset').onclick = () => { W = clone(W0); for (let i = 0; i < 20; i++) step(W); W.fx = []; sel = null; const tr = q('.rs-time input'); if (tr) tr.value = W.time; q('.rs-ch').querySelectorAll('.rs-res').forEach(r => r.innerHTML = ''); draw(); };
    q('.rs-mute').onclick = function () { muted = !muted; this.textContent = muted ? '🔇' : '🔊'; };
    const tr = q('.rs-time input'); if (tr) tr.oninput = () => { W.time = +tr.value; draw(); };

    // 挑戰
    const chBox = q('.rs-ch');
    (cfg.challenges || []).forEach((ch, i) => {
      const d = document.createElement('div');
      d.className = 'rs-chal';
      d.innerHTML = `<div class="row"><b>${ch.level || '🎯'} 挑戰${(cfg.challenges.length > 1) ? ' ' + (i + 1) : ''}：${ch.name}</b>
        <button class="btn sm green rs-test">🧪 測試我的電路</button></div>
        ${ch.goal ? `<p class="small" style="margin:4px 0">${ch.goal}</p>` : ''}<div class="rs-res"></div>`;
      d.querySelector('.rs-test').onclick = () => {
        let r;
        try { r = runChallenge(W, ch.steps, cfg.names); } catch (err) { d.querySelector('.rs-res').innerHTML = `<p class="warn">${err.message}</p>`; return; }
        d.querySelector('.rs-res').innerHTML = `<ul class="rs-list">${r.res.map(x => `<li class="${x.ok ? 'ok' : 'no'}">${x.ok ? '✅' : '❌'} ${x.text}</li>`).join('')}</ul>
          <p class="rs-verdict ${r.pass ? 'ok' : 'no'}">${r.pass ? '🎉 成功！你的電路通過全部測試！' : '還差一點，看看哪一項 ❌，再改改看！'}</p>`;
        if (r.pass) { toast('🎉 挑戰成功！'); sound('ding'); if (cfg.onPass) cfg.onPass(i); }
      };
      chBox.appendChild(d);
    });

    function toast(m) { if (root.MC && root.MC.toast) root.MC.toast(m); }

    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(loop);
    return { get world() { return W; }, draw };
  }

  RS.mount = mount;
  root.RedSim = RS;
})(typeof window !== 'undefined' ? window : globalThis);
