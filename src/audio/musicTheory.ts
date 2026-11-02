import type { RegionId } from '../world/types';

/**
 * Pure music logic (no Web Audio): which theme plays where, and the note maths for the procedural score.
 * Final recorded music replaces the synthesis per theme (asset ids audio_music_*).
 */

export type Theme = 'title' | 'rainline' | 'transit' | 'precinct' | 'undercity' | 'industrial' | 'cathedral' | 'boss' | 'finalBoss' | 'ending' | 'silence';

export function themeFor(region: RegionId | undefined, opts: { bossActive: boolean; finalBoss: boolean; inGame: boolean }): Theme {
  if (!opts.inGame) return 'title';
  if (opts.bossActive) return opts.finalBoss ? 'finalBoss' : 'boss';
  return region ?? 'rainline';
}

export interface ThemeDef {
  /** MIDI note of the drone root. */
  root: number;
  /** Semitone offsets of the scale used by the arpeggio. */
  scale: readonly number[];
  /** Seconds per step. */
  step: number;
  /** Arpeggio degrees, one per step (negative = rest). */
  pattern: readonly number[];
  wave: OscillatorType;
  arpGain: number;
  droneGain: number;
  /** Low-pass cutoff of the drone. */
  cutoff: number;
  /** Optional percussive pulse every n steps. */
  pulseEvery: number;
}

const MINOR = [0, 2, 3, 5, 7, 8, 10];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const WHOLE = [0, 2, 4, 6, 8, 10, 12];

export const THEMES: Readonly<Record<Exclude<Theme, 'silence'>, ThemeDef>> = {
  title: { root: 45, scale: MINOR, step: 0.5, pattern: [0, -1, 4, -1, 2, -1, 3, -1], wave: 'triangle', arpGain: 0.05, droneGain: 0.05, cutoff: 500, pulseEvery: 0 },
  rainline: { root: 43, scale: MINOR, step: 0.42, pattern: [0, -1, -1, 2, -1, 4, -1, -1], wave: 'sine', arpGain: 0.05, droneGain: 0.045, cutoff: 420, pulseEvery: 8 },
  transit: { root: 41, scale: DORIAN, step: 0.3, pattern: [0, 0, -1, 4, 0, -1, 3, -1], wave: 'sawtooth', arpGain: 0.03, droneGain: 0.05, cutoff: 600, pulseEvery: 4 },
  precinct: { root: 40, scale: PHRYGIAN, step: 0.36, pattern: [0, -1, 1, -1, -1, 0, -1, -1], wave: 'square', arpGain: 0.025, droneGain: 0.055, cutoff: 380, pulseEvery: 4 },
  undercity: { root: 48, scale: DORIAN, step: 0.34, pattern: [0, 2, 4, 2, 5, 4, 2, -1], wave: 'triangle', arpGain: 0.06, droneGain: 0.03, cutoff: 900, pulseEvery: 4 },
  industrial: { root: 38, scale: MINOR, step: 0.26, pattern: [0, -1, 0, -1, 3, -1, 0, 4], wave: 'sawtooth', arpGain: 0.03, droneGain: 0.06, cutoff: 520, pulseEvery: 2 },
  cathedral: { root: 36, scale: WHOLE, step: 0.6, pattern: [0, -1, 5, -1, 3, -1, 6, -1], wave: 'sine', arpGain: 0.06, droneGain: 0.06, cutoff: 700, pulseEvery: 0 },
  boss: { root: 38, scale: PHRYGIAN, step: 0.2, pattern: [0, 0, 1, 0, 3, 0, 1, 4], wave: 'sawtooth', arpGain: 0.04, droneGain: 0.06, cutoff: 700, pulseEvery: 2 },
  finalBoss: { root: 34, scale: WHOLE, step: 0.22, pattern: [0, 4, 0, 5, 0, 6, 3, 0], wave: 'square', arpGain: 0.035, droneGain: 0.07, cutoff: 900, pulseEvery: 2 },
  ending: { root: 45, scale: MINOR, step: 0.6, pattern: [0, 2, 4, 6, 4, 2, 0, -1], wave: 'triangle', arpGain: 0.06, droneGain: 0.04, cutoff: 800, pulseEvery: 0 },
};

export const midiToHz = (m: number): number => 440 * 2 ** ((m - 69) / 12);

/** MIDI note of a scale degree (degrees beyond the scale climb octaves). */
export function noteOfDegree(root: number, scale: readonly number[], degree: number): number {
  const n = scale.length;
  const oct = Math.floor(degree / n);
  const idx = ((degree % n) + n) % n;
  return root + 12 + (scale[idx] as number) + oct * 12;
}
