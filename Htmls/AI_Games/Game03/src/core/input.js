// 輸入：只要左右。鍵盤 A/D 或 ←→；滑鼠或手指在畫面上按住左右拖曳（電腦、平板、手機都一樣）。
const LEFT = ['KeyA', 'ArrowLeft'];
const RIGHT = ['KeyD', 'ArrowRight'];

export class Input {
  constructor(canvas) {
    this.down = new Set();
    this.onKey = null;  // (code) => 回傳 true 表示用掉了
    this.drag = 0;      // 累積的拖曳距離（像素），main 每格讀走
    this.dragId = null;
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (this.onKey?.(e.code)) { e.preventDefault(); return; }
      this.down.add(e.code);
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear());
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', (e) => {
      this.dragId = e.pointerId;
      this.lastX = e.clientX;
      canvas.setPointerCapture?.(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.dragId) return;
      this.drag += e.clientX - this.lastX;
      this.lastX = e.clientX;
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      canvas.addEventListener(type, (e) => { if (e.pointerId === this.dragId) this.dragId = null; });
    }
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    for (const type of ['gesturestart', 'gesturechange']) document.addEventListener(type, (e) => e.preventDefault());
  }

  // -1 左、0 不動、1 右
  get steer() {
    return (RIGHT.some((c) => this.down.has(c)) ? 1 : 0) - (LEFT.some((c) => this.down.has(c)) ? 1 : 0);
  }

  takeDrag() {
    const d = this.drag;
    this.drag = 0;
    return d;
  }

  clear() { this.down.clear(); this.drag = 0; }
}
