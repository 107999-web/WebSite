// 分身：跟在玩家兩側、動作同步。不會受傷、不擋路。
import { Actor } from './actor.js';

const FOLLOW_SPEED = 12;
const OPACITY = 0.72;

class Clone extends Actor {
  constructor(game, def, instance) {
    super(game, def, instance);
    this.setOpacity(OPACITY);
    for (const m of this.materials) { m.emissive.setHex(0xffc83a); m.emissiveIntensity = 0.28; }
    this.root.visible = false;
  }
}

export class Clones {
  constructor(game) {
    this.game = game;
    this.pool = [];
    this.active = [];
  }

  makeClone() {
    const { player, assets } = this.game;
    const clone = new Clone(this.game, player.def, assets.instantiate(player.def.model));
    this.pool.push(clone);
    return clone;
  }

  // 開場先建好並編譯，否則第一次撿到黃藥水時畫面會卡住將近一秒
  prepare(count) {
    if (this.pool.length >= count) return;
    while (this.pool.length < count) this.makeClone();
    const { renderer, scene, camera } = this.game;
    for (const clone of this.pool) clone.root.visible = true;
    renderer.compile(scene, camera);
    for (const clone of this.pool) clone.root.visible = false;
  }

  show(count) {
    const { player, fx } = this.game;
    while (this.pool.length < count) this.makeClone();
    this.active = this.pool.slice(0, count);
    for (const clone of this.active) {
      clone.root.visible = true;
      clone.position.copy(player.position);
      clone.root.rotation.y = player.root.rotation.y;
      fx.dust(player.position.x, 0.5, player.position.z, 10);
    }
  }

  hide() {
    for (const clone of this.active) clone.root.visible = false;
    this.active = [];
  }

  // 換角色時丟掉舊分身，下次會用新角色的模型重建
  clear() {
    this.hide();
    for (const clone of this.pool) clone.destroy();
    this.pool = [];
  }

  onPlayerAttack(speed) {
    for (const clone of this.active) clone.play('Attack', { once: true, fade: 0.06, speed });
  }

  update(dt) {
    const { items, player, level } = this.game;
    const buff = items.buff('clones');
    if (!buff) { if (this.active.length) this.hide(); return; }
    if (!this.active.length) this.show(buff.count);

    const yaw = player.root.rotation.y;
    const rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
    this.active.forEach((clone, i) => {
      // 依序排在左右：-1、+1、-2、+2…
      const side = (i % 2 === 0 ? -1 : 1) * (Math.floor(i / 2) + 1) * buff.sideOffset;
      const k = Math.min(1, FOLLOW_SPEED * dt);
      clone.position.x += (player.position.x + rightX * side - clone.position.x) * k;
      clone.position.z += (player.position.z + rightZ * side - clone.position.z) * k;
      level.constrain(clone.position, clone.radius);
      clone.root.rotation.y = yaw;
      if (player.currentName !== 'Attack') clone.play(player.currentName, { speed: player.current?.timeScale ?? 1 });
      clone.updateVisual(dt);
    });
  }
}
