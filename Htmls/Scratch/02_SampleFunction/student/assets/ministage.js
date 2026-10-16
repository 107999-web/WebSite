/* =========================================================
   ministage.js — 網頁裡的迷你 Scratch 舞台（480 × 360 座標，y 向上）
   給試玩台用：角色有 x、y、尺寸、方向、幻影、顯示／隱藏、造型、對話框、分身。
   試玩台的函式都照 .sb3 裡的積木「一句一句」翻成 JavaScript，數字完全一樣。
   ========================================================= */
var MS = (function () {
  'use strict';
  var IMG = 'assets/img/';
  var STOP = { stop: true };

  function Stage(el, opt) {
    opt = opt || {};
    var self = this;
    this.el = el;
    el.classList.add('mst');
    el.innerHTML = '<div class="mst-in"><div class="mst-bg"></div><div class="mst-spr"></div><div class="mst-ui"></div></div>';
    this.inner = el.querySelector('.mst-in');
    this.layer = el.querySelector('.mst-spr');
    this.ui = el.querySelector('.mst-ui');
    if (opt.ground) {
      var g = document.createElement('div'); g.className = 'mst-ground'; g.style.height = opt.ground + 'px';
      el.querySelector('.mst-bg').appendChild(g);
    }
    this.sprites = [];
    this.t0 = performance.now();
    this.gen = 0;
    this.mx = 0; this.my = 0; this.keys = {};
    this.onframe = [];
    function fit() { var k = el.clientWidth / 480; self.inner.style.transform = 'scale(' + k + ')'; el.style.height = (360 * k) + 'px'; }
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(el); else window.addEventListener('resize', fit);
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      self.mx = Math.round((e.clientX - r.left) / r.width * 480 - 240);
      self.my = Math.round(180 - (e.clientY - r.top) / r.height * 360);
    });
    (function loop() {
      self.onframe.forEach(function (f) { try { f(); } catch (e) { /* 單一畫面錯誤不影響 */ } });
      self.sprites.forEach(function (s) { s.draw(); });
      requestAnimationFrame(loop);
    })();
  }
  Stage.prototype.timer = function () { return (performance.now() - this.t0) / 1000; };
  Stage.prototype.resetTimer = function () { this.t0 = performance.now(); };
  /* 每一次按按鈕就是一個新的「程式」；stopAll() 讓正在跑的全部停下來 */
  Stage.prototype.token = function () { return this.gen; };
  Stage.prototype.stopAll = function () { this.gen++; };
  Stage.prototype.frame = function (tok) {
    var self = this;
    return new Promise(function (res, rej) {
      requestAnimationFrame(function () { if (tok !== undefined && tok !== self.gen) rej(STOP); else res(); });
    });
  };
  Stage.prototype.wait = function (s, tok) {
    var self = this;
    return new Promise(function (res, rej) {
      setTimeout(function () { if (tok !== undefined && tok !== self.gen) rej(STOP); else res(); }, Math.max(0, s * 1000));
    });
  };
  Stage.prototype.add = function (o) { var s = new Sprite(this, o); this.sprites.push(s); return s; };
  Stage.prototype.clones = function (name) { return this.sprites.filter(function (s) { return s.name === name && s.isClone; }); };
  Stage.prototype.run = function (fn) {       // 跑一段「程式」，被停止時安靜結束
    var p = fn(this.token());
    if (p && p.catch) p.catch(function (e) { if (e !== STOP) console.error(e); });
    return p;
  };

  function Sprite(st, o) {
    this.st = st; this.name = o.name || '角色';
    this.costumes = o.costumes || ['yy1']; this.ci = 0;
    this.w = o.w || 110; this.h = o.h || 110;
    this.cx = o.cx != null ? o.cx : this.w / 2; this.cy = o.cy != null ? o.cy : this.h / 2;
    this.x = o.x || 0; this.y = o.y || 0; this.size = o.size || 100; this.dir = 90; this.ghost = 0; this.color = 0;
    this.visible = o.visible !== false; this.text = ''; this.isClone = !!o.isClone; this.vars = {};
    this.rot = o.rot || 'all';
    this.el = document.createElement('div'); this.el.className = 'mst-s';
    this.img = document.createElement('img'); this.img.alt = this.name; this.img.draggable = false;
    this.img.style.width = this.w + 'px'; this.img.style.height = this.h + 'px';
    this.el.appendChild(this.img);
    this.bub = document.createElement('div'); this.bub.className = 'mst-bub';
    st.layer.appendChild(this.el); st.layer.appendChild(this.bub);
    this.setCostume(0);
  }
  Sprite.prototype.setCostume = function (i) {
    var n = this.costumes.length; this.ci = ((i % n) + n) % n;
    this.img.src = IMG + this.costumes[this.ci] + '.svg';
  };
  Sprite.prototype.next = function () { this.setCostume(this.ci + 1); };
  Sprite.prototype.costumeNo = function () { return this.ci + 1; };
  /* Scratch 會把角色留至少 15 點在舞台上（不能整個移出去） */
  Sprite.prototype.fence = function () {
    var hw = this.w * this.size / 200, hh = this.h * this.size / 200, ix = Math.min(15, hw), iy = Math.min(15, hh);
    this.x = Math.max(-240 - hw + ix, Math.min(240 + hw - ix, this.x));
    this.y = Math.max(-180 - hh + iy, Math.min(180 + hh - iy, this.y));
  };
  Sprite.prototype.goto = function (x, y) { this.x = +x; this.y = +y; this.fence(); };
  Sprite.prototype.setX = function (x) { this.goto(x, this.y); };
  Sprite.prototype.setY = function (y) { this.goto(this.x, y); };
  Sprite.prototype.setSize = function (s) { this.size = Math.max(5, Math.min(490, +s)); };
  Sprite.prototype.say = function (t) { this.text = t == null ? '' : String(t); };
  Sprite.prototype.clearFx = function () { this.ghost = 0; this.color = 0; };
  Sprite.prototype.clone = function () {
    var c = this.st.add({ name: this.name, costumes: this.costumes, w: this.w, h: this.h, cx: this.cx, cy: this.cy,
      x: this.x, y: this.y, size: this.size, visible: this.visible, isClone: true, rot: this.rot });
    c.dir = this.dir; c.ghost = this.ghost; c.ci = this.ci; c.setCostume(this.ci);
    c.vars = JSON.parse(JSON.stringify(this.vars));        // 分身複製一份「僅適用當前角色」的變數
    this.st.layer.insertBefore(c.el, this.el.nextSibling);
    return c;
  };
  Sprite.prototype.remove = function () {
    if (!this.isClone) return;                               // 「刪除這個分身」對本體沒有作用
    this.el.remove(); this.bub.remove();
    var a = this.st.sprites; a.splice(a.indexOf(this), 1);
  };
  Sprite.prototype.front = function () { this.st.layer.appendChild(this.el); this.st.layer.appendChild(this.bub); };
  Sprite.prototype.draw = function () {
    var sc = this.size / 100, rot = this.rot === 'all' ? this.dir - 90 : 0;
    this.el.style.display = this.visible ? '' : 'none';
    this.el.style.transform = 'translate(' + (240 + this.x) + 'px,' + (180 - this.y) + 'px) rotate(' + rot + 'deg) scale(' + sc + ') translate(' + (-this.cx) + 'px,' + (-this.cy) + 'px)';
    this.el.style.opacity = String(1 - Math.max(0, Math.min(100, this.ghost)) / 100);
    this.el.style.filter = this.color ? 'hue-rotate(' + (this.color * 1.8) + 'deg)' : '';
    var show = this.visible && this.text !== '';
    this.bub.style.display = show ? '' : 'none';
    if (show) {
      if (this.bub.textContent !== this.text) this.bub.textContent = this.text;
      var top = 180 - this.y - (this.h - this.cy) * 0 - this.cy * sc;
      var bx = Math.min(240 + this.x + this.w * sc * 0.25, 480 - 170);
      this.bub.style.transform = 'translate(' + Math.max(4, bx) + 'px,' + Math.max(4, top - 8) + 'px) translateY(-100%)';
    }
  };

  return { Stage: Stage, STOP: STOP };
})();
