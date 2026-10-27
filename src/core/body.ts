import type { Rect } from './math';
import type { TileGrid } from './tiles';

/**
 * An axis-aligned kinematic body. Position is the top-left corner.
 * Bodies are moved with `moveBody`, which resolves collisions against the tile grid
 * one axis at a time. Velocities are bounded so a single fixed step never moves
 * a body further than one tile, which rules out tunnelling.
 */
export interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  wasOnGround: boolean;
  hitWallLeft: boolean;
  hitWallRight: boolean;
  hitCeiling: boolean;
}

export interface MoveOptions {
  /** Collide with one-way platforms when falling onto them. */
  collideOneWay: boolean;
  /** Pixels a rising body may be nudged sideways to slip past a ceiling corner. 0 disables. */
  cornerCorrection?: number;
}

const EPS = 1e-4;

export function createBody(x: number, y: number, w: number, h: number): Body {
  return {
    x,
    y,
    w,
    h,
    vx: 0,
    vy: 0,
    onGround: false,
    wasOnGround: false,
    hitWallLeft: false,
    hitWallRight: false,
    hitCeiling: false,
  };
}

export function bodyRect(b: Body): Rect {
  return { x: b.x, y: b.y, w: b.w, h: b.h };
}

export function bodyCenterX(b: Body): number {
  return b.x + b.w / 2;
}

export function bodyCenterY(b: Body): number {
  return b.y + b.h / 2;
}

export function moveBody(body: Body, grid: TileGrid, dt: number, opts: MoveOptions): void {
  body.wasOnGround = body.onGround;
  body.onGround = false;
  body.hitWallLeft = false;
  body.hitWallRight = false;
  body.hitCeiling = false;

  const dx = body.vx * dt;
  if (dx !== 0) moveX(body, grid, dx);

  const dy = body.vy * dt;
  if (dy > 0) {
    moveDown(body, grid, dy, opts.collideOneWay);
  } else if (dy < 0) {
    moveUp(body, grid, dy, opts.cornerCorrection ?? 0);
  } else {
    body.onGround = probeGround(body, grid, opts.collideOneWay);
  }
}

function rowsSpanned(b: Body, grid: TileGrid): [number, number] {
  return [grid.rowAt(b.y), grid.rowAt(b.y + b.h - EPS)];
}

function colsSpanned(x: number, w: number, grid: TileGrid): [number, number] {
  return [grid.colAt(x), grid.colAt(x + w - EPS)];
}

function moveX(b: Body, grid: TileGrid, dx: number): void {
  const ts = grid.tileSize;
  const [r0, r1] = rowsSpanned(b, grid);
  let nx = b.x + dx;
  if (dx > 0) {
    const col = grid.colAt(nx + b.w - EPS);
    for (let r = r0; r <= r1; r++) {
      if (grid.isSolid(col, r)) {
        nx = col * ts - b.w;
        b.vx = 0;
        b.hitWallRight = true;
        break;
      }
    }
  } else {
    const col = grid.colAt(nx);
    for (let r = r0; r <= r1; r++) {
      if (grid.isSolid(col, r)) {
        nx = (col + 1) * ts;
        b.vx = 0;
        b.hitWallLeft = true;
        break;
      }
    }
  }
  b.x = nx;
}

function moveDown(b: Body, grid: TileGrid, dy: number, collideOneWay: boolean): void {
  const ts = grid.tileSize;
  const prevBottom = b.y + b.h;
  const newBottom = prevBottom + dy;
  const row = grid.rowAt(newBottom - EPS);
  const [c0, c1] = colsSpanned(b.x, b.w, grid);
  const rowTop = row * ts;
  for (let c = c0; c <= c1; c++) {
    const solid = grid.isSolid(c, row);
    // A one-way platform only catches a body whose feet were at or above its top last step.
    const oneWay = collideOneWay && grid.isOneWay(c, row) && prevBottom <= rowTop + EPS * 10;
    if (solid || oneWay) {
      b.y = rowTop - b.h;
      b.vy = 0;
      b.onGround = true;
      return;
    }
  }
  b.y += dy;
}

function moveUp(b: Body, grid: TileGrid, dy: number, cornerCorrection: number): void {
  const ts = grid.tileSize;
  const row = grid.rowAt(b.y + dy);
  const [c0, c1] = colsSpanned(b.x, b.w, grid);
  let blockedLeft = false;
  let blockedRight = false;
  let blockedAny = false;
  for (let c = c0; c <= c1; c++) {
    if (grid.isSolid(c, row)) {
      blockedAny = true;
      if (c === c0) blockedLeft = true;
      if (c === c1) blockedRight = true;
    }
  }
  if (!blockedAny) {
    b.y += dy;
    return;
  }

  if (cornerCorrection > 0 && c0 !== c1 && blockedLeft !== blockedRight) {
    // Only one edge clips a corner: try nudging the body clear of it.
    const shift = blockedLeft ? (c0 + 1) * ts - b.x : -(b.x + b.w - c1 * ts);
    if (Math.abs(shift) <= cornerCorrection && canOccupy(grid, b.x + shift, b.y + dy, b.w, b.h)) {
      b.x += shift;
      b.y += dy;
      return;
    }
  }

  b.y = (row + 1) * ts;
  b.vy = 0;
  b.hitCeiling = true;
}

function probeGround(b: Body, grid: TileGrid, collideOneWay: boolean): boolean {
  const ts = grid.tileSize;
  const bottom = b.y + b.h;
  const row = grid.rowAt(bottom + EPS);
  // Must be resting exactly on the tile boundary to count as grounded.
  if (Math.abs(bottom - row * ts) > 0.01) return false;
  const [c0, c1] = colsSpanned(b.x, b.w, grid);
  for (let c = c0; c <= c1; c++) {
    if (grid.isSolid(c, row) || (collideOneWay && grid.isOneWay(c, row))) return true;
  }
  return false;
}

export function canOccupy(grid: TileGrid, x: number, y: number, w: number, h: number): boolean {
  return !grid.rectOverlapsSolid({ x, y, w, h });
}

/** True if solid ground exists directly beyond the body's leading foot (used for ledge detection). */
export function groundAhead(b: Body, grid: TileGrid, facing: number, collideOneWay = true): boolean {
  const footX = facing > 0 ? b.x + b.w + 1 : b.x - 1;
  const col = grid.colAt(footX);
  const row = grid.rowAt(b.y + b.h + 1);
  return grid.isSolid(col, row) || (collideOneWay && grid.isOneWay(col, row));
}

/** True if a wall is directly in front of the body. */
export function wallAhead(b: Body, grid: TileGrid, facing: number): boolean {
  const x = facing > 0 ? b.x + b.w + 1 : b.x - 1;
  return grid.isSolidAtPoint(x, b.y + 1) || grid.isSolidAtPoint(x, b.y + b.h - 1);
}
