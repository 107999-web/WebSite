// 驗證每一課的模擬器題目：
//   1. 題目解析得出來、跑 300 tick 不出錯
//   2. 有 solution 的挑戰：照答案做會過、什麼都不做不會過
//   3. demo 挑戰：預設電路本身就會過
// 用法：python tools/build.py 會先輸出 tools/_sims.json，再 node tools/test_sims.js
const path = require('path');
const R = require(path.join(__dirname, '..', 'assets', 'redsim.js'));
const SIMS = require(path.join(__dirname, '_sims.json'));

let fail = 0, pass = 0;
const log = (ok, msg) => { console.log((ok ? '  ✔ ' : '  ✘ ') + msg); ok ? pass++ : fail++; };

function build(sim, sol) {
  const W = R.parse(sim.rows);
  W.time = sim.time === undefined ? 12 : sim.time;
  (sol || []).forEach(([x, y, tool, dir, extra]) => {
    const r = R.place(W, x, y, tool, dir);
    if (r !== 'ok' && r !== 'rotate') throw new Error(`放不下 ${tool} @${x},${y}: ${r}`);
    for (let i = 0; i < (extra || 0); i++) R.interact(W, x, y);
  });
  for (let i = 0; i < 20; i++) R.step(W);
  return W;
}

for (const [id, sim] of Object.entries(SIMS)) {
  console.log(id, sim.title.replace(/<[^>]+>/g, ''));
  let W;
  try { W = build(sim); for (let i = 0; i < 300; i++) R.step(W); log(true, `解析＋跑 300 tick（${W.w}×${W.h}）`); }
  catch (e) { log(false, '解析失敗：' + e.message); continue; }
  (sim.challenges || []).forEach((ch, i) => {
    const sol = i === 1 && sim.solution2 ? sim.solution2 : sim.solution;
    if (ch.demo) {
      const r = R.runChallenge(build(sim), ch.steps, sim.names);
      log(r.pass, `展示電路通過「${ch.name}」` + (r.pass ? '' : '：' + r.res.map(x => (x.ok ? 'O ' : 'X ') + x.text).join(' / ')));
      return;
    }
    if (!sol) { log(false, `「${ch.name}」沒有 solution`); return; }
    const good = R.runChallenge(build(sim, sol), ch.steps, sim.names);
    log(good.pass, `照答案做會過「${ch.name}」` + (good.pass ? '' : '：' + good.res.map(x => (x.ok ? 'O ' : 'X ') + x.text).join(' / ')));
    const empty = R.runChallenge(build(sim), ch.steps, sim.names);
    log(!empty.pass, `什麼都不做不會過「${ch.name}」`);
  });
}

// 引擎細節
console.log('engine');
{
  const W = R.parse(['L*:A ' + Array(18).fill('-').join(' ')]);
  for (let i = 0; i < 5; i++) R.step(W);
  const lv = W.cells[0].slice(1).map(c => c.lv);
  log(lv[0] === 15 && lv[14] === 1 && lv[15] === 0, '紅石粉 15 → 1，第 16 格變 0：' + lv.join(','));
}
{
  const W = R.parse(['L*:A p> # # # # # # # # # # # # # .']);   // 13 個方塊推不動
  for (let i = 0; i < 5; i++) R.step(W);
  log(!W.cells[0][1].ext, '活塞推 13 個方塊會失敗');
  const W2 = R.parse(['L*:A p> # # # # # # # # # # # # .']);   // 12 個可以
  for (let i = 0; i < 5; i++) R.step(W2);
  log(W2.cells[0][1].ext && W2.cells[0][14] && W2.cells[0][14].t === 'block', '活塞推 12 個方塊成功');
}
{
  const W = R.parse(['C@1728 c> - O', 'C@0 c> - O']);
  for (let i = 0; i < 5; i++) R.step(W);
  log(W.cells[0][1].lv === 15 && W.cells[1][1].lv === 0, '比較器讀全滿箱子 15、空箱子 0');
  const W2 = R.parse(['C@1 c> -']); for (let i = 0; i < 5; i++) R.step(W2);
  log(W2.cells[0][1].lv === 1, '箱子只有 1 個物品 → 1');
}
{
  const W = R.parse(['L:A - r>4 - O:L']);
  for (let i = 0; i < 10; i++) R.step(W);
  W.cells[0][0].on = true;
  let t = 0; while (!R.isOn(W, 'L') && t < 20) { R.step(W); t++; }
  log(t >= 4 && t <= 6, `延遲 4 的中繼器大約 4 tick 後才亮（實測 ${t}）`);
}
{
  const W = R.parse(['L:A - - O:L']);
  W.cells[0][0].on = true; R.step(W);
  log(R.isOn(W, 'L'), '紅石粉沒有延遲：同一 tick 就亮');
}
{
  let ok = true;
  [[6, 0], [12, 15], [18, 0], [0, 0], [9, 11]].forEach(([h, v]) => { if (R.dayLevel(h) !== v) ok = false; });
  log(ok, '日光：6 點 0、12 點 15、18 點 0、9 點 11');
}

{
  const sim = SIMS.s08a;
  const r = R.runChallenge(build(sim, [[1, 3, 'rep', 2]]), sim.challenges[0].steps, sim.names);
  log(!r.pass, '時鐘用延遲 1 的中繼器 → 判定太快（火把會燒壞）');
}
console.log(`\n通過 ${pass}，失敗 ${fail}`);
process.exit(fail ? 1 : 0);
