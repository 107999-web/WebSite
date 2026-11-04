// 隊伍：英雄跑最前面，夥伴排成一團跟在後面。人數可以很多，但畫面最多畫 maxDrawn 個（其他只算數字）。
// 每個夥伴照自己的職業攻擊（data/classes.json）：騎士扇形揮砍、盜賊快砍、弓箭手射箭、魔法師火球爆炸。
// 能力門改的是 mods（全隊或某個職業），受傷時從隊伍最後面的人開始倒下，英雄最後才倒。
import * as THREE from 'three';
import { Actor } from './actor.js';

const SLOT_GAP = 0.72;
const FOLLOW = 10;           // 畫出來的角色追上自己位置的速度
const DEATH_TIME = 1.1;
const CROSS = Math.PI / 4;
const MELEE_EXTRA = 2;
const HERO_GAP = 0.9;        // 英雄和後面隊伍的距離
const SHAPE_X = 0.78;        // 隊形左右縮一點、前後拉長，人多時才不會整條路都被隊伍佔滿
const SHAPE_Z = 1.25;
const EDGE = 0.45;           // 夥伴離路邊石牆至少多遠
const GUIDE_LENGTH = 9;      // 導引線長度       // 近戰多算的距離（敵人的半徑＋手長，Boss 的 attackRange 2.6＋半徑 1）

// 第 0 格是英雄：正前方、正中間（x＝隊伍的 x，穿門就是看這一點）。其他人排成一團在英雄後面
function makeSlots(count) {
  const pts = Array.from({ length: count - 1 }, (_, i) => {
    const r = SLOT_GAP * Math.sqrt(i + 0.5), a = i * 2.39996;
    return { x: Math.cos(a) * r * SHAPE_X, z: Math.sin(a) * r * SHAPE_Z };
  }).sort((a, b) => a.z - b.z);
  const front = pts[0]?.z ?? 0;
  return [{ x: 0, z: 0 }, ...pts.map((p) => ({ x: p.x, z: p.z - front + HERO_GAP }))]; // z ≥ 0：往後排
}

// 英雄腳下的金色圈＋往前的導引線：一看就知道會穿過哪一扇門
function makeMarker() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.8, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.95, depthWrite: false }));
  ring.position.y = 0.05;
  const line = new THREE.Mesh(new THREE.PlaneGeometry(0.34, GUIDE_LENGTH).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.85, depthWrite: false }));
  line.position.set(0, 0.04, -GUIDE_LENGTH / 2 - 0.8);
  const tip = new THREE.Mesh(new THREE.CircleGeometry(0.45, 3).rotateX(-Math.PI / 2).rotateY(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.8, depthWrite: false }));
  tip.position.set(0, 0.05, -GUIDE_LENGTH - 0.9);
  g.add(ring, line, tip);
  g.renderOrder = 2;
  return { group: g, ring };
}

function makeBadge() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 128;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false, depthWrite: false }));
  sprite.scale.set(2.6, 1.3, 1);
  sprite.renderOrder = 20;
  return { sprite, canvas };
}

export class Crowd {
  constructor(game) {
    this.game = game;
    this.members = [];
    this.pools = new Map();
    this.dying = [];
    this.slots = makeSlots(game.settings.maxDrawn);
    this.badge = makeBadge();
    game.scene.add(this.badge.sprite);
    this.marker = makeMarker();
    game.scene.add(this.marker.group);
    const { fx } = game;
    this.heroBar = new THREE.Group();
    const back = new THREE.Sprite(fx.barMaterials.back);
    back.scale.set(1.5, 0.2, 1);
    this.heroBarFill = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x4ade80, depthTest: false, depthWrite: false, transparent: true }));
    this.heroBarFill.scale.set(1.44, 0.13, 1);
    back.renderOrder = 18; this.heroBarFill.renderOrder = 19;
    this.heroBar.add(back, this.heroBarFill);
    game.scene.add(this.heroBar);
    // 護盾：半透明的金色泡泡罩住整隊
    this.bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
    this.bubble.visible = false;
    game.scene.add(this.bubble);
    this.x = 0;
    this.d = 0;
  }

  get count() { return this.members.length; }
  get alive() { return this.members.length > 0; }
  get hero() { return this.members.find((m) => m.hero); }

  // 隊伍目前的深度與中心（世界座標，往前是 -z）
  get depth() { return this.slots[Math.min(this.members.length, this.slots.length) - 1]?.z ?? 0; }
  get center() { return { x: this.x, z: -this.d + this.depth / 2 }; }
  get radius() { return Math.max(1, this.depth / 2 + 0.6); }
  // 隊伍左右的寬度（一半）：陷阱看擋到幾成
  get halfWidth() {
    const n = Math.min(this.members.length, this.slots.length);
    let w = 0;
    for (let i = 0; i < n; i++) w = Math.max(w, Math.abs(this.slots[i].x));
    return w + 0.4;
  }

  // 路上能站的範圍（扣掉路邊）
  get edge() { return this.game.track.halfWidth - EDGE; }
  clampX(x) { return Math.max(-this.edge, Math.min(this.edge, x)); }

  // 隊伍實際佔到的左右範圍 [lo, hi]：貼著路邊時被擠過去，範圍會變窄
  get span() {
    const w = Math.max(0.8, this.halfWidth);
    return [this.clampX(this.x - w), this.clampX(this.x + w)];
  }

  reset(heroType) {
    for (const m of this.members) this.release(m);
    for (const d of this.dying) this.giveBack(d.actor, d.type);
    this.dying = [];
    this.members = [];
    this.buffer = 0;
    this.mods = { damage: 0, rate: 1, range: 0, hp: 0, byClass: {} };
    this.x = 0;
    this.d = 0;
    this.y = 0;          // 終點階梯往上爬時的高度
    this.shield = 0;     // 黃藥水、騎士技能：幾秒內不會受傷
    this.frenzy = 0;     // 盜賊技能：幾秒內攻速加倍
    this.frenzyRate = 1;
    this.trapImmune = 0; // 忍者技能：幾秒內陷阱傷不到
    this.add(heroType, 1, true);
    this.heroHp = this.heroMax;
    this.heroGrace = 0;  // 英雄被陷阱打到後的無敵時間
    this.refreshBadge();
  }

  get heroMax() { const h = this.hero; return h ? this.stats(h).hp : 1; }

  // 英雄受傷（陷阱、或只剩英雄時被怪打）。回傳 true 表示英雄倒下
  hurtHero(amount, grace = 0) {
    if (this.shield > 0 || this.heroGrace > 0 || !this.hero) return false;
    this.heroHp -= amount;
    this.heroGrace = grace;
    this.hero.actor?.flash(0xff4040);
    if (this.heroHp > 0) return false;
    const m = this.hero;
    this.members = this.members.filter((x) => x !== m);
    this.kill(m);
    this.refreshBadge();
    return true;
  }

  // 被陷阱撞到的那一個人倒下（播倒下動作）
  removeMember(m) {
    const i = this.members.indexOf(m);
    if (i < 0) return;
    this.members.splice(i, 1);
    this.kill(m);
    this.refreshBadge();
  }

  kill(m) {
    if (!m.actor) return;
    m.actor.play('Death', { once: true, fade: 0.08 });
    this.dying.push({ actor: m.actor, type: m.type, time: 0 });
    m.actor = null;
  }

  // ---------- 數值 ----------
  classMod(type, key, fallback) { return this.mods.byClass[type]?.[key] ?? fallback; }

  stats(member) {
    const base = this.game.classes[member.type];
    const s = { ...base };
    s.damage = Math.max(1, base.damage + this.mods.damage + this.classMod(member.type, 'damage', 0));
    s.cooldown = base.cooldown / (this.mods.rate * this.classMod(member.type, 'rate', 1) * (this.frenzy > 0 ? this.frenzyRate : 1));
    s.range = base.range + (base.shot ? this.mods.range : 0);
    s.hp = Math.max(1, base.hp + this.mods.hp + this.classMod(member.type, 'hp', 0)) * (member.hero ? this.game.settings.heroHpMult : 1);
    s.shots = (base.shots ?? 1) + this.classMod(member.type, 'shots', 0);
    if (base.blast) s.blast = base.blast * this.classMod(member.type, 'blast', 1);
    return s;
  }

  // 能力門：effect { stat, add?, mult?, class? }
  applyAbility(effect) {
    const target = effect.class ? (this.mods.byClass[effect.class] ??= {}) : this.mods;
    const { stat } = effect;
    if (effect.add !== undefined) target[stat] = (target[stat] ?? 0) + effect.add;
    if (effect.mult !== undefined) target[stat] = (target[stat] ?? 1) * effect.mult;
  }

  // ---------- 人數 ----------
  add(type, n, hero = false) {
    for (let i = 0; i < n; i++) this.members.push({ type, hero, cooldown: Math.random() * 0.5, actor: null });
  }

  // 乘法、除法：照現在的組成比例複製或減少
  setCount(target) {
    const n = this.members.length;
    if (target > n) {
      const kinds = this.members.map((m) => m.type);
      for (let i = 0; i < target - n; i++) this.add(kinds[i % kinds.length], 1);
    } else if (target < n) {
      this.remove(n - target, false);
    }
  }

  // 從最後面開始移除；英雄最後才走。animate：被打倒（播倒下動作）或被門扣掉（直接消失）
  remove(n, animate = true) {
    for (let i = 0; i < n && this.members.length; i++) {
      let idx = this.members.length - 1;
      if (this.members[idx].hero && this.members.length > 1) idx -= 1;
      const [m] = this.members.splice(idx, 1);
      if (m.actor && animate) {
        m.actor.play('Death', { once: true, fade: 0.08 });
        this.dying.push({ actor: m.actor, type: m.type, time: 0 });
        m.actor = null;
      } else {
        this.release(m);
      }
    }
    this.refreshBadge();
  }

  applyGate(option) {
    if (option.kind === 'ability') { this.applyAbility(option.effect); return; }
    const n = this.members.length;
    if (option.result > n && option.type) this.add(option.type, option.result - n);
    else this.setCount(option.result);
    this.refreshBadge();
  }

  // 敵人的傷害累積起來，夠打倒最後一個人時就倒一個
  takeDamage(amount) {
    if (!this.members.length || this.shield > 0) return;
    if (this.members.length === 1) { this.hurtHero(amount); return; } // 只剩英雄：扣英雄的血
    this.buffer += amount;
    let last = this.members[this.members.length - 1];
    while (last && !last.hero && this.buffer >= this.stats(last).hp) {
      this.buffer -= this.stats(last).hp;
      this.remove(1);
      last = this.members[this.members.length - 1];
    }
    if (this.members.length <= 1) { this.hurtHero(this.buffer); this.buffer = 0; } // 剩下的傷害轉給英雄
  }

  // ---------- 畫面 ----------
  take(type) {
    const pool = this.pools.get(type) ?? [];
    this.pools.set(type, pool);
    const { game } = this;
    const def = game.characters[type];
    const actor = pool.pop() ?? new Actor(game, { ...def, scale: def.scale * game.settings.unitScale }, game.assets.instantiate(def.model));
    actor.root.visible = true;
    actor.setOpacity(1);
    actor.currentName = '';
    actor.play('Run');
    return actor;
  }

  giveBack(actor, type) {
    actor.root.visible = false;
    this.pools.get(type).push(actor);
  }

  release(m) {
    if (!m.actor) return;
    this.giveBack(m.actor, m.type);
    m.actor = null;
  }

  // 前 maxDrawn 個有模型，其他的沒有；英雄永遠在第一格
  assignActors() {
    const max = this.slots.length;
    this.members.sort((a, b) => (b.hero ? 1 : 0) - (a.hero ? 1 : 0));
    this.members.forEach((m, i) => {
      if (i < max && !m.actor) {
        m.actor = this.take(m.type);
        const s = this.slots[i];
        m.actor.position.set(this.x + s.x, 0, -this.d + s.z);
        m.actor.root.rotation.y = Math.PI;
      } else if (i >= max && m.actor) {
        this.release(m);
      }
    });
  }

  refreshBadge() {
    const { canvas, sprite } = this.badge;
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, 256, 128);
    g.font = '900 84px "Microsoft JhengHei", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 14;
    g.strokeStyle = '#1e3a8a';
    const text = String(this.members.length);
    g.strokeText(text, 128, 66);
    g.fillStyle = '#ffffff';
    g.fillText(text, 128, 66);
    sprite.material.map.needsUpdate = true;
  }

  // moving：有沒有在往前跑；enemiesNear：附近有沒有敵人（有就停下來打）
  update(dt, moving) {
    this.assignActors();
    const max = this.slots.length;
    for (let i = 0; i < Math.min(max, this.members.length); i++) {
      const { actor } = this.members[i];
      const s = this.slots[i];
      const tx = this.clampX(this.x + s.x), tz = -this.d + s.z; // 貼著路邊時被擠住，不會穿出路外
      actor.position.x += (tx - actor.position.x) * Math.min(1, FOLLOW * dt);
      actor.position.y += (this.y - actor.position.y) * Math.min(1, FOLLOW * dt);
      actor.position.z += (tz - actor.position.z) * Math.min(1, FOLLOW * dt);
      if (actor.attackUntil > 0) actor.attackUntil -= dt;
      else {
        actor.faceToward(0, -1, dt, 8);
        actor.play(moving ? 'Run' : 'Idle', { speed: moving ? 1.1 : 1 });
      }
      actor.updateVisual(dt);
    }
    this.dying = this.dying.filter((d) => {
      d.time += dt;
      d.actor.updateVisual(dt);
      if (d.time > DEATH_TIME * 0.6) d.actor.setOpacity(Math.max(0, 1 - (d.time - DEATH_TIME * 0.6) / (DEATH_TIME * 0.4)));
      if (d.time < DEATH_TIME) return true;
      this.giveBack(d.actor, d.type);
      return false;
    });
    const playing = this.game.state === 'playing' || this.game.state === 'paused';
    this.marker.group.visible = playing && this.members.length > 0;
    this.marker.group.position.set(this.x, this.y, -this.d);
    if (this.heroGrace > 0) this.heroGrace -= dt;
    const heroActor = this.hero?.actor;
    this.heroBar.visible = playing && Boolean(heroActor);
    if (heroActor) {
      const ratio = Math.max(0.001, this.heroHp / this.heroMax);
      this.heroBar.position.set(heroActor.position.x, heroActor.position.y + 2.15 * (this.game.characters[this.hero.type]?.scale ?? 1), heroActor.position.z);
      this.heroBarFill.scale.set(1.44 * ratio, 0.13, 1);
      this.heroBarFill.center.set(0.5 / ratio, 0.5);
      this.heroBarFill.material.color.setHex(ratio > 0.5 ? 0x4ade80 : ratio > 0.25 ? 0xfacc15 : 0xef4444);
      if (this.heroGrace > 0) heroActor.model.visible = Math.floor(this.heroGrace * 14) % 2 === 0;
      else heroActor.model.visible = true;
    }
    if (this.shield > 0) this.shield -= dt;
    if (this.frenzy > 0) this.frenzy -= dt;
    if (this.trapImmune > 0) this.trapImmune -= dt;
    this.bubble.visible = this.shield > 0 && this.members.length > 0;
    if (this.bubble.visible) {
      const c = this.center;
      this.bubble.position.set(c.x, this.y, c.z);
      this.bubble.scale.setScalar(this.radius + 0.6);
      this.bubble.material.opacity = 0.18 + Math.sin(this.game.clock.elapsedTime * 8) * 0.06 + (this.shield < 1.5 ? Math.sin(this.game.clock.elapsedTime * 30) * 0.08 : 0);
    }
    this.marker.ring.scale.setScalar(1 + Math.sin(this.game.clock.elapsedTime * 6) * 0.08);
    const top = this.game.characters[this.hero?.type]?.scale ?? 1;
    this.badge.sprite.position.set(this.x, this.y + 2.6 * top + 0.6, -this.d - 0.4);
    this.badge.sprite.visible = this.members.length > 0 && (this.game.state === 'playing' || this.game.state === 'ending' || this.game.state === 'paused');
  }

  // ---------- 戰鬥 ----------
  combat(dt) {
    const { game } = this;
    const c = this.center;
    for (const m of this.members) {
      m.cooldown -= dt;
      if (m.cooldown > 0) continue;
      const s = this.stats(m);
      // 近戰要算上對方的體型與手長：Boss 很大，站在近戰打不到的地方就能打人
      const reach = s.shot ? s.range + this.radius * 0.5 : s.range + this.radius + MELEE_EXTRA;
      const target = game.nearestEnemy(c, reach);
      if (!target) { m.cooldown = 0.1; continue; }
      m.cooldown = s.cooldown * (0.9 + Math.random() * 0.2);
      this.attack(m, s, target);
    }
  }

  attack(m, s, target) {
    const { game } = this;
    const { actor } = m;
    if (actor) {
      actor.faceToward(target.position.x - actor.position.x, target.position.z - actor.position.z, Infinity);
      const clip = actor.clipLength('Attack') || 1;
      const speed = Math.max(1, clip / Math.max(0.3, s.cooldown));
      actor.play('Attack', { once: true, fade: 0.05, speed });
      actor.attackUntil = clip / speed;
    }
    if (s.shot) {
      const targets = s.shots > 1 ? game.nearestEnemies(target.position, s.shots, s.range + this.radius) : [target];
      for (const t of targets) {
        if (actor) { // 畫出來的：真的射出箭或火球，打中才算
          const spec = { ...game.characters[m.type].shot, ...s.shotSpec, damage: s.damage, bossDamage: s.damage, blast: s.blast, burn: s.burn, range: 40 };
          const from = { x: actor.position.x, y: 1.1, z: actor.position.z - 0.4 };
          game.projectiles.fire(from, Math.atan2(t.position.x - from.x, t.position.z - from.z), spec, new Set(), t);
        } else { // 沒畫出來的：直接算傷害
          if (s.blast) game.blast(t.position, s.blast, s.damage, s.burn);
          else game.damageEnemy(t, s.damage);
        }
      }
      return;
    }
    // 近戰：騎士扇形打到旁邊的（最多 cleave 隻），盜賊一刀兩道
    const hits = [target, ...(s.cleave ? game.nearestEnemies(target.position, s.cleave + 1, 1.8).filter((e) => e !== target).slice(0, s.cleave) : [])];
    for (const e of hits) game.damageEnemy(e, s.damage);
    if (actor) {
      const yaw = actor.root.rotation.y;
      if (s.slash === 'cross') {
        game.fx.crossCut(actor.position.clone(), yaw, CROSS, 2, 0xd9c8ff);
        game.fx.after(0.08, () => game.fx.crossCut(actor.position.clone(), yaw, -CROSS, 2, 0xd9c8ff));
      } else {
        game.fx.slashAt(actor.position, yaw, THREE.MathUtils.degToRad(140), 2.2);
      }
      game.sfx.swing();
    }
  }
}
