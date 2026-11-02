import type { TileGrid } from './tiles';

export interface StandSpot {
  /** Feet position, in pixels (centre-x, bottom-y). */
  feetX: number;
  feetY: number;
}

/** True if a body of the given size could stand with its feet at (feetX, feetY) without overlapping solids/hazards. */
export function canStandAt(grid: TileGrid, feetX: number, feetY: number, w: number, h: number): boolean {
  const rect = { x: feetX - w / 2, y: feetY - h, w, h };
  if (grid.rectOverlapsSolid(rect) || grid.rectOverlapsHazard(rect)) return false;
  // Something standable directly under both feet.
  const row = grid.rowAt(feetY + 0.5);
  return grid.isStandable(grid.colAt(feetX - w / 2 + 1), row) && grid.isStandable(grid.colAt(feetX + w / 2 - 1), row);
}

/**
 * Find ground within `[minDist, maxDist]` horizontally of `(nearX, nearY)` (within `maxDy` vertically) on which a
 * body of size w*h can stand. Candidates are shuffled by the supplied rng so results are deterministic per seed.
 * Used by teleporting enemies and bosses; never returns a spot inside geometry.
 */
export function findStandSpot(
  grid: TileGrid,
  nearX: number,
  nearY: number,
  w: number,
  h: number,
  minDist: number,
  maxDist: number,
  rng: () => number,
  maxDy = 64,
): StandSpot | null {
  const ts = grid.tileSize;
  const candidates: StandSpot[] = [];
  const c0 = grid.colAt(nearX - maxDist);
  const c1 = grid.colAt(nearX + maxDist);
  const rMin = grid.rowAt(nearY - maxDy);
  const rMax = grid.rowAt(nearY + maxDy);
  for (let c = c0; c <= c1; c++) {
    const feetX = (c + 0.5) * ts;
    const dx = Math.abs(feetX - nearX);
    if (dx < minDist || dx > maxDist) continue;
    for (let r = rMin; r <= rMax; r++) {
      const feetY = r * ts; // feet rest on top of row r
      if (canStandAt(grid, feetX, feetY, w, h)) candidates.push({ feetX, feetY });
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.min(candidates.length - 1, Math.floor(rng() * candidates.length))] as StandSpot;
}
