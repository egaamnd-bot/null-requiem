import { RoomBuilder } from '../roomBuilder';
import type { RoomDef } from '../types';

/** Region 3 — Precinct Vault: restricted security complex. Turrets, lasers, a locked checkpoint, and BULWARK-9. */

// ─────────────────────────────────────────────────────────────────────────────── PRECINCT CHECKPOINT
function buildGate(): RoomDef {
  const b = new RoomBuilder(64, 20);
  // Staircase to the barracks ledge (upper route), each step three tiles.
  b.ledge(12, 15, 6);
  b.ledge(22, 12, 6);
  b.ledge(32, 9, 16);
  // The keycard door: solid lintel above it so it cannot be jumped.
  b.solid(52, 2, 52, 13);
  b.mark('K', 6, 17);
  return {
    id: 'precinct_gate',
    name: 'Precinct Checkpoint',
    region: 'precinct',
    mapPos: { x: 8, y: 0 },
    layout: b.build(),
    entries: { west: { col: 4, row: 17 }, east: { col: 60, row: 17 } },
    doors: [
      { id: 'gate-west', area: b.doorWest(14, 17), to: { room: 'transit_shaft', entry: 'top_east' } },
      { id: 'gate-east', area: b.doorEast(14, 17), to: { room: 'precinct_cells', entry: 'west' } },
    ],
    theme: { rock: 0x2c2a36, edge: 0xa69e92, skyTop: 0x08050a, skyBottom: 0x24101e, glow: 0xff3b4e },
    spawns: [
      { kind: 'enemy', type: 'sentryTurret', col: 24, row: 2, mount: 'ceiling' },
      { kind: 'enemy', type: 'sentryTurret', col: 42, row: 2, mount: 'ceiling' },
      { kind: 'enemy', type: 'streetScavenger', col: 30, row: 17 },
      { kind: 'enemy', type: 'heavyEnforcer', col: 44, row: 8, elite: true },
      { kind: 'pickup', id: 'gate:keycard', pickup: 'item', item: 'precinct-keycard', col: 47, row: 8 },
      { kind: 'pickup', id: 'gate:cache', pickup: 'scrap', amount: 25, col: 15, row: 14 },
      { kind: 'pickup', id: 'rec:gate', pickup: 'record', title: 'Checkpoint Orders', text: 'STANDING ORDER 9: any citizen who remembers the flood is to be escorted to Memory Audit. Do not ask what the flood was. Do not remember asking.', col: 25, row: 11 },
    ],
    interactables: [
      {
        type: 'door',
        id: 'gate-door',
        col: 52,
        row: 14,
        cols: 1,
        rows: 4,
        opensWhen: ['item:precinct-keycard'],
        latch: true,
        lockedHint: 'LEVEL-3 ACCESS REQUIRED. The checkpoint barracks, up the steps, may have a card.',
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────── HOLDING CELLS
function buildCells(): RoomDef {
  const b = new RoomBuilder(60, 20);
  // Two sealed cells: B walls on their corridor faces.
  b.solid(10, 12, 16, 17).air(11, 15, 15, 17).fill('B', 16, 15, 16, 17);
  b.solid(44, 12, 51, 17).air(45, 15, 46, 17).fill('B', 44, 15, 44, 17);
  // Step-ups over each cell block keep the corridor passable on top.
  b.catwalk(7, 15, 3).catwalk(41, 15, 3).catwalk(17, 15, 3).catwalk(52, 15, 3);
  b.mark('K', 6, 17);
  return {
    id: 'precinct_cells',
    name: 'Holding Cells',
    region: 'precinct',
    mapPos: { x: 9, y: 0 },
    layout: b.build(),
    entries: { west: { col: 4, row: 17 }, east: { col: 55, row: 17 } },
    doors: [
      { id: 'cells-west', area: b.doorWest(14, 17), to: { room: 'precinct_gate', entry: 'east' } },
      { id: 'cells-east', area: b.doorEast(14, 17), to: { room: 'precinct', entry: 'west' } },
    ],
    theme: { rock: 0x25222e, edge: 0x988fa0, skyTop: 0x080509, skyBottom: 0x2a0a14, glow: 0xff3b4e },
    spawns: [
      { kind: 'npc', npc: 'cell-terminal', col: 8, row: 17 },
      { kind: 'enemy', type: 'streetScavenger', col: 27, row: 17 },
      { kind: 'enemy', type: 'securityDrone', col: 36, row: 7 },
      { kind: 'enemy', type: 'streetScavenger', col: 54, row: 17 },
      { kind: 'pickup', id: 'cells:medkit', pickup: 'item', item: 'med-kit', col: 12, row: 17 },
      { kind: 'pickup', id: 'cells:badge', pickup: 'item', item: 'badge-fragment', col: 45, row: 17 },
      { kind: 'pickup', id: 'cells:cache', pickup: 'scrap', amount: 20, col: 31, row: 17 },
      { kind: 'pickup', id: 'parcel:cells', pickup: 'item', item: 'parcel', col: 56, row: 17 },
    ],
    interactables: [
      // Laser interlocks: walk in the dark, run in the light.
      { type: 'emitter', id: 'cells-l1', col: 21, row: 2, dir: 'down', length: 15, period: 2.4, telegraph: 0.6, active: 0.8, offset: 0, style: 'laser' },
      { type: 'emitter', id: 'cells-l2', col: 24, row: 2, dir: 'down', length: 15, period: 2.4, telegraph: 0.6, active: 0.8, offset: 0.8, style: 'laser' },
      { type: 'emitter', id: 'cells-l3', col: 37, row: 2, dir: 'down', length: 15, period: 2.4, telegraph: 0.6, active: 0.8, offset: 1.6, style: 'laser' },
    ],
  };
}

export const PRECINCT_ROOMS: RoomDef[] = [buildGate(), buildCells()];
