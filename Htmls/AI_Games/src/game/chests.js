// 寶箱：關卡 waves 寫 "chest": { "type": "寶箱", "at": [x, z] }，這一波打完就出現，下一波結束前沒開會消失。
// 打 hits 下打開：噴金幣、一瓶藥水，小機率得到復活羽毛。Boss 波寫 "bossChest": "大寶箱"，打倒 Boss 時在原地自動打開。
// 類型與內容在 data/chests.json。
import * as THREE from 'three';

const FEATHER = '復活羽毛';
const WOBBLE_TIME = 0.25;
const FADE_TIME = 0.6;

// 模型還沒匯入時的替代外觀
function fallbackChest(open) {
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a34, flatShading: true });
  const gold = new THREE.MeshStandardMaterial({ color: 0xf2c14e, metalness: 0.6, roughness: 0.35 });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.8), wood);
  body.position.y = 0.35;
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.3, 0.84), wood);
  lid.position.set(0, open ? 0.95 : 0.85, open ? -0.35 : 0);
  if (open) lid.rotation.x = -1.1;
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.06), gold);
  lock.position.set(0, 0.62, 0.42);
  g.add(body, lid, lock);
  return { scene: g, materials: [wood, gold] };
}

export class Chests {
  constructor(game, config) {
    this.game = game;
    this.config = config;
    this.list = [];
  }

  static modelIds(config) { return [config.closedModel, config.openModel]; }

  makeVisual(open, size) {
    const { assets } = this.game;
    const id = open ? this.config.openModel : this.config.closedModel;
    const inner = assets.loaded.has(id) ? assets.instantiate(id) : fallbackChest(open);
    inner.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(inner.scene);
    const scale = size / Math.max(box.max.y - box.min.y, 0.001);
    inner.scene.scale.multiplyScalar(scale);
    inner.scene.position.y -= box.min.y * scale;
    return inner;
  }

  spawn(typeId, x, z, { expiresAfterWave = Infinity } = {}) {
    const { game } = this;
    const type = this.config.types[typeId];
    if (!type) throw new Error(`data/chests.json 沒有寶箱「${typeId}」`);
    const closed = this.makeVisual(false, type.size);
    const root = new THREE.Group();
    root.add(closed.scene);
    root.position.set(x, 0, z);
    root.rotation.y = Math.atan2(game.player.position.x - x, game.player.position.z - z); // 正面朝玩家
    game.scene.add(root);
    const collider = { x, z, r: type.radius };
    game.level.colliders.push(collider);
    const chest = { typeId, type, root, closed, collider, hits: 0, wobble: 0, opened: false, fade: 0, expiresAfterWave, radius: type.radius, position: root.position };
    this.list.push(chest);
    game.fx.burst(x, 0.6, z, 20, type.color, 3);
    game.fx.dust(x, 0.2, z, 12);
    game.sfx.wave();
    return chest;
  }

  // 波次打完時呼叫：出現這一波的寶箱，過期的沒開寶箱消失
  onWaveCleared(index, wave) {
    for (const chest of this.list) if (!chest.opened && index >= chest.expiresAfterWave) this.vanish(chest);
    if (!wave.chest) return;
    const typeId = wave.chest.type ?? '寶箱';
    this.spawn(typeId, ...wave.chest.at, { expiresAfterWave: index + 1 });
    this.game.hud.toast(`${typeId}出現了！打兩下打開`, this.config.types[typeId].color); // 寶箱可能在畫面外，要提醒
  }

  // Boss 倒下的大寶箱，直接打開
  onBossDefeated(boss) {
    const typeId = this.game.levelData.waves.at(-1).bossChest;
    if (!typeId) return;
    const position = boss.position.clone();
    this.game.level.constrain(position, 1);
    this.open(this.spawn(typeId, position.x, position.z));
  }

  // 攻擊打到寶箱。swing 是這次攻擊打過的對象，避免本體和分身重複算
  hit(chest, swing) {
    if (chest.opened || swing?.has(chest)) return false;
    swing?.add(chest);
    const { game } = this;
    chest.hits += 1;
    chest.wobble = WOBBLE_TIME;
    game.fx.sparks(chest.position.x, 0.7, chest.position.z);
    game.fx.shake(0.15);
    game.sfx.hit();
    if (chest.hits >= this.config.hits) this.open(chest);
    return true;
  }

  open(chest) {
    const { game, config } = this;
    const { type } = chest;
    const { x, z } = chest.position;
    chest.opened = true;
    chest.fade = config.fadeAfterOpen;
    chest.root.remove(chest.closed.scene);
    for (const m of chest.closed.materials) m.dispose();
    chest.openVisual = this.makeVisual(true, type.size);
    chest.root.add(chest.openVisual.scene);
    this.removeCollider(chest);
    const [min, max] = type.coins;
    const coins = min + Math.floor(Math.random() * (max - min + 1));
    for (let i = 0; i < coins; i++) game.coins.spawn('金幣', x, z);
    if (type.potion) {
      // 藥水放在寶箱另一側，玩家要繞過去拿，不會一打開就自動撿走
      const away = Math.atan2(x - game.player.position.x, z - game.player.position.z);
      const spot = new THREE.Vector3(x + Math.sin(away) * 1.6, 0, z + Math.cos(away) * 1.6);
      game.level.constrain(spot, 0.5);
      game.items.spawn(game.items.pickRandomId(), spot.x, spot.z);
    }
    if (Math.random() < type.featherChance) this.giveFeather();
    game.fx.burst(x, 1, z, 40, type.color, 6);
    game.sfx.coin();
    game.sfx.pickup();
    game.hud.toast(`打開${chest.typeId}！`, type.color);
  }

  // 羽毛最多帶一根，已經有了就換成金幣
  giveFeather() {
    const { game, config } = this;
    if (game.shop.charmCount(FEATHER) === 0) {
      game.shop.addCharm(FEATHER);
      game.hud.banner('獲得復活羽毛！', 1.8, '#fde68a');
      return;
    }
    const { x, z } = game.player.position;
    for (let i = 0; i < config.featherCoins; i++) game.coins.spawn('金幣', x, z);
  }

  removeCollider(chest) {
    const { colliders } = this.game.level;
    const index = colliders.indexOf(chest.collider);
    if (index >= 0) colliders.splice(index, 1);
  }

  vanish(chest) {
    this.game.fx.dust(chest.position.x, 0.4, chest.position.z, 14);
    chest.fade = Math.min(chest.fade || FADE_TIME, FADE_TIME);
    chest.opened = true;
    this.removeCollider(chest);
  }

  remove(chest) {
    this.game.scene.remove(chest.root);
    this.removeCollider(chest);
    for (const m of [...chest.closed.materials, ...(chest.openVisual?.materials ?? [])]) m.dispose();
  }

  reset() {
    for (const chest of this.list) this.remove(chest);
    this.list = [];
  }

  // 攻擊判定用：還沒開的寶箱
  get targets() { return this.list.filter((c) => !c.opened); }

  nearest(position, range) {
    let best = null, bestDist = range;
    for (const c of this.targets) {
      const d = Math.hypot(c.position.x - position.x, c.position.z - position.z);
      if (d < bestDist) { best = c; bestDist = d; }
    }
    return best;
  }

  update(dt) {
    this.list = this.list.filter((chest) => {
      if (chest.wobble > 0) {
        chest.wobble -= dt;
        chest.root.rotation.z = Math.sin(chest.wobble * 60) * 0.08 * (chest.wobble / WOBBLE_TIME);
      } else chest.root.rotation.z = 0;
      if (!chest.opened || chest.fade <= 0) return true;
      chest.fade -= dt;
      if (chest.fade < FADE_TIME) {
        const visual = chest.openVisual ?? chest.closed;
        for (const m of visual.materials) { m.transparent = true; m.opacity = Math.max(0, chest.fade / FADE_TIME); }
      }
      if (chest.fade > 0) return true;
      this.remove(chest);
      return false;
    });
  }
}
