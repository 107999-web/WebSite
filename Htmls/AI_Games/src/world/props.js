// 場景物件產生器：關卡 JSON 的 "type" 對應這裡的函式。
// 之後有 3D 模型時，關卡寫 "type": "model:模型id" 就會改用模型（見 level.js），不必改這裡。
// 每個產生器回傳 { object, collider, light? }；collider 是碰撞半徑，0 代表可穿過。
import * as THREE from 'three';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, ...extra });
const MAT = {
  stone: mat(0x7c8496),
  stoneDark: mat(0x535a6c),
  stoneLight: mat(0xa2a8b5),
  wood: mat(0x3d2c24),
  iron: mat(0x2d2f38, { metalness: 0.5, roughness: 0.6 }),
  moss: mat(0x47613a),
  flame: new THREE.MeshBasicMaterial({ color: 0xffa93a }),
  flameCore: new THREE.MeshBasicMaterial({ color: 0xfff0a8 }),
  glowCap: new THREE.MeshStandardMaterial({ color: 0x36d6c0, emissive: 0x22c4ae, emissiveIntensity: 1.4, flatShading: true }),
  glowStem: new THREE.MeshStandardMaterial({ color: 0xcfeee4, emissive: 0x4da898, emissiveIntensity: 0.6, flatShading: true }),
  water: new THREE.MeshStandardMaterial({ color: 0x4f8fd0, emissive: 0x2a5ea8, emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.2 }),
  pine: mat(0x2c5a3a),
  pineLight: mat(0x3f7a48),
  plank: mat(0x7a5a3a),
  crystal: new THREE.MeshStandardMaterial({ color: 0xb79bff, emissive: 0x7a4fe0, emissiveIntensity: 1.1, flatShading: true, roughness: 0.3 }),
  lava: new THREE.MeshBasicMaterial({ color: 0xe8420c, toneMapped: false }),
};

function mesh(geometry, material, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

function group(...children) {
  const g = new THREE.Group();
  g.add(...children);
  return g;
}

function tombstone({ variant = 0 }) {
  const base = mesh(new THREE.BoxGeometry(1.25, 0.2, 0.7), MAT.stoneDark, 0, 0.1, 0);
  let body;
  if (variant === 0) {
    body = group(
      mesh(new THREE.BoxGeometry(0.95, 1.0, 0.24), MAT.stone, 0, 0.7, 0),
      mesh(new THREE.CylinderGeometry(0.475, 0.475, 0.24, 12, 1, false, 0, Math.PI), MAT.stone, 0, 1.2, 0).rotateX(Math.PI / 2).rotateY(Math.PI / 2),
    );
  } else if (variant === 1) {
    body = group(
      mesh(new THREE.BoxGeometry(0.26, 1.55, 0.24), MAT.stoneLight, 0, 0.95, 0),
      mesh(new THREE.BoxGeometry(0.95, 0.26, 0.24), MAT.stoneLight, 0, 1.2, 0),
    );
  } else {
    body = group(mesh(new THREE.BoxGeometry(0.85, 1.1, 0.26), MAT.stoneDark, 0, 0.72, 0).rotateZ(0.14));
  }
  const dirt = mesh(new THREE.BoxGeometry(1.0, 0.1, 1.6), MAT.moss, 0, 0.05, 1.1, false);
  return { object: group(base, body, dirt), collider: 0.65 };
}

function deadTree() {
  const trunk = mesh(new THREE.CylinderGeometry(0.2, 0.38, 2.6, 6), MAT.wood, 0, 1.3, 0);
  const branch = (x, y, z, rz, rx, len) => {
    const b = mesh(new THREE.CylinderGeometry(0.05, 0.14, len, 5), MAT.wood, x, y, z);
    b.rotation.set(rx, 0, rz);
    return b;
  };
  return {
    object: group(trunk,
      branch(0.55, 2.7, 0, -0.9, 0, 1.6), branch(-0.5, 3.0, 0.15, 0.8, 0.3, 1.5),
      branch(0.1, 3.3, -0.3, 0.1, -0.5, 1.5), branch(-0.5, 2.1, -0.2, 1.1, -0.2, 1.2),
      branch(1.05, 3.5, 0, -0.2, 0.3, 0.7)),
    collider: 0.6,
  };
}

function rock() {
  return { object: group(mesh(new THREE.DodecahedronGeometry(0.8, 0), MAT.stoneDark, 0, 0.45, 0).rotateY(0.6)), collider: 0.8 };
}

function torch() {
  const pole = mesh(new THREE.CylinderGeometry(0.08, 0.12, 2.4, 6), MAT.iron, 0, 1.2, 0);
  const bowl = mesh(new THREE.CylinderGeometry(0.3, 0.14, 0.26, 7), MAT.iron, 0, 2.45, 0);
  const flame = mesh(new THREE.ConeGeometry(0.24, 0.62, 7), MAT.flame, 0, 2.86, 0, false);
  const core = mesh(new THREE.ConeGeometry(0.12, 0.34, 6), MAT.flameCore, 0, 2.76, 0, false);
  const light = new THREE.PointLight(0xffa048, 15, 12, 1.8);
  light.position.set(0, 2.9, 0);
  return { object: group(pole, bowl, flame, core, light), collider: 0.35, light, flame };
}

function glowMushroom() {
  const m = (x, z, s) => group(
    mesh(new THREE.CylinderGeometry(0.06 * s, 0.09 * s, 0.34 * s, 6), MAT.glowStem, x, 0.17 * s, z, false),
    mesh(new THREE.SphereGeometry(0.24 * s, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), MAT.glowCap, x, 0.32 * s, z, false),
  );
  const light = new THREE.PointLight(0x35e0c8, 4, 5, 2);
  light.position.y = 0.6;
  return { object: group(m(0, 0, 1.3), m(0.34, 0.18, 0.8), m(-0.28, 0.26, 1), light), collider: 0 };
}

// 中央噴水池＋騎士雕像底座：場地的視覺重心，也讓玩家能繞著跑
function statue() {
  const rim = mesh(new THREE.CylinderGeometry(2.3, 2.5, 0.55, 12), MAT.stone, 0, 0.27, 0);
  const water = mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.08, 16), MAT.water, 0, 0.54, 0, false);
  const pedestal = mesh(new THREE.CylinderGeometry(0.75, 1.0, 1.1, 8), MAT.stoneLight, 0, 1.05, 0);
  const pillar = mesh(new THREE.CylinderGeometry(0.42, 0.55, 1.5, 8), MAT.stone, 0, 2.3, 0);
  const orb = mesh(new THREE.IcosahedronGeometry(0.5, 1), MAT.water, 0, 3.4, 0);
  const light = new THREE.PointLight(0x6fb4ff, 20, 13, 1.7);
  light.position.y = 3.4;
  return { object: group(rim, water, pedestal, pillar, orb, light), collider: 2.6, orb };
}

// 北邊的小陵墓：有門和階梯，暗示骷髏的來處
function crypt() {
  const body = mesh(new THREE.BoxGeometry(5, 3, 4), MAT.stoneDark, 0, 1.5, 0);
  const roofGeo = new THREE.CylinderGeometry(0.01, 3.9, 1.5, 4, 1);
  roofGeo.rotateY(Math.PI / 4);
  const roof = mesh(roofGeo, MAT.stone, 0, 3.75, 0);
  roof.scale.set(1, 1, 0.82);
  const door = mesh(new THREE.BoxGeometry(1.6, 2.1, 0.12), MAT.iron, 0, 1.05, 2.03);
  const stepA = mesh(new THREE.BoxGeometry(3, 0.2, 0.8), MAT.stone, 0, 0.1, 2.4);
  const col = (x) => mesh(new THREE.CylinderGeometry(0.22, 0.26, 3, 7), MAT.stoneLight, x, 1.5, 2.1);
  return { object: group(body, roof, door, stepA, col(-1.5), col(1.5)), collider: 3.3 };
}

function pineTree() {
  const trunk = mesh(new THREE.CylinderGeometry(0.2, 0.32, 1.4, 6), MAT.wood, 0, 0.7, 0);
  const layer = (y, r, h, material) => mesh(new THREE.ConeGeometry(r, h, 7), material, 0, y, 0);
  return { object: group(trunk, layer(1.9, 1.5, 1.8, MAT.pine), layer(2.9, 1.2, 1.6, MAT.pineLight), layer(3.8, 0.85, 1.4, MAT.pine)), collider: 0.65 };
}

function bush() {
  return {
    object: group(
      mesh(new THREE.IcosahedronGeometry(0.72, 0), MAT.pineLight, 0, 0.5, 0),
      mesh(new THREE.IcosahedronGeometry(0.5, 0), MAT.pine, 0.55, 0.38, 0.2),
      mesh(new THREE.IcosahedronGeometry(0.46, 0), MAT.pine, -0.5, 0.34, -0.15),
    ),
    collider: 0.75,
  };
}

function crate() {
  const box = mesh(new THREE.BoxGeometry(1.3, 1.3, 1.3), MAT.plank, 0, 0.65, 0);
  const band = (y) => mesh(new THREE.BoxGeometry(1.36, 0.14, 1.36), MAT.wood, 0, y, 0);
  return { object: group(box, band(0.2), band(1.1)), collider: 0.9 };
}

function minecart() {
  const body = mesh(new THREE.BoxGeometry(1.5, 0.8, 2.1), MAT.iron, 0, 0.75, 0);
  const ore = mesh(new THREE.DodecahedronGeometry(0.62, 0), MAT.stoneDark, 0, 1.22, 0);
  const wheel = (x, z) => mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.14, 10).rotateZ(Math.PI / 2), MAT.wood, x, 0.3, z);
  return { object: group(body, ore, wheel(-0.8, -0.7), wheel(0.8, -0.7), wheel(-0.8, 0.7), wheel(0.8, 0.7)), collider: 1.2 };
}

function crystal() {
  const shard = (x, z, h, r, tilt) => mesh(new THREE.ConeGeometry(r, h, 5), MAT.crystal, x, h / 2, z).rotateZ(tilt);
  const light = new THREE.PointLight(0xb07bff, 7, 8, 1.9);
  light.position.y = 1.4;
  return { object: group(shard(0, 0, 2.2, 0.42, 0), shard(0.42, 0.14, 1.3, 0.28, -0.3), shard(-0.4, 0.2, 1.1, 0.26, 0.34), light), collider: 0.7 };
}

function woodPost() {
  const post = mesh(new THREE.BoxGeometry(0.34, 3, 0.34), MAT.plank, 0, 1.5, 0);
  const beam = mesh(new THREE.BoxGeometry(1.8, 0.28, 0.36), MAT.wood, 0, 2.9, 0);
  return { object: group(post, beam), collider: 0.4 };
}

function pillar() {
  return {
    object: group(
      mesh(new THREE.CylinderGeometry(0.85, 1, 0.4, 8), MAT.stoneDark, 0, 0.2, 0),
      mesh(new THREE.CylinderGeometry(0.6, 0.68, 1.5, 8), MAT.stone, 0, 1.15, 0),
      mesh(new THREE.CylinderGeometry(0.92, 0.7, 0.3, 8), MAT.stoneDark, 0, 2.05, 0),
    ),
    collider: 1,
  };
}

function lavaPool({ radius = 2 }) {
  const rim = mesh(new THREE.CylinderGeometry(radius + 0.25, radius + 0.4, 0.26, 14), MAT.stoneDark, 0, 0.13, 0);
  const lava = mesh(new THREE.CylinderGeometry(radius, radius, 0.06, 18), MAT.lava, 0, 0.27, 0, false);
  const light = new THREE.PointLight(0xff6a2a, 10, radius * 5, 1.8);
  light.position.y = 1.2;
  return { object: group(rim, lava, light), collider: radius + 0.3 };
}

export const PROP_BUILDERS = { tombstone, deadTree, rock, torch, glowMushroom, statue, crypt, pineTree, bush, crate, minecart, crystal, woodPost, pillar, lavaPool };

// 外牆：依 arena 設定沿四邊排列，gates 留缺口。wall 是關卡主題的牆面顏色
export function buildWalls(arena, wall) {
  const wallA = wall ? mat(wall.a) : MAT.stone;
  const wallB = wall ? mat(wall.b) : MAT.stoneDark;
  const gatePost = wall ? mat(wall.gate) : MAT.stoneLight;
  const walls = new THREE.Group();
  const { halfWidth: W, halfDepth: D, gates = [], lowSides = [] } = arena;
  const unit = 2.4;
  const box = new THREE.BoxGeometry(unit, 1, 1);
  const crenel = new THREE.BoxGeometry(0.9, 0.55, 1.1);
  const sides = [
    { name: 'north', from: [-W, -D], dir: [1, 0], len: W * 2 },
    { name: 'south', from: [-W, D], dir: [1, 0], len: W * 2 },
    { name: 'west', from: [-W, -D], dir: [0, 1], len: D * 2 },
    { name: 'east', from: [W, -D], dir: [0, 1], len: D * 2 },
  ];
  for (const side of sides) {
    const low = lowSides.includes(side.name); // 靠鏡頭那一邊要矮，才不會擋到角色
    const height = low ? 0.7 : 3.2;
    const count = Math.round(side.len / unit);
    const step = side.len / count;
    const rot = side.dir[0] ? 0 : Math.PI / 2;
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) * step;
      const x = side.from[0] + side.dir[0] * t;
      const z = side.from[1] + side.dir[1] * t;
      const along = side.dir[0] ? x : z;
      if (gates.some((g) => g.side === side.name && Math.abs(along - g.at) < g.width / 2)) continue;
      const seg = mesh(box, i % 2 ? wallA : wallB, x, height / 2, z);
      seg.scale.set(step / unit + 0.01, height, 1);
      seg.rotation.y = rot;
      walls.add(seg);
      if (!low && i % 2 === 0) {
        const c = mesh(crenel, wallA, x, height + 0.27, z);
        c.rotation.y = rot;
        walls.add(c);
      }
    }
  }
  // 大門的柱子
  for (const g of gates) {
    for (const s of [-1, 1]) {
      const along = g.at + s * (g.width / 2 + 0.4);
      const x = g.side === 'west' ? -W : g.side === 'east' ? W : along;
      const z = g.side === 'north' ? -D : g.side === 'south' ? D : along;
      walls.add(mesh(new THREE.BoxGeometry(1.5, 4.6, 1.5), gatePost, x, 2.3, z));
    }
  }
  return walls;
}
