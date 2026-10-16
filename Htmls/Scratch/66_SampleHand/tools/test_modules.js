// test_modules.js — 用 headless scratch-vm 實際執行每個模組的 .sb3，送入假的手部座標檢查輸出。
//
//   npm install scratch-vm          （只要做一次；或設定 NODE_PATH 指到已安裝的地方）
//   node test_modules.js            全部測
//   node test_modules.js 3 6        只測模組 3、6（0 ＝ 工具箱）
//
// 除了讀變數（電腦以為的），也會讀角色的造型（玩家看到的），兩邊都要對。
const fs = require('fs');
const path = require('path');
let VM;
try { VM = require('scratch-vm'); } catch (e) { console.log('請先 npm install scratch-vm'); process.exit(1); }

const SB3 = path.join(__dirname, '..', 'student', 'sb3');
const FILES = {
  1: '模組01_偵測手.sb3', 2: '模組02_量尺寸.sb3', 3: '模組03_判斷手指.sb3', 4: '模組04_判斷拇指.sb3',
  5: '模組05_數手指.sb3', 6: '模組06_穩定判斷.sb3', 7: '模組07_認猜拳.sb3', 8: '模組08_比對手勢.sb3',
  9: '模組09_猜拳勝負.sb3', 10: '模組10_手指游標.sb3', 0: '手勢模組工具箱.sb3',
};

// ---------------------------------------------------------------- 假的 Handpose2Scratch
class FakeHandpose {
  constructor() { this.landmarks = []; this.ratio = 0.75; this.mirror = true; }
  getInfo() {
    const arg = { LANDMARK: { type: 'string', menu: 'landmark', defaultValue: '1' } };
    return {
      id: 'handpose2scratch', name: 'Handpose2Scratch',
      blocks: [
        { opcode: 'getX', blockType: 'reporter', text: 'x of [LANDMARK]', arguments: arg },
        { opcode: 'getY', blockType: 'reporter', text: 'y of [LANDMARK]', arguments: arg },
        { opcode: 'getZ', blockType: 'reporter', text: 'z of [LANDMARK]', arguments: arg },
        { opcode: 'videoToggle', blockType: 'command', text: 'turn video [VIDEO_STATE]', arguments: { VIDEO_STATE: { type: 'string', menu: 'videoMenu', defaultValue: 'off' } } },
        { opcode: 'setVideoTransparency', blockType: 'command', text: 'set video transparency to [TRANSPARENCY]', arguments: { TRANSPARENCY: { type: 'number', defaultValue: 50 } } },
        { opcode: 'setRatio', blockType: 'command', text: 'set ratio to [RATIO]', arguments: { RATIO: { type: 'string', menu: 'ratioMenu', defaultValue: '0.75' } } },
      ],
      menus: {   // 與官方原始碼相同：landmark 選單 acceptReporters: true
        landmark: { acceptReporters: true, items: Array.from({ length: 21 }, (_, i) => String(i + 1)) },
        videoMenu: { acceptReporters: true, items: ['off', 'on', 'on-flipped'] },
        ratioMenu: { acceptReporters: true, items: ['0.5', '0.75', '1', '1.5', '2.0'] },
      },
    };
  }
  getX(a) { const l = this.landmarks[parseInt(a.LANDMARK, 10) - 1]; if (!l) return ''; const v = 240 - l[0] * this.ratio; return this.mirror ? v : -v; }
  getY(a) { const l = this.landmarks[parseInt(a.LANDMARK, 10) - 1]; if (!l) return ''; return 180 - l[1] * this.ratio; }
  getZ() { return 0; }
  videoToggle(a) { if (a.VIDEO_STATE !== 'off') this.mirror = a.VIDEO_STATE === 'on'; }
  setVideoTransparency() {}
  setRatio(a) { this.ratio = parseFloat(a.RATIO); }
}

// ---------------------------------------------------------------- 假的手（攝影機像素座標，y 向下）
// fp：五位指型字串（拇食中無小）。opt.s 縮放、opt.cx/cy 手腕位置、opt.thumb 'open'|'closed'|'across'
// opt.over：{ 點號: [dx, dy] } 直接覆寫某一點（相對手腕，縮放前）；opt.pinch：拇指尖貼到食指尖
function pose(fp, opt = {}) {
  const s = opt.s || 1, cx = opt.cx || 320, cy = opt.cy || 420;
  const P = {};
  P[1] = [0, 0];
  const th = fp[0] === '1' ? 'open' : (opt.thumb || 'closed');
  P[2] = [-25, -20]; P[3] = [-45, -45];
  P[4] = th === 'open' ? [-65, -60] : [-30, -60];
  P[5] = th === 'open' ? [-85, -70] : th === 'across' ? [15, -62] : [0, -60];
  const mcp = { 6: [-30, -100], 10: [-10, -105], 14: [10, -100], 18: [30, -92] };
  [6, 10, 14, 18].forEach((m, i) => {
    const [x, y] = mcp[m]; P[m] = [x, y];
    if (fp[i + 1] === '1') { P[m + 1] = [x, y - 40]; P[m + 2] = [x, y - 65]; P[m + 3] = [x, y - 85]; }
    else { P[m + 1] = [x, y - 30]; P[m + 2] = [x, y - 12]; P[m + 3] = [x, y - 5]; }
  });
  if (opt.pinch) P[5] = [P[9][0] + 4, P[9][1] + 3];
  Object.assign(P, opt.over || {});
  const lm = [];
  for (let i = 1; i <= 21; i++) {
    let [dx, dy] = P[i];
    if (opt.down) dy = -dy;                 // 手倒過來（手指朝下）
    lm.push([cx + dx * s, cy + dy * s, 0]);
  }
  return lm;
}

// ---------------------------------------------------------------- 測試工具
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const fails = [];
function check(cond, msg) {
  if (cond) pass++; else { fail++; fails.push(msg); console.log('    ✗ ' + msg); }
}

async function open(file) {
  const vm = new VM();
  const fake = new FakeHandpose();
  const em = vm.extensionManager;
  const orig = em.loadExtensionURL.bind(em);
  em.loadExtensionURL = async id => {
    if (id === 'handpose2scratch') {
      if (!em.isExtensionLoaded(id)) em._loadedExtensions.set(id, em._registerInternalExtension(fake));
      return;
    }
    return orig(id);
  };
  const w = process.stderr.write.bind(process.stderr), o = process.stdout.write.bind(process.stdout);
  const quiet = f => (c, ...r) => (String(c).includes('No storage module') ? true : f(c, ...r));
  process.stderr.write = quiet(w); process.stdout.write = quiet(o);
  const oe = console.error, errs = []; console.error = (...a) => errs.push(a.join(' '));
  await vm.loadProject(fs.readFileSync(path.join(SB3, file)));
  console.error = oe;
  const stage = vm.runtime.getTargetForStage();
  const T = {
    vm, fake, errs,
    v(name) { const x = Object.values(stage.variables).find(q => q.name === name && q.type === ''); return x ? x.value : undefined; },
    n(name) { return Number(T.v(name)); },
    set(lm) { fake.landmarks = lm || []; },
    sprite(name) { return vm.runtime.targets.filter(t => !t.isStage && t.getName() === name); },
    clones(name) { return T.sprite(name).filter(t => !t.isOriginal); },
    cos(t) { const c = t.getCostumes()[t.currentCostume]; return c ? c.name : '?'; },
    key(k, down) { vm.postIOData('keyboard', { key: k, isDown: down }); },
    async press(k, ms = 80) { T.key(k, true); await sleep(ms); T.key(k, false); },
    mouse(x, y, down) { vm.postIOData('mouse', { x: x + 240, y: 180 - y, isDown: down, canvasWidth: 480, canvasHeight: 360 }); },
  };
  vm.start(); vm.greenFlag();
  await sleep(300);
  return T;
}
const close = T => { T.vm.stopAll(); clearInterval(T.vm.runtime._steppingInterval); };
const ALL32 = Array.from({ length: 32 }, (_, i) => i.toString(2).padStart(5, '0'));
const sum = p => [...p].reduce((a, b) => a + Number(b), 0);

// ---------------------------------------------------------------- 各模組的測試
const TESTS = {
  async 1(T) {
    T.set([]); await sleep(150);
    check(T.n('看得到手') === 0, 'M1 沒有手 → 看得到手 0');
    check(T.cos(T.sprite('狀態牌')[0]) === '沒手', 'M1 狀態牌顯示「沒手」');
    T.set(pose('11111')); await sleep(150);
    check(T.n('看得到手') === 1, 'M1 手立起來 → 看得到手 1');
    check(T.cos(T.sprite('狀態牌')[0]) === '有手', 'M1 狀態牌顯示「有手」');
    const pts = T.clones('骨架點');
    check(pts.length === 2 && pts.every(p => p.visible), 'M1 骨架點 2 個分身且顯示');
    check(Math.abs(pts[0].x - (240 - 320 * 0.75)) < 1, 'M1 骨架點跟著手腕 x');
    T.set(pose('11111', { down: true })); await sleep(150);
    check(T.n('看得到手') === 0, 'M1 手指朝下 → 看得到手 0（守門 ②）');
    T.set(pose('11111', { cx: 900 })); await sleep(150);   // x = 240 − 675 = −435
    check(T.n('看得到手') === 0, 'M1 手腕 x < −250 → 看得到手 0（守門 ①）');
  },

  async 2(T) {
    T.set(pose('11111')); await sleep(150);
    check(Math.abs(T.n('手長') - 78.75) < 0.01, 'M2 手長 = 105 × 0.75 = 78.75，實際 ' + T.v('手長'));
    check(Math.abs(T.n('手寬') - 45) < 0.01, 'M2 手寬 = 60 × 0.75 = 45，實際 ' + T.v('手寬'));
    const r1 = T.n('手長') / T.n('手寬');
    T.set(pose('11111', { s: 0.5 })); await sleep(150);
    const r2 = T.n('手長') / T.n('手寬');
    check(Math.abs(T.n('手長') - 39.375) < 0.01, 'M2 手縮小一半 → 手長也一半');
    check(Math.abs(r1 - r2) < 1e-9, 'M2 遠近不同，手長 ÷ 手寬 不變');
  },

  async 3(T) {
    const lamp = () => T.cos(T.clones('手指燈')[0]);
    T.set(pose('01000')); await sleep(150);
    check(T.n('食指') === 1, 'M3 食指伸直 → 1');
    check(lamp() === '食1', 'M3 手指燈顯示「食1」');
    T.set(pose('00000')); await sleep(150);
    check(T.n('食指') === 0, 'M3 食指彎下 → 0');
    check(lamp() === '食0', 'M3 手指燈顯示「食0」');
    // 遲滯：餘裕 = 78.75 × 0.08 = 6.3。指尖只比關節高 4 px（Scratch 3 單位）→ 彎著的維持彎著
    T.set(pose('00000', { over: { 9: [-30, -134] } })); await sleep(150);
    check(T.n('食指') === 0, 'M3 彎著時指尖只高過關節一點點 → 維持 0（餘裕）');
    T.set(pose('01000')); await sleep(120);
    T.set(pose('01000', { over: { 9: [-30, -137] } })); await sleep(150);
    check(T.n('食指') === 1, 'M3 伸直時指尖只低於關節一點點 → 維持 1（餘裕）');
    T.set(pose('01000', { over: { 9: [-30, -115] } })); await sleep(150);
    check(T.n('食指') === 0, 'M3 低於關節超過餘裕 → 改成 0');
    for (const s of [0.4, 1.6]) {
      T.set(pose('01000', { s })); await sleep(120);
      const a = T.n('食指');
      T.set(pose('00000', { s })); await sleep(120);
      check(a === 1 && T.n('食指') === 0, 'M3 手縮放 ' + s + ' 倍 → 判斷一樣');
    }
  },

  async 4(T) {
    for (const s of [0.35, 0.7, 1, 1.6]) {
      T.set(pose('10000', { s })); await sleep(120);
      const open = T.n('拇指');
      T.set(pose('00000', { s })); await sleep(120);
      const closed = T.n('拇指');
      T.set(pose('10000', { s })); await sleep(120);
      T.set(pose('00000', { s, thumb: 'across' })); await sleep(120);
      const across = T.n('拇指');
      check(open === 1 && closed === 0 && across === 0,
        `M4 縮放 ${s}：張開 ${open}／收起 ${closed}／橫過手掌 ${across}（應為 1／0／0）`);
    }
    T.set(pose('10000')); await sleep(120);
    const span = T.n('拇指跨距'), thr = T.n('拇指門檻');
    check(Math.abs(span / T.n('手寬') - 115 / 60) < 1e-6 && Math.abs(thr - 45 * 1.35) < 1e-6,
      'M4 拇指跨距與門檻數值正確（跨距 ' + span + '，門檻 ' + thr + '）');
    T.set(pose('01000')); await sleep(120);
    check(T.n('食指') === 1 && T.n('拇指') === 0, 'M4 食指伸直時拇指不受影響');
    const L = T.clones('手指燈').map(T.cos).sort().join(',');
    check(L === '拇0,食1', 'M4 兩個手指燈顯示「拇0、食1」，實際 ' + L);
  },

  async 5(T) {
    let ok = 0, lampOk = 0;
    for (const p of ALL32) {
      T.set(pose(p)); await sleep(90);
      if (T.v('指型') === p && T.n('手指數') === sum(p) && T.v('四指型') === p.slice(1)) ok++;
      else console.log('    指型 ' + p + ' → ' + T.v('指型') + ' / ' + T.v('手指數'));
      const shown = T.clones('手指燈').map(t => T.cos(t)).sort();
      const want = ['拇', '食', '中', '無', '小'].map((c, i) => c + p[i]).sort();
      if (shown.join() === want.join()) lampOk++;
    }
    check(ok === 32, 'M5 32 種手指組合的手指數／指型／四指型全對：' + ok + '/32');
    check(lampOk === 32, 'M5 手指燈（畫面）與指型一致：' + lampOk + '/32');
  },

  async 6(T) {
    const card = () => T.sprite('數字卡')[0];
    const map = { 0: '00000', 1: '01000', 2: '01100', 3: '01110', 4: '01111', 5: '11111' };
    let ok = 0;
    for (const d of [3, 0, 5, 1, 4, 2]) {
      T.set(pose(map[d])); await sleep(400);
      if (T.n('確定手指數') === d && card().visible && T.cos(card()) === '數' + d) ok++;
      else console.log('    比 ' + d + ' → 確定 ' + T.v('確定手指數') + '，卡片 ' + T.cos(card()));
    }
    check(ok === 6, 'M6 比出 0～5：確定手指數與數字卡（畫面）都正確 ' + ok + '/6');
    // 太短的手勢不算
    T.set(pose('01100')); await sleep(400);
    T.set(pose('01110')); await sleep(70);
    T.set(pose('01100')); await sleep(70);
    check(T.n('確定手指數') === 2, 'M6 只閃 0.07 秒的手勢不會被承認');
    // 高速抖動
    for (let i = 0; i < 16; i++) { T.set(pose(i % 2 ? '01000' : '01111')); await sleep(60); }
    check(T.n('確定手指數') === 2, 'M6 每 60 ms 換一次的抖動 → 確定手指數維持 2');
    // 掉格
    T.set(pose('01100')); await sleep(300);
    T.set([]); await sleep(200);
    check(T.n('確定手指數') === 2 && T.n('看得到手') === 0, 'M6 掉格 0.2 秒 → 確定手指數保留');
    T.set(pose('01100')); await sleep(100);
    T.set([]); await sleep(800);
    check(T.n('確定手指數') === -1 && !card().visible, 'M6 手離開 0.8 秒 → 清空（-1）且數字卡隱藏');
    // 反應時間
    T.set(pose('00000')); await sleep(400);
    const t0 = Date.now(); T.set(pose('01111'));
    while (T.n('確定手指數') !== 4 && Date.now() - t0 < 2000) await sleep(5);
    const rt = Date.now() - t0;
    check(rt < 400, 'M6 換手勢反應時間 ' + rt + ' ms（< 400）');
    // 鍵盤模式
    await T.press('k'); T.set([]);
    T.key('3', true); await sleep(150); T.key('3', false); await sleep(100);
    check(T.n('確定手指數') === 3 && T.cos(card()) === '數3', 'M6 鍵盤模式按 3 → 確定手指數 3、卡片數3');
    const lamps = T.clones('手指燈').map(T.cos).sort().join(',');
    check(lamps === ['拇0', '食1', '中1', '無1', '小0'].sort().join(','), 'M6 鍵盤模式按 3 → 手指燈（畫面）也亮 3 根：' + lamps);
    T.key('0', true); await sleep(150); T.key('0', false); await sleep(100);
    check(T.n('確定手指數') === 0 && T.cos(card()) === '數0', 'M6 鍵盤模式按 0 → 0（不會跑到最後一個造型）');
    await T.press('k');
    return { rt };
  },

  async 7(T) {
    const hand = () => T.cos(T.sprite('我的手')[0]);
    const cases = [['00000', 1], ['10000', 1], ['01100', 2], ['11100', 2], ['01111', 3], ['11111', 3],
                   ['01000', 0], ['01110', 0], ['11001', 0]];
    let ok = 0;
    for (const [p, want] of cases) {
      T.set(pose(p)); await sleep(350);
      if (T.n('猜拳號') === want && hand() === '拳' + want) ok++;
      else console.log('    ' + p + ' → 猜拳號 ' + T.v('猜拳號') + '，畫面 ' + hand());
    }
    check(ok === cases.length, 'M7 猜拳號與「我的手」造型全對（含拇指收／翹）' + ok + '/' + cases.length);
  },

  async 8(T) {
    const G = [['石頭', '?0000'], ['剪刀', '?1100'], ['布', '?1111'], ['我愛你', '11001'],
               ['搖滾', '01001'], ['打電話', '10001'], ['手槍', '11000'], ['比一', '01000']];
    let ok = 0, n = 0;
    for (const [name, code] of G) {
      for (const t of (code[0] === '?' ? ['0', '1'] : [code[0]])) {
        const p = t + code.slice(1);
        T.set(pose(p)); await sleep(350); n++;
        if (T.v('認出手勢') === name) ok++; else console.log('    ' + p + ' → ' + T.v('認出手勢') + '（應為 ' + name + '）');
      }
    }
    check(ok === n, 'M8 八種手勢（含 ? 萬用字元）全部認出 ' + ok + '/' + n);
    T.set(pose('00110')); await sleep(350);
    check(T.v('認出手勢') === '（沒有）', 'M8 不在清單上的 00110 → （沒有）');
    // 鍵盤 6 ＝ 我愛你
    await T.press('k'); T.set([]);
    T.key('6', true); await sleep(150); T.key('6', false); await sleep(80);
    check(T.v('認出手勢') === '我愛你', 'M8 鍵盤模式按 6 → 我愛你');
    await T.press('k');
  },

  async 9(T) {
    const RULE = (a, b) => (a === b ? '平手' : (a % 3) + 1 === b ? '贏' : '輸');
    const P = { 1: '00000', 2: '01100', 3: '11111' };
    let ok = 0, rounds = 0, shownOk = 0, seen = new Set();
    for (let i = 0; i < 12; i++) {
      const me = (i % 3) + 1;
      T.set(pose(P[me])); await sleep(300);
      await T.press(' ');
      // 倒數約 1.7 秒，結果顯示 1.2 秒
      let t0 = Date.now();
      while (T.n('結果顯示') !== 1 && Date.now() - t0 < 4000) await sleep(20);
      await sleep(150);
      const a = T.n('我出拳'), b = T.n('電腦出拳'), r = T.v('勝負');
      const card = T.sprite('結果卡')[0], mh = T.sprite('我的手')[0], ch = T.sprite('電腦手')[0];
      if (card.visible && T.cos(card) === '結果' + r && T.cos(mh) === '拳' + a && T.cos(ch) === '拳' + b) shownOk++;
      rounds++; seen.add(b);
      if (a === me && r === RULE(a, b)) ok++; else console.log('    我 ' + a + ' 電腦 ' + b + ' → ' + r);
      t0 = Date.now();
      while (T.n('遊戲中') !== 0 && Date.now() - t0 < 4000) await sleep(20);
    }
    check(ok === rounds, 'M9 ' + rounds + ' 局的勝負與規則一致：' + ok + '/' + rounds);
    check(shownOk === rounds, 'M9 結果卡、我的手、電腦手（畫面）一致：' + shownOk + '/' + rounds);
    check(seen.size === 3, 'M9 電腦三種拳都出現過');
    check(T.n('局數') === 12, 'M9 局數 12，實際 ' + T.v('局數'));
    T.set(pose('01110')); await sleep(300);
    await T.press(' ');
    let t0 = Date.now();
    while (T.n('結果顯示') !== 1 && Date.now() - t0 < 4000) await sleep(20);
    check(T.v('勝負') === '看不懂' && T.n('局數') === 12, 'M9 看不懂的手勢 → 勝負「看不懂」，不算局數');
    // 猜拳勝負積木本身：9 種組合
    return { rounds };
  },

  async 10(T) {
    T.set(pose('01000')); await sleep(150);
    const ix = 240 - 290 * 0.75, iy = 180 - 235 * 0.75;
    check(Math.abs(T.n('游標x') - ix) < 0.01 && Math.abs(T.n('游標y') - iy) < 0.01, 'M10 游標 = 食指尖座標');
    const cur = T.sprite('游標')[0];
    check(cur.visible && Math.abs(cur.x - ix) < 1 && Math.abs(cur.y - iy) < 1, 'M10 游標角色（畫面）跟著食指尖');
    check(T.n('捏合') === 0, 'M10 手張開 → 捏合 0');
    T.set(pose('01000', { pinch: true })); await sleep(150);
    check(T.n('捏合') === 1 && T.n('捏的次數') === 1 && T.cos(cur) === '捏住', 'M10 捏住 → 捏合 1、次數 1、游標變「捏住」');
    // 中間地帶抖動：捏距在 0.25～0.4 手長之間 → 不會重複觸發
    const mid = d => pose('01000', { over: { 5: [-30 + d, -185] } });  // 與食指尖 (-30,-185) 的曼哈頓距離 = d
    for (let i = 0; i < 10; i++) { T.set(mid(i % 2 ? 28 : 40)); await sleep(50); }  // 手長 105 px：0.25 → 26.25、0.4 → 42
    check(T.n('捏的次數') === 1, 'M10 捏距在兩個門檻之間抖動 → 不重複觸發（次數 ' + T.v('捏的次數') + '）');
    T.set(pose('01000')); await sleep(120);
    check(T.n('捏合') === 0, 'M10 放開 → 捏合 0');
    for (let i = 0; i < 3; i++) { T.set(pose('01000', { pinch: true })); await sleep(100); T.set(pose('01000')); await sleep(100); }
    check(T.n('捏的次數') === 4, 'M10 再捏 3 次 → 捏的次數 4');
    T.set([]); await sleep(120);
    check(T.n('捏合') === 0 && !cur.visible, 'M10 手離開 → 游標隱藏');
    // 滑鼠模式
    await T.press('k');
    T.mouse(100, 50, false); await sleep(100);
    check(Math.abs(T.n('游標x') - 100) < 1 && Math.abs(T.n('游標y') - 50) < 1, 'M10 鍵盤模式：游標跟著滑鼠');
    T.mouse(100, 50, true); await sleep(100); T.mouse(100, 50, false); await sleep(100);
    check(T.n('捏的次數') === 5, 'M10 鍵盤模式：按一下滑鼠 ＝ 捏一下');
    check(T.clones('氣球').length === 3, 'M10 三個氣球分身');
  },

  async 0(T) {
    T.set(pose('11001')); await sleep(400);
    check(T.v('確定指型') === '11001' && T.v('認出手勢') === '我愛你' && T.n('猜拳號') === 0,
      '工具箱：我愛你 → 確定指型 11001、認出手勢我愛你、猜拳號 0');
    T.set(pose('01100')); await sleep(400);
    check(T.n('確定手指數') === 2 && T.n('猜拳號') === 2 && T.v('認出手勢') === '剪刀', '工具箱：剪刀 → 2、2、剪刀');
    T.set(pose('01000', { pinch: true })); await sleep(200);
    check(T.n('捏合') === 1, '工具箱：捏合');
    check(T.clones('骨架點').length === 12 && T.clones('手指燈').length === 5, '工具箱：12 個骨架點、5 個手指燈');
  },
};

(async () => {
  const which = process.argv.slice(2).map(Number);
  const list = which.length ? which : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0];
  const extra = {};
  for (const n of list) {
    console.log('▶ ' + FILES[n]);
    const T = await open(FILES[n]);
    check(T.errs.length === 0, FILES[n] + ' 載入沒有錯誤' + (T.errs.length ? '：' + T.errs[0] : ''));
    extra[n] = await TESTS[n](T);
    close(T);
  }
  console.log('\n通過 ' + pass + '，失敗 ' + fail);
  if (fail) console.log(fails.map(f => '  ✗ ' + f).join('\n'));
  if (extra[6]) console.log('M6 反應時間 ' + extra[6].rt + ' ms');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('❌', e); process.exit(1); });
