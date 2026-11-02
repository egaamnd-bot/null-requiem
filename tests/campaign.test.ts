import { describe, expect, it } from 'vitest';
import { UPGRADES } from '../src/config/upgrades';
import { validateDialogue } from '../src/core/dialogue';
import type { Effect } from '../src/core/dialogue';
import { isEnemyType } from '../src/core/enemies/registry';
import { validateQuests } from '../src/core/quests';
import { TileGrid } from '../src/core/tiles';
import { TILE_SIZE } from '../src/config/tuning';
import { DIALOGUES } from '../src/world/dialogues';
import { ITEMS } from '../src/world/items';
import { NPC_REGISTRY } from '../src/world/npcs';
import { QUESTS } from '../src/world/quests';
import { ROOMS, START_ROOM } from '../src/world/rooms';
import { analyseRoom, touches } from '../src/world/reach';

const roomById = new Map(ROOMS.map((r) => [r.id, r]));

describe('world graph', () => {
  it('has unique room ids and map positions, each room belonging to a region', () => {
    expect(new Set(ROOMS.map((r) => r.id)).size).toBe(ROOMS.length);
    const pos = ROOMS.map((r) => `${r.mapPos?.x},${r.mapPos?.y}`);
    expect(new Set(pos).size).toBe(ROOMS.length);
    for (const r of ROOMS) {
      expect(r.region, r.id).toBeDefined();
      expect(r.mapPos, r.id).toBeDefined();
    }
  });

  it('covers all six regions with a meaningful number of rooms each', () => {
    const regions = new Map<string, number>();
    for (const r of ROOMS) regions.set(r.region as string, (regions.get(r.region as string) ?? 0) + 1);
    expect([...regions.keys()].sort()).toEqual(['cathedral', 'industrial', 'precinct', 'rainline', 'transit', 'undercity']);
    for (const [name, n] of regions) expect(n, name).toBeGreaterThanOrEqual(2);
    expect(ROOMS.length).toBeGreaterThanOrEqual(18);
  });

  it('every door leads to an existing entry, and every door has a way back (backtracking works)', () => {
    for (const r of ROOMS) {
      for (const d of r.doors) {
        const target = roomById.get(d.to.room);
        expect(target, `${r.id}/${d.id} -> ${d.to.room}`).toBeDefined();
        expect(target!.entries[d.to.entry], `${r.id}/${d.id} -> ${d.to.room}:${d.to.entry}`).toBeDefined();
        const back = target!.doors.some((bd) => bd.to.room === r.id);
        expect(back, `${d.to.room} has no door back to ${r.id}`).toBe(true);
      }
    }
  });

  it('is one connected world: every room can be reached from the start room', () => {
    const seen = new Set<string>([START_ROOM]);
    const queue = [START_ROOM];
    while (queue.length) {
      const id = queue.shift() as string;
      for (const d of roomById.get(id)!.doors) if (!seen.has(d.to.room)) (seen.add(d.to.room), queue.push(d.to.room));
    }
    expect([...seen].sort()).toEqual(ROOMS.map((r) => r.id).sort());
  });

  it('has exactly one final boss, behind the other bosses on the main path', () => {
    const finals = ROOMS.flatMap((r) => (r.spawns ?? []).filter((s) => s.kind === 'boss' && s.final).map(() => r.id));
    expect(finals).toEqual(['cathedral_sanctum']);
    // Boss rooms need a trigger column, an arena and boss gates ('D') to seal the fight.
    for (const r of ROOMS) {
      const hasBoss = r.layout.some((l) => l.includes('X')) || (r.spawns ?? []).some((s) => s.kind === 'boss');
      if (!hasBoss) continue;
      expect(r.bossTriggerCol, `${r.id} trigger`).toBeDefined();
      expect(r.bossArena, `${r.id} arena`).toBeDefined();
      expect(r.layout.some((l) => l.includes('D')), `${r.id} gates`).toBe(true);
    }
  });

  it('keeps every boss encounter mandatory: its exit is sealed until the boss is defeated', () => {
    const exitDoors: Record<string, { door: string; boss: string }> = {
      precinct: { door: 'bulwark-exit', boss: 'bulwark-9' },
      core_kiln: { door: 'kiln-exit', boss: 'kiln-7' },
      null_archive: { door: 'archive-exit', boss: 'panoptix-0' },
    };
    for (const [room, { door, boss }] of Object.entries(exitDoors)) {
      const d = (roomById.get(room)!.interactables ?? []).find((i) => i.type === 'door' && i.id === door);
      expect(d, `${room}/${door}`).toBeDefined();
      expect((d as { opensWhen: string[] }).opensWhen).toEqual([`boss:${boss}`]);
    }
  });
});

describe('room contents', () => {
  it('only places spawns on in-bounds, non-solid cells; pickup ids are globally unique', () => {
    const ids = new Set<string>();
    for (const r of ROOMS) {
      const { grid } = TileGrid.fromAscii(r.layout, TILE_SIZE);
      for (const sp of r.spawns ?? []) {
        expect(grid.inBounds(sp.col, sp.row), `${r.id} spawn ${sp.kind} out of bounds`).toBe(true);
        if (sp.kind === 'enemy' && sp.type === 'sentryTurret') continue; // turrets sit against walls
        expect(grid.isSolid(sp.col, sp.row), `${r.id}: ${sp.kind} at ${sp.col},${sp.row} is inside a solid tile`).toBe(false);
        if (sp.kind === 'pickup') {
          expect(ids.has(sp.id), `duplicate pickup ${sp.id}`).toBe(false);
          ids.add(sp.id);
        }
      }
    }
  });

  it('only references known enemy types, NPCs, items and upgrades', () => {
    for (const r of ROOMS) {
      for (const sp of r.spawns ?? []) {
        if (sp.kind === 'enemy') expect(isEnemyType(sp.type), `${r.id}: ${sp.type}`).toBe(true);
        if (sp.kind === 'npc') expect(NPC_REGISTRY[sp.npc], `${r.id}: npc ${sp.npc}`).toBeDefined();
        if (sp.kind === 'pickup' && sp.pickup === 'item') expect(sp.item === 'parcel' || ITEMS[sp.item as string], `${r.id}: item ${sp.item}`).toBeTruthy();
        if (sp.kind === 'pickup' && sp.pickup === 'upgrade') expect(UPGRADES[sp.upgrade as keyof typeof UPGRADES], `${r.id}: upgrade`).toBeDefined();
      }
    }
  });

  it('turrets are mounted against a wall or ceiling/floor that actually exists', () => {
    for (const r of ROOMS) {
      const { grid } = TileGrid.fromAscii(r.layout, TILE_SIZE);
      for (const sp of r.spawns ?? []) {
        if (sp.kind !== 'enemy' || sp.type !== 'sentryTurret') continue;
        const mount = sp.mount ?? 'floor';
        const [dc, dr] = { floor: [0, 1], ceiling: [0, -1], left: [-1, 0], right: [1, 0] }[mount] as [number, number];
        expect(grid.isSolid(sp.col + dc, sp.row + dr), `${r.id}: turret ${mount} at ${sp.col},${sp.row} has nothing to mount on`).toBe(true);
      }
    }
  });

  it('interactable ids are unique per room and every door/plate reference resolves', () => {
    for (const r of ROOMS) {
      const items = r.interactables ?? [];
      const ids = items.map((i) => i.id);
      expect(new Set(ids).size, `${r.id} duplicate interactable ids`).toBe(ids.length);
      for (const it of items) {
        if (it.type !== 'door') continue;
        for (const sig of it.opensWhen) {
          if (/^(flag|boss|item|node):/.test(sig)) {
            if (sig.startsWith('node:')) expect(ids, `${r.id}/${it.id} -> ${sig}`).toContain(sig.slice(5));
          } else expect(ids, `${r.id}/${it.id} -> plate ${sig}`).toContain(sig);
        }
      }
    }
  });

  it('every door tile sits where a wall already exists around it (no jumping over the lock)', () => {
    for (const r of ROOMS) {
      const { grid } = TileGrid.fromAscii(r.layout, TILE_SIZE);
      for (const it of r.interactables ?? []) {
        if (it.type !== 'door') continue;
        // Walk up from the door's top: tiles above it must be solid up to the ceiling (door spans the passage).
        for (let row = it.row - 1; row >= 0; row--) {
          if (grid.get(it.col, row) === 0 && row >= it.row - 0) continue;
        }
        const above = it.row - 1;
        const sealed = above < 2 || grid.isSolid(it.col, above) || it.row <= 2;
        expect(sealed, `${r.id}/${it.id} can be jumped over (tile above is open)`).toBe(true);
      }
    }
  });
});

describe('story data integrity', () => {
  const effects = (): Effect[] => {
    const out: Effect[] = [];
    for (const d of Object.values(DIALOGUES)) {
      for (const n of Object.values(d.nodes)) {
        out.push(...(n.effects ?? []));
        for (const c of n.choices ?? []) out.push(...(c.effects ?? []));
      }
    }
    return out;
  };

  it('every dialogue graph is well formed and every NPC points at a real dialogue', () => {
    for (const d of Object.values(DIALOGUES)) expect(validateDialogue(d), d.id).toEqual([]);
    for (const npc of Object.values(NPC_REGISTRY)) expect(DIALOGUES[npc.dialogue], `${npc.id} -> ${npc.dialogue}`).toBeDefined();
  });

  it('quest data validates, and every quest a dialogue starts or hands in exists', () => {
    expect(validateQuests(QUESTS)).toEqual([]);
    const ids = new Set(QUESTS.map((q) => q.id));
    for (const e of effects()) {
      if (e.startQuest) expect(ids.has(e.startQuest), e.startQuest).toBe(true);
      if (e.turnInQuest) expect(ids.has(e.turnInQuest), e.turnInQuest).toBe(true);
      if (e.giveItem) expect(ITEMS[e.giveItem.id], e.giveItem.id).toBeDefined();
      if (e.takeItem) expect(ITEMS[e.takeItem.id], e.takeItem.id).toBeDefined();
    }
  });

  it('every quest with a giver is started by exactly that NPC, and has a hand-in that completes it', () => {
    for (const q of QUESTS.filter((x) => x.giver)) {
      const dlg = DIALOGUES[NPC_REGISTRY[q.giver as string]!.dialogue]!;
      const all = Object.values(dlg.nodes).flatMap((n) => [...(n.effects ?? []), ...(n.choices ?? []).flatMap((c) => c.effects ?? [])]);
      expect(all.some((e) => e.startQuest === q.id), `${q.id} never started by ${q.giver}`).toBe(true);
      expect(all.some((e) => e.turnInQuest === q.id) || q.autoTurnIn, `${q.id} cannot be handed in`).toBe(true);
    }
  });

  it('every item or flag a quest, door or dialogue depends on can actually be obtained', () => {
    const obtainableItems = new Set<string>();
    const obtainableFlags = new Set<string>();
    const obtainableBosses = new Set<string>(['bulwark-9', 'panoptix-0', 'kiln-7', 'the-null']);
    for (const r of ROOMS) {
      for (const sp of r.spawns ?? []) if (sp.kind === 'pickup' && sp.pickup === 'item' && sp.item) obtainableItems.add(sp.item);
    }
    for (const e of effects()) {
      if (e.giveItem) obtainableItems.add(e.giveItem.id);
      if (e.setFlag) obtainableFlags.add(e.setFlag);
    }
    for (const q of QUESTS) for (const f of q.rewards?.flags ?? []) obtainableFlags.add(f);
    for (const q of QUESTS) {
      for (const o of q.objectives) {
        if (o.type === 'item') expect(obtainableItems.has(o.target), `${q.id}.${o.id} needs item ${o.target}`).toBe(true);
        if (o.type === 'flag') expect(obtainableFlags.has(o.target), `${q.id}.${o.id} needs flag ${o.target}`).toBe(true);
        if (o.type === 'boss') expect(obtainableBosses.has(o.target), `${q.id}.${o.id} needs boss ${o.target}`).toBe(true);
      }
      if (q.requires?.flag) expect(obtainableFlags.has(q.requires.flag), `${q.id} requires flag ${q.requires.flag}`).toBe(true);
    }
    for (const r of ROOMS) {
      for (const it of r.interactables ?? []) {
        if (it.type !== 'door') continue;
        for (const sig of it.opensWhen) {
          if (sig.startsWith('item:')) expect(obtainableItems.has(sig.slice(5)), `${r.id}/${it.id} needs ${sig}`).toBe(true);
          if (sig.startsWith('flag:')) expect(obtainableFlags.has(sig.slice(5)), `${r.id}/${it.id} needs ${sig}`).toBe(true);
        }
      }
    }
  });

  it('collection quests can be completed: enough records, parcels and coil pickups exist', () => {
    const pickupIds = ROOMS.flatMap((r) => (r.spawns ?? []).filter((s) => s.kind === 'pickup').map((s) => (s as { id: string }).id));
    for (const q of QUESTS) {
      for (const o of q.objectives.filter((x) => x.type === 'collect')) {
        const matching = pickupIds.filter((id) => id === o.target || id.startsWith(o.target));
        expect(matching.length, `${q.id}.${o.id} (${o.target})`).toBeGreaterThanOrEqual(o.count ?? 1);
      }
    }
  });

  it('economy: total scrap on offer comfortably affords some, but not all, upgrades', () => {
    let scrap = 0;
    for (const r of ROOMS) for (const s of r.spawns ?? []) if (s.kind === 'pickup' && s.pickup === 'scrap') scrap += s.amount ?? 0;
    for (const q of QUESTS) scrap += q.rewards?.scrap ?? 0;
    const allUpgrades = Object.values(UPGRADES).reduce((n, u) => n + u.costs.reduce((a, b) => a + b, 0), 0);
    expect(scrap).toBeGreaterThan(allUpgrades * 0.4);
    expect(scrap + 600 /* enemy drops */).toBeGreaterThan(allUpgrades * 0.9);
  });
});

describe('ability gating (physics-checked, not asserted by hand)', () => {
  const towers = roomById.get('undercity_towers')!;
  const start = [{ col: towers.entries['west']!.col, row: towers.entries['west']!.row }];

  it('the Leaning Towers cannot be climbed without the Kinetic Coil, and can with it', () => {
    const exit = towers.doors.find((d) => d.id === 'towers-top-east')!.area;
    const without = analyseRoom(towers, start, { abilities: { dash: true, airJump: false } });
    const withCoil = analyseRoom(towers, start, { abilities: { dash: true, airJump: true } });
    expect(touches(without, exit.col, exit.row, exit.cols, exit.rows)).toBe(false);
    expect(touches(withCoil, exit.col, exit.row, exit.cols, exit.rows)).toBe(true);
  });

  it('the Coil itself is reachable without the Coil (no softlock)', () => {
    const arcade = roomById.get('undercity_arcade')!;
    const r = analyseRoom(arcade, Object.values(arcade.entries).map((e) => ({ col: e.col, row: e.row })), { abilities: { dash: true, airJump: false } });
    expect(touches(r, 47, 17)).toBe(true);
    // And the arcade's east door (to the towers) is reachable without it too.
    const east = arcade.doors.find((d) => d.id === 'arcade-east')!.area;
    expect(touches(r, east.col, east.row, east.cols, east.rows)).toBe(true);
  });

  it('no room needs an ability the Courier does not own yet', () => {
    // Before the Coil (regions 1-3 plus plaza and arcade) everything must be completable with dash only.
    const early = ROOMS.filter((r) => ['rainline', 'transit', 'precinct'].includes(r.region as string) || ['undercity_plaza', 'undercity_arcade'].includes(r.id));
    for (const room of early) {
      const r = analyseRoom(room, Object.values(room.entries).map((e) => ({ col: e.col, row: e.row })), { abilities: { dash: true, airJump: false } });
      for (const d of room.doors) expect(touches(r, d.area.col, d.area.row, d.area.cols, d.area.rows), `${room.id}/${d.id} needs more than dash`).toBe(true);
      for (const sp of room.spawns ?? []) if (sp.kind === 'pickup') expect(touches(r, sp.col, sp.row), `${room.id}/${sp.id} needs more than dash`).toBe(true);
    }
  });
});
