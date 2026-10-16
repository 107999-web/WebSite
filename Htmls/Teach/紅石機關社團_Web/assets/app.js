/* 紅石機關社團 — 共用程式：導覽列、積木圖、闖關測驗、任務進度、課堂計時、模擬器掛載
   課程清單 window.LESSON_META 由 tools/build.py 產生在 assets/meta.js */
(function () {
  'use strict';

  const META = window.LESSON_META || [];
  const N = META.length;
  const KEY = 'mc-redstone-club';
  const pad = n => String(n).padStart(2, '0');

  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } },
    set(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* 無痕模式時不記錄 */ } },
  };

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }

  function progress(n) {
    const m = store.get()['l' + n] || {};
    const total = m._total || 0;
    const done = Object.keys(m).filter(k => k[0] !== '_' && k.slice(0, 4) !== 'sim_' && m[k]).length;
    return { total, done, sims: Object.keys(m).filter(k => k.slice(0, 4) === 'sim_' && m[k]).length };
  }
  const lessonDone = n => { const p = progress(n); return p.total > 0 && p.done >= p.total; };

  /* ---------- 導覽列 ---------- */
  function renderNav(cur) {
    const bar = document.createElement('div');
    bar.className = 'topbar';
    const prefix = cur ? '' : 'lessons/';
    const home = cur ? '../index.html' : 'index.html';
    let links = '';
    for (let i = 1; i <= N; i++) {
      const cls = (i === cur ? 'on ' : '') + (lessonDone(i) ? 'done' : '');
      links += `<a class="${cls}" style="--u:${META[i - 1].color}" href="${prefix}lesson${pad(i)}.html" title="第 ${i} 堂｜${META[i - 1].title}">${i}</a>`;
    }
    bar.innerHTML = `<div class="in"><a class="brand" href="${home}"><span class="cube rs-cube"></span>紅石機關社團</a><nav class="daynav">${links}</nav></div>`;
    document.body.prepend(bar);

    if (cur) {
      const pg = document.createElement('div');
      pg.className = 'pager';
      const prev = cur > 1 ? `<a class="btn ghost" href="lesson${pad(cur - 1)}.html">← 第 ${cur - 1} 堂</a>` : `<a class="btn ghost" href="../index.html">← 課程總覽</a>`;
      const next = cur < N ? `<a class="btn" href="lesson${pad(cur + 1)}.html">第 ${cur + 1} 堂：${META[cur].title} →</a>` : `<a class="btn" href="../index.html">回課程總覽 →</a>`;
      pg.innerHTML = prev + next;
      const wrap = document.querySelector('.wrap');
      if (wrap) wrap.appendChild(pg);
    }
  }

  /* ---------- 積木圖 ---------- */
  function esc(s) { return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
  function fmt(s) {
    return esc(s).replace(/\{([^}]*)\}/g, '<span class="v">$1</span>').replace(/\[([^\]]*)\]/g, '<span class="d">$1 ▾</span>');
  }
  function renderBlocks(pre) {
    const lines = pre.textContent.replace(/\r/g, '').split('\n').filter(l => l.trim());
    const root = document.createElement('div');
    root.className = 'code';
    const stack = [{ lvl: -1, box: root }];
    lines.forEach(line => {
      const lvl = Math.floor(line.match(/^ */)[0].length / 2);
      const m = line.trim().match(/^([a-z]+)( hat)?:\s*(.*)$/);
      if (!m) return;
      const b = document.createElement('div');
      b.className = 'blk ' + m[1] + (m[2] ? ' hat' : '');
      b.innerHTML = fmt(m[3]);
      while (stack.length > 1 && stack[stack.length - 1].lvl >= lvl) stack.pop();
      stack[stack.length - 1].box.appendChild(b);
      const inner = document.createElement('div');
      inner.className = 'in';
      b.appendChild(inner);
      stack.push({ lvl, box: inner });
    });
    root.querySelectorAll('.in').forEach(e => { if (!e.children.length) e.remove(); });
    pre.replaceWith(root);
  }

  /* ---------- 闖關測驗 ---------- */
  function quiz(box, items) {
    let right = 0, answered = 0;
    const sc = document.createElement('p');
    sc.className = 'score';
    items.forEach((it, qi) => {
      const q = document.createElement('div');
      q.className = 'q';
      q.innerHTML = `<p>${qi + 1}. ${it.q}</p><div class="opts"></div><div class="why">💡 ${it.why || ''}</div>`;
      const opts = q.querySelector('.opts');
      it.o.forEach((o, oi) => {
        const b = document.createElement('button');
        b.className = 'opt';
        b.innerHTML = o;
        b.onclick = () => {
          if (q.dataset.done) return;
          q.dataset.done = 1;
          answered++;
          if (oi === it.a) { b.classList.add('ok'); right++; } else { b.classList.add('no'); opts.children[it.a].classList.add('ok'); }
          q.querySelector('.why').classList.add('show');
          sc.textContent = `答對 ${right} / ${items.length} 題` + (answered === items.length ? (right === items.length ? '　🏆 全對！' : '　再看看解說吧！') : '');
          if (answered === items.length && right === items.length) toast('🎉 全部答對！');
        };
        opts.appendChild(b);
      });
      box.appendChild(q);
    });
    sc.textContent = `答對 0 / ${items.length} 題`;
    box.appendChild(sc);
  }

  /* ---------- 任務勾選、日誌與表單自動保存 ---------- */
  function initMissions(n) {
    const k = 'l' + n;
    const ms = document.querySelectorAll('.mission');
    const s = store.get();
    s[k] = s[k] || {};
    s[k]._total = ms.length;
    store.set(s);
    ms.forEach((m, i) => {
      const id = m.id || 'm' + i;
      const lab = document.createElement('label');
      lab.className = 'check';
      lab.innerHTML = '<input type="checkbox"> 完成';
      const cb = lab.querySelector('input');
      cb.checked = !!s[k][id];
      m.classList.toggle('finished', cb.checked);
      cb.onchange = () => {
        const st = store.get();
        st[k] = st[k] || {};
        st[k][id] = cb.checked;
        store.set(st);
        m.classList.toggle('finished', cb.checked);
        if (cb.checked) toast(lessonDone(n) ? '🏅 這堂課的任務全部完成！' : '✨ 任務完成！');
        const a = document.querySelectorAll('.daynav a')[n - 1];
        if (a) a.classList.toggle('done', lessonDone(n));
      };
      (m.querySelector('header') || m).appendChild(lab);
    });
  }
  function initSaves(n) {
    const k = 'l' + n + '_';
    document.querySelectorAll('[data-save]').forEach(el => {
      const key = k + el.dataset.save;
      const v = store.get()[key];
      if (el.type === 'checkbox') el.checked = !!v; else el.value = v || '';
      const save = () => { const x = store.get(); x[key] = el.type === 'checkbox' ? el.checked : el.value; store.set(x); };
      el.addEventListener('input', save);
      el.addEventListener('change', save);
    });
  }

  /* ---------- 課堂計時器 ---------- */
  let timerBox = null, timerId = null;
  function startTimer(label, min) {
    if (!timerBox) {
      timerBox = document.createElement('div');
      timerBox.className = 'ctimer';
      timerBox.innerHTML = '<span class="lab"></span><b class="t"></b><button class="btn sm ghost" title="暫停／繼續">⏯</button><button class="btn sm ghost" title="關閉">✕</button>';
      document.body.appendChild(timerBox);
    }
    clearInterval(timerId);
    let left = min * 60, paused = false;
    const t = timerBox.querySelector('.t');
    timerBox.querySelector('.lab').textContent = label;
    timerBox.classList.remove('end');
    const [pb, cb] = timerBox.querySelectorAll('button');
    pb.onclick = () => { paused = !paused; };
    cb.onclick = () => { clearInterval(timerId); timerBox.remove(); timerBox = null; };
    const show = () => { t.textContent = `${Math.floor(left / 60)}:${pad(left % 60)}`; };
    show();
    timerId = setInterval(() => {
      if (paused) return;
      left--;
      show();
      if (left <= 0) {
        clearInterval(timerId);
        timerBox.classList.add('end');
        t.textContent = '時間到！';
        try { const a = new (window.AudioContext || window.webkitAudioContext)(); [0, .25, .5].forEach(d => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(.15, a.currentTime + d); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + d + .2); o.start(a.currentTime + d); o.stop(a.currentTime + d + .2); }); } catch (e) { /* 沒聲音也沒關係 */ }
      }
    }, 1000);
  }
  function initTimers() {
    document.querySelectorAll('.slot[data-min]').forEach(sl => {
      const b = document.createElement('button');
      b.className = 'btn sm ghost tbtn';
      b.textContent = `⏱ ${sl.dataset.min} 分`;
      b.title = '開始倒數計時';
      b.onclick = () => startTimer(sl.dataset.label, +sl.dataset.min);
      sl.appendChild(b);
    });
  }

  /* ---------- 複製程式碼 ---------- */
  function initCopy() {
    document.querySelectorAll('button[data-copy]').forEach(b => {
      b.onclick = () => {
        const txt = document.getElementById(b.dataset.copy).textContent;
        const ok = () => toast('📋 已複製，貼到 MakeCode 的 JavaScript 畫面');
        if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok, () => fallback(txt, ok)); else fallback(txt, ok);
      };
    });
    function fallback(txt, ok) {
      const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { toast('請手動選取複製'); }
      ta.remove();
    }
  }

  /* ---------- 模擬器 ---------- */
  function initSims(n) {
    if (!window.RedSim || !window.SIM_DATA) return;
    document.querySelectorAll('.sim[data-sim]').forEach(el => {
      const id = el.dataset.sim;
      const cfg = Object.assign({}, window.SIM_DATA[id]);
      cfg.onPass = () => {
        const st = store.get();
        st['l' + n] = st['l' + n] || {};
        st['l' + n]['sim_' + id] = true;
        store.set(st);
        el.classList.add('passed');
      };
      if ((store.get()['l' + n] || {})['sim_' + id]) el.classList.add('passed');
      window.RedSim.mount(el, cfg);
    });
  }

  /* ---------- 證書 ---------- */
  function initCert() {
    const nm = document.getElementById('certName');
    if (!nm) return;
    const out = document.getElementById('certOut');
    const upd = () => { out.textContent = nm.value.trim() || '＿＿＿＿＿'; };
    nm.addEventListener('input', upd);
    upd();
    const d = document.getElementById('certDate');
    if (d) { const t = new Date(); d.textContent = `${t.getFullYear()} 年 ${t.getMonth() + 1} 月 ${t.getDate()} 日`; }
  }

  function init() {
    const n = +document.body.dataset.lesson || 0;
    document.querySelectorAll('pre.mc').forEach(renderBlocks);
    renderNav(n);
    if (n) {
      initMissions(n);
      initSaves(n);
      initTimers();
      initCopy();
      initSims(n);
      initCert();
      if (window.QUIZ) quiz(document.querySelector('.quiz'), window.QUIZ);
    }
  }

  window.MC = { META, toast, store, progress, lessonDone, renderBlocks };
  init();
})();
