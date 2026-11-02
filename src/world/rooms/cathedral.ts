import { RoomBuilder } from '../roomBuilder';
import type { RoomDef } from '../types';

/** Region 6 — Null Cathedral: the endgame. Backtrace-heavy challenges, the Null Echoes, and THE NULL. */

// ─────────────────────────────────────────────────────────────────────────────── NAVE
function buildNave(): RoomDef {
  const b = new RoomBuilder(80, 24);
  // Pillars of the old cathedral, a void pit between two halves, and an echo-plate door guarding the sanctum.
  b.solid(14, 16, 15, 21).solid(30, 16, 31, 21);
  b.pit(36, 53, 22);
  b.catwalk(60, 19, 6);
  b.solid(70, 2, 70, 17);
  b.mark('K', 6, 21);
  return {
    id: 'cathedral_nave',
    name: 'The Nave',
    region: 'cathedral',
    mapPos: { x: 19, y: 0 },
    layout: b.build(),
    entries: { west: { col: 4, row: 21 }, east: { col: 72, row: 21 } },
    doors: [
      { id: 'nave-west', area: b.doorWest(18, 21), to: { room: 'null_archive', entry: 'east' } },
      { id: 'nave-east', area: b.doorEast(18, 21), to: { room: 'cathedral_sanctum', entry: 'west' } },
    ],
    theme: { rock: 0x1c1030, edge: 0xb070ff, skyTop: 0x06020e, skyBottom: 0x2a0a4a, glow: 0xcc44ff },
    spawns: [
      { kind: 'enemy', type: 'nullEcho', col: 22, row: 14 },
      { kind: 'enemy', type: 'nullEcho', col: 28, row: 10 },
      { kind: 'enemy', type: 'phaseStalker', col: 24, row: 21, elite: true },
      { kind: 'enemy', type: 'heavyEnforcer', col: 58, row: 21, elite: true },
      { kind: 'enemy', type: 'sentryTurret', col: 77, row: 12, mount: 'right' },
      { kind: 'npc', npc: 'choir', col: 64, row: 21 },
      { kind: 'pickup', id: 'nave:cache', pickup: 'scrap', amount: 60, col: 62, row: 18 },
      { kind: 'pickup', id: 'rec:nave', pickup: 'record', title: 'Cathedral Plaque', text: 'ST. ANSELM\'S, RESTORED 2061. Converted to the Memory Vault 2084. The congregation were given a free Audit and a hymn they could not remember singing.', col: 10, row: 21 },
      { kind: 'pickup', id: 'parcel:nave', pickup: 'item', item: 'parcel', col: 63, row: 18 },
    ],
    interactables: [
      { type: 'platform', id: 'nave-p1', col: 36, row: 21, cols: 4, path: [{ col: 36, row: 21 }, { col: 45, row: 21 }], speed: 36, mode: 'pingpong', wait: 0.6 },
      { type: 'platform', id: 'nave-p2', col: 50, row: 21, cols: 4, path: [{ col: 50, row: 21 }, { col: 46, row: 21 }], speed: 36, mode: 'pingpong', wait: 0.6 },
      // Sanctum door: plate A held by the Courier, plate B by the echo; latch once open.
      { type: 'plate', id: 'nv-a', col: 67, row: 21, pressedBy: 'courier', hold: 3 },
      { type: 'plate', id: 'nv-b', col: 57, row: 21, pressedBy: 'echo' },
      { type: 'door', id: 'sanctum-door', col: 70, row: 18, cols: 1, rows: 4, opensWhen: ['nv-a', 'nv-b'], mode: 'all', latch: true, lockedHint: 'The sanctum answers a past self and a present one.' },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────── SANCTUM (THE NULL)
function buildSanctum(): RoomDef {
  const b = new RoomBuilder(64, 22);
  b.catwalk(10, 17, 6).catwalk(48, 17, 6).catwalk(28, 17, 8);
  b.mark('D', 6, 16).mark('D', 6, 17).mark('D', 6, 18).mark('D', 6, 19);
  return {
    id: 'cathedral_sanctum',
    name: 'The Sanctum',
    region: 'cathedral',
    mapPos: { x: 20, y: 0 },
    layout: b.build(),
    entries: { west: { col: 4, row: 19 } },
    doors: [{ id: 'sanctum-west', area: b.doorWest(16, 19), to: { room: 'cathedral_nave', entry: 'east' } }],
    theme: { rock: 0x120a20, edge: 0xcc44ff, skyTop: 0x030108, skyBottom: 0x3a0a5a, glow: 0xff3ea5 },
    bossTriggerCol: 10,
    bossArena: { col: 2, row: 2, cols: 60, rows: 18 },
    spawns: [{ kind: 'boss', boss: 'the-null', col: 36, row: 11, final: true }],
  };
}

export const CATHEDRAL_ROOMS: RoomDef[] = [buildNave(), buildSanctum()];
