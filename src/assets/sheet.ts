import { sheetLayout, type AssetDef } from './types';

/** One frame cut from a delivered sprite sheet. */
export interface FramePlan {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type SheetPlan = { ok: true; frames: FramePlan[]; frameW: number; frameH: number; scale: number } | { ok: false; error: string };

/**
 * Plan how to slice a delivered sheet into the asset's runtime texture keys.
 * Layout contract (see docs/ASSET_INTEGRATION_GUIDE.md): one ROW per animation in the manifest order, frames left to
 * right, every frame the same size. Any resolution is accepted as long as the grid divides the image evenly (within a
 * pixel per frame) and the frame aspect ratio matches the manifest's within 6%.
 */
export function planSheet(def: AssetDef, imageW: number, imageH: number): SheetPlan {
  if (def.textureKeys.length === 0) return { ok: false, error: `${def.id}: has no texture keys (not swap-ready)` };
  if (!(imageW > 0) || !(imageH > 0)) return { ok: false, error: `${def.id}: image has no size` };
  const layout = sheetLayout(def);
  const frameW = Math.floor(imageW / layout.columns);
  const frameH = Math.floor(imageH / layout.rows);
  if (frameW < 4 || frameH < 4) return { ok: false, error: `${def.id}: sheet ${imageW}x${imageH} is too small for ${layout.columns}x${layout.rows} frames` };
  const wantRatio = def.display.w / def.display.h;
  const gotRatio = frameW / frameH;
  if (Math.abs(gotRatio - wantRatio) / wantRatio > 0.06) {
    return { ok: false, error: `${def.id}: frame ratio ${gotRatio.toFixed(2)} does not match ${wantRatio.toFixed(2)} (${layout.columns}x${layout.rows} grid on ${imageW}x${imageH})` };
  }
  const frames: FramePlan[] = [];
  let k = 0;
  let row = 0;
  for (const a of Object.values(def.anims)) {
    for (let i = 0; i < a.frames; i++) {
      const key = def.textureKeys[k++];
      if (key) frames.push({ key, x: i * frameW, y: row * frameH, w: frameW, h: frameH });
    }
    row++;
  }
  return { ok: true, frames, frameW, frameH, scale: frameW / def.display.w };
}

/** Shape of `public/assets/final/manifest.json`. */
export interface FinalManifest {
  /** Bumped by the artist pipeline; informational. */
  version?: number;
  assets: Record<string, { file: string }>;
}

export function parseFinalManifest(raw: unknown): FinalManifest {
  const out: FinalManifest = { assets: {} };
  if (!raw || typeof raw !== 'object') return out;
  const a = (raw as { assets?: unknown }).assets;
  if (a && typeof a === 'object') {
    for (const [id, v] of Object.entries(a as Record<string, unknown>)) {
      const file = (v as { file?: unknown })?.file;
      if (typeof file === 'string' && /^[\w./-]+\.(png|webp|jpg|jpeg)$/i.test(file) && !file.includes('..')) out.assets[id] = { file };
    }
  }
  return out;
}

/**
 * R1 — world-size independence. A delivered frame of ANY pixel size must occupy exactly the world size the manifest
 * declares (`display`), regardless of the pixel size of the placeholder it replaces.
 *
 * Some views draw a texture with a constant scale chosen for the placeholder's pixel size (the Courier at 0.65, every
 * 2x world texture at 0.5). `viewScale` is that constant: the Phaser frame must report `display / viewScale` so that
 * `viewScale * frame size == display` and the view code does not change.
 *
 * Returns the texture-source resolution (final px per reported frame px) and the frame size Phaser must report.
 */
export function planWorldSize(
  def: Pick<AssetDef, 'display'>,
  viewScale: number,
  frame: { w: number; h: number },
): { resolution: number; frameW: number; frameH: number } {
  const vs = viewScale > 0 ? viewScale : 1;
  const frameW = def.display.w / vs;
  const resolution = frame.w > 0 && frameW > 0 ? frame.w / frameW : 1;
  // Height follows the same factor so artwork is never stretched; a within-tolerance aspect difference (planSheet allows
  // 6%) changes the frame height slightly instead of distorting pixels.
  return { resolution, frameW, frameH: frame.h / resolution };
}
