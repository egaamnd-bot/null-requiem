import Phaser from 'phaser';
import { view } from '../config/view';
import { DEPTH } from './RoomView';

/**
 * Wet-floor reflection of a sprite: a vertically flipped, squashed, faint copy just under the feet. Shown only while the actor
 * stands on the ground, and never in lite mode (render scale demoted to 1x). Presentation only.
 */
export class Reflection {
  private readonly img: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    tint = 0x8fb4ff,
    private readonly strength = 0.16,
  ) {
    this.img = scene.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 0).setFlipY(true).setTint(tint).setDepth(DEPTH.terrain + 1).setVisible(false);
  }

  /** `src` is the sprite being mirrored; `grounded` hides the reflection in the air. */
  update(src: Phaser.GameObjects.Image, grounded: boolean, alphaScale = 1): void {
    if (!grounded || view.renderScale <= 1 || !src.visible) {
      this.img.setVisible(false);
      return;
    }
    this.img
      .setTexture(src.texture.key, src.frame.name)
      .setPosition(src.x, src.y + 1)
      .setFlipX(src.flipX)
      .setScale(src.scaleX, src.scaleY * 0.45)
      .setAlpha(this.strength * alphaScale)
      .setVisible(true);
  }

  destroy(): void {
    this.img.destroy();
  }
}
