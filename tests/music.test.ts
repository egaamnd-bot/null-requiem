import { describe, expect, it } from 'vitest';
import { midiToHz, noteOfDegree, themeFor, THEMES } from '../src/audio/musicTheory';

describe('music theory helpers', () => {
  it('A4 is 440 Hz and an octave doubles the frequency', () => {
    expect(midiToHz(69)).toBeCloseTo(440, 6);
    expect(midiToHz(81) / midiToHz(69)).toBeCloseTo(2, 9);
  });

  it('scale degrees wrap into higher octaves', () => {
    const minor = [0, 2, 3, 5, 7, 8, 10];
    expect(noteOfDegree(40, minor, 0)).toBe(52);
    expect(noteOfDegree(40, minor, 7)).toBe(64);
    expect(noteOfDegree(40, minor, -1)).toBe(52 - 2);
  });

  it('every region and mode has a theme with a sane tempo and a pattern', () => {
    for (const [name, t] of Object.entries(THEMES)) {
      expect(t.step, name).toBeGreaterThan(0.1);
      expect(t.step, name).toBeLessThan(1);
      expect(t.pattern.length, name).toBeGreaterThan(0);
      expect(t.cutoff, name).toBeGreaterThan(100);
    }
  });

  it('chooses the theme from where the Courier is and what is happening', () => {
    expect(themeFor(undefined, { bossActive: false, finalBoss: false, inGame: false })).toBe('title');
    expect(themeFor('transit', { bossActive: false, finalBoss: false, inGame: true })).toBe('transit');
    expect(themeFor('industrial', { bossActive: true, finalBoss: false, inGame: true })).toBe('boss');
    expect(themeFor('cathedral', { bossActive: true, finalBoss: true, inGame: true })).toBe('finalBoss');
    expect(themeFor(undefined, { bossActive: false, finalBoss: false, inGame: true })).toBe('rainline');
  });
});
