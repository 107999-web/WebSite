// 敵人：從地底爬出 → 追玩家 → 攻擊；被打到生命歸零就倒下並消失。血條在受傷後顯示。
// 同一份類別服務所有敵人，差異都在 data/characters.json。
import * as THREE from 'three';
import { Actor } from './actor.js';

const RISE_TIME = 0.9;
const RISE_DEPTH = 1.9;
const STUN_TIME = 0.42;
const KNOCKBACK_SPEED = 6;
const DEATH_HOLD = 1.0;
const DEATH_FADE = 0.55;
const FLAME_EVERY = 0.05;
const BAR_WIDTH = 1.15;
const BAR_HEIGHT = 0.12;
const BAR_OFFSET = 0.45; // 頭頂上方
const BAR_MIN_HP = 3;    // 打兩下就倒的小怪不需要血條
const WANDER_TIME = 1;
const WANDER_SPEED = 0.5;

export class Enemy extends Actor {
  constructor(game, def, instance, x, z) {
    super(game, def, instance);
    this.state = 'rising';
    this.timer = 0;
    this.cooldown = def.attackCooldown * Math.random() * 0.5;
    this.attackConnected = false;
    this.knockX = 0;
    this.knockZ = 0;
    this.removed = false;
    if (def.hp >= BAR_MIN_HP) this.makeHealthBar();
    this.position.set(x, -RISE_DEPTH, z);
    this.play('Idle');
    game.fx.dust(x, 0.1, z, 16);
  }

  // 受傷後才顯示。Sprite 永遠面向鏡頭，錨點調到左端，血量減少時才會往左縮
  makeHealthBar() {
    const { fx } = this.game;
    const y = 1.9 * this.def.scale + BAR_OFFSET;
    this.bar = new THREE.Group();
    const back = new THREE.Sprite(fx.barMaterials.back);
    back.scale.set(BAR_WIDTH + 0.06, BAR_HEIGHT + 0.06, 1);
    this.barFill = new THREE.Sprite(fx.barMaterials.fill);
    back.renderOrder = 14;
    this.barFill.renderOrder = 15;
    this.bar.add(back, this.barFill);
    this.bar.position.y = y;
    this.bar.visible = false;
    this.root.add(this.bar);
  }

  updateHealthBar() {
    if (!this.bar) return;
    const ratio = Math.max(0, this.hp / this.def.hp);
    this.bar.visible = this.hp > 0 && ratio < 1;
    if (ratio <= 0) return;
    this.barFill.scale.set(BAR_WIDTH * ratio, BAR_HEIGHT, 1);
    this.barFill.center.set(0.5 / ratio, 0.5);
  }

  get speed() { return this.def.moveSpeed; }
  get alive() { return this.hp > 0; }
  get canBeHit() { return this.alive && (this.state !== 'rising' || this.timer > RISE_TIME * 0.5); }

  update(dt, player) {
    this.updateBurn(dt);
    this.timer += dt;
    this.cooldown -= dt;
    this[`update_${this.state}`](dt, player);
  }

  update_rising(dt, player) {
    const p = Math.min(1, this.timer / RISE_TIME);
    this.position.y = -RISE_DEPTH * (1 - p) ** 2;
    this.faceToward(player.position.x - this.position.x, player.position.z - this.position.z, dt, 5);
    if (p >= 1) this.setState('chase');
  }

  // 玩家隱身時找不到人，慢慢亂走
  wander(dt) {
    this.wanderTime = (this.wanderTime ?? 0) - dt;
    if (this.wanderTime <= 0) {
      this.wanderTime = WANDER_TIME * (1 + Math.random());
      this.wanderAngle = Math.random() * Math.PI * 2;
    }
    const x = Math.sin(this.wanderAngle), z = Math.cos(this.wanderAngle);
    const speed = this.speed * WANDER_SPEED;
    this.position.x += x * speed * dt;
    this.position.z += z * speed * dt;
    this.faceToward(x, z, dt, 6);
    this.play('Walk', { speed: speed / 2.2 });
  }

  update_chase(dt, player) {
    if (player.state === 'dead') { this.play('Wave'); return; } // 打贏了開心揮手
    if (player.hidden) { this.wander(dt); return; }
    const dx = player.position.x - this.position.x;
    const dz = player.position.z - this.position.z;
    const dist = Math.hypot(dx, dz);
    this.faceToward(dx, dz, dt, 8);
    if (dist <= this.def.attackRange) {
      if (this.cooldown <= 0) { this.startAttack(); return; }
      this.play('Idle');
      return;
    }
    this.position.x += (dx / dist) * this.speed * dt;
    this.position.z += (dz / dist) * this.speed * dt;
    this.play('Walk', { speed: this.speed / 2.2 });
  }

  startAttack() {
    this.setState('attack');
    this.attackConnected = false;
    this.cooldown = this.def.attackCooldown;
    this.play('Attack', { once: true, fade: 0.08 });
  }

  update_attack(dt, player) {
    if (!this.attackConnected && this.timer >= this.def.attackHitTime) {
      this.attackConnected = true;
      const reach = this.def.attackRange + 0.3;
      const dist = Math.hypot(player.position.x - this.position.x, player.position.z - this.position.z);
      if (dist <= reach) player.takeDamage(this.def.attackDamage);
    }
    if (this.timer >= this.clipLength('Attack')) this.setState('chase');
  }

  update_stunned(dt) {
    this.position.x += this.knockX * dt;
    this.position.z += this.knockZ * dt;
    this.knockX *= 0.88;
    this.knockZ *= 0.88;
    if (this.timer >= (this.shoveStun ?? this.def.stunTime ?? STUN_TIME)) { this.shoveStun = null; this.setState('chase'); }
  }

  // 震退：彈開並暈眩，不扣血。poise 的重型敵人推不動
  shove(fromX, fromZ, { knockback, stun }) {
    this.flash(0xffffff);
    if (this.def.poise) return;
    const dx = this.position.x - fromX;
    const dz = this.position.z - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    this.position.y = 0;
    this.knockX = (dx / len) * knockback;
    this.knockZ = (dz / len) * knockback;
    this.shoveStun = stun;
    this.setState('stunned');
    this.play('Hit', { once: true, fade: 0.05 });
  }

  update_dying(dt) {
    this.position.x += this.knockX * dt;
    this.position.z += this.knockZ * dt;
    this.knockX *= 0.9;
    this.knockZ *= 0.9;
    if (this.timer < DEATH_HOLD) return;
    const fade = (this.timer - DEATH_HOLD) / DEATH_FADE;
    this.setOpacity(Math.max(0, 1 - fade));
    if (fade >= 1) {
      this.game.fx.dust(this.position.x, 0.3, this.position.z, 14);
      this.removed = true;
    }
  }

  // 燃燒：再被點燃時時間重算，扣血節奏不重來，否則連續打中會永遠不扣血
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
    const { fx } = this.game;
    burn.remaining -= dt;
    burn.tick -= dt;
    burn.spark -= dt;
    if (burn.spark <= 0) {
      burn.spark = FLAME_EVERY;
      fx.flame(this.position.x, 0.25, this.position.z);
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

  // soft：燃燒這類持續傷害，只扣血閃光，不擊退也不打斷動作
  takeHit(amount, fromX, fromZ, force = false, soft = false) {
    if (!this.alive || (!force && !this.canBeHit)) return false;
    this.hp -= amount;
    this.updateHealthBar();
    if (soft && this.hp > 0) { this.flash(0xff6a1f); return true; }
    if (this.def.poise && this.hp > 0) { this.flash(0xffffff); return true; } // 重型敵人：打不斷也推不動
    this.position.y = 0;
    const dx = this.position.x - fromX;
    const dz = this.position.z - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    this.knockX = (dx / len) * KNOCKBACK_SPEED;
    this.knockZ = (dz / len) * KNOCKBACK_SPEED;
    this.flash(0xffffff);
    if (this.hp <= 0) {
      this.setState('dying');
      this.play('Death', { once: true, fade: 0.08 });
    } else {
      this.setState('stunned');
      this.play('Hit', { once: true, fade: 0.05 });
    }
    return true;
  }
}
