import { SENTRY_TURRET as T } from '../../config/enemyTuning';
import { createBody } from '../body';
import type { DamageSource } from '../combat';
import { clamp } from '../math';
import { Enemy, type EnemyContext } from './enemy';

export type TurretMount = 'floor' | 'ceiling' | 'left' | 'right';
export type TurretState = 'idle' | 'lock' | 'burst' | 'vent';

/** Angle (radians, 0 = +x, +y down) a turret on the given mount faces by default. */
export function mountNormal(mount: TurretMount): number {
  switch (mount) {
    case 'floor':
      return -Math.PI / 2;
    case 'ceiling':
      return Math.PI / 2;
    case 'left':
      return 0;
    case 'right':
      return Math.PI;
  }
}

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Aim at a target but never beyond `arc` either side of the mount normal. Exported for tests. */
export function clampAim(mount: TurretMount, targetAngle: number): { angle: number; inArc: boolean } {
  const n = mountNormal(mount);
  const diff = wrapAngle(targetAngle - n);
  return { angle: n + clamp(diff, -T.arc, T.arc), inArc: Math.abs(diff) <= T.arc };
}

/**
 * Sentry Turret — a wall/floor/ceiling-mounted gun that controls a corridor.
 * It only engages a Courier inside its firing arc and in line of sight: it locks on (a visible aim line),
 * fires a burst of bolts along the locked direction, then vents. The shield is only open while venting, so
 * the player must survive the burst, close in and strike during the vent window. Bolts can be cut down.
 * Elite: longer bursts, a faster lock and a second, slightly offset volley.
 */
export class SentryTurret extends Enemy<TurretState> {
  readonly kind = 'sentryTurret';
  /** Current barrel angle in radians. */
  aim: number;
  private lockedAim: number;
  private shotsLeft = 0;
  private shotTimer = 0;
  private scanClock = 0;

  constructor(
    id: string,
    centerX: number,
    centerY: number,
    readonly mount: TurretMount = 'floor',
    elite = false,
  ) {
    super(id, createBody(centerX - T.width / 2, centerY - T.height / 2, T.width, T.height), elite ? T.eliteHealth : T.health, 'idle');
    this.elite = elite;
    this.aim = mountNormal(mount);
    this.lockedAim = this.aim;
  }

  get shieldOpen(): boolean {
    return this.state === 'vent';
  }

  /** 0..1 lock progress, for the aim-line telegraph. */
  get lockProgress(): number {
    return this.state === 'lock' ? Math.min(1, this.stateTime / (this.elite ? T.eliteLockTime : T.lockTime)) : 0;
  }

  /** Direction the barrel points once locked (used by the view to draw the aim line). */
  get lockedAngle(): number {
    return this.lockedAim;
  }

  protected think(ctx: EnemyContext): void {
    const dt = ctx.dt;
    this.scanClock += dt;
    const toPlayer = Math.atan2(ctx.playerY - this.centerY, ctx.playerX - this.centerX);
    const dist = Math.hypot(ctx.playerX - this.centerX, ctx.playerY - this.centerY);
    const aimInfo = clampAim(this.mount, toPlayer);
    const canEngage = ctx.playerAlive && dist <= T.range && aimInfo.inArc && ctx.grid.lineOfSight(this.centerX, this.centerY, ctx.playerX, ctx.playerY);
    this.facing = Math.cos(this.aim) >= 0 ? 1 : -1;

    switch (this.state) {
      case 'idle': {
        // Slow sweep across the arc while nothing is in sight.
        const n = mountNormal(this.mount);
        const target = canEngage ? aimInfo.angle : n + Math.sin(this.scanClock * 1.3) * T.arc * 0.4;
        this.aim += clamp(wrapAngle(target - this.aim), -6 * dt, 6 * dt);
        if (canEngage && this.stateTime >= T.idleScan) {
          this.setState('lock');
          ctx.emit({ type: 'enemyWindup', x: this.centerX, y: this.centerY, kind: this.kind });
        }
        break;
      }
      case 'lock': {
        const lock = this.elite ? T.eliteLockTime : T.lockTime;
        // Track for the first 60% of the lock, then freeze the line so the player can step out of it.
        if (this.stateTime < lock * 0.6) {
          this.aim += clamp(wrapAngle(aimInfo.angle - this.aim), -8 * dt, 8 * dt);
          this.lockedAim = this.aim;
        }
        if (this.stateTime >= lock) {
          this.shotsLeft = this.elite ? T.eliteBurst : T.burst;
          this.shotTimer = 0;
          this.setState('burst');
        }
        break;
      }
      case 'burst':
        this.aim = this.lockedAim;
        this.shotTimer -= dt;
        if (this.shotsLeft > 0 && this.shotTimer <= 0) {
          this.fire(ctx, this.shotsLeft % 2 === 0 && this.elite ? 0.08 : 0);
          this.shotsLeft--;
          this.shotTimer = T.burstGap;
        }
        if (this.shotsLeft <= 0 && this.shotTimer <= 0) this.setState('vent');
        break;
      case 'vent':
        if (this.stateTime >= T.ventTime) this.setState('idle');
        break;
    }
  }

  private fire(ctx: EnemyContext, spread: number): void {
    const a = this.lockedAim + spread;
    const s = T.bolt.size;
    ctx.spawnProjectile({
      kind: 'laserBolt',
      x: this.centerX + Math.cos(a) * 9 - s / 2,
      y: this.centerY + Math.sin(a) * 9 - s / 2,
      w: s,
      h: s,
      vx: Math.cos(a) * T.bolt.speed,
      vy: Math.sin(a) * T.bolt.speed,
      damage: T.bolt.damage,
      life: T.bolt.life,
      slashable: true,
    });
    ctx.emit({ type: 'enemyShoot', x: this.centerX, y: this.centerY });
  }

  override takeHit(damage: number, dirX: number, dirY: number): { killed: boolean } {
    if (!this.shieldOpen) {
      this.blocked = true;
      this.flash = 0.05;
      return { killed: false };
    }
    return super.takeHit(damage, dirX, dirY);
  }

  protected onHurt(): void {
    this.flash = 0.09;
  }

  // Turrets are bolted down: no knockback, no gravity, and a downward strike does not bounce.
  override readonly pogoable: boolean = false;

  damageSources(): DamageSource[] {
    if (!this.isAlive()) return [];
    return [this.contactSource(T.contactDamage)];
  }
}
