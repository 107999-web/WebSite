// 打擊感：刀光、十字斬、骨粉粒子、火焰、傷害數字、畫面震動。
import * as THREE from 'three';

const MAX_PARTICLES = 400;
const FLAME_COLORS = [0xffd35a, 0xff8a2a, 0xff5a1f].map((c) => new THREE.Color(c));
const SLASH_LIFE = 0.16;
const RING_LIFE = 0.32;
const CROSS_LIFE = 0.14;
const TEXT_LIFE = 0.9;
const TEXT_RISE = 1.3;
const GRAVITY = 9;
const FLAME_LIFT = -3.5; // 負重力：火星往上飄

// 細長的刀痕：中間粗、兩端尖，平放在地面上方，長軸沿 Z
function makeBladeGeometry(length, width) {
  const h = length / 2, w = width / 2;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -h, w, 0, 0, 0, 0, h, -w, 0, 0], 3));
  geometry.setIndex([0, 2, 1, 0, 3, 2]);
  return geometry;
}

function makeGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d');
  const gradient = g.createRadialGradient(32, 40, 2, 32, 34, 30);
  gradient.addColorStop(0, 'rgba(255,130,30,.9)');
  gradient.addColorStop(0.45, 'rgba(255,80,10,.5)');
  gradient.addColorStop(1, 'rgba(255,40,0,0)');
  g.fillStyle = gradient;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function makeTextTexture(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 64;
  const g = canvas.getContext('2d');
  g.font = '900 52px "Microsoft JhengHei", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 8;
  g.strokeStyle = '#2a0d00';
  g.strokeText(text, 64, 34);
  g.fillStyle = color;
  g.fillText(text, 64, 34);
  return new THREE.CanvasTexture(canvas);
}

export class Fx {
  constructor(scene) {
    this.scene = scene;
    this.trauma = 0;
    this.offset = new THREE.Vector3();

    // 粒子用一個 Points 全部共用，用完的放到畫面外
    this.particles = Array.from({ length: MAX_PARTICLES }, () => ({ life: 0, max: 1, vx: 0, vy: 0, vz: 0 }));
    this.cursor = 0;
    this.positions = new Float32Array(MAX_PARTICLES * 3).fill(-999);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, depthWrite: false }));
    this.points.frustumCulled = false;
    scene.add(this.points);

    // 刀光：一片扇形，攻擊時出現後快速淡出。有分身時會同時出現好幾片
    this.slashes = [];
    this.slashGeometry = new Map();

    // 爆炸圈：畫出實際的爆炸範圍
    this.rings = [];
    this.ringGeometry = new THREE.RingGeometry(0.82, 1, 40);
    this.ringGeometry.rotateX(-Math.PI / 2);

    this.crossCuts = [];
    this.bladeGeometry = new Map();
    this.floatTexts = [];
    this.textTextures = new Map();
    this.flameMaterial = new THREE.SpriteMaterial({ map: makeGlowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 });
    const barMaterial = (color) => new THREE.SpriteMaterial({ color, depthTest: false, depthWrite: false, transparent: true });
    this.barMaterials = { back: barMaterial(0x14090a), fill: barMaterial(0xe5484d), ally: barMaterial(0x4ade80) }; // ally：騎士兵與英雄的綠色血條
    this.castGlows = [];
    this.delayed = []; // { time, run }：用畫面時間排程，暫停與打擊停頓都不影響節奏
  }

  // 出手前在發射點蓄力：光慢慢變大，時間到炸開
  castGlow(parent, position, { color, size }, duration) {
    const material = new THREE.SpriteMaterial({ map: this.flameMaterial.map, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    parent.add(sprite);
    this.castGlows.push({ sprite, color, size, time: 0, duration });
  }

  after(seconds, run) { this.delayed.push({ time: seconds, run }); }

  // 燃燒時掛在敵人身上的火光，共用材質
  makeFlameSprite() { return new THREE.Sprite(this.flameMaterial); }

  // 火星：從身上往上飄
  flame(x, y, z, count = 4) {
    for (let n = 0; n < count; n++) {
      const i = this.cursor;
      this.cursor = (i + 1) % MAX_PARTICLES;
      const p = this.particles[i];
      p.vx = (Math.random() - 0.5) * 1.1;
      p.vz = (Math.random() - 0.5) * 1.1;
      p.vy = 1 + Math.random() * 1.4;
      p.gravity = FLAME_LIFT;
      p.max = p.life = 0.3 + Math.random() * 0.35;
      this.positions.set([x + (Math.random() - 0.5) * 0.6, y + Math.random() * 0.9, z + (Math.random() - 0.5) * 0.6], i * 3);
      const c = FLAME_COLORS[Math.floor(Math.random() * FLAME_COLORS.length)];
      this.colors.set([c.r, c.g, c.b], i * 3);
    }
  }

  floatText(x, y, z, text, color = '#ff9a3d') {
    const key = `${text}:${color}`;
    if (!this.textTextures.has(key)) this.textTextures.set(key, makeTextTexture(text, color));
    const material = new THREE.SpriteMaterial({ map: this.textTextures.get(key), transparent: true, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x + (Math.random() - 0.5) * 0.4, y, z);
    sprite.scale.set(1.3, 0.65, 1);
    sprite.renderOrder = 20;
    this.scene.add(sprite);
    this.floatTexts.push({ sprite, life: TEXT_LIFE });
  }

  // 一道十字斬的刀痕。angle 是相對面向的角度，兩道交叉成 X
  crossCut(position, yaw, angle, reach, color) {
    const key = `${reach}`;
    if (!this.bladeGeometry.has(key)) this.bladeGeometry.set(key, makeBladeGeometry(reach * 1.35, reach * 0.3));
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const mesh = new THREE.Mesh(this.bladeGeometry.get(key), material);
    const ahead = reach * 0.62;
    mesh.position.set(position.x + Math.sin(yaw) * ahead, 0.95, position.z + Math.cos(yaw) * ahead);
    mesh.rotation.y = yaw + angle;
    this.scene.add(mesh);
    this.crossCuts.push({ mesh, life: CROSS_LIFE });
  }

  burst(x, y, z, count, color, speed = 3.5) {
    const c = new THREE.Color(color);
    for (let n = 0; n < count; n++) {
      const i = this.cursor;
      this.cursor = (i + 1) % MAX_PARTICLES;
      const p = this.particles[i];
      const angle = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      p.vx = Math.cos(angle) * s;
      p.vz = Math.sin(angle) * s;
      p.vy = speed * (0.4 + Math.random());
      p.gravity = GRAVITY;
      p.max = p.life = 0.35 + Math.random() * 0.4;
      this.positions.set([x, y, z], i * 3);
      this.colors.set([c.r, c.g, c.b], i * 3);
    }
  }

  dust(x, y, z, count) { this.burst(x, y, z, count, 0xb9ad93, 2.2); }
  sparks(x, y, z) { this.burst(x, y, z, 14, 0xffe08a, 5); }
  bones(x, y, z) { this.burst(x, y, z, 26, 0xf1ead4, 4.5); }

  getSlash() {
    let slash = this.slashes.find((s) => s.life <= 0);
    if (!slash) {
      const material = new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
      mesh.rotation.x = -Math.PI / 2;
      const pivot = new THREE.Group();
      pivot.add(mesh);
      this.scene.add(pivot);
      slash = { mesh, material, pivot, life: 0 };
      this.slashes.push(slash);
    }
    return slash;
  }

  slashAt(position, yaw, arcRadians, range) {
    const key = `${arcRadians}:${range}`;
    if (!this.slashGeometry.has(key)) this.slashGeometry.set(key, new THREE.RingGeometry(range * 0.35, range, 28, 1, 0, arcRadians));
    const slash = this.getSlash();
    slash.mesh.geometry = this.slashGeometry.get(key);
    slash.mesh.rotation.z = -Math.PI / 2 - arcRadians / 2; // 扇形中線對齊 pivot 的 +Z（騎士正前方）
    slash.pivot.position.set(position.x, 0.9, position.z);
    slash.pivot.rotation.y = yaw;
    slash.pivot.visible = true;
    slash.life = SLASH_LIFE;
  }

  blastRing(x, z, radius, color) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const mesh = new THREE.Mesh(this.ringGeometry, material);
    mesh.position.set(x, 0.12, z);
    mesh.scale.setScalar(radius);
    this.scene.add(mesh);
    this.rings.push({ mesh, radius, life: RING_LIFE });
  }

  shake(amount) { this.trauma = Math.min(1, this.trauma + amount); }

  update(dt) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vy -= p.gravity * dt;
      this.positions[i * 3] += p.vx * dt;
      this.positions[i * 3 + 1] += p.vy * dt;
      this.positions[i * 3 + 2] += p.vz * dt;
      if (p.life <= 0 || this.positions[i * 3 + 1] < 0.02) { p.life = 0; this.positions[i * 3 + 1] = -999; }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;

    for (const slash of this.slashes) {
      if (slash.life <= 0) continue;
      slash.life -= dt;
      slash.material.opacity = Math.max(0, slash.life / SLASH_LIFE) * 0.55;
      if (slash.life <= 0) slash.pivot.visible = false;
    }

    this.delayed = this.delayed.filter((job) => {
      job.time -= dt;
      if (job.time > 0) return true;
      job.run();
      return false;
    });

    this.castGlows = this.castGlows.filter((glow) => {
      glow.time += dt;
      const progress = Math.min(1, glow.time / glow.duration);
      glow.sprite.scale.setScalar(0.25 + glow.size * progress);
      glow.sprite.material.opacity = 0.35 + 0.65 * progress;
      this.flame(...glow.sprite.getWorldPosition(new THREE.Vector3()).toArray(), 1);
      if (progress < 1) return true;
      const { x, y, z } = glow.sprite.getWorldPosition(new THREE.Vector3());
      this.burst(x, y, z, 16, glow.color, 3.5);
      glow.sprite.removeFromParent();
      glow.sprite.material.dispose();
      return false;
    });

    this.crossCuts = this.crossCuts.filter((cut) => {
      cut.life -= dt;
      cut.mesh.material.opacity = Math.max(0, cut.life / CROSS_LIFE);
      if (cut.life > 0) return true;
      this.scene.remove(cut.mesh);
      cut.mesh.material.dispose();
      return false;
    });

    this.floatTexts = this.floatTexts.filter((text) => {
      text.life -= dt;
      text.sprite.position.y += TEXT_RISE * dt;
      text.sprite.material.opacity = Math.min(1, text.life / (TEXT_LIFE * 0.4));
      if (text.life > 0) return true;
      this.scene.remove(text.sprite);
      text.sprite.material.dispose();
      return false;
    });

    this.rings = this.rings.filter((ring) => {
      ring.life -= dt;
      const left = Math.max(0, ring.life / RING_LIFE);
      ring.mesh.scale.setScalar(ring.radius * (0.55 + 0.45 * (1 - left) ** 0.5));
      ring.mesh.material.opacity = left * 0.9;
      if (ring.life > 0) return true;
      this.scene.remove(ring.mesh);
      ring.mesh.material.dispose();
      return false;
    });

    this.trauma = Math.max(0, this.trauma - dt * 2.4);
    const s = this.trauma * this.trauma * 0.5;
    this.offset.set((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
}
