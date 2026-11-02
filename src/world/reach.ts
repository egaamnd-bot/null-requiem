import { SIM, TILE_SIZE } from '../config/tuning';
import { bodyRect } from '../core/body';
import { emptyFrame, type InputFrame } from '../core/input';
import { Player, type PlayerAbilities } from '../core/player';
import { Tile, TileGrid } from '../core/tiles';
import type { RoomDef } from './types';

/**
 * Physics-based reachability analysis for authored rooms.
 *
 * Rather than approximating jumps with formulas, this drives the *real* `Player` simulation with a library of
 * scripted inputs (walk, run-jump, short hop, jump + dash, air jump, drop-through) from every standing cell it
 * has already reached (breadth-first). Anything the Courier can physically touch with those inputs counts as
 * reachable. It is conservative about hazards (touching a live current ends the script) and treats breakable
 * walls and puzzle gates as open (their puzzles are verified separately).
 *
 * Used by the campaign validation tests and by the `validate-world` check; it is NOT used at runtime.
 */

const DT = 1 / SIM.stepHz;

export interface ReachAbilities {
  dash: boolean;
  airJump: boolean;
}

export interface ReachOptions {
  abilities: ReachAbilities;
  /** Treat puzzle gates / interactable doors as open. Default true. */
  gatesOpen?: boolean;
  /** Treat breakable walls as already broken. Default true. */
  wallsBroken?: boolean;
}

export interface ReachResult {
  /** Feet cells (col,row) where the Courier can stand. */
  stand: Set<string>;
  /** Every tile the Courier's body can overlap while moving. */
  touched: Set<string>;
  grid: TileGrid;
}

export const cellKey = (c: number, r: number): string => `${c},${r}`;

/** Build the terrain used for analysis (gates/walls opened, moving platforms unrolled into catwalks). */
export function buildAnalysisGrid(def: RoomDef, opts: ReachOptions): TileGrid {
  const { grid } = TileGrid.fromAscii(def.layout, TILE_SIZE);
  const gatesOpen = opts.gatesOpen ?? true;
  const wallsBroken = opts.wallsBroken ?? true;
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (wallsBroken && grid.get(c, r) === Tile.Breakable) grid.set(c, r, Tile.Empty);
    }
  }
  // Marker tiles that become solid at runtime: timed gates (T) and boss gates (D, open at the start of a fight).
  const lines = def.layout;
  for (let r = 0; r < lines.length; r++) {
    for (let c = 0; c < (lines[r] as string).length; c++) {
      const ch = (lines[r] as string)[c];
      if (ch === 'T' && !gatesOpen) grid.set(c, r, Tile.Gate);
    }
  }
  for (const it of def.interactables ?? []) {
    if (it.type === 'door' && !gatesOpen) {
      for (let r = 0; r < it.rows; r++) for (let c = 0; c < it.cols; c++) grid.set(it.col + c, it.row + r, Tile.Gate);
    }
    if (it.type === 'platform') {
      // Unroll the route into catwalk tiles: every position the platform can occupy is standable.
      for (let i = 0; i + 1 < it.path.length; i++) {
        const a = it.path[i] as { col: number; row: number };
        const b = it.path[i + 1] as { col: number; row: number };
        const steps = Math.max(Math.abs(b.col - a.col), Math.abs(b.row - a.row), 1);
        for (let s = 0; s <= steps; s++) {
          const col = Math.round(a.col + ((b.col - a.col) * s) / steps);
          const row = Math.round(a.row + ((b.row - a.row) * s) / steps);
          for (let k = 0; k < it.cols; k++) if (grid.get(col + k, row) === Tile.Empty) grid.set(col + k, row, Tile.OneWay);
        }
      }
    }
  }
  return grid;
}

interface Script {
  dir: -1 | 0 | 1;
  jump: 'none' | 'short' | 'full';
  dashAt: number | null;
  airAt: number | null;
  drop: boolean;
  steps: number;
}

function scripts(a: ReachAbilities): Script[] {
  const out: Script[] = [];
  const dirs: (-1 | 1)[] = [-1, 1];
  const dashes: (number | null)[] = a.dash ? [null, 0, 14, 36] : [null];
  for (const dir of dirs) {
    for (const dashAt of dashes) out.push({ dir, jump: 'none', dashAt, airAt: null, drop: false, steps: 150 });
    for (const jump of ['short', 'full'] as const) {
      for (const dashAt of dashes) {
        out.push({ dir, jump, dashAt, airAt: null, drop: false, steps: 190 });
        if (a.airJump && jump === 'full') {
          for (const airAt of [26, 44]) out.push({ dir, jump, dashAt, airAt, drop: false, steps: 230 });
        }
      }
    }
    out.push({ dir, jump: 'none', dashAt: null, airAt: null, drop: true, steps: 90 });
  }
  for (const jump of ['short', 'full'] as const) {
    out.push({ dir: 0, jump, dashAt: null, airAt: null, drop: false, steps: 150 });
    if (a.airJump && jump === 'full') for (const airAt of [26, 44]) out.push({ dir: 0, jump, dashAt: null, airAt, drop: false, steps: 230 });
  }
  out.push({ dir: 0, jump: 'none', dashAt: null, airAt: null, drop: true, steps: 90 });
  return out;
}

const HOLD_STEPS = { none: 0, short: 12, full: 56 } as const;

/** Reachability from the given start cells (feet cells). */
export function analyseRoom(def: RoomDef, starts: readonly { col: number; row: number }[], opts: ReachOptions): ReachResult {
  const grid = buildAnalysisGrid(def, opts);
  const abilities: PlayerAbilities = { dash: opts.abilities.dash, glitchStrike: false, airJump: opts.abilities.airJump };
  const list = scripts(opts.abilities);
  const stand = new Set<string>();
  const touched = new Set<string>();
  const queue: { col: number; row: number }[] = [];
  const push = (c: number, r: number) => {
    const k = cellKey(c, r);
    if (!stand.has(k)) {
      stand.add(k);
      queue.push({ col: c, row: r });
    }
  };
  for (const s of starts) push(s.col, s.row);

  const noop = () => undefined;
  const player = new Player(0, 0);
  while (queue.length > 0) {
    const cell = queue.shift() as { col: number; row: number };
    for (const sc of list) {
      // A drop-through script only makes sense from a one-way catwalk.
      if (sc.drop && !grid.isOneWay(cell.col, cell.row + 1)) continue;
      player.placeAt((cell.col + 0.5) * TILE_SIZE, (cell.row + 1) * TILE_SIZE);
      player.dead = false;
      // Settle onto the ground first so a jump press is a real ground jump (not an air jump that wastes the Coil).
      for (let k = 0; k < 3; k++) player.step(emptyFrame(), grid, DT, abilities, noop);
      let airborne = 0;
      let stuck = 0;
      for (let t = 0; t < sc.steps; t++) {
        const f: InputFrame = emptyFrame();
        f.moveX = sc.dir;
        if (sc.drop) f.moveY = 1;
        if (sc.jump !== 'none' || sc.drop) {
          f.jumpPressed = t === 0 || (sc.airAt !== null && t === sc.airAt);
          f.jumpHeld = t < HOLD_STEPS[sc.jump === 'none' ? 'short' : sc.jump] || (sc.airAt !== null && t >= sc.airAt && t < sc.airAt + 40);
          if (sc.drop) f.jumpHeld = t < 2;
        }
        if (sc.dashAt !== null && t === sc.dashAt) f.dashPressed = true;
        const px = player.body.x;
        player.step(f, grid, DT, abilities, noop);
        const b = player.body;
        const rect = bodyRect(b);
        if (grid.rectOverlapsHazard({ x: rect.x + 2, y: rect.y + 2, w: rect.w - 4, h: rect.h - 4 })) break;
        const c0 = grid.colAt(rect.x);
        const c1 = grid.colAt(rect.x + rect.w - 0.01);
        const r0 = grid.rowAt(rect.y);
        const r1 = grid.rowAt(rect.y + rect.h - 0.01);
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) touched.add(cellKey(c, r));
        if (b.onGround) {
          const c = grid.colAt(b.x + b.w / 2);
          const r = grid.rowAt(b.y + b.h - 0.5);
          if (grid.inBounds(c, r)) push(c, r);
          if (airborne >= 8 && sc.jump !== 'none') break;
          airborne = 0;
        } else {
          airborne++;
        }
        if (Math.abs(b.x - px) < 0.001 && sc.dir !== 0 && sc.jump === 'none') {
          if (++stuck > 6) break;
        } else stuck = 0;
        if (b.y > grid.heightPx + 64) break;
      }
    }
  }
  return { stand, touched, grid };
}

/** Does the Courier's body ever overlap the tile rectangle? */
export function touches(result: ReachResult, col: number, row: number, cols = 1, rows = 1): boolean {
  for (let r = row; r < row + rows; r++) for (let c = col; c < col + cols; c++) if (result.touched.has(cellKey(c, r))) return true;
  return false;
}

/** Can the Courier stand in this feet cell? */
export function canStand(result: ReachResult, col: number, row: number): boolean {
  return result.stand.has(cellKey(col, row));
}
