import { bodyCenterX, bodyCenterY, bodyRect, type Body } from '../body';
import type { Damageable, DamageSource } from '../combat';
import type { Emit } from '../events';
import { Health } from '../health';
import type { Rect } from '../math';
import type { ProjectileSpec } from '../projectile';
import type { TileGrid } from '../tiles';

/** What an enemy can see of the world each step. */
export interface EnemyContext {
  grid: TileGrid;
  dt: number;
  playerX: number;
  playerY: number;
  playerAlive: boolean;
  spawnProjectile: (spec: ProjectileSpec) => void;
  emit: Emit;
  rng: () => number;
  /** Set for exactly one step when the player has just used Backtrace (arrival point, centre). */
  backtraceArrival?: { x: number; y: number } | null;
  /** Where the Courier was `secondsAgo` seconds ago (feet-centre), or null if there is no history yet. */
  trail?: (secondsAgo: number) => { x: number; y: number } | null;
  /** How long the player has been (nearly) stationary, in seconds. */
  playerStillTime?: number;
  /** Ask the world to spawn another enemy (bosses summon adds). */
  spawnEnemy?: (type: string, x: number, y: number, elite?: boolean) => void;
}

/**
 * Shared enemy plumbing: body, health, hit flash, state timer.
 * Concrete enemies implement their own state machines.
 */
export abstract class Enemy<S extends string = string> implements Damageable {
  abstract readonly kind: string;
  readonly targetKind: 'enemy' | 'boss' = 'enemy';
  readonly requiresLineOfSight = true;
  readonly pogoable: boolean = true;
  readonly health: Health;
  facing: 1 | -1 = -1;
  /** Elite variants use extra attack patterns, not only more health. */
  elite = false;
  state: S;
  stateTime = 0;
  /** Seconds of white hit-flash remaining (presentation hint). */
  flash = 0;

  protected constructor(
    readonly id: string,
    readonly body: Body,
    maxHealth: number,
    initialState: S,
  ) {
    this.health = new Health(maxHealth);
    this.state = initialState;
  }

  get centerX(): number {
    return bodyCenterX(this.body);
  }

  get centerY(): number {
    return bodyCenterY(this.body);
  }

  isAlive(): boolean {
    return !this.health.isDead;
  }

  /** True while the enemy cannot be struck at all (e.g. phased out). The world skips it when resolving attacks. */
  get untargetable(): boolean {
    return false;
  }

  hurtbox(): Rect {
    return bodyRect(this.body);
  }

  protected setState(state: S): void {
    this.state = state;
    this.stateTime = 0;
  }

  /** Damage sources this enemy currently presents to the player. */
  abstract damageSources(): DamageSource[];

  update(ctx: EnemyContext): void {
    if (!this.isAlive()) return;
    this.stateTime += ctx.dt;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - ctx.dt);
    this.think(ctx);
  }

  protected abstract think(ctx: EnemyContext): void;

  /** Set by armoured / shielded enemies when the most recent hit was deflected (presentation + audio hint). */
  blocked = false;

  takeHit(damage: number, dirX: number, dirY: number): { killed: boolean } {
    this.blocked = false;
    const res = this.health.tryDamage(damage, 0);
    if (!res.applied) return { killed: false };
    this.flash = 0.09;
    this.onHurt(dirX, dirY, res.died);
    return { killed: res.died };
  }

  protected abstract onHurt(dirX: number, dirY: number, died: boolean): void;

  protected contactSource(damage: number): DamageSource {
    return {
      rect: bodyRect(this.body),
      damage,
      originX: this.centerX,
      originY: this.centerY,
      requiresLineOfSight: false,
    };
  }
}
