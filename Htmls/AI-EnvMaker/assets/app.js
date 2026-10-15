/* AI 環保小創客｜共用資料層與介面元件 */
(function () {
  'use strict';

  const STORE_KEY = 'ecoai.v1';
  const CLOUD_KEY = 'ecoai.cloud';

  // ---------- 常數 ----------
  const TASKS = {
    research: { name: '議題探究', icon: '🔍', platform: 'Gemini' },
    poster: { name: '環保海報', icon: '🖼️', platform: 'Gemini' },
    lyrics: { name: '歌詞與曲風', icon: '✍️', platform: 'Gemini' },
    suno: { name: 'Suno 音樂', icon: '🎵', platform: 'Suno' },
    webapp: { name: '網頁小程式', icon: '💻', platform: 'Gemini Canvas' },
    other: { name: '其他', icon: '💬', platform: '其他' }
  };
  const PLATFORMS = ['Gemini', 'Gemini Canvas', 'Suno', 'Canva', '其他'];

  const STRATEGIES = [
    { id: 'clear', icon: '🔎', name: '說清楚', tip: '把模糊的詞換成具體的描述',
      example: '「漂亮的背景」→「清晨的海邊，淡藍色天空和柔和的陽光」' },
    { id: 'one', icon: '☝️', name: '一次改一件事', tip: '其他保持不變，只改一個地方，才看得出哪個改動有效',
      example: '「構圖不變，只把海龜改成站在沙灘上」' },
    { id: 'limit', icon: '🚧', name: '加限制', tip: '告訴 AI 不要什麼、要多長、要什麼格式',
      example: '「圖中不要出現任何文字」「每句不超過 12 個字」' },
    { id: 'askme', icon: '🙋', name: '請 AI 先問我', tip: '讓 AI 先提問，幫你把想法想清楚',
      example: '「開始之前，請先問我 3 個問題」' },
    { id: 'options', icon: '🔀', name: '請 AI 給選項', tip: '一次要幾種不同版本，比較後再選',
      example: '「請給我 3 種不同風格讓我選」' },
    { id: 'report', icon: '🛠️', name: '回報問題', tip: '具體說出哪裡不對、你希望變成怎樣',
      example: '「按下開始後沒有反應，我希望開始倒數 30 秒」' }
  ];

  const WORKS = {
    poster: { name: '環保海報', icon: '🖼️' },
    mv: { name: '音樂 MV', icon: '🎬' },
    webapp: { name: '網頁小程式', icon: '💻' }
  };

  const TOPICS = ['減少塑膠', '垃圾分類與回收', '節約能源', '節約用水', '海洋保護',
    '保護動物與棲地', '減少食物浪費', '綠色交通', '氣候變遷'];

  const RUBRIC = [
    { id: 'idea', name: '構想力', desc: '先有自己的想法，再請 AI 協助',
      levels: ['直接照 AI 的產出，沒有自己的構想', '有簡單的構想，但和作品關係不大', '先有清楚構想，並用來引導 AI', '構想完整有創意，AI 只是實現構想的工具'] },
    { id: 'prompt', name: '提示詞力', desc: '提示詞具體、完整（提示詞五寶）',
      levels: ['提示詞只有幾個字，內容模糊', '有任務和內容，但缺少風格或限制', '五寶大致齊全，描述具體', '五寶齊全，用詞精準，還會善用格式與範例'] },
    { id: 'iterate', name: '迭代力', desc: '會評估結果，並有策略地修正',
      levels: ['只問一次就結束', '有修改，但說不出為什麼', '每版都有評估，並使用修改技巧', '靈活運用多種技巧，明顯一版比一版進步'] },
    { id: 'create', name: '後製創作力', desc: '在 AI 素材上加入自己的創意',
      levels: ['幾乎沒有後製', '有加上文字或簡單排版', '有規劃地加入自己的元素與設計', '後製讓作品明顯升級，看得出個人風格'] },
    { id: 'ethics', name: '責任使用', desc: '標示 AI、查證資訊、保護個資',
      levels: ['沒有標示 AI 或輸入了個資', '有標示 AI，但沒有查證資訊', '有標示 AI、有查證、紀錄誠實完整', '能說明 AI 的限制，並提醒他人正確使用'] }
  ];
  const LEVEL_NAMES = ['待加強', '基礎', '良好', '優秀'];

  // ---------- 資料存取 ----------
  function blank() {
    return {
      v: 1,
      profile: { cls: '', seat: '', name: '', topic: '' },
      pledge: { items: [], signedAt: '' },
      entries: [],
      plans: {},
      reflection: { answers: {}, self: {}, updatedAt: '' },
      lastSubmit: '',
      drafts: {}
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return blank();
      const data = JSON.parse(raw);
      const base = blank();
      return Object.assign(base, data, {
        profile: Object.assign(base.profile, data.profile),
        pledge: Object.assign(base.pledge, data.pledge),
        reflection: Object.assign(base.reflection, data.reflection)
      });
    } catch (e) {
      return blank();
    }
  }

  let state = load();
  let saveWarned = false;

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      if (!saveWarned) {
        toast('⚠️ 這台電腦無法把資料存進瀏覽器，離開前請記得「匯出備份檔」', 'warn', 6000);
        saveWarned = true;
      }
      return false;
    }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function now() { return new Date().toISOString(); }

  function profileReady(p) {
    p = p || state.profile;
    return !!(p.cls && p.seat && p.name);
  }
  function setProfile(p) {
    state.profile = Object.assign(state.profile, p);
    save();
    renderProfileChip();
  }

  function nextVersion(task) {
    return state.entries.filter(e => e.task === task)
      .reduce((m, e) => Math.max(m, Number(e.version) || 0), 0) + 1;
  }

  function addEntry(data) {
    const task = TASKS[data.task] ? data.task : 'other';
    const e = Object.assign({
      id: uid(), task, platform: TASKS[task].platform, version: nextVersion(task),
      prompt: '', response: '', rating: 0, good: '', improve: '', strategies: [],
      source: 'manual', createdAt: now(), updatedAt: now()
    }, data, { task });
    state.entries.push(e);
    save();
    return e;
  }
  function updateEntry(id, patch) {
    const e = state.entries.find(x => x.id === id);
    if (!e) return null;
    Object.assign(e, patch, { updatedAt: now() });
    save();
    return e;
  }
  function deleteEntry(id) {
    state.entries = state.entries.filter(x => x.id !== id);
    save();
  }
  function isPending(e) { return !e.response && !e.rating; }

  function sortEntries(list) {
    return list.slice().sort((a, b) =>
      (Number(a.version) || 0) - (Number(b.version) || 0) || String(a.createdAt).localeCompare(String(b.createdAt)));
  }

  function getPlan(work) { return state.plans[work] || {}; }
  function setPlan(work, data) {
    state.plans[work] = Object.assign({}, data, { updatedAt: now() });
    save();
  }

  function getDraft(key) { return state.drafts[key]; }
  function setDraft(key, val) { state.drafts[key] = val; save(); }

  function stats(data) {
    const entries = data.entries || [];
    const maxVer = {};
    const strat = {};
    let pending = 0;
    let rated = 0, ratingSum = 0;
    entries.forEach(e => {
      maxVer[e.task] = Math.max(maxVer[e.task] || 0, Number(e.version) || 0);
      (e.strategies || []).forEach(s => { strat[s] = (strat[s] || 0) + 1; });
      if (isPending(e)) pending++;
      if (e.rating) { rated++; ratingSum += Number(e.rating); }
    });
    const plans = data.plans || {};
    const plansDone = Object.keys(WORKS).filter(w => plans[w] && (plans[w].myPart || plans[w].link)).length;
    const r = data.reflection || {};
    const reflected = Object.values(r.answers || {}).filter(v => String(v).trim()).length;
    return {
      count: entries.length, maxVer, strat,
      stratTotal: Object.values(strat).reduce((a, b) => a + b, 0),
      pending, avgRating: rated ? (ratingSum / rated) : 0, plansDone, reflected
    };
  }

  // ---------- 匯出／匯入 ----------
  function today() {
    const d = new Date();
    return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  }
  function exportData() {
    const p = state.profile;
    const who = [p.cls, p.seat, p.name].filter(Boolean).join('-') || '我的';
    const payload = Object.assign({ app: 'ecoai', exportedAt: now() }, state);
    delete payload.drafts;
    download(`${who}-AI創作歷程-${today()}.json`, JSON.stringify(payload, null, 2), 'application/json');
  }

  function importData(obj) {
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj.entries)) {
      throw new Error('這不是「AI 環保小創客」的歷程檔案');
    }
    let added = 0, updated = 0;
    obj.entries.forEach(e => {
      if (!e || !e.id) return;
      const cur = state.entries.find(x => x.id === e.id);
      if (!cur) { state.entries.push(e); added++; }
      else if (String(e.updatedAt) > String(cur.updatedAt)) { Object.assign(cur, e); updated++; }
    });
    if (!profileReady() && obj.profile) state.profile = Object.assign(state.profile, obj.profile);
    Object.keys(obj.plans || {}).forEach(w => {
      const cur = state.plans[w];
      const inc = obj.plans[w];
      if (!cur || String(inc.updatedAt) > String(cur.updatedAt)) state.plans[w] = inc;
    });
    if (obj.reflection && String(obj.reflection.updatedAt || '') > String(state.reflection.updatedAt || '')) {
      state.reflection = obj.reflection;
    }
    if (obj.pledge && obj.pledge.signedAt && !state.pledge.signedAt) state.pledge = obj.pledge;
    save();
    renderProfileChip();
    return { added, updated };
  }

  function readJsonFile(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        try { resolve(JSON.parse(fr.result)); } catch (e) { reject(new Error(`${file.name} 不是正確的 JSON 檔案`)); }
      };
      fr.onerror = () => reject(new Error(`無法讀取 ${file.name}`));
      fr.readAsText(file);
    });
  }

  function clearAll() {
    state = blank();
    save();
    renderProfileChip();
  }

  // ---------- 雲端收件（Google Apps Script） ----------
  (function readCloudParams() {
    const p = new URLSearchParams(location.search);
    if (p.has('gas')) {
      try {
        localStorage.setItem(CLOUD_KEY, JSON.stringify({ gasUrl: p.get('gas'), classKey: p.get('key') || '' }));
      } catch (e) { /* 無法儲存時仍可從 config.js 取得 */ }
    }
  })();

  function cloud() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(CLOUD_KEY) || '{}'); } catch (e) { saved = {}; }
    const base = window.ECO_CONFIG || {};
    return {
      gasUrl: (saved.gasUrl || base.gasUrl || '').trim(),
      classKey: (saved.gasUrl ? saved.classKey : base.classKey) || ''
    };
  }

  async function submitToCloud() {
    const c = cloud();
    if (!c.gasUrl) throw new Error('老師還沒有設定雲端收件網址。請改用「匯出備份檔」上傳到 Classroom。');
    if (!profileReady()) throw new Error('請先填寫班級、座號和姓名');
    const payload = {
      action: 'submit',
      key: c.classKey,
      student: state.profile,
      data: { entries: state.entries, plans: state.plans, reflection: state.reflection, pledge: state.pledge },
      submittedAt: now()
    };
    const body = JSON.stringify(payload);
    let result;
    try {
      // 不加自訂標頭（text/plain），避免 CORS 預檢，Apps Script 才能正常回應
      const res = await fetch(c.gasUrl, { method: 'POST', body });
      result = await res.json();
    } catch (err) {
      // 部分學校網路會擋住回應內容，改用 no-cors 送出（可送達但無法確認結果）
      await fetch(c.gasUrl, { method: 'POST', mode: 'no-cors', body });
      result = { ok: true, unverified: true };
    }
    if (!result.ok) throw new Error(result.error || '送出失敗');
    state.lastSubmit = payload.submittedAt;
    save();
    return result;
  }

  // ---------- 介面工具 ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function fmtTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  function starsText(n) {
    n = Math.max(0, Math.min(5, Number(n) || 0));
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  function toast(msg, type, ms) {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      wrap.setAttribute('role', 'status');
      document.body.appendChild(wrap);
    }
    const t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => t.remove(), ms || 3200);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  function download(name, text, mime) {
    const blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // 膠囊選項：container 內的 .chip 依 data-value 切換
  function bindChips(container, { multi = false, onChange } = {}) {
    container.addEventListener('click', ev => {
      const chip = ev.target.closest('.chip');
      if (!chip || !container.contains(chip)) return;
      if (multi) chip.classList.toggle('on');
      else {
        container.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === chip));
      }
      if (onChange) onChange(getChips(container, multi));
    });
  }
  function getChips(container, multi) {
    const vals = [...container.querySelectorAll('.chip.on')].map(c => c.dataset.value);
    return multi ? vals : (vals[0] || '');
  }
  function setChips(container, values) {
    const set = new Set(Array.isArray(values) ? values : [values]);
    container.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', set.has(c.dataset.value)));
  }

  function strategyChipsHTML() {
    return STRATEGIES.map(s => `<button type="button" class="chip" data-value="${s.id}" title="${esc(s.tip)}">${s.icon} ${s.name}</button>`).join('');
  }
  function strategyName(id) {
    const s = STRATEGIES.find(x => x.id === id);
    return s ? `${s.icon} ${s.name}` : id;
  }

  // ---------- 時間軸（學生與老師共用） ----------
  function timelineHTML(entries, opts) {
    opts = opts || {};
    const order = Object.keys(TASKS).filter(t => !opts.task || opts.task === t);
    const parts = [];
    order.forEach(task => {
      const list = sortEntries(entries.filter(e => e.task === task));
      if (!list.length) return;
      const T = TASKS[task];
      const items = [];
      list.forEach((e, i) => {
        if (i > 0) {
          const chips = (e.strategies || []).map(s => `<span class="tag">${esc(strategyName(s))}</span>`).join('');
          items.push(`<li class="tl-arrow">⬇ ${chips ? '這一版用了：' + chips : '修改提示詞'}</li>`);
        }
        const detail = [];
        if (e.response) detail.push(`<div class="lbl">AI 的回應（摘要）</div><pre class="prompt">${esc(e.response)}</pre>`);
        if (e.good || e.improve) {
          detail.push(`<div class="kv"><div><div class="lbl">👍 好的地方</div>${esc(e.good) || '—'}</div><div><div class="lbl">🔧 下一版要改</div>${esc(e.improve) || '—'}</div></div>`);
        }
        items.push(`<li class="tl-item">
          <div class="tl-head">
            <span class="ver">第 ${esc(e.version)} 版</span>
            <span class="tag gray">${esc(e.platform)}</span>
            ${e.rating ? `<span class="stars" title="${e.rating} 顆星">${starsText(e.rating)}</span>` : ''}
            ${isPending(e) ? '<span class="badge warn">待填寫結果</span>' : ''}
            <span class="spacer"></span>
            <time>${fmtTime(e.createdAt)}</time>
            ${opts.editable ? `<button class="btn ghost sm" data-edit="${esc(e.id)}">編輯</button>` : ''}
          </div>
          <div class="lbl">我的提示詞</div>
          <pre class="prompt">${esc(e.prompt) || '（未填寫）'}</pre>
          ${detail.join('')}
        </li>`);
      });
      parts.push(`<section class="tl-group" style="--task:var(--t-${task})">
        <h3>${T.icon} ${T.name} <span class="muted small">共 ${list.length} 版</span></h3>
        <ol class="tl">${items.join('')}</ol></section>`);
    });
    if (!parts.length) {
      return `<div class="empty-state"><div class="big">📭</div><p>${esc(opts.emptyText || '還沒有任何紀錄')}</p></div>`;
    }
    return parts.join('');
  }

  // ---------- 導覽列與個人資料 ----------
  const NAV = [
    ['index.html', '🏠 首頁'],
    ['builder.html', '🧩 提示詞積木'],
    ['journal.html', '📒 歷程紀錄本'],
    ['postplan.html', '✂️ 後製構想單']
  ];

  function renderNav(active) {
    const host = document.getElementById('topnav');
    if (!host) return;
    host.className = 'topnav';
    host.innerHTML = `<div class="nav-inner">
      <a class="brand" href="index.html"><span class="brand-mark">🌏</span><span>AI 環保小創客</span></a>
      <nav class="nav-links">${NAV.map(([href, label]) =>
        `<a href="${href}" class="${href === active ? 'active' : ''}">${label}</a>`).join('')}</nav>
      ${host.dataset.noProfile ? '' : '<button class="profile-chip" id="profileChip" type="button"></button>'}
    </div>`;
    const chip = document.getElementById('profileChip');
    if (chip) chip.addEventListener('click', () => openProfile());
    renderProfileChip();
  }

  function renderProfileChip() {
    const chip = document.getElementById('profileChip');
    if (!chip) return;
    const p = state.profile;
    if (profileReady()) {
      chip.classList.remove('empty');
      chip.textContent = `👤 ${p.cls} 班 ${p.seat} 號 ${p.name}`;
    } else {
      chip.classList.add('empty');
      chip.textContent = '👤 請設定我的資料';
    }
  }

  function openProfile(onSaved) {
    let dlg = document.getElementById('profileDlg');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'profileDlg';
      dlg.innerHTML = `<form method="dialog" id="profileForm">
        <div class="dlg-body">
          <h2>👤 我的資料</h2>
          <p class="muted small">這些資料只用來標示你的學習歷程，<strong>不會</strong>傳給任何 AI 平台。</p>
          <div class="row-3">
            <div class="field"><label class="req" for="pfCls">班級</label><input id="pfCls" type="text" placeholder="例如 601" maxlength="10" required></div>
            <div class="field"><label class="req" for="pfSeat">座號</label><input id="pfSeat" type="number" min="1" max="99" required></div>
            <div class="field"><label class="req" for="pfName">姓名</label><input id="pfName" type="text" maxlength="20" required></div>
          </div>
          <div class="field">
            <label for="pfTopic">我的環保議題</label>
            <select id="pfTopic"><option value="">（還沒決定，第 2 節課再選）</option>
              ${TOPICS.map(t => `<option>${t}</option>`).join('')}<option value="__custom">自訂…</option></select>
            <input id="pfTopicCustom" type="text" class="hidden" placeholder="輸入你的議題" maxlength="30">
          </div>
        </div>
        <div class="dlg-foot">
          <button class="btn ghost" value="cancel" formnovalidate>取消</button>
          <button class="btn" value="ok" id="pfSave">儲存</button>
        </div></form>`;
      document.body.appendChild(dlg);
      const sel = dlg.querySelector('#pfTopic');
      const custom = dlg.querySelector('#pfTopicCustom');
      sel.addEventListener('change', () => custom.classList.toggle('hidden', sel.value !== '__custom'));
    }
    const p = state.profile;
    dlg.querySelector('#pfCls').value = p.cls;
    dlg.querySelector('#pfSeat').value = p.seat;
    dlg.querySelector('#pfName').value = p.name;
    const sel = dlg.querySelector('#pfTopic');
    const custom = dlg.querySelector('#pfTopicCustom');
    if (!p.topic || TOPICS.includes(p.topic)) { sel.value = p.topic || ''; custom.classList.add('hidden'); }
    else { sel.value = '__custom'; custom.value = p.topic; custom.classList.remove('hidden'); }

    dlg.onclose = () => {
      if (dlg.returnValue !== 'ok') return;
      const topic = sel.value === '__custom' ? custom.value.trim() : sel.value;
      setProfile({
        cls: dlg.querySelector('#pfCls').value.trim(),
        seat: String(dlg.querySelector('#pfSeat').value).trim(),
        name: dlg.querySelector('#pfName').value.trim(),
        topic
      });
      toast('✅ 已儲存我的資料', 'ok');
      if (onSaved) onSaved();
      document.dispatchEvent(new CustomEvent('eco:profile'));
    };
    dlg.returnValue = '';
    dlg.showModal();
  }

  function footer() {
    const f = document.createElement('footer');
    f.className = 'footer';
    f.innerHTML = `AI 環保小創客 · 六年級 AI 創作課程 ·
      <a href="teacher.html">👩‍🏫 教師檢視器</a> · <a href="../../index.html">回網站首頁</a>`;
    document.body.appendChild(f);
  }

  window.Eco = {
    TASKS, PLATFORMS, STRATEGIES, WORKS, TOPICS, RUBRIC, LEVEL_NAMES,
    get state() { return state; },
    save, profileReady, setProfile, nextVersion, addEntry, updateEntry, deleteEntry, isPending, sortEntries,
    getPlan, setPlan, getDraft, setDraft, stats,
    exportData, importData, readJsonFile, clearAll, cloud, submitToCloud,
    esc, fmtTime, starsText, toast, copyText, download,
    bindChips, getChips, setChips, strategyChipsHTML, strategyName, timelineHTML,
    renderNav, openProfile, footer
  };
})();
