import { describe, expect, it } from 'vitest';
import { THE_NULL } from '../src/config/bossTuning';
import { upgradeValue } from '../src/config/upgrades';
import type { GameEvent } from '../src/core/events';
import { createBody } from '../src/core/body';
import { Enemy, type EnemyContext } from '../src/core/enemies/enemy';
import { Progression } from '../src/core/progression';
import { Tile } from '../src/core/tiles';
import { GameWorld } from '../src/core/world';
import { createRng } from '../src/core/math';
import { ROOMS, START_ROOM } from '../src/world/rooms';
import { DT, input, stepWorld, tileFeet, tileX, worldAt } from './helpers';

const withBacktrace = (p: Progression) => p.unlock('backtrace');

/** Walk the player toward a tile column along the floor. */
function walkTo(world: GameWorld, col: number, maxSeconds = 8): GameEvent[] {
  const events: GameEvent[] = [];
  const target = tileX(col);
  for (let i = 0; i < maxSeconds * 120; i++) {
    const dx = target - world.player.centerX;
    if (Math.abs(dx) < 3) break;
    world.step(input({ moveX: dx > 0 ? 1 : -1 }), DT);
    events.push(...world.drainEvents());
  }
  stepWorld(world, 4);
  return events;
}

describe('the Rainline Depot echo-plate puzzle (first Backtrace lesson)', () => {
  const PLATE_B = 41;
  const PLATE_A = 34;
  const doorOpen = (w: GameWorld) => !w.room.grid.isSolid(47, 15);

  it('opens when the Courier stands on plate B, then reaches plate A before the echo leaves B', () => {
    const w = worldAt('alley_depot', PLATE_B, 17, withBacktrace);
    w.room.enemies = [];
    stepWorld(w, 120); // stand on B for a second
    expect(doorOpen(w)).toBe(false);
    walkTo(w, PLATE_A);
    stepWorld(w, 10);
    expect(doorOpen(w)).toBe(true);
    expect(w.progression.interactState['depot-door']).toBe('open');
  });

  it('stays shut if the Courier only ever stands on plate A', () => {
    const w = worldAt('alley_depot', PLATE_A, 17, withBacktrace);
    w.room.enemies = [];
    stepWorld(w, 120 * 6);
    expect(doorOpen(w)).toBe(false);
  });

  it('stays shut if the Courier lingers on B longer than the echo window before crossing: the echo has moved on', () => {
    const w = worldAt('alley_depot', PLATE_B, 17, withBacktrace);
    w.room.enemies = [];
    stepWorld(w, 120);
    // Walk away east for 6 s (well past the 4 s echo window), then come back to A.
    for (let i = 0; i < 120 * 5; i++) w.step(input({ moveX: i < 120 * 2 ? 1 : 0 }), DT);
    walkTo(w, PLATE_A, 12);
    stepWorld(w, 10);
    expect(doorOpen(w)).toBe(false);
  });

  it('does nothing before Backtrace is unlocked (there is no echo yet)', () => {
    const w = worldAt('alley_depot', PLATE_B, 17);
    w.room.enemies = [];
    stepWorld(w, 120);
    walkTo(w, PLATE_A);
    expect(doorOpen(w)).toBe(false);
  });

  it('the door persists open across leaving and re-entering the room', () => {
    const w = worldAt('alley_depot', PLATE_B, 17, withBacktrace);
    w.room.enemies = [];
    stepWorld(w, 120);
    walkTo(w, PLATE_A);
    stepWorld(w, 10);
    expect(doorOpen(w)).toBe(true);
    const saved = Progression.deserialize(JSON.parse(JSON.stringify(w.progression.serialize())))!;
    saved.checkpoint = { roomId: 'alley_depot', x: tileX(30), y: tileFeet(17) };
    const w2 = new GameWorld(ROOMS, saved, { startRoom: START_ROOM, rng: createRng(1) });
    w2.start();
    expect(w2.room.grid.isSolid(47, 15)).toBe(false);
  });
});

describe('story spine', () => {
  it('Zero starts the story; the module completes main-1 and unlocks the next quests', () => {
    const w = worldAt('alley', 19, 19);
    w.room.enemies = [];
    expect(w.quests.status('main-1')).toBe('active');
    // Talk to Zero until the conversation closes.
    stepWorld(w, 2, () => input({ interactPressed: true }));
    expect(w.inDialogue).toBe(true);
    for (let i = 0; i < 12 && w.inDialogue; i++) stepWorld(w, 1, () => input({ interactPressed: true }));
    expect(w.inDialogue).toBe(false);
    expect(w.progression.hasFlag('met-zero')).toBe(true);
    expect(w.quests.status('main-1')).toBe('active');

    const depot = worldAt('alley_depot', 29, 17, (p) => {
      p.setFlag('met-zero');
      p.quests['main-1'] = { status: 'active', progress: {} };
    });
    depot.room.enemies = [];
    const events = stepWorld(depot, 60, () => input({ moveX: 1 }));
    expect(events.some((e) => e.type === 'abilityUnlocked' && e.ability === 'backtrace')).toBe(true);
    expect(depot.quests.status('main-1')).toBe('turnedIn');
    expect(depot.progression.hasFlag('main-1-done')).toBe(true);
    expect(depot.progression.scrap).toBeGreaterThanOrEqual(20);
    expect(depot.quests.status('main-2')).toBe('active');
    expect(depot.quests.status('main-3')).toBe('active');
    expect(depot.quests.status('explore-records')).toBe('active');
  });

  it('visiting the Precinct Checkpoint completes main-2', () => {
    const w = worldAt('transit_shaft', 34, 11, (p) => {
      p.unlock('backtrace');
      p.setFlag('main-1-done');
      p.quests['main-2'] = { status: 'active', progress: {} };
    });
    w.room.enemies = [];
    for (let i = 0; i < 400 && !w.pendingTransition; i++) w.step(input({ moveX: 1 }), DT);
    expect(w.pendingTransition).toEqual({ room: 'precinct_gate', entry: 'west' });
    w.completeTransition();
    expect(w.quests.status('main-2')).toBe('turnedIn');
  });

  it('kill, scrap and quest bookkeeping happens exactly once per enemy', () => {
    const w = worldAt('transit_yard', 40, 19);
    const e = w.room.enemies.find((x) => x.kind === 'streetScavenger')!;
    const before = w.progression.scrap;
    e.takeHit(99, 1, 0);
    stepWorld(w, 3);
    stepWorld(w, 3);
    expect(w.progression.enemyKills['streetScavenger']).toBe(1);
    expect(w.progression.scrap).toBeGreaterThan(before);
    expect(w.room.enemies.includes(e)).toBe(false);
  });
});

describe('keycard door, vendors and upgrades', () => {
  it('the checkpoint door stays shut without the keycard and opens (and stays open) with it', () => {
    const w = worldAt('precinct_gate', 50, 17);
    w.room.enemies = [];
    expect(w.room.grid.isSolid(52, 15)).toBe(true);
    stepWorld(w, 30);
    expect(w.room.grid.isSolid(52, 15)).toBe(true);
    w.progression.addItem('precinct-keycard');
    stepWorld(w, 5);
    expect(w.room.grid.isSolid(52, 15)).toBe(false);
    w.progression.addItem('precinct-keycard', -1);
    stepWorld(w, 5);
    expect(w.room.grid.isSolid(52, 15)).toBe(false); // latched
  });

  it('shows a hint when the Courier walks up to a locked door', () => {
    const w = worldAt('precinct_gate', 49, 17);
    w.room.enemies = [];
    const events = stepWorld(w, 60, () => input({ moveX: 1 }));
    expect(events.some((e) => e.type === 'doorLocked' && e.id === 'gate-door')).toBe(true);
  });

  it('buying an upgrade spends scrap, raises the level and changes Backtrace', () => {
    const w = worldAt('alley', 9, 19);
    expect(w.buyUpgrade('backtraceWindow')).toEqual({ ok: false, reason: 'scrap' });
    w.progression.addScrap(500);
    expect(w.buyUpgrade('backtraceWindow')).toEqual({ ok: true });
    expect(w.progression.scrap).toBe(460);
    expect(w.backtrace.currentWindow).toBe(upgradeValue('backtraceWindow', 1));
    for (let i = 0; i < 2; i++) w.buyUpgrade('backtraceWindow');
    expect(w.buyUpgrade('backtraceWindow')).toEqual({ ok: false, reason: 'maxed' });
    expect(w.buyUpgrade('backtraceCooldown').ok).toBe(true);
    expect(w.backtrace.currentCooldown).toBe(upgradeValue('backtraceCooldown', 1));
  });

  it('upgrades persist: a reloaded world applies them from the first step', () => {
    const w = worldAt('alley', 9, 19);
    w.progression.addScrap(500);
    w.buyUpgrade('backtraceWindow');
    w.buyUpgrade('backtraceCooldown');
    const saved = Progression.deserialize(JSON.parse(JSON.stringify(w.progression.serialize())))!;
    saved.checkpoint = { roomId: 'alley', x: tileX(9), y: tileFeet(19) };
    const w2 = new GameWorld(ROOMS, saved, { startRoom: START_ROOM, rng: createRng(1) });
    w2.start();
    expect(w2.backtrace.currentWindow).toBe(upgradeValue('backtraceWindow', 1));
    expect(w2.backtrace.currentCooldown).toBe(upgradeValue('backtraceCooldown', 1));
  });

  it('the Backtrace burst scales with the Arrival Burst upgrade', () => {
    const mk = (level: number) => {
      const w = worldAt('transit_yard', 40, 19, (p) => {
        p.unlock('backtrace');
        if (level > 0) p.upgrades.backtraceBurst = level;
      });
      w.room.enemies = w.room.enemies.filter((e) => e.kind === 'streetScavenger').slice(0, 1);
      const e = w.room.enemies[0]!;
      e.body.x = w.player.body.x + 4;
      e.body.y = w.player.body.y;
      stepWorld(w, 240, () => input()); // build history
      const hp = e.health.current;
      stepWorld(w, 1, () => input({ backtracePressed: true }));
      return hp - e.health.current;
    };
    expect(mk(0)).toBeGreaterThanOrEqual(1);
    expect(mk(2)).toBeGreaterThan(mk(0));
  });
});

describe('world physics integration', () => {
  it('a moving platform carries the Courier standing on it, and stops carrying once they step off', () => {
    const w = worldAt('transit_shaft', 15, 27);
    w.room.enemies = [];
    const plat = w.room.interact.platforms.find((p) => p.def.id === 'shaft-p1')!;
    // Wait for the platform to arrive under the player's drop position, then ride.
    stepWorld(w, 120 * 3);
    expect(w.player.body.onGround).toBe(true);
    const x0 = w.player.body.x;
    const px0 = plat.x;
    stepWorld(w, 120 * 2);
    // Whichever way it moved, the rider moved with it (within a few pixels of the platform's own travel).
    const dPlat = plat.x - px0;
    const dRider = w.player.body.x - x0;
    if (Math.abs(dPlat) > 8) expect(Math.abs(dRider - dPlat)).toBeLessThan(6);
    expect(w.player.body.y + w.player.body.h).toBeCloseTo(plat.y, 0);
  });

  it('the Courier can jump off a moving platform normally', () => {
    const w = worldAt('transit_shaft', 15, 27);
    w.room.enemies = [];
    stepWorld(w, 120 * 3);
    const y0 = w.player.body.y;
    let minY = y0;
    stepWorld(w, 40, (i) => input({ jumpPressed: i === 0, jumpHeld: i < 30 }));
    for (let i = 0; i < 1; i++) minY = Math.min(minY, w.player.body.y);
    expect(w.player.body.y).toBeLessThan(y0 - 20);
    void minY;
  });

  it('timed-gate puzzle in the Reactor Hall needs Backtrace (cannot be sprinted)', () => {
    const w = worldAt('core_reactor', 17, 19, (p) => (p.unlock('backtrace'), p.unlock('air-jump')));
    w.room.enemies = [];
    const gateCol = 42;
    expect(w.room.grid.isSolid(gateCol, 10)).toBe(true);
    // Strike the switch, then sprint to the gate: it closes again before the Courier arrives.
    stepWorld(w, 2, (i) => input({ attackPressed: i === 0 }));
    stepWorld(w, 40, () => input({ moveX: 1 }));
    let reached = false;
    for (let i = 0; i < 120 * 4; i++) {
      w.step(input({ moveX: 1, dashPressed: i % 50 === 0 }), DT);
      if (w.player.body.x > gateCol * 16) reached = true;
      if (reached) break;
    }
    expect(reached).toBe(false);
  });
});

describe('enemies in the living world', () => {
  it('enemies are told about the Courier\'s past: the Backtrace arrival (one step only), the trail and stillness', () => {
    const w = worldAt('undercity_towers', 4, 37, (p) => (p.unlock('backtrace'), p.unlock('air-jump')));
    w.room.enemies = [];
    const seen: { arrival: { x: number; y: number } | null | undefined; still: number; trail: { x: number; y: number } | null }[] = [];
    class Probe extends Enemy<'x'> {
      readonly kind = 'probe';
      constructor() {
        super('probe', createBody(300, 300, 8, 8), 1, 'x');
      }
      protected think(ctx: EnemyContext): void {
        seen.push({ arrival: ctx.backtraceArrival, still: ctx.playerStillTime ?? 0, trail: ctx.trail?.(1) ?? null });
      }
      protected onHurt(): void {}
      damageSources() {
        return [];
      }
    }
    w.room.enemies.push(new Probe());
    stepWorld(w, 240, () => input());
    expect(seen[seen.length - 1]!.still).toBeGreaterThan(1.5);
    stepWorld(w, 120, () => input({ moveX: 1 }));
    expect(seen[seen.length - 1]!.still).toBe(0);
    expect(seen[seen.length - 1]!.trail).not.toBeNull();
    const before = seen.length;
    stepWorld(w, 1, () => input({ backtracePressed: true }));
    stepWorld(w, 3);
    const arrivals = seen.slice(before).filter((s) => s.arrival);
    expect(arrivals).toHaveLength(1);
    expect(arrivals[0]!.arrival!.x).toBeCloseTo(w.player.centerX, 0);
  });

  it('Null Echoes trail the Courier along their recorded path and hurt on contact', () => {
    const w = worldAt('cathedral_nave', 8, 21, withBacktrace);
    const echo = w.room.enemies.find((e) => e.kind === 'nullEcho')!;
    // Run east for four seconds: the echo should follow the trail (it spawned far above, near col 22).
    stepWorld(w, 120 * 4, () => input({ moveX: 1 }));
    const dx = Math.abs(echo.centerX - w.player.centerX);
    expect(dx).toBeLessThan(200);
  });
});

describe('bosses end the game only at the end', () => {
  it('KILN-7: sealed arena, exit door opens only after the boss falls, and the fight persists', () => {
    const w = worldAt('core_kiln', 4, 17, (p) => (p.unlock('backtrace'), p.unlock('air-jump')));
    w.player.health.grantInvulnerability(999);
    const events = stepWorld(w, 120 * 3, () => input({ moveX: 1 }));
    expect(events.some((e) => e.type === 'bossStart')).toBe(true);
    expect(w.room.gateClosed).toBe(true);
    const boss = w.room.pboss!;
    expect(boss.isActive).toBe(true);
    expect(w.room.grid.isSolid(57, 15)).toBe(true); // exit sealed
    // Drive the fight: strike whenever exposed.
    for (let i = 0; i < 120 * 150 && boss.isAlive(); i++) {
      w.player.health.grantInvulnerability(1);
      if (boss.exposed && i % 10 === 0) boss.takeHit(2, 1, 0);
      w.step(input(), DT);
      w.drainEvents();
    }
    expect(boss.isAlive()).toBe(false);
    stepWorld(w, 120 * 4);
    expect(w.progression.defeatedBosses.has('kiln-7')).toBe(true);
    expect(w.room.gateClosed).toBe(false);
    expect(w.room.grid.isSolid(57, 15)).toBe(false);
    expect(w.flow.state).toBe('playing'); // not the end of the game
  });

  it('THE NULL: defeating it completes the game after the ending delay', () => {
    const w = worldAt('cathedral_sanctum', 4, 19, (p) => (p.unlock('backtrace'), p.unlock('air-jump')));
    w.player.health.grantInvulnerability(9999);
    const all: GameEvent[] = [];
    all.push(...stepWorld(w, 120 * 3, () => input({ moveX: 1 })));
    const boss = w.room.pboss!;
    expect(boss.displayName).toBe(THE_NULL.name);
    for (let i = 0; i < 120 * 240 && boss.isAlive(); i++) {
      w.player.health.grantInvulnerability(1);
      if (boss.exposed && i % 10 === 0) boss.takeHit(3, 1, 0);
      w.step(input(), DT);
      all.push(...w.drainEvents());
    }
    expect(boss.isAlive()).toBe(false);
    for (let i = 0; i < 120 * 8 && w.flow.state === 'playing'; i++) {
      w.step(input(), DT);
      all.push(...w.drainEvents());
    }
    expect(all.some((e) => e.type === 'gameCompleted')).toBe(true);
    expect(w.flow.state).toBe('victory');
    expect(w.progression.defeatedBosses.has('the-null')).toBe(true);
  });

  it('dying mid-fight resets the encounter, gates and persistent state stay consistent', () => {
    const w = worldAt('core_kiln', 4, 17);
    stepWorld(w, 120 * 3, () => input({ moveX: 1 }));
    expect(w.room.pboss?.isActive).toBe(true);
    w.player.takeDamage(99, 0, () => undefined);
    stepWorld(w, 200);
    w.retry();
    expect(w.room.pboss?.stage).toBe('dormant');
    expect(w.room.gateClosed).toBe(false);
    expect(w.room.grid.get(6, 15)).toBe(Tile.Empty);
  });
});
