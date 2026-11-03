import { describe, expect, it } from 'vitest';
import { dbToGain, loopRegion, parseAudioManifest, pickVariation, pitchRate, VoiceLimiter } from '../src/audio/files';

describe('audio manifest parsing', () => {
  it('keeps valid entries and drops unknown ids, bad paths and garbage numbers', () => {
    const m = parseAudioManifest({
      sounds: {
        sfx_player_jump: { files: [{ file: 'sfx_player_jump_01.ogg', gainDb: -3 }, { file: '../evil.ogg' }, { file: 'x.exe' }, { file: 'sfx_player_jump_02.ogg', gainDb: 'loud' }] },
        not_a_sound: { files: [{ file: 'a.ogg' }] },
        music_title_theme: { files: [{ file: 'music_title_theme.ogg', loopStart: 1.5, loopEnd: 60, gainDb: -99 }] },
        sfx_player_dash: 'nope',
      },
    });
    expect(Object.keys(m.sounds).sort()).toEqual(['music_title_theme', 'sfx_player_jump']);
    expect(m.sounds.sfx_player_jump!.files.map((f) => f.file)).toEqual(['sfx_player_jump_01.ogg', 'sfx_player_jump_02.ogg']);
    expect(m.sounds.music_title_theme!.files[0]).toMatchObject({ loopStart: 1.5, loopEnd: 60, gainDb: -30 });
  });
  it('never throws on garbage', () => {
    for (const g of [null, undefined, 5, 'x', [], { sounds: 3 }, { sounds: { sfx_player_jump: { files: 7 } } }]) expect(parseAudioManifest(g).sounds).toEqual({});
  });
});

describe('variation, pitch, gain', () => {
  it('never repeats the previous variation when there is a choice', () => {
    for (let last = 0; last < 4; last++) for (let k = 0; k < 100; k++) expect(pickVariation(4, last, k / 100)).not.toBe(last);
    expect(pickVariation(1, 0, 0.9)).toBe(0);
    expect(pickVariation(3, -1, 0.99)).toBe(2); // first play: any variation
    expect(pickVariation(3, -1, 0)).toBe(0);
    const seen = new Set(Array.from({ length: 100 }, (_, k) => pickVariation(4, 1, k / 100)));
    expect([...seen].sort()).toEqual([0, 2, 3]);
  });
  it('pitch stays within ±semitones and is neutral at 0', () => {
    expect(pitchRate(0, 0.9)).toBe(1);
    expect(pitchRate(2, 0.5)).toBeCloseTo(1, 6);
    expect(pitchRate(2, 0)).toBeCloseTo(Math.pow(2, -2 / 12), 6);
    expect(pitchRate(2, 0.999999)).toBeLessThan(Math.pow(2, 2 / 12) + 1e-6);
  });
  it('dB to gain', () => {
    expect(dbToGain(0)).toBe(1);
    expect(dbToGain(-6)).toBeCloseTo(0.501, 3);
  });
});

describe('VoiceLimiter', () => {
  it('overlap mode allows up to maxVoices and then skips', () => {
    const v = new VoiceLimiter();
    expect(v.request('a', 0, 2, 'overlap', 1)).toBe('play');
    expect(v.request('a', 0.1, 2, 'overlap', 1)).toBe('play');
    expect(v.request('a', 0.2, 2, 'overlap', 1)).toBe('skip');
    expect(v.request('a', 1.05, 2, 'overlap', 1)).toBe('play'); // the first voice has ended
  });
  it('ignore skips while playing; restart replaces', () => {
    const v = new VoiceLimiter();
    expect(v.request('m', 0, 1, 'ignore', 5)).toBe('play');
    expect(v.request('m', 1, 1, 'ignore', 5)).toBe('skip');
    expect(v.request('u', 0, 2, 'restart', 1)).toBe('play');
    expect(v.request('u', 0.3, 2, 'restart', 1)).toBe('restart');
    expect(v.request('z', 0.6, 1, 'overlap', 1)).toBe('play'); // other id is independent
  });
});

describe('loop region', () => {
  it('uses the sidecar region clamped to the buffer, else the whole buffer', () => {
    expect(loopRegion({ file: 'a.ogg' }, 10)).toEqual({ start: 0, end: 10 });
    expect(loopRegion({ file: 'a.ogg', loopStart: 2, loopEnd: 8 }, 10)).toEqual({ start: 2, end: 8 });
    expect(loopRegion({ file: 'a.ogg', loopStart: 2, loopEnd: 80 }, 10)).toEqual({ start: 2, end: 10 });
    expect(loopRegion({ file: 'a.ogg', loopStart: 12 }, 10).end).toBe(10);
  });
});
