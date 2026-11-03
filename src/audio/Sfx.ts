import type { GameEvent } from '../core/events';
import { getSettings } from '../state/settings';
import type { AudioBank } from './AudioBank';
import { ENTRY_FOR_CUE, type AudioEntry } from './catalog';
import { dbToGain, pitchRate } from './files';

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
  | 'victory'
  | 'backtrace'
  | 'switch'
  | 'gate'
  | 'clang'
  | 'coin'
  | 'plate'
  | 'door'
  | 'quest'
  | 'blink'
  | 'telegraph'
  | 'airjump'
  | 'item'
  | 'upgrade'
  | 'record'
  | 'rewindSelf'
  | 'talk'
  // Recorded-only cues (no procedural sound): silent until their file is delivered. See src/audio/catalog.ts `hooked`.
  | 'footstep'
  | 'arrival'
  | 'btReady'
  | 'btCooldown'
  | 'btMotif'
  | 'houndLunge'
  | 'droneCharge'
  | 'heavyHit'
  | 'doorClose'
  | 'relayActivate'
  | 'integrity'
  | 'gameOver'
  | 'uiBack'
  | 'uiPause'
  | 'uiError'
  | 'uiTab'
  | 'uiSlider'
  | 'uiSave'
  | 'uiContinue';

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private drone: { stop: () => void } | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  muted = false;
  /** Recorded sounds (optional). When a cue has a decoded file it plays instead of the procedural sound. */
  bank: AudioBank | null = null;
  private readonly running = new Map<string, AudioBufferSourceNode[]>();
  /** Stingers follow the MUSIC volume, not the effects volume. */
  private stingerBus: GainNode | null = null;
  /** Called once, right after the AudioContext exists (the audio bank starts loading then). */
  onContext: ((ctx: AudioContext) => void) | null = null;

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
      this.master.gain.value = this.level();
      this.master.connect(this.ctx.destination);
      this.stingerBus = this.ctx.createGain();
      this.stingerBus.gain.value = this.stingerLevel();
      this.stingerBus.connect(this.ctx.destination);
      this.onContext?.(this.ctx);
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
    this.applySettings();
    return this.muted;
  }

  private level(): number {
    return this.muted ? 0 : 0.35 * getSettings().sfxVolume;
  }

  private stingerLevel(): number {
    return this.muted ? 0 : 0.5 * getSettings().musicVolume;
  }

  /** Re-read player settings (volume) and apply them. */
  applySettings(): void {
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.level(), this.ctx.currentTime, 0.05);
    if (this.stingerBus && this.ctx) this.stingerBus.gain.setTargetAtTime(this.stingerLevel(), this.ctx.currentTime, 0.05);
    this.onSettings?.();
  }

  /** Hook so the music engine can follow settings changes. */
  onSettings: (() => void) | null = null;

  /** Shared audio context (the music engine plays through the same device). */
  get audio(): { ctx: AudioContext; muted: boolean } | null {
    return this.ctx ? { ctx: this.ctx, muted: this.muted } : null;
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

  /** Play a recorded version of an entry. Returns true when a file exists for it (even if a voice limit skipped it), so the procedural fallback never doubles it. */
  private playFile(entry: AudioEntry, delay = 0): boolean {
    const ctx = this.ctx;
    const bank = this.bank;
    if (!ctx || !bank || !this.master) return false;
    const s = bank.pick(entry);
    if (!s) return false;
    const rate = pitchRate(entry.pitchVar, Math.random());
    const verdict = bank.limiter.request(entry.id, ctx.currentTime, entry.maxVoices, entry.retrigger, s.buffer.duration / rate);
    if (verdict === 'skip') return true;
    if (verdict === 'restart') {
      for (const old of this.running.get(entry.id) ?? []) {
        try {
          old.stop();
        } catch {
          /* already stopped */
        }
      }
      this.running.set(entry.id, []);
    }
    const src = ctx.createBufferSource();
    src.buffer = s.buffer;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = dbToGain(entry.gainDb + (s.file.gainDb ?? 0));
    src.connect(g).connect(entry.kind === 'stinger' && this.stingerBus ? this.stingerBus : this.master);
    const list = this.running.get(entry.id) ?? [];
    list.push(src);
    this.running.set(entry.id, list);
    src.onended = () => {
      const l = this.running.get(entry.id);
      if (l) this.running.set(entry.id, l.filter((x) => x !== src));
    };
    src.start(ctx.currentTime + delay);
    return true;
  }

  /** Play the recorded sound of a cue if (and only if) a file exists. Returns whether it did. */
  tryCue(cue: Cue, delay = 0): boolean {
    if (!this.ctx || this.muted) return false;
    const entry = ENTRY_FOR_CUE.get(cue);
    return !!entry && this.playFile(entry, delay);
  }

  /** Recorded version if delivered, otherwise the given existing cue (keeps today's sound until the file arrives). */
  playOr(cue: Cue, fallback: Cue): void {
    if (!this.tryCue(cue)) this.play(fallback);
  }

  play(cue: Cue): void {
    if (!this.ctx || this.muted) return;
    const entry = ENTRY_FOR_CUE.get(cue);
    if (entry && this.playFile(entry)) return;
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
      case 'backtrace':
        // A reversed swell: rises then snaps, like tape rewinding.
        this.tone('sawtooth', 220, 1400, 0.22, 0.05);
        this.noise(0.22, 0.25, 'bandpass', 600, 5000);
        this.tone('sine', 880, 220, 0.18, 0.06, 0.22);
        break;
      case 'switch':
        this.tone('square', 1200, 1200, 0.05, 0.04);
        this.tone('square', 1600, 1600, 0.06, 0.04, 0.06);
        break;
      case 'clang':
        this.noise(0.12, 0.3, 'bandpass', 3200, 1800);
        this.tone('square', 1500, 700, 0.1, 0.12);
        break;
      case 'coin':
        this.tone('square', 880, 1320, 0.06, 0.1);
        this.tone('square', 1320, 1760, 0.08, 0.1, 0.05);
        break;
      case 'plate':
        this.tone('triangle', 220, 330, 0.12, 0.18);
        this.tone('sine', 660, 660, 0.18, 0.08, 0.06);
        break;
      case 'door':
        this.noise(0.28, 0.2, 'lowpass', 900, 200);
        this.tone('sawtooth', 120, 70, 0.28, 0.1);
        break;
      case 'quest':
        this.tone('triangle', 523, 523, 0.1, 0.14);
        this.tone('triangle', 659, 659, 0.1, 0.14, 0.09);
        this.tone('triangle', 784, 784, 0.18, 0.14, 0.18);
        break;
      case 'blink':
        this.noise(0.14, 0.18, 'highpass', 4000, 800);
        this.tone('sine', 1400, 300, 0.14, 0.1);
        break;
      case 'telegraph':
        this.tone('sawtooth', 180, 420, 0.35, 0.09);
        break;
      case 'airjump':
        this.tone('square', 420, 900, 0.12, 0.12);
        this.noise(0.1, 0.1, 'highpass', 3000, 6000);
        break;
      case 'item':
        this.tone('triangle', 660, 990, 0.1, 0.14);
        break;
      case 'upgrade':
        for (let i = 0; i < 4; i++) this.tone('triangle', 440 * 2 ** (i / 3), 440 * 2 ** (i / 3), 0.14, 0.12, i * 0.07);
        break;
      case 'record':
        this.tone('sine', 880, 440, 0.4, 0.1);
        this.tone('sine', 1320, 660, 0.4, 0.06, 0.1);
        break;
      case 'rewindSelf':
        this.tone('sawtooth', 900, 120, 0.5, 0.12);
        this.noise(0.4, 0.12, 'bandpass', 2400, 300);
        break;
      case 'talk':
        this.tone('square', 300 + Math.random() * 90, 300 + Math.random() * 90, 0.04, 0.05);
        break;
      case 'gate':
        this.noise(0.12, 0.15, 'highpass', 3000, 1500);
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
        return this.play(e.air ? 'airjump' : 'jump');
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
        return this.play(e.target === 'switch' ? 'switch' : e.killed && e.target !== 'projectile' ? 'kill' : e.target === 'projectile' ? 'burst' : 'hit');
      case 'enemyWindup':
        // Per-enemy recorded wind-ups when delivered; otherwise the shared procedural one.
        if (e.kind === 'scrapHound' && this.tryCue('houndLunge')) return;
        if (e.kind === 'watcherDrone' && this.tryCue('droneCharge')) return;
        return this.play('windup');
      case 'bossWindup':
        return this.play('windup');
      case 'enemyShoot':
        return this.play('shoot');
      case 'projectileBurst':
        return this.play('burst');
      case 'checkpoint':
        this.play('checkpoint');
        if (e.firstTime) this.tryCue('relayActivate');
        this.tryCue('uiSave');
        return;
      case 'backtrace':
        this.play('backtrace');
        this.tryCue('arrival', 0.12);
        this.tryCue('btCooldown');
        this.tryCue('btMotif');
        return;
      case 'switchHit':
        return this.play('switch');
      case 'timedGate':
        return this.play('gate');
      case 'abilityUnlocked':
        return this.play('ability');
      case 'secretFound':
        // Integrity cells are the only secret pickup: a delivered dedicated sound replaces the generic one.
        if (this.tryCue('integrity')) return;
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
      case 'enemyBlocked':
        return this.play('clang');
      case 'scrapGained':
        return this.play('coin');
      case 'plateChanged':
        return this.play('plate');
      case 'doorChanged':
        if (!e.open && this.tryCue('doorClose')) return;
        return this.play('door');
      case 'nodePowered':
        return this.play('plate');
      case 'doorLocked':
        return this.play('clang');
      case 'questUpdated':
        return this.play(e.status === 'progress' ? 'item' : 'quest');
      case 'itemGained':
        return this.play('item');
      case 'upgradeGained':
        return this.play('upgrade');
      case 'loreFound':
        return this.play('record');
      case 'bossTelegraph':
        return this.play('telegraph');
      case 'bossStaggered':
        this.tryCue('heavyHit');
        return this.play('clang');
      case 'glitchStrike':
        this.tryCue('heavyHit');
        return;
      case 'echoRewind':
        return this.play('rewindSelf');
      case 'npcTalk':
        return this.play('talk');
      case 'dialogueOpened':
        return this.play('menu');
      case 'gameCompleted':
        return this.play('victory');
      default:
        return;
    }
  }

  /** A very quiet two-oscillator city hum for atmosphere. */
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
