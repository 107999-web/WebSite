/* =========================================================
 * 社會六上・單元1 消費選擇與理財規劃｜互動元件
 * 金額、匯率、報酬率皆為學習用的示範數字
 * ========================================================= */
(function () {
  'use strict';
  const fmt = n => Math.round(n).toLocaleString('zh-TW');

  /* ---------------- 第1課：匯率換算 ---------------- */
  function exchange(el) {
    let ntd = 3000, rate = 30;
    el.innerHTML = `<div class="controls"><label>💰 新臺幣 <input type="range" min="300" max="30000" step="300" value="3000" class="amt" aria-label="新臺幣金額"></label><b class="a">3,000 元</b></div>
      <div class="controls"><label>📈 匯率：1 美元 ≈ <input type="range" min="28" max="33" step="0.5" value="30" class="rt" aria-label="匯率"></label><b class="r">30 元新臺幣</b></div>
      <div class="stage"></div><div class="say"></div>`;
    const a = el.querySelector('.amt'), r = el.querySelector('.rt');
    a.oninput = () => { ntd = Number(a.value); draw(); };
    r.oninput = () => { rate = Number(r.value); draw(); };
    function draw() {
      el.querySelector('.a').textContent = fmt(ntd) + ' 元';
      el.querySelector('.r').textContent = rate + ' 元新臺幣';
      const usd = ntd / rate;
      el.querySelector('.stage').innerHTML = `<div class="split" style="align-items:center;text-align:center">
        <div class="mini cream"><h4>🇹🇼 新臺幣</h4><div style="font-size:2rem;font-weight:800;color:#E86A8D">${fmt(ntd)}</div>元</div>
        <div style="font-size:2rem">➡️</div>
        <div class="mini sky"><h4>🇺🇸 美元</h4><div style="font-size:2rem;font-weight:800;color:#2F6FA8">${usd.toFixed(1)}</div>美元</div></div>`;
      el.querySelector('.say').innerHTML = `匯率是 1 美元 ≈ ${rate} 元新臺幣，所以 ${fmt(ntd)} ÷ ${rate} ≈ <b>${usd.toFixed(1)} 美元</b>。匯率常常變動：${rate > 30 ? '新臺幣變得比較「不值錢」，能換到的美元<b>變少</b>了。' : rate < 30 ? '新臺幣變得比較「值錢」，能換到的美元<b>變多</b>了。' : '出國前可以先查詢當日匯率，估算能兌換的金額。'}`;
    }
    draw();
  }

  /* ---------------- 第1課：早餐預算挑戰 ---------------- */
  function breakfast(el) {
    const MENU = [
      ['原味蛋餅', 35, '蛋餅'], ['玉米蛋餅', 40, '蛋餅'], ['起司蛋餅', 40, '蛋餅'],
      ['原味飯糰', 30, '飯糰'], ['玉米飯糰', 40, '飯糰'], ['起司飯糰', 40, '飯糰'],
      ['紅茶', 20, '飲料'], ['奶茶', 20, '飲料'], ['鮮奶茶（天然鮮奶）', 50, '飲料']
    ];
    let budget = 30, cart = [], cup = false;
    el.innerHTML = `<div class="controls"><b>媽媽給的預算：</b><span class="seg bud"></span>
      <label style="font-weight:400"><input type="checkbox" class="cup"> 自備飲料杯（飲料省 5 元）</label></div>
      <p class="hint">本店因物價上漲，雞蛋品項（蛋餅）全面調漲 5 元。點選餐點加入，再點一次可以移除。</p>
      <div class="menu" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px"></div>
      <div class="readout"></div><div class="say"></div>`;
    const bud = el.querySelector('.bud');
    [30, 50, 70].forEach(v => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'k-btn ghost small'; b.textContent = v + ' 元'; b.setAttribute('aria-pressed', v === budget);
      b.onclick = () => { budget = v; bud.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); draw(); };
      bud.appendChild(b);
    });
    el.querySelector('.cup').onchange = e => { cup = e.target.checked; draw(); };
    const price = m => m[1] - (cup && m[2] === '飲料' ? 5 : 0);
    function draw() {
      el.querySelector('.menu').innerHTML = MENU.map((m, i) => {
        const on = cart.includes(i);
        return `<button type="button" class="opt ${on ? 'sel' : ''}" data-i="${i}"><span class="box"></span><span>${m[0]}<br><b>${price(m)} 元</b>${m[2] === '蛋餅' ? ' <span class="tag">漲價</span>' : ''}</span></button>`;
      }).join('');
      el.querySelectorAll('.menu .opt').forEach(b => b.onclick = () => {
        const i = Number(b.dataset.i);
        cart = cart.includes(i) ? cart.filter(x => x !== i) : [...cart, i];
        draw();
      });
      const total = cart.reduce((s, i) => s + price(MENU[i]), 0), left = budget - total;
      el.querySelector('.readout').innerHTML = `<span>🧾 總共 <b>${total} 元</b></span><span>💰 預算 <b>${budget} 元</b></span><span>${left >= 0 ? '👛 剩下' : '⚠️ 超出'} <b>${Math.abs(left)} 元</b></span>`;
      el.querySelector('.say').innerHTML = !cart.length ? '先設定預算，再挑選價格合理的商品。想一想：你會考慮<b>價格、品質、個人需求</b>中的哪些因素？'
        : left < 0 ? '❌ <b>超出預算</b>了！可以改點比較便宜的餐點，或在家準備早餐，控制消費支出。'
          : `✅ 在預算內！${cart.some(i => MENU[i][0].includes('鮮奶')) ? '你選了用天然鮮奶做的飲料，比較重視<b>品質</b>。' : ''}${cup ? '自備飲料杯既省錢又<b>友善環境</b>。' : ''}`;
    }
    draw();
  }

  /* ---------------- 第2課：零用錢分配與存錢目標 ---------------- */
  function moneyJar(el) {
    let income = 500, need = 30, want = 20, goal = 1000;
    el.innerHTML = `<div class="controls"><label>💵 每月零用錢 <input type="range" min="100" max="1500" step="50" value="500" class="inc" aria-label="每月零用錢"></label><b class="iv">500 元</b></div>
      <div class="controls"><label>🚌 必須支出 <input type="range" min="0" max="100" step="5" value="30" class="nd" aria-label="必須支出百分比"></label><b class="nv">30%</b>
        <label>🍭 想要購買 <input type="range" min="0" max="100" step="5" value="20" class="wt" aria-label="想要購買百分比"></label><b class="wv">20%</b></div>
      <div class="controls"><label>🎯 存錢目標 <input type="range" min="500" max="6000" step="100" value="1000" class="gl" aria-label="存錢目標"></label><b class="gv">1,000 元</b></div>
      <div class="stage"></div><div class="say"></div>`;
    const q = s => el.querySelector(s);
    q('.inc').oninput = e => { income = Number(e.target.value); draw(); };
    q('.nd').oninput = e => { need = Number(e.target.value); if (need + want > 100) { want = 100 - need; q('.wt').value = want; } draw(); };
    q('.wt').oninput = e => { want = Number(e.target.value); if (need + want > 100) { need = 100 - want; q('.nd').value = need; } draw(); };
    q('.gl').oninput = e => { goal = Number(e.target.value); draw(); };
    function draw() {
      const save = 100 - need - want;
      q('.iv').textContent = fmt(income) + ' 元'; q('.nv').textContent = need + '%'; q('.wv').textContent = want + '%'; q('.gv').textContent = fmt(goal) + ' 元';
      const m = income * save / 100, months = m > 0 ? Math.ceil(goal / m) : Infinity;
      const seg = (p, c, t) => p > 0 ? `<div style="width:${p}%;background:${c};color:#fff;font-weight:800;text-align:center;padding:10px 0;white-space:nowrap;overflow:hidden">${p >= 12 ? t : ''}</div>` : '';
      q('.stage').innerHTML = `<div style="display:flex;border-radius:16px;overflow:hidden;border:3px solid #fff;box-shadow:var(--shadow-soft)">
        ${seg(need, '#2a78d6', '必須 ' + need + '%')}${seg(want, '#e87ba4', '想要 ' + want + '%')}${seg(save, '#1baf7a', '存錢 ' + save + '%')}</div>
        <div class="readout"><span>🚌 必須支出 <b>${fmt(income * need / 100)} 元</b></span><span>🍭 想要購買 <b>${fmt(income * want / 100)} 元</b></span><span>🐷 每月存 <b>${fmt(m)} 元</b></span>
        <span>🎯 達成目標需要 <b>${months === Infinity ? '永遠達不到' : months + ' 個月'}</b></span></div>`;
      q('.say').innerHTML = save === 0 ? '⚠️ 沒有留下存錢的部分，就沒辦法存到大筆支出（例如畢業旅行）的錢喔！'
        : `把零用錢分成「必須支出、想要購買、存錢累積」三部分，每一筆花費都有清楚的理由。像嘉家每月存 250 元，4 個月就能存到畢業旅行要分擔的 1,000 元。`;
    }
    draw();
  }

  /* ---------------- 第2課：記帳本 ---------------- */
  function ledger(el) {
    const rows = [['9/27', '發票中獎', 200, 0], ['9/28', '原子筆', 0, 20], ['9/29', '便當', 0, 80]];
    el.innerHTML = `<div class="tbl-wrap"><table class="k-tbl"><thead><tr><th>日期</th><th>項目</th><th>收入</th><th>支出</th><th>餘額</th><th></th></tr></thead><tbody></tbody></table></div>
      <div class="controls"><input class="it" placeholder="項目（例：文具）" style="font:inherit;border:2px solid #F7E3A1;border-radius:50px;padding:4px 12px;max-width:180px">
        <input class="mo" type="number" min="1" placeholder="金額" style="font:inherit;border:2px solid #F7E3A1;border-radius:50px;padding:4px 12px;width:100px">
        <button type="button" class="k-btn small in">➕ 收入</button><button type="button" class="k-btn alt small out">➖ 支出</button></div><div class="say"></div>`;
    const add = isIn => {
      const it = el.querySelector('.it').value.trim(), mo = Math.round(Number(el.querySelector('.mo').value));
      if (!it || !(mo > 0)) { el.querySelector('.say').innerHTML = '請輸入項目和金額。'; return; }
      const d = new Date();
      rows.push([`${d.getMonth() + 1}/${d.getDate()}`, it, isIn ? mo : 0, isIn ? 0 : mo]);
      el.querySelector('.it').value = ''; el.querySelector('.mo').value = '';
      draw();
    };
    el.querySelector('.in').onclick = () => add(true);
    el.querySelector('.out').onclick = () => add(false);
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    function draw() {
      let bal = 0, tin = 0, tout = 0;
      el.querySelector('tbody').innerHTML = rows.map((r, i) => {
        bal += r[2] - r[3]; tin += r[2]; tout += r[3];
        return `<tr><td>${r[0]}</td><td>${esc(r[1])}</td><td>${r[2] ? r[2] + ' 元' : ''}</td><td>${r[3] ? r[3] + ' 元' : ''}</td><td style="${bal < 0 ? 'color:#E86A8D;font-weight:800' : ''}">${bal} 元</td>
          <td>${i > 2 ? `<button type="button" class="k-btn ghost small" data-del="${i}" aria-label="刪除">✕</button>` : ''}</td></tr>`;
      }).join('');
      el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { rows.splice(Number(b.dataset.del), 1); draw(); });
      el.querySelector('.say').innerHTML = `總收入 <b>${tin} 元</b>、總支出 <b>${tout} 元</b>、餘額 <b>${bal} 元</b>。${bal < 0 ? '⚠️ 餘額變成負的，代表花太多了！' : '記帳可以清楚掌握錢花到哪裡，定期檢視哪些是需要、哪些其實可以少買。'}`;
    }
    draw();
  }

  /* ---------------- 第2課：理財風險比較 ---------------- */
  function riskCompare(el) {
    let pct = 20;
    el.innerHTML = `<div class="controls"><label>📉📈 股票一年後漲跌 <input type="range" min="-20" max="20" step="5" value="20" aria-label="股票漲跌"></label><b class="pv">+20%</b></div>
      <div class="stage"></div><div class="say"></div>`;
    const r = el.querySelector('input');
    r.oninput = () => { pct = Number(r.value); draw(); };
    function draw() {
      el.querySelector('.pv').textContent = (pct > 0 ? '+' : '') + pct + '%';
      const base = 1000000, bank = base + 15000, stock = base * (1 + pct / 100);
      const H = 220, max = 1250000, y = v => H - v / max * (H - 20);
      const bar = (x, v, c, label) => `<rect x="${x}" y="${y(v)}" width="110" height="${H - y(v)}" rx="4" fill="${c}"/>
        <text x="${x + 55}" y="${y(v) - 8}" text-anchor="middle" font-size="15" font-weight="800" fill="#5D4037">${fmt(v)} 元</text>
        <text x="${x + 55}" y="${H + 22}" text-anchor="middle" font-size="15" font-weight="700" fill="#5D4037">${label}</text>`;
      el.querySelector('.stage').innerHTML = `<svg viewBox="0 0 420 270" style="max-width:480px;display:block;margin:0 auto" role="img" aria-label="100 萬元一年後：存入銀行 ${fmt(bank)} 元，購買股票 ${fmt(stock)} 元">
        <line x1="20" y1="${y(base)}" x2="400" y2="${y(base)}" stroke="#BCAAA4" stroke-dasharray="5 4"/><text x="400" y="${y(base) - 4}" text-anchor="end" font-size="12" fill="#8D6E63">本金 100 萬</text>
        ${bar(60, bank, '#2a78d6', '🏦 存入銀行')}${bar(250, stock, stock >= base ? '#1baf7a' : '#eb6834', '📈 購買股票')}
        <line x1="20" y1="${H}" x2="400" y2="${H}" stroke="#8D6E63"/></svg>`;
      el.querySelector('.say').innerHTML = `存入銀行：風險較低，但利息通常較少（一年約多 15,000 元）。購買股票：價格波動大，這次${pct > 0 ? `<b>賺 ${fmt(stock - base)} 元</b>` : pct < 0 ? `<b>賠 ${fmt(base - stock)} 元</b>` : '不賺不賠'}。理財前要先<b>評估自己能承擔的風險</b>，再做出合適的選擇。<br><span class="hint">（賺賠數字僅供參考）</span>`;
    }
    draw();
  }

  window.UnitWidgets = { exchange, breakfast, moneyJar, ledger, riskCompare };
})();
