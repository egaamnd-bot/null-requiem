import type Phaser from 'phaser';
import { tilesetKeys, type Tileset } from '../assets/autotile';

export type { Tileset } from '../assets/autotile';

/** The delivered tileset of a region, or null when any of its 31 cells is missing (then the generated terrain is used). */
export function tilesetFor(scene: Phaser.Scene, region: string | undefined): Tileset | null {
  if (!region) return null;
  const t = tilesetKeys(region);
  const all = [...t.solid, ...t.catwalk, ...t.hazard, ...t.details];
  return all.every((k) => scene.textures.exists(k)) ? t : null;
}
