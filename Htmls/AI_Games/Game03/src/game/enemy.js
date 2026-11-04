// 路上的怪物：站在路上等隊伍來，隊伍靠近就走過去打。打的是「隊伍」（傷害累積到打倒最後一個人）。
// Boss 另外有招式：砸地（預警圈後扣很多血）、召喚小怪。數值在 data/characters.json。
import * as THREE from 'three';
import { Actor } from './actor.js';

const AGGRO = 13;            // 隊伍多近才開始走過來
const DEATH_HOLD = 0.9;
const DEATH_FADE = 0.5;
const BAR_WIDTH = 1.15;
const FLAME_EVERY = 0.06;

export class Enemy extends Actor {
  constructor(game, def, instance, x, d) {
    super(game, def, instance);
    // Boss 有自己的難度倍率（bossHpMult），否則困難模式的 Boss 會硬到打不完
    const diff = game.difficulty;
    this.maxHp = Math.round(def.hp * (def.boss ? diff.bossHpMult ?? diff.enemyHpMult ?? 1 : diff.enemyHpMult ?? 1) * (game.level?.hpMult ?? 1) * (game.ramp ?? 1));
    this.stun = 0;
    this.hp = this.maxHp;
    this.state = 'idle';
    this.timer = 0;
    this.cooldown = def.attackCooldown * Math.random();
    this.removed = false;
    this.position.set(x, 0, -d);
    this.root.rotation.y = 0; // 面向隊伍（+z）
    this.makeBar();
    this.play('Idle');
  }

  get alive() { return this.hp > 0; }
  get canBeHit() { return this.alive; }

  makeBar() {
    const { fx } = this.game;
    this.bar = new THREE.Group();
    const back = new THREE.Sprite(fx.barMaterials.back);
    back.scale.set(BAR_WIDTH + 0.06, 0.18, 1);
    this.barFill = new THREE.Sprite(fx.barMaterials.fill);
    this.barFill.scale.set(BAR_WIDTH, 0.12, 1);
    back.renderOrder = 14; this.barFill.renderOrder = 15;
    this.bar.add(back, this.barFill);
    this.bar.position.y = 1.9 * this.def.scale + 0.4;
    this.bar.visible = false;
    this.root.add(this.bar);
  }

  updateBar() {
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.bar.visible = this.hp > 0 && ratio < 1;
    if (ratio <= 0) return;
    this.barFill.scale.set(BAR_WIDTH * ratio, 0.12, 1);
    this.barFill.center.set(0.5 / ratio, 0.5);
  }

  update(dt, crowd) {
    this.updateBurn(dt);
    if (this.stun > 0 && this.alive) { // 技能暈眩：原地發呆
      this.stun -= dt;
      this.play('Idle');
      if (Math.random() < dt * 6) this.game.fx.burst(this.position.x, 2.2, this.position.z, 1, '#fde047', 1);
      return;
    }
    this.timer += dt;
    this.cooldown -= dt;
    this[`update_${this.state}`](dt, crowd);
  }

  distanceTo(crowd) {
    const c = crowd.center;
    return Math.hypot(c.x - this.position.x, c.z - this.position.z) - crowd.radius;
  }

  update_idle(dt, crowd) {
    if (crowd.alive && this.distanceTo(crowd) < AGGRO) this.state = 'chase';
  }

  update_chase(dt, crowd) {
    if (!crowd.alive) { this.play('Wave'); return; }
    const c = crowd.center;
    const dx = c.x - this.position.x, dz = c.z - this.position.z;
    this.faceToward(dx, dz, dt, 8);
    if (this.distanceTo(crowd) <= this.def.attackRange) {
      if (this.cooldown <= 0) { this.startAttack(); return; }
      this.play('Idle');
      return;
    }
    const len = Math.hypot(dx, dz) || 1;
    this.position.x += (dx / len) * this.def.moveSpeed * dt;
    this.position.z += (dz / len) * this.def.moveSpeed * dt;
    this.play('Walk', { speed: this.def.moveSpeed / 2.2 });
  }

  startAttack() {
    this.state = 'attack';
    this.timer = 0;
    this.hitDone = false;
    this.cooldown = this.def.attackCooldown;
    this.play('Attack', { once: true, fade: 0.06 });
  }

  update_attack(dt, crowd) {
    if (!this.hitDone && this.timer >= this.def.attackHitTime) {
      this.hitDone = true;
      if (this.distanceTo(crowd) <= this.def.attackRange + 0.5) this.game.hurtCrowd(this.def.attackDamage);
    }
    if (this.timer >= this.clipLength('Attack')) this.state = 'chase';
  }

  update_dying() {
    if (this.timer < DEATH_HOLD) return;
    const fade = (this.timer - DEATH_HOLD) / DEATH_FADE;
    this.setOpacity(Math.max(0, 1 - fade));
    if (fade >= 1) this.removed = true;
  }

  // 火球的燃燒：每 interval 秒扣 damage，持續 duration 秒
  ignite(burn) {
    if (!this.alive) return;
    this.burn = { def: burn, remaining: burn.duration, tick: this.burn?.tick ?? burn.interval, spark: 0 };
  }

  updateBurn(dt) {
    const b = this.burn;
    if (!b || !this.alive) { this.burn = null; return; }
    b.remaining -= dt; b.tick -= dt; b.spark -= dt;
    if (b.spark <= 0) { b.spark = FLAME_EVERY; this.game.fx.flame(this.position.x, 0.3, this.position.z, 2); }
    if (b.tick <= 0) { b.tick += b.def.interval; this.game.damageEnemy(this, b.def.damage, true); }
    if (this.burn && b.remaining <= 0) this.burn = null;
  }

  takeHit(amount, soft = false) {
    if (!this.alive) return false;
    this.hp -= amount;
    this.updateBar();
    this.flash(soft ? 0xff6a1f : 0xffffff);
    if (this.hp <= 0) {
      this.state = 'dying';
      this.timer = 0;
      this.play('Death', { once: true, fade: 0.08 });
    }
    return true;
  }
}

const WARN = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2);

export class Boss extends Enemy {
  constructor(game, def, instance, x, d) {
    super(game, def, instance, x, d);
    this.plan = def.boss;
    this.skillIndex = 0;
    this.skillTimer = this.plan.skillEvery * 0.5;
    this.bar.visible = false;
    this.reinforceTimer = this.plan.reinforce?.first ?? 4;
    game.hud.showBoss(this.plan.name, 1);
  }

  // 援軍：Boss 活著的時候，每隔幾秒從後面跑出一批小兵（難度越高越多）
  reinforce(dt, crowd) {
    const r = this.plan.reinforce;
    if (!r || this.state === 'idle') return;
    this.reinforceTimer -= dt;
    if (this.reinforceTimer > 0) return;
    this.reinforceTimer = r.every;
    const count = Math.round(r.count * (this.game.difficulty.enemyCountMult ?? 1));
    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * 1.3;
      this.game.spawnEnemy(r.enemies[i % r.enemies.length], x, -this.position.z + 4 + (i % 2), true);
    }
    this.game.fx.burst(this.position.x, 1, this.position.z - 3, 24, '#b48cff', 4);
  }

  updateBar() { this.game.hud.showBoss(this.plan.name, Math.max(0, this.hp / this.maxHp)); }

  update(dt, crowd) {
    if (this.stun > 0 && this.alive) { super.update(dt, crowd); return; }
    if (this.alive && crowd.alive) this.reinforce(dt, crowd);
    if (this.alive && crowd.alive && this.state === 'chase') {
      this.skillTimer -= dt;
      if (this.skillTimer <= 0) { this.startSkill(crowd); return; }
    }
    super.update(dt, crowd);
  }

  startSkill(crowd) {
    const skills = this.plan.skills;
    this.skill = skills[this.skillIndex++ % skills.length];
    this.state = 'windup';
    this.timer = 0;
    this.play(this.skill.type === 'summon' ? 'Wave' : 'Idle');
    if (this.skill.type === 'slam') { // 預警圈畫在隊伍中間
      const c = crowd.center;
      this.warn = new THREE.Mesh(WARN, new THREE.MeshBasicMaterial({ color: 0xff3b2f, transparent: true, opacity: 0.2, depthWrite: false }));
      this.warn.position.set(c.x, 0.06, c.z);
      this.warn.scale.setScalar(this.skill.radius);
      this.game.scene.add(this.warn);
    }
  }

  update_windup(dt, crowd) {
    const { skill } = this;
    if (this.warn) {
      const c = crowd.center;
      this.warn.position.x += (c.x - this.warn.position.x) * Math.min(1, dt * 1.5); // 慢慢跟著隊伍，躲得掉但要快
      this.warn.material.opacity = 0.2 + 0.4 * Math.min(1, this.timer / skill.windup);
    }
    if (this.timer < skill.windup) return;
    const { fx, sfx } = this.game;
    if (skill.type === 'slam') {
      const { x, z } = this.warn.position;
      this.clearWarn();
      this.play('Attack', { once: true, fade: 0.06 });
      fx.blastRing(x, z, skill.radius, '#ff5a3c');
      fx.burst(x, 0.4, z, 30, '#ff5a3c', 5);
      fx.shake(0.5);
      sfx.blast();
      const c = crowd.center;
      // 打到的人數：隊伍有多少在圈裡（用中心距離估），躲開就打不到
      const off = Math.hypot(c.x - x, c.z - z);
      const inside = Math.max(0, 1 - off / (skill.radius + crowd.radius));
      if (inside > 0) this.game.hurtCrowd(skill.damage * inside);
    } else if (skill.type === 'summon') {
      const count = Math.round(skill.count * (this.game.difficulty.enemyCountMult ?? 1));
      for (let i = 0; i < count; i++) {
        const x = this.position.x + (i - (count - 1) / 2) * 1.4;
        this.game.spawnEnemy(skill.enemy, x, -this.position.z + 2, true);
      }
      fx.burst(this.position.x, 1, this.position.z, 30, '#b48cff', 4);
    }
    this.state = 'recover';
    this.timer = 0;
  }

  update_recover() {
    if (this.timer < (this.skill.recover ?? 1)) return;
    this.skillTimer = this.plan.skillEvery;
    this.state = 'chase';
  }

  clearWarn() {
    if (!this.warn) return;
    this.game.scene.remove(this.warn);
    this.warn.material.dispose();
    this.warn = null;
  }

  takeHit(amount, soft) {
    const hit = super.takeHit(amount, soft);
    if (!this.alive) this.clearWarn();
    return hit;
  }

  destroy() {
    this.clearWarn();
    super.destroy();
  }
}
