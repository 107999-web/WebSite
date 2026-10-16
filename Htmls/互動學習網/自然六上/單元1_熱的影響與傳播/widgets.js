/* =========================================================
 * 自然六上・單元1 熱的影響與傳播｜互動實驗元件
 * 粒子圖皆為示意（非呈現真實的粒子大小與數目）
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
  function toggle(el, label, on, onChange) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'k-btn ghost small'; b.textContent = label;
    b.setAttribute('aria-pressed', on);
    b.onclick = () => { const v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', v); onChange(v); };
    el.appendChild(b);
    return b;
  }
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* 元件移出畫面或分頁隱藏時自動停止重繪的動畫迴圈 */
  function animate(el, draw) {
    let start = null;
    const step = ts => {
      if (!el.isConnected) return;
      if (start === null) start = ts;
      if (el.offsetParent !== null) draw((ts - start) / 1000);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------------- 1-1 熱脹冷縮實驗＋粒子示意 ---------------- */
  function expansion(el) {
    let state = 'gas', temp = 0; // temp: -1 冷水、0 常溫、1 熱水
    el.innerHTML = `<div class="controls st"></div><div class="controls tp"></div>
      <div class="split" style="align-items:center"><div class="stage"></div><div><div class="hint" style="text-align:center">粒子示意圖（非真實大小與數目）</div><div class="parts"></div></div></div><div class="say"></div>`;
    seg(el.querySelector('.st'), [['gas', '🎈 氣體（錐形瓶＋氣球）'], ['liquid', '💧 液體（紅色水＋玻璃管）'], ['solid', '🔩 固體（銅球＋銅環）']], state, v => { state = v; draw(); });
    seg(el.querySelector('.tp'), [[-1, '🧊 放入冷水／冰水'], [0, '🌡️ 常溫'], [1, '🔥 放入熱水／加熱']], temp, v => { temp = v; draw(); });
    const parts = el.querySelector('.parts');
    const N = 16;
    const seeds = [...Array(N)].map((_, i) => ({ a: i * 2.39996, r: ((i * 53) % 97) / 97 }));
    function draw() {
      const hot = temp === 1, cold = temp === -1;
      const water = hot ? '#FFCDD2' : cold ? '#BBDEFB' : '#F5F5F5';
      let s = `<svg viewBox="0 0 300 300" role="img" aria-label="熱脹冷縮實驗">
        <rect x="30" y="190" width="240" height="90" rx="10" fill="${water}" stroke="#90A4AE" stroke-width="2"/>
        <text x="150" y="272" text-anchor="middle" font-size="13" fill="#5D4037">${state === 'solid' ? (hot ? '銅球用火加熱後' : cold ? '銅球放入冰水後' : '常溫') : hot ? '熱水' : cold ? '冷水' : '常溫'}</text>`;
      if (state === 'gas') {
        const r = hot ? 42 : cold ? 0 : 16;
        s += `<path d="M120 130 L120 100 L180 100 L180 130 L215 250 L85 250 Z" fill="#F7FBFF" stroke="#90A4AE" stroke-width="3"/>`;
        s += cold ? `<path d="M130 100 Q150 125 170 100 Z" fill="#FFD54F" stroke="#F4A300" stroke-width="2"/>`
          : `<ellipse cx="150" cy="${100 - r}" rx="${Math.max(14, r * 0.9)}" ry="${Math.max(10, r)}" fill="#FFD54F" stroke="#F4A300" stroke-width="2"/>`;
        s += `<rect x="126" y="94" width="48" height="10" rx="4" fill="#FFB300"/>`;
      } else if (state === 'liquid') {
        const lvl = hot ? 40 : cold ? 90 : 65;
        s += `<path d="M120 130 L120 110 L180 110 L180 130 L215 250 L85 250 Z" fill="#EF9A9A" stroke="#90A4AE" stroke-width="3"/>
          <rect x="130" y="100" width="40" height="16" rx="4" fill="#8D6E63"/>
          <rect x="145" y="20" width="10" height="90" fill="#fff" stroke="#90A4AE" stroke-width="2"/>
          <rect x="146" y="${lvl}" width="8" height="${110 - lvl}" fill="#E53950"/>
          <line x1="138" y1="65" x2="162" y2="65" stroke="#5D4037" stroke-width="2"/><text x="166" y="69" font-size="12" fill="#5D4037">原來的水位</text>`;
      } else {
        const br = hot ? 34 : cold ? 26 : 30;
        s += `<rect x="60" y="40" width="180" height="10" fill="#BCAAA4"/>
          <circle cx="150" cy="${hot ? 84 : 90}" r="31" fill="none" stroke="#B87333" stroke-width="8"/>
          <circle cx="150" cy="${hot ? 84 - 38 : 150}" r="${br}" fill="#D4884A" stroke="#8D5524" stroke-width="3"/>
          <text x="192" y="${hot ? 90 : 94}" font-size="13" font-weight="700" fill="#5D4037">← 銅環</text>
          <text x="192" y="${hot ? 44 : 154}" font-size="13" font-weight="700" fill="#5D4037">← 銅球</text>`;
      }
      s += '</svg>';
      el.querySelector('.stage').innerHTML = s;
      const say = el.querySelector('.say');
      const msg = {
        gas: [cold ? '氣球向內凹陷：瓶中的氣體遇冷收縮，體積變小。' : hot ? '氣球向外凸起：瓶中的氣體受熱膨脹，體積變大。' : '常溫時氣球維持原狀。', '氣體熱脹冷縮的變化最大。'],
        liquid: [cold ? '水位下降：液體遇冷收縮，體積變小。' : hot ? '水位上升：液體受熱膨脹，體積變大。' : '在玻璃管的水位處畫上記號，再放進熱水或冷水觀察。', '溫度計的液柱上升或下降，也是因為液體熱脹冷縮。'],
        solid: [hot ? '銅球加熱後<b>無法通過</b>銅環：固體受熱膨脹。' : cold ? '銅球放入冰水後<b>可以通過</b>銅環：固體遇冷收縮。' : '常溫時銅球剛好可以通過銅環。', '固體的熱脹冷縮變化比較不明顯，但仍然會發生。']
      }[state];
      say.innerHTML = msg.join('<br>');
    }
    animate(parts, t => {
      const hot = temp === 1, cold = temp === -1;
      const speed = reduceMotion ? 0 : hot ? 2.2 : cold ? 0.6 : 1.2;
      let s = '<svg viewBox="0 0 200 200" style="max-width:220px;display:block;margin:0 auto" role="img" aria-label="粒子示意">';
      s += '<rect x="5" y="5" width="190" height="190" rx="14" fill="#fff" stroke="#E0E0E0" stroke-width="2"/>';
      seeds.forEach((p, i) => {
        let x, y;
        if (state === 'solid') {
          const gap = hot ? 26 : cold ? 20 : 23, col = i % 4, row = Math.floor(i / 4);
          x = 100 + (col - 1.5) * gap + Math.sin(t * speed * 6 + i) * (hot ? 2.5 : 1);
          y = 100 + (row - 1.5) * gap + Math.cos(t * speed * 6 + i) * (hot ? 2.5 : 1);
        } else if (state === 'liquid') {
          const spread = hot ? 62 : cold ? 44 : 52;
          x = 100 + Math.cos(p.a + t * speed * 0.6) * spread * (0.35 + p.r * 0.65);
          y = 100 + Math.sin(p.a * 1.3 + t * speed * 0.5) * spread * (0.35 + p.r * 0.65);
        } else {
          const spread = hot ? 88 : cold ? 55 : 72;
          x = 100 + Math.cos(p.a + t * speed * (0.8 + p.r)) * spread * (0.2 + p.r * 0.8);
          y = 100 + Math.sin(p.a * 1.7 + t * speed * (0.9 + p.r)) * spread * (0.2 + p.r * 0.8);
        }
        s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8" fill="${hot ? '#EF9A9A' : cold ? '#90CAF9' : '#FFE082'}" stroke="#8D6E63"/>`;
      });
      parts.innerHTML = s + '</svg>';
    });
    draw();
  }

  /* ---------------- 1-2 固體傳導：食鹽實驗折線圖＋材質比較 ---------------- */
  function conduction(el) {
    const A = { 0: 25, 2: 27, 4: 34 }, B = { 0: 25, 2: 25, 4: 25 }; // 課本 p.22 志凱這組的紀錄
    el.innerHTML = `<div class="split"><div class="chart"></div><div class="rods"></div></div><div class="say"></div>`;
    const W = 360, H = 240, m = { l: 44, r: 12, t: 16, b: 40 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
    const X = i => m.l + i * iw / 4, Y = v => m.t + ih - (v - 20) / 30 * ih;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="食鹽溫度變化折線圖：A 熱水組 0 分鐘 25 度、2 分鐘 27 度、4 分鐘 34 度；B 常溫水組都是 25 度">`;
    [20, 30, 40, 50].forEach(v => { s += `<line x1="${m.l}" y1="${Y(v)}" x2="${W - m.r}" y2="${Y(v)}" stroke="#F3E5E9"/><text x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="#8D6E63">${v}</text>`; });
    [0, 1, 2, 3, 4].forEach(i => { s += `<text x="${X(i)}" y="${H - m.b + 16}" text-anchor="middle" font-size="11" fill="#8D6E63">${i}</text>`; });
    s += `<text x="${m.l + iw / 2}" y="${H - 4}" text-anchor="middle" font-size="11" fill="#8D6E63">時間（分鐘）</text><text x="12" y="${m.t + ih / 2}" font-size="11" fill="#8D6E63" transform="rotate(-90 12 ${m.t + ih / 2})" text-anchor="middle">溫度（℃）</text>`;
    const line = (d, c, idx) => `<path d="M${idx.map(i => X(i) + ' ' + Y(d[i])).join(' L')}" fill="none" stroke="${c}" stroke-width="2"/>` + idx.map(i => `<circle cx="${X(i)}" cy="${Y(d[i])}" r="4.5" fill="${c}" stroke="#fff" stroke-width="2"/>`).join('');
    s += line(A, '#eb6834', [0, 2, 4]) + line(B, '#2a78d6', [0, 2, 4]);
    s += `<text x="${X(4) - 4}" y="${Y(34) - 8}" text-anchor="end" font-size="12" font-weight="700" fill="#5D4037">A 熱水 34℃</text><text x="${X(4) - 4}" y="${Y(25) + 16}" text-anchor="end" font-size="12" font-weight="700" fill="#5D4037">B 常溫水 25℃</text></svg>
      <div class="tbl-wrap"><table class="k-tbl" style="min-width:0"><tr><th>時間（分鐘）</th><th>0</th><th>2</th><th>4</th></tr><tr><td>A 熱水組</td><td>25</td><td>27</td><td>34</td></tr><tr><td>B 常溫水組</td><td>25</td><td>25</td><td>25</td></tr></table></div>`;
    el.querySelector('.chart').innerHTML = '<div class="hint" style="text-align:center;font-weight:700">志凱這組的紀錄（食鹽溫度）</div>' + s;
    const rods = el.querySelector('.rods');
    rods.innerHTML = '<div class="hint" style="text-align:center;font-weight:700">哪一種湯匙傳熱最快？</div><div class="controls"><button type="button" class="k-btn small go">▶ 放進熱水</button></div><div class="rv"></div>';
    let t0 = null;
    rods.querySelector('.go').onclick = () => { t0 = performance.now(); };
    const MAT = [['金屬湯匙', 1, '#90A4AE'], ['木頭湯匙', 0.12, '#C8A27A'], ['塑膠湯匙', 0.2, '#F8BBD0']];
    animate(rods, () => {
      const t = t0 === null ? 0 : Math.min(8, (performance.now() - t0) / 1000);
      let s2 = '<svg viewBox="0 0 300 200" role="img" aria-label="三種材質湯匙傳熱比較"><rect x="10" y="150" width="280" height="40" rx="8" fill="#FFCDD2"/><text x="150" y="176" text-anchor="middle" font-size="12" fill="#C62828">熱水</text>';
      MAT.forEach(([name, k, c], i) => {
        const x = 50 + i * 100, heat = Math.min(1, t * k / 4);
        s2 += `<rect x="${x - 7}" y="30" width="14" height="140" rx="7" fill="${c}"/>
          <rect x="${x - 7}" y="${170 - 140 * heat}" width="14" height="${140 * heat}" rx="7" fill="#E53950" opacity=".75"/>
          <text x="${x}" y="22" text-anchor="middle" font-size="12" font-weight="700" fill="#5D4037">${name}</text>`;
      });
      rods.querySelector('.rv').innerHTML = s2 + '</svg>';
    });
    el.querySelector('.say').innerHTML = 'A 組（熱水）的食鹽溫度上升，B 組（常溫水）不變：熱從<b>高溫處</b>傳到<b>低溫處</b>。物質透過接觸傳熱，稱為<mark>傳導</mark>。通常<b>金屬</b>比紙、塑膠、木頭更容易傳導熱。<br><span class="hint">湯匙動畫為傳熱快慢的示意。</span>';
  }

  /* ---------------- 1-2 液體與氣體的對流 ---------------- */
  function convection(el) {
    let mode = 'water', smoke = 'cold', top = 'hot';
    el.innerHTML = `<div class="controls md"></div><div class="controls opt"></div><div class="stage"></div><div class="say"></div>`;
    seg(el.querySelector('.md'), [['water', '💧 水箱：熱水與冰水'], ['kettle', '🫖 煮水'], ['air', '💨 冷瓶與熱瓶（線香煙霧）']], mode, v => { mode = v; opts(); });
    function opts() {
      const o = el.querySelector('.opt');
      o.innerHTML = '';
      if (mode === 'air') {
        o.insertAdjacentHTML('beforeend', '<b>煙霧在：</b>');
        seg(o, [['cold', '冷瓶'], ['hot', '熱瓶']], smoke, v => { smoke = v; t0 = performance.now(); });
        o.insertAdjacentHTML('beforeend', '<b style="margin-left:8px">放在上方的是：</b>');
        seg(o, [['hot', '熱瓶在上'], ['cold', '冷瓶在上']], top, v => { top = v; t0 = performance.now(); });
      } else o.innerHTML = '<button type="button" class="k-btn small again">🔄 重新播放</button>';
      const a = o.querySelector('.again'); if (a) a.onclick = () => { t0 = performance.now(); };
      t0 = performance.now();
    }
    let t0 = performance.now();
    animate(el, () => {
      const t = reduceMotion ? 4 : Math.min(6, (performance.now() - t0) / 1000);
      let s = '<svg viewBox="0 0 420 260" role="img" aria-label="對流示意">';
      let msg = '';
      if (mode === 'water') {
        s += '<rect x="40" y="40" width="340" height="190" rx="10" fill="#E3F2FD" stroke="#90A4AE" stroke-width="3"/>';
        const k = Math.min(1, t / 4);
        for (let i = 0; i < 8; i++) {
          const rx = 140 + Math.sin(i * 1.7 + t) * 14, ry = 200 - k * 140 + (i % 3) * 8;
          s += `<circle cx="${rx + (i - 4) * 5}" cy="${ry}" r="7" fill="#E53950" opacity=".7"/>`;
          const bx = 280 + Math.sin(i * 1.3 + t) * 14, by = 60 + k * 140 - (i % 3) * 8;
          s += `<circle cx="${bx + (i - 4) * 5}" cy="${by}" r="7" fill="#1E88E5" opacity=".7"/>`;
        }
        s += '<text x="140" y="30" text-anchor="middle" font-size="13" fill="#C62828" font-weight="700">紅色熱水（約 60℃）</text><text x="280" y="30" text-anchor="middle" font-size="13" fill="#1565C0" font-weight="700">藍色冰水（約 10℃）</text>';
        msg = '含紅色顏料的<b>熱水往上移動</b>，含藍色顏料的<b>冰水往下移動</b>。';
      } else if (mode === 'kettle') {
        s += '<path d="M130 70 Q210 40 290 70 L310 220 Q210 245 110 220 Z" fill="#E3F2FD" stroke="#90A4AE" stroke-width="3"/><rect x="170" y="228" width="80" height="14" rx="6" fill="#FF7043"/><text x="210" y="258" text-anchor="middle" font-size="12" fill="#BF360C">🔥 加熱</text>';
        for (let i = 0; i < 12; i++) {
          const ph = (t * 0.35 + i / 12) % 1, side = i % 2 ? 1 : -1;
          let x, y;
          if (ph < 0.4) { x = 210 + side * 10; y = 215 - ph / 0.4 * 130; }
          else if (ph < 0.5) { x = 210 + side * (10 + (ph - 0.4) / 0.1 * 60); y = 85; }
          else if (ph < 0.9) { x = 210 + side * 70; y = 85 + (ph - 0.5) / 0.4 * 130; }
          else { x = 210 + side * (70 - (ph - 0.9) / 0.1 * 60); y = 215; }
          s += `<text x="${x}" y="${y}" font-size="16" text-anchor="middle">🍃</text>`;
        }
        msg = '中間底部受熱的水往上升，較冷的水從兩側往下降，茶葉跟著水循環流動，最後整壺水都變熱。';
      } else {
        const hotTop = top === 'hot';
        const up = { y: 20, lab: hotTop ? '熱瓶' : '冷瓶', col: hotTop ? '#FFCDD2' : '#BBDEFB' }, dn = { y: 135, lab: hotTop ? '冷瓶' : '熱瓶', col: hotTop ? '#BBDEFB' : '#FFCDD2' };
        s += [up, dn].map(b => `<rect x="150" y="${b.y}" width="120" height="105" rx="12" fill="${b.col}" stroke="#90A4AE" stroke-width="3"/><text x="290" y="${b.y + 58}" font-size="14" font-weight="700" fill="#5D4037">${b.lab}</text>`).join('');
        const smokeInTop = (smoke === 'hot') === hotTop;
        const smokeMoves = hotTop ? false : true; // 冷在上熱在下時會對流
        const k = Math.min(1, t / 4);
        let fill;
        if (!smokeMoves) fill = smokeInTop ? [1, 0] : [0, 1];
        else fill = smokeInTop ? [1 - k * 0.5, k * 0.5] : [k * 0.5, 1 - k * 0.5];
        [up, dn].forEach((b, i) => { for (let j = 0; j < 14 * fill[i]; j++) s += `<circle cx="${165 + (j * 37) % 90}" cy="${b.y + 15 + (j * 23) % 80}" r="9" fill="#9E9E9E" opacity=".45"/>`; });
        const smokeName = smoke === 'hot' ? '熱瓶' : '冷瓶';
        msg = smokeMoves
          ? `冷瓶在上、熱瓶在下：熱空氣往上升、冷空氣往下降，${smokeName}中的煙霧<b>${smoke === 'hot' ? '往上移動' : '往下移動'}</b>，兩瓶的煙霧慢慢混合。`
          : `熱瓶在上、冷瓶在下：熱空氣本來就在上面，冷空氣在下面，${smokeName}中的煙霧<b>${smoke === 'hot' ? '留在上方' : '留在下方'}</b>。`;
      }
      el.querySelector('.stage').innerHTML = s + '</svg>';
      el.querySelector('.say').innerHTML = msg + '<br>液體和氣體主要靠物質本身的流動傳熱：溫度高的往上升、溫度低的往下降，形成循環，稱為<mark>對流</mark>。';
    });
    opts();
  }

  /* ---------------- 1-2 輻射：黑白紙杯 ---------------- */
  function radiation(el) {
    let sun = true, t = 0;
    el.innerHTML = `<div class="controls"></div><div class="controls"><label>⏳ 晒太陽 <input type="range" min="0" max="20" value="0" aria-label="時間"></label><b class="tm">0 分鐘</b></div><div class="stage"></div><div class="say"></div>`;
    toggle(el.querySelector('.controls'), '☀️ 陽光照射', true, v => { sun = v; draw(); });
    const r = el.querySelector('input'); r.oninput = () => { t = Number(r.value); draw(); };
    function draw() {
      el.querySelector('.tm').textContent = t + ' 分鐘';
      const rise = k => sun ? t * k : 0;
      const cups = [['白色紙杯', '#FFFFFF', rise(0.4)], ['黑色紙杯', '#424242', rise(0.9)]];
      let s = `<svg viewBox="0 0 420 260" role="img" aria-label="黑白紙杯吸收輻射熱比較"><rect width="420" height="260" rx="16" fill="${sun ? '#FFFDE7' : '#ECEFF1'}"/>`;
      if (sun) s += '<circle cx="210" cy="36" r="22" fill="#FFC93C" stroke="#F4A300" stroke-width="3"/>' + [120, 300].map(x => `<line x1="${x < 210 ? 190 : 230}" y1="55" x2="${x}" y2="120" stroke="#F4A300" stroke-width="2" stroke-dasharray="6 4"/>`).join('');
      cups.forEach(([n, c, d], i) => {
        const x = 120 + i * 180;
        s += `<path d="M${x - 40} 130 L${x + 40} 130 L${x + 30} 230 L${x - 30} 230 Z" fill="${c}" stroke="#757575" stroke-width="2"/>
          <rect x="${x - 4}" y="95" width="8" height="120" rx="4" fill="#fff" stroke="#9E9E9E"/><rect x="${x - 2}" y="${200 - d * 4}" width="4" height="${15 + d * 4}" fill="#E53950"/>
          <text x="${x}" y="252" text-anchor="middle" font-size="13" font-weight="700" fill="#5D4037">${n}</text>`;
      });
      el.querySelector('.stage').innerHTML = s + '</svg>';
      el.querySelector('.say').innerHTML = !sun ? '沒有陽光照射時，兩個紙杯的溫度都不會因輻射而上升。'
        : t === 0 ? '把溫度計放進白色和黑色紙杯，拖動時間晒太陽看看。'
          : '<b>黑色</b>紙杯中的溫度計升得比較高：黑色比較容易吸收輻射熱。所以夏天穿<b>白色衣服</b>、建築用白色外牆，會比較涼爽。<br><span class="hint">溫度計高度為示意。</span>';
    }
    draw();
  }

  /* ---------------- 1-3 保溫瓶與保溫袋 ---------------- */
  function thermos(el) {
    const F = [
      ['lid', '瓶蓋', '主要減少熱傳導和熱對流'], ['vac', '真空層', '主要阻隔熱傳導和熱對流'], ['shine', '內層亮面', '減少熱輻射向外傳播']
    ];
    const on = { lid: true, vac: true, shine: true };
    el.innerHTML = `<div class="controls"></div><div class="split" style="align-items:center"><div class="stage"></div><div class="chart"></div></div><div class="say"></div>`;
    const c = el.querySelector('.controls');
    c.insertAdjacentHTML('beforeend', '<b>保溫瓶的設計：</b>');
    F.forEach(([k, n]) => toggle(c, n, true, v => { on[k] = v; draw(); }));
    function draw() {
      let s = `<svg viewBox="0 0 220 300" style="max-width:220px;display:block;margin:0 auto" role="img" aria-label="保溫瓶構造">
        <rect x="45" y="40" width="130" height="240" rx="26" fill="#90A4AE"/>
        <rect x="${on.vac ? 60 : 50}" y="55" width="${on.vac ? 100 : 120}" height="215" rx="20" fill="${on.shine ? '#ECEFF1' : '#BCAAA4'}" stroke="${on.shine ? '#fff' : '#8D6E63'}" stroke-width="3"/>
        <rect x="68" y="90" width="84" height="170" rx="14" fill="#FFAB91"/>
        ${on.vac ? '<text x="52" y="170" font-size="9" fill="#fff" transform="rotate(-90 52 170)">真空層</text>' : ''}
        ${on.lid ? '<rect x="55" y="18" width="110" height="30" rx="10" fill="#E86A8D"/><text x="110" y="38" text-anchor="middle" font-size="12" fill="#fff" font-weight="700">瓶蓋</text>' : '<text x="110" y="30" text-anchor="middle" font-size="12" fill="#C62828">（沒有蓋子）</text>'}
        ${!on.lid ? [0, 1, 2].map(i => `<path d="M${90 + i * 20} 60 q-6 -12 0 -24" stroke="#E57373" stroke-width="3" fill="none"/>`).join('') : ''}
        <text x="110" y="180" text-anchor="middle" font-size="13" fill="#BF360C" font-weight="700">熱水</text></svg>`;
      el.querySelector('.stage').innerHTML = s;
      const loss = 0.004 + (on.lid ? 0 : 0.03) + (on.vac ? 0 : 0.03) + (on.shine ? 0 : 0.008);
      const pts = [...Array(13)].map((_, h) => [h, 25 + 70 * Math.exp(-loss * h * 10)]);
      const W = 280, H = 200, X = h => 36 + h * (W - 50) / 12, Y = v => 170 - (v - 20) / 80 * 150;
      el.querySelector('.chart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="熱水溫度變化示意">
        ${[20, 60, 100].map(v => `<line x1="36" y1="${Y(v)}" x2="${W - 10}" y2="${Y(v)}" stroke="#F3E5E9"/><text x="30" y="${Y(v) + 4}" text-anchor="end" font-size="10" fill="#8D6E63">${v}</text>`).join('')}
        <path d="M${pts.map(p => X(p[0]) + ' ' + Y(p[1])).join(' L')}" fill="none" stroke="#eb6834" stroke-width="2.5"/>
        <text x="${W / 2}" y="${H - 6}" text-anchor="middle" font-size="10" fill="#8D6E63">經過時間 →</text>
        <text x="${X(12)}" y="${Y(pts[12][1]) - 8}" text-anchor="end" font-size="12" font-weight="700" fill="#5D4037">約 ${Math.round(pts[12][1])}℃</text></svg>
        <div class="hint" style="text-align:center">熱水溫度變化（示意）</div>`;
      const offs = F.filter(f => !on[f[0]]);
      el.querySelector('.say').innerHTML = (offs.length ? `少了${offs.map(f => `<b>${f[1]}</b>（${f[2]}）`).join('、')}，熱水冷得比較快。` : '瓶蓋、真空層和內層亮面都在，熱水可以保溫很久！')
        + '<br>保溫袋也一樣：<b>鋁箔亮面</b>減少熱輻射向外傳播，<b>泡棉夾層</b>主要減少熱傳導。';
    }
    draw();
  }

  /* ---------------- 科學閱讀：冷氣、暖氣出風口 ---------------- */
  function airCon(el) {
    let mode = 'cool', dir = 'up';
    el.innerHTML = `<div class="controls a"></div><div class="controls b"></div><div class="stage"></div><div class="say"></div>`;
    seg(el.querySelector('.a'), [['cool', '❄️ 冷氣'], ['heat', '🔥 暖氣']], mode, v => { mode = v; t0 = performance.now(); });
    seg(el.querySelector('.b'), [['up', '出風口朝上'], ['down', '出風口朝下']], dir, v => { dir = v; t0 = performance.now(); });
    let t0 = performance.now();
    animate(el, () => {
      const t = reduceMotion ? 6 : Math.min(8, (performance.now() - t0) / 1000);
      const good = (mode === 'cool' && dir === 'up') || (mode === 'heat' && dir === 'down');
      const k = Math.min(1, t / 6);
      // 房間分上下兩層，顯示混合程度
      const base = mode === 'cool' ? ['#FFCDD2', '#FFCDD2'] : ['#BBDEFB', '#BBDEFB'];
      const target = mode === 'cool' ? '#BBDEFB' : '#FFCDD2';
      // 方向正確：上下層都被帶動；冷氣朝下：冷空氣留在下層；暖氣朝上：熱空氣留在上層
      const fillTop = good ? k : mode === 'cool' ? 0.15 * k : k;
      const fillBot = good ? k : mode === 'cool' ? k : 0.15 * k;
      let s = `<svg viewBox="0 0 420 260" role="img" aria-label="冷暖氣出風口方向">
        <rect x="20" y="20" width="380" height="110" fill="${base[0]}"/><rect x="20" y="20" width="380" height="110" fill="${target}" opacity="${fillTop}"/>
        <rect x="20" y="130" width="380" height="110" fill="${base[1]}"/><rect x="20" y="130" width="380" height="110" fill="${target}" opacity="${fillBot}"/>
        <rect x="20" y="20" width="380" height="220" fill="none" stroke="#8D6E63" stroke-width="4"/>
        <rect x="40" y="34" width="90" height="30" rx="8" fill="#fff" stroke="#90A4AE" stroke-width="2"/><text x="85" y="54" text-anchor="middle" font-size="12" fill="#5D4037">${mode === 'cool' ? '冷氣機' : '暖氣機'}</text>
        <path d="M130 ${dir === 'up' ? 44 : 60} q40 ${dir === 'up' ? -14 : 30} 90 ${dir === 'up' ? -10 : 60}" stroke="${mode === 'cool' ? '#1E88E5' : '#E53935'}" stroke-width="4" fill="none" marker-end="url(#ac)"/>
        <defs><marker id="ac" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="${mode === 'cool' ? '#1E88E5' : '#E53935'}"/></marker></defs>
        <text x="390" y="46" text-anchor="end" font-size="12" fill="#5D4037">上層</text><text x="390" y="232" text-anchor="end" font-size="12" fill="#5D4037">下層</text>
        <text x="210" y="190" text-anchor="middle" font-size="26">🧒</text></svg>`;
      el.querySelector('.stage').innerHTML = s;
      el.querySelector('.say').innerHTML = (good ? '✅ ' : '⚠️ ') + (mode === 'cool'
        ? (dir === 'up' ? '冷氣出風口<b>朝上</b>：冷空氣往下降，上方的熱空氣也被帶動，整個房間很快變涼。' : '冷氣出風口朝下：冷空氣一直留在下方，上方的熱空氣降不下來，比較慢涼。')
        : (dir === 'down' ? '暖氣出風口<b>朝下</b>：熱空氣從下方慢慢升起，整個房間變暖和。' : '暖氣出風口朝上：熱空氣一直留在上方，下方仍然很冷。'))
        + '<br>冷氣、暖氣都是利用「熱空氣往上升、冷空氣往下降」的<b>對流</b>原理。';
    });
  }

  window.UnitWidgets = { expansion, conduction, convection, radiation, thermos, airCon };
})();
