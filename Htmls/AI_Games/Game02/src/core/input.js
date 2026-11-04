// 輸入：鍵盤（和 src/ui/touch.js 的觸控搖桿）對應成遊戲動作。
// 滑鼠點畫面交給 main.js 判斷：點到台座就開蓋塔選單，點其他地方就是攻擊。
const MOVE_KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
};
const ATTACK_KEYS = ['Space', 'KeyJ'];
const SKILL_KEYS = ['KeyK'];
const ATTACK_BUFFER = 0.22;

export class Input {
  constructor(canvas) {
    this.down = new Set();
    this.attackBuffer = 0;
    this.skillPressed = false;
    this.onKey = null;     // (code) => 回傳 true 表示 main.js 用掉了這個鍵
    this.onPointer = null; // (event) => 滑鼠點畫面
    this.touchMove = null;
    this.attackHeld = false;
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (this.onKey?.(e.code)) { e.preventDefault(); return; }
      this.down.add(e.code);
      if (ATTACK_KEYS.includes(e.code)) { this.attackBuffer = ATTACK_BUFFER; e.preventDefault(); }
      if (SKILL_KEYS.includes(e.code)) this.skillPressed = true;
      if (e.code.startsWith('Arrow')) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear());
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 2) { this.skillPressed = true; return; }
      this.onPointer?.(e);
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  attack() { this.attackBuffer = ATTACK_BUFFER; }

  clear() {
    this.attackBuffer = 0;
    this.attackHeld = false;
    this.skillPressed = false;
  }

  consumeSkill() {
    const pressed = this.skillPressed;
    this.skillPressed = false;
    return pressed;
  }

  pressed(action) { return MOVE_KEYS[action].some((code) => this.down.has(code)); }

  get move() {
    let x = (this.pressed('right') ? 1 : 0) - (this.pressed('left') ? 1 : 0);
    let z = (this.pressed('down') ? 1 : 0) - (this.pressed('up') ? 1 : 0);
    if (!x && !z && this.touchMove) return { ...this.touchMove, moving: true };
    const len = Math.hypot(x, z);
    if (len > 0) { x /= len; z /= len; }
    return { x, z, moving: len > 0 };
  }

  update(dt) { this.attackBuffer = this.attackHeld ? ATTACK_BUFFER : Math.max(0, this.attackBuffer - dt); }

  consumeAttack() {
    if (this.attackBuffer <= 0) return false;
    this.attackBuffer = 0;
    return true;
  }
}
