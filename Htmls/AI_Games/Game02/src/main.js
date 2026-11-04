// 騎士塔防：把素材、關卡、塔、英雄組起來，跑主迴圈。
// 模型與動作沿用《騎士與骷髏》（tools/copy_models.mjs 抄過來），玩法數值都在 data/*.json。
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Assets, loadJson } from './core/assets.js';
import { Input } from './core/input.js';
import { Sfx } from './core/sfx.js';
import { Boss } from './game/boss.js';
import { Enemy } from './game/enemy.js';
import { Fx } from './game/fx.js';
import { Hazards } from './game/hazards.js';
import { Hero } from './game/hero.js';
import { Path } from './game/path.js';
import { Projectiles } from './game/projectiles.js';
import { Towers, towerStats } from './game/towers.js';
import { Upgrades } from './game/upgrades.js';
import { WaveDirector } from './game/waves.js';
import { BuildMenu } from './ui/buildMenu.js';
import { Hud } from './ui/hud.js';
import { renderPortraits } from './ui/portraits.js';
import { TouchControls } from './ui/touch.js';
import { Level } from './world/level.js';

const DEFAULT_THEME = { background: '#10162b', fog: '#10162b', fogNear: 45, fogFar: 90, hemiSky: '#7f97e0', hemiGround: '#232c22', hemiIntensity: 0.6, moon: '#bcd0ff', moonIntensity: 1.6 };
const CAMERA_HEIGHT = 33;
const CAMERA_BACK = 22;
const CAMERA_FOLLOW = 0.18;    // 鏡頭跟著英雄移動的比例（大部分時間看得到整張地圖）
const PICK_PIXELS = 52;        // 點到台座多近（螢幕像素）就算點到
const NEAR_PEDESTAL = 2.8;     // 英雄離台座多近可以按 E
const SHOW_END_DELAY = 1.6;
const STEP = 1 / 60;           // 加速時拆成小步，碰撞與判定才不會跳過
const GOLD_COLOR = '#ffd75e';

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x10162b);
    this.scene.fog = new THREE.Fog(0x10162b, 45, 90);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    this.cameraTarget = new THREE.Vector3();

    this.assets = new Assets();
    this.input = new Input(this.canvas);
    this.input.onKey = (code) => this.onKey(code);
    this.input.onPointer = (e) => this.onPointer(e);
    this.touch = new TouchControls(this.input, { onPause: () => this.pause(), onTap: (e) => this.onTouchTap(e) });
    this.sfx = new Sfx();
    this.hud = new Hud();
    this.hud.showControls = true;
    this.fx = new Fx(this.scene);
    this.buildMenu = new BuildMenu();
    this.enemies = [];
    this.warnings = [];
    this.state = 'loading';
    this.speed = 1;
    this.hitStop = 0;
    this.clock = new THREE.Clock();
    this.fps = { frames: 0, time: 0, value: 0 };
    this.makeRangeRing();

    document.getElementById('speedBtn').onclick = () => this.toggleSpeed();
    document.getElementById('pauseBtn').onclick = () => this.pause();
    document.getElementById('nextWave').onclick = () => this.callWave();
    addEventListener('resize', () => this.resize());
    this.resize();
    this.setupLights();
  }

  setupLights() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.42;
    pmrem.dispose();
    this.hemi = new THREE.HemisphereLight(0x7f97e0, 0x232c22, 0.6);
    this.scene.add(this.hemi);
    const moon = new THREE.DirectionalLight(0xbcd0ff, 1.6);
    this.moon = moon;
    moon.position.set(-14, 30, 14);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.bias = -0.0006;
    moon.shadow.normalBias = 0.03;
    Object.assign(moon.shadow.camera, { left: -28, right: 28, top: 22, bottom: -22, near: 1, far: 80 });
    this.scene.add(moon);
  }

  // 選台座時地上的範圍圈
  makeRangeRing() {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf2c14e, transparent: true, opacity: 0.85, depthWrite: false }));
    const fill = new THREE.Mesh(new THREE.CircleGeometry(0.96, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf2c14e, transparent: true, opacity: 0.1, depthWrite: false }));
    this.rangeRing = new THREE.Group();
    this.rangeRing.add(ring, fill);
    this.rangeRing.position.y = 0.06;
    this.rangeRing.visible = false;
    this.scene.add(this.rangeRing);
  }

  showRange(center, radius) {
    if (!center || !radius) { this.rangeRing.visible = false; return; }
    this.rangeRing.visible = true;
    this.rangeRing.position.set(center.x, 0.06, center.z);
    this.rangeRing.scale.set(radius, 1, radius);
  }

  resize() {
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.camera.aspect = innerWidth / innerHeight;
    // 窄螢幕（直的或接近正方形）視角放寬，整張地圖才放得下
    this.camera.fov = THREE.MathUtils.clamp(40 * (1.7 / Math.max(1, this.camera.aspect)), 40, 62);
    this.camera.updateProjectionMatrix();
  }

  async load() {
    await this.assets.init();
    this.settings = await loadJson('data/game.json');
    this.characters = await loadJson('data/characters.json');
    // 全景鏡頭看得比較遠，模型統一放大（只影響外觀，碰撞半徑不變）
    for (const [id, def] of Object.entries(this.characters)) { def.id = id; def.scale = (def.scale ?? 1) * (this.settings.modelScale ?? 1); }
    this.towerDefs = await loadJson('data/towers.json');
    this.order = Object.keys(this.settings.difficulties); // 簡單 → 普通 → 困難
    let saved = null;
    try { saved = localStorage.getItem('knight-td-difficulty'); } catch { /* 無痕模式 */ }
    this.difficultyId = this.order.includes(saved) ? saved : this.settings.defaultDifficulty;
    this.upgrades = new Upgrades(await loadJson('data/upgrades.json'));
    const onlyLevel = new URLSearchParams(location.search).get('level');
    this.levelOrder = onlyLevel ? [onlyLevel] : this.settings.levels;
    this.levels = Object.fromEntries(await Promise.all(this.levelOrder.map(async (id) => [id, await loadJson(`data/levels/${encodeURIComponent(id)}.json`)])));

    const waves = Object.values(this.levels).flatMap((l) => l.waves);
    const bossIds = waves.flatMap((w) => w.boss ?? []);
    const summoned = bossIds.flatMap((id) => [...(this.characters[id]?.boss?.skills ?? []), ...(this.characters[id]?.boss?.hardSkills ?? [])].map((s) => s.enemy)).filter(Boolean);
    const enemyIds = [...new Set([...waves.flatMap((w) => (w.spawns ?? []).map((s) => s.enemy)), ...bossIds, ...summoned])];
    for (const id of enemyIds) if (!this.characters[id]) throw new Error(`data/characters.json 沒有「${id}」`);
    for (const t of Object.values(this.towerDefs)) if (!this.characters[t.unit]) throw new Error(`data/towers.json 的「${t.unit}」不在 characters.json`);
    this.heroes = Object.keys(this.characters).filter((id) => this.characters[id].role === 'player' && this.assets.catalog[this.characters[id].model]);

    const shotSpecs = [...this.heroes.map((id) => this.characters[id].shot), ...Object.values(this.towerDefs).map((t) => t.shot)].filter(Boolean);
    const modelIds = [
      ...this.heroes.map((id) => this.characters[id].model),
      ...Object.values(this.towerDefs).map((t) => this.characters[t.unit].model),
      ...enemyIds.map((id) => this.characters[id].model),
      ...shotSpecs.map((s) => s.model).filter((m) => m && this.assets.catalog[m]),
      ...Object.values(this.levels).flatMap((l) => Level.modelIds(l)),
    ];
    await this.assets.preload(modelIds, (done, total) => this.hud.showOverlay({ text: `載入模型 ${done} / ${total}…` }));

    this.towers = new Towers(this, this.towerDefs);
    this.projectiles = new Projectiles(this);
    this.hazards = new Hazards(this);
    this.setLevel(this.levelOrder[0]);
    this.heroList = new Map();
    this.selectHero(this.heroes.includes(this.settings.hero) ? this.settings.hero : this.heroes[0]);
    this.portraits = renderPortraits(this.assets, Object.fromEntries(Object.keys(this.characters).filter((id) => this.characters[id].role === 'player').map((id) => [id, this.characters[id].model])));
    this.projectiles.prepare(shotSpecs);
    this.showTitle();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  setLevel(id) {
    if (id === this.levelId) return;
    this.level?.dispose();
    this.levelId = id;
    this.levelData = this.levels[id];
    // 路線：paths（好幾條）或 path（一條）
    this.paths = (this.levelData.paths ?? [this.levelData.path]).map((p) => new Path(p));
    this.path = this.paths[0];
    this.level = new Level(this, this.levelData, this.paths);
    this.hazards.load(this.levelData.hazards);
    const theme = { ...DEFAULT_THEME, ...this.levelData.theme };
    this.scene.background.set(theme.background);
    this.scene.fog.color.set(theme.fog);
    this.scene.fog.near = theme.fogNear;
    this.scene.fog.far = theme.fogFar;
    this.hemi.color.set(theme.hemiSky);
    this.hemi.groundColor.set(theme.hemiGround);
    this.hemi.intensity = theme.hemiIntensity;
    this.moon.color.set(theme.moon);
    this.moon.intensity = theme.moonIntensity;
    const [x, z] = this.levelData.heroStart;
    this.heroSpawn = { x, z };
  }

  // 台座離哪條路最近、在那條路的第幾公尺
  closestOnPaths(x, z) {
    let best = null;
    for (const path of this.paths) {
      const c = path.closest(x, z);
      if (!best || c.dist < best.dist) best = { ...c, path };
    }
    return best;
  }

  // 塔的數值：等級 → 星星升級 → 關卡特性（迷霧讓遠距離的塔射程變短）
  towerStatsFor(type, level) {
    const def = this.towerDefs[type];
    const stats = this.upgrades.towerStats(type, towerStats(def, level));
    if ((def.kind === 'ranged' || def.kind === 'blast') && this.levelData.rangeMult) stats.range *= this.levelData.rangeMult;
    return stats;
  }

  get difficulty() { return this.settings.difficulties[this.difficultyId]; }
  // 敵人打英雄、騎士兵的傷害：難度越高越痛（無條件進位，1 × 1.5 = 2）
  enemyDamage(amount) { return Math.ceil(amount * (this.difficulty.damageMult ?? 1)); }
  get starKey() { return `${this.levelId}:${this.difficultyId}`; }

  selectDifficulty(id) {
    this.difficultyId = id;
    try { localStorage.setItem('knight-td-difficulty', id); } catch { /* 無痕模式 */ }
  }

  selectHero(id) {
    if (this.hero) this.hero.root.visible = false;
    if (!this.heroList.has(id)) {
      const def = this.characters[id];
      this.heroList.set(id, new Hero(this, def, this.assets.instantiate(def.model)));
    }
    this.hero = this.heroList.get(id);
    this.hero.root.visible = true;
    this.heroId = id;
  }

  // 標題與選英雄：英雄站在路中央揮手（previewAt），鏡頭不會被外牆擋住
  showPreview() {
    const [x, z] = this.levelData.previewAt ?? this.levelData.heroStart;
    this.hero.reset(x, z);
    this.hero.root.rotation.y = 0;
    this.hero.bar.visible = false;
    this.hero.play('Wave');
  }

  // ---------- 畫面流程 ----------
  showTitle() {
    this.state = 'title';
    this.clearField();
    this.showPreview();
    this.hud.showHud(false);
    this.hud.showOverlay({
      title: this.settings.title,
      text: `怪物沿著石板路衝向城門！在路邊蓋塔，再操控英雄親自上場。闖過 ${this.levelOrder.length} 個關卡，守住城門。`,
      buttons: [
        { label: '開始遊戲', onClick: () => this.showHeroSelect() },
        { label: `升級　⭐ ${this.upgrades.available}`, onClick: () => this.showUpgrades(() => this.showTitle()), style: 'third' },
      ],
    });
    this.hud.selectKeys = (code) => (code === 'Enter' ? (this.showHeroSelect(), true) : false);
  }

  showHeroSelect() {
    this.sfx.unlock();
    this.state = 'select';
    this.clearField();
    this.showPreview();
    this.hud.showHud(false);
    this.hud.showHeroSelect({
      characters: this.heroes.map((id) => ({ id, portrait: this.portraits[id], hp: this.characters[id].hp + this.upgrades.add('heroHp'), desc: this.characters[id].desc, skill: this.characters[id].skill?.name ?? '無' })),
      selected: this.heroId,
      levels: this.levelOrder.map((id, i) => ({ id, name: this.levels[id].name, desc: this.levels[id].desc ?? '', locked: !this.isUnlocked(i), max: this.order.length * 3, stars: this.order.reduce((sum, d) => sum + this.upgrades.starsOf(`${id}:${d}`), 0) })),
      level: this.levelId,
      onPickLevel: (id) => {
        if (!this.isUnlocked(this.levelOrder.indexOf(id))) { this.sfx.hurt(); return; }
        this.setLevel(id);
        this.sfx.pickup();
        this.showHeroSelect(); // 星星依關卡不同，整個畫面重畫
      },
      difficulties: this.order.map((id) => ({ id, ...this.settings.difficulties[id], stars: this.upgrades.starsOf(`${this.levelId}:${id}`) })),
      difficulty: this.difficultyId,
      onPickDifficulty: (id) => { this.selectDifficulty(id); this.sfx.pickup(); },
      onPick: (id) => { this.selectHero(id); this.showPreview(); this.sfx.pickup(); },
      onConfirm: () => this.startRun(),
      onBack: () => this.showTitle(),
    });
  }

  // 第一關一開始就能玩；之後的關卡要前一關（任何難度）過關過
  isUnlocked(index) {
    if (index <= 0) return true;
    const prev = this.levelOrder[index - 1];
    return this.order.some((d) => this.upgrades.starsOf(`${prev}:${d}`) > 0);
  }

  showUpgrades(back, message = '') {
    this.state = 'upgrades';
    const items = this.upgrades.defs.map((u) => ({ ...u, level: this.upgrades.level(u.id), max: u.cost.length, cost: this.upgrades.nextCost(u) }));
    this.hud.showUpgrades({
      stars: this.upgrades.available,
      items,
      message,
      onBuy: (id) => {
        const result = this.upgrades.buy(id);
        if (result === 'ok') this.sfx.pickup(); else this.sfx.hurt();
        this.showUpgrades(back, result === 'poor' ? '星星不夠！再去過關拿星星吧。' : result === 'max' ? '這項已經升到最高了。' : '');
      },
      onRefund: () => { this.upgrades.refund(); this.sfx.coin(); this.showUpgrades(back, '星星都退回來了，可以重新分配。'); },
      onBack: back,
    });
  }

  clearField() {
    for (const e of this.enemies) e.destroy();
    this.enemies = [];
    this.towers.clear();
    this.projectiles.clear();
    for (const w of this.warnings) this.removeWarning(w);
    this.warnings = [];
    this.hud.hideBoss();
    this.hud.clearBanner(); // 上一局的提示不要留到選單
    this.closeMenu();
  }

  startRun() {
    this.sfx.unlock();
    this.enterFullscreen();
    this.clearField();
    this.hud.clearKeys();
    this.input.clear();
    this.gold = this.difficulty.startGold + this.upgrades.add('startGold');
    this.level.setLocked(this.difficulty.lockPedestals ? this.levelData.lockedPedestals ?? [] : []);
    this.castleMax = this.settings.castleHearts + this.upgrades.add('castle');
    this.castle = this.castleMax;
    this.kills = 0;
    this.introduced = new Set();
    this.hero.reset(this.heroSpawn.x, this.heroSpawn.z);
    this.hazards.reset();
    this.rockTimer = this.levelData.rockfall?.first ?? 0;
    this.waves = new WaveDirector(this, this.levelData);
    this.state = 'playing';
    this.hud.hideOverlay();
    this.hud.showHud(true);
    this.hud.setCastle(this.castle, this.castleMax);
    this.hud.setSpeed(this.speed);
    this.cameraTarget.set(0, 0, 0);
    this.hud.banner(`${this.levelData.name}・${this.difficultyId}`, 1.8, this.difficulty.color);
    // 這一關的特色（迷霧、岔路…），名稱橫幅之後再說一次
    if (this.levelData.intro) this.fx.after(2.2, () => { if (this.state === 'playing') this.hud.banner(this.levelData.intro, 3.2, '#fde68a'); });
  }

  // 陷阱打到敵人：不硬直、盔甲擋不住
  hazardHit(enemy, amount) {
    if (this.state !== 'playing') return;
    if (this.damageEnemy(enemy, amount, 'burn')) this.fx.floatText(enemy.position.x, 2, enemy.position.z, `-${amount}`);
  }

  // 落石（礦坑）：每隔一段時間挑一座塔，地上先出現預警圈，然後讓那座塔暈眩
  updateRockfall(dt) {
    const rock = this.levelData.rockfall;
    if (!rock || this.waves.index < 0) return;
    this.rockTimer -= dt;
    if (this.rockTimer > 0) return;
    this.rockTimer = rock.every * (0.8 + Math.random() * 0.4);
    const towers = this.towers.list.filter((t) => t.stunned <= 0);
    if (!towers.length) return;
    const tower = towers[Math.floor(Math.random() * towers.length)];
    const { x, z } = tower.pedestal;
    this.warnArea(x, z, 1.7, rock.warn, '#d6b37a', () => {
      this.fx.burst(x, 4, z, 30, '#8b7d6b', 4);
      this.fx.dust(x, 0.5, z, 24);
      this.fx.shake(0.3);
      this.sfx.blast();
      if (tower.pedestal.tower === tower) tower.stun(rock.stun);
      if (this.hero.alive && Math.hypot(this.hero.position.x - x, this.hero.position.z - z) < 1.9) this.hero.takeDamage(rock.damage ?? 2);
    });
  }

  enterFullscreen() {
    if (!this.touch.mode || document.fullscreenElement || !document.documentElement.requestFullscreen) return;
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
  }

  pause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.closeMenu();
      this.hud.showOverlay({
        title: '暫停',
        text: '喘口氣，怪物不會動。',
        buttons: [{ label: '繼續', onClick: () => this.pause() }, { label: '重新開始', onClick: () => this.startRun() }, { label: '回標題', onClick: () => this.showTitle(), style: 'third' }],
      });
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.hud.hideOverlay();
    }
  }

  toggleSpeed() {
    this.speed = this.speed === 1 ? 2 : 1;
    this.hud.setSpeed(this.speed);
  }

  callWave() {
    if (this.state !== 'playing' || !this.waves.waiting) return;
    const bonus = this.waves.callEarly();
    if (bonus) {
      this.addGold(bonus);
      this.hud.toast(`提早出兵 +${bonus} 金幣`, GOLD_COLOR);
    }
  }

  // ---------- 輸入 ----------
  onKey(code) {
    if (this.state === 'title' || this.state === 'select' || this.state === 'upgrades') return this.hud.selectKeys?.(code) ?? false;
    if (this.state === 'paused') {
      if (code === 'KeyP' || code === 'Escape') { this.pause(); return true; }
      return false;
    }
    if (this.state !== 'playing') return false;
    if (this.buildMenu.open) {
      const digit = /^Digit([1-9])$/.exec(code) ?? /^Numpad([1-9])$/.exec(code);
      if (digit) { this.buildMenu.pick(Number(digit[1]) - 1); return true; }
      if (code === 'Escape' || code === 'KeyE') { this.closeMenu(); return true; }
    }
    if (code === 'KeyE') { this.openNearestMenu(); return true; }
    if (code === 'KeyN') { this.callWave(); return true; }
    if (code === 'KeyF') { this.toggleSpeed(); return true; }
    if (code === 'KeyP' || code === 'Escape') { this.pause(); return true; }
    return false;
  }

  // 用螢幕距離找台座：點到台座或站在上面的塔都算
  pedestalAt(clientX, clientY) {
    let best = null, bestD = PICK_PIXELS;
    const v = new THREE.Vector3();
    for (const p of this.level.pedestals) {
      if (p.locked) continue;
      for (const h of [0.3, 1.5]) {
        v.set(p.x, h, p.z).project(this.camera);
        const sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight;
        const d = Math.hypot(sx - clientX, sy - clientY);
        if (d < bestD) { best = p; bestD = d; }
      }
    }
    return best;
  }

  onPointer(e) {
    if (this.state !== 'playing') return;
    const pedestal = this.pedestalAt(e.clientX, e.clientY);
    if (pedestal) { this.openMenu(pedestal); return; }
    if (this.buildMenu.open) { this.closeMenu(); return; }
    if (e.pointerType !== 'touch') this.input.attack(); // 觸控用攻擊鍵，點地面不算攻擊
  }

  onTouchTap(e) {
    if (this.state !== 'playing') return false;
    const pedestal = this.pedestalAt(e.clientX, e.clientY);
    if (pedestal) { this.openMenu(pedestal); return true; }
    if (this.buildMenu.open) { this.closeMenu(); return true; }
    return false;
  }

  openNearestMenu() {
    const { x, z } = this.hero.position;
    let best = null, bestD = NEAR_PEDESTAL;
    for (const p of this.level.pedestals) {
      if (p.locked) continue;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bestD) { best = p; bestD = d; }
    }
    if (best) this.openMenu(best);
  }

  // ---------- 蓋塔選單 ----------
  screenOf(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  }

  openMenu(pedestal) {
    this.closeMenu();
    this.menuPedestal = pedestal;
    pedestal.selected = true;
    this.sfx.pickup();
    const { tower } = pedestal;
    const s = this.screenOf(pedestal.x, 1, pedestal.z);
    const poor = () => { this.hud.toast('金幣不夠', '#ff9c8f'); this.sfx.hurt(); };
    const showDefault = () => this.showRange(tower?.center, tower?.stats.range);
    if (!tower) {
      const options = Object.entries(this.towerDefs).map(([type, def]) => {
        const cost = this.towers.cost(type);
        const stats = this.towerStatsFor(type, 0);
        const spot = def.kind === 'ranged' || def.kind === 'blast' ? pedestal : this.closestOnPaths(pedestal.x, pedestal.z);
        return {
          image: this.portraits[def.unit], name: def.name, note: def.desc, cost, enabled: this.gold >= cost,
          onPick: () => this.build(pedestal, type), onDenied: poor, onHover: () => this.showRange(spot, stats.range),
        };
      });
      this.buildMenu.show({ title: '蓋什麼塔？', x: s.x, y: s.y, options, onHoverEnd: () => this.showRange(null) });
      this.showRange(null);
      return;
    }
    const options = [];
    const next = tower.nextCost;
    if (next !== null) {
      const nextStats = this.towerStatsFor(tower.type, tower.level + 1);
      options.push({ icon: '⬆️', name: `升到 Lv${tower.level + 2}`, note: tower.def.levels[tower.level + 1].note, cost: next, enabled: this.gold >= next,
        onPick: () => this.upgradeTower(tower), onDenied: poor, onHover: () => this.showRange(tower.center, nextStats.range) });
    } else {
      options.push({ icon: '⭐', name: '已經是最高級', note: tower.def.levels[tower.level].note, cost: null, enabled: false, onDenied: () => {} });
    }
    options.push({ icon: '💰', kind: 'sell', name: '賣掉', note: `退回 ${Math.round(this.settings.sellRefund * 100)}% 金幣`, cost: tower.refund, refund: true, enabled: true, onPick: () => this.sell(tower) });
    this.buildMenu.show({ title: `${tower.def.name} Lv${tower.level + 1}`, x: s.x, y: s.y, options, onHoverEnd: showDefault });
    showDefault();
  }

  closeMenu() {
    if (this.menuPedestal) this.menuPedestal.selected = false;
    this.menuPedestal = null;
    this.buildMenu.hide();
    this.showRange(null);
  }

  addGold(amount) {
    this.gold += amount;
    this.hud.setGold(this.gold);
  }

  build(pedestal, type) {
    const cost = this.towers.cost(type);
    if (this.gold < cost || pedestal.tower) return false;
    this.addGold(-cost);
    this.towers.build(pedestal, type);
    this.sfx.coin();
    this.closeMenu();
    return true;
  }

  upgradeTower(tower) {
    const cost = tower.nextCost;
    if (cost === null || this.gold < cost) return false;
    this.addGold(-cost);
    tower.upgrade();
    this.sfx.win();
    this.closeMenu();
    return true;
  }

  sell(tower) {
    this.addGold(tower.refund);
    this.fx.floatText(tower.pedestal.x, 2.5, tower.pedestal.z, `+${tower.refund}`, GOLD_COLOR);
    this.towers.sell(tower);
    this.sfx.coin();
    this.closeMenu();
  }

  // ---------- 戰鬥 ----------
  spawnEnemy(id, s, lane, path = this.paths[0]) {
    const def = this.characters[id];
    const EnemyClass = def.boss ? Boss : Enemy;
    const enemy = new EnemyClass(this, def, this.assets.instantiate(def.model), s, lane, path);
    this.enemies.push(enemy);
    if (def.intro && !this.introduced.has(id)) { // 新敵人第一次出場：告訴玩家怎麼對付
      this.introduced.add(id);
      this.hud.banner(def.intro, 3, '#fde68a');
    }
    return enemy;
  }

  blockers() {
    const list = this.towers.blockers();
    if (this.hero.canBlock) list.unshift(this.hero);
    return list;
  }

  nearestEnemy(position, range) {
    let best = null, bestDist = range;
    for (const e of this.enemies) {
      if (!e.canBeHit) continue;
      const d = Math.hypot(e.position.x - position.x, e.position.z - position.z);
      if (d < bestDist) { best = e; bestDist = d; }
    }
    return best;
  }

  // 敵人最擠的地方（英雄的範圍技能用）
  crowdedSpot(position, reach, radius) {
    const near = this.enemies.filter((e) => e.alive && Math.hypot(e.position.x - position.x, e.position.z - position.z) <= reach);
    let best = null, bestCount = 0;
    for (const e of near) {
      const count = near.filter((o) => Math.hypot(o.position.x - e.position.x, o.position.z - e.position.z) <= radius).length + (e.def.boss ? 3 : 0);
      if (count > bestCount) { best = e; bestCount = count; }
    }
    return best ? { x: best.position.x, z: best.position.z } : null;
  }

  warnArea(x, z, radius, delay, color, onDone) {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15, depthWrite: false }));
    mesh.position.set(x, 0.08, z);
    mesh.scale.set(radius, 1, radius);
    this.scene.add(mesh);
    this.warnings.push({ mesh, time: 0, delay, onDone });
  }

  removeWarning(w) {
    this.scene.remove(w.mesh);
    w.mesh.geometry.dispose();
    w.mesh.material.dispose();
  }

  updateWarnings(dt) {
    this.warnings = this.warnings.filter((w) => {
      w.time += dt;
      w.mesh.material.opacity = 0.15 + 0.4 * Math.min(1, w.time / w.delay);
      if (w.time < w.delay) return true;
      this.removeWarning(w);
      w.onDone();
      return false;
    });
  }

  hurtArea(x, z, radius, damage, source) {
    for (const b of this.blockers()) {
      if (Math.hypot(b.position.x - x, b.position.z - z) <= radius + b.radius) b.takeDamage(damage, source);
    }
  }

  burnDamage(enemy, amount) {
    if (this.state !== 'playing') return;
    if (this.damageEnemy(enemy, amount, 'burn')) this.fx.floatText(enemy.position.x, 2, enemy.position.z, `-${amount}`);
    this.sfx.burn();
  }

  damageEnemy(enemy, amount, mode = 'plain') {
    if (!enemy.takeHit(amount, mode)) return false;
    this.fx.sparks(enemy.position.x, 1, enemy.position.z);
    if (!enemy.alive) {
      this.kills += 1;
      this.fx.bones(enemy.position.x, 1, enemy.position.z);
      this.sfx.bones();
      const gold = Math.max(1, Math.round((enemy.def.gold ?? 0) * (this.difficulty.goldMult ?? 1)));
      if (gold && this.state === 'playing') {
        this.addGold(gold);
        this.fx.floatText(enemy.position.x, 2.4, enemy.position.z, `+${gold}`, GOLD_COLOR);
        this.sfx.coin();
      }
      if (enemy.def.boss) {
        this.hud.hideBoss();
        this.hud.banner(`擊敗${enemy.def.boss.name}！`, 2);
        this.fx.shake(0.6);
      }
    }
    return true;
  }

  onLeak(enemy) {
    if (enemy.removed || this.state !== 'playing') return;
    enemy.removed = true;
    const leak = enemy.def.leak ?? 1;
    this.castle = Math.max(0, this.castle - leak);
    this.hud.setCastle(this.castle, this.castleMax);
    this.hud.flashScreen('#ff3b2f');
    this.fx.shake(0.35);
    this.sfx.hurt();
    const path = enemy.path ?? this.paths[0];
    const end = path.at(path.length);
    this.fx.floatText(end.x, 4, end.z, `-${leak}`, '#ff6b6b');
    if (enemy.def.boss) this.hud.hideBoss();
    if (this.castle <= 0) this.endRun(false);
  }

  onHeroDown() {
    this.hud.toast(`${this.heroId}倒下了，${Math.ceil(this.hero.respawnIn)} 秒後復活`, '#ff9c8f');
  }

  // 正在打架的敵人互相推開，才不會疊在一起
  separateEnemies() {
    const list = this.enemies.filter((e) => e.alive && e.state !== 'walk');
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i].position, b = list[j].position;
        const min = list[i].radius + list[j].radius;
        const dx = b.x - a.x, dz = b.z - a.z;
        const dist = Math.hypot(dx, dz) || 0.01;
        if (dist >= min) continue;
        const push = ((min - dist) / dist) * 0.5;
        if (!list[i].def.boss) { a.x -= dx * push; a.z -= dz * push; }
        if (!list[j].def.boss) { b.x += dx * push; b.z += dz * push; }
      }
    }
  }

  starsFor(castle) {
    const ratio = castle / this.castleMax;
    const { three, two } = this.settings.stars;
    return ratio >= three ? 3 : ratio >= two ? 2 : 1;
  }

  endRun(won) {
    if (this.state !== 'playing') return;
    this.state = 'ending';
    this.closeMenu();
    const buttons = (first) => [
      { label: first, onClick: () => this.startRun() },
      { label: `升級　⭐ ${this.upgrades.available}`, onClick: () => this.showUpgrades(() => this.showEndAgain()), style: 'third' },
      { label: '換英雄', onClick: () => this.showHeroSelect() },
    ];
    if (won) {
      const stars = this.starsFor(this.castle);
      const best = this.upgrades.recordStars(this.starKey, stars);
      const next = this.levelOrder[this.levelOrder.indexOf(this.levelId) + 1];
      let list = buttons('再玩一次');
      if (next) { // 過關後主要按鈕是下一關
        list[0].style = 'second';
        list = [{ label: `下一關：${this.levels[next].name}`, onClick: () => { this.setLevel(next); this.startRun(); } }, ...list];
      }
      this.sfx.win();
      this.hero.play('Wave');
      const record = best ? `${this.difficultyId}新紀錄！可以去升級了。` : `${this.difficultyId}的最好紀錄是 ${this.upgrades.starsOf(this.starKey)} 顆星。`;
      this.endScreen = () => {
        const body = this.hud.showOverlay({ title: next ? '守住城門了！' : '全部破關！', text: `城門剩下 ${this.castle} / ${this.castleMax} 顆愛心，打倒 ${this.kills} 隻怪物。\n${record}`, buttons: list });
        body.innerHTML = `<div class="stars">${[1, 2, 3].map((n) => `<span class="${n <= stars ? '' : 'off'}">⭐</span>`).join('')}</div>`;
      };
    } else {
      this.sfx.lose();
      this.endScreen = () => this.hud.showOverlay({ title: '城門被攻破了…', text: `撐到第 ${this.waves.number} / ${this.waves.total} 波，打倒 ${this.kills} 隻怪物。\n試試在轉角多蓋幾座塔，或先升級塔再出兵。`, buttons: buttons('再試一次') });
    }
    this.endTimer = setTimeout(() => this.showEndAgain(), SHOW_END_DELAY * 1000);
  }

  showEndAgain() {
    this.state = 'ending';
    this.hud.clearKeys();
    this.hud.showHud(false);
    this.endScreen();
  }

  // ---------- 每一格 ----------
  updateCamera(dt) {
    if (this.state === 'title' || this.state === 'select' || this.state === 'upgrades') {
      const t = this.clock.elapsedTime * 0.25;
      const angle = this.state === 'title' ? t : Math.sin(t * 2) * 0.45;
      const distance = (this.state === 'title' ? 5.6 : 8.2) * this.hero.def.scale;
      const lookY = this.state === 'title' ? 0.25 : -1.3; // 選英雄的面板比較高，看低一點英雄才會在面板上方
      const p = { x: this.hero.position.x, z: this.hero.position.z, scale: this.hero.def.scale };
      this.camera.position.set(p.x + Math.sin(angle) * distance, 1.6 * p.scale, p.z + Math.cos(angle) * distance);
      this.camera.lookAt(p.x, lookY, p.z);
      return;
    }
    const p = this.hero.position;
    this.cameraTarget.lerp(new THREE.Vector3(p.x * CAMERA_FOLLOW, 0, p.z * CAMERA_FOLLOW), Math.min(1, dt * 3));
    this.camera.position.set(this.cameraTarget.x + 0.8, CAMERA_HEIGHT, this.cameraTarget.z + CAMERA_BACK).add(this.fx.offset);
    this.camera.lookAt(this.cameraTarget.x + 0.8, 0, this.cameraTarget.z + 1.6);
  }

  step(dt) {
    if (this.state === 'playing') {
      this.waves.update(dt);
      this.hazards.update(dt);
      this.updateRockfall(dt);
      this.hero.update(dt, this.input);
      this.level.constrain(this.hero.position, this.hero.radius);
      this.updateWarnings(dt);
    }
    if (this.state === 'playing' || this.state === 'ending') {
      this.towers.update(dt);
      for (const e of this.enemies) e.update(dt);
      this.separateEnemies();
      this.projectiles.update(dt);
      for (const e of this.enemies) if (e.removed) e.destroy();
      this.enemies = this.enemies.filter((e) => !e.removed);
      for (const e of this.enemies) e.updateVisual(dt);
      if (this.state === 'playing' && this.waves.finished && this.enemies.length === 0) this.endRun(true);
    }
    this.hero.updateVisual(dt);
    this.level.update(dt);
  }

  updateHud() {
    const { waves, hero } = this;
    this.hud.setGold(this.gold);
    this.hud.setWave(waves.number, waves.total, this.difficultyId, this.difficulty.color);
    this.hud.setNextWave(waves.waiting ? { seconds: waves.countdown, bonus: waves.index < 0 ? 0 : Math.ceil(waves.countdown * this.settings.earlyGoldPerSecond), boss: waves.nextIsBoss, first: waves.index < 0 } : null);
    const skill = hero.skill ? { name: hero.skill.name, color: hero.skill.color, cooldown: hero.skillCooldown } : null;
    this.hud.setHero({ portrait: this.portraits[this.heroId], name: this.heroId, hp: hero.alive ? hero.hp : 0, max: hero.maxHp, respawn: hero.alive ? 0 : hero.respawnIn, skill });
    this.touch.setSkill(skill);
    let hint = '';
    if (!this.buildMenu.open && !this.touch.mode && hero.alive) {
      const near = this.level.pedestals.find((p) => !p.locked && Math.hypot(p.x - hero.position.x, p.z - hero.position.z) < NEAR_PEDESTAL);
      if (near) hint = near.tower ? '按 E 升級或賣掉' : '按 E 蓋塔';
    }
    if (!hint && waves.index < 0 && !this.towers.list.length) hint = this.touch.mode ? '點發亮的台座蓋塔' : '點發亮的台座蓋塔，蓋好了按 N 開始出兵';
    this.hud.hint(hint);
    if (this.menuPedestal) { // 鏡頭會跟著英雄微動，選單跟著台座
      const s = this.screenOf(this.menuPedestal.x, 1, this.menuPedestal.z);
      this.buildMenu.place(s.x, s.y);
    }
  }

  frame() {
    const raw = Math.min(this.clock.getDelta(), 0.05);
    this.input.update(raw);
    this.touch.update(this.state);
    this.fx.update(raw);
    if (this.state !== 'paused') {
      let dt = raw * (this.state === 'playing' || this.state === 'ending' ? this.speed : 1);
      if (this.hitStop > 0) { this.hitStop -= raw; dt = 0; }
      while (dt > 0) { const d = Math.min(STEP, dt); this.step(d); dt -= d; }
      if (this.hitStop > 0) this.step(0);
    }
    if (this.state === 'playing') this.updateHud();
    this.updateCamera(raw);
    this.renderer.render(this.scene, this.camera);
    this.fps.frames += 1;
    this.fps.time += raw;
    if (this.fps.time >= 1) { this.fps.value = this.fps.frames / this.fps.time; this.fps.frames = 0; this.fps.time = 0; }
  }

  // 測試用：不畫面、直接快轉
  simulate(seconds, dt = 1 / 30) {
    for (let t = 0; t < seconds && (this.state === 'playing' || this.state === 'ending'); t += dt) {
      this.input.update(dt);
      this.fx.update(dt);
      this.step(dt);
    }
  }
}

const game = new Game();
window.__game = game;
game.load().catch((err) => {
  console.error(err);
  game.hud.showOverlay({ title: '載入失敗', text: err.message });
});
