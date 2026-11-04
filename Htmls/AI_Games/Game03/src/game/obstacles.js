// 路上的陷阱與道具（關卡 JSON 的 obstacles）。
//   陷阱：spikes 地刺（定時升起）、log 滾木（左右來回滾）。每個人各自判斷：誰碰到作用中的陷阱誰就倒下（排在後面的也一樣），
//         英雄碰到則扣血（有短暫無敵）。沒畫出來的人（第 31 人以後）照比例跟著倒，見 game.trapMember
//   道具：coins 一排金幣、chest 寶箱、potion 藥水（紅＝加夥伴、黃＝護盾、紫＝炸掉前面的怪）。英雄碰到才撿得到
// 有護盾時陷阱不會扣人。新類型在 TYPES 加一項：build 建外觀、update 每格動畫、hit 穿過時。
import * as THREE from 'three';

const SPAWN_AHEAD = 70;
const KEEP_BEHIND = 12;
const PICK_RANGE = 1.3;
const metal = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.55, flatShading: true, ...extra });

// 匯入的道具模型大小不一，統一縮放到指定高度
function propModel(game, id, height) {
  const { scene } = game.assets.instantiate(id);
  const box = new THREE.Box3().setFromObject(scene);
  const h = box.max.y - box.min.y || 1;
  scene.scale.multiplyScalar(height / h);
  scene.position.y = -box.min.y * (height / h);
  const g = new THREE.Group();
  g.add(scene);
  return g;
}

// 隊伍左右範圍和 [a, b] 重疊幾成
function overlap(crowd, a, b) {
  const [left, right] = crowd.span; // 被路邊擠過的實際範圍
  const width = Math.max(0.8, right - left);
  return Math.max(0, Math.min(right, b) - Math.max(left, a)) / width;
}

const TYPES = {
  spikes: {
    build(o, game) {
      const { width = 4, x = 0 } = o.def;
      const plateMat = metal(0x3a3d48, { emissive: 0xff3b2f, emissiveIntensity: 0 });
      const plate = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, 1.6), plateMat);
      plate.position.y = 0.04;
      const cols = Math.round(width * 2.4), rows = 3;
      const spikes = new THREE.InstancedMesh(new THREE.ConeGeometry(0.13, 0.8, 5), metal(0xc8ccd6), cols * rows);
      const m = new THREE.Matrix4();
      for (let i = 0; i < cols * rows; i++) {
        m.setPosition(-width / 2 + (width / cols) * ((i % cols) + 0.5), 0.4, -0.55 + 0.55 * Math.floor(i / cols));
        spikes.setMatrixAt(i, m);
      }
      spikes.position.y = -0.75;
      o.group.add(plate, spikes);
      o.group.position.x = x;
      Object.assign(o, { plateMat, spikes });
    },
    // 循環：平常收著 → 預警（閃紅、刺尖露出）→ 升起 up 秒
    phase(o) {
      const { period = 3, up = 1.2, warn = 0.6, offset = 0 } = o.def;
      const t = (o.game.time + offset) % period;
      return t >= period - up ? 'up' : t >= period - up - warn ? 'warn' : 'idle';
    },
    update(o, dt) {
      const phase = TYPES.spikes.phase(o);
      const target = phase === 'up' ? 0 : phase === 'warn' ? -0.5 : -0.75;
      o.spikes.position.y += (target - o.spikes.position.y) * Math.min(1, 14 * dt);
      o.plateMat.emissiveIntensity = phase === 'warn' ? 0.5 + Math.sin(o.game.time * 26) * 0.3 : phase === 'up' ? 0.25 : 0;
    },
    // 作用中的範圍（世界座標 x0、x1、z0、z1）；不在作用中回傳 null
    area(o) {
      if (TYPES.spikes.phase(o) !== 'up') return null;
      const { width = 4, x = 0, d } = o.def;
      return { x0: x - width / 2, x1: x + width / 2, z0: -d - 0.85, z1: -d + 0.85 };
    },
    hit() {},
  },

  log: {
    build(o) {
      const len = o.def.length ?? 3.4;
      const wood = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, len, 12).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.9, flatShading: true }));
      wood.position.y = 0.45;
      wood.castShadow = true;
      const ends = new THREE.MeshStandardMaterial({ color: 0xc89b6a, flatShading: true });
      for (const s of [-1, 1]) {
        const end = new THREE.Mesh(new THREE.CircleGeometry(0.44, 12).rotateY(s * Math.PI / 2), ends);
        end.position.set(s * (len / 2 + 0.01), 0.45, 0);
        wood.add(end);
        end.position.set(s * (len / 2 + 0.01), 0, 0);
      }
      o.group.add(wood);
      o.wood = wood;
    },
    x(o) {
      const half = o.game.track.halfWidth - (o.def.length ?? 3.4) / 2;
      return Math.sin(o.game.time * (o.def.speed ?? 1.4) + (o.def.offset ?? 0)) * half;
    },
    update(o) {
      const x = TYPES.log.x(o);
      const dx = x - o.group.position.x;
      o.group.position.x = x;
      o.wood.rotation.x -= dx / 0.45; // 滾動
    },
    area(o) {
      const x = TYPES.log.x(o), len = o.def.length ?? 3.4, { d } = o.def;
      return { x0: x - len / 2, x1: x + len / 2, z0: -d - 0.55, z1: -d + 0.55 };
    },
    hit() {},
  },

  coins: {
    build(o, game) {
      const { count = 6, gap = 1.6, x = 0 } = o.def;
      o.coins = [];
      for (let i = 0; i < count; i++) {
        const c = propModel(game, '金幣', 0.7);
        c.position.set(x, 0.5, -i * gap);
        o.group.add(c);
        o.coins.push({ mesh: c, d: o.def.d + i * gap, taken: false });
      }
    },
    update(o, dt) {
      for (const c of o.coins) c.mesh.rotation.y += dt * 4;
      const { crowd } = o.game;
      for (const c of o.coins) {
        if (c.taken || crowd.d < c.d - 0.3 || crowd.d > c.d + 1) continue;
        if (Math.abs(crowd.x - (o.def.x ?? 0)) > PICK_RANGE) continue;
        c.taken = true;
        c.mesh.visible = false;
        o.game.addGold(o.def.value ?? 2, c.mesh.getWorldPosition(new THREE.Vector3()));
      }
    },
    hit() {},
    span: (o) => (o.def.count ?? 6) * (o.def.gap ?? 1.6),
  },

  chest: {
    build(o, game) {
      o.closed = propModel(game, '寶箱關閉', 1.1);
      o.open = propModel(game, '寶箱開啟', 1.2);
      o.open.visible = false;
      o.group.add(o.closed, o.open);
      o.group.position.x = o.def.x ?? 0;
      o.group.rotation.y = Math.PI;
    },
    update() {},
    hit(o) {
      if (Math.abs(o.game.crowd.x - (o.def.x ?? 0)) > PICK_RANGE + 0.3) return;
      o.closed.visible = false;
      o.open.visible = true;
      const [lo, hi] = o.def.gold ?? [20, 40];
      o.game.addGold(lo + Math.floor(Math.random() * (hi - lo + 1)), o.group.getWorldPosition(new THREE.Vector3()), true);
    },
  },

  potion: {
    build(o, game) {
      o.mesh = propModel(game, o.def.item, 0.9);
      o.group.add(o.mesh);
      o.group.position.x = o.def.x ?? 0;
    },
    update(o, dt) {
      if (!o.mesh.visible) return;
      o.mesh.rotation.y += dt * 2;
      o.mesh.position.y = 0.3 + Math.sin(o.game.time * 3) * 0.12;
    },
    hit(o) {
      if (Math.abs(o.game.crowd.x - (o.def.x ?? 0)) > PICK_RANGE) return;
      o.mesh.visible = false;
      o.game.usePotion(o.def.item, o.group.getWorldPosition(new THREE.Vector3()));
    },
  },
};

export class Obstacles {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.pending = [];
  }

  static modelIds() { return ['金幣', '寶箱關閉', '寶箱開啟', '紅藥水', '黃藥水', '紫藥水']; }

  load(defs = []) {
    this.clear();
    this.pending = [...defs].sort((a, b) => a.d - b.d);
  }

  push(def) { this.pending.push(def); }

  clear() {
    for (const o of this.list) this.game.scene.remove(o.group);
    this.list = [];
    this.pending = [];
  }

  update(dt) {
    const { game } = this;
    const { crowd } = game;
    while (this.pending.length && this.pending[0].d - crowd.d < SPAWN_AHEAD) {
      const def = this.pending.shift();
      const type = TYPES[def.type];
      if (!type) continue;
      const o = { def, type, game, group: new THREE.Group(), done: false };
      o.group.position.z = -def.d;
      type.build(o, game);
      game.scene.add(o.group);
      this.list.push(o);
    }
    for (const o of this.list) {
      o.type.update(o, dt);
      if (!o.done && crowd.d >= o.def.d) { o.done = true; o.type.hit(o); }
      // 陷阱：每個畫出來的人各自判斷有沒有碰到（每個陷阱同一個人只算一次）
      const area = o.type.area?.(o);
      if (area && crowd.d > o.def.d - 2 && crowd.d < o.def.d + crowd.depth + 3) {
        o.hitSet ??= new Set();
        for (const m of [...crowd.members]) {
          const a = m.actor;
          if (!a || o.hitSet.has(m)) continue;
          const p = a.position;
          if (p.x < area.x0 - 0.25 || p.x > area.x1 + 0.25 || p.z < area.z0 || p.z > area.z1) continue;
          o.hitSet.add(m);
          // 夥伴碰到不一定倒（trapKillChance）：整團撞上也不會一次全滅；英雄碰到一定扣血
          if (m.hero || Math.random() < (o.def.kill ?? game.settings.trapKillChance ?? 1)) game.trapMember(m, o.def);
          else a.flash(0xff6060);
        }
      }
    }
    this.list = this.list.filter((o) => {
      if (crowd.d - o.def.d - (o.type.span?.(o) ?? 0) < KEEP_BEHIND) return true;
      game.scene.remove(o.group);
      return false;
    });
  }
}
