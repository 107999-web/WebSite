// 飛行道具：刀波、箭、火球共用。差別都在 spec（數值來自 characters.json 與 items.json）：
// { visual, model, modelScale, speed, range, width, color, pierce, blast }
// model：用已匯入的模型當外觀（正面朝 +Z，不是的話用 modelRotation 轉，度）；沒匯入時退回 visual 畫的形狀。
// modelScale 模型大小；modelGlow 自發光強度（火這類不受場景光影響的東西）。
// muzzle：發射點 { side 往角色左手邊, height 高度, ahead 往前 }，沒寫就從身體中央、0.9 公尺高。
// pierce：穿過敵人一路打到底；blast：命中或飛到底時爆炸的半徑；burn：被爆炸打到的敵人著火。
import * as THREE from 'three';

const FADE_DISTANCE = 3;
const BLAST_SHAKE = 0.3;

function makeVisuals() {
  // 月牙開口朝後、弧面朝前（+Z）
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
    this.prefabs = new Map(); // 模型 id → 共用的原型，每發只複製節點，幾何與材質共用
  }

  // 開場先建好並編譯，否則第一發會卡一下（發光材質要另外編譯著色器）
  prepare(def) {
    const { game } = this;
    const specs = [def.shot, def.shot && { ...def.shot, ...def.boost?.shot }].filter((s) => s?.model && game.assets.loaded.has(s.model));
    const fresh = specs.filter((s) => !this.prefabs.has(s.model));
    if (!fresh.length) return;
    for (const spec of fresh) {
      const prefab = this.makePrefab(spec);
      this.prefabs.set(spec.model, prefab);
      game.scene.add(prefab);
      prefab.traverse((o) => { if (o.material?.map) game.renderer.initTexture(o.material.map); });
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
    const prefab = new THREE.Group(); // 轉向放在內層，外層才能自由設定飛行方向
    prefab.add(scene);
    return prefab;
  }

  createObject(spec, visual) {
    const { assets } = this.game;
    if (spec.model && assets.loaded.has(spec.model)) {
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

  fire(position, yaw, spec, swing) {
    const visual = this.visuals[spec.visual];
    const mesh = this.createObject(spec, visual);
    const { side = 0, height = 0.9, ahead = 0 } = spec.muzzle ?? {};
    const forwardX = Math.sin(yaw), forwardZ = Math.cos(yaw);
    mesh.position.set(position.x + forwardX * ahead + forwardZ * side, height, position.z + forwardZ * ahead - forwardX * side);
    mesh.rotation.y = yaw;
    this.game.scene.add(mesh);
    this.list.push({ mesh, visual, spec, swing, dirX: Math.sin(yaw), dirZ: Math.cos(yaw), traveled: 0 });
  }

  remove(shot) {
    this.game.scene.remove(shot.mesh);
    shot.mesh.material?.dispose(); // 模型的材質是共用的，不能釋放
  }

  clear() {
    for (const shot of this.list) this.remove(shot);
    this.list = [];
  }

  // 爆炸範圍裡的敵人各算一下；同一次攻擊已經打過的不重複
  explode(shot) {
    const { game } = this;
    const { x, z } = shot.mesh.position;
    const { blast, color } = shot.spec;
    for (const chest of game.chests.targets) {
      if (Math.hypot(chest.position.x - x, chest.position.z - z) <= blast + chest.radius) game.chests.hit(chest, shot.swing);
    }
    for (const enemy of game.enemies) {
      if (shot.swing.has(enemy) || !enemy.canBeHit) continue;
      if (Math.hypot(enemy.position.x - x, enemy.position.z - z) > blast + enemy.radius) continue;
      shot.swing.add(enemy);
      const damage = game.playerDamage(enemy);
      if (!game.damageEnemy(enemy, damage, x, z)) continue;
      if (!shot.spec.burn) continue;
      game.showDamage(enemy, damage);
      enemy.ignite(shot.spec.burn);
    }
    game.fx.blastRing(x, z, blast, color);
    game.fx.burst(x, 0.8, z, 36, color, 5);
    game.fx.shake(BLAST_SHAKE);
    game.sfx.blast();
  }

  // 回傳 true 表示這發打完了
  collide(shot) {
    const { game } = this;
    const { mesh, spec, swing } = shot;
    for (const enemy of game.enemies) {
      if (swing.has(enemy) || !enemy.canBeHit) continue;
      const dist = Math.hypot(enemy.position.x - mesh.position.x, enemy.position.z - mesh.position.z);
      if (dist > spec.width + enemy.radius) continue;
      if (spec.blast && !spec.pierce) return true; // 爆炸在 update 統一處理；會穿透的飛到底才炸
      swing.add(enemy);
      const damage = game.playerDamage(enemy);
      const landed = game.damageEnemy(enemy, damage, mesh.position.x - shot.dirX, mesh.position.z - shot.dirZ);
      if (landed && spec.burn) { game.showDamage(enemy, damage); enemy.ignite(spec.burn); }
      game.sfx.hit();
      if (!spec.pierce) return true;
    }
    for (const chest of game.chests.targets) {
      if (swing.has(chest)) continue;
      if (Math.hypot(chest.position.x - mesh.position.x, chest.position.z - mesh.position.z) > spec.width + chest.radius) continue;
      if (spec.blast && !spec.pierce) return true;
      game.chests.hit(chest, swing);
      if (!spec.pierce) return true;
    }
    return false;
  }

  update(dt) {
    const { game } = this;
    this.list = this.list.filter((shot) => {
      const { mesh, spec, visual } = shot;
      const step = spec.speed * dt;
      mesh.position.x += shot.dirX * step;
      mesh.position.z += shot.dirZ * step;
      shot.traveled += step;
      if (visual.fades) mesh.material.opacity = 0.9 * Math.min(1, (spec.range - shot.traveled) / FADE_DISTANCE);
      game.fx.burst(mesh.position.x, 0.9, mesh.position.z, visual.trail, spec.color, 0.8);

      const hit = this.collide(shot);
      if (!hit && shot.traveled < spec.range) return true;
      if (spec.blast) this.explode(shot);
      this.remove(shot);
      return false;
    });
  }
}
