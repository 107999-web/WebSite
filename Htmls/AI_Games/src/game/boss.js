// Boss：多了招式循環、地面預警、狂暴與畫面上方的血條。招式與數值都在 characters.json 的 boss。
// 招式類型：slam 地面預警後砸下、charge 直線衝撞、summon 召喚小怪。新招式在 SKILLS 加一項。
import * as THREE from 'three';
import { Enemy } from './enemy.js';

const WARNING_COLOR = 0xff3b2f;
const WARNING_HEIGHT = 0.07;
const SLAM_COLOR = '#ff5a3c';
const SUMMON_SPREAD = 3;
const CHARGE_HIT_MARGIN = 0.2;
const BLOCKED_RATIO = 0.3;

const circleGeometry = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
const lineGeometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

const SKILLS = {
  slam: {
    start(boss, skill, player) {
      boss.targets = Array.from({ length: skill.count }, (_, i) => {
        // 第一圈一定對準玩家，其他的散在附近，逼玩家移動
        const angle = Math.random() * Math.PI * 2;
        const far = i === 0 ? 0 : skill.radius * (1 + Math.random());
        return { x: player.position.x + Math.cos(angle) * far, z: player.position.z + Math.sin(angle) * far };
      });
      for (const { x, z } of boss.targets) boss.warnCircle(x, z, skill.radius);
    },
    release(boss, skill, player) {
      const { fx, sfx } = boss.game;
      boss.play('Attack', { once: true, fade: 0.06 });
      for (const { x, z } of boss.targets) {
        fx.blastRing(x, z, skill.radius, SLAM_COLOR);
        fx.burst(x, 0.3, z, 22, SLAM_COLOR, 5);
        if (Math.hypot(player.position.x - x, player.position.z - z) <= skill.radius + player.radius) player.takeDamage(skill.damage);
      }
      fx.shake(0.5);
      sfx.blast();
      boss.recover(skill);
    },
  },

  charge: {
    start(boss, skill, player) {
      const dx = player.position.x - boss.position.x, dz = player.position.z - boss.position.z;
      const dist = Math.hypot(dx, dz) || 1;
      boss.chargeX = dx / dist;
      boss.chargeZ = dz / dist;
      boss.faceToward(dx, dz, Infinity);
      boss.warnLine(skill.distance, skill.width);
    },
    release(boss, skill) {
      boss.charged = 0;
      boss.chargeHit = false;
      boss.setState('charging');
      boss.play('Run', { speed: 2.2 });
      boss.game.sfx.swing();
    },
  },

  summon: {
    available(boss, skill) { return boss.minionCount() < skill.max; },
    start(boss) { boss.play('Wave'); },
    release(boss, skill) {
      const { fx, level } = boss.game;
      for (let i = 0; i < skill.count; i++) {
        const angle = (i / skill.count) * Math.PI * 2;
        const spot = new THREE.Vector3(boss.position.x + Math.cos(angle) * SUMMON_SPREAD, 0, boss.position.z + Math.sin(angle) * SUMMON_SPREAD);
        level.constrain(spot, 0.6);
        boss.game.spawnEnemy(skill.enemy, spot.x, spot.z);
        fx.burst(spot.x, 0.3, spot.z, 14, 0xb48cff, 3);
      }
      boss.recover(skill);
    },
  },
};

export class Boss extends Enemy {
  constructor(game, def, instance, x, z) {
    super(game, def, instance, x, z);
    this.plan = def.boss;
    this.skillIndex = 0;
    this.skillTimer = this.plan.skillEvery * 0.6;
    this.warnings = [];
    this.enraged = false;
    game.hud.showBoss(this.plan.name, 1);
  }

  get speed() { return super.speed * (this.enraged ? this.plan.enrage.pace : 1); }
  get pace() { return this.enraged ? this.plan.enrage.pace : 1; }

  minionCount() { return this.game.enemies.filter((e) => e !== this && e.alive).length; }

  // 血量都顯示在畫面上方，頭上不用再一條
  makeHealthBar() {}

  updateHealthBar() {
    const ratio = Math.max(0, this.hp / this.def.hp);
    this.game.hud.showBoss(this.plan.name, ratio);
    if (!this.enraged && this.hp > 0 && ratio <= this.plan.enrage.at) this.enrage();
  }

  enrage() {
    const { hud, fx, sfx } = this.game;
    this.enraged = true;
    for (const m of this.materials) m.color.setRGB(1, 0.62, 0.55);
    hud.banner('狂暴！', 1.4, '#ff5a3c');
    fx.shake(0.6);
    fx.burst(this.position.x, 1.5, this.position.z, 40, SLAM_COLOR, 6);
    sfx.blast();
  }

  warnMesh(geometry) {
    const material = new THREE.MeshBasicMaterial({ color: WARNING_COLOR, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    this.game.scene.add(mesh);
    this.warnings.push(mesh);
    return mesh;
  }

  warnCircle(x, z, radius) {
    const mesh = this.warnMesh(circleGeometry);
    mesh.position.set(x, WARNING_HEIGHT, z);
    mesh.scale.set(radius, 1, radius);
  }

  warnLine(length, width) {
    const mesh = this.warnMesh(lineGeometry);
    mesh.position.set(this.position.x + this.chargeX * length / 2, WARNING_HEIGHT, this.position.z + this.chargeZ * length / 2);
    mesh.rotation.y = Math.atan2(this.chargeX, this.chargeZ);
    mesh.scale.set(width, 1, length);
  }

  clearWarnings() {
    for (const mesh of this.warnings) {
      this.game.scene.remove(mesh);
      mesh.material.dispose();
    }
    this.warnings = [];
  }

  update(dt, player) {
    if (!this.alive && this.warnings.length) this.clearWarnings();
    super.update(dt, player);
  }

  // 走近玩家；近身時普通攻擊，時間到就放招
  update_chase(dt, player) {
    if (player.state !== 'dead' && !player.hidden) { // 找不到隱身的玩家就不放新招，已放出的招式照樣打得到
      this.skillTimer -= dt;
      if (this.skillTimer <= 0 && this.startSkill(player)) return;
    }
    super.update_chase(dt, player);
  }

  startSkill(player) {
    const { skills } = this.plan;
    for (let i = 0; i < skills.length; i++) {
      const skill = skills[this.skillIndex++ % skills.length];
      const action = SKILLS[skill.type];
      if (action.available && !action.available(this, skill)) continue;
      this.skill = skill;
      this.setState('windup');
      this.play('Idle');
      action.start(this, skill, player);
      return true;
    }
    this.skillTimer = this.plan.skillEvery;
    return false;
  }

  // 預警越接近爆發越亮，玩家看得出還剩多久
  update_windup(dt, player) {
    const windup = this.skill.windup / this.pace;
    const progress = Math.min(1, this.timer / windup);
    for (const mesh of this.warnings) mesh.material.opacity = 0.18 + 0.42 * progress;
    if (this.skill.type !== 'charge') this.faceToward(player.position.x - this.position.x, player.position.z - this.position.z, dt, 6);
    if (this.timer < windup) return;
    this.clearWarnings();
    SKILLS[this.skill.type].release(this, this.skill, player);
  }

  update_charging(dt, player) {
    const { skill } = this;
    // 上一格幾乎沒前進，代表撞到雕像、墓碑或牆，衝撞就此結束
    const moved = this.lastCharge ? Math.hypot(this.position.x - this.lastCharge.x, this.position.z - this.lastCharge.z) : Infinity;
    if (dt > 0 && moved < this.lastStep * BLOCKED_RATIO) { this.endCharge(skill); return; }
    this.lastCharge = this.position.clone();
    const step = skill.speed * this.pace * dt;
    this.lastStep = step;
    this.position.x += this.chargeX * step;
    this.position.z += this.chargeZ * step;
    this.charged += step;
    const dist = Math.hypot(player.position.x - this.position.x, player.position.z - this.position.z);
    if (!this.chargeHit && dist <= this.radius + player.radius + CHARGE_HIT_MARGIN) {
      this.chargeHit = true;
      player.takeDamage(skill.damage);
    }
    this.game.fx.dust(this.position.x, 0.2, this.position.z, 2);
    if (this.charged >= skill.distance) this.endCharge(skill);
  }

  endCharge(skill) {
    this.lastCharge = null;
    this.game.fx.shake(0.4);
    this.game.fx.dust(this.position.x, 0.5, this.position.z, 18);
    this.play('Idle');
    this.recover(skill);
  }

  recover(skill) {
    this.recoverTime = (skill.recover ?? 1) / this.pace;
    this.setState('recover');
  }

  update_recover() {
    if (this.timer < this.recoverTime) return;
    this.skillTimer = this.plan.skillEvery / this.pace;
    this.play('Idle');
    this.setState('chase');
  }

  destroy() {
    this.clearWarnings();
    super.destroy();
  }
}
