import type { GameEvent } from '../core/events';

/**
 * Tiny procedural sound effects synthesised with the Web Audio API — original placeholder
 * audio with no asset files. Every sound is addressed by a cue name, which is the seam for
 * swapping in recorded sound effects later.
 */
export type Cue =
  | 'jump'
  | 'land'
  | 'swing'
  | 'hit'
  | 'kill'
  | 'hurt'
  | 'dash'
  | 'windup'
  | 'shoot'
  | 'burst'
  | 'checkpoint'
  | 'ability'
  | 'secret'
  | 'wall'
  | 'slam'
  | 'roar'
  | 'death'
  | 'menu'
  | 'confirm'
  | 'victory';

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private drone: { stop: () => void } | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  muted = false;

  /** Must be called from a user gesture (key press / click) to satisfy autoplay policies. */
  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctor: typeof AudioContext | undefined =
      typeof window !== 'undefined'
        ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
        : undefined;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.35;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.35, this.ctx.currentTime, 0.05);
    return this.muted;
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, filter: BiquadFilterType, f0: number, f1 = f0, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noiseBuffer) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bq = ctx.createBiquadFilter();
    bq.type = filter;
    bq.frequency.setValueAtTime(f0, t);
    bq.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bq).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  play(cue: Cue): void {
    if (!this.ctx || this.muted) return;
    switch (cue) {
      case 'jump':
        this.tone('square', 180, 360, 0.09, 0.05);
        break;
      case 'land':
        this.noise(0.07, 0.25, 'lowpass', 900, 200);
        break;
      case 'swing':
        this.noise(0.08, 0.22, 'bandpass', 2400, 700);
        break;
      case 'hit':
        this.tone('square', 220, 90, 0.08, 0.09);
        this.noise(0.06, 0.3, 'highpass', 1800);
        break;
      case 'kill':
        this.tone('sawtooth', 260, 50, 0.3, 0.08);
        this.noise(0.25, 0.25, 'lowpass', 2500, 300);
        break;
      case 'hurt':
        this.tone('sawtooth', 320, 70, 0.25, 0.12);
        break;
      case 'dash':
        this.noise(0.16, 0.25, 'highpass', 600, 4000);
        this.tone('sine', 500, 900, 0.12, 0.04);
        break;
      case 'windup':
        this.tone('sine', 180, 420, 0.32, 0.05);
        break;
      case 'shoot':
        this.tone('triangle', 640, 280, 0.14, 0.07);
        break;
      case 'burst':
        this.noise(0.08, 0.15, 'bandpass', 1200, 400);
        break;
      case 'checkpoint':
        [392, 494, 587].forEach((f, i) => this.tone('sine', f, f, 0.6, 0.06, i * 0.09));
        break;
      case 'ability':
        [330, 440, 554, 660, 880].forEach((f, i) => this.tone('triangle', f, f * 1.01, 0.5, 0.06, i * 0.07));
        break;
      case 'secret':
        [523, 659, 784].forEach((f, i) => this.tone('sine', f, f, 0.45, 0.06, i * 0.08));
        break;
      case 'wall':
        this.noise(0.45, 0.4, 'lowpass', 1200, 120);
        break;
      case 'slam':
        this.tone('sine', 90, 35, 0.45, 0.2);
        this.noise(0.3, 0.35, 'lowpass', 600, 80);
        break;
      case 'roar':
        this.tone('sawtooth', 70, 55, 0.9, 0.09);
        this.noise(0.9, 0.18, 'bandpass', 400, 200);
        break;
      case 'death':
        this.tone('sawtooth', 300, 40, 0.9, 0.1);
        break;
      case 'menu':
        this.tone('square', 660, 660, 0.04, 0.03);
        break;
      case 'confirm':
        this.tone('triangle', 520, 780, 0.12, 0.06);
        break;
      case 'victory':
        [262, 330, 392, 523, 659].forEach((f, i) => this.tone('triangle', f, f, 0.9, 0.06, i * 0.14));
        break;
    }
  }

  /** Map simulation events to cues. */
  handle(e: GameEvent): void {
    switch (e.type) {
      case 'playerJump':
        return this.play('jump');
      case 'playerLand':
        return this.play('land');
      case 'playerAttack':
        return this.play('swing');
      case 'playerDash':
        return this.play('dash');
      case 'playerHurt':
        return this.play('hurt');
      case 'playerDied':
        return this.play('death');
      case 'hit':
        return this.play(e.killed && e.target !== 'projectile' ? 'kill' : e.target === 'projectile' ? 'burst' : 'hit');
      case 'enemyWindup':
      case 'bossWindup':
        return this.play('windup');
      case 'enemyShoot':
        return this.play('shoot');
      case 'projectileBurst':
        return this.play('burst');
      case 'checkpoint':
        return this.play('checkpoint');
      case 'abilityUnlocked':
        return this.play('ability');
      case 'secretFound':
        return this.play('secret');
      case 'wallBroken':
        return this.play('wall');
      case 'bossSlam':
      case 'bossWallImpact':
        return this.play('slam');
      case 'bossStart':
      case 'bossPhase':
        return this.play('roar');
      case 'bossDefeated':
        return this.play('kill');
      default:
        return;
    }
  }

  /** A very quiet two-oscillator cave drone for atmosphere. */
  startDrone(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.drone) return;
    const g = ctx.createGain();
    g.gain.value = 0.035;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300;
    const a = ctx.createOscillator();
    const b = ctx.createOscillator();
    a.type = 'sawtooth';
    b.type = 'sawtooth';
    a.frequency.value = 55;
    b.frequency.value = 55.4;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain).connect(lp.frequency);
    a.connect(lp);
    b.connect(lp);
    lp.connect(g).connect(this.master);
    a.start();
    b.start();
    lfo.start();
    this.drone = {
      stop: () => {
        a.stop();
        b.stop();
        lfo.stop();
        g.disconnect();
      },
    };
  }

  stopDrone(): void {
    this.drone?.stop();
    this.drone = null;
  }
}
