/**
 * Player settings: validated, versioned, and tolerant of garbage in storage.
 * Pure module (storage is injected) so it is unit-testable in Node.
 */

export interface Settings {
  version: 1;
  musicVolume: number;
  sfxVolume: number;
  /** Touch control size multiplier. */
  controlScale: number;
  /** Touch control opacity. */
  controlOpacity: number;
  screenShake: boolean;
  /** Reduce full-screen flashes (photosensitivity). */
  reduceFlash: boolean;
  showFps: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  controlScale: 1,
  controlOpacity: 0.85,
  screenShake: true,
  reduceFlash: false,
  showFps: false,
};

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = 'null-requiem.settings.v1';

const clamp = (v: unknown, lo: number, hi: number, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

/** Coerce arbitrary parsed JSON into a valid Settings object (never throws). */
export function sanitizeSettings(raw: unknown): Settings {
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  return {
    version: 1,
    musicVolume: clamp(o.musicVolume, 0, 1, d.musicVolume),
    sfxVolume: clamp(o.sfxVolume, 0, 1, d.sfxVolume),
    controlScale: clamp(o.controlScale, 0.8, 1.2, d.controlScale),
    controlOpacity: clamp(o.controlOpacity, 0.3, 1, d.controlOpacity),
    screenShake: bool(o.screenShake, d.screenShake),
    reduceFlash: bool(o.reduceFlash, d.reduceFlash),
    showFps: bool(o.showFps, d.showFps),
  };
}

let current: Settings = { ...DEFAULT_SETTINGS };
let store: KeyValueStore | null = null;

function defaultStore(): KeyValueStore | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadSettings(s: KeyValueStore | null = defaultStore()): Settings {
  store = s;
  try {
    const text = s?.getItem(KEY);
    current = sanitizeSettings(text ? JSON.parse(text) : null);
  } catch {
    current = { ...DEFAULT_SETTINGS };
  }
  return current;
}

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Omit<Settings, 'version'>>): Settings {
  current = sanitizeSettings({ ...current, ...patch });
  try {
    store?.setItem(KEY, JSON.stringify(current));
  } catch {
    /* storage unavailable or full: settings still apply for this session */
  }
  return current;
}
