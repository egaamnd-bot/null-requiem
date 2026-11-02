/**
 * Terrain tileset contract (R3, `env_<region>_tiles`). Pure functions so the neighbour logic is unit-tested.
 *
 * Row `solid` has 16 cells, index = N·1 + E·2 + S·4 + W·8 where each term is present when the neighbour in that direction is
 * SOLID (out-of-room counts as solid). 15 = fully enclosed fill, 0 = isolated block, 14 (E+S+W) = open to the north = a
 * platform top with the wet steel lip.
 * Row `catwalk`: 0 = left cap, 1 = middle, 2 = right cap. Row `hazard`: 4 animation frames. Row `details`: 8 decals.
 */
export const AUTOTILE = { N: 1, E: 2, S: 4, W: 8 } as const;

export function autotileIndex(n: boolean, e: boolean, s: boolean, w: boolean): number {
  return (n ? AUTOTILE.N : 0) | (e ? AUTOTILE.E : 0) | (s ? AUTOTILE.S : 0) | (w ? AUTOTILE.W : 0);
}

export function catwalkIndex(leftIsCatwalk: boolean, rightIsCatwalk: boolean): 0 | 1 | 2 {
  if (!leftIsCatwalk) return 0;
  if (!rightIsCatwalk) return 2;
  return 1;
}

export interface Tileset {
  solid: readonly string[];
  catwalk: readonly string[];
  hazard: readonly string[];
  details: readonly string[];
}

export const tilesetKeys = (region: string): Tileset => {
  const k = (anim: string, n: number) => Array.from({ length: n }, (_, i) => `env_${region}_tiles__${anim}_${i}`);
  return { solid: k('solid', 16), catwalk: k('catwalk', 3), hazard: k('hazard', 4), details: k('details', 8) };
};
