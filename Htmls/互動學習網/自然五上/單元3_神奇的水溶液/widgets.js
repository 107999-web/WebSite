/* =========================================================
 * 自然五上・單元3 神奇的水溶液｜互動實驗元件
 * 實驗結果依課本與習作的範例繪製（示意），實際顏色請依實際操作結果記錄
 * ========================================================= */
(function () {
  'use strict';

  function seg(el, items, current, onPick) {
    const wrap = document.createElement('span');
    wrap.className = 'seg';
    items.forEach(([val, label]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'k-btn ghost small'; b.textContent = label;
      b.setAttribute('aria-pressed', val === current);
      b.onclick = () => { wrap.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); onPick(val); };
      wrap.appendChild(b);
    });
    el.appendChild(wrap);
    return wrap;
  }
  const HL = '#E53950';
  /* 燒杯：x, y 為左上角，w、h 為大小，level 為液面高度比例（0～1） */
  function beaker(x, y, w, h, level, fill, label) {
    const ly = y + h - h * level;
    return `<path d="M${x + 4} ${ly} L${x + 4} ${y + h - 6} Q${x + 4} ${y + h} ${x + 10} ${y + h} L${x + w - 10} ${y + h} Q${x + w - 4} ${y + h} ${x + w - 4} ${y + h - 6} L${x + w - 4} ${ly} Z" fill="${fill}"/>
      <path d="M${x} ${y} L${x} ${y + h - 8} Q${x} ${y + h + 2} ${x + 10} ${y + h + 2} L${x + w - 10} ${y + h + 2} Q${x + w} ${y + h + 2} ${x + w} ${y + h - 8} L${x + w} ${y}" fill="none" stroke="#90A4AE" stroke-width="3"/>
      ${label ? `<text x="${x + w / 2}" y="${y + h + 20}" text-anchor="middle" font-size="13" font-weight="700" fill="#5D4037">${label}</text>` : ''}`;
  }
  /* 試管 */
  function tube(x, y, level, fill, label) {
    const h = 120, ly = y + h - h * level;
    return `<path d="M${x + 3} ${ly} L${x + 3} ${y + h - 10} A12 12 0 0 0 ${x + 27} ${y + h - 10} L${x + 27} ${ly} Z" fill="${fill}"/>
      <path d="M${x} ${y} L${x} ${y + h - 10} A15 15 0 0 0 ${x + 30} ${y + h - 10} L${x + 30} ${y}" fill="none" stroke="#90A4AE" stroke-width="3"/>
      ${label ? `<text x="${x + 15}" y="${y + h + 22}" text-anchor="middle" font-size="13" font-weight="700" fill="#5D4037">${label}</text>` : ''}`;
  }
  function scale(x, y, value) {
    return `<rect x="${x}" y="${y}" width="120" height="34" rx="8" fill="#ECEFF1" stroke="#90A4AE" stroke-width="2"/>
      <rect x="${x + 30}" y="${y + 7}" width="60" height="20" rx="4" fill="#263238"/>
      <text x="${x + 60}" y="${y + 22}" text-anchor="middle" font-size="13" font-weight="700" fill="#76FF03" font-family="monospace">${value} g</text>`;
  }

  /* ---------------- 3-1 活動2 溶解前後的重量 ---------------- */
  function dissolveScale(el) {
    let solute = 'salt', grams = 5, step = 0;
    el.innerHTML = `<div class="controls a"></div><div class="controls b"></div><div class="stage"></div>
      <div class="controls"><button type="button" class="k-btn small go">➡️ 下一步</button><button type="button" class="k-btn ghost small rs">↺ 重來</button></div>
      <div class="say"></div><div class="tbl-wrap"><table class="k-tbl rec"></table></div>`;
    seg(el.querySelector('.a'), [['salt', '🧂 食鹽'], ['sugar', '🍬 糖']], solute, v => { solute = v; step = 0; draw(); });
    seg(el.querySelector('.b'), [[5, '5 公克'], [10, '10 公克'], [15, '15 公克']], grams, v => { grams = v; step = 0; draw(); });
    el.querySelector('.go').onclick = () => { step = Math.min(2, step + 1); draw(); };
    el.querySelector('.rs').onclick = () => { step = 0; draw(); };
    const BW = 205, PAPER = 4; // 燒杯＋100 公克水、秤量紙（示意數值，與習作紀錄相同）
    const rec = {};
    function draw() {
      const name = solute === 'salt' ? '食鹽' : '糖';
      const left = BW + (step ? grams : 0), right = PAPER + (step ? 0 : grams), total = left + right;
      if (step === 2) rec[solute + grams] = total;
      const grains = [...Array(step === 0 ? 14 : step === 1 ? 10 : 0)].map((_, i) => {
        const gx = step === 0 ? 232 + (i * 13) % 50 : 70 + (i * 17) % 70, gy = step === 0 ? 118 - (i % 4) * 4 : 160 + (i % 3) * 6;
        return `<rect x="${gx}" y="${gy}" width="4" height="4" fill="#fff" stroke="#90A4AE" stroke-width="0.6"/>`;
      }).join('');
      let s = `<svg viewBox="0 0 360 240" role="img" aria-label="溶解前後總重量都是 ${total} 公克">
        ${beaker(60, 80, 100, 100, 0.62, step === 2 ? '#E1F5FE' : '#E3F2FD', step === 2 ? `${name}水溶液` : '水 100 公克')}
        ${scale(50, 205, left)}
        <path d="M215 126 L285 126 L278 132 L222 132 Z" fill="#FFF8E1" stroke="#BCAAA4"/>
        ${scale(190, 205, right)}
        <text x="250" y="${step ? 160 : 160}" text-anchor="middle" font-size="13" font-weight="700" fill="#5D4037">${step ? '秤量紙（已倒空）' : `${name} ${grams} 公克`}</text>
        ${grains}
        ${step === 2 ? `<path d="M110 110 q20 -30 40 0" fill="none" stroke="#8D6E63" stroke-width="3"/><text x="110" y="66" text-anchor="middle" font-size="12" fill="#5D4037">攪拌到完全溶解</text>` : ''}
        ${step === 1 ? `<text x="110" y="66" text-anchor="middle" font-size="12" fill="#5D4037">倒入${name}</text>` : ''}
        <rect x="120" y="8" width="120" height="30" rx="12" fill="#fff" stroke="${HL}" stroke-width="2"/>
        <text x="180" y="28" text-anchor="middle" font-size="14" font-weight="800" fill="${HL}">總重量 ${total} g</text></svg>`;
      el.querySelector('.stage').innerHTML = s;
      el.querySelector('.say').innerHTML = [
        `<b>溶解前</b>：分別秤出「水和燒杯」（${BW} g）以及「${name}和紙」（${PAPER + grams} g），總重量 = <b>${BW + PAPER + grams} g</b>。使用電子秤前要先<b>歸零</b>。`,
        `<b>倒入${name}</b>：${name}從紙上移到燒杯裡，左邊變重、右邊變輕，總重量還是 <b>${total} g</b>。`,
        `<b>溶解後</b>：${name}溶解看不見了，但沒有消失！總重量仍然是 <mark>${total} g</mark>，溶解前後的總重量<b>相同</b>。`][step];
      el.querySelector('.rec').innerHTML = `<tr><th>溶質</th><th>加入量</th><th>溶解前總重量</th><th>溶解後總重量</th></tr>` +
        ['salt', 'sugar'].map(k => [5, 10, 15].map(g => `<tr><td>${k === 'salt' ? '食鹽' : '糖'}</td><td>${g} g</td><td>${BW + PAPER + g} g</td><td>${rec[k + g] ? rec[k + g] + ' g' : '？'}</td></tr>`).join('')).join('');
      el.querySelector('.go').disabled = step === 2;
    }
    draw();
  }

  /* ---------------- 3-1 活動3 取回水溶液中的物質 ---------------- */
  function evaporate(el) {
    let method = 'sun', sol = 'salt', t = 0;
    el.innerHTML = `<div class="controls m"></div><div class="controls s"></div>
      <div class="controls"><label>⏱️ 經過時間 <input type="range" min="0" max="100" value="0"></label></div><div class="stage"></div><div class="say"></div>`;
    seg(el.querySelector('.m'), [['sun', '☀️ 淺盤放在陽光下'], ['glass', '🪟 玻璃片放在通風處'], ['lamp', '💡 淺盤用鹵素燈照射']], method, v => { method = v; draw(); });
    seg(el.querySelector('.s'), [['salt', '食鹽水溶液'], ['sugar', '糖水溶液']], sol, v => { sol = v; draw(); });
    const r = el.querySelector('input');
    r.oninput = () => { t = +r.value; draw(); };
    function draw() {
      const water = 1 - t / 100, glass = method === 'glass';
      let s = `<svg viewBox="0 0 360 200" role="img" aria-label="水分蒸發${t}%">
        <rect width="360" height="200" fill="${method === 'sun' ? '#FFFDE7' : '#F5F9FF'}"/>`;
      if (method === 'sun') s += `<circle cx="310" cy="38" r="22" fill="#FFD54F"/>` + [...Array(8)].map((_, i) => { const a = i * Math.PI / 4; return `<line x1="${310 + 28 * Math.cos(a)}" y1="${38 + 28 * Math.sin(a)}" x2="${310 + 36 * Math.cos(a)}" y2="${38 + 36 * Math.sin(a)}" stroke="#FFB300" stroke-width="3"/>`; }).join('');
      if (method === 'lamp') s += `<path d="M160 20 L200 20 L215 50 L145 50 Z" fill="#B0BEC5"/><ellipse cx="180" cy="52" rx="30" ry="6" fill="#FFF59D"/><path d="M152 55 L110 120 L250 120 L208 55 Z" fill="#FFF59D" opacity="0.45"/>`;
      if (method === 'glass') s += [0, 1, 2].map(i => `<path d="M${30 + i * 20} ${70 + i * 18} q20 -8 40 0 q20 8 40 0" fill="none" stroke="#90CAF9" stroke-width="3"/>`).join('') + `<text x="40" y="60" font-size="12" fill="#1E88E5">通風</text>`;
      // 容器
      if (glass) {
        s += `<rect x="110" y="140" width="140" height="10" rx="3" fill="#E0F7FA" stroke="#80DEEA" stroke-width="2"/>`;
        if (water > 0.02) s += `<ellipse cx="180" cy="${140}" rx="${8 + 10 * water}" ry="${2 + 5 * water}" fill="#B3E5FC" stroke="#4FC3F7"/>`;
      } else {
        s += `<path d="M100 130 L110 155 L250 155 L260 130" fill="#FAFAFA" stroke="#90A4AE" stroke-width="3"/>`;
        if (water > 0.02) s += `<path d="M${104 + 3 * (1 - water)} ${155 - 20 * water} L110 153 L250 153 L${256 - 3 * (1 - water)} ${155 - 20 * water} Z" fill="#B3E5FC" opacity="0.9"/>`;
      }
      // 析出物
      const n = Math.round(Math.max(0, (t - 45) / 55) * 18);
      for (let i = 0; i < n; i++) {
        const x = glass ? 172 + (i * 7) % 18 : 120 + (i * 37) % 120, y = glass ? 136 - (i % 2) * 3 : 147 - (i % 3) * 3;
        s += sol === 'salt' ? `<rect x="${x}" y="${y}" width="5" height="5" fill="#fff" stroke="#78909C" stroke-width="0.8"/>` : `<circle cx="${x}" cy="${y + 2}" r="3" fill="#FFF8E1" stroke="#BCAAA4" stroke-width="0.8"/>`;
      }
      // 蒸發的水蒸氣
      if (t > 0 && t < 100) s += [0, 1, 2].map(i => `<path d="M${150 + i * 30} 120 q-6 -10 0 -20 q6 -10 0 -20" fill="none" stroke="#B0BEC5" stroke-width="2" stroke-dasharray="3 3"/>`).join('');
      s += `<text x="180" y="185" text-anchor="middle" font-size="13" font-weight="700" fill="${HL}">${t === 0 ? '透明的液體' : t < 100 ? '水分慢慢蒸發中…' : `留下${sol === 'salt' ? '白色的顆粒（食鹽）' : '糖'}`}</text></svg>`;
      el.querySelector('.stage').innerHTML = s;
      el.querySelector('.say').innerHTML = t < 100
        ? '拖動「經過時間」，看看水分蒸發後會留下什麼。放在<b>空氣流通或陽光照射</b>的地方、<b>加熱</b>、取<b>少量</b>並<b>擴大蒸發面積</b>，都能讓水分蒸發得比較快。'
        : `水分蒸發後，溶解在水中的${sol === 'salt' ? '食鹽' : '糖'}被<mark>分離出來</mark>，和溶解前加入的物質一樣。這就是鹽田晒鹽的原理。`;
    }
    draw();
  }

  /* ---------------- 3-2 活動1 石蕊試紙 ---------------- */
  const SOLS = [
    ['vinegar', '白醋', 'acid'], ['lemon', '檸檬汁', 'acid'], ['sugar', '糖水', 'neutral'], ['salt', '食鹽水', 'neutral'],
    ['soda', '小蘇打水', 'base'], ['clean', '鹼性清潔劑', 'base']];
  const KIND = { acid: '酸性', neutral: '中性', base: '鹼性' };
  function litmus(el) {
    let cur = 'vinegar';
    const done = {};
    el.innerHTML = `<div class="controls pk"></div><div class="stage"></div><div class="say"></div><div class="tbl-wrap"><table class="k-tbl rec"></table></div>`;
    seg(el.querySelector('.pk'), SOLS.map(x => [x[0], x[1]]), cur, v => { cur = v; draw(); });
    const RED = '#F48FB1', BLUE = '#90A4F4';
    function draw() {
      const [, name, kind] = SOLS.find(x => x[0] === cur); done[cur] = true;
      const redAfter = kind === 'base' ? BLUE : RED, blueAfter = kind === 'acid' ? RED : BLUE;
      const strip = (x, base, after, label) => `<rect x="${x}" y="70" width="60" height="110" rx="6" fill="${base}" stroke="#78909C"/>
        <circle cx="${x + 30}" cy="140" r="20" fill="${after}" stroke="#fff" stroke-width="2"/>
        <text x="${x + 30}" y="198" text-anchor="middle" font-size="13" font-weight="700" fill="#5D4037">${label}</text>
        <text x="${x + 30}" y="60" text-anchor="middle" font-size="12" font-weight="700" fill="${after === base ? '#78909C' : HL}">${after === base ? '不變色' : after === RED ? '變紅色' : '變藍色'}</text>`;
      el.querySelector('.stage').innerHTML = `<svg viewBox="0 0 360 210" role="img" aria-label="${name}：紅色石蕊試紙${redAfter === RED ? '不變色' : '變藍色'}，藍色石蕊試紙${blueAfter === BLUE ? '不變色' : '變紅色'}">
        <path d="M168 8 L192 8 L186 40 L174 40 Z" fill="#ECEFF1" stroke="#90A4AE" stroke-width="2"/><rect x="170" y="0" width="20" height="10" rx="3" fill="#B0BEC5"/>
        <text x="200" y="28" font-size="13" font-weight="700" fill="#5D4037">滴管：${name}</text>
        ${strip(90, RED, redAfter, '紅色石蕊試紙')}${strip(210, BLUE, blueAfter, '藍色石蕊試紙')}</svg>`;
      el.querySelector('.say').innerHTML = `<b>${name}</b>：紅色石蕊試紙${redAfter === RED ? '不變色' : '<b>變藍色</b>'}，藍色石蕊試紙${blueAfter === BLUE ? '不變色' : '<b>變紅色</b>'} → <mark>${KIND[kind]}水溶液</mark>`;
      el.querySelector('.rec').innerHTML = `<tr><th>水溶液</th><th>紅色石蕊試紙</th><th>藍色石蕊試紙</th><th>酸鹼性</th></tr>` +
        SOLS.map(([k, n, kd]) => done[k] ? `<tr><td>${n}</td><td>${kd === 'base' ? '變藍色' : '不變色'}</td><td>${kd === 'acid' ? '變紅色' : '不變色'}</td><td>${KIND[kd]}</td></tr>` : `<tr><td>${n}</td><td>？</td><td>？</td><td>？</td></tr>`).join('');
    }
    draw();
  }

  /* ---------------- 3-2 充電站 pH 值 ---------------- */
  function phScale(el) {
    let ph = 7;
    el.innerHTML = `<div class="controls"><label>pH 值 <input type="range" min="1" max="12" step="0.5" value="7"> <b class="v"></b></label></div><div class="stage"></div>`;
    const r = el.querySelector('input'); r.oninput = () => { ph = +r.value; draw(); };
    const COL = ['#D32F2F', '#E64A19', '#F57C00', '#FFA000', '#FBC02D', '#C0CA33', '#7CB342', '#26A69A', '#0097A7', '#1976D2', '#3949AB', '#5E35B1'];
    function draw() {
      const X = v => 20 + (v - 0.5) * 26.6;
      let s = `<svg viewBox="0 0 360 120" role="img" aria-label="pH ${ph}：${ph < 7 ? '酸性' : ph > 7 ? '鹼性' : '中性'}">`;
      COL.forEach((c, i) => { s += `<rect x="${X(i + 1) - 13.3}" y="40" width="26.6" height="30" fill="${c}"/><text x="${X(i + 1)}" y="60" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">${i + 1}</text>`; });
      s += `<text x="${X(3.5)}" y="92" text-anchor="middle" font-size="13" font-weight="700" fill="#D32F2F">酸性（pH＜7）</text>
        <text x="${X(7)}" y="108" text-anchor="middle" font-size="13" font-weight="700" fill="#558B2F">中性（pH＝7）</text>
        <text x="${X(10)}" y="92" text-anchor="middle" font-size="13" font-weight="700" fill="#1976D2">鹼性（pH＞7）</text>
        <path d="M${X(ph)} 36 l-7 -12 h14 z" fill="#5D4037"/>
        <text x="180" y="16" text-anchor="middle" font-size="13" font-weight="700" fill="#5D4037">廣用試紙的顏色（示意）</text></svg>`;
      el.querySelector('.stage').innerHTML = s;
      el.querySelector('.v').textContent = `${ph}（${ph < 7 ? '酸性' : ph > 7 ? '鹼性' : '中性'}）`;
    }
    draw();
  }

  /* ---------------- 3-2 活動2 自製酸鹼指示劑（紫色高麗菜汁） ---------------- */
  const CAB = { acid: ['#E0457B', '紅色系'], neutral: ['#8E6BBF', '紫色系'], base: ['#26A69A', '藍綠色系'] };
  function cabbage(el) {
    let cur = 'vinegar';
    el.innerHTML = `<div class="controls pk"></div><div class="stage"></div><div class="say"></div>`;
    seg(el.querySelector('.pk'), SOLS.filter(x => ['vinegar', 'sugar', 'salt', 'soda'].includes(x[0])).map(x => [x[0], x[1]]), cur, v => { cur = v; draw(); });
    function draw() {
      const [, name, kind] = SOLS.find(x => x[0] === cur);
      let s = `<svg viewBox="0 0 360 200" role="img" aria-label="紫色高麗菜汁滴入${name}，變成${CAB[kind][1]}">
        ${tube(60, 30, 0.6, '#8E6BBF', '紫色高麗菜汁')}
        <path d="M110 80 L230 80" stroke="#BCAAA4" stroke-width="2" stroke-dasharray="5 4"/><path d="M230 80 l-10 -6 v12 z" fill="#BCAAA4"/>
        <text x="170" y="70" text-anchor="middle" font-size="12" fill="#5D4037">滴入等量</text>
        ${tube(260, 30, 0.6, CAB[kind][0], name)}
        <text x="275" y="20" text-anchor="middle" font-size="13" font-weight="800" fill="${CAB[kind][0]}">${CAB[kind][1]}</text>`;
      ['acid', 'neutral', 'base'].forEach((k, i) => {
        s += `<rect x="${95 + i * 60}" y="120" width="50" height="26" rx="8" fill="${CAB[k][0]}" opacity="${k === kind ? 1 : 0.35}"/>
          <text x="${120 + i * 60}" y="162" text-anchor="middle" font-size="11" font-weight="700" fill="#5D4037">${KIND[k]}</text>
          <text x="${120 + i * 60}" y="178" text-anchor="middle" font-size="10" fill="#5D4037">${CAB[k][1]}</text>`;
      });
      s += '</svg>';
      el.querySelector('.stage').innerHTML = s;
      el.querySelector('.say').innerHTML = `紫色高麗菜汁滴入<b>${name}</b>（${KIND[kind]}）→ <mark>${CAB[kind][1]}</mark>。遇到酸性、中性、鹼性會有<b>規律的顏色變化</b>，所以可以做為酸鹼指示劑。<span class="hint">（顏色為示意，請依實際觀察結果記錄）</span>`;
    }
    draw();
  }

  /* ---------------- 3-2 活動3 酸鹼水溶液混合 ---------------- */
  function mixing(el) {
    const ACID = 8; // 丙試管中白醋的「酸」份量（示意）
    let base = 0, acidAdd = 0;
    el.innerHTML = `<div class="stage"></div>
      <div class="controls"><button type="button" class="k-btn small b">💧 滴入 1 滴小蘇打水（鹼）</button><button type="button" class="k-btn alt small a">💧 滴入 1 滴白醋（酸）</button><button type="button" class="k-btn ghost small r">↺ 重來</button></div>
      <div class="say"></div>`;
    el.querySelector('.b').onclick = () => { base++; draw(); };
    el.querySelector('.a').onclick = () => { acidAdd++; draw(); };
    el.querySelector('.r').onclick = () => { base = 0; acidAdd = 0; draw(); };
    function draw() {
      const net = base - ACID - acidAdd;
      const kind = net < -1 ? 'acid' : net > 1 ? 'base' : 'neutral';
      const lvl = Math.min(0.9, 0.45 + (base + acidAdd) * 0.02);
      el.querySelector('.stage').innerHTML = `<svg viewBox="0 0 360 200" role="img" aria-label="丙試管顏色：${CAB[kind][1]}">
        ${tube(50, 30, 0.6, CAB.acid[0], '甲：白醋')}${tube(290, 30, 0.6, CAB.base[0], '乙：小蘇打水')}
        ${tube(165, 30, lvl, CAB[kind][0], '丙：混合')}
        <text x="180" y="18" text-anchor="middle" font-size="13" font-weight="800" fill="${CAB[kind][0]}">${CAB[kind][1]}（${KIND[kind]}）</text>
        <text x="100" y="110" font-size="12" fill="#5D4037">加入鹼 ${base} 滴</text><text x="210" y="130" font-size="12" fill="#5D4037">再加酸 ${acidAdd} 滴</text></svg>`;
      el.querySelector('.say').innerHTML = kind === 'acid'
        ? (base === 0 ? '丙試管裝白醋並滴入紫色高麗菜汁，呈<b>紅色系</b>（酸性）。按「滴入小蘇打水」，一次一滴，觀察顏色變化。' : '還是<b>紅色系</b>，繼續慢慢滴入小蘇打水……')
        : kind === 'neutral' ? '由紅色系變成<mark>紫色系</mark>：酸和鹼混合後，水溶液可能變成<b>中性</b>。'
          : '變成<mark>藍綠色系</mark>：鹼性水溶液加多了，變成<b>鹼性</b>。想變回酸性嗎？持續滴入白醋（酸性水溶液）試試看！';
    }
    draw();
  }

  /* ---------------- 3-3 水溶液的導電性 ---------------- */
  function conductivity(el) {
    let cur = 'none';
    el.innerHTML = `<div class="controls pk"></div><div class="stage"></div><div class="say"></div>`;
    seg(el.querySelector('.pk'), [['none', '（未放入）']].concat(SOLS.filter(x => ['vinegar', 'sugar', 'salt', 'soda'].includes(x[0])).map(x => [x[0], x[1]])), cur, v => { cur = v; draw(); });
    const COND = { vinegar: true, sugar: false, salt: true, soda: true };
    function draw() {
      const sol = SOLS.find(x => x[0] === cur), on = !!(sol && COND[cur]);
      el.querySelector('.stage').innerHTML = `<svg viewBox="0 0 360 220" role="img" aria-label="${sol ? sol[1] : '電線未放入水溶液'}：LED 燈${on ? '發亮' : '不亮'}">
        <rect x="40" y="30" width="80" height="34" rx="6" fill="#FFCC80" stroke="#8D6E63" stroke-width="2"/><rect x="120" y="40" width="8" height="14" fill="#8D6E63"/>
        <text x="80" y="52" text-anchor="middle" font-size="12" font-weight="700" fill="#5D4037">電池 ＋ －</text>
        ${on ? '<circle cx="240" cy="47" r="26" fill="#FFF176" opacity="0.6"/>' : ''}
        <path d="M228 60 L228 35 A12 12 0 0 1 252 35 L252 60 Z" fill="${on ? '#FFEB3B' : '#ECEFF1'}" stroke="#90A4AE" stroke-width="2"/>
        <line x1="234" y1="60" x2="234" y2="72" stroke="#78909C" stroke-width="2"/><line x1="246" y1="60" x2="246" y2="76" stroke="#78909C" stroke-width="2"/>
        <text x="270" y="40" font-size="12" font-weight="700" fill="#5D4037">LED 燈</text>
        <path d="M128 47 L200 47 L200 72 L234 72" fill="none" stroke="${on ? HL : '#546E7A'}" stroke-width="3"/>
        <path d="M40 47 L20 47 L20 110 L150 110 L150 175" fill="none" stroke="${on ? HL : '#546E7A'}" stroke-width="3"/>
        <path d="M246 76 L246 110 L210 110 L210 175" fill="none" stroke="${on ? HL : '#546E7A'}" stroke-width="3"/>
        ${beaker(120, 120, 120, 70, sol ? 0.75 : 0, cur === 'vinegar' ? '#FFF9C4' : '#E3F2FD', sol ? sol[1] : '空燒杯')}
        ${on ? `<text x="300" y="100" text-anchor="middle" font-size="14" font-weight="800" fill="${HL}">發亮！</text>` : ''}</svg>`;
      el.querySelector('.say').innerHTML = !sol ? '選擇一種水溶液，把電線兩端放進去（兩條電線不可互相接觸）。'
        : on ? `<b>${sol[1]}</b>讓 LED 燈<mark>發亮</mark> → <b>容易導電</b>。`
          : `<b>${sol[1]}</b>無法讓 LED 燈發亮 → <b>不容易導電</b>。`;
    }
    draw();
  }

  /* ---------------- 科學生活裡找：雨水的 pH 值 ---------------- */
  function rainPh(el) {
    let ph = 5.6;
    el.innerHTML = `<div class="controls"><label>🌧️ 雨水的 pH 值 <input type="range" min="4" max="7" step="0.1" value="5.6"> <b class="v"></b></label></div><div class="stage"></div><div class="say"></div>`;
    const r = el.querySelector('input'); r.oninput = () => { ph = +r.value; draw(); };
    function draw() {
      const X = v => 20 + (v - 4) * 106.7;
      let s = `<svg viewBox="0 0 360 110" role="img" aria-label="雨水 pH ${ph.toFixed(1)}">
        <rect x="${X(4)}" y="36" width="${X(5) - X(4)}" height="28" fill="#eb6834"/>
        <rect x="${X(5)}" y="36" width="${X(7) - X(5)}" height="28" fill="#2a78d6" opacity="0.8"/>
        <text x="${(X(4) + X(5)) / 2}" y="55" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">酸雨 pH＜5.0</text>
        <text x="${(X(5) + X(7)) / 2}" y="55" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">不是酸雨（pH≧5.0）</text>
        ${[4, 5, 5.6, 6, 7].map(v => `<text x="${X(v)}" y="82" text-anchor="middle" font-size="11" fill="#5D4037">${v}</text>`).join('')}
        <text x="${X(5.6)}" y="100" text-anchor="middle" font-size="10" fill="#5D4037">自然雨水約 5.6</text>
        <path d="M${X(ph)} 32 l-7 -12 h14 z" fill="#5D4037"/></svg>`;
      el.querySelector('.stage').innerHTML = s;
      el.querySelector('.v').textContent = ph.toFixed(1);
      el.querySelector('.say').innerHTML = ph < 5 ? `pH ${ph.toFixed(1)}＜5.0：環境部認定為<mark>酸雨</mark>，雨水受到人類排放的酸性汙染物影響。`
        : ph < 7 ? `pH ${ph.toFixed(1)}：仍是<b>酸性</b>（pH＜7），但不算酸雨。大自然的雨水溶解了二氧化碳，pH 值約 5.6。` : 'pH 7：中性。';
    }
    draw();
  }

  window.UnitWidgets = { dissolveScale, evaporate, litmus, phScale, cabbage, mixing, conductivity, rainPh };
})();
