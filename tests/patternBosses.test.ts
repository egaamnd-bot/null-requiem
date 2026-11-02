import { describe, expect, it } from 'vitest';
import { KILN_7, THE_NULL } from '../src/config/bossTuning';
import { Kiln7 } from '../src/core/bosses/kiln7';
import type { PatternBoss } from '../src/core/bosses/patternBoss';
import { TheNull } from '../src/core/bosses/theNull';
import type { EnemyContext } from '../src/core/enemies/enemy';
import type { GameEvent } from '../src/core/events';
import { createRng } from '../src/core/math';
import type { ProjectileSpec } from '../src/core/projectile';
import { DT, gridFrom } from './helpers';

const COLS = 60;
const ROWS = 20;
function arenaGrid() {
  const rows: string[] = ['#'.repeat(COLS)];
  for (let r = 1; r < ROWS - 2; r++) rows.push('#' + '.'.repeat(COLS - 2) + '#');
  rows.push('#'.repeat(COLS), '#'.repeat(COLS));
  return gridFrom(rows);
}
const ARENA = { left: 16, right: (COLS - 1) * 16, ceilingY: 16, floorY: (ROWS - 2) * 16 };

function rig(seed = 5) {
  const grid = arenaGrid();
  const projectiles: ProjectileSpec[] = [];
  const events: GameEvent[] = [];
  const spawned: { type: string; x: number; y: number; elite?: boolean }[] = [];
  const player = { x: 300, y: ARENA.floorY - 11 };
  const ctx: EnemyContext = {
    grid,
    dt: DT,
    playerX: player.x,
    playerY: player.y,
    playerAlive: true,
    spawnProjectile: (s) => projectiles.push(s),
    emit: (e) => events.push(e),
    rng: createRng(seed),
    spawnEnemy: (type, x, y, elite) => spawned.push({ type, x, y, elite }),
  };
  const step = (boss: PatternBoss, seconds: number, each?: () => void) => {
    for (let i = 0; i < Math.round(seconds / DT); i++) {
      ctx.playerX = player.x;
      ctx.playerY = player.y;
      boss.update(ctx);
      boss.flushPhaseChange((e) => events.push(e));
      each?.();
    }
  };
  /** Advance until the boss reaches a stage (or time runs out). */
  const until = (boss: PatternBoss, stage: string, max = 12, each?: () => void): boolean => {
    for (let i = 0; i < Math.round(max / DT); i++) {
      if (boss.stage === stage) return true;
      step(boss, DT, each);
    }
    return boss.stage === stage;
  };
  return { grid, projectiles, events, spawned, player, ctx, step, until };
}

describe('PatternBoss lifecycle (via KILN-7)', () => {
  const mk = () => new Kiln7('k', 30 * 16, ARENA.floorY, ARENA);

  it('is dormant until activated, then runs intro -> idle -> telegraph', () => {
    const r = rig();
    const b = mk();
    r.step(b, 1);
    expect(b.stage).toBe('dormant');
    expect(b.isActive).toBe(false);
    b.activate();
    expect(b.stage).toBe('intro');
    expect(r.until(b, 'idle', 3)).toBe(true);
    expect(r.until(b, 'telegraph', 3)).toBe(true);
    expect(b.attack).not.toBeNull();
  });

  it('cannot be hurt unless it is exposed (clang), and takes damage in its vulnerability window', () => {
    const r = rig();
    const b = mk();
    b.activate();
    r.until(b, 'idle');
    const hp = b.health.current;
    expect(b.takeHit(5, 1, 0).killed).toBe(false);
    expect(b.health.current).toBe(hp);
    // Drive an attack that exposes it.
    let exposedSeen = false;
    for (let i = 0; i < 6 && !exposedSeen; i++) {
      r.until(b, 'exposed', 8);
      if (b.stage === 'exposed') {
        exposedSeen = true;
        b.takeHit(1, 1, 0);
        expect(b.health.current).toBe(hp - 1);
      }
    }
    expect(exposedSeen).toBe(true);
  });

  it('telegraphed hazards are harmless until they turn active, then hurt, then vanish', () => {
    const r = rig();
    const b = mk();
    b.activate();
    r.until(b, 'telegraph');
    expect(b.hazards.length).toBeGreaterThan(0);
    const harmlessDuringTelegraph = b.hazards.every((h) => h.state === 'telegraph') && b.damageSources().length === 1;
    expect(harmlessDuringTelegraph).toBe(true); // only the contact body
    r.until(b, 'active');
    r.step(b, DT * 2);
    if (b.attack?.name !== 'emberRain') {
      expect(b.hazards.some((h) => h.state === 'active')).toBe(true);
      expect(b.damageSources().length).toBeGreaterThan(1);
    }
    r.until(b, 'idle', 8);
    expect(b.hazards.length).toBe(0);
  });

  it('moves through phases at its health thresholds and announces them once each', () => {
    const r = rig();
    const b = mk();
    b.activate();
    // Force exposure so damage lands.
    const hurt = (n: number) => {
      for (let i = 0; i < n; i++) {
        r.until(b, 'exposed', 20);
        b.takeHit(1, 1, 0);
        r.step(b, 0.05);
      }
    };
    expect(b.phase).toBe(1);
    const toPhase2 = Math.ceil(KILN_7.health * (1 - KILN_7.phase2)) + 1;
    hurt(toPhase2);
    expect(b.phase).toBe(2);
    const toPhase3 = Math.ceil(KILN_7.health * (KILN_7.phase2 - KILN_7.phase3)) + 1;
    hurt(toPhase3);
    expect(b.phase).toBe(3);
    expect(r.events.filter((e) => e.type === 'bossPhase').map((e) => (e as { phase: number }).phase)).toEqual([2, 3]);
  });

  it('dies through a dying stage, clears hazards, and flags defeated exactly once', () => {
    const r = rig();
    const b = mk();
    b.activate();
    r.until(b, 'exposed', 20);
    expect(b.takeHit(999, 1, 0).killed).toBe(true);
    expect(b.stage).toBe('dying');
    expect(b.isAlive()).toBe(false);
    expect(b.damageSources()).toHaveLength(0);
    expect(b.defeated).toBe(false);
    r.step(b, KILN_7.deathTime + 0.2);
    expect(b.stage).toBe('dead');
    expect(b.defeated).toBe(true);
    expect(b.takeHit(1, 1, 0).killed).toBe(false);
  });
});

describe('KILN-7 attacks', () => {
  it('piston slam telegraphs three lanes around the Courier, then slams, then exposes the core', () => {
    const r = rig();
    const b = new Kiln7('k', 30 * 16, ARENA.floorY, ARENA);
    r.player.x = 400;
    b.activate();
    let sawPiston = false;
    for (let guard = 0; guard < 8 && !sawPiston; guard++) {
      r.until(b, 'telegraph', 10);
      if (b.attack?.name === 'pistonSlam') {
        sawPiston = true;
        expect(b.hazards).toHaveLength(KILN_7.piston.lanes);
        const xs = b.hazards.map((h) => h.rect.x + h.rect.w / 2).sort((a, c) => a - c);
        expect(xs[1]).toBeCloseTo(400, 0);
        expect(xs[2]! - xs[1]!).toBeCloseTo(KILN_7.piston.laneSpacing, 0);
        expect(b.hazards.every((h) => h.rect.h === ARENA.floorY - ARENA.ceilingY && h.damage === KILN_7.piston.damage)).toBe(true);
        r.until(b, 'exposed', 3);
        expect(b.stage).toBe('exposed');
      }
      r.until(b, 'idle', 6);
    }
    expect(sawPiston).toBe(true);
  });

  it('ember rain only appears from phase 2 and releases exactly its count of falling rounds', () => {
    const r1 = rig(1);
    const b1 = new Kiln7('k', 30 * 16, ARENA.floorY, ARENA);
    b1.activate();
    const names1 = new Set<string>();
    for (let i = 0; i < 14; i++) {
      r1.until(b1, 'telegraph', 10);
      if (b1.attack) names1.add(b1.attack.name);
      r1.until(b1, 'idle', 8);
    }
    expect(names1.has('emberRain')).toBe(false);
    expect(names1.has('furnaceSweep')).toBe(false);

    const r2 = rig(2);
    const b2 = new Kiln7('k', 30 * 16, ARENA.floorY, ARENA);
    b2.activate();
    (b2 as unknown as { phase: number }).phase = 2;
    let found = false;
    for (let i = 0; i < 24 && !found; i++) {
      r2.until(b2, 'telegraph', 10);
      if (b2.attack?.name === 'emberRain') {
        found = true;
        const before = r2.projectiles.length;
        r2.until(b2, 'recover', 6);
        const rain = r2.projectiles.slice(before).filter((p) => p.kind === 'plasmaRain');
        expect(rain).toHaveLength(KILN_7.ember.count);
        expect(rain.every((p) => p.vy > 0 && p.gravity! > 0)).toBe(true);
      }
      r2.until(b2, 'idle', 8);
    }
    expect(found).toBe(true);
  });

  it('furnace sweep (phase 3) sends a shock front from each side, announced first', () => {
    const r = rig(3);
    const b = new Kiln7('k', 30 * 16, ARENA.floorY, ARENA);
    b.activate();
    (b as unknown as { phase: number }).phase = 3;
    let found = false;
    for (let i = 0; i < 30 && !found; i++) {
      r.until(b, 'telegraph', 10);
      if (b.attack?.name === 'furnaceSweep') {
        found = true;
        expect(r.projectiles.filter((p) => p.kind === 'shockwave')).toHaveLength(0);
        r.until(b, 'exposed', 4);
        const waves = r.projectiles.filter((p) => p.kind === 'shockwave');
        expect(waves).toHaveLength(2);
        expect(Math.sign(waves[0]!.vx)).toBe(-Math.sign(waves[1]!.vx));
      }
      r.until(b, 'idle', 8);
    }
    expect(found).toBe(true);
  });

  it('never repeats a fight-stalling pattern: a slam (opening) comes at least every third attack', () => {
    const r = rig(9);
    const b = new Kiln7('k', 30 * 16, ARENA.floorY, ARENA);
    b.activate();
    const seq: string[] = [];
    for (let i = 0; i < 12; i++) {
      r.until(b, 'telegraph', 10);
      seq.push(b.attack!.name);
      r.until(b, 'idle', 10);
    }
    for (let i = 0; i + 2 < seq.length; i++) {
      expect(seq.slice(i, i + 3).some((n) => n === 'pistonSlam' || n === 'furnaceSweep')).toBe(true);
    }
  });
});

describe('THE NULL', () => {
  const mk = () => new TheNull('n', 30 * 16, ARENA.floorY - 60, ARENA);
  const runUntilAttack = (r: ReturnType<typeof rig>, b: TheNull, name: string, tries = 40): boolean => {
    for (let i = 0; i < tries; i++) {
      r.until(b, 'telegraph', 10);
      if (b.attack?.name === name) return true;
      r.until(b, 'idle', 10);
    }
    return false;
  };

  it('imprint lands where the Courier WAS when it was marked, not where they ran to', () => {
    const r = rig(4);
    const b = mk();
    r.player.x = 200;
    b.activate();
    expect(runUntilAttack(r, b, 'imprint')).toBe(true);
    const mark = b.marks.find((m) => m.kind === 'imprint')!;
    expect(mark.x).toBeCloseTo(200, 0);
    expect(mark.total).toBeCloseTo(THE_NULL.imprint.telegraph, 1);
    r.player.x = 700; // the Courier moves away during the telegraph
    r.until(b, 'active', 5);
    r.step(b, DT);
    const spike = b.hazards.find((h) => h.style === 'spike')!;
    expect(spike.rect.x + spike.rect.w / 2).toBeCloseTo(200, 0);
    expect(spike.state).toBe('active');
    expect(spike.damage).toBe(THE_NULL.imprint.damage);
    r.until(b, 'exposed', 3);
    expect(b.exposed).toBe(true);
  });

  it('the imprint telegraph is long enough to react to (>= 2s) and never longer than a Backtrace window', () => {
    expect(THE_NULL.imprint.telegraph).toBeGreaterThanOrEqual(2);
    expect(THE_NULL.imprint.telegraph).toBeLessThanOrEqual(THE_NULL.echoWindow);
  });

  it('rewind: heals when the Courier is elsewhere, and the afterimage is shown during the telegraph', () => {
    const r = rig(6);
    const b = mk();
    b.activate();
    // Give it history by letting it move around a bit during the intro.
    r.step(b, 5);
    (b as unknown as { body: { x: number } }).body.x += 200; // jump away so the 4s-old position is distinct
    r.step(b, 0.2);
    b.health.tryDamage(10, 0);
    const hp = b.health.current;
    let done = false;
    for (let i = 0; i < 60 && !done; i++) {
      if (runUntilAttack(r, b, 'rewind', 3)) {
        expect(b.marks.some((m) => m.kind === 'echo')).toBe(true);
        expect(b.echo).not.toBeNull();
        r.player.x = 900; // far from the afterimage
        r.until(b, 'recover', 6);
        expect(b.lastRewindWasTelefrag).toBe(false);
        expect(b.health.current).toBeGreaterThan(hp - 1);
        done = true;
      } else {
        r.step(b, 1);
      }
    }
    expect(done).toBe(true);
  });

  it('telefrag: standing on the afterimage when it lands damages the Null, skips the heal and exposes it', () => {
    const r = rig(8);
    const b = mk();
    b.activate();
    r.step(b, 5);
    (b as unknown as { body: { x: number } }).body.x += 220;
    r.step(b, 0.2);
    let done = false;
    for (let i = 0; i < 60 && !done; i++) {
      if (runUntilAttack(r, b, 'rewind', 3)) {
        const echo = b.echo!;
        r.player.x = echo.x;
        r.player.y = echo.y;
        const hp = b.health.current;
        r.until(b, 'exposed', 4);
        expect(b.lastRewindWasTelefrag).toBe(true);
        expect(b.health.current).toBe(hp - THE_NULL.rewind.telefragDamage);
        expect(b.exposed).toBe(true);
        expect(r.events.some((e) => e.type === 'echoRewind')).toBe(true);
        done = true;
      } else {
        r.step(b, 1);
      }
    }
    expect(done).toBe(true);
  });

  it('does not choose rewind when it has no history to rewind to', () => {
    const r = rig(10);
    const b = mk();
    b.activate();
    const names = new Set<string>();
    // First attacks happen immediately after the intro with a stationary boss: rewind distance < minDistance.
    for (let i = 0; i < 6; i++) {
      r.until(b, 'telegraph', 10);
      names.add(b.attack!.name);
      r.until(b, 'idle', 10);
    }
    expect(names.has('rewind')).toBe(false);
  });

  it('summons Null Echoes in phase 3 through the world callback', () => {
    const r = rig(12);
    const b = mk();
    b.activate();
    (b as unknown as { phase: number }).phase = 3;
    expect(runUntilAttack(r, b, 'echoSummon', 60)).toBe(true);
    r.until(b, 'exposed', 4);
    expect(r.spawned.filter((s) => s.type === 'nullEcho')).toHaveLength(THE_NULL.summon.count);
  });

  it('null beams telegraph a beam on the Courier plus spread beams, then fire', () => {
    const r = rig(14);
    const b = mk();
    b.activate();
    (b as unknown as { phase: number }).phase = 2;
    r.player.x = 500;
    expect(runUntilAttack(r, b, 'nullBeams', 60)).toBe(true);
    expect(b.hazards).toHaveLength(THE_NULL.beams.count);
    expect(b.hazards.some((h) => Math.abs(h.rect.x + h.rect.w / 2 - 500) < 1)).toBe(true);
    r.until(b, 'active', 3);
    r.step(b, DT);
    expect(b.hazards.some((h) => h.state === 'active')).toBe(true);
  });

  it('every third attack is an imprint so the fight always opens', () => {
    const r = rig(20);
    const b = mk();
    b.activate();
    const seq: string[] = [];
    for (let i = 0; i < 9; i++) {
      r.until(b, 'telegraph', 10);
      seq.push(b.attack!.name);
      r.until(b, 'idle', 12);
    }
    for (let i = 0; i + 2 < seq.length; i++) expect(seq.slice(i, i + 3)).toContain('imprint');
  });
});
