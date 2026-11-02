/**
 * Asset manifest data model. Every visual / audio asset the game uses or will use has ONE entry with a stable id.
 * Gameplay code never refers to pixels: it asks for an asset id (or a texture key derived from it), so a placeholder
 * can be replaced by final art without touching gameplay (see docs/ASSET_INTEGRATION_GUIDE.md).
 */

export type AssetCategory =
  | 'player'
  | 'enemy'
  | 'boss'
  | 'npc'
  | 'tileset'
  | 'background'
  | 'object'
  | 'collectible'
  | 'fx-combat'
  | 'fx-backtrace'
  | 'ui'
  | 'icon'
  | 'audio';

export type PackId = 'pack-01' | 'pack-02' | 'pack-03' | 'pack-04' | 'pack-05' | 'pack-06' | 'pack-07';

export const PACKS: Readonly<Record<PackId, { name: string; summary: string }>> = {
  'pack-01': { name: 'Pack 01 — Courier', summary: 'Complete player sprite sheets, movement and combat animations, Backtrace animations, damage and death.' },
  'pack-02': { name: 'Pack 02 — Core Enemies', summary: 'Security Drone, Scrap Hound, Street Scavenger, Heavy Enforcer, Phase Stalker, Sentry Turret, Null Echo.' },
  'pack-03': { name: 'Pack 03 — NPCs', summary: 'All initial NPC characters with idle and interaction animations, and dialogue portraits.' },
  'pack-04': { name: 'Pack 04 — Environment', summary: 'Rainline Alley, Transit Stacks, Precinct Vault: tilesets, backgrounds, props and interactive objects.' },
  'pack-05': { name: 'Pack 05 — Environment Expansion', summary: 'Neon Undercity, Industrial Core, Null Cathedral: tilesets, backgrounds, props.' },
  'pack-06': { name: 'Pack 06 — Bosses and Effects', summary: 'Boss sprite sheets, combat effects, Backtrace effects, environmental effects.' },
  'pack-07': { name: 'Pack 07 — UI and Audio', summary: 'UI artwork, icons, dialogue portraits, music and sound effects.' },
};

export interface AnimDef {
  frames: number;
  fps: number;
  loop: boolean;
  /** What the animation is for (shown in the spec). */
  note?: string;
}

/** How the current in-game stand-in is produced. */
export type PlaceholderKind =
  /** Drawn by code at boot from `placeholder.shape` and the palette (replaceable, unique silhouette). */
  | 'procedural'
  /** Legacy procedural art that predates the manifest (same replacement mechanism, keys listed explicitly). */
  | 'procedural-legacy'
  /** Not yet drawn in-game: an existing frame is reused until the animation exists. */
  | 'reuse'
  /** Rendered directly by code (particles, gradients, UI geometry); spec exists for the final replacement. */
  | 'code-drawn'
  /** Specification only: nothing on screen uses this yet. */
  | 'spec-only';

export type IntegrationStatus =
  /** Placeholder only; no final art delivered. */
  | 'placeholder'
  /** The loader and views are wired: dropping the file into public/assets/final/ replaces the placeholder. */
  | 'swap-ready'
  /** Final art delivered and loaded. (Set when Gemini's files arrive.) */
  | 'final'
  /** The replacement path needs engine work that is not done yet (documented in the guide). */
  | 'needs-engine-work';

export type PlaceholderShape = 'humanoid' | 'heavy' | 'stalker' | 'turret' | 'echo' | 'machine' | 'void' | 'npc' | 'terminal' | 'drone' | 'hound' | 'wanderer';

export interface AssetDef {
  /** Stable id, e.g. `enemy_security_drone`. Never renamed. */
  id: string;
  name: string;
  category: AssetCategory;
  pack: PackId;
  /** What it is for in the game. */
  purpose: string;
  /** Frame size of one frame as drawn in the world, in logical pixels (1 logical px = 1 world pixel; the phone shows ~4x). */
  display: { w: number; h: number };
  /** Normalised sprite origin (0..1) and where the feet / base touch the ground. */
  anchor: { x: number; y: number };
  /** Gameplay hitbox relative to the frame, in logical px. Gameplay never reads sprite size; this documents the relation. */
  hitbox?: { w: number; h: number; offsetX: number; offsetY: number };
  /** Animation set in sheet order: one ROW per animation, frames left to right. */
  anims: Readonly<Record<string, AnimDef>>;
  /** Visual description for the artist. */
  description: string;
  /** Hex palette. */
  palette: readonly string[];
  variations: readonly string[];
  /** Scenes / rooms where it appears. */
  locations: readonly string[];
  priority: 'P0' | 'P1' | 'P2';
  placeholder: PlaceholderKind;
  integration: IntegrationStatus;
  /** Placeholder drawing hints (procedural placeholders only). */
  shape?: PlaceholderShape;
  /** Main / accent / glow colours (0xRRGGBB) for procedural placeholders. */
  colors?: readonly [number, number, number];
  /** Runtime texture keys for each frame in sheet order (row-major over `anims`). Final art replaces these keys. */
  textureKeys: readonly string[];
  /** Audio only. */
  audio?: { kind: 'music' | 'sfx' | 'ambience'; durationSeconds: number; loop: boolean; format: 'ogg' | 'mp3' | 'wav'; notes: string };
  /** Free-form integration note shown in the spec. */
  note?: string;
}

/** Total frames of an asset. */
export function frameCount(def: AssetDef): number {
  return Object.values(def.anims).reduce((n, a) => n + a.frames, 0);
}

/** Sheet layout: one row per animation, columns = the longest animation. */
export function sheetLayout(def: AssetDef): { columns: number; rows: number; width: number; height: number } {
  const anims = Object.values(def.anims);
  const columns = Math.max(1, ...anims.map((a) => a.frames));
  const rows = Math.max(1, anims.length);
  return { columns, rows, width: columns * def.display.w, height: rows * def.display.h };
}
