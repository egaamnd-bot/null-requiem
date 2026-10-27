import { describe, expect, it } from 'vitest';
import { BOSS, ENEMIES } from '../src/config/tuning';
import { Ashgrub } from '../src/core/enemies/ashgrub';
import type { EnemyContext } from '../src/core/enemies/enemy';
import { KilnWarden, type WardenAttack } from '../src/core/enemies/kilnWarden';
import { LanternWisp } from '../src/core/enemies/lanternWisp';
import type { GameEvent } from '../src/core/events';
import { createRng } from '../src/core/math';
import { Projectile, type ProjectileSpec } from '../src/core/projectile';
import type { TileGrid } from '../src/core/tiles';
import { DT, gridFrom, tileFeet, tileX } from './helpers';

function arenaRows(cols = 40): string[] {
  const rows: string[] = ['#'.repeat(cols)];
  for (let r = 1; r < 14; r++) rows.push('#' + '.'.repeat(cols - 2) + '#');
  rows.push('#'.repeat(cols), '#'.repeat(cols));
  return rows;
}

function makeCtx(grid: TileGrid, player: { x: number; y: number }, seed = 7) {
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
    rng: createRng(seed),
  };
  return { ctx, projectiles, events };
}

describe('Ashgrub (melee crawler)', () => {
  it('telegraphs with a wind-up, lunges, then recovers', () => {
    const grid = gridFrom(arenaRows());
    const g = new Ashgrub('g', tileX(10), tileFeet(13));
    const { ctx, events } = makeCtx(grid, { x: tileX(14), y: tileFeet(13) - 11 });
    const seen: string[] = [];
    for (let i = 0; i < 240; i++) {
      g.update(ctx);
      if (seen[seen.length - 1] !== g.state) seen.push(g.state);
    }
    // The player starts inside detection range, so it winds up immediately.
    expect(seen.slice(0, 4)).toEqual(['windup', 'lunge', 'recover', 'patrol']);
    expect(events.some((e) => e.type === 'enemyWindup')).toBe(true);
  });

  it('turns around at ledges instead of walking off', () => {
    const rows = arenaRows();
    // A floating platform (cols 5..14, row 13) above a pit (row 14 open).
    rows[13] = '#' + '.'.repeat(4) + '#'.repeat(10) + '.'.repeat(24) + '#';
    rows[14] = '#'.repeat(5) + '.'.repeat(30) + '#'.repeat(5);
    const grid = gridFrom(rows);
    const g = new Ashgrub('g', tileX(9), tileFeet(12));
    const { ctx } = makeCtx(grid, { x: -9999, y: -9999 });
    for (let i = 0; i < 120 * 20; i++) {
      g.update(ctx);
      expect(g.body.y + g.body.h).toBeCloseTo(tileFeet(12), 3);
    }
  });

  it('a hit during wind-up interrupts the attack; the lunge itself has armour', () => {
    const grid = gridFrom(arenaRows());
    const g = new Ashgrub('g', tileX(10), tileFeet(13));
    const { ctx } = makeCtx(grid, { x: tileX(14), y: tileFeet(13) - 11 });
    while (g.state !== 'windup') g.update(ctx);
    g.takeHit(1, 1, 0);
    expect(g.state).toBe('stagger');

    const g2 = new Ashgrub('g2', tileX(10), tileFeet(13));
    while (g2.state !== 'lunge') g2.update(ctx);
    g2.takeHit(1, -1, 0);
    expect(g2.state).toBe('lunge');
  });

  it('dies after its health is depleted and stops dealing damage', () => {
    const grid = gridFrom(arenaRows());
    const g = new Ashgrub('g', tileX(10), tileFeet(13));
    for (let i = 0; i < ENEMIES.ashgrub.health - 1; i++) expect(g.takeHit(1, 1, 0).killed).toBe(false);
    expect(g.takeHit(1, 1, 0).killed).toBe(true);
    expect(g.isAlive()).toBe(false);
    expect(g.damageSources()).toEqual([]);
    void grid;
  });
});

describe('Lantern Wisp (ranged flyer)', () => {
  it('winds up then fires a bolt aimed at the player', () => {
    const grid = gridFrom(arenaRows());
    const w = new LanternWisp('w', tileX(10), 80);
    const player = { x: tileX(16), y: 150 };
    const { ctx, projectiles, events } = makeCtx(grid, player);
    for (let i = 0; i < 240 && projectiles.length === 0; i++) w.update(ctx);
    expect(events.findIndex((e) => e.type === 'enemyWindup')).toBeGreaterThanOrEqual(0);
    expect(projectiles).toHaveLength(1);
    const p = projectiles[0]!;
    // Bolt heads toward the player.
    expect(Math.sign(p.vx)).toBe(Math.sign(player.x - (p.x + p.w / 2)));
    expect(Math.hypot(p.vx, p.vy)).toBeCloseTo(ENEMIES.lanternWisp.bolt.speed, 5);
  });

  it('cannot see (or shoot) the player through a wall', () => {
    const rows = arenaRows();
    for (let r = 1; r < 14; r++) rows[r] = rows[r]!.slice(0, 15) + '#' + rows[r]!.slice(16);
    const grid = gridFrom(rows);
    const w = new LanternWisp('w', tileX(10), 80);
    const { ctx, projectiles } = makeCtx(grid, { x: tileX(20), y: 100 });
    for (let i = 0; i < 120 * 6; i++) w.update(ctx);
    expect(projectiles).toHaveLength(0);
  });

  it('bolts burst on walls and can be destroyed by an attack', () => {
    const grid = gridFrom(arenaRows());
    const bolt = new Projectile({ kind: 'emberBolt', x: 560, y: 100, w: 8, h: 8, vx: 115, vy: 0, damage: 1, life: 5, slashable: true });
    const events: GameEvent[] = [];
    for (let i = 0; i < 120 && bolt.alive; i++) bolt.update(grid, DT, (e) => events.push(e));
    expect(bolt.alive).toBe(false);
    expect(bolt.x + bolt.w).toBeLessThanOrEqual(39 * 16 + 4);
    expect(events.some((e) => e.type === 'projectileBurst')).toBe(true);

    const bolt2 = new Projectile({ kind: 'emberBolt', x: 100, y: 100, w: 8, h: 8, vx: 0, vy: 0, damage: 1, life: 5, slashable: true });
    expect(bolt2.isAlive()).toBe(true);
    bolt2.takeHit();
    expect(bolt2.isAlive()).toBe(false);
  });
});

describe('Kiln Warden (miniboss)', () => {
  function makeBoss(seed = 3) {
    const grid = gridFrom(arenaRows(44));
    const boss = new KilnWarden('boss', tileX(30), tileFeet(13), { left: 16, right: 43 * 16, ceilingY: 16, floorY: 14 * 16 });
    const env = makeCtx(grid, { x: tileX(10), y: tileFeet(13) - 11 }, seed);
    return { grid, boss, ...env };
  }

  it('stays dormant and invulnerable until activated, then plays an intro', () => {
    const { boss, ctx } = makeBoss();
    for (let i = 0; i < 240; i++) boss.update(ctx);
    expect(boss.state).toBe('dormant');
    expect(boss.takeHit(1, 1, 0).killed).toBe(false);
    expect(boss.health.current).toBe(BOSS.kilnWarden.health);
    expect(boss.damageSources()).toEqual([]);
    boss.activate();
    expect(boss.state).toBe('intro');
  });

  it('uses at least two distinct telegraphed attacks and never repeats one three times running', () => {
    const { boss, ctx, events } = makeBoss(11);
    boss.activate();
    const picks: WardenAttack[] = [];
    let prevState = boss.state;
    for (let i = 0; i < 120 * 60; i++) {
      boss.update(ctx);
      if (boss.state !== prevState && boss.state.endsWith('Windup') && boss.lastChosenAttack) {
        picks.push(boss.lastChosenAttack);
      }
      prevState = boss.state;
    }
    expect(new Set(picks).size).toBeGreaterThanOrEqual(2);
    for (let i = 2; i < picks.length; i++) {
      expect(picks[i] === picks[i - 1] && picks[i] === picks[i - 2]).toBe(false);
    }
    expect(events.filter((e) => e.type === 'bossWindup').length).toBe(picks.length);
  });

  it('a charge into the wall leaves it stunned and harmless — the punish window', () => {
    const { boss, ctx, events } = makeBoss(5);
    boss.activate();
    let sawStun = false;
    for (let i = 0; i < 120 * 60 && !sawStun; i++) {
      boss.update(ctx);
      if (boss.state === 'stunned') {
        sawStun = true;
        expect(boss.damageSources()).toEqual([]);
        expect(events.some((e) => e.type === 'bossWallImpact')).toBe(true);
      }
    }
    expect(sawStun).toBe(true);
  });

  it('the leap slam sends shockwaves both ways along the floor', () => {
    const { boss, ctx, projectiles } = makeBoss(9);
    boss.activate();
    for (let i = 0; i < 120 * 60 && !projectiles.some((p) => p.kind === 'shockwave'); i++) boss.update(ctx);
    const waves = projectiles.filter((p) => p.kind === 'shockwave');
    expect(waves).toHaveLength(2);
    expect(waves.map((w) => Math.sign(w.vx)).sort()).toEqual([-1, 1]);
  });

  it('enters phase two at half health and adds the telegraphed ember rain', () => {
    const { boss, ctx, events, projectiles } = makeBoss(21);
    boss.activate();
    while (boss.state === 'intro') boss.update(ctx);
    const toHalf = Math.ceil(BOSS.kilnWarden.health * (1 - BOSS.kilnWarden.phase2Threshold));
    for (let i = 0; i < toHalf; i++) boss.takeHit(1, 1, 0);
    expect(boss.phase).toBe(2);
    let sawMarkers = false;
    for (let i = 0; i < 120 * 90 && !projectiles.some((p) => p.kind === 'fallingEmber'); i++) {
      boss.update(ctx);
      if (boss.rainMarkers.length > 0) sawMarkers = true;
    }
    expect(events.some((e) => e.type === 'bossPhase')).toBe(true);
    expect(sawMarkers).toBe(true);
    expect(projectiles.some((p) => p.kind === 'fallingEmber')).toBe(true);
  });

  it('dies when its health is depleted', () => {
    const { boss, ctx } = makeBoss();
    boss.activate();
    while (boss.state === 'intro') boss.update(ctx);
    let killed = false;
    for (let i = 0; i < BOSS.kilnWarden.health; i++) killed = boss.takeHit(1, 1, 0).killed;
    expect(killed).toBe(true);
    expect(boss.state).toBe('dead');
    expect(boss.damageSources()).toEqual([]);
  });
});
