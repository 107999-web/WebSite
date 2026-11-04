// Boss：一樣沿路走，多了招式循環、地面預警、狂暴與畫面上方的血條。招式打的是塔、騎士兵和英雄。
// 招式類型：slam 砸地（打人、讓塔暈眩）、charge 沿路衝撞、summon 在身後召喚小怪。新招式在 SKILLS 加一項。
import * as THREE from 'three';
import { Enemy } from './enemy.js';

const WARNING_COLOR = 0xff3b2f;
const WARNING_HEIGHT = 0.07;
const SLAM_COLOR = '#ff5a3c';
const TARGET_RANGE = 9;

const circleGeometry = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2);

// 附近的目標：英雄、騎士兵、塔，越近越優先
function nearbyTargets(boss) {
  const { game } = boss;
  const list = [...game.blockers(), ...game.towers.list.map((t) => t.pedestal)];
  return list
    .map((t) => ({ x: t.position?.x ?? t.x, z: t.position?.z ?? t.z, d: Math.hypot((t.position?.x ?? t.x) - boss.position.x, (t.position?.z ?? t.z) - boss.position.z) }))
    .filter((t) => t.d <= TARGET_RANGE)
    .sort((a, b) => a.d - b.d);
}

const SKILLS = {
  slam: {
    start(boss, skill) {
      const near = nearbyTargets(boss);
      boss.targets = Array.from({ length: skill.count }, (_, i) => near[i] ?? { x: boss.position.x + (Math.random() - 0.5) * 6, z: boss.position.z + (Math.random() - 0.5) * 6 });
      for (const { x, z } of boss.targets) boss.warnCircle(x, z, skill.radius);
    },
    release(boss, skill) {
      const { fx, sfx, game } = boss;
      boss.play('Attack', { once: true, fade: 0.06 });
      for (const { x, z } of boss.targets) {
        fx.blastRing(x, z, skill.radius, SLAM_COLOR);
        fx.burst(x, 0.3, z, 22, SLAM_COLOR, 5);
        game.hurtArea(x, z, skill.radius, game.enemyDamage(skill.damage), boss);
        game.towers.stunArea(x, z, skill.radius, skill.stun ?? 0);
      }
      fx.shake(0.5);
      sfx.blast();
      boss.recover(skill);
    },
  },

  // 沿著路往前衝：路上的人被撞開受傷，路邊的塔暈眩
  charge: {
    start(boss, skill) {
      boss.release();
      for (let d = 1.5; d <= skill.distance; d += 1.5) {
        const p = boss.path.at(boss.s + d);
        boss.warnCircle(p.x, p.z, skill.width / 2);
      }
    },
    release(boss) {
      boss.charged = 0;
      boss.hitList = new Set();
      boss.setState('charging');
      boss.play('Run', { speed: 2.2 });
      boss.game.sfx.swing();
    },
  },

  summon: {
    available(boss, skill) { return boss.minionCount() < skill.max; },
    start(boss) { boss.play('Wave'); },
    release(boss, skill) {
      for (let i = 0; i < skill.count; i++) {
        const s = Math.max(0, boss.s - 2 - i * 1.2);
        const lane = (i % 2 ? 1 : -1) * 0.9;
        const minion = boss.game.spawnEnemy(skill.enemy, s, lane, boss.path);
        minion.summoned = true;
        boss.game.fx.burst(minion.position.x, 0.3, minion.position.z, 14, 0xb48cff, 3);
      }
      boss.recover(skill);
    },
  },
};

export class Boss extends Enemy {
  constructor(game, def, instance, s, lane, path) {
    super(game, def, instance, s, lane, path);
    // 困難模式多一招（hardSkills）
    this.plan = { ...def.boss, skills: [...def.boss.skills, ...(game.difficulty?.bossExtra ? def.boss.hardSkills ?? [] : [])] };
    this.skillIndex = 0;
    this.skillTimer = this.plan.skillEvery * 0.6;
    this.warnings = [];
    this.enraged = false;
    this.fx = game.fx;
    this.sfx = game.sfx;
    this.bar.visible = false;
    game.hud.showBoss(this.plan.name, 1);
  }

  get speed() { return super.speed * this.pace; }
  get pace() { return this.enraged ? this.plan.enrage.pace : 1; }

  minionCount() { return this.game.enemies.filter((e) => e !== this && e.alive && e.summoned).length; }

  updateHealthBar() {
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.game.hud.showBoss(this.plan.name, ratio);
    if (!this.enraged && this.hp > 0 && ratio <= this.plan.enrage.at) this.enrage();
  }

  enrage() {
    const { hud } = this.game;
    this.enraged = true;
    this.tint = [1, 0.62, 0.55];
    this.applyColor(1, 1, 1);
    hud.banner('狂暴！', 1.4, '#ff5a3c');
    this.fx.shake(0.6);
    this.fx.burst(this.position.x, 1.5, this.position.z, 40, SLAM_COLOR, 6);
    this.sfx.blast();
  }

  setSlow(slow) { // Boss 變慢不改顏色（狂暴的紅色要保留）
    if (!slow) { this.slow = null; return; }
    if (this.slow && this.slow.factor < slow.factor) { this.slow.remaining = Math.max(this.slow.remaining, slow.duration); return; }
    this.slow = { factor: slow.factor, remaining: slow.duration };
  }

  warnCircle(x, z, radius) {
    const material = new THREE.MeshBasicMaterial({ color: WARNING_COLOR, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(circleGeometry, material);
    mesh.position.set(x, WARNING_HEIGHT, z);
    mesh.scale.set(radius, 1, radius);
    this.game.scene.add(mesh);
    this.warnings.push(mesh);
  }

  clearWarnings() {
    for (const mesh of this.warnings) {
      this.game.scene.remove(mesh);
      mesh.material.dispose();
    }
    this.warnings = [];
  }

  update(dt) {
    if (!this.alive && this.warnings.length) this.clearWarnings();
    if (this.alive && (this.state === 'walk' || this.state === 'fight')) {
      this.skillTimer -= dt;
      if (this.skillTimer <= 0 && this.startSkill()) return;
    }
    super.update(dt);
  }

  startSkill() {
    const { skills } = this.plan;
    for (let i = 0; i < skills.length; i++) {
      const skill = skills[this.skillIndex++ % skills.length];
      const action = SKILLS[skill.type];
      if (action.available && !action.available(this, skill)) continue;
      this.skill = skill;
      this.setState('windup');
      this.play('Idle');
      action.start(this, skill);
      return true;
    }
    this.skillTimer = this.plan.skillEvery;
    return false;
  }

  update_windup() {
    const windup = this.skill.windup / this.pace;
    const progress = Math.min(1, this.timer / windup);
    for (const mesh of this.warnings) mesh.material.opacity = 0.18 + 0.42 * progress;
    if (this.timer < windup) return;
    this.clearWarnings();
    SKILLS[this.skill.type].release(this, this.skill);
  }

  update_charging(dt) {
    const { skill, game } = this;
    const step = skill.speed * this.pace * dt;
    this.s += step;
    this.charged += step;
    const p = this.path.at(this.s, 0);
    this.position.set(p.x, 0, p.z);
    this.faceToward(p.dx, p.dz, Infinity);
    for (const b of game.blockers()) {
      if (this.hitList.has(b)) continue;
      if (Math.hypot(b.position.x - p.x, b.position.z - p.z) > skill.width / 2 + b.radius) continue;
      this.hitList.add(b);
      b.takeDamage(game.enemyDamage(skill.damage), this);
    }
    game.towers.stunArea(p.x, p.z, skill.width / 2 + 1.6, skill.stun ?? 0);
    this.fx.dust(p.x, 0.2, p.z, 2);
    if (this.s >= this.path.length) { game.onLeak(this); return; }
    if (this.charged >= skill.distance) {
      this.fx.shake(0.4);
      this.fx.dust(p.x, 0.5, p.z, 18);
      this.play('Idle');
      this.recover(skill);
    }
  }

  recover(skill) {
    this.recoverTime = (skill.recover ?? 1) / this.pace;
    this.setState('recover');
  }

  update_recover() {
    if (this.timer < this.recoverTime) return;
    this.skillTimer = this.plan.skillEvery / this.pace;
    this.setState('walk');
  }

  // Boss 打不斷也推不動
  takeHit(amount, mode) { return super.takeHit(amount, mode === 'stagger' ? 'plain' : mode); }
  shove() { this.flash(0xffffff); }

  destroy() {
    this.clearWarnings();
    super.destroy();
  }
}
