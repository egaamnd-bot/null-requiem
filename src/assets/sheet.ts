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
