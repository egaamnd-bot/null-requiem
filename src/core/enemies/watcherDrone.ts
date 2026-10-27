import { COMBAT, ENEMIES } from '../../config/tuning';
import { createBody, moveBody } from '../body';
import type { DamageSource } from '../combat';
import { approach, clamp, sign } from '../math';
import { Enemy, type EnemyContext } from './enemy';

export type DroneState = 'drift' | 'windup' | 'cooldown' | 'stagger';

const T = ENEMIES.watcherDrone;

/**
 * Watcher Drone — a hovering surveillance drone with a targeting laser.
 * It bobs around its patrol point, keeps its distance once it notices the player, glows hot while
 * charging (wind-up), then fires a slow laser bolt. Bolts can be cut out of the air.
 */
export class WatcherDrone extends Enemy<DroneState> {
  readonly kind = 'watcherDrone';
  private clock: number;
  private readonly homeX: number;
  private readonly homeY: number;

  constructor(id: string, centerX: number, centerY: number, phase = 0) {
    super(id, createBody(centerX - T.width / 2, centerY - T.height / 2, T.width, T.height), T.health, 'drift');
    this.homeX = centerX;
    this.homeY = centerY;
    this.clock = phase;
  }

  /** 0..1 wind-up progress, for presentation. */
  get charge(): number {
    return this.state === 'windup' ? Math.min(1, this.stateTime / T.windup) : 0;
  }

  protected think(ctx: EnemyContext): void {
    const b = this.body;
    const dt = ctx.dt;
    this.clock += dt;

    const aware = this.canSeePlayer(ctx);
    if (aware) this.facing = (sign(ctx.playerX - this.centerX) || this.facing) as 1 | -1;

    switch (this.state) {
      case 'drift':
        this.seek(this.idleTargetX(), this.idleTargetY(), dt);
        if (aware && this.stateTime > 0.4) {
          this.setState('windup');
          ctx.emit({ type: 'enemyWindup', x: this.centerX, y: this.centerY });
        }
        break;
      case 'windup':
        b.vx = approach(b.vx, 0, T.accel * dt);
        b.vy = approach(b.vy, 0, T.accel * dt);
        if (this.stateTime >= T.windup) {
          if (ctx.playerAlive) this.fire(ctx);
          this.setState('cooldown');
        }
        break;
      case 'cooldown':
        if (aware) this.seek(this.aggroTargetX(ctx.playerX), this.aggroTargetY(ctx.playerY), dt);
        else this.seek(this.idleTargetX(), this.idleTargetY(), dt);
        if (this.stateTime >= T.cooldown) this.setState('drift');
        break;
      case 'stagger':
        b.vx = approach(b.vx, 0, T.accel * dt);
        b.vy = approach(b.vy, 0, T.accel * dt);
        if (this.stateTime >= T.staggerTime) this.setState('cooldown');
        break;
    }

    moveBody(b, ctx.grid, dt, { collideOneWay: false });
  }

  private idleTargetX(): number {
    return this.homeX + Math.sin(this.clock * T.bobFreqX) * T.bobAmpX;
  }

  private idleTargetY(): number {
    return this.homeY + Math.sin(this.clock * T.bobFreqY) * T.bobAmpY;
  }

  private aggroTargetX(playerX: number): number {
    const side = sign(this.homeX - playerX) || 1;
    return clamp(playerX + side * T.keepDistance, this.homeX - T.leashX, this.homeX + T.leashX);
  }

  private aggroTargetY(playerY: number): number {
    return clamp(playerY - T.hoverAbove, this.homeY - T.leashY, this.homeY + T.leashY);
  }

  private seek(tx: number, ty: number, dt: number): void {
    const b = this.body;
    const gain = 2.5;
    const dvx = clamp((tx - this.centerX) * gain, -T.maxSpeed, T.maxSpeed);
    const dvy = clamp((ty - this.centerY) * gain, -T.maxSpeed, T.maxSpeed);
    b.vx = approach(b.vx, dvx, T.accel * dt);
    b.vy = approach(b.vy, dvy, T.accel * dt);
  }

  private fire(ctx: EnemyContext): void {
    const dx = ctx.playerX - this.centerX;
    const dy = ctx.playerY - this.centerY;
    const len = Math.hypot(dx, dy) || 1;
    const s = T.bolt.size;
    ctx.spawnProjectile({
      kind: 'laserBolt',
      x: this.centerX - s / 2,
      y: this.centerY - s / 2,
      w: s,
      h: s,
      vx: (dx / len) * T.bolt.speed,
      vy: (dy / len) * T.bolt.speed,
      damage: T.bolt.damage,
      life: T.bolt.life,
      slashable: true,
    });
    ctx.emit({ type: 'enemyShoot', x: this.centerX, y: this.centerY });
  }

  private canSeePlayer(ctx: EnemyContext): boolean {
    if (!ctx.playerAlive) return false;
    const d = Math.hypot(ctx.playerX - this.centerX, ctx.playerY - this.centerY);
    if (d > T.aggroRange) return false;
    return ctx.grid.lineOfSight(this.centerX, this.centerY, ctx.playerX, ctx.playerY);
  }

  protected onHurt(dirX: number, dirY: number): void {
    const b = this.body;
    const len = Math.hypot(dirX, dirY) || 1;
    b.vx = (dirX / len) * COMBAT.enemyKnockback;
    b.vy = (dirY / len) * COMBAT.enemyKnockback;
    this.setState('stagger');
  }

  damageSources(): DamageSource[] {
    if (!this.isAlive()) return [];
    return [this.contactSource(T.contactDamage)];
  }
}
