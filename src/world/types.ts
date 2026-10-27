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
  /** Base colour of solid rock. */
  rock: number;
  /** Highlight on rock surfaces facing open air. */
  edge: number;
  /** Background gradient top/bottom. */
  skyTop: number;
  skyBottom: number;
  /** Colour of the bioluminescent growths. */
  glow: number;
}

export interface RoomDef {
  id: string;
  name: string;
  /**
   * ASCII layout. Terrain: `#` rock, `.` air, `=` one-way ledge, `^` ember pit (hazard), `B` breakable wall.
   * Markers (placed on air): `P` new-game start, `K` hearth lantern (checkpoint), `C` ashgrub,
   * `W` lantern wisp, `A` Backtrace module, `H` heartcoal (secret), `X` boss, `D` boss gate,
   * `T` timed gate tile, `S` override switch (opens the room's timed gate).
   */
  layout: readonly string[];
  /** Named arrival points (feet stand on the bottom of this tile). */
  entries: Readonly<Record<string, TilePoint>>;
  doors: readonly DoorDef[];
  theme: RoomTheme;
  /** Boss rooms only: the fight starts once the player's centre passes this column. */
  bossTriggerCol?: number;
  /** Boss rooms only: arena extents, in tiles (used for leap targeting and ember rain). */
  bossArena?: TileRect;
}
