import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../src/config/tuning';
import { analyseRoom, canStand, touches, type ReachAbilities, type ReachResult } from '../src/world/reach';
import { ROOMS } from '../src/world/rooms';
import type { RoomDef } from '../src/world/types';

/** Abilities the Courier is guaranteed to own when first entering each room (progression order of the campaign). */
const AIR_JUMP_ROOMS = new Set(['undercity_towers', 'core_pipeworks', 'core_foundry', 'core_reactor', 'core_kiln', 'null_archive', 'cathedral_nave', 'cathedral_sanctum']);
const abilitiesFor = (id: string): ReachAbilities => ({ dash: true, airJump: AIR_JUMP_ROOMS.has(id) });

const results = new Map<string, ReachResult>();
function analyse(room: RoomDef, abilities = abilitiesFor(room.id)): ReachResult {
  const key = `${room.id}:${abilities.dash}:${abilities.airJump}`;
  let r = results.get(key);
  if (!r) {
    const starts = Object.values(room.entries).map((e) => ({ col: e.col, row: e.row }));
    r = analyseRoom(room, starts, { abilities });
    results.set(key, r);
  }
  return r;
}

/** All markers of a char in a legacy layout. */
function markers(room: RoomDef, ch: string): { col: number; row: number }[] {
  const out: { col: number; row: number }[] = [];
  room.layout.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) if (line[col] === ch) out.push({ col, row });
  });
  return out;
}

describe('every authored room is physically completable (real-physics reachability)', () => {
  for (const room of ROOMS) {
    describe(room.id, () => {
      it('lets the Courier reach every door trigger from every entry', () => {
        const r = analyse(room);
        for (const d of room.doors) {
          expect(touches(r, d.area.col, d.area.row, d.area.cols, d.area.rows), `door ${d.id} unreachable`).toBe(true);
        }
        for (const [name, e] of Object.entries(room.entries)) {
          expect(canStand(r, e.col, e.row), `entry ${name}`).toBe(true);
        }
      });

      it('lets the Courier reach every pickup, NPC, relay and secret', () => {
        const r = analyse(room);
        const missing: string[] = [];
        for (const sp of room.spawns ?? []) {
          if (sp.kind === 'pickup' && !touches(r, sp.col, sp.row)) missing.push(`pickup ${sp.id} at ${sp.col},${sp.row}`);
          if (sp.kind === 'npc') {
            // Talk range is ~36px: a standable cell within 2 columns and 2 rows is close enough.
            let near = false;
            for (let dc = -2; dc <= 2; dc++) for (let dr = -2; dr <= 2; dr++) if (canStand(r, sp.col + dc, sp.row + dr)) near = true;
            if (!near) missing.push(`npc ${sp.npc} at ${sp.col},${sp.row}`);
          }
        }
        for (const m of markers(room, 'K')) if (!touches(r, m.col, m.row)) missing.push(`relay at ${m.col},${m.row}`);
        for (const m of markers(room, 'G')) if (!touches(r, m.col, m.row)) missing.push(`glitch-strike at ${m.col},${m.row}`);
        for (const m of markers(room, 'H')) if (!touches(r, m.col, m.row)) missing.push(`integrity cell at ${m.col},${m.row}`);
        for (const m of markers(room, 'F')) if (!touches(r, m.col, m.row)) missing.push(`memory fragment at ${m.col},${m.row}`);
        for (const m of markers(room, 'S')) if (!touches(r, m.col, m.row)) missing.push(`override switch at ${m.col},${m.row}`);
        expect(missing).toEqual([]);
      });

      it('has every ground enemy and boss spawn standing on something', () => {
        const { TileGrid } = { TileGrid: null as unknown };
        void TileGrid;
        const r = analyse(room);
        const grid = r.grid;
        for (const sp of room.spawns ?? []) {
          if (sp.kind === 'enemy' && ['scrapHound', 'streetScavenger', 'heavyEnforcer', 'phaseStalker'].includes(sp.type)) {
            expect(grid.isStandable(sp.col, sp.row + 1), `${sp.type} at ${sp.col},${sp.row} has no floor`).toBe(true);
            expect(grid.isSolid(sp.col, sp.row), `${sp.type} at ${sp.col},${sp.row} is inside a wall`).toBe(false);
          }
          if (sp.kind === 'npc') {
            expect(grid.isStandable(sp.col, sp.row + 1), `npc ${sp.npc} floats`).toBe(true);
            expect(grid.isSolid(sp.col, sp.row), `npc ${sp.npc} is inside a wall`).toBe(false);
          }
        }
        void TILE_SIZE;
      });
    });
  }
});

describe('no one-way traps: from any entry the Courier can reach every door of the room', () => {
  for (const room of ROOMS) {
    it(`${room.id}`, () => {
      const abilities = abilitiesFor(room.id);
      const problems: string[] = [];
      for (const [name, e] of Object.entries(room.entries)) {
        const r = analyseRoom(room, [{ col: e.col, row: e.row }], { abilities });
        for (const d of room.doors) {
          if (!touches(r, d.area.col, d.area.row, d.area.cols, d.area.rows)) problems.push(`from ${name}: door ${d.id}`);
        }
      }
      expect(problems).toEqual([]);
    });
  }
});
