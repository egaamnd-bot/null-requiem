/**
 * Pure helpers of the audio runtime (no Web Audio, no DOM): manifest parsing, variation choice, pitch, gain, voice limiting.
 * Unit-tested in Node. The browser parts live in AudioBank.ts / Sfx.ts / Music.ts.
 */
import { AUDIO_BY_ID, type Retrigger } from './catalog';

/** `public/audio/manifest.json`, written by `tools/audio/build.ts` (never by hand). */
export interface AudioFile {
  /** Path relative to `public/audio/<dir>/`. */
  file: string;
  /** Loop region in seconds (music/ambience). Absent = the whole file loops. */
  loopStart?: number;
  loopEnd?: number;
  gainDb?: number;
  durationSeconds?: number;
}
export interface AudioManifest {
  version: 1;
  sounds: Record<string, { files: AudioFile[] }>;
}

const FILE_RE = /^[\w./-]+\.(ogg|wav)$/i;

/** Tolerant parser: unknown ids, bad paths and garbage values are dropped, never thrown. */
export function parseAudioManifest(raw: unknown): AudioManifest {
  const out: AudioManifest = { version: 1, sounds: {} };
  const sounds = (raw as { sounds?: unknown } | null)?.sounds;
  if (!sounds || typeof sounds !== 'object') return out;
  for (const [id, v] of Object.entries(sounds as Record<string, unknown>)) {
    if (!AUDIO_BY_ID.has(id)) continue;
    const list = (v as { files?: unknown })?.files;
    if (!Array.isArray(list)) continue;
    const files: AudioFile[] = [];
    for (const f of list) {
      const file = (f as { file?: unknown })?.file;
      if (typeof file !== 'string' || !FILE_RE.test(file) || file.includes('..')) continue;
      const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : undefined);
      const loopStart = num((f as { loopStart?: unknown }).loopStart);
      const loopEnd = num((f as { loopEnd?: unknown }).loopEnd);
      const gainDb = num((f as { gainDb?: unknown }).gainDb);
      const durationSeconds = num((f as { durationSeconds?: unknown }).durationSeconds);
      files.push({
        file,
        ...(loopStart !== undefined && loopStart >= 0 ? { loopStart } : {}),
        ...(loopEnd !== undefined && loopEnd > (loopStart ?? 0) ? { loopEnd } : {}),
        ...(gainDb !== undefined ? { gainDb: Math.min(0, Math.max(-30, gainDb)) } : {}),
        ...(durationSeconds !== undefined ? { durationSeconds } : {}),
      });
    }
    if (files.length) out.sounds[id] = { files };
  }
  return out;
}

export const dbToGain = (db: number): number => Math.pow(10, db / 20);

/** Playback-rate multiplier for a random pitch offset within ±`semitones`. `r` in [0,1). */
export function pitchRate(semitones: number, r: number): number {
  return semitones <= 0 ? 1 : Math.pow(2, ((r * 2 - 1) * semitones) / 12);
}

/** Pick a variation index, never repeating `last` when there is a choice. */
export function pickVariation(count: number, last: number, r: number): number {
  if (count <= 1) return 0;
  if (last < 0 || last >= count) return Math.min(count - 1, Math.floor(r * count));
  const i = Math.floor(r * (count - 1));
  return i >= last ? i + 1 : i;
}

/**
 * Voice bookkeeping per sound id. `request` decides whether a new instance may start: `overlap` allows up to `maxVoices`
 * at once (the oldest is NOT cut: extra requests are skipped), `restart` replaces the running instance, `ignore` skips while one plays.
 */
export class VoiceLimiter {
  private readonly ends = new Map<string, number[]>();

  request(id: string, now: number, maxVoices: number, mode: Retrigger, durationSeconds: number): 'play' | 'skip' | 'restart' {
    const live = (this.ends.get(id) ?? []).filter((t) => t > now);
    let verdict: 'play' | 'skip' | 'restart' = 'play';
    if (live.length > 0 && mode === 'ignore') verdict = 'skip';
    else if (mode === 'restart' && live.length > 0) verdict = 'restart';
    else if (live.length >= maxVoices) verdict = 'skip';
    if (verdict === 'skip') {
      this.ends.set(id, live);
      return verdict;
    }
    const next = verdict === 'restart' ? [] : live;
    next.push(now + durationSeconds);
    this.ends.set(id, next);
    return verdict;
  }

  reset(): void {
    this.ends.clear();
  }
}

/** Where a decoded buffer should loop: the sidecar region clamped into the buffer, or the whole buffer. */
export function loopRegion(file: AudioFile, bufferSeconds: number): { start: number; end: number } {
  const start = Math.min(Math.max(0, file.loopStart ?? 0), Math.max(0, bufferSeconds - 0.01));
  const end = Math.min(bufferSeconds, file.loopEnd ?? bufferSeconds);
  return end > start ? { start, end } : { start: 0, end: bufferSeconds };
}
