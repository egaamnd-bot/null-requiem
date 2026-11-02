import { describe, expect, it } from 'vitest';
import { BACKTRACE, SIM } from '../src/config/tuning';
import { Backtrace } from '../src/core/backtrace';
import { Player } from '../src/core/player';
import { DT, gridFrom, input, runPlayer, settle, tileFeet, tileX } from './helpers';

function tall(): string[] {
  const rows: string[] = ['#'.repeat(40)];
  for (let r = 1; r < 30; r++) rows.push('#' + '.'.repeat(38) + '#');
  rows.push('#'.repeat(40), '#'.repeat(40));
  return rows;
}

const withAirJump = { dash: false, glitchStrike: false, airJump: true };
const without = { dash: false, glitchStrike: false };

function apexAfterJumps(abilities: typeof withAirJump | typeof without, secondJump: boolean): number {
  const grid = gridFrom(tall());
  const p = new Player(tileX(5), tileFeet(29));
  settle(p, grid);
  let minY = p.body.y;
  runPlayer(p, grid, 240, (i) => input({ jumpHeld: i < 40 || (secondJump && i >= 50 && i < 90), jumpPressed: i === 0 || (secondJump && i === 50) }), abilities, () => (minY = Math.min(minY, p.body.y)));
  return minY;
}

describe('Kinetic Coil (air jump)', () => {
  it('gives exactly one extra jump in mid-air, reaching clearly higher than a single jump', () => {
    const single = apexAfterJumps(without, true);
    const doubled = apexAfterJumps(withAirJump, true);
    expect(doubled).toBeLessThan(single - 20);
  });

  it('is not available without the ability', () => {
    const noCoil = apexAfterJumps(without, true);
    const justOne = apexAfterJumps(without, false);
    expect(Math.abs(noCoil - justOne)).toBeLessThan(1);
  });

  it('allows only one air jump per airtime and recharges on landing', () => {
    const grid = gridFrom(tall());
    const p = new Player(tileX(5), tileFeet(29));
    settle(p, grid);
    const events: boolean[] = [];
    const run = (steps: number, f: (i: number) => ReturnType<typeof input>) =>
      runPlayer(p, grid, steps, f, withAirJump).forEach((e) => e.type === 'playerJump' && events.push(!!e.air));
    run(1, () => input({ jumpPressed: true, jumpHeld: true })); // ground jump
    run(20, () => input({ jumpHeld: true }));
    run(1, () => input({ jumpPressed: true, jumpHeld: true })); // air jump
    run(20, () => input({ jumpHeld: true }));
    run(1, () => input({ jumpPressed: true, jumpHeld: true })); // third press: nothing
    expect(events).toEqual([false, true]);
    run(400, () => input()); // land
    expect(p.body.onGround).toBe(true);
    run(1, () => input({ jumpPressed: true, jumpHeld: true }));
    run(20, () => input({ jumpHeld: true }));
    run(1, () => input({ jumpPressed: true, jumpHeld: true }));
    expect(events).toEqual([false, true, false, true]);
  });

  it('does not trigger on the ground (a normal jump must stay a normal jump)', () => {
    const grid = gridFrom(tall());
    const p = new Player(tileX(5), tileFeet(29));
    settle(p, grid);
    const ev = runPlayer(p, grid, 5, (i) => input({ jumpPressed: i === 0, jumpHeld: true }), withAirJump).filter((e) => e.type === 'playerJump');
    expect(ev).toHaveLength(1);
    expect((ev[0] as { air?: boolean }).air).toBeFalsy();
  });
});

describe('Backtrace upgrades', () => {
  const hz = SIM.stepHz;
  const sample = (x: number) => ({ feetX: x, feetY: 100, facing: 1 as const, health: 5 });
  const fill = (bt: Backtrace, seconds: number) => {
    for (let i = 0; i <= seconds * hz; i++) bt.record(sample(i / hz));
  };
  const open = gridFrom(['#'.repeat(40), ...Array.from({ length: 6 }, () => '#' + '.'.repeat(38) + '#'), '#'.repeat(40)]);

  it('a longer window reaches further back into the Courier\'s history', () => {
    const bt = new Backtrace(hz);
    fill(bt, 6);
    const base = bt.echo()!;
    bt.setStats({ window: 5.5 });
    const longer = bt.echo()!;
    expect(longer.feetX).toBeLessThan(base.feetX);
    // positions encode time (x = seconds), so the echo is exactly `window` seconds behind the newest sample
    expect(6 - longer.feetX).toBeCloseTo(5.5, 1);
    expect(6 - base.feetX).toBeCloseTo(BACKTRACE.window, 1);
  });

  it('never exceeds the buffer even if asked for an absurd window', () => {
    const bt = new Backtrace(hz);
    bt.setStats({ window: 999 });
    expect(bt.currentWindow).toBeLessThanOrEqual(BACKTRACE.maxWindow + 1 / hz);
  });

  it('target() and bestHealth() honour the active window', () => {
    const bt = new Backtrace(hz);
    for (let i = 0; i <= 6 * hz; i++) bt.record({ feetX: 20 + i / hz, feetY: 96, facing: 1, health: i < hz ? 5 : 3 });
    // health 5 only in the very first second of history: outside the 4s window, inside the 5.5s one
    expect(bt.bestHealth()).toBe(3);
    bt.setStats({ window: 5.9 });
    expect(bt.bestHealth()).toBe(5);
    const t = bt.target(open, 10, 22);
    expect(t).not.toBeNull();
  });

  it('faster cooldown shortens the recharge and keeps the HUD ratio correct', () => {
    const bt = new Backtrace(hz);
    bt.setStats({ cooldown: 3 });
    fill(bt, 1);
    bt.consume();
    expect(bt.cooldownRatio).toBe(1);
    bt.tick(1.5);
    expect(bt.cooldownRatio).toBeCloseTo(0.5, 5);
    bt.tick(1.5);
    expect(bt.cooldown).toBe(0);
  });

  it('historySeconds is capped at the window', () => {
    const bt = new Backtrace(hz);
    fill(bt, 6);
    expect(bt.historySeconds).toBeCloseTo(BACKTRACE.window, 1);
    bt.setStats({ window: 5.5 });
    expect(bt.historySeconds).toBeCloseTo(5.5, 1);
  });

  it('sampleAgo returns the recorded past for trailing enemies', () => {
    const bt = new Backtrace(hz);
    expect(bt.sampleAgo(1)).toBeNull();
    fill(bt, 3);
    expect(3 - bt.sampleAgo(2)!.feetX).toBeCloseTo(2, 1);
    expect(bt.sampleAgo(100)!.feetX).toBeCloseTo(0, 1);
  });
});

void DT;
