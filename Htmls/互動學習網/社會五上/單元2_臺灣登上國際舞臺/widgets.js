/* =========================================================
 * 社會五上・單元2 臺灣登上國際舞臺｜互動元件
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
  const LAT_SPLIT = 23.9; // 示意：南北勢力分界

  /* ---------------- 第1課：東亞貿易圈 ---------------- */
  function tradeHub(el) {
    const NODES = {
      tw: { name: '臺灣', x: 300, y: 200, c: '#A8D8A0' },
      cn: { name: '中國', x: 120, y: 150, c: '#F3E3C3' },
      jp: { name: '日本', x: 470, y: 60, c: '#F3E3C3' },
      sea: { name: '東南亞', x: 190, y: 360, c: '#F3E3C3' },
      ph: { name: '菲律賓（西班牙據點）', x: 380, y: 330, c: '#FFE0B2' },
      id: { name: '印尼（荷蘭據點）', x: 110, y: 470, c: '#FFE0B2' }
    };
    const MODES = {
      dutch: {
        title: '荷蘭時期：臺灣是商品貿易的轉運站',
        flows: [['tw', 'jp', '鹿皮（做武士服裝）', 'out'], ['tw', 'cn', '蔗糖、鹿皮轉賣其他國家', 'out'], ['cn', 'tw', '絲織品', 'in'], ['sea', 'tw', '香料', 'in'], ['jp', 'tw', '銀', 'in']],
        note: '荷蘭人從中國招募漢人到臺灣開墾農田，把蔗糖、鹿皮轉賣到其他國家，並和其他國家交易絲織品、銀與香料，使臺灣成為當時商品貿易的<b>轉運站</b>。鹿皮高峰期每年超過 10 萬張。'
      },
      zheng: {
        title: '鄭氏政權：屯墾與對外貿易',
        flows: [['tw', 'jp', '蔗糖、鹿皮', 'out'], ['jp', 'tw', '銀', 'in'], ['tw', 'cn', '銀、香料', 'out'], ['cn', 'tw', '絲綢、瓷器', 'in'], ['tw', 'sea', '蔗糖、絲綢、瓷器', 'out'], ['sea', 'tw', '軍火物資、香料', 'in']],
        note: '鄭氏政權對內派士兵到各地屯墾；對外與中國、日本及東南亞貿易。當時與清帝國處於戰爭狀態，所以只能用<b>走私貿易</b>交易物品。'
      },
      goods: {
        title: '歐洲人來亞洲找什麼？',
        flows: [['cn', 'tw', '瓷器、絲綢（產地：中國）', 'in'], ['sea', 'tw', '香料（產地：印度、東南亞）', 'in']],
        note: '西元十六世紀，歐洲國家透過新航路來到亞洲，尋找<b>瓷器、絲綢、香料</b>。臺灣位在東亞海運的<b>中途要道</b>，吸引各族群來建立據點，臺灣自此登上國際舞臺。'
      }
    };
    let mode = 'goods';
    el.innerHTML = `<div class="controls"></div><div class="stage"></div><div class="legend"><span><i style="background:#eb6834"></i>從臺灣輸出</span><span><i style="background:#2a78d6"></i>輸入臺灣</span></div><div class="say"></div>`;
    seg(el.querySelector('.controls'), [['goods', '🧭 歐洲人為什麼來？'], ['dutch', '🇳🇱 荷蘭時期'], ['zheng', '⛵ 鄭氏政權']], mode, v => { mode = v; draw(); });
    function draw() {
      const M = MODES[mode];
      let s = `<svg viewBox="0 0 600 540" role="img" aria-label="${M.title}"><rect width="600" height="540" rx="20" fill="#CFE8FA"/>
        <defs><marker id="ao" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#eb6834"/></marker>
        <marker id="ai" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#2a78d6"/></marker></defs>
        <text x="300" y="30" text-anchor="middle" font-size="17" font-weight="800" fill="#5D4037">${M.title}</text>`;
      M.flows.forEach(([a, b, label, dir]) => {
        const A = NODES[a], B = NODES[b];
        const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
        // 以「臺灣→對方」為基準方向求垂直向量，輸出、輸入兩條線分列兩側
        const other = a === 'tw' ? B : A, bx = other.x - NODES.tw.x, by = other.y - NODES.tw.y, bl = Math.hypot(bx, by);
        const px = -by / bl, py = bx / bl, off = (dir === 'out' ? 1 : -1) * 12;
        const x1 = A.x + ux * 50 + px * off, y1 = A.y + uy * 50 + py * off, x2 = B.x - ux * 54 + px * off, y2 = B.y - uy * 54 + py * off;
        const col = dir === 'out' ? '#eb6834' : '#2a78d6';
        const mx = (x1 + x2) / 2 + px * off * 2.4, my = (y1 + y2) / 2 + py * off * 2.4;
        s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="4" marker-end="url(#${dir === 'out' ? 'ao' : 'ai'})"/>
          <text x="${mx}" y="${my + 4}" text-anchor="middle" font-size="13" font-weight="700" fill="#5D4037" stroke="#fff" stroke-width="4" paint-order="stroke">${label}</text>`;
      });
      Object.values(NODES).forEach(n => {
        const big = n.name === '臺灣';
        s += `<circle cx="${n.x}" cy="${n.y}" r="${big ? 44 : 38}" fill="${n.c}" stroke="${big ? '#5E9E62' : '#C9A77A'}" stroke-width="3"/>
          <text x="${n.x}" y="${n.y + 5}" text-anchor="middle" font-size="${n.name.length > 4 ? 11 : 15}" font-weight="800" fill="#5D4037">${n.name.replace('（', '\n').split('\n')[0]}</text>
          ${n.name.includes('（') ? `<text x="${n.x}" y="${n.y + 20}" text-anchor="middle" font-size="10" fill="#8D6E63">（${n.name.split('（')[1]}</text>` : ''}`;
      });
      s += `<text x="590" y="530" text-anchor="end" font-size="11" fill="#78909C">示意圖，位置非依實際比例</text></svg>`;
      el.querySelector('.stage').innerHTML = s;
      el.querySelector('.say').innerHTML = M.note;
    }
    draw();
  }

  /* ---------------- 第1課：大航海時代年代尺 ---------------- */
  function eraTimeline(el) {
    const EV = [
      [1624, '荷蘭人占領南臺灣（臺南），建熱蘭遮城、普羅民遮城'],
      [1626, '西班牙人占領北臺灣（基隆、淡水）'],
      [1642, '荷蘭人趕走西班牙人，控制臺灣北部'],
      [1661, '鄭成功率軍渡海來臺，由鹿耳門登陸'],
      [1662, '鄭成功迫使荷蘭人離臺；鄭成功病逝，鄭經接續經營'],
      [1683, '清帝國派施琅攻打臺灣，鄭氏政權滅亡'],
      [1684, '臺灣正式納入清帝國版圖']
    ];
    let y = 1624;
    el.innerHTML = `<div class="controls"><label>📅 西元 <input type="range" min="1620" max="1690" value="1624" aria-label="西元年"></label><b class="yr">1624 年</b></div>
      <div class="split" style="align-items:center"><div class="bars"></div><div class="map"></div></div><div class="say"></div>`;
    const r = el.querySelector('input');
    r.oninput = () => { y = Number(r.value); draw(); };
    const who = yr => {
      const south = yr >= 1624 && yr < 1662 ? 'dutch' : yr >= 1662 && yr < 1684 ? 'zheng' : yr >= 1684 ? 'qing' : 'none';
      const north = yr >= 1626 && yr < 1642 ? 'spain' : yr >= 1642 && yr < 1662 ? 'dutch' : yr >= 1662 && yr < 1684 ? 'zheng' : yr >= 1684 ? 'qing' : 'none';
      return { south, north };
    };
    const COL = { dutch: '#F4A261', spain: '#E76F9A', zheng: '#6A9BD8', qing: '#B39DDB', none: '#DDE7DD' };
    const NAME = { dutch: '荷蘭', spain: '西班牙', zheng: '鄭氏政權', qing: '清帝國', none: '（尚未有外來政權）' };
    function draw() {
      el.querySelector('.yr').textContent = y + ' 年';
      const X = v => 30 + (v - 1620) * (440 / 70);
      const bar = (a, b, row, c, label) => `<rect x="${X(a)}" y="${40 + row * 42}" width="${X(b) - X(a)}" height="30" rx="10" fill="${c}"/><text x="${X(a) + 6}" y="${60 + row * 42}" font-size="13" font-weight="800" fill="#fff" stroke="#5D4037" stroke-width="2.5" paint-order="stroke">${label}</text>`;
      let s = `<svg viewBox="0 0 500 230" role="img" aria-label="大航海時代年代尺">
        ${bar(1624, 1662, 0, COL.dutch, '荷蘭（南）')}${bar(1642, 1662, 1, COL.dutch, '荷蘭（北）')}
        ${bar(1626, 1642, 1, COL.spain, '西班牙（北）')}${bar(1662, 1684, 2, COL.zheng, '鄭氏政權')}${bar(1684, 1690, 3, COL.qing, '清')}
        <line x1="30" y1="200" x2="470" y2="200" stroke="#8D6E63" stroke-width="2"/>`;
      [1624, 1642, 1662, 1684].forEach(t => { s += `<line x1="${X(t)}" y1="195" x2="${X(t)}" y2="205" stroke="#8D6E63" stroke-width="2"/><text x="${X(t)}" y="222" text-anchor="middle" font-size="12" fill="#5D4037">${t}</text>`; });
      s += `<text x="${X(1626)}" y="190" text-anchor="middle" font-size="10" fill="#8D6E63">1626</text>`;
      s += `<line x1="${X(y)}" y1="30" x2="${X(y)}" y2="205" stroke="#E86A8D" stroke-width="3"/></svg>`;
      el.querySelector('.bars').innerHTML = s;
      const w = who(y);
      const [, sy] = TP([0, LAT_SPLIT]);
      el.querySelector('.map').innerHTML = `<svg viewBox="0 0 330 570" style="max-width:220px;display:block;margin:0 auto" role="img" aria-label="${y} 年臺灣勢力示意圖">
        <defs><clipPath id="twc"><polygon points="${TW}"/></clipPath></defs>
        <rect width="330" height="570" rx="16" fill="#CFE8FA"/>
        <rect x="0" y="0" width="330" height="${sy}" fill="${COL[w.north]}" clip-path="url(#twc)"/>
        <rect x="0" y="${sy}" width="330" height="${570 - sy}" fill="${COL[w.south]}" clip-path="url(#twc)"/>
        <polygon points="${TW}" fill="none" stroke="#5E9E62" stroke-width="2"/>
        <text x="165" y="${sy - 90}" text-anchor="middle" font-size="16" font-weight="800" fill="#5D4037" stroke="#fff" stroke-width="4" paint-order="stroke">北：${w.north === 'none' ? '—' : NAME[w.north]}</text>
        <text x="165" y="${sy + 110}" text-anchor="middle" font-size="16" font-weight="800" fill="#5D4037" stroke="#fff" stroke-width="4" paint-order="stroke">南：${w.south === 'none' ? '—' : NAME[w.south]}</text>
        <text x="320" y="562" text-anchor="end" font-size="10" fill="#78909C">示意圖</text></svg>`;
      const past = EV.filter(e => e[0] <= y);
      const now = EV.filter(e => e[0] === y);
      el.querySelector('.say').innerHTML = (now.length ? `📌 <b>${y} 年</b>：${now.map(e => e[1]).join('；')}<br>` : '') +
        (y < 1624 ? '荷蘭人來臺之前，臺灣有原住民族，也有漢人漁民與中國、日本的海商、海盜在這裡活動。' : `目前：${w.north === 'none' ? '北部尚未有外來政權' : `北部由<b>${NAME[w.north]}</b>控制`}；${w.south === 'none' ? '南部尚未有外來政權' : `南部由<b>${NAME[w.south]}</b>控制`}。`) +
        `<br><span class="hint">已發生的大事：${past.length ? past.map(e => e[0]).join('、') : '—'}</span>`;
    }
    draw();
  }

  /* ---------------- 第1、2課：大航海時代的足跡地圖 ---------------- */
  function heritageMap(el) {
    const S = [
      { k: '熱蘭遮城（安平古堡）', ll: [120.16, 23.0], who: 'dutch', txt: '荷蘭人 1624 年後在大員（今臺南 安平）興建，是行政管理與商業中心；今臺南仍保留部分磚牆。', dx: -8 },
      { k: '普羅民遮城（赤嵌樓）', ll: [120.2, 23.0], who: 'dutch', txt: '荷蘭人在赤嵌建造；鄭成功以它作為承天府的辦公地點，改建後成為今日的赤嵌樓。', dx: 8 },
      { k: '聖薩爾瓦多城（基隆 和平島）', ll: [121.77, 25.16], who: 'spain', txt: '西班牙人占領基隆後，在和平島建造的第一座城堡；和平島也有西班牙教堂遺址與十字架。' },
      { k: '聖多明哥城（今紅毛城）', ll: [121.43, 25.18], who: 'spain', txt: '西班牙人在淡水建造的第二座城堡；荷蘭人趕走西班牙人後，在原址附近重建，就是今日的紅毛城。' },
      { k: '三貂角', ll: [122.0, 25.01], who: 'spain', txt: '西班牙人命名為聖地牙哥（San Tiago），發音轉化成「三貂角」。' },
      { k: '臺南孔廟（全臺首學）', ll: [120.2, 22.99], who: 'zheng', txt: '鄭氏政權在陳永華規劃下興建的全臺第一座孔廟，清帝國時期曾作為學校。', dy: 22 },
      { k: '新營、林鳳營', ll: [120.3, 23.3], who: 'zheng', txt: '鄭氏軍隊駐守屯墾形成的地名，「營」是鄭氏的軍事單位名稱。' },
      { k: '左營、前鎮', ll: [120.29, 22.65], who: 'zheng', txt: '鄭氏軍隊駐守屯墾形成的地名，「營」與「鎮」都是鄭氏的軍事單位名稱。' },
      { k: '鹿耳門', ll: [120.1, 23.07], who: 'zheng', txt: '鄭成功從金門出兵、途經澎湖，由鹿耳門（今臺南市）登陸。', dx: -14 },
      { k: '北港、顏厝寮', ll: [120.2, 23.57], who: 'han', txt: '傳說顏思齊從今雲林 北港登陸；雲林 水林的顏厝寮是漢人在臺最早的開墾地之一。' },
      { k: '大肚王國', ll: [120.6, 24.25], who: 'pingpu', txt: '臺灣中部平埔族群的部落聯盟，生活在清水平原與大肚台地之間。' }
    ];
    const COL = { dutch: '#F4A261', spain: '#E76F9A', zheng: '#6A9BD8', han: '#8D6E63', pingpu: '#4CB38A' };
    const LAB = { dutch: '荷蘭', spain: '西班牙', zheng: '鄭氏政權', han: '早期漢人', pingpu: '平埔族群' };
    let pick = null, filter = 'all';
    el.innerHTML = `<div class="controls"></div><div class="split" style="align-items:start"><div class="stage"></div><div class="side"></div></div>`;
    seg(el.querySelector('.controls'), [['all', '全部'], ['dutch', '荷蘭'], ['spain', '西班牙'], ['zheng', '鄭氏政權']], filter, v => { filter = v; pick = null; draw(); });
    function draw() {
      const list = S.filter(s => filter === 'all' || s.who === filter);
      const dots = list.map(s => {
        const [x, y] = TP(s.ll); const on = pick === s.k;
        const cx = x + (s.dx || 0), cy = y + (s.dy || 0);
        return `<g data-k="${s.k}" style="cursor:pointer"><circle cx="${cx}" cy="${cy}" r="${on ? 11 : 8}" fill="${COL[s.who]}" stroke="${on ? '#5D4037' : '#fff'}" stroke-width="3"/></g>`;
      }).join('');
      el.querySelector('.stage').innerHTML = `<svg viewBox="0 0 330 570" style="max-width:320px;display:block;margin:0 auto" role="img" aria-label="大航海時代足跡地圖">
        <rect width="330" height="570" rx="16" fill="#CFE8FA"/><polygon points="${TW}" fill="#E8F5E9" stroke="#5E9E62" stroke-width="2"/>${dots}
        <text x="320" y="562" text-anchor="end" font-size="10" fill="#78909C">示意圖</text></svg>`;
      el.querySelectorAll('[data-k]').forEach(g => g.addEventListener('click', () => { pick = g.dataset.k; draw(); }));
      const s = S.find(x => x.k === pick);
      el.querySelector('.side').innerHTML = (s ? `<div class="mini cream"><h4><span style="color:${COL[s.who]}">●</span> ${s.k}</h4><p><b>${LAB[s.who]}</b>｜${s.txt}</p></div>` : '<div class="say">點地圖上的圓點，看看大航海時代留下的城堡、地名與遺跡。</div>') +
        `<ul class="dots" style="margin-top:8px">${list.map(x => `<li style="cursor:pointer${x.k === pick ? ';font-weight:800' : ''}" data-li="${x.k}"><span style="color:${COL[x.who]}">●</span> ${x.k}</li>`).join('')}</ul>`;
      el.querySelectorAll('[data-li]').forEach(li => li.addEventListener('click', () => { pick = li.dataset.li; draw(); }));
    }
    draw();
  }

  window.UnitWidgets = { tradeHub, eraTimeline, heritageMap };
})();
