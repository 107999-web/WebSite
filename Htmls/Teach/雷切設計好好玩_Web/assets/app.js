/* 雷切設計好好玩 — 共用程式：導覽列、課堂計時、步驟打勾、快捷鍵小卡、闖關測驗、表單記憶、掛載互動工具
   課程清單 window.LESSON_META 由 tools/build.py 產生在 assets/meta.js；互動工具在 assets/tools.js（window.LT） */
(function () {
  'use strict';
  const META = window.LESSON_META || [];
  const N = META.length;
  const KEY = 'laser-club';
  const pad = n => String(n).padStart(2, '0');
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } },
    set(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* 無痕模式不記錄 */ } },
  };
  const lessonNo = Number(document.body.dataset.lesson || 0);

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }
  window.LTtoast = toast;

  function mark(key, val) {
    if (!lessonNo) return;
    const s = store.get(); const m = s['l' + lessonNo] || {};
    m[key] = val; s['l' + lessonNo] = m; store.set(s);
  }
  function lessonDone(n) {
    const m = store.get()['l' + n] || {};
    return m._total > 0 && Object.keys(m).filter(k => k[0] !== '_' && m[k]).length >= m._total;
  }

  /* ---------- 導覽列 ---------- */
  function nav() {
    const bar = document.createElement('div');
    bar.className = 'topbar';
    const prefix = lessonNo ? '' : 'lessons/';
    const home = lessonNo ? '../index.html' : 'index.html';
    let links = '';
    META.forEach((m, i) => {
      const n = i + 1;
      links += `<a class="${n === lessonNo ? 'on ' : ''}${lessonDone(n) ? 'done' : ''}" style="--u:${m.color}" href="${prefix}lesson${pad(n)}.html" title="第 ${n} 堂｜${m.title}">${n}</a>`;
    });
    bar.innerHTML = `<div class="in"><a class="brand" href="${home}"><span class="beam"></span>雷切設計好好玩</a><nav class="daynav">${links}</nav></div>`;
    document.body.prepend(bar);
    if (lessonNo) {
      const pg = document.createElement('div');
      pg.className = 'pager';
      const prev = lessonNo > 1 ? `<a class="btn ghost" href="lesson${pad(lessonNo - 1)}.html">← 第 ${lessonNo - 1} 堂</a>` : '<a class="btn ghost" href="../index.html">← 課程總覽</a>';
      const next = lessonNo < N ? `<a class="btn" href="lesson${pad(lessonNo + 1)}.html">第 ${lessonNo + 1} 堂：${META[lessonNo].title} →</a>` : '<a class="btn" href="../index.html">回課程總覽 →</a>';
      pg.innerHTML = prev + next;
      document.querySelector('.wrap').appendChild(pg);
    }
  }

  /* ---------- 課堂計時 ---------- */
  let tm = null;
  function timer() {
    const box = document.createElement('div');
    box.className = 'timer';
    box.innerHTML = '<div class="lab"></div><div class="t">00:00</div><button data-a="pause">⏸ 暫停</button><button data-a="add">＋1 分</button><button data-a="close">✕</button>';
    document.body.appendChild(box);
    const lab = box.querySelector('.lab'), t = box.querySelector('.t');
    let left = 0, run = false;
    const show = () => { const m = Math.floor(Math.abs(left) / 60), s = Math.abs(left) % 60; t.textContent = `${left < 0 ? '-' : ''}${pad(m)}:${pad(s)}`; box.classList.toggle('end', left <= 0); };
    box.addEventListener('click', e => {
      const a = e.target.dataset.a;
      if (a === 'pause') { run = !run; e.target.textContent = run ? '⏸ 暫停' : '▶ 繼續'; }
      if (a === 'add') { left += 60; show(); }
      if (a === 'close') { run = false; box.classList.remove('on'); }
    });
    setInterval(() => { if (run) { left--; show(); } }, 1000);
    document.querySelectorAll('.slot[data-min]').forEach(sl => {
      const b = document.createElement('button');
      b.className = 'go'; b.textContent = '⏱ 計時';
      b.onclick = () => {
        left = Number(sl.dataset.min) * 60; run = true; lab.textContent = sl.dataset.label;
        box.querySelector('[data-a=pause]').textContent = '⏸ 暫停'; box.classList.add('on'); show();
      };
      sl.appendChild(b);
    });
  }

  /* ---------- 步驟打勾 ---------- */
  function steps() {
    const m = (store.get()['l' + lessonNo] || {});
    const all = document.querySelectorAll('.steps > li');
    all.forEach((li, i) => {
      const k = 's' + i;
      if (m[k]) li.classList.add('checked');
      li.title = '做完點一下打勾';
      li.addEventListener('click', e => {
        if (e.target.closest('a,button,input,kbd')) return;
        li.classList.toggle('checked');
        mark(k, li.classList.contains('checked'));
      });
    });
    return all.length;
  }

  /* ---------- 快捷鍵小卡 ---------- */
  function keys() {
    document.querySelectorAll('.key').forEach(k => k.addEventListener('click', () => k.classList.toggle('flip')));
    document.querySelectorAll('[data-flipall]').forEach(b => b.addEventListener('click', () => {
      const ks = b.closest('section').querySelectorAll('.key');
      const any = [...ks].some(k => !k.classList.contains('flip'));
      ks.forEach(k => k.classList.toggle('flip', any));
    }));
  }

  /* ---------- 闖關測驗 ---------- */
  function quiz() {
    const el = document.querySelector('.quiz');
    const data = window.QUIZ;
    if (!el || !data) return 0;
    let right = 0, done = 0;
    const sc = document.createElement('div');
    sc.className = 'score';
    data.forEach((q, qi) => {
      const box = document.createElement('div');
      box.className = 'q';
      box.innerHTML = `<p>${qi + 1}. ${q.q}</p><div class="opts"></div><div class="why">💡 ${q.why}</div>`;
      q.o.forEach((o, oi) => {
        const b = document.createElement('button');
        b.className = 'o'; b.innerHTML = o;
        b.onclick = () => {
          if (box.classList.contains('answered')) return;
          box.classList.add('answered'); done++;
          if (oi === q.a) { b.classList.add('right'); right++; } else { b.classList.add('wrong'); box.querySelectorAll('.o')[q.a].classList.add('right'); }
          sc.textContent = `答對 ${right} / ${data.length} 題` + (done === data.length ? (right === data.length ? '　🎉 全對！雷切設計師就是你！' : '　再看一次說明，下次一定全對 💪') : '');
          if (done === data.length) mark('quiz', true);
        };
        box.querySelector('.opts').appendChild(b);
      });
      el.appendChild(box);
    });
    el.appendChild(sc);
    return 1;
  }

  /* ---------- 表單記憶 ---------- */
  function saves() {
    const s = store.get(); const f = s.form || {};
    document.querySelectorAll('[data-save]').forEach(inp => {
      const k = inp.dataset.save;
      if (f[k] !== undefined) { if (inp.type === 'checkbox') inp.checked = f[k]; else inp.value = f[k]; }
      const h = () => {
        const s2 = store.get(); s2.form = s2.form || {};
        s2.form[k] = inp.type === 'checkbox' ? inp.checked : inp.value; store.set(s2);
        document.dispatchEvent(new CustomEvent('saved', { detail: k }));
      };
      inp.addEventListener('input', h); inp.addEventListener('change', h);
    });
  }

  /* ---------- 總覽頁的完成標記 ---------- */
  function overview() {
    document.querySelectorAll('.lcard[data-n]').forEach(a => { if (lessonDone(Number(a.dataset.n))) a.classList.add('done'); });
  }

  document.addEventListener('DOMContentLoaded', () => {
    nav();
    if (lessonNo) {
      timer();
      const total = steps() + quiz();
      mark('_total', total);
    } else overview();
    keys();
    document.querySelectorAll('[data-tool]').forEach(el => {
      const f = window.LT && window.LT[el.dataset.tool];
      if (f) { try { f(el); } catch (e) { console.error('工具載入失敗', el.dataset.tool, e); } }
      else console.error('找不到工具', el.dataset.tool);
    });
    saves();
  });
})();
