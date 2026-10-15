/* =========================================================
 * 社會六上・單元2 戰後經濟轉型與生活轉變｜互動元件
 * 地圖為簡化繪製的示意圖，非依實際比例
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

  /* 臺灣本島海岸線（經度, 緯度），簡化示意 */
  const TAIWAN = [[121.53, 25.30], [121.74, 25.15], [122.00, 25.01], [121.87, 24.75], [121.86, 24.59], [121.70, 24.30], [121.62, 23.98], [121.51, 23.48],
    [121.38, 23.10], [121.15, 22.75], [120.90, 22.35], [120.85, 21.90], [120.73, 21.93], [120.62, 22.30], [120.45, 22.46], [120.27, 22.62], [120.10, 23.00],
    [120.08, 23.15], [120.15, 23.38], [120.15, 23.65], [120.40, 24.05], [120.52, 24.25], [120.70, 24.55], [120.90, 24.82], [121.10, 25.05], [121.40, 25.18]];
  const TP = ([lon, lat]) => [(lon - 119.75) * 135 + 10, (25.45 - lat) * 150 + 10];
  const TW = TAIWAN.map(p => TP(p).map(v => v.toFixed(1)).join(',')).join(' ');
  const path = pts => 'M' + pts.map(p => TP(p).map(v => v.toFixed(1)).join(' ')).join(' L');
  const base = inner => `<svg viewBox="0 0 330 570" style="max-width:320px;display:block;margin:0 auto" role="img" aria-label="臺灣示意圖">
    <rect width="330" height="570" rx="16" fill="#CFE8FA"/><polygon points="${TW}" fill="#E8F5E9" stroke="#5E9E62" stroke-width="2"/>${inner}
    <text x="320" y="562" text-anchor="end" font-size="10" fill="#78909C">示意圖</text></svg>`;

  /* ---------------- 年表：臺灣的建設與發展 ---------------- */
  function econTimeline(el) {
    const D = [
      { d: '民國 30 年代', bg: '民國 34 年二次大戰結束，中華民國接收臺灣、澎湖；物價飛漲、糧食不足', build: '土地改革：民國 38 年「三七五減租」、接著「耕者有其田」', traffic: '—', goal: '改善人民生活、穩定社會', stage: '🌾 農業' },
      { d: '民國 40 年代', bg: '民生物資短缺', build: '美國援助（麵粉、奶粉、貸款與技術）；推動紡織、塑膠、食品等民生工業', traffic: '西螺大橋（美援支助完工）', goal: '度過難關、滿足日常用品需求', stage: '🌾 農業 → 🏭 工業' },
      { d: '民國 50 年代', bg: '加工出口區設立，吸引外國公司來臺開工廠', build: '在高雄設立第一個「加工出口區」', traffic: '高雄港擴建', goal: '吸引外國公司設廠、產品外銷（Made in Taiwan）', stage: '🏭 工業' },
      { d: '民國 60 年代', bg: '十大建設時期：用電需求上升、道路運量受限、工業原料不足；國際能源危機', build: '十大建設（交通運輸、重工業、能源）', traffic: '中山高速公路（民國 67 年通車）', goal: '提升國家競爭力', stage: '🏭 重工業' },
      { d: '民國 70 年代', bg: '新竹科學園區設立：勞動力不再低廉、環保意識抬頭', build: '民國 69 年成立新竹科學園區', traffic: '公路擴展', goal: '發展高科技產業', stage: '💻 高科技' },
      { d: '民國 80 年代', bg: '都市化加速，人口集中都市', build: '—', traffic: '臺北捷運', goal: '紓解都市交通', stage: '💻 高科技' },
      { d: '民國 90 年代', bg: '一日生活圈形成，南北往來頻繁', build: '—', traffic: '臺灣高鐵', goal: '縮短南北交通時間', stage: '💻 高科技' }
    ];
    let i = 0;
    el.innerHTML = `<div class="controls"><label>📅 年代 <input type="range" min="0" max="${D.length - 1}" value="0" aria-label="年代"></label><b class="dd"></b></div><div class="stage"></div>`;
    const r = el.querySelector('input');
    r.oninput = () => { i = Number(r.value); draw(); };
    function draw() {
      const x = D[i];
      el.querySelector('.dd').textContent = x.d;
      const dots = D.map((y, j) => `<span style="display:inline-block;width:${100 / D.length}%;text-align:center;font-size:.78rem;${j === i ? 'font-weight:800;color:#E86A8D' : 'color:#A1887F'}">${j <= i ? '●' : '○'}<br>${y.d.replace('民國 ', '')}</span>`).join('');
      el.querySelector('.stage').innerHTML = `<div style="display:flex;margin:4px 0 10px">${dots}</div>
        <div class="split">
          <div class="mini cream"><h4>📰 時代背景</h4>${x.bg}</div>
          <div class="mini"><h4>🏗️ 建設與政策</h4>${x.build}</div>
          <div class="mini sky"><h4>🚆 交通運輸</h4>${x.traffic}</div>
          <div class="mini mint"><h4>🎯 主要目的</h4>${x.goal}<br><span class="tag" style="margin-top:4px">${x.stage}</span></div>
        </div>`;
    }
    draw();
  }

  /* ---------------- 第2課：十大建設地圖 ---------------- */
  function tenProjects(el) {
    const CAT = { traffic: ['交通運輸建設', '#2a78d6'], heavy: ['重工業建設', '#eb6834'], energy: ['能源建設', '#1baf7a'] };
    const P = [
      { k: '中山高速公路', c: 'traffic', line: [[121.74, 25.13], [121.45, 25.05], [121.2, 24.95], [120.95, 24.75], [120.7, 24.3], [120.55, 24.0], [120.4, 23.6], [120.3, 23.2], [120.3, 22.65]], txt: '民國 67 年通車，從基隆直達高雄，大幅縮短運輸時間（今國道 1 號）。' },
      { k: '鐵路電氣化', c: 'traffic', line: [[121.7, 25.13], [121.35, 25.0], [121.05, 24.85], [120.8, 24.5], [120.6, 24.1], [120.45, 23.7], [120.35, 23.3], [120.25, 22.75]], dash: true, txt: '把西部幹線鐵路改為電力行駛，提升運輸量與速度。' },
      { k: '北迴鐵路', c: 'traffic', line: [[121.86, 24.6], [121.75, 24.3], [121.62, 23.98]], txt: '串聯東、西部鐵路，改善東部「交通孤島」的情況，推動區域均衡發展。' },
      { k: '桃園國際機場', c: 'traffic', pt: [121.23, 25.08], txt: '臺灣主要的國際機場（當時稱中正國際機場）。' },
      { k: '臺中港', c: 'traffic', pt: [120.5, 24.28], txt: '中部的國際港口，分擔貨物運輸。' },
      { k: '蘇澳港', c: 'traffic', pt: [121.86, 24.6], txt: '宜蘭的港口，分擔基隆港的運輸量。', dx: 12 },
      { k: '大煉鋼廠', c: 'heavy', pt: [120.36, 22.55], txt: '在高雄生產鋼鐵，提供建設工廠、製造機械所需材料。' },
      { k: '造船廠', c: 'heavy', pt: [120.28, 22.58], txt: '在高雄建造大型船隻，支援進出口貿易。', dx: -12 },
      { k: '石油化學工業', c: 'heavy', pt: [120.33, 22.72], txt: '在高雄處理工業生產所需的石油原料。' },
      { k: '核能發電廠', c: 'energy', pt: [121.6, 25.22], txt: '增加電力供應，因應用電需求上升。' }
    ];
    let filter = 'all', pick = null;
    el.innerHTML = `<div class="controls"></div><div class="split" style="align-items:start"><div class="stage"></div><div class="side"></div></div>`;
    seg(el.querySelector('.controls'), [['all', '全部'], ['traffic', '🚆 交通運輸'], ['heavy', '🏭 重工業'], ['energy', '⚡ 能源']], filter, v => { filter = v; pick = null; draw(); });
    function draw() {
      const list = P.filter(p => filter === 'all' || p.c === filter);
      let s = '';
      list.forEach(p => {
        const col = CAT[p.c][1], on = pick === p.k;
        if (p.line) s += `<path d="${path(p.line)}" fill="none" stroke="${col}" stroke-width="${on ? 8 : 5}" ${p.dash ? 'stroke-dasharray="8 5"' : ''} stroke-linecap="round" data-k="${p.k}" style="cursor:pointer" opacity=".85"/>`;
        else { const [x, y] = TP(p.pt); s += `<circle cx="${x + (p.dx || 0)}" cy="${y}" r="${on ? 11 : 8}" fill="${col}" stroke="${on ? '#5D4037' : '#fff'}" stroke-width="3" data-k="${p.k}" style="cursor:pointer"/>`; }
      });
      el.querySelector('.stage').innerHTML = base(s);
      el.querySelectorAll('[data-k]').forEach(g => g.addEventListener('click', () => { pick = g.getAttribute('data-k'); draw(); }));
      const p = P.find(x => x.k === pick);
      el.querySelector('.side').innerHTML = (p ? `<div class="mini cream"><h4><span style="color:${CAT[p.c][1]}">●</span> ${p.k}</h4><p><b>${CAT[p.c][0]}</b>｜${p.txt}</p></div>` : '<div class="say">民國 60 年代的「十大建設」包含交通運輸、重工業、能源三類。點地圖上的線或圓點看看！</div>') +
        `<div class="legend" style="justify-content:flex-start">${Object.values(CAT).map(c => `<span><i style="background:${c[1]}"></i>${c[0]}</span>`).join('')}</div>
        <ul class="dots">${list.map(x => `<li data-li="${x.k}" style="cursor:pointer${x.k === pick ? ';font-weight:800' : ''}"><span style="color:${CAT[x.c][1]}">●</span> ${x.k}</li>`).join('')}</ul>`;
      el.querySelectorAll('[data-li]').forEach(li => li.addEventListener('click', () => { pick = li.dataset.li; draw(); }));
    }
    draw();
  }

  /* ---------------- 第3課：科學園區與交通 ---------------- */
  function parkMap(el) {
    const PARK = [['新竹科學園區', [120.99, 24.78], '民國 69 年設立的第一座科學園區；鄰近工研院、清華大學、陽明交通大學，提供研究場所與人才。'],
      ['中部科學園區', [120.62, 24.21], '設在臺中，吸引高科技廠商進駐、帶動就業，也帶來用水用電、農地徵收、房價上升等挑戰。'],
      ['南部科學園區', [120.28, 23.1], '設在臺南，帶動南部高科技產業發展。']];
    const HUB = [['基隆港', [121.74, 25.14]], ['臺北松山機場', [121.55, 25.06]], ['桃園國際機場', [121.23, 25.08]], ['臺中國際機場', [120.62, 24.26]], ['西螺大橋', [120.46, 23.8]], ['高雄港', [120.28, 22.6]], ['高雄國際機場', [120.35, 22.57]]];
    let pick = null;
    el.innerHTML = '<div class="split" style="align-items:start"><div class="stage"></div><div class="side"></div></div>';
    function draw() {
      let s = `<path d="${path([[121.7, 25.13], [121.35, 25.0], [121.05, 24.85], [120.8, 24.5], [120.6, 24.1], [120.45, 23.7], [120.35, 23.3], [120.25, 22.75]])}" fill="none" stroke="#8D6E63" stroke-width="3" stroke-dasharray="6 4"/>
        <path d="${path([[121.52, 25.05], [121.22, 25.01], [121.0, 24.8], [120.68, 24.11], [120.45, 23.45], [120.3, 23.0], [120.31, 22.69]])}" fill="none" stroke="#E86A8D" stroke-width="3"/>`;
      HUB.forEach(([k, ll]) => { const [x, y] = TP(ll); s += `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" rx="2" fill="#5B9BD5" stroke="#fff" stroke-width="2"><title>${k}</title></rect>`; });
      PARK.forEach(([k, ll]) => { const [x, y] = TP(ll); const on = pick === k; s += `<g data-k="${k}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="${on ? 16 : 13}" fill="#FFB74D" stroke="${on ? '#5D4037' : '#fff'}" stroke-width="3"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="13">🔬</text>
        <text x="${x + 18}" y="${y + 5}" font-size="13" font-weight="800" fill="#5D4037" stroke="#fff" stroke-width="3" paint-order="stroke">${k.slice(0, 2)}</text></g>`; });
      el.querySelector('.stage').innerHTML = base(s);
      el.querySelectorAll('[data-k]').forEach(g => g.addEventListener('click', () => { pick = g.dataset.k; draw(); }));
      const p = PARK.find(x => x[0] === pick);
      el.querySelector('.side').innerHTML = (p ? `<div class="mini cream"><h4>🔬 ${p[0]}</h4><p>${p[2]}</p></div>` : '<div class="say">點橘色圓點認識三大科學園區，觀察園區周邊的交通。</div>') +
        `<div class="legend" style="justify-content:flex-start;flex-direction:column;align-items:flex-start">
          <span><i style="background:#FFB74D;height:10px;width:10px;border-radius:50%"></i>科學園區</span>
          <span><i style="background:#5B9BD5;height:10px;width:10px"></i>港口、機場、大橋：${HUB.map(h => h[0]).join('、')}</span>
          <span><i style="background:#E86A8D"></i>高速鐵路（示意）</span><span><i style="background:#8D6E63"></i>鐵路（示意）</span></div>
        <p class="hint">三大科學園區都靠近高速公路、高鐵、港口或機場，方便人員往來與產品運輸，也吸引人口移入。</p>`;
    }
    draw();
  }

  /* ---------------- 第3課：全球晶圓市占率 ---------------- */
  function waferShare(el) {
    const D = [['臺灣', 76], ['中國', 9], ['韓國', 7], ['美國', 4], ['其他', 4]];
    const tip = () => { let t = document.querySelector('.viz-tip'); if (!t) { t = document.createElement('div'); t.className = 'viz-tip'; document.body.appendChild(t); } return t; };
    const W = 520, rowH = 44, left = 70, max = 80;
    let s = `<svg viewBox="0 0 ${W} ${D.length * rowH + 40}" style="max-width:560px;display:block;margin:0 auto" role="img" aria-label="民國 114 年全球高階晶圓市占率：${D.map(d => d[0] + d[1] + '%').join('、')}">`;
    [0, 20, 40, 60, 80].forEach(v => { const x = left + v / max * (W - left - 60); s += `<line x1="${x}" y1="6" x2="${x}" y2="${D.length * rowH + 6}" stroke="#F3E5E9"/><text x="${x}" y="${D.length * rowH + 26}" text-anchor="middle" font-size="12" fill="#8D6E63">${v}%</text>`; });
    D.forEach(([k, v], i) => {
      const y = 12 + i * rowH, w = v / max * (W - left - 60);
      s += `<text x="${left - 10}" y="${y + 20}" text-anchor="end" font-size="14" font-weight="700" fill="#5D4037">${k}</text>
        <rect class="bar" data-i="${i}" x="${left}" y="${y}" width="${w}" height="28" rx="4" fill="${k === '臺灣' ? '#2a78d6' : '#9FB7D9'}"/>
        <text x="${left + w + 8}" y="${y + 20}" font-size="14" font-weight="800" fill="#5D4037">${v}%</text>`;
    });
    s += '</svg><p class="hint" style="text-align:center">民國 114 年全球（高階）晶圓市占率（資料來源：TrendForce，課本 p.50）</p>';
    el.innerHTML = s;
    const t = tip();
    el.querySelectorAll('.bar').forEach(b => {
      b.addEventListener('pointermove', e => { const d = D[Number(b.dataset.i)]; t.innerHTML = `<b>${d[0]}</b>：${d[1]}%`; t.style.left = (e.clientX + 12) + 'px'; t.style.top = (e.clientY + 12) + 'px'; t.style.opacity = 1; });
      b.addEventListener('pointerleave', () => { t.style.opacity = 0; });
    });
  }

  window.UnitWidgets = { econTimeline, tenProjects, parkMap, waferShare };
})();
