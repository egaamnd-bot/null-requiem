import type Phaser from 'phaser';
import { view } from '../config/view';

/**
 * R0: make every camera of a scene draw the LOGICAL world at K× canvas resolution. Origin (0,0) keeps Phaser's scroll
 * meaning "world coordinate of the top-left corner", so game code, HUD layout and physics are unchanged.
 * Call at the start of every scene's create() and whenever the render scale changes.
 */
export function applyRenderScale(scene: Phaser.Scene): void {
  const cams = scene.cameras?.cameras;
  if (!cams) return;
  for (const cam of cams) {
    cam.setOrigin(0, 0);
    cam.setZoom(view.renderScale);
  }
}

/** Pointer position (canvas px) -> logical coordinates. */
export function logicalPointer(ptr: { x: number; y: number }): { x: number; y: number } {
  return { x: ptr.x / view.renderScale, y: ptr.y / view.renderScale };
}
