import { CATHEDRAL_ROOMS } from './rooms/cathedral';
import { INDUSTRIAL_ROOMS } from './rooms/industrial';
import { PRECINCT_ROOMS } from './rooms/precinct';
import { RAINLINE_ROOMS } from './rooms/rainline';
import { TRANSIT_ROOMS } from './rooms/transit';
import { UNDERCITY_ROOMS } from './rooms/undercity';
import type { RoomDef } from './types';

/**
 * Null Requiem — vertical slice rooms.
 *
 *  Rainline Alley ──▶ Transit Stacks ──▶ Precinct Vault (Bulwark-9 miniboss)
 *       │
 *       └──▶ Undercroft (hidden, via breakable wall) ──▶ Null Archive (PANOPTIX-0 boss)
 *
 * Marker legend (terrain: # solid, . air, = one-way catwalk, ^ live-current hazard, B breakable wall):
 *   P  player start        K  sync relay (checkpoint)
 *   C  ScrapHound enemy    W  WatcherDrone enemy
 *   A  Backtrace module    H  integrity cell (secret)
 *   X  boss spawn          D  boss gate tile
 *   T  timed gate tile     S  override switch
 *   N  NPC entity          F  memory fragment (lore collectible)
 *   G  glitch-strike upgrade pickup
 */

export const START_ROOM = 'alley';

const LEGACY_ROOMS: readonly RoomDef[] = [
  // ─────────────────────────────────────────────────── RAINLINE ALLEY
  {
    id: 'alley',
    name: 'Rainline Alley',
    layout: [
    '################################################################',
    '################################################################',
    '######..............###..........................###...........#',
    '######..............###..........................###...........#',
    '######..............###..........................###...........#',
    '######...............#...........................###...........#',
    '######............................................#............#',
    '######.........................................................#',
    '######.........................................................#',
    '######..................................F......................#',  // row 9: fragment up high
    '######.......................................======............#',
    '######..................................======.................#',
    '######.........................................................#',
    '######.........................................................#',
    '######........................======...........................#',
    '######..............N..........................................#',  // row 15: Zero NPC
    '#....B...........................C.............................#',
    '#....B....................#############..........F..............',  // row 17: fragment behind wall area
    '#....B....................#############.......##................',
    '#.H..B...P...K.....C......#############.......##..........F.....',  // row 19: integrity cell, player start, fragment
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    ],
    entries: {
      east: { col: 60, row: 19 },
      // Secret undercroft entrance is via a door past the breakable wall (west side)
      undercroft: { col: 1, row: 19 },
    },
    doors: [
      { id: 'alley-east', area: { col: 63, row: 16, cols: 1, rows: 4 }, to: { room: 'transit', entry: 'west' } },
      { id: 'alley-undercroft', area: { col: 0, row: 17, cols: 1, rows: 3 }, to: { room: 'undercroft', entry: 'east' } },
    ],
    theme: { rock: 0x272c3e, edge: 0x8f9bbd, skyTop: 0x05060c, skyBottom: 0x1a0d26, glow: 0x3cf2ff },
  },

  // ─────────────────────────────────────────────────── TRANSIT STACKS
  {
    id: 'transit',
    name: 'Transit Stacks',
    layout: [
    '################################################################################',
    '################################################################################',
    '###..................................###########################################',
    '###..................................###########################################',
    '###..........................W.......###########################################',
    '###..................................###########################################',
    '###..................................###########################################',
    '##.............................A.....###########################################',
    '##........................######################################################',
    '##...................................###########################################',
    '#....................................###########################################',
    '#..................======............###########################################',
    '#....................................###########################################',
    '#....................................###########################################',
    '#...........======...................###########################################',
    '#....................................###########################################',
    '#....................................###########################################',
    '#....======...........W..............###########################################',
    '#....................................###########################################',
    '#...................................F###########################################',  // row 19: fragment
    '#...........======..........................................#.......##....T....#',
    '#...................................................................##....T....#',
    '#.........................................................................T....#',
    '.....======.....N.........................................................T.....',  // row 23: Mira NPC
    '..........................................................................T.....',
    '........................C.........................S.....K.................T.....',
    '#########################################^^^^^^^^###############################',
    '#########################################^^^^^^^^###############################',
    '################################################################################',
    '################################################################################',
    ],
    entries: {
      west: { col: 3, row: 25 },
      east: { col: 76, row: 25 },
    },
    doors: [
      { id: 'transit-west', area: { col: 0, row: 22, cols: 1, rows: 4 }, to: { room: 'alley', entry: 'east' } },
      { id: 'transit-east', area: { col: 79, row: 22, cols: 1, rows: 4 }, to: { room: 'precinct', entry: 'west' } },
    ],
    theme: { rock: 0x252a3a, edge: 0x9aa6c4, skyTop: 0x04060e, skyBottom: 0x0d1830, glow: 0xff3ea5 },
  },

  // ─────────────────────────────────────────────────── PRECINCT VAULT (Bulwark-9)
  {
    id: 'precinct',
    name: 'Precinct Vault',
    layout: [
    '############################################',
    '############################################',
    '######.....................................#',
    '######.....................................#',
    '######.....................................#',
    '######.....................................#',
    '######.....................................#',
    '######.....................................#',
    '######.....................................#',
    '######.....................................#',
    '#....#.....................................#',
    '#....#.....................................#',
    '#....#......=====................=====.....#',
    '.....D.....................................#',
    '.....D..N..................................#',  // row 14: Ghost Terminal NPC
    '.....D..........................X..........#',
    '############################################',
    '############################################',
    '############################################',
    '############################################',
    ],
    entries: {
      west: { col: 2, row: 15 },
    },
    doors: [
      { id: 'precinct-west', area: { col: 0, row: 12, cols: 1, rows: 4 }, to: { room: 'transit', entry: 'east' } },
      { id: 'precinct-archive', area: { col: 42, row: 12, cols: 1, rows: 4 }, to: { room: 'null_archive', entry: 'west' } },
    ],
    theme: { rock: 0x2c2a36, edge: 0xa69e92, skyTop: 0x08050a, skyBottom: 0x2a0a14, glow: 0xff3b4e },
    bossTriggerCol: 10,
    bossArena: { col: 6, row: 2, cols: 37, rows: 14 },
  },

  // ─────────────────────────────────────────────────── UNDERCROFT (secret)
  {
    id: 'undercroft',
    name: 'The Undercroft',
    layout: [
    '############################################################',
    '############################################################',
    '####.......................................................#',
    '####.......................................................#',
    '####...................F...................................#', // fragment
    '####.......................................................#',
    '####...............N.......................................#', // Null Echo NPC
    '####........................................................',
    '####...G..==================........................========', // G = glitch-strike upgrade
    '####........................................................',
    '####........................................................',
    '####...K....................................................', // checkpoint
    '####........................................................',
    '####...........W.......................W....................', // drones
    '####........................................................',
    '####..........C........................C...................#', // hounds
    '############################################################',
    '############################################################',
    ],
    entries: {
      east: { col: 58, row: 15 },
    },
    doors: [
      { id: 'undercroft-east', area: { col: 59, row: 11, cols: 1, rows: 4 }, to: { room: 'alley', entry: 'undercroft' } },
      { id: 'undercroft-archive', area: { col: 58, row: 7, cols: 2, rows: 4 }, to: { room: 'null_archive', entry: 'west' } },
    ],
    theme: { rock: 0x1a1520, edge: 0x6a5a7a, skyTop: 0x060408, skyBottom: 0x120820, glow: 0x9b59ff },
  },

  // ─────────────────────────────────────────────────── NULL ARCHIVE (PANOPTIX-0)
  {
    id: 'null_archive',
    name: 'Null Archive',
    layout: [
    '#############################################################',
    '#############################################################',
    '#...........................................................#',
    '#...........................................................#',
    '#...........................................................#',
    '#...........................................................#',
    '#...........................................................#',
    '#...........................................................#',
    '#...........F...............X...............................#', // fragment + PANOPTIX boss
    '#...........................................................#',
    '#......=====.........................=====..................#',
    '#...........................................................#',
    '#...........................................................#',
    '.....D......................................................#',
    '.....D......................................................#',
    '.....D......................................................#',
    '#############################################################',
    '#############################################################',
    ],
    entries: {
      west: { col: 3, row: 15 },
    },
    doors: [
      { id: 'archive-west', area: { col: 0, row: 12, cols: 1, rows: 4 }, to: { room: 'undercroft', entry: 'east' } },
      // Victory door (east) — open only after PANOPTIX is defeated
      { id: 'archive-victory', area: { col: 59, row: 12, cols: 1, rows: 4 }, to: { room: 'precinct', entry: 'west' } },
    ],
    theme: { rock: 0x0e0c14, edge: 0x7755cc, skyTop: 0x030208, skyBottom: 0x160c2c, glow: 0xcc44ff },
    bossTriggerCol: 10,
    bossArena: { col: 2, row: 2, cols: 56, rows: 14 },
  },
];

// ======================================================================================================
// Campaign assembly: the five original rooms (patched into the larger world) + the new regions.
// ======================================================================================================

const legacy = (id: string): RoomDef => {
  const r = LEGACY_ROOMS.find((x) => x.id === id);
  if (!r) throw new Error(`legacy room ${id} missing`);
  return r;
};

/** Remove legacy marker characters that content moved into `spawns`. */
const stripMarkers = (layout: readonly string[], chars: string): string[] =>
  layout.map((row) =>
    row
      .split('')
      .map((ch) => (chars.includes(ch) ? '.' : ch))
      .join(''),
  );

const ALLEY: RoomDef = {
  ...legacy('alley'),
  region: 'rainline',
  mapPos: { x: 3, y: 1 },
  layout: stripMarkers(legacy('alley').layout, 'N'),
  doors: [
    { id: 'alley-east', area: { col: 63, row: 16, cols: 1, rows: 4 }, to: { room: 'alley_depot', entry: 'west' } },
    // The trigger sits in the first interior column: the old one was inside the solid border and could never be touched.
    { id: 'alley-undercroft', area: { col: 1, row: 17, cols: 1, rows: 3 }, to: { room: 'undercroft', entry: 'east' } },
  ],
  entries: { east: { col: 60, row: 19 }, undercroft: { col: 3, row: 19 } },
  spawns: [
    { kind: 'npc', npc: 'zero', col: 20, row: 19 },
    { kind: 'enemy', type: 'streetScavenger', col: 50, row: 19 },
    { kind: 'pickup', id: 'alley:cache', pickup: 'scrap', amount: 15, col: 58, row: 19 },
    { kind: 'pickup', id: 'parcel:alley', pickup: 'item', item: 'parcel', col: 47, row: 9 },
    { kind: 'pickup', id: 'rec:alley', pickup: 'record', title: 'Rain-Soaked Flyer', text: 'LOST: one courier satchel, grey, taped shut. REWARD. Please. The sender never told me what is inside, only that it cannot be late again. (The ink has run; the date is gone.)', col: 12, row: 19 },
  ],
};

const TRANSIT: RoomDef = {
  ...legacy('transit'),
  region: 'transit',
  mapPos: { x: 5, y: 1 },
  layout: stripMarkers(legacy('transit').layout, 'NA'),
  doors: [
    { id: 'transit-west', area: { col: 0, row: 22, cols: 1, rows: 4 }, to: { room: 'alley_depot', entry: 'east' } },
    { id: 'transit-east', area: { col: 79, row: 22, cols: 1, rows: 4 }, to: { room: 'transit_yard', entry: 'west' } },
  ],
  spawns: [
    { kind: 'npc', npc: 'mira', col: 16, row: 25 },
    { kind: 'enemy', type: 'streetScavenger', col: 66, row: 25 },
    { kind: 'pickup', id: 'transit:cache', pickup: 'scrap', amount: 30, col: 33, row: 7 },
    { kind: 'pickup', id: 'rec:transit', pickup: 'record', title: 'Platform Announcement Board', text: 'DELAYED: every train since the Quiet. CAUSE: there was no Quiet. Please keep moving. Staff are not permitted to remember what a train was.', col: 30, row: 25 },
  ],
};

const PRECINCT: RoomDef = {
  ...legacy('precinct'),
  region: 'precinct',
  mapPos: { x: 10, y: 0 },
  layout: stripMarkers(legacy('precinct').layout, 'N'),
  entries: { west: { col: 2, row: 15 }, east: { col: 38, row: 15 } },
  doors: [
    { id: 'precinct-west', area: { col: 0, row: 12, cols: 1, rows: 4 }, to: { room: 'precinct_cells', entry: 'east' } },
    { id: 'precinct-plaza', area: { col: 42, row: 12, cols: 1, rows: 4 }, to: { room: 'undercity_plaza', entry: 'west' } },
  ],
  spawns: [{ kind: 'npc', npc: 'ghost-terminal', col: 8, row: 15 }],
  interactables: [
    { type: 'door', id: 'bulwark-exit', col: 40, row: 2, cols: 1, rows: 14, opensWhen: ['boss:bulwark-9'], latch: true, lockedHint: 'The vault exit is sealed while BULWARK-9 is online.' },
  ],
};

/** Move a single marker character from one cell to another. */
function moveMarker(layout: readonly string[], ch: string, from: [number, number], to: [number, number]): string[] {
  const rows = layout.map((r) => r.split(''));
  (rows[from[1]] as string[])[from[0]] = '.';
  (rows[to[1]] as string[])[to[0]] = ch;
  return rows.map((r) => r.join(''));
}

/** Add a one-way catwalk on air tiles. */
function addCatwalk(layout: readonly string[], row: number, c0: number, c1: number): string[] {
  return layout.map((line, r) => (r !== row ? line : line.slice(0, c0) + '='.repeat(c1 - c0 + 1) + line.slice(c1 + 1)));
}

const ARCHIVE: RoomDef = {
  ...legacy('null_archive'),
  // The memory fragment hovered above the catwalk's end; bring it to where the Courier can touch it, and give the
  // high catwalk a stepping stone (the original was six tiles above the floor).
  layout: addCatwalk(moveMarker(legacy('null_archive').layout, 'F', [12, 8], [9, 9]), 13, 12, 15),
  name: 'The Null Archive',
  region: 'cathedral',
  mapPos: { x: 18, y: 0 },
  entries: { west: { col: 3, row: 15 }, east: { col: 54, row: 15 } },
  doors: [
    { id: 'archive-west', area: { col: 0, row: 12, cols: 1, rows: 4 }, to: { room: 'core_kiln', entry: 'east' } },
    { id: 'archive-east', area: { col: 59, row: 12, cols: 1, rows: 4 }, to: { room: 'cathedral_nave', entry: 'west' } },
  ],
  spawns: [{ kind: 'npc', npc: 'archive-console', col: 9, row: 15 }],
  interactables: [
    { type: 'door', id: 'archive-exit', col: 57, row: 2, cols: 1, rows: 14, opensWhen: ['boss:panoptix-0'], latch: true, lockedHint: 'PANOPTIX-0 keeps the Archive sealed.' },
  ],
};

export const ROOMS: readonly RoomDef[] = [
  ALLEY,
  ...RAINLINE_ROOMS.filter((r) => r.id === 'alley_depot'),
  RAINLINE_ROOMS.find((r) => r.id === 'undercroft') as RoomDef,
  TRANSIT,
  ...TRANSIT_ROOMS,
  ...PRECINCT_ROOMS.filter((r) => r.id === 'precinct_gate'),
  ...PRECINCT_ROOMS.filter((r) => r.id === 'precinct_cells'),
  PRECINCT,
  ...UNDERCITY_ROOMS,
  ...INDUSTRIAL_ROOMS,
  ARCHIVE,
  ...CATHEDRAL_ROOMS,
];
