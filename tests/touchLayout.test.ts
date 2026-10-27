import { describe, expect, it } from 'vitest';
import { buttonAt, createTouchLayout, dpadKeysAt, holdKeysAt, isOnPause, type HoldKey } from '../src/input/touchLayout';

const SIZES: Array<[number, number]> = [
  [480, 270],
  [960, 540],
  [400, 270],
];

describe('touch layout', () => {
  it.each(SIZES)('keeps every control fully inside a %ix%i view', (w, h) => {
    const l = createTouchLayout(w, h);
    const circles = [l.dpad, l.pause, ...l.buttons];
    for (const c of circles) {
      expect(c.x - c.r).toBeGreaterThanOrEqual(0);
      expect(c.x + c.r).toBeLessThanOrEqual(w);
      expect(c.y - c.r).toBeGreaterThanOrEqual(0);
      expect(c.y + c.r).toBeLessThanOrEqual(h);
    }
  });

  it('provides every gameplay action, including Backtrace on screen (regression: it was laid out below the view)', () => {
    const l = createTouchLayout(480, 270);
    const keys = l.buttons.map((b) => b.key).sort();
    expect(keys).toEqual(['attack', 'backtrace', 'dash', 'interact', 'jump']);
    const rew = l.buttons.find((b) => b.key === 'backtrace')!;
    expect(rew.y + rew.r).toBeLessThanOrEqual(270);
  });

  it.each(SIZES)('has no overlapping visible controls in %ix%i', (w, h) => {
    const l = createTouchLayout(w, h);
    const circles = [{ ...l.dpad }, { ...l.pause }, ...l.buttons];
    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        const a = circles[i]!;
        const b = circles[j]!;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.r + b.r);
      }
    }
  });

  it('gives action buttons a thumb-sized hit target (>= 36 logical px across)', () => {
    const l = createTouchLayout(480, 270);
    for (const b of l.buttons) expect(b.hitR * 2).toBeGreaterThanOrEqual(36);
    expect(l.pause.hitR * 2).toBeGreaterThanOrEqual(40);
  });

  it('maps a tap on each action button to exactly that button', () => {
    const l = createTouchLayout(480, 270);
    for (const b of l.buttons) {
      expect(buttonAt(l, b.x, b.y)?.key).toBe(b.key);
      expect(holdKeysAt(l, b.x, b.y)).toEqual([b.key]);
    }
  });

  it('maps d-pad regions to left/right/up/down and ignores the dead centre', () => {
    const l = createTouchLayout(480, 270);
    const { x, y, r } = l.dpad;
    expect(dpadKeysAt(l, x - r * 0.8, y)).toEqual(['left']);
    expect(dpadKeysAt(l, x + r * 0.8, y)).toEqual(['right']);
    expect(dpadKeysAt(l, x, y - r * 0.8)).toEqual(['up']);
    expect(dpadKeysAt(l, x, y + r * 0.8)).toEqual(['down']);
    expect(dpadKeysAt(l, x, y)).toEqual([]);
    const diag = dpadKeysAt(l, x + r * 0.7, y - r * 0.7) as HoldKey[];
    expect(diag.sort()).toEqual(['right', 'up']);
  });

  it('releases the d-pad when a finger drifts far outside it', () => {
    const l = createTouchLayout(480, 270);
    expect(dpadKeysAt(l, l.dpad.x + l.dpad.r * 2, l.dpad.y)).toEqual([]);
  });

  it('treats empty space as no input', () => {
    const l = createTouchLayout(480, 270);
    expect(holdKeysAt(l, 240, 100)).toEqual([]);
  });

  it('pause is a tap target only and is not reachable as a held key', () => {
    const l = createTouchLayout(480, 270);
    expect(isOnPause(l, l.pause.x, l.pause.y)).toBe(true);
    expect(isOnPause(l, 240, 135)).toBe(false);
    expect(holdKeysAt(l, l.pause.x, l.pause.y)).toEqual([]);
  });
});
