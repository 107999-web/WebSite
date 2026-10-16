/* 手勢辨識大挑戰：教學頁互動實驗 */
(function () {
  BLK.auto(SCRIPTS);
  var $ = function (id) { return document.getElementById(id); };
  var NAMES = ['拇', '食', '中', '無', '小'];
  var FULL = ['拇指', '食指', '中指', '無名指', '小指'];
  var RPS = { 1: '石頭', 2: '剪刀', 3: '布' };
  var PAT2RPS = { '0000': 1, '1100': 2, '1111': 3 };

  /* ---------- 小合成器 ---------- */
  var AC = null;
  function ctx() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } } return AC; }
  function beep(f, d, type, vol) {
    var a = ctx(); if (!a) return;
    var t = a.currentTime, o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(vol || 0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + (d || 0.2));
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + (d || 0.2) + 0.02);
  }
  var SFX = {
    ok: function () { beep(988, .09); setTimeout(function () { beep(1319, .2); }, 80); },
    no: function () { beep(150, .25, 'square', .18); },
    tick: function () { beep(784, .09, 'sine', .18); },
    win: function () { beep(659, .1); setTimeout(function () { beep(880, .1); }, 100); setTimeout(function () { beep(1175, .3); }, 200); },
    lose: function () { beep(392, .16); setTimeout(function () { beep(294, .35); }, 160); },
    tie: function () { beep(523, .12); setTimeout(function () { beep(523, .2); }, 150); }
  };

  /* ---------- 畫一隻手（SVG）---------- */
  function handSVG(f, opt) {
    opt = opt || {};
    if (f.length === 4) f = [0].concat(f);          // 沒給拇指就當作收起來
    var th = f[0];
    f = f.slice(1);
    var INK = '#3F3327', SKIN = '#FFD9B0', DK = '#E8B487';
    var b = ['<rect x="62" y="168" width="76" height="52" rx="22" fill="' + DK + '" stroke="' + INK + '" stroke-width="4"/>',
             '<rect x="50" y="96" width="100" height="90" rx="30" fill="' + SKIN + '" stroke="' + INK + '" stroke-width="4"/>'];
    var base = [[58, 78], [82, 92], [106, 86], [130, 66]];
    for (var i = 0; i < 4; i++) {
      var x = base[i][0], ln = base[i][1], g = '';
      if (f[i]) {
        var top = 104 - ln;
        g = '<rect x="' + x + '" y="' + top + '" width="20" height="' + (ln + 16) + '" rx="10" fill="' + SKIN + '" stroke="' + INK + '" stroke-width="4"/>' +
            '<line x1="' + (x + 3) + '" y1="' + (top + ln * 0.42) + '" x2="' + (x + 17) + '" y2="' + (top + ln * 0.42) + '" stroke="' + INK + '" stroke-width="2" opacity=".5"/>';
      } else {
        g = '<rect x="' + x + '" y="86" width="20" height="26" rx="10" fill="' + DK + '" stroke="' + INK + '" stroke-width="4"/>';
      }
      b.push(opt.click ? '<g class="fg" data-f="' + (i + 1) + '"><rect x="' + (x - 3) + '" y="' + (f[i] ? 104 - ln - 6 : 80) + '" width="26" height="' + (f[i] ? ln + 28 : 38) + '" fill="transparent"/>' + g + '</g>' : g);
    }
    var tg = th ? '<rect x="8" y="112" width="52" height="22" rx="11" fill="' + SKIN + '" stroke="' + INK + '" stroke-width="4"/>'
                : '<rect x="30" y="122" width="34" height="24" rx="12" fill="' + DK + '" stroke="' + INK + '" stroke-width="4"/>';
    b.push(opt.click ? '<g class="fg" data-f="0"><rect x="' + (th ? 4 : 26) + '" y="106" width="' + (th ? 60 : 42) + '" height="36" fill="transparent"/>' + tg + '</g>' : tg);
    return '<svg viewBox="0 0 200 230" xmlns="http://www.w3.org/2000/svg">' + b.join('') + '</svg>';
  }

  function pat(f) { return f.join(''); }                    // 五位（拇食中無小）
  function four(f) { return f.slice(1).join(''); }          // 四位（猜拳用）
  function cnt(f) { return f[0] + f[1] + f[2] + f[3] + f[4]; }
  function rpsOf(f) { return PAT2RPS[four(f)] || 0; }
  function rpsHand(n) { return n === 1 ? [0, 0, 0, 0, 0] : n === 2 ? [0, 1, 1, 0, 0] : [1, 1, 1, 1, 1]; }

  /* ============ 實驗 1：一根手指的比大小 ============ */
  (function () {
    var box = $('fLab'); if (!box) return;
    var up = true;
    function draw() {
      var tipY = up ? 38 : 150, pipY = 104;
      box.innerHTML =
        '<div class="fstage" id="fStage">' +
        '<svg viewBox="0 0 190 230" style="position:absolute;inset:0;width:100%;height:100%">' +
        '<rect x="60" y="150" width="70" height="70" rx="22" fill="#FFD9B0" stroke="#3F3327" stroke-width="4"/>' +
        (up ? '<rect x="80" y="30" width="26" height="130" rx="13" fill="#FFD9B0" stroke="#3F3327" stroke-width="4"/>'
            : '<rect x="80" y="100" width="26" height="62" rx="13" fill="#E8B487" stroke="#3F3327" stroke-width="4"/>') +
        '<circle cx="93" cy="' + pipY + '" r="8" fill="#4C97FF" stroke="#fff" stroke-width="3"/>' +
        '<circle cx="93" cy="' + tipY + '" r="9" fill="#FF3B7A" stroke="#fff" stroke-width="3"/>' +
        '</svg>' +
        '<div class="gl" style="top:' + (pipY / 230 * 100) + '%"><span>第二關節 (7)</span></div>' +
        '<div class="gl tip" style="top:' + (tipY / 230 * 100) + '%"><span>指尖 (9)</span></div>' +
        '</div>' +
        '<div class="fout">' +
        '<p style="margin:0 0 10px">按按鈕把食指<b>伸直</b>或<b>彎下來</b>，看兩個 y 座標怎麼變。' +
        'Scratch 的 y 座標<b>越上面越大</b>。</p>' +
        '<div class="vrow"><span class="vbox"><em>指尖 (9) 的 y</em>' + (180 - tipY) + '</span>' +
        '<span class="vbox"><em>第二關節 (7) 的 y</em>' + (180 - pipY) + '</span></div>' +
        '<div class="verdict ' + (up ? 'up' : 'down') + '">' +
        (180 - tipY) + ' ' + (up ? '＞' : '＜') + ' ' + (180 - pipY) + '　→　' +
        (up ? '食指 ＝ 1（伸直）' : '食指 ＝ 0（彎著）') + '</div>' +
        '<div class="btnrow" style="margin-top:12px">' +
        '<button class="btn" id="fUp">伸直</button> <button class="btn" id="fDn">彎下來</button></div>' +
        '</div>';
      $('fUp').onclick = function () { up = true; SFX.tick(); draw(); };
      $('fDn').onclick = function () { up = false; SFX.tick(); draw(); };
    }
    box.className = 'fingerlab'; draw();
  })();

  /* ============ 實驗 2：四根手指 → 指型 / 手指數 / 猜拳 ============ */
  function makeHandLab(boxId, onChange) {
    var box = $(boxId); if (!box) return null;
    var f = [0, 0, 0, 0, 0];
    box.className = 'handlab';
    box.innerHTML =
      '<div class="handbox"><div class="handsvg" id="' + boxId + '_svg"></div>' +
      '<div class="handhint">點手指可以伸直／彎下來</div></div>' +
      '<div class="handout" id="' + boxId + '_out"></div>';
    var svgBox = $(boxId + '_svg'), out = $(boxId + '_out');
    function paint() {
      svgBox.innerHTML = handSVG(f, { click: 1 });
      svgBox.querySelectorAll('.fg').forEach(function (g) {
        g.addEventListener('click', function () {
          var i = +g.getAttribute('data-f'); f[i] = f[i] ? 0 : 1; SFX.tick(); paint();
        });
      });
      var p = pat(f), c = cnt(f), r = rpsOf(f);
      out.innerHTML =
        '<div class="lamps">' + NAMES.map(function (n, i) {
          return '<div class="lamp' + (f[i] ? ' on' : '') + '"><i>' + (f[i] ? '✓' : '') + '</i><b>' + n + '</b></div>';
        }).join('') + '</div>' +
        '<div class="vrow"><span class="vbox code"><em>指型</em>' + p + '</span>' +
        '<span class="vbox"><em>手指數</em>' + c + '</span></div>' +
        '<div class="vrow"><span class="vbox code" style="background:#8E6BE0"><em>四指型</em>' + four(f) + '</span>' +
        '<span class="vbox ' + (r ? 'res' : 'dim') + '"><em>猜拳</em>' + (r ? r + '　' + RPS[r] : '0　看不懂') + '</span></div>' +
        '<p style="margin:4px 0 0;font-size:.92rem;color:var(--ink2)">' +
        (r ? '這是合法的猜拳手勢（猜拳只看四指型，拇指開不開都可以）。'
           : '猜拳只認得四指型 0000、1100、1111；其他都要玩家再比一次。') +
        '</p>';
      if (onChange) onChange(f.slice());
    }
    paint();
    return { get: function () { return f.slice(); }, set: function (n) { f = n.slice(); paint(); } };
  }
  makeHandLab('hLab');

  /* ============ 實驗 3：猜拳勝負算式 ============ */
  (function () {
    var box = $('rLab'); if (!box) return;
    var me = 1, pc = 2;
    box.className = 'rpslab';
    function draw() {
      var win = ((me % 3) + 1) === pc, tie = me === pc;
      var res = tie ? '平手' : (win ? '你贏了' : '你輸了');
      var cls = tie ? 'tie' : (win ? 'win' : 'lose');
      box.innerHTML =
        '<div class="pickrow">' +
        ['me', 'pc'].map(function (k) {
          var cur = k === 'me' ? me : pc;
          return '<div class="pick"><h4>' + (k === 'me' ? '你出' : '電腦出') + '</h4><div class="opts3">' +
            [1, 2, 3].map(function (i) {
              return '<button data-k="' + k + '" data-v="' + i + '"' + (cur === i ? ' class="sel"' : '') + '>' + i + ' ' + RPS[i] + '</button>';
            }).join('') + '</div></div>';
        }).join('') + '</div>' +
        '<div class="formula">' +
        (tie ? '你的編號 <b>' + me + '</b> ＝ 電腦的編號 <b>' + pc + '</b> → <b>平手</b>'
             : '<b>' + me + '</b> ÷ 3 的餘數 ＝ <b>' + (me % 3) + '</b>　，　<b>' + (me % 3) + '</b> ＋ 1 ＝ <b>' + ((me % 3) + 1) + '</b><br>' +
               '算出來的 <b>' + ((me % 3) + 1) + '</b> ' + (win ? '＝' : '≠') + ' 電腦的 <b>' + pc + '</b>　→　<b>' + res + '</b>') +
        '</div>' +
        '<div class="hands2" style="margin-top:14px">' +
        '<figure>' + handSVG(rpsHand(me)) + '<figcaption>你　' + RPS[me] + '</figcaption></figure>' +
        '<figure>' + handSVG(rpsHand(pc)) + '<figcaption>電腦　' + RPS[pc] + '</figcaption></figure>' +
        '</div>' +
        '<div style="text-align:center;margin-top:12px"><span class="pbanner ' + cls + '">' + res + '</span></div>';
      box.querySelectorAll('button[data-k]').forEach(function (b) {
        b.onclick = function () {
          if (b.getAttribute('data-k') === 'me') me = +b.getAttribute('data-v'); else pc = +b.getAttribute('data-v');
          SFX.tick(); draw();
        };
      });
    }
    draw();
  })();

  /* ============ 實驗 4：餘裕 ＋ 穩定時間 ============ */
  (function () {
    var box = $('jLab'); if (!box) return;
    var margin = 6, thr = 0.15, timer = null;
    box.className = 'jitlab';
    box.innerHTML =
      '<p style="margin:0 0 8px">模擬一根<b>停在半彎位置</b>的手指：指尖大約就在關節附近，攝影機每一格都有一點雜訊。</p>' +
      '<div class="jrow"><b>① 只比大小</b><div class="jitbars" id="jRaw"></div></div>' +
      '<div class="jrow"><b>② 加上餘裕</b><div class="jitbars" id="jMar"></div></div>' +
      '<div class="jrow"><b>③ 再加穩定時間</b><div class="jitbars" id="jOk"></div></div>' +
      '<div class="vrow" id="jVals" style="margin-top:10px"></div>' +
      '<div class="slid"><b>餘裕</b><input type="range" id="jMarR" min="0" max="16" step="1" value="6">' +
      '<span class="vbox" id="jMarV">6</span></div>' +
      '<div class="slid"><b>穩定門檻</b><input type="range" id="jThr" min="0" max="0.6" step="0.05" value="0.15">' +
      '<span class="vbox" id="jThrV">0.15 秒</span>' +
      '<button class="btn" id="jGo">開始</button></div>' +
      '<p style="margin:8px 0 0;font-size:.9rem;color:var(--ink2)">' +
      '兩根都拉到 0，就是完全沒有保險的版本——第三行會跟第一行一樣亂跳。' +
      '餘裕拉大，第二行就穩下來了；穩定門檻是最後一道，但它擋不住每秒跳十幾次的抖動，' +
      '因為時間窗永遠湊不滿。</p>';
    var rows = { raw: $('jRaw'), mar: $('jMar'), ok: $('jOk') }, vals = $('jVals');
    var N = 44, H = { raw: [], mar: [], ok: [] };
    var stateM = 0, sure = 0, last = 0, since = 0, t = 0;
    for (var i = 0; i < N; i++) { H.raw.push(0); H.mar.push(0); H.ok.push(0); }
    function step() {
      t += 0.06;
      // 指尖與關節的高度差：真實值 −2（微微彎著），加上 ±8 的雜訊
      var diff = -2 + (Math.random() * 16 - 8);
      var raw = diff > 0 ? 1 : 0;                                  // ① 只比大小
      if (stateM === 1) { if (diff < -margin) stateM = 0; }        // ② 遲滯
      else { if (diff > margin) stateM = 1; }
      if (stateM === last) { if (t - since > thr) sure = stateM; } // ③ 穩定時間
      else { since = t; last = stateM; }
      H.raw.push(raw); H.raw.shift();
      H.mar.push(stateM); H.mar.shift();
      H.ok.push(sure); H.ok.shift();
      rows.raw.innerHTML = H.raw.map(function (v) { return '<i class="a" style="height:' + (v ? 100 : 26) + '%"></i>'; }).join('');
      rows.mar.innerHTML = H.mar.map(function (v) { return '<i class="c" style="height:' + (v ? 100 : 26) + '%"></i>'; }).join('');
      rows.ok.innerHTML = H.ok.map(function (v) { return '<i class="b" style="height:' + (v ? 100 : 26) + '%"></i>'; }).join('');
      var flips = 0; for (var i = 1; i < N; i++) if (H.raw[i] !== H.raw[i - 1]) flips++;
      var flips3 = 0; for (var j = 1; j < N; j++) if (H.ok[j] !== H.ok[j - 1]) flips3++;
      vals.innerHTML = '<span class="vbox"><em>① 每 2.6 秒跳</em>' + flips + ' 次</span>' +
                       '<span class="vbox res"><em>③ 每 2.6 秒跳</em>' + flips3 + ' 次</span>';
    }
    $('jMarR').oninput = function () { margin = +this.value; $('jMarV').textContent = margin; };
    $('jThr').oninput = function () { thr = +this.value; $('jThrV').textContent = (+this.value).toFixed(2) + ' 秒'; };
    $('jGo').onclick = function () {
      if (timer) { clearInterval(timer); timer = null; this.textContent = '開始'; }
      else { timer = setInterval(step, 60); this.textContent = '停止'; }
    };
    for (var k = 0; k < N; k++) step();
  })();

  /* ============ 試玩台 ============ */
  (function () {
    var box = $('play'); if (!box) return;
    box.className = 'playbox';
    box.innerHTML =
      '<div class="btnrow" style="margin-bottom:12px">' +
      '<button class="btn" id="pNum">① 數字關 0～5（8 題）</button> ' +
      '<button class="btn" id="pRps">② 猜拳關（5 回合）</button> ' +
      '<button class="btn" id="pStop">回選單</button></div>' +
      '<div class="pstage" id="pStage"></div>' +
      '<div class="phud" id="pHud"></div>' +
      '<div id="pHand" style="margin-top:14px"></div>';
    var stage = $('pStage'), hud = $('pHud');
    var hand = makeHandLab('pHand', function () { tick(); });
    var mode = 'menu', score = 0, qn = 0, target = -1, prev = -1, deadline = 0, busy = false;
    var round = 0, pcHand = 0, empty = 0;

    function scene(html) { stage.innerHTML = html; }
    function setHud() {
      hud.innerHTML = mode === 'menu' ? '<span>選一個關卡開始</span>'
        : mode === 'num' ? '<span>第 ' + qn + ' / 8 題</span><span>分數 ' + score + '</span><span>剩 ' + Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) + ' 秒</span>'
        : '<span>第 ' + round + ' / 5 回合</span><span>分數 ' + score + '</span>';
    }
    function menu() {
      mode = 'menu'; busy = false; scene('<div class="mid">手勢辨識大挑戰</div><div class="sm">點上面的按鈕選關卡<br>下面那隻手就是「攝影機看到的你」</div>');
      setHud();
    }
    function askNum() {
      do { target = Math.floor(Math.random() * 6); } while (target === prev || target === cnt(hand.get()));
      prev = target; qn++; deadline = Date.now() + 8000; busy = false;
      scene('<div class="sm">比出這麼多根手指！（拇指也算）</div><div class="pcard"><div class="big">' + target + '</div></div>');
      setHud();
    }
    function numDone(okFlag) {
      busy = true;
      if (okFlag) score++;
      setHud();
      scene('<div class="sm">比出這麼多根手指！（拇指也算）</div><div class="pcard"><div class="big">' + target + '</div></div>' +
            '<div class="pbanner ' + (okFlag ? 'ok' : 'no') + '">' + (okFlag ? '答對了！' : '時間到') + '</div>');
      (okFlag ? SFX.ok : SFX.no)();
      setTimeout(function () {
        if (mode !== 'num') return;
        if (qn >= 8) { finish('數字關'); } else { askNum(); }
      }, 1100);
    }
    function finish(t2) {
      mode = 'menu'; busy = true;
      scene('<div class="mid">' + t2 + '結束</div><div class="big">' + score + '</div><div class="sm">分</div>');
      hud.innerHTML = '<span>再選一個關卡玩玩看</span>';
      SFX.win();
    }
    function rpsRound() {
      if (round >= 5) { finish('猜拳關'); return; }
      busy = true;
      var words = ['剪刀', '石頭', '布', '出拳！'], i = 0;
      (function nextWord() {
        if (mode !== 'rps') return;
        scene('<div class="mid" style="font-size:2.6rem;color:#FF3B7A">' + words[i] + '</div><div class="sm">下面那隻手，喊完「出拳！」就定案</div>');
        SFX.tick(); i++;
        if (i < words.length) { setTimeout(nextWord, 620); }
        else { setTimeout(judge, 620); }
      })();
    }
    function judge() {
      if (mode !== 'rps') return;
      var me = rpsOf(hand.get());
      if (!me) {
        empty++;
        scene('<div class="pbanner no">看不懂</div><div class="sm">石頭＝握拳　剪刀＝食指＋中指　布＝全張開<br>（猜拳不看拇指）這一回合不算，請再比一次</div>');
        SFX.no();
        if (empty > 5) { setTimeout(function () { menu(); }, 1400); return; }
        setTimeout(rpsRound, 1500); return;
      }
      empty = 0; round++; pcHand = 1 + Math.floor(Math.random() * 3);
      var tie = me === pcHand, win = ((me % 3) + 1) === pcHand;
      var res = tie ? '平手' : (win ? '你贏了' : '你輸了');
      if (win) score++;
      scene('<div class="hands2">' +
            '<figure>' + handSVG(rpsHand(me)) + '<figcaption>你　' + RPS[me] + '</figcaption></figure>' +
            '<figure>' + handSVG(rpsHand(pcHand)) + '<figcaption>電腦　' + RPS[pcHand] + '</figcaption></figure>' +
            '</div><div class="pbanner ' + (tie ? 'tie' : win ? 'win' : 'lose') + '">' + res + '</div>');
      (tie ? SFX.tie : win ? SFX.win : SFX.lose)();
      setHud();
      setTimeout(rpsRound, 1700);
    }
    function tick() {
      if (mode === 'num' && !busy) {
        if (cnt(hand.get()) === target) numDone(true);
      }
    }
    setInterval(function () {
      if (mode === 'num' && !busy) { setHud(); if (Date.now() > deadline) numDone(false); }
    }, 250);
    $('pNum').onclick = function () { mode = 'num'; score = 0; qn = 0; prev = -1; askNum(); };
    $('pRps').onclick = function () { mode = 'rps'; score = 0; round = 0; empty = 0; rpsRound(); };
    $('pStop').onclick = menu;
    menu();
  })();

  /* ============ 自我檢核 ============ */
  (function () {
    var boxes = document.querySelectorAll('.self input[type=checkbox]');
    if (!boxes.length) return;
    var KEY = 'hand-check-v1';
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { saved = {}; }
    function upd() {
      var n = 0;
      boxes.forEach(function (b) { if (b.checked) n++; });
      var bar = $('pbar'); if (bar) bar.style.width = Math.round(n / boxes.length * 100) + '%';
    }
    boxes.forEach(function (b, i) {
      b.checked = !!saved['c' + i];
      b.addEventListener('change', function () {
        saved['c' + i] = b.checked;
        try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {}
        upd();
      });
    });
    upd();
  })();
})();
