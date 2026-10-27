import { describe, expect, it } from 'vitest';
import { PLAYER } from '../src/config/tuning';
import { createBody, moveBody } from '../src/core/body';
import { createRng } from '../src/core/math';
import { Player } from '../src/core/player';
import { TileGrid } from '../src/core/tiles';
import { ROOMS } from '../src/world/rooms';
import { DT, gridFrom, input, runPlayer, settle, tileFeet, tileX } from './helpers';

describe('Tile collision', () => {
  it('never tunnels through a one-tile floor at maximum fall speed', () => {
    const rows = ['#'.repeat(10)];
    for (let r = 1; r < 30; r++) rows.push('#' + '.'.repeat(8) + '#');
    rows[20] = '#'.repeat(10);
    const grid = gridFrom(rows);
    const b = createBody(40, 20, 10, 22);
    b.vy = PLAYER.maxFallSpeed;
    for (let i = 0; i < 400; i++) {
      b.vy = PLAYER.maxFallSpeed;
      moveBody(b, grid, DT, { collideOneWay: true });
    }
    expect(b.y + b.h).toBeCloseTo(20 * 16, 6);
    expect(b.onGround).toBe(true);
  });

  it('stays grounded without jitter while standing still', () => {
    const rows = ['#'.repeat(10)];
    for (let r = 1; r < 8; r++) rows.push('#' + '.'.repeat(8) + '#');
    rows.push('#'.repeat(10));
    const grid = gridFrom(rows);
    const p = new Player(tileX(4), tileFeet(7));
    settle(p, grid);
    const y = p.body.y;
    const events = runPlayer(p, grid, 600, () => input(), undefined, () => {
      expect(p.body.onGround).toBe(true);
      expect(p.body.y).toBe(y);
    });
    expect(events.filter((e) => e.type === 'playerLand')).toHaveLength(0);
  });

  it('is never embedded in solid tiles during long random play in every room (fuzz)', () => {
    const rng = createRng(42);
    for (const room of ROOMS) {
      const { grid, markers } = TileGrid.fromAscii(room.layout, 16);
      const start = Object.values(room.entries)[0] ?? markers.find((m) => m.char === 'P');
      expect(start).toBeDefined();
      if (!start) continue;
      const p = new Player(tileX(start.col), tileFeet(start.row));
      let held = input();
      for (let i = 0; i < 120 * 90; i++) {
        if (i % 12 === 0) {
          held = input({
            moveX: (Math.floor(rng() * 3) - 1) as -1 | 0 | 1,
            moveY: (Math.floor(rng() * 3) - 1) as -1 | 0 | 1,
            jumpHeld: rng() < 0.5,
            jumpPressed: rng() < 0.3,
            dashPressed: rng() < 0.15,
            attackPressed: rng() < 0.2,
          });
        } else {
          held = { ...held, jumpPressed: false, dashPressed: false, attackPressed: false };
        }
        p.step(held, grid, DT, { veilstep: true }, () => {});
        const b = p.body;
        expect(grid.rectOverlapsSolid(b), `${room.id} step ${i} at ${b.x.toFixed(2)},${b.y.toFixed(2)}`).toBe(false);
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w).toBeLessThanOrEqual(grid.widthPx);
        expect(b.y + b.h).toBeLessThanOrEqual(grid.heightPx);
        // Respawn if the fuzzer falls into the ember pit (hazards are handled by the world, not the body).
        if (grid.rectOverlapsHazard(b)) p.placeAt(tileX(start.col), tileFeet(start.row));
      }
    }
  });
});

describe('Line of sight', () => {
  it('is blocked by solid tiles but not one-way platforms', () => {
    const grid = gridFrom(['..........', '....#.....', '..........', '....=.....', '..........']);
    expect(grid.lineOfSight(8, 24, 150, 24)).toBe(false);
    expect(grid.lineOfSight(8, 56, 150, 56)).toBe(true);
    expect(grid.lineOfSight(8, 8, 150, 8)).toBe(true);
  });
});
