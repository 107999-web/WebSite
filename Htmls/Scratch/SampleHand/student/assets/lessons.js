/* 手勢模組教室：積木圖、模組地圖、10 個互動實驗、自我檢核
   實驗裡的數字與規則和 .sb3 完全相同（手在 s=1 時：手長 78.75、手寬 45、餘裕 6.3）。 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var FN = ['拇', '食', '中', '無', '小'];
  var RPS = { 0: '看不懂', 1: '石頭', 2: '剪刀', 3: '布' };
  var RPS_E = { 0: '❓', 1: '✊', 2: '✌️', 3: '🖐️' };
  var MODC = { 1: '#4C97FF', 2: '#9966FF', 3: '#FF8C1A', 4: '#FF6680', 5: '#3FAE6A', 6: '#0FBD8C',
               7: '#E6A000', 8: '#8E6BE0', 9: '#E8544B', 10: '#2BA5C9' };
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function r1(x) { return Math.round(x * 10) / 10; }

  /* ---------- 小音效 ---------- */
  var AC = null;
  function beep(f, d, type, vol) {
    try {
      if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
      var t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(vol || 0.16, t); g.gain.exponentialRampToValueAtTime(0.001, t + (d || 0.15));
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + (d || 0.15) + 0.02);
    } catch (e) { /* 沒有音效也沒關係 */ }
  }
  var tick = function () { beep(784, 0.07); };
  var ding = function () { beep(988, 0.08); setTimeout(function () { beep(1319, 0.16); }, 70); };

  /* =====================================================================
     積木圖：data-sb="檔案編號|角色|程式"（資料來自 blocks_data.js）
     ===================================================================== */
  document.querySelectorAll('[data-sb]').forEach(function (el) {
    var k = el.getAttribute('data-sb').split('|');
    var file = SB3_BLOCKS[k[0]] || {};
    var s = file[k[1] + '|' + k[2]];
    if (s) BLK.render(el, s);
    else el.textContent = '（找不到積木：' + el.getAttribute('data-sb') + '）';
  });

  /* =====================================================================
     手的模型（和 tools/test_modules.js 的 pose() 相同；像素座標，y 向下）
     ===================================================================== */
  function handPts(fp, opt) {
    opt = opt || {};
    var P = {};
    P[1] = [0, 0];
    var th = fp[0] === '1' ? 'open' : 'closed';
    P[2] = [-25, -20]; P[3] = [-45, -45];
    P[4] = th === 'open' ? [-65, -60] : [-30, -60];
    P[5] = th === 'open' ? [-85, -70] : [0, -60];
    var mcp = { 6: [-30, -100], 10: [-10, -105], 14: [10, -100], 18: [30, -92] };
    [6, 10, 14, 18].forEach(function (m, i) {
      var x = mcp[m][0], y = mcp[m][1];
      P[m] = [x, y];
      if (fp[i + 1] === '1') { P[m + 1] = [x, y - 40]; P[m + 2] = [x, y - 65]; P[m + 3] = [x, y - 85]; }
      else { P[m + 1] = [x, y - 30]; P[m + 2] = [x, y - 12]; P[m + 3] = [x, y - 5]; }
    });
    if (opt.over) for (var k in opt.over) P[k] = opt.over[k];
    return P;
  }
  var BONES = [[1, 2], [2, 3], [3, 4], [4, 5], [1, 6], [6, 7], [7, 8], [8, 9], [6, 10], [10, 11], [11, 12], [12, 13],
               [10, 14], [14, 15], [15, 16], [16, 17], [14, 18], [18, 19], [19, 20], [20, 21], [1, 18]];
  /* 畫手：opt.hi = 要強調的點；opt.label = 顯示編號；opt.s 縮放；opt.flip 手倒過來 */
  function handSVG(P, opt) {
    opt = opt || {};
    var s = opt.s || 1, hi = opt.hi || [], lab = opt.label || [];
    var ox = opt.ox == null ? 115 : opt.ox, oy = opt.oy == null ? 215 : opt.oy;
    var kx = opt.sx || 1;                    // 橫向放大（讓手指分開一點，編號才不會擠在一起）
    function X(i) { return ox + P[i][0] * s * kx; }
    function Y(i) { return oy + (opt.flip ? -P[i][1] : P[i][1]) * s; }
    var h = [];
    // 手掌
    h.push('<path d="M' + X(1) + ' ' + Y(1) + ' L' + X(6) + ' ' + Y(6) + ' L' + X(10) + ' ' + Y(10) + ' L' + X(14) + ' ' + Y(14) +
      ' L' + X(18) + ' ' + Y(18) + ' Z" fill="var(--skin)" opacity=".55"/>');
    BONES.forEach(function (b) {
      h.push('<line x1="' + X(b[0]) + '" y1="' + Y(b[0]) + '" x2="' + X(b[1]) + '" y2="' + Y(b[1]) +
        '" stroke="var(--bone)" stroke-width="' + (5 * Math.max(s, .6)) + '" stroke-linecap="round"/>');
    });
    for (var i = 1; i <= 21; i++) {
      var on = hi.indexOf(i) >= 0;
      var r = (on ? 6.5 : 3.8) * Math.max(s, .7);
      h.push('<circle cx="' + X(i) + '" cy="' + Y(i) + '" r="' + r + '" fill="' + (on ? 'var(--hi)' : 'var(--dot)') +
        '" stroke="#fff" stroke-width="' + (on ? 2 : 1) + '"/>');
      if (lab.indexOf(i) >= 0) {
        var right = [5, 4, 3, 2, 9, 8, 7, 6].indexOf(i) < 0;
        h.push('<text x="' + (X(i) + (right ? 9 : -9)) + '" y="' + (Y(i) + 4) + '" font-size="11" font-weight="800" fill="var(--ink)" text-anchor="' +
          (right ? 'start' : 'end') + '">' + i + '</text>');
      }
    }
    return h.join('');
  }
  /* 換成 Scratch 座標（倍率 0.75、鏡像開啟、手腕在畫面 (320,420)） */
  function sx(px) { return 240 - (320 + px) * 0.75; }
  function sy(py) { return 180 - (420 + py) * 0.75; }

  /* =====================================================================
     0  21 個點
     ===================================================================== */
  (function () {
    var box = $('lab0'); if (!box) return;
    var all = []; for (var i = 1; i <= 21; i++) all.push(i);
    var names = { 1: '手腕', 5: '拇指尖', 6: '食指第三關節（掌根）', 7: '食指第二關節', 9: '食指尖', 10: '中指第三關節',
                  11: '中指第二關節', 13: '中指尖', 15: '無名指第二關節', 17: '無名指尖', 18: '小指第三關節（掌根）',
                  19: '小指第二關節', 21: '小指尖' };
    var used = { 1: [1], 2: [2], 3: [3], 5: [4, 10], 6: [2, 4], 7: [3], 9: [3, 10], 10: [1, 2], 11: [3], 13: [3], 15: [3],
                 17: [3], 18: [2, 4], 19: [3], 21: [3] };
    var sel = 9;
    function draw() {
      var P = handPts('11111');
      var who = used[sel] ? used[sel].map(function (m) { return '<a href="#m' + m + '">模組 ' + m + '</a>'; }).join('、') : '這套教材沒有用到';
      box.innerHTML = '<div class="lab0"><svg viewBox="0 0 260 240" class="handmap" role="img" aria-label="手部 21 個點">' +
        handSVG(P, { hi: [sel], label: all, sx: 1.6, ox: 158 }) + '</svg>' +
        '<div class="lab0r"><p class="sm">點一點編號，看它是哪裡、哪個模組用到它。</p><div class="numgrid">' +
        all.map(function (i) { return '<button class="' + (i === sel ? 'on' : '') + (used[i] ? ' used' : '') + '" data-i="' + i + '">' + i + '</button>'; }).join('') +
        '</div><div class="pick0"><b>' + sel + '　' + (names[sel] || '—') + '</b><br>用在：' + who + '</div>' +
        '<p class="sm">規律：每根手指由掌根往指尖是 <b>+1、+2、+3</b>。食指 6～9、中指 10～13、無名指 14～17、小指 18～21。</p></div></div>';
      box.querySelectorAll('button[data-i]').forEach(function (b) {
        b.onclick = function () { sel = +b.getAttribute('data-i'); tick(); draw(); };
      });
    }
    draw();
  })();

  /* =====================================================================
     模組地圖
     ===================================================================== */
  (function () {
    var box = $('modmap'); if (!box) return;
    var N = { 1: [70, 60, '偵測手'], 2: [70, 190, '量尺寸'], 3: [230, 120, '判斷手指'], 4: [230, 220, '判斷拇指'],
              10: [230, 310, '手指游標'], 5: [390, 170, '數手指'], 6: [545, 170, '穩定判斷'], 7: [700, 110, '認猜拳'],
              8: [700, 240, '比對手勢'], 9: [855, 110, '猜拳勝負'] };
    var E = [[2, 3], [2, 4], [2, 10], [3, 5], [4, 5], [5, 6], [6, 7], [6, 8], [7, 9]];
    var h = ['<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">' +
      '<path d="M0 0 L10 5 L0 10 z" fill="var(--ink2)"/></marker></defs>'];
    h.push('<line x1="70" y1="82" x2="70" y2="166" stroke="var(--ink2)" stroke-width="2" stroke-dasharray="5 5" marker-end="url(#ar)"/>' +
      '<text x="80" y="128" font-size="12" fill="var(--ink2)">看得到手</text><text x="80" y="143" font-size="12" fill="var(--ink2)">才往下做</text>');
    E.forEach(function (e) {
      var a = N[e[0]], b = N[e[1]];
      h.push('<line x1="' + (a[0] + 62) + '" y1="' + a[1] + '" x2="' + (b[0] - 64) + '" y2="' + b[1] +
        '" stroke="var(--ink2)" stroke-width="2.4" marker-end="url(#ar)"/>');
    });
    Object.keys(N).forEach(function (k) {
      var n = N[k];
      h.push('<a href="#m' + k + '"><g class="mnode"><rect x="' + (n[0] - 62) + '" y="' + (n[1] - 23) + '" width="124" height="46" rx="23" fill="' + MODC[k] + '"/>' +
        '<text x="' + n[0] + '" y="' + (n[1] + 6) + '" font-size="15" font-weight="800" fill="#fff" text-anchor="middle">' + k + '　' + n[2] + '</text></g></a>');
    });
    box.innerHTML = '<svg viewBox="0 0 930 345" role="img" aria-label="模組之間的關係圖">' + h.join('') + '</svg>';
  })();

  /* =====================================================================
     1  偵測手
     ===================================================================== */
  (function () {
    var box = $('lab1'); if (!box) return;
    var sc = 'up';
    var SC = { up: '手立起來', down: '手倒過來', out: '手在畫面外', none: '沒有手' };
    function draw() {
      var P = handPts('11111'), x1, y1, y10, svg = '';
      if (sc === 'none') { x1 = ''; y1 = ''; y10 = ''; }
      else {
        var dx = sc === 'out' ? 580 : 0, fl = sc === 'down';
        x1 = r1(sx(P[1][0] + dx)); y1 = r1(sy(fl ? -P[1][1] : P[1][1])); y10 = r1(sy(fl ? -P[10][1] : P[10][1]));
        if (sc !== 'out') svg = handSVG(P, { hi: [1, 10], label: [1, 10], flip: fl, oy: fl ? 30 : 215 });
      }
      var c1 = x1 !== '' && x1 > -250, c2 = y10 !== '' && y10 > y1, ok = c1 && c2;
      function show(v) { return v === '' ? '<i class="blank">空白</i>' : v; }
      box.innerHTML = '<div class="labrow"><div class="minist">' +
        '<svg viewBox="0 0 230 240">' + (svg || '<text x="115" y="125" text-anchor="middle" font-size="15" fill="var(--ink2)">' +
        (sc === 'out' ? '（手在畫面左邊外面）' : '（鏡頭前沒有手）') + '</text>') + '</svg></div>' +
        '<div class="labout"><div class="seg" role="group">' + Object.keys(SC).map(function (k) {
          return '<button data-k="' + k + '" class="' + (k === sc ? 'on' : '') + '">' + SC[k] + '</button>'; }).join('') + '</div>' +
        '<div class="gate ' + (c1 ? 'y' : 'n') + '"><b>守門 ①</b> 手腕(1) 的 x ＞ −250　→　' + show(x1) + ' ＞ −250　' + (c1 ? '✔ 成立' : '✘ 不成立') + '</div>' +
        '<div class="gate ' + (c2 ? 'y' : 'n') + '"><b>守門 ②</b> 中指第三關節(10) 的 y ＞ 手腕(1) 的 y　→　' + show(y10) + ' ＞ ' + show(y1) + '　' + (c2 ? '✔ 成立' : '✘ 不成立') + '</div>' +
        '<div class="vrow"><span class="vbox ' + (ok ? 'res' : 'dim') + '"><em>看得到手</em>' + (ok ? 1 : 0) + '</span></div>' +
        (sc === 'none' ? '<p class="sm">偵測不到手時，座標積木回傳<b>空白</b>。空白和數字比大小的結果是「不成立」，所以守門 ① 會擋下來。</p>' : '') +
        (sc === 'out' ? '<p class="sm">手的一部分跑到畫面外時，座標會超出舞台（x 小於 −240），守門 ① 一樣擋下來。</p>' : '') +
        (sc === 'down' ? '<p class="sm">手指朝下時「中指掌根比手腕低」，後面「指尖比關節高 ＝ 伸直」的規則會整個相反，所以乾脆不判斷。</p>' : '') +
        '</div></div>';
      box.querySelectorAll('.seg button').forEach(function (b) { b.onclick = function () { sc = b.getAttribute('data-k'); tick(); draw(); }; });
    }
    draw();
  })();

  /* =====================================================================
     2  量尺寸
     ===================================================================== */
  (function () {
    var box = $('lab2'); if (!box) return;
    var s = 1;
    function draw() {
      var P = handPts('11111');
      var L = 105 * 0.75 * s, W = 60 * 0.75 * s;
      var X = function (i) { return 115 + P[i][0] * s; }, Y = function (i) { return 225 + P[i][1] * s; };
      var ruler = '<line x1="' + (X(1) + 58 * s) + '" y1="' + Y(1) + '" x2="' + (X(1) + 58 * s) + '" y2="' + Y(10) + '" stroke="#9966FF" stroke-width="4"/>' +
        '<line x1="' + X(6) + '" y1="' + (Y(6) + 16 * s) + '" x2="' + X(18) + '" y2="' + (Y(6) + 16 * s) + '" stroke="#E07C22" stroke-width="4"/>';
      box.innerHTML = '<div class="labrow"><div class="minist"><svg viewBox="0 0 230 240">' +
        handSVG(P, { s: s, oy: 225, hi: [1, 10, 6, 18], label: s > .7 ? [1, 10, 6, 18] : [] }) + ruler + '</svg></div>' +
        '<div class="labout"><div class="ctrl"><label>手離鏡頭 近 ↔ 遠 <input type="range" id="l2s" min="0.4" max="1.6" step="0.05" value="' + s + '"></label>' +
        '<output>' + s.toFixed(2) + ' 倍</output></div>' +
        '<div class="vrow"><span class="vbox" style="background:#9966FF"><em>手長</em>' + r1(L) + '</span>' +
        '<span class="vbox" style="background:#E07C22"><em>手寬</em>' + r1(W) + '</span>' +
        '<span class="vbox dim"><em>手長 ÷ 手寬</em>' + (L / W).toFixed(2) + '</span></div>' +
        '<table class="pattab" style="margin-top:6px"><tr><th>門檻寫法</th><th>現在的值</th><th>手離遠了還準嗎？</th></tr>' +
        '<tr><td>固定：6</td><td>6</td><td>' + (s < 0.8 ? '<b style="color:var(--no)">✘ 手變小了，6 變得太大</b>' : s > 1.25 ? '<b style="color:var(--no)">✘ 手變大了，6 變得太小</b>' : '✔ 剛好（只有這個距離）') + '</td></tr>' +
        '<tr><td>比例：手長 × 0.08</td><td>' + r1(L * 0.08) + '</td><td><b style="color:var(--ok)">✔ 跟著手一起縮放</b></td></tr></table>' +
        '</div></div>';
      $('l2s').oninput = function () { s = +this.value; draw(); $('l2s').focus(); };
    }
    draw();
  })();

  /* =====================================================================
     3  判斷手指（有遲滯）
     ===================================================================== */
  (function () {
    var box = $('lab3'); if (!box) return;
    var F = { 食: [9, 7, '食指'], 中: [13, 11, '中指'], 無: [17, 15, '無名指'], 小: [21, 19, '小指'] };
    var f = '食', d = 30, state = 1, hist = [];
    var M = 78.75 * 0.08;                     // 餘裕 6.3
    function step(nd) {
      var before = state;
      if (state === 1) { if (nd < -M) state = 0; } else { if (nd > M) state = 1; }
      d = nd;
      hist.push(state); if (hist.length > 40) hist.shift();
      return before;
    }
    function draw(before) {
      var jy = 120, k = 2.4;                   // 畫面：1 單位 = 2.4 px
      var ty = jy - d * k;
      var band = '<rect x="30" y="' + (jy - M * k) + '" width="170" height="' + (2 * M * k) + '" fill="var(--band)"/>';
      var fg = F[f];
      box.innerHTML = '<div class="labrow"><div class="minist"><svg viewBox="0 0 230 240">' + band +
        '<line x1="30" y1="' + jy + '" x2="200" y2="' + jy + '" stroke="#4C97FF" stroke-width="2" stroke-dasharray="6 4"/>' +
        '<text x="226" y="' + (jy - M * k + 4) + '" font-size="10" text-anchor="end" fill="var(--ink2)">＋餘裕</text>' +
        '<text x="226" y="' + (jy + M * k + 4) + '" font-size="10" text-anchor="end" fill="var(--ink2)">−餘裕</text>' +
        '<line x1="115" y1="220" x2="115" y2="' + jy + '" stroke="var(--bone)" stroke-width="16" stroke-linecap="round"/>' +
        '<line x1="115" y1="' + jy + '" x2="115" y2="' + ty + '" stroke="' + (state ? 'var(--ok)' : 'var(--bone)') + '" stroke-width="14" stroke-linecap="round"/>' +
        '<circle cx="115" cy="' + jy + '" r="8" fill="#4C97FF" stroke="#fff" stroke-width="2"/>' +
        '<circle cx="115" cy="' + ty + '" r="9" fill="var(--hi)" stroke="#fff" stroke-width="2"/>' +
        '<text x="128" y="' + (jy + 4) + '" font-size="12" font-weight="800" fill="var(--ink)">關節 (' + fg[1] + ')</text>' +
        '<text x="102" y="' + (ty + 4) + '" font-size="12" font-weight="800" fill="var(--ink)" text-anchor="end">指尖 (' + fg[0] + ')</text></svg></div>' +
        '<div class="labout">' +
        '<div class="seg" role="group">' + Object.keys(F).map(function (k2) {
          return '<button data-f="' + k2 + '" class="' + (k2 === f ? 'on' : '') + '">' + F[k2][2] + '</button>'; }).join('') + '</div>' +
        '<div class="callbox"><span class="sb myblocks">判斷手指 <span class="nv">' + fg[0] + '</span> <span class="nv">' + fg[1] + '</span> <span class="rp variables">' + fg[2] + '</span></span>' +
        '<small>同一塊積木，換成不同的輸入就能判斷不同的手指</small></div>' +
        '<div class="ctrl"><label>指尖比關節高 <input type="range" id="l3d" min="-30" max="30" step="1" value="' + d + '"></label><output>' + d + '</output></div>' +
        '<div class="vrow"><span class="vbox"><em>目前（輸入）</em>' + (before == null ? state : before) + '</span>' +
        '<span class="vbox"><em>餘裕</em>' + r1(M) + '</span>' +
        '<span class="vbox ' + (state ? 'res' : 'dim') + '"><em>手指結果（輸出）</em>' + state + '</span></div>' +
        '<p class="sm">' + (Math.abs(d) <= M ? '<b>在灰色帶子裡：維持原狀。</b>這就是「遲滯」—— 雜訊讓指尖上下抖幾個單位也不會亂跳。'
          : d > 0 ? '指尖在關節上面超過餘裕 → 一定是伸直（1）。' : '指尖在關節下面超過餘裕 → 一定是彎著（0）。') + '</p>' +
        '<div class="histo" aria-label="最近的結果">' + hist.map(function (v) { return '<i class="' + (v ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
        '<div class="btnrow"><button class="btn sm ghost" id="l3n">加一點雜訊（抖 ±5）</button></div>' +
        '</div></div>';
      box.querySelectorAll('.seg button').forEach(function (b) { b.onclick = function () { f = b.getAttribute('data-f'); tick(); draw(); }; });
      $('l3d').oninput = function () { var b = step(+this.value); draw(b); $('l3d').focus(); };
      $('l3n').onclick = function () {
        var base = d, n = 0;
        var id = setInterval(function () { var b = step(Math.round(base + (Math.random() * 10 - 5))); draw(b); if (++n > 14) { clearInterval(id); step(base); draw(); } }, 70);
      };
    }
    step(d); draw();
  })();

  /* =====================================================================
     4  判斷拇指
     ===================================================================== */
  (function () {
    var box = $('lab4'); if (!box) return;
    var tx = -85, ref = 18, state = 1;
    var W = 60;                                // 手寬（像素）
    function calc() {
      var span = Math.abs(tx - (ref === 18 ? 30 : -30));
      var ratio = ref === 18 ? 1.35 : 0.45, thr = W * ratio, mar = W * 0.08;
      if (state === 1) { if (span < thr - mar) state = 0; } else { if (span > thr + mar) state = 1; }
      return { span: span, thr: thr, mar: mar };
    }
    function draw() {
      var c = calc();
      var P = handPts('01111', { over: { 5: [tx, -62], 4: [(tx - 25) / 2 - 10, -58] } });
      var X = function (i) { return 115 + P[i][0]; }, Y = function (i) { return 215 + P[i][1]; };
      var rx = ref === 18 ? X(18) : X(6);
      var truth = tx < -50 ? 1 : 0;
      box.innerHTML = '<div class="labrow"><div class="minist"><svg viewBox="0 0 230 240">' + handSVG(P, { hi: [5, ref], label: [5, 6, 18] }) +
        '<line x1="' + X(5) + '" y1="' + (Y(5) - 26) + '" x2="' + rx + '" y2="' + (Y(5) - 26) + '" stroke="var(--hi)" stroke-width="3"/>' +
        '<line x1="' + X(5) + '" y1="' + (Y(5) - 32) + '" x2="' + X(5) + '" y2="' + (Y(5) - 20) + '" stroke="var(--hi)" stroke-width="3"/>' +
        '<line x1="' + rx + '" y1="' + (Y(5) - 32) + '" x2="' + rx + '" y2="' + (Y(5) - 20) + '" stroke="var(--hi)" stroke-width="3"/></svg></div>' +
        '<div class="labout"><div class="seg" role="group"><button data-r="18" class="' + (ref === 18 ? 'on' : '') + '">量到小指掌根 18（正確）</button>' +
        '<button data-r="6" class="' + (ref === 6 ? 'on' : '') + '">量到食指掌根 6（舊版）</button></div>' +
        '<div class="ctrl"><label>拇指 橫過手掌 ↔ 張開 <input type="range" id="l4x" min="-95" max="25" step="1" value="' + (-tx - 70) + '"></label></div>' +
        '<div class="vrow"><span class="vbox"><em>拇指跨距</em>' + r1(c.span * 0.75) + '</span>' +
        '<span class="vbox"><em>門檻</em>' + r1(c.thr * 0.75) + ' ± ' + r1(c.mar * 0.75) + '</span>' +
        '<span class="vbox ' + (state ? 'res' : 'dim') + '"><em>拇指</em>' + state + '</span></div>' +
        '<div class="meter"><i style="left:' + Math.min(100, c.span / 1.3) + '%"></i><b style="left:' + (c.thr / 1.3) + '%"></b></div>' +
        (state !== truth && Math.abs(c.span - c.thr) > c.mar ?
          '<div class="warn"><b class="t">判斷錯了！</b>拇指實際上是' + (truth ? '張開' : '收起來') + '的，但程式判成 ' + state + '。' +
          (ref === 6 && tx > -20 ? '拇指橫過手掌時，離「食指掌根」反而變遠了。' : '') + '</div>'
          : '<p class="sm">拇指實際上是<b>' + (truth ? '張開' : '收起來') + '</b>的，判斷' + (state === truth ? '<b style="color:var(--ok)">正確</b>' : '在遲滯帶子裡，維持原狀') + '。</p>') +
        '<p class="sm">把拇指一路往右滑到「橫過手掌」，再切換兩種量法比較看看。</p></div></div>';
      box.querySelectorAll('.seg button').forEach(function (b) { b.onclick = function () { ref = +b.getAttribute('data-r'); tick(); draw(); }; });
      $('l4x').oninput = function () { tx = -(+this.value) - 70; draw(); $('l4x').focus(); };
    }
    draw();
  })();

  /* =====================================================================
     可以點的手（模組 5、7、8 共用）
     ===================================================================== */
  function clickHand(box, f, onChange) {
    function paint() {
      var P = handPts(f.join(''));
      var hit = [5, 9, 13, 17, 21];
      var svg = '<svg viewBox="0 0 230 240" class="clickhand">' + handSVG(P, { hi: [], label: [], sx: 1.5, ox: 148 });
      hit.forEach(function (tip, i) {
        var x = 148 + P[tip][0] * 1.5, y = 215 + P[tip][1];
        svg += '<g class="fg" data-f="' + i + '" tabindex="0" role="button" aria-label="' + FN[i] + '指：' + (f[i] ? '伸直' : '彎著') + '">' +
          '<circle cx="' + x + '" cy="' + y + '" r="15" fill="' + (f[i] ? 'var(--ok)' : 'var(--paper)') + '" stroke="var(--ink2)" stroke-width="2" opacity=".92"/>' +
          '<text x="' + x + '" y="' + (y + 5) + '" text-anchor="middle" font-size="13" font-weight="800" fill="' + (f[i] ? '#fff' : 'var(--ink)') + '">' + FN[i] + '</text></g>';
      });
      box.innerHTML = svg + '</svg><div class="handhint">點圓圈把手指伸直／彎下</div>';
      box.querySelectorAll('.fg').forEach(function (g) {
        var go = function () { var i = +g.getAttribute('data-f'); f[i] = f[i] ? 0 : 1; tick(); paint(); onChange(); };
        g.addEventListener('click', go);
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      });
    }
    paint();
    return { set: function (n) { for (var i = 0; i < 5; i++) f[i] = n[i]; paint(); onChange(); } };
  }
  function presetBtns(list) {
    return '<div class="presets">' + list.map(function (p) { return '<button class="btn sm ghost" data-p="' + p[1] + '">' + p[0] + '</button>'; }).join('') + '</div>';
  }
  function bindPresets(box, hand) {
    box.querySelectorAll('.presets button').forEach(function (b) {
      b.onclick = function () { hand.set(b.getAttribute('data-p').split('').map(Number)); };
    });
  }

  /* =====================================================================
     5  數手指
     ===================================================================== */
  (function () {
    var box = $('lab5'); if (!box) return;
    var f = [0, 1, 1, 0, 0];
    box.innerHTML = '<div class="labrow"><div class="minist" id="l5h"></div><div class="labout" id="l5o"></div></div>';
    function out() {
      var p = f.join(''), n = f.reduce(function (a, b) { return a + b; }, 0);
      $('l5o').innerHTML = '<div class="lamps">' + FN.map(function (c, i) {
        return '<div class="lamp' + (f[i] ? ' on' : '') + '"><i>' + (f[i] ? '1' : '0') + '</i><b>' + c + '</b></div>'; }).join('') + '</div>' +
        '<div class="calc"><span>手指數 ＝ ' + f.join(' ＋ ') + ' ＝ <b>' + n + '</b></span>' +
        '<span>指型 ＝ 字串組合 → <b class="code">' + p + '</b></span>' +
        '<span>四指型 ＝ 去掉拇指 → <b class="code">' + p.slice(1) + '</b></span></div>' +
        presetBtns([['拳頭', '00000'], ['比 1', '01000'], ['比 2', '01100'], ['比 3', '01110'], ['比 4', '01111'], ['比 5', '11111']]) +
        '<p class="sm">同樣是「2 根」，<b class="code">01100</b>（食中）和 <b class="code">11000</b>（拇食）手指數一樣，指型卻不同 —— 想知道是<b>哪幾根</b>，就要看指型。</p>';
      bindPresets($('l5o'), hand);
    }
    var hand = clickHand($('l5h'), f, out);
    out();
  })();

  /* =====================================================================
     6  穩定判斷：時間軸模擬
     ===================================================================== */
  (function () {
    var box = $('lab6'); if (!box) return;
    var sc = 'noise', thr = 0.15, tol = 0.4, useStable = true;
    var SC = { clean: '乾淨的訊號', noise: '雜訊抖動', drop: '偶爾掉格', leave: '手離開', change: '換手勢' };
    function rnd(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
    function raw() {
      var R = rnd(7), fr = [], n = 90;               // 90 格 × 33 ms ≈ 3 秒
      for (var i = 0; i < n; i++) {
        var t = i / 30, v = 2, seen = true;
        if (sc === 'noise') v = R() < 0.28 ? (R() < 0.5 ? 1 : 3) : 2;
        if (sc === 'drop') seen = !(R() < 0.18);
        if (sc === 'leave') seen = t < 1.2;
        if (sc === 'change') v = t < 1.4 ? 2 : (R() < 0.15 ? 2 : 4);
        fr.push({ v: v, seen: seen });
      }
      return fr;
    }
    function sim(fr) {
      var last = null, st = 0, conf = -1, lost = 0, out = [];
      for (var i = 0; i < fr.length; i++) {
        var t = i / 30, x = fr[i];
        if (!useStable) { out.push(x.seen ? x.v : -1); continue; }
        if (x.seen) {
          lost = t;
          if (x.v === last) { if (t - st > thr) conf = x.v; }
          else { st = t; last = x.v; }
        } else if (t - lost > tol) { conf = -1; last = null; st = t; }
        out.push(conf);
      }
      return out;
    }
    function draw() {
      var fr = raw(), o = sim(fr);
      var want = fr.map(function (x, i) { return sc === 'leave' && i / 30 > 1.2 ? -1 : sc === 'change' && i / 30 > 1.4 ? 4 : 2; });
      var flips = 0; for (var i = 1; i < o.length; i++) if (o[i] !== o[i - 1]) flips++;
      var right = 0; for (i = 0; i < o.length; i++) if (o[i] === want[i]) right++;
      var cell = function (v) { return '<i class="c' + (v < 0 ? 'x' : v) + '">' + (v < 0 ? '' : v) + '</i>'; };
      box.innerHTML = '<div class="seg" role="group">' + Object.keys(SC).map(function (k) {
        return '<button data-k="' + k + '" class="' + (k === sc ? 'on' : '') + '">' + SC[k] + '</button>'; }).join('') + '</div>' +
        '<div class="ctrl"><label>穩定門檻 <input type="range" id="l6a" min="0" max="0.6" step="0.05" value="' + thr + '"></label><output>' + thr.toFixed(2) + ' 秒</output>' +
        '<label>掉格容忍 <input type="range" id="l6b" min="0" max="1" step="0.1" value="' + tol + '"></label><output>' + tol.toFixed(1) + ' 秒</output>' +
        '<label><input type="checkbox" id="l6c"' + (useStable ? ' checked' : '') + '> 使用穩定判斷</label></div>' +
        '<div class="tl"><div class="tlr"><b>攝影機每一格<br><small>（手指數）</small></b><div class="cells">' +
        fr.map(function (x) { return cell(x.seen ? x.v : -1); }).join('') + '</div></div>' +
        '<div class="tlr"><b>' + (useStable ? '確定手指數' : '直接用手指數') + '</b><div class="cells">' + o.map(cell).join('') + '</div></div>' +
        '<div class="tlaxis"><span>0 秒</span><span>1 秒</span><span>2 秒</span><span>3 秒</span></div></div>' +
        '<div class="vrow"><span class="vbox"><em>跳動次數</em>' + flips + '</span><span class="vbox ' + (right / o.length > .85 ? 'res' : 'dim') + '"><em>和正確答案一致</em>' + Math.round(right / o.length * 100) + '%</span></div>' +
        '<p class="sm">灰色 ＝ 那一格沒抓到手（或已清空）。' + (sc === 'change' ? '換手勢時，「確定」會晚一點點才跟上 —— 穩定門檻越大越穩，但也越慢。' :
          sc === 'drop' ? '把「掉格容忍」拉到 0 看看：每掉一格就清空，玩家會覺得遊戲沒反應。' :
          sc === 'leave' ? '手真的離開後，要等「掉格容忍」這麼久才清空。' :
          sc === 'noise' ? '取消「使用穩定判斷」看看，數字會跳得多厲害。' : '訊號乾淨時，只差在一開始要等 0.15 秒。') + '</p>';
      box.querySelectorAll('.seg button').forEach(function (b) { b.onclick = function () { sc = b.getAttribute('data-k'); tick(); draw(); }; });
      $('l6a').oninput = function () { thr = +this.value; draw(); $('l6a').focus(); };
      $('l6b').oninput = function () { tol = +this.value; draw(); $('l6b').focus(); };
      $('l6c').onchange = function () { useStable = this.checked; draw(); };
    }
    draw();
  })();

  /* =====================================================================
     7  認猜拳
     ===================================================================== */
  (function () {
    var box = $('lab7'); if (!box) return;
    var f = [1, 1, 1, 0, 0];
    box.innerHTML = '<div class="labrow"><div class="minist" id="l7h"></div><div class="labout" id="l7o"></div></div>';
    function out() {
      var q = f.slice(1).join(''), n = { '0000': 1, '1100': 2, '1111': 3 }[q] || 0;
      var rows = [['0000', 1], ['1100', 2], ['1111', 3], ['其他', 0]];
      $('l7o').innerHTML = '<div class="vrow"><span class="vbox code"><em>確定四指型</em>' + q + '</span>' +
        '<span class="vbox ' + (n ? 'res' : 'dim') + '"><em>猜拳號</em>' + n + '　' + RPS_E[n] + ' ' + RPS[n] + '</span></div>' +
        '<table class="pattab"><tr><th>四指型</th><th>猜拳號</th></tr>' + rows.map(function (r) {
          var on = r[1] === n; return '<tr class="' + (on ? 'yes' : 'no') + '"><td class="code">' + r[0] + '</td><td>' + r[1] + '　' + RPS_E[r[1]] + ' ' + RPS[r[1]] + '</td></tr>'; }).join('') + '</table>' +
        presetBtns([['石頭', '00000'], ['剪刀（拇指收）', '01100'], ['剪刀（拇指翹）', '11100'], ['布', '11111'], ['比 3', '01110']]) +
        '<p class="sm">點拇指開開關關看看：猜拳號都不會變。因為比剪刀時，有人拇指收、有人拇指翹，所以<b>故意不看拇指</b>。</p>';
      bindPresets($('l7o'), hand);
    }
    var hand = clickHand($('l7h'), f, out);
    out();
  })();

  /* =====================================================================
     8  比對手勢
     ===================================================================== */
  (function () {
    var box = $('lab8'); if (!box) return;
    var f = [1, 1, 0, 0, 1], target = '11001';
    var G = [['石頭', '?0000'], ['剪刀', '?1100'], ['布', '?1111'], ['我愛你', '11001'], ['搖滾', '01001'],
             ['打電話', '10001'], ['手槍', '11000'], ['比一', '01000']];
    function match(code, p) {
      var same = 0;
      for (var i = 0; i < 5; i++) if (code[i] === '?' || code[i] === p[i]) same++;
      return same === 5;
    }
    box.innerHTML = '<div class="labrow"><div class="minist" id="l8h"></div><div class="labout" id="l8o"></div></div>' +
      '<h4 style="margin:14px 0 4px">認手勢：把清單一個一個拿去比</h4><div id="l8g"></div>';
    function out() {
      var p = f.join(''), same = 0, cells = '';
      for (var i = 0; i < 5; i++) {
        var t = target[i] || '', ok = t === '?' || t === p[i];
        if (ok) same++;
        cells += '<div class="cmp ' + (ok ? 'y' : 'n') + '"><small>第 ' + (i + 1) + ' 字・' + FN[i] + '</small><b>' + esc(t || '·') + '</b><span>' + p[i] + '</span><em>' + (t === '?' ? '不管' : ok ? '相同' : '不同') + '</em></div>';
      }
      var ok5 = same === 5 && target.length === 5;
      $('l8o').innerHTML = '<div class="ctrl"><label>目標 <input id="l8t" class="codein" maxlength="5" value="' + esc(target) + '" autocomplete="off" spellcheck="false"></label>' +
        '<span class="sm">只能打 0、1、?</span></div>' +
        '<div class="cmprow"><div class="cmplab"><small>&nbsp;</small><b>目標</b><span>確定指型</span><em>&nbsp;</em></div>' + cells + '</div>' +
        '<div class="vrow"><span class="vbox"><em>相同數</em>' + same + '</span><span class="vbox ' + (ok5 ? 'res' : 'dim') + '"><em>符合</em>' + (ok5 ? 1 : 0) + '</span></div>';
      var inp = $('l8t');
      inp.oninput = function () {
        var v = this.value.replace(/[^01?？]/g, '').replace(/？/g, '?').slice(0, 5); target = v;
        var pos = this.selectionStart; out(); var n = $('l8t'); n.focus(); n.setSelectionRange(pos, pos);
      };
      var first = -1;
      G.forEach(function (g, i) { if (first < 0 && match(g[1], p)) first = i; });
      $('l8g').innerHTML = '<table class="pattab"><tr><th>#</th><th>手勢名稱</th><th>手勢密碼</th><th>比對結果</th></tr>' +
        G.map(function (g, i) {
          var m = match(g[1], p);
          return '<tr class="' + (i === first ? 'yes' : 'no') + '"><td>' + (i + 1) + '</td><td>' + esc(g[0]) + '</td><td class="code">' + esc(g[1]) + '</td><td>' +
            (i === first ? '<b>✔ 第一個符合 → 認出手勢</b>' : m ? '符合（但前面已經找到了）' : '—') + '</td></tr>'; }).join('') + '</table>' +
        '<div class="vrow" style="margin-top:8px"><span class="vbox res"><em>認出手勢</em>' + (first >= 0 ? esc(G[first][0]) : '（沒有）') + '</span></div>' +
        '<div class="ctrl"><label>新手勢名稱 <input id="l8n" class="namein" maxlength="6" placeholder="例如：OK"></label>' +
        '<label>密碼 <input id="l8c" class="codein" maxlength="5" placeholder="例如：0?111"></label>' +
        '<button class="btn sm" id="l8a">加到清單</button></div>';
      $('l8a').onclick = function () {
        var n = $('l8n').value.trim(), c = $('l8c').value.replace(/？/g, '?');
        if (!n || !/^[01?]{5}$/.test(c)) { $('l8c').focus(); beep(160, .2, 'square'); return; }
        G.push([n, c]); ding(); out();
      };
    }
    var hand = clickHand($('l8h'), f, out);
    out();
  })();

  /* =====================================================================
     9  猜拳勝負
     ===================================================================== */
  (function () {
    var box = $('lab9'); if (!box) return;
    var me = 1, op = 2;
    function res(a, b) { return a === b ? '平手' : (a % 3) + 1 === b ? '贏' : '輸'; }
    function draw() {
      var r = res(me, op), m = me % 3;
      box.innerHTML = '<div class="picks">' + [['我', me, 'me'], ['對方', op, 'op']].map(function (x) {
        return '<div class="pick"><h4>' + x[0] + '</h4>' + [1, 2, 3].map(function (i) {
          return '<button data-w="' + x[2] + '" data-i="' + i + '" class="' + (x[1] === i ? 'sel' : '') + '">' + RPS_E[i] + '<br><small>' + i + ' ' + RPS[i] + '</small></button>'; }).join('') + '</div>';
      }).join('') + '</div>' +
        '<div class="formula"><div>' + (me === op ? '① 我 ＝ 對方（' + me + ' ＝ ' + op + '）→ <b>平手</b>' :
          '① 我 ≠ 對方<br>② 我 ÷ 3 的餘數 ＝ ' + me + ' ÷ 3 的餘數 ＝ <b>' + m + '</b><br>③ 餘數 ＋ 1 ＝ <b>' + (m + 1) + '</b><br>④ ' + (m + 1) + (m + 1 === op ? ' ＝ ' : ' ≠ ') + '對方（' + op + '）→ <b>' + r + '</b>') + '</div>' +
        '<div class="bigres r' + (r === '贏' ? 'w' : r === '輸' ? 'l' : 't') + '">' + r + '</div></div>' +
        '<table class="pattab rpst"><tr><th>我＼對方</th>' + [1, 2, 3].map(function (j) { return '<th>' + RPS_E[j] + ' ' + j + '</th>'; }).join('') + '</tr>' +
        [1, 2, 3].map(function (i) {
          return '<tr><th>' + RPS_E[i] + ' ' + i + '</th>' + [1, 2, 3].map(function (j) {
            return '<td class="' + (i === me && j === op ? 'cur' : '') + '">' + res(i, j) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
      box.querySelectorAll('.pick button').forEach(function (b) {
        b.onclick = function () { var i = +b.getAttribute('data-i'); if (b.getAttribute('data-w') === 'me') me = i; else op = i; tick(); draw(); };
      });
    }
    draw();
  })();

  /* =====================================================================
     10  手指游標：拖拖看
     ===================================================================== */
  (function () {
    var box = $('lab10'); if (!box) return;
    var L = 78.75, K = 3;                       // 手長（Scratch 單位）；畫面 1 單位 = 3 px
    var pin = 0, cnt = 0;
    var T = { x: 40, y: 150 }, I = { x: 170, y: 70 };   // 拇指尖、食指尖（px）
    box.innerHTML = '<div class="labrow"><div class="pinchbox" id="l10b"><svg viewBox="0 0 240 240" id="l10s"></svg></div><div class="labout" id="l10o"></div></div>';
    var svg = $('l10s');
    function dist() { return (Math.abs(T.x - I.x) + Math.abs(T.y - I.y)) / K; }
    function update() {
      var d = dist(), a = L * 0.25, b = L * 0.4, ev = false;
      if (pin === 1) { if (d > b) pin = 0; } else if (d < a) { pin = 1; cnt++; ev = true; }
      var dia = function (r, col, dash) { r *= K; return '<path d="M' + I.x + ' ' + (I.y - r) + ' L' + (I.x + r) + ' ' + I.y + ' L' + I.x + ' ' + (I.y + r) + ' L' + (I.x - r) + ' ' + I.y + ' Z" fill="none" stroke="' + col + '" stroke-width="2"' + (dash ? ' stroke-dasharray="5 4"' : '') + '/>'; };
      svg.innerHTML = dia(b, 'var(--ink2)', 1) + dia(a, 'var(--hi)', 0) +
        '<path d="M' + T.x + ' ' + T.y + ' L' + I.x + ' ' + T.y + ' L' + I.x + ' ' + I.y + '" fill="none" stroke="#2BA5C9" stroke-width="2.5"/>' +
        '<g class="drag" data-p="T"><circle cx="' + T.x + '" cy="' + T.y + '" r="14" fill="#FF8C1A" stroke="#fff" stroke-width="3"/><text x="' + T.x + '" y="' + (T.y + 4) + '" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">拇 5</text></g>' +
        '<g class="drag" data-p="I"><circle cx="' + I.x + '" cy="' + I.y + '" r="14" fill="' + (pin ? '#FF3B7A' : '#2BA5C9') + '" stroke="#fff" stroke-width="3"/><text x="' + I.x + '" y="' + (I.y + 4) + '" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">食 9</text></g>';
      $('l10o').innerHTML = '<p class="sm" style="margin-top:0">拖動兩個圓點。<b>菱形</b>是門檻：用「橫的距離＋直的距離」量，等距離的點排起來就是菱形。</p>' +
        '<div class="vrow"><span class="vbox"><em>捏距</em>' + r1(d) + '</span><span class="vbox dim"><em>捏合門檻（實線）</em>' + r1(a) + '</span><span class="vbox dim"><em>放開門檻（虛線）</em>' + r1(b) + '</span></div>' +
        '<div class="vrow"><span class="vbox ' + (pin ? 'res' : 'dim') + '"><em>捏合</em>' + pin + '</span><span class="vbox"><em>捏的次數</em>' + cnt + '</span>' +
        '<span class="vbox flash' + (ev ? ' go' : '') + '" style="background:var(--c-events)"><em>廣播</em>捏一下！</span></div>' +
        '<p class="sm">試試看：捏住以後，只放開一點點（在兩個菱形中間）→ 還是「捏住」；要拉到虛線外面才算放開。<br>游標的位置 ＝ 食指尖 (9)。</p>';
      if (ev) ding();
    }
    var drag = null;
    function pt(e) { var r = svg.getBoundingClientRect(); return { x: Math.max(10, Math.min(230, (e.clientX - r.left) / r.width * 240)), y: Math.max(10, Math.min(230, (e.clientY - r.top) / r.height * 240)) }; }
    svg.addEventListener('pointerdown', function (e) {
      var g = e.target.closest('.drag'); if (!g) return;
      drag = g.getAttribute('data-p') === 'T' ? T : I; svg.setPointerCapture(e.pointerId); e.preventDefault();
    });
    svg.addEventListener('pointermove', function (e) { if (!drag) return; var p = pt(e); drag.x = p.x; drag.y = p.y; update(); });
    svg.addEventListener('pointerup', function () { drag = null; });
    svg.addEventListener('pointercancel', function () { drag = null; });
    update();
  })();

  /* =====================================================================
     自我檢核（存在這台電腦的瀏覽器裡）
     ===================================================================== */
  (function () {
    var KEY = 'gesture-modules-check-v1', st = {};
    try { st = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { st = {}; }
    var boxes = document.querySelectorAll('.chklist input[type=checkbox]');
    function prog() {
      var n = 0; boxes.forEach(function (b) { if (b.checked) n++; });
      var bar = $('pbar'); if (bar) bar.style.width = (boxes.length ? n / boxes.length * 100 : 0) + '%';
      var t = $('ptxt'); if (t) t.textContent = n + ' / ' + boxes.length;
    }
    boxes.forEach(function (b, i) {
      var id = b.id || ('c' + i);
      b.checked = !!st[id];
      b.addEventListener('change', function () {
        st[id] = b.checked;
        try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* 存不了也沒關係 */ }
        prog();
      });
    });
    prog();
  })();

  /* ---------- 小測驗 ---------- */
  document.querySelectorAll('.qz').forEach(function (q) {
    q.querySelectorAll('.ops button').forEach(function (b) {
      b.onclick = function () {
        if (q.classList.contains('done')) return;
        q.classList.add('done');
        q.querySelectorAll('.ops button').forEach(function (x) { if (x.hasAttribute('data-r')) x.classList.add('r'); });
        if (!b.hasAttribute('data-r')) { b.classList.add('w'); beep(160, .2, 'square'); } else ding();
      };
    });
  });

  /* ---------- 目錄：捲動時標示目前章節 ---------- */
  (function () {
    var links = document.querySelectorAll('.toc a[href^="#"]');
    if (!('IntersectionObserver' in window) || !links.length) return;
    var map = {}; links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && map[e.target.id]) {
          links.forEach(function (a) { a.classList.remove('on'); }); map[e.target.id].classList.add('on');
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    document.querySelectorAll('section.chap').forEach(function (s) { io.observe(s); });
  })();
})();
