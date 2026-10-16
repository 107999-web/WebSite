/* =========================================================
 * 互動學習網｜單元頁引擎
 * 讀取 window.UNIT_DATA（各單元資料夾的 data.js），產生：
 *   頁首、分頁標籤、各小節內容區塊、互動實驗、題目與進度
 *
 * 區塊（block）欄位：
 *   title, kind('activity'|'charge'|'lab'|'practice'|'safety'), tags[{t,c}]
 *   html      —— 內容文字（HTML）
 *   widget    —— 互動元件名稱（widgets.js 中註冊），widgetOpts 為參數
 *   cards     —— 字卡 [{front, back}]
 *   questions —— 題目陣列；exam:true 時改為整份交卷模式
 *
 * 題型（question.type）：
 *   single   單選   {q, opts[], ans:索引}
 *   multi    複選   {q, opts[], ans:[索引...]}
 *   classify 分類   {q, cats[], items[{t, a:分類索引}]}
 *   fill     填空   {q, text:'...{{答案|選項1,選項2}}...'}（可含表格 HTML）
 *   open     開放題 {q, ref:'參考答案'}（不計分）
 *   共同欄位：explain（說明）、src（出處標籤，如「習作 p.2」）
 *
 * 單元設定 UNIT_DATA.shuffleOptions = true 時，單選題的選項順序會依題目 id
 * 固定打散（每次開啟順序相同），避免答案集中在同一個位置；
 * 個別題目可加 keepOrder: true 保留原順序。批改一律以原本的 ans 索引為準。
 * ========================================================= */
(function () {
  'use strict';
  const D = window.UNIT_DATA;
  const { Progress, esc } = window.Hub;
  const W = window.UnitWidgets || {};
  let gradableTotal = 0;
  const tabQuestionIds = {};

  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), 1800);
  }

  const tagHtml = tags => (tags || []).map(x => `<span class="tag ${x.c || ''}">${esc(x.t)}</span>`).join(' ');

  /* ---------------- 題目 ---------------- */
  function buildQuestion(q, qid, no, examMode) {
    const el = document.createElement('div');
    el.className = 'q';
    el.dataset.qid = qid;
    const src = q.src ? `<span class="tag wb">${esc(q.src)}</span>` : '';
    let body = '';
    if (q.type === 'single' || q.type === 'multi') {
      const order = q.opts.map((o, i) => i);
      if (D.shuffleOptions && q.type === 'single' && !q.keepOrder) {
        let h = 2166136261; // FNV-1a 雜湊，再用 mulberry32 產生固定的亂數
        for (const ch of qid) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
        const rnd = () => { h = (h + 0x6D2B79F5) >>> 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      }
      body = `<div class="opts">${order.map(i =>
        `<button type="button" class="opt ${q.type === 'single' ? 'single' : ''}" data-i="${i}"><span class="box"></span><span>${q.opts[i]}</span></button>`).join('')}</div>`;
    } else if (q.type === 'classify') {
      body = q.items.map((it, i) => `
        <div class="classify-row" data-i="${i}">
          <span>${it.t}</span>
          <span class="seg">${q.cats.map((c, ci) => `<button type="button" class="k-btn ghost small" data-c="${ci}" aria-pressed="false">${c}</button>`).join('')}</span>
        </div>`).join('');
    } else if (q.type === 'fill') {
      let n = 0;
      body = `<div class="fill">${q.text.replace(/\{\{(.+?)\}\}/g, (m, inner) => {
        const [ans, list] = inner.split('|');
        const opts = (list ? list.split(',') : (q.options || [])).map(s => s.trim());
        const idx = n++;
        return `<select data-i="${idx}" data-ans="${esc(ans.trim())}" aria-label="第 ${idx + 1} 格"><option value="">請選擇</option>${opts.map(o => `<option>${esc(o)}</option>`).join('')}</select>`;
      })}</div>`;
    } else if (q.type === 'open') {
      body = `<textarea placeholder="寫下你的想法…"></textarea>`;
    }
    const foot = q.type === 'open'
      ? `<button type="button" class="k-btn alt small" data-act="ref">看參考答案</button>`
      : (examMode ? '' : `<button type="button" class="k-btn small" data-act="check">檢查答案</button>
         <button type="button" class="k-btn ghost small" data-act="reset">重做</button>`);
    el.innerHTML = `
      <div class="q-head"><span class="q-no">${no}</span><span>${q.q}</span>${src}</div>
      ${body}
      <div class="q-foot">${foot}<span class="feedback" aria-live="polite"></span></div>
      ${q.explain ? `<div class="explain">${q.explain}</div>` : ''}
      ${q.ref ? `<div class="ref">${q.ref}</div>` : ''}`;

    /* 互動 */
    el.addEventListener('click', e => {
      const opt = e.target.closest('.opt');
      if (opt && !el.classList.contains('locked')) {
        if (q.type === 'single') el.querySelectorAll('.opt').forEach(o => o.classList.remove('sel'));
        opt.classList.toggle('sel');
      }
      const cb = e.target.closest('.classify-row .k-btn');
      if (cb && !el.classList.contains('locked')) {
        cb.parentElement.querySelectorAll('.k-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
        cb.setAttribute('aria-pressed', 'true');
      }
      const act = e.target.closest('[data-act]');
      if (!act) return;
      if (act.dataset.act === 'check') grade(el, q, true);
      if (act.dataset.act === 'reset') resetQ(el);
      if (act.dataset.act === 'ref') {
        el.querySelector('.ref').classList.toggle('show');
        act.textContent = el.querySelector('.ref').classList.contains('show') ? '收起參考答案' : '看參考答案';
      }
    });
    return el;
  }

  function resetQ(el) {
    el.classList.remove('locked');
    el.querySelectorAll('.opt').forEach(o => o.classList.remove('sel', 'right', 'wrong', 'miss'));
    el.querySelectorAll('.classify-row').forEach(r => {
      r.classList.remove('right', 'wrong');
      r.querySelectorAll('.k-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
    });
    el.querySelectorAll('select').forEach(s => { s.value = ''; s.classList.remove('right', 'wrong'); });
    const fb = el.querySelector('.feedback'); fb.textContent = ''; fb.className = 'feedback';
    const ex = el.querySelector('.explain'); if (ex) ex.classList.remove('show');
  }

  /* 批改：回傳是否全對 */
  function grade(el, q, save) {
    let ok = true, answered = true;
    if (q.type === 'single' || q.type === 'multi') {
      const ans = Array.isArray(q.ans) ? q.ans : [q.ans];
      const opts = [...el.querySelectorAll('.opt')];
      if (!opts.some(o => o.classList.contains('sel'))) answered = false;
      opts.forEach(o => {
        const i = Number(o.dataset.i);
        const sel = o.classList.contains('sel'), should = ans.includes(i);
        o.classList.remove('right', 'wrong', 'miss');
        if (sel && should) o.classList.add('right');
        else if (sel && !should) { o.classList.add('wrong'); ok = false; }
        else if (!sel && should) { o.classList.add('miss'); ok = false; }
      });
    } else if (q.type === 'classify') {
      el.querySelectorAll('.classify-row').forEach((r, i) => {
        const p = r.querySelector('[aria-pressed="true"]');
        if (!p) answered = false;
        const good = p && Number(p.dataset.c) === q.items[i].a;
        r.classList.toggle('right', !!good);
        r.classList.toggle('wrong', !good);
        if (!good) ok = false;
      });
    } else if (q.type === 'fill') {
      el.querySelectorAll('select').forEach(s => {
        if (!s.value) answered = false;
        const good = s.value === s.dataset.ans;
        s.classList.toggle('right', good);
        s.classList.toggle('wrong', !good);
        if (!good) ok = false;
      });
    }
    const fb = el.querySelector('.feedback');
    if (!answered && !ok) {
      fb.textContent = '還有題目沒作答喔！'; fb.className = 'feedback bad';
    } else {
      fb.textContent = ok ? '答對了！好棒 🎉' : '再想想看，綠色虛線框是漏選的答案 💪';
      fb.className = 'feedback ' + (ok ? 'good' : 'bad');
    }
    const ex = el.querySelector('.explain');
    if (ex && answered) ex.classList.add('show');
    if (save) {
      Progress.mark(D.id, el.dataset.qid, { ok });
      refreshTabMarks();
      if (ok) toast('答對了！✨');
    }
    return ok;
  }

  /* ---------------- 區塊 ---------------- */
  function buildBlock(b, tabId, bi) {
    const sec = document.createElement('section');
    sec.className = 'block ' + (b.kind || '');
    const icon = { activity: '🔍', charge: '🔋', lab: '🧪', practice: '✏️', safety: '⚠️' }[b.kind] || '🌸';
    if (b.title) sec.insertAdjacentHTML('beforeend', `<h3>${icon} ${b.title} ${tagHtml(b.tags)}</h3>`);
    if (b.html) sec.insertAdjacentHTML('beforeend', b.html);
    if (b.widget) {
      const w = document.createElement('div');
      w.className = 'widget';
      sec.appendChild(w);
      if (W[b.widget]) W[b.widget](w, b.widgetOpts || {});
      else w.textContent = '（互動元件載入失敗：' + b.widget + '）';
    }
    if (b.after) sec.insertAdjacentHTML('beforeend', b.after);
    if (b.cards) {
      const grid = document.createElement('div');
      grid.className = 'cards';
      grid.innerHTML = b.cards.map(c => `
        <button type="button" class="flip" aria-label="字卡：${esc(c.front)}（點一下翻面）">
          <div class="inner"><div class="face front">${c.front}</div><div class="face back">${c.back}</div></div>
        </button>`).join('');
      grid.addEventListener('click', e => { const f = e.target.closest('.flip'); if (f) f.classList.toggle('on'); });
      sec.appendChild(grid);
    }
    if (b.questions) {
      const quiz = document.createElement('div');
      quiz.className = 'quiz';
      const built = b.questions.map((q, qi) => {
        const qid = `${tabId}-${bi}-${qi}`;
        if (q.type !== 'open') {
          gradableTotal++;
          (tabQuestionIds[tabId] = tabQuestionIds[tabId] || []).push(qid);
        }
        const el = buildQuestion(q, qid, q.no || (qi + 1), b.exam);
        quiz.appendChild(el);
        return { el, q };
      });
      sec.appendChild(quiz);
      if (b.exam) {
        const box = document.createElement('div');
        box.className = 'score-box';
        box.innerHTML = `<button type="button" class="k-btn">📮 交卷看分數</button>
          <button type="button" class="k-btn ghost">🔄 重新作答</button><div class="result" aria-live="polite"></div>`;
        const [submit, redo] = box.querySelectorAll('button');
        submit.onclick = () => {
          const graded = built.filter(x => x.q.type !== 'open');
          const right = graded.filter(x => grade(x.el, x.q, true)).length;
          built.forEach(x => x.el.classList.add('locked'));
          const score = Math.round(right / graded.length * 100);
          const msg = score === 100 ? '太厲害了，全部答對！🏆' : score >= 80 ? '很棒喔！把錯的再看一次就更完美了 🌟' : score >= 60 ? '及格了！回到小節複習一下吧 📚' : '別灰心，先複習各小節再挑戰 💪';
          box.querySelector('.result').innerHTML = `<div class="big">${score} 分</div><div>答對 ${right} / ${graded.length} 題　${msg}</div>`;
          box.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
        redo.onclick = () => { built.forEach(x => resetQ(x.el)); box.querySelector('.result').innerHTML = ''; };
        sec.appendChild(box);
      }
    }
    return sec;
  }

  /* ---------------- 分頁 ---------------- */
  function refreshTabMarks() {
    const prog = Progress.load(D.id);
    document.querySelectorAll('.tab').forEach(t => {
      const ids = tabQuestionIds[t.dataset.tab] || [];
      const done = ids.length && ids.every(id => prog[id] && prog[id].ok);
      const m = t.querySelector('.done');
      if (m) m.textContent = done ? '✅' : '';
    });
    const bar = document.querySelector('.unit-hero .progress-bar span');
    const lbl = document.querySelector('.unit-hero .pct');
    if (bar) {
      const pct = Math.round(Progress.ratio(D.id) * 100);
      bar.style.width = pct + '%';
      lbl.textContent = pct + '%';
    }
  }

  function show(tabId, scroll) {
    const exists = D.tabs.some(t => t.id === tabId);
    if (!exists) tabId = D.tabs[0].id;
    document.querySelectorAll('.tab').forEach(t => {
      const on = t.dataset.tab === tabId;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on);
      if (on) t.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + tabId));
    if (scroll) document.querySelector('.tabs').scrollIntoView({ behavior: 'smooth' });
  }

  function init() {
    const app = document.getElementById('app');
    document.title = `單元${D.no} ${D.title}｜${D.subjectName}｜互動學習網`;
    if (D.theme) document.body.classList.add('theme-' + D.theme);
    app.innerHTML = `
      <div class="wrap">
        <header class="hub-header" style="padding-bottom:8px">
          <nav class="crumbs" aria-label="路徑">
            <a href="../../index.html">🏠 互動學習網</a><span>›</span>
            <a href="../index.html">${esc(D.subjectName)}</a><span>›</span><span>單元${D.no}</span>
          </nav>
        </header>
        <div class="unit-hero">
          <div class="big">${D.icon}</div>
          <div>
            <div class="sub">${esc(D.subjectName)}｜單元 ${D.no}</div>
            <h1>${esc(D.title)}</h1>
            <div class="sub">${D.intro || ''}</div>
            <div class="sub" style="margin-top:6px">我的練習進度 <b class="pct">0%</b></div>
            <div class="progress-bar"><span style="width:0"></span></div>
          </div>
        </div>
        <nav class="tabs" role="tablist" aria-label="單元小節"></nav>
        <main id="panels"></main>
        <footer class="hub-footer">內容依據課本與習作整理・學習進度只存在這台裝置的瀏覽器中</footer>
      </div>`;
    const tabs = app.querySelector('.tabs');
    const panels = app.querySelector('#panels');
    D.tabs.forEach((t, ti) => {
      tabs.insertAdjacentHTML('beforeend',
        `<button type="button" class="tab" role="tab" data-tab="${t.id}">${t.label}<span class="done"></span></button>`);
      const p = document.createElement('section');
      p.className = 'panel';
      p.id = 'panel-' + t.id;
      p.setAttribute('role', 'tabpanel');
      p.insertAdjacentHTML('beforeend', `<h2 class="sec-title">${t.num ? `<span class="num">${t.num}</span>` : ''}${t.title}</h2>`);
      if (t.lead) p.insertAdjacentHTML('beforeend', `<p class="lead">${t.lead}</p>`);
      t.blocks.forEach((b, bi) => p.appendChild(buildBlock(b, t.id, bi)));
      const prev = D.tabs[ti - 1], next = D.tabs[ti + 1];
      p.insertAdjacentHTML('beforeend', `<div class="section-nav">
        ${prev ? `<a class="k-btn ghost" href="#${prev.id}">← ${prev.label}</a>` : '<span></span>'}
        ${next ? `<a class="k-btn" href="#${next.id}">${next.label} →</a>` : '<a class="k-btn" href="../index.html">回單元列表 🏠</a>'}
      </div>`);
      panels.appendChild(p);
    });
    tabs.addEventListener('click', e => {
      const b = e.target.closest('.tab');
      if (b) location.hash = b.dataset.tab;
    });
    window.addEventListener('hashchange', () => show(location.hash.slice(1), true));
    const prog = Progress.load(D.id);
    prog.__total = gradableTotal;
    Progress.save(D.id, prog);
    show(location.hash.slice(1), false);
    refreshTabMarks();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
