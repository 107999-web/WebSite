// 音效：先用 WebAudio 合成，之後有音檔可以在這裡換掉。
export class Sfx {
  constructor() { this.ctx = null; }

  unlock() {
    this.ctx ??= new AudioContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(freq, endFreq, dur, type = 'square', gain = 0.12) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(amp).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }

  noise(dur, gain = 0.12, cutoff = 2400) {
    if (!this.ctx) return;
    const size = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const src = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const amp = this.ctx.createGain();
    src.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    amp.gain.value = gain;
    src.connect(filter).connect(amp).connect(this.ctx.destination);
    src.start();
  }

  swing() { this.noise(0.14, 0.1, 3200); }
  hit() { this.noise(0.08, 0.2, 5000); this.tone(420, 120, 0.1, 'square', 0.1); }
  bones() { this.noise(0.25, 0.14, 1800); this.tone(260, 70, 0.3, 'triangle', 0.14); }
  hurt() { this.tone(220, 80, 0.28, 'sawtooth', 0.14); }
  pickup() { this.tone(660, 1320, 0.18, 'triangle', 0.14); }
  burn() { this.noise(0.18, 0.1, 1200); }
  coin() { this.tone(1100, 1500, 0.09, 'triangle', 0.08); }
  blast() { this.noise(0.5, 0.26, 1400); this.tone(180, 40, 0.5, 'sawtooth', 0.14); }
  wave() { this.tone(330, 660, 0.25, 'triangle', 0.12); }
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, f, 0.26, 'triangle', 0.14), i * 130)); }
  lose() { [392, 330, 262].forEach((f, i) => setTimeout(() => this.tone(f, f * 0.9, 0.36, 'sawtooth', 0.1), i * 190)); }
}
