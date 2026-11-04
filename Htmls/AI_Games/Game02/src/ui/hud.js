// 畫面上的文字與選單。遊戲邏輯只呼叫這些方法，不直接碰 DOM。
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export class Hud {
  constructor() {
    this.hud = $('hud');
    this.bannerEl = $('banner');
    this.overlay = $('overlay');
    this.cache = {};
  }

  // 每格都會呼叫的，內容沒變就不動 DOM
  set(id, html, prop = 'innerHTML') {
    if (this.cache[id] === html) return;
    this.cache[id] = html;
    $(id)[prop] = html;
  }

  showHud(show) {
    this.hud.hidden = !show;
    $('heroCard').hidden = !show;
    if (!show) { $('nextWave').hidden = true; $('hint').textContent = ''; this.cache.hint = ''; }
  }

  setCastle(hp, max) {
    this.set('castleHp', `${hp}<small> / ${max}</small>`);
    $('castle').classList.toggle('danger', hp <= max * 0.3);
  }

  setGold(gold) {
    if (this.cache.gold === gold) return;
    const up = gold > (this.cache.gold ?? 0);
    this.set('goldCount', String(gold), 'textContent');
    this.cache.gold = gold;
    if (!up) return;
    const el = $('gold');
    el.classList.add('gain');
    clearTimeout(this.goldTimer);
    this.goldTimer = setTimeout(() => el.classList.remove('gain'), 120);
  }

  setWave(number, total, difficulty = '', color = '') {
    this.set('waveInfo', `<span style="color:${color}">${esc(difficulty)}</span>　${number ? `第 ${number} / ${total} 波` : `共 ${total} 波`}`);
  }
  setSpeed(speed) { this.set('speedBtn', `⏩ ×${speed}`, 'textContent'); }

  // 下一波按鈕：{ seconds, bonus, boss, first } 或 null（正在出兵）
  setNextWave(info) {
    const btn = $('nextWave');
    btn.hidden = !info;
    if (!info) return;
    const label = info.first ? '開始出兵' : info.boss ? 'Boss 提早出現' : '提早出兵';
    const bonus = info.bonus ? `<em>+${info.bonus} 金幣</em>` : '';
    this.set('nextWave', `<kbd>N</kbd> ${label}<span>${Math.ceil(info.seconds)}</span>${bonus}`);
  }

  setHero({ portrait, name, hp, max, respawn, skill }) {
    if (this.cache.heroFace !== portrait) { $('heroFace').src = portrait; this.cache.heroFace = portrait; }
    this.set('heroName', name, 'textContent');
    $('heroHp').style.width = `${Math.max(0, hp / max) * 100}%`;
    this.set('heroState', respawn > 0 ? `${Math.ceil(respawn)} 秒後復活` : `${hp} / ${max}`, 'textContent');
    $('heroCard').classList.toggle('down', respawn > 0);
    const s = skill ? `<kbd>K</kbd><b>${esc(skill.name)}</b>${skill.cooldown > 0 ? `<span>${Math.ceil(skill.cooldown)}</span>` : ''}` : '';
    this.set('heroSkill', s);
    $('heroSkill').className = skill?.cooldown > 0 ? 'cooling' : 'ready';
    $('heroSkill').style.setProperty('--c', skill?.color ?? '#fff');
  }

  hint(text) { this.set('hint', text, 'textContent'); }

  showBoss(name, ratio) {
    $('bossBar').hidden = false;
    $('bossName').textContent = name;
    $('bossFill').style.width = `${ratio * 100}%`;
  }

  hideBoss() { $('bossBar').hidden = true; }
  clearBanner() { clearTimeout(this.bannerTimer); this.bannerEl.classList.remove('show'); }
  toast(text, color) { this.banner(text, 0.9, color); }

  flashScreen(color) {
    const el = $('flash');
    el.style.background = color;
    el.classList.remove('go');
    void el.offsetWidth;
    el.classList.add('go');
  }

  banner(text, seconds = 1.6, color = '') {
    this.bannerEl.style.color = color;
    this.bannerEl.textContent = text;
    this.bannerEl.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => this.bannerEl.classList.remove('show'), seconds * 1000);
  }

  // buttons：[{ label, onClick, style: main／second／third }]
  showOverlay({ title, text, buttons = [], html = '' }) {
    this.overlay.hidden = false;
    this.overlay.querySelector('.panel').className = 'panel';
    if (title !== undefined) $('overlayTitle').textContent = title;
    $('overlayText').textContent = text ?? '';
    $('overlayBody').innerHTML = html;
    const box = $('overlayButtons');
    box.innerHTML = '';
    buttons.forEach((b, i) => {
      const el = document.createElement('button');
      el.className = b.style ?? (i === 0 ? 'main' : 'second');
      el.textContent = b.label;
      el.onclick = b.onClick;
      box.append(el);
    });
    $('controls').hidden = !title || buttons.length === 0 || !this.showControls;
    box.querySelector('button')?.focus();
    return $('overlayBody');
  }

  hideOverlay() {
    this.overlay.hidden = true;
    document.activeElement?.blur();
  }

  // 選英雄：characters [{ id, portrait, hp, desc, skill }]
  // difficulties：[{ id, desc, color, stars }]，↑↓ 換難度
  // levels：[{ id, name, desc, stars, max, locked }]，數字鍵 1～4 選關卡（選了會重畫整個畫面）
  showHeroSelect({ characters, selected, levels, level, onPickLevel, difficulties, difficulty, onPickDifficulty, onPick, onConfirm, onBack }) {
    const touch = document.body.classList.contains('touch');
    const body = this.showOverlay({
      title: '選擇英雄',
      text: touch ? '點一下選關卡、英雄和難度，再按「出發」。' : '數字鍵選關卡，←→ 選英雄，↑↓ 選難度，Enter 出發。',
      buttons: [{ label: '出發', onClick: onConfirm }, { label: '返回', onClick: onBack }],
    });
    this.overlay.querySelector('.panel').classList.add('selecting');
    $('controls').hidden = true; // 面板短一點，上面才露得出英雄
    body.innerHTML = `<div id="levelList">${levels.map((l, i) => `
      <button class="lvl ${l.locked ? 'locked' : ''} ${l.id === level ? 'selected' : ''}" data-id="${esc(l.id)}" title="${esc(l.desc)}">
      <b>${l.locked ? '🔒' : i + 1} ${esc(l.name)}</b><small>${l.locked ? '先過前一關' : `⭐ ${l.stars} / ${l.max}`}</small></button>`).join('')}</div>
      <div id="heroList">${characters.map((c) => `
      <button class="char" data-id="${esc(c.id)}"><img src="${c.portrait}" alt=""><b>${esc(c.id)}</b>
      <small>❤️ ${c.hp}　技能：${esc(c.skill)}</small><small>${esc(c.desc)}</small></button>`).join('')}</div>
      <div id="difficultyList">${difficulties.map((d) => `
      <button class="diff" data-id="${esc(d.id)}" style="--c:${d.color}"><b>${esc(d.id)}</b>
      <span class="dStars">${[1, 2, 3].map((n) => `<i class="${n <= d.stars ? '' : 'off'}">⭐</i>`).join('')}</span><small>${esc(d.desc)}</small></button>`).join('')}</div>`;
    body.querySelectorAll('.lvl').forEach((el) => { el.onclick = () => onPickLevel(el.dataset.id); });
    const diffs = [...body.querySelectorAll('.diff')];
    let currentDiff = difficulty;
    const markDiff = (id) => diffs.forEach((el) => el.classList.toggle('selected', el.dataset.id === id));
    markDiff(currentDiff);
    const pickDiff = (id) => { currentDiff = id; markDiff(id); onPickDifficulty(id); };
    diffs.forEach((el) => { el.onclick = () => pickDiff(el.dataset.id); });
    const cards = [...body.querySelectorAll('.char')];
    const mark = (id) => cards.forEach((el) => el.classList.toggle('selected', el.dataset.id === id));
    mark(selected);
    let current = selected;
    cards.forEach((el) => { el.onclick = () => { current = el.dataset.id; mark(current); onPick(current); }; });
    this.selectKeys = (code) => {
      const i = characters.findIndex((c) => c.id === current);
      if (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'KeyA' || code === 'KeyD') {
        const step = code === 'ArrowLeft' || code === 'KeyA' ? -1 : 1;
        current = characters[(i + step + characters.length) % characters.length].id;
        mark(current);
        onPick(current);
        return true;
      }
      if (code === 'ArrowUp' || code === 'ArrowDown' || code === 'KeyW' || code === 'KeyS') {
        const j = difficulties.findIndex((d) => d.id === currentDiff);
        const step = code === 'ArrowUp' || code === 'KeyW' ? -1 : 1;
        pickDiff(difficulties[Math.max(0, Math.min(difficulties.length - 1, j + step))].id);
        return true;
      }
      if (code === 'Enter' || code === 'Space') { onConfirm(); return true; }
      if (code === 'Escape') { onBack(); return true; }
      const digit = /^(?:Digit|Numpad)([1-9])$/.exec(code);
      if (digit && levels[digit[1] - 1]) { onPickLevel(levels[digit[1] - 1].id); return true; }
      return false;
    };
  }

  // 升級樹：groups 依 group 分欄。items [{ id, group, icon, name, desc, level, max, cost }]
  showUpgrades({ stars, items, onBuy, onRefund, onBack, message = '' }) {
    const body = this.showOverlay({
      title: '升級',
      text: message || `過關拿到的星星可以買永久升級。按「退回星星」可以重新分配。`,
      buttons: [{ label: '返回', onClick: onBack }, { label: '退回星星', onClick: onRefund, style: 'third' }],
    });
    this.overlay.querySelector('.panel').classList.add('upgrading');
    const groups = [...new Set(items.map((i) => i.group))];
    body.innerHTML = `<div id="starWallet">⭐ <b>${stars}</b> 顆可用</div><div id="upgradeList">${groups.map((g) => `
      <section><h3>${esc(g)}</h3>${items.filter((i) => i.group === g).map((u) => `
        <button class="upgrade ${u.level >= u.max ? 'done' : u.cost > stars ? 'cant' : ''}" data-id="${esc(u.id)}">
          <span class="icon">${u.icon}</span><span class="info"><b>${esc(u.name)}</b><small>${esc(u.desc)}</small>
          <span class="pips">${'●'.repeat(u.level)}${'○'.repeat(u.max - u.level)}</span></span>
          <span class="price">${u.level >= u.max ? '已滿' : `⭐ ${u.cost}`}</span></button>`).join('')}</section>`).join('')}</div>`;
    body.querySelectorAll('.upgrade').forEach((el) => { el.onclick = () => onBuy(el.dataset.id); });
    this.selectKeys = (code) => (code === 'Escape' ? (onBack(), true) : false);
  }

  clearKeys() { this.selectKeys = null; }
}
