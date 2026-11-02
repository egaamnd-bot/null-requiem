import { getSettings } from '../state/settings';
import { midiToHz, noteOfDegree, THEMES, type Theme } from './musicTheory';
import type { Sfx } from './Sfx';

/**
 * Procedural music: a low drone plus a slow arpeggio per theme, cross-faded when the theme changes. Entirely synthesised
 * (original, no files). Recorded tracks from the asset pipeline replace the same themes. Plays through Sfx's context so
 * browser autoplay unlock and mute behave identically.
 */
export class Music {
  private theme: Theme = 'silence';
  private gain: GainNode | null = null;
  private droneA: OscillatorNode | null = null;
  private droneB: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private nextStepTime = 0;
  private stepIndex = 0;
  private fading: Theme | null = null;

  constructor(private readonly sfx: Sfx) {
    sfx.onSettings = () => this.applyVolume();
  }

  get current(): Theme {
    return this.theme;
  }

  private level(a: { muted: boolean }): number {
    return a.muted ? 0 : getSettings().musicVolume;
  }

  applyVolume(): void {
    const a = this.sfx.audio;
    if (!a || !this.gain) return;
    this.gain.gain.setTargetAtTime(this.level(a), a.ctx.currentTime, 0.2);
  }

  setTheme(theme: Theme): void {
    if (theme === this.theme && !this.fading) return;
    if (theme === this.theme) return;
    this.theme = theme;
    this.fading = theme;
  }

  /** Call once per frame. Starts, switches and schedules the score. */
  update(): void {
    const a = this.sfx.audio;
    if (!a) return;
    const ctx = a.ctx;
    if (this.fading !== null) {
      this.rebuild(ctx, this.fading);
      this.fading = null;
    }
    if (!this.gain || this.theme === 'silence') return;
    const def = THEMES[this.theme];
    // Schedule a short window ahead so frame hiccups never create gaps.
    while (this.nextStepTime < ctx.currentTime + 0.3) {
      const degree = def.pattern[this.stepIndex % def.pattern.length] as number;
      if (this.nextStepTime < ctx.currentTime) this.nextStepTime = ctx.currentTime + 0.05;
      if (degree >= 0) this.note(ctx, midiToHz(noteOfDegree(def.root, def.scale, degree)), this.nextStepTime, def.step * 1.6, def.arpGain, def.wave);
      if (def.pulseEvery > 0 && this.stepIndex % def.pulseEvery === 0) this.note(ctx, midiToHz(def.root - 12), this.nextStepTime, def.step * 0.9, def.arpGain * 1.6, 'sine');
      this.nextStepTime += def.step;
      this.stepIndex++;
    }
  }

  private note(ctx: AudioContext, hz: number, at: number, dur: number, vol: number, wave: OscillatorType): void {
    if (!this.gain) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = wave;
    o.frequency.value = hz;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(this.gain);
    o.start(at);
    o.stop(at + dur + 0.05);
  }

  private teardown(ctx: AudioContext): void {
    const old = { gain: this.gain, a: this.droneA, b: this.droneB };
    if (old.gain) {
      old.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
      window.setTimeout(() => {
        try {
          old.a?.stop();
          old.b?.stop();
          old.gain?.disconnect();
        } catch {
          /* already stopped */
        }
      }, 1200);
    }
    this.gain = null;
    this.droneA = null;
    this.droneB = null;
  }

  private rebuild(ctx: AudioContext, theme: Theme): void {
    this.teardown(ctx);
    this.stepIndex = 0;
    this.nextStepTime = ctx.currentTime + 0.1;
    if (theme === 'silence') return;
    const def = THEMES[theme];
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(ctx.destination);
    const a = this.sfx.audio;
    out.gain.setTargetAtTime(a ? this.level(a) : 0.6, ctx.currentTime, 0.6);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = def.cutoff;
    const dg = ctx.createGain();
    dg.gain.value = def.droneGain;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o2.type = 'sawtooth';
    o1.frequency.value = midiToHz(def.root - 12);
    o2.frequency.value = midiToHz(def.root - 12) * 1.004;
    o1.connect(lp);
    o2.connect(lp);
    lp.connect(dg).connect(out);
    o1.start();
    o2.start();
    this.gain = out;
    this.filter = lp;
    this.droneA = o1;
    this.droneB = o2;
    void this.filter;
  }
}
