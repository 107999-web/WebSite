// 玩家：移動、攻擊、受傷。攻擊方式的差別都在 data/characters.json。
import * as THREE from 'three';
import { Actor } from './actor.js';

const INVULNERABLE_TIME = 1.0;
const AUTO_AIM_RANGE = 4;
const LUNGE_SPEED = 3;
const LUNGE_TIME = 0.16;
const ATTACK_RECOVERY = 0.72; // 攻擊動作播到這個比例就能接下一招

export class Player extends Actor {
  constructor(game, def, instance) {
    super(game, def, instance);
    this.state = 'idle';
    this.attackTime = 0;
    this.attackConnected = false;
    this.invulnerable = 0;
    this.play('Idle');
  }

  // 商店買的愛心上限每個角色分開算
  get maxHp() { return this.def.hp + this.game.shop.total('maxHp', this.def.id); }
  get hidden() { return this.game.skills.hidden > 0; }

  reset(x, z) {
    this.hp = this.maxHp;
    this.state = 'idle';
    this.invulnerable = 0;
    this.setOpacity(1);
    this.position.set(x, 0, z);
    this.root.rotation.y = Math.PI;
    this.model.visible = true;
    this.currentName = '';
    this.play('Idle');
  }

  update(dt, input) {
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    if (this.invulnerable > 0) this.model.visible = Math.floor(this.invulnerable * 14) % 2 === 0;
    else this.model.visible = true;

    if (this.state === 'dead') return;
    if (input.consumeSkill()) this.game.skills.use(); // 技能不打斷動作，攻擊中也能放
    if (input.consumePotion()) this.game.usePotion();
    if (this.state === 'attack') { this.updateAttack(dt, input); return; }
    if (input.consumeAttack()) { this.startAttack(); return; }

    const move = input.move;
    if (move.moving) {
      const boost = this.game.items.buff('speed')?.speedMultiplier ?? 1;
      this.position.x += move.x * this.def.moveSpeed * boost * dt;
      this.position.z += move.z * this.def.moveSpeed * boost * dt;
      this.faceToward(move.x, move.z, dt);
      this.play('Run', { speed: 1.05 * boost });
    } else {
      this.play('Idle');
    }
  }

  startAttack() {
    this.state = 'attack';
    this.attackTime = 0;
    this.attackConnected = false;
    this.game.attackMultiplier = this.game.skills.onAttack();
    this.aim();
    this.play('Attack', { once: true, fade: 0.06, speed: this.def.attackSpeed });
    this.game.clones.onPlayerAttack(this.def.attackSpeed);
    this.game.castEffects();
    this.game.sfx.swing();
  }

  // 自動轉向最近的敵人；打得遠的角色也要看得遠
  aim() {
    const { def, game } = this;
    const boost = game.items.buff('waveSlash');
    const waveRange = boost ? (def.boost?.wave?.range ?? boost.range) * 0.8 : 0;
    const range = Math.max(AUTO_AIM_RANGE, def.shot?.range ?? waveRange);
    const target = game.nearestEnemy(this.position, range) ?? game.chests.nearest(this.position, range); // 附近沒怪才瞄寶箱
    if (target) this.faceToward(target.position.x - this.position.x, target.position.z - this.position.z, Infinity);
  }

  updateAttack(dt, input) {
    this.attackTime += dt * this.def.attackSpeed;
    if (this.def.lunge !== false && this.attackTime < LUNGE_TIME) {
      const dir = new THREE.Vector3(Math.sin(this.root.rotation.y), 0, Math.cos(this.root.rotation.y));
      this.position.addScaledVector(dir, LUNGE_SPEED * dt);
    }
    if (!this.attackConnected && this.attackTime >= this.def.attackHitTime) {
      this.attackConnected = true;
      if (this.def.shot) this.aim(); // 出手前敵人可能走動了
      this.game.resolvePlayerAttack();
    }
    if (this.attackTime >= this.clipLength('Attack') * ATTACK_RECOVERY) {
      this.state = 'idle';
      if (input.consumeAttack()) this.startAttack();
    }
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.game.hud.setHearts(this.hp, this.maxHp);
  }

  takeDamage(amount) {
    if (this.state === 'dead' || this.invulnerable > 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.flash();
    this.game.sfx.hurt();
    this.game.fx.shake(0.35);
    this.game.hud.setHearts(this.hp, this.maxHp);
    if (this.hp <= 0 && this.game.tryRevive()) return; // 復活羽毛
    if (this.hp <= 0) {
      this.state = 'dead';
      this.model.visible = true;
      this.invulnerable = 0;
      this.play('Death', { once: true });
      this.game.onPlayerDead();
      return;
    }
    this.invulnerable = this.def.invulnerableTime ?? INVULNERABLE_TIME;
  }
}
