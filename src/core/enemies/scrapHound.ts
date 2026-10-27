import { COMBAT, ENEMIES } from '../../config/tuning';
import { bodyRect, createBody, groundAhead, moveBody, wallAhead } from '../body';
import type { DamageSource } from '../combat';
import { approach, sign } from '../math';
import { Enemy, type EnemyContext } from './enemy';

export type HoundState = 'patrol' | 'windup' | 'lunge' | 'recover' | 'stagger';

const T = ENEMIES.scrapHound;

/**
 * Scrap Hound — a low, four-legged security drone built from salvaged parts.
 * Rhythm: it patrols, notices the player, crouches with its sensor flaring (readable wind-up),
 * lunges forward, then sits exposed while its servos reset (recovery).
 * Hitting it during the wind-up interrupts the attack; the lunge itself has armour.
 */
export class ScrapHound extends Enemy<HoundState> {
  readonly kind = 'scrapHound';

  constructor(id: string, feetX: number, feetY: number) {
    super(id, createBody(feetX - T.width / 2, feetY - T.height, T.width, T.height), T.health, 'patrol');
  }

  protected think(ctx: EnemyContext): void {
    const b = this.body;
    const dt = ctx.dt;

    switch (this.state) {
      case 'patrol': {
        if (b.onGround && (wallAhead(b, ctx.grid, this.facing) || !groundAhead(b, ctx.grid, this.facing))) {
          this.facing = this.facing === 1 ? -1 : 1;
        }
        b.vx = this.facing * T.walkSpeed;
        if (this.canSeePlayer(ctx)) {
          this.facing = (sign(ctx.playerX - this.centerX) || this.facing) as 1 | -1;
          this.setState('windup');
          ctx.emit({ type: 'enemyWindup', x: this.centerX, y: this.centerY });
        }
        break;
      }
      case 'windup':
        b.vx = approach(b.vx, 0, T.decel * dt);
        if (this.stateTime >= T.windup) this.setState('lunge');
        break;
      case 'lunge': {
        const blocked = b.onGround && (wallAhead(b, ctx.grid, this.facing) || !groundAhead(b, ctx.grid, this.facing));
        b.vx = blocked ? 0 : this.facing * T.lungeSpeed;
        if (blocked || this.stateTime >= T.lungeTime) this.setState('recover');
        break;
      }
      case 'recover':
        b.vx = approach(b.vx, 0, T.decel * dt);
        if (this.stateTime >= T.recover) this.setState('patrol');
        break;
      case 'stagger':
        b.vx = approach(b.vx, 0, T.decel * dt);
        // Never get knocked off a ledge.
        if (b.onGround && !groundAhead(b, ctx.grid, sign(b.vx) || this.facing)) b.vx = 0;
        if (this.stateTime >= T.staggerTime) this.setState('patrol');
        break;
    }

    b.vy = Math.min(b.vy + T.gravity * dt, T.maxFallSpeed);
    moveBody(b, ctx.grid, dt, { collideOneWay: true });
  }

  private canSeePlayer(ctx: EnemyContext): boolean {
    if (!ctx.playerAlive) return false;
    const dx = ctx.playerX - this.centerX;
    const dy = ctx.playerY - this.centerY;
    if (Math.abs(dx) > T.detectRangeX || Math.abs(dy) > T.detectRangeY) return false;
    return ctx.grid.lineOfSight(this.centerX, this.centerY, ctx.playerX, ctx.playerY);
  }

  protected onHurt(dirX: number): void {
    if (this.state === 'lunge') return; // armoured while lunging
    const b = this.body;
    b.vx = (sign(dirX) || -this.facing) * COMBAT.enemyKnockback;
    if (this.state === 'patrol' || this.state === 'windup') {
      // Being struck turns it toward the attacker and interrupts a wind-up.
      this.facing = ((sign(dirX) || 1) * -1) as 1 | -1;
      this.setState('stagger');
    }
  }

  damageSources(): DamageSource[] {
    if (!this.isAlive()) return [];
    const sources: DamageSource[] = [this.contactSource(T.contactDamage)];
    if (this.state === 'lunge') {
      const r = bodyRect(this.body);
      const reach = 5;
      sources.push({
        rect: { x: this.facing > 0 ? r.x + r.w - 2 : r.x - reach, y: r.y - 2, w: reach + 2, h: r.h + 2 },
        damage: T.lungeDamage,
        originX: this.centerX,
        originY: this.centerY,
        requiresLineOfSight: true,
      });
    }
    return sources;
  }
}
