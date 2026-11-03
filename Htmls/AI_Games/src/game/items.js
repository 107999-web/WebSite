// 道具：場上的藥水、撿取、效果與倒數。數值都在 data/items.json。
// 新藥水若是既有效果（換數值）只要改 JSON；全新的效果才要在 EFFECTS 加一項。
import * as THREE from 'three';

const BLINK_TIME = 3; // 快消失時閃爍
const PLACE_TRIES = 40;
const MIN_PLAYER_DISTANCE = 3;

// 有 duration 的效果會寫進 buffs 倒數（重複撿到時間相加），這裡只放「撿到當下」要做的事
const EFFECTS = {
  heal(game, item) {
    game.player.heal(item.amount);
  },
  clearEnemies(game, item) {
    game.clearAllEnemies(item.bossDamage);
  },
};

function makeGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d');
  const gradient = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gradient;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

// 模型還沒匯入時的替代外觀：程式畫的小藥瓶，換上模型後就不會用到
function makeFallbackFlask(color) {
  const glass = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, roughness: 0.3 });
  const cork = new THREE.MeshStandardMaterial({ color: 0x8a6239, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), glass);
  body.position.y = 0.34;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.3, 10), glass);
  neck.position.y = 0.75;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.13, 10), cork);
  top.position.y = 0.95;
  const group = new THREE.Group();
  group.add(body, neck, top);
  return { scene: group, materials: [glass, cork] };
}

export class Items {
  constructor(game, config) {
    this.game = game;
    this.config = config;
    this.defs = config.items;
    this.ids = Object.keys(this.defs);
    this.onField = [];
    this.buffs = new Map(); // effect → { item, remaining }
    this.glow = makeGlowTexture();
    this.ringGeometry = new THREE.RingGeometry(0.55, 0.72, 32);
    this.ringGeometry.rotateX(-Math.PI / 2);
    this.nextTimed = 0;
  }

  static modelIds(config) {
    return Object.values(config.items).map((i) => i.model);
  }

  reset() {
    for (const item of this.onField) this.removeFromField(item);
    this.onField = [];
    this.clearBuffs();
    this.scheduleTimed();
  }

  clearBuffs() {
    this.buffs.clear();
    this.game.hud.setBuffs([]);
  }

  scheduleTimed() {
    const [min, max] = this.config.spawn.timedEvery;
    this.nextTimed = min + Math.random() * (max - min);
  }

  buff(effect) { return this.buffs.get(effect)?.item ?? null; }

  pickRandomId() {
    const total = this.ids.reduce((sum, id) => sum + this.defs[id].weight, 0);
    let roll = Math.random() * total;
    for (const id of this.ids) {
      roll -= this.defs[id].weight;
      if (roll <= 0) return id;
    }
    return this.ids[0];
  }

  createVisual(def) {
    const { assets } = this.game;
    const color = new THREE.Color(def.color);
    const inner = assets.loaded.has(def.model) ? assets.instantiate(def.model) : makeFallbackFlask(color);
    // 模型大小不一，統一縮放成同樣高度並把底部放在原點
    const box = new THREE.Box3().setFromObject(inner.scene);
    const size = this.config.spawn.size / Math.max(box.max.y - box.min.y, 0.001);
    inner.scene.scale.multiplyScalar(size);
    inner.scene.position.y -= box.min.y * size;

    const spinner = new THREE.Group();
    spinner.add(inner.scene);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.32 }));
    sprite.scale.setScalar(2.4);
    sprite.position.y = 0.95;
    const ringMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(this.ringGeometry, ringMaterial);
    ring.position.y = 0.05;
    const root = new THREE.Group();
    root.add(spinner, sprite, ring);
    return { root, spinner, materials: [...inner.materials, sprite.material, ringMaterial] };
  }

  spawn(id, x, z) {
    const def = this.defs[id];
    if (!def) throw new Error(`data/items.json 沒有道具「${id}」`);
    const visual = this.createVisual(def);
    visual.root.position.set(x, 0, z);
    this.game.scene.add(visual.root);
    const item = { id, def, ...visual, life: this.config.spawn.lifetime, phase: Math.random() * 6 };
    this.onField.push(item);
    this.game.fx.burst(x, 0.5, z, 12, def.color, 2.5);
    return item;
  }

  findFreeSpot() {
    const { level, player } = this.game;
    const { halfWidth, halfDepth } = level.arena;
    for (let i = 0; i < PLACE_TRIES; i++) {
      const x = (Math.random() * 2 - 1) * (halfWidth - 2.5);
      const z = (Math.random() * 2 - 1) * (halfDepth - 2.5);
      const blocked = level.colliders.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + 0.9);
      if (!blocked && !this.game.hazards.blocks(x, z) && Math.hypot(x - player.position.x, z - player.position.z) > MIN_PLAYER_DISTANCE) return [x, z];
    }
    return null;
  }

  spawnOnField(id = this.pickRandomId()) {
    const spot = this.findFreeSpot();
    return spot ? this.spawn(id, spot[0], spot[1]) : null;
  }

  onEnemyKilled(enemy) {
    const { dropChance, maxOnField } = this.config.spawn;
    if (this.onField.length >= maxOnField || Math.random() >= dropChance) return;
    const position = enemy.position.clone();
    this.game.level.constrain(position, 0.5);
    this.spawn(this.pickRandomId(), position.x, position.z);
  }

  apply(def) {
    const { game } = this;
    if (def.duration) {
      const current = this.buffs.get(def.effect);
      if (current) current.remaining += def.duration; // 可累加：時間相加
      else this.buffs.set(def.effect, { item: def, remaining: def.duration });
    }
    EFFECTS[def.effect]?.(game, def);
    game.sfx.pickup();
    game.hud.toast(`${this.displayName(def)}！`, def.color);
    this.refreshHud();
  }

  // 藍藥水的強化效果依角色不同，名稱也跟著換
  displayName(def) {
    return (def.effect === 'waveSlash' && this.game.player.def.boost?.name) || def.name;
  }

  removeFromField(item) {
    this.game.scene.remove(item.root);
    for (const m of item.materials) m.dispose();
  }

  refreshHud() {
    this.game.hud.setBuffs([...this.buffs.values()].map((b) => ({ name: this.displayName(b.item), color: b.item.color, remaining: b.remaining })));
  }

  update(dt, time) {
    const { player } = this.game;
    this.nextTimed -= dt;
    if (this.nextTimed <= 0) {
      this.scheduleTimed();
      if (this.onField.length < this.config.spawn.maxOnField) this.spawnOnField();
    }

    for (const [effect, buff] of this.buffs) {
      buff.remaining -= dt;
      if (buff.remaining <= 0) this.buffs.delete(effect);
    }
    if (this.buffs.size || this.hudHadBuffs) this.refreshHud();
    this.hudHadBuffs = this.buffs.size > 0;

    this.onField = this.onField.filter((item) => {
      item.life -= dt;
      item.spinner.rotation.y += dt * 1.8;
      item.spinner.position.y = 0.2 + Math.sin(time * 3 + item.phase) * 0.1;
      item.root.visible = item.life > BLINK_TIME || Math.floor(item.life * 7) % 2 === 0;
      const dist = Math.hypot(item.root.position.x - player.position.x, item.root.position.z - player.position.z);
      if (dist <= this.config.spawn.pickupRadius + player.radius) {
        this.game.fx.burst(item.root.position.x, 1, item.root.position.z, 22, item.def.color, 4);
        this.apply(item.def);
        this.removeFromField(item);
        return false;
      }
      if (item.life <= 0) { this.removeFromField(item); return false; }
      return true;
    });
  }
}
