import { RoomBuilder } from '../roomBuilder';
import type { RoomDef } from '../types';

/** Region 5 — Industrial Core: heavy machinery, hazardous platforms, energy systems, harder Backtrace puzzles. */

// ─────────────────────────────────────────────────────────────────────────────── PIPEWORKS
function buildPipeworks(): RoomDef {
  const b = new RoomBuilder(70, 22);
  // A live-current pit crossed by two freight platforms.
  b.pit(22, 41, 20);
  // Right-hand area: cover and a catwalk climb to the hidden coil.
  b.solid(56, 17, 58, 19);
  b.catwalk(60, 17, 6).catwalk(50, 14, 6);
  b.mark('K', 6, 19);
  return {
    id: 'core_pipeworks',
    name: 'The Pipeworks',
    region: 'industrial',
    mapPos: { x: 14, y: 0 },
    layout: b.build(),
    entries: { west: { col: 4, row: 19 }, east: { col: 65, row: 19 } },
    doors: [
      { id: 'pipeworks-west', area: b.doorWest(16, 19), to: { room: 'undercity_towers', entry: 'top_east' } },
      { id: 'pipeworks-east', area: b.doorEast(16, 19), to: { room: 'core_foundry', entry: 'west' } },
    ],
    theme: { rock: 0x2e2a2a, edge: 0xc99a6a, skyTop: 0x100804, skyBottom: 0x4a1a0a, glow: 0xff9f3e },
    spawns: [
      { kind: 'enemy', type: 'streetScavenger', col: 14, row: 19 },
      { kind: 'enemy', type: 'heavyEnforcer', col: 47, row: 19 },
      { kind: 'enemy', type: 'sentryTurret', col: 67, row: 17, mount: 'right' },
      { kind: 'enemy', type: 'securityDrone', col: 31, row: 9 },
      { kind: 'pickup', id: 'pipeworks:coil', pickup: 'item', item: 'mech-coil', col: 52, row: 13 },
      { kind: 'pickup', id: 'pipeworks:cache', pickup: 'scrap', amount: 40, col: 63, row: 16 },
      { kind: 'pickup', id: 'rec:pipeworks', pickup: 'record', title: 'Pressure Gauge', text: 'The needle is stuck at "NORMAL". Beneath it, a handwritten sign: "NORMAL IS WHAT THE AUDIT SAYS IT IS."', col: 10, row: 19 },
    ],
    interactables: [
      { type: 'platform', id: 'pipe-p1', col: 22, row: 19, cols: 4, path: [{ col: 22, row: 19 }, { col: 31, row: 19 }], speed: 34, mode: 'pingpong', wait: 0.8 },
      { type: 'platform', id: 'pipe-p2', col: 32, row: 19, cols: 4, path: [{ col: 38, row: 19 }, { col: 32, row: 19 }], speed: 34, mode: 'pingpong', wait: 0.8 },
      { type: 'emitter', id: 'pipe-s1', col: 46, row: 19, dir: 'up', length: 5, period: 3.2, telegraph: 0.7, active: 1.2, offset: 0, style: 'steam' },
      { type: 'emitter', id: 'pipe-s2', col: 53, row: 19, dir: 'up', length: 5, period: 3.2, telegraph: 0.7, active: 1.2, offset: 1.6, style: 'steam' },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────── FOUNDRY
function buildFoundry(): RoomDef {
  const b = new RoomBuilder(72, 26);
  // A molten floor between two safe landings, crossed on conveyor platforms.
  b.pit(14, 59, 24);
  b.catwalk(8, 21, 4).ledge(3, 19, 6);
  b.catwalk(60, 21, 6).ledge(64, 19, 5);
  b.mark('K', 5, 23);
  return {
    id: 'core_foundry',
    name: 'The Foundry',
    region: 'industrial',
    mapPos: { x: 15, y: 0 },
    layout: b.build(),
    entries: { west: { col: 4, row: 23 }, east: { col: 66, row: 23 } },
    doors: [
      { id: 'foundry-west', area: b.doorWest(20, 23), to: { room: 'core_pipeworks', entry: 'east' } },
      { id: 'foundry-east', area: b.doorEast(20, 23), to: { room: 'core_reactor', entry: 'west' } },
    ],
    theme: { rock: 0x302420, edge: 0xe0a070, skyTop: 0x180804, skyBottom: 0x60200a, glow: 0xff6a2e },
    spawns: [
      { kind: 'enemy', type: 'heavyEnforcer', col: 66, row: 23, elite: true },
      { kind: 'enemy', type: 'sentryTurret', col: 40, row: 2, mount: 'ceiling' },
      { kind: 'enemy', type: 'securityDrone', col: 30, row: 10 },
      { kind: 'enemy', type: 'securityDrone', col: 46, row: 12 },
      { kind: 'pickup', id: 'foundry:cache', pickup: 'scrap', amount: 45, col: 66, row: 18 },
      { kind: 'pickup', id: 'rec:foundry', pickup: 'record', title: 'Furnace Tally', text: 'Chalk on the furnace door: one mark for every body the Audit sent down here to be forgotten. The marks run out of door.', col: 5, row: 18 },
      { kind: 'pickup', id: 'parcel:foundry', pickup: 'item', item: 'parcel', col: 30, row: 17 },
    ],
    interactables: [
      { type: 'platform', id: 'fd-p1', col: 14, row: 22, cols: 4, path: [{ col: 14, row: 22 }, { col: 24, row: 22 }], speed: 38, mode: 'pingpong', wait: 0.7 },
      { type: 'platform', id: 'fd-p2', col: 26, row: 21, cols: 4, path: [{ col: 26, row: 21 }, { col: 36, row: 19 }], speed: 38, mode: 'pingpong', wait: 0.7 },
      { type: 'platform', id: 'fd-p3', col: 38, row: 20, cols: 4, path: [{ col: 38, row: 20 }, { col: 48, row: 20 }], speed: 38, mode: 'pingpong', wait: 0.7 },
      { type: 'platform', id: 'fd-p4', col: 50, row: 21, cols: 4, path: [{ col: 50, row: 21 }, { col: 58, row: 22 }], speed: 38, mode: 'pingpong', wait: 0.7 },
      { type: 'emitter', id: 'fd-l1', col: 30, row: 2, dir: 'down', length: 20, period: 3.2, telegraph: 0.7, active: 0.9, offset: 0, style: 'laser' },
      { type: 'emitter', id: 'fd-l2', col: 44, row: 2, dir: 'down', length: 20, period: 3.2, telegraph: 0.7, active: 0.9, offset: 1.6, style: 'laser' },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────── REACTOR
function buildReactor(): RoomDef {
  const b = new RoomBuilder(64, 22);
  // The vault: a sealed alcove at the upper-left, shut by a door that needs two plates and the Courier's echo.
  b.ledge(3, 14, 14);
  b.solid(3, 3, 10, 13).air(4, 10, 9, 13).air(10, 10, 10, 13);
  b.catwalk(18, 17, 4);
  // The timed gate: a full-height shutter that an override switch opens for a single second.
  b.fill('T', 42, 2, 42, 19);
  b.mark('S', 16, 19);
  b.mark('K', 6, 19);
  // Exit lintel above the locked kiln door.
  b.solid(56, 2, 56, 15);
  return {
    id: 'core_reactor',
    name: 'Reactor Hall',
    region: 'industrial',
    mapPos: { x: 16, y: 0 },
    layout: b.build(),
    entries: { west: { col: 4, row: 19 }, east: { col: 59, row: 19 } },
    doors: [
      { id: 'reactor-west', area: b.doorWest(16, 19), to: { room: 'core_foundry', entry: 'east' } },
      { id: 'reactor-east', area: b.doorEast(16, 19), to: { room: 'core_kiln', entry: 'west' } },
    ],
    theme: { rock: 0x24282e, edge: 0x7ab0d0, skyTop: 0x040810, skyBottom: 0x0a2a3a, glow: 0x3cf2ff },
    spawns: [
      { kind: 'npc', npc: 'vesper', col: 8, row: 19 },
      { kind: 'npc', npc: 'reactor-console', col: 52, row: 19 },
      { kind: 'enemy', type: 'nullEcho', col: 30, row: 12 },
      { kind: 'enemy', type: 'phaseStalker', col: 34, row: 19 },
      { kind: 'enemy', type: 'sentryTurret', col: 41, row: 2, mount: 'ceiling' },
      { kind: 'pickup', id: 'reactor:shard', pickup: 'item', item: 'null-shard', col: 6, row: 13 },
      { kind: 'pickup', id: 'reactor:cache', pickup: 'scrap', amount: 40, col: 48, row: 19 },
      { kind: 'pickup', id: 'rec:reactor', pickup: 'record', title: 'Vesper\'s Notebook', text: 'Day 1: the Audit Engine does not erase. It moves. Every scrubbed minute goes somewhere. Day 40: I know where it went.', col: 14, row: 13 },
    ],
    interactables: [
      // Temporal vault: stand on B (echo plate) then reach A within the window; A holds for 3 s afterwards.
      { type: 'plate', id: 'rx-a', col: 14, row: 13, pressedBy: 'courier', hold: 3 },
      { type: 'plate', id: 'rx-b', col: 22, row: 19, pressedBy: 'echo' },
      { type: 'door', id: 'vault-door', col: 10, row: 10, cols: 1, rows: 4, opensWhen: ['rx-a', 'rx-b'], mode: 'all', latch: true, lockedHint: 'The vault wants two plates at once. One must be pressed by your echo.' },
      { type: 'door', id: 'kiln-gate', col: 56, row: 16, cols: 1, rows: 4, opensWhen: ['flag:reactor-online'], latch: true, lockedHint: 'The kiln gate is sealed until the reactor is running.' },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────── KILN (KILN-7)
function buildKiln(): RoomDef {
  const b = new RoomBuilder(64, 20);
  b.mark('D', 6, 14).mark('D', 6, 15).mark('D', 6, 16).mark('D', 6, 17);
  b.solid(57, 2, 57, 13);
  return {
    id: 'core_kiln',
    name: 'The Kiln',
    region: 'industrial',
    mapPos: { x: 17, y: 0 },
    layout: b.build(),
    entries: { west: { col: 4, row: 17 }, east: { col: 59, row: 17 } },
    doors: [
      { id: 'kiln-west', area: b.doorWest(14, 17), to: { room: 'core_reactor', entry: 'east' } },
      { id: 'kiln-east', area: b.doorEast(14, 17), to: { room: 'null_archive', entry: 'west' } },
    ],
    theme: { rock: 0x2a1c18, edge: 0xd08050, skyTop: 0x1c0804, skyBottom: 0x6a2008, glow: 0xff6a2e },
    bossTriggerCol: 10,
    bossArena: { col: 3, row: 2, cols: 59, rows: 16 },
    spawns: [{ kind: 'boss', boss: 'kiln-7', col: 38, row: 17 }],
    interactables: [{ type: 'door', id: 'kiln-exit', col: 57, row: 14, cols: 1, rows: 4, opensWhen: ['boss:kiln-7'], latch: true, lockedHint: 'KILN-7 must go cold first.' }],
  };
}

export const INDUSTRIAL_ROOMS: RoomDef[] = [buildPipeworks(), buildFoundry(), buildReactor(), buildKiln()];
