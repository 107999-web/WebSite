// 觸控操作（平板、手機）：左半邊浮動搖桿移動英雄、右下攻擊／技能。沿用《騎士與骷髏》。
// 手指點到台座時不推搖桿，改開蓋塔選單（onTap 回傳 true 就算用掉了）。
// 觸控裝置（或第一次用手指點畫面）才出現；網址加 ?touch=1 強制開、?touch=0 強制關。
const STICK_RADIUS = 56;
const DEAD_ZONE = 0.15;
const FULL_SPEED = 0.7;
const ATTACK_HOLD = 0.22;

const SWORDS = `<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke-linecap="round" stroke-linejoin="round">
  <path d="M14 10 L46 42" stroke="#fff6df" stroke-width="7"/><path d="M50 10 L18 42" stroke="#fff6df" stroke-width="7"/>
  <path d="M38 46 L48 36 M26 46 L16 36" stroke="#f2c14e" stroke-width="6"/>
  <path d="M46 45 L54 53 M18 45 L10 53" stroke="#8a5a1c" stroke-width="7"/></g></svg>`;

const html = `
<div id="stickZone"><div id="stick"><i id="stickKnob"></i></div></div>
<div id="tButtons">
  <button id="tSkill" class="tBtn small" hidden><b></b><span class="cd"></span></button>
  <button id="tAttack" class="tBtn big" aria-label="攻擊">${SWORDS}<b>攻擊</b></button>
</div>`;

export class TouchControls {
  constructor(input, { onPause, onTap }) {
    this.input = input;
    this.onPause = onPause;
    this.onTap = onTap;
    this.el = document.createElement('div');
    this.el.id = 'touch';
    this.el.hidden = true;
    this.el.innerHTML = html;
    document.body.append(this.el);
    this.hint = document.createElement('div');
    this.hint.id = 'rotateHint';
    this.hint.innerHTML = '<div><span>📱</span><b>請把平板或手機轉成橫向</b><small>橫著拿畫面比較大，左手移動、右手攻擊</small></div>';
    document.body.append(this.hint);
    this.portrait = matchMedia('(orientation: portrait)');
    this.stick = null;

    const forced = new URLSearchParams(location.search).get('touch');
    this.setMode(forced ? forced === '1' : matchMedia('(pointer: coarse)').matches);
    if (forced === null) addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') this.setMode(true); }, true);

    this.setupStick();
    this.hold('tAttack', () => { input.attackHeld = true; input.attackBuffer = ATTACK_HOLD; }, () => { input.attackHeld = false; });
    this.hold('tSkill', () => { input.skillPressed = true; });
    for (const type of ['gesturestart', 'gesturechange']) document.addEventListener(type, (e) => e.preventDefault());
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setMode(on) {
    if (this.mode === on) return;
    this.mode = on;
    document.body.classList.toggle('touch', on);
  }

  hold(id, down, up = () => {}) {
    const btn = this.el.querySelector(`#${id}`);
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btn.setPointerCapture?.(e.pointerId);
      btn.classList.add('down');
      down();
    });
    const release = () => { btn.classList.remove('down'); up(); };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(type, release);
  }

  setupStick() {
    const zone = this.el.querySelector('#stickZone');
    this.base = this.el.querySelector('#stick');
    this.knob = this.el.querySelector('#stickKnob');
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.stick) return;
      if (this.onTap?.(e)) return; // 點到台座
      zone.setPointerCapture?.(e.pointerId);
      this.stick = { id: e.pointerId, x: e.clientX, y: e.clientY };
      this.base.classList.add('active');
      const box = zone.getBoundingClientRect();
      const r = this.base.offsetWidth / 2 + 4;
      this.base.style.left = `${Math.max(r, e.clientX - box.left)}px`;
      this.base.style.top = `${Math.min(box.height - r, Math.max(r, e.clientY - box.top))}px`;
      this.moveKnob(0, 0);
    });
    zone.addEventListener('pointermove', (e) => {
      if (this.stick?.id !== e.pointerId) return;
      this.moveKnob(e.clientX - this.stick.x, e.clientY - this.stick.y);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      zone.addEventListener(type, (e) => { if (this.stick?.id === e.pointerId) this.releaseStick(); });
    }
  }

  moveKnob(dx, dy) {
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, STICK_RADIUS);
    const kx = dist ? (dx / dist) * clamped : 0, ky = dist ? (dy / dist) * clamped : 0;
    this.knob.style.transform = `translate(${kx}px, ${ky}px)`;
    const amount = clamped / STICK_RADIUS;
    if (amount < DEAD_ZONE) { this.input.touchMove = null; return; }
    const strength = Math.min(1, (amount - DEAD_ZONE) / (FULL_SPEED - DEAD_ZONE));
    this.input.touchMove = { x: (dx / dist) * strength, z: (dy / dist) * strength };
  }

  releaseStick() {
    this.stick = null;
    this.input.touchMove = null;
    this.base.classList.remove('active');
    this.base.style.left = '';
    this.base.style.top = '';
    this.knob.style.transform = '';
  }

  update(state) {
    const show = this.mode && state === 'playing';
    if (this.el.hidden === show) this.el.hidden = !show;
    if (!show) {
      if (this.stick) this.releaseStick();
      this.input.attackHeld = false;
      for (const b of this.el.querySelectorAll('.down')) b.classList.remove('down');
    }
    if (this.mode && state === 'playing' && this.portrait.matches) this.onPause?.();
  }

  setSkill(skill) {
    const btn = this.el.querySelector('#tSkill');
    btn.hidden = !skill;
    if (!skill) return;
    const state = skill.cooldown > 0 ? 'cooling' : 'ready';
    const seconds = skill.cooldown > 0 ? Math.ceil(skill.cooldown) : '';
    const key = `${skill.name}|${state}|${seconds}`;
    if (btn.dataset.key === key) return;
    btn.dataset.key = key;
    btn.className = `tBtn small ${state}${btn.classList.contains('down') ? ' down' : ''}`;
    btn.style.setProperty('--c', skill.color);
    btn.querySelector('b').textContent = skill.name;
    btn.querySelector('.cd').textContent = seconds;
  }
}
