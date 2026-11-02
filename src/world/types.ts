/** Data model for hand-authored rooms. Rooms are pure data; `GameWorld` brings them to life. */
import type { UpgradeId } from '../config/upgrades';
import type { EnemyType } from '../core/enemies/registry';
import type { TurretMount } from '../core/enemies/sentryTurret';
import type { Ability } from '../core/events';
import type { InteractableDef } from '../core/interactables';

export type RegionId = 'rainline' | 'transit' | 'precinct' | 'undercity' | 'industrial' | 'cathedral';

export interface EnemySpawnDef {
  kind: 'enemy';
  type: EnemyType;
  col: number;
  row: number;
  elite?: boolean;
  mount?: TurretMount;
}

export interface NpcSpawnDef {
  kind: 'npc';
  /** Key into the NPC registry (`world/npcs.ts`). */
  npc: string;
  col: number;
  row: number;
}

export type PickupKind = 'scrap' | 'upgrade' | 'item' | 'ability' | 'record' | 'cell';

export interface PickupSpawnDef {
  kind: 'pickup';
  /** Globally unique and stable: it keys the persisted "already collected" set. */
  id: string;
  pickup: PickupKind;
  col: number;
  row: number;
  amount?: number;
  upgrade?: UpgradeId;
  item?: string;
  ability?: Ability;
  /** Lore records. */
  title?: string;
  text?: string;
  /** Hidden until this flag is set (secret reveals). */
  requiresFlag?: string;
}

export interface BossSpawnDef {
  kind: 'boss';
  boss: 'kiln-7' | 'the-null';
  col: number;
  row: number;
  /** Defeating this boss completes the game. */
  final?: boolean;
}

export type SpawnDef = EnemySpawnDef | NpcSpawnDef | PickupSpawnDef | BossSpawnDef;

export interface TileRect {
  col: number;
  row: number;
  cols: number;
  rows: number;
}

export interface TilePoint {
  col: number;
  row: number;
}

export interface DoorDef {
  id: string;
  /** Trigger zone, in tiles. Usually the room-edge opening. */
  area: TileRect;
  to: { room: string; entry: string };
}

export interface RoomTheme {
  /** Base colour of solid concrete. */
  rock: number;
  /** Highlight on surfaces facing open air (steel lips, wet edges). */
  edge: number;
  /** Background gradient top/bottom. */
  skyTop: number;
  skyBottom: number;
  /** Accent colour of the room's neon strip lights. */
  glow: number;
}

export interface RoomDef {
  id: string;
  name: string;
  /** Region this room belongs to (world map, audio theme, quests). */
  region?: RegionId;
  /** Position on the world map grid (one cell per room). */
  mapPos?: { x: number; y: number };
  /** Data-driven content placed on top of the ASCII terrain (enemies, NPCs, pickups, bosses). */
  spawns?: readonly SpawnDef[];
  /** Environmental interaction: plates, doors, moving platforms, power nodes, hazard emitters. */
  interactables?: readonly InteractableDef[];
  /**
   * ASCII layout. Terrain: `#` concrete, `.` air, `=` one-way catwalk, `^` live current (hazard), `B` breakable wall.
   * Markers (placed on air): `P` new-game start, `K` sync relay (checkpoint), `C` scrap hound,
   * `W` watcher drone, `A` Backtrace module, `H` integrity cell (secret), `X` boss, `D` boss gate,
   * `T` timed gate tile, `S` override switch (opens the room's timed gate),
   * `N` NPC entity (dialogue, keyed by room+index), `F` memory fragment (lore collectible),
   * `G` glitch-strike upgrade pickup.
   */
  layout: readonly string[];
  /** Named arrival points (feet stand on the bottom of this tile). */
  entries: Readonly<Record<string, TilePoint>>;
  doors: readonly DoorDef[];
  theme: RoomTheme;
  /** Boss rooms only: the fight starts once the player's centre passes this column. */
  bossTriggerCol?: number;
  /** Boss rooms only: arena extents, in tiles (used for leap targeting and plasma rain). */
  bossArena?: TileRect;
}
