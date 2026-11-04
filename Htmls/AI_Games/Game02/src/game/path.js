// 敵人走的路線：關卡 JSON 的 path.points 是轉折點，轉角自動修圓，再切成每 0.25 公尺一點。
// 敵人只記「走了幾公尺」（s）和「靠路的哪一邊」（lane），位置由這裡算出來。
const STEP = 0.25;

function roundCorners(points, radius) {
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const [px, pz] = points[i - 1], [x, z] = points[i], [nx, nz] = points[i + 1];
    const inLen = Math.hypot(x - px, z - pz), outLen = Math.hypot(nx - x, nz - z);
    const r = Math.min(radius, inLen / 2, outLen / 2);
    const a = [x - ((x - px) / inLen) * r, z - ((z - pz) / inLen) * r];
    const b = [x + ((nx - x) / outLen) * r, z + ((nz - z) / outLen) * r];
    for (let t = 0; t <= 1; t += 0.1) { // 二次貝茲曲線，控制點是轉折點
      const u = 1 - t;
      out.push([u * u * a[0] + 2 * u * t * x + t * t * b[0], u * u * a[1] + 2 * u * t * z + t * t * b[1]]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

export class Path {
  constructor({ points, width = 3.6, corner = 2.6 }) {
    this.width = width;
    const rough = roundCorners(points, corner);
    this.samples = [{ x: rough[0][0], z: rough[0][1], s: 0 }];
    let s = 0;
    for (let i = 1; i < rough.length; i++) {
      const [x0, z0] = rough[i - 1], [x1, z1] = rough[i];
      const len = Math.hypot(x1 - x0, z1 - z0);
      const steps = Math.max(1, Math.round(len / STEP));
      for (let k = 1; k <= steps; k++) {
        s += len / steps;
        this.samples.push({ x: x0 + ((x1 - x0) * k) / steps, z: z0 + ((z1 - z0) * k) / steps, s });
      }
    }
    this.length = s;
    for (let i = 0; i < this.samples.length; i++) { // 每一點的前進方向
      const a = this.samples[Math.max(0, i - 1)], b = this.samples[Math.min(this.samples.length - 1, i + 1)];
      const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      this.samples[i].dx = (b.x - a.x) / len;
      this.samples[i].dz = (b.z - a.z) / len;
    }
  }

  // s 公尺處的位置；lane 往前進方向的右手邊偏移
  at(s, lane = 0) {
    const t = Math.max(0, Math.min(this.length, s)) / this.length * (this.samples.length - 1);
    const i = Math.min(this.samples.length - 2, Math.floor(t));
    const f = t - i;
    const a = this.samples[i], b = this.samples[i + 1];
    const dx = a.dx + (b.dx - a.dx) * f, dz = a.dz + (b.dz - a.dz) * f;
    return { x: a.x + (b.x - a.x) * f - dz * lane, z: a.z + (b.z - a.z) * f + dx * lane, dx, dz };
  }

  closest(x, z) {
    let best = this.samples[0], bestD = Infinity;
    for (const p of this.samples) {
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < bestD) { bestD = d; best = p; }
    }
    return { ...best, dist: Math.sqrt(bestD) };
  }
}
