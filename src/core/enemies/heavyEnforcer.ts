import { HEAVY_ENFORCER as T } from '../../config/enemyTuning';
import { bodyRect, createBody, groundAhead, moveBody, wallAhead } from '../body';
import type { DamageSource } from '../combat';
import { approach, sign } from '../math';
import { Enemy, type EnemyContext } from './enemy';

export type EnforcerState = 'patrol' | 'windup' | 'slam' | 'slam2gap' | 'slam2' | 'recover' | 'stagger';

/**
 * Heavy Enforcer — an armoured precinct brute.
 * Frontal sword strokes bounce off its plate (a deflection clang) unless the hit is a pierce (Glitch Strike or
 * the Backtrace burst), comes from above/below, or lands while the plate is open. It is only truly open during
 * its recovery after a slam, or from behind. Slow, with a long readable wind-up: positioning is the whole game.
 * Elite: shorter wind-up and a second slam.
 */
export class HeavyEnforcer extends Enemy<EnforcerState> {
  readonly kind = 'heavyEnforcer';
  private cooldown = 0;

  constructor(id: string, feetX: number, feetY: number, elite = false) {
    super(id, createBody(feetX - T.width / 2, feetY - T.height, T.width, T.height), elite ? T.eliteHealth : T.health, 'patrol');
    this.elite = elite;
  }

  get windupProgress(): number {
    return this.state === 'windup' ? Math.min(1, this.stateTime / (this.elite ? T.eliteWindup : T.windup)) : 0;
  }

  /** Is the armour plate currently open to every hit? */
  get plateOpen(): boolean {
    return this.state === 'recover' || this.state === 'stagger';
  }

  protected think(ctx: EnemyContext): void {
    const b = this.body;
    const dt = ctx.dt;
    this.cooldown -= dt;
    const dx = ctx.playerX - this.centerX;
    const sees = this.canSee(ctx);

    switch (this.state) {
      case 'patrol': {
        if (sees) this.facing = (sign(dx) || this.facing) as 1 | -1;
        if (b.onGround && (wallAhead(b, ctx.grid, this.facing) || !groundAhead(b, ctx.grid, this.facing))) {
          if (sees) b.vx = 0;
          else this.facing = this.facing === 1 ? -1 : 1;
        }
        const blocked = b.onGround && (wallAhead(b, ctx.grid, this.facing) || !groundAhead(b, ctx.grid, this.facing));
        b.vx = blocked ? 0 : this.facing * T.walkSpeed;
        if (sees && Math.abs(dx) < 54 && this.cooldown <= 0) {
          this.setState('windup');
          ctx.emit({ type: 'enemyWindup', x: this.centerX, y: this.centerY, kind: this.kind });
        }
        break;
      }
      case 'windup':
        b.vx = approach(b.vx, 0, T.decel * dt);
        if (this.stateTime >= (this.elite ? T.eliteWindup : T.windup)) {
          this.doSlam(ctx);
          this.setState('slam');
        }
        break;
      case 'slam':
        if (this.stateTime >= T.slamActive) this.setState(this.elite ? 'slam2gap' : 'recover');
        break;
      case 'slam2gap':
        if (this.stateTime >= T.eliteSecondSlamGap) {
          this.doSlam(ctx);
          this.setState('slam2');
        }
        break;
      case 'slam2':
        if (this.stateTime >= T.slamActive) this.setState('recover');
        break;
      case 'recover':
        b.vx = approach(b.vx, 0, T.decel * dt);
        if (this.stateTime >= T.recover) {
          this.cooldown = T.attackCooldown;
          this.setState('patrol');
        }
        break;
      case 'stagger':
        b.vx = approach(b.vx, 0, T.decel * dt);
        if (this.stateTime >= T.staggerTime) this.setState('patrol');
        break;
    }
    b.vy = Math.min(b.vy + T.gravity * dt, T.maxFallSpeed);
    moveBody(b, ctx.grid, dt, { collideOneWay: true });
  }

  private doSlam(ctx: EnemyContext): void {
    ctx.emit({ type: 'bossSlam', x: this.centerX + this.facing * 14, y: this.body.y + this.body.h });
    const s = T.shockwave;
    ctx.spawnProjectile({
      kind: 'shockwave',
      x: this.centerX + this.facing * 12 - s.width / 2,
      y: this.body.y + this.body.h - s.height,
      w: s.width,
      h: s.height,
      vx: this.facing * s.speed,
      vy: 0,
      damage: s.damage,
      life: s.life,
    });
  }

  private canSee(ctx: EnemyContext): boolean {
    if (!ctx.playerAlive) return false;
    const dx = ctx.playerX - this.centerX;
    const dy = ctx.playerY - this.centerY;
    if (Math.abs(dx) > T.sightX || Math.abs(dy) > T.sightY) return false;
    return ctx.grid.lineOfSight(this.centerX, this.centerY, ctx.playerX, ctx.playerY);
  }

  override takeHit(damage: number, dirX: number, dirY: number): { killed: boolean } {
    const frontal = dirY === 0 && sign(dirX) === -this.facing;
    const pierces = damage >= T.armourPierce;
    if (frontal && !pierces && !this.plateOpen) {
      this.blocked = true;
      this.flash = 0.05;
      return { killed: false };
    }
    return super.takeHit(damage, dirX, dirY);
  }

  protected onHurt(): void {
    // A heavy plate barely flinches: only a short stagger, and never mid-slam.
    if (this.state === 'patrol' || this.state === 'windup') this.setState('stagger');
  }

  damageSources(): DamageSource[] {
    if (!this.isAlive()) return [];
    const sources: DamageSource[] = [this.contactSource(T.contactDamage)];
    if (this.state === 'slam' || this.state === 'slam2') {
      const r = bodyRect(this.body);
      const reach = 26;
      sources.push({
        rect: { x: this.facing > 0 ? r.x + r.w - 4 : r.x - reach + 4, y: r.y + 6, w: reach, h: r.h - 6 },
        damage: T.slamDamage,
        originX: this.centerX,
        originY: this.centerY,
        requiresLineOfSight: true,
      });
    }
    return sources;
  }
}
