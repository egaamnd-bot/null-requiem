/** Data model for hand-authored rooms. Rooms are pure data; `GameWorld` brings them to life. */

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
