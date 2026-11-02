import { RoomBuilder } from '../roomBuilder';
import type { RoomDef } from '../types';

/** Region 2 — Transit Stacks: multi-level industrial transit. Vertical platforming, moving platforms, hidden passages. */

// ─────────────────────────────────────────────────────────────────────────────── STACKS YARD
function buildYard(): RoomDef {
  const b = new RoomBuilder(72, 22);
  // Cover and a staircase of catwalks climbing to the high route.
  b.solid(24, 17, 27, 19);
  b.catwalk(30, 17, 8).catwalk(38, 14, 8).catwalk(46, 11, 8);
  b.catwalk(56, 11, 14);
  // Hidden cavity in the east of the yard: a cracked wall (B) guards an upgrade. A catwalk lets the low route climb over it.
  b.solid(60, 14, 67, 19).air(61, 17, 62, 19).catwalk(55, 17, 3).catwalk(68, 17, 2);
  b.fill('B', 60, 17, 60, 19);
  b.mark('K', 6, 19);
  b.mark('C', 22, 19);
  return {
    id: 'transit_yard',
    name: 'Stacks Yard',
    region: 'transit',
    mapPos: { x: 6, y: 1 },
    layout: b.build(),
    entries: { west: { col: 4, row: 19 }, east: { col: 68, row: 19 }, east_high: { col: 64, row: 10 } },
    doors: [
      { id: 'yard-west', area: b.doorWest(16, 19), to: { room: 'transit', entry: 'east' } },
      { id: 'yard-east', area: b.doorEast(16, 19), to: { room: 'transit_shaft', entry: 'bottom_west' } },
      { id: 'yard-east-high', area: b.doorEast(7, 10), to: { room: 'transit_shaft', entry: 'upper_west' } },
    ],
    theme: { rock: 0x252a3a, edge: 0x9aa6c4, skyTop: 0x04060e, skyBottom: 0x16102e, glow: 0xff9f3e },
    spawns: [
      { kind: 'npc', npc: 'halden', col: 10, row: 19 },
      { kind: 'enemy', type: 'streetScavenger', col: 40, row: 19 },
      { kind: 'enemy', type: 'streetScavenger', col: 52, row: 19 },
      { kind: 'enemy', type: 'securityDrone', col: 34, row: 9 },
      { kind: 'pickup', id: 'yard:cache', pickup: 'scrap', amount: 20, col: 33, row: 16 },
      { kind: 'pickup', id: 'parcel:yard', pickup: 'item', item: 'parcel', col: 49, row: 10 },
      { kind: 'pickup', id: 'yard:core', pickup: 'upgrade', upgrade: 'backtraceCooldown', col: 62, row: 19 },
      { kind: 'pickup', id: 'rec:yard', pickup: 'record', title: 'Yard Foreman\'s Whiteboard', text: 'SHIFT LOG: lift motor tripped again. Quiet-night overtime unpaid. If the audit people come, we never saw the flood.', col: 14, row: 19 },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────── THE STACKS SHAFT
function buildShaft(): RoomDef {
  const b = new RoomBuilder(44, 36);
  // Ascent: ledges and platforms, every rise at most three tiles.
  b.ledge(3, 31, 10);
  b.ledge(4, 15, 23);
  b.ledge(30, 25, 7);
  b.ledge(28, 12, 10).catwalk(38, 12, 4);
  b.mark('K', 8, 14);
  b.mark('W', 20, 23);
  b.mark('W', 12, 19);
  b.mark('C', 16, 14);
  return {
    id: 'transit_shaft',
    name: 'The Stacks Shaft',
    region: 'transit',
    mapPos: { x: 7, y: 0 },
    layout: b.build(),
    entries: { bottom_west: { col: 5, row: 33 }, upper_west: { col: 6, row: 14 }, top_east: { col: 34, row: 11 } },
    doors: [
      { id: 'shaft-bottom-west', area: b.doorWest(30, 33), to: { room: 'transit_yard', entry: 'east' } },
      { id: 'shaft-upper-west', area: b.doorWest(11, 14), to: { room: 'transit_yard', entry: 'east_high' } },
      { id: 'shaft-top-east', area: b.doorEast(8, 11), to: { room: 'precinct_gate', entry: 'west' } },
    ],
    theme: { rock: 0x272c3e, edge: 0x8f9bbd, skyTop: 0x04060e, skyBottom: 0x1d1236, glow: 0x3cf2ff },
    spawns: [
      { kind: 'enemy', type: 'sentryTurret', col: 41, row: 22, mount: 'right' },
      { kind: 'enemy', type: 'streetScavenger', col: 34, row: 11 },
      { kind: 'pickup', id: 'shaft:cache', pickup: 'scrap', amount: 25, col: 35, row: 24 },
      { kind: 'pickup', id: 'rec:shaft', pickup: 'record', title: 'Lift Inspector\'s Sticker', text: 'CERTIFIED SAFE: 2079. Underneath, in marker: "The lift remembers everyone it dropped." Someone has crossed out "dropped" and written "carried".', col: 8, row: 30 },
    ],
    interactables: [
      // Two moving platforms and a slow freight lift (an alternate route in both directions).
      { type: 'platform', id: 'shaft-p1', col: 14, row: 28, cols: 3, path: [{ col: 14, row: 28 }, { col: 26, row: 28 }], speed: 36, mode: 'pingpong', wait: 0.6 },
      { type: 'platform', id: 'shaft-v1', col: 27, row: 25, cols: 3, path: [{ col: 27, row: 25 }, { col: 27, row: 15 }], speed: 34, mode: 'pingpong', wait: 1 },
      { type: 'platform', id: 'shaft-lift', col: 38, row: 34, cols: 3, path: [{ col: 38, row: 34 }, { col: 38, row: 15 }], speed: 44, mode: 'pingpong', wait: 2.5 },
    ],
  };
}

export const TRANSIT_ROOMS: RoomDef[] = [buildYard(), buildShaft()];
