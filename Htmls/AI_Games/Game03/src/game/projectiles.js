// 飛行道具：英雄的箭、火球、刀波，和塔的箭、火球共用。spec 來自 characters.json（英雄）與 towers.json（塔）：
// { visual, model, modelScale, modelRotation, modelGlow, speed, range, width, color, pierce, blast, burn, damage, bossDamage, slow }
// target：塔的箭會追著目標飛（追蹤），英雄的是直線。swing：同一次攻擊打過的敵人，不重複算。
import * as THREE from 'three';

const FADE_DISTANCE = 3;
const BLAST_SHAKE = 0.04; // 很多魔法師同時爆炸，震動要小
const HOMING_TURN = 10;

function makeVisuals() {
  const wave = new THREE.RingGeometry(0.75, 1.5, 24, 1, Math.PI * 0.14, Math.PI * 0.72);
  wave.rotateX(-Math.PI / 2);
  wave.rotateY(Math.PI);
  const arrow = new THREE.CylinderGeometry(0.02, 0.09, 1.5, 6);
  arrow.rotateX(Math.PI / 2);
  return {
    wave: { geometry: wave, blending: THREE.AdditiveBlending, scale: (width) => width, trail: 1, fades: true },
    arrow: { geometry: arrow, blending: THREE.NormalBlending, scale: () => 1, trail: 1, fades: false },
    fireball: { geometry: new THREE.SphereGeometry(1, 16, 12), blending: THREE.AdditiveBlending, scale: (width) => width, trail: 3, fades: false },
  };
}

export class Projectiles {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.visuals = makeVisuals();
    this.prefabs = new Map();
  }

  // 開場先建好並編譯，否則第一發會卡一下
  prepare(specs) {
    const { game } = this;
    const fresh = specs.filter((s) => s?.model && game.assets.loaded.has(s.model) && !this.prefabs.has(s.model));
    if (!fresh.length) return;
    for (const spec of fresh) {
      const prefab = this.makePrefab(spec);
      this.prefabs.set(spec.model, prefab);
      game.scene.add(prefab);
    }
    game.renderer.compile(game.scene, game.camera);
    for (const spec of fresh) game.scene.remove(this.prefabs.get(spec.model));
  }

  makePrefab(spec) {
    const { scene, materials } = this.game.assets.instantiate(spec.model);
    if (spec.modelRotation) scene.rotation.set(...spec.modelRotation.map(THREE.MathUtils.degToRad));
    if (spec.modelGlow) {
      for (const m of materials) { m.emissive.setHex(0xffffff); m.emissiveMap = m.map; m.emissiveIntensity = spec.modelGlow; }
    }
    const prefab = new THREE.Group();
    prefab.add(scene);
    return prefab;
  }

  createObject(spec, visual) {
    if (spec.model && this.game.assets.loaded.has(spec.model)) {
      if (!this.prefabs.has(spec.model)) this.prefabs.set(spec.model, this.makePrefab(spec));
      const object = this.prefabs.get(spec.model).clone();
      object.scale.setScalar(spec.modelScale ?? 1);
      return object;
    }
    const material = new THREE.MeshBasicMaterial({ color: spec.color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: visual.blending });
    const mesh = new THREE.Mesh(visual.geometry, material);
    mesh.scale.setScalar(visual.scale(spec.width));
    return mesh;
  }

  // from：{ x, y, z } 發射點；yaw 方向
  fire(from, yaw, spec, swing = new Set(), target = null) {
    const visual = this.visuals[spec.visual];
    const mesh = this.createObject(spec, visual);
    mesh.position.set(from.x, from.y, from.z);
    mesh.rotation.y = yaw;
    this.game.scene.add(mesh);
    this.list.push({ mesh, visual, spec, swing, target, dirX: Math.sin(yaw), dirZ: Math.cos(yaw), traveled: 0 });
  }

  remove(shot) {
    this.game.scene.remove(shot.mesh);
    shot.mesh.material?.dispose();
  }

  clear() {
    for (const shot of this.list) this.remove(shot);
    this.list = [];
  }

  hitEnemy(shot, enemy, x, z) {
    const { spec } = shot;
    shot.swing.add(enemy);
    const amount = enemy.def.boss ? spec.bossDamage ?? spec.damage : spec.damage;
    if (!this.game.damageEnemy(enemy, amount, spec.mode ?? (spec.blast || spec.burn ? 'magic' : 'plain'))) return;
    if (spec.burn) enemy.ignite(spec.burn);
    if (spec.slow) enemy.setSlow(spec.slow);
  }

  explode(shot) {
    const { game } = this;
    const { x, z } = shot.mesh.position;
    const { blast, color } = shot.spec;
    for (const enemy of game.enemies) {
      if (shot.swing.has(enemy) || !enemy.canBeHit) continue;
      if (Math.hypot(enemy.position.x - x, enemy.position.z - z) > blast + enemy.radius) continue;
      this.hitEnemy(shot, enemy, x, z);
    }
    game.fx.blastRing(x, z, blast, color);
    game.fx.burst(x, 0.8, z, 30, color, 5);
    game.fx.shake(BLAST_SHAKE);
    game.sfx.blast();
  }

  collide(shot) {
    const { game } = this;
    const { mesh, spec, swing } = shot;
    for (const enemy of game.enemies) {
      if (swing.has(enemy) || !enemy.canBeHit) continue;
      const dist = Math.hypot(enemy.position.x - mesh.position.x, enemy.position.z - mesh.position.z);
      if (dist > spec.width + enemy.radius) continue;
      if (spec.blast && !spec.pierce) return true;
      this.hitEnemy(shot, enemy, mesh.position.x, mesh.position.z);
      game.sfx.hit();
      if (!spec.pierce) return true;
    }
    return false;
  }

  // 追蹤：轉向目標，高度慢慢降到身體中段
  steer(shot, dt) {
    const { target, mesh } = shot;
    if (!target || !target.alive) { shot.target = null; return; }
    const dx = target.position.x - mesh.position.x, dz = target.position.z - mesh.position.z;
    const len = Math.hypot(dx, dz) || 1;
    const k = Math.min(1, HOMING_TURN * dt);
    shot.dirX += (dx / len - shot.dirX) * k;
    shot.dirZ += (dz / len - shot.dirZ) * k;
    const n = Math.hypot(shot.dirX, shot.dirZ) || 1;
    shot.dirX /= n; shot.dirZ /= n;
    mesh.rotation.y = Math.atan2(shot.dirX, shot.dirZ);
    mesh.position.y += (0.9 - mesh.position.y) * Math.min(1, dt * 4);
  }

  update(dt) {
    const { game } = this;
    this.list = this.list.filter((shot) => {
      const { mesh, spec, visual } = shot;
      this.steer(shot, dt);
      const step = spec.speed * dt;
      mesh.position.x += shot.dirX * step;
      mesh.position.z += shot.dirZ * step;
      shot.traveled += step;
      if (visual.fades) mesh.material.opacity = 0.9 * Math.min(1, (spec.range - shot.traveled) / FADE_DISTANCE);
      game.fx.burst(mesh.position.x, mesh.position.y, mesh.position.z, visual.trail, spec.color, 0.8);
      const hit = this.collide(shot);
      if (!hit && shot.traveled < spec.range) return true;
      if (spec.blast) this.explode(shot);
      this.remove(shot);
      return false;
    });
  }
}
