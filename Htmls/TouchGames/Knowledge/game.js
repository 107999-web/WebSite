/* ============================================================
   校園知識王 — 遊戲主程式（game.js）
   單人挑戰 / 雙人對戰 / 名人堂排行榜
   ============================================================ */

/* ---------- 遊戲參數（可自行調整） ---------- */
const SINGLE_QUESTIONS = 10;   // 單人挑戰題數
const SINGLE_TIME      = 15;   // 單人每題秒數
const DUEL_ROUNDS      = 8;    // 雙人對戰回合數
const DUEL_TIME        = 20;   // 雙人每回合秒數
const AVATARS = ["🐰","🐻","🐱","🐶","🦊","🐼","🐨","🦁","🐸","🐧","🦄","🐹"];
const LABELS  = ["A","B","C","D"];

/* ---------- 全域狀態 ---------- */
let soundOn = true;
let mode = "single";          // single | duel
let subjectKey = "__mix__";   // 目前選的科目
let pool = [];                // 本局題目
let qIndex = 0;
let score = 0, combo = 0, maxCombo = 0, correctCount = 0;
let timerId = null, timeLeft = 0, timeMax = 1;
let duel = null;              // 雙人對戰狀態
let pickedAvatar = null;
let lastResult = null;        // 結算資料（給名人堂用）

/* ============================================================
   音效（Web Audio，免外部檔案）
   ============================================================ */
let actx = null;
function audio() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === "suspended") actx.resume();
  return actx;
}
function beep(freq, dur, type = "sine", vol = 0.18, when = 0) {
  if (!soundOn) return;
  try {
    const ctx = audio();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    const t = ctx.currentTime + when;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  } catch (e) { /* 忽略音效錯誤 */ }
}
const sfx = {
  tap:     () => beep(660, .08, "triangle", .12),
  correct: () => { beep(784, .12, "triangle", .2); beep(1175, .22, "triangle", .2, .1); },
  wrong:   () => { beep(196, .25, "sawtooth", .12); beep(147, .3, "sawtooth", .1, .08); },
  tick:    () => beep(880, .05, "square", .06),
  count:   () => beep(523, .15, "triangle", .2),
  go:      () => beep(1047, .35, "triangle", .25),
  fanfare: () => { [523, 659, 784, 1047].forEach((f, i) => beep(f, .3, "triangle", .2, i * .14)); },
};

/* ============================================================
   小工具
   ============================================================ */
const $ = id => document.getElementById(id);
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function showScreen(id) {
  stopTimer();
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(id).classList.add("active");
}

/* ============================================================
   題庫處理：組出本局題目（選項自動打亂）
   ============================================================ */
function buildPool(key, count) {
  let raw = [];
  if (key === "__mix__") {
    for (const name in QUESTION_BANK)
      QUESTION_BANK[name].questions.forEach(q =>
        raw.push({ ...q, _icon: QUESTION_BANK[name].icon, _subj: name, _color: QUESTION_BANK[name].color }));
  } else {
    QUESTION_BANK[key].questions.forEach(q =>
      raw.push({ ...q, _icon: QUESTION_BANK[key].icon, _subj: key, _color: QUESTION_BANK[key].color }));
  }
  raw = shuffle(raw).slice(0, Math.min(count, raw.length));
  return raw.map(q => {
    const idx = shuffle([0, 1, 2, 3].slice(0, q.options.length));
    return {
      q: q.q, subj: q._subj, icon: q._icon, color: q._color,
      opts: idx.map(i => q.options[i]),
      ans: idx.indexOf(q.answer),
    };
  });
}

/* ============================================================
   首頁 / 科目選擇
   ============================================================ */
function chooseMode(m) {
  sfx.tap();
  mode = m;
  renderSubjects();
  showScreen("screen-subject");
}
function renderSubjects() {
  const grid = $("subject-grid");
  grid.innerHTML = "";
  const mix = document.createElement("button");
  mix.className = "subject-btn";
  mix.style.background = "linear-gradient(135deg,#FF8FAB,#FFB74D)";
  mix.innerHTML = '<span class="s-icon">🎲</span>全部混合';
  mix.onclick = () => startGame("__mix__");
  grid.appendChild(mix);
  for (const name in QUESTION_BANK) {
    const s = QUESTION_BANK[name];
    const b = document.createElement("button");
    b.className = "subject-btn";
    b.style.background = s.color;
    b.innerHTML = `<span class="s-icon">${s.icon}</span>${name}`;
    b.onclick = () => startGame(name);
    grid.appendChild(b);
  }
}

/* ============================================================
   開場倒數 3‧2‧1
   ============================================================ */
function startGame(key) {
  sfx.tap();
  subjectKey = key;
  let n = 3;
  const cd = $("countdown");
  const tick = () => {
    if (n > 0) {
      cd.textContent = n;
      cd.classList.remove("show"); void cd.offsetWidth; cd.classList.add("show");
      sfx.count(); n--; setTimeout(tick, 900);
    } else {
      cd.textContent = "GO!";
      cd.classList.remove("show"); void cd.offsetWidth; cd.classList.add("show");
      sfx.go();
      setTimeout(() => { cd.classList.remove("show"); mode === "single" ? startSingle() : startDuel(); }, 700);
    }
  };
  showScreen("screen-home"); // 倒數時先停在乾淨背景
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  tick();
}

/* ============================================================
   計時器
   ============================================================ */
function startTimer(seconds, fillEl, onTimeout) {
  stopTimer();
  timeMax = seconds; timeLeft = seconds;
  fillEl.style.width = "100%";
  fillEl.className = "timer-fill";
  timerId = setInterval(() => {
    timeLeft -= 0.1;
    const pct = Math.max(0, timeLeft / timeMax * 100);
    fillEl.style.width = pct + "%";
    if (pct < 25) fillEl.className = "timer-fill danger";
    else if (pct < 55) fillEl.className = "timer-fill warn";
    if (timeLeft <= 5.05 && Math.abs(timeLeft % 1) < 0.1) sfx.tick();
    if (timeLeft <= 0) { stopTimer(); onTimeout(); }
  }, 100);
}
function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }

/* ============================================================
   單人挑戰
   ============================================================ */
function startSingle() {
  pool = buildPool(subjectKey, SINGLE_QUESTIONS);
  qIndex = 0; score = 0; combo = 0; maxCombo = 0; correctCount = 0;
  showScreen("screen-single");
  renderSingleQ();
}
function renderSingleQ() {
  const q = pool[qIndex];
  $("s-counter").textContent = `第 ${qIndex + 1} / ${pool.length} 題`;
  $("s-score").textContent = score;
  $("s-subject").textContent = `${q.icon} ${q.subj}`;
  $("s-subject").style.background = q.color;
  $("s-question").textContent = q.q;
  const grid = $("s-answers");
  grid.innerHTML = "";
  q.opts.forEach((opt, i) => {
    const b = document.createElement("button");
    b.className = "answer-btn";
    b.innerHTML = `<span class="a-label">${LABELS[i]}</span><span>${opt}</span>`;
    b.onclick = () => answerSingle(i, b);
    grid.appendChild(b);
  });
  startTimer(SINGLE_TIME, $("s-timer"), () => answerSingle(-1, null));
}
function answerSingle(i, btn) {
  stopTimer();
  const q = pool[qIndex];
  const btns = $("s-answers").children;
  for (const b of btns) b.disabled = true;
  const isCorrect = i === q.ans;
  if (isCorrect) {
    combo++; correctCount++;
    maxCombo = Math.max(maxCombo, combo);
    const pts = 100 + Math.ceil(timeLeft) * 10 + (combo - 1) * 20;
    score += pts;
    btn.classList.add("correct");
    sfx.correct();
    popScore("+" + pts, btn);
    const cc = $("s-combo");
    if (combo >= 2) { cc.textContent = `🔥 連擊 x${combo}`; cc.classList.add("show"); }
  } else {
    combo = 0;
    $("s-combo").classList.remove("show");
    if (btn) btn.classList.add("wrong");
    btns[q.ans].classList.add("correct");
    for (const b of btns) if (!b.classList.contains("correct") && b !== btn) b.classList.add("dim");
    sfx.wrong();
  }
  $("s-score").textContent = score;
  setTimeout(() => {
    qIndex++;
    if (qIndex < pool.length) renderSingleQ();
    else endSingle();
  }, isCorrect ? 1000 : 1600);
}
function popScore(text, anchor) {
  const r = anchor.getBoundingClientRect();
  const el = document.createElement("div");
  el.className = "score-pop";
  el.textContent = text;
  el.style.left = (r.left + r.width / 2 - 40) + "px";
  el.style.top = (r.top - 10) + "px";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}
function endSingle() {
  const acc = correctCount / pool.length;
  const stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.5 ? 1 : 0;
  const titles = ["再接再厲！💪", "不錯喔，繼續加油！🌱", "很厲害耶！✨", "太神啦，知識王就是你！👑"];
  lastResult = { mode: "single", score, subject: subjectKey === "__mix__" ? "全部混合" : subjectKey };
  $("r-stars").innerHTML =
    [0, 1, 2].map(i => `<span class="${i < stars ? "on" : ""}">${i < stars ? "⭐" : "☆"}</span>`).join("");
  $("r-title").textContent = titles[stars];
  $("r-score").textContent = score + " 分";
  $("r-sub").innerHTML = `答對 ${correctCount} / ${pool.length} 題　‧　最高連擊 x${maxCombo}<br>科目：${lastResult.subject}`;
  setupSaveZone(true);
  showScreen("screen-result");
  if (stars >= 2) { sfx.fanfare(); confetti(); } else sfx.correct();
}

/* ============================================================
   雙人對戰
   ============================================================ */
function startDuel() {
  pool = buildPool(subjectKey, DUEL_ROUNDS);
  qIndex = 0;
  duel = { scores: [0, 0], locked: [false, false], roundOver: false };
  $("d-score-0").textContent = "0";
  $("d-score-1").textContent = "0";
  showScreen("screen-duel");
  renderDuelQ();
}
function renderDuelQ() {
  const q = pool[qIndex];
  duel.locked = [false, false];
  duel.roundOver = false;
  duel.playerAns = [null, null];
  $("d-round").textContent = `第 ${qIndex + 1} / ${pool.length} 回合　${q.icon} ${q.subj}`;
  $("d-question").textContent = q.q;
  [0, 1].forEach(p => {
    $("d-side-" + p).classList.remove("locked");
    const grid = $("d-grid-" + p);
    grid.innerHTML = "";
    // 每位玩家各自洗牌，選項順序不同
    const idx = shuffle([0, 1, 2, 3].slice(0, q.opts.length));
    const playerOpts = idx.map(i => q.opts[i]);
    duel.playerAns[p] = idx.indexOf(q.ans);
    playerOpts.forEach((opt, i) => {
      const b = document.createElement("button");
      b.className = "answer-btn";
      b.innerHTML = `<span class="a-label">${LABELS[i]}</span><span>${opt}</span>`;
      b.onclick = () => answerDuel(p, i, b);
      grid.appendChild(b);
    });
  });
  startTimer(DUEL_TIME, $("d-timer"), duelTimeout);
}
function answerDuel(p, i, btn) {
  if (duel.roundOver || duel.locked[p]) return;
  const q = pool[qIndex];
  if (i === duel.playerAns[p]) {
    duel.roundOver = true;
    stopTimer();
    const pts = 100 + Math.ceil(timeLeft) * 5;
    duel.scores[p] += pts;
    $("d-score-" + p).textContent = duel.scores[p];
    btn.classList.add("correct");
    sfx.correct();
    popScore("+" + pts, btn);
    banner(p === 0 ? "🐰 粉紅隊搶答成功！" : "🐻 藍藍隊搶答成功！");
    revealDuel(q);
    nextDuel();
  } else {
    duel.locked[p] = true;
    btn.classList.add("wrong");
    $("d-side-" + p).classList.add("locked");
    sfx.wrong();
    if (duel.locked[0] && duel.locked[1]) {
      duel.roundOver = true;
      stopTimer();
      banner("💦 兩隊都答錯了！");
      revealDuel(q);
      nextDuel();
    }
  }
}
function duelTimeout() {
  if (duel.roundOver) return;
  duel.roundOver = true;
  banner("⏰ 時間到！");
  revealDuel(pool[qIndex]);
  sfx.wrong();
  nextDuel();
}
function revealDuel(q) {
  [0, 1].forEach(p => {
    const btns = $("d-grid-" + p).children;
    for (let i = 0; i < btns.length; i++) {
      btns[i].disabled = true;
      if (i === duel.playerAns[p]) btns[i].classList.add("correct");
    }
  });
}
function nextDuel() {
  setTimeout(() => {
    $("d-banner").classList.remove("show");
    qIndex++;
    if (qIndex < pool.length) renderDuelQ();
    else endDuel();
  }, 1800);
}
function banner(text) {
  const b = $("d-banner");
  b.textContent = text;
  b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
}
function endDuel() {
  const [a, b] = duel.scores;
  lastResult = { mode: "duel" };
  let title, sub, stars;
  if (a === b) { title = "平分秋色，握手言和！🤝"; stars = "🐰🤝🐻"; }
  else if (a > b) { title = "🐰 粉紅隊獲勝！"; stars = "👑🐰👑"; }
  else { title = "🐻 藍藍隊獲勝！"; stars = "👑🐻👑"; }
  sub = `🐰 粉紅隊 ${a} 分　vs　🐻 藍藍隊 ${b} 分`;
  $("r-stars").innerHTML = `<span class="on">${stars}</span>`;
  $("r-title").textContent = title;
  $("r-score").textContent = Math.max(a, b) + " 分";
  $("r-sub").innerHTML = sub;
  setupSaveZone(false);
  showScreen("screen-result");
  sfx.fanfare();
  confetti();
}

/* ============================================================
   結算 / 名人堂
   ============================================================ */
function setupSaveZone(show) {
  $("r-save-zone").style.display = show ? "" : "none";
  $("r-save").style.display = show ? "" : "none";
  $("r-save").disabled = false;
  $("r-save").textContent = "👑 登錄名人堂";
  pickedAvatar = null;
  if (!show) return;
  const zone = $("r-avatars");
  zone.innerHTML = "";
  AVATARS.forEach(av => {
    const b = document.createElement("button");
    b.className = "avatar-btn";
    b.textContent = av;
    b.onclick = () => {
      sfx.tap();
      pickedAvatar = av;
      zone.querySelectorAll(".avatar-btn").forEach(x => x.classList.remove("sel"));
      b.classList.add("sel");
    };
    zone.appendChild(b);
  });
}
function loadBoard() {
  try { return JSON.parse(localStorage.getItem("quizking_board") || "[]"); }
  catch (e) { return []; }
}
function saveScore() {
  if (!lastResult || lastResult.mode !== "single") return;
  if (!pickedAvatar) { banner2("先選一個頭像喔！🐾"); return; }
  const board = loadBoard();
  board.push({
    avatar: pickedAvatar,
    score: lastResult.score,
    subject: lastResult.subject,
    date: new Date().toLocaleDateString("zh-TW"),
  });
  board.sort((x, y) => y.score - x.score);
  localStorage.setItem("quizking_board", JSON.stringify(board.slice(0, 10)));
  sfx.fanfare();
  $("r-save").disabled = true;
  $("r-save").textContent = "✅ 已登錄！";
  setTimeout(showBoard, 800);
}
function banner2(text) {
  const el = document.createElement("div");
  el.className = "round-banner show";
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1400);
}
function showBoard() {
  sfx.tap();
  const list = $("board-list");
  const board = loadBoard();
  if (board.length === 0) {
    list.innerHTML = `<div class="board-empty">名人堂還空著呢！🌱<br>快去單人挑戰，成為第一位知識王吧！</div>`;
  } else {
    const medals = ["🥇", "🥈", "🥉"];
    list.innerHTML = board.map((r, i) => `
      <div class="board-row">
        <span class="board-rank">${medals[i] || (i + 1)}</span>
        <span class="board-avatar">${r.avatar}</span>
        <span class="board-info">${r.subject}<div class="b-sub">${r.date}</div></span>
        <span class="board-score">${r.score} 分</span>
      </div>`).join("");
  }
  showScreen("screen-board");
}
function replay() {
  sfx.tap();
  startGame(subjectKey);
}

/* ============================================================
   彩帶慶祝
   ============================================================ */
function confetti() {
  const colors = ["#FF8FAB", "#FFB74D", "#81C784", "#64B5F6", "#BA68C8", "#FFD54F"];
  for (let i = 0; i < 90; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    const size = 8 + Math.random() * 12;
    c.style.cssText = `left:${Math.random() * 100}vw; width:${size}px; height:${size * 0.6}px;` +
      `background:${colors[Math.floor(Math.random() * colors.length)]};` +
      `animation-duration:${2 + Math.random() * 2.5}s; animation-delay:${Math.random() * 0.8}s;`;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 5500);
  }
}

/* ============================================================
   系統按鈕
   ============================================================ */
$("btn-sound").onclick = () => {
  soundOn = !soundOn;
  $("btn-sound").textContent = soundOn ? "🔊" : "🔇";
  if (soundOn) sfx.tap();
};
$("btn-full").onclick = () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
};

/* ── 切換題庫 ── */
$("btn-bank").onclick = async () => {
  if (!window.showOpenFilePicker) {
    alert("您的瀏覽器不支援檔案選取，請使用 Chrome / Edge 並以 file:// 開啟");
    return;
  }
  try {
    const [h] = await window.showOpenFilePicker({
      types: [{ description: 'JavaScript 題庫', accept: { 'text/javascript': ['.js'] } }],
      multiple: false,
    });
    const file = await h.getFile();
    const text = await file.text();
    // 解析 QUESTION_BANK
    const fn = new Function(text + '\n; return QUESTION_BANK;');
    const bank = fn();
    if (!bank || typeof bank !== 'object' || !Object.keys(bank).length) {
      alert('⚠️ 無法從此檔案讀取題庫，請確認格式正確');
      return;
    }
    // 替換全域題庫
    Object.keys(QUESTION_BANK).forEach(k => delete QUESTION_BANK[k]);
    Object.assign(QUESTION_BANK, bank);
    // 顯示目前題庫名稱
    const label = document.getElementById('bank-label');
    if (label) { label.textContent = '📂 ' + h.name; label.style.display = 'block'; }
    // 回到首頁並重新渲染科目
    showScreen('screen-home');
    sfx.correct();
  } catch (e) {
    if (e.name !== 'AbortError') alert('⚠️ 載入失敗：' + e.message);
  }
};

document.addEventListener("contextmenu", e => e.preventDefault());
/* 第一次觸控時喚醒音訊（瀏覽器限制） */
document.addEventListener("pointerdown", () => { try { audio(); } catch (e) {} }, { once: true });
