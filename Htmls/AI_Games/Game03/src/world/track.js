// 跑道：一條往前（-z）的石板路，兩旁是草地和場景物件，終點有棋盤格線和 Boss 廣場。
// 長度、寬度、主題都在關卡 JSON。d＝離起點幾公尺，世界座標 z = -d。
// 關卡有 stairs 時，Boss 廣場後面蓋一座加倍階梯；路邊物件只顯示隊伍附近的（路很長時也跑得動）。
import * as THREE from 'three';
import { PROP_BUILDERS } from './props.js';

function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// 一小段石板路的貼圖，沿著路重複
function roadTexture(colors) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const g = canvas.getContext('2d');
  const rand = seeded(7);
  g.fillStyle = colors.gap;
  g.fillRect(0, 0, 512, 512);
  const size = 64;
  for (let y = 0; y < 512; y += size) {
    const shift = (y / size) % 2 ? size / 2 : 0;
    for (let x = -size; x < 512; x += size) {
      const v = rand() * 26;
      g.fillStyle = `rgb(${colors.stone[0] + v},${colors.stone[1] + v},${colors.stone[2] + v})`;
      g.beginPath();
      g.roundRect(x + shift + 3, y + 3, size - 6, size - 6, 8);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// speck：斑點顏色 [r, g, b] 的基準（草地綠、礦坑泥土、古堡石板），每個值再隨機加 0～50
function grassTexture(base, speck = [40, 90, 40]) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d');
  const rand = seeded(11);
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2500; i++) {
    g.fillStyle = `rgba(${speck[0] + rand() * 50},${speck[1] + rand() * 50},${speck[2] + rand() * 50},0.45)`;
    g.fillRect(rand() * 256, rand() * 256, 2 + rand() * 4, 2 + rand() * 4);
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function finishLine(width) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 32;
  const g = canvas.getContext('2d');
  for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) {
    g.fillStyle = (i + j) % 2 ? '#111' : '#f5f5f5';
    g.fillRect(i * 16, j * 16, 16, 16);
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, 1.4), new THREE.MeshStandardMaterial({ map: t }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

export class Track {
  constructor(game, data) {
    this.game = game;
    this.data = data;
    this.group = new THREE.Group();
    this.flickers = [];
    const { length, width } = data;
    const total = length + 60;
    this.halfWidth = width / 2;
    const theme = data.theme;

    const grassMap = grassTexture(theme.grass, theme.speck);
    grassMap.repeat.set(20, total / 6);
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(120, total + 120), new THREE.MeshStandardMaterial({ map: grassMap, roughness: 1 }));
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(0, -0.02, -total / 2 + 30);
    grass.receiveShadow = true;

    const roadMap = roadTexture(theme.road);
    roadMap.repeat.set(width / 4, total / 4);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(width, total), new THREE.MeshStandardMaterial({ map: roadMap, roughness: 0.95 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -total / 2 + 20);
    road.receiveShadow = true;

    // 路邊的矮石牆
    const curbMat = new THREE.MeshStandardMaterial({ color: theme.curb, roughness: 0.9, flatShading: true });
    for (const side of [-1, 1]) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, total), curbMat);
      curb.position.set(side * (width / 2 + 0.25), 0.22, -total / 2 + 20);
      curb.castShadow = curb.receiveShadow = true;
      this.group.add(curb);
    }

    const finish = finishLine(width);
    finish.position.set(0, 0.02, -length);
    this.group.add(grass, road, finish);

    // Boss 廣場：終點後面一塊比較寬的石板地
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(width * 0.9, 40), new THREE.MeshStandardMaterial({ map: roadMap.clone(), roughness: 0.95 }));
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(0, 0.01, -length - width * 0.6);
    plaza.receiveShadow = true;
    this.group.add(plaza);

    this.scatter(data, total);
    if (data.stairs) this.buildStairs(data.stairs, length + width * 0.6 + width * 0.9 - 1);
    game.scene.add(this.group);
  }

  // 加倍階梯：每一階寫著倍率，越高越亮
  buildStairs(multipliers, startD) {
    const { width } = this.data;
    this.stairs = { multipliers, startD, depth: 1.6, height: 0.45 };
    multipliers.forEach((m, i) => {
      const color = new THREE.Color().setHSL(0.58 - i * 0.055, 0.75, 0.55);
      const h = (i + 1) * this.stairs.height;
      const step = new THREE.Mesh(new THREE.BoxGeometry(width, h, this.stairs.depth), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
      step.position.set(0, h / 2, -(startD + (i + 0.5) * this.stairs.depth));
      step.castShadow = step.receiveShadow = true;
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 96;
      const g = canvas.getContext('2d');
      g.font = '900 72px "Microsoft JhengHei", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 10; g.strokeStyle = '#1e293b'; g.strokeText(`×${m}`, 128, 50);
      g.fillStyle = '#fff'; g.fillText(`×${m}`, 128, 50);
      const tex = new THREE.CanvasTexture(canvas);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.98), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      label.position.set(0, h / 2 + 0.01, this.stairs.depth / 2 + 0.01);
      step.add(label);
      this.group.add(step);
    });
  }

  // 兩旁每隔幾公尺放一個場景物件
  scatter(data, total) {
    const rand = seeded(20261104);
    const kinds = data.theme.props;
    this.scenery = [];
    for (let d = -10; d < total - 20; d += data.theme.propEvery ?? 5) {
      for (const side of [-1, 1]) {
        if (rand() < 0.25) continue;
        const kind = kinds[Math.floor(rand() * kinds.length)];
        const builder = PROP_BUILDERS[kind.type];
        if (!builder) continue;
        const built = builder(kind);
        const x = side * (this.halfWidth + 2 + rand() * 9);
        built.object.position.set(x, 0, -d - rand() * 3);
        built.object.rotation.y = rand() * Math.PI * 2;
        built.object.scale.setScalar(kind.scale ? kind.scale[0] + rand() * (kind.scale[1] - kind.scale[0]) : 1);
        built.object.visible = false;
        this.group.add(built.object);
        this.scenery.push({ object: built.object, d });
        if (built.flame) this.flickers.push({ light: built.light, flame: built.flame, base: built.light.intensity, phase: rand() * 10 });
      }
    }
  }

  update(dt, time, crowdD = 0) {
    for (const s of this.scenery) s.object.visible = s.d > crowdD - 25 && s.d < crowdD + 110;
    for (const f of this.flickers) {
      const n = Math.sin(time * 11 + f.phase) * 0.5 + Math.sin(time * 23 + f.phase * 2) * 0.5;
      f.light.intensity = f.base * (1 + n * 0.14);
      f.flame.scale.y = 1 + n * 0.16;
    }
  }

  dispose() {
    this.game.scene.remove(this.group);
    this.group.traverse((o) => { o.geometry?.dispose(); o.material?.map?.dispose(); });
  }
}
