import { describe, expect, it } from 'vitest';
import { Progression } from '../src/core/progression';
import { buildGearModel, buildMapModel, collectedRecords, vendorStock, wrapText } from '../src/ui/menuModel';
import { ROOMS } from '../src/world/rooms';

describe('world map model', () => {
  it('shows only visited rooms and the unexplored far side of their doors, with ??? names', () => {
    const p = new Progression();
    p.visitedRooms.add('alley');
    const m = buildMapModel(ROOMS, p, 'alley', 20, 20, 2, 0, 0);
    const ids = m.cells.map((c) => c.id).sort();
    expect(ids).toEqual(['alley', 'alley_depot', 'undercroft']);
    expect(m.cells.find((c) => c.id === 'alley')!.name).toBe('Rainline Alley');
    expect(m.cells.find((c) => c.id === 'alley_depot')!.name).toBe('???');
    expect(m.cells.find((c) => c.id === 'alley')!.current).toBe(true);
    expect(m.discovered).toBe(1);
    expect(m.total).toBe(ROOMS.length);
  });

  it('links visited rooms to neighbours once, and reveals everything when the world has been explored', () => {
    const p = new Progression();
    for (const r of ROOMS) p.visitedRooms.add(r.id);
    const m = buildMapModel(ROOMS, p, 'cathedral_sanctum', 20, 20, 2, 10, 10);
    expect(m.cells).toHaveLength(ROOMS.length);
    const keys = m.links.map((l) => [l.from, l.to].sort().join('|'));
    expect(new Set(keys).size).toBe(keys.length);
    expect(m.links.length).toBeGreaterThanOrEqual(ROOMS.length - 1);
    expect(m.cells.find((c) => c.id === 'core_kiln')!.hasBoss).toBe(true);
    expect(m.cells.find((c) => c.id === 'alley')!.hasRelay).toBe(true);
    // Positions follow the grid and keep the requested origin.
    const first = m.cells.reduce((a, b) => (b.x < a.x ? b : a));
    expect(first.x).toBe(10);
  });
});

describe('vendors and gear', () => {
  it('stock lines report level, next value, cost and affordability', () => {
    const p = new Progression();
    p.addScrap(50);
    const s = vendorStock(['backtraceWindow', 'backtraceBurst'], p);
    expect(s[0]).toMatchObject({ id: 'backtraceWindow', level: 0, value: 4, next: 4.5, cost: 40, affordable: true });
    expect(s[1]).toMatchObject({ id: 'backtraceBurst', cost: 60, affordable: false });
    p.upgrades.backtraceWindow = 3;
    const maxed = vendorStock(['backtraceWindow'], p)[0]!;
    expect(maxed.next).toBeNull();
    expect(maxed.cost).toBeNull();
    expect(maxed.affordable).toBe(false);
  });

  it('gear model lists abilities, stats and inventory', () => {
    const p = new Progression();
    p.unlock('backtrace');
    p.addItem('med-kit');
    p.addScrap(12);
    const g = buildGearModel(p, 6, 4);
    expect(g.abilities.find((a) => a.id === 'backtrace')!.owned).toBe(true);
    expect(g.abilities.find((a) => a.id === 'air-jump')!.owned).toBe(false);
    expect(g.stats.find((s) => s.label === 'Integrity')!.value).toBe('4 / 6');
    expect(g.items).toEqual([{ id: 'med-kit', count: 1 }]);
    expect(g.scrap).toBe(12);
  });

  it('records: only the collected ones, with the total known', () => {
    const p = new Progression();
    const before = collectedRecords(ROOMS, p);
    expect(before.entries).toHaveLength(0);
    expect(before.total).toBeGreaterThanOrEqual(6);
    p.collected.add('rec:alley');
    expect(collectedRecords(ROOMS, p).entries.map((e) => e.id)).toEqual(['rec:alley']);
  });
});

describe('wrapText', () => {
  it('wraps on word boundaries, keeps newlines and never loses words', () => {
    const lines = wrapText('the quick brown fox\njumps over the lazy dog', 12);
    expect(lines.join(' ').replace(/\s+/g, ' ')).toBe('the quick brown fox jumps over the lazy dog');
    expect(lines.every((l) => l.length <= 12)).toBe(true);
  });
  it('lets an overlong word stand alone', () => {
    expect(wrapText('supercalifragilistic ok', 5)).toEqual(['supercalifragilistic', 'ok']);
  });
});
