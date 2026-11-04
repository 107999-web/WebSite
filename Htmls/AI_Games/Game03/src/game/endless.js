// 無盡模式：一路在隊伍前方產生「門 → 怪物群 → 陷阱或道具」的段落，每 bossEvery 公尺一隻 Boss。
// 越跑越難：怪物隻數與生命跟著距離成長（game.ramp）。設定在 data/game.json 的 endless。
const pick = (list) => list[Math.floor(Math.random() * list.length)];

export class Endless {
  constructor(game, cfg) {
    this.game = game;
    this.cfg = cfg;
  }

  reset() {
    this.nextD = this.cfg.firstGate;
    this.segment = 0;
    this.nextBoss = this.cfg.bossEvery;
    this.bosses = [];
  }

  // 距離越遠越難：每 rampEvery 公尺怪物生命多 rampHp、隻數多 rampCount
  get level() { return Math.floor(this.game.crowd.d / this.cfg.rampEvery); }

  update() {
    const { game, cfg } = this;
    const { crowd } = game;
    game.ramp = 1 + this.level * cfg.rampHp;
    while (this.nextD - crowd.d < cfg.lookAhead) {
      const d = this.nextD;
      if (d >= this.nextBoss - 20 && d <= this.nextBoss + 30) { // Boss 前後留空地
        if (!this.bosses.includes(this.nextBoss)) this.bosses.push(this.nextBoss);
        this.nextD = this.nextBoss + 40;
        this.nextBoss += cfg.bossEvery;
        continue;
      }
      const seg = this.segment++;
      const doors = Math.min(4, 2 + Math.floor(Math.random() * (2 + Math.min(1, this.level / 3))));
      game.gates.push({ d, kind: seg % 4 === 3 ? 'ability' : 'crowd', doors });
      const size = Math.round(cfg.groupBase + this.level * cfg.rampCount);
      const spawns = [];
      for (let left = size; left > 0;) {
        const enemy = pick(cfg.enemies);
        const n = Math.min(left, 2 + Math.floor(Math.random() * 3));
        spawns.push({ enemy, count: n });
        left -= n;
      }
      game.groups.push({ d: d + 18, spawns, spawned: false });
      const o = pick(cfg.obstacles);
      game.obstacles.push({ ...o, d: d + 30, x: o.x === 'random' ? pick([-3.8, -2.5, 0, 2.5, 3.8]) : o.x });
      this.nextD += cfg.segment;
    }
    // Boss：隊伍靠近時出現（帶護衛），打倒才繼續跑（擋在路上，隊伍會停下來打）
    const due = this.bosses.find((b) => b - crowd.d < 45);
    if (due !== undefined) {
      this.bosses = this.bosses.filter((b) => b !== due);
      const boss = game.spawnEnemy(pick(cfg.boss), 0, due + 6);
      game.spawnGroup({ d: due - 2, spawns: cfg.bossEscort });
      game.boss = boss;
      game.hud.banner(`Boss 出現了！（${Math.round(due)} 公尺）`, 1.6, '#ff5a3c');
    }
  }
}
