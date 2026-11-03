// 遊戲主程式：把素材、關卡、角色組起來，跑主迴圈。
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Assets, loadJson } from './core/assets.js';
import { Input } from './core/input.js';
import { Sfx } from './core/sfx.js';
import { Boss } from './game/boss.js';
import { Chests } from './game/chests.js';
import { Enemy } from './game/enemy.js';
import { Clones } from './game/clones.js';
import { Coins } from './game/coins.js';
import { Fx } from './game/fx.js';
import { Hazards } from './game/hazards.js';
import { Items } from './game/items.js';
import { Player } from './game/player.js';
import { Progress } from './game/progress.js';
import { Projectiles } from './game/projectiles.js';
import { Shop } from './game/shop.js';
import { Skills, pushAway } from './game/skills.js';
import { WaveDirector } from './game/waves.js';
import { Hud } from './ui/hud.js';
import { renderPortraits } from './ui/portraits.js';
import { ShopPanel } from './ui/shopPanel.js';
import { TouchControls } from './ui/touch.js';
import { Level } from './world/level.js';
import { ShopStage } from './world/shopStage.js';

const CAMERA_OFFSET = new THREE.Vector3(0, 11.5, 9.8);
const CAMERA_LOOK_HEIGHT = 0.8;
const CAMERA_INSET = { x: 10, zMin: 8, zMax: 5 }; // 鏡頭不跑出場地，離邊界的距離
// 月光墓園的光線；其他關卡在 theme 寫自己的
const DEFAULT_THEME = { background: '#10162b', fog: '#10162b', fogNear: 32, fogFar: 58, hemiSky: '#7f97e0', hemiGround: '#232c22', hemiIntensity: 0.55, moon: '#bcd0ff', moonIntensity: 1.5 };
const HIT_STOP = 0.055;
const SEPARATION_PUSH = 0.5;
const SHOW_END_DELAY = 1.6;
const CROSS_GAP = 0.08; // 十字斬兩刀的間隔，做出「答、答」的節奏
const CROSS_ANGLE = Math.PI / 4;
const CROSS_COLOR = 0xd9c8ff;
const SELECT_SWAY = 0.45; // 選角時鏡頭只小幅擺動，角色才一直面向玩家
const AMBUSH_COLOR = '#c4b5fd';
const POTION_COLORS = { 綠藥水: '#4ade80', 紅藥水: '#f87171' };

// 有 base 的角色先沿用 base 的數值，自己寫的欄位再蓋上去。skill 是角色自己的，不繼承
function resolveCharacters(characters) {
  return Object.fromEntries(Object.entries(characters).map(([id, def]) => [id, { ...characters[def.base], skill: undefined, ...def, id }]));
}

const pickLine = (lines) => lines[Math.floor(Math.random() * lines.length)];

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
    this.scene.fog = new THREE.Fog(0x10162b, 32, 58);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 150);
    this.cameraTarget = new THREE.Vector3();

    this.assets = new Assets();
    this.input = new Input(this.canvas);
    this.input.onPause = () => this.togglePause();
    this.touch = new TouchControls(this.input, { onPause: () => this.togglePause() });
    this.sfx = new Sfx();
    this.hud = new Hud();
    this.fx = new Fx(this.scene);
    this.enemies = [];
    this.state = 'loading';
    this.score = 0;
    this.hitStop = 0;
    this.attackMultiplier = 1;
    this.shotSide = 1;
    this.clock = new THREE.Clock();
    this.fps = { frames: 0, time: 0, value: 0 };

    addEventListener('resize', () => this.resize());
    this.resize();
    this.setupLights();
  }

  setupLights() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.42; // 模型的金屬度偏高，沒有環境光會變黑
    pmrem.dispose();

    this.hemi = new THREE.HemisphereLight(0x7f97e0, 0x232c22, 0.55);
    this.scene.add(this.hemi);
    const moon = new THREE.DirectionalLight(0xbcd0ff, 1.5);
    this.moon = moon;
    moon.position.set(-14, 26, 12);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.bias = -0.0006;
    moon.shadow.normalBias = 0.03;
    Object.assign(moon.shadow.camera, { left: -30, right: 30, top: 28, bottom: -28, near: 1, far: 70 });
    this.scene.add(moon);
  }

  resize() {
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.shopStage?.resize(innerWidth / innerHeight);
  }

  async load() {
    await this.assets.init();
    this.settings = await loadJson('data/game.json');
    this.characters = resolveCharacters(await loadJson('data/characters.json'));
    const onlyLevel = new URLSearchParams(location.search).get('level'); // 測試新關卡用
    this.levelOrder = onlyLevel ? [onlyLevel] : this.settings.levels;
    this.levels = Object.fromEntries(await Promise.all(this.levelOrder.map(async (id) => [id, await loadJson(`data/levels/${encodeURIComponent(id)}.json`)])));
    const allLevels = Object.values(this.levels);
    const allWaves = allLevels.flatMap((l) => l.waves);

    const bossIds = allWaves.flatMap((w) => w.boss ?? []);
    const summoned = bossIds.flatMap((id) => this.characters[id]?.boss?.skills.map((s) => s.enemy) ?? []).filter(Boolean);
    const enemyIds = [...allWaves.flatMap((w) => (w.spawns ?? []).map((s) => s.enemy)), ...bossIds, ...summoned];
    for (const id of enemyIds) if (!this.characters[id]) throw new Error(`data/characters.json 沒有「${id}」`);
    this.itemConfig = await loadJson('data/items.json');
    // 道具模型可以還沒匯入（會用程式畫的藥瓶代替），所以只載入清單裡有的
    this.coinConfig = await loadJson('data/coins.json');
    this.shopConfig = await loadJson('data/shop.json');
    this.chestConfig = await loadJson('data/chests.json');
    const itemModels = [...Items.modelIds(this.itemConfig), ...Coins.modelIds(this.coinConfig), ...Chests.modelIds(this.chestConfig), this.shopConfig.stage.building, this.shopConfig.stage.keeper].filter((id) => id && this.assets.catalog[id]);
    // 模型還沒匯入的角色先不列出，匯入後就會自動出現
    this.playable = Object.keys(this.characters).filter((id) => this.characters[id].role === 'player' && this.assets.catalog[this.characters[id].model]);
    if (!this.playable.includes(this.settings.player)) throw new Error(`data/game.json 的預設角色「${this.settings.player}」無法使用`);
    const shotModels = this.playable.flatMap((id) => [this.characters[id].shot?.model, this.characters[id].boost?.shot?.model]).filter((id) => this.assets.catalog[id]);
    const modelIds = [...this.playable.map((id) => this.characters[id].model), ...shotModels, ...enemyIds.map((id) => this.characters[id].model), ...allLevels.flatMap((l) => Level.modelIds(l)), ...itemModels];
    await this.assets.preload(modelIds, (done, total) => {
      this.hud.showOverlay({ text: `載入模型 ${done} / ${total}…` });
    });

    this.progress = new Progress(this.levelOrder);
    this.hazards = new Hazards(this);
    this.setLevel(this.levelOrder[0]);
    this.items = new Items(this, this.itemConfig);
    this.coins = new Coins(this, this.coinConfig);
    this.hud.setCoins(this.coins.wallet.total);
    this.shop = new Shop(this, this.shopConfig);
    this.skills = new Skills(this);
    this.chests = new Chests(this, this.chestConfig);
    this.shopPanel = new ShopPanel();
    this.shopStage = new ShopStage(this, this.shopConfig.stage);
    this.shopStage.resize(innerWidth / innerHeight);
    this.projectiles = new Projectiles(this);
    this.clones = new Clones(this);
    this.players = new Map();
    this.selectCharacter(this.settings.player);
    this.portraits = renderPortraits(this.assets, Object.fromEntries(this.playable.map((id) => [id, this.characters[id].model])));
    this.hud.setLegend(Object.values(this.itemConfig.items));
    this.showTitle();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // 換關：場景、光線、陷阱都換掉
  setLevel(id) {
    if (id === this.levelId) return;
    this.level?.dispose();
    this.levelId = id;
    this.levelData = this.levels[id];
    this.level = new Level(this, this.levelData);
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
    const { halfWidth: W, halfDepth: D } = this.levelData.arena;
    this.cameraBounds = { x: Math.max(0, W - CAMERA_INSET.x), zMin: Math.min(0, -(D - CAMERA_INSET.zMin)), zMax: Math.max(0, D - CAMERA_INSET.zMax) };
  }

  // 每個角色只建一次，換角色時切換顯示
  selectCharacter(id) {
    if (id === this.characterId) return;
    if (this.player) this.player.root.visible = false;
    if (!this.players.has(id)) {
      const def = this.characters[id];
      this.players.set(id, new Player(this, def, this.assets.instantiate(def.model)));
    }
    this.player = this.players.get(id);
    this.player.root.visible = true;
    this.characterId = id;
    this.clones.clear();
  }

  // 標題與選角畫面：選中的角色站在場上揮手
  showPreview() {
    const [x, z] = this.levelData.playerStart;
    this.player.reset(x, z);
    this.player.root.rotation.y = 0;
    this.player.play('Wave');
  }

  showTitle() {
    this.state = 'title';
    this.showPreview();
    this.hud.showHud(false);
    this.hud.showOverlay({
      title: this.settings.title,
      text: `闖過 ${this.levelOrder.length} 個關卡，擊退怪物大軍！越後面的關卡陷阱越多。`,
      button: '開始遊戲',
      onClick: () => this.showCharacterSelect(),
      second: '商店',
      onSecond: () => this.showShop(() => this.showTitle()),
    });
  }

  // 商店是獨立的 3D 畫面，離開時回到 back 指定的畫面
  showShop(back) {
    this.sfx.unlock();
    this.clearField();
    this.state = 'shop';
    this.hud.hideOverlay();
    this.hud.showHud(false);
    const { lines } = this.shopConfig;
    this.shopPanel.open({
      characters: this.playable.map((id) => ({ id, portrait: this.portraits[id] })),
      selected: this.characterId,
      coins: this.coins.wallet.total,
      getOffers: (id) => this.shop.offers(id),
      onBuy: (offer, id) => this.buyFromShop(offer, id),
      onReset: () => {
        this.shop.resetAll();
        this.shopPanel.setCoins(0);
        this.hud.setCoins(0);
        this.shopPanel.say(pickLine(lines.reset));
      },
      onBack: () => {
        this.shopPanel.close();
        back();
      },
    });
    this.shopPanel.say(pickLine(lines.hello));
  }

  buyFromShop(offer, characterId) {
    const { lines } = this.shopConfig;
    const result = this.shop.buy(offer.kind, offer.id, characterId);
    if (result === 'ok') {
      this.sfx.coin();
      this.sfx.pickup();
      this.shopStage.wave();
      this.shopPanel.setCoins(this.coins.wallet.total);
      this.hud.setCoins(this.coins.wallet.total);
      this.shopPanel.say(pickLine(lines.buy));
    } else {
      this.sfx.hurt();
      this.shopPanel.say(pickLine(lines[result]));
    }
  }

  showCharacterSelect() {
    this.sfx.unlock();
    this.clearField();
    this.state = 'select';
    this.showPreview();
    this.hud.showHud(false);
    this.hud.showCharacterList({
      characters: this.playable.map((id) => ({ id, portrait: this.portraits[id], hp: this.characters[id].hp + this.shop.total('maxHp', id), moveSpeed: this.characters[id].moveSpeed, desc: this.characters[id].desc })),
      selected: this.characterId,
      levels: this.levelOrder.map((id) => ({ id, name: this.levels[id].name, desc: this.levels[id].desc ?? '', locked: !this.progress.isUnlocked(id), cleared: this.progress.isCleared(id) })),
      selectedLevel: this.levelId,
      onPick: (id) => {
        this.selectCharacter(id);
        this.showPreview();
        this.sfx.pickup();
      },
      onPickLevel: (id) => {
        this.setLevel(id);
        this.showPreview();
        this.sfx.pickup();
      },
      onConfirm: () => this.startRun(),
      onBack: () => this.showTitle(),
      onShop: () => this.showShop(() => this.showCharacterSelect()),
    });
  }

  clearField() {
    for (const e of this.enemies) e.destroy();
    this.enemies = [];
    this.hud.hideBoss();
    this.items.reset();
    this.coins.reset();
    this.hazards.reset();
    this.chests?.reset();
    this.projectiles.clear();
    this.clones.hide();
  }

  startRun() {
    this.sfx.unlock();
    this.enterFullscreen();
    this.clearField();
    this.input.clear(); // 確認用的空白鍵不算攻擊
    this.score = 0;
    this.attackMultiplier = 1;
    this.revived = false;
    const [x, z] = this.levelData.playerStart;
    this.player.reset(x, z);
    this.skills.reset();
    this.projectiles.prepare(this.player.def);
    this.clones.prepare(Object.values(this.itemConfig.items).find((i) => i.effect === 'clones')?.count ?? 0);
    this.waves = new WaveDirector(this, this.levelData);
    this.state = 'playing';
    this.hud.hideOverlay();
    this.hud.showHud(true);
    this.hud.setHearts(this.player.hp, this.player.maxHp);
    this.hud.setScore(0);
    this.canvas.focus?.();
    document.activeElement?.blur();
    this.cameraTarget.copy(this.player.position);
  }

  // 手機瀏覽器的網址列會吃掉一大塊畫面：觸控模式出發時（按鈕的點擊裡才允許）切全螢幕並鎖橫向。
  // iPhone Safari 不支援全螢幕，失敗就照常玩
  enterFullscreen() {
    if (!this.touch.mode || document.fullscreenElement || !document.documentElement.requestFullscreen) return;
    document.documentElement.requestFullscreen({ navigationUI: 'hide' })
      .then(() => screen.orientation?.lock?.('landscape'))
      .catch(() => {});
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.hud.showOverlay({ title: '暫停', text: '喘口氣，怪物不會動。', button: '繼續', onClick: () => this.togglePause() });
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.hud.hideOverlay();
      document.activeElement?.blur();
    }
  }

  spawnEnemy(id, x, z) {
    const def = this.characters[id];
    const EnemyClass = def.boss ? Boss : Enemy;
    const enemy = new EnemyClass(this, def, this.assets.instantiate(def.model), x, z);
    this.enemies.push(enemy);
    return enemy;
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

  // 一次攻擊裡（含分身、刀波）同一隻敵人只算一下，骷髏才維持「打兩下」
  resolvePlayerAttack() {
    const swing = new Set();
    const { def } = this.player;
    const boosted = this.items.buff('waveSlash');
    let hits = 0;
    for (const attacker of [this.player, ...this.clones.active]) {
      const yaw = attacker.root.rotation.y;
      if (def.shot) {
        const spec = { ...def.shot, ...(boosted ? def.boost?.shot : null) };
        for (const offset of this.shotOffsets(def)) this.projectiles.fire(attacker.position, yaw + offset, spec, swing);
        continue;
      }
      hits += this.sweep(attacker, swing);
      // boosted 的 model 是藥水瓶，刀波不能用
      if (boosted) this.projectiles.fire(attacker.position, yaw, { ...boosted, visual: 'wave', pierce: true, model: null, ...def.boost?.wave }, swing);
    }
    if (hits > 0) {
      this.sfx.hit();
      this.fx.shake(0.22);
      this.hitStop = HIT_STOP;
    }
    if (def.slash === 'cross') this.fx.after(CROSS_GAP, () => (hits > 0 ? this.sfx.hit() : this.sfx.swing()));
  }

  // 多重射擊：第一發一定瞄準目標，其他的往兩側散開，買了不會反而打不到正前方
  shotOffsets(def) {
    const count = 1 + this.shop.total('shots', def.id);
    const spread = THREE.MathUtils.degToRad(def.shot.spread ?? 0);
    this.shotSide = -this.shotSide; // 兩發時左右輪流
    return Array.from({ length: count }, (_, i) => Math.ceil(i / 2) * spread * (i % 2 ? this.shotSide : -this.shotSide));
  }

  sweep(attacker, swing) {
    const { attackRange: range, attackArcDegrees } = this.player.def;
    const yaw = attacker.root.rotation.y;
    const arc = THREE.MathUtils.degToRad(attackArcDegrees);
    const cross = this.player.def.slash === 'cross';
    if (cross) this.crossSlash(attacker.position.clone(), yaw, range);
    else this.fx.slashAt(attacker.position, yaw, arc, range);
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const cosLimit = Math.cos(arc / 2);
    let hits = 0;
    for (const chest of this.chests.targets) {
      const dx = chest.position.x - attacker.position.x, dz = chest.position.z - attacker.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > range + chest.radius || (dist > 0.6 && (dx * fx + dz * fz) / dist < cosLimit)) continue;
      if (this.chests.hit(chest, swing)) hits += 1;
    }
    for (const e of this.enemies) {
      if (swing.has(e) || !e.canBeHit) continue;
      const dx = e.position.x - attacker.position.x;
      const dz = e.position.z - attacker.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > range + e.radius) continue;
      if (dist > 0.6 && (dx * fx + dz * fz) / dist < cosLimit) continue;
      swing.add(e);
      const damage = this.playerDamage(e);
      if (!this.damageEnemy(e, damage, attacker.position.x, attacker.position.z)) continue;
      hits += 1;
      if (this.attackMultiplier > 1) this.fx.floatText(e.position.x, 2.3, e.position.z, `突襲 -${damage}`, AMBUSH_COLOR);
      if (cross) this.fx.after(CROSS_GAP, () => this.secondStrike(e));
    }
    return hits;
  }

  // 第二刀的打擊感：傷害在第一刀算過，這裡只有畫面
  secondStrike(enemy) {
    this.fx.sparks(enemy.position.x, 1, enemy.position.z);
    this.fx.shake(0.14);
    if (!enemy.removed) enemy.flash(0xffffff);
  }

  // 魔法師出手前，杖頭（本體和分身）蓄力到放出那一刻
  castEffects() {
    const { cast, shot, attackHitTime, attackSpeed } = this.player.def;
    if (!cast) return;
    const { side = 0, height = 0.9, ahead = 0 } = shot.muzzle ?? {};
    const spot = new THREE.Vector3(side, height, ahead);
    for (const attacker of [this.player, ...this.clones.active]) this.fx.castGlow(attacker.root, spot, cast, attackHitTime / attackSpeed);
  }

  // 盜賊：一下攻擊兩道交叉的刀痕，傷害只算一次
  crossSlash(position, yaw, range) {
    this.fx.crossCut(position, yaw, CROSS_ANGLE, range, CROSS_COLOR);
    this.fx.after(CROSS_GAP, () => this.fx.crossCut(position, yaw, -CROSS_ANGLE, range, CROSS_COLOR));
  }

  // 遠距離角色單發輸出低，打 Boss 時用 bossDamage，不影響打小怪
  playerDamage(enemy) {
    const { attackDamage, bossDamage } = this.player.def;
    return (enemy.def.boss ? bossDamage ?? attackDamage : attackDamage) * this.attackMultiplier;
  }

  // 復活羽毛：倒下時自動用，每局最多一次。回血、短暫無敵、把身邊的敵人彈開，否則一站起來又被圍住
  tryRevive() {
    const id = '復活羽毛';
    const charm = this.shopConfig.charms?.[id];
    if (!charm || this.revived || !this.shop.takeCharm(id)) return false;
    this.revived = true;
    const { player } = this;
    player.hp = Math.min(charm.heal, player.maxHp);
    player.invulnerable = charm.invulnerable;
    this.hud.setHearts(player.hp, player.maxHp);
    pushAway(this, charm.shove, charm.color);
    this.fx.burst(player.position.x, 1.2, player.position.z, 50, charm.color, 4);
    this.hud.flashScreen(charm.color);
    this.hud.banner('復活！', 1.6, charm.color);
    this.sfx.win();
    return true;
  }

  // 商店買的攜帶藥水，L 鍵喝一瓶。血滿時跳過紅藥水，不浪費
  usePotion() {
    const stash = this.shop.stashList();
    if (!stash.length) return;
    const id = stash.find((p) => this.items.defs[p].effect !== 'heal' || this.player.hp < this.player.maxHp);
    if (!id) { this.hud.toast('生命已經是滿的', '#f87171'); return; }
    this.shop.takePotion(id);
    this.items.apply(this.items.defs[id]);
  }

  // 畫面下方的技能與攜帶藥水狀態
  updateAbilities() {
    const { skill, cooldown, hidden } = this.skills;
    const list = [];
    if (skill) {
      const state = hidden > 0 ? 'active' : cooldown > 0 ? 'cooling' : 'ready';
      list.push({ key: 'K', name: skill.name, color: skill.color, state, seconds: hidden > 0 ? hidden : cooldown });
    }
    for (const id of this.shop.stashList()) list.push({ key: 'L', name: this.items.defs[id].name, color: POTION_COLORS[id] ?? '#fff', state: 'ready' });
    for (const [id, charm] of Object.entries(this.shopConfig.charms ?? {})) {
      if (this.shop.charmCount(id)) list.push({ key: charm.icon, name: charm.name, color: charm.color, state: 'ready' });
    }
    this.hud.setAbilities(list);
    this.touch.setAbilities(list);
  }

  showDamage(enemy, amount) {
    this.fx.floatText(enemy.position.x, 2, enemy.position.z, `-${amount}`);
  }

  // 陷阱打到敵人：不打斷動作，打倒一樣有分數與掉落
  hazardHit(enemy, amount, fromX, fromZ) {
    if (this.state !== 'playing') return;
    if (this.damageEnemy(enemy, amount, fromX, fromZ, { force: true, soft: true })) this.showDamage(enemy, amount);
  }

  // 燃燒扣血：打倒一樣有分數與掉落，只有遊戲進行中才算
  burnDamage(enemy, amount) {
    if (this.state !== 'playing') return;
    const { x, z } = enemy.position;
    if (!this.damageEnemy(enemy, amount, x, z, { force: true, soft: true })) return;
    this.showDamage(enemy, amount);
    this.sfx.burn();
  }

  damageEnemy(enemy, amount, fromX, fromZ, { force = false, drops = true, soft = false } = {}) {
    if (!enemy.takeHit(amount, fromX, fromZ, force, soft)) return false;
    this.fx.sparks(enemy.position.x, 1, enemy.position.z);
    if (!enemy.alive) {
      this.fx.bones(enemy.position.x, 1, enemy.position.z);
      this.sfx.bones();
      this.score += enemy.def.score ?? 0;
      this.hud.setScore(this.score);
      if (drops) this.items.onEnemyKilled(enemy);
      this.coins.onEnemyKilled(enemy);
      if (enemy.def.boss) this.onBossDefeated(enemy);
    }
    return true;
  }

  // Boss 倒下時召喚出來的小怪一起消失，戰鬥才會馬上結束
  onBossDefeated(boss) {
    this.hud.hideBoss();
    this.chests.onBossDefeated(boss);
    this.hud.banner(`擊敗${boss.def.boss.name}！`, 2);
    for (const enemy of this.enemies) if (enemy.alive) this.damageEnemy(enemy, enemy.hp, boss.position.x, boss.position.z, { force: true, drops: false });
  }

  // 紫藥水：場上敵人倒下；還沒出場的不算。Boss 只扣一部分血。清掉的不再掉道具，避免連鎖
  clearAllEnemies(bossDamage = 0) {
    const { x, z } = this.player.position;
    for (const enemy of this.enemies) {
      const amount = enemy.def.boss ? bossDamage : enemy.hp;
      if (amount) this.damageEnemy(enemy, amount, x, z, { force: true, drops: false });
    }
    this.hud.flashScreen('#c084fc');
    this.fx.shake(0.7);
    this.sfx.blast();
  }

  separateEnemies() {
    const list = this.enemies.filter((e) => e.state !== 'dying' && e.state !== 'rising');
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (list[i].def.boss || list[j].def.boss) { this.pushOffBoss(list[i], list[j]); continue; }
        const a = list[i].position, b = list[j].position;
        const min = list[i].radius + list[j].radius;
        const dx = b.x - a.x, dz = b.z - a.z;
        const dist = Math.hypot(dx, dz) || 0.01;
        if (dist >= min) continue;
        const push = ((min - dist) / dist) * SEPARATION_PUSH;
        a.x -= dx * push; a.z -= dz * push;
        b.x += dx * push; b.z += dz * push;
      }
    }
  }

  coinSummary() {
    return `
這局得到 ${this.coins.earned} 金幣，共有 ${this.coins.wallet.total} 金幣。`;
  }

  // 過關且還有下一關時，主要按鈕就是下一關
  endButtons(next = null) {
    return {
      button: next ? '下一關' : '再玩一次',
      onClick: () => {
        if (next) this.setLevel(next);
        this.startRun();
      },
      second: '換角色／關卡',
      onSecond: () => this.showCharacterSelect(),
      third: '商店',
      onThird: () => this.showShop(() => this.showCharacterSelect()),
    };
  }

  // 一局結束：解除隱身、收起技能列
  endRun() {
    this.state = 'ending';
    this.items.clearBuffs();
    this.skills.reveal();
    this.hud.setAbilities([]);
    this.touch.setAbilities([]);
  }

  // Boss 不會被小怪推動，只把小怪推開
  pushOffBoss(first, second) {
    const [boss, other] = first.def.boss ? [first, second] : [second, first];
    const dx = other.position.x - boss.position.x, dz = other.position.z - boss.position.z;
    const dist = Math.hypot(dx, dz) || 0.01;
    const min = boss.radius + other.radius;
    if (dist >= min) return;
    other.position.x = boss.position.x + (dx / dist) * min;
    other.position.z = boss.position.z + (dz / dist) * min;
  }

  onPlayerDead() {
    this.endRun();
    this.sfx.lose();
    setTimeout(() => this.hud.showOverlay({ title: `${this.characterId}倒下了…`, text: `分數 ${this.score}，撐到第 ${this.waves.number} 波。${this.coinSummary()}`, ...this.endButtons() }), SHOW_END_DELAY * 1000);
  }

  onLevelCleared() {
    this.endRun();
    this.sfx.win();
    this.coins.collectAll();
    this.player.play('Wave');
    this.progress.markCleared(this.levelId);
    const next = this.progress.next(this.levelId);
    const title = next ? '過關！' : '全部破關！';
    const opening = next ? `${this.levelData.name}恢復和平了！下一關：${this.levels[next].name}。` : '你闖過了所有關卡，太厲害了！';
    setTimeout(() => this.hud.showOverlay({ title, text: `${opening}分數 ${this.score}，剩下 ${this.player.hp} 顆心。${this.coinSummary()}`, ...this.endButtons(next) }), SHOW_END_DELAY * 1000);
  }

  updateCamera(dt) {
    if (this.state === 'title' || this.state === 'select') {
      const t = this.clock.elapsedTime * 0.25;
      const selecting = this.state === 'select';
      const angle = selecting ? Math.sin(t * 2) * SELECT_SWAY : t;
      const distance = selecting ? 8.2 : 5.2; // 選角面板比較高，鏡頭退遠才放得下整個角色
      const lookY = selecting ? -1 : 0.25; // 看低一點，角色才會在面板上方
      const p = this.player.position;
      this.camera.position.set(p.x + Math.sin(angle) * distance, 1.6, p.z + Math.cos(angle) * distance);
      this.camera.lookAt(p.x, lookY, p.z);
      return;
    }
    const p = this.player.position;
    const { x: limitX, zMin, zMax } = this.cameraBounds;
    const tx = THREE.MathUtils.clamp(p.x, -limitX, limitX);
    const tz = THREE.MathUtils.clamp(p.z, zMin, zMax);
    this.cameraTarget.lerp(new THREE.Vector3(tx, 0, tz), Math.min(1, dt * 6));
    this.camera.position.copy(this.cameraTarget).add(CAMERA_OFFSET).add(this.fx.offset);
    this.camera.lookAt(this.cameraTarget.x, CAMERA_LOOK_HEIGHT, this.cameraTarget.z);
  }

  simulate(dt) {
    const active = this.state === 'playing' || this.state === 'ending';
    if (this.state === 'playing') {
      this.waves.update(dt);
      this.items.update(dt, this.level.time);
      this.coins.update(dt, this.level.time);
      this.skills.update(dt);
      this.hazards.update(dt);
      this.updateAbilities();
    }
    if (this.state === 'playing' || this.state === 'ending') {
      this.chests.update(dt);
    }
    if (active) {
      if (this.state === 'playing') this.player.update(dt, this.input);
      for (const e of this.enemies) e.update(dt, this.player);
      this.separateEnemies();
      for (const e of this.enemies) if (e.state !== 'rising') this.level.constrain(e.position, e.radius);
      this.level.constrain(this.player.position, this.player.radius);
      this.projectiles.update(dt);
      this.clones.update(dt);
      for (const e of this.enemies) if (e.removed) e.destroy();
      this.enemies = this.enemies.filter((e) => !e.removed);
      for (const e of this.enemies) e.updateVisual(dt);
      if (this.waves) this.hud.setWave(this.waves.number, this.waves.total, this.waves.remaining);
    }
    this.player.updateVisual(dt);
    this.level.update(dt);
  }

  frame() {
    const raw = Math.min(this.clock.getDelta(), 0.05);
    this.input.update(raw);
    this.touch.update(this.state);
    this.fx.update(raw);
    if (this.state === 'shop') {
      this.shopStage.update(raw);
      this.shopStage.render(this.renderer);
      return;
    }
    if (this.state !== 'paused') {
      let dt = raw;
      if (this.hitStop > 0) { this.hitStop -= raw; dt = 0; } // 打中時停一瞬間，打擊感的關鍵
      this.simulate(dt);
    }
    this.updateCamera(raw);
    this.renderer.render(this.scene, this.camera);

    this.fps.frames += 1;
    this.fps.time += raw;
    if (this.fps.time >= 1) { this.fps.value = this.fps.frames / this.fps.time; this.fps.frames = 0; this.fps.time = 0; }
  }
}

const game = new Game();
window.__game = game; // 測試用
game.load().catch((err) => {
  console.error(err);
  game.hud.showOverlay({ title: '載入失敗', text: err.message });
});
