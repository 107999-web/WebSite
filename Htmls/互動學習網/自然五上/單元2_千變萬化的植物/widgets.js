/* =========================================================
 * 自然五上・單元2 千變萬化的植物｜互動實驗元件
 * 每個元件都是 function(容器元素, 參數)，由 data.js 以 widget 名稱呼叫
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
  /* 在元件被移出畫面後自動停止的動畫迴圈 */
  function animate(el, draw) {
    let start = null, id;
    const step = ts => {
      if (!el.isConnected) return;
      if (start === null) start = ts;
      if (el.offsetParent !== null) draw((ts - start) / 1000); // 分頁隱藏時不重繪
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- 2-1 海邊與高山植物的適應 ---------------- */
  function adaptExplorer(el) {
    const ENV = {
      coast: {
        name: '🌊 海邊', bg: '#E3F2FD', ground: '#F5E6C8',
        challenges: ['缺水', '強風', '高鹽', '土壤缺氧'],
        plants: [
          { name: '海茄苳', icon: '🌳', feats: [['葉面硬挺、呈皮革狀', ['缺水'], '防止水分散失'], ['長出呼吸根', ['土壤缺氧'], '獲取氧氣']] },
          { name: '濱水菜', icon: '🌸', feats: [['葉面有蠟質', ['缺水'], '防止水分散失'], ['肉質葉', ['高鹽'], '儲存水分和養分、耐鹽']] },
          { name: '木麻黃', icon: '🌲', feats: [['葉子極小', ['缺水'], '減少水分散失'], ['板根', ['強風'], '更牢固的立於地面']] }
        ]
      },
      mountain: {
        name: '⛰️ 高山', bg: '#EDE7F6', ground: '#D7CCC8',
        challenges: ['強風', '低溫', '日晒強', '土壤貧瘠'],
        plants: [
          { name: '玉山薄雪草', icon: '🤍', feats: [['葉面有絨毛', ['缺水'], '防止水分散失'], ['全株具有絨毛', ['低溫', '日晒強'], '抵抗低溫和日晒']] },
          { name: '玉山杜鵑', icon: '🌺', feats: [['葉面有蠟質', ['缺水'], '防止水分散失'], ['植株矮小、莖緊貼地面', ['強風'], '適應強風']] },
          { name: '玉山圓柏', icon: '🌲', feats: [['針狀葉', ['缺水'], '防止水分散失'], ['莖彎曲生長', ['強風'], '適應強風']] }
        ]
      }
    };
    let env = 'coast', pick = null;
    el.innerHTML = `<div class="controls env"></div><div class="controls chips"></div><div class="stage"></div><div class="say"></div>`;
    seg(el.querySelector('.env'), [['coast', '🌊 海邊環境'], ['mountain', '⛰️ 高山環境']], env, v => { env = v; pick = null; draw(); });
    function draw() {
      const E = ENV[env];
      const chips = el.querySelector('.chips');
      chips.innerHTML = '<b>環境挑戰：</b>';
      const list = env === 'mountain' ? ['缺水', ...E.challenges] : E.challenges;
      seg(chips, list.map(c => [c, c]), pick, v => { pick = v; draw(); });
      const cards = E.plants.map(p => {
        const rows = p.feats.map(f => {
            const hit = pick && f[1].includes(pick);
            return `<li style="${hit ? 'background:#FFE9B8;border-radius:10px;font-weight:700' : ''}">${hit ? '👉 ' : ''}<b>${f[0]}</b>：${f[2]}</li>`;
          });
        const any = pick && p.feats.some(f => f[1].includes(pick));
        return `<div class="mini" style="background:${any ? '#FFFDE7' : '#fff'};border-color:${any ? '#FFB74D' : 'var(--line)'}">
          <h4><span style="font-size:1.6rem">${p.icon}</span> ${p.name}</h4><ul class="dots">${rows.join('')}</ul></div>`;
      }).join('');
      el.querySelector('.stage').innerHTML = `<div style="background:${E.bg};border-radius:18px;padding:12px">
        <div class="split">${cards}</div></div>`;
      const who = pick ? E.plants.filter(p => p.feats.some(f => f[1].includes(pick))).map(p => p.name) : [];
      el.querySelector('.say').innerHTML = pick
        ? `面對「<b>${pick}</b>」：${who.join('、')} 發展出特別的構造來適應（橘色框）。`
        : `${E.name}的植物要面對：<b>${E.challenges.join('、')}</b>。點選上面的環境挑戰，看看哪些植物用什麼構造來適應！`;
    }
    draw();
  }

  /* ---------------- 2-2 光合作用 ---------------- */
  function photosynthesis(el) {
    const s = { sun: true, water: true, co2: true };
    el.innerHTML = `<div class="controls"></div><div class="stage"></div><div class="say"></div>`;
    const c = el.querySelector('.controls');
    c.insertAdjacentHTML('beforeend', '<b>給葉子：</b>');
    toggle(c, '☀️ 陽光', true, v => { s.sun = v; });
    toggle(c, '💧 水', true, v => { s.water = v; });
    toggle(c, '🌫️ 二氧化碳', true, v => { s.co2 = v; });
    const stage = el.querySelector('.stage'), say = el.querySelector('.say');
    let last = '';
    const draw = t => {
      const ok = s.sun && s.water && s.co2;
      const key = [s.sun, s.water, s.co2].join();
      const bubbles = ok ? [0, 1, 2, 3].map(i => {
        const p = ((reduceMotion ? 0.5 : t * 0.35) + i / 4) % 1;
        return `<circle cx="${430 + 30 * Math.sin(i * 2 + p * 6)}" cy="${150 - p * 120}" r="${7 + i}" fill="#BFE6FF" stroke="#5B9BD5" stroke-width="2" opacity="${1 - p}"/>
          <text x="${430 + 30 * Math.sin(i * 2 + p * 6)}" y="${154 - p * 120}" font-size="8" text-anchor="middle" fill="#2F6FA8" opacity="${1 - p}">O₂</text>`;
      }).join('') : '';
      const sugar = ok ? [0, 1, 2].map(i => {
        const p = ((reduceMotion ? 0.5 : t * 0.3) + i / 3) % 1;
        return `<text x="${300 + p * 40}" y="${210 + p * 70}" font-size="18" opacity="${1 - p * 0.7}">🍬</text>`;
      }).join('') : '';
      stage.innerHTML = `<svg viewBox="0 0 600 300" role="img" aria-label="光合作用示意圖">
        <rect width="600" height="300" rx="20" fill="${s.sun ? '#FFFDE7' : '#E8EAF6'}"/>
        ${s.sun ? '<circle cx="70" cy="60" r="30" fill="#FFC93C" stroke="#F4A300" stroke-width="3"/><line x1="105" y1="80" x2="220" y2="130" stroke="#F4A300" stroke-width="3" stroke-dasharray="8 6"/><text x="120" y="70" font-size="15" fill="#8D6E63">陽光（能量）</text>' : '<text x="40" y="60" font-size="15" fill="#8D6E63">🌙 沒有陽光</text>'}
        <path d="M200 160 Q300 60 420 150 Q300 250 200 160 Z" fill="${ok ? '#7CCB8B' : '#A5C9A8'}" stroke="#3E8E54" stroke-width="3"/>
        <path d="M200 160 Q310 155 420 150" stroke="#3E8E54" stroke-width="2" fill="none"/>
        <text x="290" y="165" font-size="16" font-weight="800" fill="#1F5F33">葉子</text>
        ${s.co2 ? '<text x="40" y="160" font-size="15" fill="#5D4037">二氧化碳 CO₂</text><line x1="150" y1="155" x2="198" y2="158" stroke="#8D6E63" stroke-width="3" marker-end="url(#ph)"/>' : ''}
        ${s.water ? '<text x="140" y="275" font-size="15" fill="#2F6FA8">水（從根吸收）</text><line x1="230" y1="258" x2="250" y2="190" stroke="#5B9BD5" stroke-width="3" marker-end="url(#ph)"/>' : ''}
        <defs><marker id="ph" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#8D6E63"/></marker></defs>
        ${ok ? '<text x="470" y="70" font-size="15" fill="#2F6FA8" font-weight="700">氧氣 → 大氣</text><text x="350" y="285" font-size="15" fill="#A87900" font-weight="700">養分 → 供植物生長</text>' : ''}
        ${bubbles}${sugar}
      </svg>`;
      if (key !== last) {
        last = key;
        const miss = [!s.sun && '陽光', !s.water && '水', !s.co2 && '二氧化碳'].filter(Boolean);
        say.innerHTML = ok
          ? '✅ 陽光照射葉子，把<b>水</b>和<b>二氧化碳</b>轉換成<mark>養分</mark>和<mark>氧氣</mark>，這就是<b>光合作用</b>。氧氣釋放到大氣中，成為生物呼吸所需。'
          : `❌ 少了<b>${miss.join('、')}</b>，葉子沒辦法進行光合作用，不能製造養分。`;
      }
    };
    animate(el, draw);
  }

  /* ---------------- 2-2 植物體內水分輸送（紅色色素水） ---------------- */
  function waterTransport(el) {
    let p = 0, cut = 'none';
    el.innerHTML = `<div class="controls"><label>⏳ 經過時間 <input type="range" min="0" max="100" value="0" aria-label="經過時間"></label><b class="tm">剛開始</b></div>
      <div class="controls cuts"></div><div class="split"><div class="stage"></div><div class="xs"></div></div><div class="readout"></div><div class="say"></div>`;
    const r = el.querySelector('input');
    r.oninput = () => { p = Number(r.value) / 100; draw(); };
    seg(el.querySelector('.cuts'), [['none', '看整株'], ['stem', '🔪 切開莖'], ['root', '🔪 切開根'], ['leaf', '🔍 看葉子']], cut, v => { cut = v; draw(); });
    const RED = '#E53950';
    function draw() {
      const rootR = Math.min(1, p / 0.3), stemR = Math.max(0, Math.min(1, (p - 0.3) / 0.4)), leafR = Math.max(0, (p - 0.7) / 0.3);
      el.querySelector('.tm').textContent = p === 0 ? '剛開始' : p < 0.4 ? '一小段時間後' : p < 0.8 ? '半天後' : '一天後';
      const level = 250 - 48 + p * 28; // 水面 y 座標，會下降
      const stemTop = 60, stemBot = 215;
      const redY = stemBot - (stemBot - stemTop) * stemR;
      const leaf = (x, y, dir) => `<path d="M${x} ${y} q${dir * 40} -30 ${dir * 70} -8 q${-dir * 30} 25 ${-dir * 70} 8z" fill="#8BC98F" stroke="#3E8E54" stroke-width="2"/>
        <path d="M${x} ${y} q${dir * 35} -10 ${dir * 70} -8" stroke="${leafR > 0 ? RED : '#3E8E54'}" stroke-width="${1.5 + leafR * 2}" fill="none" opacity="${0.5 + leafR * 0.5}"/>`;
      el.querySelector('.stage').innerHTML = `<svg viewBox="0 0 300 330" role="img" aria-label="植物水分輸送實驗">
        <path d="M110 200 L110 170 L190 170 L190 200 L250 310 Q255 320 245 320 L55 320 Q45 320 50 310 Z" fill="#F7FBFF" stroke="#90A4AE" stroke-width="3"/>
        <clipPath id="fl"><path d="M110 200 L190 200 L250 310 Q255 320 245 320 L55 320 Q45 320 50 310 Z"/></clipPath>
        <rect x="40" y="${level}" width="220" height="${330 - level}" fill="#F48FA0" opacity=".75" clip-path="url(#fl)"/>
        <line x1="60" y1="${250 - 48}" x2="80" y2="${250 - 48}" stroke="#5D4037" stroke-width="2"/><text x="20" y="${250 - 44}" font-size="11" fill="#5D4037">記號</text>
        <rect x="108" y="163" width="84" height="12" rx="4" fill="#BCAAA4"/><text x="200" y="172" font-size="11" fill="#8D6E63">膠泥封口</text>
        <line x1="150" y1="${stemTop}" x2="150" y2="${stemBot}" stroke="#6DAE6F" stroke-width="10" stroke-linecap="round"/>
        <line x1="150" y1="${redY}" x2="150" y2="${stemBot}" stroke="${RED}" stroke-width="4" opacity="${stemR > 0 ? 0.9 : 0}"/>
        ${[[-1, 230, -30], [1, 235, 25], [-1, 250, -10], [1, 255, 35], [0, 265, 0]].map(([d, y, dx]) => `<path d="M150 ${stemBot} q${dx} ${y - stemBot - 5} ${dx * 1.6} ${y - stemBot + 25}" stroke="${rootR > 0.1 ? RED : '#C8A27A'}" stroke-width="3" fill="none" opacity="${0.5 + rootR * 0.5}"/>`).join('')}
        ${leaf(150, 150, -1)}${leaf(150, 120, 1)}${leaf(150, 95, -1)}${leaf(150, 72, 1)}
        <text x="10" y="40" font-size="12" fill="#8D6E63">紅色食用色素水約 150 mL</text>
      </svg>`;
      const circ = (label, rr) => `<svg viewBox="0 0 200 200" style="max-width:220px" role="img" aria-label="${label}">
        <circle cx="100" cy="95" r="70" fill="#E8F5E9" stroke="#6DAE6F" stroke-width="4"/>
        <circle cx="100" cy="95" r="${22 + 30 * rr}" fill="${RED}" opacity="${0.15 + rr * 0.6}"/>
        <text x="100" y="190" text-anchor="middle" font-size="14" fill="#5D4037">${label}</text></svg>`;
      const xs = el.querySelector('.xs');
      if (cut === 'stem') xs.innerHTML = `<div style="text-align:center">${circ('莖的橫切面', stemR)}</div>`;
      else if (cut === 'root') xs.innerHTML = `<div style="text-align:center">${circ('根的橫切面', rootR)}</div>`;
      else if (cut === 'leaf') xs.innerHTML = `<div style="text-align:center"><svg viewBox="0 0 200 200" style="max-width:220px" role="img" aria-label="用放大鏡看葉子">
          <circle cx="100" cy="95" r="80" fill="#fff" stroke="#6D5A55" stroke-width="6"/>
          <path d="M40 95 q60 -60 120 0 q-60 60 -120 0z" fill="#8BC98F"/>
          ${[0, 1, 2, 3].map(i => `<path d="M40 95 L160 95 M${70 + i * 20} 95 l15 ${i % 2 ? 22 : -22}" stroke="${leafR > 0 ? RED : '#3E8E54'}" stroke-width="${1 + leafR * 2}" fill="none"/>`).join('')}
          <text x="100" y="190" text-anchor="middle" font-size="14" fill="#5D4037">放大鏡看葉脈</text></svg></div>`;
      else xs.innerHTML = '<p class="hint" style="margin-top:40px">實驗後，可以把莖、根切開，或用放大鏡看葉子，觀察有沒有變紅。</p>';
      el.querySelector('.readout').innerHTML = `<span>錐形瓶水位 <b>${p === 0 ? '在記號上' : '比記號低'}</b></span>
        <span>根 <b>${rootR > 0.1 ? '變紅' : '沒變'}</b></span><span>莖 <b>${stemR > 0.1 ? '變紅' : '沒變'}</b></span><span>葉 <b>${leafR > 0.1 ? '變紅' : '沒變'}</b></span>`;
      el.querySelector('.say').innerHTML = p < 0.05
        ? '把植物的根放進紅色水裡，用膠泥封住瓶口（避免水蒸發），在水位做記號。拖動時間看看！'
        : p < 0.99 ? '水位慢慢<b>下降</b>，紅色從<b>根</b>往上跑到<b>莖</b>，再到<b>葉</b>……'
          : '✅ 水位下降，根、莖、葉都變紅：水分是<mark>從根部進入植物體</mark>，經過莖，輸送到葉等植物體各部位。';
    }
    draw();
  }

  /* ---------------- 2-2 葉面水分蒸散（夾鏈袋） ---------------- */
  function transpiration(el) {
    let leaf = 'normal', sun = true, soil = true, t = 0;
    el.innerHTML = `<div class="controls leafsel"></div>
      <div class="controls opts"></div>
      <div class="controls"><label>⏳ 套上夾鏈袋後經過 <input type="range" min="0" max="60" step="5" value="0" aria-label="經過時間"></label><b class="tm">0 分鐘</b></div>
      <div class="split"><div class="stage"></div><div class="pore"></div></div><div class="say"></div>`;
    seg(el.querySelector('.leafsel'), [['normal', '🍃 一般的葉'], ['big', '🍀 血桐（大又薄）'], ['cactus', '🌵 仙人掌（針狀）']], leaf, v => { leaf = v; draw(); });
    const o = el.querySelector('.opts');
    toggle(o, '☀️ 陽光照射', true, v => { sun = v; draw(); });
    toggle(o, '💧 土壤水分充足', true, v => { soil = v; draw(); });
    const r = el.querySelector('input');
    r.oninput = () => { t = Number(r.value); draw(); };
    function draw() {
      el.querySelector('.tm').textContent = t + ' 分鐘';
      const rate = { normal: 1, big: 1.8, cactus: 0.08 }[leaf] * (sun ? 1 : 0.35) * (soil ? 1 : 0.1);
      const n = Math.min(40, Math.round(t * rate * 0.7));
      let drops = '';
      for (let i = 0; i < n; i++) drops += `<ellipse cx="${120 + (i * 53) % 190}" cy="${70 + (i * 37) % 150}" rx="4" ry="5" fill="#90CAF9" stroke="#5B9BD5"/>`;
      const shape = leaf === 'cactus'
        ? `<rect x="190" y="110" width="40" height="120" rx="20" fill="#7CB342"/>${[0, 1, 2, 3, 4].map(i => `<line x1="190" y1="${125 + i * 22}" x2="175" y2="${120 + i * 22}" stroke="#5D4037" stroke-width="2"/><line x1="230" y1="${125 + i * 22}" x2="245" y2="${120 + i * 22}" stroke="#5D4037" stroke-width="2"/>`).join('')}`
        : leaf === 'big'
          ? '<path d="M210 230 C90 190 90 70 210 60 C330 70 330 190 210 230Z" fill="#81C784" stroke="#3E8E54" stroke-width="3"/><path d="M210 230 L210 70" stroke="#3E8E54" stroke-width="2"/>'
          : '<path d="M210 230 C150 190 150 100 210 70 C270 100 270 190 210 230Z" fill="#81C784" stroke="#3E8E54" stroke-width="3"/><path d="M210 230 L210 80" stroke="#3E8E54" stroke-width="2"/>';
      el.querySelector('.stage').innerHTML = `<svg viewBox="0 0 420 300" role="img" aria-label="用夾鏈袋套住葉子">
        <rect width="420" height="300" rx="20" fill="${sun ? '#FFFDE7' : '#ECEFF1'}"/>
        ${sun ? '<circle cx="370" cy="40" r="22" fill="#FFC93C" stroke="#F4A300" stroke-width="3"/>' : ''}
        <line x1="210" y1="300" x2="210" y2="232" stroke="#6DAE6F" stroke-width="8"/>
        ${shape}
        <path d="M100 50 L320 50 L330 250 L90 250 Z" fill="#E3F2FD" opacity=".45" stroke="#90A4AE" stroke-width="3" stroke-dasharray="${t ? 0 : 6}"/>
        <rect x="160" y="248" width="100" height="10" rx="4" fill="#90A4AE"/><text x="268" y="262" font-size="12" fill="#5D4037">袋口密封</text>
        ${drops}
      </svg>`;
      const open = soil;
      el.querySelector('.pore').innerHTML = `<div style="text-align:center"><svg viewBox="0 0 200 200" style="max-width:200px" role="img" aria-label="氣孔${open ? '打開' : '關閉'}">
        <circle cx="100" cy="92" r="80" fill="#E8F5E9" stroke="#6D5A55" stroke-width="5"/>
        <path d="M100 42 C${open ? 55 : 88} 70 ${open ? 55 : 88} 115 100 142 C${open ? 70 : 92} 115 ${open ? 70 : 92} 70 100 42Z" fill="#66BB6A"/>
        <path d="M100 42 C${open ? 145 : 112} 70 ${open ? 145 : 112} 115 100 142 C${open ? 130 : 108} 115 ${open ? 130 : 108} 70 100 42Z" fill="#66BB6A"/>
        <text x="100" y="192" text-anchor="middle" font-size="14" fill="#5D4037">葉片上的氣孔：${open ? '打開' : '關閉'}</text></svg></div>`;
      let msg;
      if (t === 0) msg = '用夾鏈袋套住一片葉子並封住袋口，拖動時間看看袋子裡會出現什麼？';
      else if (!soil) msg = '土壤缺水時，葉面的<b>氣孔會自動關閉</b>，減少水分散失，所以袋子裡幾乎沒有水滴。';
      else if (leaf === 'cactus') msg = '仙人掌的葉呈<b>針狀</b>，可以<mark>減少水分蒸散</mark>，所以袋子裡幾乎沒有水滴。';
      else msg = `袋子裡出現${n > 15 ? '很多' : '一些'}<b>小水滴</b>：水從葉片以<b>水蒸氣</b>的形態散發出來，這就是<mark>蒸散作用</mark>。${leaf === 'big' ? '血桐的葉又大又薄，可以吸收大量陽光，並<b>加快</b>水分蒸散。' : ''}${sun ? '' : '沒有陽光時，蒸散比較慢。'}`;
      el.querySelector('.say').innerHTML = msg;
    }
    draw();
  }

  /* ---------------- 2-3 花的構造與結果 ---------------- */
  function flowerLab(el) {
    const INFO = {
      petal: ['花瓣', '顏色、形狀、氣味可以吸引昆蟲等動物來幫忙傳播花粉。'],
      sepal: ['花萼', '在花的最外層，花還是花苞時可以保護花。'],
      anther: ['花藥（雄蕊）', '雄蕊的一部分，裡面有很多<b>花粉粒</b>。'],
      filament: ['花絲（雄蕊）', '支撐花藥的細長構造。'],
      stigma: ['柱頭（雌蕊）', '接受花粉的地方。花粉傳到柱頭上，叫做<b>授粉</b>。'],
      style: ['花柱（雌蕊）', '連接柱頭和子房。'],
      ovary: ['子房（雌蕊）', '授粉後會發育成<b>果實</b>。'],
      ovule: ['胚珠（雌蕊）', '在子房裡面，和花粉結合後會發育成<b>種子</b>。']
    };
    let stage = 1, part = null;
    el.innerHTML = `<div class="controls steps"></div><div class="split"><div class="stage"></div><div class="info"></div></div><div class="say"></div>`;
    seg(el.querySelector('.steps'), [[1, '① 開花'], [2, '② 授粉'], [3, '③ 結果']], stage, v => { stage = v; part = null; draw(); });
    function draw() {
      const hl = k => part === k ? 'stroke="#E86A8D" stroke-width="4"' : '';
      let svg = `<svg viewBox="0 0 360 330" role="img" aria-label="花的構造剖面圖">
        <rect width="360" height="330" rx="20" fill="#FFF8FB"/>
        <line x1="180" y1="330" x2="180" y2="250" stroke="#6DAE6F" stroke-width="10"/>`;
      if (stage < 3) {
        svg += `<path data-p="sepal" d="M180 250 Q120 245 110 205 Q150 225 180 232 Q210 225 250 205 Q240 245 180 250Z" fill="#8BC98F" ${hl('sepal')}/>
          <path data-p="petal" d="M150 230 Q70 200 75 110 Q120 150 160 215Z" fill="#FFB3C7" ${hl('petal')}/>
          <path data-p="petal" d="M210 230 Q290 200 285 110 Q240 150 200 215Z" fill="#FFB3C7" ${hl('petal')}/>
          <path data-p="ovary" d="M180 240 C145 240 150 190 180 188 C210 190 215 240 180 240Z" fill="#AED581" stroke="#7CB342" stroke-width="2" ${hl('ovary')}/>
          <circle data-p="ovule" cx="170" cy="220" r="6" fill="#FFF59D" stroke="#C0A000" ${hl('ovule')}/><circle data-p="ovule" cx="190" cy="222" r="6" fill="#FFF59D" stroke="#C0A000" ${hl('ovule')}/><circle data-p="ovule" cx="180" cy="206" r="6" fill="#FFF59D" stroke="#C0A000" ${hl('ovule')}/>
          <rect data-p="style" x="175" y="110" width="10" height="80" rx="4" fill="#C5E1A5" ${hl('style')}/>
          <ellipse data-p="stigma" cx="180" cy="104" rx="18" ry="9" fill="#9CCC65" ${hl('stigma')}/>
          <line data-p="filament" x1="160" y1="225" x2="130" y2="135" stroke="#F8BBD0" stroke-width="5" ${hl('filament')}/>
          <line data-p="filament" x1="200" y1="225" x2="230" y2="135" stroke="#F8BBD0" stroke-width="5" ${hl('filament')}/>
          <ellipse data-p="anther" cx="128" cy="128" rx="10" ry="14" fill="#FFCA28" ${hl('anther')}/>
          <ellipse data-p="anther" cx="232" cy="128" rx="10" ry="14" fill="#FFCA28" ${hl('anther')}/>`;
        if (stage === 2) svg += `${[0, 1, 2, 3, 4].map(i => `<circle cx="${170 + i * 5}" cy="${100 + (i % 2) * 4}" r="3" fill="#FFB300"/>`).join('')}
          <text x="230" y="80" font-size="30">🐝</text><path d="M140 118 Q170 70 176 96" stroke="#FFB300" stroke-width="2" stroke-dasharray="4 4" fill="none"/>
          <text x="60" y="60" font-size="14" fill="#A87900" font-weight="700">花粉傳到柱頭上＝授粉</text>`;
      } else {
        svg += `<circle data-p="ovary" cx="180" cy="190" r="72" fill="#FFA726" stroke="#EF6C00" stroke-width="3" ${hl('ovary')}/>
          <circle cx="180" cy="190" r="56" fill="#FFCC80"/>
          ${[[160, 175], [200, 175], [180, 212], [158, 205], [202, 205]].map(([x, y]) => `<ellipse data-p="ovule" cx="${x}" cy="${y}" rx="8" ry="11" fill="#FFFDE7" stroke="#8D6E63" stroke-width="2" ${hl('ovule')}/>`).join('')}
          <path d="M180 250 Q140 262 125 250 M180 250 Q220 262 235 250" stroke="#6DAE6F" stroke-width="5" fill="none"/>
          <text x="20" y="40" font-size="14" fill="#E65100" font-weight="700">子房 → 果實　胚珠 → 種子</text>`;
      }
      svg += '</svg>';
      el.querySelector('.stage').innerHTML = svg;
      el.querySelectorAll('[data-p]').forEach(n => { n.style.cursor = 'pointer'; n.addEventListener('click', () => { part = n.dataset.p; draw(); }); });
      const info = el.querySelector('.info');
      if (part) {
        const [name, txt] = stage === 3 && part === 'ovary' ? ['果實', '由子房發育而成，可以<b>保護種子並幫助傳播</b>。']
          : stage === 3 && part === 'ovule' ? ['種子', '由胚珠發育而成，可以<b>發芽、成長為新的個體</b>。'] : INFO[part];
        info.innerHTML = `<div class="mini cream" style="margin-top:20px"><h4>🔎 ${name}</h4><p>${txt}</p></div>`;
      } else {
        info.innerHTML = `<div class="mini" style="margin-top:20px"><h4>👆 點點看</h4><p>點選花的各個部位，看看它的名稱和功能。</p>
          <ul class="dots"><li><b>雄蕊</b>：花藥＋花絲</li><li><b>雌蕊</b>：柱頭＋花柱＋子房（裡面有胚珠）</li></ul></div>`;
      }
      el.querySelector('.say').innerHTML = [
        '',
        '開花：花的基本構造有<b>雄蕊、雌蕊、花瓣、花萼</b>，其中雄蕊和雌蕊是植物繁衍的重要部位。',
        '授粉：雄蕊上的<b>花粉</b>傳到雌蕊的<b>柱頭</b>上。可以靠動物（蜜蜂）、風力或水力傳播花粉。',
        '結果：花粉和<b>胚珠</b>結合發育成<mark>種子</mark>，外側的<b>子房</b>發育成<mark>果實</mark>。'
      ][stage];
    }
    draw();
  }

  /* ---------------- 2-3 果實和種子的傳播 ---------------- */
  function seedDispersal(el) {
    const M = {
      wind: ['🌬️ 風力傳播', ['蒲公英（冠毛）、木棉（棉絮）、青楓（薄翅）'], '果實或種子輕、有冠毛、棉絮或薄翅，可以<b>隨風飄</b>到遠處。'],
      water: ['🌊 水力傳播', ['椰子、棋盤腳'], '果實含有纖維質、可以<b>漂浮在水面</b>上，隨著水漂到別處。'],
      animal: ['🐦 動物傳播', ['榕樹（被鳥吃）、大花咸豐草（倒勾刺）'], '鮮豔多汁的果實被動物吃下，種子隨<b>糞便</b>傳到別處；有<b>倒勾刺</b>的果實附在動物身上被帶走。'],
      self: ['💥 自身彈力傳播', ['非洲鳳仙花、黃花酢漿草'], '果實成熟後會<b>裂開</b>，使種子<b>彈射</b>出去。']
    };
    let mode = 'wind';
    el.innerHTML = `<div class="controls"></div><div class="stage"></div><div class="say"></div>`;
    seg(el.querySelector('.controls'), Object.keys(M).map(k => [k, M[k][0]]), mode, v => { mode = v; say(); });
    const stage = el.querySelector('.stage');
    function say() { el.querySelector('.say').innerHTML = `<b>${M[mode][0]}</b>：${M[mode][2]}<br>例子：${M[mode][1]}`; }
    say();
    animate(el, t => {
      const k = reduceMotion ? 0.6 : (t % 5) / 5;
      let s = `<svg viewBox="0 0 600 260" role="img" aria-label="${M[mode][0]}動畫"><rect width="600" height="260" rx="20" fill="#E3F2FD"/>`;
      if (mode === 'wind') {
        s += '<rect y="210" width="600" height="50" fill="#A5D6A7"/><line x1="80" y1="210" x2="80" y2="130" stroke="#6DAE6F" stroke-width="5"/><circle cx="80" cy="120" r="18" fill="#fff" stroke="#E0E0E0" stroke-width="3"/>';
        for (let i = 0; i < 5; i++) {
          const q = (k + i / 5) % 1;
          const x = 90 + q * 480, y = 120 - Math.sin(q * 5 + i) * 30 - q * 40;
          s += `<g transform="translate(${x} ${y})"><line x1="0" y1="0" x2="0" y2="12" stroke="#8D6E63" stroke-width="2"/>${[-40, -20, 0, 20, 40].map(a => `<line x1="0" y1="0" x2="${10 * Math.sin(a * Math.PI / 180)}" y2="${-10 * Math.cos(a * Math.PI / 180)}" stroke="#BDBDBD" stroke-width="1.5"/>`).join('')}</g>`;
        }
        s += '<text x="200" y="40" font-size="26">💨 💨</text>';
      } else if (mode === 'water') {
        let wave = 'M0 160';
        for (let x = 0; x <= 600; x += 20) wave += ` L${x} ${160 + 8 * Math.sin(x / 40 + k * 12)}`;
        s += `<path d="${wave} L600 260 L0 260Z" fill="#64B5F6"/><path d="M0 160 Q40 120 90 150 L90 260 L0 260Z" fill="#FFE0B2"/><text x="20" y="130" font-size="40">🌴</text>`;
        const x = 100 + k * 440;
        s += `<text x="${x}" y="${162 + 8 * Math.sin(x / 40 + k * 12)}" font-size="34">🥥</text>`;
      } else if (mode === 'animal') {
        s += '<rect y="210" width="600" height="50" fill="#A5D6A7"/><text x="30" y="200" font-size="90">🌳</text>';
        const bx = 120 + k * 420, by = 80 + Math.sin(k * 8) * 10;
        s += `<text x="${bx}" y="${by}" font-size="34">🐦</text>`;
        if (k > 0.6) s += `<circle cx="${bx - 10 + (k - 0.6) * 60}" cy="${by + (k - 0.6) * 300}" r="5" fill="#8D6E63"/>`;
        s += `<text x="${480 - k * 300}" y="205" font-size="40">🐕</text><text x="${505 - k * 300}" y="178" font-size="14">✳️</text>
          <text x="320" y="245" font-size="13" fill="#2E7D32">鳥吃榕果，種子隨糞便落下；倒勾刺黏在狗身上</text>`;
      } else {
        s += '<rect y="210" width="600" height="50" fill="#A5D6A7"/><line x1="300" y1="210" x2="300" y2="140" stroke="#6DAE6F" stroke-width="5"/>';
        if (k < 0.3) s += `<ellipse cx="300" cy="130" rx="10" ry="${24 + k * 20}" fill="#81C784" stroke="#388E3C" stroke-width="2"/>`;
        else {
          const q = (k - 0.3) / 0.7;
          s += '<path d="M300 130 q-30 -10 -40 20 M300 130 q30 -10 40 20" stroke="#388E3C" stroke-width="4" fill="none"/>';
          for (let i = 0; i < 6; i++) {
            const a = (i - 2.5) * 0.45, v = 260;
            const x = 300 + Math.sin(a) * v * q, y = 125 - (Math.cos(a) * v * q) + 300 * q * q;
            if (y < 212) s += `<circle cx="${x}" cy="${y}" r="5" fill="#6D4C41"/>`;
          }
          if (q < 0.3) s += '<text x="330" y="100" font-size="26">💥</text>';
        }
      }
      stage.innerHTML = s + '</svg>';
    });
  }

  /* ---------------- 2-4 二分法分類機 ---------------- */
  function dichotomy(el) {
    const P = {
      布袋蓮: { icon: '🪻', water: true, float: true, hair: false },
      蓮: { icon: '🪷', water: true, float: false, up: true },
      睡蓮: { icon: '🌸', water: true, float: false, up: false },
      大萍: { icon: '🥬', water: true, float: true, hair: true },
      樟樹: { icon: '🌳', water: false, woody: true, board: false, creep: false, tuber: false },
      鳳凰木: { icon: '🌲', water: false, woody: true, board: true, creep: false, tuber: false },
      蛇莓: { icon: '🍓', water: false, woody: false, board: false, creep: true, tuber: false },
      甘藷: { icon: '🍠', water: false, woody: false, board: false, creep: true, tuber: true }
    };
    const C = [
      ['water', '生長在水中'], ['float', '全株漂浮在水面上（漂浮性）'], ['hair', '葉面有細毛'], ['up', '葉面挺出水面'],
      ['woody', '有木本莖'], ['board', '有板根'], ['tuber', '可用塊根繁殖'], ['creep', '莖在地面匍匐'], ['flower', '會開花']
    ];
    const BOOK = { c: 'water', y: { c: 'float', y: { c: 'hair' }, n: { c: 'up' } }, n: { c: 'woody', y: { c: 'board' }, n: { c: 'tuber' } } };
    let root;
    const make = names => ({ names, c: null, y: null, n: null });
    function split(node, c) {
      if (c === 'flower') return '這八種植物<b>都會開花</b>，全部都「符合」，沒辦法分成兩群。換一個標準吧！';
      if (node.names.some(n => P[n][c] === undefined)) return '這一群裡有植物<b>不適合用這個標準判斷</b>（例如陸生植物談不上「漂浮」），換一個試試。';
      const y = node.names.filter(n => P[n][c]), no = node.names.filter(n => !P[n][c]);
      if (!y.length || !no.length) return `這一群植物${y.length ? '全部都符合' : '全部都不符合'}這個標準，沒辦法分成兩群。`;
      node.c = c; node.y = make(y); node.n = make(no);
      return '';
    }
    function applyBook(node, b) { if (!b || !b.c) return; split(node, b.c); applyBook(node.y, b.y); applyBook(node.n, b.n); }
    el.innerHTML = `<div class="controls"><button type="button" class="k-btn small alt book">📘 看課本示範</button><button type="button" class="k-btn small ghost reset">🔄 重新分類</button></div>
      <div class="tree" style="overflow-x:auto;padding-bottom:6px"></div><p class="hint">分類表太寬時，可以在表格上左右滑動。</p><div class="say"></div>`;
    el.querySelector('.reset').onclick = () => { root = make(Object.keys(P)); msg = ''; draw(); };
    el.querySelector('.book').onclick = () => { root = make(Object.keys(P)); applyBook(root, BOOK); msg = ''; draw(); };
    let msg = '';
    const cname = c => C.find(x => x[0] === c)[1];
    function nodeHtml(node, path, label) {
      const chips = node.names.map(n => `<span class="tag" style="margin:2px;font-size:.8rem;padding:0 7px">${P[n].icon} ${n}</span>`).join('');
      const head = label ? `<div style="font-weight:800;font-size:.85rem;color:${label[0] === '✔' ? '#2E8B64' : '#E86A8D'}">${label}</div>` : '';
      let body = `<div style="background:#fff;border:2px solid var(--line);border-radius:16px;padding:6px 8px;min-width:92px;max-width:210px;text-align:center">${head}<div>${chips}</div>`;
      if (!node.c && node.names.length > 1) {
        body += `<div style="margin-top:6px"><select data-path="${path}" aria-label="選擇分類標準"><option value="">選擇分類標準…</option>${C.map(c => `<option value="${c[0]}">${c[1]}</option>`).join('')}</select></div>`;
      } else if (node.names.length === 1) body += '<div style="font-size:.8rem;color:#2E8B64">✅ 只剩一種</div>';
      body += '</div>';
      if (!node.c) return `<div style="display:flex;flex-direction:column;align-items:center">${body}</div>`;
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px">${body}
        <div style="font-size:.8rem;background:var(--cream);border:2px solid #F7E3A1;border-radius:50px;padding:0 10px;max-width:200px;text-align:center">標準：${cname(node.c)}</div>
        <div style="display:flex;gap:6px;align-items:flex-start">${nodeHtml(node.y, path + 'y', '✔ 符合')}${nodeHtml(node.n, path + 'n', '✘ 不符合')}</div></div>`;
    }
    const leaves = n => n.c ? leaves(n.y) + leaves(n.n) : 1;
    const used = n => n.c ? 1 + used(n.y) + used(n.n) : 0;
    function draw() {
      const tree = el.querySelector('.tree');
      tree.innerHTML = `<div style="width:max-content;margin:0 auto">${nodeHtml(root, '', '')}</div>`;
      tree.querySelectorAll('select').forEach(s => s.onchange = () => {
        let node = root;
        for (const ch of s.dataset.path) node = ch === 'y' ? node.y : node.n;
        msg = split(node, s.value);
        draw();
      });
      const done = leaves(root) === Object.keys(P).length;
      el.querySelector('.say').innerHTML = msg ? '⚠️ ' + msg
        : done ? `🎉 完成！你用了 <b>${used(root)}</b> 個分類標準，把 8 種植物分到每一類只剩一種。這就是<mark>二分法</mark>。`
          : '在每一群植物下方選一個<b>分類標準</b>，依「符合」和「不符合」分成兩群，一直分到每一類只剩一種植物為止。';
    }
    root = make(Object.keys(P));
    draw();
  }

  window.UnitWidgets = { adaptExplorer, photosynthesis, waterTransport, transpiration, flowerLab, seedDispersal, dichotomy };
})();
