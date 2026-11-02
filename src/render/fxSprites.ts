import type Phaser from 'phaser';
import { ASSET_BY_ID } from '../assets/manifest';
import { frameKey } from './assetRuntime';

/**
 * R8: multi-frame effects. A manifest FX asset plays as a sprite animation when its delivered frames exist; otherwise the
 * caller falls back to the placeholder (particles / rings), so the game never depends on final art.
 */

/** Texture keys of one animation, or null unless EVERY frame texture exists (i.e. final art was delivered). */
export function fxFrameKeys(scene: Phaser.Scene, assetId: string, anim: string): string[] | null {
  const def = ASSET_BY_ID.get(assetId);
  const a = def?.anims[anim];
  if (!def || !a) return null;
  const keys = Array.from({ length: a.frames }, (_, i) => frameKey(def, anim, i));
  return keys.every((k) => k && scene.textures.exists(k)) ? keys : null;
}

export interface FxSpriteOpts {
  depth: number;
  flipX?: boolean;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  /** Additive blending (light effects). */
  additive?: boolean;
}

/** Play a one-shot effect at a world position. Returns false when no final art exists (caller uses its placeholder). */
export function playFxSprite(scene: Phaser.Scene, assetId: string, anim: string, x: number, y: number, o: FxSpriteOpts): boolean {
  const keys = fxFrameKeys(scene, assetId, anim);
  const def = ASSET_BY_ID.get(assetId);
  if (!keys || !def) return false;
  const a = def.anims[anim]!;
  const img = scene.add.image(x, y, keys[0]!).setOrigin(def.anchor.x, def.anchor.y).setDepth(o.depth).setFlipX(!!o.flipX).setRotation(o.rotation ?? 0).setScale(o.scaleX ?? 1, o.scaleY ?? 1);
  if (o.additive) img.setBlendMode(1 /* Phaser.BlendModes.ADD */);
  scene.tweens.addCounter({
    from: 0,
    to: keys.length,
    duration: (a.frames / a.fps) * 1000,
    onUpdate: (tw) => img.setTexture(keys[Math.min(keys.length - 1, Math.floor(tw.getValue() ?? 0))]!),
    onComplete: () => img.destroy(),
  });
  return true;
}
