// 角色共用：模型、動作切換、受傷閃光、淡出。玩家和敵人都繼承這個類別。
import * as THREE from 'three';

export class Actor {
  constructor(game, def, instance) {
    this.game = game;
    this.def = def;
    this.hp = def.hp;
    this.radius = def.radius;
    this.root = new THREE.Group();
    this.model = instance.scene;
    this.model.scale.setScalar(def.scale);
    this.root.add(this.model);
    this.materials = instance.materials;
    this.mixer = new THREE.AnimationMixer(this.model);
    this.clips = new Map(instance.clips.map((c) => [c.name, c]));
    this.current = null;
    this.currentName = '';
    this.flashTime = 0;
    game.scene.add(this.root);
  }

  get position() { return this.root.position; }

  clipLength(name) { return this.clips.get(name)?.duration ?? 0; }

  play(name, { once = false, fade = 0.14, speed = 1 } = {}) {
    if (!once && name === this.currentName) { if (this.current) this.current.timeScale = speed; return; }
    const clip = this.clips.get(name);
    if (!clip) return; // 模型缺這段動作就維持原樣，不讓遊戲當掉
    const next = this.mixer.clipAction(clip);
    next.reset();
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat);
    next.clampWhenFinished = once;
    next.timeScale = speed;
    next.play();
    if (this.current && this.current !== next) this.current.crossFadeTo(next, fade, false);
    this.current = next;
    this.currentName = name;
  }

  faceToward(x, z, dt, turnSpeed = 14) {
    const target = Math.atan2(x, z); // 模型正面朝 +Z
    let diff = target - this.root.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.root.rotation.y += dt === Infinity ? diff : diff * Math.min(1, turnSpeed * dt);
  }

  flash(color = 0xff5533) {
    this.flashTime = 0.13;
    for (const m of this.materials) { m.emissive.setHex(color); m.emissiveIntensity = 1.2; }
  }

  setOpacity(value) {
    const transparent = value < 1;
    for (const m of this.materials) {
      if (m.transparent !== transparent) m.needsUpdate = true; // 不重新編譯的話，不透明材質的 opacity 不會生效
      m.transparent = transparent;
      m.opacity = value;
    }
  }

  updateVisual(dt) {
    this.mixer.update(dt);
    if (this.flashTime > 0) {
      this.flashTime -= dt;
      if (this.flashTime <= 0) for (const m of this.materials) m.emissiveIntensity = 0;
    }
  }

  destroy() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    this.game.scene.remove(this.root);
    for (const m of this.materials) m.dispose();
  }
}
