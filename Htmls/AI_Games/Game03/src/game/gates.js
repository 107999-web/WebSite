// 數學門的外觀與判定：一組 2～4 扇，藍色＝人數或能力變多，紅色＝變少，紫色「？」＝穿過才知道（看運氣）。
// 門在隊伍前方 spawnAhead 公尺時才產生（算式依當下人數出題）。穿門看的是英雄的位置（隊伍的 x）。
import * as THREE from 'three';
import { abilitySet, bestIndex, crowdSet, evaluate, label, mysteryOption, rollMystery } from './math.js';

const COLORS = { good: 0x3b82f6, bad: 0xef4444, mystery: 0x8b5cf6 };
const STROKE = { good: '#1e3a8a', bad: '#7f1d1d', mystery: '#3b0764' };
const HEIGHT = 3.2;
const AIM_RANGE = 26; // 門在前方多近開始亮出「會穿過這扇」

function panelTexture(title, sub, tone) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 320;
  const g = canvas.getContext('2d');
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.font = `900 ${title.length > 6 ? 100 : title.length > 4 ? 124 : 150}px "Microsoft JhengHei", sans-serif`;
  g.lineWidth = 18;
  g.strokeStyle = STROKE[tone];
  g.strokeText(title, 256, sub ? 128 : 160);
  g.fillStyle = '#ffffff';
  g.fillText(title, 256, sub ? 128 : 160);
  if (sub) {
    g.font = '800 62px "Microsoft JhengHei", sans-serif';
    g.lineWidth = 12;
    g.strokeText(sub, 256, 252);
    g.fillStyle = '#fde68a';
    g.fillText(sub, 256, 252);
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function optionText(o) {
  if (o.kind === 'crowd') return { title: label(o.steps), sub: o.type ?? '' };
  if (o.kind === 'mystery') return { title: '？', sub: '看運氣' };
  return { title: o.title, sub: o.sub ?? '' };
}

const toneOf = (o) => (o.kind === 'mystery' ? 'mystery' : o.good ? 'good' : 'bad');

function buildPanel(option, width) {
  const tone = toneOf(option);
  const { title, sub } = optionText(option);
  const group = new THREE.Group();
  const color = COLORS[tone];
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(width, HEIGHT), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }));
  glass.position.y = HEIGHT / 2 + 0.2;
  const textW = Math.min(width * 0.98, 4.4);
  const text = new THREE.Mesh(new THREE.PlaneGeometry(textW, textW * 0.625), new THREE.MeshBasicMaterial({ map: panelTexture(title, sub, tone), transparent: true, depthWrite: false }));
  text.position.set(0, HEIGHT / 2 + 0.3, 0.02);
  const postMat = new THREE.MeshStandardMaterial({ color: tone === 'good' ? 0x93c5fd : tone === 'bad' ? 0xfca5a5 : 0xc4b5fd, emissive: color, emissiveIntensity: 0.5 });
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, HEIGHT + 0.4, 0.2), postMat);
    post.position.set(s * width / 2, (HEIGHT + 0.4) / 2, 0);
    group.add(post);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(width + 0.2, 0.2, 0.2), postMat);
  top.position.y = HEIGHT + 0.4;
  group.add(glass, text, top);
  return { group, glass, text };
}

export class Gates {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.pending = [];
    this.history = [];
  }

  load(defs) {
    this.clear();
    this.pending = defs.map((g) => ({ ...g }));
    this.history = [];
  }

  // 無盡模式：一路產生新的門
  push(def) { this.pending.push(def); }

  clear() {
    for (const g of this.list) this.game.scene.remove(g.group);
    this.list = [];
  }

  makeSet(def) {
    const { game } = this;
    const { math, mixedAbility, mysteryChance = 0 } = game.difficulty;
    const doors = Math.max(2, Math.min(4, def.doors ?? 2));
    const set = def.kind === 'ability'
      ? abilitySet(game.abilities, mixedAbility ?? 0, doors)
      : crowdSet(math, game.crowd.count, game.partnerTypes, game.maxCount, doors);
    // 有機率把其中一扇換成「？」（不會換掉最好的那扇）
    if (def.kind === 'crowd' && (def.mystery ?? Math.random() < mysteryChance)) {
      const candidates = set.options.map((o, i) => i).filter((i) => i !== set.better);
      const i = candidates[Math.floor(Math.random() * candidates.length)];
      if (i !== undefined) set.options[i] = mysteryOption();
    }
    const half = game.track.halfWidth;
    const slot = (half * 2) / doors;
    const group = new THREE.Group();
    const panels = set.options.map((o, i) => {
      const p = buildPanel(o, slot - 0.35);
      p.group.position.x = -half + slot * (i + 0.5);
      group.add(p.group);
      return p;
    });
    group.position.z = -def.d;
    game.scene.add(group);
    const gate = { ...def, ...set, doors, slot, group, panels, passed: false, fade: 0 };
    this.list.push(gate);
    return gate;
  }

  doorAt(gate, x) {
    const half = this.game.track.halfWidth;
    return Math.max(0, Math.min(gate.doors - 1, Math.floor((x + half) / gate.slot)));
  }

  update(dt) {
    const { game } = this;
    const { crowd } = game;
    while (this.pending.length && this.pending[0].d - crowd.d < game.settings.spawnAhead) this.makeSet(this.pending.shift());
    for (const g of this.list) {
      if (g.passed) {
        g.fade += dt;
        g.panels.forEach((p, i) => {
          if (i === g.chosen) { p.group.scale.setScalar(1 + g.fade * 0.8); p.glass.material.opacity = Math.max(0, 0.42 - g.fade); }
          else p.group.position.y = -g.fade * 6;
        });
        continue;
      }
      if (crowd.d >= g.d - 0.2) { this.pass(g); continue; }
      // 英雄對準哪一扇：那扇變亮、放大一點，其他變暗
      const aiming = g.d - crowd.d < AIM_RANGE;
      const side = this.doorAt(g, crowd.x);
      g.panels.forEach((p, i) => {
        const on = aiming && i === side;
        p.glass.material.opacity = aiming ? (on ? 0.7 + Math.sin(game.clock.elapsedTime * 10) * 0.1 : 0.2) : 0.42;
        p.group.scale.setScalar(on ? 1.06 : 1);
      });
    }
    this.list = this.list.filter((g) => {
      if (g.passed && g.fade > 1) { game.scene.remove(g.group); return false; }
      return true;
    });
  }

  pass(g) {
    const { game } = this;
    const max = game.maxCount;
    g.passed = true;
    g.chosen = this.doorAt(g, game.crowd.x);
    const before = game.crowd.count;
    // 出題時看的是當時人數；穿過門前人數可能變了（被怪打），用現在的人數重算，答案才對
    if (g.kind === 'crowd') for (const o of g.options) if (o.kind === 'crowd') o.result = evaluate(o.steps, before, max);
    let option = g.options[g.chosen];
    let luck = null;
    if (option.kind === 'mystery') { // 揭曉：抽到算式就照算；金幣、伏兵另外處理
      luck = rollMystery(game.settings.mystery);
      option = luck.steps
        ? { kind: 'crowd', steps: luck.steps, result: evaluate(luck.steps, before, max), type: luck.type ?? null, good: true }
        : { kind: 'luck', ...luck, result: before };
      g.revealed = option;
    }
    g.better = g.kind === 'crowd' ? bestIndex(g.options) : null;
    if (option.kind === 'crowd' || option.kind === 'ability') game.crowd.applyGate(option);
    const after = game.crowd.count;
    // 對錯：人數門看結果是不是最多（「？」門運氣好、比算的還多也算對）；能力門看是不是藍的（全藍的門不算）
    let right;
    if (g.kind === 'crowd') {
      const bestKnown = g.better === null ? before : g.options[g.better].result;
      right = after >= bestKnown;
    } else {
      right = g.options.every((o) => o.good) ? null : option.good;
    }
    this.history.push({ kind: g.kind, options: g.options, chosen: g.chosen, better: g.better, right, before, after, revealed: g.revealed ?? null });
    game.onGate(g, option, before, after, right, luck);
  }
}
