import { RoomBuilder } from '../roomBuilder';
import type { RoomDef } from '../types';

/** Region 1 — Rainline Alley: the opening area. Movement, first combat, first Backtrace, first puzzle. */

// ─────────────────────────────────────────────────────────────────────────────── RAINLINE DEPOT
function buildDepot(): RoomDef {
  const b = new RoomBuilder(60, 20);
  // Hanging ducts and a service catwalk give the room a roofline and a place for a cache.
  b.solid(10, 2, 14, 4).solid(26, 2, 28, 3).solid(38, 2, 43, 4);
  b.catwalk(14, 15, 6);
  // The east wall of the puzzle: a solid lintel above the interlock door so it cannot be jumped.
  b.solid(47, 2, 47, 13);
  b.mark('K', 6, 17);
  b.mark('W', 24, 10);
  b.mark('C', 52, 17);
  return {
    id: 'alley_depot',
    name: 'Rainline Depot',
    region: 'rainline',
    mapPos: { x: 4, y: 1 },
    layout: b.build(),
    entries: { west: { col: 4, row: 17 }, east: { col: 55, row: 17 } },
    doors: [
      { id: 'depot-west', area: b.doorWest(14, 17), to: { room: 'alley', entry: 'east' } },
      { id: 'depot-east', area: b.doorEast(14, 17), to: { room: 'transit', entry: 'west' } },
    ],
    theme: { rock: 0x2a2a40, edge: 0x9aa4c8, skyTop: 0x05060c, skyBottom: 0x1e0f2e, glow: 0x3cf2ff },
    spawns: [
      { kind: 'npc', npc: 'depot-terminal', col: 9, row: 17 },
      { kind: 'pickup', id: 'depot:backtrace', pickup: 'ability', ability: 'backtrace', col: 30, row: 17 },
      { kind: 'pickup', id: 'depot:cache', pickup: 'scrap', amount: 15, col: 16, row: 14 },
      { kind: 'pickup', id: 'parcel:depot', pickup: 'item', item: 'parcel', col: 56, row: 17 },
    ],
    interactables: [
      // Plate A is held by the Courier and stays down 3 s after they step off; plate B answers only to the echo.
      { type: 'plate', id: 'dep-a', col: 34, row: 17, pressedBy: 'courier', hold: 3 },
      { type: 'plate', id: 'dep-b', col: 41, row: 17, pressedBy: 'echo' },
      {
        type: 'door',
        id: 'depot-door',
        col: 47,
        row: 14,
        cols: 1,
        rows: 4,
        opensWhen: ['dep-a', 'dep-b'],
        mode: 'all',
        latch: true,
        lockedHint: 'Two plates, one pulse. Plate B only listens to your echo.',
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────── THE UNDERCROFT (secret)
function buildUndercroft(): RoomDef {
  const b = new RoomBuilder(60, 18);
  b.ledge(10, 13, 18, 1).ledge(48, 13, 8, 1);
  b.catwalk(30, 14, 6);
  b.mark('K', 7, 15);
  b.mark('W', 15, 8);
  b.mark('W', 39, 8);
  b.mark('C', 14, 15);
  b.mark('C', 39, 15);
  b.mark('G', 12, 12);
  b.mark('F', 23, 10);
  return {
    id: 'undercroft',
    name: 'The Undercroft',
    region: 'rainline',
    mapPos: { x: 2, y: 1 },
    layout: b.build(),
    entries: { east: { col: 55, row: 15 } },
    doors: [{ id: 'undercroft-east', area: b.doorEast(12, 15), to: { room: 'alley', entry: 'undercroft' } }],
    theme: { rock: 0x1a1520, edge: 0x6a5a7a, skyTop: 0x060408, skyBottom: 0x120820, glow: 0x9b59ff },
    spawns: [
      { kind: 'npc', npc: 'null-echo-npc', col: 22, row: 15 },
      { kind: 'pickup', id: 'undercroft:cell', pickup: 'upgrade', upgrade: 'backtraceWindow', col: 52, row: 12 },
      { kind: 'pickup', id: 'rec:undercroft', pickup: 'record', title: 'Undercroft Scratch', text: 'Scratched into the wall, over and over: "4 SECONDS. 4 SECONDS. 4 SECONDS." Beneath it, a tally of someone\'s loops.', col: 44, row: 15 },
      { kind: 'pickup', id: 'undercroft:scrap', pickup: 'scrap', amount: 40, col: 20, row: 12 },
    ],
  };
}

export const RAINLINE_ROOMS: RoomDef[] = [buildDepot(), buildUndercroft()];
