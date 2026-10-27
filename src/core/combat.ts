import { COMBAT } from '../config/tuning';
import { bodyCenterX, bodyCenterY, type Body } from './body';
import type { AttackDirection } from './events';
import { intersection, rectCenter, type Rect } from './math';
import type { TileGrid } from './tiles';

/** World-space hitbox for a player attack in the given direction. */
export function attackHitbox(body: Body, facing: number, dir: AttackDirection): Rect {
  const a = COMBAT.attack;
  const cx = bodyCenterX(body);
  const cy = bodyCenterY(body);
  switch (dir) {
    case 'side': {
      const w = body.w / 2 + a.side.reach;
      return {
        x: facing > 0 ? cx : cx - w,
        y: cy - a.side.height / 2 - 2,
        w,
        h: a.side.height,
      };
    }
    case 'up':
      return { x: cx - a.up.width / 2, y: body.y - a.up.reach, w: a.up.width, h: a.up.reach + body.h / 2 };
    case 'down':
      return { x: cx - a.down.width / 2, y: cy, w: a.down.width, h: body.h / 2 + a.down.reach };
  }
}

/**
 * Does `hitbox`, originating from `origin`, legitimately reach `target`?
 * Requires overlap AND an unobstructed line from the attacker to the overlapping region,
 * so attacks never connect through walls.
 */
export function hitConnects(
  grid: TileGrid,
  originX: number,
  originY: number,
  hitbox: Rect,
  target: Rect,
): boolean {
  const overlap = intersection(hitbox, target);
  if (!overlap) return false;
  const c = rectCenter(overlap);
  return grid.lineOfSight(originX, originY, c.x, c.y);
}

/** Something the player's attacks can damage. */
export interface Damageable {
  readonly id: string;
  readonly targetKind: 'enemy' | 'boss' | 'projectile' | 'wall';
  isAlive(): boolean;
  hurtbox(): Rect;
  /** Walls are checked without line of sight (the hitbox overlaps the wall itself). */
  readonly requiresLineOfSight: boolean;
  /** Whether a downward strike on this target bounces the player. */
  readonly pogoable: boolean;
  takeHit(damage: number, dirX: number, dirY: number): { killed: boolean };
}

/** A source of damage to the player. */
export interface DamageSource {
  rect: Rect;
  damage: number;
  /** Origin used for knockback direction and line-of-sight checks. */
  originX: number;
  originY: number;
  /** Melee attacks need line of sight from the origin; contact/projectiles do not. */
  requiresLineOfSight: boolean;
  /** Called when the damage lands (projectiles destroy themselves). */
  onHit?: () => void;
}
