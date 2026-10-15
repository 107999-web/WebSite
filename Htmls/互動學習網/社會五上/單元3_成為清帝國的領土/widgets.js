/* =========================================================
 * 社會五上・單元3 成為清帝國的領土｜互動元件
 * 地圖為簡化繪製的示意圖，位置為概略，非依實際比例
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
  const pts = arr => arr.map(p => TP(p).map(v => v.toFixed(1)).join(',')).join(' ');
  const TW = pts(TAIWAN);

  /* ---------------- 清帝國時期的臺灣地圖（分圖層） ---------------- */
  const LAYERS = {
    canal: {
      name: '💧 水圳', col: '#2a78d6', items: [
        { k: '瑠公圳', ll: [121.54, 25.03], txt: '臺北盆地著名的水利設施，提供穩定水源、增加耕地面積。' },
        { k: '八堡圳', ll: [120.6, 23.88], txt: '施世榜投資開發；林先生教人用竹子綁成「石笱」，底部放石塊，提高溪水水位把水引入水圳。吸引許多人開墾，形成員林仔街（今彰化縣 員林市）。' },
        { k: '曹公圳', ll: [120.36, 22.63], txt: '南部（今高雄）重要的水利設施，灌溉農田、提高稻米產量。' }
      ]
    },
    port: {
      name: '⚓ 一府二鹿三艋舺', col: '#eb6834', items: [
        { k: '府城（今臺南市）', ll: [120.2, 23.0], txt: '「一府」：臺灣最早發展的城市。五條港是早期重要的商用河港，今日轉型為觀光文化園區。' },
        { k: '鹿港', ll: [120.43, 24.06], txt: '「二鹿」：五福街（今中山路）店鋪林立，商家蓋起擋住天空的涼亭防風避雨，有「不見天街」之稱。' },
        { k: '艋舺（今臺北市 萬華區）', ll: [121.5, 25.035], txt: '「三艋舺」：水運位置優越，成為臺北盆地對外港口；剝皮寮老街保存清帝國時期的街景。' }
      ]
    },
    conflict: {
      name: '⚔️ 民變與械鬥', col: '#E53950', items: [
        { k: '朱一貴事件', ll: [120.46, 22.94], txt: '1721 年，「鴨母王」朱一貴不滿官員壓迫而率眾反抗，一度攻下府城。今高雄市 內門區有朱一貴紀念碑。' },
        { k: '林爽文事件', ll: [120.68, 24.1], txt: '1786 年，清帝國時期規模最大的民變。林爽文見官員欺壓人民而率眾反抗，演變成全臺動亂；諸羅縣人民協助鎮壓，事後改名為「嘉義」。' },
        { k: '褒忠亭義民廟', ll: [121.08, 24.83], txt: '今新竹縣，為了紀念在林爽文事件中犧牲的先民。' },
        { k: '赤嵌樓的石碑', ll: [120.2, 23.0], txt: '清帝國在林爽文事件結束後立碑記錄，後人把石碑移到臺南市 赤嵌樓保存。' },
        { k: '芝山岩（械鬥）', ll: [121.53, 25.1], txt: '漳州人為對抗泉州人的侵擾，以芝山岩為避難所並建隘門防衛；無法分辨的屍骨合葬在「同歸所」（大墓公）。漳州人也在此建廟供奉開漳聖王。' }
      ]
    },
    trade: {
      name: '🍵 通商港口與物產', col: '#1baf7a', items: [
        { k: '雞籠（今基隆）', ll: [121.74, 25.13], txt: '1860 年代開放的通商港口之一。' },
        { k: '淡水', ll: [121.44, 25.17], txt: '北部的<b>茶葉、樟腦</b>由淡水出口。約翰．陶德在 1869 年把臺灣茶從淡水銷往美國。' },
        { k: '大稻埕（今臺北市 大同區）', ll: [121.51, 25.06], txt: '臨近淡水港，北部的茶葉、樟腦運到這裡集散，成為新興市街；雖然不種茶，卻成了茶商集散地。' },
        { k: '安平（今臺南）', ll: [120.16, 23.0], txt: '<b>糖</b>由安平、打狗出口。德國商人在臺南設東興洋行，以糖為主要出口商品。' },
        { k: '打狗（今高雄）', ll: [120.27, 22.62], txt: '<b>糖</b>的出口港。英國在此設立打狗領事館，是臺灣第一個外國正式領事館。' }
      ]
    },
    build: {
      name: '🏯 防務與建設', col: '#7E57C2', items: [
        { k: '牡丹社', ll: [120.78, 22.15], txt: '1871 年琉球人漂流到臺灣南端遭殺害；1874 年日本以此為藉口出兵攻打牡丹社等部落（牡丹社事件）。' },
        { k: '二鯤鯓砲臺', ll: [120.16, 22.99], txt: '沈葆楨在臺修建的第一座西式砲臺（今臺南），加強海防。' },
        { k: '恆春城', ll: [120.75, 22.0], txt: '沈葆楨建議興建，城牆設計成凹凸狀，方便射擊、加強南部防禦。' },
        { k: '基隆、淡水（清法戰爭）', ll: [121.6, 25.15], txt: '1884 年清法戰爭戰火波及基隆與淡水，清帝國派劉銘傳來臺指揮作戰。' },
        { k: '基隆—新竹鐵路', ll: [121.2, 24.92], txt: '劉銘傳修建基隆到新竹之間的鐵路，購入騰雲號火車頭；也架設電報、購置新式輪船。' }
      ]
    },
    west: {
      name: '✝️ 西方人足跡', col: '#e87ba4', items: [
        { k: '馬偕（淡水）', ll: [121.44, 25.17], txt: '1872 年抵達淡水，以免費拔牙傳教，創辦理學堂大書院、淡水女學堂。' },
        { k: '馬雅各（臺南）', ll: [120.2, 23.0], txt: '在臺灣南部傳教，開設全臺第一座西式醫館，把醫病與傳教結合。' },
        { k: '巴克禮（臺南）', ll: [120.25, 23.08], txt: '1875 年來臺，創辦臺南神學院，1885 年發行臺灣第一份報紙《臺灣府城教會報》。' },
        { k: '斯文豪（打狗、淡水）', ll: [120.3, 22.66], txt: '英國外交官員，深入山林調查動物，發表《福爾摩沙鳥類誌》；臺灣近三分之一的鳥類由他發現。' }
      ]
    }
  };
  function qingMap(el, opts) {
    const keys = opts.layers || Object.keys(LAYERS);
    let layer = keys[0], pick = null;
    el.innerHTML = `<div class="controls"></div><div class="split" style="align-items:start"><div class="stage"></div><div class="side"></div></div>`;
    seg(el.querySelector('.controls'), keys.map(k => [k, LAYERS[k].name]), layer, v => { layer = v; pick = null; draw(); });
    function draw() {
      const L = LAYERS[layer];
      let extra = '';
      if (layer === 'build') extra = `<polyline points="${pts([[121.74, 25.13], [121.51, 25.05], [121.2, 24.92], [120.97, 24.8]])}" fill="none" stroke="#7E57C2" stroke-width="4" stroke-dasharray="8 4"/>`;
      if (layer === 'trade') {
        const reg = (arr, c, t, at) => { const [x, y] = TP(at); return `<polygon points="${pts(arr)}" fill="${c}" opacity="0.35"/><text x="${x}" y="${y}" text-anchor="middle" font-size="13" font-weight="700" fill="#5D4037" stroke="#fff" stroke-width="3" paint-order="stroke">${t}</text>`; };
        extra = reg([[121.2, 25.0], [121.75, 25.0], [121.7, 24.7], [121.2, 24.75]], '#1baf7a', '🍵 茶', [121.45, 24.85]) +
          reg([[120.75, 24.7], [121.3, 24.7], [121.2, 24.2], [120.8, 24.2]], '#8D6E63', '🌳 樟腦', [121.0, 24.45]) +
          reg([[120.15, 23.5], [120.45, 23.5], [120.55, 22.7], [120.3, 22.7]], '#eb6834', '🍬 糖', [120.4, 23.15]) +
          `<path d="M${TP([120.35, 22.9]).join(' ')} Q${TP([120.2, 24.0]).join(' ')} ${TP([121.3, 25.0]).join(' ')}" fill="none" stroke="#E53950" stroke-width="3" marker-end="url(#qm-ar)"/>` +
          `<text x="${TP([119.95, 24.0])[0]}" y="${TP([119.95, 24.0])[1]}" font-size="12" font-weight="700" fill="#E53950" stroke="#fff" stroke-width="3" paint-order="stroke">經濟重心北移</text>`;
      }
      const dots = L.items.map(s => {
        const [x, y] = TP(s.ll), on = pick === s.k;
        return `<g data-k="${s.k}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="${on ? 12 : 9}" fill="${L.col}" stroke="${on ? '#5D4037' : '#fff'}" stroke-width="3"/></g>`;
      }).join('');
      el.querySelector('.stage').innerHTML = `<svg viewBox="0 0 330 570" style="max-width:320px;display:block;margin:0 auto" role="img" aria-label="清帝國時期的臺灣：${L.name}">
        <defs><marker id="qm-ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#E53950"/></marker></defs>
        <rect width="330" height="570" rx="16" fill="#CFE8FA"/><polygon points="${TW}" fill="#E8F5E9" stroke="#5E9E62" stroke-width="2"/>${extra}${dots}
        <text x="320" y="562" text-anchor="end" font-size="10" fill="#78909C">示意圖</text></svg>`;
      el.querySelectorAll('[data-k]').forEach(g => g.addEventListener('click', () => { pick = g.dataset.k; draw(); }));
      const s = L.items.find(x => x.k === pick);
      el.querySelector('.side').innerHTML = (s ? `<div class="mini cream"><h4><span style="color:${L.col}">●</span> ${s.k}</h4><p>${s.txt}</p></div>` : '<div class="say">點地圖上的圓點或下方名稱，看看清帝國時期的臺灣發生了什麼事。</div>') +
        `<ul class="dots" style="margin-top:8px">${L.items.map(x => `<li style="cursor:pointer${x.k === pick ? ';font-weight:800' : ''}" data-li="${x.k}"><span style="color:${L.col}">●</span> ${x.k}</li>`).join('')}</ul>`;
      el.querySelectorAll('[data-li]').forEach(li => li.addEventListener('click', () => { pick = li.dataset.li; draw(); }));
    }
    draw();
  }

  /* ---------------- 漢人開墾範圍與漢番界線 ---------------- */
  function boundary(el) {
    let t = 0;
    const OLD = [[121.45, 25.22], [121.1, 24.95], [120.82, 24.62], [120.58, 24.22], [120.38, 23.8], [120.3, 23.3], [120.32, 22.9], [120.5, 22.5], [120.7, 22.05]];
    const NEW = [[121.78, 25.05], [121.45, 24.8], [121.12, 24.5], [120.88, 24.1], [120.68, 23.6], [120.58, 23.1], [120.62, 22.7], [120.78, 22.3], [120.82, 21.95]];
    const YILAN = [[121.72, 24.95], [121.95, 24.95], [121.87, 24.6], [121.72, 24.55], [121.62, 24.72]];
    el.innerHTML = `<div class="controls"><label>⏳ 時間（清帝國前期 → 後期） <input type="range" min="0" max="100" value="0"></label></div>
      <div class="split" style="align-items:center"><div class="stage"></div><div class="side"></div></div>`;
    const r = el.querySelector('input'); r.oninput = () => { t = +r.value; draw(); };
    function draw() {
      const k = t / 100;
      const cur = OLD.map((p, i) => [p[0] + (NEW[i][0] - p[0]) * k, p[1] + (NEW[i][1] - p[1]) * k]);
      const area = [[119.5, 25.5]].concat(cur).concat([[119.5, 21.8]]);
      el.querySelector('.stage').innerHTML = `<svg viewBox="0 0 330 570" style="max-width:300px;display:block;margin:0 auto" role="img" aria-label="漢人開墾範圍擴大 ${t}%">
        <defs><clipPath id="bd-tw"><polygon points="${TW}"/></clipPath></defs>
        <rect width="330" height="570" rx="16" fill="#CFE8FA"/><polygon points="${TW}" fill="#E8F5E9" stroke="#5E9E62" stroke-width="2"/>
        <polygon points="${pts(area)}" fill="#FFCC80" opacity="0.75" clip-path="url(#bd-tw)"/>
        ${k > 0.55 ? `<polygon points="${pts(YILAN)}" fill="#FFCC80" opacity="${Math.min(0.75, (k - 0.55) * 3)}" clip-path="url(#bd-tw)"/>` : ''}
        <polyline points="${pts(OLD)}" fill="none" stroke="#E53950" stroke-width="3"/>
        ${k > 0.02 ? `<polyline points="${pts(cur)}" fill="none" stroke="#2a78d6" stroke-width="3" stroke-dasharray="${k < 1 ? '6 4' : '0'}"/>` : ''}
        <text x="${TP([120.0, 23.6])[0]}" y="${TP([120.0, 23.6])[1]}" font-size="13" font-weight="700" fill="#8D4E00" stroke="#fff" stroke-width="3" paint-order="stroke">漢人開墾區</text>
        <text x="${TP([121.05, 23.3])[0]}" y="${TP([121.05, 23.3])[1]}" font-size="13" font-weight="700" fill="#2E7D32" stroke="#fff" stroke-width="3" paint-order="stroke">原住民生活空間</text>
        ${k > 0.55 ? `<text x="${TP([121.7, 24.45])[0]}" y="${TP([121.7, 24.45])[1]}" font-size="11" font-weight="700" fill="#8D4E00" stroke="#fff" stroke-width="3" paint-order="stroke">宜蘭</text>` : ''}
        <text x="320" y="562" text-anchor="end" font-size="10" fill="#78909C">示意圖</text></svg>`;
      el.querySelector('.side').innerHTML = `<div class="legend" style="justify-content:flex-start"><span><i style="background:#E53950"></i>紅線：較早期的舊界線（近海岸、河口）</span><span><i style="background:#2a78d6"></i>藍線：較晚期的新界線（近山區）</span></div>
        <div class="say">${k < 0.3 ? '清帝國為避免漢人侵犯山地原住民，劃設界線隔離。拖動時間看看界線怎麼變化。'
          : k < 0.9 ? '漢人人數愈來愈多，土地需求增加，時常<b>越界開墾</b>，界線一再往山區移動。' + (k > 0.55 ? '吳沙也招募漢人到<b>宜蘭</b>開墾，部分噶瑪蘭族人遷居花蓮等地。' : '')
            : '界線從海岸移到山區：<mark>漢人開墾範圍擴大</mark>，山區原住民的生活空間<b>持續縮減</b>；平埔族群有些被迫離開家園。'}</div>`;
    }
    draw();
  }

  /* ---------------- 清帝國治臺時間軸 ---------------- */
  function qingTimeline(el) {
    const EV = [
      { y: 1684, t: '納入版圖', d: '清帝國將臺灣納入版圖，並頒布限制人民渡海來臺的禁令（須申請、不准攜帶家眷）。', late: false },
      { y: 1721, t: '朱一貴事件', d: '「鴨母王」朱一貴不滿官員壓迫而起事，一度攻下府城；事後清帝國增設行政區。', late: false },
      { y: 1786, t: '林爽文事件', d: '清帝國時期規模最大的民變，清廷派兵鎮壓；諸羅改名為「嘉義」。', late: false },
      { y: 1858, t: '開港通商', d: '1860 年代西方國家迫使清帝國開放雞籠、淡水、安平、打狗為通商港口。', late: true },
      { y: 1874, t: '牡丹社事件', d: '日本以琉球人遇害為藉口出兵；沈葆楨來臺，興建西式砲臺、恆春城，強化防務。', late: true },
      { y: 1884, t: '清法戰爭', d: '戰火波及基隆、淡水，劉銘傳來臺指揮作戰。', late: true },
      { y: 1885, t: '臺灣建省', d: '臺灣從福建省分出建省，劉銘傳擔任首任巡撫，推動鐵路、電報、新式輪船等現代化建設。', late: true }
    ];
    let pick = 0;
    el.innerHTML = `<div class="stage"></div><div class="say"></div>`;
    function draw() {
      const X = y => 30 + (y - 1680) / (1890 - 1680) * 300;
      let s = `<svg viewBox="0 0 360 140" role="img" aria-label="清帝國治臺時間軸">
        <rect x="${X(1684)}" y="70" width="${X(1858) - X(1684)}" height="12" rx="6" fill="#2a78d6" opacity="0.35"/>
        <rect x="${X(1858)}" y="70" width="${X(1890) - X(1858)}" height="12" rx="6" fill="#eb6834" opacity="0.45"/>
        <text x="30" y="16" font-size="12" font-weight="700" fill="#1E5AA8">■ 清帝國治臺前期：消極管理</text>
        <text x="330" y="16" text-anchor="end" font-size="12" font-weight="700" fill="#B8481C">■ 後期：積極建設</text>`;
      EV.forEach((e, i) => {
        const x = X(e.y), up = i % 2 === 0, on = i === pick, lx = 32 + i * 49; // 標籤平均排列，再用線連到年代位置
        s += `<g data-i="${i}" style="cursor:pointer"><line x1="${lx}" y1="${up ? 62 : 90}" x2="${x}" y2="76" stroke="#BCAAA4"/>
          <circle cx="${x}" cy="76" r="${on ? 9 : 6}" fill="${e.late ? '#eb6834' : '#2a78d6'}" stroke="#fff" stroke-width="2"/>
          <text x="${lx}" y="${up ? 40 : 118}" text-anchor="middle" font-size="10.5" font-weight="${on ? 800 : 700}" fill="${on ? '#E53950' : '#5D4037'}">${e.y}</text>
          <text x="${lx}" y="${up ? 54 : 132}" text-anchor="middle" font-size="10" fill="${on ? '#E53950' : '#5D4037'}">${e.t}</text></g>`;
      });
      s += '</svg>';
      el.querySelector('.stage').innerHTML = s;
      el.querySelectorAll('[data-i]').forEach(g => g.addEventListener('click', () => { pick = +g.dataset.i; draw(); }));
      const e = EV[pick];
      el.querySelector('.say').innerHTML = `<b>${e.y} 年｜${e.t}</b>：${e.d}`;
    }
    draw();
  }

  window.UnitWidgets = { qingMap, boundary, qingTimeline };
})();
