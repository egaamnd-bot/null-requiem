/**
 * One-shot Courier animations (R6): Backtrace arrival, air jump, interact, death. Pure timing logic (no Phaser) so it is
 * unit-tested. Frame counts and rates come from the manifest; the view only asks "which frame now?".
 */
export type CourierShot = 'backtrace' | 'airjump' | 'interact' | 'death';

export interface ShotDef {
  frames: number;
  fps: number;
  /** Stay on the last frame until cleared (death). */
  hold: boolean;
}

export class OneShotTrack {
  private anim: CourierShot | null = null;
  private t0 = 0;

  constructor(private readonly defs: Readonly<Partial<Record<CourierShot, ShotDef>>>) {}

  /** Start `anim` at time `now` (seconds). Death overrides everything; nothing interrupts death until `clear()`. */
  start(anim: CourierShot, now: number): boolean {
    if (!this.defs[anim]) return false; // no art delivered for it: the normal pose keeps playing
    if (this.anim === 'death' && anim !== 'death') return false;
    this.anim = anim;
    this.t0 = now;
    return true;
  }

  clear(): void {
    this.anim = null;
  }

  /** Current override, or null when the normal pose should be shown. Expired non-hold animations clear themselves. */
  frameAt(now: number): { anim: CourierShot; index: number } | null {
    if (!this.anim) return null;
    const d = this.defs[this.anim]!;
    const idx = Math.floor(Math.max(0, now - this.t0) * d.fps);
    if (idx >= d.frames) {
      if (d.hold) return { anim: this.anim, index: d.frames - 1 };
      this.anim = null;
      return null;
    }
    return { anim: this.anim, index: idx };
  }

  get active(): CourierShot | null {
    return this.anim;
  }
}
