import type { AnimDef, AssetCategory, AssetDef, IntegrationStatus, PackId, PlaceholderKind, PlaceholderShape } from './types';

/**
 * Builders for asset definitions. See manifest.ts for the data.
 *
 * Conventions
 *  - `display` is the size of one frame in the world in logical pixels (1 logical px = 1 world px; phones show ~4x).
 *    Recommended delivery size is display x 4 (crisp on 1080p phones).
 *  - Sheets have ONE ROW PER ANIMATION in the order declared in `anims`, frames left to right.
 *  - Placeholder keys for new assets: `<id>__<anim>_<frame>`.
 */

export const anim = (frames: number, fps: number, loop = true, note?: string): AnimDef => ({ frames, fps, loop, ...(note ? { note } : {}) });

export interface Spec {
  id: string;
  name: string;
  category: AssetCategory;
  pack: PackId;
  purpose: string;
  w: number;
  h: number;
  anchor?: { x: number; y: number };
  hitbox?: { w: number; h: number; offsetX: number; offsetY: number };
  anims: Record<string, AnimDef>;
  description: string;
  palette: string[];
  variations?: string[];
  locations: string[];
  priority?: 'P0' | 'P1' | 'P2';
  placeholder?: PlaceholderKind;
  integration?: IntegrationStatus;
  shape?: PlaceholderShape;
  colors?: readonly [number, number, number];
  keys?: string[];
  audio?: AssetDef['audio'];
  note?: string;
}

export function def(s: Spec): AssetDef {
  const keys =
    s.keys ??
    Object.entries(s.anims).flatMap(([name, a]) => Array.from({ length: a.frames }, (_, i) => `${s.id}__${name}_${i}`));
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    pack: s.pack,
    purpose: s.purpose,
    display: { w: s.w, h: s.h },
    anchor: s.anchor ?? { x: 0.5, y: 1 },
    ...(s.hitbox ? { hitbox: s.hitbox } : {}),
    anims: s.anims,
    description: s.description,
    palette: s.palette,
    variations: s.variations ?? [],
    locations: s.locations,
    priority: s.priority ?? 'P1',
    placeholder: s.placeholder ?? 'procedural',
    integration: s.integration ?? 'swap-ready',
    ...(s.shape ? { shape: s.shape } : {}),
    ...(s.colors ? { colors: s.colors } : {}),
    textureKeys: keys,
    ...(s.audio ? { audio: s.audio } : {}),
    ...(s.note ? { note: s.note } : {}),
  };
}

