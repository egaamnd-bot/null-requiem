import { describe, expect, it } from 'vitest';
import { InteractableSystem, type InteractableDef, type InteractContext } from '../src/core/interactables';
import type { GameEvent } from '../src/core/events';
import type { Rect } from '../src/core/math';
import { Progression } from '../src/core/progression';
import { Tile } from '../src/core/tiles';
import { DT, gridFrom, tileFeet, tileX } from './helpers';

function room(): string[] {
  const rows: string[] = ['#'.repeat(40)];
  for (let r = 1; r < 14; r++) rows.push('#' + '.'.repeat(38) + '#');
  rows.push('#'.repeat(40), '#'.repeat(40));
  return rows;
}

const bodyAt = (col: number, row: number): Rect => ({ x: tileX(col) - 5, y: tileFeet(row) - 22, w: 10, h: 22 });
const FAR: Rect = { x: -999, y: -999, w: 10, h: 22 };

function setup(defs: InteractableDef[], configure?: (p: Progression) => void) {
  const grid = gridFrom(room());
  const progression = new Progression();
  configure?.(progression);
  const sys = new InteractableSystem(defs, grid, progression);
  const events: GameEvent[] = [];
  let saved = 0;
  const run = (seconds: number, player: Rect = FAR, echo: Rect | null = null) => {
    for (let i = 0; i < Math.round(seconds / DT); i++) {
      const ctx: InteractContext = { grid, progression, player, echo, emit: (e) => events.push(e), onChange: () => saved++ };
      sys.step(DT, ctx);
    }
  };
  return { sys, grid, progression, events, run, saved: () => saved };
}

const plate = (id: string, col: number, extra: Partial<InteractableDef> = {}): InteractableDef => ({ type: 'plate', id, col, row: 13, ...extra }) as InteractableDef;
const door = (id: string, opensWhen: string[], extra: Partial<InteractableDef> = {}): InteractableDef =>
  ({ type: 'door', id, col: 20, row: 10, cols: 1, rows: 4, opensWhen, ...extra }) as InteractableDef;

describe('pressure plates and the Courier\'s echo', () => {
  it('is pressed by the Courier standing on it and releases when they leave', () => {
    const t = setup([plate('a', 5)]);
    t.run(0.1, bodyAt(5, 13));
    expect(t.sys.plates[0]!.pressed).toBe(true);
    expect(t.sys.isActive('a')).toBe(true);
    t.run(0.1, bodyAt(9, 13));
    expect(t.sys.isActive('a')).toBe(false);
  });

  it('is NOT pressed by someone merely passing high overhead', () => {
    const t = setup([plate('a', 5)]);
    t.run(0.1, { ...bodyAt(5, 13), y: tileFeet(13) - 22 - 60 });
    expect(t.sys.isActive('a')).toBe(false);
  });

  it('an echo-only plate ignores the Courier but answers the afterimage (the temporal plate)', () => {
    const t = setup([plate('e', 5, { pressedBy: 'echo' })]);
    t.run(0.1, bodyAt(5, 13), null);
    expect(t.sys.isActive('e')).toBe(false);
    t.run(0.1, bodyAt(9, 13), bodyAt(5, 13));
    expect(t.sys.isActive('e')).toBe(true);
  });

  it('a courier-only plate ignores the echo', () => {
    const t = setup([plate('c', 5, { pressedBy: 'courier' })]);
    t.run(0.1, FAR, bodyAt(5, 13));
    expect(t.sys.isActive('c')).toBe(false);
  });

  it('holds for its hold time after release, then lets go', () => {
    const t = setup([plate('h', 5, { hold: 0.5 })]);
    t.run(0.1, bodyAt(5, 13));
    t.run(0.3, FAR);
    expect(t.sys.isActive('h')).toBe(true);
    t.run(0.4, FAR);
    expect(t.sys.isActive('h')).toBe(false);
  });

  it('emits change events exactly once per transition', () => {
    const t = setup([plate('a', 5)]);
    t.run(0.3, bodyAt(5, 13));
    t.run(0.3, FAR);
    const ev = t.events.filter((e) => e.type === 'plateChanged');
    expect(ev).toHaveLength(2);
  });
});

describe('doors', () => {
  it('opens only when ALL signals are active, and closes when any lapses', () => {
    const t = setup([plate('a', 5), plate('b', 8, { pressedBy: 'echo' }), door('d', ['a', 'b'])]);
    const solidAt = () => t.grid.get(20, 11) === Tile.Gate;
    expect(solidAt()).toBe(true);
    t.run(0.1, bodyAt(5, 13));
    expect(solidAt()).toBe(true);
    t.run(0.1, bodyAt(5, 13), bodyAt(8, 13));
    expect(solidAt()).toBe(false);
    t.run(0.1, bodyAt(5, 13), null);
    expect(solidAt()).toBe(true);
  });

  it('supports an "any" mode, flag/boss/item signals, and ignores an empty condition list', () => {
    const t = setup([door('d', ['flag:power-on', 'boss:kiln-7', 'item:keycard'], { mode: 'any' })], (p) => p.addItem('keycard'));
    t.run(0.1);
    expect(t.grid.get(20, 10)).toBe(Tile.Empty);
    const none = setup([door('d', [])]);
    none.run(0.5);
    expect(none.grid.get(20, 10)).toBe(Tile.Gate);
  });

  it('never closes on top of the Courier', () => {
    const t = setup([plate('a', 5), door('d', ['a'])]);
    t.run(0.1, bodyAt(5, 13));
    expect(t.grid.get(20, 11)).toBe(Tile.Empty);
    t.run(0.3, bodyAt(20, 13)); // standing in the doorway while the plate is released
    expect(t.grid.get(20, 11)).toBe(Tile.Empty);
    t.run(0.1, bodyAt(25, 13));
    expect(t.grid.get(20, 11)).toBe(Tile.Gate);
  });

  it('honours closeDelay', () => {
    const t = setup([plate('a', 5), door('d', ['a'], { closeDelay: 1 })]);
    t.run(0.1, bodyAt(5, 13));
    t.run(0.8, FAR);
    expect(t.grid.get(20, 11)).toBe(Tile.Empty);
    t.run(0.4, FAR);
    expect(t.grid.get(20, 11)).toBe(Tile.Gate);
  });

  it('a latched door stays open forever, persists, and is open again after reload', () => {
    const t = setup([plate('a', 5), door('d', ['a'], { latch: true })]);
    t.run(0.1, bodyAt(5, 13));
    t.run(1, FAR);
    expect(t.grid.get(20, 11)).toBe(Tile.Empty);
    expect(t.progression.interactState['d']).toBe('open');
    expect(t.saved()).toBeGreaterThan(0);
    const reload = setup([door('d', ['a'], { latch: true })], (p) => (p.interactState['d'] = 'open'));
    expect(reload.grid.get(20, 11)).toBe(Tile.Empty);
  });

  it('is part of the world, not of the Courier: using a stale echo cannot reopen a door that should be shut', () => {
    // Echo pressed the plate, then the echo moved on: the door closes even though the Courier is far away.
    const t = setup([plate('e', 5, { pressedBy: 'echo' }), door('d', ['e'])]);
    t.run(0.1, FAR, bodyAt(5, 13));
    expect(t.grid.get(20, 11)).toBe(Tile.Empty);
    t.run(0.1, FAR, bodyAt(9, 13));
    expect(t.grid.get(20, 11)).toBe(Tile.Gate);
  });
});

describe('moving platforms', () => {
  const pp = (extra: Partial<InteractableDef> = {}): InteractableDef =>
    ({ type: 'platform', id: 'p', col: 10, row: 10, cols: 3, path: [{ col: 10, row: 10 }, { col: 20, row: 10 }], speed: 40, mode: 'pingpong', wait: 0.5, ...extra }) as InteractableDef;

  it('travels between waypoints at its speed, dwells, and comes back (pingpong)', () => {
    const t = setup([pp()]);
    const p = t.sys.platforms[0]!;
    t.run(1);
    expect(p.x).toBeCloseTo(10 * 16 + 40, 0);
    t.run(3);
    expect(p.x).toBeCloseTo(20 * 16, 1); // arrived and dwelling
    t.run(0.6 + 2);
    expect(p.x).toBeLessThan(20 * 16 - 10);
  });

  it('reports the displacement of every step so riders can be carried', () => {
    const t = setup([pp()]);
    t.run(0.01);
    const p = t.sys.platforms[0]!;
    expect(Math.abs(p.dx)).toBeGreaterThan(0);
    expect(p.dy).toBe(0);
  });

  it('a toggle platform (elevator) moves only while its trigger is active and returns afterwards', () => {
    const lift: InteractableDef = { type: 'platform', id: 'lift', col: 5, row: 12, cols: 2, path: [{ col: 5, row: 12 }, { col: 5, row: 4 }], speed: 64, mode: 'toggle', trigger: 'flag:lift-on' };
    const t = setup([lift]);
    const p = t.sys.platforms[0]!;
    t.run(1);
    expect(p.y).toBe(12 * 16);
    t.progression.setFlag('lift-on');
    t.run(1);
    expect(p.y).toBeLessThan(12 * 16 - 50);
    t.run(3);
    expect(p.y).toBe(4 * 16);
    t.progression.flags.delete('lift-on');
    t.run(5);
    expect(p.y).toBe(12 * 16);
  });

  it('detects riders only when they land from above, never when rising through it', () => {
    const t = setup([pp()]);
    const p = t.sys.platforms[0]!;
    const above: Rect = { x: p.x + 4, y: p.y - 22, w: 10, h: 22 };
    expect(t.sys.platformUnder(above, p.y - 1, 100)).toBe(p);
    expect(t.sys.platformUnder(above, p.y - 1, -50)).toBeNull();
    const below: Rect = { x: p.x + 4, y: p.y + 20, w: 10, h: 22 };
    expect(t.sys.platformUnder(below, p.y + 20, 100)).toBeNull();
    const beside: Rect = { x: p.x + p.w + 20, y: p.y - 22, w: 10, h: 22 };
    expect(t.sys.platformUnder(beside, p.y - 1, 100)).toBeNull();
  });

  it('rejects a platform with fewer than two waypoints', () => {
    expect(() => setup([{ type: 'platform', id: 'x', col: 1, row: 1, cols: 2, path: [{ col: 1, row: 1 }], speed: 10, mode: 'pingpong' }])).toThrow();
  });
});

describe('power nodes and hazard emitters', () => {
  it('a node powers after enough strikes, persists, and signals doors', () => {
    const t = setup([{ type: 'node', id: 'n', col: 6, row: 13, hits: 2 }, door('d', ['node:n'])]);
    expect(t.sys.hitNode('n')).toBe(false);
    expect(t.sys.isActive('node:n')).toBe(false);
    expect(t.sys.hitNode('n')).toBe(true);
    expect(t.progression.interactState['n']).toBe('on');
    t.run(0.1);
    expect(t.grid.get(20, 11)).toBe(Tile.Empty);
    expect(t.sys.hitNode('n')).toBe(false);
  });

  it('a powered node stays powered after reload', () => {
    const t = setup([{ type: 'node', id: 'n', col: 6, row: 13 }], (p) => (p.interactState['n'] = 'on'));
    expect(t.sys.isActive('node:n')).toBe(true);
  });

  it('emitters cycle off -> telegraph -> active, deal damage only when active, and stop at walls', () => {
    const t = setup([{ type: 'emitter', id: 'e', col: 10, row: 3, dir: 'down', length: 20, period: 2, telegraph: 0.5, active: 0.5, style: 'laser' }]);
    const e = t.sys.emitters[0]!;
    const seen: string[] = [];
    for (let i = 0; i < Math.round(4 / DT); i++) {
      t.run(DT);
      if (seen[seen.length - 1] !== e.phase) seen.push(e.phase);
      if (e.phase !== 'active') expect(t.sys.damageSources()).toHaveLength(0);
      else expect(t.sys.damageSources()).toHaveLength(1);
    }
    expect(seen).toContain('telegraph');
    expect(seen.indexOf('telegraph')).toBeLessThan(seen.indexOf('active'));
    // Beam stops at the floor (row 14): from row 4 to row 13 = 10 tiles
    expect(e.beam.h).toBe(10 * 16);
  });

  it('a disabled emitter never fires', () => {
    const t = setup([{ type: 'emitter', id: 'e', col: 10, row: 3, dir: 'down', length: 8, period: 1, telegraph: 0.3, active: 0.4, style: 'steam', disabledBy: 'flag:off' }], (p) => p.setFlag('off'));
    for (let i = 0; i < 4; i++) {
      t.run(0.5);
      expect(t.sys.damageSources()).toHaveLength(0);
    }
  });
});
