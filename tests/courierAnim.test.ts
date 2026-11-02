import { describe, expect, it } from 'vitest';
import { OneShotTrack } from '../src/render/courierAnim';

const defs = {
  backtrace: { frames: 6, fps: 16, hold: false },
  airjump: { frames: 3, fps: 14, hold: false },
  death: { frames: 6, fps: 10, hold: true },
};

describe('Courier one-shot animations (R6)', () => {
  it('steps through frames at the manifest rate and then returns to the normal pose', () => {
    const t = new OneShotTrack(defs);
    expect(t.start('backtrace', 10)).toBe(true);
    expect(t.frameAt(10)).toEqual({ anim: 'backtrace', index: 0 });
    expect(t.frameAt(10 + 1 / 16)).toEqual({ anim: 'backtrace', index: 1 });
    expect(t.frameAt(10 + 5.5 / 16)?.index).toBe(5);
    expect(t.frameAt(10 + 6 / 16)).toBeNull();
    expect(t.active).toBeNull();
  });
  it('does nothing for animations without delivered art', () => {
    const t = new OneShotTrack(defs);
    expect(t.start('interact', 0)).toBe(false);
    expect(t.frameAt(0.1)).toBeNull();
  });
  it('death holds its last frame, cannot be interrupted, and clears on respawn', () => {
    const t = new OneShotTrack(defs);
    t.start('death', 0);
    expect(t.frameAt(5)).toEqual({ anim: 'death', index: 5 });
    expect(t.start('backtrace', 5)).toBe(false);
    expect(t.frameAt(60)).toEqual({ anim: 'death', index: 5 });
    t.clear();
    expect(t.frameAt(61)).toBeNull();
  });
  it('a newer non-death animation replaces an older one', () => {
    const t = new OneShotTrack(defs);
    t.start('airjump', 0);
    t.start('backtrace', 0.05);
    expect(t.frameAt(0.05)?.anim).toBe('backtrace');
  });
});
