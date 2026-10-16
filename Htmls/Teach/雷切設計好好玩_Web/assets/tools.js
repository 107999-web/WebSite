/* 雷切設計好好玩 — 互動工具（window.LT）
   每個工具是 function(el)，el 是 <div class="tool" data-tool="名稱">。
   產生的 SVG 一律用 mm：紅色 #FF0000 = 切割、藍色 #0000FF = 線刻、黑色填滿 = 雕刻（Beam Studio 匯入時選「依顏色分層」）。 */
(function () {
  'use strict';
  const LT = {};
  const NS = 'http://www.w3.org/2000/svg';
  const f2 = v => Math.round(v * 100) / 100;
  const CUT = 'fill="none" stroke="#FF0000" stroke-width="0.1"';
  const LINE = 'fill="none" stroke="#0000FF" stroke-width="0.1"';
  const toast = m => (window.LTtoast ? window.LTtoast(m) : null);

  function svgDoc(w, h, body) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="${NS}" width="${f2(w)}mm" height="${f2(h)}mm" viewBox="0 0 ${f2(w)} ${f2(h)}">\n${body}\n</svg>\n`;
  }
  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('已下載 ' + name + '，用 Inkscape 打開再修改');
  }
  /* 預覽用：線條粗細固定 1.5px，不跟著縮放 */
  function preview(stage, w, h, body) {
    stage.innerHTML = `<svg class="prev" xmlns="${NS}" viewBox="${-2} ${-2} ${f2(w + 4)} ${f2(h + 4)}" style="width:100%;max-height:460px;display:block"><rect x="-2" y="-2" width="${f2(w + 4)}" height="${f2(h + 4)}" fill="#f3dfc1"/>${body}</svg>`;
  }
  function slider(k, label, min, max, step, val, unit = '') {
    return `<div><label>${label}：<output data-o="${k}">${val}</output> ${unit}</label><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
  }
  function num(k, label, val, step = 1, unit = 'mm') {
    return `<div><label>${label}（${unit}）</label><input type="number" data-k="${k}" value="${val}" step="${step}"></div>`;
  }
  function vals(el) {
    const o = {};
    el.querySelectorAll('[data-k]').forEach(i => {
      o[i.dataset.k] = i.type === 'checkbox' ? i.checked : (i.tagName === 'SELECT' || i.type === 'text' ? i.value : Number(i.value));
      const out = el.querySelector(`[data-o="${i.dataset.k}"]`);
      if (out) out.textContent = i.value;
    });
    return o;
  }
  function live(el, fn) {
    el.querySelectorAll('[data-k]').forEach(i => i.addEventListener('input', fn));
    fn();
  }
  function res(box, cls, msg) { box.className = 'res ' + cls; box.innerHTML = msg; }
  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function svgPt(svg, e) {
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }
  const poly = pts => 'M' + pts.map(p => f2(p[0]) + ',' + f2(p[1])).join(' L') + ' Z';
  const circlePath = (cx, cy, r) => `M${f2(cx - r)},${f2(cy)} a${f2(r)},${f2(r)} 0 1,0 ${f2(2 * r)},0 a${f2(r)},${f2(r)} 0 1,0 ${f2(-2 * r)},0 Z`;
  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    return `M${f2(x + r)},${f2(y)} H${f2(x + w - r)} A${f2(r)},${f2(r)} 0 0 1 ${f2(x + w)},${f2(y + r)} V${f2(y + h - r)} A${f2(r)},${f2(r)} 0 0 1 ${f2(x + w - r)},${f2(y + h)} H${f2(x + r)} A${f2(r)},${f2(r)} 0 0 1 ${f2(x)},${f2(y + h - r)} V${f2(y + r)} A${f2(r)},${f2(r)} 0 0 1 ${f2(x + r)},${f2(y)} Z`;
  }
  function head(el, title, desc) { el.innerHTML = `<h3>${title}</h3>${desc ? `<p class="small">${desc}</p>` : ''}`; }
  function add(el, html) { el.insertAdjacentHTML('beforeend', html); }

  /* ======================= 1. 雷射切割機構造（點熱點） ======================= */
  LT.machine = function (el) {
    head(el, '🔍 認識 Flux Beambox：點紅色數字看說明', '每台機型外觀略有不同，這是示意圖。全部點過會變綠色。');
    const parts = [
      ['上蓋與觀察窗', '雷射時<b>一定要蓋上</b>。觀察窗會擋住雷射光，可以隔著窗看。上蓋有安全開關，<b>打開蓋子雷射會停</b>。', 250, 70],
      ['雷射頭', '雷射光從這裡往下打，聚成像針尖一樣小的點。<b>不可以用手摸鏡片</b>，會留下油污。', 205, 165],
      ['對焦', '雷射頭到板子的距離要剛好（用對焦工具量）。焦點對了，切口才細、才切得斷。', 160, 205],
      ['工作平台（蜂巢板）', '材料平放在上面。蜂巢讓煙和雷射光穿過去，不會把底下燒壞。小碎片掉進去要請老師清。', 120, 245],
      ['攝影機', '上蓋裡的鏡頭。在 Beam Studio 按「相機預覽」，就能看到板子放在哪裡，再把圖案擺上去。', 330, 112],
      ['排風（抽風機）', '把煙抽到室外。<b>沒開排風不能切</b>，密集板燒出來的煙不能吸。', 455, 135],
      ['雷射管', '在機器後面，產生 CO₂ 雷射光的地方。光經過幾面鏡子轉彎，才到雷射頭。', 395, 200],
      ['操作按鈕', '開始／暫停。發現火花太大、聲音怪怪的，先<b>按暫停並叫老師</b>。', 440, 262],
    ];
    add(el, `<div class="two"><div class="stage"><svg viewBox="0 0 500 320" style="width:100%;display:block">
      <rect x="40" y="150" width="420" height="140" rx="16" fill="#e9e4dc" stroke="#7a6a60" stroke-width="3"/>
      <rect x="70" y="175" width="300" height="95" rx="6" fill="#4a4038"/>
      <g stroke="#6d6158" stroke-width="2">${Array.from({ length: 14 }, (_, i) => `<line x1="${80 + i * 21}" y1="225" x2="${80 + i * 21}" y2="265"/>`).join('')}<line x1="75" y1="235" x2="365" y2="235"/><line x1="75" y1="250" x2="365" y2="250"/></g>
      <rect x="110" y="232" width="150" height="18" fill="#d9a86c" stroke="#8a5a2a"/>
      <rect x="75" y="180" width="290" height="8" fill="#9b9087"/>
      <rect x="190" y="176" width="34" height="30" rx="4" fill="#c9302c"/>
      <line x1="207" y1="206" x2="207" y2="232" stroke="#ff2020" stroke-width="3"/>
      <circle cx="207" cy="232" r="4" fill="#fff59d"/>
      <rect x="380" y="175" width="60" height="90" rx="6" fill="#cfc7bd"/>
      <rect x="385" y="190" width="50" height="10" rx="5" fill="#8ecae6"/>
      <circle cx="440" cy="270" r="9" fill="#2fa866" stroke="#fff" stroke-width="2"/>
      <path d="M40 150 L80 40 L420 40 L460 150 Z" fill="#f4efe8" stroke="#7a6a60" stroke-width="3"/>
      <path d="M100 60 L400 60 L430 140 L70 140 Z" fill="#f2a65a" opacity=".55"/>
      <rect x="320" y="100" width="22" height="14" rx="3" fill="#333"/>
      <path d="M460 120 h28 v30 h-28" fill="#bbb" stroke="#7a6a60" stroke-width="3"/>
      ${parts.map((p, i) => `<g class="hot" data-i="${i}"><circle cx="${p[2]}" cy="${p[3]}" r="15"/><text x="${p[2]}" y="${p[3]}">${i + 1}</text></g>`).join('')}
    </svg></div><div><div class="res" style="min-height:160px">👈 點示意圖上的紅色數字</div><p class="small">已看過 <b class="seen">0</b> / ${parts.length}</p></div></div>`);
    const box = el.querySelector('.res'), seen = new Set();
    el.querySelectorAll('.hot').forEach(g => g.addEventListener('click', () => {
      const p = parts[g.dataset.i];
      g.classList.add('seen'); seen.add(g.dataset.i);
      box.innerHTML = `<h3 style="margin:0">${Number(g.dataset.i) + 1}. ${p[0]}</h3><p>${p[1]}</p>`;
      el.querySelector('.seen').textContent = seen.size;
      if (seen.size === parts.length) toast('🎉 機器構造全部認識了！');
    }));
  };

  /* ======================= 2. 雷射安全駕照 ======================= */
  LT.safety = function (el) {
    el.classList.add('licsec');
    const qs = [
      ['機器在切割的時候，我可以去上廁所一下下，反正它會自己切完。', false, '雷射切割時<b>一定要有人在旁邊看著</b>，密集板可能起火。'],
      ['開始切割前，要先確認排風（抽風機）有打開。', true, '煙要抽到室外，不然教室會有臭味，也對身體不好。'],
      ['我可以把蓋子打開一點點，近距離看雷射光比較清楚。', false, '雷射光會傷眼睛和皮膚。要<b>蓋上蓋子、隔著觀察窗</b>看。'],
      ['看到板子上冒出一直不熄的火焰，要馬上按「暫停」並叫老師。', true, '不要自己打開蓋子撲火，蓋子關著、按暫停、叫老師。'],
      ['剛切好的作品，等一下再拿，邊緣可能還有點熱。', true, '切好後等煙抽乾淨、再打開蓋子拿出來。'],
      ['可以拿家裡的塑膠板（PVC）來切看看。', false, 'PVC 會產生有毒氣體並腐蝕機器。<b>只切老師準備的材料</b>。'],
      ['每次放好板子後，要用對焦工具確認雷射頭的高度。', true, '焦點不對會切不斷，也可能燒得很黑。'],
      ['作品邊緣黑黑的，用濕抹布擦一擦就會比較乾淨。', true, '那是燒焦的碳粉，擦掉後再上色比較漂亮。'],
    ];
    head(el, '🪪 雷射安全駕照考試', '每題選「可以 ⭕」或「不可以 ❌」。全部答對才能領駕照，領到駕照才可以操作雷射切割機。');
    add(el, `<div class="sq"></div><div class="res">已答對 <b class="ok">0</b> / ${qs.length}</div>
      <div class="lic" style="display:none"><div class="row noprint" style="margin-top:10px"><label>駕照姓名：<input type="text" data-save="licname" placeholder="輸入名字"></label>
      <button class="btn green pl">🖨️ 列印駕照</button></div>
      <div class="license"><div class="photo">貼照片<br>或畫自己</div><div><h3>🔴 雷射安全駕照</h3><div>姓名：<b class="ln">＿＿＿＿</b></div><div>等級：雷切見習生</div><div class="small">已通過 8 題安全考試，可以在老師陪同下操作雷射切割機。</div><div class="small">發照：雷切設計好好玩　<span class="ld"></span></div></div></div></div>`);
    const wrap = el.querySelector('.sq'); let ok = 0;
    qs.forEach((q, i) => {
      const d = document.createElement('div');
      d.className = 'q'; d.style.cssText = 'background:#fffaf3;border-radius:12px;padding:8px 12px;margin:6px 0';
      d.innerHTML = `<b>${i + 1}.</b> ${q[0]} <div class="row" style="margin-top:6px"><button class="chipbtn" data-v="1">⭕ 可以</button><button class="chipbtn" data-v="0">❌ 不可以</button><span class="small w"></span></div>`;
      d.querySelectorAll('button').forEach(b => b.onclick = () => {
        if (d.dataset.done) return;
        const right = (b.dataset.v === '1') === q[1];
        b.classList.add(right ? 'right' : 'wrong');
        d.querySelector('.w').innerHTML = (right ? '✅ ' : '❌ 再想想：') + q[2];
        if (right) { d.dataset.done = 1; ok++; el.querySelector('.ok').textContent = ok; }
        else setTimeout(() => b.classList.remove('wrong'), 900);
        if (ok === qs.length) { el.querySelector('.lic').style.display = ''; res(el.querySelector('.res'), 'ok', '🎉 全部答對！請填名字、列印駕照。'); }
      });
      wrap.appendChild(d);
    });
    const nm = el.querySelector('[data-save=licname]');
    const upd = () => { el.querySelector('.ln').textContent = nm.value || '＿＿＿＿'; };
    nm.addEventListener('input', upd); setTimeout(upd, 50);
    el.querySelector('.ld').textContent = new Date().toLocaleDateString('zh-TW');
    el.querySelector('.pl').onclick = () => { document.body.classList.add('printlicense'); window.print(); document.body.classList.remove('printlicense'); };
  };

  /* ======================= 3. 星形／多邊形遊樂場 ======================= */
  LT.star = function (el) {
    head(el, '⭐ 星形與多邊形遊樂場', '和 Inkscape 的「星形／多邊形工具」一樣：調角數、尖銳度、圓角。紅色是切割線；掛孔要離邊緣至少 2.5 mm 才不會斷。');
    add(el, `<div class="ctl">${slider('n', '角數', 3, 12, 1, 5)}${slider('r', '尖銳度（內圈比例）', 0.2, 1, 0.05, 0.5)}${slider('rd', '圓角', 0, 0.45, 0.05, 0)}
      ${slider('size', '大小（直徑）', 30, 80, 1, 50, 'mm')}${slider('hd', '掛孔直徑', 0, 6, 0.5, 4, 'mm')}${slider('hy', '掛孔位置（往下移）', 0, 30, 0.5, 12, 'mm')}</div>
      <div class="two"><div class="stage"></div><div><div class="res"></div><p class="small">尖銳度 = 1 就變成多邊形。圓角能讓作品摸起來不刺手。</p><button class="btn blue dl">⬇️ 下載 SVG</button></div></div>`);
    const st = el.querySelector('.stage'), rb = el.querySelector('.res');
    let last = '';
    function build() {
      const v = vals(el), R = v.size / 2, cx = R + 2, cy = R + 2;
      const pts = [];
      const k = v.r >= 0.999 ? 1 : 2;
      const cnt = v.n * k;
      for (let i = 0; i < cnt; i++) {
        const a = -Math.PI / 2 + i * Math.PI * 2 / cnt;
        const rr = (k === 2 && i % 2) ? R * v.r : R;
        pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
      }
      let d;
      if (v.rd > 0) {
        d = '';
        const m = pts.length;
        for (let i = 0; i < m; i++) {
          const p0 = pts[(i - 1 + m) % m], p1 = pts[i], p2 = pts[(i + 1) % m], p3 = pts[(i + 2) % m];
          const c1 = [p1[0] + (p2[0] - p0[0]) * v.rd / 2, p1[1] + (p2[1] - p0[1]) * v.rd / 2];
          const c2 = [p2[0] - (p3[0] - p1[0]) * v.rd / 2, p2[1] - (p3[1] - p1[1]) * v.rd / 2];
          if (!i) d += `M${f2(p1[0])},${f2(p1[1])}`;
          d += ` C${f2(c1[0])},${f2(c1[1])} ${f2(c2[0])},${f2(c2[1])} ${f2(p2[0])},${f2(p2[1])}`;
        }
        d += ' Z';
      } else d = poly(pts);
      let hole = '';
      const hr = v.hd / 2, hx = cx, hy = cy - R + v.hy;
      let msg = ['ok', '✅ 形狀可以切！'];
      if (hr > 0) {
        hole = `<path d="${circlePath(hx, hy, hr)}" ${CUT}/>`;
        // 掛孔到邊緣的最短距離（用沒有圓角的多邊形估算）
        let md = 1e9;
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          const dx = b[0] - a[0], dy = b[1] - a[1];
          const t = Math.max(0, Math.min(1, ((hx - a[0]) * dx + (hy - a[1]) * dy) / (dx * dx + dy * dy)));
          md = Math.min(md, Math.hypot(a[0] + t * dx - hx, a[1] + t * dy - hy));
        }
        // 判斷孔中心在不在形狀裡
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          if ((pts[i][1] > hy) !== (pts[j][1] > hy) && hx < (pts[j][0] - pts[i][0]) * (hy - pts[i][1]) / (pts[j][1] - pts[i][1]) + pts[i][0]) inside = !inside;
        }
        const wall = md - hr;
        if (!inside || wall < 0) msg = ['bad', '❌ 掛孔跑到形狀外面了！把掛孔往下移。'];
        else if (wall < 1.5) msg = ['bad', `❌ 掛孔旁邊只剩 ${wall.toFixed(1)} mm，掛上去一拉就斷。`];
        else if (wall < 2.5) msg = ['mid', `⚠️ 掛孔旁邊 ${wall.toFixed(1)} mm，有點細，最好 2.5 mm 以上。`];
        else msg = ['ok', `✅ 掛孔旁邊 ${wall.toFixed(1)} mm，夠堅固！`];
        if (hr * 2 < 3) msg = ['mid', msg[1] + '<br>⚠️ 孔小於 3 mm，繩子可能穿不過。'];
      }
      const body = `<path d="${d}" ${CUT}/>${hole}`;
      preview(st, v.size + 4, v.size + 4, body);
      res(rb, msg[0], msg[1]);
      last = svgDoc(v.size + 4, v.size + 4, body);
    }
    live(el, build);
    el.querySelector('.dl').onclick = () => download('星星吊飾.svg', last);
  };

  /* ======================= 4. 線條顏色分類遊戲 ======================= */
  LT.colorsort = function (el) {
    const items = [
      ['吊飾最外圈的輪廓', 'cut'], ['掛繩用的小圓孔', 'cut'], ['名字（刻成一整片咖啡色的字）', 'fill'], ['小貓臉上的細鬍鬚', 'line'],
      ['拼圖每一片的分隔線', 'cut'], ['照片描出來的黑白圖案', 'fill'], ['尺上的刻度線', 'line'], ['挖空的星星小窗戶', 'cut'],
      ['盒子表面的大塊圖案', 'fill'], ['樹葉的葉脈線條', 'line'],
    ];
    head(el, '🎨 線條顏色分類：先點一個項目，再點它該去的籃子', '紅線＝切斷；藍線＝沿著線淺淺刻一條；黑色填滿＝把整塊面積刻成咖啡色。');
    add(el, `<div class="pool"></div><div class="bins">
      <div class="bin cut" data-b="cut"><h4>🟥 切割（紅色線）</h4><div class="in"></div></div>
      <div class="bin line" data-b="line"><h4>🟦 線刻（藍色線）</h4><div class="in"></div></div>
      <div class="bin fill" data-b="fill"><h4>⬛ 雕刻（黑色填滿）</h4><div class="in"></div></div></div><div class="res">還有 ${items.length} 個</div>`);
    const pool = el.querySelector('.pool'); let sel = null, left = items.length;
    items.sort(() => Math.random() - 0.5).forEach(([t, a]) => {
      const b = document.createElement('button');
      b.className = 'chipbtn'; b.textContent = t; b.dataset.a = a;
      b.onclick = () => { if (b.dataset.done) return; pool.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); sel = b; };
      pool.appendChild(b);
    });
    el.querySelectorAll('.bin').forEach(bin => bin.addEventListener('click', () => {
      if (!sel) { toast('先點上面的一個項目'); return; }
      if (sel.dataset.a === bin.dataset.b) {
        sel.classList.remove('sel'); sel.classList.add('right'); sel.dataset.done = 1;
        bin.querySelector('.in').appendChild(sel); sel = null; left--;
        res(el.querySelector('.res'), left ? 'ok' : 'ok', left ? `✅ 答對！還有 ${left} 個` : '🎉 全部分類正確！你已經知道怎麼設定線條顏色了。');
      } else {
        const s = sel; s.classList.add('wrong'); setTimeout(() => s.classList.remove('wrong'), 700);
        res(el.querySelector('.res'), 'bad', '❌ 再想想：要「切斷」、「刻一條線」，還是「刻一整片」？');
      }
    }));
  };

  /* ======================= 5. 雷射切割順序模擬 ======================= */
  LT.laser = function (el) {
    head(el, '🎬 雷射切割模擬器：看雷射頭怎麼走', 'Beam Studio 預設會「先雕刻 → 再線刻 → 最後切割」，切割也是先切裡面的洞、最後切外框。試試看如果先切外框會怎樣？');
    add(el, `<div class="row"><button class="btn green go1">▶ 正確順序</button><button class="btn go2">▶ 錯誤順序（先切外框）</button>
      <label class="small">速度 <input type="range" class="spd" min="0.5" max="3" step="0.5" value="1" style="width:120px"></label></div>
      <div class="stage" style="margin-top:10px"><svg viewBox="0 0 140 84" style="width:100%;display:block">
        <defs><clipPath id="lzclip"><text x="38" y="52" font-size="26" font-weight="900" font-family="Microsoft JhengHei, sans-serif" text-anchor="middle">雷切</text></clipPath></defs>
        <rect width="140" height="84" fill="#e8c99a"/>
        <g class="piece">
          <path class="outer" d="${roundRect(10, 12, 120, 60, 10)}" fill="none" stroke="#c9a06a" stroke-width=".4"/>
          <text x="38" y="52" font-size="26" font-weight="900" font-family="Microsoft JhengHei, sans-serif" text-anchor="middle" fill="none" stroke="#c9a06a" stroke-width=".3">雷切</text>
          <rect class="burn" x="10" y="20" width="60" height="0" fill="#5a3a1c" clip-path="url(#lzclip)"/>
        </g>
        <path class="smile" d="M80 52 Q95 64 110 52" fill="none" stroke="#c9a06a" stroke-width=".4"/>
        <path class="hole" d="${circlePath(118, 24, 3.5)}" fill="none" stroke="#c9a06a" stroke-width=".4"/>
        <path class="win" d="M95 22 L97.4 28.2 104 28.5 98.8 32.6 100.6 39 95 35.3 89.4 39 91.2 32.6 86 28.5 92.6 28.2 Z" fill="none" stroke="#c9a06a" stroke-width=".4"/>
        <circle class="dot" cx="5" cy="5" r="1.6" fill="#ff1a1a" style="filter:drop-shadow(0 0 2px #ff0)"/>
      </svg></div><div class="res">按上面的按鈕開始</div>`);
    const S = el.querySelector('svg'), dot = S.querySelector('.dot'), burn = S.querySelector('.burn'), piece = S.querySelector('.piece');
    const P = c => S.querySelector('.' + c);
    let anim = 0;
    function reset() {
      cancelAnimationFrame(anim);
      burn.setAttribute('height', 0); piece.removeAttribute('transform');
      ['outer', 'smile', 'hole', 'win'].forEach(c => { const p = P(c); p.setAttribute('stroke', '#c9a06a'); p.removeAttribute('stroke-dasharray'); p.removeAttribute('transform'); });
    }
    function run(wrong) {
      reset();
      const box = el.querySelector('.res');
      const vec = (c, color, label) => ({ label, dur: c === 'outer' ? 4 : 1.8, f(p) {
        const e = P(c), L = e.getTotalLength();
        e.setAttribute('stroke', color); e.setAttribute('stroke-width', c === 'smile' ? '.6' : '.7');
        e.setAttribute('stroke-dasharray', `${L * p} ${L}`);
        const pt = e.getPointAtLength(L * p);
        dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
      } });
      const steps = [{ label: '① 雕刻：雷射頭左右來回掃，一排一排把字刻成咖啡色', dur: 4, f(p) {
        burn.setAttribute('height', 36 * p);
        const row = Math.floor(p * 40); const x = row % 2 ? 70 - (p * 40 % 1) * 60 : 10 + (p * 40 % 1) * 60;
        dot.setAttribute('cx', x); dot.setAttribute('cy', 20 + 36 * p);
      } }, vec('smile', '#0000ff', '② 線刻：沿著藍色線淺淺刻一條')];
      const inner = [vec('hole', '#ff0000', '③ 切割：先切掛孔'), vec('win', '#ff0000', '④ 切割：再切星星窗戶')];
      const outer = vec('outer', '#ff0000', wrong ? '③ 先切外框……' : '⑤ 最後切外框，作品完成！');
      if (wrong) {
        steps.push(outer, { label: '💥 外框切斷了，作品被氣流吹得移動了一點！', dur: 1, f(p) { piece.setAttribute('transform', `translate(${2.5 * p} ${1.8 * p}) rotate(${3 * p} 70 42)`); } });
        inner.forEach((s, i) => { s.label = (i ? '⑤' : '④') + ' 再切掛孔和窗戶……位置全歪了 😱'; steps.push(s); });
      } else steps.push(...inner, outer);
      let i = 0, t0 = performance.now();
      function tick(now) {
        const spd = Number(el.querySelector('.spd').value);
        const s = steps[i]; const p = Math.min(1, (now - t0) / 1000 * spd / s.dur);
        s.f(p); box.className = 'res'; box.textContent = s.label;
        if (p >= 1) { i++; t0 = now; }
        if (i < steps.length) anim = requestAnimationFrame(tick);
        else if (wrong) res(box, 'bad', '❌ 先切外框，作品會移動，後面切的洞就歪了。所以要<b>先刻、再切裡面、最後切外框</b>。');
        else res(box, 'ok', '✅ 正確順序：雕刻 → 線刻 → 切內部 → 切外框。Beam Studio 預設就是這樣排的。');
      }
      anim = requestAnimationFrame(tick);
    }
    el.querySelector('.go1').onclick = () => run(false);
    el.querySelector('.go2').onclick = () => run(true);
  };

  /* ======================= 6. 布林運算 ======================= */
  LT.boolean = function (el) {
    head(el, '🧩 路徑布林運算：拖拉形狀，按下運算看結果', 'Inkscape 選取兩個形狀後，到「路徑」選單執行。<b>差集</b>是「下面的形狀被上面的形狀挖掉」，所以誰在上面很重要！');
    add(el, `<div class="row"><label>下面的形狀 <select data-k="a"><option value="circle">圓形</option><option value="rect">圓角方形</option><option value="cloud">雲朵</option></select></label>
      <label>上面的形狀 <select data-k="b"><option value="heart">愛心</option><option value="circle">圓形</option><option value="star">星星</option></select></label></div>
      <div class="row" style="margin:8px 0">${[['none', '原本'], ['union', '聯集 Ctrl ＋'], ['diff', '差集 Ctrl －'], ['inter', '交集 Ctrl ＊'], ['xor', '互斥 Ctrl ^'], ['div', '分割 Ctrl /']].map(o => `<button class="btn sm ghost op" data-op="${o[0]}">${o[1]}</button>`).join('')}</div>
      <div class="stage"><canvas width="640" height="340" style="width:100%;display:block"></canvas></div><div class="res"></div>`);
    const cv = el.querySelector('canvas'), g = cv.getContext('2d');
    const pos = { a: [250, 170], b: [370, 160] };
    let op = 'none', drag = null;
    const desc = {
      none: '拖拉兩個形狀，讓它們重疊一部分，再按上面的運算。',
      union: '聯集：兩個形狀合成一個外框 → 適合把掛環接到吊飾上。',
      diff: '差集：上面的形狀把下面的挖掉 → 適合挖洞、挖出窗戶。',
      inter: '交集：只留下兩個都蓋到的部分。',
      xor: '互斥：重疊的地方被挖掉，其他留下。',
      div: '分割：下面的形狀被切成好幾塊（顏色不同的是不同塊），上面的形狀消失。',
    };
    function shape(kind, x, y) {
      const p = new Path2D();
      if (kind === 'circle') p.arc(x, y, 80, 0, Math.PI * 2);
      else if (kind === 'rect') { p.roundRect ? p.roundRect(x - 80, y - 80, 160, 160, 26) : p.rect(x - 80, y - 80, 160, 160); }
      else if (kind === 'cloud') { [[-45, 15, 50], [10, -20, 60], [60, 20, 45], [0, 35, 45]].forEach(c => { p.moveTo(x + c[0] + c[2], y + c[1]); p.arc(x + c[0], y + c[1], c[2], 0, Math.PI * 2); }); }
      else if (kind === 'heart') { p.moveTo(x, y + 70); p.bezierCurveTo(x - 110, y, x - 60, y - 85, x, y - 35); p.bezierCurveTo(x + 60, y - 85, x + 110, y, x, y + 70); p.closePath(); }
      else if (kind === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 36 : 85; i ? p.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)) : p.moveTo(x + r * Math.cos(a), y + r * Math.sin(a)); } p.closePath(); }
      return p;
    }
    const layer = () => { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; return c; };
    function draw() {
      const v = vals(el);
      const A = shape(v.a, ...pos.a), B = shape(v.b, ...pos.b);
      g.clearRect(0, 0, cv.width, cv.height);
      const L = layer(), lg = L.getContext('2d');
      const fill = (ctx, p, c) => { ctx.fillStyle = c; ctx.fill(p, 'nonzero'); };
      const wood = '#d9a86c';
      if (op === 'none') { g.globalAlpha = .85; fill(g, A, '#f2a65a'); fill(g, B, '#8ecae6'); g.globalAlpha = 1; }
      else if (op === 'union') { fill(lg, A, wood); fill(lg, B, wood); }
      else if (op === 'diff') { fill(lg, A, wood); lg.globalCompositeOperation = 'destination-out'; fill(lg, B, '#000'); }
      else if (op === 'inter') { fill(lg, A, wood); lg.globalCompositeOperation = 'source-in'; fill(lg, B, wood); }
      else if (op === 'xor') { fill(lg, A, wood); lg.globalCompositeOperation = 'xor'; fill(lg, B, wood); }
      else if (op === 'div') {
        fill(lg, A, wood); lg.globalCompositeOperation = 'destination-out'; fill(lg, B, '#000');
        const L2 = layer(), l2 = L2.getContext('2d'); fill(l2, A, '#b5793d'); l2.globalCompositeOperation = 'source-in'; fill(l2, B, '#b5793d');
        lg.globalCompositeOperation = 'source-over'; lg.drawImage(L2, 0, 0);
      }
      if (op !== 'none') g.drawImage(L, 0, 0);
      g.setLineDash([6, 5]); g.lineWidth = 2; g.strokeStyle = 'rgba(80,60,40,.45)'; g.stroke(A); g.stroke(B); g.setLineDash([]);
      g.fillStyle = '#7a6a60'; g.font = 'bold 18px sans-serif'; g.fillText('下', pos.a[0] - 8, pos.a[1] + 6); g.fillText('上', pos.b[0] - 8, pos.b[1] + 6);
      res(el.querySelector('.res'), op === 'none' ? '' : 'ok', desc[op]);
      el.querySelectorAll('.op').forEach(b => b.classList.toggle('on', b.dataset.op === op));
      return { A, B };
    }
    const xy = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
    cv.addEventListener('pointerdown', e => {
      const { A, B } = draw(); const [x, y] = xy(e);
      drag = g.isPointInPath(B, x, y) ? 'b' : g.isPointInPath(A, x, y) ? 'a' : null;
      if (drag) { cv.setPointerCapture(e.pointerId); drag = [drag, x - pos[drag][0], y - pos[drag][1]]; }
    });
    cv.addEventListener('pointermove', e => { if (!drag) return; const [x, y] = xy(e); pos[drag[0]] = [x - drag[1], y - drag[2]]; draw(); });
    cv.addEventListener('pointerup', () => { drag = null; });
    el.querySelectorAll('.op').forEach(b => b.onclick = () => { op = b.dataset.op; draw(); });
    live(el, draw);
  };

  /* ======================= 7. 文字孤島檢查 ======================= */
  LT.islands = function (el) {
    head(el, '🏝️ 文字孤島檢查器', '雷射切完，<b>沒有連在一起的部分會掉下來</b>。鏤空字的「口」中間會掉；剪影字的每個筆畫會散開。打字試試看，紅色/彩色就是會掉的部分。');
    add(el, `<div class="ctl"><div><label>文字</label><input type="text" data-k="txt" value="小明 口日" maxlength="8"></div>
      <div><label>做法</label><select data-k="mode"><option value="hole">鏤空板（字是挖空的洞）</option><option value="cut">剪影字（把字切下來）</option></select></div>
      ${slider('sp', '字距（負的會重疊）', -40, 20, 1, 0, 'px')}
      <div><label><input type="checkbox" data-k="bar"> 加連接條（鏤空：十字小橋；剪影：底座長條）</label></div></div>
      <div class="stage"><canvas width="720" height="220" style="width:100%;display:block"></canvas></div><div class="res"></div>`);
    const cv = el.querySelector('canvas'), g = cv.getContext('2d'), W = cv.width, H = cv.height;
    function draw() {
      const v = vals(el);
      g.clearRect(0, 0, W, H);
      g.fillStyle = '#000'; g.textBaseline = 'middle';
      g.font = '900 130px "Microsoft JhengHei", "微軟正黑體", sans-serif';
      const chars = [...(v.txt || ' ')];
      const ws = chars.map(c => g.measureText(c).width);
      const total = ws.reduce((a, b) => a + b, 0) + v.sp * (chars.length - 1);
      let x = (W - total) / 2;
      const mids = [];
      chars.forEach((c, i) => { g.fillText(c, x, H / 2 + 4); mids.push(Math.round(x + ws[i] / 2)); x += ws[i] + v.sp; });
      const left = (W - total) / 2;
      const img = g.getImageData(0, 0, W, H).data;
      const letter = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) letter[i] = img[i * 4 + 3] > 110 ? 1 : 0;
      if (v.bar) {
        if (v.mode === 'hole') {
          for (let y = H / 2 - 4; y < H / 2 + 4; y++) for (let xx = 0; xx < W; xx++) letter[y * W + xx] = 0;
          mids.forEach(m => { for (let y = 0; y < H; y++) for (let xx = m - 4; xx < m + 4; xx++) if (xx >= 0 && xx < W) letter[y * W + xx] = 0; });
        }
        else { for (let y = H / 2 + 52; y < H / 2 + 72; y++) for (let xx = Math.max(0, left - 8); xx < Math.min(W, left + total + 8); xx++) letter[y * W + xx] = 1; }
      }
      // 連通區塊標記
      const want = v.mode === 'hole' ? 0 : 1;
      const lab = new Int32Array(W * H).fill(-1); const sizes = []; let touchEdge = [];
      const stack = [];
      for (let i = 0; i < W * H; i++) {
        if (letter[i] !== want || lab[i] >= 0) continue;
        const id = sizes.length; let n = 0, edge = false;
        lab[i] = id; stack.push(i);
        while (stack.length) {
          const p = stack.pop(); n++;
          const px = p % W, py = (p - px) / W;
          if (px === 0 || py === 0 || px === W - 1 || py === H - 1) edge = true;
          const nb = [px > 0 ? p - 1 : -1, px < W - 1 ? p + 1 : -1, py > 0 ? p - W : -1, py < H - 1 ? p + W : -1];
          for (const q of nb) if (q >= 0 && letter[q] === want && lab[q] < 0) { lab[q] = id; stack.push(q); }
        }
        sizes.push(n); touchEdge.push(edge);
      }
      const out = g.createImageData(W, H), o = out.data;
      const palette = [[232, 80, 91], [47, 111, 219], [47, 168, 102], [240, 180, 41], [139, 108, 240], [0, 160, 170], [230, 120, 30], [200, 60, 160]];
      let islands = 0; const big = [];
      sizes.forEach((s, id) => { if (s > 25) big.push(id); });
      const isl = new Set();
      if (v.mode === 'hole') big.forEach(id => { if (!touchEdge[id]) { isl.add(id); islands++; } });
      const color = {};
      if (v.mode === 'cut') { big.sort((a, b) => sizes[b] - sizes[a]).forEach((id, k) => { color[id] = palette[k % palette.length]; }); islands = big.length; }
      for (let i = 0; i < W * H; i++) {
        let c;
        if (v.mode === 'hole') c = letter[i] ? [60, 45, 35] : (isl.has(lab[i]) ? [232, 60, 70] : [217, 168, 108]);
        else c = letter[i] ? (color[lab[i]] || [120, 120, 120]) : [250, 244, 236];
        o[i * 4] = c[0]; o[i * 4 + 1] = c[1]; o[i * 4 + 2] = c[2]; o[i * 4 + 3] = 255;
      }
      g.putImageData(out, 0, 0);
      const rb = el.querySelector('.res');
      if (v.mode === 'hole') res(rb, islands ? 'bad' : 'ok', islands ? `❌ 有 <b>${islands}</b> 塊紅色孤島會掉下來（例如「口」的中間）。勾「加連接條」或換成線刻／雕刻。` : '✅ 沒有孤島，切完板子是完整一片！');
      else res(rb, islands > 1 ? 'bad' : 'ok', islands > 1 ? `❌ 會散成 <b>${islands}</b> 片（每個顏色是一片）。把字距調成負的讓字重疊，或勾「加底座長條」，再用「聯集」合併。` : '✅ 整個名字連成一片，切下來不會散掉！');
    }
    live(el, draw);
  };

  /* ======================= 8. 貝茲曲線遊樂場 ======================= */
  LT.bezier = function (el) {
    head(el, '〰️ 貝茲曲線遊樂場：拖拉圓點，讓紅線疊上虛線', '方形的是「節點」（線經過的點），圓形的是「控制把手」（決定線往哪裡彎）。Inkscape 用節點工具 <kbd>N</kbd> 也是這樣調。');
    add(el, `<div class="row"><label>目標 <select data-k="tg"><option value="0">微笑</option><option value="1">S 形</option><option value="2">拱門</option><option value="3">波浪尾巴</option></select></label><button class="btn sm ghost rs">↺ 重來</button></div>
      <div class="stage" style="margin-top:8px"><svg viewBox="0 0 400 260" style="width:100%;display:block;touch-action:none"></svg></div><div class="res"></div>`);
    const S = el.querySelector('svg');
    const T = [[[60, 90], [120, 230], [280, 230], [340, 90]], [[60, 200], [380, 220], [20, 40], [340, 60]], [[60, 230], [40, 20], [360, 20], [340, 230]], [[50, 130], [150, -20], [250, 280], [350, 130]]];
    let P;
    const reset = () => { P = [[60, 130], [150, 130], [250, 130], [340, 130]]; draw(); };
    const bz = (Q, t) => { const u = 1 - t; return [0, 1].map(k => u * u * u * Q[0][k] + 3 * u * u * t * Q[1][k] + 3 * u * t * t * Q[2][k] + t * t * t * Q[3][k]); };
    function draw() {
      const tg = T[Number(el.querySelector('[data-k=tg]').value)];
      const d = Q => `M${Q[0]} C${Q[1]} ${Q[2]} ${Q[3]}`;
      S.innerHTML = `<rect width="400" height="260" fill="#fdfaf5"/><path d="${d(tg)}" fill="none" stroke="#7a6a60" stroke-width="10" stroke-dasharray="4 8" opacity=".35" stroke-linecap="round"/>
        <path d="M${P[0]} L${P[1]} M${P[3]} L${P[2]}" stroke="#2f6fdb" stroke-width="1.5" stroke-dasharray="4 3"/>
        <path d="${d(P)}" fill="none" stroke="#ff0000" stroke-width="3"/>
        ${P.map((p, i) => i % 3 === 0 ? `<rect data-i="${i}" x="${p[0] - 9}" y="${p[1] - 9}" width="18" height="18" fill="#fff" stroke="#3b2f2a" stroke-width="3" style="cursor:move"/>` : `<circle data-i="${i}" cx="${p[0]}" cy="${p[1]}" r="10" fill="#2f6fdb" stroke="#fff" stroke-width="3" style="cursor:move"/>`).join('')}`;
      let sum = 0;
      for (let k = 0; k <= 40; k++) { const a = bz(P, k / 40); let m = 1e9; for (let j = 0; j <= 80; j++) { const b = bz(tg, j / 80); m = Math.min(m, Math.hypot(a[0] - b[0], a[1] - b[1])); } sum += m; }
      const avg = sum / 41, score = Math.max(0, Math.round(100 - avg * 2.2));
      res(el.querySelector('.res'), score >= 85 ? 'ok' : score >= 60 ? 'mid' : '', `相似度 <b>${score}</b> 分 ${score >= 85 ? '🎉 太厲害了！換下一個目標' : '（85 分過關）'}`);
    }
    let di = -1;
    S.addEventListener('pointerdown', e => { const t = e.target.dataset.i; if (t !== undefined) { di = Number(t); S.setPointerCapture(e.pointerId); } });
    S.addEventListener('pointermove', e => {
      if (di < 0) return; const p = svgPt(S, e); const nx = Math.max(0, Math.min(400, p.x)), ny = Math.max(-40, Math.min(300, p.y));
      const dx = nx - P[di][0], dy = ny - P[di][1];
      P[di] = [nx, ny];
      if (di === 0) { P[1] = [P[1][0] + dx, P[1][1] + dy]; } if (di === 3) { P[2] = [P[2][0] + dx, P[2][1] + dy]; }
      draw();
    });
    S.addEventListener('pointerup', () => { di = -1; });
    el.querySelector('.rs').onclick = reset;
    el.querySelector('[data-k=tg]').addEventListener('change', reset);
    reset();
  };

  /* ======================= 9. 點陣圖描圖（亮度門檻） ======================= */
  LT.trace = function (el) {
    head(el, '🖼️ 描繪點陣圖：亮度門檻怎麼調？', 'Inkscape 的「描繪點陣圖」（<kbd>Shift</kbd>＋<kbd>Alt</kbd>＋<kbd>B</kbd>）會把比門檻暗的地方變黑、亮的變白。可以上傳自己的圖（只在這台電腦處理，不會上傳到網路）。');
    add(el, `<div class="ctl">${slider('th', '亮度門檻', 10, 245, 1, 128)}<div><label><input type="checkbox" data-k="inv"> 反相（黑白交換）</label></div>
      <div><label>換一張圖</label><input type="file" accept="image/*" class="up"></div></div>
      <div class="two"><div><p class="small">原圖</p><div class="stage"><canvas class="src" width="320" height="240" style="width:100%;display:block"></canvas></div></div>
      <div><p class="small">描圖結果（黑色會變成雕刻）</p><div class="stage"><canvas class="dst" width="320" height="240" style="width:100%;display:block"></canvas></div></div></div><div class="res"></div>`);
    const src = el.querySelector('.src'), dst = el.querySelector('.dst'), sg = src.getContext('2d'), dg = dst.getContext('2d');
    function sample() {
      const gr = sg.createLinearGradient(0, 0, 320, 240); gr.addColorStop(0, '#fdf1dc'); gr.addColorStop(1, '#c8d8e8');
      sg.fillStyle = gr; sg.fillRect(0, 0, 320, 240);
      const fur = sg.createRadialGradient(150, 120, 20, 160, 140, 110); fur.addColorStop(0, '#9a7a5a'); fur.addColorStop(1, '#3a2a1a');
      sg.fillStyle = fur;
      sg.beginPath(); sg.moveTo(90, 90); sg.lineTo(100, 30); sg.lineTo(140, 70); sg.lineTo(180, 70); sg.lineTo(220, 30); sg.lineTo(230, 90); sg.arc(160, 140, 80, -0.3, Math.PI + 0.3); sg.fill();
      sg.fillStyle = '#e8e0c8'; [[130, 125], [190, 125]].forEach(([x, y]) => { sg.beginPath(); sg.ellipse(x, y, 16, 20, 0, 0, 7); sg.fill(); });
      sg.fillStyle = '#111'; [[132, 128], [192, 128]].forEach(([x, y]) => { sg.beginPath(); sg.arc(x, y, 8, 0, 7); sg.fill(); });
      sg.fillStyle = '#d9909a'; sg.beginPath(); sg.moveTo(152, 158); sg.lineTo(168, 158); sg.lineTo(160, 168); sg.fill();
      sg.strokeStyle = '#ddd'; sg.lineWidth = 2; [[-1], [1]].forEach(([s]) => { for (let k = 0; k < 3; k++) { sg.beginPath(); sg.moveTo(160 + s * 20, 165 + k * 6); sg.lineTo(160 + s * 75, 155 + k * 12); sg.stroke(); } });
    }
    function draw() {
      const v = vals(el);
      const im = sg.getImageData(0, 0, 320, 240), d = im.data; let dark = 0;
      for (let i = 0; i < d.length; i += 4) {
        const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
        let b = l < v.th; if (v.inv) b = !b; if (b) dark++;
        d[i] = d[i + 1] = d[i + 2] = b ? 30 : 255; d[i + 3] = 255;
      }
      dg.putImageData(im, 0, 0);
      const pct = Math.round(dark / (320 * 240) * 100);
      res(el.querySelector('.res'), pct > 70 || pct < 5 ? 'bad' : pct > 45 ? 'mid' : 'ok', `黑色面積 ${pct}%　` + (pct > 70 ? '❌ 太黑了，雕刻會很久又看不出圖案，把門檻調低。' : pct < 5 ? '❌ 幾乎全白，圖案不見了，把門檻調高。' : pct > 45 ? '⚠️ 黑色有點多，雕刻時間會比較長。' : '✅ 圖案清楚，黑色面積剛好！'));
    }
    sample(); live(el, draw);
    el.querySelector('.up').addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      const img = new Image();
      img.onload = () => { const k = Math.min(320 / img.width, 240 / img.height); sg.fillStyle = '#fff'; sg.fillRect(0, 0, 320, 240); sg.drawImage(img, (320 - img.width * k) / 2, (240 - img.height * k) / 2, img.width * k, img.height * k); draw(); URL.revokeObjectURL(img.src); };
      img.src = URL.createObjectURL(f);
    });
  };

  /* ======================= 10. 鑰匙圈尺寸檢查 ======================= */
  LT.keyring = function (el) {
    head(el, '🔑 鑰匙圈尺寸檢查器', '鑰匙圈每天被拉來拉去，掛孔要夠大、旁邊的木頭要夠厚。調整到全部變綠色，再下載當作底板。');
    add(el, `<div class="ctl">${slider('w', '寬', 20, 70, 1, 40, 'mm')}${slider('h', '高', 20, 70, 1, 50, 'mm')}${slider('r', '圓角', 0, 20, 1, 8, 'mm')}
      ${slider('d', '掛孔直徑', 2, 8, 0.5, 5, 'mm')}${slider('e', '掛孔中心到上緣', 2, 15, 0.5, 6, 'mm')}</div>
      <div class="two"><div class="stage"></div><div><div class="res"></div><button class="btn blue dl" style="margin-top:8px">⬇️ 下載鑰匙圈底板 SVG</button></div></div>`);
    const st = el.querySelector('.stage'); let last = '';
    function draw() {
      const v = vals(el);
      const wall = v.e - v.d / 2;
      const body = `<path d="${roundRect(0, 0, v.w, v.h, v.r)}" ${CUT}/><path d="${circlePath(v.w / 2, v.e, v.d / 2)}" ${CUT}/>`;
      preview(st, v.w, v.h, body + `<line x1="${v.w / 2}" y1="0" x2="${v.w / 2}" y2="${f2(v.e - v.d / 2)}" stroke="${wall < 2 ? '#e8505b' : wall < 3 ? '#f0b429' : '#2fa866'}" stroke-width="1.2"/>`);
      last = svgDoc(v.w, v.h, body);
      const msgs = []; let lv = 'ok';
      const bad = m => { msgs.push('❌ ' + m); lv = 'bad'; }, mid = m => { msgs.push('⚠️ ' + m); if (lv === 'ok') lv = 'mid'; };
      if (v.d < 3) bad(`掛孔 ${v.d} mm 太小，鑰匙圈的金屬環穿不過去（至少 4 mm）。`); else if (v.d < 4) mid('掛孔有點小，建議 4～5 mm。');
      if (wall < 2) bad(`掛孔上面只剩 ${wall.toFixed(1)} mm，一拉就斷！`); else if (wall < 3) mid(`掛孔上面 ${wall.toFixed(1)} mm，建議 3 mm 以上。`);
      if (v.r * 2 > Math.min(v.w, v.h)) mid('圓角太大，形狀會變成圓形。');
      if (Math.min(v.w, v.h) < 25) mid('作品小於 25 mm，名字會刻不下。');
      if (!msgs.length) msgs.push(`✅ 尺寸 OK！掛孔 ${v.d} mm、上方厚度 ${wall.toFixed(1)} mm。`);
      res(el.querySelector('.res'), lv, msgs.join('<br>'));
    }
    live(el, draw);
    el.querySelector('.dl').onclick = () => download('鑰匙圈底板.svg', last);
  };

  /* ======================= 11. 外擴／內縮 ======================= */
  LT.offset = function (el) {
    head(el, '↔️ 外擴與內縮：做雙層作品的秘密', 'Inkscape：<kbd>Ctrl</kbd>＋<kbd>)</kbd> 外擴、<kbd>Ctrl</kbd>＋<kbd>(</kbd> 內縮，或用「路徑 → 動態偏移」拖拉。底層外擴 3 mm、上層用原本的形狀，疊起來就有立體感。');
    add(el, `<div class="ctl"><div><label>形狀</label><select data-k="s"><option value="heart">愛心</option><option value="star">星星</option><option value="cat">貓咪頭</option></select></div>${slider('o', '偏移量（正的外擴、負的內縮）', -6, 8, 0.5, 3, 'mm')}</div>
      <div class="stage"></div><div class="res"></div>`);
    const shapes = {
      heart: 'M30 52 C2 34 6 8 22 8 C27 8 30 12 30 15 C30 12 33 8 38 8 C54 8 58 34 30 52 Z',
      star: 'M30 4 L37 22 56 22 41 34 47 53 30 42 13 53 19 34 4 22 23 22 Z',
      cat: 'M10 14 L14 2 24 11 Q30 9 36 11 L46 2 50 14 Q56 26 50 40 Q42 54 30 54 Q18 54 10 40 Q4 26 10 14 Z',
    };
    const st = el.querySelector('.stage');
    function draw() {
      const v = vals(el), d = shapes[v.s], o = v.o;
      let body;
      if (o > 0) body = `<path d="${d}" fill="#c0392b" stroke="#c0392b" stroke-width="${2 * o + 0.8}" stroke-linejoin="round"/><path d="${d}" fill="#e9c495" stroke="#e9c495" stroke-width="${2 * o}" stroke-linejoin="round"/><path d="${d}" fill="#d9a86c" stroke="#3b2f2a" stroke-width=".5"/>`;
      else if (o < 0) body = `<clipPath id="ofc"><path d="${d}"/></clipPath><path d="${d}" fill="#e9c495" stroke="#3b2f2a" stroke-width=".5"/><path d="${d}" fill="#b5793d" stroke="#e9c495" stroke-width="${-2 * o}" stroke-linejoin="round" clip-path="url(#ofc)"/>`;
      else body = `<path d="${d}" fill="#d9a86c" stroke="#3b2f2a" stroke-width=".5"/>`;
      st.innerHTML = `<svg viewBox="-14 -14 88 84" style="width:100%;max-height:360px;display:block"><rect x="-14" y="-14" width="88" height="84" fill="#f3dfc1"/>${body}</svg>`;
      res(el.querySelector('.res'), 'ok', o > 0 ? `外擴 ${o} mm：淺色是底層（比原本大一圈，紅線是它的切割線），深色是上層。兩層用白膠黏起來就是雙層作品。` : o < 0 ? `內縮 ${-o} mm：深色是縮小後的形狀，可以當作「框裡面再刻一層」。` : '偏移 0：和原本一樣。');
    }
    live(el, draw);
  };

  /* ======================= 12. 拼圖產生器 ======================= */
  LT.jigsaw = function (el) {
    head(el, '🧩 拼圖產生器', '設定大小和片數，下載 SVG 後在 Inkscape 把你的圖案（黑色填滿＝雕刻）放到拼圖上面。每片最好大於 25 mm，太小的片容易斷。');
    add(el, `<div class="ctl">${num('w', '寬', 150)}${num('h', '高', 100)}${slider('cols', '橫向片數', 2, 8, 1, 4)}${slider('rows', '直向片數', 2, 6, 1, 3)}
      ${slider('tab', '凸耳大小', 0.06, 0.13, 0.01, 0.1)}${slider('jit', '隨機變化', 0, 0.06, 0.01, 0.04)}${slider('rc', '外框圓角', 0, 10, 1, 4, 'mm')}</div>
      <div class="row"><button class="btn ghost sm ns">🎲 換一個樣子</button><button class="btn blue dl">⬇️ 下載拼圖 SVG</button></div>
      <div class="stage" style="margin-top:8px"></div><div class="res"></div>`);
    let seed = 7, last = '';
    const st = el.querySelector('.stage');
    function edge(R, x0, y0, x1, y1, t, j) {
      const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux;
      const flip = R() < 0.5 ? 1 : -1;
      const J = () => (R() * 2 - 1) * j;
      const a = J(), b = J(), c = J(), d = J(), e = J();
      const P = (l, w) => `${f2(x0 + ux * l * L + nx * w * L * flip)},${f2(y0 + uy * l * L + ny * w * L * flip)}`;
      return ` C${P(0.2, a)} ${P(0.5 + b + d, -t + c)} ${P(0.5 - t + b, t + c)} C${P(0.5 - 2 * t + b - d, 3 * t + c)} ${P(0.5 + 2 * t + b - d, 3 * t + c)} ${P(0.5 + t + b, t + c)} C${P(0.5 + b + d, -t + c)} ${P(0.8, e)} ${P(1, 0)}`;
    }
    function draw() {
      const v = vals(el), R = rng(seed);
      const W = Math.max(40, v.w), H = Math.max(40, v.h), cw = W / v.cols, ch = H / v.rows;
      let body = '';
      for (let r = 1; r < v.rows; r++) { const y = r * ch; let d = `M0,${f2(y)}`; for (let c = 0; c < v.cols; c++) d += edge(R, c * cw, y, (c + 1) * cw, y, v.tab, v.jit); body += `<path d="${d}" ${CUT}/>`; }
      for (let c = 1; c < v.cols; c++) { const x = c * cw; let d = `M${f2(x)},0`; for (let r = 0; r < v.rows; r++) d += edge(R, x, r * ch, x, (r + 1) * ch, v.tab, v.jit); body += `<path d="${d}" ${CUT}/>`; }
      body += `<path d="${roundRect(0, 0, W, H, v.rc)}" ${CUT}/>`;
      preview(st, W, H, body);
      last = svgDoc(W, H, body);
      const small = Math.min(cw, ch);
      res(el.querySelector('.res'), small < 20 ? 'bad' : small < 25 ? 'mid' : 'ok', `共 ${v.rows * v.cols} 片，每片約 ${cw.toFixed(0)} × ${ch.toFixed(0)} mm。` + (small < 20 ? '❌ 太小了，凸耳會斷掉。' : small < 25 ? '⚠️ 有點小，小心拿。' : '✅ 大小剛好。'));
    }
    live(el, draw);
    el.querySelector('.ns').onclick = () => { seed = Math.floor(Math.random() * 1e6); draw(); };
    el.querySelector('.dl').onclick = () => download('拼圖.svg', last);
  };

  /* ======================= 13. 尺書籤產生器 ======================= */
  LT.ruler = function (el) {
    head(el, '📏 尺書籤產生器', '刻度用藍色線刻、數字用黑色雕刻、外框紅色切割。下載後在 Inkscape 加上名字或圖案。<b>數字是文字，送去切之前要選取數字按 <kbd>Shift</kbd>＋<kbd>Ctrl</kbd>＋<kbd>C</kbd> 轉成路徑。</b>');
    add(el, `<div class="ctl">${slider('len', '刻度長度', 50, 180, 10, 120, 'mm')}${slider('wd', '尺的寬度', 22, 40, 1, 28, 'mm')}
      <div><label><input type="checkbox" data-k="hole" checked> 加書籤繩孔</label><label><input type="checkbox" data-k="nums" checked> 加數字</label></div></div>
      <div class="stage"></div><div class="row" style="margin-top:8px"><button class="btn blue dl">⬇️ 下載尺 SVG</button></div><div class="res"></div>`);
    const st = el.querySelector('.stage'); let last = '';
    function draw() {
      const v = vals(el), x0 = 6, total = v.len + 12 + (v.hole ? 10 : 0), H = v.wd;
      let ticks = '', nums = '';
      for (let i = 0; i <= v.len; i++) {
        const l = i % 10 === 0 ? H * 0.32 : i % 5 === 0 ? H * 0.24 : H * 0.15;
        ticks += `M${f2(x0 + i)},0 V${f2(l)} `;
        if (v.nums && i % 10 === 0) nums += `<text x="${x0 + i}" y="${f2(H * 0.32 + 5)}" font-size="4.2" font-family="Arial, sans-serif" text-anchor="middle" fill="#000000">${i / 10}</text>`;
      }
      let body = `<path d="${roundRect(0, 0, total, H, 3)}" ${CUT}/><path d="${ticks}" ${LINE}/>${nums}`;
      if (v.hole) body += `<path d="${circlePath(total - 7, H / 2, 2.5)}" ${CUT}/>`;
      preview(st, total, H, body);
      last = svgDoc(total, H, body);
      res(el.querySelector('.res'), total > 380 ? 'bad' : 'ok', `成品 ${total} × ${H} mm。` + (total > 380 ? '❌ 超過 Beambox 工作範圍（約 400 × 375 mm），請縮短。' : '刻度從距離左邊 6 mm 開始，切完可以用真的尺比對看看準不準。'));
    }
    live(el, draw);
    el.querySelector('.dl').onclick = () => download('尺書籤.svg', last);
  };

  /* ======================= 14. 卡槽鬆緊模擬＋測試尺 ======================= */
  LT.kerf = function (el) {
    head(el, '🔧 卡槽鬆緊實驗室', '雷射光本身有寬度，切下去會燒掉一條細細的木頭，叫做<b>切縫（kerf）</b>。所以畫 3 mm 的卡槽，切出來會比 3 mm 寬一點點。先用游標卡尺量板子真正的厚度！');
    add(el, `<div class="ctl">${slider('t', '板子實際厚度（游標卡尺量）', 2.5, 3.5, 0.05, 2.95, 'mm')}${slider('k', '切縫寬度', 0, 0.3, 0.01, 0.15, 'mm')}${slider('s', '設計圖上畫的卡槽寬', 2.3, 3.6, 0.05, 3, 'mm')}</div>
      <div class="two"><div class="stage"></div><div><div class="res"></div><p class="small">卡槽切出來的寬度 ＝ 畫的寬度 ＋ 切縫。<br>要剛好卡緊：畫的寬度 ≈ 板厚 － 切縫。</p>
      <button class="btn blue dl">⬇️ 下載卡槽測試尺 SVG</button><p class="small">測試尺有 7 個寬度不同的卡槽，切出來後拿另一片板子插插看，找出最剛好的那一格，記在你的筆記裡。</p></div></div>`);
    const st = el.querySelector('.stage');
    function draw() {
      const v = vals(el), real = v.s + v.k, gap = real - v.t, K = 30;
      const sw = real * K, bw = v.t * K, cx = 150;
      let lv, msg;
      if (gap < -0.05) { lv = 'bad'; msg = `❌ 太緊！卡槽 ${real.toFixed(2)} mm 比板子 ${v.t} mm 窄，硬塞會裂開。`; }
      else if (gap <= 0.05) { lv = 'ok'; msg = `✅ 剛剛好！卡槽 ${real.toFixed(2)} mm，插進去會卡緊，不用膠水。`; }
      else if (gap <= 0.2) { lv = 'mid'; msg = `⚠️ 有點鬆，卡槽 ${real.toFixed(2)} mm，要用白膠固定。`; }
      else { lv = 'bad'; msg = `❌ 太鬆了，卡槽 ${real.toFixed(2)} mm，一拿起來就掉。`; }
      const ins = gap < -0.05 ? -40 : 0;
      st.innerHTML = `<svg viewBox="0 0 300 220" style="width:100%;display:block"><rect width="300" height="220" fill="#fdfaf5"/>
        <path d="M20 120 H${cx - sw / 2} V200 H${cx + sw / 2} V120 H280 V215 H20 Z" fill="#d9a86c" stroke="#8a5a2a" stroke-width="2"/>
        <rect x="${cx - bw / 2}" y="${20 + ins}" width="${bw}" height="${150}" fill="#e9c495" stroke="#8a5a2a" stroke-width="2" opacity=".92"/>
        <text x="150" y="14" text-anchor="middle" font-size="12" fill="#7a6a60">放大 30 倍的樣子</text>
        ${gap > 0.05 ? `<text x="${cx}" y="195" text-anchor="middle" font-size="11" fill="#a3262f">縫隙 ${gap.toFixed(2)}</text>` : ''}</svg>`;
      res(el.querySelector('.res'), lv, msg);
    }
    live(el, draw);
    el.querySelector('.dl').onclick = () => {
      const v = vals(el); let body = '', x = 8;
      const ws = [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3].map(d => Math.round((v.t + d) * 100) / 100);
      let d = 'M0,0';
      ws.forEach(w => { d += ` H${f2(x)} V12 H${f2(x + w)} V0`; body += `<text x="${f2(x + w / 2)}" y="19" font-size="3.4" font-family="Arial, sans-serif" text-anchor="middle" fill="#000000">${w.toFixed(1)}</text>`; x += w + 8; });
      const W = x; d += ` H${f2(W)} V24 H0 Z`;
      body = `<path d="${d}" ${CUT}/>` + body + `<path d="${roundRect(0, 30, 20, 40, 2)}" ${CUT}/><text x="10" y="52" font-size="3.4" font-family="Arial" text-anchor="middle" fill="#000000">試插片</text>`;
      download('卡槽測試尺.svg', svgDoc(W, 72, body));
    };
  };

  /* ---------- 在多邊形上開一條直的卡槽（從上或從下） ---------- */
  function densify(pts, step) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / step));
      for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
    }
    return out;
  }
  function notch(pts, cx, w, yMid, fromTop) {
    const inR = p => Math.abs(p[0] - cx) < w / 2 && (fromTop ? p[1] < yMid : p[1] > yMid);
    const P = densify(pts, 0.4);
    const n = P.length;
    let s = P.findIndex((p, i) => !inR(p) && inR(P[(i + 1) % n]));
    if (s < 0) return pts;
    let e = s + 1; while (inR(P[e % n])) e++;
    const a = P[s], b = P[(s + 1) % n], c = P[(e - 1) % n], d = P[e % n];
    const xA = a[0] < cx ? cx - w / 2 : cx + w / 2, xB = xA === cx - w / 2 ? cx + w / 2 : cx - w / 2;
    const yAt = (p, q, x) => (Math.abs(q[0] - p[0]) < 1e-9 ? p[1] : p[1] + (q[1] - p[1]) * (x - p[0]) / (q[0] - p[0]));
    const res2 = [];
    for (let i = e; i < e + n; i++) {
      const p = P[i % n];
      res2.push(p);
      if (i % n === s) break;
    }
    // res2 從 d 走到 a；接著加卡槽四個點回到 d
    res2.push([xA, yAt(a, b, xA)], [xA, yMid], [xB, yMid], [xB, yAt(c, d, xB)]);
    return res2;
  }

  /* ======================= 15. 十字插接造型 ======================= */
  LT.crossslot = function (el) {
    head(el, '✝️ 十字插接立體造型', '兩片一樣的形狀：A 片從<b>上面</b>開槽到一半、B 片從<b>下面</b>開槽到一半，十字交叉插起來就站得住。槽寬 ＝ 板厚 － 切縫。');
    add(el, `<div class="ctl"><div><label>造型</label><select data-k="shape"><option value="tree">聖誕樹</option><option value="ball">圓球</option><option value="star">星星</option><option value="rocket">火箭</option></select></div>
      ${slider('size', '高度', 50, 120, 5, 80, 'mm')}${slider('t', '板厚', 2.5, 3.5, 0.05, 3, 'mm')}${slider('k', '切縫', 0, 0.3, 0.01, 0.15, 'mm')}</div>
      <div class="two"><div class="stage s2"></div><div class="stage box3d s3"><div class="sc"></div></div></div>
      <div class="row" style="margin-top:8px"><button class="btn blue dl">⬇️ 下載兩片 SVG</button></div><div class="res"></div>`);
    let last = '';
    function outline(shape, H) {
      const W = H * 0.75, cx = W / 2;
      if (shape === 'tree') return { W, pts: [[cx, 0], [W, H * 0.82], [cx + W * 0.11, H * 0.82], [cx + W * 0.11, H], [cx - W * 0.11, H], [cx - W * 0.11, H * 0.82], [0, H * 0.82]] };
      if (shape === 'ball') { const r = H / 2, pts = []; for (let i = 0; i < 72; i++) { const a = -Math.PI / 2 + i * Math.PI / 36; pts.push([r + r * Math.cos(a), r + r * Math.sin(a)]); } return { W: H, pts }; }
      if (shape === 'star') { const r = H / 2 / 0.905, cy = r, pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; pts.push([r + rr * Math.cos(a), cy + rr * Math.sin(a)]); } const ys = pts.map(p => p[1]), mn = Math.min(...ys), mx = Math.max(...ys); return { W: 2 * r, pts: pts.map(p => [p[0], (p[1] - mn) * H / (mx - mn)]) }; }
      const w2 = H * 0.22; // 火箭
      return { W: H * 0.6, pts: [[H * 0.3, 0], [H * 0.3 + w2 / 2, H * 0.2], [H * 0.3 + w2 / 2, H * 0.7], [H * 0.6, H], [H * 0.3 + w2 / 2, H * 0.88], [H * 0.3 - w2 / 2, H * 0.88], [0, H], [H * 0.3 - w2 / 2, H * 0.7], [H * 0.3 - w2 / 2, H * 0.2]] };
    }
    let ang = 30, auto = true;
    function draw() {
      const v = vals(el), H = v.size, o = outline(v.shape, H), w = v.t - v.k;
      const A = notch(o.pts, o.W / 2, w, H / 2, true), B = notch(o.pts, o.W / 2, w, H / 2, false);
      const gap = 6;
      const body = `<path d="${poly(A)}" ${CUT}/><g transform="translate(${f2(o.W + gap)} 0)"><path d="${poly(B)}" ${CUT}/></g>`;
      const tw = o.W * 2 + gap;
      preview(el.querySelector('.s2'), tw, H, body + `<text x="${o.W / 2}" y="${H + 1.5}" font-size="5" text-anchor="middle" fill="#7a6a60" dominant-baseline="hanging"></text>`);
      last = svgDoc(tw, H, body);
      const S = 180 / H;
      const face = (pts, tr) => `<div class="face" style="transform:${tr}"><svg width="${o.W * S}" height="${H * S}" viewBox="0 0 ${o.W} ${H}"><path d="${poly(pts)}" fill="#d9a86c" fill-opacity=".9" stroke="#8a5a2a" stroke-width="${1 / S * 1.5}"/></svg></div>`;
      el.querySelector('.sc').innerHTML = face(A, `translate3d(${-o.W * S / 2}px,${-H * S / 2}px,0)`) + face(B, `translate3d(0,${-H * S / 2}px,${o.W * S / 2}px) rotateY(90deg)`);
      el.querySelector('.sc').dataset.ok = 1;
      res(el.querySelector('.res'), 'ok', `每片 ${o.W.toFixed(0)} × ${H} mm，卡槽畫 ${w.toFixed(2)} mm 寬、${(H / 2).toFixed(0)} mm 深。右邊可以拖拉旋轉看組合後的樣子。`);
    }
    function spin() { el.querySelector('.sc').style.transform = `rotateX(-18deg) rotateY(${ang}deg)`; }
    live(el, () => { draw(); spin(); });
    const s3 = el.querySelector('.s3'); let dx = null;
    s3.addEventListener('pointerdown', e => { dx = e.clientX; auto = false; s3.setPointerCapture(e.pointerId); });
    s3.addEventListener('pointermove', e => { if (dx === null) return; ang += (e.clientX - dx) * 0.6; dx = e.clientX; spin(); });
    s3.addEventListener('pointerup', () => { dx = null; });
    (function loop() { if (auto && el.isConnected) { ang += 0.4; spin(); } requestAnimationFrame(loop); })();
    el.querySelector('.dl').onclick = () => download('十字插接造型.svg', last);
  };

  /* ======================= 16. 手機架產生器 ======================= */
  LT.phonestand = function (el) {
    head(el, '📱 手機架產生器', '2 片側板＋2 根橫桿，用卡槽插起來。調整角度和手機厚度（有手機殼要量含殼的厚度），左邊會畫出手機靠上去的樣子。');
    add(el, `<div class="ctl">${slider('ang', '靠背角度', 50, 80, 1, 65, '度')}${slider('pt', '手機厚度（含殼）', 7, 16, 0.5, 11, 'mm')}${slider('wd', '手機架寬度', 50, 110, 5, 80, 'mm')}
      ${slider('t', '板厚', 2.5, 3.5, 0.05, 3, 'mm')}${slider('k', '切縫', 0, 0.3, 0.01, 0.15, 'mm')}</div>
      <div class="two"><div><p class="small">側面看（灰色是手機）</p><div class="stage side"></div></div><div><p class="small">要切的零件</p><div class="stage parts"></div></div></div>
      <div class="row" style="margin-top:8px"><button class="btn blue dl">⬇️ 下載手機架 SVG</button></div><div class="res"></div>`);
    let last = '';
    function draw() {
      const v = vals(el), th = v.ang * Math.PI / 180, c = Math.cos(th), s = Math.sin(th);
      const lipT = 8, lipH = 12, baseH = 16, Ls = 90, aw = 18, hb = 16, ws = v.t - v.k;
      const gap = v.pt / s + 2;
      const A = [lipT + gap, baseH], B = [A[0] + Ls * c, A[1] + Ls * s], B2 = [B[0] + aw * s, B[1] - aw * c];
      const Lb = B2[0], Ht = B[1];
      const x1 = (lipT + A[0]) / 2, x2 = Lb - 12;
      const slot = x => [[x - ws / 2, 0], [x - ws / 2, hb / 2], [x + ws / 2, hb / 2], [x + ws / 2, 0]];
      const up = [[0, 0], ...slot(x1), ...slot(x2), [Lb, 0], B2, B, A, [lipT, baseH], [lipT, baseH + lipH], [0, baseH + lipH]];
      const prof = up.map(p => [p[0], Ht - p[1]]);
      const phone = [A, [A[0] + 150 * c, A[1] + 150 * s], [A[0] + 150 * c - v.pt * s, A[1] + 150 * s + v.pt * c], [A[0] - v.pt * s, A[1] + v.pt * c]].map(p => [p[0], Ht - p[1]]);
      const top = Math.min(...phone.map(p => p[1]), 0) - 4, right = Math.max(...phone.map(p => p[0]), Lb) + 4;
      el.querySelector('.side').innerHTML = `<svg viewBox="-6 ${f2(top)} ${f2(right + 6)} ${f2(Ht - top + 10)}" style="width:100%;max-height:340px;display:block"><rect x="-6" y="${f2(top)}" width="${f2(right + 6)}" height="${f2(Ht - top + 10)}" fill="#fdfaf5"/>
        <line x1="-6" y1="${Ht}" x2="${right}" y2="${Ht}" stroke="#aaa"/><path d="${poly(phone)}" fill="#555" opacity=".75"/><path d="${poly(prof)}" fill="#d9a86c" stroke="#8a5a2a" stroke-width=".8"/></svg>`;
      // 橫桿：卡槽從上面開，離兩端 8 mm
      const bw = v.wd, sx = [8 + v.t / 2, bw - 8 - v.t / 2];
      const bar = [[0, 0], ...sx.flatMap(x => [[x - ws / 2, 0], [x - ws / 2, hb / 2], [x + ws / 2, hb / 2], [x + ws / 2, 0]]), [bw, 0], [bw, hb], [0, hb]];
      const g = 5;
      const W = Math.max(2 * Lb + g, 2 * bw + g), Hh = Ht + g + hb;
      const tr = (pts, dx, dy) => pts.map(p => [p[0] + dx, p[1] + dy]);
      const body = [tr(prof, 0, 0), tr(prof, Lb + g, 0), tr(bar, 0, Ht + g), tr(bar, bw + g, Ht + g)].map(p => `<path d="${poly(p)}" ${CUT}/>`).join('');
      preview(el.querySelector('.parts'), W, Hh, body);
      last = svgDoc(W, Hh, body);
      const tip = v.ang < 55 ? '⚠️ 角度太小，手機會比較躺，看影片可能要低頭。' : v.ang > 76 ? '⚠️ 角度太大，手機容易往前倒。' : '✅ 角度適合看影片和視訊。';
      res(el.querySelector('.res'), v.ang < 55 || v.ang > 76 ? 'mid' : 'ok', `側板 ${Lb.toFixed(0)} × ${Ht.toFixed(0)} mm ×2、橫桿 ${bw} × ${hb} mm ×2，全部 ${W.toFixed(0)} × ${Hh.toFixed(0)} mm。<br>${tip}`);
    }
    live(el, draw);
    el.querySelector('.dl').onclick = () => download('手機架.svg', last);
  };

  /* ======================= 17. 鏤空花紋產生器 ======================= */
  LT.pattern = function (el) {
    head(el, '🌸 鏤空花紋產生器（側板裝飾）', '在一片板子上排滿小洞。洞和洞之間的「橋」至少要 2.5 mm，不然會斷；洞越多，切割時間越長。');
    add(el, `<div class="ctl">${num('w', '板寬', 80)}${num('h', '板高', 100)}<div><label>花紋</label><select data-k="type"><option value="circle">圓點</option><option value="hex">蜂巢六角形</option><option value="diamond">菱形</option><option value="heart">愛心</option></select></div>
      ${slider('c', '洞的大小', 4, 20, 1, 8, 'mm')}${slider('g', '橋寬（洞的間距）', 1, 8, 0.5, 3, 'mm')}${slider('m', '留邊', 4, 20, 1, 10, 'mm')}${slider('spd', '切割速度', 3, 10, 1, 5, 'mm/秒')}</div>
      <div class="two"><div class="stage"></div><div><div class="res"></div><button class="btn blue dl" style="margin-top:8px">⬇️ 下載花紋板 SVG</button></div></div>`);
    let last = '';
    function draw() {
      const v = vals(el), W = Math.max(30, v.w), H = Math.max(30, v.h);
      const pitch = v.c + v.g, rowH = v.type === 'hex' ? pitch * 0.866 : pitch;
      const cols = Math.floor((W - 2 * v.m + v.g) / pitch), rows = Math.floor((H - 2 * v.m - v.c) / rowH) + 1;
      let body = `<path d="${roundRect(0, 0, W, H, 2)}" ${CUT}/>`, len = 2 * (W + H), cnt = 0;
      const ox = (W - (cols * pitch - v.g)) / 2 + v.c / 2, oy = (H - ((rows - 1) * rowH + v.c)) / 2 + v.c / 2;
      for (let r = 0; r < rows; r++) {
        const off = v.type === 'hex' && r % 2 ? pitch / 2 : 0;
        for (let c = 0; c < cols; c++) {
          const x = ox + c * pitch + off, y = oy + r * rowH, R = v.c / 2;
          if (x + R > W - v.m + 0.01) continue;
          let d, per;
          if (v.type === 'circle') { d = circlePath(x, y, R); per = Math.PI * v.c; }
          else if (v.type === 'hex') { const pts = []; for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; pts.push([x + R * Math.cos(a), y + R * Math.sin(a)]); } d = poly(pts); per = 6 * R; }
          else if (v.type === 'diamond') { d = poly([[x, y - R], [x + R, y], [x, y + R], [x - R, y]]); per = 4 * R * 1.414; }
          else { const k = R / 26; d = `M${f2(x)},${f2(y + 22 * k)} C${f2(x - 28 * k)},${f2(y + 4 * k)} ${f2(x - 24 * k)},${f2(y - 22 * k)} ${f2(x - 8 * k)},${f2(y - 22 * k)} C${f2(x - 3 * k)},${f2(y - 22 * k)} ${f2(x)},${f2(y - 18 * k)} ${f2(x)},${f2(y - 15 * k)} C${f2(x)},${f2(y - 18 * k)} ${f2(x + 3 * k)},${f2(y - 22 * k)} ${f2(x + 8 * k)},${f2(y - 22 * k)} C${f2(x + 24 * k)},${f2(y - 22 * k)} ${f2(x + 28 * k)},${f2(y + 4 * k)} ${f2(x)},${f2(y + 22 * k)} Z`; per = 3.4 * v.c; }
          body += `<path d="${d}" ${CUT}/>`; len += per; cnt++;
        }
      }
      preview(el.querySelector('.stage'), W, H, body);
      last = svgDoc(W, H, body);
      const sec = len / v.spd, mm = Math.floor(sec / 60), ss = Math.round(sec % 60);
      const lv = v.g < 2 ? 'bad' : v.g < 2.5 ? 'mid' : 'ok';
      res(el.querySelector('.res'), lv, `${cnt} 個洞，切割總長約 ${(len / 1000).toFixed(2)} 公尺，預估切 <b>${mm} 分 ${ss} 秒</b>。<br>` + (lv === 'bad' ? '❌ 橋太細，會斷或燒焦。' : lv === 'mid' ? '⚠️ 橋有點細。' : '✅ 橋夠粗。') + (sec > 600 ? '<br>⚠️ 超過 10 分鐘，全班排隊會來不及，洞少一點或大一點。' : ''));
    }
    live(el, draw);
    el.querySelector('.dl').onclick = () => download('鏤空花紋板.svg', last);
  };

  /* ======================= 18. 指接榫盒子／筆筒產生器 ======================= */
  function fingerFace(w, h, e, t, k, fw) {
    // e = {top, right, bottom, left}，值為 'out'（第一段凸出）／'in'（第一段凹進）／'flat'（平的）
    const nOf = (L, p) => { if (p === 'flat') return 1; let n = Math.floor(L / fw); if (n % 2 === 0) n--; return Math.max(3, n); };
    const outAt = (p, i) => p === 'flat' ? true : (p === 'out' ? i % 2 === 0 : i % 2 === 1);
    const inset = (p, i) => (outAt(p, i) ? 0 : t);
    function local(L, p) {
      const n = nOf(L, p), s = L / n, pts = [];
      for (let i = 1; i < n; i++) {
        let u = i * s; const a = outAt(p, i - 1), b = outAt(p, i);
        if (a && !b) u += k / 2; if (!a && b) u -= k / 2;
        pts.push([u, inset(p, i - 1)], [u, inset(p, i)]);
      }
      return pts;
    }
    const { top, right, bottom, left } = e;
    const TL = [inset(left, 0), inset(top, 0)], TR = [w - inset(right, 0), inset(top, 0)], BR = [w - inset(right, 0), h - inset(bottom, 0)], BL = [inset(left, 0), h - inset(bottom, 0)];
    const P = [TL];
    local(w, top).forEach(([u, d]) => P.push([u, d]));
    P.push(TR);
    local(h, right).forEach(([u, d]) => P.push([w - d, u]));
    P.push(BR);
    local(w, bottom).reverse().forEach(([u, d]) => P.push([u, h - d]));
    P.push(BL);
    local(h, left).reverse().forEach(([u, d]) => P.push([d, u]));
    return P;
  }
  LT.box = function (el) {
    const mode0 = el.dataset.mode || 'open';
    head(el, '📦 指接榫盒子產生器', '輸入<b>外部尺寸</b>，自動畫出像手指交叉的卡榫。下載後用 Inkscape 在每一面加上圖案、名字（黑色填滿＝雕刻），<b>不要動到紅色外框的卡榫</b>。');
    add(el, `<div class="ctl"><div><label>種類</label><select data-k="mode"><option value="open">筆筒（沒有蓋子）</option><option value="closed">盒子（六面全封閉）</option><option value="lid">盒子＋可拿起的蓋子</option></select></div>
      ${num('W', '寬（左右）', 70)}${num('D', '深（前後）', 70)}${num('H', '高', 90)}
      ${slider('t', '板厚', 2.5, 3.5, 0.05, 3, 'mm')}${slider('fw', '卡榫寬度', 6, 20, 1, 10, 'mm')}${slider('k', '切縫補償', 0, 0.3, 0.01, 0.1, 'mm')}
      ${num('bw', '材料板寬', 300)}${num('bh', '材料板高', 200)}</div>
      <div class="two"><div><p class="small">要切的零件（紅線）</p><div class="stage parts"></div></div><div><p class="small">組合後（拖拉旋轉）</p><div class="stage box3d s3"><div class="sc"></div></div></div></div>
      <div class="row" style="margin-top:8px"><button class="btn blue dl">⬇️ 下載盒子 SVG</button></div><div class="res"></div>`);
    el.querySelector('[data-k=mode]').value = mode0;
    if (mode0 === 'open') { el.querySelector('[data-k=H]').value = 90; } else { el.querySelector('[data-k=W]').value = 90; el.querySelector('[data-k=D]').value = 70; el.querySelector('[data-k=H]').value = 50; }
    let last = '', ang = -35, auto = true;
    function draw() {
      const v = vals(el);
      const W = Math.max(30, v.W), D = Math.max(30, v.D), H = Math.max(20, v.H), t = v.t, k = v.k, fw = Math.max(v.fw, 2 * t);
      const openTop = v.mode !== 'closed';
      const tp = openTop ? 'flat' : 'in';
      const faces = [
        ['前', W, H, { top: tp, bottom: 'in', left: 'out', right: 'out' }],
        ['後', W, H, { top: tp, bottom: 'in', left: 'out', right: 'out' }],
        ['左', D, H, { top: tp, bottom: 'in', left: 'in', right: 'in' }],
        ['右', D, H, { top: tp, bottom: 'in', left: 'in', right: 'in' }],
        ['底', W, D, { top: 'out', bottom: 'out', left: 'out', right: 'out' }],
      ];
      if (v.mode === 'closed') faces.push(['頂', W, D, { top: 'out', bottom: 'out', left: 'out', right: 'out' }]);
      const polys = faces.map(f => ({ name: f[0], w: f[1], h: f[2], pts: fingerFace(f[1], f[2], f[3], t, k, fw) }));
      if (v.mode === 'lid') {
        polys.push({ name: '蓋', w: W, h: D, pts: [[0, 0], [W, 0], [W, D], [0, D]] });
        const c = 0.6, iw = W - 2 * t - c, id = D - 2 * t - c;
        polys.push({ name: '蓋內', w: iw, h: id, pts: [[0, 0], [iw, 0], [iw, id], [0, id]] });
      }
      // 排版：一排一排放
      const g = 4; let x = 0, y = 0, rowH = 0, maxW = 0; const maxRow = Math.max(v.bw, 2 * W + 3 * g);
      polys.forEach(p => { if (x > 0 && x + p.w > maxRow) { x = 0; y += rowH + g; rowH = 0; } p.x = x; p.y = y; x += p.w + g; rowH = Math.max(rowH, p.h); maxW = Math.max(maxW, x - g); });
      const TW = maxW, TH = y + rowH;
      let body = '', per = 0;
      polys.forEach(p => {
        body += `<path d="${poly(p.pts.map(q => [q[0] + p.x, q[1] + p.y]))}" ${CUT}/>`;
        for (let i = 0; i < p.pts.length; i++) { const a = p.pts[i], b = p.pts[(i + 1) % p.pts.length]; per += Math.hypot(b[0] - a[0], b[1] - a[1]); }
      });
      const labels = polys.map(p => `<text x="${f2(p.x + p.w / 2)}" y="${f2(p.y + p.h / 2)}" font-size="${f2(Math.min(p.w, p.h) / 5)}" text-anchor="middle" dominant-baseline="central" fill="#8a5a2a" opacity=".6">${p.name}</text>`).join('');
      preview(el.querySelector('.parts'), Math.max(TW, 10), Math.max(TH, 10), body + labels);
      last = svgDoc(TW, TH, body);
      // 3D
      const S = 170 / Math.max(W, D, H);
      const face = (p, tr, op = 0.92) => `<div class="face" style="transform:${tr}"><svg width="${f2(p.w * S)}" height="${f2(p.h * S)}" viewBox="0 0 ${f2(p.w)} ${f2(p.h)}"><path d="${poly(p.pts)}" fill="#d9a86c" fill-opacity="${op}" stroke="#7a4a1a" stroke-width="${f2(1.2 / S)}"/></svg></div>`;
      const P = n => polys.find(p => p.name === n);
      const px = q => f2(q * S);
      let h3 = face(P('前'), `translate3d(${px(-W / 2)}px,${px(-H / 2)}px,${px(D / 2 - t / 2)}px)`)
        + face(P('後'), `translate3d(${px(-W / 2)}px,${px(-H / 2)}px,${px(-D / 2 + t / 2)}px)`)
        + face(P('左'), `translate3d(${px(-W / 2 + t / 2)}px,${px(-H / 2)}px,${px(D / 2)}px) rotateY(90deg)`)
        + face(P('右'), `translate3d(${px(W / 2 - t / 2)}px,${px(-H / 2)}px,${px(D / 2)}px) rotateY(90deg)`)
        + face(P('底'), `translate3d(${px(-W / 2)}px,${px(H / 2 - t / 2)}px,${px(-D / 2)}px) rotateX(90deg)`);
      if (P('頂')) h3 += face(P('頂'), `translate3d(${px(-W / 2)}px,${px(-H / 2 + t / 2)}px,${px(-D / 2)}px) rotateX(90deg)`);
      if (P('蓋')) h3 += face(P('蓋'), `translate3d(${px(-W / 2)}px,${px(-H / 2 - t * 4)}px,${px(-D / 2)}px) rotateX(90deg)`, 0.75);
      el.querySelector('.sc').innerHTML = h3;
      const fits = (TW <= v.bw && TH <= v.bh) || (TH <= v.bw && TW <= v.bh);
      const min = Math.round(per / 5 / 60 * 10) / 10;
      const msgs = [`內部空間約 ${f2(W - 2 * t)} × ${f2(D - 2 * t)} × ${f2(openTop ? H - t : H - 2 * t)} mm；全部零件 ${f2(TW)} × ${f2(TH)} mm；切割總長 ${(per / 1000).toFixed(2)} 公尺（速度 5 mm/秒約 ${min} 分鐘）。`];
      let lv = 'ok';
      if (!fits) { lv = 'bad'; msgs.push(`❌ 放不進 ${v.bw} × ${v.bh} mm 的材料板，把盒子改小或分兩塊板子切。`); }
      if (TW > 400 || TH > 375) { lv = 'bad'; msgs.push('❌ 超過 Beambox 工作範圍（約 400 × 375 mm）。'); }
      if (v.fw < 2 * t) msgs.push(`⚠️ 卡榫寬度至少要板厚的 2 倍，已自動改成 ${fw} mm。`);
      if (fits && lv === 'ok') msgs.push('✅ 可以切！先切一個小的試試看卡榫鬆緊，再調整「切縫補償」。');
      res(el.querySelector('.res'), lv, msgs.join('<br>'));
      spin();
    }
    function spin() { el.querySelector('.sc').style.transform = `rotateX(-24deg) rotateY(${ang}deg)`; }
    live(el, draw);
    const s3 = el.querySelector('.s3'); let dx = null;
    s3.addEventListener('pointerdown', e => { dx = e.clientX; auto = false; s3.setPointerCapture(e.pointerId); });
    s3.addEventListener('pointermove', e => { if (dx === null) return; ang += (e.clientX - dx) * 0.6; dx = e.clientX; spin(); });
    s3.addEventListener('pointerup', () => { dx = null; });
    (function loop() { if (auto && el.isConnected) { ang += 0.3; spin(); } requestAnimationFrame(loop); })();
    el.querySelector('.dl').onclick = () => download(el.querySelector('[data-k=mode]').value === 'open' ? '筆筒.svg' : '盒子.svg', last);
  };
  LT._fingerFace = fingerFace;

  /* ======================= 19. 排版省材料 ======================= */
  LT.nesting = function (el) {
    head(el, '🧱 排版省材料：把零件擺進材料板', '拖拉零件、<b>點兩下旋轉 90 度</b>。零件之間留 2～3 mm，紅色代表重疊或超出板子。也可以按「自動排版」。');
    add(el, `<div class="ctl">${num('bw', '材料板寬', 300)}${num('bh', '材料板高', 200)}</div>
      <label class="small">零件清單（每行：名稱,寬,高）</label><textarea class="list" rows="4">前板,90,60\n後板,90,60\n左板,70,60\n右板,70,60\n底板,90,70\n手機架側板,75,98</textarea>
      <div class="row" style="margin:6px 0"><button class="btn ghost sm apply">套用清單</button><button class="btn sm auto">✨ 自動排版</button></div>
      <div class="stage"><svg style="width:100%;display:block;touch-action:none"></svg></div><div class="res"></div>`);
    const S = el.querySelector('svg'); let parts = [];
    function parse() {
      const v = vals(el);
      parts = el.querySelector('.list').value.split('\n').map(l => l.split(/[,，\s]+/)).filter(a => a.length >= 3 && +a[1] > 0 && +a[2] > 0)
        .map((a, i) => ({ n: a[0], w: +a[1], h: +a[2], x: 4 + (i % 4) * 20, y: v.bh + 10 + Math.floor(i / 4) * 20 }));
      autoPack(); draw();
    }
    function autoPack() {
      const v = vals(el), g = 3; let x = g, y = g, rh = 0;
      [...parts].sort((a, b) => b.h - a.h).forEach(p => {
        if (p.w > p.h && p.w > v.bw - 2 * g) { const t = p.w; p.w = p.h; p.h = t; }
        if (x + p.w > v.bw - g + 0.01) { x = g; y += rh + g; rh = 0; }
        p.x = x; p.y = y; x += p.w + g; rh = Math.max(rh, p.h);
      });
    }
    function draw() {
      const v = vals(el), H = Math.max(v.bh, ...parts.map(p => p.y + p.h)) + 6, W = Math.max(v.bw, ...parts.map(p => p.x + p.w)) + 6;
      S.setAttribute('viewBox', `-4 -4 ${W + 4} ${H + 4}`);
      const bad = new Set();
      parts.forEach((p, i) => {
        if (p.x < 0 || p.y < 0 || p.x + p.w > v.bw || p.y + p.h > v.bh) bad.add(i);
        parts.forEach((q, j) => { if (j > i && p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h) { bad.add(i); bad.add(j); } });
      });
      S.innerHTML = `<rect x="0" y="0" width="${v.bw}" height="${v.bh}" fill="#f3dfc1" stroke="#8a5a2a" stroke-width="1"/>` + parts.map((p, i) => `<g class="nest-part" data-i="${i}"><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${bad.has(i) ? '#f8b4b4' : '#d9a86c'}" stroke="${bad.has(i) ? '#e8505b' : '#7a4a1a'}" stroke-width="1"/><text x="${p.x + p.w / 2}" y="${p.y + p.h / 2}" font-size="${Math.min(10, p.w / 5)}" text-anchor="middle" dominant-baseline="central" pointer-events="none">${p.n}</text></g>`).join('');
      const used = parts.filter((p, i) => !bad.has(i)).reduce((s, p) => s + p.w * p.h, 0);
      const pct = Math.round(used / (v.bw * v.bh) * 100);
      res(el.querySelector('.res'), bad.size ? 'bad' : 'ok', bad.size ? `❌ 有 ${bad.size} 個零件重疊或超出板子（紅色）。` : `✅ 全部放進去了！材料使用率 <b>${pct}%</b>，剩下的邊角料可以做鑰匙圈。`);
    }
    let drag = null;
    S.addEventListener('pointerdown', e => { const g = e.target.closest('.nest-part'); if (!g) return; const p = parts[g.dataset.i], q = svgPt(S, e); drag = [p, q.x - p.x, q.y - p.y]; S.setPointerCapture(e.pointerId); });
    S.addEventListener('pointermove', e => { if (!drag) return; const q = svgPt(S, e); drag[0].x = Math.round(q.x - drag[1]); drag[0].y = Math.round(q.y - drag[2]); draw(); });
    S.addEventListener('pointerup', () => { drag = null; });
    S.addEventListener('dblclick', e => { const g = e.target.closest('.nest-part'); if (!g) return; const p = parts[g.dataset.i]; [p.w, p.h] = [p.h, p.w]; draw(); });
    el.querySelector('.apply').onclick = parse;
    el.querySelector('.auto').onclick = () => { autoPack(); draw(); };
    el.querySelectorAll('[data-k]').forEach(i => i.addEventListener('input', draw));
    parse();
  };

  /* ======================= 20. 切割時間估算 ======================= */
  LT.cuttime = function (el) {
    head(el, '⏱️ 全班切割排隊計算機', '雷射切割機只有一台（或兩台），每個人的作品要排隊。算算看今天需要多少時間，才知道要不要把大家的作品合併成一個檔案一起切。');
    add(el, `<div class="ctl">${slider('n', '人數', 5, 30, 1, 20, '人')}${slider('per', '每件作品切割時間', 0.5, 10, 0.5, 2, '分鐘')}${slider('ch', '換板、對焦、預覽', 0.5, 5, 0.5, 2, '分鐘／次')}${slider('mc', '機器台數', 1, 3, 1, 1, '台')}${slider('grp', '幾件合併成一次切', 1, 10, 1, 4, '件')}</div><div class="res"></div>`);
    live(el, () => {
      const v = vals(el), runs = Math.ceil(v.n / v.grp), total = (v.n * v.per + runs * v.ch) / v.mc, single = (v.n * (v.per + v.ch)) / v.mc;
      res(el.querySelector('.res'), total > 35 ? 'bad' : total > 25 ? 'mid' : 'ok', `合併切：${runs} 次，共約 <b>${Math.ceil(total)} 分鐘</b>（一個一個切要 ${Math.ceil(single)} 分鐘）。<br>` + (total > 35 ? '❌ 一節課 40 分鐘切不完，作品改小、多合併幾件，或下次課接著切。' : total > 25 ? '⚠️ 大概要用掉大半節課，沒輪到的同學先做其他任務。' : '✅ 一節課切得完！'));
    });
  };

  window.LT = LT;
})();
