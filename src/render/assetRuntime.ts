import Phaser from 'phaser';
import { ASSET_BY_ID } from '../assets/manifest';
import { parseFinalManifest, planSheet } from '../assets/sheet';
import type { AssetDef } from '../assets/types';

/**
 * Runtime half of the asset pipeline:
 *  - `AssetSprite`: draws any manifest asset at its manifest display size, so swapping placeholder -> final art
 *    (any resolution) never changes how big something is in the world.
 *  - `loadFinalAssets`: optional boot step that replaces placeholder textures with delivered sheets
 *    (public/assets/final/manifest.json). Missing files are not an error: placeholders stay.
 *  - `texScale`: for legacy views that size sprites by a constant, the factor that keeps final art the same world size.
 */

const baseSize = new Map<string, { w: number; h: number }>();

/** Remember the pixel size of the first (placeholder) texture created for a key. */
export function noteBaseSize(key: string, w: number, h: number): void {
  if (!baseSize.has(key)) baseSize.set(key, { w, h });
}

/** Multiply a legacy view's constant scale by this so replaced (larger) textures keep their world size. */
export function texScale(scene: Phaser.Scene, key: string): number {
  const base = baseSize.get(key);
  if (!base) return 1;
  const src = scene.textures.get(key)?.getSourceImage() as { width?: number } | undefined;
  const w = src?.width;
  return w && w > 0 ? base.w / w : 1;
}

/** Texture key of a frame of a manifest asset. */
export function frameKey(def: AssetDef, anim: string, frame: number): string {
  let k = 0;
  for (const [name, a] of Object.entries(def.anims)) {
    if (name === anim) return def.textureKeys[k + Math.min(Math.max(0, frame), a.frames - 1)] ?? def.textureKeys[0] ?? '';
    k += a.frames;
  }
  return def.textureKeys[0] ?? '';
}

/** Frame index for an animation clock (seconds). */
export function frameAt(def: AssetDef, anim: string, seconds: number): number {
  const a = def.anims[anim];
  if (!a || a.frames <= 1) return 0;
  const f = Math.floor(seconds * a.fps);
  return a.loop ? f % a.frames : Math.min(f, a.frames - 1);
}

/** A sprite bound to a manifest asset. */
export class AssetSprite {
  readonly image: Phaser.GameObjects.Image;
  readonly def: AssetDef;

  constructor(scene: Phaser.Scene, assetId: string, depth: number, anim?: string) {
    const def = ASSET_BY_ID.get(assetId);
    if (!def) throw new Error(`Unknown asset ${assetId}`);
    this.def = def;
    const first = anim ?? Object.keys(def.anims)[0] ?? '';
    this.image = scene.add.image(0, 0, frameKey(def, first, 0)).setOrigin(def.anchor.x, def.anchor.y).setDepth(depth);
    this.image.setDisplaySize(def.display.w, def.display.h);
  }

  /** Show a frame; `clock` is seconds since the animation started (or any monotonic clock for looping). */
  show(anim: string, clock: number, flipX = false): this {
    const key = frameKey(this.def, anim, frameAt(this.def, anim, clock));
    if (key && this.image.scene.textures.exists(key)) this.image.setTexture(key);
    this.image.setDisplaySize(this.def.display.w, this.def.display.h).setFlipX(flipX);
    return this;
  }

  destroy(): void {
    this.image.destroy();
  }
}

export interface FinalLoadReport {
  loaded: string[];
  skipped: { id: string; reason: string }[];
}

/**
 * Optional boot step: load `assets/final/manifest.json` and swap in delivered art. Safe when nothing exists.
 * Call from BootScene.preload (queues the manifest) and `applyFinalAssets` from create (after files arrive).
 */
export function queueFinalManifest(scene: Phaser.Scene): void {
  scene.load.json('final-manifest', `${import.meta.env.BASE_URL}assets/final/manifest.json`);
}

export function applyFinalAssets(scene: Phaser.Scene, done: (r: FinalLoadReport) => void): void {
  const report: FinalLoadReport = { loaded: [], skipped: [] };
  const raw = scene.cache.json.get('final-manifest') as unknown;
  const manifest = parseFinalManifest(raw);
  const ids = Object.keys(manifest.assets);
  if (ids.length === 0) return done(report);
  for (const id of ids) {
    const def = ASSET_BY_ID.get(id);
    if (!def) report.skipped.push({ id, reason: 'unknown asset id' });
    else scene.load.image(`final:${id}`, `${import.meta.env.BASE_URL}assets/final/${manifest.assets[id]!.file}`);
  }
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
    for (const id of ids) {
      const def = ASSET_BY_ID.get(id);
      const tex = scene.textures.exists(`final:${id}`) ? scene.textures.get(`final:${id}`) : null;
      if (!def || !tex) {
        if (def) report.skipped.push({ id, reason: 'file failed to load' });
        continue;
      }
      const src = tex.getSourceImage() as HTMLImageElement;
      const plan = planSheet(def, src.width, src.height);
      if (!plan.ok) {
        report.skipped.push({ id, reason: plan.error });
        continue;
      }
      for (const f of plan.frames) {
        if (scene.textures.exists(f.key)) scene.textures.remove(f.key);
        const c = scene.textures.createCanvas(f.key, f.w, f.h);
        if (!c) continue;
        c.getContext().drawImage(src, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
        c.refresh();
      }
      report.loaded.push(id);
    }
    done(report);
  });
  scene.load.start();
}
