import { CAMERA } from '../config/tuning';
import { clamp, expDecay } from './math';

export interface CameraBounds {
  /** Room size in pixels. */
  width: number;
  height: number;
}

/**
 * Clamp a camera scroll position so the view never shows anything outside the room.
 * Rooms smaller than the view are centred (level validation keeps this from happening).
 */
export function clampScroll(
  x: number,
  y: number,
  viewW: number,
  viewH: number,
  bounds: CameraBounds,
): { x: number; y: number } {
  const maxX = bounds.width - viewW;
  const maxY = bounds.height - viewH;
  return {
    x: maxX >= 0 ? clamp(x, 0, maxX) : maxX / 2,
    y: maxY >= 0 ? clamp(y, 0, maxY) : maxY / 2,
  };
}

/**
 * Smooth, frame-rate independent camera follow with look-ahead, clamped to room bounds.
 */
export class CameraFollow {
  x = 0;
  y = 0;
  private lookAhead = 0;

  constructor(
    readonly viewW: number,
    readonly viewH: number,
    private bounds: CameraBounds,
  ) {}

  setBounds(bounds: CameraBounds): void {
    this.bounds = bounds;
    const c = clampScroll(this.x, this.y, this.viewW, this.viewH, bounds);
    this.x = c.x;
    this.y = c.y;
  }

  private target(focusX: number, focusY: number): { x: number; y: number } {
    return clampScroll(
      focusX + this.lookAhead - this.viewW / 2,
      focusY - this.viewH / 2 - CAMERA.verticalBias,
      this.viewW,
      this.viewH,
      this.bounds,
    );
  }

  /** Jump straight to the focus point (room entry, respawn). */
  snap(focusX: number, focusY: number, facing: number): void {
    this.lookAhead = facing * CAMERA.lookAhead;
    const t = this.target(focusX, focusY);
    this.x = t.x;
    this.y = t.y;
  }

  update(focusX: number, focusY: number, facing: number, dt: number): void {
    this.lookAhead = expDecay(this.lookAhead, facing * CAMERA.lookAhead, 3, dt);
    const t = this.target(focusX, focusY);
    this.x = expDecay(this.x, t.x, CAMERA.followRateX, dt);
    this.y = expDecay(this.y, t.y, CAMERA.followRateY, dt);
    // The target is already clamped, but smoothing toward it from a previous room-sized
    // position could still lie outside after a bounds change; clamp defensively.
    const c = clampScroll(this.x, this.y, this.viewW, this.viewH, this.bounds);
    this.x = c.x;
    this.y = c.y;
  }
}
