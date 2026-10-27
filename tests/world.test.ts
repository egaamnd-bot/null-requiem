import { describe, expect, it } from 'vitest';
import { BOSS, COMBAT, ENEMIES, FLOW, PLAYER, TILE_SIZE, VIEW } from '../src/config/tuning';
import { ScrapHound } from '../src/core/enemies/scrapHound';
import type { GameEvent } from '../src/core/events';
import { Tile, TileGrid } from '../src/core/tiles';
import { ROOMS, START_ROOM } from '../src/world/rooms';
import { DT, input, stepWorld, tileFeet, tileX, worldAt } from './helpers';
import type { InputFrame } from '../src/core/input';

const KNOWN_MARKERS = new Set(['P', 'K', 'C', 'W', 'A', 'H', 'X', 'D', 'T', 'S', 'F', 'N', 'G']);
const ATTACK_CYCLE_STEPS = Math.ceil((COMBAT.attack.startup + COMBAT.attack.active + COMBAT.attack.recovery) / DT) + 2;

describe('Room data', () => {
  for (const room of ROOMS) {
    describe(room.id, () => {
      const { grid, markers } = TileGrid.fromAscii(room.layout, TILE_SIZE);

      it('is at least as large as the view, so the camera never shows outside the level', () => {
        expect(grid.widthPx).toBeGreaterThanOrEqual(VIEW.width);
        expect(grid.heightPx).toBeGreaterThanOrEqual(VIEW.height);
      });

      it('only uses known markers', () => {
        for (const m of markers) expect(KNOWN_MARKERS.has(m.char), `marker ${m.char}`).toBe(true);
      });

      it('has a sealed border except at door openings', () => {
        const inDoor = (c: number, r: number) =>
          room.doors.some((d) => c >= d.area.col && c < d.area.col + d.area.cols && r >= d.area.row && r < d.area.row + d.area.rows);
        for (let c = 0; c < grid.cols; c++) {
          for (const r of [0, grid.rows - 1]) {
            if (!grid.isSolid(c, r)) expect(inDoor(c, r), `${room.id} border ${c},${r}`).toBe(true);
          }
        }
        for (let r = 0; r < grid.rows; r++) {
          for (const c of [0, grid.cols - 1]) {
            if (!grid.isSolid(c, r)) expect(inDoor(c, r), `${room.id} border ${c},${r}`).toBe(true);
          }
        }
      });

      it('has entries standing on solid ground, clear of solids and door triggers', () => {
        for (const [name, e] of Object.entries(room.entries)) {
          const feetX = tileX(e.col);
          const feetY = tileFeet(e.row);
          const body = { x: feetX - PLAYER.width / 2, y: feetY - PLAYER.height, w: PLAYER.width, h: PLAYER.height };
          expect(grid.rectOverlapsSolid(body), `${name} overlaps solid`).toBe(false);
          expect(grid.isStandable(e.col, e.row + 1), `${name} has no floor`).toBe(true);
          for (const d of room.doors) {
            const dr = { x: d.area.col * 16, y: d.area.row * 16, w: d.area.cols * 16, h: d.area.rows * 16 };
            const overlap = body.x < dr.x + dr.w && body.x + body.w > dr.x && body.y < dr.y + dr.h && body.y + body.h > dr.y;
            expect(overlap, `${name} spawns inside door ${d.id}`).toBe(false);
          }
        }
      });

      it('links every door to an existing room entry', () => {
        for (const d of room.doors) {
          const target = ROOMS.find((r) => r.id === d.to.room);
          expect(target, d.id).toBeDefined();
          expect(target?.entries[d.to.entry], `${d.id} → ${d.to.entry}`).toBeDefined();
        }
      });
    });
  }

  it('the start room has a start marker', () => {
    const start = ROOMS.find((r) => r.id === START_ROOM)!;
    expect(start.layout.some((l) => l.includes('P'))).toBe(true);
  });
});

/** Simulate a run-and-jump at the transit's pit. Returns true if the player lands across. */
function attemptPitCrossing(jumpAt: number, dashAt: number | null): boolean {
  const world = worldAt('transit', 36, 25);
  world.room.enemies = [];
  const farLedgeX = 49 * TILE_SIZE;
  for (let i = 0; i < 120 * 3; i++) {
    world.step(
      input({ moveX: 1, jumpPressed: i === jumpAt, jumpHeld: i >= jumpAt, dashPressed: dashAt !== null && i === dashAt }),
      DT,
    );
    const events = world.drainEvents();
    if (events.some((e) => e.type === 'hazardRespawn' || e.type === 'playerDied')) return false;
    const p = world.player;
    if (p.body.onGround && p.body.x > farLedgeX) return true;
  }
  return false;
}

describe('Transit Stacks pit (dash traversal challenge)', () => {
  it('cannot be crossed by any run-and-jump timing without dashing', () => {
    for (let jumpAt = 0; jumpAt <= 90; jumpAt++) {
      expect(attemptPitCrossing(jumpAt, null), `jump at step ${jumpAt}`).toBe(false);
    }
  });

  it('can be crossed with a jump + dash, with a forgiving timing window', () => {
    let successes = 0;
    let attempts = 0;
    for (let jumpAt = 0; jumpAt <= 90; jumpAt += 2) {
      for (let d = 0; d <= 60; d += 3) {
        attempts++;
        if (attemptPitCrossing(jumpAt, jumpAt + d)) successes++;
      }
    }
    expect(successes).toBeGreaterThan(40);
    expect(successes).toBeLessThan(attempts);
  });
});

const GATE_RIGHT = 75 * TILE_SIZE;

/**
 * From just east of the override switch: face it, strike it, then sprint for the gate using
 * dash as soon as it is ready (starting `dashOffset` steps after the strike lands — dashing
 * earlier would cancel the swing). Returns true if the player
 * gets past the gate. Asserts the strike really opened the gate so the test can't pass vacuously.
 */
function raceTheGate(strikeDelay: number, dashOffset: number, jumpEvery: number | null): boolean {
  const world = worldAt('transit', 51, 25);
  world.room.enemies = [];
  stepWorld(world, 2, () => input({ moveX: -1 }));
  stepWorld(world, strikeDelay);
  let opened = false;
  let hitAt = -1;
  for (let i = 0; i < 120 * 4; i++) {
    const run = i >= 1;
    world.step(
      input({
        attackPressed: i === 0,
        moveX: run ? 1 : 0,
        dashPressed: hitAt >= 0 && i >= hitAt + dashOffset,
        jumpPressed: jumpEvery !== null && run && i % jumpEvery === 0,
        jumpHeld: jumpEvery !== null,
      }),
      DT,
    );
    if (world.drainEvents().some((e) => e.type === 'switchHit')) {
      opened = true;
      hitAt = i;
    }
    if (world.player.body.x >= GATE_RIGHT) return true;
  }
  expect(opened, 'strike should open the gate').toBe(true);
  return false;
}

describe('Ability-gated route (Transit Stacks timed gate)', () => {
  it('cannot be beaten by any sprint/dash/jump timing without Backtrace', () => {
    for (const strikeDelay of [0, 10, 30]) {
      for (let dashOffset = 0; dashOffset <= 40; dashOffset += 3) {
        for (const jumpEvery of [null, 30, 60]) {
          expect(raceTheGate(strikeDelay, dashOffset, jumpEvery), `delay ${strikeDelay} dash ${dashOffset} jump ${jumpEvery}`).toBe(false);
        }
      }
    }
  });

  it('can be beaten with Backtrace: stand at the gate, run back, strike, snap back, walk through', () => {
    const world = worldAt('transit', 72, 25, (p) => p.unlock('backtrace'));
    world.room.enemies = [];
    stepWorld(world, 60); // wait at the gate: this is where the echo will be
    let steps = 0;
    while (world.player.centerX > 51.6 * TILE_SIZE && steps++ < 600) stepWorld(world, 1, () => input({ moveX: -1 }));
    stepWorld(world, 30); // settle
    expect(world.player.facing).toBe(-1);
    const strike = stepWorld(world, 8, (i) => input({ attackPressed: i === 0 }));
    expect(strike.some((e) => e.type === 'switchHit')).toBe(true);
    const snap = stepWorld(world, 1, () => input({ backtracePressed: true }));
    expect(snap.some((e) => e.type === 'backtrace')).toBe(true);
    expect(world.player.feetX).toBeGreaterThan(70 * TILE_SIZE);
    const through = stepWorld(world, 90, () => input({ moveX: 1 }));
    expect(world.player.body.x).toBeGreaterThan(GATE_RIGHT);
    expect(through.some((e) => e.type === 'gateLatched')).toBe(true);
    expect(world.progression.latchedGates.has('transit:timedGate')).toBe(true);
  });

  it('never closes on top of the player, and closes once they step out', () => {
    const world = worldAt('transit', 72, 25);
    world.room.enemies = [];
    world.room.switches[0]!.takeHit();
    stepWorld(world, 30, () => input({ moveX: 1 })); // step into the gate column
    const gate = world.room.timedGate!;
    expect(world.player.body.x + world.player.body.w).toBeGreaterThan(gate.rect.x);
    // Hold position inside the doorway well past the timer.
    world.player.body.x = gate.rect.x + 2;
    stepWorld(world, Math.ceil(2 / DT));
    expect(gate.open).toBe(true);
    expect(world.room.grid.rectOverlapsSolid(world.player.body)).toBe(false);
    stepWorld(world, 60, () => input({ moveX: -1 }));
    expect(gate.open).toBe(false);
    expect(world.room.grid.isSolid(74, 24)).toBe(true);
  });

  it('stays open for good once passed, across death and retry', () => {
    const world = worldAt('transit', 76, 25);
    world.room.enemies = [];
    const events = stepWorld(world, 2);
    expect(events.some((e) => e.type === 'gateLatched')).toBe(true);
    world.player.takeDamage(99, 0, () => {});
    stepWorld(world, Math.ceil(FLOW.deathAnimation / DT) + 2);
    world.retry();
    expect(world.room.timedGate?.latched).toBe(true);
    expect(world.room.grid.isSolid(74, 24)).toBe(false);
  });

  it('the Backtrace module unlocks the ability, which survives death and retry', () => {
    const world = worldAt('transit', 31, 7);
    expect(world.progression.has('backtrace')).toBe(false);
    const events = stepWorld(world, 2);
    expect(events.some((e) => e.type === 'abilityUnlocked')).toBe(true);
    expect(world.progression.has('backtrace')).toBe(true);
    world.player.takeDamage(99, 0, () => {});
    stepWorld(world, Math.ceil(FLOW.deathAnimation / DT) + 2);
    expect(world.flow.state).toBe('gameover');
    expect(world.retry()).toBe(true);
    expect(world.progression.has('backtrace')).toBe(true);
    expect(world.room.pickups.find((p) => p.kind === 'backtrace')?.taken).toBe(true);
  });
});

describe('Checkpoints, death and retry', () => {
  it('activates a sync relay on touch, heals, saves, and respawns there after death', () => {
    let saved = 0;
    const world = worldAt('alley', 9, 19, undefined, () => saved++);
    world.room.enemies = [];
    world.player.takeDamage(2, 0, () => {});
    stepWorld(world, 130); // wait out stun / invulnerability
    const events = stepWorld(world, 60, () => input({ moveX: 1 }));
    const cp = events.find((e) => e.type === 'checkpoint');
    expect(cp).toBeDefined();
    expect(saved).toBe(1);
    expect(world.player.health.current).toBe(PLAYER.maxHealth);
    expect(world.progression.checkpoint).toEqual({ roomId: 'alley', x: tileX(13), y: tileFeet(19) });

    // Walk away, die, and come back.
    stepWorld(world, 60, () => input({ moveX: 1 }));
    world.player.takeDamage(99, 0, () => {});
    stepWorld(world, 1);
    expect(world.flow.state).toBe('dying');
    stepWorld(world, Math.ceil(FLOW.deathAnimation / DT) + 1);
    expect(world.flow.state).toBe('gameover');
    expect(world.progression.deaths).toBe(1);
    expect(world.retry()).toBe(true);
    expect(world.flow.state).toBe('playing');
    expect(world.player.dead).toBe(false);
    expect(world.player.health.current).toBe(PLAYER.maxHealth);
    expect(world.player.feetX).toBeCloseTo(tileX(13), 5);
    expect(world.player.feetY).toBeCloseTo(tileFeet(19), 5);
    // Enemies are restored on respawn.
    expect(world.room.enemies.length).toBe(2);
  });

  it('death while attacking leaves a clean, controllable player after retry', () => {
    const world = worldAt('alley', 9, 19);
    world.room.enemies = [];
    stepWorld(world, 1 + Math.ceil(COMBAT.attack.startup / DT), (i) => input({ attackPressed: i === 0 }));
    expect(world.player.attackPhase).toBe('active');
    world.player.takeDamage(99, 0, () => {});
    stepWorld(world, Math.ceil(FLOW.deathAnimation / DT) + 2, () => input({ attackPressed: true, moveX: 1 }));
    expect(world.flow.state).toBe('gameover');
    world.retry();
    expect(world.player.attackPhase).toBe('none');
    const events = stepWorld(world, 3, (i) => input({ attackPressed: i === 0 }));
    expect(events.some((e) => e.type === 'playerAttack')).toBe(true);
  });

  it('constant overlap with an enemy only deals damage once per invulnerability window', () => {
    const world = worldAt('alley', 9, 19);
    const hound = world.room.enemies[0] as ScrapHound;
    world.room.enemies = [hound];
    const hurts: GameEvent[] = [];
    const seconds = 2.5;
    for (let i = 0; i < Math.round(seconds / DT); i++) {
      // Pin the enemy onto the player every step.
      hound.body.x = world.player.body.x;
      hound.body.y = world.player.body.y + world.player.body.h - hound.body.h;
      world.step(input(), DT);
      hurts.push(...world.drainEvents().filter((e) => e.type === 'playerHurt'));
    }
    expect(hurts.length).toBe(Math.floor(seconds / PLAYER.hurt.invulnerability) + 1);
  });

  it('a live-current pit costs one integrity and returns the player to safe ground', () => {
    const world = worldAt('transit', 38, 25);
    world.room.enemies = [];
    let respawned = false;
    for (let i = 0; i < 240 && !respawned; i++) {
      world.step(input({ moveX: 1 }), DT);
      respawned = world.drainEvents().some((e) => e.type === 'hazardRespawn');
    }
    expect(respawned).toBe(true);
    expect(world.player.health.current).toBe(PLAYER.maxHealth - 1);
    // Back on the near ledge (the pit starts at col 41), standing on real ground.
    expect(world.player.body.x + world.player.body.w).toBeLessThanOrEqual(41 * TILE_SIZE + 1);
    expect(world.room.grid.isStandable(world.room.grid.colAt(world.player.body.x + 1), 26)).toBe(true);
    expect(world.player.health.isInvulnerable).toBe(true);
  });
});

describe('Combat integration', () => {
  it('each swing hits a target at most once', () => {
    const world = worldAt('alley', 9, 19);
    const hound = new ScrapHound('test-hound', world.player.feetX + 20, world.player.feetY);
    world.room.enemies = [hound];
    world.player.facing = 1;
    world.player.health.grantInvulnerability(5);
    stepWorld(world, ATTACK_CYCLE_STEPS, (i) => input({ attackPressed: i === 0 }));
    expect(hound.health.current).toBe(ENEMIES.scrapHound.health - 1);
  });

  it('enemies die after enough hits and are removed', () => {
    const world = worldAt('alley', 9, 19);
    const hound = new ScrapHound('test-hound', world.player.feetX + 20, world.player.feetY);
    world.room.enemies = [hound];
    world.player.health.grantInvulnerability(30);
    const events: GameEvent[] = [];
    for (let swing = 0; swing < 6 && hound.isAlive(); swing++) {
      // Re-centre the hound in front of the player each swing (knockback pushes it away).
      hound.body.x = world.player.body.x + world.player.body.w + 4;
      hound.body.vx = 0;
      world.player.facing = 1;
      events.push(...stepWorld(world, ATTACK_CYCLE_STEPS, (i) => input({ attackPressed: i === 0 })));
    }
    expect(hound.isAlive()).toBe(false);
    expect(world.room.enemies).toHaveLength(0);
    expect(events.some((e) => e.type === 'enemyDied')).toBe(true);
  });

  it('attacks do not connect through walls', () => {
    // The breakable wall at col 5 in the alley separates the start area from the secret alcove.
    const world = worldAt('alley', 7, 19);
    const hound = new ScrapHound('alcove-hound', tileX(4), tileFeet(19));
    world.room.enemies = [hound];
    world.room.walls = []; // treat the wall as plain rock for this test
    stepWorld(world, 2, () => input({ moveX: -1 }));
    stepWorld(world, ATTACK_CYCLE_STEPS, (i) => input({ attackPressed: i === 0 }));
    expect(hound.health.current).toBe(ENEMIES.scrapHound.health);
  });

  it('a downward strike on an enemy bounces the player (pogo)', () => {
    const world = worldAt('alley', 9, 19);
    const hound = new ScrapHound('pogo-hound', world.player.feetX, world.player.feetY);
    world.room.enemies = [hound];
    world.player.health.grantInvulnerability(30);
    world.player.body.y -= 40;
    let pogo = false;
    for (let i = 0; i < 60 && !pogo; i++) {
      world.step(input({ moveY: 1, attackPressed: i === 2 }), DT);
      pogo = world.drainEvents().some((e) => e.type === 'playerPogo');
      hound.body.x = world.player.centerX - hound.body.w / 2;
    }
    expect(pogo).toBe(true);
    expect(world.player.body.vy).toBeLessThan(0);
  });
});

describe('Secret: cracked wall and Integrity Cell', () => {
  it('breaks after three strikes, reveals an Integrity Cell (+1 max health), and stays broken', () => {
    const world = worldAt('alley', 7, 19);
    world.room.enemies = [];
    stepWorld(world, 2, () => input({ moveX: -1 }));
    expect(world.player.facing).toBe(-1);
    const events: GameEvent[] = [];
    for (let s = 0; s < 3; s++) events.push(...stepWorld(world, ATTACK_CYCLE_STEPS, (i) => input({ attackPressed: i === 0 })));
    expect(events.some((e) => e.type === 'wallBroken')).toBe(true);
    expect(world.room.grid.get(5, 18)).toBe(Tile.Empty);
    const more = stepWorld(world, 120, () => input({ moveX: -1 }));
    expect(more.some((e) => e.type === 'secretFound')).toBe(true);
    expect(world.player.health.max).toBe(PLAYER.maxHealth + 1);

    world.player.takeDamage(99, 0, () => {});
    stepWorld(world, Math.ceil(FLOW.deathAnimation / DT) + 2);
    world.retry();
    expect(world.player.health.max).toBe(PLAYER.maxHealth + 1);
    expect(world.room.grid.get(5, 18)).toBe(Tile.Empty);
    expect(world.room.pickups.find((p) => p.kind === 'cell')?.taken).toBe(true);
  });
});

describe('Room transitions', () => {
  it('walking through the east door of Rainline Alley leads to Transit Stacks', () => {
    const world = worldAt('alley', 60, 19);
    world.room.enemies = [];
    for (let i = 0; i < 120 && !world.pendingTransition; i++) world.step(input({ moveX: 1 }), DT);
    expect(world.pendingTransition).toEqual({ room: 'transit', entry: 'west' });
    // The simulation holds still while the screen fades.
    const x = world.player.body.x;
    world.step(input({ moveX: 1 }), DT);
    expect(world.player.body.x).toBe(x);
    world.completeTransition();
    expect(world.room.def.id).toBe('transit');
    expect(world.player.feetX).toBeCloseTo(tileX(3), 5);
    expect(world.drainEvents().some((e) => e.type === 'roomEntered')).toBe(true);
  });
});

describe('Game flow', () => {
  it('pausing freezes the simulation and resuming continues it', () => {
    const world = worldAt('alley', 9, 19);
    stepWorld(world, 10);
    expect(world.pause()).toBe(true);
    const x = world.player.body.x;
    const houndX = world.room.enemies[0]!.body.x;
    stepWorld(world, 120, () => input({ moveX: 1 }));
    expect(world.player.body.x).toBe(x);
    expect(world.room.enemies[0]!.body.x).toBe(houndX);
    expect(world.resume()).toBe(true);
    stepWorld(world, 30, () => input({ moveX: 1 }));
    expect(world.player.body.x).toBeGreaterThan(x);
  });

  it('pause menu "restart" respawns at the checkpoint', () => {
    const world = worldAt('alley', 9, 19);
    world.room.enemies = [];
    stepWorld(world, 30, () => input({ moveX: -1 })); // walk away from the checkpoint at col 13
    world.pause();
    expect(world.retry()).toBe(true);
    expect(world.flow.state).toBe('playing');
    expect(world.player.feetX).toBeCloseTo(tileX(9), 5);
  });

  it('rejects illegal transitions', () => {
    const world = worldAt('alley', 9, 19);
    expect(world.retry()).toBe(false); // can't retry while playing
    expect(world.resume()).toBe(false);
    world.player.takeDamage(99, 0, () => {});
    stepWorld(world, 1);
    expect(world.pause()).toBe(false); // can't pause while dying
    expect(world.retry()).toBe(false); // must wait for the game-over prompt
  });

  it('defeating BULWARK-9 seals then reopens the gate and leads to victory', () => {
    const world = worldAt('precinct', 2, 15);
    const run = (frames: number, f: (i: number) => InputFrame = () => input()) => stepWorld(world, frames, f);
    world.player.health.grantInvulnerability(999);
    const events = run(120, () => input({ moveX: 1 }));
    expect(events.some((e) => e.type === 'bossStart')).toBe(true);
    expect(world.room.gateClosed).toBe(true);
    expect(world.room.grid.isSolid(5, 14)).toBe(true);

    const boss = world.room.boss!;
    const all: GameEvent[] = [];
    for (let i = 0; i < 120 * 30 && boss.isAlive(); i++) {
      world.player.health.grantInvulnerability(1);
      if (i % 12 === 0) boss.takeHit(1, 1, 0);
      all.push(...run(1));
    }
    expect(boss.isAlive()).toBe(false);
    all.push(...run(2));
    expect(all.some((e) => e.type === 'bossDefeated')).toBe(true);
    expect(world.room.gateClosed).toBe(false);
    expect(world.progression.bossDefeated).toBe(true);
    expect(world.flow.state).toBe('playing');
    run(Math.ceil(BOSS.bulwarkUnit.victoryDelay / DT) + 2);
    expect(world.flow.state).toBe('victory');
  });

  it('dying to the boss resets the encounter on retry', () => {
    const world = worldAt('precinct', 2, 15);
    stepWorld(world, 120, () => input({ moveX: 1 }));
    expect(world.room.boss?.isActive).toBe(true);
    world.player.takeDamage(99, 0, () => {});
    stepWorld(world, Math.ceil(FLOW.deathAnimation / DT) + 2);
    world.retry();
    expect(world.room.boss?.state).toBe('dormant');
    expect(world.room.gateClosed).toBe(false);
    expect(world.room.grid.isSolid(5, 14)).toBe(false);
  });
});
