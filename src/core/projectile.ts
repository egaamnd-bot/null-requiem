import type { Damageable } from './combat';
import type { Emit } from './events';
import type { Rect } from './math';
import type { TileGrid } from './tiles';

export type ProjectileKind = 'laserBolt' | 'shockwave' | 'plasmaRain';

export interface ProjectileSpec {
  kind: ProjectileKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  damage: number;
  life: number;
  gravity?: number;
  /** Can the player destroy it with an attack? */
  slashable?: boolean;
}

let nextProjectileId = 0;

/** A hostile projectile. Position is the top-left of its rect. */
export class Projectile implements Damageable {
  readonly id: string;
  readonly targetKind = 'projectile' as const;
  readonly requiresLineOfSight = true;
  readonly pogoable = false;
  readonly kind: ProjectileKind;
  x: number;
  y: number;
  readonly w: number;
  readonly h: number;
  vx: number;
  vy: number;
  readonly damage: number;
  private life: number;
  private readonly gravity: number;
  readonly slashable: boolean;
  alive = true;
  age = 0;

  constructor(spec: ProjectileSpec) {
    this.id = `proj-${nextProjectileId++}`;
    this.kind = spec.kind;
    this.x = spec.x;
    this.y = spec.y;
    this.w = spec.w;
    this.h = spec.h;
    this.vx = spec.vx;
    this.vy = spec.vy;
    this.damage = spec.damage;
    this.life = spec.life;
    this.gravity = spec.gravity ?? 0;
    this.slashable = spec.slashable ?? false;
  }

  rect(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  hurtbox(): Rect {
    return this.rect();
  }

  isAlive(): boolean {
    return this.alive && this.slashable;
  }

  update(grid: TileGrid, dt: number, emit: Emit): void {
    if (!this.alive) return;
    this.age += dt;
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) {
      this.alive = false;
      return;
    }
    // Leading-point tile test: bolts and plasma burst on terrain, shockwaves stop at walls.
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const leadX = cx + Math.sign(this.vx) * (this.w / 2);
    const leadY = this.kind === 'shockwave' ? cy : cy + Math.sign(this.vy) * (this.h / 2);
    if (grid.isSolidAtPoint(leadX, leadY) || grid.isSolidAtPoint(cx, cy)) {
      this.alive = false;
      emit({ type: 'projectileBurst', x: cx, y: cy });
    }
  }

  takeHit(): { killed: boolean } {
    this.alive = false;
    return { killed: true };
  }

  /** Called when the projectile strikes the player. */
  consume(): void {
    this.alive = false;
  }
}
