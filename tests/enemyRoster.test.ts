import { describe, expect, it } from 'vitest';
import { HEAVY_ENFORCER, NULL_ECHO, PHASE_STALKER, SENTRY_TURRET, STREET_SCAVENGER } from '../src/config/enemyTuning';
import type { EnemyContext } from '../src/core/enemies/enemy';
import { HeavyEnforcer } from '../src/core/enemies/heavyEnforcer';
import { NullEcho } from '../src/core/enemies/nullEcho';
import { PhaseStalker } from '../src/core/enemies/phaseStalker';
import { createEnemy, ENEMY_TYPES, spawnsOnGround } from '../src/core/enemies/registry';
import { clampAim, mountNormal, SentryTurret } from '../src/core/enemies/sentryTurret';
import { StreetScavenger } from '../src/core/enemies/streetScavenger';
import { ScrapHound } from '../src/core/enemies/scrapHound';
import { WatcherDrone } from '../src/core/enemies/watcherDrone';
import type { GameEvent } from '../src/core/events';
import { createRng } from '../src/core/math';
import type { ProjectileSpec } from '../src/core/projectile';
import { canStandAt, findStandSpot } from '../src/core/spots';
import type { TileGrid } from '../src/core/tiles';
import { DT, gridFrom, tileFeet, tileX } from './helpers';

function arena(cols = 48): string[] {
  const rows: string[] = ['#'.repeat(cols)];
  for (let r = 1; r < 14; r++) rows.push('#' + '.'.repeat(cols - 2) + '#');
  rows.push('#'.repeat(cols), '#'.repeat(cols));
  return rows;
}

interface Harness {
  ctx: EnemyContext;
  projectiles: ProjectileSpec[];
  events: GameEvent[];
  player: { x: number; y: number };
  run(enemy: { update(c: EnemyContext): void }, seconds: number, each?: () => void): void;
}

function harness(grid: TileGrid, player: { x: number; y: number }, extra: Partial<EnemyContext> = {}): Harness {
  const projectiles: ProjectileSpec[] = [];
  const events: GameEvent[] = [];
  const ctx: EnemyContext = {
    grid,
    dt: DT,
    playerX: player.x,
    playerY: player.y,
    playerAlive: true,
    spawnProjectile: (s) => projectiles.push(s),
    emit: (e) => events.push(e),
    rng: createRng(11),
    ...extra,
  };
  const h: Harness = {
    ctx,
    projectiles,
    events,
    player,
    run(enemy, seconds, each) {
      for (let i = 0; i < Math.round(seconds / DT); i++) {
        ctx.playerX = h.player.x;
        ctx.playerY = h.player.y;
        enemy.update(ctx);
        each?.();
      }
    },
  };
  return h;
}

const feetRow = 13; // floor is row 14, so feet rest at tileFeet(13)
const playerAt = (col: number) => ({ x: tileX(col), y: tileFeet(feetRow) - 11 });

describe('enemy registry', () => {
  it('creates every enemy type with a unique kind, positive health and a placeholder-friendly id', () => {
    const kinds = new Set<string>();
    for (const type of ENEMY_TYPES) {
      const e = createEnemy({ type, id: `t-${type}`, x: 100, y: 100 });
      expect(e.health.max).toBeGreaterThan(0);
      expect(e.isAlive()).toBe(true);
      // A dormant Null Echo has no hostile surface until the Courier leaves a trail to mimic.
      if (type !== 'nullEcho') expect(e.damageSources().length).toBeGreaterThan(0);
      kinds.add(e.kind);
    }
    expect(kinds.size).toBe(ENEMY_TYPES.length);
  });

  it('elite variants differ in behaviour data (health at least), never weaker', () => {
    for (const type of ENEMY_TYPES) {
      const base = createEnemy({ type, id: 'a', x: 100, y: 100 });
      const elite = createEnemy({ type, id: 'b', x: 100, y: 100, elite: true });
      expect(elite.elite).toBe(true);
      expect(elite.health.max).toBeGreaterThanOrEqual(base.health.max);
    }
  });

  it('knows which types stand on the ground', () => {
    expect(spawnsOnGround('streetScavenger')).toBe(true);
    expect(spawnsOnGround('securityDrone')).toBe(false);
    expect(spawnsOnGround('sentryTurret')).toBe(false);
  });
});

describe('Street Scavenger', () => {
  it('patrols, chases a visible Courier, and only damages during the strike frames after a readable wind-up', () => {
    const grid = gridFrom(arena());
    const e = new StreetScavenger('s', tileX(10), tileFeet(feetRow));
    const h = harness(grid, playerAt(15));
    const seen = new Set<string>();
    h.run(e, 4, () => seen.add(e.state));
    expect(seen.has('chase')).toBe(true);
    // Park the Courier in swing range and watch the attack rhythm.
    h.player.x = e.centerX + 14;
    const strikeWhileWinding: boolean[] = [];
    h.run(e, 1.2, () => {
      if (e.state === 'windup') strikeWhileWinding.push(e.damageSources().length > 1);
      seen.add(e.state);
    });
    expect(seen.has('windup')).toBe(true);
    expect(seen.has('strike')).toBe(true);
    expect(strikeWhileWinding.some(Boolean)).toBe(false);
  });

  it('never walks off a ledge while chasing', () => {
    const rows: string[] = ['#'.repeat(30)];
    for (let r = 1; r < 7; r++) rows.push('#' + '.'.repeat(28) + '#');
    rows.push('#.....' + '#'.repeat(24)); // a short ledge: floor ends at column 5
    rows.push('#'.repeat(30), '#'.repeat(30));
    const grid = gridFrom(rows);
    const e = new StreetScavenger('s', tileX(2), tileFeet(7));
    const h = harness(grid, { x: tileX(14), y: tileFeet(7) - 11 });
    h.run(e, 4);
    expect(e.body.y + e.body.h).toBeLessThanOrEqual(tileFeet(7) + 0.01);
  });

  it('elite chains a second stab and throws a shiv from range', () => {
    const grid = gridFrom(arena());
    const e = new StreetScavenger('s', tileX(10), tileFeet(feetRow), true);
    const h = harness(grid, { x: tileX(10) + 14, y: tileFeet(feetRow) - 11 });
    let strikes = 0;
    let prev = '';
    h.run(e, 1.6, () => {
      if (e.state === 'strike' && prev !== 'strike') strikes++;
      prev = e.state;
    });
    expect(strikes).toBeGreaterThanOrEqual(2);

    const e2 = new StreetScavenger('s2', tileX(5), tileFeet(feetRow), true);
    const h2 = harness(grid, playerAt(5 + Math.ceil(STREET_SCAVENGER.eliteThrowMin / 16) + 1));
    h2.run(e2, 2);
    expect(h2.projectiles.some((p) => p.slashable)).toBe(true);
  });

  it('loses interest when it cannot see the Courier', () => {
    const grid = gridFrom(arena());
    const e = new StreetScavenger('s', tileX(10), tileFeet(feetRow));
    const h = harness(grid, playerAt(16));
    h.run(e, 1);
    expect(e.state).not.toBe('patrol');
    h.player.x = tileX(44);
    h.run(e, STREET_SCAVENGER.loseSightTime + 1.2);
    expect(['patrol', 'recover', 'windup', 'strike']).toContain(e.state);
  });
});

describe('Heavy Enforcer', () => {
  const frontalFromPlayerOnLeft = { dirX: 1, dirY: 0 }; // player attacks rightwards

  it('deflects ordinary frontal strikes with armour (no damage, blocked flag)', () => {
    const e = new HeavyEnforcer('h', tileX(20), tileFeet(feetRow));
    e.facing = -1; // facing the player on its left
    const before = e.health.current;
    const res = e.takeHit(1, frontalFromPlayerOnLeft.dirX, 0);
    expect(res.killed).toBe(false);
    expect(e.health.current).toBe(before);
    expect(e.blocked).toBe(true);
  });

  it('takes damage from behind, from above, from pierce hits, and when the plate is open', () => {
    const mk = () => {
      const e = new HeavyEnforcer('h', tileX(20), tileFeet(feetRow));
      e.facing = -1;
      return e;
    };
    const behind = mk();
    behind.takeHit(1, -1, 0); // attacker on its right, striking leftwards, enemy faces left => from behind
    expect(behind.health.current).toBe(HEAVY_ENFORCER.health - 1);
    const above = mk();
    above.takeHit(1, 0, 1);
    expect(above.health.current).toBe(HEAVY_ENFORCER.health - 1);
    const pierce = mk();
    pierce.takeHit(HEAVY_ENFORCER.armourPierce, 1, 0);
    expect(pierce.health.current).toBe(HEAVY_ENFORCER.health - HEAVY_ENFORCER.armourPierce);
    expect(pierce.blocked).toBe(false);
  });

  it('opens its plate during recovery after a slam, so patience beats mashing', () => {
    const grid = gridFrom(arena());
    const e = new HeavyEnforcer('h', tileX(20), tileFeet(feetRow));
    const h = harness(grid, playerAt(18));
    let sawRecover = false;
    let hitDuringRecover = false;
    h.run(e, 3.5, () => {
      if (e.state === 'recover' && !sawRecover) {
        sawRecover = true;
        const hp = e.health.current;
        e.takeHit(1, e.facing === 1 ? -1 : 1, 0); // from the front
        hitDuringRecover = e.health.current < hp;
      }
    });
    expect(sawRecover).toBe(true);
    expect(hitDuringRecover).toBe(true);
  });

  it('telegraphs with a long wind-up and fires a ground shockwave on slam; elite slams twice', () => {
    const grid = gridFrom(arena());
    const e = new HeavyEnforcer('h', tileX(20), tileFeet(feetRow));
    const h = harness(grid, playerAt(18));
    let windupSeconds = 0;
    h.run(e, 3, () => {
      if (e.state === 'windup') windupSeconds += DT;
    });
    expect(windupSeconds).toBeGreaterThan(0.6);
    expect(h.projectiles.filter((p) => p.kind === 'shockwave').length).toBe(1);

    const elite = new HeavyEnforcer('he', tileX(20), tileFeet(feetRow), true);
    const h2 = harness(grid, playerAt(18));
    h2.run(elite, 3);
    expect(h2.projectiles.filter((p) => p.kind === 'shockwave').length).toBeGreaterThanOrEqual(2);
  });
});

describe('Phase Stalker', () => {
  it('blinks near the Courier, is untargetable while phased, then telegraphs before striking', () => {
    const grid = gridFrom(arena());
    const e = new PhaseStalker('p', tileX(16), tileFeet(feetRow));
    const h = harness(grid, playerAt(8));
    let phasedHits = 0;
    const seen = new Set<string>();
    let minDist = Infinity;
    h.run(e, 6, () => {
      seen.add(e.state);
      if (e.phased) {
        expect(e.untargetable).toBe(true);
        const hp = e.health.current;
        e.takeHit(5, 1, 0);
        if (e.health.current !== hp) phasedHits++;
        expect(e.damageSources()).toHaveLength(0);
      }
      if (e.state === 'windup') minDist = Math.min(minDist, Math.abs(e.centerX - h.player.x));
    });
    expect(phasedHits).toBe(0);
    expect(seen.has('windup')).toBe(true);
    expect(minDist).toBeLessThan(PHASE_STALKER.blinkMax + 12);
    expect(minDist).toBeGreaterThanOrEqual(PHASE_STALKER.blinkMin - 12);
  });

  it('only lands a strike hitbox after the wind-up, and is open during recovery', () => {
    const grid = gridFrom(arena());
    const e = new PhaseStalker('p', tileX(20), tileFeet(feetRow));
    const h = harness(grid, playerAt(18));
    let damagedEarly = false;
    let hurtInRecover = false;
    h.run(e, 8, () => {
      if (e.state === 'windup' && e.damageSources().length > 1) damagedEarly = true;
      if (e.state === 'recover' && !hurtInRecover) {
        const hp = e.health.current;
        e.takeHit(1, 1, 0);
        hurtInRecover = e.health.current < hp;
      }
    });
    expect(damagedEarly).toBe(false);
    expect(hurtInRecover).toBe(true);
  });

  it('reacts to a Backtrace arrival by blinking straight to it', () => {
    const grid = gridFrom(arena());
    const e = new PhaseStalker('p', tileX(30), tileFeet(feetRow));
    const h = harness(grid, playerAt(25));
    h.run(e, 0.2); // still lurking
    expect(e.state).toBe('lurk');
    const arrival = { x: tileX(24), y: tileFeet(feetRow) - 11 };
    h.ctx.backtraceArrival = arrival;
    h.run(e, DT * 2);
    h.ctx.backtraceArrival = null;
    expect(e.reactedToBacktrace).toBe(true);
    expect(e.state === 'blinkOut' || e.state === 'blinkIn').toBe(true);
    h.run(e, 0.6);
    expect(Math.abs(e.centerX - arrival.x)).toBeLessThan(20);
  });

  it('punishes a motionless Courier by hunting immediately', () => {
    const grid = gridFrom(arena());
    const e = new PhaseStalker('p', tileX(15), tileFeet(feetRow));
    const h = harness(grid, playerAt(8), { playerStillTime: PHASE_STALKER.stillPunishTime + 0.1 });
    h.run(e, 0.1);
    expect(e.state).not.toBe('lurk');
  });

  it('elite performs a feint blink (two blinks) before committing', () => {
    const grid = gridFrom(arena());
    const e = new PhaseStalker('p', tileX(15), tileFeet(feetRow), true);
    const h = harness(grid, playerAt(8), { playerStillTime: 5 });
    let blinkOuts = 0;
    let prev = '';
    h.run(e, 2, () => {
      if (e.state === 'blinkOut' && prev !== 'blinkOut') blinkOuts++;
      prev = e.state;
    });
    expect(blinkOuts).toBeGreaterThanOrEqual(2);
  });
});

describe('Sentry Turret', () => {
  const floorTurret = () => new SentryTurret('t', tileX(24), tileFeet(feetRow) - 8, 'floor');

  it('clamps aim to its firing arc and refuses targets behind its mount', () => {
    expect(clampAim('floor', -Math.PI / 2).inArc).toBe(true);
    expect(clampAim('floor', Math.PI / 2).inArc).toBe(false);
    expect(mountNormal('left')).toBe(0);
    const clamped = clampAim('left', Math.PI * 0.9);
    expect(Math.abs(clamped.angle)).toBeLessThanOrEqual(SENTRY_TURRET.arc + 1e-9);
  });

  it('keeps its shield closed (clang) until it has fired a burst, then vents open', () => {
    const grid = gridFrom(arena());
    const e = floorTurret();
    const h = harness(grid, { x: tileX(24), y: tileFeet(feetRow) - 80 }); // straight above
    const hp = e.health.current;
    expect(e.takeHit(1, 1, 0).killed).toBe(false);
    expect(e.health.current).toBe(hp);
    expect(e.blocked).toBe(true);
    let opened = false;
    h.run(e, 4, () => {
      if (e.state === 'vent') opened = true;
    });
    expect(opened).toBe(true);
    // Fresh turret driven into the vent window takes damage.
    const e2 = floorTurret();
    const h2 = harness(grid, { x: tileX(24), y: tileFeet(feetRow) - 80 });
    h2.run(e2, 4, () => {
      if (e2.state === 'vent' && e2.health.current === e2.health.max) e2.takeHit(1, 1, 0);
    });
    expect(e2.health.current).toBe(e2.health.max - 1);
  });

  it('fires exactly its burst count of slashable bolts along the locked line (elite fires more)', () => {
    const grid = gridFrom(arena());
    const e = floorTurret();
    const h = harness(grid, { x: tileX(24), y: tileFeet(feetRow) - 80 });
    h.run(e, 3);
    expect(h.projectiles.length).toBeGreaterThanOrEqual(SENTRY_TURRET.burst);
    expect(h.projectiles.slice(0, SENTRY_TURRET.burst).every((p) => p.slashable && p.vy < 0)).toBe(true);

    const eliteT = new SentryTurret('te', tileX(24), tileFeet(feetRow) - 8, 'floor', true);
    const h2 = harness(grid, { x: tileX(24), y: tileFeet(feetRow) - 80 });
    h2.run(eliteT, 3);
    expect(h2.projectiles.length).toBeGreaterThanOrEqual(SENTRY_TURRET.eliteBurst);
  });

  it('ignores a Courier outside its arc or without line of sight', () => {
    const grid = gridFrom(arena());
    const below = new SentryTurret('t', tileX(24), tileFeet(feetRow) - 80, 'floor'); // floor mount facing up, player below
    const h = harness(grid, { x: tileX(24), y: tileFeet(feetRow) });
    h.run(below, 2);
    expect(h.projectiles).toHaveLength(0);
    // Wall between turret and Courier
    const walled = gridFrom(['#'.repeat(20), '#' + '.'.repeat(8) + '#' + '.'.repeat(9) + '#', '#' + '.'.repeat(8) + '#' + '.'.repeat(9) + '#', '#' + '.'.repeat(8) + '#' + '.'.repeat(9) + '#', '#'.repeat(20)]);
    const t2 = new SentryTurret('t2', tileX(3), tileFeet(2), 'left');
    const h2 = harness(walled, { x: tileX(14), y: tileFeet(2) - 8 });
    h2.run(t2, 2);
    expect(h2.projectiles).toHaveLength(0);
  });
});

describe('Null Echo', () => {
  it('stays dormant with no Courier history, and trails the recorded path once there is one', () => {
    const grid = gridFrom(arena());
    const e = new NullEcho('n', tileX(30), tileFeet(8));
    const noTrail = harness(grid, playerAt(5));
    noTrail.run(e, 1);
    expect(e.state).toBe('dormant');
    expect(e.damageSources()).toHaveLength(0);

    const path = { x: tileX(10), y: tileFeet(feetRow) - 11 };
    const h = harness(grid, playerAt(5), { trail: () => path });
    h.run(e, 4);
    expect(e.state).toBe('trail');
    expect(Math.hypot(e.centerX - path.x, e.centerY - path.y)).toBeLessThan(6);
    expect(e.damageSources().length).toBe(1);
  });

  it('passes through walls (a memory, not a body)', () => {
    const grid = gridFrom(['#'.repeat(20), '#...#######......#', '#...#######......#'.padEnd(20, '#').slice(0, 20), '#'.repeat(20)].map((r) => r.padEnd(20, '#').slice(0, 20)));
    const e = new NullEcho('n', tileX(2), tileFeet(1) - 6);
    const target = { x: tileX(14), y: tileFeet(1) - 6 };
    const h = harness(grid, { x: target.x, y: target.y }, { trail: () => target });
    h.run(e, 4);
    expect(Math.abs(e.centerX - target.x)).toBeLessThan(8);
  });

  it('has exactly burst-killable health so the Backtrace arrival burst answers it', () => {
    const e = new NullEcho('n', 100, 100);
    expect(e.takeHit(2, 1, 0).killed).toBe(true);
    const elite = new NullEcho('n2', 100, 100, true);
    expect(elite.takeHit(2, 1, 0).killed).toBe(false);
  });

  it('elite trails closer behind the Courier', () => {
    expect(NULL_ECHO.eliteDelay).toBeLessThan(NULL_ECHO.delay);
    const requested: number[] = [];
    const grid = gridFrom(arena());
    const e = new NullEcho('n', 100, 100, true);
    const h = harness(grid, playerAt(5), {
      trail: (s) => {
        requested.push(s);
        return { x: 100, y: 100 };
      },
    });
    h.run(e, 0.05);
    expect(requested.every((s) => s === NULL_ECHO.eliteDelay)).toBe(true);
  });
});

describe('legacy enemies keep working with elite flags', () => {
  it('elite hound and drone have more health and the drone fires a fan', () => {
    const grid = gridFrom(arena());
    const hound = new ScrapHound('h', tileX(5), tileFeet(feetRow), true);
    expect(hound.health.max).toBeGreaterThan(new ScrapHound('h2', 0, 0).health.max);
    const drone = new WatcherDrone('d', tileX(20), tileFeet(8), 0, true);
    const h = harness(grid, playerAt(24));
    h.run(drone, 3);
    expect(h.projectiles.length % 3).toBe(0);
    expect(h.projectiles.length).toBeGreaterThanOrEqual(3);
  });
});

describe('findStandSpot', () => {
  it('never returns a spot inside geometry and respects distance bounds', () => {
    const grid = gridFrom(arena());
    const rng = createRng(3);
    for (let i = 0; i < 40; i++) {
      const spot = findStandSpot(grid, tileX(24), tileFeet(feetRow), 12, 22, 30, 80, rng);
      expect(spot).not.toBeNull();
      expect(canStandAt(grid, spot!.feetX, spot!.feetY, 12, 22)).toBe(true);
      const dx = Math.abs(spot!.feetX - tileX(24));
      expect(dx).toBeGreaterThanOrEqual(30);
      expect(dx).toBeLessThanOrEqual(80);
    }
  });

  it('returns null when there is nowhere to stand', () => {
    const solid = gridFrom(['########', '########', '########']);
    expect(findStandSpot(solid, 40, 20, 12, 22, 0, 60, createRng(1))).toBeNull();
  });
});
