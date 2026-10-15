/* =========================================================
 * 自然六上・單元2 多變的天氣｜互動實驗元件
 * 地圖、雲圖與颱風路徑皆為依課本圖片自行繪製的示意圖（非實際比例）
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
  /* 經緯度 → SVG 座標（簡化的等距投影） */
  const proj = (lon0, lat1, sx, sy) => ([lon, lat]) => [(lon - lon0) * sx + 10, (lat1 - lat) * sy + 10];
  const pts = (arr, P) => arr.map(p => P(p).map(v => v.toFixed(1)).join(',')).join(' ');
  /* 臺灣本島海岸線（簡化示意） */
  const TAIWAN = [[121.53, 25.30], [121.74, 25.15], [122.00, 25.01], [121.87, 24.75], [121.86, 24.59], [121.70, 24.30], [121.62, 23.98], [121.51, 23.48],
    [121.38, 23.10], [121.15, 22.75], [120.90, 22.35], [120.85, 21.90], [120.73, 21.93], [120.62, 22.30], [120.45, 22.46], [120.27, 22.62], [120.10, 23.00],
    [120.08, 23.15], [120.15, 23.38], [120.15, 23.65], [120.40, 24.05], [120.52, 24.25], [120.70, 24.55], [120.90, 24.82], [121.10, 25.05], [121.40, 25.18]];
  /* 中國東南沿海（由南往北）、海南島、呂宋島北部、九州（皆為簡化示意） */
  const CHINA_COAST = [[108.0, 21.6], [109.5, 21.5], [110.4, 21.2], [111.0, 21.5], [112.5, 21.8], [113.6, 22.2], [114.3, 22.4], [115.5, 22.8], [116.6, 23.3],
    [117.5, 23.9], [118.5, 24.6], [119.3, 25.4], [119.6, 26.3], [120.3, 27.2], [121.0, 28.0], [121.9, 29.9], [121.8, 31.0], [120.9, 32.3], [120.3, 34.3], [119.5, 35.5]];
  const HAINAN = [[108.6, 19.2], [109.5, 20.1], [110.6, 20.1], [111.0, 19.6], [110.4, 18.6], [109.5, 18.2], [108.7, 18.5]];
  const LUZON = [[120.6, 18.5], [121.2, 18.6], [122.2, 18.5], [122.1, 17.1], [121.6, 15.9], [121.6, 14.7], [122.0, 14.0], [121.0, 13.8], [120.6, 14.4],
    [120.0, 14.9], [119.8, 16.2], [120.4, 16.6], [120.4, 17.6]];
  const KYUSHU = [[129.7, 33.2], [130.9, 34.0], [131.9, 33.3], [131.5, 31.5], [130.6, 31.1], [130.2, 32.4]];
  function baseMap(P, sea, land) {
    const china = CHINA_COAST.concat([[100, 40], [100, 10]]);
    return `<polygon points="${pts(china, P)}" fill="${land}" stroke="#7CB342" stroke-width="1"/>
      <polygon points="${pts(HAINAN, P)}" fill="${land}" stroke="#7CB342" stroke-width="1"/>
      <polygon points="${pts(LUZON, P)}" fill="${land}" stroke="#7CB342" stroke-width="1"/>
      <polygon points="${pts(KYUSHU, P)}" fill="${land}" stroke="#7CB342" stroke-width="1"/>
      <polygon points="${pts(TAIWAN, P)}" fill="${land}" stroke="#558B2F" stroke-width="1.5"/>`;
  }

  /* ---------------- 2-1 活動1 大氣中的水 ---------------- */
  function waterForms(el) {
    let place = 'sky', cold = false;
    el.innerHTML = `<div class="controls pl"></div><div class="controls tp"></div><div class="stage" style="max-width:560px;margin:0 auto"></div><div class="say"></div>`;
    seg(el.querySelector('.pl'), [['sky', '☁️ 高空中'], ['near', '🌫️ 地面附近的空氣'], ['leaf', '🌿 草木或物體表面'], ['fall', '⬇️ 從雲中落到地面']], place, v => { place = v; draw(); });
    seg(el.querySelector('.tp'), [[false, '🌡️ 溫度高於 0℃'], [true, '❄️ 溫度低於 0℃']], cold, v => { cold = v; draw(); });
    const INFO = {
      sky: c => ['雲', `水蒸氣飄浮在高空中，遇冷形成液態的<b>小水滴</b>或固態的<b>冰晶</b>，就是<mark>雲</mark>。${c ? '溫度很低時，雲中多是冰晶。' : ''}`],
      near: c => ['霧', `飄浮在<b>地面附近</b>的大量細微水滴，就是<mark>霧</mark>。${c ? '（少數情況也含有冰晶）' : ''}`],
      leaf: c => c ? ['霜', '靠近地面的物體溫度<b>低於 0℃</b>，水蒸氣遇冷變成固態的冰晶附著在物體上，就是<mark>霜</mark>。']
        : ['露', '地面附近的水蒸氣接觸到溫度較低（<b>高於 0℃</b>）的物體或葉片，凝結成水滴，就是<mark>露</mark>。'],
      fall: c => c ? ['雪', '冰晶直接掉落到地面，過程中<b>沒有融化</b>，就是<mark>雪</mark>。']
        : ['雨', '雲中的小水滴或冰晶聚集得愈來愈大、愈重，小水滴直接掉落，或冰晶掉落時<b>融化</b>成水，就是<mark>雨</mark>。']
    };
    function draw() {
      const [name, txt] = INFO[place](cold);
      const sky = cold ? '#DCE9F5' : '#E3F4FD', hl = '#E53950';
      let s = `<svg viewBox="0 0 340 230" role="img" aria-label="大氣中的水：${name}">
        <rect width="340" height="230" fill="${sky}"/>
        <path d="M0 175 L60 120 L110 160 L170 95 L240 165 L290 130 L340 170 L340 230 L0 230 Z" fill="${cold ? '#ECEFF1' : '#C5E1A5'}"/>
        <rect y="190" width="340" height="40" fill="${cold ? '#F5F5F5' : '#AED581'}"/>`;
      // 雲
      const cloud = (x, y, k, op) => `<g opacity="${op}"><ellipse cx="${x}" cy="${y}" rx="${34 * k}" ry="${16 * k}" fill="#fff" stroke="#B0BEC5"/><ellipse cx="${x - 18 * k}" cy="${y - 8 * k}" rx="${18 * k}" ry="${14 * k}" fill="#fff"/><ellipse cx="${x + 14 * k}" cy="${y - 12 * k}" rx="${20 * k}" ry="${16 * k}" fill="#fff"/></g>`;
      s += cloud(90, 45, 1, place === 'sky' || place === 'fall' ? 1 : 0.55) + cloud(250, 38, 0.8, place === 'sky' ? 1 : 0.5);
      if (place === 'sky') {
        for (let i = 0; i < 9; i++) {
          const x = 70 + (i % 5) * 10, y = 40 + Math.floor(i / 5) * 10;
          s += cold ? `<text x="${x}" y="${y}" font-size="9" fill="#42A5F5">✻</text>` : `<circle cx="${x}" cy="${y}" r="2.2" fill="#42A5F5"/>`;
        }
        s += `<text x="170" y="92" text-anchor="middle" font-size="13" font-weight="700" fill="${hl}" stroke="#fff" stroke-width="3" paint-order="stroke">高空：${cold ? '冰晶' : '小水滴'}聚在一起 → 雲</text>`;
      }
      if (place === 'near') {
        s += `<rect x="0" y="130" width="340" height="75" fill="#fff" opacity="0.72"/>
          <text x="170" y="165" text-anchor="middle" font-size="14" font-weight="700" fill="${hl}">地面附近的大量細微水滴 → 霧</text>`;
      }
      if (place === 'fall') {
        for (let i = 0; i < 14; i++) {
          const x = 60 + (i * 37) % 70, y = 75 + (i * 23) % 100;
          s += cold ? `<text x="${x}" y="${y}" font-size="13" fill="#90CAF9">❄</text>` : `<path d="M${x} ${y} q3 6 0 8 q-3 -2 0 -8" fill="#42A5F5"/>`;
        }
        s += `<text x="220" y="110" text-anchor="middle" font-size="13" font-weight="700" fill="${hl}" stroke="#fff" stroke-width="3" paint-order="stroke">${cold ? '冰晶落下，沒有融化 → 雪' : '水滴落下（或冰晶融化）→ 雨'}</text>`;
      }
      // 草木
      s += `<g transform="translate(250 150)">
        <path d="M0 50 Q-4 20 -30 5 Q-5 10 0 30" fill="#66BB6A"/><path d="M4 50 Q8 18 36 0 Q10 12 4 32" fill="#43A047"/>
        <path d="M-2 50 Q0 25 -2 -5" stroke="#2E7D32" stroke-width="3" fill="none"/></g>`;
      if (place === 'leaf') {
        s += cold
          ? [[228, 158], [240, 160], [276, 155], [284, 152], [266, 160]].map(([x, y]) => `<text x="${x}" y="${y}" font-size="16" fill="#E3F2FD" stroke="#1565C0" stroke-width="0.8">✻</text>`).join('')
          : [[228, 160], [238, 164], [278, 156], [286, 152], [268, 162]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="#B3E5FC" stroke="#0288D1"/>`).join('');
        s += `<text x="110" y="150" text-anchor="middle" font-size="13" font-weight="700" fill="${hl}" stroke="#fff" stroke-width="3" paint-order="stroke">葉面上：${cold ? '固態冰晶 → 霜' : '小水滴 → 露'}</text>`;
      }
      s += `<text x="12" y="222" font-size="12" fill="#5D4037">${cold ? '❄️ 低於 0℃' : '🌡️ 高於 0℃'}</text></svg>`;
      el.querySelector('.stage').innerHTML = s;
      el.querySelector('.say').innerHTML = `<b>形成：${name}</b>　${txt}`;
    }
    draw();
  }

  /* ---------------- 2-1 活動3 露和霜的形成實驗 ---------------- */
  function dewFrost(el) {
    let g = 'A';
    const G = {
      A: { name: 'A 常溫水', t: 25, see: '沒變化', fill: '#E3F2FD', ice: false, salt: false },
      B: { name: 'B 水加冰塊', t: 5, see: '露', fill: '#BBDEFB', ice: true, salt: false },
      C: { name: 'C 冰塊加食鹽', t: -5, see: '霜', fill: '#E1F5FE', ice: true, salt: true }
    };
    el.innerHTML = `<div class="controls gp"></div><div class="split" style="align-items:center"><div class="stage" style="max-width:560px;margin:0 auto"></div><div class="line"></div></div><div class="say"></div>
      <div class="tbl-wrap"><table class="k-tbl rec"></table></div><p class="hint">✽ 杯壁溫度為習作的範例紀錄，請依實際觀測結果記錄。</p>`;
    seg(el.querySelector('.gp'), [['A', '🥛 A 常溫水'], ['B', '🧊 B 水加冰塊'], ['C', '🧂 C 冰塊加食鹽']], g, v => { g = v; draw(); });
    const seen = {};
    function draw() {
      const d = G[g]; seen[g] = true;
      let s = `<svg viewBox="0 0 220 220" role="img" aria-label="${d.name}：杯壁出現${d.see}">
        <path d="M50 40 L60 190 Q60 200 70 200 L150 200 Q160 200 160 190 L170 40" fill="#FAFDFF" stroke="#90A4AE" stroke-width="3"/>
        <path d="M56 ${d.ice ? 80 : 95} L64 188 Q64 196 72 196 L148 196 Q156 196 156 188 L164 ${d.ice ? 80 : 95} Z" fill="${d.fill}"/>`;
      if (d.ice) s += [[80, 110], [118, 100], [96, 140], [132, 150], [86, 172], [124, 180]].map(([x, y]) => `<rect x="${x}" y="${y}" width="22" height="20" rx="4" fill="#fff" stroke="#81D4FA" stroke-width="2" opacity="0.9"/>`).join('');
      if (d.salt) s += [...Array(18)].map((_, i) => `<circle cx="${70 + (i * 29) % 80}" cy="${90 + (i * 41) % 100}" r="1.8" fill="#9E9E9E"/>`).join('');
      // 溫度計
      const ty = 170 - (d.t + 10) * 3.2;
      s += `<rect x="140" y="20" width="10" height="160" rx="5" fill="#fff" stroke="#E53950" stroke-width="1.5"/>
        <rect x="142.5" y="${ty}" width="5" height="${180 - ty}" fill="#E53950"/><circle cx="145" cy="182" r="8" fill="#E53950"/>`;
      // 杯壁外側
      if (d.see === '露') s += [[46, 90], [44, 120], [50, 150], [47, 175], [172, 100], [173, 135], [170, 165]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#B3E5FC" stroke="#0288D1" stroke-width="1.5"/>`).join('');
      if (d.see === '霜') s += [[42, 90], [44, 118], [48, 146], [50, 172], [170, 96], [172, 128], [168, 160]].map(([x, y]) => `<text x="${x - 6}" y="${y + 5}" font-size="14" fill="#fff" stroke="#607D8B" stroke-width="0.8">✻</text>`).join('');
      s += `<text x="110" y="216" text-anchor="middle" font-size="13" font-weight="700" fill="#5D4037">${d.name}（約 ${d.t}℃）</text></svg>`;
      el.querySelector('.stage').innerHTML = s;
      // 溫度數線
      const X = t => 20 + (t + 10) * 6.5;
      let L = `<svg viewBox="0 0 300 120" role="img" aria-label="露和霜形成的溫度範圍">
        <rect x="${X(-10)}" y="40" width="${X(0) - X(-10)}" height="26" fill="#E1F5FE" stroke="#81D4FA"/>
        <rect x="${X(0)}" y="40" width="${X(25) - X(0)}" height="26" fill="#FFF3E0" stroke="#FFCC80"/>
        <text x="${(X(-10) + X(0)) / 2}" y="58" text-anchor="middle" font-size="12" font-weight="700" fill="#0277BD">霜</text>
        <text x="${(X(0) + X(25)) / 2}" y="58" text-anchor="middle" font-size="12" font-weight="700" fill="#E65100">露（高於0℃、低於室溫）</text>
        <line x1="${X(0)}" y1="30" x2="${X(0)}" y2="76" stroke="#E53950" stroke-width="2"/>
        <text x="${X(0)}" y="90" text-anchor="middle" font-size="11" fill="#E53950">0℃</text>
        <text x="${X(25)}" y="90" text-anchor="middle" font-size="11" fill="#5D4037">室溫</text>
        <text x="${X(-10)}" y="90" text-anchor="middle" font-size="11" fill="#5D4037">-10℃</text>
        <path d="M${X(d.t)} 22 l-6 -10 h12 z" fill="#E53950"/><text x="${X(d.t)}" y="10" text-anchor="middle" font-size="11" font-weight="700" fill="#E53950">${d.t}℃</text>
        <text x="150" y="112" text-anchor="middle" font-size="11" fill="#5D4037">杯壁的溫度落在哪個範圍？</text></svg>`;
      el.querySelector('.line').innerHTML = L;
      el.querySelector('.say').innerHTML = d.see === '沒變化'
        ? '杯壁的溫度和室溫差不多，水蒸氣沒有遇冷，杯壁<b>沒有變化</b>。'
        : d.see === '露' ? '杯壁溫度<b>高於 0℃ 且低於室溫</b>，空氣中的水蒸氣遇冷凝結成小水滴，杯壁出現<mark>露</mark>。'
          : '冰塊加食鹽讓溫度降到<b>0℃ 以下</b>，空氣中的水蒸氣直接變成固態冰晶附著在杯壁，出現<mark>霜</mark>。';
      el.querySelector('.rec').innerHTML = `<tr><th>組別</th><th>實驗方式</th><th>觀察到的現象</th><th>杯壁溫度</th></tr>` +
        Object.keys(G).map(k => `<tr><td>${k}</td><td>${G[k].name.slice(2)}</td><td>${seen[k] ? G[k].see : '？'}</td><td>${seen[k] ? G[k].t + '℃' : '？'}</td></tr>`).join('');
    }
    draw();
  }

  /* ---------------- 2-1 活動4 水循環 ---------------- */
  function waterCycle(el) {
    const STEPS = [
      ['evap', '蒸發', '海洋、湖泊及地表的水<b>受熱</b>變為氣態的水蒸氣。'],
      ['trans', '蒸散', '植物體內的水，經由<b>葉片</b>以水蒸氣的形態散發到空氣中。'],
      ['cond', '凝結', '水蒸氣上升到空中<b>遇冷</b>，變為液態的小水滴（或冰晶），形成雲。'],
      ['prec', '降水', '從天空降落地面的水，不論液態的<b>雨</b>，或固態的<b>雪、冰雹</b>，都叫降水。'],
      ['coll', '匯集', '雨水聚集或冰雪融化，形成<b>河流</b>，流進湖泊或大海。'],
      ['inf', '滲入', '水流入地下，成為<b>地下水</b>。'],
      ['surf', '地表水', '由雨水和冰雪融化形成，包含河流、冰川、湖泊、沼澤等。'],
      ['gw', '地下水', '由雨水和其他地表水滲入地下，聚積在土壤或岩層的空隙中形成。']
    ];
    let cur = 'evap';
    el.innerHTML = `<div class="controls pk"></div><div class="stage" style="max-width:560px;margin:0 auto"></div><div class="say"></div>
      <div class="controls"><button type="button" class="k-btn small nx">➡️ 下一步</button><span class="hint">依序點選，完成一趟水的循環之旅</span></div>`;
    const bar = seg(el.querySelector('.pk'), STEPS.map(([k, n]) => [k, n]), cur, v => { cur = v; draw(); });
    el.querySelector('.nx').onclick = () => {
      const i = (STEPS.findIndex(s => s[0] === cur) + 1) % STEPS.length;
      cur = STEPS[i][0];
      bar.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', j === i));
      draw();
    };
    const ARROWS = {
      evap: 'M70 150 C60 120 70 90 95 70', trans: 'M235 120 C230 100 215 85 200 70',
      cond: 'M105 55 C125 42 150 38 170 40', prec: 'M245 55 L260 95',
      coll: 'M300 130 C270 150 200 160 150 168', inf: 'M205 172 L205 200'
    };
    const LBL = { evap: [58, 100], trans: [236, 92], cond: [138, 30], prec: [276, 80], coll: [185, 150], inf: [212, 196] };
    function draw() {
      const on = k => k === cur;
      const hl = '#E53950', dim = '#90A4AE';
      let s = `<svg viewBox="0 0 360 240" role="img" aria-label="水循環示意圖，目前選擇：${STEPS.find(x => x[0] === cur)[1]}">
        <rect width="360" height="240" fill="#E3F4FD"/>
        <rect y="170" width="360" height="70" fill="${on('gw') ? '#D7CCC8' : '#EFEBE9'}"/>
        <path d="M0 160 L130 160 Q150 170 180 168 L360 150 L360 175 L0 175 Z" fill="#A5D6A7"/>
        <path d="M0 150 L120 150 Q130 170 110 175 L0 175 Z" fill="${on('surf') ? '#4FC3F7' : '#81D4FA'}"/>
        <text x="40" y="168" font-size="12" font-weight="700" fill="#01579B">海洋</text>
        <path d="M260 160 L300 90 L340 150 Z" fill="#8D6E63"/><path d="M288 111 L300 90 L312 111 Z" fill="#fff"/>
        <path d="M300 140 C270 150 210 158 150 166" stroke="${on('surf') || on('coll') ? '#29B6F6' : '#81D4FA'}" stroke-width="5" fill="none"/>
        <g transform="translate(232 128)"><rect x="-3" y="10" width="6" height="30" fill="#795548"/><circle cx="0" cy="4" r="17" fill="#43A047"/></g>
        <text x="30" y="226" font-size="12" font-weight="700" fill="${on('gw') ? hl : '#6D4C41'}">地下水（土壤、岩層的空隙）</text>
        <g><ellipse cx="200" cy="48" rx="46" ry="18" fill="#fff" stroke="#B0BEC5"/><ellipse cx="180" cy="38" rx="22" ry="16" fill="#fff"/><ellipse cx="220" cy="36" rx="24" ry="18" fill="#fff"/>
        <text x="200" y="54" text-anchor="middle" font-size="12" font-weight="700" fill="#546E7A">雲</text></g>
        <circle cx="50" cy="30" r="16" fill="#FFD54F"/>
        ${on('surf') ? `<text x="130" y="192" font-size="12" font-weight="700" fill="${hl}">地表水：海洋、河流、湖泊…</text>` : ''}`;
      for (const k in ARROWS) {
        s += `<path d="${ARROWS[k]}" stroke="${on(k) ? hl : dim}" stroke-width="${on(k) ? 4 : 2.5}" fill="none" stroke-dasharray="${k === 'evap' || k === 'trans' ? '6 4' : '0'}" marker-end="url(#wc-${on(k) ? 'on' : 'off'})"/>`;
        const n = STEPS.find(x => x[0] === k)[1];
        s += `<text x="${LBL[k][0]}" y="${LBL[k][1]}" text-anchor="middle" font-size="12" font-weight="700" fill="${on(k) ? hl : '#546E7A'}" stroke="#fff" stroke-width="3" paint-order="stroke">${n}</text>`;
      }
      if (on('prec')) s += [...Array(8)].map((_, i) => `<line x1="${180 + i * 8}" y1="70" x2="${176 + i * 8}" y2="84" stroke="#42A5F5" stroke-width="2"/>`).join('');
      s += `<defs>${['on', 'off'].map(m => `<marker id="wc-${m}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="${m === 'on' ? hl : dim}"/></marker>`).join('')}</defs></svg>`;
      el.querySelector('.stage').innerHTML = s;
      const st = STEPS.find(x => x[0] === cur);
      el.querySelector('.say').innerHTML = `<b>${st[1]}</b>：${st[2]}`;
    }
    draw();
  }

  /* ---------------- 2-2 活動1 衛星雲圖（示意） ---------------- */
  function satellite(el) {
    let day = 19;
    el.innerHTML = `<div class="controls dy"></div><div class="stage" style="max-width:560px;margin:0 auto"></div>
      <div class="legend"><span><i style="background:#2F4B8F;height:10px"></i>藍色：海洋</span><span><i style="background:#8DB86B;height:10px"></i>綠色：陸地</span><span><i style="background:#fff;border:1px solid #999;height:10px"></i>白色：雲層</span></div>
      <div class="say"></div>`;
    seg(el.querySelector('.dy'), [[19, '🛰️ 2023年4月19日 14:00'], [20, '🛰️ 2023年4月20日 14:00']], day, v => { day = v; draw(); });
    const P = proj(112, 34, 16, 16);
    const CL = {
      19: [[113, 24.5, 34, 14, 0.75], [117, 25, 40, 18, 0.85], [121, 24.6, 42, 22, 0.95], [121.2, 24.2, 22, 14, 1], [125, 26.5, 46, 20, 0.9], [129, 29, 44, 18, 0.85], [132, 31.5, 40, 16, 0.8], [118, 28, 26, 10, 0.4]],
      20: [[124.5, 22.5, 44, 18, 0.8], [128, 24.5, 48, 20, 0.85], [131.5, 27, 40, 18, 0.8], [118, 30, 30, 12, 0.45], [114, 21, 26, 10, 0.4]]
    };
    function draw() {
      let s = `<svg viewBox="0 0 372 260" role="img" aria-label="${day}日衛星雲圖示意：${day === 19 ? '臺灣上方被雲層籠罩' : '臺灣上方的雲變少了'}">
        <defs><filter id="sat-blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter></defs>
        <rect width="372" height="260" fill="#2F4B8F"/>${baseMap(P, '#2F4B8F', '#8DB86B')}`;
      for (const [lon, lat, rx, ry, op] of CL[day]) {
        const [x, y] = P([lon, lat]);
        s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${op}" filter="url(#sat-blur)" transform="rotate(-18 ${x} ${y})"/>`;
      }
      const [tx, ty] = P([121, 23.7]);
      s += `<text x="${tx + 20}" y="${ty + 44}" font-size="12" font-weight="700" fill="#FFEB3B" stroke="#1A237E" stroke-width="3" paint-order="stroke">臺灣</text>
        <text x="14" y="248" font-size="11" fill="#fff">依課本衛星雲圖自行繪製的示意圖</text></svg>`;
      el.querySelector('.stage').innerHTML = s;
      el.querySelector('.say').innerHTML = day === 19
        ? '4月19日：一條又白又濃的雲帶從華南延伸到日本，<b>臺灣上方被雲層籠罩</b>（南部屏東一帶雲層較少）。白色愈濃，雲層愈厚，愈容易下雨。'
        : '4月20日：雲帶往東南方的海上移動，<b>臺灣上方的雲變少了</b>。比較不同時間的衛星雲圖，就能看出雲層的變化。';
    }
    draw();
  }

  /* ---------------- 2-2 活動2、3 天氣符號與鋒面 ---------------- */
  function weatherSymbols(el) {
    let mode = 'iso', pos = 20;
    el.innerHTML = `<div class="controls md"></div><div class="stage" style="max-width:560px;margin:0 auto"></div>
      <div class="controls tm"><label>⏱️ 時間 <input type="range" min="0" max="100" value="20"></label></div><div class="say"></div>`;
    seg(el.querySelector('.md'), [['iso', '〰️ 等壓線'], ['H', 'H 高氣壓'], ['L', 'L 低氣壓'], ['cold', '▲ 冷鋒'], ['warm', '● 暖鋒'], ['stay', '▲● 滯留鋒']], mode, v => { mode = v; draw(); });
    const rng = el.querySelector('input');
    rng.oninput = () => { pos = +rng.value; draw(); };
    const BLUE = '#2a78d6', RED = '#E53950';
    function tri(x, y, dir, c) { return `<path d="M${x} ${y - 7} L${x + dir * 11} ${y} L${x} ${y + 7} Z" fill="${c}"/>`; }
    function semi(x, y, dir, c) { return `<path d="M${x} ${y - 7} A7 7 0 0 ${dir > 0 ? 1 : 0} ${x} ${y + 7} Z" fill="${c}"/>`; }
    function draw() {
      const front = ['cold', 'warm', 'stay'].includes(mode);
      el.querySelector('.tm').style.display = front ? '' : 'none';
      let s = `<svg viewBox="0 0 340 210" role="img" aria-label="天氣符號示意">`;
      let say = '';
      if (mode === 'iso' || mode === 'H' || mode === 'L') {
        const isH = mode !== 'L';
        s += `<rect width="340" height="210" fill="#F1F8E9"/>`;
        const vals = isH ? [1020, 1016, 1012, 1008] : [996, 1000, 1004, 1008];
        for (let i = 3; i >= 0; i--) {
          const cx = mode === 'iso' ? 150 - i * 18 : 170, rx = mode === 'iso' ? 36 + i * 38 : 30 + i * 36, ry = 22 + i * 21;
          s += `<ellipse cx="${cx}" cy="105" rx="${rx}" ry="${ry}" fill="none" stroke="#5D4037" stroke-width="${mode === 'iso' && i === 1 ? 3.5 : 2}"/>
            <text x="${cx}" y="${105 - ry - 3}" text-anchor="middle" font-size="11" fill="#5D4037" stroke="#F1F8E9" stroke-width="3" paint-order="stroke">${vals[i]}</text>`;
        }
        if (mode === 'iso') {
          s += `<circle cx="95" cy="142" r="5" fill="${RED}"/><circle cx="169" cy="68" r="5" fill="${RED}"/>
            <text x="80" y="160" font-size="11" fill="${RED}" font-weight="700" stroke="#F1F8E9" stroke-width="3" paint-order="stroke">1016</text><text x="176" y="72" font-size="11" fill="${RED}" font-weight="700" stroke="#F1F8E9" stroke-width="3" paint-order="stroke">1016</text>
            <text x="300" y="30" text-anchor="middle" font-size="12" font-weight="700" fill="${BLUE}">右側：線密集</text><text x="300" y="46" text-anchor="middle" font-size="12" fill="${BLUE}">風較強 💨💨</text>
            <text x="40" y="200" font-size="12" font-weight="700" fill="#43A047">左側：線稀疏 → 風較弱 🍃</text>
            <text x="150" y="110" text-anchor="middle" font-size="14" font-weight="800" fill="${BLUE}">H</text>`;
          say = '<b>等壓線</b>：同一條線所經過的地方，<mark>氣壓值都相同</mark>（紅點都在 1016 百帕的線上）。等壓線<b>密集</b>的區域，氣壓變化快，<b>風勢較強勁</b>。';
        } else {
          s += `<text x="170" y="114" text-anchor="middle" font-size="26" font-weight="800" fill="${isH ? BLUE : RED}">${isH ? 'H' : 'L'}</text>
            <text x="300" y="195" text-anchor="middle" font-size="26">${isH ? '☀️' : '🌧️'}</text>`;
          say = isH ? '<b>高氣壓中心（H）</b>：中心氣壓最高，<b>愈向外氣壓愈低</b>；幾乎沒有雲，多是<mark>晴天</mark>。'
            : '<b>低氣壓中心（L）</b>：中心氣壓最低，<b>愈向外氣壓愈高</b>；雲量較多，多是<mark>陰天或雨天</mark>。';
        }
      } else {
        // 鋒面：冷暖氣團示意
        const stay = mode === 'stay';
        const fx = stay ? 170 + Math.sin(pos / 8) * 10 : 50 + pos * 2.4;
        const leftC = mode === 'warm' ? '#FFCDD2' : '#BBDEFB', rightC = mode === 'warm' ? '#BBDEFB' : '#FFCDD2';
        s += `<rect width="${fx}" height="210" fill="${leftC}"/><rect x="${fx}" width="${340 - fx}" height="210" fill="${rightC}"/>
          <text x="${Math.max(40, fx / 2)}" y="24" text-anchor="middle" font-size="12" font-weight="700" fill="${mode === 'warm' ? RED : BLUE}">${mode === 'warm' ? '暖氣團' : '冷氣團'}</text>
          <text x="${Math.min(300, fx + (340 - fx) / 2)}" y="24" text-anchor="middle" font-size="12" font-weight="700" fill="${mode === 'warm' ? BLUE : RED}">${mode === 'warm' ? '冷氣團' : '暖氣團'}</text>
          <line x1="${fx}" y1="36" x2="${fx}" y2="196" stroke="${mode === 'cold' ? BLUE : mode === 'warm' ? RED : '#7E57C2'}" stroke-width="3"/>`;
        for (let i = 0; i < 6; i++) {
          const y = 50 + i * 27;
          if (mode === 'cold') s += tri(fx, y, 1, BLUE);
          else if (mode === 'warm') s += semi(fx, y, 1, RED);
          else s += i % 2 ? semi(fx, y, -1, RED) : tri(fx, y, 1, BLUE);
        }
        // 雲雨帶
        s += `<ellipse cx="${fx}" cy="70" rx="34" ry="14" fill="#fff" stroke="#90A4AE"/>` +
          [...Array(6)].map((_, i) => `<line x1="${fx - 22 + i * 9}" y1="88" x2="${fx - 26 + i * 9}" y2="100" stroke="#1E88E5" stroke-width="2"/>`).join('');
        // 觀測地點
        const star = stay ? 192 : 230, passed = fx > star, near = Math.abs(fx - star) < 30;
        let temp;
        if (mode === 'cold') temp = passed ? 22 : 27;
        else if (mode === 'warm') temp = passed ? 26 : 20;
        else temp = 24;
        const rain = near;
        s += `<text x="${star}" y="160" text-anchor="middle" font-size="20">📍</text>
          <rect x="${star - 44}" y="166" width="88" height="34" rx="10" fill="#fff" stroke="#BCAAA4"/>
          <text x="${star}" y="181" text-anchor="middle" font-size="11" fill="#5D4037">觀測地點</text>
          <text x="${star}" y="195" text-anchor="middle" font-size="12" font-weight="700" fill="${RED}">${temp}℃ ${rain ? '🌧️ 下雨' : passed || stay ? '☁️' : '🌤️'}</text>
          <text x="${stay ? 120 : fx - 8}" y="130" text-anchor="end" font-size="11" font-weight="700" fill="#5D4037">${stay ? '↔ 來回移動或停留' : '移動方向 ➡'}</text>`;
        say = mode === 'cold' ? '<b>冷鋒</b>：冷氣團勢力強，暖氣團退後。三角形尖端是<b>冷氣團移動的方向</b>。鋒面通過時<mark>陰雨、氣溫下降</mark>。臺灣冬季常受冷鋒影響。'
          : mode === 'warm' ? '<b>暖鋒</b>：暖氣團勢力強，冷氣團退後。半圓形凸起是<b>暖氣團移動的方向</b>。鋒面通過時<mark>陰雨、氣溫上升</mark>。臺灣的地理位置較不易出現暖鋒。'
            : '<b>滯留鋒</b>：冷氣團和暖氣團<b>勢力相當</b>，鋒面常來回移動或停留不動，帶來<mark>持續性降雨</mark>。臺灣春夏季節交替時（五、六月梅雨季）容易受影響。';
        say += ' <span class="hint">拖動「時間」看看觀測地點的天氣怎麼變。</span>';
      }
      s += '</svg>';
      el.querySelector('.stage').innerHTML = s;
      el.querySelector('.say').innerHTML = say;
    }
    draw();
  }

  /* ---------------- 2-2 鋒面通過前後的氣溫（課本 p.54） ---------------- */
  function frontTemp(el) {
    const DATA = [['臺北', 26.3, 23.0], ['臺中', 27.3, 22.4], ['高雄', 27.9, 26.8], ['宜蘭', 25.6, 23.2], ['臺東', 27.7, 27.1], ['澎湖', 25.5, 24.0]];
    const C1 = '#eb6834', C2 = '#2a78d6';
    el.innerHTML = `<div class="legend"><span><i style="background:${C1};height:10px"></i>4月19日 8:00（鋒面來之前）</span><span><i style="background:${C2};height:10px"></i>4月20日 8:00（鋒面通過後）</span></div>
      <div class="stage" style="max-width:560px;margin:0 auto"></div><div class="tbl-wrap"><table class="k-tbl"></table></div><div class="say"></div>`;
    const H = 200, base = 170, Y = v => base - (v - 20) * 17; // 縱軸從 20℃ 開始
    let s = `<svg viewBox="0 0 360 ${H}" role="img" aria-label="各地4月19日與4月20日早上8點氣溫比較長條圖">`;
    [20, 22, 24, 26, 28].forEach(v => { s += `<line x1="36" y1="${Y(v)}" x2="352" y2="${Y(v)}" stroke="#ECEFF1"/><text x="30" y="${Y(v) + 4}" text-anchor="end" font-size="10" fill="#78909C">${v}</text>`; });
    s += `<text x="8" y="14" font-size="10" fill="#78909C">℃</text>`;
    DATA.forEach(([n, a, b], i) => {
      const x = 46 + i * 51;
      s += `<rect x="${x}" y="${Y(a)}" width="20" height="${base - Y(a)}" rx="3" fill="${C1}"/><rect x="${x + 22}" y="${Y(b)}" width="20" height="${base - Y(b)}" rx="3" fill="${C2}"/>
        <text x="${x + 10}" y="${Y(a) - 3}" text-anchor="middle" font-size="9" fill="#5D4037">${a.toFixed(1)}</text><text x="${x + 32}" y="${Y(b) - 3}" text-anchor="middle" font-size="9" fill="#5D4037">${b.toFixed(1)}</text>
        <text x="${x + 21}" y="${base + 14}" text-anchor="middle" font-size="11" font-weight="700" fill="#5D4037">${n}</text>
        <text x="${x + 21}" y="${base + 27}" text-anchor="middle" font-size="10" fill="${C2}">↓${(a - b).toFixed(1)}</text>`;
    });
    s += `<line x1="36" y1="${base}" x2="352" y2="${base}" stroke="#90A4AE"/></svg>`;
    el.querySelector('.stage').innerHTML = s;
    el.querySelector('table').innerHTML = `<tr><th>地區</th>${DATA.map(d => `<th>${d[0]}</th>`).join('')}</tr>
      <tr><td>4/19 氣溫（℃）</td>${DATA.map(d => `<td>${d[1]}</td>`).join('')}</tr>
      <tr><td>4/20 氣溫（℃）</td>${DATA.map(d => `<td>${d[2].toFixed(1)}</td>`).join('')}</tr>
      <tr><td>下降（℃）</td>${DATA.map(d => `<td>${(d[1] - d[2]).toFixed(1)}</td>`).join('')}</tr>`;
    el.querySelector('.say').innerHTML = '鋒面通過後，<b>六個地區的氣溫都下降了</b>，其中臺中下降最多（4.9℃）。鋒面經過或停留的地區，常帶來雨量，氣溫、風力和氣壓也會改變。<span class="hint">（縱軸從 20℃ 開始）</span>';
  }

  /* ---------------- 2-3 颱風強度與小犬颱風路徑 ---------------- */
  function typhoon(el) {
    let mode = 'scale', v = 43, idx = 0;
    el.innerHTML = `<div class="controls md"></div><div class="stage" style="max-width:560px;margin:0 auto"></div><div class="controls rg"></div><div class="say"></div>`;
    seg(el.querySelector('.md'), [['scale', '🌀 颱風強度分級'], ['path', '🗺️ 小犬颱風路徑']], mode, m => { mode = m; setup(); });
    const CLS = [
      { n: '熱帶性低氣壓', c: '#e87ba4', min: 0 }, { n: '輕度颱風', c: '#2a78d6', min: 17.2 },
      { n: '中度颱風', c: '#1baf7a', min: 32.7 }, { n: '強烈颱風', c: '#eb6834', min: 51.0 }];
    const BF = [[10.8, 6], [13.9, 7], [17.2, 8], [20.8, 9], [24.5, 10], [28.5, 11], [32.7, 12], [37.0, 13], [41.5, 14], [46.2, 15], [51.0, 16], [56.1, 17]];
    const clsOf = w => CLS.filter(c => w >= c.min).pop();
    const bfOf = w => { const r = BF.filter(b => w >= b[0]).pop(); return r ? r[1] : '6 級以下'; };
    // 依課本路徑圖描繪（經度, 緯度, 日期, 強度 0～3）
    const PATH = [[135.0, 15.3, '09/30', 0], [134.2, 15.3, '09/30', 0], [133.2, 15.5, '09/30', 1], [131.9, 15.2, '09/30', 1], [131.3, 15.7, '10/01', 1], [130.4, 16.9, '10/01', 1],
      [129.7, 17.6, '10/01', 1], [128.8, 18.2, '10/01', 2], [128.0, 19.0, '10/02', 2], [126.9, 19.7, '10/02', 2], [125.9, 20.4, '10/03', 2], [125.4, 21.2, '10/03', 2],
      [124.8, 22.2, '10/04', 2], [123.8, 22.2, '10/04', 2], [122.7, 22.1, '10/04', 2], [121.6, 22.0, '10/05', 2], [120.85, 21.95, '10/05', 2], [119.6, 21.8, '10/05', 2],
      [118.5, 21.6, '10/06', 2], [117.5, 21.5, '10/06', 2], [116.6, 21.4, '10/07', 2], [115.8, 21.3, '10/07', 2], [114.9, 21.4, '10/08', 2], [114.1, 21.5, '10/08', 1],
      [113.3, 21.4, '10/09', 1], [112.7, 21.1, '10/09', 0]];
    const P = proj(110, 27.5, 14, 15);
    function setup() {
      const rg = el.querySelector('.rg');
      rg.innerHTML = mode === 'scale'
        ? `<label>💨 近中心最大風速 <input type="range" min="10" max="65" step="0.5" value="${v}"> <b class="val"></b> 公尺／秒</label>`
        : `<label>📅 日期 <input type="range" min="0" max="${PATH.length - 1}" value="${idx}"></label>`;
      const r = rg.querySelector('input');
      r.oninput = () => { if (mode === 'scale') v = +r.value; else idx = +r.value; draw(); };
      draw();
    }
    function draw() {
      let s, say;
      if (mode === 'scale') {
        const c = clsOf(v), X = w => 20 + (w - 10) * 5.6;
        s = `<svg viewBox="0 0 340 170" role="img" aria-label="風速 ${v} 公尺每秒：${c.n}">`;
        CLS.forEach((k, i) => {
          const x0 = X(Math.max(10, k.min)), x1 = i < 3 ? X(CLS[i + 1].min) : X(65);
          s += `<rect x="${x0}" y="70" width="${x1 - x0}" height="30" fill="${k.c}" opacity="${k === c ? 1 : 0.35}"/>
            <text x="${(x0 + x1) / 2}" y="118" text-anchor="middle" font-size="${i === 0 ? 11 : 13}" font-weight="700" fill="#5D4037">${i === 0 ? '熱帶性低氣壓' : k.n.replace('颱風', '')}</text>`;
          if (i) s += `<text x="${x0}" y="64" text-anchor="middle" font-size="12" font-weight="700" fill="#5D4037">${k.min}</text>`;
        });
        const mx = X(v);
        s += `<path d="M${mx} 124 l-7 12 h14 z" fill="#5D4037"/>
          <g transform="translate(${Math.min(290, Math.max(50, mx))} 32)"><circle r="18" fill="${c.c}" opacity="0.25"/><text y="7" text-anchor="middle" font-size="22">🌀</text></g>
          <text x="170" y="160" text-anchor="middle" font-size="15" font-weight="700" fill="${c.c === '#e87ba4' ? '#C2185B' : c.c}">${v} 公尺／秒 → ${c.n}（約 ${bfOf(v)}${typeof bfOf(v) === 'number' ? ' 級風' : ''}）</text></svg>`;
        el.querySelector('.val').textContent = v;
        say = '颱風的強度是由<b>風速</b>（近中心最大平均風速）決定，而<b>不是雨量</b>。輕度 17.2～32.6（8～11 級）、中度 32.7～50.9（12～15 級）、強烈 51.0 以上（16 級以上）；未達颱風標準的低氣壓稱為<mark>熱帶性低氣壓</mark>。';
      } else {
        s = `<svg viewBox="0 0 384 240" role="img" aria-label="小犬颱風路徑示意，目前 ${PATH[idx][2]}"><rect width="384" height="240" fill="#D6EEFB"/>${baseMap(P, '#D6EEFB', '#B9DC8C')}`;
        [15, 20, 25].forEach(la => { const y = P([110, la])[1]; s += `<line x1="0" y1="${y}" x2="384" y2="${y}" stroke="#90A4AE" stroke-dasharray="2 3"/><text x="4" y="${y - 2}" font-size="9" fill="#546E7A">${la}°N</text>`; });
        [115, 120, 125, 130, 135].forEach(lo => { const x = P([lo, 20])[0]; s += `<line x1="${x}" y1="0" x2="${x}" y2="240" stroke="#90A4AE" stroke-dasharray="2 3"/><text x="${x + 2}" y="236" font-size="9" fill="#546E7A">${lo}°E</text>`; });
        for (let i = 1; i <= idx; i++) {
          const [a, b] = [P(PATH[i - 1]), P(PATH[i])];
          s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${CLS[PATH[i][3]].c}" stroke-width="3"/>`;
        }
        PATH.slice(0, idx + 1).forEach(p => { const [x, y] = P(p); s += `<circle cx="${x}" cy="${y}" r="2.6" fill="${CLS[p[3]].c}"/>`; });
        const cur = PATH[idx], [cx, cy] = P(cur);
        s += `<g transform="translate(${cx} ${cy})"><circle r="15" fill="${CLS[cur[3]].c}" opacity="0.25"/><text y="7" text-anchor="middle" font-size="20">🌀</text></g>
          <rect x="${cx > 250 ? cx - 118 : cx + 16}" y="${cy - 40}" width="102" height="22" rx="8" fill="#fff" stroke="#BCAAA4"/>
          <text x="${cx > 250 ? cx - 67 : cx + 67}" y="${cy - 25}" text-anchor="middle" font-size="11" font-weight="700" fill="#5D4037">${cur[2]} ${CLS[cur[3]].n}</text>
          <text x="376" y="16" text-anchor="end" font-size="10" fill="#546E7A">依課本路徑圖描繪的示意圖</text></svg>`;
        say = `<b>${cur[2]}</b>：${idx === 0 ? '9月30日在<b>關島西方的熱帶海洋</b>上生成（熱帶性低氣壓）。'
          : idx < 8 ? '增強為輕度颱風，向<b>西北</b>方移動，朝臺灣東方海面接近。'
            : idx < 15 ? '增強為<b>中度颱風</b>（近中心最大風速 48 公尺／秒）。10月2日發布海上颱風警報、3日發布陸上颱風警報。'
              : idx < 18 ? '10月5日颱風中心<b>掠過屏東縣 鵝鑾鼻</b>，臺灣受到強風豪雨影響。'
                : idx < PATH.length - 1 ? '颱風持續向西移動，10月6日解除陸上與海上颱風警報。' : '颱風減弱，最後在華南外海減弱為熱帶性低氣壓。'}`;
      }
      el.querySelector('.stage').innerHTML = s;
      el.querySelector('.say').innerHTML = say;
    }
    setup();
  }

  /* ---------------- 科學閱讀：冷空氣強度分類 ---------------- */
  function coldAir(el) {
    let t = 10;
    el.innerHTML = `<div class="controls"><label>🌡️ 臺北氣象站最低溫 <input type="range" min="8" max="16" step="0.1" value="10"> <b class="val"></b>℃</label></div><div class="stage" style="max-width:560px;margin:0 auto"></div><div class="say"></div>`;
    const r = el.querySelector('input');
    r.oninput = () => { t = +r.value; draw(); };
    const CAT = [[10.4, '寒流', '#2a78d6'], [12.4, '強烈大陸冷氣團', '#1baf7a'], [14.4, '大陸冷氣團', '#eb6834'], [99, '東北季風', '#e87ba4']];
    function draw() {
      const X = v => 20 + (v - 8) * 37.5;
      const cat = CAT.find(c => t <= c[0]);
      let s = `<svg viewBox="0 0 340 124" role="img" aria-label="臺北站最低溫 ${t.toFixed(1)}℃：${cat[1]}">`;
      let lo = 8;
      CAT.forEach((c, i) => {
        const hi = Math.min(16, c[0]);
        s += `<rect x="${X(lo)}" y="40" width="${X(hi) - X(lo)}" height="28" fill="${c[2]}" opacity="${c === cat ? 1 : 0.3}"/>
          <text x="${(X(lo) + X(hi)) / 2}" y="${i % 2 ? 116 : 98}" text-anchor="middle" font-size="12" font-weight="700" fill="#5D4037">${c[1]}</text>`;
        if (c[0] < 99) s += `<text x="${X(hi)}" y="81" text-anchor="middle" font-size="11" fill="#5D4037">${hi}</text>`;
        lo = hi;
      });
      s += `<path d="M${X(t)} 38 l-7 -12 h14 z" fill="#5D4037"/>
        <text x="170" y="16" text-anchor="middle" font-size="13" font-weight="700" fill="#5D4037">${t.toFixed(1)}℃ → ${cat[1]}</text></svg>`;
      el.querySelector('.stage').innerHTML = s;
      el.querySelector('.val').textContent = t.toFixed(1);
      el.querySelector('.say').innerHTML = '臺灣以<b>臺北氣象站的最低溫度</b>作為認定標準：≦10.4℃ 為<mark>寒流</mark>；10.4～12.4℃ 為強烈大陸冷氣團；12.4～14.4℃ 為大陸冷氣團。<span class="hint">（「東北季風」是北方冷高壓帶給臺灣的冷空氣，範圍依課本圖示）</span>';
    }
    draw();
  }

  window.UnitWidgets = { waterForms, dewFrost, waterCycle, satellite, weatherSymbols, frontTemp, typhoon, coldAir };
})();
