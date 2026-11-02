import { describe, expect, it } from 'vitest';
import { maxUpgradeLevel, nextUpgradeCost, UPGRADE_IDS, upgradeValue } from '../src/config/upgrades';
import { loadProgression, MemorySaveStore, Progression, saveProgression, SAVE_VERSION } from '../src/core/progression';

function populated(): Progression {
  const p = new Progression();
  p.unlock('backtrace');
  p.unlock('air-jump');
  p.setFlag('met-zero');
  p.addItem('precinct-keycard');
  p.addItem('relay-fuse', 2);
  p.addScrap(77);
  p.raiseUpgrade('backtraceWindow');
  p.visitedRooms.add('alley');
  p.collected.add('alley:cache:1');
  p.recordKill('streetScavenger');
  p.defeatedBosses.add('kiln-7');
  p.quests['q1'] = { status: 'active', progress: { a: 2 } };
  p.interactState['door-1'] = 'open';
  p.maxHealthBonus = 2;
  p.deaths = 3;
  p.playTime = 1234.5;
  p.checkpoint = { roomId: 'transit', x: 100, y: 200 };
  return p;
}

describe('progression v2 save format', () => {
  it('round-trips every field', () => {
    const p = populated();
    const store = new MemorySaveStore();
    saveProgression(store, p);
    const back = loadProgression(store)!;
    expect(back.serialize()).toEqual(p.serialize());
    expect(back.has('air-jump')).toBe(true);
    expect(back.itemCount('relay-fuse')).toBe(2);
    expect(back.upgradeLevel('backtraceWindow')).toBe(1);
    expect(back.scrap).toBe(77);
    expect(back.quests['q1']).toEqual({ status: 'active', progress: { a: 2 } });
  });

  it('writes the current version', () => {
    expect(populated().serialize().version).toBe(SAVE_VERSION);
  });

  it('migrates a v1 vertical-slice save without losing progress', () => {
    const v1 = {
      version: 1,
      abilities: ['backtrace', 'glitch-strike', 'bogus'],
      secrets: ['alley:H:2,19'],
      brokenWalls: ['alley:wall:5,16'],
      latchedGates: ['transit:timedGate'],
      fragmentsCollected: ['alley:F:0'],
      maxHealthBonus: 1,
      checkpoint: { roomId: 'transit', x: 10, y: 20 },
      bossDefeated: true,
      panoptixDefeated: false,
      deaths: 4,
      playTime: 99,
    };
    const store = new MemorySaveStore();
    store.save(JSON.stringify(v1));
    const p = loadProgression(store)!;
    expect(p).not.toBeNull();
    expect(p.has('backtrace')).toBe(true);
    expect(p.has('glitch-strike')).toBe(true);
    expect(p.abilities.size).toBe(2);
    expect(p.bossDefeated).toBe(true);
    expect(p.panoptixDefeated).toBe(false);
    expect(p.defeatedBosses.has('bulwark-9')).toBe(true);
    expect(p.checkpoint).toEqual({ roomId: 'transit', x: 10, y: 20 });
    expect(p.maxHealthBonus).toBe(1);
    expect(p.scrap).toBe(0);
    expect(p.flags.size).toBe(0);
  });

  it.each([
    ['not json', '{{{'],
    ['null', 'null'],
    ['number', '42'],
    ['array', '[]'],
    ['unknown future version', JSON.stringify({ version: 99 })],
    ['missing version', JSON.stringify({ abilities: [] })],
  ])('rejects unusable saves safely (%s)', (_name, text) => {
    const store = new MemorySaveStore();
    store.save(text);
    expect(loadProgression(store)).toBeNull();
  });

  it('repairs individually corrupt fields instead of discarding the whole save', () => {
    const bad = {
      version: 2,
      abilities: ['backtrace', 5, null],
      flags: ['ok', 7, {}],
      inventory: { key: 3, junk: 'x', neg: -5, huge: 1e12 },
      scrap: -50,
      upgrades: { backtraceWindow: 99, notAnUpgrade: 3, backtraceBurst: 'many' },
      quests: { good: { status: 'complete', progress: { a: 1, b: 'x' } }, bad: { status: 'weird', progress: {} }, worse: 5 },
      checkpoint: { roomId: 'alley', x: NaN, y: 4 },
      maxHealthBonus: -3,
      deaths: 'many',
      interactState: { a: 'open', b: 3 },
    };
    const store = new MemorySaveStore();
    store.save(JSON.stringify(bad));
    const p = loadProgression(store)!;
    expect(p).not.toBeNull();
    expect(p.has('backtrace')).toBe(true);
    expect([...p.flags]).toEqual(['ok']);
    expect(p.itemCount('key')).toBe(3);
    expect(p.itemCount('junk')).toBe(0);
    expect(p.itemCount('neg')).toBe(0);
    expect(p.itemCount('huge')).toBeLessThanOrEqual(9999);
    expect(p.scrap).toBe(0);
    expect(p.upgradeLevel('backtraceWindow')).toBe(maxUpgradeLevel('backtraceWindow'));
    expect(p.upgradeLevel('backtraceBurst')).toBe(0);
    expect(Object.keys(p.quests)).toEqual(['good']);
    expect(p.quests['good']!.progress).toEqual({ a: 1 });
    expect(p.checkpoint).toBeNull();
    expect(p.maxHealthBonus).toBe(0);
    expect(p.deaths).toBe(0);
    expect(p.interactState).toEqual({ a: 'open' });
  });

  it('survives a storage backend that throws', () => {
    const throwing = {
      load: () => {
        throw new Error('denied');
      },
      save: () => {
        throw new Error('quota');
      },
      clear: () => undefined,
    };
    expect(loadProgression(throwing)).toBeNull();
    expect(() => saveProgression(throwing, populated())).not.toThrow();
  });
});

describe('currency, items, flags and upgrades', () => {
  it('spends scrap only when affordable and never goes negative', () => {
    const p = new Progression();
    p.addScrap(30);
    expect(p.spendScrap(50)).toBe(false);
    expect(p.scrap).toBe(30);
    expect(p.spendScrap(30)).toBe(true);
    expect(p.scrap).toBe(0);
    p.addScrap(-100);
    expect(p.scrap).toBe(0);
    expect(p.spendScrap(-5)).toBe(false);
  });

  it('flags are set once; items stack and clean up at zero', () => {
    const p = new Progression();
    expect(p.setFlag('a')).toBe(true);
    expect(p.setFlag('a')).toBe(false);
    p.addItem('fuse', 3);
    p.addItem('fuse', -3);
    expect(p.itemCount('fuse')).toBe(0);
    expect('fuse' in p.inventory).toBe(false);
  });

  it('upgrade ladders are monotone, priced, and cap at their max', () => {
    for (const id of UPGRADE_IDS) {
      const max = maxUpgradeLevel(id);
      expect(max).toBeGreaterThanOrEqual(1);
      let prevCost = 0;
      for (let l = 0; l < max; l++) {
        const cost = nextUpgradeCost(id, l)!;
        expect(cost).toBeGreaterThan(0);
        expect(cost).toBeGreaterThanOrEqual(prevCost);
        prevCost = cost;
      }
      expect(nextUpgradeCost(id, max)).toBeNull();
      expect(upgradeValue(id, 999)).toBe(upgradeValue(id, max));
      const p = new Progression();
      for (let l = 0; l < max; l++) expect(p.raiseUpgrade(id)).toBe(l + 1);
      expect(p.raiseUpgrade(id)).toBeNull();
    }
    // Windows must stay inside the history buffer; cooldowns must improve.
    expect(upgradeValue('backtraceWindow', 3)).toBeLessThanOrEqual(6);
    expect(upgradeValue('backtraceCooldown', 3)).toBeLessThan(upgradeValue('backtraceCooldown', 0));
  });

  it('legacy boss accessors stay in sync with the defeated set', () => {
    const p = new Progression();
    p.bossDefeated = true;
    p.panoptixDefeated = true;
    expect([...p.defeatedBosses].sort()).toEqual(['bulwark-9', 'panoptix-0']);
    p.bossDefeated = false;
    expect(p.defeatedBosses.has('bulwark-9')).toBe(false);
  });
});
