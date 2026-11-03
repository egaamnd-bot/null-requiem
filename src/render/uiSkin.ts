import type Phaser from 'phaser';
import { fitsMargins, SKINS, skinKey, type SkinKind, type SkinState } from '../assets/ui9';

/**
 * Optional painted skin for a UI element that is drawn in code today (a Phaser Rectangle). When the nine-slice art of the
 * element was delivered, a NineSlice image is placed over the rectangle and the rectangle is hidden; otherwise nothing changes at all.
 * The tap target / hit area, text and layout are untouched: only the look of the background switches per state.
 */
export class Skin {
  private constructor(
    readonly image: Phaser.GameObjects.NineSlice,
    private readonly rect: Phaser.GameObjects.Rectangle,
    private readonly kind: SkinKind,
  ) {}

  /** Returns null when the art for this kind (idle state) is not loaded or the rectangle is too small for the margins. */
  static attach(scene: Phaser.Scene, rect: Phaser.GameObjects.Rectangle, kind: SkinKind): Skin | null {
    const key = skinKey(kind, 'idle');
    if (!scene.textures.exists(key) || !fitsMargins(kind, rect.width, rect.height)) return null;
    const m = SKINS[kind].margins;
    const img = scene.add
      .nineslice(rect.x, rect.y, key, undefined, rect.width, rect.height, m.left, m.right, m.top, m.bottom)
      .setOrigin(rect.originX, rect.originY)
      .setDepth(rect.depth);
    const skin = new Skin(img, rect, kind);
    skin.sync('idle');
    return skin;
  }

  /** Show the art of `state` (falls back to idle when that state was not delivered) and follow the rectangle's scale/visibility. */
  sync(state: SkinState, scale = 1): void {
    const scene = this.image.scene;
    const key = skinKey(this.kind, state);
    this.image.setTexture(scene.textures.exists(key) ? key : skinKey(this.kind, 'idle'));
    this.image.setScale(scale).setPosition(this.rect.x, this.rect.y);
    this.image.setVisible(this.rect.visible);
    this.rect.setAlpha(0);
  }

  destroy(): void {
    this.image.destroy();
  }
}

/** Convenience for sites that keep a parallel array of rectangles. */
export function attachSkins(scene: Phaser.Scene, rects: readonly Phaser.GameObjects.Rectangle[], kind: SkinKind): (Skin | null)[] {
  return rects.map((r) => Skin.attach(scene, r, kind));
}
