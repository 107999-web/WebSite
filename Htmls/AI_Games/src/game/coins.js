// 金幣：打倒敵人掉落、撿取、逾時消失。幣種與面額在 data/coins.json，每種敵人掉什麼寫在 characters.json 的 coinDrop。
import * as THREE from 'three';

const WALLET_KEY = 'knight-game-coins';
const BLINK_TIME = 3;
const SCATTER_SPEED = 2.6;
const POP_SPEED = 4.5;
const GRAVITY = 14;
const HOVER_HEIGHT = 0.35;
const SPIN_SPEED = 3.2;
const ATTRACT_SPEED = 10; // 進入吸取範圍後飛向玩家

// 錢包跨局保留，之後商店才有錢可花。瀏覽器不給存時，這次遊玩仍然可以累積
class Wallet {
  constructor() {
    this.total = 0;
    try { this.total = Number(localStorage.getItem(WALLET_KEY)) || 0; } catch { /* 無法讀取就從 0 開始 */ }
  }

  add(amount) {
    this.total += amount;
    this.save();
  }

  spend(amount) {
    this.total -= amount;
    this.save();
  }

  reset() {
    this.total = 0;
    this.save();
  }

  save() {
    try { localStorage.setItem(WALLET_KEY, String(this.total)); } catch { /* 無法儲存時只留在這次遊玩 */ }
  }
}

function makeFallbackCoin(color) {
  const material = new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.35 });
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.14, 20), material);
  mesh.rotation.x = Math.PI / 2;
  const group = new THREE.Group();
  group.add(mesh);
  return group;
}

export class Coins {
  constructor(game, config) {
    this.game = game;
    this.config = config;
    this.wallet = new Wallet();
    this.onField = [];
    this.earned = 0; // 這一局撿到的
    this.prefabs = new Map();
  }

  static modelIds(config) {
    return Object.values(config.types).map((t) => t.model);
  }

  prefab(typeId) {
    if (this.prefabs.has(typeId)) return this.prefabs.get(typeId);
    const type = this.config.types[typeId];
    if (!type) throw new Error(`data/coins.json 沒有幣種「${typeId}」`);
    const { assets } = this.game;
    const inner = assets.loaded.has(type.model) ? assets.instantiate(type.model).scene : makeFallbackCoin(type.color);
    inner.traverse((obj) => { if (obj.isMesh) { obj.castShadow = false; obj.receiveShadow = false; } });
    const box = new THREE.Box3().setFromObject(inner);
    inner.scale.multiplyScalar(type.size / Math.max(box.max.y - box.min.y, 0.001));
    this.prefabs.set(typeId, inner);
    return inner;
  }

  reset() {
    for (const coin of this.onField) this.game.scene.remove(coin.object);
    this.onField = [];
    this.earned = 0;
  }

  spawn(typeId, x, z) {
    const { game, config } = this;
    if (this.onField.length >= config.maxOnField) this.collect(this.onField.shift()); // 太多時最舊的直接入袋，不讓玩家吃虧
    const object = this.prefab(typeId).clone();
    const angle = Math.random() * Math.PI * 2;
    object.position.set(x, 0.8, z);
    object.rotation.y = angle;
    game.scene.add(object);
    this.onField.push({
      typeId, object, life: config.lifetime, attracted: false, landed: false,
      vx: Math.cos(angle) * SCATTER_SPEED * Math.random(),
      vz: Math.sin(angle) * SCATTER_SPEED * Math.random(),
      vy: POP_SPEED,
      phase: Math.random() * 6,
    });
  }

  onEnemyKilled(enemy) {
    const drop = enemy.def.coinDrop;
    if (!drop) return;
    const [min, max] = drop.count;
    const count = min + Math.floor(Math.random() * (max - min + 1));
    const position = enemy.position.clone();
    this.game.level.constrain(position, 0.5);
    for (let i = 0; i < count; i++) this.spawn(drop.type, position.x, position.z);
  }

  collect(coin) {
    const { game } = this;
    const { value } = this.config.types[coin.typeId];
    game.scene.remove(coin.object);
    this.wallet.add(value);
    this.earned += value;
    game.hud.setCoins(this.wallet.total);
  }

  // 過關時場上剩下的直接入袋，不用回頭撿
  collectAll() {
    for (const coin of this.onField) this.collect(coin);
    this.onField = [];
  }

  moveToward(coin, dt) {
    const { position } = coin.object;
    const target = this.game.player.position;
    const dx = target.x - position.x, dz = target.z - position.z, dy = 1 - position.y;
    const dist = Math.hypot(dx, dy, dz) || 1;
    const step = Math.min(dist, ATTRACT_SPEED * dt);
    position.x += (dx / dist) * step;
    position.y += (dy / dist) * step;
    position.z += (dz / dist) * step;
    return Math.hypot(dx, dz) < 0.4;
  }

  fall(coin, dt) {
    const { position } = coin.object;
    position.x += coin.vx * dt;
    position.z += coin.vz * dt;
    position.y += coin.vy * dt;
    coin.vy -= GRAVITY * dt;
    if (position.y <= HOVER_HEIGHT) {
      position.y = HOVER_HEIGHT;
      coin.landed = true;
      this.game.level.constrain(position, 0.4);
    }
  }

  update(dt, time) {
    const { game, config } = this;
    const { player } = game;
    const pickupRadius = config.pickupRadius + game.shop.total('magnet', game.characterId); // 金幣磁鐵
    this.onField = this.onField.filter((coin) => {
      const { object } = coin;
      coin.life -= dt;
      object.rotation.y += SPIN_SPEED * dt;
      const dist = Math.hypot(object.position.x - player.position.x, object.position.z - player.position.z);
      if (coin.landed && dist <= pickupRadius + player.radius) coin.attracted = true;
      if (coin.attracted) {
        object.visible = true;
        if (!this.moveToward(coin, dt)) return true;
        this.collect(coin);
        game.sfx.coin();
        return false;
      }
      if (!coin.landed) this.fall(coin, dt);
      else object.position.y = HOVER_HEIGHT + Math.sin(time * 3 + coin.phase) * 0.06;
      object.visible = coin.life > BLINK_TIME || Math.floor(coin.life * 7) % 2 === 0;
      if (coin.life > 0) return true;
      game.scene.remove(object);
      return false;
    });
  }
}
