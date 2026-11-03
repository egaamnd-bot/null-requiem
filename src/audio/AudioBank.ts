import { AUDIO_BY_ID, type AudioEntry } from './catalog';
import { parseAudioManifest, pickVariation, VoiceLimiter, type AudioFile, type AudioManifest } from './files';

export interface DecodedSound {
  buffer: AudioBuffer;
  file: AudioFile;
}

/**
 * Optional recorded audio. Reads `public/audio/manifest.json` (written by tools/audio/build.ts), decodes files with the shared
 * AudioContext on demand and hands buffers to Sfx / Music / Ambience. EVERYTHING is optional: a missing manifest, a missing file
 * or a file the device cannot decode simply means "not available" and the procedural sound plays instead. Nothing here blocks input:
 * all fetching/decoding is asynchronous and SFX are decoded before first use, never at the moment of use.
 */
export class AudioBank {
  private ctx: AudioContext | null = null;
  private manifest: AudioManifest | null = null;
  private readonly ready = new Map<string, DecodedSound[]>();
  private readonly pending = new Map<string, Promise<void>>();
  private readonly failed = new Set<string>();
  private readonly lastVariation = new Map<string, number>();
  readonly limiter = new VoiceLimiter();
  /** Notified when a sound finishes decoding (Music uses it to switch from the procedural theme to the file). */
  onReady: ((id: string) => void) | null = null;
  /** True once the manifest request finished (successfully or not). */
  manifestLoaded = false;
  /** Notified when the manifest finished loading so music/ambience can re-evaluate what is available. */
  onManifest: (() => void) | null = null;

  constructor(private readonly baseUrl: string = typeof import.meta !== 'undefined' ? (import.meta.env?.BASE_URL ?? '/') : '/') {}

  /** Called once the AudioContext exists (first user gesture). */
  attach(ctx: AudioContext): void {
    if (this.ctx) return;
    this.ctx = ctx;
    void this.loadManifest();
  }

  private async loadManifest(): Promise<void> {
    try {
      await this.fetchManifest();
    } finally {
      this.manifestLoaded = true;
      this.onManifest?.();
    }
  }

  private async fetchManifest(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}audio/manifest.json`, { cache: 'no-cache' });
      if (!res.ok) return;
      this.manifest = parseAudioManifest(await res.json());
    } catch {
      return; // no manifest: procedural audio only
    }
    // Short sounds are decoded up front so the first play is instant; long loops are decoded when requested.
    for (const id of Object.keys(this.manifest.sounds)) {
      const e = AUDIO_BY_ID.get(id);
      if (e && (e.kind === 'sfx' || e.kind === 'ui' || e.kind === 'stinger')) void this.ensure(id);
    }
  }

  /** Is a recorded version of this sound listed in the manifest (decoded or not)? */
  listed(id: string): boolean {
    return !!this.manifest?.sounds[id];
  }

  isReady(id: string): boolean {
    return (this.ready.get(id)?.length ?? 0) > 0;
  }

  /** Start decoding (idempotent). */
  ensure(id: string): Promise<void> {
    const ctx = this.ctx;
    const listed = this.manifest?.sounds[id];
    if (!ctx || !listed || this.failed.has(id)) return Promise.resolve();
    if (this.ready.has(id)) return Promise.resolve();
    const running = this.pending.get(id);
    if (running) return running;
    const entry = AUDIO_BY_ID.get(id);
    if (!entry) return Promise.resolve();
    const job = (async () => {
      const out: DecodedSound[] = [];
      for (const file of listed.files) {
        try {
          const res = await fetch(`${this.baseUrl}audio/${entry.dir}/${file.file}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
          out.push({ buffer, file });
        } catch (err) {
          console.warn(`[audio] ${id}/${file.file} unavailable, using the procedural sound`, err instanceof Error ? err.message : err);
        }
      }
      if (out.length) {
        this.ready.set(id, out);
        this.onReady?.(id);
      } else this.failed.add(id);
      this.pending.delete(id);
    })();
    this.pending.set(id, job);
    return job;
  }

  /** Bytes currently held as decoded PCM (float32 per channel), for the Android memory review (never read by game code). */
  decodedBytes(): { total: number; byId: Record<string, number> } {
    const byId: Record<string, number> = {};
    let total = 0;
    for (const [id, list] of this.ready) {
      const n = list.reduce((acc, d) => acc + d.buffer.length * d.buffer.numberOfChannels * 4, 0);
      byId[id] = n;
      total += n;
    }
    return { total, byId };
  }

  /** Drop decoded buffers of a long sound (music/ambience) to free memory (a 90 s stereo loop is ≈ 31 MB decoded). */
  release(id: string): void {
    this.ready.delete(id);
    this.pending.delete(id);
  }

  /** A decoded variation, never the same as the previous call when several exist. */
  pick(entry: AudioEntry, r: number = Math.random()): DecodedSound | null {
    const list = this.ready.get(entry.id);
    if (!list?.length) return null;
    const i = pickVariation(list.length, this.lastVariation.get(entry.id) ?? -1, r);
    this.lastVariation.set(entry.id, i);
    return list[i] ?? list[0]!;
  }
}
