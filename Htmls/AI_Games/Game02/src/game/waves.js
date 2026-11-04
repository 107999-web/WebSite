// 出兵：一波一波從路的起點出發。一波出完後倒數下一波，玩家可以按「提早出兵」拿額外金幣。
// 波次寫在關卡 JSON 的 waves：{ spawns: [{ enemy, count, from }], interval, break, boss: [隨機一隻] }
// from：這種敵人從哪個難度開始出現（例如 "普通" 表示普通和困難才有）；隻數再乘上難度的 countMult
// 好幾條路時：spawns 可寫 path（第幾條路，從 0 算），沒寫就隨機一條。bossAll: true 表示 boss 清單每隻都出場，前一隻倒下後下一隻才出來
const LANE = 0.9; // 敵人在路上左右散開，才不會排成一直線

export class WaveDirector {
  constructor(game, level) {
    this.game = game;
    this.waves = level.waves;
    this.index = -1;
    this.queue = [];
    this.timer = 0;
    this.countdown = level.firstWait ?? game.settings.firstWait;
    this.countdownMax = this.countdown;
  }

  get number() { return Math.max(0, this.index + 1); }
  get total() { return this.waves.length; }
  get hasNext() { return this.index < this.waves.length - 1; }
  get finished() { return !this.hasNext && this.queue.length === 0; }
  get waiting() { return this.hasNext && this.queue.length === 0; } // 正在倒數下一波
  get nextIsBoss() { return Boolean(this.waves[this.index + 1]?.boss); }

  // 不同種類交錯出現，比較有變化；Boss 最後出場
  buildQueue(wave) {
    const { order, difficulty } = this.game;
    const level = order.indexOf(this.game.difficultyId);
    const groups = (wave.spawns ?? [])
      .filter((s) => !s.from || order.indexOf(s.from) <= level)
      .map((s) => ({ enemy: s.enemy, path: s.path, left: Math.round(s.count * (difficulty.countMult ?? 1)) }));
    const queue = [];
    while (groups.some((g) => g.left > 0)) {
      for (const g of groups) if (g.left-- > 0) queue.push({ enemy: g.enemy, path: g.path });
    }
    if (wave.boss && wave.bossAll) wave.boss.forEach((boss, i) => queue.push({ boss, afterBoss: i > 0, path: i % this.game.paths.length }));
    else if (wave.boss) queue.push({ boss: wave.boss[Math.floor(Math.random() * wave.boss.length)] });
    return queue;
  }

  startNext() {
    this.index += 1;
    const wave = this.waves[this.index];
    this.queue = this.buildQueue(wave);
    this.interval = wave.interval ?? 1.2;
    this.timer = 0;
    this.countdown = 0;
    const { hud, sfx } = this.game;
    hud.banner(wave.boss ? 'Boss 來了！' : `第 ${this.number} 波`, 1.6, wave.boss ? '#ff5a3c' : '');
    sfx.wave();
  }

  // 提早出兵：剩幾秒就多給幾枚金幣（乘上設定的倍率）。第一波還沒開始時不給
  callEarly() {
    if (!this.waiting) return 0;
    const bonus = this.index < 0 ? 0 : Math.ceil(this.countdown * this.game.settings.earlyGoldPerSecond);
    this.startNext();
    return bonus;
  }

  update(dt) {
    if (this.queue.length) {
      this.timer -= dt;
      if (this.timer > 0) return;
      const next = this.queue[0];
      if (next.afterBoss && this.game.enemies.some((e) => e.def.boss && e.alive)) return; // 等前一隻 Boss 倒下
      this.queue.shift();
      const { paths } = this.game;
      const path = paths[next.path ?? Math.floor(Math.random() * paths.length)] ?? paths[0];
      if (next.boss) {
        this.game.spawnEnemy(next.boss, 0, 0, path);
        if (next.afterBoss) this.game.hud.banner('又一隻 Boss！', 1.6, '#ff5a3c');
      } else {
        this.game.spawnEnemy(next.enemy, 0, (Math.random() * 2 - 1) * LANE, path);
      }
      this.timer = this.interval;
      if (!this.queue.length && this.hasNext) {
        this.countdown = this.countdownMax = this.waves[this.index].break ?? this.game.settings.waveBreak;
      }
      return;
    }
    if (this.countdown > 0) {
      this.countdown -= dt;
      if (this.countdown <= 0) this.startNext();
    }
  }
}
