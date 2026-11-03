// 關卡進度：打過哪幾關。第一關一定開放，過關才解鎖下一關。存在瀏覽器 localStorage。
const SAVE_KEY = 'knight-game-progress';

export class Progress {
  constructor(order) {
    this.order = order;
    this.cleared = new Set();
    try {
      this.cleared = new Set(JSON.parse(localStorage.getItem(SAVE_KEY)) ?? []);
    } catch { /* 無法讀取或存檔壞掉就從頭開始 */ }
  }

  write() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify([...this.cleared])); } catch { /* 無法儲存時只留在這次遊玩 */ }
  }

  isCleared(id) { return this.cleared.has(id); }

  isUnlocked(id) {
    const index = this.order.indexOf(id);
    return index <= 0 || this.cleared.has(this.order[index - 1]);
  }

  markCleared(id) {
    this.cleared.add(id);
    this.write();
  }

  next(id) { return this.order[this.order.indexOf(id) + 1] ?? null; }

  reset() {
    this.cleared.clear();
    this.write();
  }
}
