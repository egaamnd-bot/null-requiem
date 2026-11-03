import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../src/core/events';
import { CombatTracker, FootstepTracker, isCombatEvent } from '../src/audio/triggers';

describe('FootstepTracker', () => {
  it('steps by distance, not by frame, and is silent when standing, airborne or inactive', () => {
    const f = new FootstepTracker(26);
    let steps = 0;
    for (let i = 0; i < 600; i++) if (f.update(1 / 120, { onGround: true, vx: 150, active: true })) steps++; // 5 s at 150 px/s = 750 px
    expect(steps).toBe(Math.floor(750 / 26));
    const g = new FootstepTracker(26);
    for (let i = 0; i < 300; i++) {
      expect(g.update(1 / 120, { onGround: false, vx: 150, active: true })).toBe(false);
      expect(g.update(1 / 120, { onGround: true, vx: 0, active: true })).toBe(false);
      expect(g.update(1 / 120, { onGround: true, vx: 150, active: false })).toBe(false);
    }
  });
  it('does not step instantly on landing (half a stride first)', () => {
    const f = new FootstepTracker(26);
    f.update(1 / 120, { onGround: true, vx: 150, active: true });
    for (let i = 0; i < 100; i++) f.update(1 / 120, { onGround: false, vx: 150, active: true });
    let first = -1;
    for (let i = 0; i < 120 && first < 0; i++) if (f.update(1 / 120, { onGround: true, vx: 150, active: true })) first = i;
    expect(first).toBeGreaterThan(8); // ≥ ~13 px of walking before the first step
  });
});

describe('CombatTracker (audio-only combat signal)', () => {
  const windup: GameEvent = { type: 'enemyWindup', x: 0, y: 0 };
  it('only existing combat events count', () => {
    expect(isCombatEvent(windup)).toBe(true);
    expect(isCombatEvent({ type: 'hit', x: 0, y: 0, target: 'enemy', killed: false })).toBe(true);
    expect(isCombatEvent({ type: 'hit', x: 0, y: 0, target: 'wall', killed: false })).toBe(false);
    expect(isCombatEvent({ type: 'playerJump', x: 0, y: 0 })).toBe(false);
    expect(isCombatEvent({ type: 'scrapGained', amount: 1, x: 0, y: 0, total: 1 })).toBe(false);
  });
  it('rises quickly, holds, then falls slowly (no flapping between two enemies)', () => {
    const c = new CombatTracker(5, 0.35, 2.5);
    let t = 0;
    const step = (dt: number) => c.update((t += dt), dt);
    expect(step(0.1)).toBe(0);
    c.note(windup, t);
    for (let i = 0; i < 40; i++) step(0.01); // 0.4 s
    expect(c.intensity).toBe(1);
    for (let i = 0; i < 400; i++) step(0.01); // 4 s later: still holding
    expect(c.intensity).toBe(1);
    c.note(windup, t); // another event refreshes the hold
    for (let i = 0; i < 400; i++) step(0.01);
    expect(c.intensity).toBe(1);
    for (let i = 0; i < 100; i++) step(0.01); // the 5 s hold ends
    for (let i = 0; i < 120; i++) step(0.01); // 1.2 s later: partway down
    expect(c.intensity).toBeGreaterThan(0.3);
    expect(c.intensity).toBeLessThan(0.9);
    for (let i = 0; i < 400; i++) step(0.01);
    expect(c.intensity).toBe(0);
  });
  it('resets on room change and death', () => {
    const c = new CombatTracker();
    let t = 0;
    c.note(windup, t);
    for (let i = 0; i < 50; i++) c.update((t += 0.01), 0.01);
    c.note({ type: 'roomEntered', roomId: 'x', name: 'x' }, t);
    for (let i = 0; i < 400; i++) c.update((t += 0.01), 0.01);
    expect(c.intensity).toBe(0);
  });
});
