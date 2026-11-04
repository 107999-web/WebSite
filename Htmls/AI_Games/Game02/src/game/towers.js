// 塔：蓋在台座上，四種打法（data/towers.json 的 kind）：
//   ranged  弓箭手：站在台上射追蹤箭，優先打走最遠的
//   blast   魔法師：火球爆炸＋燃燒
//   melee   盜賊：跳到路邊快砍，讓敵人變慢（不擋路）
//   barracks 騎士：派騎士兵站在路上擋住敵人，倒下後過一段時間復活
// 每級的數值寫在 levels，後面的級數只寫有變的欄位。星星升級的加成在 Upgrades 算。
import * as THREE from 'three';
import { Actor } from './actor.js';
import { PEDESTAL_TOP } from '../world/level.js';

const UNIT_SCALE = 0.85;
const STUN_STAR_EVERY = 0.12;
const SOLDIER_RADIUS = 0.45;
const SOLDIER_SPREAD = 1.1;
const REGEN_EVERY = 1.5;
const GUARD_OFFSET = 1.7; // 盜賊站在路邊，離路中央的距離
const FLAG_COLORS = { barracks: 0x3b82f6, melee: 0x8b5cf6 };

function makeLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 48;
  const g = canvas.getContext('2d');
  g.font = '900 34px "Microsoft JhengHei", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 7;
  g.strokeStyle = '#2a1d05';
  g.strokeText(text, 64, 26);
  g.fillStyle = '#f2c14e';
  g.fillText(text, 64, 26);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthWrite: false }));
  sprite.scale.set(1.3, 0.49, 1);
  sprite.renderOrder = 16;
  return sprite;
}

function buildFlag(color) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x5a3d26 }));
  pole.position.y = 1.2;
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide }));
  cloth.position.set(0.47, 2.05, 0);
  pole.castShadow = cloth.castShadow = true;
  g.add(pole, cloth);
  g.position.y = PEDESTAL_TOP;
  return g;
}

// 合併 levels[0..level] 的欄位，物件欄位（burn、slow）整個換掉
export function towerStats(def, level) {
  return def.levels.slice(0, level + 1).reduce((all, lv) => ({ ...all, ...lv }), {});
}

// 騎士兵：站在路上擋敵人。blocker 介面：position、radius、capacity、engaged、canBlock、takeDamage
class Soldier extends Actor {
  constructor(game, tower, instance, spot) {
    super(game, { ...tower.unitDef, scale: tower.unitDef.scale * UNIT_SCALE, radius: SOLDIER_RADIUS }, instance);
    this.tower = tower;
    this.spot = spot;
    this.engaged = new Set();
    this.cooldown = 0;
    this.regen = 0;
    this.respawnIn = 0;
    this.state = 'idle';
    this.position.set(tower.pedestal.x, 0, tower.pedestal.z);
    this.hp = this.maxHp;
    this.play('Idle');
  }

  get stats() { return this.tower.stats; }
  get maxHp() { return this.stats.hp; }
  get capacity() { return this.stats.capacity; }
  get canBlock() { return this.state !== 'dead' && this.state !== 'returning'; }

  takeDamage(amount) {
    if (!this.canBlock) return;
    this.hp -= amount;
    this.flash();
    this.tower.updateSoldierBar(this);
    if (this.hp > 0) return;
    this.state = 'dead';
    this.respawnIn = this.stats.respawn;
    for (const e of this.engaged) e.blocker = null;
    this.engaged.clear();
    this.play('Death', { once: true });
    this.game.sfx.hurt();
  }

  update(dt) {
    const { game, stats } = this;
    if (this.state === 'dead') {
      this.respawnIn -= dt;
      if (this.respawnIn < 1) this.setOpacity(Math.max(0, this.respawnIn));
      if (this.respawnIn <= 0) { // 從台座走回崗位
        this.hp = this.maxHp;
        this.setOpacity(1);
        this.position.set(this.tower.pedestal.x, 0, this.tower.pedestal.z);
        this.state = 'returning';
        this.tower.updateSoldierBar(this);
      }
      return;
    }
    if (this.tower.stunned > 0) { this.play('Idle'); return; }
    this.cooldown -= dt;
    if (this.state === 'attack') {
      this.attackTime += dt;
      if (!this.attackConnected && this.attackTime >= this.hitTime) { this.attackConnected = true; this.strike(); }
      if (this.attackTime >= this.attackLength) this.state = 'idle';
      return;
    }
    const target = this.pickTarget();
    if (target) {
      this.faceToward(target.position.x - this.position.x, target.position.z - this.position.z, dt);
      if (this.cooldown <= 0) this.startAttack();
      else this.play('Idle');
      return;
    }
    // 沒有敵人：回到崗位，慢慢回血
    const dx = this.spot.x - this.position.x, dz = this.spot.z - this.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.15) {
      const step = Math.min(dist, 4 * dt);
      this.position.x += (dx / dist) * step;
      this.position.z += (dz / dist) * step;
      this.faceToward(dx, dz, dt);
      this.play('Run');
      return;
    }
    if (this.state === 'returning') this.state = 'idle';
    this.faceToward(-this.spot.dx, -this.spot.dz, dt, 4); // 面向敵人來的方向
    this.play('Idle');
    this.regen += dt;
    if (this.regen >= REGEN_EVERY && this.hp < this.maxHp) { this.regen = 0; this.hp += 1; this.tower.updateSoldierBar(this); }
  }

  pickTarget() {
    if (this.state === 'returning') return null;
    let best = null, bestD = this.stats.attackRange;
    for (const e of this.engaged) {
      const d = Math.hypot(e.position.x - this.position.x, e.position.z - this.position.z) - e.radius;
      if (e.alive && d < bestD) { best = e; bestD = d; }
    }
    if (best) return best;
    for (const e of this.game.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.position.x - this.position.x, e.position.z - this.position.z) - e.radius;
      if (d < bestD) { best = e; bestD = d; }
    }
    return best;
  }

  startAttack() {
    const speed = this.tower.attackSpeed(this.clipLength('Attack'));
    this.state = 'attack';
    this.attackTime = 0;
    this.attackConnected = false;
    this.hitTime = (this.tower.unitDef.attackHitTime ?? 0.3) / speed;
    this.attackLength = this.clipLength('Attack') / speed;
    this.cooldown = this.stats.cooldown;
    this.play('Attack', { once: true, fade: 0.06, speed });
  }

  // 前方扇形，範圍內的敵人各打一下
  strike() {
    const { game, stats } = this;
    const yaw = this.root.rotation.y;
    const arc = THREE.MathUtils.degToRad(150);
    game.fx.slashAt(this.position, yaw, arc, stats.attackRange);
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    let hits = 0;
    for (const e of game.enemies) {
      if (!e.alive) continue;
      const dx = e.position.x - this.position.x, dz = e.position.z - this.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > stats.attackRange + e.radius) continue;
      if (dist > 0.6 && (dx * fx + dz * fz) / dist < Math.cos(arc / 2)) continue;
      if (game.damageEnemy(e, stats.damage, 'stagger')) hits += 1;
    }
    if (hits) game.sfx.hit(); else game.sfx.swing();
  }
}

class Tower {
  constructor(game, pedestal, type, def) {
    this.game = game;
    this.pedestal = pedestal;
    this.type = type;
    this.def = def;
    this.kind = def.kind;
    this.level = 0;
    this.spent = game.upgrades.towerCost(type, def.levels[0].cost);
    this.cooldown = 0.3;
    this.stunned = 0;
    this.starTimer = 0;
    this.unitDef = game.characters[def.unit];
    this.group = new THREE.Group();
    this.group.position.set(pedestal.x, 0, pedestal.z);
    game.scene.add(this.group);
    this.label = makeLabel('Lv1');
    this.label.position.y = 1.9 * this.unitDef.scale + 1.1;
    this.group.add(this.label);
    this.soldiers = [];
    this.bars = new Map();

    const along = game.closestOnPaths(pedestal.x, pedestal.z); // 好幾條路時，靠最近的那條
    this.roadSpot = along;
    if (this.kind === 'barracks' || this.kind === 'melee') {
      this.group.add(buildFlag(FLAG_COLORS[this.kind]));
      this.label.position.y = Math.max(this.label.position.y, 3.2);
    }
    if (this.kind === 'barracks') {
      this.syncSoldiers();
    } else {
      this.scale = this.unitDef.scale * UNIT_SCALE;
      this.unit = new Actor(game, { ...this.unitDef, scale: this.scale }, game.assets.instantiate(this.unitDef.model));
      if (this.kind === 'melee') {
        // 站在靠台座那一側的路邊
        const away = Math.hypot(pedestal.x - along.x, pedestal.z - along.z) || 1;
        this.unit.position.set(along.x + ((pedestal.x - along.x) / away) * GUARD_OFFSET, 0, along.z + ((pedestal.z - along.z) / away) * GUARD_OFFSET);
      } else {
        this.unit.position.set(pedestal.x, PEDESTAL_TOP, pedestal.z);
      }
      this.unit.faceToward(along.x - pedestal.x, along.z - pedestal.z, Infinity);
      this.unit.play('Idle');
      this.attacking = false;
    }
    game.fx.dust(pedestal.x, 0.5, pedestal.z, 24);
  }

  get stats() { return this.game.towerStatsFor(this.type, this.level); }
  get maxLevel() { return this.def.levels.length - 1; }
  get nextCost() { return this.level < this.maxLevel ? this.game.upgrades.towerCost(this.type, this.def.levels[this.level + 1].cost) : null; }
  get refund() { return Math.floor(this.spent * this.game.settings.sellRefund); }

  // 攻擊中心（範圍圈畫在這裡）
  get center() {
    if (this.kind === 'barracks') return this.roadSpot;
    if (this.kind === 'melee') return this.unit.position;
    return this.pedestal;
  }

  // 動作播放速度：攻擊間隔比動作短時就加快播放
  attackSpeed(clip) { return Math.max(1, clip / (this.stats.cooldown * 0.95)); }

  upgrade() {
    this.spent += this.nextCost;
    this.level += 1;
    this.label.material.map.dispose();
    this.label.material.dispose();
    const fresh = makeLabel(`Lv${this.level + 1}`);
    this.label.material = fresh.material;
    if (this.kind === 'barracks') this.syncSoldiers();
    for (const s of this.soldiers) { s.hp = s.maxHp; this.updateSoldierBar(s); }
    this.game.fx.burst(this.pedestal.x, 1.5, this.pedestal.z, 30, '#f2c14e', 4);
  }

  // 騎士兵人數跟著等級，站在路中央沿路排開
  syncSoldiers() {
    const { game } = this;
    const count = this.stats.soldiers;
    while (this.soldiers.length < count) {
      const i = this.soldiers.length;
      const offset = (i - (count - 1) / 2) * SOLDIER_SPREAD;
      const p = this.roadSpot.path.at(this.roadSpot.s + offset * 0.6, offset * 0.6);
      const soldier = new Soldier(game, this, game.assets.instantiate(this.unitDef.model), { x: p.x, z: p.z, dx: p.dx, dz: p.dz });
      this.soldiers.push(soldier);
      this.makeSoldierBar(soldier);
    }
    // 升到兩人時，兩個人重新排開
    this.soldiers.forEach((s, i) => {
      const offset = (i - (this.soldiers.length - 1) / 2) * SOLDIER_SPREAD;
      const p = this.roadSpot.path.at(this.roadSpot.s + offset, 0);
      s.spot = { x: p.x, z: p.z, dx: p.dx, dz: p.dz };
    });
  }

  makeSoldierBar(soldier) {
    const { fx } = this.game;
    const bar = new THREE.Group();
    const back = new THREE.Sprite(fx.barMaterials.back);
    back.scale.set(0.96, 0.14, 1);
    const fill = new THREE.Sprite(fx.barMaterials.ally);
    fill.scale.set(0.9, 0.08, 1);
    back.renderOrder = 14; fill.renderOrder = 15;
    bar.add(back, fill);
    bar.position.y = 1.9 * soldier.def.scale + 0.3;
    bar.visible = false;
    soldier.root.add(bar);
    this.bars.set(soldier, { bar, fill });
  }

  updateSoldierBar(soldier) {
    const { bar, fill } = this.bars.get(soldier);
    const ratio = Math.max(0, soldier.hp / soldier.maxHp);
    bar.visible = soldier.state !== 'dead' && ratio < 1;
    if (ratio <= 0) return;
    fill.scale.set(0.9 * ratio, 0.08, 1);
    fill.center.set(0.5 / ratio, 0.5);
  }

  stun(seconds) {
    if (seconds <= 0) return;
    if (this.stunned <= 0) this.game.fx.floatText(this.pedestal.x, 3, this.pedestal.z, '暈眩', '#fbbf24');
    this.stunned = Math.max(this.stunned, seconds);
  }

  // 範圍內走最遠的敵人（快到城門的先打）
  pickTargets(count = 1) {
    const { range } = this.stats;
    const c = this.center;
    return this.game.enemies
      .filter((e) => e.canBeHit && Math.hypot(e.position.x - c.x, e.position.z - c.z) <= range + e.radius)
      .sort((a, b) => b.progress - a.progress)
      .slice(0, count);
  }

  update(dt) {
    if (this.stunned > 0) {
      this.stunned -= dt;
      this.starTimer -= dt;
      if (this.starTimer <= 0) { this.starTimer = STUN_STAR_EVERY; this.game.fx.burst(this.pedestal.x, 2.6, this.pedestal.z, 2, '#fde047', 1.2); }
    }
    for (const s of this.soldiers) { s.update(dt); s.updateVisual(dt); }
    if (!this.unit) return;
    this.unit.updateVisual(dt);
    if (this.stunned > 0) { this.unit.play('Idle'); this.attacking = false; return; }
    this.cooldown -= dt;
    if (this.attacking) { this.updateAttack(dt); return; }
    const targets = this.pickTargets(this.stats.targets ?? 1);
    if (!targets.length) { this.unit.play('Idle'); return; }
    const t = targets[0];
    this.unit.faceToward(t.position.x - this.unit.position.x, t.position.z - this.unit.position.z, dt);
    if (this.cooldown > 0) return;
    const speed = this.attackSpeed(this.unit.clipLength('Attack'));
    this.attacking = true;
    this.attackTime = 0;
    this.fired = false;
    this.targets = targets;
    this.hitTime = (this.unitDef.attackHitTime ?? 0.35) / speed;
    this.attackLength = this.unit.clipLength('Attack') / speed;
    this.cooldown = this.stats.cooldown;
    this.unit.play('Attack', { once: true, fade: 0.06, speed });
    if (this.unitDef.cast) this.game.fx.castGlow(this.unit.root, new THREE.Vector3(this.unitDef.shot?.muzzle?.side ?? 0, 1, 0.6), this.unitDef.cast, this.hitTime);
  }

  updateAttack(dt) {
    this.attackTime += dt;
    const t = this.targets[0];
    if (t?.alive) this.unit.faceToward(t.position.x - this.unit.position.x, t.position.z - this.unit.position.z, dt, 20);
    if (!this.fired && this.attackTime >= this.hitTime) {
      this.fired = true;
      this.release();
    }
    if (this.attackTime >= this.attackLength) this.attacking = false;
  }

  release() {
    const { game, stats } = this;
    const live = this.targets.filter((e) => e.alive);
    if (!live.length) { const again = this.pickTargets(1); if (!again.length) return; live.push(...again); }
    if (this.kind === 'melee') {
      const { position } = this.unit;
      for (const e of live) {
        const yaw = Math.atan2(e.position.x - position.x, e.position.z - position.z);
        game.fx.crossCut(position.clone(), yaw, Math.PI / 4, 2.2, 0xd9c8ff);
        game.fx.after(0.08, () => game.fx.crossCut(position.clone(), yaw, -Math.PI / 4, 2.2, 0xd9c8ff));
        if (game.damageEnemy(e, stats.damage, 'plain') && stats.slow) e.setSlow(stats.slow);
      }
      game.sfx.hit();
      return;
    }
    // 遠距離：從角色的弓或杖射出。多重射擊打不同隻
    const shooter = this.unit;
    const muzzle = this.unitDef.shot?.muzzle ?? {};
    const yaw = shooter.root.rotation.y;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const ahead = (muzzle.ahead ?? 0.5) * this.scale, side = (muzzle.side ?? 0) * this.scale;
    const from = { x: shooter.position.x + fx * ahead + fz * side, y: shooter.position.y + (muzzle.height ?? 0.9) * this.scale, z: shooter.position.z + fz * ahead - fx * side };
    const shots = stats.shots ?? 1;
    const more = shots > 1 ? this.pickTargets(shots) : [];
    const pool = more.length ? more : live; // 目標剛好走出範圍時，至少射原本那隻
    for (let i = 0; i < shots; i++) {
      const target = pool[i % pool.length];
      const spec = { ...this.def.shot, damage: stats.damage, bossDamage: stats.bossDamage, blast: stats.blast, burn: stats.burn, range: stats.range * 1.8 };
      const aim = Math.atan2(target.position.x - from.x, target.position.z - from.z);
      game.projectiles.fire(from, aim, spec, new Set(), target);
    }
    game.sfx.swing();
  }

  dispose() {
    const { game } = this;
    this.unit?.destroy();
    for (const s of this.soldiers) {
      for (const e of s.engaged) e.blocker = null;
      s.destroy();
    }
    this.soldiers = [];
    game.scene.remove(this.group);
    this.label.material.map.dispose();
    this.label.material.dispose();
  }
}

export class Towers {
  constructor(game, defs) {
    this.game = game;
    this.defs = defs;
    this.list = [];
  }

  unitModels() { return Object.values(this.defs).map((d) => this.game.characters[d.unit].model); }
  shotSpecs() { return Object.values(this.defs).map((d) => d.shot).filter(Boolean); }

  cost(type) { return this.game.upgrades.towerCost(type, this.defs[type].levels[0].cost); }

  build(pedestal, type) {
    const tower = new Tower(this.game, pedestal, type, this.defs[type]);
    pedestal.tower = tower;
    this.list.push(tower);
    return tower;
  }

  sell(tower) {
    tower.dispose();
    tower.pedestal.tower = null;
    this.list = this.list.filter((t) => t !== tower);
  }

  clear() {
    for (const t of this.list) { t.dispose(); t.pedestal.tower = null; }
    this.list = [];
  }

  blockers() { return this.list.flatMap((t) => t.soldiers.filter((s) => s.canBlock)); }

  stunArea(x, z, radius, seconds) {
    if (!seconds) return;
    for (const t of this.list) {
      if (Math.hypot(t.pedestal.x - x, t.pedestal.z - z) <= radius + 1.2) t.stun(seconds);
    }
  }

  update(dt) { for (const t of this.list) t.update(dt); }
}
