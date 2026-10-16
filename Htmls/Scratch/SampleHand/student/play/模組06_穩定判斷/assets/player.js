/* =========================================================
   player.js — 由「SB3 轉網頁工具」產生的播放器
   功能：載入 .sb3、綠旗／停止、滑鼠與鍵盤、變數監看視窗、詢問輸入、全螢幕
   ========================================================= */
(function () {
  'use strict';
  var L = window.ScratchLibs || {};
  function pick(m) { return (m && m.default) ? m.default : m; }
  var VM = pick(L.VirtualMachine), Render = pick(L.ScratchRender),
      AudioEngine = pick(L.AudioEngine), Storage = pick(L.ScratchStorage),
      SVGRenderer = pick(L.SVGRenderer), BitmapAdapter = pick(L.BitmapAdapter);

  var STAGE_W = 480, STAGE_H = 360;

  function $(id) { return document.getElementById(id); }
  function b64ToBuf(b64) {
    var bin = atob(b64), len = bin.length, bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  function get(rec, key) {
    if (!rec) return undefined;
    return (typeof rec.get === 'function') ? rec.get(key) : rec[key];
  }

  /* ---------- 監看視窗的名稱 ---------- */
  var OPCODE_NAME = {
    motion_xposition: 'x 座標', motion_yposition: 'y 座標', motion_direction: '方向',
    looks_costumenumbername: '造型', looks_backdropnumbername: '背景', looks_size: '尺寸',
    sound_volume: '音量', sensing_answer: '詢問的答案', sensing_loudness: '響度',
    sensing_timer: '計時器', sensing_current: '目前時間', sensing_dayssince2000: '2000 年至今的天數',
    sensing_username: '使用者名稱', music_getTempo: '節奏'
  };
  function monitorLabel(m) {
    var opcode = get(m, 'opcode'), params = get(m, 'params') || {}, sprite = get(m, 'spriteName');
    var p = (typeof params.toJS === 'function') ? params.toJS() : params;
    var name;
    if (opcode === 'data_variable') name = p.VARIABLE;
    else if (opcode === 'data_listcontents') name = p.LIST;
    else {
      name = OPCODE_NAME[opcode] || opcode;
      var extra = [];
      for (var k in p) if (p[k] != null && k !== 'VARIABLE' && k !== 'LIST') extra.push(p[k]);
      if (extra.length) name += ' ' + extra.join(' ');
    }
    return sprite ? (sprite + ': ' + name) : name;
  }

  /* ---------- 建立播放器 ---------- */
  window.ScratchPlayer = function (opts) {
    var canvas = opts.canvas, layer = opts.monitorLayer, box = opts.stageBox;
    var vm = new VM();
    window.vm = vm;                                   // 方便老師在主控台除錯
    try { vm.attachStorage(new Storage()); } catch (e) { console.warn('storage:', e); }
    var renderer = new Render(canvas);
    vm.attachRenderer(renderer);
    try { vm.attachAudioEngine(new AudioEngine()); } catch (e) { console.warn('audio:', e); }

    // AI 擴充功能：只有轉換時有帶模型才會存在
    ['SB3Handpose', 'SB3Facemesh'].forEach(function (k) {
      if (window[k] && typeof window[k].install === 'function') {
        try { window[k].install(vm); } catch (e) { console.warn(k + ':', e); }
      }
    });
    try { vm.attachV2SVGAdapter(new SVGRenderer()); } catch (e) { console.warn('svg:', e); }
    try { vm.attachV2BitmapAdapter(new BitmapAdapter()); } catch (e) { console.warn('bitmap:', e); }
    vm.setTurboMode(false);
    vm.setCompatibilityMode(true);

    /* ----- 滑鼠 ----- */
    var mouseDown = false;
    function postMouse(e, extra) {
      var r = canvas.getBoundingClientRect();
      var data = {
        isDown: mouseDown,
        x: e.clientX - r.left, y: e.clientY - r.top,
        canvasWidth: r.width, canvasHeight: r.height
      };
      for (var k in (extra || {})) data[k] = extra[k];
      vm.postIOData('mouse', data);
    }
    canvas.addEventListener('mousemove', function (e) { postMouse(e); });
    canvas.addEventListener('mousedown', function (e) {
      mouseDown = true; postMouse(e); e.preventDefault(); canvas.focus();
    });
    document.addEventListener('mouseup', function (e) { mouseDown = false; postMouse(e); });
    canvas.addEventListener('touchstart', function (e) {
      mouseDown = true; postMouse(e.changedTouches[0]); e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', function (e) {
      postMouse(e.changedTouches[0]); e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', function (e) { mouseDown = false; postMouse(e.changedTouches[0]); });

    /* ----- 鍵盤 ----- */
    function postKey(e, isDown) {
      if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      vm.postIOData('keyboard', { key: e.key, keyCode: e.keyCode, isDown: isDown });
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) >= 0) e.preventDefault();
    }
    document.addEventListener('keydown', function (e) { postKey(e, true); });
    document.addEventListener('keyup', function (e) { postKey(e, false); });

    /* ----- 監看視窗 ----- */
    var monEls = {};
    function fitMonitors() {
      if (!layer) return;
      var r = canvas.getBoundingClientRect();
      if (!r.width) return;
      layer.style.width = STAGE_W + 'px';
      layer.style.height = STAGE_H + 'px';
      layer.style.transformOrigin = '0 0';
      layer.style.transform = 'scale(' + (r.width / STAGE_W) + ')';
    }
    window.addEventListener('resize', fitMonitors);
    document.addEventListener('fullscreenchange', function () { setTimeout(fitMonitors, 60); });
    setInterval(fitMonitors, 500);
    fitMonitors();
    function renderMonitors(monitors) {
      if (!layer) return;
      var seen = {};
      monitors.forEach(function (m, id) {
        seen[id] = true;
        var visible = get(m, 'visible');
        var el = monEls[id];
        if (!visible) { if (el) el.style.display = 'none'; return; }
        var mode = get(m, 'mode') || 'default';
        var value = get(m, 'value');
        if (!el) {
          el = document.createElement('div');
          el.className = 'mon mon-' + mode;
          el.innerHTML = '<span class="mon-label"></span><span class="mon-value"></span>';
          layer.appendChild(el); monEls[id] = el;
        }
        el.style.display = '';
        el.className = 'mon mon-' + mode;
        el.style.left = (get(m, 'x') || 0) + 'px';
        el.style.top = (get(m, 'y') || 0) + 'px';
        var lab = el.querySelector('.mon-label'), val = el.querySelector('.mon-value');
        if (mode === 'large') {
          lab.style.display = 'none';
          val.textContent = value;
        } else if (mode === 'list') {
          lab.style.display = '';
          lab.textContent = monitorLabel(m);
          var arr = (value && typeof value.toJS === 'function') ? value.toJS() : (value || []);
          var rows = arr.slice(0, 200).map(function (v, i) {
            return '<div class="mon-row"><b>' + (i + 1) + '</b>' + String(v) + '</div>';
          }).join('');
          val.innerHTML = '<div class="mon-list">' + rows + '</div><div class="mon-len">長度 ' + arr.length + '</div>';
        } else {
          lab.style.display = '';
          lab.textContent = monitorLabel(m);
          val.textContent = value;
        }
      });
      for (var id in monEls) if (!seen[id]) monEls[id].style.display = 'none';
    }
    vm.on('MONITORS_UPDATE', renderMonitors);

    /* ----- 詢問並等待 ----- */
    var askBar = opts.askBar, askInput = opts.askInput, askBtn = opts.askBtn, askLabel = opts.askLabel;
    if (askBar) {
      vm.runtime.on('QUESTION', function (question) {
        if (question === null) { askBar.style.display = 'none'; return; }
        askBar.style.display = '';
        askLabel.textContent = question || '';
        askInput.value = '';
        askInput.focus();
      });
      function answer() {
        vm.runtime.emit('ANSWER', askInput.value);
        askBar.style.display = 'none';
      }
      askBtn.addEventListener('click', answer);
      askInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); answer(); } });
    }

    /* ----- 載入專案 ----- */
    return vm.loadProject(b64ToBuf(opts.data)).then(function () {
      vm.start();
      fitMonitors();
      return vm;
    });
  };
})();
