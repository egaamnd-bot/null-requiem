import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, getSettings, loadSettings, sanitizeSettings, updateSettings, type KeyValueStore } from '../src/state/settings';

function memStore(initial?: string): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set('null-requiem.settings.v1', initial);
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('settings', () => {
  beforeEach(() => loadSettings(memStore()));

  it('falls back to defaults for missing, corrupt or non-object storage', () => {
    expect(loadSettings(memStore())).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(memStore('{not json'))).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(memStore('42'))).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('clamps out-of-range values and rejects wrong types', () => {
    const s = sanitizeSettings({ musicVolume: 9, sfxVolume: -1, controlScale: 'big', controlOpacity: 0, screenShake: 'yes' });
    expect(s.musicVolume).toBe(1);
    expect(s.sfxVolume).toBe(0);
    expect(s.controlScale).toBe(DEFAULT_SETTINGS.controlScale);
    expect(s.controlOpacity).toBe(0.3);
    expect(s.screenShake).toBe(DEFAULT_SETTINGS.screenShake);
  });

  it('persists updates and reloads them', () => {
    const store = memStore();
    loadSettings(store);
    updateSettings({ controlScale: 1.15, reduceFlash: true });
    expect(getSettings().controlScale).toBe(1.15);
    expect(loadSettings(store).reduceFlash).toBe(true);
  });

  it('survives a storage that throws on write', () => {
    loadSettings({ getItem: () => null, setItem: () => { throw new Error('quota'); } });
    expect(() => updateSettings({ musicVolume: 0.1 })).not.toThrow();
    expect(getSettings().musicVolume).toBe(0.1);
  });
});
