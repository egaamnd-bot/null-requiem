import type { Enemy } from './enemy';
import { HeavyEnforcer } from './heavyEnforcer';
import { NullEcho } from './nullEcho';
import { PhaseStalker } from './phaseStalker';
import { ScrapHound } from './scrapHound';
import { SentryTurret, type TurretMount } from './sentryTurret';
import { StreetScavenger } from './streetScavenger';
import { WatcherDrone } from './watcherDrone';

/**
 * Data-driven enemy factory. Room data refers to enemies by these stable type names; gameplay code never
 * names concrete classes. `securityDrone` is the player-facing name of the existing WatcherDrone.
 */
export const ENEMY_TYPES = ['scrapHound', 'securityDrone', 'streetScavenger', 'heavyEnforcer', 'phaseStalker', 'sentryTurret', 'nullEcho'] as const;
export type EnemyType = (typeof ENEMY_TYPES)[number];

export function isEnemyType(s: string): s is EnemyType {
  return (ENEMY_TYPES as readonly string[]).includes(s);
}

export interface EnemySpawn {
  type: EnemyType;
  id: string;
  /** Pixel position: feet for ground enemies, centre for flyers/turrets. */
  x: number;
  y: number;
  elite?: boolean;
  mount?: TurretMount;
  /** Phase offset for hovering enemies. */
  phase?: number;
}

/** Does this enemy type spawn standing on the ground (x,y is the feet point) rather than at its centre? */
export function spawnsOnGround(type: EnemyType): boolean {
  return type === 'scrapHound' || type === 'streetScavenger' || type === 'heavyEnforcer' || type === 'phaseStalker';
}

export function createEnemy(s: EnemySpawn): Enemy {
  const elite = s.elite === true;
  switch (s.type) {
    case 'scrapHound':
      return new ScrapHound(s.id, s.x, s.y, elite);
    case 'securityDrone':
      return new WatcherDrone(s.id, s.x, s.y, s.phase ?? 0, elite);
    case 'streetScavenger':
      return new StreetScavenger(s.id, s.x, s.y, elite);
    case 'heavyEnforcer':
      return new HeavyEnforcer(s.id, s.x, s.y, elite);
    case 'phaseStalker':
      return new PhaseStalker(s.id, s.x, s.y, elite);
    case 'sentryTurret':
      return new SentryTurret(s.id, s.x, s.y, s.mount ?? 'floor', elite);
    case 'nullEcho':
      return new NullEcho(s.id, s.x, s.y, elite);
  }
}
