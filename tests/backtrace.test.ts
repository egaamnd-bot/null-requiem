import { describe, expect, it } from 'vitest';
import { BACKTRACE, ENEMIES, PLAYER, PUZZLE, SIM, TILE_SIZE } from '../src/config/tuning';
import { Backtrace } from '../src/core/backtrace';
import { ScrapHound } from '../src/core/enemies/scrapHound';
import { Tile } from '../src/core/tiles';
import { DT, gridFrom, input, stepWorld, tileFeet, tileX, worldAt } from './helpers';

const WINDOW_STEPS = Math.round(BACKTRACE.window / DT);

describe('Backtrace echo buffer', () => {
  it('the echo trails exactly one window behind the player', () => {
    const world = worldAt('alley', 9, 19, (p) => p.unlock('backtrace'));
    world.room.enemies = [];
    const trail: number[] = [];
    for (let i = 0; i < WINDOW_STEPS + 200; i++) {
      stepWorld(world, 1, () => input({ moveX: i % 300 < 150 ? 1 : -1 }));
      trail.push(world.player.feetX);
    }
    const echo = world.backtrace.echo();
    expect(echo).not.toBeNull();
    expect(echo!.feetX).toBeCloseTo(trail[trail.length - 1 - WINDOW_STEPS]!, 6);
  });

  it('is not ready until a little history exists', () => {
    const bt = new Backtrace(SIM.stepHz);
    expect(bt.ready).toBe(false);
    for (let i = 0; i < Math.ceil(BACKTRACE.minHistory * SIM.stepHz) + 1; i++) bt.record({ feetX: i, feetY: 0, facing: 1, health: 5 });
    expect(bt.ready).toBe(true);
  });

  it('skips echo samples the world has since blocked, and samples in hazards', () => {
    const grid = gridFrom(['..........', '..........', '..........', '##########']);
    const bt = new Backtrace(SIM.stepHz);
    for (let c = 0; c < 8; c++) bt.record({ feetX: tileX(c), feetY: tileFeet(2), facing: 1, health: 5 });
    grid.set(0, 2, Tile.Solid);
    grid.set(1, 2, Tile.Hazard);
    const t = bt.target(grid, PLAYER.width, PLAYER.height);
    expect(t?.feetX).toBe(tileX(2));
  });
});

describe('Backtrace in the world', () => {
  it('does nothing until the ability is unlocked', () => {
    const world = worldAt('alley', 9, 19);
    world.room.enemies = [];
    stepWorld(world, 120, () => input({ moveX: 1 }));
    const ev = stepWorld(world, 1, () => input({ backtracePressed: true }));
    expect(ev.some((e) => e.type === 'backtrace')).toBe(false);
  });

  it('snaps back to the echo, undoes damage taken since, grants i-frames and starts the cooldown', () => {
    // Start past the relay at col 13 so walking doesn't heal the player.
    const world = worldAt('alley', 15, 19, (p) => p.unlock('backtrace'));
    world.room.enemies = [];
    const startX = world.player.feetX;
    stepWorld(world, 60);
    world.player.takeDamage(2, world.player.centerX - 10, () => {}); // knocked right, away from the relay
    stepWorld(world, 150, () => input({ moveX: 1 }));
    expect(world.player.health.current).toBe(PLAYER.maxHealth - 2);
    expect(world.player.feetX).toBeGreaterThan(startX + 100);

    const ev = stepWorld(world, 1, () => input({ backtracePressed: true }));
    const bt = ev.find((e) => e.type === 'backtrace');
    expect(bt).toBeDefined();
    expect(world.player.feetX).toBeCloseTo(startX, 0);
    expect(world.player.health.current).toBe(PLAYER.maxHealth);
    expect(world.player.health.isInvulnerable).toBe(true);
    expect(world.hud().backtraceReady).toBe(false);

    // A second press during the cooldown does nothing.
    stepWorld(world, 120, () => input({ moveX: 1 }));
    const again = stepWorld(world, 1, () => input({ backtracePressed: true }));
    expect(again.some((e) => e.type === 'backtrace')).toBe(false);

    stepWorld(world, Math.ceil(BACKTRACE.cooldown / DT));
    expect(world.hud().backtraceReady).toBe(true);
  });

  it('never lowers health (healing inside the window is kept)', () => {
    const world = worldAt('alley', 9, 19, (p) => p.unlock('backtrace'));
    world.room.enemies = [];
    world.player.takeDamage(3, 0, () => {});
    stepWorld(world, 120);
    world.player.health.restoreFull();
    stepWorld(world, 60);
    stepWorld(world, 1, () => input({ backtracePressed: true }));
    expect(world.player.health.current).toBe(PLAYER.maxHealth);
  });

  it('releases a burst at the arrival point that hits nearby enemies, but not through walls', () => {
    const world = worldAt('alley', 9, 19, (p) => p.unlock('backtrace'));
    stepWorld(world, 60);
    stepWorld(world, 150, () => input({ moveX: 1 }));
    // An enemy waiting at the echo, and one behind the wall left of the start.
    const near = new ScrapHound('near', tileX(10), tileFeet(19));
    const walled = new ScrapHound('walled', tileX(3), tileFeet(19));
    world.room.enemies = [near, walled];
    world.room.walls = [];
    stepWorld(world, 1, () => input({ backtracePressed: true }));
    expect(near.health.current).toBe(ENEMIES.scrapHound.health - BACKTRACE.burst.damage);
    expect(walled.health.current).toBe(ENEMIES.scrapHound.health);
  });

  it('history resets on room change and respawn (no rewinding across rooms)', () => {
    const world = worldAt('alley', 60, 19, (p) => p.unlock('backtrace'));
    world.room.enemies = [];
    for (let i = 0; i < 240 && !world.pendingTransition; i++) world.step(input({ moveX: 1 }), DT);
    world.completeTransition();
    expect(world.backtrace.historySeconds).toBe(0);
    const ev = stepWorld(world, 1, () => input({ backtracePressed: true }));
    expect(ev.some((e) => e.type === 'backtrace')).toBe(false);
  });

  it('the gate puzzle has a real margin: the fastest sprint loses to the gate timer', () => {
    // Measure the fastest possible switch-to-gate run (dash whenever ready) against the open time.
    const world = worldAt('transit', 51, 25);
    world.room.enemies = [];
    for (const t of world.room.timedGate!.tiles) world.room.grid.set(t.col, t.row, Tile.Empty);
    let steps = 0;
    while (world.player.body.x < 75 * TILE_SIZE && steps < 600) {
      world.step(input({ moveX: 1, dashPressed: true }), DT);
      steps++;
    }
    const fastest = steps * DT;
    console.info(`fastest switch-to-gate run ${fastest.toFixed(3)}s vs gate open ${PUZZLE.gateOpenTime}s`);
    expect(fastest).toBeGreaterThan(PUZZLE.gateOpenTime + 0.4);
  });
});
