/* =========================================================
   aivideo.js — AI 擴充功能共用的攝影機來源
   Handpose2Scratch 與 Facemesh2Scratch 共用同一份，
   所以同一個作品即使兩個都用到，也只會開一次攝影機。
   ========================================================= */
(function () {
  'use strict';
  if (window.SB3Video) return;

  var ANALYZE_W = 640, ANALYZE_H = 480;   // 原擴充功能的分析尺寸，不要改

  function VideoProvider() {
    this._video = null;
    this._track = null;
    this._setupPromise = null;
    this.mirror = true;
    this.enabled = false;
    this._canvas = {};
    this._cache = {};
    this.error = null;
  }
  VideoProvider.prototype = {
    get video() { return this._video; },
    get videoReady() {
      return !!(this.enabled && this._track && this._video &&
                this._video.videoWidth > 0 && this._video.readyState >= 2);
    },
    enableVideo: function () {
      this.enabled = true;
      return this._setup();
    },
    disableVideo: function () {
      this.enabled = false;
      if (this._track) { try { this._track.stop(); } catch (e) {} }
      if (this._video) { try { this._video.pause(); } catch (e) {} }
      this._track = null; this._video = null; this._setupPromise = null;
    },
    _setup: function () {
      var self = this;
      if (this._setupPromise) return this._setupPromise;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.error = '這個瀏覽器不支援攝影機';
        this._setupPromise = Promise.reject(new Error(this.error));
        return this._setupPromise;
      }
      this._setupPromise = navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { width: { ideal: ANALYZE_W }, height: { ideal: ANALYZE_H } }
      }).then(function (stream) {
        var v = document.createElement('video');
        v.setAttribute('playsinline', '');
        v.muted = true;
        v.srcObject = stream;
        self._video = v;
        self._track = stream.getVideoTracks()[0];
        self.error = null;
        return v.play().then(function () { return self; }, function () { return self; });
      }, function (e) {
        self.error = '攝影機無法開啟（' + (e && e.name) + '）';
        self._setupPromise = null;
        throw e;
      });
      return this._setupPromise;
    },
    _getCanvas: function (w, h) {
      var key = w + 'x' + h;
      if (!this._canvas[key]) {
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        this._canvas[key] = { canvas: c, ctx: c.getContext('2d', { willReadFrequently: true }) };
      }
      return this._canvas[key];
    },
    /** 把攝影機畫面畫到 canvas 上，回傳 ImageData 或 canvas。 */
    getFrame: function (o) {
      o = o || {};
      var dims = o.dimensions || [480, 360];
      var mirror = (o.mirror === undefined) ? this.mirror : o.mirror;
      var format = o.format || 'image-data';
      var timeout = (o.cacheTimeout === undefined) ? 16 : o.cacheTimeout;
      if (!this.videoReady) return null;

      var key = dims[0] + 'x' + dims[1] + '|' + (mirror ? 1 : 0) + '|' + format;
      var now = Date.now(), hit = this._cache[key];
      if (hit && (now - hit.t) < timeout) return hit.v;

      var cc = this._getCanvas(dims[0], dims[1]), ctx = cc.ctx;
      ctx.save();
      if (mirror) { ctx.scale(-1, 1); ctx.translate(-dims[0], 0); }
      var vw = this._video.videoWidth, vh = this._video.videoHeight;
      var s = Math.max(dims[0] / vw, dims[1] / vh);   // 依短邊填滿並置中，不要把畫面拉扁
      var dw = vw * s, dh = vh * s;
      ctx.drawImage(this._video, (dims[0] - dw) / 2, (dims[1] - dh) / 2, dw, dh);
      ctx.restore();

      var out = (format === 'canvas') ? cc.canvas : ctx.getImageData(0, 0, dims[0], dims[1]);
      this._cache[key] = { t: now, v: out };
      return out;
    }
  };

  /** 把 base64 資產轉成 blob 網址（file:// 也能用，不需要網路）。 */
  function makeBlobs(assets) {
    var urls = {};
    for (var name in assets) {
      var mime = assets[name][0], b = atob(assets[name][1]);
      var arr = new Uint8Array(b.length);
      for (var i = 0; i < b.length; i++) arr[i] = b.charCodeAt(i);
      urls[name] = URL.createObjectURL(new Blob([arr], { type: mime }));
    }
    return urls;
  }

  /** 註冊一個內建擴充功能到 VM。 */
  function registerExtension(vm, id, ext) {
    var em = vm.extensionManager;
    if (!em.__sb3Patched) {
      em.__sb3Map = {};
      var orig = em.loadExtensionURL.bind(em);
      em.loadExtensionURL = function (extId) {
        if (em.__sb3Map[extId]) {
          if (!em.isExtensionLoaded(extId)) {
            em._loadedExtensions.set(extId, em._registerInternalExtension(em.__sb3Map[extId]));
          }
          return Promise.resolve();
        }
        return orig(extId);
      };
      em.__sb3Patched = true;
    }
    em.__sb3Map[id] = ext;
  }

  var shared = null;
  window.SB3Video = {
    ANALYZE_W: ANALYZE_W,
    ANALYZE_H: ANALYZE_H,
    makeBlobs: makeBlobs,
    registerExtension: registerExtension,
    /** 取得共用的攝影機來源（第一次呼叫時掛到 VM 上）。 */
    get: function (vm) {
      if (!shared) {
        shared = new VideoProvider();
        vm.runtime.ioDevices.video.setProvider(shared);
      }
      return shared;
    }
  };
})();
