// 存檔（這台電腦的瀏覽器）：金幣、商店升級、解鎖的英雄、每關每難度的星星、無盡模式最遠距離。
// 鍵 hero-runner-save；第一版的星星（hero-runner-progress）會自動搬過來。
const KEY = 'hero-runner-save';
const OLD_STARS = 'hero-runner-progress';

function read(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }

export class Save {
  constructor() {
    const data = read(KEY) ?? {};
    this.data = { coins: 0, upgrades: {}, unlocked: [], stars: {}, best: {}, ...data };
    const old = read(OLD_STARS);
    if (old && !data.stars) { this.data.stars = { ...old }; this.write(); }
  }

  write() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* 無痕模式：這次能玩，關掉就不見 */ } }

  get coins() { return this.data.coins; }
  addCoins(n) { this.data.coins += n; this.write(); }
  spend(n) { if (this.data.coins < n) return false; this.data.coins -= n; this.write(); return true; }

  level(id) { return this.data.upgrades[id] ?? 0; }
  upgrade(id) { this.data.upgrades[id] = this.level(id) + 1; this.write(); }

  isUnlocked(hero) { return this.data.unlocked.includes(hero); }
  unlock(hero) { if (!this.isUnlocked(hero)) this.data.unlocked.push(hero); this.write(); }

  stars(key) { return this.data.stars[key] ?? 0; }
  recordStars(key, n) { if (n <= this.stars(key)) return false; this.data.stars[key] = n; this.write(); return true; }

  best(key) { return this.data.best[key] ?? 0; }
  recordBest(key, n) { if (n <= this.best(key)) return false; this.data.best[key] = n; this.write(); return true; }

  reset() { this.data = { coins: 0, upgrades: {}, unlocked: [], stars: {}, best: {} }; this.write(); }
}
