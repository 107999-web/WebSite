// 商店：買了什麼、花錢、存檔。商品與價格都在 data/shop.json，程式只認 effect。
// 升級每個角色分開買（shared 的例外），金幣共用。存檔和金幣一樣在瀏覽器 localStorage。
const SAVE_KEY = 'knight-game-shop';

function emptySave() {
  return { owned: {}, shared: {}, stash: {} };
}

export class Shop {
  constructor(game, config) {
    this.game = game;
    this.config = config;
    this.save = this.read();
  }

  read() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      return { ...emptySave(), ...saved };
    } catch {
      return emptySave(); // 無法讀取或存檔壞掉就從頭開始
    }
  }

  write() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch { /* 無法儲存時只留在這次遊玩 */ }
  }

  appliesTo(upgrade, characterId) {
    return upgrade.shared || upgrade.for === 'all' || upgrade.for.includes(characterId);
  }

  level(upgradeId, characterId) {
    const upgrade = this.config.upgrades[upgradeId];
    return (upgrade.shared ? this.save.shared[upgradeId] : this.save.owned[characterId]?.[upgradeId]) ?? 0;
  }

  // 這個角色買到的某種效果總量
  total(effect, characterId) {
    return Object.entries(this.config.upgrades).reduce((sum, [id, upgrade]) => {
      if (upgrade.effect !== effect || !this.appliesTo(upgrade, characterId)) return sum;
      return sum + this.level(id, characterId) * (upgrade.amount ?? 1);
    }, 0);
  }

  // 還沒解鎖回傳 null；有買技能強化時換成較短的冷卻
  skillOf(characterId) {
    const skill = this.game.characters[characterId]?.skill;
    if (!skill || !this.total('skill', characterId)) return null;
    let { cooldown } = skill;
    for (const [id, upgrade] of Object.entries(this.config.upgrades)) {
      const level = upgrade.effect === 'cooldown' && this.appliesTo(upgrade, characterId) ? this.level(id, characterId) : 0;
      if (level) cooldown = upgrade.cooldowns[level - 1];
    }
    return { ...skill, cooldown };
  }

  isLocked(upgrade, characterId) {
    return Boolean(upgrade.needs) && !this.total(upgrade.needs, characterId);
  }

  // 商店畫面的列表，每個角色看到的不一樣
  offers(characterId) {
    const wallet = this.game.coins.wallet.total;
    const upgrades = Object.entries(this.config.upgrades)
      .filter(([, upgrade]) => this.appliesTo(upgrade, characterId))
      .map(([id, upgrade]) => {
        const level = this.level(id, characterId);
        const max = upgrade.prices.length;
        const price = upgrade.prices[level] ?? null;
        const locked = this.isLocked(upgrade, characterId);
        return { kind: 'upgrade', id, icon: upgrade.icon, name: upgrade.name ?? id, desc: upgrade.desc, level, max, price, locked, shared: Boolean(upgrade.shared), affordable: price !== null && wallet >= price };
      });
    const potions = Object.entries(this.config.potions).map(([id, potion]) => {
      const level = this.save.stash[id] ?? 0;
      const full = level >= potion.max;
      return { kind: 'potion', id, icon: potion.icon, name: potion.name, desc: potion.desc, level, max: potion.max, price: full ? null : potion.price, locked: false, shared: true, affordable: !full && wallet >= potion.price };
    });
    const charms = Object.entries(this.config.charms ?? {}).map(([id, charm]) => {
      const level = this.charmCount(id);
      const full = level >= charm.max;
      return { kind: 'charm', id, icon: charm.icon, name: charm.name, desc: charm.desc, level, max: charm.max, price: full ? null : charm.price, locked: false, shared: true, affordable: !full && wallet >= charm.price };
    });
    return [...upgrades, ...potions, ...charms];
  }

  // 護身道具（復活羽毛）：和攜帶藥水一樣全角色共用，但不用按鍵，條件到了自動用
  charmCount(id) { return this.save.stash[id] ?? 0; }

  addCharm(id) {
    this.save.stash[id] = this.charmCount(id) + 1;
    this.write();
  }

  takeCharm(id) {
    if (!this.charmCount(id)) return false;
    this.save.stash[id] -= 1;
    this.write();
    return true;
  }

  // 回傳 ok、poor、max 或 locked，畫面用來決定老闆說什麼
  buy(kind, id, characterId) {
    const offer = this.offers(characterId).find((o) => o.kind === kind && o.id === id);
    if (!offer) throw new Error(`商店沒有「${id}」`);
    if (offer.locked) return 'locked';
    if (offer.price === null) return 'max';
    if (!offer.affordable) return 'poor';
    this.game.coins.wallet.spend(offer.price);
    if (kind === 'potion' || kind === 'charm') this.save.stash[id] = offer.level + 1;
    else if (offer.shared) this.save.shared[id] = offer.level + 1;
    else this.save.owned[characterId] = { ...this.save.owned[characterId], [id]: offer.level + 1 };
    this.write();
    return 'ok';
  }

  stashList() {
    return Object.keys(this.config.potions).filter((id) => this.save.stash[id] > 0);
  }

  takePotion(id) {
    this.save.stash[id] -= 1;
    this.write();
  }

  // 金幣和升級全部歸零
  resetAll() {
    this.save = emptySave();
    this.write();
    this.game.coins.wallet.reset();
    this.game.progress.reset();
  }
}
