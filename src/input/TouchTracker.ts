import { holdKeysAt, isJoystickZone, joystickKeysAt, type HoldKey, type Point, type TouchLayout } from './touchLayout';

interface PointerState {
  keys: HoldKey[];
  joystickOrigin?: Point;
  joystickPoint?: Point;
}

/**
 * Multi-touch bookkeeping. A finger that begins in the lower-left movement zone gets its own
 * floating joystick origin; action-button fingers remain independent so movement + jump works.
 */
export class TouchTracker {
  private readonly pointers = new Map<number, PointerState>();

  constructor(private layout: TouchLayout) {}
  setLayout(layout: TouchLayout): void { this.layout = layout; }

  down(id: number, x: number, y: number): void {
    if (isJoystickZone(this.layout, x, y)) {
      const origin = { x, y };
      this.pointers.set(id, { keys: [], joystickOrigin: origin, joystickPoint: origin });
      return;
    }
    this.pointers.set(id, { keys: holdKeysAt(this.layout, x, y) });
  }

  move(id: number, x: number, y: number): void {
    const state = this.pointers.get(id);
    if (!state) return;
    if (state.joystickOrigin) {
      state.joystickPoint = { x, y };
      state.keys = joystickKeysAt(this.layout, state.joystickOrigin, x, y);
    } else {
      state.keys = holdKeysAt(this.layout, x, y);
    }
  }

  up(id: number): void { this.pointers.delete(id); }
  releaseAll(): void { this.pointers.clear(); }
  has(id: number): boolean { return this.pointers.has(id); }
  ids(): number[] { return [...this.pointers.keys()]; }

  /** Current floating joystick visual, if a movement finger is down. */
  joystickVisual(): { origin: Point; knob: Point; radius: number } | null {
    for (const state of this.pointers.values()) {
      if (state.joystickOrigin && state.joystickPoint) {
        const origin = state.joystickOrigin;
        const point = state.joystickPoint;
        const dx = point.x - origin.x;
        const dy = point.y - origin.y;
        const max = this.layout.dpad.r * this.layout.dpadReach;
        const d = Math.hypot(dx, dy);
        const ratio = d > max ? max / d : 1;
        return { origin, knob: { x: origin.x + dx * ratio, y: origin.y + dy * ratio }, radius: this.layout.dpad.r };
      }
    }
    return null;
  }

  held(): Set<HoldKey> {
    const out = new Set<HoldKey>();
    for (const state of this.pointers.values()) for (const key of state.keys) out.add(key);
    return out;
  }
}
