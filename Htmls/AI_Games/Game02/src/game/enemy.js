// 敵人：沿著路線走向城門。路上遇到「擋路的人」（騎士兵、英雄）就停下來打，打倒或對方離開才繼續走。
// 走到城門就扣城堡的愛心（leak）。數值都在 data/characters.json。
// 特殊能力：leap 跳過擋路的人（忍者）、armor 盔甲（一般攻擊少扣，魔法不受影響）、heal 幫附近的敵人回血（祭司）、tint 模型染色。
import * as THREE from 'three';
import { Actor } from './actor.js';

const STUN_TIME = 0.3;
const DEATH_HOLD = 1.0;
const DEATH_FADE = 0.55;
const FLAME_EVERY = 0.05;
const BAR_WIDTH = 1.15;
const BAR_HEIGHT = 0.12;
const BAR_OFFSET = 0.45;
const BACK_TO_PATH = 0.4;    // 離路線超過這個距離就先走回路上
const ENGAGE_RANGE = 1.2;    // 和擋路的人距離（扣掉兩邊半徑）多近就停下來打
const LEAVE_RANGE = 3.2;     // 對方走開超過這個距離就放棄，繼續走
const KNOCK_BACK = 0.35;     // 被打到往回退幾公尺（重型敵人不退）
const LEAP_HEIGHT = 1.6;
const HEAL_COLOR = '#4ade80';
const ARMOR_COLOR = '#cbd5e1';

export class Enemy extends Actor {
  constructor(game, def, instance, s = 0, lane = 0, path = game.paths[0]) {
    super(game, def, instance);
    this.path = path;
    this.s = s;
    this.lane = lane;
    this.state = 'walk';
    this.timer = 0;
    this.cooldown = def.attackCooldown * Math.random() * 0.5;
    this.blocker = null;
    this.slow = null; // { factor, remaining }
    this.removed = false;
    this.maxHp = Math.round(def.hp * (game.difficulty?.hpMult ?? 1) * (game.levelData?.hpMult ?? 1)); // 難度越高、越後面的關卡越硬
    this.hp = this.maxHp;
    this.tint = def.tint ?? [1, 1, 1];
    this.leapt = new Set(); // 已經跳過的擋路者，不再停下來
    this.healTimer = def.heal ? def.heal.every * Math.random() : 0;
    this.applyColor(1, 1, 1);
    if (def.heal) this.makeAura(def.heal.color ?? '#a78bfa');
    this.makeHealthBar();
    const p = this.path.at(s, lane);
    this.position.set(p.x, 0, p.z);
    this.faceToward(p.dx, p.dz, Infinity);
    this.play('Walk');
  }

  makeHealthBar() {
    const { fx } = this.game;
    this.bar = new THREE.Group();
    const back = new THREE.Sprite(fx.barMaterials.back);
    back.scale.set(BAR_WIDTH + 0.06, BAR_HEIGHT + 0.06, 1);
    this.barFill = new THREE.Sprite(fx.barMaterials.fill);
    back.renderOrder = 14;
    this.barFill.renderOrder = 15;
    this.bar.add(back, this.barFill);
    this.bar.position.y = 1.9 * this.def.scale + BAR_OFFSET;
    this.bar.visible = false;
    this.root.add(this.bar);
  }

  // 祭司腳下的光圈：一看就知道要先打掉
  makeAura(color) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.8, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false }));
    ring.position.y = 0.05;
    this.root.add(ring);
    this.aura = ring;
  }

  applyColor(r, g, b) {
    const [tr, tg, tb] = this.tint;
    for (const m of this.materials) m.color.setRGB(tr * r, tg * g, tb * b);
  }

  updateHealthBar() {
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.bar.visible = this.hp > 0 && ratio < 1;
    if (ratio <= 0) return;
    this.barFill.scale.set(BAR_WIDTH * ratio, BAR_HEIGHT, 1);
    this.barFill.center.set(0.5 / ratio, 0.5);
  }

  get speed() { return this.def.moveSpeed * (this.slow ? this.slow.factor : 1); }
  get alive() { return this.hp > 0; }
  get canBeHit() { return this.alive; }
  get progress() { return this.s - this.path.length; } // 塔優先打離城門最近的（好幾條路長度不同，所以用剩下的距離）

  update(dt) {
    this.updateBurn(dt);
    if (this.def.heal && this.alive) this.updateHeal(dt);
    if (this.slow && (this.slow.remaining -= dt) <= 0) this.setSlow(null);
    this.timer += dt;
    this.cooldown -= dt;
    this[`update_${this.state}`](dt);
  }

  setSlow(slow) {
    if (slow && this.slow && this.slow.factor < slow.factor) { this.slow.remaining = Math.max(this.slow.remaining, slow.duration); return; }
    this.slow = slow ? { factor: slow.factor, remaining: slow.duration } : null;
    if (slow) this.applyColor(0.75, 0.85, 1); else this.applyColor(1, 1, 1);
  }

  // 祭司：每隔幾秒幫範圍內受傷的敵人（含自己）回血
  updateHeal(dt) {
    const { heal } = this.def;
    this.aura.rotation.y += dt;
    this.aura.material.opacity = 0.45 + Math.sin(this.game.level.time * 4) * 0.25;
    this.healTimer -= dt;
    if (this.healTimer > 0) return;
    this.healTimer = heal.every;
    const { fx } = this.game;
    let healed = 0;
    for (const e of this.game.enemies) {
      if (!e.alive || e.hp >= e.maxHp || Math.hypot(e.position.x - this.position.x, e.position.z - this.position.z) > heal.radius) continue;
      const amount = Math.min(heal.amount, e.maxHp - e.hp);
      e.hp += amount;
      e.updateHealthBar();
      fx.floatText(e.position.x, 2.4, e.position.z, `+${amount}`, HEAL_COLOR);
      healed += 1;
    }
    if (healed) {
      fx.blastRing(this.position.x, this.position.z, heal.radius, HEAL_COLOR);
      fx.burst(this.position.x, 1.2, this.position.z, 16, HEAL_COLOR, 2);
    }
  }

  // 找路上可以擋人的對象（容量還沒滿、夠近）
  findBlocker(ignoreFull = false, soldiersOnly = false) {
    for (const b of this.game.blockers()) {
      if (this.leapt.has(b) || (soldiersOnly && b === this.game.hero) || (!ignoreFull && b.engaged.size >= b.capacity)) continue;
      const d = Math.hypot(b.position.x - this.position.x, b.position.z - this.position.z);
      if (d <= ENGAGE_RANGE + b.radius + this.radius) return b;
    }
    return null;
  }

  update_walk(dt) {
    if (this.def.leap) { // 忍者：遇到騎士兵就跳過去；英雄擋得住（只有英雄抓得到忍者）
      const ahead = this.findBlocker(true, true);
      if (ahead) { this.startLeap(ahead); return; }
    }
    const blocker = this.findBlocker();
    if (blocker) { this.engage(blocker); return; }
    const target = this.path.at(this.s, this.lane);
    const dx = target.x - this.position.x, dz = target.z - this.position.z;
    const off = Math.hypot(dx, dz);
    const step = this.speed * dt;
    if (off > BACK_TO_PATH) { // 打完架先走回路上
      this.position.x += (dx / off) * step;
      this.position.z += (dz / off) * step;
      this.faceToward(dx, dz, dt, 8);
    } else {
      this.s += step;
      const next = this.path.at(this.s, this.lane);
      this.position.x = next.x;
      this.position.z = next.z;
      this.faceToward(next.dx, next.dz, dt, 8);
    }
    this.play('Walk', { speed: this.speed / 2.2 });
    if (this.s >= this.path.length) this.game.onLeak(this);
  }

  startLeap(blocker) {
    this.leapt.add(blocker);
    this.leapFrom = this.s;
    this.setState('leap');
    this.play('Jump', { once: true, fade: 0.05, speed: this.clipLength('Jump') / this.def.leap.time || 1 });
    this.game.fx.dust(this.position.x, 0.2, this.position.z, 10);
  }

  update_leap() {
    const { distance, time } = this.def.leap;
    const t = Math.min(1, this.timer / time);
    this.s = this.leapFrom + distance * t;
    const p = this.path.at(this.s, this.lane);
    this.position.set(p.x, Math.sin(t * Math.PI) * LEAP_HEIGHT, p.z);
    this.faceToward(p.dx, p.dz, Infinity);
    if (t < 1) return;
    this.position.y = 0;
    this.game.fx.dust(p.x, 0.2, p.z, 8);
    this.setState('walk');
    if (this.s >= this.path.length) this.game.onLeak(this);
  }

  engage(blocker) {
    this.blocker = blocker;
    blocker.engaged.add(this);
    this.setState('fight');
  }

  release() {
    this.blocker?.engaged.delete(this);
    this.blocker = null;
  }

  update_fight(dt) {
    const b = this.blocker;
    if (!b || !b.canBlock) { this.release(); this.setState('walk'); return; }
    const dx = b.position.x - this.position.x, dz = b.position.z - this.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > LEAVE_RANGE + b.radius + this.radius) { this.release(); this.setState('walk'); return; }
    this.faceToward(dx, dz, dt, 8);
    const reach = this.def.attackRange + b.radius * 0.5;
    if (dist > reach) {
      const step = this.speed * dt;
      this.position.x += (dx / dist) * step;
      this.position.z += (dz / dist) * step;
      this.play('Walk', { speed: this.speed / 2.2 });
      return;
    }
    if (this.cooldown <= 0) { this.startAttack(); return; }
    this.play('Idle');
  }

  startAttack() {
    this.setState('attack');
    this.attackConnected = false;
    this.cooldown = this.def.attackCooldown;
    this.play('Attack', { once: true, fade: 0.08 });
  }

  update_attack() {
    const b = this.blocker;
    if (!this.attackConnected && this.timer >= this.def.attackHitTime) {
      this.attackConnected = true;
      if (b?.canBlock && Math.hypot(b.position.x - this.position.x, b.position.z - this.position.z) <= this.def.attackRange + b.radius + 0.4) {
        b.takeDamage(this.game.enemyDamage(this.def.attackDamage), this);
      }
    }
    if (this.timer >= this.clipLength('Attack')) this.setState(this.blocker ? 'fight' : 'walk');
  }

  update_stunned() {
    if (this.timer >= (this.stunFor ?? this.def.stunTime ?? STUN_TIME)) { this.stunFor = null; this.setState(this.blocker ? 'fight' : 'walk'); }
  }

  // 被震退：沿路往回推、暈眩，不扣血。重型敵人推不動
  shove(distance, stun) {
    this.flash(0xffffff);
    if (this.def.poise || !this.alive) return;
    this.release();
    this.s = Math.max(0, this.s - distance);
    const p = this.path.at(this.s, this.lane);
    this.position.set(p.x, 0, p.z);
    this.stunFor = stun;
    this.setState('stunned');
    this.play('Hit', { once: true, fade: 0.05 });
  }

  update_dying() {
    if (this.timer < DEATH_HOLD) return;
    const fade = (this.timer - DEATH_HOLD) / DEATH_FADE;
    this.setOpacity(Math.max(0, 1 - fade));
    if (fade >= 1) {
      this.game.fx.dust(this.position.x, 0.3, this.position.z, 14);
      this.removed = true;
    }
  }

  ignite(burn) {
    if (!this.alive) return;
    this.burn = { def: burn, remaining: burn.duration, tick: this.burn?.tick ?? burn.interval, spark: 0 };
    if (!this.burnSprite) {
      this.burnSprite = this.game.fx.makeFlameSprite();
      this.burnSprite.position.y = 0.95;
      this.root.add(this.burnSprite);
    }
  }

  extinguish() {
    this.burn = null;
    if (this.burnSprite) this.root.remove(this.burnSprite);
    this.burnSprite = null;
  }

  updateBurn(dt) {
    const { burn } = this;
    if (!burn) return;
    if (!this.alive) { this.extinguish(); return; }
    burn.remaining -= dt;
    burn.tick -= dt;
    burn.spark -= dt;
    if (burn.spark <= 0) {
      burn.spark = FLAME_EVERY;
      this.game.fx.flame(this.position.x, 0.25, this.position.z);
    }
    this.burnSprite.scale.setScalar(1.7 + Math.sin(this.game.level.time * 19 + this.position.x) * 0.2);
    if (burn.tick <= 0) {
      burn.tick += burn.def.interval;
      this.game.burnDamage(this, burn.def.damage);
    }
    if (this.burn && burn.remaining <= 0) this.extinguish();
  }

  setState(state) {
    this.state = state;
    this.timer = 0;
  }

  // mode：stagger 近戰（英雄、騎士兵）會打出硬直；plain 箭與刀只扣血閃光；magic 火球、隕石；burn 燃燒
  // 盔甲（armor）只減一般攻擊，最少扣 1；魔法和燃燒不受影響，所以盔甲兵要靠魔法塔
  // 塔一直在射，如果每發都有硬直，敵人會被定在原地，塔防就失去緊張感
  takeHit(amount, mode = 'plain') {
    if (!this.alive) return false;
    if (this.def.armor && (mode === 'plain' || mode === 'stagger')) {
      amount = Math.max(1, amount - this.def.armor);
      this.game.fx.burst(this.position.x, 1.2, this.position.z, 6, ARMOR_COLOR, 3);
    }
    if (this.state === 'leap') mode = mode === 'stagger' ? 'plain' : mode; // 空中不會被打下來
    this.hp -= amount;
    this.updateHealthBar();
    if (this.hp <= 0) {
      this.release();
      this.setSlow(null);
      this.setState('dying');
      this.play('Death', { once: true, fade: 0.08 });
      return true;
    }
    this.flash(mode === 'burn' ? 0xff6a1f : 0xffffff);
    this.lastDamage = amount;
    if (mode !== 'stagger') return true;
    if (this.def.poise || this.state === 'attack') return true; // 重型敵人打不斷；出手中的攻擊不打斷，否則一直被打就永遠不還手
    if (this.state === 'walk') this.s = Math.max(0, this.s - KNOCK_BACK);
    this.setState('stunned');
    this.play('Hit', { once: true, fade: 0.05 });
    return true;
  }

  destroy() {
    this.release();
    super.destroy();
  }
}
