// 關卡場景：草地＋石板路（照 paths 畫，可以有好幾條）、外牆、城門（每條路的終點一座，重疊的只蓋一座）、台座、場景物件與碰撞。
import * as THREE from 'three';
import { PROP_BUILDERS, buildWalls } from './props.js';

function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const DEFAULT_GROUND = { base: '#2f4a38', speck: [0.7, 1.25, 0.75], stone: [0, 3, 12], stoneBase: 70 };
const STONE = new THREE.MeshStandardMaterial({ color: 0x7c8496, roughness: 0.95, flatShading: true });
const STONE_DARK = new THREE.MeshStandardMaterial({ color: 0x535a6c, roughness: 0.95, flatShading: true });
const ROOF = new THREE.MeshStandardMaterial({ color: 0x3b4f9c, roughness: 0.8, flatShading: true });
const WOOD = new THREE.MeshStandardMaterial({ color: 0x5a3d26, roughness: 1, flatShading: true });
const BANNER = new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.8, side: THREE.DoubleSide });

function paintGround({ halfWidth: W, halfDepth: D }, paths, groundTheme) {
  const { base, speck, stone, stoneBase, tiles } = { ...DEFAULT_GROUND, ...groundTheme };
  const scale = 40;
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(4096, W * 2 * scale);
  canvas.height = Math.min(4096, D * 2 * scale);
  const g = canvas.getContext('2d');
  const sx = canvas.width / (W * 2), sz = canvas.height / (D * 2);
  const px = (x) => (x + W) * sx, pz = (z) => (z + D) * sz;
  const rand = seeded(20261104);
  g.fillStyle = base;
  g.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 16000; i++) {
    const shade = 40 + rand() * 40;
    g.fillStyle = `rgba(${shade * speck[0]},${shade * speck[1]},${shade * speck[2]},0.5)`;
    g.fillRect(rand() * canvas.width, rand() * canvas.height, 2 + rand() * 7, 2 + rand() * 7);
  }
  const stoneAt = (x, z, w, v) => {
    g.fillStyle = `rgb(${v + stone[0]},${v + stone[1]},${v + stone[2]})`;
    g.beginPath();
    g.roundRect(px(x) - (w / 2) * sx, pz(z) - (w / 2) * sz, w * sx, w * sz, 5);
    g.fill();
  };
  if (tiles) { // 古堡：整片暗色石板地，路再用比較亮的石頭鋪
    for (let x = -W + 0.95; x < W; x += 1.9) for (let z = -D + 0.95; z < D; z += 1.9) stoneAt(x, z, 1.8, stoneBase - 22 + rand() * 18);
  }
  // 路的底色（泥土），再鋪石板。好幾條路重疊的地方會重複鋪，看起來一樣
  for (const path of paths) {
    g.strokeStyle = tiles ? '#1d1a20' : '#3b3328';
    g.lineCap = g.lineJoin = 'round';
    g.lineWidth = (path.width + 0.5) * sx;
    g.beginPath();
    path.samples.forEach((p, i) => (i ? g.lineTo(px(p.x), pz(p.z)) : g.moveTo(px(p.x), pz(p.z))));
    g.stroke();
  }
  for (const path of paths) {
    const rows = Math.ceil(path.width / 0.62);
    for (let s = 0; s < path.length; s += 0.62) {
      for (let r = 0; r < rows; r++) {
        if (rand() < 0.05) continue;
        const lane = -path.width / 2 + (r + 0.5) * (path.width / rows) + ((s / 0.62) % 2 < 1 ? 0.14 : -0.14);
        const { x, z } = path.at(s, lane);
        stoneAt(x, z, 0.54, stoneBase + rand() * 34);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// 城門：兩座圓塔夾著木門，面向路的來向
function buildCastle([x, z], facing) {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    const tower = new THREE.Group();
    tower.add(mesh(new THREE.CylinderGeometry(1.5, 1.7, 5.2, 10), STONE, 0, 2.6, 0));
    tower.add(mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.5, 10), STONE_DARK, 0, 5.4, 0));
    tower.add(mesh(new THREE.ConeGeometry(1.9, 2.6, 10), ROOF, 0, 6.95, 0));
    const flag = mesh(new THREE.PlaneGeometry(0.9, 0.55), BANNER, 0.45, 8.6, 0);
    tower.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 5), WOOD, 0, 8.4, 0), flag);
    tower.position.set(side * 3.2, 0, 0);
    g.add(tower);
  }
  g.add(mesh(new THREE.BoxGeometry(4.6, 4.2, 1.6), STONE_DARK, 0, 3.1, 0));
  g.add(mesh(new THREE.BoxGeometry(3, 2.6, 0.3), WOOD, 0, 1.3, 0.75));
  g.position.set(x, 0, z);
  g.rotation.y = facing;
  return g;
}

// 台座：圓形石台，塔蓋在上面。ring 是選取時發光的外圈
function buildPedestal() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(1.25, 1.4, 0.36, 12), STONE_DARK, 0, 0.18, 0));
  g.add(mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.1, 12), STONE, 0, 0.41, 0));
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.6, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf2c14e, transparent: true, opacity: 0.5, depthWrite: false }));
  ring.position.y = 0.05;
  g.add(ring);
  return { object: g, ring };
}

// 鎖住的台座（困難模式）：倒塌的石塊，不能蓋塔
function buildRubble() {
  const g = new THREE.Group();
  const rocks = [[-0.4, 0.3, 0.45], [0.35, -0.2, 0.38], [0.1, 0.45, 0.3], [-0.2, -0.45, 0.32]];
  for (const [x, z, r] of rocks) {
    const m = mesh(new THREE.DodecahedronGeometry(r, 0), STONE_DARK, x, 0.46 + r * 0.6, z);
    m.rotation.set(x * 3, z * 5, x * z * 7);
    g.add(m);
  }
  return g;
}

export const PEDESTAL_RADIUS = 1.35;
export const PEDESTAL_TOP = 0.46;

export class Level {
  constructor(game, data, paths) {
    this.data = data;
    this.arena = data.arena;
    this.paths = paths;
    this.group = new THREE.Group();
    this.colliders = [];
    this.flickers = [];
    this.orbs = [];
    this.game = game;
    this.time = 0;
    const { halfWidth: W, halfDepth: D } = data.arena;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, D * 2), new THREE.MeshStandardMaterial({ map: paintGround(data.arena, paths, data.theme?.ground), roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    const outside = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: data.theme?.outside ?? 0x16201f, roughness: 1 }));
    outside.rotation.x = -Math.PI / 2;
    outside.position.y = -0.02;
    this.ground = ground;
    this.group.add(ground, outside, buildWalls(data.arena, data.theme?.wall));

    // 城門：每條路的終點一座（同一個終點只蓋一座）。castles 可以指定位置，順序對應不同的終點
    this.castleSpots = [];
    for (const path of paths) {
      const end = path.at(path.length);
      if (this.castleSpots.some((c) => Math.hypot(c.endX - end.x, c.endZ - end.z) < 2)) continue;
      const at = data.castles?.[this.castleSpots.length]?.at ?? data.castle?.at ?? [end.x + end.dx * 2.1, end.z + end.dz * 2.1];
      this.group.add(buildCastle(at, Math.atan2(-end.dx, -end.dz)));
      this.castleSpots.push({ x: at[0], z: at[1], endX: end.x, endZ: end.z });
    }
    this.castleSpot = this.castleSpots[0];

    this.pedestals = data.pedestals.map(([x, z], index) => {
      const { object, ring } = buildPedestal();
      object.position.set(x, 0, z);
      this.group.add(object);
      this.colliders.push({ x, z, r: PEDESTAL_RADIUS });
      const rubble = buildRubble();
      rubble.visible = false;
      object.add(rubble);
      return { index, x, z, object, ring, rubble, tower: null, locked: false };
    });
    for (const prop of data.props ?? []) this.addProp(game, prop);
    game.scene.add(this.group);
  }

  // 換難度時呼叫：indices 這幾個台座鎖住
  setLocked(indices = []) {
    for (const p of this.pedestals) {
      p.locked = indices.includes(p.index);
      p.rubble.visible = p.locked;
    }
  }

  static modelIds(data) {
    return (data.props ?? []).filter((p) => p.type.startsWith('model:')).map((p) => p.type.slice(6));
  }

  dispose() {
    this.game.scene.remove(this.group);
    this.group.traverse((obj) => {
      obj.geometry?.dispose();
      obj.material?.map?.dispose();
    });
  }

  addProp(game, prop) {
    const [x, z] = prop.at;
    let built;
    if (prop.type.startsWith('model:')) {
      built = { object: game.assets.instantiate(prop.type.slice(6)).scene, collider: prop.collider ?? 0.8 };
    } else {
      const builder = PROP_BUILDERS[prop.type];
      if (!builder) throw new Error(`關卡裡有未知的物件類型「${prop.type}」`);
      built = builder(prop);
    }
    const scale = prop.scale ?? 1;
    built.object.position.set(x, 0, z);
    built.object.rotation.y = THREE.MathUtils.degToRad(prop.rot ?? 0);
    built.object.scale.setScalar(scale);
    this.group.add(built.object);
    if (built.collider > 0) this.colliders.push({ x, z, r: built.collider * scale });
    if (built.flame) this.flickers.push({ light: built.light, flame: built.flame, base: built.light.intensity, phase: Math.random() * 10 });
    if (built.orb) this.orbs.push(built.orb);
  }

  constrain(position, radius) {
    for (const c of this.colliders) {
      const dx = position.x - c.x, dz = position.z - c.z;
      const min = c.r + radius;
      const dist2 = dx * dx + dz * dz;
      if (dist2 >= min * min) continue;
      const dist = Math.sqrt(dist2) || 0.001;
      position.x = c.x + (dx / dist) * min;
      position.z = c.z + (dz / dist) * min;
    }
    const margin = 0.6 + radius;
    position.x = THREE.MathUtils.clamp(position.x, -this.arena.halfWidth + margin, this.arena.halfWidth - margin);
    position.z = THREE.MathUtils.clamp(position.z, -this.arena.halfDepth + margin, this.arena.halfDepth - margin);
  }

  update(dt) {
    this.time += dt;
    for (const f of this.flickers) {
      const n = Math.sin(this.time * 11 + f.phase) * 0.5 + Math.sin(this.time * 23 + f.phase * 2) * 0.5;
      f.light.intensity = f.base * (1 + n * 0.14);
      f.flame.scale.y = 1 + n * 0.16;
    }
    for (const orb of this.orbs) {
      orb.position.y = 3.4 + Math.sin(this.time * 1.6) * 0.14;
      orb.rotation.y += dt * 0.7;
    }
    for (const p of this.pedestals) {
      p.ring.material.opacity = p.selected ? 0.95 : p.tower || p.locked ? 0 : 0.35 + Math.sin(this.time * 3 + p.index) * 0.15;
    }
  }
}
