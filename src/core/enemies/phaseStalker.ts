import { PHASE_STALKER as T } from '../../config/enemyTuning';
import { bodyRect, createBody, moveBody } from '../body';
import type { DamageSource } from '../combat';
import { findStandSpot } from '../spots';
import { sign } from '../math';
import { Enemy, type EnemyContext } from './enemy';

export type StalkerState = 'lurk' | 'blinkOut' | 'blinkIn' | 'windup' | 'strike' | 'recover' | 'stagger';

/**
 * Phase Stalker — a flickering predator that blinks short distances.
 * It never charges: it lurks, vanishes, reappears beside the Courier, telegraphs a stab and strikes.
 * It punishes predictability: a Courier who stands still gets blinked onto, and a Backtrace arrival near it
 * makes it blink straight to the arrival point. Untargetable while phased; open during recovery.
 * Elite: double blink (a feint blink, then the real one) and a faster wind-up.
 */
export class PhaseStalker extends Enemy<StalkerState> {
  readonly kind = 'phaseStalker';
  private lurkTime: number;
  private pendingSpot: { feetX: number; feetY: number } | null = null;
  private blinksLeft = 0;
  /** True when the current blink was triggered by a Backtrace arrival (for tests / presentation). */
  reactedToBacktrace = false;

  constructor(id: string, feetX: number, feetY: number, elite = false) {
    super(id, createBody(feetX - T.width / 2, feetY - T.height, T.width, T.height), elite ? T.eliteHealth : T.health, 'lurk');
    this.elite = elite;
    this.lurkTime = T.lurkMin;
  }

  override get untargetable(): boolean {
    return this.phased;
  }

  /** Phased = invisible and untargetable. */
  get phased(): boolean {
    return this.state === 'blinkOut' || this.state === 'blinkIn';
  }

  /** 0..1 progress through the wind-up, for presentation. */
  get windupProgress(): number {
    return this.state === 'windup' ? Math.min(1, this.stateTime / (this.elite ? T.eliteWindup : T.windup)) : 0;
  }

  protected think(ctx: EnemyContext): void {
    const b = this.body;
    const dt = ctx.dt;
    const dx = ctx.playerX - this.centerX;
    const near = ctx.playerAlive && Math.hypot(dx, ctx.playerY - this.centerY) < T.sightRange;

    // Backtrace reaction: interrupts lurking/recovering and goes straight for the arrival point.
    const arrival = ctx.backtraceArrival;
    if (arrival && ctx.playerAlive && (this.state === 'lurk' || this.state === 'recover') && Math.hypot(arrival.x - this.centerX, arrival.y - this.centerY) < T.backtraceReactRange) {
      this.reactedToBacktrace = true;
      this.beginBlink(ctx, arrival.x, arrival.y, 1);
      return;
    }

    switch (this.state) {
      case 'lurk':
        this.facing = (sign(dx) || this.facing) as 1 | -1;
        this.lurkTime -= dt;
        if (near && (this.lurkTime <= 0 || (ctx.playerStillTime ?? 0) >= T.stillPunishTime)) {
          this.reactedToBacktrace = false;
          this.beginBlink(ctx, ctx.playerX, ctx.playerY, this.elite && T.eliteDoubleBlink ? 2 : 1);
        }
        break;
      case 'blinkOut':
        if (this.stateTime >= T.blinkOut) {
          if (this.pendingSpot) {
            b.x = this.pendingSpot.feetX - b.w / 2;
            b.y = this.pendingSpot.feetY - b.h;
            b.vx = 0;
            b.vy = 0;
          }
          this.setState('blinkIn');
        }
        break;
      case 'blinkIn':
        if (this.stateTime >= T.blinkIn) {
          this.facing = (sign(ctx.playerX - this.centerX) || this.facing) as 1 | -1;
          if (this.blinksLeft > 0) {
            // Elite feint: blink once more to the other side before committing.
            this.blinksLeft--;
            this.beginBlink(ctx, ctx.playerX, ctx.playerY, 0);
          } else {
            this.setState('windup');
            ctx.emit({ type: 'enemyWindup', x: this.centerX, y: this.centerY, kind: this.kind });
          }
        }
        break;
      case 'windup':
        this.facing = (sign(ctx.playerX - this.centerX) || this.facing) as 1 | -1;
        if (this.stateTime >= (this.elite ? T.eliteWindup : T.windup)) this.setState('strike');
        break;
      case 'strike':
        if (this.stateTime >= T.strike) this.setState('recover');
        break;
      case 'recover':
        if (this.stateTime >= T.recover) {
          this.lurkTime = T.lurkMin + ctx.rng() * (T.lurkMax - T.lurkMin);
          this.setState('lurk');
        }
        break;
      case 'stagger':
        if (this.stateTime >= T.staggerTime) this.setState('lurk');
        break;
    }
    b.vy = Math.min(b.vy + T.gravity * dt, T.maxFallSpeed);
    moveBody(b, ctx.grid, dt, { collideOneWay: true });
  }

  /** Choose a landing spot near (tx, ty) and start phasing out. `extraBlinks` queues feint blinks. */
  private beginBlink(ctx: EnemyContext, tx: number, ty: number, extraBlinks: number): void {
    const arrivalBlink = this.reactedToBacktrace;
    const spot = findStandSpot(ctx.grid, tx, ty, this.body.w, this.body.h, arrivalBlink ? 0 : T.blinkMin, T.blinkMax, ctx.rng);
    this.pendingSpot = spot ?? { feetX: this.centerX, feetY: this.body.y + this.body.h };
    this.blinksLeft = Math.max(0, extraBlinks - 1);
    this.setState('blinkOut');
  }

  override takeHit(damage: number, dirX: number, dirY: number): { killed: boolean } {
    if (this.phased) return { killed: false };
    return super.takeHit(damage, dirX, dirY);
  }

  protected onHurt(): void {
    if (this.state === 'strike') return;
    this.setState('stagger');
    this.lurkTime = T.lurkMin;
  }

  damageSources(): DamageSource[] {
    if (!this.isAlive() || this.phased) return [];
    const sources: DamageSource[] = [this.contactSource(T.contactDamage)];
    if (this.state === 'strike') {
      const r = bodyRect(this.body);
      const reach = 20;
      sources.push({
        rect: { x: this.facing > 0 ? r.x + r.w - 2 : r.x - reach, y: r.y + 2, w: reach + 2, h: r.h - 4 },
        damage: T.strikeDamage,
        originX: this.centerX,
        originY: this.centerY,
        requiresLineOfSight: true,
      });
    }
    return sources;
  }
}
