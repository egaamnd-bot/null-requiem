import { describe, expect, it } from 'vitest';
import { TapGuard } from '../src/input/TapGuard';

describe('TapGuard (menu tap semantics)', () => {
  it('fires on press + release by the same pointer over the item', () => {
    const g = new TapGuard();
    expect(g.down(1)).toBe(true);
    expect(g.pressed).toBe(true);
    expect(g.up(1, true)).toBe(true);
    expect(g.pressed).toBe(false);
  });

  it('does not fire if the finger slides off before release', () => {
    const g = new TapGuard();
    g.down(1);
    g.cancel(1);
    expect(g.up(1, true)).toBe(false);
  });

  it('does not fire when released outside the item', () => {
    const g = new TapGuard();
    g.down(1);
    expect(g.up(1, false)).toBe(false);
  });

  it('does not fire for a finger that was dragged onto the item', () => {
    const g = new TapGuard();
    expect(g.up(1, true)).toBe(false);
  });

  it('ignores a second pointer while the first owns the press', () => {
    const g = new TapGuard();
    expect(g.down(1)).toBe(true);
    expect(g.down(2)).toBe(false);
    expect(g.up(2, true)).toBe(false);
    expect(g.up(1, true)).toBe(true);
  });

  it('fires at most once, even with repeated down/up events', () => {
    const g = new TapGuard();
    g.down(1);
    expect(g.up(1, true)).toBe(true);
    expect(g.down(1)).toBe(false);
    expect(g.down(2)).toBe(false);
    expect(g.up(2, true)).toBe(false);
  });

  it('can be re-armed when a menu opens again', () => {
    const g = new TapGuard();
    g.down(1);
    g.up(1, true);
    g.reset();
    expect(g.down(3)).toBe(true);
    expect(g.up(3, true)).toBe(true);
  });
});
