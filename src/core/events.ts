/**
 * Everything the simulation reports to presentation (visual FX, audio, HUD).
 * The simulation never calls rendering or audio code directly; it only emits these.
 */

export type AttackDirection = 'side' | 'up' | 'down';
export type Ability = 'backtrace';

export type GameEvent =
  | { type: 'playerJump'; x: number; y: number }
  | { type: 'playerLand'; x: number; y: number; heavy: boolean }
  | { type: 'playerDash'; x: number; y: number; facing: number }
  | { type: 'playerAttack'; dir: AttackDirection }
  | { type: 'playerHurt'; x: number; y: number; damage: number }
  | { type: 'playerDied'; x: number; y: number }
  | { type: 'playerPogo'; x: number; y: number }
  | { type: 'hazardRespawn'; x: number; y: number }
  | { type: 'hit'; x: number; y: number; target: 'enemy' | 'boss' | 'projectile' | 'wall' | 'switch'; killed: boolean }
  | { type: 'backtrace'; fromX: number; fromY: number; toX: number; toY: number; restored: number }
  | { type: 'switchHit'; x: number; y: number }
  | { type: 'timedGate'; open: boolean }
  | { type: 'gateLocked'; x: number; y: number }
  | { type: 'gateLatched' }
  | { type: 'enemyWindup'; x: number; y: number }
  | { type: 'enemyShoot'; x: number; y: number }
  | { type: 'enemyDied'; x: number; y: number; kind: string }
  | { type: 'projectileBurst'; x: number; y: number }
  | { type: 'checkpoint'; x: number; y: number; firstTime: boolean }
  | { type: 'abilityUnlocked'; ability: Ability; x: number; y: number }
  | { type: 'secretFound'; id: string; x: number; y: number }
  | { type: 'wallBroken'; x: number; y: number }
  | { type: 'bossStart'; name: string }
  | { type: 'bossPhase'; phase: number }
  | { type: 'bossWindup'; x: number; y: number; attack: string }
  | { type: 'bossSlam'; x: number; y: number }
  | { type: 'bossWallImpact'; x: number; y: number }
  | { type: 'bossDefeated'; x: number; y: number }
  | { type: 'gateClosed' }
  | { type: 'gateOpened' }
  | { type: 'roomEntered'; roomId: string; name: string };

export type Emit = (event: GameEvent) => void;
