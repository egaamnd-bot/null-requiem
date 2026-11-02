import { COMBAT } from '../../config/tuning';
import { STREET_SCAVENGER as T } from '../../config/enemyTuning';
import { bodyRect, createBody, groundAhead, moveBody, wallAhead } from '../body';
import type { DamageSource } from '../combat';
import { approach, sign } from '../math';
import { Enemy, type EnemyContext } from './enemy';

export type ScavengerState = 'patrol' | 'chase' | 'windup' | 'strike' | 'combo' | 'recover' | 'throw' | 'stagger';

/**
 * Street Scavenger — a desperate human-sized looter with a sharpened rail spike.
 * Patrols a platform, chases when it sees the Courier, stops at swing range, raises the spike (wind-up),
 * stabs, then is exposed during recovery. Never walks off a ledge.
 * Elite: faster, double stab combo, and throws scrap shivs when the Courier keeps their distance.
 */
export class StreetScavenger extends Enemy<ScavengerState> {
  readonly kind = 'streetScavenger';
  private lostSight = 0;
  private throwCooldown = 0;
  private comboLeft = 0;

  constructor(id: string, feetX: number, feetY: number, elite = false) {
    super(id, createBody(feetX - T.width / 2, feetY - T.height, T.width, T.height), elite ? T.eliteHealth : T.health, 'patrol');
    this.elite = elite;
  }

  /** 0..1 progress through the wind-up, for presentation. */
  get windupProgress(): number {
    return this.state === 'windup' ? Math.min(1, this.stateTime / (this.elite ? T.eliteWindup : T.windup)) : 0;
  }

  protected think(ctx: EnemyContext): void {
    const b = this.body;
    const dt = ctx.dt;
    this.throwCooldown -= dt;
    const dx = ctx.playerX - this.centerX;
    const sees = this.canSee(ctx);
    if (sees) this.lostSight = 0;
    else this.lostSight += dt;

    switch (this.state) {
      case 'patrol':
        if (b.onGround && (wallAhead(b, ctx.grid, this.facing) || !groundAhead(b, ctx.grid, this.facing))) this.facing = this.facing === 1 ? -1 : 1;
        b.vx = this.facing * T.walkSpeed;
        if (sees) {
          this.facing = (sign(dx) || this.facing) as 1 | -1;
          this.setState('chase');
        }
        break;
      case 'chase': {
        this.facing = (sign(dx) || this.facing) as 1 | -1;
        const dist = Math.abs(dx);
        if (this.elite && dist >= T.eliteThrowMin && this.throwCooldown <= 0 && sees) {
          this.setState('throw');
          ctx.emit({ type: 'enemyWindup', x: this.centerX, y: this.centerY });
          break;
        }
        const edge = b.onGround && (wallAhead(b, ctx.grid, this.facing) || !groundAhead(b, ctx.grid, this.facing));
        const speed = this.elite ? T.eliteChaseSpeed : T.chaseSpeed;
        b.vx = edge ? 0 : this.facing * speed;
        if (dist <= T.attackRange && Math.abs(ctx.playerY - this.centerY) < 24) {
          this.setState('windup');
          ctx.emit({ type: 'enemyWindup', x: this.centerX, y: this.centerY });
        } else if (this.lostSight > T.loseSightTime) {
          this.setState('patrol');
        }
        break;
      }
      case 'windup':
        b.vx = approach(b.vx, 0, T.decel * dt);
        if (this.stateTime >= (this.elite ? T.eliteWindup : T.windup)) {
          this.comboLeft = this.elite ? 1 : 0;
          this.setState('strike');
        }
        break;
      case 'strike':
        b.vx = approach(b.vx, this.facing * 40, T.decel * dt);
        if (this.stateTime >= T.strike) this.setState(this.comboLeft > 0 ? 'combo' : 'recover');
        break;
      case 'combo':
        // Short pause, then a second stab (elite only).
        b.vx = approach(b.vx, 0, T.decel * dt);
        if (this.stateTime >= T.eliteComboGap) {
          this.comboLeft = 0;
          this.setState('strike');
        }
        break;
      case 'recover':
        b.vx = approach(b.vx, 0, T.decel * dt);
        if (this.stateTime >= T.recover) this.setState(sees ? 'chase' : 'patrol');
        break;
      case 'throw':
        b.vx = approach(b.vx, 0, T.decel * dt);
        if (this.stateTime >= 0.35) {
          this.fireShiv(ctx);
          this.throwCooldown = T.eliteThrowCooldown;
          this.setState('recover');
        }
        break;
      case 'stagger':
        b.vx = approach(b.vx, 0, T.decel * dt);
        if (b.onGround && !groundAhead(b, ctx.grid, sign(b.vx) || this.facing)) b.vx = 0;
        if (this.stateTime >= T.staggerTime) this.setState('chase');
        break;
    }

    b.vy = Math.min(b.vy + T.gravity * dt, T.maxFallSpeed);
    moveBody(b, ctx.grid, dt, { collideOneWay: true });
  }

  private fireShiv(ctx: EnemyContext): void {
    const s = T.shiv.size;
    ctx.spawnProjectile({
      kind: 'laserBolt',
      x: this.centerX - s / 2,
      y: this.body.y + 6,
      w: s,
      h: s,
      vx: this.facing * T.shiv.speed,
      vy: 0,
      damage: T.shiv.damage,
      life: T.shiv.life,
      slashable: true,
    });
    ctx.emit({ type: 'enemyShoot', x: this.centerX, y: this.centerY });
  }

  private canSee(ctx: EnemyContext): boolean {
    if (!ctx.playerAlive) return false;
    const dx = ctx.playerX - this.centerX;
    const dy = ctx.playerY - this.centerY;
    if (Math.abs(dx) > T.sightX || Math.abs(dy) > T.sightY) return false;
    return ctx.grid.lineOfSight(this.centerX, this.centerY, ctx.playerX, ctx.playerY);
  }

  protected onHurt(dirX: number): void {
    const b = this.body;
    b.vx = (sign(dirX) || -this.facing) * COMBAT.enemyKnockback;
    if (this.state !== 'strike') {
      this.facing = ((sign(dirX) || 1) * -1) as 1 | -1;
      this.setState('stagger');
    }
  }

  damageSources(): DamageSource[] {
    if (!this.isAlive()) return [];
    const sources: DamageSource[] = [this.contactSource(T.contactDamage)];
    if (this.state === 'strike') {
      const r = bodyRect(this.body);
      const reach = 18;
      sources.push({
        rect: { x: this.facing > 0 ? r.x + r.w - 2 : r.x - reach, y: r.y + 4, w: reach + 2, h: r.h - 8 },
        damage: T.strikeDamage,
        originX: this.centerX,
        originY: this.centerY,
        requiresLineOfSight: true,
      });
    }
    return sources;
  }
}
