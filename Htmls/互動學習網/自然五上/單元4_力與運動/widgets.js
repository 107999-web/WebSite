/* =========================================================
 * 自然五上・單元4 力與運動｜互動實驗元件
 * 動畫與數值為依課本、習作範例繪製的示意（實際結果請依實際操作記錄）
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
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* 播放一段動畫：dur 秒內呼叫 draw(進度 0～1)；元件隱藏時暫停 */
  function play(el, dur, draw, done) {
    if (reduceMotion) { draw(1); if (done) done(); return () => {}; }
    let t = 0, last = null, stop = false;
    const step = ts => {
      if (stop || !el.isConnected) return;
      if (last !== null && el.offsetParent !== null) t += (ts - last) / 1000;
      last = ts;
      const k = Math.min(1, t / dur);
      draw(k);
      if (k < 1) requestAnimationFrame(step); else if (done) done();
    };
    requestAnimationFrame(step);
    return () => { stop = true; };
  }
  const arrow = (x1, y1, x2, y2, c, label, lx, ly) => {
    const a = Math.atan2(y2 - y1, x2 - x1), s = 9;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="4"/>
      <path d="M${x2} ${y2} L${x2 - s * Math.cos(a - 0.5)} ${y2 - s * Math.sin(a - 0.5)} L${x2 - s * Math.cos(a + 0.5)} ${y2 - s * Math.sin(a + 0.5)} Z" fill="${c}"/>
      ${label ? `<text x="${lx}" y="${ly}" font-size="12" font-weight="700" fill="${c}" stroke="#fff" stroke-width="3" paint-order="stroke">${label}</text>` : ''}`;
  };

  /* ---------------- 4-1 活動1 物體為什麼會向下運動？ ---------------- */
  function gravityDrop(el) {
    let cut = false, stopAnim = () => {};
    el.innerHTML = `<div class="stage"></div><div class="controls"><button type="button" class="k-btn small go">✂️ 剪斷橡皮筋</button><button type="button" class="k-btn ghost small rs">↺ 重來</button></div><div class="say"></div>`;
    function draw(k) {
      const y = cut ? 90 + 110 * k * k : 90;
      let s = `<svg viewBox="0 0 340 250" role="img" aria-label="${cut ? '失去支撐力，寶特瓶往下掉落' : '寶特瓶靜止不動'}">
        <rect x="20" y="10" width="300" height="12" rx="4" fill="#BCAAA4"/>
        <rect y="232" width="340" height="18" fill="#C5E1A5"/>`;
      if (!cut) s += `<path d="M170 22 C164 40 176 55 170 72" stroke="#FFB74D" stroke-width="4" fill="none"/>`;
      else s += `<path d="M170 22 C166 30 174 36 170 44" stroke="#FFB74D" stroke-width="4" fill="none"/>`;
      s += `<g transform="translate(150 ${y - 18})"><rect x="12" y="0" width="16" height="12" rx="3" fill="#29B6F6"/><rect x="0" y="12" width="40" height="70" rx="12" fill="#B3E5FC" stroke="#4FC3F7" stroke-width="2"/></g>`;
      if (!cut) s += arrow(230, 110, 230, 60, '#1E88E5', '支撐力', 238, 70) + arrow(230, 120, 230, 170, HL, '地球引力', 238, 165);
      else s += arrow(230, y + 20, 230, y + 70, HL, '地球引力', 238, y + 65);
      s += '</svg>';
      el.querySelector('.stage').innerHTML = s;
    }
    const say = () => { el.querySelector('.say').innerHTML = cut ? '失去橡皮筋<b>向上的支撐力</b>，只受到<b>向下的地球引力</b>，寶特瓶便往下掉落。' : '寶特瓶同時受到橡皮筋<b>向上的支撐力</b>和<b>向下的地球引力</b>，所以維持靜止不動。'; };
    el.querySelector('.go').onclick = () => { if (cut) return; cut = true; say(); stopAnim = play(el, 0.8, draw); };
    el.querySelector('.rs').onclick = () => { stopAnim(); cut = false; say(); draw(0); };
    say(); draw(0);
  }

  /* ---------------- 4-1 活動3 比較運動的快慢 ---------------- */
  function raceSpeed(el) {
    const RACES = {
      one: { title: '第一次比賽：都跑 100 公尺', rows: [['小宇', 18, 100], ['志凱', 22, 100], ['皓皓', 20, 100]] },
      two: { title: '第二次比賽：都跑 30 秒', rows: [['家菱', 30, 180], ['妍妍', 30, 200], ['小真', 30, 150]] }
    };
    const COLS = ['#2a78d6', '#eb6834', '#1baf7a'];
    let race = 'one', stopAnim = () => {}, shown = 0;
    el.innerHTML = `<div class="controls rc"></div><div class="stage"></div><div class="controls"><button type="button" class="k-btn small go">▶ 開始比賽</button></div><div class="say"></div>`;
    seg(el.querySelector('.rc'), [['one', '🏃 第一次（距離相同）'], ['two', '🏃 第二次（時間相同）']], race, v => { race = v; stopAnim(); draw(0); say(false); });
    function draw(k) {
      const R = RACES[race], maxT = Math.max(...R.rows.map(r => r[1])), maxD = 200;
      const T = k * maxT; shown = T;
      let s = `<svg viewBox="0 0 360 200" role="img" aria-label="${R.title}"><text x="180" y="18" text-anchor="middle" font-size="13" font-weight="700" fill="#5D4037">${R.title}</text>`;
      const X = d => 40 + d / maxD * 290;
      [0, 50, 100, 150, 200].forEach(d => { s += `<line x1="${X(d)}" y1="28" x2="${X(d)}" y2="168" stroke="#ECEFF1"/><text x="${X(d)}" y="182" text-anchor="middle" font-size="10" fill="#78909C">${d} m</text>`; });
      if (race === 'one') s += `<line x1="${X(100)}" y1="28" x2="${X(100)}" y2="168" stroke="${HL}" stroke-width="2" stroke-dasharray="4 3"/><text x="${X(100) + 4}" y="40" font-size="11" fill="${HL}">終點</text>`;
      R.rows.forEach(([n, t, d], i) => {
        const v = d / t, pos = Math.min(d, v * T), y = 55 + i * 42;
        s += `<text x="4" y="${y + 5}" font-size="12" font-weight="700" fill="${COLS[i]}">${n}</text>
          <line x1="${X(0)}" y1="${y + 14}" x2="${X(200)}" y2="${y + 14}" stroke="#E0E0E0" stroke-width="2"/>
          <circle cx="${X(pos)}" cy="${y}" r="10" fill="${COLS[i]}"/><text x="${X(pos)}" y="${y + 4}" text-anchor="middle" font-size="11">🏃</text>
          ${k === 1 ? `<text x="${X(pos) - 14}" y="${y + 4}" text-anchor="end" font-size="11" font-weight="700" fill="${COLS[i]}" stroke="#fff" stroke-width="3" paint-order="stroke">${d} m／${t} 秒</text>` : ''}`;
      });
      s += `<text x="352" y="196" text-anchor="end" font-size="11" fill="#5D4037">經過 ${T.toFixed(0)} 秒</text></svg>`;
      el.querySelector('.stage').innerHTML = s;
    }
    function say(end) {
      el.querySelector('.say').innerHTML = !end ? '按「開始比賽」看看誰比較快。'
        : race === 'one' ? '都跑 100 公尺，比<b>花費的時間</b>：小宇 18 秒最少 → <mark>小宇最快</mark>。相同距離，花費的時間愈少，速度愈快。'
          : '都跑 30 秒，比<b>跑的距離</b>：妍妍 200 公尺最長 → <mark>妍妍最快</mark>。相同時間，跑的距離愈長，速度愈快。';
    }
    el.querySelector('.go').onclick = () => { stopAnim(); say(false); stopAnim = play(el, 3, draw, () => say(true)); };
    draw(0); say(false);
  }

  /* ---------------- 4-1 活動4、5 滑梯高度、速度與動能 ---------------- */
  function slideRamp(el) {
    let h = 10, stopAnim = () => {};
    const results = {};
    el.innerHTML = `<div class="controls hh"></div><div class="stage"></div><div class="controls"><button type="button" class="k-btn small go">▶ 放手讓硬幣滑下</button></div><div class="say"></div><div class="tbl-wrap"><table class="k-tbl rec"></table></div>`;
    seg(el.querySelector('.hh'), [[5, '5 公分'], [10, '10 公分'], [15, '15 公分']], h, v => { h = v; stopAnim(); draw(0, 0); });
    const L = 150; // 滑梯長度相同
    function draw(k, clipMove) {
      const H = h * 6, ang = Math.asin(H / L), bx = 80 + L * Math.cos(ang), by = 180;
      const tx = 80, ty = by - H;
      const cx = tx + (bx - tx) * k, cy = ty + (by - ty) * k;
      const pe = 1 - k, ke = k;
      let s = `<svg viewBox="0 0 360 230" role="img" aria-label="滑梯高度 ${h} 公分">
        <rect y="${by}" width="360" height="12" fill="#D7CCC8"/>
        <line x1="${tx}" y1="${ty}" x2="${bx}" y2="${by}" stroke="#8D6E63" stroke-width="6" stroke-linecap="round"/>
        <line x1="${tx - 12}" y1="${ty}" x2="${tx - 12}" y2="${by}" stroke="#BCAAA4" stroke-width="2"/>
        <text x="${tx - 16}" y="${(ty + by) / 2}" text-anchor="end" font-size="12" font-weight="700" fill="#5D4037">${h} 公分</text>
        <circle cx="${cx}" cy="${cy - 8}" r="8" fill="#FFD54F" stroke="#F9A825" stroke-width="2"/>
        <g transform="translate(${bx + 20 + clipMove} ${by - 16})"><rect width="18" height="16" rx="2" fill="#37474F"/><path d="M3 0 L6 -8 M15 0 L12 -8" stroke="#90A4AE" stroke-width="2"/></g>
        <text x="${bx + 30}" y="${by + 30}" text-anchor="middle" font-size="11" fill="#5D4037">長尾夾</text>`;
      if (clipMove > 0) s += `<text x="${bx + 30 + clipMove}" y="${by - 26}" text-anchor="middle" font-size="12" font-weight="700" fill="${HL}">移動 ${Math.round(clipMove / 6)} 公分</text>`;
      // 能量條
      s += `<text x="230" y="24" font-size="12" font-weight="700" fill="#5D4037">位能</text><rect x="268" y="12" width="80" height="14" rx="7" fill="#ECEFF1"/><rect x="268" y="12" width="${80 * pe * h / 15}" height="14" rx="7" fill="#2a78d6"/>
        <text x="230" y="46" font-size="12" font-weight="700" fill="#5D4037">動能</text><rect x="268" y="34" width="80" height="14" rx="7" fill="#ECEFF1"/><rect x="268" y="34" width="${80 * ke * h / 15}" height="14" rx="7" fill="#eb6834"/></svg>`;
      el.querySelector('.stage').innerHTML = s;
    }
    function say(done) {
      el.querySelector('.say').innerHTML = !done ? '選擇滑梯高度，按「放手」。滑梯的<b>長度要相同</b>才能比較。'
        : `從 ${h} 公分滑下：${h === 15 ? '最高，到達桌面的速度<b>最快</b>，動能最大，長尾夾被撞得最遠。' : h === 5 ? '最低，速度最慢，動能最小，長尾夾移動得最近。' : '速度和動能都在中間。'} 高處的<b>位能</b>在滑下時轉換成<b>動能</b>。`;
      el.querySelector('.rec').innerHTML = `<tr><th>滑梯高度</th><th>到達桌面的速度</th><th>長尾夾移動距離</th></tr>` +
        [5, 10, 15].map(x => `<tr><td>${x} 公分</td><td>${results[x] ? ['', '慢', '中', '快'][x / 5] : '？'}</td><td>${results[x] ? results[x] + ' 公分' : '？'}</td></tr>`).join('');
    }
    el.querySelector('.go').onclick = () => {
      stopAnim(); say(false);
      const dist = h * 0.8; // 示意：高度愈高，撞得愈遠
      stopAnim = play(el, 1.2 - h / 30, k => draw(k * k, 0), () => {
        stopAnim = play(el, 0.6, k => draw(1, dist * 6 * (1 - (1 - k) * (1 - k))), () => { results[h] = Math.round(dist); say(true); });
      });
    };
    draw(0, 0); say(false);
  }

  /* ---------------- 4-2 活動1 彈簧的伸長與重量 ---------------- */
  function springScale(el) {
    let n = 0, tomato = false;
    const PER = 20, CM = 2, ORIG = 7.2; // 習作範例：每個砝碼 20 公克重，伸長 2 公分
    const seen = {};
    el.innerHTML = `<div class="controls"><button type="button" class="k-btn small add">＋ 掛一個砝碼</button><button type="button" class="k-btn ghost small sub">－ 取下一個</button><button type="button" class="k-btn alt small tm">🍅 改掛小番茄</button></div>
      <div class="split" style="align-items:center"><div class="stage"></div><div class="chart"></div></div><div class="say"></div>`;
    el.querySelector('.add').onclick = () => { tomato = false; n = Math.min(5, n + 1); draw(); };
    el.querySelector('.sub').onclick = () => { tomato = false; n = Math.max(0, n - 1); draw(); };
    el.querySelector('.tm').onclick = () => { tomato = !tomato; n = 0; draw(); };
    function draw() {
      const w = tomato ? 40 : n * PER, ext = w / PER * CM, total = ORIG + ext;
      if (!tomato) seen[n] = true;
      const px = 14, top = 30, len = total * px * 0.9;
      let coil = `M110 ${top}`;
      const turns = 14;
      for (let i = 1; i <= turns; i++) coil += ` L${i % 2 ? 125 : 95} ${top + len * i / turns}`;
      let s = `<svg viewBox="0 0 220 330" role="img" aria-label="${tomato ? '掛小番茄' : `掛 ${n} 個砝碼`}，彈簧伸長 ${ext} 公分">
        <rect x="60" y="14" width="110" height="10" rx="3" fill="#8D6E63"/><line x1="110" y1="24" x2="110" y2="${top}" stroke="#607D8B" stroke-width="3"/>
        <path d="${coil}" fill="none" stroke="#607D8B" stroke-width="3"/>
        <rect x="160" y="${top}" width="22" height="290" fill="#FFFDE7" stroke="#BCAAA4"/>`;
      for (let c = 0; c <= 20; c++) { const y = top + c * px * 0.9; s += `<line x1="160" y1="${y}" x2="${c % 5 ? 168 : 174}" y2="${y}" stroke="#8D6E63"/>`; if (c % 5 === 0) s += `<text x="186" y="${y + 4}" font-size="10" fill="#5D4037">${c}</text>`; }
      const endY = top + len;
      s += `<line x1="118" y1="${endY}" x2="160" y2="${endY}" stroke="${HL}" stroke-dasharray="3 2"/>`;
      if (tomato) s += `<line x1="110" y1="${endY}" x2="110" y2="${endY + 10}" stroke="#607D8B" stroke-width="2"/><circle cx="110" cy="${endY + 22}" r="13" fill="#E53935"/><path d="M104 ${endY + 10} l6 4 l6 -4" stroke="#43A047" stroke-width="3" fill="none"/>`;
      else for (let i = 0; i < n; i++) s += `<rect x="96" y="${endY + 4 + i * 16}" width="28" height="14" rx="3" fill="#B0BEC5" stroke="#78909C"/><text x="110" y="${endY + 15 + i * 16}" text-anchor="middle" font-size="9" fill="#37474F">20g</text>`;
      s += `<text x="10" y="320" font-size="11" fill="#5D4037">刻度單位：公分</text></svg>`;
      el.querySelector('.stage').innerHTML = s;
      // 折線圖
      const X = g => 40 + g * 1.6, Y = e => 180 - e * 15;
      let c = `<svg viewBox="0 0 220 210" role="img" aria-label="砝碼總重量與彈簧伸長長度折線圖">
        <line x1="40" y1="180" x2="210" y2="180" stroke="#90A4AE"/><line x1="40" y1="20" x2="40" y2="180" stroke="#90A4AE"/>`;
      [0, 20, 40, 60, 80, 100].forEach(g => { c += `<text x="${X(g)}" y="194" text-anchor="middle" font-size="10" fill="#5D4037">${g}</text>`; });
      [0, 2, 4, 6, 8, 10].forEach(e => { c += `<line x1="40" y1="${Y(e)}" x2="210" y2="${Y(e)}" stroke="#ECEFF1"/><text x="34" y="${Y(e) + 4}" text-anchor="end" font-size="10" fill="#5D4037">${e}</text>`; });
      const pts = [0, 1, 2, 3, 4, 5].filter(i => seen[i]).map(i => [X(i * PER), Y(i * CM)]);
      if (pts.length > 1) c += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="#2a78d6" stroke-width="2.5"/>`;
      pts.forEach(p => { c += `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="#2a78d6"/>`; });
      if (tomato) c += `<circle cx="${X(40)}" cy="${Y(4)}" r="6" fill="#E53935"/><text x="${X(40) + 8}" y="${Y(4) - 6}" font-size="11" font-weight="700" fill="#E53935">小番茄</text>`;
      c += `<text x="125" y="208" text-anchor="middle" font-size="10" fill="#5D4037">砝碼總重量（公克重）</text><text x="6" y="14" font-size="10" fill="#5D4037">伸長（公分）</text></svg>`;
      el.querySelector('.chart').innerHTML = c;
      el.querySelector('.say').innerHTML = tomato
        ? '掛上小番茄，彈簧伸長 <b>4 公分</b>，和掛 40 公克重砝碼時一樣 → 小番茄約 <mark>40 公克重</mark>。'
        : `掛 <b>${n}</b> 個砝碼（${w} 公克重）：彈簧總長 <b>${total.toFixed(1)} 公分</b>，伸長 <b>${ext} 公分</b>。每多掛一個 20 公克重的砝碼，就多伸長 2 公分，具有<b>規律性</b>。<span class="hint">（數值為習作範例；不可掛太重，以免超過彈性限度）</span>`;
    }
    draw();
  }

  /* ---------------- 4-2 活動3 模擬拔河比賽 ---------------- */
  function tugOfWar(el) {
    let L = 100, R = 200, stopAnim = () => {};
    el.innerHTML = `<div class="controls"><b>⬅️ 左側施力</b><span class="l"></span></div><div class="controls"><b>➡️ 右側施力</b><span class="r"></span></div>
      <div class="stage"></div><div class="controls"><button type="button" class="k-btn small go">✋ 放開迴紋針</button></div><div class="say"></div>`;
    seg(el.querySelector('.l'), [[100, '100 公克重'], [200, '200 公克重']], L, v => { L = v; stopAnim(); draw(0); say(false); });
    seg(el.querySelector('.r'), [[100, '100 公克重'], [200, '200 公克重']], R, v => { R = v; stopAnim(); draw(0); say(false); });
    function draw(k) {
      const dir = Math.sign(R - L), off = dir * 28 * k;
      let s = `<svg viewBox="0 0 360 150" role="img" aria-label="左 ${L}、右 ${R} 公克重">
        <rect x="10" y="60" width="340" height="50" rx="8" fill="#FFF8E1"/>
        <line x1="180" y1="40" x2="180" y2="125" stroke="${HL}" stroke-dasharray="4 3" stroke-width="2"/><text x="180" y="140" text-anchor="middle" font-size="11" fill="${HL}">中線</text>
        <g transform="translate(${off} 0)">
          <rect x="165" y="76" width="30" height="16" rx="8" fill="none" stroke="#78909C" stroke-width="3"/><circle cx="180" cy="84" r="3" fill="${HL}"/>
          <line x1="165" y1="84" x2="100" y2="84" stroke="#90A4AE" stroke-width="2"/><line x1="195" y1="84" x2="260" y2="84" stroke="#90A4AE" stroke-width="2"/>
          <rect x="40" y="74" width="60" height="20" rx="6" fill="#E3F2FD" stroke="#2a78d6" stroke-width="2"/><text x="70" y="88" text-anchor="middle" font-size="11" font-weight="700" fill="#2a78d6">${L}</text>
          <rect x="260" y="74" width="60" height="20" rx="6" fill="#FFF3E0" stroke="#eb6834" stroke-width="2"/><text x="290" y="88" text-anchor="middle" font-size="11" font-weight="700" fill="#eb6834">${R}</text>
        </g>
        ${arrow(170, 40, 170 - L / 2.5, 40, '#2a78d6', `左 ${L} 公克重`, 20, 26)}
        ${arrow(190, 40, 190 + R / 2.5, 40, '#eb6834', `右 ${R} 公克重`, 250, 26)}</svg>`;
      el.querySelector('.stage').innerHTML = s;
    }
    function say(end) {
      el.querySelector('.say').innerHTML = !end ? '選擇兩側的施力（彈簧秤讀數），再按「放開迴紋針」。'
        : L === R ? '兩側施力<b>相等</b>，迴紋針<mark>保持靜止</mark>不動（位置不動）。'
          : `${R > L ? '右' : '左'}側施力較大，迴紋針<mark>往${R > L ? '右' : '左'}移動</mark>：物體會往<b>施力較大</b>的方向移動。`;
    }
    el.querySelector('.go').onclick = () => { stopAnim(); stopAnim = play(el, 0.8, draw, () => say(true)); };
    draw(0); say(false);
  }

  /* ---------------- 4-3 活動1 不同接觸面的摩擦力 ---------------- */
  function friction(el) {
    let surf = 'card', stopAnim = () => {};
    const SURF = { card: ['卡紙', '#FFF9C4', 1.0, '摩擦力小'], sand: ['砂紙', '#D7CCC8', 0.35, '摩擦力大'], cloth: ['毛巾', '#F8BBD0', 0.55, '摩擦力中等'] };
    const results = {};
    el.innerHTML = `<div class="controls sf"></div><div class="stage"></div><div class="controls"><button type="button" class="k-btn small go">▶ 讓硬幣滑下</button></div><div class="say"></div>`;
    seg(el.querySelector('.sf'), Object.keys(SURF).map(k => [k, SURF[k][0]]), surf, v => { surf = v; stopAnim(); draw(-1); });
    function draw(k) {
      const [name, col, slip] = SURF[surf];
      const dist = 200 * slip;
      let x, y;
      if (k < 0) { x = 30; y = 70; }
      else if (k < 0.4) { const q = k / 0.4; x = 30 + 70 * q; y = 70 + 80 * q; }
      else { const q = (k - 0.4) / 0.6; x = 100 + dist * (1 - (1 - q) * (1 - q)); y = 150; }
      let s = `<svg viewBox="0 0 360 200" role="img" aria-label="硬幣在${name}上移動">
        <line x1="20" y1="70" x2="100" y2="160" stroke="#8D6E63" stroke-width="6"/>
        <rect x="100" y="158" width="250" height="10" fill="${col}" stroke="#BCAAA4"/>
        <text x="225" y="186" text-anchor="middle" font-size="12" font-weight="700" fill="#5D4037">${name}</text>
        <circle cx="${x}" cy="${y - 8}" r="8" fill="#FFD54F" stroke="#F9A825" stroke-width="2"/>`;
      Object.keys(results).forEach(kk => { const d = 100 + 200 * SURF[kk][2]; s += `<line x1="${d}" y1="140" x2="${d}" y2="170" stroke="${kk === 'card' ? '#2a78d6' : kk === 'sand' ? '#eb6834' : '#1baf7a'}" stroke-width="2" stroke-dasharray="3 2"/><text x="${d}" y="134" text-anchor="middle" font-size="10" fill="#5D4037">${SURF[kk][0]}</text>`; });
      if (k > 0.4 && k < 1) s += arrow(x - 10, 120, x - 50, 120, HL, '摩擦力', x - 70, 110) + arrow(x + 10, 120, x + 45, 120, '#2a78d6', '運動方向', x + 12, 110);
      s += '</svg>';
      el.querySelector('.stage').innerHTML = s;
    }
    el.querySelector('.go').onclick = () => {
      stopAnim();
      el.querySelector('.say').innerHTML = '硬幣滑下中……';
      stopAnim = play(el, 2, draw, () => {
        results[surf] = true;
        const [name, , , f] = SURF[surf];
        el.querySelector('.say').innerHTML = `硬幣在<b>${name}</b>上${f}，${surf === 'card' ? '移動得<b>最遠</b>' : surf === 'sand' ? '很快就<b>停下來</b>' : '移動距離在中間'}。<mark>摩擦力愈小，物體移動距離愈遠</mark>。摩擦力的方向和物體運動方向<b>相反</b>。`;
        draw(1);
      });
    };
    el.querySelector('.say').innerHTML = '從相同高度讓硬幣滑下，比較在不同材質上移動的距離。<span class="hint">（「毛巾」為延伸比較）</span>';
    draw(-1);
  }

  /* ---------------- 科學閱讀：物體落下的快慢 ---------------- */
  function fallRace(el) {
    let mode = 'paper', stopAnim = () => {};
    const MODES = {
      paper: ['平整的紙', '揉成紙團', 0.45, 1.0, '兩張相同的紙：平整的紙與空氣接觸面積大、阻力大，<b>紙團先落地</b>。'],
      stone: ['羽毛', '石塊', 0.3, 1.0, '石塊和羽毛：受到空氣阻力影響，<b>石塊先落地</b>。'],
      vacuum: ['羽毛', '石塊', 1.0, 1.0, '<b>排除空氣的影響</b>：相同高度自由落下的物體，無論輕重，落下的速度都<mark>相同</mark>，同時落地。']
    };
    el.innerHTML = `<div class="controls md"></div><div class="stage"></div><div class="controls"><button type="button" class="k-btn small go">▶ 同時放手</button></div><div class="say"></div>`;
    seg(el.querySelector('.md'), [['paper', '📄 平紙 vs 紙團'], ['stone', '🪶 羽毛 vs 石塊'], ['vacuum', '🫙 沒有空氣時']], mode, v => { mode = v; stopAnim(); draw(0); el.querySelector('.say').innerHTML = '按「同時放手」，從相同的高度落下。'; });
    function draw(k) {
      const [a, b, va, vb] = MODES[mode];
      const ya = 30 + 150 * Math.min(1, k) ** 2, yb = 30 + 150 * Math.min(1, k * vb / va) ** 2; // a 較慢，整段動畫結束才落地
      const icon = n => n === '平整的紙' ? '<rect x="-16" y="-3" width="32" height="6" fill="#fff" stroke="#90A4AE"/>' : n === '揉成紙團' ? '<circle r="9" fill="#fff" stroke="#90A4AE" stroke-width="2"/>' : n === '羽毛' ? '<text y="6" text-anchor="middle" font-size="20">🪶</text>' : '<ellipse rx="12" ry="9" fill="#9E9E9E" stroke="#616161"/>';
      el.querySelector('.stage').innerHTML = `<svg viewBox="0 0 320 230" role="img" aria-label="${a}與${b}同時落下">
        ${mode === 'vacuum' ? '<rect x="40" y="10" width="240" height="190" rx="14" fill="#F3E5F5" stroke="#CE93D8" stroke-dasharray="6 4"/><text x="160" y="28" text-anchor="middle" font-size="11" fill="#8E24AA">抽掉空氣（示意）</text>' : ''}
        <rect y="200" width="320" height="30" fill="#C5E1A5"/>
        <g transform="translate(110 ${ya})">${icon(a)}</g><g transform="translate(210 ${yb})">${icon(b)}</g>
        <text x="110" y="222" text-anchor="middle" font-size="12" font-weight="700" fill="#5D4037">${a}</text><text x="210" y="222" text-anchor="middle" font-size="12" font-weight="700" fill="#5D4037">${b}</text></svg>`;
    }
    el.querySelector('.go').onclick = () => { stopAnim(); const [, , va, vb] = MODES[mode]; stopAnim = play(el, 1.2 * vb / va, draw, () => { el.querySelector('.say').innerHTML = MODES[mode][4]; }); };
    draw(0); el.querySelector('.say').innerHTML = '按「同時放手」，從相同的高度落下。';
  }

  window.UnitWidgets = { gravityDrop, raceSpeed, slideRamp, springScale, tugOfWar, friction, fallRace };
})();
