/* =========================================================
 * 互動學習網｜入口頁與科目頁的產生器＋共用工具
 * 頁面用 <body data-page="portal"> 或
 *        <body data-page="subject" data-subject="sci5a"> 指定
 * ========================================================= */
(function () {
  'use strict';

  /* ---------- 學習進度（存在各自瀏覽器，無法存取時自動略過） ---------- */
  const Progress = {
    key(unitId) { return 'hub-progress:' + unitId; },
    load(unitId) {
      try { return JSON.parse(localStorage.getItem(this.key(unitId))) || {}; }
      catch (e) { return {}; }
    },
    save(unitId, data) {
      try { localStorage.setItem(this.key(unitId), JSON.stringify(data)); } catch (e) { /* 忽略 */ }
    },
    mark(unitId, itemId, value) {
      const data = this.load(unitId);
      data[itemId] = value;
      this.save(unitId, data);
      return data;
    },
    /* 回傳 0~1：已答對題數 / 總題數（單元頁會寫入 __total） */
    ratio(unitId) {
      const d = this.load(unitId);
      const total = d.__total || 0;
      if (!total) return 0;
      const done = Object.keys(d).filter(k => !k.startsWith('__') && d[k] && d[k].ok).length;
      return Math.min(1, done / total);
    }
  };

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function renderPortal(root, cat) {
    document.title = cat.title;
    const cards = cat.subjects.map(s => {
      const ready = s.status === 'ready';
      const readyUnits = s.units.filter(u => u.status === 'ready').length;
      const tag = ready ? `<span class="badge ok">${readyUnits} 個單元</span>` : '<span class="badge soon">製作中</span>';
      const inner = `
        ${tag}
        <div class="icon">${s.icon}</div>
        <h2>${esc(s.name)}</h2>
        <div class="meta">${esc(s.subject)}・${esc(s.grade)}</div>
        ${ready ? `<ul>${s.units.filter(u => u.status === 'ready').map(u => `<li>單元${u.no} ${esc(u.title)}</li>`).join('')}</ul>` : ''}`;
      return ready
        ? `<a class="k-card theme-${s.theme}" href="${encodeURI(s.path)}index.html">${inner}</a>`
        : `<div class="k-card theme-${s.theme} soon" aria-disabled="true">${inner}</div>`;
    }).join('');
    root.innerHTML = `
      <header class="hub-header">
        <div class="mascot">🌸</div>
        <h1>${esc(cat.title)}</h1>
        <p>${esc(cat.subtitle)}</p>
      </header>
      <main class="wrap">
        <div class="card-grid">${cards}</div>
      </main>
      <footer class="hub-footer">點選科目卡片開始學習 ✨　學習進度只會存在這台裝置的瀏覽器中</footer>`;
  }

  function renderSubject(root, cat, subjectId) {
    const s = cat.subjects.find(x => x.id === subjectId);
    if (!s) { root.innerHTML = '<p class="wrap">找不到這個科目。</p>'; return; }
    document.title = s.name + '｜' + cat.title;
    document.body.classList.add('theme-' + s.theme);
    const cards = s.units.map(u => {
      const ready = u.status === 'ready';
      const pct = ready ? Math.round(Progress.ratio(u.id) * 100) : 0;
      const inner = `
        ${ready ? `<span class="badge ok">已上線</span>` : '<span class="badge soon">製作中</span>'}
        <div class="icon">${u.icon}</div>
        <h2>單元 ${u.no}｜${esc(u.title)}</h2>
        ${u.sections.length ? `<ul>${u.sections.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<div class="meta">敬請期待</div>'}
        ${ready ? `<div class="meta">練習進度 ${pct}%</div><div class="progress-bar"><span style="width:${pct}%"></span></div>` : ''}`;
      return ready
        ? `<a class="k-card theme-sakura" href="${encodeURI(u.path)}index.html">${inner}</a>`
        : `<div class="k-card soon" aria-disabled="true">${inner}</div>`;
    }).join('');
    root.innerHTML = `
      <header class="hub-header">
        <nav class="crumbs" aria-label="路徑"><a href="../index.html">🏠 ${esc(cat.title)}</a><span>›</span><span>${esc(s.name)}</span></nav>
        <div class="mascot">${s.icon}</div>
        <h1>${esc(s.name)}</h1>
        <p>${esc(s.subject)}・${esc(s.grade)}　選一個單元開始吧！</p>
      </header>
      <main class="wrap"><div class="card-grid">${cards}</div></main>
      <footer class="hub-footer">內容依據課本與習作整理，僅供學生課後複習使用</footer>`;
  }

  window.Hub = { Progress, esc };

  document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;
    const root = document.getElementById('app');
    if (!root || !window.HUB_CATALOG) return;
    if (page === 'portal') renderPortal(root, window.HUB_CATALOG);
    if (page === 'subject') renderSubject(root, window.HUB_CATALOG, document.body.dataset.subject);
  });
})();
