// 商店畫面的面板：角色分頁、商品清單、老闆對話。買賣邏輯都在 Shop，這裡只管顯示和按鍵。
const $ = (id) => document.getElementById(id);
const RESET_CONFIRM_TIME = 3000;

function priceLabel(offer) {
  if (offer.locked) return '要先學技能';
  if (offer.price === null) return offer.kind === 'potion' ? '已帶著' : '已買滿';
  return `💰 ${offer.price}`;
}

// 平板、手機沒有鍵盤：說明裡的「按 K／按 L」換成畫面上的按鈕
function touchText(text) {
  if (!document.body.classList.contains('touch')) return text;
  return text.replace(/按 ?K/g, '按技能鈕').replace(/按 ?L/g, '按藥水鈕');
}

function pips(offer) {
  if (offer.max <= 1) return '';
  return `<span class="pips">${'●'.repeat(offer.level)}${'○'.repeat(offer.max - offer.level)}</span>`;
}

export class ShopPanel {
  // characters：[{ id, portrait }]；getOffers(id) 取清單；onBuy(offer, id)；onReset()；onBack()
  constructor() {
    this.el = $('shop');
    this.index = 0;
  }

  open({ characters, selected, coins, getOffers, onBuy, onReset, onBack }) {
    Object.assign(this, { characters, current: selected, getOffers, onBuy, onReset, onBack, index: 0 });
    this.el.hidden = false;
    $('shopBubble').hidden = false;
    this.setCoins(coins);
    this.keys = (e) => this.onKey(e);
    addEventListener('keydown', this.keys);
    $('shopTabs').onclick = (e) => {
      const tab = e.target.closest('.shopTab');
      if (tab) this.switchTo(tab.dataset.id);
    };
    $('shopList').onclick = (e) => {
      const row = e.target.closest('.offer');
      if (!row) return;
      this.index = Number(row.dataset.index);
      this.buySelected();
    };
    $('shopBack').onclick = () => onBack();
    this.armReset(false);
    $('shopReset').onclick = () => this.pressReset();
    this.render();
  }

  close() {
    this.el.hidden = true;
    $('shopBubble').hidden = true;
    clearTimeout(this.resetTimer);
    if (this.keys) removeEventListener('keydown', this.keys);
    this.keys = null;
  }

  setCoins(total) { $('shopCoins').textContent = total; }
  say(text) { $('shopBubble').textContent = text; }

  // 重置要連按兩下，避免學生誤按把全部進度清掉
  armReset(armed) {
    this.resetArmed = armed;
    clearTimeout(this.resetTimer);
    $('shopReset').textContent = armed ? '再按一次確定清除' : '重置進度';
    $('shopReset').classList.toggle('armed', armed);
    if (armed) this.resetTimer = setTimeout(() => this.armReset(false), RESET_CONFIRM_TIME);
  }

  pressReset() {
    if (!this.resetArmed) { this.armReset(true); return; }
    this.armReset(false);
    this.onReset();
    this.render();
  }

  switchTo(id) {
    this.current = id;
    this.index = 0;
    this.render();
  }

  buySelected() {
    const offer = this.offers[this.index];
    if (offer) this.onBuy(offer, this.current);
    this.render();
  }

  onKey(e) {
    if (e.repeat) return;
    const ids = this.characters.map((c) => c.id);
    const tab = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1 }[e.code];
    const row = { ArrowUp: -1, KeyW: -1, ArrowDown: 1, KeyS: 1 }[e.code];
    if (tab) this.switchTo(ids[(ids.indexOf(this.current) + tab + ids.length) % ids.length]);
    else if (row) {
      e.preventDefault();
      this.index = (this.index + row + this.offers.length) % this.offers.length;
      this.render();
    } else if (e.code === 'Escape') this.onBack();
    else if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      if (document.activeElement?.tagName === 'BUTTON') document.activeElement.blur();
      this.buySelected();
    }
  }

  render() {
    this.offers = this.getOffers(this.current);
    $('shopTabs').innerHTML = this.characters.map((c) => `<button class="shopTab${c.id === this.current ? ' selected' : ''}" data-id="${c.id}" tabindex="-1"><img src="${c.portrait}" alt=""><b>${c.id}</b></button>`).join('');
    const rows = Math.ceil(this.offers.length / 2);
    $('shopList').style.gridTemplateRows = `repeat(${rows}, auto)`;
    $('shopList').classList.toggle('dense', rows > 3); // 商品多時改緊湊，不要捲動
    this.el.classList.toggle('dense', rows > 3);
    $('shopList').innerHTML = this.offers.map((offer, i) => {
      const state = [i === this.index ? 'selected' : '', offer.price === null ? 'done' : '', offer.locked || (offer.price !== null && !offer.affordable) ? 'cant' : ''].join(' ');
      return `<button class="offer ${state}" data-index="${i}" tabindex="-1">
        <span class="icon">${offer.icon}</span>
        <span class="info"><b>${offer.name}${offer.shared ? '<em>共用</em>' : ''}</b>${pips(offer)}<small>${touchText(offer.desc)}</small></span>
        <span class="price">${priceLabel(offer)}</span></button>`;
    }).join('');
    $('shopList').children[this.index]?.scrollIntoView({ block: 'nearest' });
  }
}
