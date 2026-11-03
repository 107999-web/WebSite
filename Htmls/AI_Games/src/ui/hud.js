// 畫面上的文字與選單。遊戲邏輯只呼叫這些方法，不直接碰 DOM。
const $ = (id) => document.getElementById(id);

export class Hud {
  constructor() {
    this.hud = $('hud');
    this.bannerEl = $('banner');
    this.overlay = $('overlay');
    this.buffsEl = $('buffs');
    this.bannerTimer = 0;
  }

  setHearts(hp, max) {
    $('hearts').innerHTML = Array.from({ length: max }, (_, i) => `<span class="${i < hp ? '' : 'lost'}">❤️</span>`).join('');
  }

  setWave(number, total, remaining) { $('waveInfo').textContent = `第 ${number} / ${total} 波　剩下 ${remaining} 隻`; }
  setScore(score) { $('score').textContent = `分數 ${score}`; }

  setCoins(total) {
    $('coinCount').textContent = total;
    const el = $('coins');
    el.classList.add('gain');
    clearTimeout(this.coinTimer);
    this.coinTimer = setTimeout(() => el.classList.remove('gain'), 120);
  }
  showHud(show) { this.hud.hidden = !show; this.buffsEl.hidden = !show; }

  setBuffs(list) {
    this.buffsEl.innerHTML = list.map((b) => `<div class="buff" style="--c:${b.color}"><b>${b.name}</b> ${Math.ceil(b.remaining)} 秒</div>`).join('');
  }

  showBoss(name, ratio) {
    $('bossBar').hidden = false;
    $('bossName').textContent = name;
    $('bossFill').style.width = `${ratio * 100}%`;
  }

  hideBoss() { $('bossBar').hidden = true; }

  toast(text, color) { this.banner(text, 0.9, color); }

  flashScreen(color) {
    const el = $('flash');
    el.style.background = color;
    el.classList.remove('go');
    void el.offsetWidth; // 重新觸發動畫
    el.classList.add('go');
  }

  setLegend(items) {
    $('legend').innerHTML = items.map((i) => `<span style="--c:${i.color}">${i.name}</span>`).join('');
  }

  banner(text, seconds = 1.6, color = '') {
    this.bannerEl.style.color = color;
    this.bannerEl.textContent = text;
    this.bannerEl.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => this.bannerEl.classList.remove('show'), seconds * 1000);
  }

  // 畫面下方的技能與攜帶藥水。list：[{ key, name, color, state: ready／cooling／active, seconds }]
  setAbilities(list) {
    const html = list.map((a) => `<div class="ability ${a.state}" data-key="${a.key}" style="--c:${a.color}"><kbd>${a.key}</kbd><b>${a.name}</b>${a.seconds ? `<span>${Math.ceil(a.seconds)}</span>` : ''}</div>`).join('');
    if (html !== this.abilitiesHtml) $('abilities').innerHTML = html; // 每格都會呼叫，內容沒變就不動畫面
    this.abilitiesHtml = html;
  }

  showOverlay({ title, text, button, onClick, second, onSecond, third, onThird }) {
    this.closeCharacterList();
    this.overlay.hidden = false;
    if (title) $('overlayTitle').textContent = title;
    $('overlayText').textContent = text;
    const btn = $('overlayButton');
    btn.hidden = !button;
    btn.textContent = button ?? '';
    btn.onclick = onClick ?? null;
    const other = $('overlaySecond');
    other.hidden = !second;
    other.textContent = second ?? '';
    other.onclick = onSecond ?? null;
    const extra = $('overlayThird');
    extra.hidden = !third;
    extra.textContent = third ?? '';
    extra.onclick = onThird ?? null;
    if (button) btn.focus();
  }

  hideOverlay() {
    this.closeCharacterList();
    this.overlay.hidden = true;
  }

  // 角色清單。characters：[{ id, portrait, hp, moveSpeed, desc }]；換選時呼叫 onPick(id)
  showCharacterList({ characters, selected, levels, selectedLevel, onPick, onPickLevel, onConfirm, onBack, onShop }) {
    this.showOverlay({
      title: '選擇角色',
      text: document.body.classList.contains('touch') ? '點一下選角色和關卡，再按「出發」。' : '←→ 選角色，↑↓ 選關卡，按 Enter 出發。',
      button: '出發',
      onClick: onConfirm,
      second: '返回',
      onSecond: onBack,
      third: '商店',
      onThird: onShop,
    });
    const list = $('characterList');
    const ids = characters.map((c) => c.id);
    let current = selected;
    list.innerHTML = characters.map((c) => `<button class="char" data-id="${c.id}" tabindex="-1">
      <img src="${c.portrait}" alt=""><b>${c.id}</b><small>${c.desc}</small><small>❤️ ${c.hp}　速度 ${c.moveSpeed}</small></button>`).join('');
    const mark = () => {
      for (const el of list.children) el.classList.toggle('selected', el.dataset.id === current);
    };
    const pick = (id) => {
      if (id === current) return;
      current = id;
      mark();
      onPick(id);
    };
    list.onclick = (e) => {
      const card = e.target.closest('.char');
      if (card) pick(card.dataset.id);
    };
    // 關卡列：鎖住的看得到但選不了
    const levelBox = $('levelList');
    const open = levels.filter((l) => !l.locked).map((l) => l.id);
    let currentLevel = selectedLevel;
    levelBox.innerHTML = levels.map((l, i) => `<button class="levelCard${l.locked ? ' locked' : ''}" data-id="${l.id}" tabindex="-1">
      <b>${l.locked ? '🔒 ' : l.cleared ? '⭐ ' : ''}第 ${i + 1} 關　${l.name}</b><small>${l.locked ? '打過前一關才開放' : l.desc}</small></button>`).join('');
    const markLevel = () => {
      for (const el of levelBox.children) el.classList.toggle('selected', el.dataset.id === currentLevel);
    };
    const pickLevel = (id) => {
      if (id === currentLevel || !open.includes(id)) return;
      currentLevel = id;
      markLevel();
      onPickLevel(id);
    };
    levelBox.onclick = (e) => {
      const card = e.target.closest('.levelCard');
      if (card) pickLevel(card.dataset.id);
    };
    markLevel();
    levelBox.hidden = false;
    this.selectKeys = (e) => {
      if (e.repeat) return;
      const step = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1 }[e.code];
      const levelStep = { ArrowUp: -1, KeyW: -1, ArrowDown: 1, KeyS: 1 }[e.code];
      if (step) pick(ids[(ids.indexOf(current) + step + ids.length) % ids.length]);
      else if (levelStep) pickLevel(open[(open.indexOf(currentLevel) + levelStep + open.length) % open.length]);
      else if (e.code === 'Escape') onBack();
      else if ((e.code === 'Enter' || e.code === 'Space') && ![$('overlaySecond'), $('overlayThird')].includes(document.activeElement)) {
        e.preventDefault();
        onConfirm();
      }
    };
    addEventListener('keydown', this.selectKeys);
    list.hidden = false;
    list.parentElement.classList.add('selecting');
    mark();
  }

  closeCharacterList() {
    const list = $('characterList');
    list.hidden = true;
    $('levelList').hidden = true;
    list.parentElement.classList.remove('selecting');
    if (this.selectKeys) removeEventListener('keydown', this.selectKeys);
    this.selectKeys = null;
  }
}
