// 輸入：把實體按鍵（和 src/ui/touch.js 的觸控搖桿）對應成遊戲動作，遊戲邏輯只讀 move 和 consumeAttack()。
const MOVE_KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
};
const ATTACK_KEYS = ['Space', 'KeyJ'];
const SKILL_KEYS = ['KeyK'];
const POTION_KEYS = ['KeyL'];
const ATTACK_BUFFER = 0.22; // 動作結束前稍早按也算數，手感才不會吃按鍵

export class Input {
  constructor(canvas) {
    this.down = new Set();
    this.attackBuffer = 0;
    this.skillPressed = false;
    this.potionPressed = false;
    this.onPause = null;
    this.touchMove = null; // 觸控搖桿：{ x, z }，長度 0～1（推得越遠走得越快）
    this.attackHeld = false; // 觸控攻擊鍵按住＝連續攻擊
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.down.add(e.code);
      if (ATTACK_KEYS.includes(e.code)) { this.attackBuffer = ATTACK_BUFFER; e.preventDefault(); }
      if (SKILL_KEYS.includes(e.code)) this.skillPressed = true;
      if (POTION_KEYS.includes(e.code)) this.potionPressed = true;
      if (e.code === 'KeyP' || e.code === 'Escape') this.onPause?.();
      if (e.code.startsWith('Arrow')) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear()); // 視窗失焦時放開，避免角色一直走
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 2) this.skillPressed = true;
      else this.attackBuffer = ATTACK_BUFFER;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // 右鍵是技能，不要跳出瀏覽器選單
  }

  // 出發時清掉選單裡按過的鍵
  clear() {
    this.attackBuffer = 0;
    this.attackHeld = false;
    this.skillPressed = false;
    this.potionPressed = false;
  }

  consumeSkill() {
    const pressed = this.skillPressed;
    this.skillPressed = false;
    return pressed;
  }

  consumePotion() {
    const pressed = this.potionPressed;
    this.potionPressed = false;
    return pressed;
  }

  pressed(action) {
    return MOVE_KEYS[action].some((code) => this.down.has(code));
  }

  get move() {
    let x = (this.pressed('right') ? 1 : 0) - (this.pressed('left') ? 1 : 0);
    let z = (this.pressed('down') ? 1 : 0) - (this.pressed('up') ? 1 : 0);
    if (!x && !z && this.touchMove) return { ...this.touchMove, moving: true }; // 鍵盤優先
    const len = Math.hypot(x, z);
    if (len > 0) { x /= len; z /= len; }
    return { x, z, moving: len > 0 };
  }

  update(dt) {
    this.attackBuffer = this.attackHeld ? ATTACK_BUFFER : Math.max(0, this.attackBuffer - dt);
  }

  consumeAttack() {
    if (this.attackBuffer <= 0) return false;
    this.attackBuffer = 0;
    return true;
  }
}
