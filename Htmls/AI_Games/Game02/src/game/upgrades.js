// 星星與升級樹：過關依城門剩下的愛心拿 1～3 顆星（每關記最好的一次），星星買永久升級。
// 升級項目在 data/upgrades.json：effect { stat, tower?, add?, mult? }，買幾級就套用幾次。
//   tower 有寫：改那種塔的數值（range 射程、damage 傷害、hp 騎士兵生命、blast 爆炸範圍、cooldown 攻擊間隔）
//   tower 沒寫：全域（startGold 起始金幣、castle 城門愛心、heroHp 英雄生命、towerCost 價格、heroRespawn 復活時間、heroSkill 技能冷卻）
const KEY = 'knight-td-progress';

// 星星依「關卡:難度」分開記。第一版沒有難度，舊紀錄當作簡單
function load() {
  let data;
  try { data = { stars: {}, bought: {}, ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return { stars: {}, bought: {} }; }
  for (const key of Object.keys(data.stars)) {
    if (key.includes(':')) continue;
    data.stars[`${key}:簡單`] = Math.max(data.stars[`${key}:簡單`] ?? 0, data.stars[key]);
    delete data.stars[key];
  }
  return data;
}

export class Upgrades {
  constructor(defs) {
    this.defs = defs;
    this.data = load();
  }

  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* 無痕模式存不了，照常玩 */ } }

  get totalStars() { return Object.values(this.data.stars).reduce((a, b) => a + b, 0); }
  get spent() { return this.defs.reduce((sum, u) => sum + u.cost.slice(0, this.level(u.id)).reduce((a, b) => a + b, 0), 0); }
  get available() { return this.totalStars - this.spent; }

  level(id) { return this.data.bought[id] ?? 0; }
  starsOf(levelId) { return this.data.stars[levelId] ?? 0; }
  nextCost(u) { return this.level(u.id) < u.cost.length ? u.cost[this.level(u.id)] : null; }

  buy(id) {
    const u = this.defs.find((d) => d.id === id);
    const cost = this.nextCost(u);
    if (cost === null) return 'max';
    if (cost > this.available) return 'poor';
    this.data.bought[id] = this.level(id) + 1;
    this.save();
    return 'ok';
  }

  // 回傳這次是不是新紀錄
  recordStars(levelId, stars) {
    if (stars <= this.starsOf(levelId)) return false;
    this.data.stars[levelId] = stars;
    this.save();
    return true;
  }

  // 退回星星重新分配（星星不會少）
  refund() { this.data.bought = {}; this.save(); }

  *active(stat) {
    for (const u of this.defs) {
      const lv = this.level(u.id);
      if (lv && u.effect.stat === stat && !u.effect.tower) yield { ...u.effect, lv };
    }
  }

  add(stat) { let sum = 0; for (const e of this.active(stat)) sum += (e.add ?? 0) * e.lv; return sum; }
  mult(stat) { let m = 1; for (const e of this.active(stat)) m *= (1 + (e.mult ?? 0)) ** e.lv; return m; }

  towerStats(type, stats) {
    const out = { ...stats };
    for (const u of this.defs) {
      const lv = this.level(u.id);
      const { stat, tower, add, mult } = u.effect;
      if (!lv || tower !== type || out[stat] === undefined) continue;
      if (add) out[stat] += add * lv;
      if (mult) out[stat] *= (1 + mult) ** lv;
    }
    return out;
  }

  towerCost(type, cost) { return Math.round(cost * this.mult('towerCost')); }
}
