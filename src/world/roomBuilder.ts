/**
 * Small authoring DSL for room terrain. Rooms stay pure data (`RoomDef`); the builder only produces the
 * ASCII `layout` so row widths can never drift apart and platforms are described, not hand-typed.
 *
 * Terrain: `#` solid, `.` air, `=` one-way catwalk, `^` live-current hazard, `B` breakable wall.
 * Legacy markers (placed on air): P K A H D T S N F G C W X.
 */
export class RoomBuilder {
  private readonly grid: string[][];

  constructor(
    readonly cols: number,
    readonly rows: number,
    /** Thickness of the solid border / floor. */
    border = 2,
  ) {
    this.grid = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => (r < border || r >= rows - border || c < border || c >= cols - border ? '#' : '.')),
    );
  }

  /** Fill an inclusive rectangle. */
  fill(ch: string, c0: number, r0: number, c1: number, r1: number): this {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) this.put(c, r, ch);
    return this;
  }

  put(c: number, r: number, ch: string): this {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) throw new Error(`RoomBuilder: (${c},${r}) outside ${this.cols}x${this.rows}`);
    (this.grid[r] as string[])[c] = ch;
    return this;
  }

  /** Solid block. */
  solid(c0: number, r0: number, c1: number, r1: number): this {
    return this.fill('#', c0, r0, c1, r1);
  }

  /** Clear to air. */
  air(c0: number, r0: number, c1: number, r1: number): this {
    return this.fill('.', c0, r0, c1, r1);
  }

  /** One-way catwalk of `len` tiles starting at (c, r). */
  catwalk(c: number, r: number, len: number): this {
    return this.fill('=', c, r, c + len - 1, r);
  }

  /** Solid ledge (slab) of `len` tiles and `thick` rows. */
  ledge(c: number, r: number, len: number, thick = 1): this {
    return this.fill('#', c, r, c + len - 1, r + thick - 1);
  }

  /** Hazard strip in the floor (replaces floor tiles). */
  pit(c0: number, c1: number, r: number): this {
    return this.fill('^', c0, r, c1, r);
  }

  /**
   * Door trigger zones sit just inside the border (the border itself stays solid, so bodies can never leave a
   * room except through the room-transition logic).
   */
  doorWest(r0: number, r1: number): { col: number; row: number; cols: number; rows: number } {
    return { col: 2, row: r0, cols: 1, rows: r1 - r0 + 1 };
  }

  doorEast(r0: number, r1: number): { col: number; row: number; cols: number; rows: number } {
    return { col: this.cols - 3, row: r0, cols: 1, rows: r1 - r0 + 1 };
  }

  /** Place a legacy marker character. */
  mark(ch: string, c: number, r: number): this {
    return this.put(c, r, ch);
  }

  build(): string[] {
    return this.grid.map((row) => row.join(''));
  }
}
