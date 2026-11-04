// 蓋塔／升級選單：點台座（或英雄站在台座旁按 E）時，出現在台座旁邊。
// 數字鍵 1～4 直接選，Esc 或點別的地方關閉。options：[{ icon, name, cost, note, enabled, done, onPick, onHover }]
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export class BuildMenu {
  constructor() {
    this.el = document.getElementById('buildMenu');
    this.options = [];
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  get open() { return !this.el.hidden; }

  show({ title, x, y, options, onHoverEnd }) {
    this.options = options;
    this.el.innerHTML = `<h4>${esc(title)}</h4>${options.map((o, i) => `
      <button class="bOpt ${o.enabled ? '' : 'off'} ${o.kind ?? ''}" data-i="${i}">
        <kbd>${i + 1}</kbd>${o.image ? `<img src="${o.image}" alt="">` : `<span class="bIcon">${o.icon ?? ''}</span>`}
        <span class="bInfo"><b>${esc(o.name)}</b><small>${esc(o.note ?? '')}</small></span>
        <span class="bCost ${o.refund ? 'refund' : ''}">${o.cost === null || o.cost === undefined ? '' : `${o.refund ? '+' : ''}${o.cost}`}</span>
      </button>`).join('')}`;
    this.el.hidden = false;
    this.el.querySelectorAll('.bOpt').forEach((b) => {
      const o = options[b.dataset.i];
      b.onclick = () => this.pick(Number(b.dataset.i));
      b.onpointerenter = () => o.onHover?.();
      b.onpointerleave = () => onHoverEnd?.();
    });
    this.place(x, y);
  }

  // 放在台座旁邊；太靠右或太靠下就換邊，不跑出畫面
  place(x, y) {
    const { offsetWidth: w, offsetHeight: h } = this.el;
    const left = x + 40 + w > innerWidth - 8 ? x - 40 - w : x + 40;
    const top = Math.min(innerHeight - h - 8, Math.max(8, y - h / 2));
    this.el.style.left = `${Math.max(8, left)}px`;
    this.el.style.top = `${top}px`;
  }

  pick(i) {
    const o = this.options[i];
    if (!o) return false;
    if (!o.enabled) { o.onDenied?.(); return true; }
    o.onPick();
    return true;
  }

  hide() {
    this.el.hidden = true;
    this.options = [];
  }
}
