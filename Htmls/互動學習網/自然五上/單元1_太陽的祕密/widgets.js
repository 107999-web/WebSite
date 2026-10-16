/* =========================================================
 * 自然五上・單元1 太陽的祕密｜互動實驗元件
 * 每個元件都是 function(容器元素, 參數)，由 data.js 以 widget 名稱呼叫
 * 太陽位置以嘉義（北緯 23.5 度）計算，與課本觀測資料一致
 * ========================================================= */
(function () {
  'use strict';
  const rad = d => d * Math.PI / 180;
  const deg = r => r * 180 / Math.PI;
  const LAT = 23.5;
  const SEASONS = {
    spring: { name: '春分', dec: 0, date: '3/21 前後' },
    summer: { name: '夏至', dec: 23.44, date: '6/21 前後' },
    autumn: { name: '秋分', dec: 0, date: '9/23 前後' },
    winter: { name: '冬至', dec: -23.44, date: '12/22 前後' }
  };
  /* 圖表配色（已通過色彩辨識度驗證；綠色對比較低，因此一律附文字標籤與資料表） */
  const COLOR = { spring: '#1baf7a', summer: '#eb6834', autumn: '#2a78d6', winter: '#e87ba4' };

  /* 太陽位置：t 為當地太陽時（12 = 正午）。回傳高度角 alt 與方位角 az（由北順時針） */
  function sunPos(t, dec) {
    const H = rad(15 * (t - 12)), d = rad(dec), p = rad(LAT);
    const E = -Math.cos(d) * Math.sin(H);
    const N = Math.sin(d) * Math.cos(p) - Math.cos(d) * Math.cos(H) * Math.sin(p);
    const U = Math.sin(d) * Math.sin(p) + Math.cos(d) * Math.cos(H) * Math.cos(p);
    let az = deg(Math.atan2(E, N)); if (az < 0) az += 360;
    return { alt: deg(Math.asin(Math.max(-1, Math.min(1, U)))), az, E, N, U };
  }
  function dirName(az) {
    const names = [
      [0, '北'], [22.5, '北偏東'], [45, '東北'], [67.5, '東偏北'], [90, '東'], [112.5, '東偏南'], [135, '東南'], [157.5, '南偏東'],
      [180, '南'], [202.5, '南偏西'], [225, '西南'], [247.5, '西偏南'], [270, '西'], [292.5, '西偏北'], [315, '西北'], [337.5, '北偏西']
    ];
    const a = ((az % 360) + 360) % 360;
    // 正東西南北給 ±10 度的寬容範圍，其餘依最接近的方位命名
    for (const [c, n] of [[0, '北'], [90, '東'], [180, '南'], [270, '西'], [360, '北']]) if (Math.abs(a - c) <= 10) return n;
    let best = names[0], diff = 999;
    names.forEach(x => { const df = Math.min(Math.abs(a - x[0]), 360 - Math.abs(a - x[0])); if (df < diff) { diff = df; best = x; } });
    return best[1];
  }
  const fmtTime = t => { const h = Math.floor(t), m = Math.round((t - h) * 60); return `${h}:${String(m).padStart(2, '0')}`; };
  function riseSet(dec) {
    const p = rad(LAT), d = rad(dec);
    const H0 = deg(Math.acos(-Math.tan(p) * Math.tan(d))) / 15;
    return { rise: 12 - H0, set: 12 + H0 };
  }
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
  function tip() {
    let t = document.querySelector('.viz-tip');
    if (!t) { t = document.createElement('div'); t.className = 'viz-tip'; document.body.appendChild(t); }
    return t;
  }
  const sunIcon = (x, y, r = 16) => `<g><circle cx="${x}" cy="${y}" r="${r + 7}" fill="#FFE08A" opacity=".45"/><circle cx="${x}" cy="${y}" r="${r}" fill="#FFC93C" stroke="#F4A300" stroke-width="2"/></g>`;

  /* ---------------- 1-1 白天與夜晚 ---------------- */
  function dayNight(el) {
    el.innerHTML = `<div class="controls"></div><div class="stage"></div><div class="say"></div>`;
    const stage = el.querySelector('.stage'), say = el.querySelector('.say');
    function draw(mode) {
      const day = mode === 'day';
      stage.innerHTML = `<svg viewBox="0 0 600 300" role="img" aria-label="${day ? '白天' : '夜晚'}的景象">
        <rect width="600" height="300" rx="20" fill="${day ? '#BFE6FF' : '#2C3E66'}"/>
        ${day ? sunIcon(90, 70, 28) : `<circle cx="90" cy="70" r="26" fill="#FFF6C8"/><circle cx="102" cy="62" r="24" fill="#2C3E66"/>
          ${[[200, 40], [300, 80], [420, 30], [520, 90], [250, 120]].map(([x, y]) => `<text x="${x}" y="${y}" font-size="16" fill="#FFF6C8">✦</text>`).join('')}`}
        <rect y="220" width="600" height="80" fill="${day ? '#8FD694' : '#3E6B4F'}"/>
        <g transform="translate(250 130)">
          <polygon points="0,40 60,0 120,40" fill="${day ? '#FF8FAB' : '#9C4F66'}"/>
          <rect x="10" y="40" width="100" height="70" fill="${day ? '#FFF3E0' : '#6D5A55'}"/>
          <rect x="25" y="55" width="26" height="22" rx="4" fill="${day ? '#BFE6FF' : '#FFE08A'}"/>
          <rect x="70" y="55" width="26" height="22" rx="4" fill="${day ? '#BFE6FF' : '#FFE08A'}"/>
          <rect x="48" y="82" width="22" height="28" rx="4" fill="${day ? '#BCAAA4' : '#4E3B36'}"/>
        </g>
        <g transform="translate(460 150)">
          <rect x="0" y="0" width="22" height="100" rx="11" fill="#fff" stroke="#E86A8D" stroke-width="3"/>
          <rect x="6" y="${day ? 20 : 45}" width="10" height="${day ? 74 : 49}" rx="5" fill="#FF6B6B"/>
          <circle cx="11" cy="100" r="16" fill="#FF6B6B" stroke="#E86A8D" stroke-width="3"/>
          <text x="34" y="${day ? 30 : 55}" font-size="20" fill="${day ? '#5D4037' : '#fff'}" font-weight="700">${day ? '較高' : '較低'}</text>
        </g>
        <text x="150" y="265" font-size="30">${day ? '🌻' : '🌙'}</text>
        <text x="60" y="275" font-size="18" fill="${day ? '#5D4037' : '#fff'}">${day ? '看得很清楚' : '需要開燈才看得清楚'}</text>
      </svg>`;
      say.innerHTML = day
        ? '☀️ <b>白天</b>：有陽光照射，可以看清楚景色，<mark>氣溫也比較高</mark>。'
        : '🌙 <b>夜晚</b>：沒有陽光照射，需要開燈才能看清楚景色，<mark>氣溫比白天低</mark>。';
    }
    seg(el.querySelector('.controls'), [['day', '☀️ 白天'], ['night', '🌙 夜晚']], 'day', draw);
    draw('day');
  }

  /* ---------------- 1-2 竿影與太陽觀測器（兼日晷） ---------------- */
  function sunLab(el, opts) {
    let season = opts.season || 'autumn', t = 9;
    el.innerHTML = `
      <div class="controls">
        <label>⏰ 時間 <input type="range" min="6" max="18" step="0.25" value="9" aria-label="時間"></label>
        <b class="time">9:00</b>
      </div>
      <div class="controls season"></div>
      <div class="split">
        <div><div class="hint" style="text-align:center">俯視圖（像日晷一樣從上往下看）</div><div class="top"></div></div>
        <div><div class="hint" style="text-align:center">側視圖（量太陽高度角）</div><div class="side"></div></div>
      </div>
      <div class="readout"></div><div class="say"></div>`;
    const range = el.querySelector('input');
    seg(el.querySelector('.season'), [['spring', '春分'], ['summer', '夏至'], ['autumn', '秋分'], ['winter', '冬至']], season, v => { season = v; draw(); });
    range.oninput = () => { t = Number(range.value); draw(); };
    function draw() {
      const s = SEASONS[season];
      const p = sunPos(t, s.dec);
      el.querySelector('.time').textContent = fmtTime(t);
      const cx = 175, cy = 175, R = 120;
      const up = p.alt > 0.5;
      const pt = (az, r) => [cx + r * Math.sin(rad(az)), cy - r * Math.cos(rad(az))];
      // 每小時的影子方向刻度（日晷刻度）
      let ticks = '';
      for (let h = 6; h <= 18; h++) {
        const q = sunPos(h, s.dec);
        if (q.alt <= 0.5) continue;
        const [x1, y1] = pt(q.az + 180, R - 12), [x2, y2] = pt(q.az + 180, R), [lx, ly] = pt(q.az + 180, R + 16);
        ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#C9A06A" stroke-width="2"/>
          <text x="${lx}" y="${ly + 5}" text-anchor="middle" font-size="13" fill="#8D6E63">${h > 12 ? h - 12 : h}</text>`;
      }
      const L = up ? Math.min(40 / Math.tan(rad(p.alt)), R - 6) : 0;
      const [sx, sy] = pt(p.az + 180, L);
      const [ux, uy] = pt(p.az, R - 30);
      el.querySelector('.top').innerHTML = `<svg viewBox="0 0 350 350" role="img" aria-label="竿影俯視圖">
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="#FFFDE7" stroke="#F7E3A1" stroke-width="4"/>
        <line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="#F0E0B0" stroke-dasharray="4 4"/>
        <line x1="${cx}" y1="${cy - R}" x2="${cx}" y2="${cy + R}" stroke="#F0E0B0" stroke-dasharray="4 4"/>
        ${ticks}
        <text x="${cx}" y="18" text-anchor="middle" font-weight="800" fill="#E86A8D">北</text>
        <text x="${cx}" y="345" text-anchor="middle" font-weight="800" fill="#E86A8D">南</text>
        <text x="338" y="${cy + 6}" text-anchor="middle" font-weight="800" fill="#E86A8D">東</text>
        <text x="12" y="${cy + 6}" text-anchor="middle" font-weight="800" fill="#E86A8D">西</text>
        ${up ? `<line x1="${cx}" y1="${cy}" x2="${sx}" y2="${sy}" stroke="#6D5A55" stroke-width="7" stroke-linecap="round" opacity=".75"/>
        <line x1="${cx}" y1="${cy}" x2="${ux}" y2="${uy}" stroke="#F4A300" stroke-width="2" stroke-dasharray="5 4"/>
        ${sunIcon(ux, uy, 11)}` : ''}
        <circle cx="${cx}" cy="${cy}" r="6" fill="#E86A8D"/>
      </svg>`;
      // 側視圖
      const gx = 60, gy = 170, poleX = 230, poleH = 90;
      let side = `<svg viewBox="0 0 320 210" role="img" aria-label="太陽高度角側視圖">
        <rect x="0" y="${gy}" width="320" height="40" fill="#E8F5E9"/>
        <line x1="0" y1="${gy}" x2="320" y2="${gy}" stroke="#8FD694" stroke-width="3"/>
        <line x1="${poleX}" y1="${gy}" x2="${poleX}" y2="${gy - poleH}" stroke="#E86A8D" stroke-width="6" stroke-linecap="round"/>
        <text x="${poleX + 8}" y="${gy - poleH}" font-size="13" fill="#8D6E63">竿頂</text>`;
      if (up) {
        const sl = Math.min(poleH / Math.tan(rad(p.alt)), poleX - 10);
        const tipX = poleX - sl;
        const ang = p.alt;
        const far = 400;
        const sunX = tipX + far * Math.cos(rad(ang)), sunY = gy - far * Math.sin(rad(ang));
        const ar = 34;
        side += `<line x1="${tipX}" y1="${gy}" x2="${poleX}" y2="${gy}" stroke="#6D5A55" stroke-width="7" opacity=".75"/>
          <line x1="${tipX}" y1="${gy}" x2="${sunX}" y2="${sunY}" stroke="#F4A300" stroke-width="2" stroke-dasharray="6 4"/>
          <path d="M ${tipX + ar} ${gy} A ${ar} ${ar} 0 0 0 ${tipX + ar * Math.cos(rad(ang))} ${gy - ar * Math.sin(rad(ang))}" fill="none" stroke="#E86A8D" stroke-width="3"/>
          <text x="${tipX + ar + 6}" y="${gy - 8}" font-size="14" font-weight="800" fill="#E86A8D">${Math.round(ang)}°</text>
          <text x="${tipX}" y="${gy + 22}" font-size="12" text-anchor="middle" fill="#8D6E63">竿影末端</text>`;
        const sxc = Math.min(sunX, 300), syc = gy - (sxc - tipX) * Math.tan(rad(ang));
        if (syc > 16) side += sunIcon(sxc, syc, 12);
        else { const k = (gy - 20) / Math.sin(rad(ang)); side += sunIcon(tipX + k * Math.cos(rad(ang)), 20, 12); }
      } else {
        side += `<text x="160" y="80" text-anchor="middle" fill="#8D6E63">🌙 太陽不在天空中</text>`;
      }
      side += `</svg>`;
      el.querySelector('.side').innerHTML = side;
      const ro = el.querySelector('.readout'), say = el.querySelector('.say');
      if (up) {
        const shadowCm = 10 / Math.tan(rad(p.alt));
        ro.innerHTML = `<span>☀️ 太陽方位 <b>${dirName(p.az)}</b></span><span>👤 影子方位 <b>${dirName(p.az + 180)}</b></span>
          <span>📐 高度角 <b>${Math.round(p.alt)} 度</b></span><span>📏 10 公分竿子的影長 <b>${shadowCm > 99 ? '超過 99' : shadowCm.toFixed(1)} 公分</b></span>`;
        say.innerHTML = `太陽在<b>${dirName(p.az)}</b>方，影子就在相反的<b>${dirName(p.az + 180)}</b>方。${p.alt > 60 ? '太陽高度角很大，影子很短！' : p.alt < 25 ? '太陽高度角很小，影子拉得好長！' : '拖動時間，看看影子長短怎麼變。'}`;
      } else {
        const rs = riseSet(s.dec);
        ro.innerHTML = `<span>${s.name}日出約 <b>${fmtTime(rs.rise)}</b></span><span>日落約 <b>${fmtTime(rs.set)}</b></span>`;
        say.innerHTML = '這個時間太陽還沒升起或已經落下，沒有影子。';
      }
    }
    draw();
  }

  /* ---------------- 1-2 天球圖：四季太陽運行路線 ---------------- */
  function skyDome(el) {
    let season = 'summer', t = 12, timer = null;
    el.innerHTML = `
      <div class="controls season"></div>
      <div class="controls">
        <label>⏰ 時間 <input type="range" min="5" max="19" step="0.1" value="12" aria-label="時間"></label>
        <b class="time">12:00</b> <button type="button" class="k-btn alt small play">▶ 播放一天</button>
      </div>
      <div class="stage"></div>
      <div class="legend">
        <span><i style="background:${COLOR.summer}"></i>夏至</span>
        <span><i style="background:${COLOR.spring}"></i>春分・秋分（路線幾乎重疊）</span>
        <span><i style="background:${COLOR.autumn}"></i>冬至</span>
      </div>
      <div class="readout"></div>`;
    const lineColor = { summer: COLOR.summer, spring: COLOR.spring, winter: COLOR.autumn };
    const range = el.querySelector('input'), playBtn = el.querySelector('.play');
    seg(el.querySelector('.season'), [['summer', '夏至'], ['spring', '春分・秋分'], ['winter', '冬至']], season, v => { season = v; draw(); });
    range.oninput = () => { t = Number(range.value); draw(); };
    playBtn.onclick = () => {
      if (timer) { clearInterval(timer); timer = null; playBtn.textContent = '▶ 播放一天'; return; }
      playBtn.textContent = '⏸ 暫停';
      const rs = riseSet(SEASONS[season].dec);
      t = rs.rise;
      timer = setInterval(() => {
        t += 0.1;
        if (t > rs.set) { t = rs.set; clearInterval(timer); timer = null; playBtn.textContent = '▶ 播放一天'; }
        range.value = t; draw();
      }, 60);
    };
    const W = 600, Hh = 360, cx = 300, cy = 270, R = 230, tilt = rad(22);
    const proj = (E, N, U) => [cx + R * E, cy - R * (U * Math.cos(tilt) + N * Math.sin(tilt))];
    function path(key) {
      const dec = SEASONS[key].dec, rs = riseSet(dec);
      const pts = [];
      for (let x = rs.rise; x <= rs.set + 0.001; x += 0.1) { const p = sunPos(Math.min(x, rs.set), dec); pts.push(proj(p.E, p.N, Math.max(p.U, 0))); }
      return 'M' + pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L');
    }
    const paths = { summer: path('summer'), spring: path('spring'), winter: path('winter') };
    function draw() {
      const dec = SEASONS[season].dec;
      el.querySelector('.time').textContent = fmtTime(t);
      const p = sunPos(t, dec);
      const [sx, sy] = proj(p.E, p.N, Math.max(p.U, 0));
      const ry = R * Math.sin(tilt);
      let svg = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="天球圖：四季太陽運行路線">
        <path d="M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}" fill="#E3F2FD" stroke="#BBDDF7" stroke-width="3"/>
        <ellipse cx="${cx}" cy="${cy}" rx="${R}" ry="${ry}" fill="#E8F5E9" stroke="#8FD694" stroke-width="3"/>
        <line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="#A5D6A7" stroke-dasharray="5 5"/>
        <line x1="${cx}" y1="${cy - ry}" x2="${cx}" y2="${cy + ry}" stroke="#A5D6A7" stroke-dasharray="5 5"/>`;
      Object.keys(paths).forEach(k => {
        const on = k === season;
        svg += `<path d="${paths[k]}" fill="none" stroke="${lineColor[k]}" stroke-width="${on ? 4 : 2}" opacity="${on ? 1 : 0.45}" stroke-linecap="round"/>`;
      });
      // 路線名稱直接標在正午位置旁
      [['summer', '夏至'], ['spring', '春分・秋分'], ['winter', '冬至']].forEach(([k, n]) => {
        const q = sunPos(12, SEASONS[k].dec); const [x, y] = proj(q.E, q.N, q.U);
        svg += `<text x="${x + 10}" y="${y - 6}" font-size="13" font-weight="700" fill="#5D4037">${n}</text>`;
      });
      svg += `<text x="${cx + R + 14}" y="${cy + 6}" font-weight="800" fill="#E86A8D">東</text>
        <text x="${cx - R - 30}" y="${cy + 6}" font-weight="800" fill="#E86A8D">西</text>
        <text x="${cx - 8}" y="${cy + ry + 22}" font-weight="800" fill="#E86A8D">南</text>
        <text x="${cx - 40}" y="${cy - ry - 8}" font-weight="800" fill="#E86A8D">北</text>
        <text x="${cx - 12}" y="${cy + 2}" font-size="24">🧒</text>`;
      if (p.alt > 0) svg += `<line x1="${cx}" y1="${cy - 10}" x2="${sx}" y2="${sy}" stroke="#F4A300" stroke-dasharray="4 4"/>` + sunIcon(sx, sy, 12);
      svg += `</svg>`;
      el.querySelector('.stage').innerHTML = svg;
      const rs = riseSet(dec), r0 = sunPos(rs.rise + 0.02, dec), s0 = sunPos(rs.set - 0.02, dec), noon = sunPos(12, dec);
      el.querySelector('.readout').innerHTML = `
        <span>🌅 日出 <b>${fmtTime(rs.rise)}</b>・<b>${dirName(r0.az)}</b></span>
        <span>🌇 日落 <b>${fmtTime(rs.set)}</b>・<b>${dirName(s0.az)}</b></span>
        <span>🕛 中午高度角 <b>${Math.round(noon.alt)} 度</b></span>
        <span>☀️ 白天約 <b>${(rs.set - rs.rise).toFixed(1)} 小時</b></span>
        <span>目前：${p.alt > 0 ? `${dirName(p.az)}方，高度角 <b>${Math.round(p.alt)} 度</b>` : '太陽不在天空中'}</span>`;
    }
    draw();
  }

  /* ---------------- 共用：折線圖（含滑鼠／觸控提示） ---------------- */
  function lineChart(el, cfg) {
    const W = 560, H = 300, m = { l: 52, r: 18, t: 16, b: 44 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const n = cfg.xs.length;
    const X = i => m.l + (n === 1 ? iw / 2 : i * iw / (n - 1));
    const Y = v => m.t + ih - (v - cfg.yMin) / (cfg.yMax - cfg.yMin) * ih;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${cfg.title}">`;
    for (let v = cfg.yMin; v <= cfg.yMax + 1e-9; v += cfg.yStep) {
      s += `<line x1="${m.l}" y1="${Y(v)}" x2="${W - m.r}" y2="${Y(v)}" stroke="#F3E5E9" stroke-width="1"/>
        <text x="${m.l - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="#8D6E63">${v}</text>`;
    }
    cfg.xs.forEach((x, i) => { s += `<text x="${X(i)}" y="${H - m.b + 18}" text-anchor="middle" font-size="12" fill="#8D6E63">${x}</text>`; });
    s += `<text x="${m.l + iw / 2}" y="${H - 6}" text-anchor="middle" font-size="12" fill="#8D6E63">${cfg.xLabel}</text>
      <text x="14" y="${m.t + ih / 2}" text-anchor="middle" font-size="12" fill="#8D6E63" transform="rotate(-90 14 ${m.t + ih / 2})">${cfg.yLabel}</text>`;
    cfg.series.forEach(se => {
      const pts = se.data.map((v, i) => v == null ? null : [X(i), Y(v)]);
      let d = '', pen = false;
      pts.forEach(p => { if (!p) { pen = false; return; } d += (pen ? ' L' : ' M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); pen = true; });
      s += `<path d="${d}" fill="none" stroke="${se.color}" stroke-width="2" stroke-linejoin="round"/>`;
      pts.forEach(p => { if (p) s += `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${se.color}" stroke="#fff" stroke-width="2"/>`; });
    });
    s += `<line class="guide" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" stroke="#BCAAA4" stroke-dasharray="3 3" visibility="hidden"/>
      <rect class="hit" x="${m.l - 10}" y="${m.t}" width="${iw + 20}" height="${ih}" fill="transparent"/></svg>`;
    const box = document.createElement('div');
    box.innerHTML = (cfg.series.length > 1 ? `<div class="legend">${cfg.series.map(se => `<span><i style="background:${se.color}"></i>${se.name}</span>`).join('')}</div>` : `<div class="hint" style="text-align:center;font-weight:700">${cfg.title}</div>`) + s;
    el.appendChild(box);
    const svg = box.querySelector('svg'), guide = svg.querySelector('.guide'), hit = svg.querySelector('.hit'), tp = tip();
    function move(ev) {
      const r = svg.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width * W;
      const i = Math.max(0, Math.min(n - 1, Math.round((x - m.l) / (iw / (n - 1)))));
      guide.setAttribute('x1', X(i)); guide.setAttribute('x2', X(i)); guide.setAttribute('visibility', 'visible');
      tp.innerHTML = `<b>${cfg.xs[i]}${cfg.xUnit || ''}</b><br>` + cfg.series.map(se =>
        `<span style="color:${se.color}">●</span> ${se.name}：${se.data[i] == null ? (se.missing ? se.missing[i] : '—') : se.data[i] + (cfg.unit || '')}`).join('<br>');
      tp.style.left = Math.min(ev.clientX + 14, window.innerWidth - 170) + 'px';
      tp.style.top = (ev.clientY + 14) + 'px';
      tp.style.opacity = 1;
    }
    hit.addEventListener('pointermove', move);
    hit.addEventListener('pointerdown', move);
    hit.addEventListener('pointerleave', () => { guide.setAttribute('visibility', 'hidden'); tp.style.opacity = 0; });
  }

  function seasonChart(el) {
    const miss = ['未日出', null, null, null, '已日落'];
    lineChart(el, {
      title: '嘉義地區四季太陽高度角折線圖', xs: ['6:00', '9:00', '12:00', '15:00', '18:00'], xLabel: '觀測時刻（時）', yLabel: '太陽高度角（度）',
      yMin: 0, yMax: 90, yStep: 10, unit: ' 度',
      series: [
        { name: '春分', color: COLOR.spring, data: [null, 39, 66, 41, 1], missing: miss },
        { name: '夏至', color: COLOR.summer, data: [9, 48, 90, 48, 9] },
        { name: '秋分', color: COLOR.autumn, data: [2, 42, 66, 38, null], missing: miss },
        { name: '冬至', color: COLOR.winter, data: [null, 26, 43, 25, null], missing: miss }
      ]
    });
    el.insertAdjacentHTML('beforeend', '<p class="hint">把手指或滑鼠移到圖上，可以看到每個時刻的高度角。春分和秋分的線幾乎重疊。</p>');
  }

  function monthCharts(el) {
    el.innerHTML = '<div class="split"><div class="a"></div><div class="b"></div></div><p class="hint">兩張圖分開畫，因為單位不同（度 和 °C）。移到圖上看每個月的數值。</p>';
    const months = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    lineChart(el.querySelector('.a'), {
      title: '中午 12 時平均太陽高度角', xs: months, xUnit: ' 月', xLabel: '月分', yLabel: '高度角（度）', yMin: 40, yMax: 90, yStep: 10, unit: ' 度',
      series: [{ name: '太陽高度角', color: COLOR.autumn, data: [46, 55, 66, 78, 86, 90, 87, 79, 68, 56, 47, 43] }]
    });
    lineChart(el.querySelector('.b'), {
      title: '平均氣溫', xs: months, xUnit: ' 月', xLabel: '月分', yLabel: '氣溫（°C）', yMin: 16, yMax: 30, yStep: 2, unit: ' °C',
      series: [{ name: '平均氣溫', color: COLOR.summer, data: [16.8, 17.7, 20.2, 23.5, 26.3, 28.3, 28.9, 28.4, 27.4, 24.8, 22, 18.4] }]
    });
  }

  /* ---------------- 充電站：地球公轉與四季 ---------------- */
  function orbit(el) {
    const info = {
      spring: { a: 0, lat: '赤道', txt: '太陽直射赤道，各地晝夜等長。' },
      summer: { a: 23.44, lat: '北回歸線', txt: '太陽直射北回歸線，臺灣白天最長，晝長夜短。' },
      autumn: { a: 0, lat: '赤道', txt: '太陽直射赤道，各地晝夜等長。' },
      winter: { a: -23.44, lat: '南回歸線', txt: '太陽直射南回歸線，臺灣白天最短，晝短夜長。' }
    };
    el.innerHTML = `<div class="controls"></div><div class="stage"></div><div class="say"></div>`;
    function draw(k) {
      const a = info[k].a, R = 95, cx = 390, cy = 150;
      // 地軸向上的方向（北極向太陽傾 a 度）
      const ux = -Math.sin(rad(a)), uy = -Math.cos(rad(a));
      const px = -uy, py = ux; // 與地軸垂直
      const latLine = (lat, color, label, dash) => {
        const ox = cx + ux * R * Math.sin(rad(lat)), oy = cy + uy * R * Math.sin(rad(lat));
        const hl = R * Math.cos(rad(lat));
        return `<line x1="${ox - px * hl}" y1="${oy - py * hl}" x2="${ox + px * hl}" y2="${oy + py * hl}" stroke="${color}" stroke-width="2" ${dash ? 'stroke-dasharray="5 4"' : ''}/>
          <text x="${ox + px * hl + 6}" y="${oy + py * hl + 4}" font-size="12" fill="#5D4037">${label}</text>`;
      };
      let rays = '';
      for (let y = cy - 80; y <= cy + 80; y += 32) rays += `<line x1="120" y1="${y}" x2="${cx - Math.sqrt(Math.max(0, R * R - (y - cy) ** 2)) - 4}" y2="${y}" stroke="#F4A300" stroke-width="2" marker-end="url(#arr)"/>`;
      el.querySelector('.stage').innerHTML = `<svg viewBox="0 0 560 300" role="img" aria-label="${SEASONS[k].name}太陽直射位置">
        <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#F4A300"/></marker>
        <clipPath id="earth"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath></defs>
        ${sunIcon(60, cy, 34)}<text x="60" y="${cy + 62}" text-anchor="middle" font-size="14" fill="#8D6E63">太陽光</text>
        ${rays}
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="#BFE6FF" stroke="#5B9BD5" stroke-width="3"/>
        <rect x="${cx}" y="${cy - R}" width="${R}" height="${2 * R}" fill="#2C3E66" opacity=".35" clip-path="url(#earth)"/>
        <line x1="${cx - ux * (R + 26)}" y1="${cy - uy * (R + 26)}" x2="${cx + ux * (R + 26)}" y2="${cy + uy * (R + 26)}" stroke="#6D5A55" stroke-width="2" stroke-dasharray="6 4"/>
        <text x="${cx + ux * (R + 34) - 12}" y="${cy + uy * (R + 34)}" font-size="12" fill="#5D4037">北極</text>
        ${latLine(0, '#E86A8D', '赤道')}${latLine(23.44, '#1baf7a', '北回歸線', true)}${latLine(-23.44, '#2a78d6', '南回歸線', true)}
        <line x1="${cx - R - 30}" y1="${cy}" x2="${cx - R}" y2="${cy}" stroke="#E86A8D" stroke-width="4"/>
        <text x="${cx - R - 34}" y="${cy + 5}" font-size="13" font-weight="800" fill="#E86A8D" text-anchor="end">直射${info[k].lat}</text>
        <text x="${cx + R - 30}" y="${cy + R + 22}" font-size="12" fill="#8D6E63">右半邊是黑夜</text>
      </svg>`;
      el.querySelector('.say').innerHTML = `<b>${SEASONS[k].name}（${SEASONS[k].date}）</b>：${info[k].txt}`;
    }
    seg(el.querySelector('.controls'), [['spring', '🌸 春分'], ['summer', '🌻 夏至'], ['autumn', '🍁 秋分'], ['winter', '⛄ 冬至']], 'summer', draw);
    draw('summer');
  }

  /* ---------------- 1-3 噴水製造彩虹 ---------------- */
  function rainbowSpray(el) {
    el.innerHTML = `<div class="controls"></div><div class="stage"></div><div class="say"></div>`;
    const bands = ['#E53935', '#FB8C00', '#FDD835', '#43A047', '#1E88E5', '#3949AB', '#8E24AA'];
    function draw(mode) {
      const back = mode === 'back';
      // back：太陽在左後方、朝右邊陰影處噴水；face：面向太陽噴水
      const sunX = back ? 60 : 540;
      let rb = '';
      if (back) bands.forEach((c, i) => { const r = 150 - i * 7; rb += `<path d="M ${420 - r} 250 A ${r} ${r} 0 0 1 ${420 + r} 250" fill="none" stroke="${c}" stroke-width="7" opacity=".8"/>`; });
      el.querySelector('.stage').innerHTML = `<svg viewBox="0 0 600 300" role="img" aria-label="噴水製造彩虹">
        <rect width="600" height="300" rx="20" fill="#DFF1FF"/>
        ${back ? '<rect x="300" y="0" width="300" height="250" fill="#B7C9D9" opacity=".55"/><text x="520" y="30" font-size="13" fill="#5D4037">陰影處</text>' : ''}
        ${sunIcon(sunX, 50, 26)}
        <rect y="250" width="600" height="50" fill="#8FD694"/>
        ${rb}
        ${[...Array(40)].map((_, i) => `<circle cx="${back ? 330 + (i * 37) % 190 : 200 + (i * 37) % 190}" cy="${120 + (i * 53) % 120}" r="2.5" fill="#5B9BD5" opacity=".6"/>`).join('')}
        <text x="${back ? 200 : 390}" y="245" font-size="54" transform="${back ? '' : 'scale(-1 1) translate(-780 0)'}">🧒</text>
        <line x1="${back ? 250 : 380}" y1="200" x2="${back ? 320 : 330}" y2="170" stroke="#5B9BD5" stroke-width="4"/>
      </svg>`;
      el.querySelector('.say').innerHTML = back
        ? '🌈 <b>背向太陽</b>、朝有陰影的地方噴水，陽光從背後照進小水珠，就能看到清楚的彩虹！顏色有<mark>紅、橙、黃、綠、藍、靛、紫</mark>。'
        : '😵 <b>面向太陽</b>噴水時，陽光刺眼，也不容易看到彩虹。試試看轉身背向太陽吧！';
    }
    seg(el.querySelector('.controls'), [['face', '😎 面向太陽噴水'], ['back', '🙂 背向太陽噴水']], 'face', draw);
    draw('face');
  }

  /* ---------------- 1-3 三稜鏡分光 ---------------- */
  function prism(el) {
    el.innerHTML = `<div class="controls"></div><div class="stage"></div><div class="say"></div>`;
    const bands = ['#E53935', '#FB8C00', '#FDD835', '#43A047', '#1E88E5', '#3949AB', '#8E24AA'];
    const names = ['紅', '橙', '黃', '綠', '藍', '靛', '紫'];
    function draw(on) {
      let beams = '';
      if (on) {
        bands.forEach((c, i) => {
          beams += `<line x1="300" y1="${150 + i * 2}" x2="370" y2="${165 + i * 5}" stroke="${c}" stroke-width="3"/>
            <line x1="370" y1="${165 + i * 5}" x2="560" y2="${170 + i * 18}" stroke="${c}" stroke-width="5"/>
            <text x="566" y="${175 + i * 18}" font-size="13" fill="#5D4037">${names[i]}</text>`;
        });
      } else {
        beams = `<line x1="40" y1="130" x2="580" y2="130" stroke="#FFD54F" stroke-width="8"/>`;
      }
      el.querySelector('.stage').innerHTML = `<svg viewBox="0 0 600 320" role="img" aria-label="陽光通過三稜鏡">
        <rect width="600" height="320" rx="20" fill="#3A3F5C"/>
        ${on ? `<line x1="40" y1="110" x2="300" y2="150" stroke="#FFF8E1" stroke-width="8"/>
          <polygon points="330,60 250,220 410,220" fill="#E3F2FD" opacity=".55" stroke="#fff" stroke-width="3"/>` : ''}
        ${beams}
        <text x="40" y="96" font-size="14" fill="#FFF8E1">白色的陽光</text>
      </svg>`;
      el.querySelector('.say').innerHTML = on
        ? '陽光通過三稜鏡後，<mark>分散成不同顏色的色光</mark>，所以可以推論：陽光是由不同顏色的色光組成的。'
        : '陽光看起來是白色的。放上三稜鏡看看會發生什麼事？';
    }
    seg(el.querySelector('.controls'), [[false, '沒有三稜鏡'], [true, '🔺 放上三稜鏡']], false, draw);
    draw(false);
  }

  /* ---------------- 1-3 光的折射 ---------------- */
  function refraction(el) {
    let mode = 'a2w', ang = 40;
    el.innerHTML = `<div class="controls modes"></div>
      <div class="controls angle"><label>🔦 光斜射的角度 <input type="range" min="0" max="70" value="40" aria-label="入射角"></label><b class="deg">40 度</b></div>
      <div class="stage"></div><div class="readout"></div><div class="say"></div>`;
    const range = el.querySelector('input'), angBox = el.querySelector('.angle');
    seg(el.querySelector('.modes'), [['a2w', '空氣 → 水'], ['w2a', '水 → 空氣'], ['stone', '👀 水中的石頭']], mode, v => {
      mode = v;
      range.max = v === 'w2a' ? 45 : 70;
      if (Number(range.value) > Number(range.max)) range.value = range.max;
      ang = Number(range.value);
      draw();
    });
    range.oninput = () => { ang = Number(range.value); draw(); };
    const n = 1.33, W = 560, H = 340, sy = 170, ox = 280;
    function draw() {
      angBox.style.display = mode === 'stone' ? 'none' : '';
      el.querySelector('.deg').textContent = ang + ' 度';
      let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="光的折射">
        <defs><marker id="rarr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#E53935"/></marker></defs>
        <rect width="${W}" height="${sy}" fill="#F7FBFF"/><rect y="${sy}" width="${W}" height="${H - sy}" fill="#BFE0F7"/>
        <text x="16" y="28" font-size="15" fill="#5D4037" font-weight="700">空氣</text><text x="16" y="${sy + 28}" font-size="15" fill="#2F6FA8" font-weight="700">水</text>`;
      const ro = el.querySelector('.readout'), say = el.querySelector('.say');
      if (mode === 'stone') {
        const E = [110, 50], S = [400, 300];
        // 用二分法找出光線在水面折射的位置
        let lo = E[0], hi = S[0];
        for (let k = 0; k < 60; k++) {
          const mid = (lo + hi) / 2;
          const i1 = Math.atan2(mid - E[0], sy - E[1]), r1 = Math.atan2(S[0] - mid, S[1] - sy);
          (Math.sin(i1) - n * Math.sin(r1) > 0) ? (hi = mid) : (lo = mid);
        }
        const P = [(lo + hi) / 2, sy];
        const k = (S[0] - E[0]) / (P[0] - E[0]);
        const A = [S[0], E[1] + (P[1] - E[1]) * k];
        s += `<rect x="0" y="${H - 20}" width="${W}" height="20" fill="#9FC5DE"/>
          <line x1="${S[0]}" y1="${S[1]}" x2="${P[0]}" y2="${P[1]}" stroke="#E53935" stroke-width="3"/>
          <line x1="${P[0]}" y1="${P[1]}" x2="${E[0]}" y2="${E[1]}" stroke="#E53935" stroke-width="3" marker-end="url(#rarr)"/>
          <line x1="${P[0]}" y1="${P[1]}" x2="${A[0]}" y2="${A[1]}" stroke="#E53935" stroke-width="2" stroke-dasharray="6 5" opacity=".6"/>
          <ellipse cx="${S[0]}" cy="${S[1]}" rx="22" ry="13" fill="#8D6E63"/>
          <ellipse cx="${A[0]}" cy="${A[1]}" rx="22" ry="13" fill="#8D6E63" opacity=".35" stroke="#8D6E63" stroke-dasharray="4 3"/>
          <text x="${S[0] + 30}" y="${S[1] + 5}" font-size="13" fill="#5D4037">實際的石頭</text>
          <text x="${A[0] + 30}" y="${A[1] + 5}" font-size="13" fill="#5D4037">眼睛看到的石頭</text>
          <text x="${E[0] - 22}" y="${E[1] + 8}" font-size="28">👁️</text>`;
        ro.innerHTML = '';
        say.innerHTML = '光從水中斜斜的進入空氣時會偏折，眼睛以為光是直直來的，所以<mark>水中的石頭和池底看起來比較淺</mark>。實際的水比看起來深，不可以貿然進入不熟悉的水域！';
      } else {
        const inc = rad(ang);
        let out;
        if (mode === 'a2w') out = Math.asin(Math.sin(inc) / n); else out = Math.asin(Math.min(1, Math.sin(inc) * n));
        const L1 = 150, L2 = 145;
        const dirIn = mode === 'a2w' ? -1 : 1; // 光源在上方(-1)或下方(1)
        const sx = ox - L1 * Math.sin(inc), syy = sy + dirIn * L1 * Math.cos(inc);
        const ex = ox + L2 * Math.sin(out), ey = sy - dirIn * L2 * Math.cos(out);
        const gx = ox + L2 * Math.sin(inc), gy = sy - dirIn * L2 * Math.cos(inc);
        s += `<line x1="${ox}" y1="10" x2="${ox}" y2="${H - 10}" stroke="#8D6E63" stroke-dasharray="4 5" opacity=".6"/>
          <text x="${ox + 6}" y="22" font-size="12" fill="#8D6E63">垂直水面的虛線</text>
          ${ang > 0 ? `<line x1="${ox}" y1="${sy}" x2="${gx}" y2="${gy}" stroke="#E53935" stroke-width="2" stroke-dasharray="3 5" opacity=".45"/>
          <text x="${gx + 4}" y="${gy + (dirIn > 0 ? 12 : -4)}" font-size="12" fill="#C62828" opacity=".8">如果沒有偏折</text>` : ''}
          <line x1="${sx}" y1="${syy}" x2="${ox}" y2="${sy}" stroke="#E53935" stroke-width="4" marker-end="url(#rarr)"/>
          <line x1="${ox}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="#E53935" stroke-width="4" marker-end="url(#rarr)"/>
          <text x="${sx - 12}" y="${syy + (dirIn > 0 ? 18 : -6)}" font-size="22">🔦</text>`;
        const bend = Math.abs(ang - deg(out));
        ro.innerHTML = `<span>光從 <b>${mode === 'a2w' ? '空氣' : '水'}</b> 進入 <b>${mode === 'a2w' ? '水' : '空氣'}</b></span><span>偏折了約 <b>${bend.toFixed(0)} 度</b></span>`;
        say.innerHTML = ang === 0
          ? '光<b>垂直</b>射入水面時，行進方向不會改變。要<mark>斜斜的</mark>射入才看得出偏折喔！'
          : `光經過不同的<b>介質</b>（空氣和水）時，行進路線發生偏折，這就是<mark>光的折射</mark>。${mode === 'a2w' ? '進入水中後，光線偏向垂直虛線。' : '進入空氣後，光線偏離垂直虛線。'}`;
      }
      s += `</svg>`;
      el.querySelector('.stage').innerHTML = s;
    }
    draw();
  }

  /* ---------------- 1-3 放大鏡：聚光與成像 ---------------- */
  function magnifier(el) {
    let mode = 'focus', d = 60, u = 60, glass = false;
    el.innerHTML = `<div class="controls modes"></div><div class="controls ctl"></div><div class="stage"></div><div class="readout"></div><div class="say"></div>`;
    seg(el.querySelector('.modes'), [['focus', '🔆 聚光'], ['image', '🔍 成像']], mode, v => { mode = v; ctl(); draw(); });
    function ctl() {
      const c = el.querySelector('.ctl');
      if (mode === 'focus') {
        c.innerHTML = `<label>放大鏡和地面的距離 <input type="range" min="20" max="220" value="${d}"></label>`;
        const r = c.querySelector('input'); r.oninput = () => { d = Number(r.value); draw(); };
        seg(c, [[false, '凸透鏡（放大鏡）'], [true, '平板玻璃']], glass, v => { glass = v; draw(); });
      } else {
        c.innerHTML = `<label>放大鏡和物體的距離 <input type="range" min="20" max="280" value="${u}"></label>
          <span class="seg"><button type="button" class="k-btn ghost small near">📖 看近物</button><button type="button" class="k-btn ghost small far">🏫 看遠物</button></span>`;
        const r = c.querySelector('input'); r.oninput = () => { u = Number(r.value); draw(); };
        c.querySelector('.near').onclick = () => { u = 50; r.value = u; draw(); };
        c.querySelector('.far').onclick = () => { u = 260; r.value = u; draw(); };
      }
    }
    const f = 110;
    function draw() {
      const ro = el.querySelector('.readout'), say = el.querySelector('.say');
      let s;
      if (mode === 'focus') {
        const lx = 280, ly = 50, half = 90, gy = ly + d;
        s = `<svg viewBox="0 0 560 300" role="img" aria-label="放大鏡聚光">
          <rect width="560" height="300" rx="20" fill="#FFFDE7"/>
          <rect x="0" y="${gy}" width="560" height="${300 - gy}" fill="#D7CCC8"/>`;
        let spot;
        if (glass) {
          for (let x = -80; x <= 80; x += 32) s += `<line x1="${lx + x}" y1="0" x2="${lx + x}" y2="${gy}" stroke="#F4A300" stroke-width="2"/>`;
          s += `<rect x="${lx - half}" y="${ly - 5}" width="${half * 2}" height="10" rx="3" fill="#BBDDF7" stroke="#5B9BD5" stroke-width="2"/>`;
          spot = half;
        } else {
          for (let x = -80; x <= 80; x += 32) {
            const endX = lx + x * (1 - d / f);
            s += `<line x1="${lx + x}" y1="0" x2="${lx + x}" y2="${ly}" stroke="#F4A300" stroke-width="2"/>
              <line x1="${lx + x}" y1="${ly}" x2="${endX}" y2="${gy}" stroke="#F4A300" stroke-width="2"/>`;
          }
          s += `<ellipse cx="${lx}" cy="${ly}" rx="${half}" ry="12" fill="#BBDDF7" stroke="#5B9BD5" stroke-width="2" opacity=".9"/>`;
          spot = Math.max(3, Math.abs(1 - d / f) * half);
        }
        const bright = Math.min(1, 12 / spot);
        s += `<ellipse cx="${lx}" cy="${gy}" rx="${spot}" ry="${Math.max(2, spot / 5)}" fill="#FFEB3B" opacity="${0.35 + bright * 0.65}" stroke="#F4A300"/>
          <text x="20" y="28" font-size="14" fill="#8D6E63">☀️ 陽光</text></svg>`;
        const focused = !glass && Math.abs(d - f) < 10;
        ro.innerHTML = `<span>光點大小 <b>${glass ? '和玻璃一樣大' : focused ? '最小、最亮！' : spot < 30 ? '小' : '大'}</b></span>`;
        say.innerHTML = glass
          ? '光穿過平板玻璃後，<b>不會往中間聚集</b>，地面上的亮區和玻璃差不多大。'
          : '放大鏡中間厚、周圍薄（<b>凸透鏡</b>）。光穿過後產生折射、<mark>往中間聚集</mark>；調整到適當距離，就會匯聚成最小最亮的光點（聚光）。⚠️ 千萬不可以用放大鏡看太陽！';
      } else {
        const lx = 300, ay = 160, h = 40;
        const v = u * f / (u - f);
        const mag = -v / u;
        const X = x => lx + x;
        s = `<svg viewBox="0 0 600 320" role="img" aria-label="放大鏡成像">
          <rect width="600" height="320" rx="20" fill="#FFFDE7"/>
          <line x1="10" y1="${ay}" x2="590" y2="${ay}" stroke="#D7CCC8"/>
          <ellipse cx="${lx}" cy="${ay}" rx="10" ry="95" fill="#BBDDF7" stroke="#5B9BD5" stroke-width="2"/>
          <circle cx="${X(-f)}" cy="${ay}" r="4" fill="#8D6E63"/><circle cx="${X(f)}" cy="${ay}" r="4" fill="#8D6E63"/>
          <text x="${X(-f)}" y="${ay + 22}" text-anchor="middle" font-size="15" fill="#8D6E63">焦點</text><text x="${X(f)}" y="${ay + 22}" text-anchor="middle" font-size="15" fill="#8D6E63">焦點</text>
          <line x1="${X(-u)}" y1="${ay}" x2="${X(-u)}" y2="${ay - h}" stroke="#E86A8D" stroke-width="5" marker-end="url(#oarr)"/>
          <defs><marker id="oarr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#E86A8D"/></marker>
          <marker id="iarr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#2a78d6"/></marker></defs>
          <text x="${X(-u)}" y="${ay - h - 10}" text-anchor="middle" font-size="15" font-weight="700" fill="#E86A8D">物體</text>`;
        const topY = ay - h;
        // 光線 1：平行主軸 → 經過焦點；光線 2：經過鏡心直走
        const slope1 = h / f; // 折射後每單位 x 下降量
        const x1end = 290, y1end = topY + slope1 * x1end;
        const slope2 = h / u, x2end = 290;
        const yAt2 = x => ay - h + slope2 * (x + u); // 經鏡心的直線，x 以鏡心為 0
        s += `<line x1="${X(-u)}" y1="${topY}" x2="${lx}" y2="${topY}" stroke="#F4A300" stroke-width="2"/>
          <line x1="${lx}" y1="${topY}" x2="${X(x1end)}" y2="${y1end}" stroke="#F4A300" stroke-width="2"/>
          <line x1="${X(-u)}" y1="${topY}" x2="${X(x2end)}" y2="${yAt2(x2end)}" stroke="#F4A300" stroke-width="2"/>`;
        const blurry = Math.abs(u - f) < 8;
        if (!blurry && Math.abs(v) < 290) {
          const ih = h * mag;
          if (v < 0) {
            s += `<line x1="${lx}" y1="${topY}" x2="${X(v)}" y2="${ay - ih}" stroke="#F4A300" stroke-width="1.5" stroke-dasharray="4 4" opacity=".7"/>
              <line x1="${lx}" y1="${ay - h}" x2="${X(v)}" y2="${ay - ih}" stroke="#F4A300" stroke-width="1.5" stroke-dasharray="4 4" opacity=".7"/>`;
          }
          const iy2 = Math.max(12, Math.min(308, ay - ih));
          s += `<line x1="${X(v)}" y1="${ay}" x2="${X(v)}" y2="${iy2}" stroke="#2a78d6" stroke-width="5" ${v < 0 ? 'stroke-dasharray="6 4"' : ''} marker-end="url(#iarr)"/>
            <text x="${X(v)}" y="${iy2 + (iy2 < ay ? -10 : 20)}" text-anchor="middle" font-size="15" font-weight="700" fill="#2a78d6">影像</text>`;
        }
        s += `<text x="560" y="${ay - 50}" font-size="26">👁️</text></svg>`;
        // 眼睛看到的畫面
        const scale = blurry ? 1 : Math.min(3.2, Math.max(0.35, Math.abs(mag)));
        const inverted = !blurry && mag < 0;
        const kind = blurry ? '模糊看不清楚' : (inverted ? '倒立' : '正立') + (Math.abs(mag) >= 1 ? '放大' : '縮小');
        const view = `<svg viewBox="0 0 200 200" style="max-width:200px" role="img" aria-label="透過放大鏡看到${kind}的影像">
          <defs><clipPath id="lensv"><circle cx="100" cy="100" r="80"/></clipPath><filter id="blr"><feGaussianBlur stdDeviation="${blurry ? 5 : 0}"/></filter></defs>
          <circle cx="100" cy="100" r="86" fill="#6D5A55"/><circle cx="100" cy="100" r="80" fill="#fff"/>
          <g clip-path="url(#lensv)" filter="url(#blr)"><g transform="translate(100 100) scale(${scale}) rotate(${inverted ? 180 : 0})">
            <text x="0" y="12" text-anchor="middle" font-size="36" font-weight="800" fill="#E86A8D">自然</text></g></g>
          <text x="100" y="196" text-anchor="middle" font-size="13" fill="#5D4037">從放大鏡看到的</text></svg>`;
        el.querySelector('.stage').innerHTML = `<div class="split" style="align-items:center"><div>${s}</div><div style="text-align:center">${view}</div></div>`;
        ro.innerHTML = `<span>看到的影像：<b>${kind}</b></span>`;
        say.innerHTML = u < f
          ? '放大鏡<b>靠近物體</b>（在焦點以內）時，看到<mark>正立放大</mark>的影像，就像用放大鏡看課本上的字。'
          : blurry ? '物體剛好在焦點附近，影像會變得模糊，稍微調整距離看看。'
            : '物體<b>離放大鏡比較遠</b>時，光線通過放大鏡後交叉，看到的是<mark>倒立</mark>的影像，看遠方的班級牌就會看到倒立縮小的影像。';
        return;
      }
      el.querySelector('.stage').innerHTML = s;
    }
    ctl();
    draw();
  }

  window.UnitWidgets = { dayNight, sunLab, skyDome, seasonChart, monthCharts, orbit, rainbowSpray, prism, refraction, magnifier };
})();
