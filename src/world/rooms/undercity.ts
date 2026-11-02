import { RoomBuilder } from '../roomBuilder';
import type { RoomDef } from '../types';

/** Region 4 — Neon Undercity: an abandoned district where survivors have built a market. Exploration-focused. */

// ─────────────────────────────────────────────────────────────────────────────── UNDERCITY PLAZA (hub)
function buildPlaza(): RoomDef {
  const b = new RoomBuilder(76, 22);
  // Market stalls (cover and decoration) and a staircase of catwalks to the informant's perch.
  b.solid(20, 18, 23, 19).solid(36, 18, 38, 19);
  b.catwalk(44, 17, 6).catwalk(52, 14, 14);
  b.mark('K', 28, 19);
  return {
    id: 'undercity_plaza',
    name: 'Undercity Plaza',
    region: 'undercity',
    mapPos: { x: 11, y: 1 },
    layout: b.build(),
    entries: { west: { col: 4, row: 19 }, east: { col: 70, row: 19 } },
    doors: [
      { id: 'plaza-west', area: b.doorWest(16, 19), to: { room: 'precinct', entry: 'east' } },
      { id: 'plaza-east', area: b.doorEast(16, 19), to: { room: 'undercity_arcade', entry: 'west' } },
    ],
    theme: { rock: 0x2a2236, edge: 0xb8a0d8, skyTop: 0x0c0516, skyBottom: 0x4a1450, glow: 0xff3ea5 },
    spawns: [
      { kind: 'npc', npc: 'kestrel', col: 16, row: 19 },
      { kind: 'npc', npc: 'ilse', col: 32, row: 19 },
      { kind: 'npc', npc: 'brannt', col: 48, row: 19 },
      { kind: 'npc', npc: 'wren', col: 60, row: 13 },
      { kind: 'pickup', id: 'plaza:cache', pickup: 'scrap', amount: 30, col: 58, row: 13 },
      { kind: 'pickup', id: 'rec:plaza', pickup: 'record', title: 'Plaza Mural', text: 'A painted wall: a street of lit windows, and under it in six languages, "WE WERE HERE BEFORE THE QUIET." The paint is fresh.', col: 8, row: 19 },
      { kind: 'pickup', id: 'parcel:plaza', pickup: 'item', item: 'parcel', col: 66, row: 13 },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────── DERELICT ARCADE
function buildArcade(): RoomDef {
  const b = new RoomBuilder(64, 20);
  // Sealed upgrade alcove on the west (B face), and the hidden booth (door powered by a node).
  b.solid(10, 12, 15, 17).air(11, 15, 14, 17).fill('B', 15, 15, 15, 17).catwalk(7, 15, 3).catwalk(16, 15, 3);
  b.ledge(26, 15, 8);
  b.solid(50, 12, 57, 17).air(50, 14, 56, 17);
  b.catwalk(36, 15, 6).catwalk(43, 12, 4).catwalk(58, 15, 3);
  b.mark('K', 6, 17);
  return {
    id: 'undercity_arcade',
    name: 'Derelict Arcade',
    region: 'undercity',
    mapPos: { x: 12, y: 1 },
    layout: b.build(),
    entries: { west: { col: 4, row: 17 }, east: { col: 59, row: 17 } },
    doors: [
      { id: 'arcade-west', area: b.doorWest(14, 17), to: { room: 'undercity_plaza', entry: 'east' } },
      { id: 'arcade-east', area: b.doorEast(14, 17), to: { room: 'undercity_towers', entry: 'west' } },
    ],
    theme: { rock: 0x1e1830, edge: 0x7a6aa8, skyTop: 0x080414, skyBottom: 0x3a0f4a, glow: 0x4dff9a },
    spawns: [
      { kind: 'enemy', type: 'streetScavenger', col: 20, row: 17 },
      { kind: 'enemy', type: 'scrapHound', col: 30, row: 14 },
      { kind: 'enemy', type: 'securityDrone', col: 40, row: 8 },
      { kind: 'enemy', type: 'phaseStalker', col: 44, row: 17, elite: true },
      { kind: 'enemy', type: 'sentryTurret', col: 47, row: 2, mount: 'ceiling' },
      { kind: 'pickup', id: 'arcade:coil', pickup: 'ability', ability: 'air-jump', col: 47, row: 17 },
      { kind: 'pickup', id: 'arcade:fuse', pickup: 'item', item: 'relay-fuse', col: 54, row: 17 },
      { kind: 'pickup', id: 'arcade:core', pickup: 'upgrade', upgrade: 'backtraceBurst', col: 12, row: 17 },
      { kind: 'pickup', id: 'rec:arcade', pickup: 'record', title: 'High Score Screen', text: 'AAA 999999. AAA 999998. AAA 999997. Every initial is the same three letters. Someone played this machine alone for years, afraid of forgetting how.', col: 33, row: 14 },
      { kind: 'pickup', id: 'parcel:arcade', pickup: 'item', item: 'parcel', col: 38, row: 14 },
    ],
    interactables: [
      { type: 'node', id: 'booth-node', col: 30, row: 13, hits: 2 },
      { type: 'door', id: 'booth-door', col: 50, row: 14, cols: 1, rows: 4, opensWhen: ['node:booth-node'], latch: true, lockedHint: 'The booth is dead. A power node nearby could wake it.' },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────── THE LEANING TOWERS
function buildTowers(): RoomDef {
  const b = new RoomBuilder(46, 40);
  // Four-tile rises between one-way catwalks: a normal jump rises 3.6 tiles, so the climb needs the Kinetic Coil.
  b.catwalk(3, 34, 8).catwalk(17, 30, 8).catwalk(31, 26, 8).catwalk(17, 22, 8).catwalk(3, 18, 8).catwalk(17, 14, 8);
  b.catwalk(31, 10, 13);
  b.mark('K', 5, 37);
  return {
    id: 'undercity_towers',
    name: 'The Leaning Towers',
    region: 'undercity',
    mapPos: { x: 13, y: 0 },
    layout: b.build(),
    entries: { west: { col: 4, row: 37 }, top_east: { col: 38, row: 9 } },
    doors: [
      { id: 'towers-west', area: b.doorWest(34, 37), to: { room: 'undercity_arcade', entry: 'east' } },
      { id: 'towers-top-east', area: b.doorEast(6, 9), to: { room: 'core_pipeworks', entry: 'west' } },
    ],
    theme: { rock: 0x22203a, edge: 0x8f9bd0, skyTop: 0x0a0618, skyBottom: 0x2e1050, glow: 0xff3ea5 },
    spawns: [
      { kind: 'enemy', type: 'phaseStalker', col: 21, row: 29 },
      { kind: 'enemy', type: 'securityDrone', col: 34, row: 20 },
      { kind: 'enemy', type: 'streetScavenger', col: 6, row: 17 },
      { kind: 'enemy', type: 'phaseStalker', col: 21, row: 21 },
      { kind: 'enemy', type: 'sentryTurret', col: 43, row: 16, mount: 'right' },
      { kind: 'pickup', id: 'towers:cache', pickup: 'scrap', amount: 35, col: 34, row: 25 },
      { kind: 'pickup', id: 'rec:towers', pickup: 'record', title: 'Resident Notice', text: 'TO ALL RESIDENTS OF THE LEANING TOWERS: the towers lean because the floodwater took the foundation. The Authority insists they have always leaned. Please stop asking what a flood is.', col: 5, row: 17 },
    ],
  };
}

export const UNDERCITY_ROOMS: RoomDef[] = [buildPlaza(), buildArcade(), buildTowers()];
