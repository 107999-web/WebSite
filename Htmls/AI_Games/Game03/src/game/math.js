// 數學門：產生算式、計算結果、挑一組左右兩扇門。
// 算式是一串步驟 [['+', 5]]、[['×', 2], ['−', 3]]，由左往右算；除法無條件捨去，最少剩 1 人（英雄自己）。
// 隊伍有上限（game.json 的 maxCount）：結果超過上限就算上限；人數多時不出乘法（不然一下就滿了）。
// 數字範圍在 data/game.json 的 difficulties[難度].math：{ steps: [最少, 最多], ops: { '+': [小, 大], ... } }

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const between = ([lo, hi]) => lo + Math.floor(Math.random() * (hi - lo + 1));

export function evaluate(steps, n, max = Infinity) {
  let v = n;
  for (const [op, k] of steps) {
    if (op === '+') v += k;
    else if (op === '−') v -= k;
    else if (op === '×') v *= k;
    else if (op === '÷') v = Math.floor(v / k);
  }
  return Math.min(max, Math.max(1, v));
}

export const label = (steps) => steps.map(([op, k]) => `${op}${k}`).join(' ');

function randomSteps(math) {
  const count = between(math.steps ?? [1, 1]);
  const ops = Object.keys(math.ops);
  const steps = [];
  for (let i = 0; i < count; i++) {
    let op = pick(ops);
    if (i > 0 && steps[i - 1][0] === op) op = pick(ops); // 兩步驟盡量不要同一種
    steps.push([op, between(math.ops[op])]);
  }
  return steps;
}

// 一扇門：算式＋加入哪種夥伴（只有「+」開頭的門會寫職業，乘除是照現在隊伍的比例複製）
function makeOption(math, n, classes, max) {
  const steps = randomSteps(math);
  const result = evaluate(steps, n, max);
  const type = steps[0][0] === '+' && steps.length === 1 ? pick(classes) : null;
  return { kind: 'crowd', steps, result, type, good: result > n };
}

// 一組門（2～4 扇）：結果都不一樣、不能等於原本人數、至少一扇是加的；
// 一部分刻意讓最好的兩扇很接近，要真的算才知道。
export function crowdSet(fullMath, n, classes, max = Infinity, doors = 2) {
  const math = { ...fullMath, ops: { ...fullMath.ops } };
  if (n * 2 > max * 0.6) delete math.ops['×'];
  const close = Math.random() < (math.closeChance ?? 0.4);
  let best = null;
  for (let tries = 0; tries < 120; tries++) {
    const set = Array.from({ length: doors }, () => makeOption(math, n, classes, max));
    const results = set.map((o) => o.result);
    if (new Set(results).size < doors || results.includes(n) || !set.some((o) => o.good)) continue;
    const sorted = [...results].sort((a, b) => b - a);
    const isClose = sorted[0] - sorted[1] <= Math.max(2, Math.round(sorted[0] * 0.3));
    best = set;
    if (isClose === close) break;
  }
  if (!best) {
    best = Array.from({ length: doors }, (_, i) => ({ kind: 'crowd', steps: [['+', i + 1]], result: Math.min(max, n + i + 1), type: pick(classes), good: true }));
    best.sort(() => Math.random() - 0.5);
  }
  return { options: best, better: bestIndex(best) };
}

export const bestIndex = (options) => {
  let bi = null, bv = -Infinity;
  options.forEach((o, i) => { if (o.kind === 'crowd' && o.result > bv) { bv = o.result; bi = i; } });
  return bi;
};

// 能力門：2 扇時，簡單一律一藍一紅，普通以上有時兩扇都是藍的（沒有標準答案）；
// 3～4 扇時藍紅混在一起，至少一扇藍、一扇紅
export function abilitySet(abilities, mixedChance, doors = 2) {
  const blue = abilities.filter((a) => a.good), red = abilities.filter((a) => !a.good);
  const shuffle = (list) => [...list].sort(() => Math.random() - 0.5);
  let chosen;
  if (doors === 2 && Math.random() < mixedChance) chosen = shuffle(blue).slice(0, 2);
  else {
    const blues = 1 + Math.floor(Math.random() * (doors - 1));
    chosen = shuffle([...shuffle(blue).slice(0, blues), ...shuffle(red).slice(0, doors - blues)]);
  }
  return { options: chosen.map((x) => ({ kind: 'ability', ...x })), better: null };
}

// 「？」神秘門：穿過才揭曉，從 mystery 清單抽一個（steps 算式／gold 金幣／ambush 伏兵）
export function mysteryOption() { return { kind: 'mystery', good: true }; }

export function rollMystery(table) {
  const total = table.reduce((s, t) => s + (t.weight ?? 1), 0);
  let r = Math.random() * total;
  for (const t of table) { r -= t.weight ?? 1; if (r <= 0) return t; }
  return table[table.length - 1];
}
