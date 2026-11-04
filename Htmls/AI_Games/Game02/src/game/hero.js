// 英雄：玩家操控的角色。移動、攻擊方式沿用《騎士與骷髏》，另外會擋路（敵人會停下來打英雄）。
// 倒下不會輸，過幾秒在城門前復活。技能（K）在 characters.json 的 skill，類型在 SKILLS。
import * as THREE from 'three';
import { Actor } from './actor.js';

const AUTO_AIM_RANGE = 4;
const LUNGE_SPEED = 3;
const LUNGE_TIME = 0.16;
const ATTACK_RECOVERY = 0.72;
const HURT_GRACE = 0.25; // 受傷後短暫不再受傷，被圍住時才不會一瞬間倒下
const REGEN_DELAY = 3;
const REGEN_EVERY = 1;
const CROSS_GAP = 0.08;

const SKILLS = {
  // 騎士：周圍的敵人沿路往回推、暈眩
  shockwave(hero, skill) {
    const { game } = hero;
    const { x, z } = hero.position;
    game.fx.blastRing(x, z, skill.radius, skill.color);
    game.fx.burst(x, 0.6, z, 40, skill.color, 7);
    game.fx.shake(0.5);
    game.sfx.blast();
    for (const e of game.enemies) {
      if (e.alive && Math.hypot(e.position.x - x, e.position.z - z) <= skill.radius + e.radius) e.shove(skill.push, skill.stun);
    }
  },
  // 盜賊：煙霧彈，範圍內的敵人變慢並受傷
  smoke(hero, skill) {
    const { game } = hero;
    const { x, z } = hero.position;
    game.fx.blastRing(x, z, skill.radius, skill.color);
    game.fx.burst(x, 0.4, z, 60, skill.color, 3);
    game.sfx.wave();
    for (const e of game.enemies) {
      if (!e.alive || Math.hypot(e.position.x - x, e.position.z - z) > skill.radius + e.radius) continue;
      if (game.damageEnemy(e, skill.damage, 'plain')) e.setSlow(skill.slow);
    }
  },
  // 弓箭手箭雨、魔法師隕石：預警後砸在敵人最多的地方
  strike(hero, skill) {
    const { game } = hero;
    const spot = game.crowdedSpot(hero.position, skill.reach, skill.radius) ?? { x: hero.position.x, z: hero.position.z };
    game.warnArea(spot.x, spot.z, skill.radius, skill.delay, skill.color, () => {
      game.fx.blastRing(spot.x, spot.z, skill.radius, skill.color);
      game.fx.burst(spot.x, 1.5, spot.z, 50, skill.color, 6);
      game.fx.shake(0.4);
      game.sfx.blast();
      for (const e of game.enemies) {
        if (!e.alive || Math.hypot(e.position.x - spot.x, e.position.z - spot.z) > skill.radius + e.radius) continue;
        if (game.damageEnemy(e, e.def.boss ? skill.bossDamage ?? skill.damage : skill.damage, skill.burn ? 'magic' : 'plain') && skill.burn) e.ignite(skill.burn);
      }
    });
  },
};

export class Hero extends Actor {
  constructor(game, def, instance) {
    super(game, def, instance);
    this.state = 'idle';
    this.engaged = new Set();
    this.capacity = def.capacity ?? 3;
    this.grace = 0;
    this.calm = 0;
    this.skillCooldown = 0;
    this.respawnIn = 0;
    this.makeBar();
    this.makeRing();
    this.play('Idle');
  }

  get maxHp() { return this.def.hp + this.game.upgrades.add('heroHp'); }
  get canBlock() { return this.state !== 'dead'; }
  get alive() { return this.state !== 'dead'; }
  get skill() { return this.def.skill; }

  // 頭上的綠色血條
  makeBar() {
    const { fx } = this.game;
    this.bar = new THREE.Group();
    const back = new THREE.Sprite(fx.barMaterials.back);
    back.scale.set(1.26, 0.18, 1);
    this.barFill = new THREE.Sprite(fx.barMaterials.ally);
    this.barFill.scale.set(1.2, 0.12, 1);
    back.renderOrder = 14; this.barFill.renderOrder = 15;
    this.bar.add(back, this.barFill);
    this.bar.position.y = 1.9 * this.def.scale + 0.45;
    this.root.add(this.bar);
  }

  // 腳下的金色圈：一眼分得出哪個是自己（塔也可能是同一個角色）
  makeRing() {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.82, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf2c14e, transparent: true, opacity: 0.85, depthWrite: false }));
    ring.position.y = 0.04;
    this.root.add(ring);
    this.ring = ring;
  }

  updateBar() {
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.bar.visible = this.alive;
    if (ratio <= 0) return;
    this.barFill.scale.set(1.2 * ratio, 0.12, 1);
    this.barFill.center.set(0.5 / ratio, 0.5);
  }

  reset(x, z) {
    this.hp = this.maxHp;
    this.state = 'idle';
    this.grace = 0;
    this.skillCooldown = 0;
    this.engaged.clear();
    this.setOpacity(1);
    this.position.set(x, 0, z);
    this.root.rotation.y = Math.PI;
    this.model.visible = true;
    this.ring.visible = true;
    this.currentName = '';
    this.play('Idle');
    this.updateBar();
  }

  update(dt, input) {
    this.grace = Math.max(0, this.grace - dt);
    this.skillCooldown = Math.max(0, this.skillCooldown - dt);
    if (this.state === 'dead') { this.updateDead(dt); return; }
    this.regen(dt);
    if (input.consumeSkill()) this.useSkill();
    if (this.state === 'attack') { this.updateAttack(dt, input); return; }
    if (input.consumeAttack()) { this.startAttack(); return; }
    const move = input.move;
    if (move.moving) {
      this.position.x += move.x * this.def.moveSpeed * dt;
      this.position.z += move.z * this.def.moveSpeed * dt;
      this.faceToward(move.x, move.z, dt);
      this.play('Run', { speed: 1.05 });
    } else {
      this.play('Idle');
    }
  }

  // 一段時間沒被打就慢慢回血
  regen(dt) {
    this.calm += dt;
    if (this.calm < REGEN_DELAY || this.hp >= this.maxHp) return;
    this.regenTimer = (this.regenTimer ?? 0) + dt;
    if (this.regenTimer < REGEN_EVERY) return;
    this.regenTimer = 0;
    this.hp += 1;
    this.updateBar();
  }

  useSkill() {
    const { skill } = this;
    if (!skill || this.skillCooldown > 0) return;
    SKILLS[skill.type](this, skill);
    this.skillCooldown = skill.cooldown * this.game.upgrades.mult('heroSkill');
    this.game.hud.toast(skill.name, skill.color);
  }

  startAttack() {
    this.state = 'attack';
    this.attackTime = 0;
    this.attackConnected = false;
    this.aim();
    this.play('Attack', { once: true, fade: 0.06, speed: this.def.attackSpeed });
    if (this.def.cast) {
      const { side = 0, height = 0.9, ahead = 0 } = this.def.shot.muzzle ?? {};
      this.game.fx.castGlow(this.root, new THREE.Vector3(side, height, ahead), this.def.cast, this.def.attackHitTime / this.def.attackSpeed);
    }
    this.game.sfx.swing();
  }

  aim() {
    const range = Math.max(AUTO_AIM_RANGE, this.def.shot?.range ?? 0);
    const target = this.game.nearestEnemy(this.position, range);
    if (target) this.faceToward(target.position.x - this.position.x, target.position.z - this.position.z, Infinity);
  }

  updateAttack(dt, input) {
    this.attackTime += dt * this.def.attackSpeed;
    if (this.def.lunge !== false && this.attackTime < LUNGE_TIME) {
      this.position.x += Math.sin(this.root.rotation.y) * LUNGE_SPEED * dt;
      this.position.z += Math.cos(this.root.rotation.y) * LUNGE_SPEED * dt;
    }
    if (!this.attackConnected && this.attackTime >= this.def.attackHitTime) {
      this.attackConnected = true;
      if (this.def.shot) this.aim();
      this.resolveAttack();
    }
    if (this.attackTime >= this.clipLength('Attack') * ATTACK_RECOVERY) {
      this.state = 'idle';
      if (input.consumeAttack()) this.startAttack();
    }
  }

  resolveAttack() {
    const { def, game } = this;
    const yaw = this.root.rotation.y;
    if (def.shot) {
      const k = def.scale;
      const { side = 0, height = 0.9, ahead = 0 } = def.shot.muzzle ?? {};
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      const from = { x: this.position.x + (fx * ahead + fz * side) * k, y: height * k, z: this.position.z + (fz * ahead - fx * side) * k };
      game.projectiles.fire(from, yaw, { ...def.shot, damage: def.attackDamage, bossDamage: def.bossDamage });
      return;
    }
    const range = def.attackRange;
    const arc = THREE.MathUtils.degToRad(def.attackArcDegrees);
    const cross = def.slash === 'cross';
    const at = this.position.clone();
    if (cross) {
      game.fx.crossCut(at, yaw, Math.PI / 4, range, 0xd9c8ff);
      game.fx.after(CROSS_GAP, () => game.fx.crossCut(at, yaw, -Math.PI / 4, range, 0xd9c8ff));
    } else {
      game.fx.slashAt(this.position, yaw, arc, range);
    }
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    let hits = 0;
    for (const e of game.enemies) {
      if (!e.alive) continue;
      const dx = e.position.x - this.position.x, dz = e.position.z - this.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > range + e.radius) continue;
      if (dist > 0.6 && (dx * fx + dz * fz) / dist < Math.cos(arc / 2)) continue;
      if (game.damageEnemy(e, def.attackDamage, 'stagger')) hits += 1;
    }
    if (hits) {
      game.sfx.hit();
      game.fx.shake(0.15);
      game.hitStop = 0.04;
    }
  }

  takeDamage(amount) {
    if (this.state === 'dead' || this.grace > 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.grace = HURT_GRACE;
    this.calm = 0;
    this.flash();
    this.game.sfx.hurt();
    this.updateBar();
    if (this.hp > 0) return;
    this.state = 'dead';
    this.respawnIn = this.game.difficulty.heroRespawn * this.game.upgrades.mult('heroRespawn');
    for (const e of this.engaged) e.blocker = null;
    this.engaged.clear();
    this.ring.visible = false;
    this.play('Death', { once: true });
    this.game.onHeroDown();
  }

  updateDead(dt) {
    this.respawnIn -= dt;
    if (this.respawnIn < 1) this.setOpacity(Math.max(0, this.respawnIn));
    if (this.respawnIn > 0) return;
    const spot = this.game.heroSpawn;
    this.reset(spot.x, spot.z);
    this.game.fx.burst(spot.x, 1, spot.z, 30, '#f2c14e', 4);
    this.game.hud.toast(`${this.def.id}回來了！`, '#f2c14e');
  }
}
