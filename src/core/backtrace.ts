import { BACKTRACE } from '../config/tuning';
import type { TileGrid } from './tiles';

/** One recorded moment of the player's past. Position is the feet point. */
export interface EchoSample {
  feetX: number;
  feetY: number;
  facing: 1 | -1;
  health: number;
}

/**
 * Backtrace — the player's personal rewind.
 *
 * Every simulation step records where the player stood. The oldest sample (BACKTRACE.window
 * seconds ago) is the "echo": a visible afterimage trailing behind the player. Activating
 * Backtrace snaps the player back to the echo and restores any health lost since then.
 * The world does NOT rewind — enemies, switches and gates keep their current state, which is
 * what makes the ability useful for both combat and puzzles.
 */
export class Backtrace {
  private readonly capacity: number;
  private readonly buf: EchoSample[];
  private head = 0;
  private count = 0;
  cooldown = 0;

  constructor(
    readonly stepHz: number,
    readonly windowSeconds: number = BACKTRACE.window,
  ) {
    this.capacity = Math.max(1, Math.round(windowSeconds * stepHz) + 1);
    this.buf = new Array<EchoSample>(this.capacity);
  }

  /** Seconds of history currently recorded. */
  get historySeconds(): number {
    return Math.max(0, this.count - 1) / this.stepHz;
  }

  get ready(): boolean {
    return this.cooldown <= 0 && this.historySeconds >= BACKTRACE.minHistory;
  }

  /** 1 right after use, falling to 0 when ready again. */
  get cooldownRatio(): number {
    return Math.max(0, this.cooldown) / BACKTRACE.cooldown;
  }

  tick(dt: number): void {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
  }

  record(sample: EchoSample): void {
    this.buf[this.head] = { ...sample };
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  /** Forget all history (room change, respawn, after use). */
  clear(): void {
    this.count = 0;
    this.head = 0;
  }

  /** Sample `i` steps after the oldest one (0 = oldest). */
  private at(i: number): EchoSample {
    const start = (this.head - this.count + this.capacity) % this.capacity;
    return this.buf[(start + i) % this.capacity] as EchoSample;
  }

  /** The echo: where Backtrace would send the player right now (ignoring blocked spots). */
  echo(): EchoSample | null {
    return this.count > 0 ? this.at(0) : null;
  }

  /**
   * The oldest recorded spot the player can actually occupy now. A sample is skipped if the
   * world has changed under it (e.g. a gate closed there) or it lies in a hazard.
   */
  target(grid: TileGrid, bodyW: number, bodyH: number): EchoSample | null {
    for (let i = 0; i < this.count; i++) {
      const s = this.at(i);
      const rect = { x: s.feetX - bodyW / 2, y: s.feetY - bodyH, w: bodyW, h: bodyH };
      if (!grid.rectOverlapsSolid(rect) && !grid.rectOverlapsHazard(rect)) return s;
    }
    return null;
  }

  /**
   * Highest health recorded within the window. Restoring to this undoes damage taken since,
   * without ever lowering health (e.g. after healing at a relay).
   */
  bestHealth(): number {
    let best = 0;
    for (let i = 0; i < this.count; i++) best = Math.max(best, this.at(i).health);
    return best;
  }

  /** Start the cooldown and forget history so a new echo begins at the arrival point. */
  consume(): void {
    this.cooldown = BACKTRACE.cooldown;
    this.clear();
  }
}
