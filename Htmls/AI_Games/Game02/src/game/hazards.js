// 環境陷阱（沿用《騎士與骷髏》）：關卡 JSON 的 hazards 清單。英雄和敵人都會受傷，可以把怪物引過去。
// 塔防版：敵人被陷阱打到不會硬直、盔甲擋不住（mode burn）；騎士兵不會被陷阱打到。
// 類型：spikes 地刺、fire 火柱（定時）、mine 地雷（踩到才引爆）、arrows 牆上的箭（定時直線）。
// 每種都有預警，新類型在 TYPES 加一項：build 建外觀、update 每格更新、area 不放道具的範圍。
import * as THREE from 'three';

const WARN_COLOR = 0xff3b2f;
const ARROW_HIT = 0.5;
const SPIKE_SINK = -0.75;
const SPIKE_PEEK = -0.5;
const SPIKE_SPEED = 14;
const MINE_TRIGGER = 0.9;
const WALL_INSET = 0.9;
const LINE_HEIGHT = 0.06;
const ARROW_HEIGHT = 1;
const SIDES = {
  north: (a, W, D) => ({ x: a, z: -D + WALL_INSET, dx: 0, dz: 1 }),
  south: (a, W, D) => ({ x: a, z: D - WALL_INSET, dx: 0, dz: -1 }),
  west: (a, W, D) => ({ x: -W + WALL_INSET, z: a, dx: 1, dz: 0 }),
  east: (a, W, D) => ({ x: W - WALL_INSET, z: a, dx: -1, dz: 0 }),
};

const metal = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness: 0.45, roughness: 0.55, flatShading: true, ...extra });

// 定時陷阱共用節奏：平常 → 預警 warn 秒 → 作用 up 秒，一直循環
function advance(h, dt) {
  const { period, warn, up } = h.def;
  h.clock = (h.clock + dt) % period;
  const upAt = period - up;
  const phase = h.clock >= upAt ? 'up' : h.clock >= upAt - warn ? 'warn' : 'idle';
  if (phase === 'up' && h.phase !== 'up') h.hit.clear();
  h.started = phase !== h.phase;
  h.phase = phase;
}

// 作用中踩在範圍內的算一下；同一次作用同一隻敵人只算一次（玩家有受傷無敵時間）
function strike(game, h, inside) {
  const player = game.hero;
  if (player.alive && inside(player.position, player.radius * 0.5)) player.takeDamage(h.def.damage);
  for (const enemy of game.enemies) {
    if (h.hit.has(enemy) || !enemy.canBeHit || !inside(enemy.position, enemy.radius * 0.5)) continue;
    h.hit.add(enemy);
    game.hazardHit(enemy, h.def.enemyDamage ?? h.def.damage, h.def.at[0], h.def.at[1]);
  }
}

const TYPES = {
  spikes: {
    area: (h) => h.def.size * 1.45,
    danger: (h) => (h.phase === 'idle' ? null : { x: h.def.at[0], z: h.def.at[1], r: h.def.size * 1.45 }),
    build(h, group) {
      const { size, at: [x, z] } = h.def;
      const plateMat = metal(0x3a3d48, { emissive: WARN_COLOR, emissiveIntensity: 0 });
      const plate = new THREE.Mesh(new THREE.BoxGeometry(size * 2, 0.08, size * 2), plateMat);
      plate.position.set(x, 0.04, z);
      plate.receiveShadow = true;
      const count = Math.max(3, Math.round(size * 3.2));
      const cone = new THREE.ConeGeometry(0.15, 0.8, 5);
      const spikes = new THREE.InstancedMesh(cone, metal(0xc8ccd6), count * count);
      const matrix = new THREE.Matrix4();
      const step = (size * 2) / count;
      for (let i = 0; i < count * count; i++) {
        matrix.setPosition(-size + step * (0.5 + (i % count)), 0.4, -size + step * (0.5 + Math.floor(i / count)));
        spikes.setMatrixAt(i, matrix);
      }
      spikes.position.set(x, SPIKE_SINK, z);
      spikes.castShadow = true;
      group.add(plate, spikes);
      Object.assign(h, { plateMat, spikes });
    },
    update(h, dt, game, time) {
      advance(h, dt);
      const target = h.phase === 'up' ? 0 : h.phase === 'warn' ? SPIKE_PEEK : SPIKE_SINK; // 預警時刺尖先露出來
      h.spikes.position.y += (target - h.spikes.position.y) * Math.min(1, SPIKE_SPEED * dt);
      h.plateMat.emissiveIntensity = h.phase === 'warn' ? 0.3 + Math.sin(time * 26) * 0.25 : 0;
      if (h.started && h.phase === 'up') game.sfx.swing();
      if (h.phase !== 'up') return;
      const { size, at: [x, z] } = h.def;
      strike(game, h, (p, r) => Math.abs(p.x - x) <= size + r && Math.abs(p.z - z) <= size + r);
    },
  },

  fire: {
    area: (h) => h.def.radius,
    danger: (h) => (h.phase === 'idle' ? null : { x: h.def.at[0], z: h.def.at[1], r: h.def.radius }),
    build(h, group) {
      const { radius, at: [x, z] } = h.def;
      const ventMat = metal(0x2c2a2f, { emissive: 0xff5a1f, emissiveIntensity: 0.2 });
      const vent = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.08, 0.14, 12), ventMat);
      vent.position.set(x, 0.07, z);
      vent.receiveShadow = true;
      // 外焰加內焰，用加亮混色才像火，不像實心的錐子
      const glow = (r, h, color, opacity) => new THREE.Mesh(new THREE.CylinderGeometry(r * 0.25, r, h, 12, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      const outer = glow(radius, 2.6, 0xff5a1f, 0.6);
      const inner = glow(radius * 0.6, 1.9, 0xffd35a, 0.7);
      inner.position.y = -0.35;
      const flame = new THREE.Group();
      flame.add(outer, inner);
      flame.position.set(x, 1.3, z);
      flame.visible = false;
      group.add(vent, flame);
      Object.assign(h, { ventMat, flame });
    },
    update(h, dt, game, time) {
      advance(h, dt);
      const { radius, at: [x, z] } = h.def;
      h.ventMat.emissiveIntensity = h.phase === 'warn' ? 1.2 + Math.sin(time * 26) : 0.2;
      h.flame.visible = h.phase === 'up';
      if (h.phase === 'warn') game.fx.flame(x, 0.2, z, 1);
      if (h.started && h.phase === 'up') game.sfx.burn();
      if (h.phase !== 'up') return;
      h.flame.scale.set(1 + Math.sin(time * 31) * 0.08, 1 + Math.sin(time * 23) * 0.1, 1 + Math.sin(time * 31) * 0.08);
      game.fx.flame(x, 0.6, z, 3);
      strike(game, h, (p, r) => Math.hypot(p.x - x, p.z - z) <= radius + r);
    },
  },

  // 玩家或敵人踩到後，短暫倒數再爆炸，炸完過一段時間重新埋好
  mine: {
    area: (h) => h.def.radius,
    danger: (h) => (h.state === 'fuse' ? { x: h.def.at[0], z: h.def.at[1], r: h.def.radius } : null),
    build(h, group) {
      const { radius, at: [x, z] } = h.def;
      const body = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.18, 10), metal(0x4a4f3c));
      shell.position.y = 0.09;
      shell.castShadow = true;
      const lampMat = new THREE.MeshStandardMaterial({ color: 0x661111, emissive: 0xff2a1a, emissiveIntensity: 0.4 });
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), lampMat);
      lamp.position.y = 0.2;
      body.add(shell, lamp);
      body.position.set(x, 0, z);
      const ring = new THREE.Mesh(new THREE.CircleGeometry(radius, 36).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: WARN_COLOR, transparent: true, opacity: 0.3, depthWrite: false }));
      ring.position.set(x, LINE_HEIGHT, z);
      ring.visible = false;
      group.add(body, ring);
      Object.assign(h, { body, lampMat, ring });
    },
    reset(h) {
      h.state = 'armed';
      h.timer = 0;
      h.body.visible = true;
      h.ring.visible = false;
    },
    update(h, dt, game, time) {
      const { def } = h;
      const [x, z] = def.at;
      h.timer -= dt;
      if (h.state === 'armed') {
        h.lampMat.emissiveIntensity = 0.4 + (Math.sin(time * 3) + 1) * 0.5;
        const stepped = [...(game.hero.alive ? [game.hero] : []), ...game.enemies.filter((e) => e.canBeHit)].some((a) => Math.hypot(a.position.x - x, a.position.z - z) <= MINE_TRIGGER);
        if (!stepped) return;
        h.state = 'fuse';
        h.timer = def.fuse;
        h.beep = 0;
        h.ring.visible = true;
      } else if (h.state === 'fuse') {
        h.beep -= dt;
        h.lampMat.emissiveIntensity = Math.floor(time * 12) % 2 ? 4 : 0.2;
        h.ring.material.opacity = 0.2 + 0.4 * (1 - h.timer / def.fuse);
        if (h.beep <= 0) { h.beep = 0.2; game.sfx.tone(1200, 1200, 0.06, 'square', 0.07); }
        if (h.timer > 0) return;
        h.state = 'rearming';
        h.timer = def.rearm;
        h.ring.visible = false;
        h.body.visible = false;
        h.hit.clear();
        game.fx.blastRing(x, z, def.radius, '#ff7a3c');
        game.fx.burst(x, 0.5, z, 36, '#ffb35e', 6);
        game.fx.shake(0.45);
        game.sfx.blast();
        strike(game, h, (p, r) => Math.hypot(p.x - x, p.z - z) <= def.radius + r);
      } else if (h.timer <= 0) {
        h.state = 'armed';
        h.body.visible = true;
        game.fx.dust(x, 0.2, z, 8);
      }
    },
  },

  // 牆上的機關：地面亮紅線預警，然後射出一支直線飛行的箭
  arrows: {
    area: () => 0,
    danger: (h) => (h.phase === 'warn' || h.flying.length ? { line: h, width: 0.9 } : null),
    build(h, group, game) {
      const { side, at, range } = h.def;
      const { halfWidth: W, halfDepth: D } = game.level.arena;
      const start = SIDES[side](at, W, D);
      Object.assign(h, start);
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.5), metal(0x5a4632));
      box.position.set(start.x - start.dx * 0.5, ARROW_HEIGHT, start.z - start.dz * 0.5);
      box.rotation.y = Math.atan2(start.dx, start.dz);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.2, 12), new THREE.MeshBasicMaterial({ color: 0x120a06 }));
      hole.position.set(start.x - start.dx * 0.24, ARROW_HEIGHT, start.z - start.dz * 0.24);
      hole.rotation.y = box.rotation.y;
      const lineMat = new THREE.MeshBasicMaterial({ color: WARN_COLOR, transparent: true, opacity: 0, depthWrite: false });
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.8, range).rotateX(-Math.PI / 2), lineMat);
      line.position.set(start.x + (start.dx * range) / 2, LINE_HEIGHT, start.z + (start.dz * range) / 2);
      line.rotation.y = box.rotation.y;
      group.add(box, hole, line);
      Object.assign(h, { lineMat, group, flying: [] });
      h.geometry = new THREE.CylinderGeometry(0.03, 0.09, 1.3, 6).rotateX(Math.PI / 2);
      h.material = metal(0xd6b37a);
    },
    reset(h) {
      for (const a of h.flying ?? []) h.group.remove(a.mesh);
      h.flying = [];
    },
    fire(h) {
      const mesh = new THREE.Mesh(h.geometry, h.material);
      mesh.position.set(h.x, ARROW_HEIGHT, h.z);
      mesh.rotation.y = Math.atan2(h.dx, h.dz);
      h.group.add(mesh);
      h.flying.push({ mesh, traveled: 0 });
    },
    update(h, dt, game) {
      advance(h, dt);
      h.lineMat.opacity = h.phase === 'warn' ? 0.16 + 0.3 * ((h.clock % 0.3) / 0.3) : 0;
      if (h.started && h.phase === 'up') { TYPES.arrows.fire(h); game.sfx.swing(); }
      h.flying = h.flying.filter((arrow) => {
        const step = h.def.speed * dt;
        const p = arrow.mesh.position;
        p.x += h.dx * step;
        p.z += h.dz * step;
        arrow.traveled += step;
        const hit = TYPES.arrows.collide(h, p, game);
        if (!hit && arrow.traveled < h.def.range) return true;
        h.group.remove(arrow.mesh);
        return false;
      });
    },
    collide(h, p, game) {
      if (game.level.colliders.some((c) => Math.hypot(p.x - c.x, p.z - c.z) <= c.r)) return true;
      const player = game.hero;
      if (player.alive && Math.hypot(p.x - player.position.x, p.z - player.position.z) <= ARROW_HIT) { player.takeDamage(h.def.damage); return true; }
      for (const enemy of game.enemies) {
        if (!enemy.canBeHit || Math.hypot(p.x - enemy.position.x, p.z - enemy.position.z) > ARROW_HIT) continue;
        game.hazardHit(enemy, h.def.enemyDamage ?? h.def.damage, p.x - h.dx, p.z - h.dz);
        return true;
      }
      return false;
    },
  },
};

export class Hazards {
  constructor(game) {
    this.game = game;
    this.list = [];
  }

  // 換關時呼叫。外觀放在 level.group，換關會一起清掉
  load(defs = []) {
    const { game } = this;
    this.list = defs.map((def) => {
      if (!TYPES[def.type]) throw new Error(`關卡裡有未知的陷阱類型「${def.type}」`);
      const h = { def, type: TYPES[def.type], hit: new Set(), clock: def.offset ?? 0, phase: 'idle' };
      h.type.build(h, game.level.group, game);
      return h;
    });
    this.reset();
  }

  reset() {
    for (const h of this.list) {
      h.clock = h.def.offset ?? 0;
      h.phase = 'idle';
      h.hit.clear();
      h.type.reset?.(h);
    }
  }

  update(dt) {
    const { time } = this.game.level;
    for (const h of this.list) h.type.update(h, dt, this.game, time);
  }

  // 道具不要放在陷阱上
  blocks(x, z) {
    return this.list.some((h) => {
      const r = h.type.area(h);
      return r > 0 && Math.hypot(x - h.def.at[0], z - h.def.at[1]) < r + 0.9;
    });
  }

  // 目前危險的地方，給測試機器人閃躲用
  dangers() {
    return this.list.map((h) => h.type.danger(h)).filter(Boolean);
  }
}
