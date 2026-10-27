import type { Rect } from './math';

/** Tile kinds stored in a room grid. */
export const Tile = {
  Empty: 0,
  Solid: 1,
  /** Collides only from above, and only when falling onto it. */
  OneWay: 2,
  /** Non-solid; touching it hurts and returns the player to safe ground. */
  Hazard: 3,
  /** Solid until destroyed by attacks. */
  Breakable: 4,
  /** A closed gate (e.g. a boss door). Solid while present. */
  Gate: 5,
} as const;

export type TileKind = (typeof Tile)[keyof typeof Tile];

export interface TileMarker {
  char: string;
  col: number;
  row: number;
}

const TERRAIN: Readonly<Record<string, TileKind>> = {
  '#': Tile.Solid,
  '.': Tile.Empty,
  '=': Tile.OneWay,
  '^': Tile.Hazard,
  B: Tile.Breakable,
};

/**
 * A rectangular grid of tiles. Anything outside the grid is treated as solid,
 * so bodies can never leave a room through its edges (doors are trigger zones inside the grid).
 */
export class TileGrid {
  readonly widthPx: number;
  readonly heightPx: number;

  constructor(
    readonly cols: number,
    readonly rows: number,
    readonly tileSize: number,
    private readonly data: Uint8Array,
  ) {
    if (data.length !== cols * rows) throw new Error('TileGrid data size mismatch');
    this.widthPx = cols * tileSize;
    this.heightPx = rows * tileSize;
  }

  /**
   * Parse an ASCII room layout. Terrain characters map to tiles; any other character
   * becomes an empty tile plus a marker (spawn points, pickups, gates...).
   */
  static fromAscii(lines: readonly string[], tileSize: number): { grid: TileGrid; markers: TileMarker[] } {
    const rows = lines.length;
    const cols = lines[0]?.length ?? 0;
    if (rows === 0 || cols === 0) throw new Error('Empty room layout');
    const data = new Uint8Array(cols * rows);
    const markers: TileMarker[] = [];
    lines.forEach((line, row) => {
      if (line.length !== cols) {
        throw new Error(`Room row ${row} has width ${line.length}, expected ${cols}`);
      }
      for (let col = 0; col < cols; col++) {
        const ch = line[col] as string;
        const kind = TERRAIN[ch];
        if (kind !== undefined) {
          data[row * cols + col] = kind;
        } else {
          data[row * cols + col] = Tile.Empty;
          markers.push({ char: ch, col, row });
        }
      }
    });
    return { grid: new TileGrid(cols, rows, tileSize, data), markers };
  }

  clone(): TileGrid {
    return new TileGrid(this.cols, this.rows, this.tileSize, new Uint8Array(this.data));
  }

  inBounds(col: number, row: number): boolean {
    return col >= 0 && row >= 0 && col < this.cols && row < this.rows;
  }

  get(col: number, row: number): TileKind {
    if (!this.inBounds(col, row)) return Tile.Solid;
    return this.data[row * this.cols + col] as TileKind;
  }

  set(col: number, row: number, kind: TileKind): void {
    if (!this.inBounds(col, row)) return;
    this.data[row * this.cols + col] = kind;
  }

  /** Blocks movement from every direction. */
  isSolid(col: number, row: number): boolean {
    const t = this.get(col, row);
    return t === Tile.Solid || t === Tile.Breakable || t === Tile.Gate;
  }

  isOneWay(col: number, row: number): boolean {
    return this.get(col, row) === Tile.OneWay;
  }

  isHazard(col: number, row: number): boolean {
    return this.get(col, row) === Tile.Hazard;
  }

  /** Can something stand on top of this tile? */
  isStandable(col: number, row: number): boolean {
    return this.isSolid(col, row) || this.isOneWay(col, row);
  }

  colAt(x: number): number {
    return Math.floor(x / this.tileSize);
  }

  rowAt(y: number): number {
    return Math.floor(y / this.tileSize);
  }

  isSolidAtPoint(x: number, y: number): boolean {
    return this.isSolid(this.colAt(x), this.rowAt(y));
  }

  /** True if any tile covered by `rect` satisfies `predicate`. */
  rectTouches(rect: Rect, predicate: (kind: TileKind, col: number, row: number) => boolean): boolean {
    const eps = 1e-6;
    const c0 = this.colAt(rect.x);
    const c1 = this.colAt(rect.x + rect.w - eps);
    const r0 = this.rowAt(rect.y);
    const r1 = this.rowAt(rect.y + rect.h - eps);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (predicate(this.get(c, r), c, r)) return true;
      }
    }
    return false;
  }

  rectOverlapsSolid(rect: Rect): boolean {
    return this.rectTouches(rect, (_k, c, r) => this.isSolid(c, r));
  }

  rectOverlapsHazard(rect: Rect): boolean {
    return this.rectTouches(rect, (k) => k === Tile.Hazard);
  }

  /**
   * Line of sight between two points: false if any solid tile lies on the segment.
   * One-way platforms never block sight or attacks.
   */
  lineOfSight(ax: number, ay: number, bx: number, by: number, sampleSpacing = 3): boolean {
    const dx = bx - ax;
    const dy = by - ay;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / sampleSpacing));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.isSolidAtPoint(ax + dx * t, ay + dy * t)) return false;
    }
    return true;
  }
}
