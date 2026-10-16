// test_library.js — 用 headless scratch-vm 實際執行每一類的 .sb3，按鍵觸發函式、檢查結果。
//
//   npm install            （只要做一次，會裝 scratch-vm）
//   node test_library.js          全部測
//   node test_library.js 3 6      只測第 3、6 類（0 ＝ 完整函式庫、s ＝ .sprite3 匯入）
//
// 同時檢查「電腦以為的」（變數）和「玩家看到的」（角色的位置、尺寸、幻影、造型、對話框）。
// ⚠ headless 沒有畫面引擎：「碰到？」一律是 false，角色也不會被擋在舞台邊緣（坑 14）。
const fs = require('fs');
const path = require('path');
let VM;
try { VM = require('scratch-vm'); } catch (e) { console.log('請先 npm install（需要 scratch-vm）'); process.exit(1); }

const SB3 = path.join(__dirname, '..', 'student', 'sb3');
const SP3 = path.join(__dirname, '..', 'student', 'sprite3');
const FILES = { 1: '1_文字與對話.sb3', 2: '2_出場與退場.sb3', 3: '3_持續特效.sb3', 4: '4_角色管理.sb3',
  5: '5_計時與流程.sb3', 6: '6_數學小工具.sb3', 7: '7_清單工具.sb3', 8: '8_遊戲機制.sb3', 0: '完整函式庫.sb3' };

const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const fails = [];
function check(cond, msg) {
  if (cond) pass++; else { fail++; fails.push(msg); console.log('    ✗ ' + msg); }
}
// 變數裡的 '3' 和 3 在 Scratch 裡是一樣的；但 '007' 要保留成文字（補零的結果）
const num = x => (typeof x === 'string' && x.trim() !== '' && String(Number(x)) === x ? Number(x) : x);
const near = (a, b, d = 0.01) => Math.abs(Number(a) - Number(b)) <= d;
const KEYS = { space: ' ', up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };

function quietLoad() {
  const w = process.stderr.write.bind(process.stderr), o = process.stdout.write.bind(process.stdout);
  const q = f => (c, ...r) => (String(c).includes('No storage module') ? true : f(c, ...r));
  process.stderr.write = q(w); process.stdout.write = q(o);
}
quietLoad();

// headless 沒有畫面引擎，會有兩個和真的 Scratch 不一樣的地方，這裡補回來：
// ① 「尺寸設為」完全沒作用（尺寸只在有畫面引擎時才會改）
// ② 角色移動、變效果時不會「要求重畫」→「重複」迴圈在一個畫面內跑好幾百圈（坑 10），
//    一格一格的物理（彈跳、重力、跟隨、捲動）會瞬間跑完。
// 補法：和真的畫面引擎一樣，看得見的角色有變化就 requestRedraw()，尺寸照 Scratch 的規則夾在 5%～490%。
let patched = false;
function fakeRender(vm) {
  const rt = vm.runtime;
  const orig = rt.requestTargetsUpdate.bind(rt);
  rt.requestTargetsUpdate = t => { orig(t); if (t.visible && !t.isStage) rt.requestRedraw(); };
  if (patched) return;
  const proto = Object.getPrototypeOf(rt.targets.find(t => !t.isStage));
  const setSize = proto.setSize, setEffect = proto.setEffect;
  proto.setSize = function (size) {
    if (this.renderer || this.isStage) return setSize.call(this, size);
    this.size = Math.min(490, Math.max(5, size));
    if (this.visible) this.runtime.requestRedraw();
    this.runtime.requestTargetsUpdate(this);
  };
  proto.setEffect = function (name, v) { setEffect.call(this, name, v); if (this.visible) this.runtime.requestRedraw(); };
  patched = true;
}

async function open(file, buf) {
  const vm = new VM();
  const oe = console.error, errs = []; console.error = (...a) => errs.push(a.join(' '));
  await vm.loadProject(buf || fs.readFileSync(path.join(SB3, file)));
  console.error = oe;
  fakeRender(vm);
  const stage = vm.runtime.getTargetForStage();
  const T = {
    vm, errs, stage,
    v(name) { const x = Object.values(stage.variables).find(q => q.name === name && q.type === ''); return x ? num(x.value) : undefined; },
    list(name) { const x = Object.values(stage.variables).find(q => q.name === name && q.type === 'list'); return x ? x.value : undefined; },
    setv(name, val) { Object.values(stage.variables).find(q => q.name === name && q.type === '').value = val; },
    sp(name) { return vm.runtime.targets.find(t => !t.isStage && t.isOriginal && t.getName() === name); },
    clones(name) { return vm.runtime.targets.filter(t => !t.isStage && !t.isOriginal && t.getName() === name); },
    lv(name, vname) { const t = T.sp(name); const x = Object.values(t.variables).find(q => q.name === vname); return x ? num(x.value) : undefined; },
    cos(t) { const c = t.getCostumes()[t.currentCostume]; return c ? c.name : '?'; },
    say(t) { const s = t.getCustomState('Scratch.looks'); return s && s.text ? String(s.text) : ''; },
    ghost(t) { return t.effects.ghost; },
    key(k, down) { vm.postIOData('keyboard', { key: KEYS[k] || k, isDown: down }); },
    async press(k, ms = 60) { T.key(k, true); await sleep(ms); T.key(k, false); await sleep(30); },
    mouse(x, y) { vm.postIOData('mouse', { x: x + 240, y: 180 - y, canvasWidth: 480, canvasHeight: 360 }); },
    async svc(msg, ...args) {       // 像角色一樣使用 B 型函式：寫參數 → 廣播並等待
      args.forEach((a, i) => T.setv('參數' + (i + 1), a));
      const th = vm.runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: msg });
      for (let i = 0; i < 100 && th && th.some(t => vm.runtime.threads.includes(t)); i++) await sleep(10);
      await sleep(20);
      return T.v('結果');
    },
    async until(fn, ms = 4000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(15); } return false; },
  };
  vm.start(); vm.greenFlag();
  await sleep(250);
  return T;
}

// ================================================================ ① 文字與對話
async function t1() {
  const T = await open(FILES[1]);
  const y = T.sp('圓圓'), f = T.sp('方方');
  const full = '嗨！我是圓圓。打字機效果會讓字一個一個出現。';
  await T.press('1');
  await sleep(250);
  const mid = T.say(y);
  check(mid.length > 0 && mid.length < full.length && full.startsWith(mid), '1-1 打字到一半：對話框是開頭的一段（' + mid + '）');
  await T.until(() => T.say(y) === full, 5000);
  check(T.say(y) === full, '1-1 打字完：對話框 ＝ 整句');
  await T.press('2');
  await sleep(300);
  const sub = String(T.v('字幕'));
  check(sub.length > 0 && sub.length < 22, '1-2 字幕一個字一個字出現（' + sub + '）');
  await T.until(() => String(T.v('字幕')).length === 22, 4000);
  check(T.v('字幕') === '很久很久以前，森林裡住著一顆愛說話的圓圓……', '1-2 字幕打完');
  // 1-3 播放對話
  await T.press('3');
  await T.until(() => T.v('目前說話者') === '圓圓' && T.say(y).length > 3, 3000);
  check(T.say(f) === '', '1-3 第 1 句：圓圓說話時方方不說話');
  await T.until(() => T.v('目前說話者') === '方方', 6000);
  await T.until(() => T.say(f) === '就是把一段程式包起來，取一個名字！', 5000);
  check(T.say(f) === '就是把一段程式包起來，取一個名字！', '1-3 第 2 句：方方打完整句');
  check(T.say(y) === '', '1-3 第 2 句：圓圓的對話框清掉了');
  await T.until(() => T.v('對話行') === 4 && T.say(f) === '喊它的名字就好，還可以給它不同的輸入。', 12000);
  check(T.v('對話行') === 4, '1-3 四句都播完');
  await T.until(() => T.say(f) === '' && T.say(y) === '', 3000);
  check(T.say(f) === '' && T.say(y) === '', '1-3 對話結束：對話框都清掉');
  // 1-4 / 1-5（B 型：直接用服務台）
  check(await T.svc('取出片段', 'Scratch函式庫', 1, 7) === 'Scratch', '1-4 取出片段 1～7 → Scratch');
  check(await T.svc('取出片段', 'Scratch函式庫', 8, 10) === '函式庫', '1-4 取出片段 8～10 → 函式庫');
  check(await T.svc('取出片段', 'abc', 2, 9) === 'bc', '1-4 超過長度只拿到有的字');
  check(await T.svc('補零', 7, 3) === '007', '1-5 補零 7 → 007');
  check(String(await T.svc('補零', 123, 2)) === '123', '1-5 已經夠長不變');
  check(await T.svc('補零', 0, 2) === '00', '1-5 補零 0 → 00');
  // 角色端呼叫（按鍵 4、5）
  await T.press('4'); await sleep(150);
  check(T.say(y) === '第 1～7 個字：Scratch', '1-4 角色端：圓圓說出結果');
  await T.press('5'); await sleep(150);
  check(T.say(y) === '7 補到 3 位：007', '1-5 角色端：圓圓說出 007');
  return T;
}

// ================================================================ ② 出場與退場
async function t2() {
  const T = await open(FILES[2]);
  const y = T.sp('圓圓');
  check(y.visible && T.ghost(y) === 0 && y.size === 100, '綠旗後：顯示、幻影 0、尺寸 100');
  await T.press('1'); await sleep(350);
  const g = T.ghost(y);
  check(g > 20 && g < 90, '2-1 淡入一半：幻影在 20～90 之間（' + Math.round(g) + '）');
  await sleep(900);
  check(T.ghost(y) === 0 && y.visible, '2-1 淡入完成：幻影 0、顯示');
  await T.press('2'); await sleep(400);
  check(T.ghost(y) > 15 && T.ghost(y) < 85, '2-2 淡出一半（' + Math.round(T.ghost(y)) + '）');
  await sleep(900);
  check(!y.visible && T.ghost(y) === 0, '2-2 淡出完成：隱藏、幻影設回 0');
  await T.press('3'); await sleep(120);
  check(y.visible && y.size > 5 && y.size < 125, '2-3 彈出中：尺寸變大中（' + Math.round(y.size) + '）');
  let peak = 0; const t0 = Date.now();
  while (Date.now() - t0 < 400) { peak = Math.max(peak, y.size); await sleep(10); }
  check(peak > 108, '2-3 衝過頭：最大尺寸超過 108（' + Math.round(peak) + '）');
  check(y.size === 100, '2-3 最後停在 100');
  await T.press('4'); await sleep(300);
  check(y.size < 90 && y.size > 5, '2-4 縮小中（' + Math.round(y.size) + '）');
  await sleep(500);
  check(!y.visible && y.size === 100, '2-4 縮小消失：隱藏，尺寸還原成 100');
  await T.press('5'); await sleep(80);
  check(y.visible && y.y > 50, '2-5 從上方開始掉（y = ' + Math.round(y.y) + '）');
  let low = 999, bounced = false, prev = y.y, t1 = Date.now();
  while (Date.now() - t1 < 3500) {
    low = Math.min(low, y.y); if (y.y > prev + 0.5 && prev <= -29) bounced = true; prev = y.y;
    if (T.vm.runtime.threads.length === 0) break; await sleep(8);
  }
  check(bounced, '2-5 落地後有往上彈');
  check(low >= -30.001, '2-5 不會掉到地面以下（最低 ' + low.toFixed(1) + '）');
  await sleep(300);
  check(y.y === -30, '2-5 最後停在 y = −30');
  T.sp('圓圓').setXY(-40, -30);
  await T.press('6'); await sleep(60);
  check(y.x < -200, '2-6 從左邊出發（x = ' + Math.round(y.x) + '）');
  await sleep(950);
  check(y.x === -40 && y.y === -30, '2-6 滑回原位 (−40, −30)');
  await T.press('7'); await sleep(60);
  check(y.y > 150 && y.x === -40, '2-6 從上面出發');
  await sleep(950);
  check(y.y === -30, '2-6 從上面滑回原位');
  T.stage.variables; y.setEffect('ghost', 60); y.setSize(40);
  await T.press('r'); await sleep(80);
  check(T.ghost(y) === 0 && y.size === 100 && y.direction === 90 && y.visible, '4-1 重設角色（R）：效果、尺寸、方向都還原');
  return T;
}

// ================================================================ ③ 持續特效
async function t3() {
  const T = await open(FILES[3]);
  const y = T.sp('圓圓');
  check(T.cos(y) === '圓圓1', '綠旗後造型是第 1 個');
  await T.press('1'); await sleep(40);
  let xs = new Set(); const t0 = Date.now();
  while (Date.now() - t0 < 300) { xs.add(Math.round(y.x)); await sleep(5); }
  check(xs.has(-30) && xs.has(-50), '3-1 抖動：x 在 −30 與 −50 之間跳（' + [...xs].join(',') + '）');
  await sleep(300);
  check(y.x === -40, '3-1 抖完回到原本的 x');
  await T.press('2');
  let hid = false; const t1 = Date.now();
  while (Date.now() - t1 < 500) { if (!y.visible) hid = true; await sleep(10); }
  check(hid, '3-2 閃爍：中間有隱藏');
  await sleep(900);
  check(y.visible, '3-2 閃完是顯示的');
  await T.press('3');
  let mn = 999, mx = 0; const t2 = Date.now();
  while (Date.now() - t2 < 1500) { mn = Math.min(mn, y.size); mx = Math.max(mx, y.size); await sleep(10); }
  check(mx > 108 && mn < 92, '3-3 呼吸：尺寸在 ' + Math.round(mn) + '～' + Math.round(mx) + ' 變化');
  check(mx <= 112.01 && mn >= 87.99, '3-3 呼吸幅度不超過 ±12');
  await sleep(700);
  check(y.size === 100, '3-3 呼吸結束回到 100');
  await T.press('4');
  let dmin = 999, dmax = -999; const t3 = Date.now();
  while (Date.now() - t3 < 1500) { dmin = Math.min(dmin, y.direction); dmax = Math.max(dmax, y.direction); await sleep(10); }
  check(dmax > 105 && dmin < 75, '3-4 擺動：方向在 ' + Math.round(dmin) + '～' + Math.round(dmax));
  await sleep(700);
  check(y.direction === 90, '3-4 擺動結束回到 90 度');
  await T.press('5');
  let ymax = -999; const t4 = Date.now();
  while (Date.now() - t4 < 1200) { ymax = Math.max(ymax, y.y); await sleep(10); }
  check(ymax > -15 && ymax <= -9.99, '3-5 漂浮：最高到 y ≈ −10（' + ymax.toFixed(1) + '）');
  await sleep(1000);
  check(y.y === -30, '3-5 漂浮結束回到原位');
  await T.press('6');
  const seen = []; const t5 = Date.now();
  while (Date.now() - t5 < 1500) { const c = T.cos(y); if (seen[seen.length - 1] !== c) seen.push(c); await sleep(8); }
  check(seen.join(',').startsWith('圓圓1,圓圓2,圓圓3,圓圓4,圓圓1,圓圓2'), '3-6 播放造型：1→2→3→4 播兩次（' + seen.join(',') + '）');
  await sleep(300);
  check(T.cos(y) === '圓圓1', '3-6/3-7 播完換回第 1 個造型');
  // 3-7 從任何造型都能換到指定編號、不會卡住
  y.setCostume(2);
  T.vm.runtime.startHats('event_whenkeypressed', { KEY_OPTION: 'r' }); await sleep(100);
  check(T.cos(y) === '圓圓1', '3-7 從第 3 個換到第 1 個（繞一圈）');
  return T;
}

// ================================================================ ④ 角色管理
async function t4() {
  const T = await open(FILES[4]);
  const y = T.sp('圓圓');
  await T.press('1'); await sleep(150);
  let cl = T.clones('星星');
  const nums = cl.map(c => Object.values(c.variables).find(v => v.name === '編號').value).sort();
  check(cl.length === 5, '4-4 建立 5 個分身（' + cl.length + '）');
  check(nums.join(',') === '1,2,3,4,5', '4-4 分身編號 1～5（' + nums.join(',') + '）');
  check(T.lv('星星', '編號') === 0, '4-4 本體的編號設回 0');
  check(cl.every(c => c.x === c.variables[Object.keys(c.variables).find(k => c.variables[k].name === '編號')].value * 80 - 240 && c.y === -125),
    '4-4 分身依編號排好位置（畫面）');
  check(cl.every(c => T.say(c) === String(Object.values(c.variables).find(v => v.name === '編號').value)), '4-4 分身說出自己的編號（畫面）');
  await T.press('2'); await sleep(120);
  check(T.clones('星星').length === 0, '4-2 清除所有分身');
  check(T.sp('星星') && !T.sp('星星').visible, '4-2 本體還在（隱藏）');
  for (let i = 0; i < 20; i++) {
    await T.press('3', 20);
    if (!(y.x >= -190 && y.x <= 190 && y.y >= -130 && y.y <= 130)) { check(false, '4-5 隨機位置超出留邊 50：' + y.x + ',' + y.y); break; }
  }
  check(true, '4-5 隨機位置 20 次都在留邊 50 以內');
  await T.press('1'); await sleep(120);
  await T.press('4'); await sleep(120);
  check(!y.visible && T.clones('星星').length === 0, '4-3 清空舞台：圓圓隱藏、分身清掉');
  check(T.sp('標題').visible && T.sp('按鍵說明').visible, '4-3 清空舞台：介面角色（標題、說明）不受影響');
  await T.press('5'); await sleep(100);
  check(y.visible && y.x === -140 && y.y === 10, '4-1 重設角色（5）：回來了');
  // 4-6 限制在舞台內（主迴圈一直呼叫）
  y.setXY(400, -300); await sleep(100);
  check(y.x === 195 && y.y === -135, '4-6 被拉回舞台內 (195, −135)（' + y.x + ',' + y.y + '）');
  // 4-7 平滑跟隨
  T.mouse(100, 100); await T.press('m'); await sleep(50);
  const d0 = Math.hypot(100 - y.x, 100 - y.y);
  await sleep(100);
  const d1 = Math.hypot(100 - y.x, 100 - y.y);
  check(d1 < d0 && d1 > 1, '4-7 平滑跟隨：一格一格靠近（' + d0.toFixed(0) + ' → ' + d1.toFixed(0) + '）');
  await sleep(1200);
  check(Math.hypot(100 - y.x, 100 - y.y) < 1, '4-7 最後到達滑鼠位置');
  T.mouse(300, 0); await sleep(1000);
  check(y.x === 195, '4-7＋4-6 滑鼠在舞台外，角色停在邊界');
  await T.press('m');
  return T;
}

// ================================================================ ⑤ 計時與流程
async function t5() {
  const T = await open(FILES[5]);
  const y = T.sp('圓圓');
  check(T.v('畫面') === '選單' && T.cos(T.sp('畫面牌')) === '選單畫面', '5-8 綠旗切到選單（變數與牌子一致）');
  await T.press('8'); await sleep(100);
  check(T.v('畫面') === '遊戲' && T.cos(T.sp('畫面牌')) === '遊戲畫面' && T.stage.getCostumes()[T.stage.currentCostume].name === '遊戲',
    '5-8 切到遊戲：牌子與背景都換了');
  await T.press('7'); await sleep(100);
  check(T.stage.getCostumes()[T.stage.currentCostume].name === '舞台', '5-8 切回選單：背景換回');
  // 5-2 / 5-3 倒數：用 3 秒測
  T.vm.runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: '開始倒數' });
  await T.svc('開始倒數', 2);
  check(T.v('倒數中') === 1 && T.v('剩餘秒數') === 2, '5-2 開始倒數 2 秒');
  await sleep(1300);
  check(T.v('剩餘秒數') === 1, '5-3 過 1.3 秒剩 1（無條件進位）');
  let got = false;
  await T.until(() => T.v('倒數中') === 0, 2000);
  await T.until(() => T.say(y) === '時間到！', 500).then(r => { got = r; });
  check(T.v('剩餘秒數') === 0 && got, '5-3 時間到：剩 0、廣播「時間到」（圓圓說話）');
  const said = T.say(y); await sleep(200);
  check(T.v('倒數中') === 0, '5-3 時間到只廣播一次');
  // 碼錶
  await T.press('2'); await sleep(700);
  const s1 = T.v('碼錶秒數');
  check(s1 >= 0.5 && s1 <= 0.9, '5-4 碼錶跑了約 0.7 秒（' + s1 + '）');
  await T.press('3'); await sleep(50);
  const s2 = T.v('碼錶秒數'); await sleep(300);
  check(T.v('碼錶中') === 0 && T.v('碼錶秒數') === s2 && near(Math.round(s2 * 100), s2 * 100, 1e-6), '5-5 碼錶停止：數字不再變、小數兩位（' + s2 + '）');
  // 5-1 等待可跳過
  await T.press('4'); await sleep(300);
  check(T.say(y).startsWith('等 5 秒'), '5-1 開始等');
  await T.press('space'); await sleep(150);
  check(T.say(y) === '等完了！', '5-1 按空白鍵就跳過');
  check(T.v('跳過') === 0, '5-1 跳過用掉了（設回 0）');
  // 沒有跳過的話要等滿
  await T.until(() => T.say(y) === '', 2000); await sleep(120);
  const t0 = Date.now(); await T.press('4');
  await T.until(() => T.say(y) === '等完了！', 6500);
  const took = (Date.now() - t0) / 1000;
  check(took > 4.8 && took < 5.6, '5-1 沒跳過：等了 ' + took.toFixed(2) + ' 秒');
  // 5-6 冷卻
  await sleep(1600);
  await T.press('5', 30);
  check(T.lv('圓圓', '可以用') === 1, '5-6 第一次可以用（綠旗把上次使用設成 −999）');
  await sleep(200); await T.press('5', 30);
  check(T.lv('圓圓', '可以用') === 0, '5-6 0.2 秒後再按：冷卻中');
  await sleep(1000); await T.press('5', 30);
  check(T.lv('圓圓', '可以用') === 1, '5-6 過了 1 秒又可以用');
  // 5-7 秒數轉時間
  check(await T.svc('秒數轉時間', 125) === '02:05', '5-7 125 → 02:05');
  check(await T.svc('秒數轉時間', 59.7) === '00:59', '5-7 59.7 → 00:59');
  check(await T.svc('秒數轉時間', 3600) === '60:00', '5-7 3600 → 60:00');
  await T.press('6'); await sleep(150);
  check(T.say(y) === '125 秒 ＝ 02:05', '5-7 角色端：圓圓說出 02:05');
  return T;
}

// ================================================================ ⑥ 數學小工具
async function t6() {
  const T = await open(FILES[6]);
  const y = T.sp('圓圓');
  check(Number(await T.svc('限制範圍', 150, -100, 100)) === 100, '6-1 150 → 100');
  check(Number(await T.svc('限制範圍', -150, -100, 100)) === -100, '6-1 −150 → −100');
  check(Number(await T.svc('限制範圍', 30, -100, 100)) === 30, '6-1 30 → 30');
  check(near(await T.svc('兩點距離', 0, 0, 3, 4), 5), '6-2 (0,0)-(3,4) = 5');
  check(near(await T.svc('兩點距離', -10, 5, -10, -20), 25), '6-2 直線距離 25');
  check(Number(await T.svc('在範圍內嗎', 100, -100, 100)) === 1, '6-3 100 在 −100～100（含邊界）');
  check(Number(await T.svc('在範圍內嗎', 100.5, -100, 100)) === 0, '6-3 100.5 不在');
  check(Number(await T.svc('在範圍內嗎', -100, -100, 100)) === 1, '6-3 −100 在');
  check(near(await T.svc('四捨五入', 3.14159, 2), 3.14, 1e-9), '6-4 3.14159 → 3.14');
  check(near(await T.svc('四捨五入', 2.675, 1), 2.7, 1e-9), '6-4 2.675 到 1 位 → 2.7');
  check(near(await T.svc('四捨五入', 1234.5, 0), 1235, 1e-9), '6-4 到 0 位 = 一般四捨五入');
  // 6-5 不重複隨機：抽 6 次剛好 1～6 各一次
  const got = [];
  for (let i = 0; i < 6; i++) got.push(Number(await T.svc('不重複隨機', 1, 6)));
  check(got.slice().sort().join(',') === '1,2,3,4,5,6', '6-5 抽 6 次不重複（' + got.join(',') + '）');
  const g7 = Number(await T.svc('不重複隨機', 1, 6));
  check(g7 >= 1 && g7 <= 6 && T.list('抽籤袋').length === 5, '6-5 袋子空了自動裝滿（剩 5 個）');
  await T.svc('不重複隨機', 10, 12);
  check(T.list('抽籤袋').length === 2 && T.v('抽籤範圍') === '10~12', '6-5 範圍改了就重新裝（10～12）');
  // 角色端
  await T.press('4'); await sleep(150);
  check(T.say(y) === '3.14159 到小數 2 位 → 3.14', '6-4 角色端：說出 3.14');
  T.mouse(y.x + 30, y.y + 40); await sleep(50);
  await T.press('2'); await sleep(150);
  check(T.say(y) === '我到滑鼠的距離：50', '6-2 角色端：到滑鼠距離 50');
  T.mouse(20, 0); await T.press('3'); await sleep(150);
  check(T.say(y) === '滑鼠在中間（−100～100）', '6-3 角色端：滑鼠在中間');
  await T.press('1'); await sleep(150);
  const m = T.say(y).match(/^(-?\d+) 限制在 −200～200 → (-?\d+)$/);
  check(m && Number(m[2]) === Math.max(-200, Math.min(200, Number(m[1]))), '6-1 角色端：' + T.say(y));
  return T;
}

// ================================================================ ⑦ 清單工具
async function t7() {
  const T = await open(FILES[7]);
  const y = T.sp('圓圓');
  const L = () => T.list('工作清單');
  const set = a => { L().length = 0; a.forEach(x => L().push(x)); };
  set([42, 7, 88, 15, 63, 30]);
  await T.svc('清單排序');
  check(L().map(Number).join(',') === '7,15,30,42,63,88', '7-2 排序 → 7,15,30,42,63,88（' + L().join(',') + '）');
  set(['10', '9', '100', '2']); await T.svc('清單排序');
  check(L().join(',') === '2,9,10,100', '7-2 數字文字也照大小排（不是照字母）');
  set([42, 7, 88, 15, 63, 30]);
  let same = 0;
  for (let i = 0; i < 20; i++) {
    await T.svc('清單洗牌');
    if (L().map(Number).join(',') === '42,7,88,15,63,30') same++;
    check(L().map(Number).sort((a, b) => a - b).join(',') === '7,15,30,42,63,88', '7-1 洗牌不會多或少項目');
  }
  check(same < 4, '7-1 洗 20 次，順序幾乎每次都不同（和原本一樣 ' + same + ' 次）');
  set([42, 7, 88, 15, 63, 30]);
  await T.svc('清單最大值');
  check(Number(T.v('結果')) === 88 && Number(T.v('位置')) === 3, '7-3 最大值 88 在第 3 項');
  set([]); await T.svc('清單最大值');
  check(Number(T.v('位置')) === 0, '7-3 空清單：位置 0');
  set([42, 7, 88, 15, 63, 30]);
  check(Number(await T.svc('清單加總')) === 245, '7-4 加總 245');
  check(near(await T.svc('清單平均'), 245 / 6, 1e-9), '7-5 平均 40.83…');
  set([]); check(Number(await T.svc('清單平均')) === 0, '7-5 空清單平均 0（不會除以 0）');
  await T.svc('拆成清單', '蘋果,香蕉,芭樂,西瓜', ',');
  check(L().join('|') === '蘋果|香蕉|芭樂|西瓜', '7-6 拆成 4 項（' + L().join('|') + '）');
  await T.svc('拆成清單', '1 2  3', ' ');
  check(L().join('|') === '1|2||3', '7-6 連續兩個分隔會拆出空的一項');
  await T.svc('拆成清單', '蘋果,香蕉,芭樂,西瓜', ',');
  check(await T.svc('合併成文字', '、') === '蘋果、香蕉、芭樂、西瓜', '7-7 合併成「蘋果、香蕉、芭樂、西瓜」');
  set(['只有一個']); check(await T.svc('合併成文字', '、') === '只有一個', '7-7 只有一項');
  // 角色端（按鍵）
  set([42, 7, 88, 15, 63, 30]);
  await T.press('3'); await sleep(150);
  check(T.say(y) === '最大是 88，在第 3 項', '7-3 角色端：' + T.say(y));
  await T.press('4'); await sleep(150);
  check(T.say(y) === '總和：245', '7-4 角色端');
  await T.press('6'); await sleep(100); await T.press('7'); await sleep(150);
  check(T.say(y) === '蘋果、香蕉、芭樂、西瓜', '7-6＋7-7 角色端');
  await T.press('0'); await sleep(100);
  check(L().length === 6 && L().every(x => x >= 1 && x <= 99), '按 0 重新填 6 個 1～99 的數字');
  return T;
}

// ================================================================ ⑧ 遊戲機制
async function t8() {
  const T = await open(FILES[8]);
  const p = T.sp('玩家');
  await sleep(300);
  check(p.y === -78 && T.v('生命值') === 3 && T.v('遊戲中') === 1, '開始遊戲：站在地面、生命 3');
  check(T.clones('雲').length === 3, '雲：3 個分身');
  const x0 = p.x;
  T.key('right', true); await sleep(400); T.key('right', false);
  check(p.x > x0 + 40, '8-1 按住 → 一直往右走（' + Math.round(x0) + ' → ' + Math.round(p.x) + '）');
  const x1 = p.x;
  T.key('a', true); await sleep(300); T.key('a', false);
  check(p.x < x1 - 30, '8-1 A 鍵往左');
  T.key('up', true); await sleep(60); T.key('up', false);
  let top = -999; const t0 = Date.now();
  while (Date.now() - t0 < 1500) { top = Math.max(top, p.y); await sleep(8); }
  check(top > 40 && top < 70, '8-2 跳起來最高約 −78＋135（實際 ' + top.toFixed(0) + '）');
  check(p.y === -78, '8-2 落回地面');
  // 空中連跳：按住 ↑ 不放，要落地才能再跳
  T.key('up', true); await sleep(250);
  const vy = T.lv('玩家', '上下速度');
  check(p.y > -78 && vy < 18, '8-2 按住不放也不會在空中重新起跳');
  T.key('up', false); await sleep(1500);
  // 8-3 受傷＋無敵
  await T.press('h'); await sleep(40);
  check(T.v('生命值') === 2, '8-3 受傷：生命 3 → 2');
  await T.press('h'); await sleep(40);
  check(T.v('生命值') === 2, '8-3 無敵中再被撞不扣血');
  let gs = new Set(); const t1 = Date.now();
  while (Date.now() - t1 < 500) { gs.add(T.ghost(p)); await sleep(15); }
  check(gs.has(0) && gs.has(70), '8-4 無敵閃爍：幻影在 0 和 70 之間切換');
  await sleep(1200);
  check(T.ghost(p) === 0, '8-4 無敵結束：幻影 0');
  await T.press('h'); await sleep(40);
  check(T.v('生命值') === 1, '8-3 無敵過了再撞才扣血');
  // 8-6 捲動
  const c = T.clones('雲')[0]; const cx = c.x; await sleep(300);
  check(c.x < cx || c.x > 200, '8-6 雲往左捲');
  c.setXY(-251, c.y); await sleep(60);
  check(c.x > 240, '8-6 x < −250 從右邊回來（' + Math.round(c.x) + '）');
  // 8-5 最高分
  await sleep(1600);
  await T.press('h', 40); await sleep(1700); await T.press('h', 40);  // 可能已經 0
  await T.until(() => T.v('遊戲中') === 0, 3000);
  const sc = T.v('分數');
  check(T.v('生命值') < 1 && T.v('遊戲中') === 0, '生命 0 → 遊戲結束');
  check(T.v('最高分') === sc && sc > 0 && T.v('破紀錄') === 1, '8-5 第一次玩：最高分 = 分數（' + sc + '）、破紀錄 1');
  check(T.say(p) === '遊戲結束！按 R 再玩一次', '遊戲結束：玩家說出提示（畫面）');
  await T.press('r'); await sleep(200);
  check(T.v('分數') === 0 && T.v('生命值') === 3 && T.say(p) === '', 'R 重新開始：分數 0、生命 3（' + [T.v('分數'), T.v('生命值'), T.say(p)].join('/') + '）');
  await sleep(1200);
  for (let i = 0; i < 3; i++) { await T.press('h', 30); await sleep(1600); }
  await T.until(() => T.v('遊戲中') === 0, 2000);
  check(T.v('最高分') === Math.max(sc, T.v('分數')) && T.v('破紀錄') === (T.v('分數') > sc ? 1 : 0),
    '8-5 第二次：最高分 ' + T.v('最高分') + '、這次 ' + T.v('分數') + '、破紀錄 ' + T.v('破紀錄'));
  return T;
}

// ================================================================ 完整函式庫
async function t0() {
  const T = await open(FILES[0]);
  const y = T.sp('函式小幫手');
  const want = ['打字機說 %s 每字 %s 秒', '淡入 %s 秒', '建立分身群 %s 個', '冷卻檢查 %s 秒', '重力跳躍 重力 %s 跳躍力 %s 地面 %s'];
  const procs = new Set(Object.values(y.blocks._blocks).filter(b => b.opcode === 'procedures_prototype').map(b => b.mutation.proccode));
  check(want.every(w => procs.has(w)), '函式小幫手有 A 型函式（抽查 5 個）');
  check(procs.size === 27, '函式小幫手：27 個 A 型函式（' + procs.size + '）');
  const sp = new Set(Object.values(T.stage.blocks._blocks).filter(b => b.opcode === 'procedures_prototype').map(b => b.mutation.proccode));
  check(sp.size === 24, '舞台：24 個 B 型函式（' + sp.size + '）');
  check(await T.svc('秒數轉時間', 61) === '01:01', '服務台 秒數轉時間 61 → 01:01');
  check(Number(await T.svc('限制範圍', 5, 0, 3)) === 3, '服務台 限制範圍');
  check(await T.svc('合併成文字', '+') === '5+3+8', '服務台 合併成文字（預設清單 5,3,8）');
  await T.svc('播放對話');
  await T.until(() => T.say(y).length > 5, 3000);
  check(T.say(y).startsWith('把你的劇本'), '服務台 播放對話 → 小幫手（我的名字）說話');
  check(T.lv('函式小幫手', '上次使用') === -999, '綠旗：上次使用 = −999');
  return T;
}

// ================================================================ .sprite3 匯入別的作品
async function tS() {
  const files = fs.readdirSync(SP3).filter(f => f.endsWith('.sprite3')).sort();
  for (const f of files) {
    const T = await open(FILES[6]);                       // 隨便一個作品當「別人的作品」
    const before = T.vm.runtime.targets.length;
    await T.vm.addSprite(fs.readFileSync(path.join(SP3, f)));
    await sleep(100);
    const added = T.vm.runtime.targets.filter(t => !t.isStage && t.isOriginal).slice(-1)[0];
    check(T.vm.runtime.targets.length === before + 1, f + '：匯入成功');
    // 積木裡用到的變數都要找得到（找不到的話 Scratch 會在執行時偷偷建立一個新的）
    const refs = added.blocks.getAllVariableAndListReferences();
    const missing = Object.keys(refs).filter(id => !added.lookupVariableById(id));
    check(missing.length === 0, f + '：變數參照都接上了（' + (missing.map(id => refs[id][0].referencingField.value).join('、') || '全部 OK') + '）');
    const glob = Object.keys(refs).filter(id => T.stage.variables[id]).map(id => T.stage.variables[id].name);
    if (glob.length) console.log('    （' + f + ' 在舞台建立的全域變數：' + glob.join('、') + '）');
    // 真的叫一個函式看看
    if (f.includes('出場')) {
      added.setVisible(false);
      T.vm.runtime.startHats('event_whenkeypressed', { KEY_OPTION: 'zz' });
      const blocks = added.blocks;
      const call = Object.values(blocks._blocks).find(b => b.opcode === 'procedures_prototype' && b.mutation.proccode === '淡入 %s 秒');
      check(!!call, f + '：有「淡入」');
    }
  }
}

(async () => {
  const which = process.argv.slice(2);
  const all = { 1: t1, 2: t2, 3: t3, 4: t4, 5: t5, 6: t6, 7: t7, 8: t8, 0: t0, s: tS };
  const run = which.length ? which : ['1', '2', '3', '4', '5', '6', '7', '8', '0', 's'];
  for (const k of run) {
    const p0 = pass, f0 = fail, t = Date.now();
    console.log('── ' + (k === 's' ? '.sprite3 匯入' : FILES[k]));
    const T = await all[k]();
    if (T) {
      check(T.errs.length === 0, (FILES[k] || k) + '：載入沒有錯誤' + (T.errs.length ? '（' + T.errs[0] + '）' : ''));
      T.vm.stopAll(); T.vm.runtime.quit && T.vm.runtime.quit();
    }
    console.log('   通過 ' + (pass - p0) + '，失敗 ' + (fail - f0) + '（' + ((Date.now() - t) / 1000).toFixed(1) + ' 秒）');
  }
  console.log('\n合計：通過 ' + pass + ' 項，失敗 ' + fail + ' 項');
  if (fails.length) console.log('失敗：\n  ' + fails.join('\n  '));
  process.exit(fail ? 1 : 0);
})();
