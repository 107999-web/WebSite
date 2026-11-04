// 勇者衝衝衝：自動往前跑，穿過數學門（2～4 扇、還有「？」）增減夥伴與能力，路上打怪、閃陷阱、撿道具，
// 終點打 Boss、爬加倍階梯。金幣到商店買永久升級和新英雄；也有無盡模式。
// 模型與動作沿用《騎士與骷髏》（tools/copy_models.mjs 抄過來），玩法數值都在 data/*.json。
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Assets, loadJson } from './core/assets.js';
import { Input } from './core/input.js';
import { Sfx } from './core/sfx.js';
import { Crowd } from './game/crowd.js';
import { Endless } from './game/endless.js';
import { Boss, Enemy } from './game/enemy.js';
import { Fx } from './game/fx.js';
import { Gates, optionText } from './game/gates.js';
import { label } from './game/math.js';
import { Obstacles } from './game/obstacles.js';
import { Projectiles } from './game/projectiles.js';
import { Save } from './game/save.js';
import { Hud } from './ui/hud.js';
import { renderPortraits } from './ui/portraits.js';
import { Track } from './world/track.js';

const GOLD = '#ffd75e';
const ICONS = { 騎士: '🛡️', 魔法師: '🔥', 盜賊: '🗡️', 弓箭手: '🏹', 忍者: '🥷', 死靈盔甲武士: '⚔️' };
const BLOCK_GAP = 1.2;       // 敵人離隊伍邊緣多近就停下來打
const ENEMY_AHEAD = 60;      // 怪物在隊伍前方多遠出現
const BOSS_AHEAD = 45;
const DRAG_SCALE = 1.6;      // 拖曳整個畫面寬度＝移動路寬的幾倍
const STEP = 1 / 60;
const STAIR_EVERY = 0.42;    // 爬一階的時間
const ENDLESS = 'endless';

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9fc7e8);
    this.scene.fog = new THREE.Fog(0x9fc7e8, 40, 95);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    this.assets = new Assets();
    this.input = new Input(this.canvas);
    this.input.onKey = (code) => this.onKey(code);
    this.sfx = new Sfx();
    this.hud = new Hud();
    this.fx = new Fx(this.scene);
    this.save = new Save();
    this.enemies = [];
    this.groups = [];
    this.state = 'loading';
    this.clock = new THREE.Clock();
    this.fps = { frames: 0, time: 0, value: 0 };
    document.getElementById('pauseBtn').onclick = () => this.pause();
    document.getElementById('skillBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); this.useSkill(); });
    addEventListener('resize', () => this.resize());
    this.resize();
    this.setupLights();
  }

  setupLights() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.45;
    pmrem.dispose();
    this.hemi = new THREE.HemisphereLight(0xdbeafe, 0x3f6b35, 1);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff4d6, 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    Object.assign(this.sun.shadow.camera, { left: -16, right: 16, top: 22, bottom: -22, near: 1, far: 70 });
    this.scene.add(this.sun, this.sun.target);
  }

  resize() {
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.fov = THREE.MathUtils.clamp(50 * (1.6 / Math.max(1, this.camera.aspect)), 50, 72); // 直的螢幕看寬一點
    this.camera.updateProjectionMatrix();
  }

  async load() {
    await this.assets.init();
    this.settings = await loadJson('data/game.json');
    this.characters = await loadJson('data/characters.json');
    for (const [id, def] of Object.entries(this.characters)) def.id = id;
    this.classes = await loadJson('data/classes.json');
    this.shopData = await loadJson('data/shop.json');
    this.abilities = this.settings.abilities;
    this.levels = Object.fromEntries(await Promise.all(this.settings.levels.map(async (id) => [id, await loadJson(`data/levels/${id}.json`)])));
    this.levels[ENDLESS] = await loadJson('data/levels/endless.json');
    this.levelOrder = [...this.settings.levels, ENDLESS];
    this.heroTypes = Object.keys(this.classes).filter((id) => this.assets.catalog[this.characters[id]?.model]);
    this.order = Object.keys(this.settings.difficulties);
    let saved = null;
    try { saved = localStorage.getItem('hero-runner-difficulty'); } catch { /* 無痕模式 */ }
    this.difficultyId = this.order.includes(saved) ? saved : this.settings.defaultDifficulty;
    this.heroId = this.settings.hero;

    const levels = Object.values(this.levels);
    const bosses = [...new Set(levels.flatMap((l) => l.boss ?? []))];
    const spawnIds = levels.flatMap((l) => [...(l.enemies ?? []), { spawns: l.bossEscort ?? [] }].flatMap((g) => g.spawns.map((s) => s.enemy)));
    const extra = bosses.flatMap((b) => [...this.characters[b].boss.skills.map((s) => s.enemy), ...(this.characters[b].boss.reinforce?.enemies ?? [])]).filter(Boolean);
    const enemyIds = [...new Set([...spawnIds, ...bosses, ...extra, ...this.levels[ENDLESS].endless.enemies, ...this.settings.mystery.flatMap((m) => (m.ambush ?? []).map((a) => a.enemy))])];
    for (const id of enemyIds) if (!this.characters[id]) throw new Error(`data/characters.json 沒有「${id}」`);
    const shots = this.heroTypes.map((id) => this.characters[id].shot).filter(Boolean);
    const models = [...this.heroTypes, ...enemyIds].map((id) => this.characters[id].model)
      .concat(shots.map((s) => s.model).filter((m) => m && this.assets.catalog[m]), Obstacles.modelIds().filter((m) => this.assets.catalog[m]));
    await this.assets.preload(models, (done, total) => this.hud.showOverlay({ text: `載入模型 ${done} / ${total}…` }));

    this.projectiles = new Projectiles(this);
    this.setLevel(this.settings.levels[0]);
    this.crowd = new Crowd(this);
    this.gates = new Gates(this);
    this.obstacles = new Obstacles(this);
    this.endless = new Endless(this, this.levels[ENDLESS].endless);
    this.crowd.reset(this.heroId);
    this.portraits = renderPortraits(this.assets, Object.fromEntries(this.heroTypes.map((id) => [id, this.characters[id].model])));
    this.projectiles.prepare(shots);
    this.showTitle();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ---------- 存檔與商店 ----------
  get difficulty() { return this.settings.difficulties[this.difficultyId]; }
  get starKey() { return `${this.levelId}:${this.difficultyId}`; }
  get isEndless() { return this.levelId === ENDLESS; }
  isHeroOwned(id) { return !this.classes[id].locked || this.save.isUnlocked(id); }
  // 門上「+N 職業」會出現的職業：自己擁有的英雄
  get partnerTypes() { return this.heroTypes.filter((id) => this.isHeroOwned(id)); }
  // 商店升級：同一個 stat 的加總（每級加 add）
  shopAdd(stat) {
    return this.shopData.upgrades.filter((u) => u.effect.stat === stat).reduce((sum, u) => sum + u.effect.add * this.save.level(u.id), 0);
  }
  get maxCount() { return this.settings.maxCount + this.shopAdd('maxCount'); }

  isLevelUnlocked(id) {
    const i = this.levelOrder.indexOf(id);
    if (i <= 0 || id === ENDLESS) return true;
    const prev = this.levelOrder[i - 1];
    return this.order.some((d) => this.save.stars(`${prev}:${d}`) > 0);
  }

  setLevel(id) {
    if (id === this.levelId) return;
    this.track?.dispose();
    this.levelId = id;
    this.level = this.levels[id];
    this.track = new Track(this, this.level);
    const t = this.level.theme;
    this.scene.background.set(t.background);
    this.scene.fog.color.set(t.fog);
    this.scene.fog.near = t.fogNear;
    this.scene.fog.far = t.fogFar;
    this.hemi.color.set(t.hemiSky);
    this.hemi.groundColor.set(t.hemiGround);
    this.hemi.intensity = t.hemiIntensity;
    this.sun.color.set(t.sun);
    this.sun.intensity = t.sunIntensity;
  }

  // ---------- 畫面流程 ----------
  clearField() {
    for (const e of this.enemies) e.destroy();
    this.enemies = [];
    this.groups = [];
    this.projectiles.clear();
    this.gates?.clear();
    this.obstacles?.clear();
    this.hud.hideBoss();
    this.hud.clearBanner();
    this.hud.setSkill(null);
    clearTimeout(this.endTimer);
  }

  showTitle() {
    this.state = 'title';
    this.clearField();
    this.crowd.reset(this.heroId);
    this.hud.showHud(false);
    this.hud.showOverlay({
      title: this.settings.title,
      text: '勇者自動往前衝！左右移動穿過數學門：藍色門讓夥伴和能力變多，紅色門會變少，紫色「？」看運氣。\n閃開陷阱、撿道具，帶最多夥伴打倒終點的 Boss，再爬上加倍階梯！',
      buttons: [{ label: '開始遊戲', onClick: () => this.showSelect() }, { label: `商店　🪙 ${this.save.coins}`, onClick: () => this.showShop(() => this.showTitle()), style: 'third' }],
      html: '<div class="controls"><kbd>A</kbd><kbd>D</kbd> 或 <kbd>←</kbd><kbd>→</kbd> 左右移動（滑鼠、手指拖曳也可以）　<kbd>空白鍵</kbd> 英雄技能　<kbd>P</kbd> 暫停</div>',
    });
    this.hud.keys = (code) => (code === 'Enter' || code === 'Space' ? (this.showSelect(), true) : false);
  }

  showSelect() {
    this.sfx.unlock();
    this.state = 'select';
    if (!this.isHeroOwned(this.heroId)) this.heroId = this.partnerTypes[0];
    this.crowd.reset(this.heroId);
    this.hud.showSelect({
      levels: this.levelOrder.map((id) => ({
        id, name: this.levels[id].name, desc: this.levels[id].desc ?? '', locked: !this.isLevelUnlocked(id),
        max: this.order.length * 3, stars: this.order.reduce((sum, d) => sum + this.save.stars(`${id}:${d}`), 0),
        best: id === ENDLESS ? this.save.best(`${ENDLESS}:${this.difficultyId}`) : undefined,
      })),
      level: this.levelId,
      heroes: this.heroTypes.map((id) => ({ id, portrait: this.portraits[id], desc: this.classes[id].desc, skill: this.classes[id].skill?.name ?? '無', locked: !this.isHeroOwned(id) })),
      hero: this.heroId,
      difficulties: this.order.map((id) => ({ id, ...this.settings.difficulties[id], stars: this.save.stars(`${this.levelId}:${id}`) })),
      difficulty: this.difficultyId,
      coins: this.save.coins,
      onLevel: (id) => {
        if (!this.isLevelUnlocked(id)) { this.sfx.hurt(); return; }
        this.setLevel(id);
        this.sfx.pickup();
        this.showSelect();
      },
      onHero: (id) => { this.heroId = id; this.crowd.reset(id); this.sfx.pickup(); },
      onDifficulty: (id) => { this.difficultyId = id; try { localStorage.setItem('hero-runner-difficulty', id); } catch { /* 無痕模式 */ } this.sfx.pickup(); this.showSelect(); },
      onStart: () => this.startRun(),
      onBack: () => this.showTitle(),
      onShop: () => this.showShop(() => this.showSelect()),
    });
  }

  showShop(back, message = '') {
    this.state = 'shop';
    const { save } = this;
    this.hud.showShop({
      coins: save.coins,
      message,
      upgrades: this.shopData.upgrades.map((u) => ({ ...u, level: save.level(u.id), max: u.costs.length, cost: u.costs[save.level(u.id)] })),
      heroes: this.shopData.heroes.filter((h) => this.heroTypes.includes(h.id)).map((h) => ({
        id: h.id, cost: h.cost, owned: save.isUnlocked(h.id), portrait: this.portraits[h.id], desc: this.classes[h.id].desc, skill: this.classes[h.id].skill?.name ?? '無',
      })),
      onBuy: (id) => {
        const u = this.shopData.upgrades.find((x) => x.id === id);
        const lv = save.level(id);
        if (lv >= u.costs.length) { this.showShop(back, '這項已經升到最高了。'); return; }
        if (!save.spend(u.costs[lv])) { this.sfx.hurt(); this.showShop(back, '金幣不夠！去跑一趟再回來。'); return; }
        save.upgrade(id);
        this.sfx.coin(); this.sfx.pickup();
        this.showShop(back, `買了「${u.name}」！`);
      },
      onUnlock: (id) => {
        const h = this.shopData.heroes.find((x) => x.id === id);
        if (save.isUnlocked(id)) { this.showShop(back, `${id}已經是你的夥伴了。`); return; }
        if (!save.spend(h.cost)) { this.sfx.hurt(); this.showShop(back, '金幣不夠！去跑一趟再回來。'); return; }
        save.unlock(id);
        this.sfx.win();
        this.showShop(back, `解鎖${id}！現在可以選它當英雄，門上也會出現它。`);
      },
      onReset: () => {
        const now = performance.now();
        if (now - (this.resetAt ?? 0) > 2000) { this.resetAt = now; this.showShop(back, '再按一次「重置進度」就會清掉金幣、升級、英雄和星星。'); return; }
        save.reset();
        this.resetAt = 0;
        this.showShop(back, '進度已經重置。');
      },
      onBack: back,
    });
  }

  startRun() {
    this.sfx.unlock();
    this.clearField();
    this.input.clear();
    this.hud.keys = null;
    const { crowd } = this;
    crowd.reset(this.heroId);
    crowd.mods.damage += this.shopAdd('damage');
    crowd.mods.hp += this.shopAdd('hp');
    crowd.heroHp = crowd.heroMax; // 商店的生命升級加上去之後再補滿英雄的血
    const extra = this.shopAdd('startCrowd');
    if (extra) { crowd.add(this.heroId, Math.min(extra, this.maxCount - 1)); crowd.refreshBadge(); }
    this.ramp = 1;
    this.time = 0;
    if (this.isEndless) {
      this.gates.load([]);
      this.obstacles.load([]);
      this.endless.reset();
    } else {
      this.gates.load(this.level.gates);
      this.obstacles.load(this.level.obstacles);
      this.groups = this.level.enemies.map((g) => ({ ...g, spawned: false }));
    }
    this.bossSpawned = false;
    this.boss = null;
    this.bossesBeaten = 0;
    this.gold = 0;
    this.kills = 0;
    this.skillCd = 0;
    this.multiplier = 1;
    this.state = 'playing';
    this.hud.hideOverlay();
    this.hud.showHud(true);
    this.hud.banner(this.isEndless ? '無盡模式：能跑多遠？' : `${this.level.name}・衝啊！`, 1.6);
  }

  pause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.hud.showOverlay({ title: '暫停', text: '休息一下。', buttons: [{ label: '繼續', onClick: () => this.pause() }, { label: '重新開始', onClick: () => this.startRun() }, { label: '回標題', onClick: () => this.showTitle() }] });
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.hud.hideOverlay();
    }
  }

  onKey(code) {
    if (this.state === 'title' || this.state === 'select' || this.state === 'shop') return this.hud.keys?.(code) ?? false;
    if (code === 'KeyP' || code === 'Escape') { if (this.state === 'playing' || this.state === 'paused') { this.pause(); return true; } }
    if ((code === 'Space' || code === 'KeyK') && this.state === 'playing') { this.useSkill(); return true; }
    return false;
  }

  // ---------- 英雄技能（空白鍵／右下按鈕） ----------
  get skill() { return this.classes[this.heroId]?.skill ?? null; }

  useSkill() {
    const s = this.skill;
    if (!s || this.state !== 'playing' || this.skillCd > 0) return;
    const { crowd, fx } = this;
    const c = crowd.center;
    this.skillCd = s.cooldown * Math.max(0.3, 1 + this.shopAdd('skillCd'));
    const ahead = (range) => this.enemies.filter((e) => e.alive && Math.hypot(e.position.x - c.x, e.position.z - c.z) <= range);
    if (s.type === 'shield') crowd.shield = s.seconds;
    if (s.type === 'frenzy') { crowd.frenzy = s.seconds; crowd.frenzyRate = s.rate; }
    if (s.type === 'volley') {
      for (const e of ahead(s.range)) { this.damageEnemy(e, s.damage); fx.burst(e.position.x, 2, e.position.z, 6, s.color, 3); }
    }
    if (s.type === 'meteor') { // 砸在怪最多的地方
      const list = ahead(18);
      let best = null, bestN = 0;
      for (const e of list) {
        const n = list.filter((o) => Math.hypot(o.position.x - e.position.x, o.position.z - e.position.z) <= s.radius).length + (e.def.boss ? 3 : 0);
        if (n > bestN) { best = e; bestN = n; }
      }
      if (best) {
        const { x, z } = best.position;
        this.blast({ x, z }, s.radius, s.damage, s.burn);
        fx.blastRing(x, z, s.radius, s.color);
        fx.burst(x, 3, z, 60, s.color, 7);
        fx.shake(0.6);
        this.sfx.blast();
      }
    }
    if (s.type === 'smoke') {
      crowd.trapImmune = s.seconds;
      for (const e of ahead(16)) e.stun = Math.max(e.stun, s.stun);
      fx.burst(c.x, 1, c.z, 60, s.color, 3);
    }
    if (s.type === 'quake') {
      for (const e of ahead(s.range)) { e.stun = Math.max(e.stun, s.stun); this.damageEnemy(e, s.damage); }
      fx.blastRing(c.x, c.z, s.range, s.color);
      fx.shake(0.7);
      this.sfx.blast();
    }
    this.hud.banner(s.name, 1, s.color);
    this.hud.flashScreen(s.color);
    this.sfx.wave();
  }

  // ---------- 戰鬥 ----------
  spawnEnemy(id, x, d, summoned = false) {
    const def = this.characters[id];
    const Cls = def.boss ? Boss : Enemy;
    const e = new Cls(this, def, this.assets.instantiate(def.model), x, d);
    e.summoned = summoned;
    if (summoned) e.state = 'chase';
    this.enemies.push(e);
    return e;
  }

  // 怪物小隊排在路上：每排 4 隻；隻數乘上難度的 enemyCountMult
  spawnGroup(g, chase = false) {
    g.spawned = true;
    let i = 0;
    for (const s of g.spawns) {
      const n = Math.round(s.count * (this.difficulty.enemyCountMult ?? 1));
      for (let k = 0; k < n; k++, i++) {
        const row = Math.floor(i / 4), col = i % 4;
        this.spawnEnemy(s.enemy, -3 + col * 2 + (row % 2) * 0.6, g.d + row * 1.6, chase);
      }
    }
  }

  nearestEnemy(pos, range) {
    let best = null, bestD = range;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.position.x - pos.x, e.position.z - pos.z);
      if (d < bestD) { best = e; bestD = d; }
    }
    return best;
  }

  nearestEnemies(pos, n, range) {
    return this.enemies.filter((e) => e.alive && Math.hypot(e.position.x - pos.x, e.position.z - pos.z) <= range)
      .sort((a, b) => Math.hypot(a.position.x - pos.x, a.position.z - pos.z) - Math.hypot(b.position.x - pos.x, b.position.z - pos.z)).slice(0, n);
  }

  blast(pos, radius, damage, burn) {
    for (const e of this.enemies) {
      if (!e.alive || Math.hypot(e.position.x - pos.x, e.position.z - pos.z) > radius + e.radius) continue;
      if (this.damageEnemy(e, damage) && burn) e.ignite(burn);
    }
  }

  // mode：true＝燃燒（橘色閃光）；projectiles 傳 'plain'／'magic' 字串
  damageEnemy(e, amount, mode) {
    if (!e.takeHit(amount, mode === true)) return false;
    if (mode !== true) this.fx.sparks(e.position.x, 1, e.position.z);
    if (!e.alive) {
      this.kills += 1;
      this.fx.bones(e.position.x, 1, e.position.z);
      this.sfx.bones();
      if (e.def.gold && this.state === 'playing') this.addGold(e.def.gold, e.position);
      if (e.def.boss) this.onBossDefeated(e);
    }
    return true;
  }

  hurtCrowd(amount) {
    if (this.state !== 'playing') return;
    const before = this.crowd.count, hp = this.crowd.heroHp;
    this.crowd.takeDamage(amount);
    if (this.crowd.count < before || this.crowd.heroHp < hp) this.sfx.hurt();
    if (!this.crowd.alive) this.endRun(false);
  }

  onBossDefeated(boss) {
    this.hud.hideBoss();
    this.hud.banner(`擊敗${boss.def.boss.name}！`, 2);
    this.fx.shake(0.6);
    this.bossesBeaten += 1;
    for (const e of this.enemies) if (e.alive && e !== boss && e.summoned) this.damageEnemy(e, e.hp);
    if (this.isEndless) { this.boss = null; this.addGold(this.levels[ENDLESS].endless.bossGold, boss.position, true); return; }
    for (const e of this.enemies) if (e.alive && e !== boss) this.damageEnemy(e, e.hp);
    if (this.track.stairs) this.startStairs(); else this.endRun(true);
  }

  // 終點加倍階梯：每階用掉 stairCost 個人，爬越高金幣倍率越大；剩英雄一人就停
  startStairs() {
    this.state = 'stairs';
    this.stair = { index: -1, timer: 1.2 };
    this.hud.banner('爬上加倍階梯！', 1.4, '#fde047');
  }

  updateStairs(dt) {
    const { crowd } = this;
    const st = this.track.stairs;
    const cost = Math.max(1, this.settings.stairCost + this.shopAdd('stairCost'));
    const targetD = this.stair.index < 0 ? st.startD - 0.5 : st.startD + (this.stair.index + 0.5) * st.depth;
    crowd.d += Math.sign(targetD - crowd.d) * Math.min(Math.abs(targetD - crowd.d), this.settings.runSpeed * dt);
    crowd.x += (0 - crowd.x) * Math.min(1, dt * 3);
    crowd.update(dt, Math.abs(targetD - crowd.d) > 0.05);
    this.stair.timer -= dt;
    if (this.stair.timer > 0) return;
    const next = this.stair.index + 1;
    if (next >= st.multipliers.length || crowd.count - cost < 1) { this.multiplier = this.stair.index >= 0 ? st.multipliers[this.stair.index] : 1; this.state = 'playing'; this.endRun(true); return; }
    this.stair.index = next;
    this.stair.timer = STAIR_EVERY;
    crowd.remove(cost, false);
    crowd.y = (next + 1) * st.height;
    this.multiplier = st.multipliers[next];
    this.fx.floatText(0, crowd.y + 2.5, -(st.startD + (next + 0.5) * st.depth), `×${this.multiplier}`, '#fde047');
    this.sfx.coin();
  }

  // 門上的文字（回饋、回顧共用）
  optionLabel(o) {
    if (o.kind === 'crowd') return `${label(o.steps)}${o.type ? ` ${o.type}` : ''}`;
    if (o.kind === 'mystery') return '？';
    return `${o.title}（${o.sub}）`;
  }

  // 其他門的結果：「另一邊 +5 會是 13」或「其他門：+5 會是 13、÷2 會是 4」
  othersText(g) {
    const others = g.options.filter((o, i) => i !== g.chosen && o.kind !== 'mystery');
    if (!others.length) return '';
    if (g.kind === 'crowd') return (g.doors === 2 ? '另一邊 ' : '其他門：') + others.map((o) => `${label(o.steps)} 會是 ${o.result}`).join('、');
    return (g.doors === 2 ? '另一邊是 ' : '其他門：') + others.map((o) => this.optionLabel(o)).join('、');
  }

  // 穿過門的回饋：人數門顯示「8 → 16」和其他門的結果；「？」門先揭曉抽到什麼
  onGate(g, option, before, after, right, luck) {
    const reveal = luck ? `？是 ${luck.steps ? label(luck.steps) : luck.gold ? `金幣 +${luck.gold}` : '伏兵！'}　` : '';
    if (luck?.gold) this.addGold(luck.gold, new THREE.Vector3(this.crowd.x, 2, -this.crowd.d), true);
    if (luck?.ambush) this.spawnGroup({ d: this.crowd.d + 14, spawns: luck.ambush }, true);
    const others = this.othersText(g);
    if (g.kind === 'crowd') {
      const mark = right ? (luck ? '運氣好！' : '選對了！') : luck ? '運氣不好…' : '可惜！';
      this.hud.gateFeedback(`${reveal}${before} → ${after}　${mark}<small>${others}</small>`, right ? 'right' : 'wrong');
      if (right) this.sfx.win(); else this.sfx.lose();
      if (after > before) this.fx.burst(this.crowd.x, 1.5, -this.crowd.d, 30, '#60a5fa', 4);
    } else {
      const text = optionText(option);
      const cls = right === null ? 'even' : right ? 'right' : 'wrong';
      const tail = right === null ? '<small>都是加成，看你的隊伍需要哪一種</small>' : right ? '' : `<small>${others}</small>`;
      this.hud.gateFeedback(`${text.title}（${text.sub}）${tail}`, cls);
      if (option.good) this.sfx.pickup(); else this.sfx.hurt();
    }
    this.hud.flashScreen(after > before || (option.kind === 'ability' && option.good) ? '#3b82f6' : after < before || option.good === false ? '#ef4444' : '#8b5cf6');
  }

  // 陷阱碰到某一個人：夥伴直接倒下，並連帶扣掉沒畫出來的人（每個畫出來的人代表 人數 ÷ 畫出來的人數）；
  // 英雄扣 1 血（1 秒無敵）。有護盾、煙遁都不扣。傷害數字合併成一次顯示
  trapMember(m, def) {
    if (this.state !== 'playing') return;
    const { crowd } = this;
    if (crowd.shield > 0 || crowd.trapImmune > 0) { this.hud.gateFeedback('陷阱傷不到！', 'even'); return; }
    let lost = 0;
    if (m.hero) {
      if (crowd.heroGrace > 0) return;
      const dead = crowd.hurtHero(def.heroDamage ?? 1, 1);
      this.hud.gateFeedback(dead ? '英雄倒下了！' : `英雄受傷！剩 ${crowd.heroHp} / ${crowd.heroMax}`, 'wrong');
      this.sfx.hurt();
      this.hud.flashScreen('#ef4444');
      if (dead || !crowd.alive) this.endRun(false);
      return;
    }
    const drawn = crowd.members.filter((x) => x.actor).length || 1;
    const extra = Math.max(0, Math.round((crowd.count - drawn) / drawn));
    crowd.removeMember(m);
    lost = 1;
    if (extra) { const before = crowd.count; crowd.remove(Math.min(extra, crowd.count - 1), false); lost += before - crowd.count; }
    this.trapLost = (this.trapLost ?? 0) + lost;
    clearTimeout(this.trapTimer);
    this.trapTimer = setTimeout(() => { if (this.trapLost) this.hud.gateFeedback(`撞到陷阱 −${this.trapLost}`, 'wrong'); this.trapLost = 0; }, 120);
    this.fx.burst(m.actor?.position.x ?? crowd.x, 1, m.actor?.position.z ?? -crowd.d, 8, '#ef4444', 3);
    this.sfx.hurt();
    this.fx.shake(0.15);
  }

  // （舊版的整隊比例判定，保留給沒有 area 的陷阱）
  trapHit(frac, def) {
    if (frac <= 0 || this.state !== 'playing') return;
    const { crowd } = this;
    if (crowd.shield > 0 || crowd.trapImmune > 0) { this.hud.gateFeedback('陷阱傷不到！', 'even'); return; }
    const loss = Math.max(1, Math.round(crowd.count * frac * (def.loss ?? this.settings.trapLoss)));
    const lost = Math.min(loss, crowd.count - 1);
    if (lost <= 0) return;
    crowd.remove(lost);
    this.hud.gateFeedback(`踩到陷阱 −${lost}`, 'wrong');
    this.hud.flashScreen('#ef4444');
    this.fx.shake(0.3);
    this.sfx.hurt();
  }

  // 金幣：商店的金幣加成在這裡乘
  addGold(amount, pos, big = false) {
    const n = Math.max(1, Math.round(amount * (1 + this.shopAdd('coinBonus'))));
    this.gold += n;
    this.fx.floatText(pos.x, (pos.y ?? 0) + 1.4, pos.z, `+${n}`, GOLD);
    if (big) this.fx.burst(pos.x, (pos.y ?? 0) + 1, pos.z, 26, GOLD, 4);
    this.sfx.coin();
  }

  // 藥水：紅＝加夥伴、黃＝護盾、紫＝炸掉前面的怪（Boss 扣一部分）
  usePotion(item, pos) {
    const p = this.settings.potions[item];
    if (!p) return;
    const { crowd } = this;
    if (p.effect === 'partners') {
      crowd.add(this.partnerTypes[Math.floor(Math.random() * this.partnerTypes.length)], Math.max(0, Math.min(p.amount, this.maxCount - crowd.count)));
      crowd.refreshBadge();
    }
    if (p.effect === 'shield') crowd.shield = p.seconds;
    if (p.effect === 'blast') {
      for (const e of this.enemies) {
        if (!e.alive || -e.position.z - crowd.d > p.range) continue;
        this.damageEnemy(e, e.def.boss ? Math.round(e.maxHp * p.bossRatio) : e.hp, 'plain');
      }
      this.fx.shake(0.6);
      this.sfx.blast();
    }
    this.hud.gateFeedback(p.text, 'right');
    this.hud.flashScreen(p.color);
    this.fx.burst(pos.x, 1, pos.z, 30, p.color, 4);
    this.sfx.pickup();
  }

  endRun(won) {
    if (this.state !== 'playing') return;
    this.state = 'ending';
    const { save } = this;
    const history = this.gates.history;
    const judged = history.filter((h) => h.right !== null);
    const correct = judged.filter((h) => h.right).length;
    const ratio = judged.length ? correct / judged.length : 1;
    const earned = Math.round(this.gold * this.multiplier);
    save.addCoins(earned);
    if (won) this.sfx.win(); else this.sfx.lose();
    let title, text, stars = 0, best = false;
    const coinLine = this.multiplier > 1 ? `金幣 ${this.gold} × ${this.multiplier} = ${earned}` : `金幣 +${earned}`;
    if (this.isEndless) {
      const dist = Math.floor(this.crowd.d);
      best = save.recordBest(`${ENDLESS}:${this.difficultyId}`, dist);
      title = `跑了 ${dist} 公尺！`;
      text = `打倒 ${this.bossesBeaten} 隻 Boss、${this.kills} 隻怪物，選對 ${correct} / ${judged.length} 道門。\n${coinLine}（共 ${save.coins}）${best ? `\n${this.difficultyId}新紀錄！` : `\n${this.difficultyId}最遠 ${save.best(`${ENDLESS}:${this.difficultyId}`)} 公尺`}`;
    } else {
      const { three, two } = this.level.stars;
      stars = won ? (ratio >= three ? 3 : ratio >= two ? 2 : 1) : 0;
      best = won && save.recordStars(this.starKey, stars);
      title = won ? '打倒 Boss 了！' : '隊伍全滅了…';
      text = `${won ? `剩下 ${this.crowd.count} 位夥伴，` : ''}選對 ${correct} / ${judged.length} 道門，打倒 ${this.kills} 隻怪物。\n${coinLine}（共 ${save.coins}）${best ? `\n${this.difficultyId}新紀錄！` : ''}`;
    }
    const next = won && !this.isEndless ? this.levelOrder[this.levelOrder.indexOf(this.levelId) + 1] : null;
    const review = history.map((h, i) => {
      const chosen = h.options[h.chosen];
      const pick = chosen.kind === 'mystery' ? `？（${h.revealed?.steps ? label(h.revealed.steps) : h.revealed?.gold ? `金幣 +${h.revealed.gold}` : '伏兵'}）` : this.optionLabel(chosen);
      const others = this.othersText({ ...h, doors: h.options.length });
      const detail = h.kind === 'crowd' ? `${h.before} → ${h.after}${others ? `（${others}）` : ''}` : others;
      return `<div class="${h.right === null ? 'even' : h.right ? 'right' : 'wrong'}">第 ${i + 1} 道門（${h.options.length} 扇）：選 ${pick}<br><small>${detail}</small></div>`;
    }).join('');
    const buttons = [
      ...(next && next !== ENDLESS ? [{ label: `下一關：${this.levels[next].name}`, onClick: () => { this.setLevel(next); this.startRun(); } }] : []),
      { label: '再玩一次', onClick: () => this.startRun(), style: next && next !== ENDLESS ? 'second' : 'main' },
      { label: `商店　🪙 ${save.coins}`, onClick: () => this.showShop(() => this.showSelect()), style: 'third' },
      { label: '換關卡／英雄', onClick: () => this.showSelect(), style: 'second' },
    ];
    this.endScreen = () => {
      this.hud.showHud(false);
      this.hud.setSkill(null);
      const body = this.hud.showOverlay({ cls: 'result', title, text, buttons });
      body.innerHTML = `${stars ? `<div class="stars">${[1, 2, 3].map((n) => `<span class="${n <= stars ? '' : 'off'}">⭐</span>`).join('')}</div>` : ''}<div class="review">${review}</div>`;
    };
    this.endTimer = setTimeout(() => this.endScreen(), 1600);
  }

  // ---------- 每一格 ----------
  step(dt) {
    const { crowd } = this;
    if (this.state === 'playing') {
      const length = this.isEndless ? Infinity : this.level.length;
      if (this.isEndless) this.endless.update();
      const blocked = this.enemies.some((e) => e.alive && e.distanceTo(crowd) < BLOCK_GAP);
      const moving = !blocked && crowd.d < length;
      if (moving) crowd.d = Math.min(length, crowd.d + this.settings.runSpeed * dt);
      const half = crowd.edge; // 英雄永遠可以走到路邊；後面的夥伴會被石牆擠住，不會限制英雄
      crowd.x += this.input.steer * this.settings.strafeSpeed * dt + (this.input.takeDrag() / innerWidth) * this.track.halfWidth * 2 * DRAG_SCALE;
      crowd.x = THREE.MathUtils.clamp(crowd.x, -half, half);
      this.time += dt;
      this.skillCd = Math.max(0, this.skillCd - dt);
      this.gates.update(dt);
      this.obstacles.update(dt);
      for (const g of this.groups) if (!g.spawned && g.d - crowd.d < ENEMY_AHEAD) this.spawnGroup(g);
      if (!this.isEndless && !this.bossSpawned && length - crowd.d < BOSS_AHEAD) {
        this.bossSpawned = true;
        const pool = this.level.boss;
        this.boss = this.spawnEnemy(pool[Math.floor(Math.random() * pool.length)], 0, length + 12);
        if (this.level.bossEscort) this.spawnGroup({ d: length + 4, spawns: this.level.bossEscort }); // Boss 帶著一隊小兵
        this.hud.banner('Boss 出現了！', 1.6, '#ff5a3c');
      }
      if (this.isEndless && crowd.d >= this.level.length - 5) { this.endRun(true); return; } // 跑完整條路（幾乎不可能）
      crowd.update(dt, moving);
      crowd.combat(dt);
    } else if (this.state === 'stairs') {
      this.updateStairs(dt);
    } else {
      crowd.update(dt, false);
    }
    if (this.state === 'playing' || this.state === 'ending' || this.state === 'stairs') {
      for (const e of this.enemies) e.update(dt, crowd);
      this.separate();
      this.projectiles.update(dt);
      for (const e of this.enemies) if (e.removed) e.destroy();
      this.enemies = this.enemies.filter((e) => !e.removed);
      for (const e of this.enemies) e.updateVisual(dt);
    }
    this.track.update(dt, this.clock.elapsedTime, crowd.d);
  }

  separate() {
    const list = this.enemies.filter((e) => e.alive);
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i].position, b = list[j].position;
      const min = list[i].radius + list[j].radius;
      const dx = b.x - a.x, dz = b.z - a.z;
      const d = Math.hypot(dx, dz) || 0.01;
      if (d >= min) continue;
      const push = ((min - d) / d) * 0.5;
      if (!list[i].def.boss) { a.x -= dx * push; a.z -= dz * push; }
      if (!list[j].def.boss) { b.x += dx * push; b.z += dz * push; }
    }
  }

  updateHud() {
    const comp = {};
    for (const m of this.crowd.members) comp[m.type] = (comp[m.type] ?? 0) + 1;
    this.hud.setStatus({
      count: this.crowd.count, gold: this.gold, difficulty: this.isEndless ? `${this.difficultyId}・${Math.floor(this.crowd.d)} 公尺` : this.difficultyId, color: this.difficulty.color,
      progress: this.isEndless ? (this.crowd.d % this.levels[ENDLESS].endless.bossEvery) / this.levels[ENDLESS].endless.bossEvery : this.crowd.d / this.level.length,
      comp: Object.entries(comp).map(([t, n]) => `<span>${ICONS[t] ?? ''}${n}</span>`).join(''),
    });
    const s = this.skill;
    this.hud.setSkill(s && this.state === 'playing' ? { name: s.name, color: s.color, cooldown: this.skillCd } : null);
  }

  updateCamera(dt) {
    const { crowd } = this;
    if (this.state === 'title' || this.state === 'select' || this.state === 'shop') { // 選單時從正面看英雄
      const t = this.clock.elapsedTime * 0.3;
      const x = crowd.x, z = -crowd.d;
      this.camera.position.set(x + Math.sin(t) * 1.2, 1.8, z - 5.5);
      this.camera.lookAt(x, this.state === 'title' ? -0.4 : -1.4, z); // 看低一點，英雄才會在面板上方
      return;
    }
    const pull = Math.min(4, crowd.radius); // 人越多鏡頭越遠
    const want = new THREE.Vector3(crowd.x * 0.4, crowd.y + 9.5 + pull * 1.2, -crowd.d + 9.5 + pull);
    if (!this.camTarget) this.camTarget = want.clone();
    this.camTarget.lerp(want, Math.min(1, dt * 4));
    this.camera.position.copy(this.camTarget).add(this.fx.offset);
    this.camera.lookAt(crowd.x * 0.4, crowd.y + 0.5, -crowd.d - 4.5);
    this.sun.position.set(crowd.x + 8, 24, -crowd.d + 6);
    this.sun.target.position.set(crowd.x, 0, -crowd.d - 6);
  }

  frame() {
    const raw = Math.min(this.clock.getDelta(), 0.05);
    this.fx.update(raw);
    if (this.state !== 'paused') {
      let dt = raw;
      while (dt > 0) { const d = Math.min(STEP, dt); this.step(d); dt -= d; }
    }
    if (this.state === 'playing' || this.state === 'stairs') this.updateHud();
    this.updateCamera(raw);
    this.renderer.render(this.scene, this.camera);
    this.fps.frames += 1;
    this.fps.time += raw;
    if (this.fps.time >= 1) { this.fps.value = this.fps.frames / this.fps.time; this.fps.frames = 0; this.fps.time = 0; }
  }

  // 測試用：不畫面、直接快轉
  simulate(seconds, dt = 1 / 30) {
    for (let t = 0; t < seconds && (this.state === 'playing' || this.state === 'ending' || this.state === 'stairs'); t += dt) {
      this.fx.update(dt);
      this.step(dt);
    }
    this.camTarget = null; // 快轉後鏡頭直接到位
  }
}

const game = new Game();
window.__game = game;
game.load().catch((err) => {
  console.error(err);
  game.hud.showOverlay({ title: '載入失敗', text: err.message });
});
