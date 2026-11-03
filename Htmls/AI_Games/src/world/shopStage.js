// 商店畫面的 3D 舞台：獨立場景。選單在畫面上方，舞台只露出下半部，所以用近景：
// 老闆站在櫃台後面，攤位用程式畫（放大也不會糊）。位置、大小、鏡頭都在 data/shop.json 的 stage。
// stage.building 有寫模型 id 時改用匯入的模型當背景建築。
import * as THREE from 'three';

const deg = THREE.MathUtils.degToRad;
const POTION_COLORS = [0xf87171, 0x4ade80, 0x60a5fa, 0xfacc15, 0xc084fc];

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...extra });
const MAT = {
  wood: mat(0x8a5a34),
  woodDark: mat(0x5a3820),
  woodLight: mat(0xb07a46),
  cloth: mat(0xc0392b),
  clothLight: mat(0xf5e6c8),
  gold: mat(0xf2c14e, { metalness: 0.6, roughness: 0.35 }),
  cork: mat(0x8a6239),
  ground: mat(0x3a3a4a, { flatShading: false, roughness: 1 }),
  stone: mat(0x55586a),
};

function box(w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// 藥水瓶：瓶身、瓶頸、木塞，自己發一點光才看得清楚
function potion(color, x, y, z, s = 1) {
  const glass = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.45, roughness: 0.25 });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), glass);
  body.position.y = 0.13;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.12, 10), glass);
  neck.position.y = 0.3;
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 8), MAT.cork);
  cork.position.y = 0.38;
  g.add(body, neck, cork);
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  return g;
}

function coinPile(x, y, z) {
  const g = new THREE.Group();
  const coin = new THREE.CylinderGeometry(0.09, 0.09, 0.025, 14);
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Mesh(coin, MAT.gold);
    const ring = i < 5 ? 0.12 : i < 8 ? 0.06 : 0;
    const a = i * 1.3;
    c.position.set(Math.cos(a) * ring, 0.015 + (i < 5 ? 0 : i < 8 ? 0.026 : 0.052), Math.sin(a) * ring);
    g.add(c);
  }
  g.position.set(x, y, z);
  return g;
}

// 紅白條紋遮雨棚，往前斜，前緣有波浪垂邊
function awning(width, depth, y, z) {
  const g = new THREE.Group();
  const stripes = 9;
  const w = width / stripes;
  for (let i = 0; i < stripes; i++) {
    const material = i % 2 ? MAT.clothLight : MAT.cloth;
    const strip = box(w + 0.01, 0.06, depth, material, -width / 2 + w * (i + 0.5), 0, 0);
    const flap = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, 0.05, 12, 1, false, 0, Math.PI), material);
    flap.rotation.set(Math.PI / 2, 0, 0);
    flap.position.set(-width / 2 + w * (i + 0.5), -0.02, depth / 2);
    g.add(strip, flap);
  }
  g.position.set(0, y, z);
  g.rotation.x = deg(14);
  return g;
}

function stall() {
  const g = new THREE.Group();
  // 櫃台：前板直條木紋、檯面、底座
  // 老闆是大頭比例，櫃台要矮，身體和手才露得出來
  const counterZ = 0.75;
  g.add(box(4.4, 0.55, 0.9, MAT.wood, 0, 0.275, counterZ));
  for (let i = 0; i < 11; i++) g.add(box(0.36, 0.5, 0.04, i % 2 ? MAT.woodLight : MAT.wood, -2 + i * 0.4, 0.27, counterZ + 0.46));
  g.add(box(4.6, 0.1, 1.05, MAT.woodDark, 0, 0.6, counterZ));
  // 櫃台上的商品，放在兩側不擋老闆
  const top = 0.65;
  [[-1.9, 0], [-1.6, 1], [-1.3, 2]].forEach(([x, c]) => g.add(potion(POTION_COLORS[c], x, top, counterZ, 0.85)));
  [[1.3, 3], [1.6, 4], [1.9, 0]].forEach(([x, c]) => g.add(potion(POTION_COLORS[c], x, top, counterZ, 0.85)));
  g.add(coinPile(0.85, top, counterZ + 0.1), coinPile(-0.85, top, counterZ + 0.15));
  // 後面的架子
  const shelfZ = -1.1;
  for (const x of [-2.1, 2.1]) g.add(box(0.14, 3.2, 0.4, MAT.woodDark, x, 1.6, shelfZ));
  for (const y of [1.2, 1.95, 2.7]) {
    g.add(box(4.3, 0.08, 0.45, MAT.wood, 0, y, shelfZ));
    for (let i = 0; i < 10; i++) {
      if ((i * 7 + y * 10) % 3 === 0) continue; // 架上空幾格比較自然
      g.add(potion(POTION_COLORS[(i + Math.round(y * 3)) % POTION_COLORS.length], -1.85 + i * 0.41, y + 0.04, shelfZ, 0.85));
    }
  }
  g.add(box(4.4, 3.3, 0.1, MAT.woodDark, 0, 1.65, shelfZ - 0.25));
  // 柱子與遮雨棚
  for (const x of [-2.3, 2.3]) {
    g.add(box(0.18, 3.5, 0.18, MAT.woodDark, x, 1.75, counterZ + 0.35));
    g.add(box(0.18, 3.7, 0.18, MAT.woodDark, x, 1.85, shelfZ - 0.1));
  }
  g.add(awning(5, 2.6, 3.55, -0.3));
  return g;
}

// 地面加一點石板，夜晚的街道感
function ground() {
  const g = new THREE.Group();
  const plane = new THREE.Mesh(new THREE.CircleGeometry(30, 40).rotateX(-Math.PI / 2), MAT.ground);
  plane.receiveShadow = true;
  g.add(plane);
  for (let x = -5; x <= 5; x++) {
    for (let z = 0; z < 4; z++) {
      const tile = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.04, 0.95), MAT.stone);
      tile.position.set(x + (z % 2) * 0.5, 0.02, 1.8 + z);
      tile.receiveShadow = true;
      g.add(tile);
    }
  }
  return g;
}

// 把模型縮放成指定高度，底部貼地
function fitHeight(object, height) {
  object.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(object);
  const scale = height / Math.max(b.max.y - b.min.y, 0.001);
  object.scale.multiplyScalar(scale);
  object.position.y -= b.min.y * scale;
}

export class ShopStage {
  constructor(game, config) {
    this.config = config;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x141a33);
    this.scene.fog = new THREE.Fog(0x141a33, 9, 24);
    this.scene.environment = game.scene.environment;
    this.scene.environmentIntensity = 0.5;
    const { fov, position, look } = config.camera;
    this.camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 80);
    this.camera.position.set(...position);
    this.camera.lookAt(...look);
    this.addLights();
    this.scene.add(ground());
    if (config.building && game.assets.loaded.has(config.building)) this.addBuilding(game);
    else this.scene.add(stall());
    this.addKeeper(game);
  }

  addLights() {
    this.scene.add(new THREE.HemisphereLight(0x9fb2ff, 0x3a2f24, 0.75));
    const moon = new THREE.DirectionalLight(0xc9d8ff, 1.1);
    moon.position.set(-4, 9, 7);
    moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    moon.shadow.bias = -0.0006;
    moon.shadow.normalBias = 0.03;
    Object.assign(moon.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 24 });
    this.scene.add(moon);
    // 攤位裡的燈籠光，照亮老闆的臉
    const lantern = new THREE.PointLight(0xffc27a, 9, 8, 1.6);
    lantern.position.set(0.6, 2.6, 2.2);
    this.scene.add(lantern);
  }

  addBuilding(game) {
    const { building, buildingHeight, buildingAt, buildingRotation } = this.config;
    const { scene } = game.assets.instantiate(building);
    fitHeight(scene, buildingHeight);
    const holder = new THREE.Group();
    holder.add(scene);
    holder.position.set(buildingAt[0], 0, buildingAt[1]);
    holder.rotation.y = deg(buildingRotation);
    this.scene.add(holder);
  }

  addKeeper(game) {
    const { keeper, keeperHeight, keeperAt, keeperRotation } = this.config;
    if (!game.assets.loaded.has(keeper)) return;
    const { scene, clips } = game.assets.instantiate(keeper);
    this.mixer = new THREE.AnimationMixer(scene);
    this.clips = new Map(clips.map((c) => [c.name, c]));
    this.idle = this.mixer.clipAction(this.clips.get('Idle'));
    this.idle.play();
    this.mixer.update(0.1);
    fitHeight(scene, keeperHeight);
    const holder = new THREE.Group();
    holder.add(scene);
    holder.position.set(keeperAt[0], 0, keeperAt[1]);
    holder.rotation.y = deg(keeperRotation);
    this.scene.add(holder);
    this.mixer.addEventListener('finished', () => this.backToIdle());
  }

  // 買東西時老闆揮手一次
  wave() {
    const clip = this.clips?.get('Wave');
    if (!clip) return;
    const action = this.mixer.clipAction(clip);
    action.reset().setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    this.idle.crossFadeTo(action, 0.15, false);
    this.waving = action;
  }

  backToIdle() {
    if (!this.waving) return;
    this.idle.reset().play();
    this.waving.crossFadeTo(this.idle, 0.25, false);
    this.waving = null;
  }

  // 選單蓋住畫面上半部，所以整個畫面往下移 shiftDown（畫面高度的比例），老闆才會在選單下面
  resize(aspect) {
    const h = 1000, w = h * aspect;
    this.camera.aspect = aspect;
    this.camera.setViewOffset(w, h, 0, -(this.config.camera.shiftDown ?? 0) * h, w, h);
  }

  update(dt) { this.mixer?.update(dt); }

  render(renderer) { renderer.render(this.scene, this.camera); }
}
