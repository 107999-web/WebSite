/* =========================================================
 * 社會五上・單元4 土地的利用與變遷｜互動元件
 * 地圖與剖面圖為簡化繪製的示意圖，非依實際比例
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

  /* 臺灣本島海岸線（經度, 緯度），簡化示意 */
  const TAIWAN = [[121.53, 25.30], [121.74, 25.15], [122.00, 25.01], [121.87, 24.75], [121.86, 24.59], [121.70, 24.30], [121.62, 23.98], [121.51, 23.48],
    [121.38, 23.10], [121.15, 22.75], [120.90, 22.35], [120.85, 21.90], [120.73, 21.93], [120.62, 22.30], [120.45, 22.46], [120.27, 22.62], [120.10, 23.00],
    [120.08, 23.15], [120.15, 23.38], [120.15, 23.65], [120.40, 24.05], [120.52, 24.25], [120.70, 24.55], [120.90, 24.82], [121.10, 25.05], [121.40, 25.18]];
  const TP = ([lon, lat]) => [(lon - 119.75) * 135 + 10, (25.45 - lat) * 150 + 10];
  const pts = arr => arr.map(p => TP(p).map(v => v.toFixed(1)).join(',')).join(' ');
  const TW = pts(TAIWAN);

  /* ---------------- 第1課 板塊擠壓與山脈隆起 ---------------- */
  function plates(el) {
    let t = 0, erosion = true;
    el.innerHTML = `<div class="controls"><label>⏳ 板塊擠壓 <input type="range" min="0" max="100" value="0"></label></div>
      <div class="controls ero"></div><div class="stage"></div><div class="say"></div>`;
    const r = el.querySelector('input'); r.oninput = () => { t = +r.value; draw(); };
    seg(el.querySelector('.ero'), [[true, '🌧️ 有侵蝕作用'], [false, '🚫 沒有侵蝕作用（假設）']], erosion, v => { erosion = v; draw(); });
    function draw() {
      const k = t / 100, push = 30 * k;
      const up = 90 * k, h = erosion ? up * 0.55 : up; // 侵蝕讓山脈沒有明顯升高
      const sea = 150;
      const peak = sea - 10 - h;
      let s = `<svg viewBox="0 0 360 230" role="img" aria-label="板塊擠壓使臺灣隆起">
        <rect width="360" height="${sea}" fill="#E3F2FD"/><rect y="${sea}" width="360" height="${230 - sea}" fill="#90CAF9"/>
        <rect x="${-push}" y="${sea + 20}" width="${180 + push}" height="50" fill="#BCAAA4"/>
        <rect x="${180}" y="${sea + 20}" width="${180 + push}" height="50" fill="#FFCC80"/>
        <text x="80" y="${sea + 52}" text-anchor="middle" font-size="12" font-weight="700" fill="#4E342E">歐亞板塊 →</text>
        <text x="280" y="${sea + 52}" text-anchor="middle" font-size="12" font-weight="700" fill="#7A4B00">← 菲律賓海板塊</text>`;
      if (k > 0.05) {
        s += `<path d="M110 ${sea + 20} Q150 ${sea + 20} 165 ${peak + 20} L175 ${peak} L190 ${peak + 16} Q205 ${sea - 4 - h * 0.55} 215 ${sea - h * 0.5} L228 ${sea - 6 - h * 0.62} L240 ${sea} Q260 ${sea + 20} 270 ${sea + 20} Z" fill="#81C784" stroke="#388E3C" stroke-width="2"/>`;
        if (h > 20) s += `<text x="175" y="${peak - 8}" text-anchor="middle" font-size="11" font-weight="700" fill="#2E7D32">中央山脈</text><text x="236" y="${sea - h * 0.62 - 14}" text-anchor="middle" font-size="10" font-weight="700" fill="#2E7D32">海岸山脈</text>
          <text x="207" y="${sea - h * 0.35 + 4}" text-anchor="middle" font-size="9" fill="#5D4037">縱谷</text>`;
        if (erosion && k > 0.2) s += [0, 1, 2, 3].map(i => `<line x1="${150 + i * 22}" y1="${peak - 36}" x2="${146 + i * 22}" y2="${peak - 24}" stroke="#42A5F5" stroke-width="2"/>`).join('');
      }
      s += `<text x="180" y="18" text-anchor="middle" font-size="12" font-weight="700" fill="#5D4037">${k < 0.05 ? '約 600 萬年前以前：還在海面下' : '臺灣島漸漸浮出海面，形成陸地與山脈'}</text></svg>`;
      el.querySelector('.stage').innerHTML = s;
      el.querySelector('.say').innerHTML = k < 0.05 ? '拖動滑桿，讓兩個板塊互相擠壓。'
        : `菲律賓海板塊和歐亞板塊長期擠壓，臺灣島浮出海面。板塊至今仍持續推擠，導致<b>地震頻繁</b>，也讓中央山脈、海岸山脈不斷隆起；${erosion ? '但因為<b>侵蝕作用</b>很強烈，山脈才沒有明顯升高。' : '如果沒有侵蝕作用，山脈會愈來愈高！'}`;
    }
    draw();
  }

  /* ---------------- 第1課 五種地形的土地利用 ---------------- */
  const FORMS = {
    mountain: { name: '山地', ex: '宜蘭 太平山', x: 55, col: '#6D9F71', stages: ['太平山是臺灣早期著名的林場。', '政府於民國 80 年規定禁伐天然林木，一度使得林業沒落。', '原本的林場轉型為國家森林遊樂區，採用永續經營方式開發山地。'], feat: '高聳；大多分布在本島中央與東部，是河川的發源地，有很多珍貴資源。' },
    hill: { name: '丘陵', ex: '新竹 竹東丘陵（北埔）', x: 130, col: '#A5C882', stages: ['早期北埔居民利用排水良好的丘陵種植茶樹，發展出階梯狀茶園。', '地形起伏，可用的土地一直很有限。', '結合茶文化與觀光體驗，發展休閒農業，吸引遊客。'], feat: '地勢低緩、起伏；河川中游經過，居住空間受限。' },
    terrace: { name: '台地', ex: '桃園台地', x: 190, col: '#D4C07A', stages: ['早期居民挖掘埤塘儲存雨水作為灌溉用途，有「千塘之鄉」美稱。', '人口增加、工商業發展，有些埤塘被填平，設置工業園區或住宅。', '許多學校師生透過實際行動保護埤塘的生態與文化；有些埤塘成為生態公園。'], feat: '頂部平坦、地勢高起，取水不易，不利農業發展。' },
    basin: { name: '盆地', ex: '臺北盆地', x: 250, col: '#E7B98A', stages: ['淡水河早期具航運功能，鄰近河岸的地區商業發展迅速而形成市街。', '人口及汽機車數量大幅增加，出現交通壅塞與環境汙染等問題。', '政府興建捷運等大眾運輸系統，改善交通壅塞與環境汙染。'], feat: '四周高、中間低平；中間平坦地形可供開墾和發展。' },
    plain: { name: '平原', ex: '屏東平原', x: 315, col: '#F4D35E', stages: ['早期農民生產稻米和甘蔗，製糖業興盛，有糖廠坐落於此。', '製糖業沒落後，農民利用炎熱氣候改種蓮霧等熱帶水果。', '舉辦熱帶農業博覽會，吸引觀光人潮並展現在地農業創新。'], feat: '河川沖積而成、地勢平坦，是農業生產的精華區。' }
  };
  function landforms(el) {
    let form = 'mountain', stage = 0;
    el.innerHTML = `<div class="stage"></div><div class="controls fm"></div><div class="controls st"></div><div class="say"></div>`;
    seg(el.querySelector('.fm'), Object.keys(FORMS).map(k => [k, FORMS[k].name]), form, v => { form = v; draw(); });
    seg(el.querySelector('.st'), [[0, '① 早期利用'], [1, '② 發展轉型'], [2, '③ 永續經營']], stage, v => { stage = v; draw(); });
    function draw() {
      const F = FORMS[form];
      let s = `<svg viewBox="0 0 370 190" role="img" aria-label="河川由山地流經丘陵、台地、盆地、平原到海：目前選擇${F.name}">
        <rect width="370" height="190" fill="#EAF6FF"/>
        <path d="M0 150 L0 40 L30 20 L60 45 L85 30 L105 70 L130 80 L150 95 L165 110 L175 100 L210 100 L220 118 L235 95 L245 130 L270 132 L280 100 L290 140 L370 150 L370 190 L0 190 Z" fill="#C5E1A5" stroke="#7CB342" stroke-width="2"/>
        <rect x="340" y="148" width="30" height="42" fill="#81D4FA"/>
        <path d="M40 38 C70 70 100 90 140 105 C170 115 200 122 230 128 C260 134 300 146 345 152" fill="none" stroke="#29B6F6" stroke-width="4"/>
        <text x="30" y="178" font-size="11" fill="#01579B">上游</text><text x="170" y="178" font-size="11" fill="#01579B">中游</text><text x="290" y="178" font-size="11" fill="#01579B">下游</text><text x="345" y="175" font-size="11" fill="#01579B">海</text>`;
      Object.keys(FORMS).forEach(k => {
        const f = FORMS[k], on = k === form, y = k === 'mountain' ? 22 : k === 'hill' ? 64 : k === 'terrace' ? 82 : k === 'basin' ? 112 : 128;
        s += `<g data-f="${k}" style="cursor:pointer"><rect x="${f.x - 22}" y="${y - 16}" width="44" height="20" rx="10" fill="${on ? HL : '#fff'}" stroke="${f.col}" stroke-width="2"/>
          <text x="${f.x}" y="${y - 2}" text-anchor="middle" font-size="12" font-weight="700" fill="${on ? '#fff' : '#5D4037'}">${f.name}</text></g>`;
      });
      s += '</svg>';
      el.querySelector('.stage').innerHTML = s;
      el.querySelectorAll('[data-f]').forEach(g => g.addEventListener('click', () => {
        form = g.dataset.f;
        el.querySelectorAll('.fm button').forEach(b => b.setAttribute('aria-pressed', b.textContent === FORMS[form].name));
        draw();
      }));
      el.querySelector('.say').innerHTML = `<b>${F.name}</b>（例：${F.ex}）：${F.feat}<br><b>${['① 早期利用', '② 發展轉型', '③ 永續經營'][stage]}</b>：${F.stages[stage]}`;
    }
    draw();
  }

  /* ---------------- 第2課 臺灣的海岸 ---------------- */
  const COAST = {
    north: { name: '北部：岬角海灣', col: '#2a78d6', idx: [23, 24, 25, 0, 1, 2], ex: '深澳漁港、野柳地質公園', txt: '海岸線曲折，有許多<b>天然良港</b>：海岸的尖端是<b>岬角</b>，凹進去的是<b>海灣</b>，可以躲避風雨，利於發展港口、漁業及海運（例：深澳漁港）。野柳的多元地質景觀豐富了觀光資源。' },
    east: { name: '東部：陡峭海岸', col: '#7E57C2', idx: [2, 3, 4, 5, 6, 7, 8, 9, 10], ex: '清水斷崖、花蓮 豐濱梯田', txt: '海岸<b>陡峭</b>，早期移民難以登陸，加上山脈阻隔，<b>較晚開發</b>，保留許多自然生態。居民在沿岸被抬升的階地上開墾<b>梯田</b>；沿著海岸建造公路與鐵路。' },
    south: { name: '南部：珊瑚礁海岸', col: '#e87ba4', idx: [10, 11, 12, 13], ex: '墾丁國家公園', txt: '屬<b>熱帶氣候</b>，溫暖乾淨的海水適合<b>珊瑚</b>生長，形成獨特的珊瑚礁海岸；礁岸地形不易上岸而較晚開發，現今設立國家公園保護珊瑚礁生態，也發展觀光。' },
    west: { name: '西部：沙岸', col: '#eb6834', idx: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], ex: '臺南 七股、北門潟湖', txt: '地形較平緩，河川在出海口<b>堆積</b>形成<b>沙灘、沙洲、潟湖</b>。早期移民以小型船舶登陸，利用海岸製鹽、<b>養殖牡蠣</b>（北門潟湖的蚵架）、魚塭。' }
  };
  function coastMap(el) {
    let cur = 'west';
    el.innerHTML = `<div class="controls"></div><div class="split" style="align-items:center"><div class="stage"></div><div class="say"></div></div>`;
    seg(el.querySelector('.controls'), Object.keys(COAST).map(k => [k, COAST[k].name]), cur, v => { cur = v; draw(); });
    function draw() {
      let s = `<svg viewBox="0 0 330 570" style="max-width:280px;display:block;margin:0 auto" role="img" aria-label="臺灣的海岸類型：${COAST[cur].name}">
        <rect width="330" height="570" rx="16" fill="#CFE8FA"/><polygon points="${TW}" fill="#E8F5E9" stroke="#90A4AE" stroke-width="1"/>`;
      Object.keys(COAST).forEach(k => {
        const c = COAST[k], on = k === cur;
        s += `<polyline data-c="${k}" points="${pts(c.idx.map(i => TAIWAN[i]))}" fill="none" stroke="${c.col}" stroke-width="${on ? 10 : 5}" stroke-linecap="round" stroke-linejoin="round" opacity="${on ? 1 : 0.55}" style="cursor:pointer"/>`;
      });
      s += `<text x="320" y="562" text-anchor="end" font-size="10" fill="#78909C">示意圖</text></svg>`;
      el.querySelector('.stage').innerHTML = s;
      el.querySelectorAll('[data-c]').forEach(g => g.addEventListener('click', () => { cur = g.dataset.c; el.querySelectorAll('.controls button').forEach(b => b.setAttribute('aria-pressed', b.textContent === COAST[cur].name)); draw(); }));
      const c = COAST[cur];
      el.querySelector('.say').innerHTML = `<h4 style="color:${c.col}">${c.name}</h4><p>${c.txt}</p><p class="hint">例：${c.ex}</p>`;
    }
    draw();
  }

  /* ---------------- 第3課 超抽地下水與地層下陷 ---------------- */
  function subsidence(el) {
    let years = 0, sorghum = false;
    el.innerHTML = `<div class="controls"><label>⏳ 經過年數 <input type="range" min="0" max="30" value="0"></label> <b class="y"></b></div>
      <div class="controls sw"></div><div class="stage"></div><div class="say"></div>`;
    const r = el.querySelector('input'); r.oninput = () => { years = +r.value; draw(); };
    seg(el.querySelector('.sw'), [[false, '🐟 持續超抽地下水養殖'], [true, '🌾 改種用水量少的高粱']], sorghum, v => { sorghum = v; draw(); });
    function draw() {
      const rate = sorghum ? 0.4 : 2.2, drop = Math.min(60, years * rate);
      el.querySelector('.y').textContent = years + ' 年';
      let s = `<svg viewBox="0 0 360 220" role="img" aria-label="地面下陷約 ${Math.round(drop)} 單位（示意）">
        <rect width="360" height="220" fill="#E3F2FD"/>
        <rect y="${80 + drop}" width="360" height="${140 - drop}" fill="#D7CCC8"/>
        <line x1="0" y1="80" x2="360" y2="80" stroke="#90A4AE" stroke-dasharray="5 4"/><text x="6" y="74" font-size="11" fill="#546E7A">原本的地面高度</text>
        <rect x="200" y="${60 + drop}" width="60" height="20" fill="#FFCC80" stroke="#8D6E63"/><path d="M195 ${60 + drop} L230 ${40 + drop} L265 ${60 + drop} Z" fill="#E57373"/>
        <rect y="${160}" width="360" height="60" fill="#81D4FA" opacity="${sorghum ? 0.8 : Math.max(0.2, 0.8 - years / 40)}"/>
        <text x="300" y="200" text-anchor="middle" font-size="11" fill="#01579B">地下水</text>`;
      if (!sorghum) s += `<rect x="60" y="${70 + drop}" width="80" height="10" fill="#4FC3F7"/><text x="100" y="${66 + drop}" text-anchor="middle" font-size="11" fill="#01579B">魚塭</text><line x1="150" y1="${80 + drop}" x2="150" y2="190" stroke="#546E7A" stroke-width="4"/><text x="156" y="140" font-size="10" fill="#37474F">抽水井</text>`;
      else s += [...Array(7)].map((_, i) => `<line x1="${40 + i * 18}" y1="${80 + drop}" x2="${40 + i * 18}" y2="${56 + drop}" stroke="#8D6E63" stroke-width="2"/><circle cx="${40 + i * 18}" cy="${54 + drop}" r="4" fill="#C62828"/>`).join('') + `<text x="95" y="${46 + drop}" text-anchor="middle" font-size="11" fill="#5D4037">高粱</text>`;
      if (drop > 20) s += `<line x1="330" y1="80" x2="330" y2="${80 + drop}" stroke="${HL}" stroke-width="2"/><text x="326" y="${80 + drop / 2 + 4}" text-anchor="end" font-size="11" font-weight="700" fill="${HL}">下陷</text>`;
      s += '</svg>';
      el.querySelector('.stage').innerHTML = s;
      el.querySelector('.say').innerHTML = sorghum
        ? '政府鼓勵民眾改種<b>用水量較少的高粱</b>，還能獲得補助，減少抽取地下水，<mark>減緩地層下陷</mark>。'
        : '臺灣西南沿海因<b>養殖漁業超抽地下水</b>，地下的水變少、土層被壓縮，地面愈來愈低，造成<mark>地層下陷</mark>，容易淹水。<span class="hint">（示意）</span>';
    }
    draw();
  }

  /* ---------------- 主題年表：臺灣農業發展 ---------------- */
  function agriTimeline(el) {
    const EV = [
      { era: '史前時代', t: '長濱遺址', d: '距今約 50,000～5,000 年前：靠採集植物、狩獵維生。', tool: '採集、狩獵' },
      { era: '史前時代', t: '卑南遺址', d: '距今約 3,500～2,000 年前：有農業耕作跡象，並利用<b>石器</b>（石刀）收割作物。', tool: '石器' },
      { era: '史前時代', t: '十三行遺址', d: '距今約 2,000～400 年前：擁有<b>煉鐵技術</b>，可使用鋤頭或鐮刀耕種、收割和捕魚。', tool: '鐵器' },
      { era: '大航海時代', t: '荷蘭人', d: '17 世紀：荷蘭人<b>引進黃牛</b>，並從中國招募漢人在臺灣<b>西南部</b>開墾農田。', tool: '黃牛耕田' },
      { era: '大航海時代', t: '鄭氏政權', d: '17 世紀：鄭成功率軍登陸後推行各項開墾措施，利用駐屯軍隊就地耕種（<b>屯田</b>制度）。', tool: '屯田' },
      { era: '清帝國時期', t: '八堡圳', d: '18 世紀：施世榜興建八堡圳，開發彰化平原；是清帝國時期最大的水利工程，至今仍具灌溉功能。', tool: '水圳' },
      { era: '清帝國時期', t: '瑠公圳', d: '18 世紀：郭錫瑠興建瑠公圳，加速臺北盆地的開發。', tool: '水圳' },
      { era: '清帝國時期', t: '曹公圳', d: '18～19 世紀：吳沙招募各籍漢人到宜蘭開墾；曹謹興建曹公圳，帶動鳳山地區的開發。', tool: '水圳' }
    ];
    const COL = { '史前時代': '#1baf7a', '大航海時代': '#2a78d6', '清帝國時期': '#eb6834' };
    let pick = 0;
    el.innerHTML = `<div class="stage"></div><div class="say"></div>`;
    function draw() {
      let s = `<svg viewBox="0 0 360 120" role="img" aria-label="臺灣農業發展主題年表"><line x1="16" y1="60" x2="344" y2="60" stroke="#BCAAA4" stroke-width="4"/>`;
      EV.forEach((e, i) => {
        const x = 26 + i * 44, on = i === pick, up = i % 2 === 0;
        s += `<g data-i="${i}" style="cursor:pointer"><circle cx="${x}" cy="60" r="${on ? 11 : 8}" fill="${COL[e.era]}" stroke="#fff" stroke-width="3"/>
          <text x="${x}" y="${up ? 36 : 92}" text-anchor="middle" font-size="10.5" font-weight="${on ? 800 : 700}" fill="${on ? HL : '#5D4037'}">${e.t}</text></g>`;
      });
      s += `<text x="26" y="114" font-size="10" fill="${COL['史前時代']}">■ 史前時代</text><text x="150" y="114" font-size="10" fill="${COL['大航海時代']}">■ 大航海時代</text><text x="260" y="114" font-size="10" fill="${COL['清帝國時期']}">■ 清帝國時期</text></svg>`;
      el.querySelector('.stage').innerHTML = s;
      el.querySelectorAll('[data-i]').forEach(g => g.addEventListener('click', () => { pick = +g.dataset.i; draw(); }));
      const e = EV[pick];
      el.querySelector('.say').innerHTML = `<b style="color:${COL[e.era]}">${e.era}｜${e.t}</b>：${e.d}`;
    }
    draw();
  }

  window.UnitWidgets = { plates, landforms, coastMap, subsidence, agriTimeline };
})();
