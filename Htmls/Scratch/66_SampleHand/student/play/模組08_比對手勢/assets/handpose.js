/* =========================================================
   handpose.js — 讓轉出來的網頁支援 Handpose2Scratch 積木
   ---------------------------------------------------------
   積木與座標換算完全比照 stretch3 上的 Handpose2Scratch：
     x 座標 = 240 − 像素x × 倍率（不鏡像時整組變號）
     y 座標 = 180 − 像素y × 倍率
     偵測不到手時回傳「空字串」，不是 0
   分析畫面固定 640×480，與原擴充功能一致。
   模型：MediaPipe Hands，全部內嵌，不需要網路。
   ========================================================= */
(function () {
  'use strict';
  var V = window.SB3Video;
  if (!V) { console.warn('handpose: 缺少 aivideo.js'); return; }
  var W = V.ANALYZE_W, H = V.ANALYZE_H;

  function HandTracker(provider) {
    this.provider = provider;
    this.landmarks = [];          // [[px, py, z], …] 共 21 點，抓不到時為空陣列
    this._hands = null; this._busy = false; this._running = false; this._blobs = null;
    this.status = '尚未啟動';
  }
  HandTracker.prototype.start = function () {
    var self = this;
    if (this._running) return;
    if (typeof window.Hands !== 'function') { this.status = '缺少手部偵測模型'; return; }
    this._running = true;
    this.status = '正在載入手部模型…';
    if (!this._blobs) this._blobs = V.makeBlobs(window.HP_ASSETS || {});
    var urls = this._blobs;
    this._hands = new window.Hands({ locateFile: function (f) { return urls[f] || f; } });
    this._hands.setOptions({
      maxNumHands: 1, modelComplexity: 0,
      minDetectionConfidence: 0.5, minTrackingConfidence: 0.5
    });
    this._hands.onResults(function (res) {
      var list = res && res.multiHandLandmarks;
      if (list && list.length) {
        var L = list[0], out = [];
        for (var i = 0; i < L.length; i++) out.push([L[i].x * W, L[i].y * H, L[i].z || 0]);
        self.landmarks = out; self.status = '偵測中';
      } else { self.landmarks = []; self.status = '看不到手'; }
      self._busy = false;
    });
    (function loop() {
      if (!self._running) return;
      if (!self._busy && self.provider.videoReady) {
        var cv = self.provider.getFrame({ dimensions: [W, H], mirror: false, format: 'canvas', cacheTimeout: 0 });
        if (cv) {
          self._busy = true;
          try { self._hands.send({ image: cv }).catch(function () { self._busy = false; }); }
          catch (e) { self._busy = false; }
        }
      }
      setTimeout(loop, 60);
    })();
  };
  HandTracker.prototype.stop = function () {
    this._running = false; this.landmarks = []; this.status = '已停止';
  };

  function Handpose2Scratch(runtime, tracker) {
    this.runtime = runtime; this.tracker = tracker;
    this.ratio = 0.75; this.mirror = true;
  }
  Handpose2Scratch.prototype.getInfo = function () {
    var LM = ['1 手腕',
      '2 拇指根部', '3 拇指第二關節', '4 拇指第一關節', '5 拇指尖',
      '6 食指第三關節', '7 食指第二關節', '8 食指第一關節', '9 食指尖',
      '10 中指第三關節', '11 中指第二關節', '12 中指第一關節', '13 中指尖',
      '14 無名指第三關節', '15 無名指第二關節', '16 無名指第一關節', '17 無名指尖',
      '18 小指第三關節', '19 小指第二關節', '20 小指第一關節', '21 小指尖'];
    var arg = { LANDMARK: { type: 'string', menu: 'landmark', defaultValue: '1' } };
    return {
      id: 'handpose2scratch', name: 'Handpose2Scratch',
      blocks: [
        { opcode: 'getX', blockType: 'reporter', text: '[LANDMARK] 的 x 座標', arguments: arg },
        { opcode: 'getY', blockType: 'reporter', text: '[LANDMARK] 的 y 座標', arguments: arg },
        { opcode: 'getZ', blockType: 'reporter', text: '[LANDMARK] 的 z 座標', arguments: arg },
        { opcode: 'videoToggle', blockType: 'command', text: '將攝影機 [VIDEO_STATE]',
          arguments: { VIDEO_STATE: { type: 'string', menu: 'videoMenu', defaultValue: 'on' } } },
        { opcode: 'setVideoTransparency', blockType: 'command', text: '將攝影機的透明度設為 [TRANSPARENCY]',
          arguments: { TRANSPARENCY: { type: 'number', defaultValue: 50 } } },
        { opcode: 'setRatio', blockType: 'command', text: '將倍率設為 [RATIO]',
          arguments: { RATIO: { type: 'string', menu: 'ratioMenu', defaultValue: '0.75' } } }
      ],
      menus: {
        landmark: { acceptReporters: true,
          items: LM.map(function (t, i) { return { text: t, value: String(i + 1) }; }) },
        videoMenu: { acceptReporters: true, items: [
          { text: '關閉', value: 'off' }, { text: '鏡像開啟', value: 'on' },
          { text: '開啟（不鏡像）', value: 'on-flipped' }] },
        ratioMenu: { acceptReporters: true, items: ['0.5', '0.75', '1', '1.5', '2.0'] }
      }
    };
  };
  Handpose2Scratch.prototype._pt = function (n) {
    var i = parseInt(n, 10) - 1, L = this.tracker.landmarks;
    return (i >= 0 && i < L.length) ? L[i] : null;
  };
  Handpose2Scratch.prototype.getX = function (a) {
    var p = this._pt(a.LANDMARK); if (!p) return '';   // ← 偵測不到時回傳空字串
    var v = 240 - p[0] * this.ratio;
    return this.mirror ? v : -v;
  };
  Handpose2Scratch.prototype.getY = function (a) {
    var p = this._pt(a.LANDMARK); return p ? (180 - p[1] * this.ratio) : '';
  };
  Handpose2Scratch.prototype.getZ = function (a) {
    var p = this._pt(a.LANDMARK); return p ? p[2] : '';
  };
  Handpose2Scratch.prototype.videoToggle = function (a) {
    var video = this.runtime.ioDevices.video, self = this;
    if (a.VIDEO_STATE === 'off') { video.disableVideo(); this.tracker.stop(); return; }
    this.mirror = (a.VIDEO_STATE === 'on');
    video.mirror = this.mirror;
    var r = video.enableVideo();
    if (r && r.then) r.then(function () { self.tracker.start(); },
                            function () { self.tracker.status = self.tracker.provider.error || '攝影機無法開啟'; });
    else this.tracker.start();
  };
  Handpose2Scratch.prototype.setVideoTransparency = function (a) {
    this.runtime.ioDevices.video.setPreviewGhost(Number(a.TRANSPARENCY) || 0);
  };
  Handpose2Scratch.prototype.setRatio = function (a) {
    var v = parseFloat(a.RATIO); if (!isNaN(v) && v > 0) this.ratio = v;
  };

  window.SB3Handpose = {
    install: function (vm) {
      var provider = V.get(vm);
      var tracker = new HandTracker(provider);
      var ext = new Handpose2Scratch(vm.runtime, tracker);
      V.registerExtension(vm, 'handpose2scratch', ext);
      window.__handpose = { provider: provider, tracker: tracker, ext: ext };
      return ext;
    }
  };
})();
