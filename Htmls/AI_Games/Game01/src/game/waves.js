// 一波一波出怪：內容全部來自關卡 JSON 的 waves。
const WAVE_BREAK = 2.2;
const MIN_SPAWN_DISTANCE = 7;

export class WaveDirector {
  constructor(game, level) {
    this.game = game;
    this.waves = level.waves;
    this.points = level.spawnPoints.map((p) => p.at);
    this.index = -1;
    this.queue = [];
    this.timer = 0;
    this.pause = 0.6;
    this.finished = false;
  }

  get number() { return Math.max(1, this.index + 1); }
  get total() { return this.waves.length; }
  get remaining() { return this.queue.length + this.game.enemies.filter((e) => e.alive).length; }

  startNext() {
    this.index += 1;
    const wave = this.waves[this.index];
    this.queue = (wave.spawns ?? []).flatMap((s) => Array.from({ length: s.count }, () => s.enemy));
    // 打散順序，多種敵人混在一波時才不會一種出完才換下一種
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
    this.timer = 0;
    this.waveTime = 0;
    this.scheduled = [...(wave.items ?? [])]; // 關卡指定「這一波第幾秒」出現的道具
    this.game.hud.banner(`第 ${this.index + 1} 波`);
    this.game.sfx.wave();
    if (wave.boss) this.startBoss(wave);
  }

  // boss 是清單，每局隨機一隻；打散後放在佇列最後，最先出場
  startBoss(wave) {
    const id = wave.boss[Math.floor(Math.random() * wave.boss.length)];
    this.queue.push(id);
    if (wave.healPlayer) this.game.player.heal(this.game.player.maxHp); // 最後一戰從滿血開始，才不會被前一波決定勝負
    this.game.hud.banner(`${this.game.characters[id].boss.name}出現！`, 2.2, '#ff5a3c');
    this.game.fx.shake(0.7);
    this.game.sfx.blast();
  }

  pickPoint() {
    const player = this.game.player.position;
    const far = this.points.filter(([x, z]) => Math.hypot(x - player.x, z - player.z) >= MIN_SPAWN_DISTANCE);
    const pool = far.length ? far : this.points;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  update(dt) {
    if (this.finished) return;
    if (this.pause > 0) {
      this.pause -= dt;
      if (this.pause <= 0) this.startNext();
      return;
    }
    const wave = this.waves[this.index];
    this.waveTime += dt;
    this.scheduled = this.scheduled.filter((entry) => {
      if (this.waveTime < entry.at) return true;
      this.game.items.spawnOnField(entry.item);
      return false;
    });
    this.timer -= dt;
    const alive = this.game.enemies.filter((e) => e.alive).length;
    if (this.queue.length && this.timer <= 0 && alive < wave.maxAlive) {
      this.timer = wave.interval;
      const [x, z] = this.pickPoint();
      this.game.spawnEnemy(this.queue.pop(), x + (Math.random() - 0.5) * 1.5, z + (Math.random() - 0.5) * 1.5);
    }
    // 要重新數：剛生出來的這隻也算，否則最後一隻一出場這波就結束了
    if (!this.queue.length && this.game.enemies.every((e) => !e.alive)) {
      this.game.chests.onWaveCleared(this.index, wave);
      if (this.index + 1 >= this.waves.length) { this.finished = true; this.game.onLevelCleared(); }
      else this.pause = WAVE_BREAK;
    }
  }
}
