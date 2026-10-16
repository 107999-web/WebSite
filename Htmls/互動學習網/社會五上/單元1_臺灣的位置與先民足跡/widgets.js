/* =========================================================
 * 社會五上・單元1 臺灣的位置與先民足跡｜互動元件
 * 地圖為依經緯度簡化繪製的示意圖，非依實際比例
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
  const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);

  /* 臺灣本島海岸線（經度, 緯度），簡化示意 */
  const TAIWAN = [[121.53, 25.30], [121.74, 25.15], [122.00, 25.01], [121.87, 24.75], [121.86, 24.59], [121.70, 24.30], [121.62, 23.98], [121.51, 23.48],
    [121.38, 23.10], [121.15, 22.75], [120.90, 22.35], [120.85, 21.90], [120.73, 21.93], [120.62, 22.30], [120.45, 22.46], [120.27, 22.62], [120.10, 23.00],
    [120.08, 23.15], [120.15, 23.38], [120.15, 23.65], [120.40, 24.05], [120.52, 24.25], [120.70, 24.55], [120.90, 24.82], [121.10, 25.05], [121.40, 25.18]];
  const CHINA = [[117.0, 23.3], [117.8, 23.55], [118.1, 24.05], [118.3, 24.4], [118.7, 24.55], [119.0, 25.0], [119.5, 25.3], [119.6, 25.75], [119.9, 26.1], [120.3, 26.4], [120.6, 26.9], [117.0, 26.9]];
  const poly = (pts, P) => pts.map(p => P(p).map(v => v.toFixed(1)).join(',')).join(' ');

  /* 區域地圖：經度 117.8～123.8、緯度 21.0～26.6 */
  const RP = ([lon, lat]) => [(lon - 117.8) * 100, (26.6 - lat) * 105];
  function regionBase(extra) {
    const [px, py] = RP([119.58, 23.57]);
    return `<svg viewBox="0 0 600 590" role="img" aria-label="臺灣及周邊地區示意圖">
      <rect width="600" height="590" rx="20" fill="#CFE8FA"/>
      <polygon points="${poly(CHINA, RP)}" fill="#F3E3C3" stroke="#C9A77A" stroke-width="2"/>
      <polygon points="${poly(TAIWAN, RP)}" fill="#A8D8A0" stroke="#5E9E62" stroke-width="2"/>
      <circle cx="${px}" cy="${py}" r="6" fill="#A8D8A0" stroke="#5E9E62"/><circle cx="${px + 9}" cy="${py + 7}" r="4" fill="#A8D8A0" stroke="#5E9E62"/>
      ${extra || ''}
      <text x="570" y="580" font-size="11" fill="#78909C" text-anchor="end">示意圖，非依實際比例</text>
    </svg>`;
  }

  /* ---------------- 第1課：找一找（位置探索） ---------------- */
  function locator(el) {
    const T = [
      { k: '臺灣海峽', ll: [119.55, 24.35], info: '臺灣和中國之間的海峽。' },
      { k: '巴士海峽', ll: [121.1, 21.45], info: '臺灣南方，和菲律賓相隔的海峽。' },
      { k: '太平洋', ll: [122.9, 23.2], info: '臺灣位在太平洋的西側，是最大的海洋。' },
      { k: '東海', ll: [122.3, 26.1], info: '臺灣北方的海。' },
      { k: '南海', ll: [118.7, 22.2], info: '臺灣西南方的海，南海諸島也在這裡。' },
      { k: '中國', ll: [118.3, 25.9], info: '位在亞洲大陸，和臺灣隔著臺灣海峽，距離很近。' },
      { k: '菲律賓（往南）', ll: [121.6, 21.15], info: '在臺灣南方，和臺灣隔著巴士海峽。' },
      { k: '日本（琉球群島）', ll: [123.2, 24.15], info: '在臺灣東北方。' },
      { k: '澎湖群島', ll: [119.58, 23.57], info: '臺灣海峽中的群島，有箱網養殖漁業。' },
      { k: '金門群島', ll: [118.35, 24.44], info: '靠近中國福建沿岸。' },
      { k: '馬祖列島', ll: [119.95, 26.16], info: '臺灣西北方、靠近中國福建沿岸。' },
      { k: '釣魚臺列嶼', ll: [123.48, 25.75], info: '臺灣東北方的島嶼。' },
      { k: '龜山島', ll: [121.95, 24.84], info: '宜蘭外海的島，附近可以賞鯨豚。' },
      { k: '綠島', ll: [121.49, 22.66], info: '臺東外海的島，可以進行國際級潛水。' },
      { k: '蘭嶼', ll: [121.55, 22.04], info: '臺東外海的島，是雅美族（達悟族）的家園。' },
      { k: '琉球嶼', ll: [120.37, 22.34], info: '屏東外海的島（小琉球）。', below: true },
      { k: '高雄港', ll: [120.27, 22.62], info: '重要的航運樞紐，可以從這裡搭船航向東南亞。' }
    ];
    let mode = 'explore', target = null, score = 0, tries = 0, picked = null, queue = [];
    el.innerHTML = `<div class="controls"></div><div class="stage"></div><div class="say"></div>`;
    seg(el.querySelector('.controls'), [['explore', '🔎 探索'], ['game', '🎯 找找看挑戰']], mode, v => {
      mode = v; picked = null; score = 0; tries = 0; queue = shuffle(T.map(t => t.k)); target = mode === 'game' ? queue.pop() : null; draw();
    });
    function draw() {
      let marks = '';
      T.forEach(t => {
        const [x, y] = RP(t.ll);
        const sea = /海|洋|峽/.test(t.k) && !/群島|列島|列嶼/.test(t.k);
        const show = mode === 'explore' || (picked === t.k);
        const hit = picked === t.k;
        marks += `<g data-k="${t.k}" style="cursor:pointer">
          <circle cx="${x}" cy="${y}" r="${sea ? 22 : 13}" fill="${hit ? '#FFE08A' : '#fff'}" opacity="${sea ? 0.55 : 0.85}" stroke="${hit ? '#F4A300' : '#E86A8D'}" stroke-width="2"/>
          <circle cx="${x}" cy="${y}" r="3.5" fill="#E86A8D"/>
          ${show ? `<text x="${x}" y="${t.below ? y + 28 : y - (sea ? 26 : 17)}" text-anchor="middle" font-size="14" font-weight="700" fill="#5D4037" stroke="#fff" stroke-width="3" paint-order="stroke">${t.k}</text>` : ''}
        </g>`;
      });
      el.querySelector('.stage').innerHTML = regionBase(marks);
      el.querySelectorAll('[data-k]').forEach(g => g.addEventListener('click', () => pick(g.dataset.k)));
      const say = el.querySelector('.say');
      if (mode === 'explore') {
        const t = T.find(x => x.k === picked);
        say.innerHTML = t ? `<b>${t.k}</b>：${t.info}` : '點地圖上的圓圈，認識臺灣四周的海洋、鄰國和島嶼。臺灣位在<b>亞洲大陸的東側、太平洋的西側</b>。';
      } else {
        say.innerHTML = target ? `🎯 請找出：<b style="font-size:1.2em">${target}</b>　（答對 ${score} / ${tries}）` : `🎉 全部找完了！答對 ${score} / ${tries} 次。按「找找看挑戰」可以再玩一次。`;
      }
    }
    function pick(k) {
      if (mode === 'explore') { picked = k; draw(); return; }
      if (!target) return;
      tries++;
      const say = el.querySelector('.say');
      if (k === target) {
        score++; picked = k; target = queue.pop() || null; draw();
        if (target) say.innerHTML = `✅ 答對了！下一個：<b style="font-size:1.2em">${target}</b>　（答對 ${score} / ${tries}）`;
      } else {
        picked = k; draw();
        say.innerHTML = `❌ 那是「${k}」，再找找看：<b style="font-size:1.2em">${target}</b>　（答對 ${score} / ${tries}）`;
      }
    }
    draw();
  }

  /* ---------------- 第1課：季風、洋流與生物遷徙（月份） ---------------- */
  function seasonsMap(el) {
    let m = 1;
    el.innerHTML = `<div class="controls"><label>📅 月份 <input type="range" min="1" max="12" value="1" aria-label="月份"></label><b class="mo">1 月</b></div>
      <div class="stage"></div><div class="readout"></div><div class="say"></div>`;
    const r = el.querySelector('input');
    r.oninput = () => { m = Number(r.value); draw(); };
    const arrow = (pts, color, w, dash) => {
      const d = 'M' + pts.map(p => RP(p).map(v => v.toFixed(1)).join(' ')).join(' L');
      return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${dash ? `stroke-dasharray="${dash}"` : ''} marker-end="url(#ah-${color.slice(1)})"/>`;
    };
    const marker = c => `<marker id="ah-${c.slice(1)}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`;
    function draw() {
      el.querySelector('.mo').textContent = m + ' 月';
      const NE = m >= 10 || m <= 4, SW = m >= 6 && m <= 9, winter = m >= 11 || m <= 2;
      const tuna = m >= 4 && m <= 6, mullet = m >= 11 || m === 1, bird = m >= 9 || m <= 5;
      const birdIn = m === 9 || m === 10, birdOut = m >= 3 && m <= 5;
      const WARM = '#E8743B', COLD = '#2A78D6', WIND = '#7E57C2';
      let s = `<defs>${marker(WARM)}${marker(COLD)}${marker(WIND)}</defs>`;
      // 暖流：全年沿臺灣東側北上
      s += arrow([[121.9, 21.3], [122.2, 22.6], [122.3, 23.8], [122.6, 25.2]], WARM, 7);
      s += `<text x="${RP([122.35, 22.2])[0]}" y="${RP([122.35, 22.2])[1]}" font-size="13" fill="${WARM}" font-weight="800">暖流</text>`;
      if (!winter) s += arrow([[120.2, 21.6], [119.9, 22.6], [119.9, 23.6], [120.4, 24.9]], WARM, 5, '10 6');
      if (winter) {
        s += arrow([[120.6, 26.5], [119.8, 25.6], [119.3, 24.6], [119.45, 23.8]], COLD, 7);
        s += `<text x="${RP([118.95, 25.1])[0]}" y="${RP([118.95, 25.1])[1]}" font-size="13" fill="${COLD}" font-weight="800">寒流</text>`;
        s += arrow([[119.7, 22.2], [119.6, 23.0], [119.55, 23.35]], WARM, 5, '10 6');
      }
      if (NE) s += arrow([[123.3, 26.5], [122.5, 25.7], [121.7, 24.9]], WIND, 9, '2 10') + `<text x="${RP([122.7, 26.35])[0]}" y="${RP([122.7, 26.35])[1]}" font-size="14" fill="${WIND}" font-weight="800">東北季風</text>`;
      if (SW) s += arrow([[118.3, 21.4], [119.2, 22.2], [120.0, 22.9]], WIND, 9, '2 10') + `<text x="${RP([117.95, 21.25])[0]}" y="${RP([117.95, 21.25])[1]}" font-size="14" fill="${WIND}" font-weight="800">西南季風</text>`;
      const icon = (ll, t, label) => { const [x, y] = RP(ll); return `<text x="${x}" y="${y}" font-size="26" text-anchor="middle">${t}</text><text x="${x}" y="${y + 16}" font-size="12" text-anchor="middle" fill="#5D4037" font-weight="700" stroke="#fff" stroke-width="3" paint-order="stroke">${label}</text>`; };
      if (tuna) s += icon([122.0, 22.35], '🐟', '黑鮪魚');
      if (mullet) s += icon([119.75, 22.45], '🐠', '烏魚');
      if (bird) s += icon([119.75, 23.05], '🦢', '黑面琵鷺（七股）');
      if (birdIn) s += arrow([[119.9, 26.3], [119.7, 24.8], [119.8, 23.6]], '#8D6E63', 3, '6 5');
      if (birdOut) s += arrow([[119.8, 23.6], [119.7, 24.8], [119.9, 26.3]], '#8D6E63', 3, '6 5');
      el.querySelector('.stage').innerHTML = regionBase(s);
      el.querySelector('.readout').innerHTML = `
        <span>🌬️ 季風：<b>${NE ? '東北季風' : SW ? '西南季風' : '季風轉換期'}</b></span>
        <span>🌊 洋流：<b>${winter ? '寒流南下，與暖流交會' : '暖流'}</b></span>
        <span>🐟 魚群：<b>${[tuna && '黑鮪魚', mullet && '烏魚'].filter(Boolean).join('、') || '—'}</b></span>
        <span>🦢 黑面琵鷺：<b>${birdIn ? '南飛來臺' : birdOut ? '陸續北返' : bird ? '在臺灣度冬' : '在北方'}</b></span>`;
      const tips = [];
      if (NE) tips.push('東北季風（10 月初～隔年 4 月中）寒冷，經過海洋帶來水氣，讓北部、東北部<b>溼冷、容易下雨</b>。');
      if (SW) tips.push('西南季風（6 月中～9 月中）帶來溫暖潮溼的氣流，使全臺<b>溼熱多雨</b>。');
      if (mullet) tips.push('冬季烏魚隨南下的<b>寒流</b>游到臺灣西南沿海產卵，烏魚卵可以製成烏魚子。');
      if (tuna) tips.push('春、夏季黑鮪魚隨北上的<b>暖流</b>游經臺灣東部，屏東有黑鮪魚文化觀光季。');
      if (birdIn) tips.push('天氣轉冷時，黑面琵鷺由北往南飛，到臺南 七股度冬。');
      if (birdOut) tips.push('3～5 月，黑面琵鷺陸續飛回北方。');
      el.querySelector('.say').innerHTML = tips.join('<br>') || '5 月是季風轉換的時期。拖動月份看看不同季節的變化！';
    }
    draw();
  }

  /* ---------------- 第2課：史前時代文化層 ---------------- */
  function prehistory(el) {
    const E = [
      { k: 'metal', name: '金屬器時代', time: '距今約 2,500 年前起', site: '十三行遺址（新北 八里）', ll: [121.40, 25.16], color: '#B0BEC5',
        tool: '煉製鐵器：鐵製鋤頭種田、鐮刀採收', life: '漁獵、農業；由海外傳入煉鐵技術，提高作物產量', find: '煉鐵作坊、來自東南亞的琉璃珠', icon: '⚒️' },
      { k: 'neo', name: '新石器時代', time: '距今約 7,000 年前起', site: '卑南遺址（臺東）', ll: [121.12, 22.79], color: '#C8A27A',
        tool: '磨製石器：石刀割農作物、石板組成石棺；用陶土做陶器', life: '採集、漁獵、農業（芋頭、稻米）；飼養家畜，人口成長形成聚落', find: '大量石刀、二千多具石板棺、有把手的陶罐、玉器', icon: '🏺' },
      { k: 'old', name: '舊石器時代', time: '距今約 5 萬年前起', site: '長濱遺址（臺東 長濱 八仙洞）', ll: [121.42, 23.40], color: '#8D6E63',
        tool: '打製石器：敲擊石頭，用銳利邊緣切割物品', life: '住在海濱洞穴，捕捉海中生物、採集植物、狩獵；已會用火', find: '打製石器', icon: '🪨' }
    ];
    let cur = null;
    el.innerHTML = `<div class="split"><div class="strata"></div><div class="mapbox"></div></div><div class="info"></div>`;
    const TP = ([lon, lat]) => [(lon - 119.9) * 120, (25.4 - lat) * 128];
    function draw() {
      const layers = E.map((e, i) => {
        const y = 60 + i * 80, on = cur === e.k;
        return `<g data-k="${e.k}" style="cursor:pointer">
          <path d="M10 ${y} Q80 ${y - 8} 150 ${y} T290 ${y} L290 ${y + 80} Q220 ${y + 72} 150 ${y + 80} T10 ${y + 80} Z" fill="${e.color}" opacity="${on ? 1 : 0.8}" stroke="${on ? '#E86A8D' : '#fff'}" stroke-width="${on ? 4 : 2}"/>
          <text x="30" y="${y + 45}" font-size="17" font-weight="800" fill="#fff" stroke="#5D4037" stroke-width="3" paint-order="stroke">${e.icon} ${e.name}</text>
        </g>`;
      }).join('');
      el.querySelector('.strata').innerHTML = `<svg viewBox="0 0 300 310" role="img" aria-label="文化層示意圖">
        <rect x="10" y="30" width="280" height="30" rx="6" fill="#A5D6A7"/><text x="150" y="51" text-anchor="middle" font-size="14" fill="#2E7D32" font-weight="700">今日地表</text>
        ${layers}
        <text x="150" y="20" text-anchor="middle" font-size="13" fill="#8D6E63">愈下面的地層，年代愈久遠 ⬇</text>
      </svg><p class="hint" style="text-align:center">點選地層看看每個時代</p>`;
      const TW = poly(TAIWAN, TP);
      const dots = E.map(e => { const [x, y] = TP(e.ll); const on = cur === e.k; return `<circle cx="${x}" cy="${y}" r="${on ? 9 : 6}" fill="${on ? '#E86A8D' : '#8D6E63'}" stroke="#fff" stroke-width="2"/><text x="${x - 10}" y="${y + 4}" text-anchor="end" font-size="13" font-weight="700" fill="#5D4037" stroke="#fff" stroke-width="3" paint-order="stroke">${e.site.split('（')[0]}</text>`; }).join('');
      el.querySelector('.mapbox').innerHTML = `<svg viewBox="0 0 270 480" style="max-width:260px;display:block;margin:0 auto" role="img" aria-label="史前遺址位置圖">
        <rect width="270" height="480" rx="16" fill="#CFE8FA"/><polygon points="${TW}" fill="#A8D8A0" stroke="#5E9E62" stroke-width="2"/>${dots}</svg>`;
      el.querySelectorAll('[data-k]').forEach(g => g.addEventListener('click', () => { cur = g.dataset.k; draw(); }));
      const e = E.find(x => x.k === cur);
      el.querySelector('.info').innerHTML = e ? `<div class="mini cream"><h4>${e.icon} ${e.name}｜${e.time}</h4>
          <ul class="dots"><li><b>代表遺址</b>：${e.site}</li><li><b>器物</b>：${e.tool}</li><li><b>生活方式</b>：${e.life}</li><li><b>出土</b>：${e.find}</li></ul></div>`
        : '<div class="say">考古學家挖掘時，地層會一層一層堆疊。點選左邊的地層，認識三個時代和代表遺址。</div>';
    }
    draw();
  }

  /* ---------------- 第3課：臺灣原住民族分布示意圖 ---------------- */
  function tribesMap(el) {
    const R = [
      ['賽夏族', 121.0, 24.62, '新竹、苗栗一帶'], ['泰雅族', 121.33, 24.62, '北部山區（桃園、新竹、宜蘭等）'], ['賽德克族', 121.18, 24.05, '南投、花蓮一帶'],
      ['太魯閣族', 121.5, 24.2, '花蓮北部'], ['撒奇萊雅族', 121.6, 23.95, '花蓮'], ['噶瑪蘭族', 121.47, 23.62, '花蓮沿海'],
      ['阿美族', 121.3, 23.3, '花蓮、臺東的平原與海岸'], ['布農族', 121.0, 23.45, '中央山脈（南投、花蓮、臺東、高雄）'], ['邵族', 120.92, 23.86, '南投 日月潭'],
      ['鄒族', 120.75, 23.47, '嘉義 阿里山一帶'], ['卡那卡那富族', 120.68, 23.2, '高雄'], ['拉阿魯哇族', 120.82, 23.12, '高雄'],
      ['魯凱族', 120.73, 22.82, '屏東、高雄、臺東'], ['卑南族', 121.05, 22.78, '臺東'], ['排灣族', 120.72, 22.5, '屏東、臺東南部'], ['雅美族（達悟族）', 121.55, 22.04, '臺東 蘭嶼']
    ];
    const TP = ([lon, lat]) => [(lon - 119.9) * 170, (25.4 - lat) * 180];
    let mode = 'explore', pick = null, target = null, queue = [], score = 0, tries = 0;
    el.innerHTML = `<div class="controls"></div><div class="split" style="align-items:start"><div class="stage"></div><div class="side"></div></div>`;
    seg(el.querySelector('.controls'), [['explore', '🔎 認識 16 族'], ['game', '🎯 找找看挑戰']], mode, v => {
      mode = v; pick = null; score = 0; tries = 0; queue = shuffle(R.map(x => x[0])); target = v === 'game' ? queue.pop() : null; draw();
    });
    function draw() {
      const dots = R.map((t, i) => {
        const [x, y] = TP([t[1], t[2]]); const on = pick === t[0];
        return `<g data-k="${t[0]}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="15" fill="${on ? '#FFE08A' : '#fff'}" stroke="${on ? '#F4A300' : '#E86A8D'}" stroke-width="3"/>
          <text x="${x}" y="${y + 5}" text-anchor="middle" font-size="13" font-weight="800" fill="#5D4037">${i + 1}</text></g>`;
      }).join('');
      el.querySelector('.stage').innerHTML = `<svg viewBox="0 0 380 660" style="max-width:360px;display:block;margin:0 auto" role="img" aria-label="臺灣原住民族分布示意圖">
        <rect width="380" height="660" rx="18" fill="#CFE8FA"/><polygon points="${poly(TAIWAN, TP)}" fill="#A8D8A0" stroke="#5E9E62" stroke-width="2"/>
        ${(() => { const [x, y] = TP([121.55, 22.04]); return `<ellipse cx="${x}" cy="${y + 2}" rx="8" ry="5" fill="#A8D8A0" stroke="#5E9E62"/>`; })()}
        ${dots}<text x="370" y="650" font-size="11" fill="#78909C" text-anchor="end">分布僅為示意</text></svg>`;
      el.querySelectorAll('[data-k]').forEach(g => g.addEventListener('click', () => choose(g.dataset.k)));
      const side = el.querySelector('.side');
      const t = R.find(x => x[0] === pick);
      const list = `<ol style="columns:2;font-size:.9rem;padding-left:1.6em">${R.map(x => `<li${x[0] === pick ? ' style="font-weight:800;color:#E86A8D"' : ''}>${x[0]}</li>`).join('')}</ol>`;
      if (mode === 'explore') {
        side.innerHTML = (t ? `<div class="mini cream"><h4>📍 ${t[0]}</h4>主要分布：${t[3]}</div>` : '<div class="say">經政府認定的原住民族有<b>十六個族群</b>。點地圖上的數字，看看各族分布在哪裡。</div>') + list;
      } else {
        side.innerHTML = `<div class="say">${target ? `🎯 請在地圖上找出：<b style="font-size:1.2em">${target}</b>` : '🎉 全部找完了！'}<br>答對 ${score} / ${tries}</div>${list}`;
      }
    }
    function choose(k) {
      if (mode === 'explore') { pick = k; draw(); return; }
      if (!target) return;
      tries++;
      const ok = k === target;
      pick = k;
      if (ok) { score++; target = queue.pop() || null; }
      draw();
      el.querySelector('.side .say').insertAdjacentHTML('afterbegin', ok ? '✅ 答對了！<br>' : `❌ 那是 ${k}，再找找看。<br>`);
    }
    draw();
  }

  window.UnitWidgets = { locator, seasonsMap, prehistory, tribesMap };
})();
