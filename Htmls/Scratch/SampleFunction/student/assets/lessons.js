/* =========================================================
   lessons.js — Scratch 函式庫：積木圖、函式地圖、9 個試玩台、自我檢核、小測驗
   試玩台的函式都照 .sb3 的積木一句一句翻成 JavaScript（數字、順序都一樣），
   按下按鈕時也會顯示「在 Scratch 裡等於呼叫哪一塊積木」。
   ========================================================= */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var F = (window.LIB_FUNCS || { funcs: [], cats: {} });
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmt(x) { var n = Number(x); if (String(x).trim() === '' || isNaN(n)) return String(x); return String(Math.round(n * 1e6) / 1e6); }
  function fn(id) { return F.funcs.filter(function (f) { return f.id === id; })[0]; }

  /* ---------- 小音效 ---------- */
  var AC = null;
  function beep(f, d, type, vol) {
    try {
      if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
      var t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(vol || 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + (d || 0.12));
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + (d || 0.12) + 0.02);
    } catch (e) { /* 沒有音效也沒關係 */ }
  }
  var tick = function () { beep(1200, 0.03, 'square', 0.03); };
  var ding = function () { beep(988, 0.08); setTimeout(function () { beep(1319, 0.14); }, 70); };

  /* =====================================================================
     積木圖：data-sb="檔案|角色|程式"（資料來自 blocks_data.js，從 .sb3 轉出）
     ===================================================================== */
  function renderBlocks(root) {
    (root || document).querySelectorAll('[data-sb]').forEach(function (el) {
      var k = el.getAttribute('data-sb').split('|');
      var file = (window.SB3_BLOCKS || {})[k[0]] || {};
      var s = file[k[1] + '|' + k.slice(2).join('|')];
      if (s) BLK.render(el, s);
      else el.textContent = '（找不到積木：' + el.getAttribute('data-sb') + '）';
    });
  }
  renderBlocks();

  /* 「等於呼叫這塊積木」：把 proccode 的 %s 換成這次的輸入 */
  function callHTML(id, args) {
    var f = fn(id), k = 0;
    var parts = f.code.split(' ').map(function (w) {
      if (w !== '%s') return '<span class="tx">' + esc(w) + '</span>';
      var v = args[k++]; return '<span class="nv sv">' + esc(fmt(v)) + '</span>';
    });
    return '<span class="sb myblocks">' + parts.join('') + '</span>';
  }
  function svcHTML(id, args) {        // B 型：角色這樣用
    var f = fn(id), h = '';
    args.forEach(function (a, i) { h += '<span class="sb variables">變數 <span class="dd">參數' + (i + 1) + ' <i>▾</i></span> 設為 <span class="nv sv">' + esc(fmt(a)) + '</span></span>'; });
    h += '<span class="sb events">廣播訊息 <span class="dd">' + esc(f.msg) + ' <i>▾</i></span> 並等待</span>';
    return h;
  }
  function showCall(el, id, args) {
    if (!el) return;
    var f = fn(id);
    el.innerHTML = '<em>' + (f.type === 'B' ? '舞台上等於呼叫' : '等於呼叫') + '</em>' + callHTML(id, args || []) +
      (f.type === 'B' && f.msg ? '<em>角色要用的話</em><div class="svc">' + svcHTML(id, args || []) + '</div>' : '');
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }

  /* ---------- 小元件 ---------- */
  function num(el) { return Number(el.value); }
  function rng(label, id, min, max, step, val, unit) {
    return '<label class="rg"><span>' + label + '</span><input type="range" id="' + id + '" min="' + min + '" max="' + max +
      '" step="' + step + '" value="' + val + '"><output id="' + id + 'o">' + val + '</output>' + (unit || '') + '</label>';
  }
  function bindRange(id, cb) {
    var r = $(id), o = $(id + 'o');
    var up = function () { if (o) o.textContent = r.value; if (cb) cb(); };
    r.addEventListener('input', up); up();
  }
  function vbox(label, id) { return '<span class="vbox"><em>' + label + '</em><b id="' + id + '">—</b></span>'; }
  function set(id, v) { var e = $(id); if (e) e.textContent = v; }

  /* =====================================================================
     A 型函式（照 .sb3 翻譯）：s ＝ 角色，t ＝ 這次程式的代號（停止用）
     ===================================================================== */
  var A = {
    typewriter: async function (st, s, t, text, per) {
      var c = '', p = 0; text = String(text);
      for (var i = 0; i < text.length; i++) { p++; c += text.charAt(p - 1); s.say(c); tick(); await st.wait(per, t); }
    },
    subtitle: async function (st, out, t, text, per) {
      var c = '', p = 0; text = String(text); out('');
      for (var i = 0; i < text.length; i++) { p++; c += text.charAt(p - 1); out(c); tick(); await st.wait(per, t); }
    },
    fadeIn: async function (st, s, t, sec) {
      s.ghost = 100; s.visible = true; var a = st.timer();
      while (!(st.timer() - a > sec)) { s.ghost = 100 - 100 * ((st.timer() - a) / sec); await st.frame(t); }
      s.ghost = 0;
    },
    fadeOut: async function (st, s, t, sec) {
      s.ghost = 0; var a = st.timer();
      while (!(st.timer() - a > sec)) { s.ghost = 100 * ((st.timer() - a) / sec); await st.frame(t); }
      s.visible = false; s.ghost = 0;
    },
    pop: async function (st, s, t, size) {
      s.setSize(0); s.visible = true; var a = st.timer();
      while (!(st.timer() - a > 0.2)) { s.setSize(size * 1.2 * ((st.timer() - a) / 0.2)); await st.frame(t); }
      a = st.timer();
      while (!(st.timer() - a > 0.1)) { s.setSize(size * (1.2 - 0.2 * ((st.timer() - a) / 0.1))); await st.frame(t); }
      s.setSize(size);
    },
    shrink: async function (st, s, t, sec) {
      var o = s.size, a = st.timer();
      while (!(st.timer() - a > sec)) { s.setSize(o * (1 - (st.timer() - a) / sec)); await st.frame(t); }
      s.visible = false; s.setSize(o);
    },
    drop: async function (st, s, t, gy) {
      s.setY(170); s.visible = true; var v = 0;
      while (!(v === 0 && s.y === gy)) {
        v += -1.2; s.setY(s.y + v);
        if (s.y < gy) { s.setY(gy); v = v * -0.55; if (v < 2) v = 0; }
        await st.frame(t);
      }
    },
    slide: async function (st, s, t, dir, sec) {
      var X = s.x, Y = s.y;
      if (dir === '左') s.goto(-300, Y);
      if (dir === '右') s.goto(300, Y);
      if (dir === '上') s.goto(X, 240);
      if (dir === '下') s.goto(X, -240);
      s.visible = true;
      var x0 = s.x, y0 = s.y, a = st.timer();          // 內建「滑行」：照時間算位置
      while (st.timer() - a < sec) { var k = (st.timer() - a) / sec; s.goto(x0 + (X - x0) * k, y0 + (Y - y0) * k); await st.frame(t); }
      s.goto(X, Y);
    },
    shake: async function (st, s, t, n, d) {
      var o = s.x;
      for (var i = 0; i < n; i++) { s.setX(o + d); await st.wait(0.03, t); s.setX(o - d); await st.wait(0.03, t); }
      s.setX(o);
    },
    blink: async function (st, s, t, n, gap) {
      for (var i = 0; i < n; i++) { s.visible = false; await st.wait(gap, t); s.visible = true; await st.wait(gap, t); }
    },
    sine: async function (st, s, t, sec, amp, get, setf, speed) {
      var o = get(), a = st.timer();
      while (!(st.timer() - a > sec)) { setf(o + amp * Math.sin((st.timer() - a) * speed * Math.PI / 180)); await st.frame(t); }
      setf(o);
    },
    gotoCostume: function (s, n) { for (var i = 0; i < 50; i++) if (s.costumeNo() !== Number(n)) s.next(); },
    anim: async function (st, s, t, first, last, per) {
      A.gotoCostume(s, first);
      for (var i = 0; i < last - first; i++) { await st.wait(per, t); s.next(); }
      await st.wait(per, t);
    },
    reset: function (s) { s.clearFx(); s.setSize(100); s.dir = 90; s.say(''); s.visible = true; s.front(); },
    randPos: function (s, m) {
      var r = function (a, b) { return Math.round(a + Math.random() * (b - a)); };
      s.goto(r(m - 240, 240 - m), r(m - 180, 180 - m));
    },
    fence: function (s, m) {
      var R = 240 - m, U = 180 - m;
      if (s.x > R) s.setX(R); if (s.x < -R) s.setX(-R); if (s.y > U) s.setY(U); if (s.y < -U) s.setY(-U);
    },
    follow: function (s, tx, ty, k) { s.setX(s.x + (tx - s.x) * k); s.setY(s.y + (ty - s.y) * k); },
  };

  /* B 型函式（照舞台上的積木翻譯）：回傳「結果」 */
  var Bf = {
    cut: function (text, a, b) { var r = '', p = Number(a); text = String(text); for (var i = 0; i < b - a + 1; i++) { r += text.charAt(p - 1) || ''; p++; } return r; },
    pad: function (n, d) { var r = String(n); while (r.length < Number(d)) r = '0' + r; return r; },
    mmss: function (sec) { var m = Bf.pad(Math.floor(sec / 60), 2); var s = Bf.pad(Math.floor(((sec % 60) + 60) % 60), 2); return m + ':' + s; },
    clamp: function (v, a, b) { var r = v; if (v < a) r = a; if (v > b) r = b; return r; },
    dist: function (x1, y1, x2, y2) { return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)); },
    inRange: function (v, a, b) { return (!(v < a) && !(v > b)) ? 1 : 0; },
    round: function (v, d) { var k = Math.pow(10, d); return Math.round(v * k) / k; },
  };
  // Scratch 的「四捨五入」是 JavaScript 的 Math.round（.5 往上）；負數的 −2.5 → −2，和 Scratch 一樣。

  /* =====================================================================
     試玩台 0：勾不勾「執行時不重新整理畫面」
     ===================================================================== */
  var LABS = {};
  LABS[0] = function (el) {
    el.innerHTML = '<p class="sm" style="margin-top:0">兩塊一模一樣的自訂積木：<b>重複 120 次：x 改變 3</b>。只差在有沒有勾選「執行時不重新整理畫面」。</p>' +
      '<div class="warpbox">' +
      '<div><h4>沒有勾（畫面一格一格更新）</h4><div class="track"><i id="w0a"></i></div><div class="sm" id="w0at">—</div></div>' +
      '<div><h4>有勾（一口氣算完再畫）</h4><div class="track"><i id="w0b"></i></div><div class="sm" id="w0bt">—</div></div></div>' +
      '<div class="btnrow" style="margin-top:10px"><button class="btn" id="w0go">▶ 兩個一起跑</button></div>' +
      '<p class="sm">沒勾的那一個，每跑一圈就讓畫面更新一次（一秒大約 30 次），所以看得到它慢慢走；有勾的那一個，整塊積木在一瞬間算完，你只會看到結果。' +
      '<br><b>動畫函式不要勾</b>（要讓人看見過程）；<b>計算函式要勾</b>（越快越好，而且不會算到一半被別的程式讀到）。</p>';
    var a = $('w0a'), b = $('w0b');
    $('w0go').onclick = function () {
      var x = 0, t0 = performance.now(), frames = 0;
      a.style.left = '0%'; b.style.left = '0%';
      requestAnimationFrame(function () { b.style.left = '100%'; set('w0bt', '1 格畫面就到了'); });
      (function step() {
        if (x >= 120) { set('w0at', '用了 ' + frames + ' 格畫面（約 ' + ((performance.now() - t0) / 1000).toFixed(1) + ' 秒）'); return; }
        x++; frames++; a.style.left = (x / 120 * 100) + '%'; setTimeout(function () { requestAnimationFrame(step); }, 1000 / 30 - 16);
      })();
    };
  };

  /* =====================================================================
     試玩台 1：文字與對話
     ===================================================================== */
  LABS[1] = function (el) {
    el.innerHTML = '<div class="labrow"><div class="stagecol"><div id="s1"></div><div class="subt" id="s1sub"></div></div>' +
      '<div class="labout">' +
      '<label class="tin">文字 <input id="t1" value="嗨！我是圓圓。打字機效果會讓字一個一個出現。"></label>' +
      rng('每字秒數', 'sp1', 0.02, 0.3, 0.02, 0.06) +
      '<div class="btnrow"><button class="btn" id="b11">1-1 打字機說</button><button class="btn" id="b12">1-2 打字機字幕</button>' +
      '<button class="btn" id="b13">1-3 播放對話</button><button class="btn ghost" id="b1x">■ 停止</button></div>' +
      '<details class="dlg"><summary>劇本（清單「對話角色」「對話內容」）</summary><textarea id="dl1" rows="4">圓圓：方方，你知道什麼是「函式」嗎？\n方方：就是把一段程式包起來，取一個名字！\n圓圓：那要用的時候呢？\n方方：喊它的名字就好，還可以給它不同的輸入。</textarea>' +
      '<p class="sm">一行一句，「：」前面是說話的角色。改完再按一次「播放對話」。</p></details>' +
      '<div class="callbox" id="c1"></div></div></div>' +
      '<div class="calcs"><div class="calc"><h4>1-4 取出片段</h4><div class="crow"><input id="k1" value="Scratch函式庫" size="12"> 從 <input id="k2" type="number" value="1" class="n"> 到 <input id="k3" type="number" value="7" class="n"></div><div class="res">結果：<b id="k4"></b></div><div class="ltrs" id="k5"></div></div>' +
      '<div class="calc"><h4>1-5 補零</h4><div class="crow"><input id="p1" type="number" value="7" class="n"> 補到 <input id="p2" type="number" value="3" class="n"> 位</div><div class="res">結果：<b id="p3"></b></div><p class="sm" id="p4"></p></div></div>';
    var st = new MS.Stage($('s1'));
    var y = st.add({ name: '圓圓', costumes: ['yy1'], x: -140, y: -80, cx: 56, cy: 62 });
    var f = st.add({ name: '方方', costumes: ['ff'], w: 104, h: 100, x: 90, y: -100 });
    var out = function (t) { $('s1sub').textContent = t; $('s1sub').style.visibility = t ? '' : 'hidden'; };
    out('');
    var per = function () { return num($('sp1')); };
    bindRange('sp1');
    $('b11').onclick = function () {
      st.stopAll(); showCall($('c1'), '1-1', [$('t1').value, per()]);
      st.run(function (t) { return A.typewriter(st, y, t, $('t1').value, per()); });
    };
    $('b12').onclick = function () {
      st.stopAll(); showCall($('c1'), '1-2', [$('t1').value, per()]);
      st.run(function (t) { return A.subtitle(st, out, t, $('t1').value, per()); });
    };
    $('b13').onclick = function () {
      st.stopAll(); y.say(''); f.say(''); showCall($('c1'), '1-3', []);
      var lines = $('dl1').value.split('\n').map(function (l) { var i = l.search(/[:：]/); return i < 0 ? null : [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }).filter(Boolean);
      st.run(async function (t) {
        for (var i = 0; i < lines.length; i++) {
          var who = lines[i][0], line = lines[i][1];
          // 廣播「說台詞」並等待：輪到的角色打字，其他角色清掉對話框
          var jobs = [y, f].map(function (s) { return s.name === who ? A.typewriter(st, s, t, line, per()) : (s.say(''), null); });
          await Promise.all(jobs); await st.wait(0.8, t);
        }
        y.say(''); f.say('');                               // 廣播「對話結束」
      });
    };
    $('b1x').onclick = function () { st.stopAll(); };
    function cut() {
      var r = Bf.cut($('k1').value, num($('k2')), num($('k3')));
      set('k4', r === '' ? '（空白）' : r);
      var s = $('k1').value, a = num($('k2')), b = num($('k3'));
      $('k5').innerHTML = s.split('').map(function (ch, i) { var on = i + 1 >= a && i + 1 <= b; return '<span class="' + (on ? 'on' : '') + '"><small>' + (i + 1) + '</small>' + esc(ch) + '</span>'; }).join('');
    }
    function pad() {
      var r = Bf.pad($('p1').value, num($('p2')));
      set('p3', r);
      $('p4').innerHTML = '在 Scratch 裡，<code>' + esc(r) + ' = ' + esc($('p1').value) + '</code> 用「＝」比會是 <b>' + (Number(r) === Number($('p1').value) ? '成立' : '不成立') + '</b>' +
        (Number(r) === Number($('p1').value) && r !== $('p1').value ? '（兩邊都長得像數字，就當數字比）' : '') + '。';
    }
    ['k1', 'k2', 'k3'].forEach(function (i) { $(i).addEventListener('input', cut); });
    ['p1', 'p2'].forEach(function (i) { $(i).addEventListener('input', pad); });
    cut(); pad();
  };

  /* =====================================================================
     試玩台 2、3：出場退場、持續特效
     ===================================================================== */
  function readout(st, s, pre) {
    st.onframe.push(function () {
      set(pre + 'x', Math.round(s.x)); set(pre + 'y', Math.round(s.y)); set(pre + 'z', Math.round(s.size));
      set(pre + 'g', Math.round(s.ghost)); set(pre + 'd', Math.round(s.dir)); set(pre + 'v', s.visible ? '顯示' : '隱藏');
      set(pre + 'c', s.costumeNo());
    });
    return '<div class="vrow">' + vbox('x', pre + 'x') + vbox('y', pre + 'y') + vbox('尺寸', pre + 'z') + vbox('幻影', pre + 'g') +
      vbox('方向', pre + 'd') + vbox('造型編號', pre + 'c') + vbox('', pre + 'v') + '</div>';
  }
  function fxLab(el, cat, rows) {
    el.innerHTML = '<div class="labrow"><div class="stagecol"><div id="s' + cat + '"></div><div id="ro' + cat + '"></div></div>' +
      '<div class="labout"><div class="fxlist" id="fx' + cat + '"></div>' +
      '<div class="btnrow"><button class="btn ghost" id="r' + cat + '">↺ 重設角色（4-1）</button><button class="btn ghost" id="x' + cat + '">■ 停止</button></div>' +
      '<div class="callbox" id="c' + cat + '"></div></div></div>';
    var st = new MS.Stage($('s' + cat));
    var y = st.add({ name: '圓圓', costumes: ['yy1', 'yy2', 'yy3', 'yy4'], x: -40, y: -30, cx: 56, cy: 62 });
    $('ro' + cat).innerHTML = readout(st, y, 'q' + cat);
    var box = $('fx' + cat);
    rows.forEach(function (r, i) {
      var d = document.createElement('div'); d.className = 'fxrow';
      var h = '<button class="btn">' + r.id + ' ' + esc(r.label) + '</button>';
      r.args.forEach(function (a, j) {
        h += a.opts ? '<select data-j="' + j + '">' + a.opts.map(function (o) { return '<option' + (o === a.v ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>'
          : '<label>' + a.l + ' <input type="number" step="any" class="n" data-j="' + j + '" value="' + a.v + '"></label>';
      });
      d.innerHTML = h; box.appendChild(d);
      d.querySelector('button').onclick = function () {
        var vals = r.args.map(function (a, j) { var e = d.querySelector('[data-j="' + j + '"]'); return a.opts ? e.value : Number(e.value); });
        st.stopAll(); showCall($('c' + cat), r.id, vals);
        st.run(function (t) { return r.run(st, y, t, vals); });
      };
    });
    $('r' + cat).onclick = function () { st.stopAll(); y.goto(-40, -30); A.reset(y); A.gotoCostume(y, 1); showCall($('c' + cat), '4-1', []); };
    $('x' + cat).onclick = function () { st.stopAll(); };
  }
  LABS[2] = function (el) {
    fxLab(el, 2, [
      { id: '2-1', label: '淡入', args: [{ l: '秒', v: 1 }], run: function (st, s, t, v) { return A.fadeIn(st, s, t, v[0]); } },
      { id: '2-2', label: '淡出', args: [{ l: '秒', v: 1 }], run: function (st, s, t, v) { return A.fadeOut(st, s, t, v[0]); } },
      { id: '2-3', label: '彈出放大', args: [{ l: '尺寸', v: 100 }], run: function (st, s, t, v) { return A.pop(st, s, t, v[0]); } },
      { id: '2-4', label: '縮小消失', args: [{ l: '秒', v: 0.6 }], run: function (st, s, t, v) { return A.shrink(st, s, t, v[0]); } },
      { id: '2-5', label: '彈跳落下', args: [{ l: '地面 y', v: -30 }], run: function (st, s, t, v) { return A.drop(st, s, t, v[0]); } },
      { id: '2-6', label: '滑入', args: [{ opts: ['左', '右', '上', '下'], v: '左' }, { l: '秒', v: 0.8 }], run: function (st, s, t, v) { return A.slide(st, s, t, v[0], v[1]); } },
    ]);
  };
  LABS[3] = function (el) {
    fxLab(el, 3, [
      { id: '3-1', label: '抖動', args: [{ l: '次', v: 6 }, { l: '強度', v: 10 }], run: function (st, s, t, v) { return A.shake(st, s, t, v[0], v[1]); } },
      { id: '3-2', label: '閃爍', args: [{ l: '次', v: 4 }, { l: '間隔', v: 0.15 }], run: function (st, s, t, v) { return A.blink(st, s, t, v[0], v[1]); } },
      { id: '3-3', label: '呼吸', args: [{ l: '秒', v: 2 }, { l: '幅度', v: 12 }], run: function (st, s, t, v) { return A.sine(st, s, t, v[0], v[1], function () { return s.size; }, function (x) { s.setSize(x); }, 360); } },
      { id: '3-4', label: '擺動', args: [{ l: '秒', v: 2 }, { l: '角度', v: 20 }], run: function (st, s, t, v) { return A.sine(st, s, t, v[0], v[1], function () { return s.dir; }, function (x) { s.dir = x; }, 360); } },
      { id: '3-5', label: '漂浮', args: [{ l: '秒', v: 2 }, { l: '高度', v: 20 }], run: function (st, s, t, v) { return A.sine(st, s, t, v[0], v[1], function () { return s.y; }, function (x) { s.setY(x); }, 180); } },
      { id: '3-6', label: '播放造型', args: [{ l: '從', v: 1 }, { l: '到', v: 4 }, { l: '每格', v: 0.15 }], run: function (st, s, t, v) { return A.anim(st, s, t, v[0], v[1], v[2]); } },
      { id: '3-7', label: '換到第 n 個造型', args: [{ l: 'n', v: 3 }], run: function (st, s, t, v) { A.gotoCostume(s, v[0]); } },
    ]);
    var cv = document.createElement('div'); cv.className = 'sinebox';
    cv.innerHTML = '<h4>sin 在做什麼？</h4><svg viewBox="0 0 360 110" id="sinsvg" role="img" aria-label="sin 曲線"></svg>' +
      '<p class="sm">橫軸是「經過秒數 × 360」（0～360 度），直軸是 sin 的值（−1～1）。呼吸、擺動、漂浮都是「原本的值 ＋ 幅度 × sin(…)」，所以會在原本的值上下來回，最後又回到原點。</p>';
    el.appendChild(cv);
    var p = '';
    for (var a = 0; a <= 360; a += 6) p += (a ? 'L' : 'M') + a + ' ' + (55 - 45 * Math.sin(a * Math.PI / 180)).toFixed(1);
    $('sinsvg').innerHTML = '<line x1="0" y1="55" x2="360" y2="55" stroke="var(--line)" stroke-width="2"/><path d="' + p + '" fill="none" stroke="var(--c-operators)" stroke-width="3"/>' +
      '<text x="4" y="14" font-size="11" fill="var(--ink2)">＋1（最大）</text><text x="4" y="106" font-size="11" fill="var(--ink2)">−1（最小）</text>';
  };

  /* =====================================================================
     試玩台 4：角色管理
     ===================================================================== */
  LABS[4] = function (el) {
    el.innerHTML = '<div class="labrow"><div class="stagecol"><div id="s4"></div><p class="sm" id="k4info"></p></div><div class="labout">' +
      '<div class="fxrow"><button class="btn" id="b44">4-4 建立分身群</button><label>個數 <input type="number" class="n" id="n44" value="5" min="1" max="12"></label></div>' +
      '<div class="btnrow"><button class="btn" id="b42">4-2 清除所有分身</button><button class="btn" id="b43">4-3 清空舞台</button><button class="btn" id="b41">4-1 重設角色</button></div>' +
      '<div class="fxrow"><button class="btn" id="b45">4-5 移到隨機位置</button><label>留邊 <input type="number" class="n" id="n45" value="50"></label></div>' +
      '<div class="fxrow"><label class="sw"><input type="checkbox" id="b47"> 4-7 平滑跟隨滑鼠</label>' + rng('比例', 'k47', 0.02, 1, 0.02, 0.15) + '</div>' +
      '<div class="fxrow"><label class="sw"><input type="checkbox" id="b46" checked> 4-6 限制在舞台內</label><label>留邊 <input type="number" class="n" id="n46" value="45"></label></div>' +
      '<p class="sm">打開「平滑跟隨」，把滑鼠移到舞台上。比例 1 ＝ 直接跳過去；比例越小，跟得越慢越柔順。把滑鼠移到舞台邊邊，看「限制在舞台內」的作用。</p>' +
      '<div class="callbox" id="c4"></div></div></div>';
    var st = new MS.Stage($('s4'));
    var star = st.add({ name: '星星', costumes: ['star'], w: 60, h: 60, visible: false });
    star.vars['編號'] = 0;
    var y = st.add({ name: '圓圓', costumes: ['yy1'], x: -140, y: 10, cx: 56, cy: 62 });
    bindRange('k47');
    function info() {
      var cl = st.clones('星星');
      $('k4info').innerHTML = '本體的編號：<b>' + star.vars['編號'] + '</b>　分身：' + (cl.length ? cl.map(function (c) { return '<b>' + c.vars['編號'] + '</b>'; }).join('、') : '（沒有）');
    }
    info();
    $('b44').onclick = function () {
      var n = Math.max(1, Math.min(12, num($('n44')))); showCall($('c4'), '4-4', [n]);
      var cnt = 0;
      for (var i = 0; i < n; i++) {
        cnt++; star.vars['編號'] = cnt;
        var c = star.clone();                                   // 分身複製「編號」
        c.goto(c.vars['編號'] * 80 - 240 - (n > 5 ? (n - 5) * 20 : 0), -125); c.visible = true; c.say(c.vars['編號']);
      }
      star.vars['編號'] = 0; info();
    };
    $('b42').onclick = function () { showCall($('c4'), '4-2', []); st.clones('星星').forEach(function (c) { c.remove(); }); info(); };
    $('b43').onclick = function () { showCall($('c4'), '4-3', []); y.visible = false; star.visible = false; st.clones('星星').forEach(function (c) { c.remove(); }); info(); };
    $('b41').onclick = function () { showCall($('c4'), '4-1', []); y.goto(-140, 10); A.reset(y); };
    $('b45').onclick = function () { $('b47').checked = false; showCall($('c4'), '4-5', [num($('n45'))]); A.randPos(y, num($('n45'))); };
    $('b47').onchange = function () { if (this.checked) showCall($('c4'), '4-7', ['鼠標的 x', '鼠標的 y', num($('k47'))]); };
    st.onframe.push(function () {
      if ($('b47').checked) A.follow(y, st.mx, st.my, num($('k47')));
      if ($('b46').checked) A.fence(y, num($('n46')));
    });
  };

  /* =====================================================================
     試玩台 5：計時與流程
     ===================================================================== */
  LABS[5] = function (el) {
    el.innerHTML = '<div class="calcs">' +
      '<div class="calc"><h4>5-2／5-3 倒數</h4><div class="big" id="cd">0</div><div class="crow"><input type="number" class="n" id="cdn" value="10"> 秒 <button class="btn" id="cdgo">開始倒數</button></div><p class="sm" id="cdmsg">剩餘秒數 ＝ 無條件進位(倒數終點 − 計時器)</p></div>' +
      '<div class="calc"><h4>5-4／5-5 碼錶</h4><div class="big" id="sw">0</div><div class="crow"><button class="btn" id="sw1">碼錶開始</button><button class="btn" id="sw2">碼錶停止</button></div><p class="sm">跑的時候顯示到小數一位，按停止才算到小數兩位。試試看能不能剛好停在 5.00！</p></div>' +
      '<div class="calc"><h4>5-1 等待（可跳過）</h4><div class="track big2"><i id="wt"></i></div><div class="crow"><button class="btn" id="w1">等 5 秒</button><button class="btn ghost" id="w2">跳過（空白鍵）</button></div><p class="sm" id="wmsg">變數「跳過」＝ <b id="skipv">0</b></p></div>' +
      '<div class="calc"><h4>5-6 冷卻檢查</h4><div class="track big2"><i id="cdbar"></i></div><div class="crow"><button class="btn" id="fire">🚀 發射</button><label>冷卻 <input type="number" class="n" id="cool" value="1" step="0.1"> 秒</label></div><p class="sm" id="firemsg">連點看看：冷卻中按了也不會發射。</p></div>' +
      '<div class="calc"><h4>5-7 秒數轉時間</h4><div class="crow"><input type="number" class="n" id="mm" value="125"> 秒</div><div class="res">結果：<b id="mmr"></b></div><p class="sm" id="mms"></p></div>' +
      '<div class="calc"><h4>5-8 切換畫面</h4><div class="crow"><button class="btn" data-sc="選單">選單</button><button class="btn" data-sc="遊戲">遊戲</button><button class="btn" data-sc="結局">結局</button></div>' +
      '<div class="scenes" id="scn"></div><p class="sm">每個角色只問：「畫面 ＝ 我的畫面嗎？」是就顯示，不是就隱藏。</p></div>' +
      '</div><div class="callbox" id="c5"></div>';
    var T0 = performance.now(), timer = function () { return (performance.now() - T0) / 1000; };
    var end = 0, cding = 0, swStart = 0, swOn = 0, sw = 0, skip = 0, last = -999;
    $('cdgo').onclick = function () { end = timer() + num($('cdn')); cding = 1; set('cd', num($('cdn'))); $('cdmsg').textContent = '倒數中……'; showCall($('c5'), '5-2', [num($('cdn'))]); };
    $('sw1').onclick = function () { swStart = timer(); sw = 0; swOn = 1; showCall($('c5'), '5-4', []); };
    $('sw2').onclick = function () { if (swOn) { swOn = 0; sw = Math.round((timer() - swStart) * 100) / 100; set('sw', sw.toFixed(2)); } showCall($('c5'), '5-5', []); };
    (function loop() {                                         // 舞台的「重複無限次：更新計時」
      if (cding) {
        var left = Math.ceil(end - timer()); set('cd', left);
        if (left < 1) { set('cd', 0); cding = 0; $('cdmsg').innerHTML = '<b>廣播「時間到」！</b>（只廣播一次）'; ding(); }
      }
      if (swOn) set('sw', (Math.round((timer() - swStart) * 10) / 10).toFixed(1));
      var cl = Math.max(0, Math.min(1, (timer() - last) / num($('cool'))));
      $('cdbar').style.width = (cl * 100) + '%'; $('cdbar').className = cl >= 1 ? 'ok' : '';
      requestAnimationFrame(loop);
    })();
    var waitT = 0;
    $('w1').onclick = async function () {
      showCall($('c5'), '5-1', [5]);
      var my = ++waitT, until = timer() + 5; $('wmsg').innerHTML = '等待中……　變數「跳過」＝ <b id="skipv">' + skip + '</b>';
      while (!(timer() > until || skip === 1)) { if (my !== waitT) return; $('wt').style.width = ((1 - (until - timer()) / 5) * 100) + '%'; await new Promise(requestAnimationFrame); }
      var skipped = skip === 1; if (skip === 1) skip = 0;
      $('wt').style.width = '100%';
      $('wmsg').innerHTML = (skipped ? '被跳過了！（「跳過」設回 0）' : '等滿 5 秒了。') + '　變數「跳過」＝ <b id="skipv">' + skip + '</b>';
    };
    var doSkip = function () { skip = 1; set('skipv', 1); };
    $('w2').onclick = doSkip;
    el.addEventListener('keydown', function (e) { if (e.key === ' ' && e.target.tagName !== 'INPUT') { e.preventDefault(); doSkip(); } });
    $('fire').onclick = function () {
      var cd = num($('cool')); showCall($('c5'), '5-6', [cd]);
      if (timer() - last > cd) { last = timer(); $('firemsg').innerHTML = '可以用 ＝ <b>1</b>　→ 發射！'; beep(660, 0.1, 'square', 0.06); }
      else $('firemsg').innerHTML = '可以用 ＝ <b>0</b>　→ 冷卻中，還要 ' + (cd - (timer() - last)).toFixed(1) + ' 秒';
    };
    function mm() {
      var s = num($('mm')), r = Bf.mmss(s);
      set('mmr', r);
      $('mms').innerHTML = '分 ＝ 無條件捨去(' + fmt(s) + ' ÷ 60) ＝ ' + Math.floor(s / 60) + ' → 補零 → ' + Bf.pad(Math.floor(s / 60), 2) +
        '<br>秒 ＝ ' + fmt(s) + ' 除以 60 的餘數，無條件捨去 ＝ ' + Math.floor(((s % 60) + 60) % 60) + ' → 補零 → ' + Bf.pad(Math.floor(((s % 60) + 60) % 60), 2);
    }
    $('mm').addEventListener('input', mm); mm();
    var SPR = [['開始按鈕', '選單'], ['標題', '選單'], ['玩家', '遊戲'], ['分數牌', '遊戲'], ['結局卡', '結局']];
    function scene(name) {
      $('scn').innerHTML = SPR.map(function (s) {
        var on = s[1] === name;
        return '<div class="scard ' + (on ? 'on' : '') + '"><b>' + s[0] + '</b><small>我的畫面：' + s[1] + '</small><em>' + (on ? '顯示' : '隱藏') + '</em></div>';
      }).join('');
    }
    el.querySelectorAll('[data-sc]').forEach(function (b) { b.onclick = function () { scene(b.getAttribute('data-sc')); showCall($('c5'), '5-8', [b.getAttribute('data-sc')]); }; });
    scene('選單');
  };

  /* =====================================================================
     試玩台 6：數學小工具
     ===================================================================== */
  LABS[6] = function (el) {
    el.innerHTML = '<div class="calcs">' +
      '<div class="calc wide"><h4>6-1 限制範圍　／　6-3 在範圍內嗎</h4>' + rng('值', 'v61', -300, 300, 1, 150) +
      '<div class="crow">最小 <input type="number" class="n" id="a61" value="-100"> 最大 <input type="number" class="n" id="b61" value="100"></div>' +
      '<svg viewBox="0 0 400 60" id="nl61" class="numline"></svg><div class="res">限制範圍 → <b id="r61"></b>　　在範圍內嗎 → <b id="r63"></b></div></div>' +
      '<div class="calc"><h4>6-2 兩點距離（拖動兩個點）</h4><svg viewBox="-120 -90 240 180" id="d62" class="grid62"></svg><div class="res" id="r62"></div></div>' +
      '<div class="calc"><h4>6-4 四捨五入到小數</h4><div class="crow"><input type="number" step="any" class="w" id="v64" value="3.14159"> 到 <input type="number" class="n" id="d64" value="2"> 位</div><div class="res">結果：<b id="r64"></b></div><p class="sm" id="s64"></p></div>' +
      '<div class="calc"><h4>6-5 不重複隨機</h4><div class="crow"><input type="number" class="n" id="a65" value="1"> 到 <input type="number" class="n" id="b65" value="6"> <button class="btn" id="g65">抽一個</button></div>' +
      '<div class="res">結果：<b id="r65">—</b></div><div class="bag"><small>抽籤袋：</small><span id="bag65"></span></div><div class="bag"><small>抽過：</small><span id="his65"></span></div></div>' +
      '</div><div class="callbox" id="c6"></div>';
    function f61() {
      var v = num($('v61')), a = num($('a61')), b = num($('b61')), r = Bf.clamp(v, a, b), ir = Bf.inRange(v, a, b);
      set('r61', fmt(r)); set('r63', ir);
      var X = function (x) { return 20 + (Math.max(-300, Math.min(300, x)) + 300) / 600 * 360; };
      $('nl61').innerHTML = '<line x1="20" y1="30" x2="380" y2="30" stroke="var(--line)" stroke-width="4" stroke-linecap="round"/>' +
        '<line x1="' + X(a) + '" y1="30" x2="' + X(b) + '" y2="30" stroke="var(--c-operators)" stroke-width="8" stroke-linecap="round"/>' +
        '<circle cx="' + X(v) + '" cy="30" r="7" fill="var(--ink2)"/><circle cx="' + X(r) + '" cy="30" r="9" fill="none" stroke="var(--c-myblocks)" stroke-width="3"/>' +
        '<text x="' + X(a) + '" y="54" font-size="11" text-anchor="middle" fill="var(--ink2)">' + a + '</text><text x="' + X(b) + '" y="54" font-size="11" text-anchor="middle" fill="var(--ink2)">' + b + '</text>' +
        '<text x="' + X(v) + '" y="14" font-size="11" text-anchor="middle" fill="var(--ink)">值 ' + v + '</text>';
      showCall($('c6'), '6-1', [v, a, b]);
    }
    bindRange('v61', f61); ['a61', 'b61'].forEach(function (i) { $(i).addEventListener('input', f61); });
    var P1 = { x: -60, y: -40 }, P2 = { x: 60, y: 50 }, drag = null, svg = $('d62');
    function f62() {
      var d = Bf.dist(P1.x, P1.y, P2.x, P2.y);
      var sx = function (p) { return p.x; }, sy = function (p) { return -p.y; };
      var g = '';
      for (var i = -120; i <= 120; i += 20) g += '<line x1="' + i + '" y1="-90" x2="' + i + '" y2="90" stroke="var(--line)" stroke-width="' + (i ? .6 : 1.4) + '"/>';
      for (var j = -80; j <= 80; j += 20) g += '<line x1="-120" y1="' + j + '" x2="120" y2="' + j + '" stroke="var(--line)" stroke-width="' + (j ? .6 : 1.4) + '"/>';
      svg.innerHTML = g + '<path d="M' + sx(P1) + ' ' + sy(P1) + ' L' + sx(P2) + ' ' + sy(P1) + ' L' + sx(P2) + ' ' + sy(P2) + '" fill="none" stroke="var(--ink2)" stroke-dasharray="4 3" stroke-width="1.5"/>' +
        '<line x1="' + sx(P1) + '" y1="' + sy(P1) + '" x2="' + sx(P2) + '" y2="' + sy(P2) + '" stroke="var(--c-myblocks)" stroke-width="3"/>' +
        '<circle class="drag" data-p="1" cx="' + sx(P1) + '" cy="' + sy(P1) + '" r="9" fill="var(--c-motion)" stroke="#fff" stroke-width="2"/>' +
        '<circle class="drag" data-p="2" cx="' + sx(P2) + '" cy="' + sy(P2) + '" r="9" fill="var(--c-events)" stroke="#fff" stroke-width="2"/>';
      var dx = P2.x - P1.x, dy = P2.y - P1.y;
      $('r62').innerHTML = '橫的差 ' + dx + '，直的差 ' + dy + '<br>√(' + dx + '×' + dx + ' ＋ ' + dy + '×' + dy + ') ＝ √' + (dx * dx + dy * dy) + ' ＝ <b>' + fmt(Math.round(d * 100) / 100) + '</b>';
    }
    function pt(e) { var r = svg.getBoundingClientRect(); return { x: Math.round(((e.clientX - r.left) / r.width * 240 - 120) / 5) * 5, y: Math.round((90 - (e.clientY - r.top) / r.height * 180) / 5) * 5 }; }
    svg.addEventListener('pointerdown', function (e) { var c = e.target.closest('.drag'); if (!c) return; drag = c.getAttribute('data-p') === '1' ? P1 : P2; svg.setPointerCapture(e.pointerId); e.preventDefault(); });
    svg.addEventListener('pointermove', function (e) { if (!drag) return; var p = pt(e); drag.x = Math.max(-115, Math.min(115, p.x)); drag.y = Math.max(-85, Math.min(85, p.y)); f62(); showCall($('c6'), '6-2', [P1.x, P1.y, P2.x, P2.y]); });
    svg.addEventListener('pointerup', function () { drag = null; }); svg.addEventListener('pointercancel', function () { drag = null; });
    f62();
    function f64() {
      var v = num($('v64')), d = num($('d64')), k = Math.pow(10, d);
      set('r64', fmt(Bf.round(v, d)));
      $('s64').innerHTML = '倍數 ＝ 10 ^ ' + d + ' ＝ ' + fmt(k) + '<br>' + fmt(v) + ' × ' + fmt(k) + ' ＝ ' + fmt(v * k) + ' → 四捨五入 ' + Math.round(v * k) + ' → ÷ ' + fmt(k) + ' ＝ <b>' + fmt(Bf.round(v, d)) + '</b>';
      showCall($('c6'), '6-4', [v, d]);
    }
    ['v64', 'd64'].forEach(function (i) { $(i).addEventListener('input', f64); }); f64();
    var bag = [], range = '', his = [];
    function show65() { $('bag65').innerHTML = bag.map(function (x) { return '<i>' + x + '</i>'; }).join('') || '（空的）'; $('his65').innerHTML = his.map(function (x) { return '<i class="h">' + x + '</i>'; }).join(''); }
    $('g65').onclick = function () {
      var a = Math.round(num($('a65'))), b = Math.round(num($('b65'))), r = a + '~' + b;
      if (b < a || b - a > 60) { set('r65', '範圍請在 60 個以內'); return; }
      if (bag.length === 0 || range !== r) { bag = []; range = r; for (var n = a; n <= b; n++) bag.push(n); if (his.length) his.push('｜'); }
      var i = Math.floor(Math.random() * bag.length), x = bag[i]; bag.splice(i, 1); his.push(x);
      if (his.length > 40) his = his.slice(-40);
      set('r65', x); show65(); showCall($('c6'), '6-5', [a, b]); tick();
    };
    show65();
    f61();
  };

  /* =====================================================================
     試玩台 7：清單工具（每一步都看得到）
     ===================================================================== */
  LABS[7] = function (el) {
    el.innerHTML = '<div class="listlab"><div class="bars" id="bars"></div>' +
      '<div class="labout"><div class="btnrow"><button class="btn" id="l1">7-1 洗牌</button><button class="btn" id="l2">7-2 排序</button><button class="btn" id="l3">7-3 最大值</button>' +
      '<button class="btn" id="l4">7-4 加總</button><button class="btn" id="l5">7-5 平均</button></div>' +
      '<div class="crow"><input id="sp7" value="42,7,88,15,63,30" class="w2"> 用 <input id="sep7" value="," class="n"> <button class="btn" id="l6">7-6 拆成清單</button></div>' +
      '<div class="crow">用 <input id="j7" value="、" class="n"> <button class="btn" id="l7">7-7 合併成文字</button> <button class="btn ghost" id="l0">重新填 6 個數字</button></div>' +
      rng('動畫速度', 'spd7', 1, 10, 1, 5) +
      '<div class="vrow">' + vbox('結果', 'r7') + vbox('位置', 'p7') + vbox('比較次數', 'cmp7') + vbox('交換次數', 'swp7') + '</div>' +
      '<p class="sm" id="m7">這是清單「工作清單」。按按鈕，看函式怎麼一步一步處理它。</p></div></div><div class="callbox" id="c7"></div>';
    var L = [42, 7, 88, 15, 63, 30], hi = {}, busy = 0;
    bindRange('spd7');
    function delay() { return new Promise(function (r) { setTimeout(r, 900 / num($('spd7'))); }); }
    function draw() {
      var nums = L.map(Number).filter(function (x) { return !isNaN(x); }), mx = Math.max.apply(null, nums.concat([1]));
      $('bars').innerHTML = L.map(function (v, i) {
        var n = Number(v), h = isNaN(n) ? 30 : Math.max(4, n / mx * 100);
        return '<div class="bar ' + (hi[i + 1] || '') + '"><i style="height:' + h + '%"></i><b>' + esc(v) + '</b><small>' + (i + 1) + '</small></div>';
      }).join('') || '<p class="sm">（清單是空的）</p>';
    }
    draw();
    async function guard(fnc) { if (busy) return; busy = 1; set('cmp7', 0); set('swp7', 0); try { await fnc(); } finally { busy = 0; hi = {}; draw(); } }
    $('l1').onclick = function () {
      showCall($('c7'), '7-1', []);
      guard(async function () {
        var to = L.length, sw = 0;
        while (!(to < 2)) {
          var j = 1 + Math.floor(Math.random() * to); hi = {}; hi[to] = 'a'; hi[j] = 'b'; draw(); await delay();
          var tmp = L[to - 1]; L[to - 1] = L[j - 1]; L[j - 1] = tmp; sw++; set('swp7', sw); hi = {}; hi[to] = 'done'; draw(); await delay(); to--;
        }
        $('m7').textContent = '從最後一項往前，每次跟「還沒洗到」的隨機一項交換。';
      });
    };
    $('l2').onclick = function () {
      showCall($('c7'), '7-2', []);
      guard(async function () {
        var n = L.length, cmp = 0, sw = 0;
        for (var r = 0; r < n - 1; r++) {
          for (var k = 1; k <= n - 1; k++) {
            hi = {}; hi[k] = 'a'; hi[k + 1] = 'a'; for (var q = n - r + 1; q <= n; q++) hi[q] = 'done'; draw(); cmp++; set('cmp7', cmp); await delay();
            var A1 = L[k - 1], B1 = L[k];
            if (scratchGt(A1, B1)) { L[k - 1] = B1; L[k] = A1; sw++; set('swp7', sw); hi[k] = 'b'; hi[k + 1] = 'b'; draw(); await delay(); }
          }
        }
        $('m7').textContent = '每一輪都會把「還沒排好的最大值」推到最後面（像氣泡浮上來）。';
      });
    };
    $('l3').onclick = function () {
      showCall($('c7'), '7-3', []);
      guard(async function () {
        if (!L.length) { set('r7', ''); set('p7', 0); return; }
        var best = L[0], pos = 1;
        for (var k = 1; k <= L.length; k++) {
          hi = {}; hi[pos] = 'b'; hi[k] = hi[k] || 'a'; draw(); await delay();
          if (scratchGt(L[k - 1], best)) { best = L[k - 1]; pos = k; }
          set('r7', best); set('p7', pos);
        }
        hi = {}; hi[pos] = 'b'; draw(); await delay(); await delay();
      });
    };
    $('l4').onclick = function () { showCall($('c7'), '7-4', []); guard(async function () { var s = 0; for (var k = 1; k <= L.length; k++) { s += Number(L[k - 1]) || 0; hi = {}; hi[k] = 'a'; draw(); set('r7', fmt(s)); await delay(); } }); };
    $('l5').onclick = function () {
      showCall($('c7'), '7-5', []);
      guard(async function () { var s = 0; L.forEach(function (x) { s += Number(x) || 0; }); set('r7', L.length ? fmt(s / L.length) : 0); $('m7').textContent = '平均 ＝ 加總 ' + fmt(s) + ' ÷ ' + L.length + ' 項（先呼叫 7-4 清單加總）'; });
    };
    $('l6').onclick = function () {
      var text = $('sp7').value, sep = $('sep7').value; showCall($('c7'), '7-6', [text, sep]);
      L = []; var seg = '';
      for (var i = 0; i < text.length; i++) { var ch = text.charAt(i); if (ch.toLowerCase() === sep.toLowerCase()) { L.push(seg); seg = ''; } else seg += ch; }
      L.push(seg); draw();
      $('m7').textContent = '拆成 ' + L.length + ' 項。（分隔符號要剛好一個字：Scratch 的「字串的第 n 字」一次只拿一個字來比。）';
    };
    $('l7').onclick = function () { var j = $('j7').value; showCall($('c7'), '7-7', [j]); set('r7', L.join(j)); };
    $('l0').onclick = function () { L = []; for (var i = 0; i < 6; i++) L.push(1 + Math.floor(Math.random() * 99)); draw(); set('r7', '—'); set('p7', '—'); };
  };
  /* Scratch 的比大小：兩邊都是數字就比數字，否則比文字（不分大小寫） */
  function scratchGt(a, b) {
    var na = Number(a), nb = Number(b);
    if (String(a).trim() !== '' && String(b).trim() !== '' && !isNaN(na) && !isNaN(nb)) return na > nb;
    return String(a).toLowerCase() > String(b).toLowerCase();
  }

  /* =====================================================================
     試玩台 8：遊戲機制（可以直接玩，參數即時調整）
     ===================================================================== */
  LABS[8] = function (el) {
    el.innerHTML = '<div class="labrow"><div class="stagecol"><div id="s8" tabindex="0" aria-label="遊戲舞台：點一下再用方向鍵操作"></div>' +
      '<div class="pad"><button data-k="left">◀</button><button data-k="up">▲ 跳</button><button data-k="right">▶</button></div>' +
      '<p class="sm">點一下舞台，用 ← → 移動、↑ 跳。手機用下面的按鈕。</p></div>' +
      '<div class="labout">' + rng('8-2 重力', 'g8', 0.3, 3, 0.1, 1.2) + rng('8-2 跳躍力', 'j8', 6, 30, 1, 18) + rng('8-1 速度', 'v8', 1, 12, 1, 5) +
      rng('8-3 無敵秒數', 'i8', 0, 4, 0.5, 1.5) + rng('8-6 刺球速度', 'e8', 1, 10, 1, 4) +
      '<div class="vrow">' + vbox('分數', 'sc8') + vbox('最高分', 'hs8') + vbox('生命值', 'hp8') + vbox('上下速度', 'vy8') + '</div>' +
      '<div class="btnrow"><button class="btn" id="go8">▶ 開始／重來</button></div>' +
      '<p class="sm" id="m8">重力調小 → 像在月球；跳躍力調大 → 跳很高。可以跳過刺球嗎？</p></div></div>';
    var st = new MS.Stage($('s8'), { ground: 70 });
    var GROUND = -78;
    var clouds = [1, 2, 3].map(function (n) { return st.add({ name: '雲', costumes: ['cloud'], w: 104, h: 50, x: n * 170 - 250, y: 60 + n * 25 }); });
    var sp = st.add({ name: '刺球', costumes: ['spike'], w: 52, h: 52, x: 250, y: -84 });
    var p = st.add({ name: '玩家', costumes: ['yy1'], x: -150, y: GROUND, size: 70, cx: 56, cy: 62 });
    ['g8', 'j8', 'v8', 'i8', 'e8'].forEach(function (i) { bindRange(i); });
    var keys = {}, vy = 0, inv = 0, score = 0, hi = 0, hp = 3, on = 0, T0 = performance.now(), lastSec = 0;
    var timer = function () { return (performance.now() - T0) / 1000; };
    var stageEl = $('s8');
    stageEl.addEventListener('keydown', function (e) {
      var m = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', a: 'left', d: 'right' }[e.key];
      if (m) { keys[m] = 1; e.preventDefault(); }
    });
    stageEl.addEventListener('keyup', function (e) { var m = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', a: 'left', d: 'right' }[e.key]; if (m) keys[m] = 0; });
    stageEl.addEventListener('pointerdown', function () { stageEl.focus(); });
    el.querySelectorAll('.pad button').forEach(function (b) {
      var k = b.getAttribute('data-k');
      b.addEventListener('pointerdown', function (e) { keys[k] = 1; e.preventDefault(); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, function () { keys[k] = 0; }); });
    });
    function start() { score = 0; hp = 3; on = 1; inv = 0; vy = 0; lastSec = timer(); p.goto(-150, GROUND); A.reset(p); p.setSize(70); sp.goto(250, -84); $('m8').textContent = '開始！'; stageEl.focus(); }
    $('go8').onclick = start;
    function touching(a, b) { return Math.abs(a.x - b.x) < (a.w * a.size / 100 + b.w * b.size / 100) / 2 - 18 && Math.abs(a.y - b.y) < (a.h * a.size / 100 + b.h * b.size / 100) / 2 - 16; }
    st.onframe.push(function () {
      clouds.forEach(function (c) { c.setX(c.x - 1); if (c.x < -250) c.setX(250); });                 // 8-6
      if (on) {
        sp.setX(sp.x - num($('e8'))); if (sp.x < -250) sp.setX(250); sp.dir -= 8;                     // 8-6
        if (keys.right) p.setX(p.x + num($('v8'))); if (keys.left) p.setX(p.x - num($('v8')));         // 8-1
        vy -= num($('g8')); p.setY(p.y + vy);                                                          // 8-2
        if (p.y < GROUND) { p.setY(GROUND); vy = 0; }
        if (keys.up && p.y === GROUND) vy = num($('j8'));
        A.fence(p, 30);                                                                                 // 4-6
        if (timer() < inv) p.ghost = (Math.round(timer() * 10) % 2) * 70; else p.ghost = 0;          // 8-4
        if (touching(p, sp) && timer() > inv) { hp -= 1; inv = timer() + num($('i8')); beep(160, 0.2, 'square', 0.06); }   // 8-3
        if (timer() - lastSec >= 1) { lastSec += 1; score++; }
        if (hp < 1) {
          on = 0; p.ghost = 0;
          var rec = score > hi; if (rec) hi = score;                                                    // 8-5
          $('m8').innerHTML = '遊戲結束！' + (rec ? '<b>破紀錄！</b>' : '') + '按「開始／重來」再玩一次。'; if (rec) ding();
        }
      }
      set('sc8', score); set('hs8', hi); set('hp8', hp); set('vy8', Math.round(vy * 10) / 10);
    });
  };

  /* ---------- 啟動試玩台 ---------- */
  document.querySelectorAll('[data-lab]').forEach(function (el) {
    var k = el.getAttribute('data-lab');
    if (LABS[k]) { try { LABS[k](el); } catch (e) { el.textContent = '試玩台載入失敗：' + e.message; console.error(e); } }
  });

  /* =====================================================================
     函式地圖（首頁）：data-map
     ===================================================================== */
  var mapEl = document.querySelector('[data-map]');
  if (mapEl) {
    var cats = [1, 2, 3, 4, 5, 6, 7, 8];
    mapEl.innerHTML = cats.map(function (c) {
      var info = F.cats[c];
      var items = F.funcs.filter(function (f) { return f.cat === c; }).map(function (f) {
        return '<a class="fchip ' + f.type + '" href="c' + c + '.html#f' + f.id + '" title="' + esc(f.desc.split('\n')[0]) + '"><small>' + f.id + '</small>' +
          esc(f.code.replace(/ ?%s ?/g, ' ( ) ').replace(/\s+/g, ' ').trim()) + '</a>';
      }).join('');
      return '<div class="mapcat" style="--mc:' + info.color + '"><a class="mh" href="c' + c + '.html"><b>' + c + '</b> ' + esc(info.name) + '</a><div class="fchips">' + items + '</div></div>';
    }).join('');
  }

  /* =====================================================================
     自我檢核（存在這台電腦的瀏覽器裡）
     ===================================================================== */
  (function () {
    var KEY = 'scratch-funclib-check-v1', st = {};
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

  /* ---------- 目錄：捲動時標示目前位置 ---------- */
  (function () {
    var links = document.querySelectorAll('.toc a[href^="#"]');
    if (!('IntersectionObserver' in window) || !links.length) return;
    var map = {}; links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && map[e.target.id]) { links.forEach(function (a) { a.classList.remove('on'); }); map[e.target.id].classList.add('on'); }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    document.querySelectorAll('section.chap, article.func').forEach(function (s) { if (s.id) io.observe(s); });
  })();

  window.LIB_TEST = { A: A, Bf: Bf, scratchGt: scratchGt };      // 給 tools/test_web.py 核對用
})();
