import { getSettings } from '../state/settings';
import type { AudioBank } from './AudioBank';
import { AUDIO_CATALOG, type AudioEntry } from './catalog';
import { dbToGain, loopRegion } from './files';
import type { Sfx } from './Sfx';

type Region = NonNullable<AudioEntry['region']>;
const BY_REGION: ReadonlyMap<string, AudioEntry> = new Map(AUDIO_CATALOG.filter((e) => e.kind === 'ambience' && e.region).map((e) => [e.region as string, e]));
/** Quiet looped layers per region (catalog `layerIn`), played under the bed once decoded. */
const LAYERS_BY_REGION: ReadonlyMap<string, readonly AudioEntry[]> = new Map(
  ['rainline', 'transit', 'precinct'].map((r) => [r, AUDIO_CATALOG.filter((e) => e.kind === 'ambience' && e.layerIn?.includes(r as never))]),
);

interface LayerVoice {
  entry: AudioEntry;
  src: AudioBufferSourceNode;
  gain: GainNode;
}

/**
 * Region ambience bed (rain, hum, distant traffic): a recorded loop on its own channel under the music, cross-faded when the
 * region changes. There is NO procedural fallback — without a delivered file the game is exactly as quiet as before.
 * Follows the music volume setting (and mute).
 */
export class Ambience {
  bank: AudioBank | null = null;
  private region: string | null = null;
  private entry: AudioEntry | null = null;
  private src: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private wanted: string | null = null;
  private layers: LayerVoice[] = [];

  constructor(private readonly sfx: Sfx) {}

  /** Which region's bed should play (null = none: title, silence). Safe to call every frame. */
  setRegion(region: Region | string | null): void {
    if (region === this.wanted) return;
    this.wanted = region;
  }

  notifyReady(id: string): void {
    if (this.entry === null && this.wanted && BY_REGION.get(this.wanted)?.id === id) this.region = null; // force a rebuild on the next update
  }

  applyVolume(): void {
    const a = this.sfx.audio;
    if (!a || !this.gain || !this.entry) return;
    this.gain.gain.setTargetAtTime(a.muted ? 0 : getSettings().musicVolume * dbToGain(this.entry.gainDb), a.ctx.currentTime, 0.3);
    for (const l of this.layers) l.gain.gain.setTargetAtTime(a.muted ? 0 : getSettings().musicVolume * dbToGain(l.entry.gainDb), a.ctx.currentTime, 0.3);
  }

  /** Call once per frame. */
  update(): void {
    const a = this.sfx.audio;
    this.updateLayers();
    if (!a || !this.bank || this.region === this.wanted) return;
    if (!this.bank.manifestLoaded) return; // wait for the manifest before deciding there is nothing to play
    const entry = this.wanted ? (BY_REGION.get(this.wanted) ?? null) : null;
    if (entry && this.bank.listed(entry.id) && !this.bank.isReady(entry.id)) {
      void this.bank.ensure(entry.id); // decode first; retried every frame until ready (no fade-out of the old bed meanwhile)
      return;
    }
    this.stop(a.ctx);
    this.region = this.wanted;
    const s = entry && this.bank.pick(entry, 0);
    if (!entry || !s) return;
    const ctx = a.ctx;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(ctx.destination);
    const src = ctx.createBufferSource();
    src.buffer = s.buffer;
    src.loop = true;
    const r = loopRegion(s.file, s.buffer.duration);
    src.loopStart = r.start;
    src.loopEnd = r.end;
    src.connect(out);
    src.start();
    out.gain.setTargetAtTime(a.muted ? 0 : getSettings().musicVolume * dbToGain(entry.gainDb + (s.file.gainDb ?? 0)), ctx.currentTime, 0.8);
    this.src = src;
    this.gain = out;
    this.entry = entry;
  }

  /** Start the region's layers once the bed is established and each layer is decoded; they are stopped in `stop`. */
  private updateLayers(): void {
    const a = this.sfx.audio;
    if (!a || !this.bank || !this.bank.manifestLoaded || this.region === null || this.region !== this.wanted || !this.entry) return;
    for (const entry of LAYERS_BY_REGION.get(this.region) ?? []) {
      if (this.layers.some((l) => l.entry.id === entry.id) || !this.bank.listed(entry.id)) continue;
      if (!this.bank.isReady(entry.id)) {
        void this.bank.ensure(entry.id);
        continue;
      }
      const s = this.bank.pick(entry, 0);
      if (!s) continue;
      const ctx = a.ctx;
      const out = ctx.createGain();
      out.gain.value = 0;
      out.connect(ctx.destination);
      const src = ctx.createBufferSource();
      src.buffer = s.buffer;
      src.loop = true;
      const r = loopRegion(s.file, s.buffer.duration);
      src.loopStart = r.start;
      src.loopEnd = r.end;
      src.connect(out);
      src.start();
      out.gain.setTargetAtTime(a.muted ? 0 : getSettings().musicVolume * dbToGain(entry.gainDb + (s.file.gainDb ?? 0)), ctx.currentTime, 1.2);
      this.layers.push({ entry, src, gain: out });
    }
  }

  private stopLayers(ctx: AudioContext): void {
    const old = this.layers;
    this.layers = [];
    for (const l of old) {
      l.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      this.bank?.release(l.entry.id);
    }
    window.setTimeout(() => {
      for (const l of old) {
        try {
          l.src.stop();
          l.gain.disconnect();
        } catch {
          /* already stopped */
        }
      }
    }, 1600);
  }

  private stop(ctx: AudioContext): void {
    this.stopLayers(ctx);
    const { src, gain, entry } = this;
    if (gain) gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
    if (entry) this.bank?.release(entry.id);
    window.setTimeout(() => {
      try {
        src?.stop();
        gain?.disconnect();
      } catch {
        /* already stopped */
      }
    }, 1600);
    this.src = null;
    this.gain = null;
    this.entry = null;
  }
}
