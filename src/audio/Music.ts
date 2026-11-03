import { getSettings } from '../state/settings';
import type { AudioBank } from './AudioBank';
import { AUDIO_CATALOG, ENTRY_FOR_THEME } from './catalog';
import { dbToGain, loopRegion } from './files';
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
  /** Recorded music (optional). A theme with a decoded file plays that instead of the procedural score. */
  bank: AudioBank | null = null;
  private fileSrc: AudioBufferSourceNode | null = null;
  private fileThemeId: string | null = null;
  private fileStartedAt = 0;
  private fileLoopLen = 0;
  /** Audio-only combat intensity 0..1 (see triggers.ts CombatTracker). Drives the combat stem when one is delivered. */
  private combat = 0;
  private combatSrc: AudioBufferSourceNode | null = null;
  private combatGain: GainNode | null = null;
  private combatId: string | null = null;

  constructor(private readonly sfx: Sfx) {
    sfx.onSettings = () => this.applyVolume();
  }

  get current(): Theme {
    return this.theme;
  }

  /** Set every frame by the scene from the CombatTracker. No effect without a delivered combat stem. */
  setCombat(intensity: number): void {
    this.combat = Math.max(0, Math.min(1, intensity));
  }

  /** True while a recorded track (not the procedural score) is playing. */
  get playingFile(): boolean {
    return this.fileSrc !== null;
  }

  /** The manifest arrived after the theme started: if this theme has a recorded track, switch (procedural plays until it is decoded). */
  notifyManifest(): void {
    const e = ENTRY_FOR_THEME.get(this.theme);
    if (e && this.bank?.listed(e.id) && !this.fileSrc) this.fading = this.theme;
  }

  /** The bank finished decoding `id`: if it is the current theme's track, switch to it. */
  notifyReady(id: string): void {
    const e = ENTRY_FOR_THEME.get(this.theme);
    if (e && e.id === id && !this.fileSrc) this.fading = this.theme;
  }

  private level(a: { muted: boolean }): number {
    return a.muted ? 0 : getSettings().musicVolume;
  }

  applyVolume(): void {
    const a = this.sfx.audio;
    if (!a || !this.gain) return;
    this.gain.gain.setTargetAtTime(this.level(a) * this.fileTrim(), a.ctx.currentTime, 0.2);
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
    if (this.fileSrc) this.updateCombatLayer(ctx);
    if (!this.gain || this.theme === 'silence' || this.fileSrc) return;
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

  /** Combat stem: starts (phase-aligned with the exploration loop) the first time combat is requested and its file is decoded. */
  private updateCombatLayer(ctx: AudioContext): void {
    const base = this.fileThemeId;
    if (!base || !this.bank || !this.gain) return;
    const layer = AUDIO_CATALOG.find((e) => e.layerOf === base);
    if (!layer) return;
    if (!this.combatSrc) {
      if (this.combat <= 0.01 || !this.bank.listed(layer.id)) return;
      const s = this.bank.pick(layer, 0);
      if (!s) {
        void this.bank.ensure(layer.id);
        return;
      }
      const src = ctx.createBufferSource();
      src.buffer = s.buffer;
      src.loop = true;
      const r = loopRegion(s.file, s.buffer.duration);
      src.loopStart = r.start;
      src.loopEnd = r.end;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(g).connect(this.gain);
      // Same length as the exploration loop = a stem: join at the same phase so the two stay in sync.
      const sameLength = Math.abs(s.buffer.duration - this.fileLoopLen) < 0.02;
      const phase = sameLength && this.fileLoopLen > 0 ? (ctx.currentTime - this.fileStartedAt) % this.fileLoopLen : 0;
      src.start(0, r.start + (phase % Math.max(0.01, r.end - r.start)));
      this.combatSrc = src;
      this.combatGain = g;
      this.combatId = layer.id;
    }
    if (this.combatGain) this.combatGain.gain.setTargetAtTime(this.combat * dbToGain(layer.gainDb), ctx.currentTime, 0.4);
  }

  private fileTrim(): number {
    const e = ENTRY_FOR_THEME.get(this.theme);
    const s = e && this.bank?.pick(e, 0);
    return e && s ? dbToGain(e.gainDb + (s.file.gainDb ?? 0)) : 1;
  }

  private teardown(ctx: AudioContext): void {
    const old = { gain: this.gain, a: this.droneA, b: this.droneB, f: this.fileSrc };
    if (this.fileThemeId && this.fileSrc) this.bank?.release(this.fileThemeId);
    if (this.combatId) this.bank?.release(this.combatId);
    const oldCombat = this.combatSrc;
    this.combatSrc = null;
    this.combatGain = null;
    this.combatId = null;
    this.fileSrc = null;
    this.fileThemeId = null;
    if (old.gain) {
      old.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
      window.setTimeout(() => {
        try {
          old.a?.stop();
          old.b?.stop();
          old.f?.stop();
          oldCombat?.stop();
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
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(ctx.destination);
    const a = this.sfx.audio;
    // A recorded track replaces the procedural score when it is decoded; otherwise request it and play the score meanwhile.
    const entry = ENTRY_FOR_THEME.get(theme);
    if (entry && this.bank?.listed(entry.id)) {
      const s = this.bank.pick(entry, 0);
      if (s) {
        const src = ctx.createBufferSource();
        src.buffer = s.buffer;
        src.loop = true;
        const r = loopRegion(s.file, s.buffer.duration);
        src.loopStart = r.start;
        src.loopEnd = r.end;
        src.connect(out);
        src.start();
        out.gain.setTargetAtTime((a ? this.level(a) : 0.6) * dbToGain(entry.gainDb + (s.file.gainDb ?? 0)), ctx.currentTime, 0.6);
        this.gain = out;
        this.fileSrc = src;
        this.fileThemeId = entry.id;
        this.fileStartedAt = ctx.currentTime;
        this.fileLoopLen = r.end - r.start;
        return;
      }
      void this.bank.ensure(entry.id);
    }
    const def = THEMES[theme];
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
