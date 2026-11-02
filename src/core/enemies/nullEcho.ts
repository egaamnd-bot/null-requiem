import { NULL_ECHO as T } from '../../config/enemyTuning';
import { createBody } from '../body';
import type { DamageSource } from '../combat';
import { approach, sign } from '../math';
import { Enemy, type EnemyContext } from './enemy';

export type NullEchoState = 'dormant' | 'trail' | 'stagger';

/**
 * Null Echo — a hostile afterimage of the Courier's own past.
 * It retraces the Courier's recorded path a couple of seconds behind them (`ctx.trail`), passing through
 * walls like a memory does. Standing still lets it catch up; moving constantly keeps it trailing.
 * It is tied to Backtrace: using Backtrace puts the Courier back on the very trail the echo is walking, and the
 * arrival burst (2 damage) shreds it, so a lure-then-rewind is the intended answer.
 * Elite: shorter delay (it hugs the Courier) and an extra hit point.
 */
export class NullEcho extends Enemy<NullEchoState> {
  readonly kind = 'nullEcho';
  private readonly homeX: number;
  private readonly homeY: number;
  private clock = 0;

  constructor(id: string, centerX: number, centerY: number, elite = false) {
    super(id, createBody(centerX - T.width / 2, centerY - T.height / 2, T.width, T.height), elite ? T.eliteHealth : T.health, 'dormant');
    this.elite = elite;
    this.homeX = centerX;
    this.homeY = centerY;
  }

  /** The echo ignores terrain entirely: it is a memory, not a body. */
  get ghosting(): boolean {
    return true;
  }

  protected think(ctx: EnemyContext): void {
    const b = this.body;
    const dt = ctx.dt;
    this.clock += dt;
    const delay = this.elite ? T.eliteDelay : T.delay;
    const point = ctx.playerAlive ? ctx.trail?.(delay) ?? null : null;

    if (this.state === 'stagger') {
      b.vx = approach(b.vx, 0, T.accel * dt);
      b.vy = approach(b.vy, 0, T.accel * dt);
      if (this.stateTime >= T.staggerTime) this.setState(point ? 'trail' : 'dormant');
    } else if (point) {
      if (this.state === 'dormant') this.setState('trail');
      const tx = point.x - b.w / 2;
      const ty = point.y - b.h / 2;
      const dx = tx - b.x;
      const dy = ty - b.y;
      const len = Math.hypot(dx, dy);
      const want = Math.min(T.maxSpeed, len * 6);
      const nx = len > 0.001 ? dx / len : 0;
      const ny = len > 0.001 ? dy / len : 0;
      b.vx = approach(b.vx, nx * want, T.accel * dt);
      b.vy = approach(b.vy, ny * want, T.accel * dt);
      this.facing = (sign(b.vx) || this.facing) as 1 | -1;
    } else {
      // No history to mimic yet: bob gently at the spawn point.
      this.state = 'dormant';
      const tx = this.homeX + Math.sin(this.clock * 1.4) * 6 - b.w / 2;
      const ty = this.homeY + Math.sin(this.clock * 2.1) * 4 - b.h / 2;
      b.vx = (tx - b.x) * 3;
      b.vy = (ty - b.y) * 3;
    }
    // Ghost movement: integrate directly (no tile collision).
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }

  protected onHurt(dirX: number): void {
    this.body.vx = (sign(dirX) || 1) * 90;
    this.body.vy = -30;
    this.setState('stagger');
  }

  damageSources(): DamageSource[] {
    if (!this.isAlive() || this.state === 'dormant') return [];
    return [this.contactSource(T.contactDamage)];
  }
}
