/**
 * Everything the simulation reports to presentation (visual FX, audio, HUD).
 * The simulation never calls rendering or audio code directly; it only emits these.
 */

export type AttackDirection = 'side' | 'up' | 'down';
export type Ability = 'backtrace' | 'glitch-strike' | 'air-jump';

export type GameEvent =
  | { type: 'playerJump'; x: number; y: number; air?: boolean }
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
  | { type: 'enemyWindup'; x: number; y: number; /** Which enemy wound up (presentation: per-enemy sounds). */ kind?: string }
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
  | { type: 'roomEntered'; roomId: string; name: string }
  | { type: 'glitchStrike'; x: number; y: number; facing: number }
  | { type: 'npcTalk'; npcId: string; line: string }
  | { type: 'npcDismiss' }
  | { type: 'fragmentCollected'; id: string; x: number; y: number; total: number; collected: number }
  | { type: 'signalChanged'; value: number; max: number }
  | { type: 'panoptixLaser'; fromX: number; fromY: number; angle: number; warmup: boolean }
  | { type: 'panoptixDeathBeams'; angles: readonly number[]; active: boolean }
  | { type: 'plateChanged'; id: string; pressed: boolean; x: number; y: number }
  | { type: 'doorChanged'; id: string; open: boolean; x: number; y: number }
  | { type: 'doorLocked'; id: string; hint: string }
  | { type: 'nodePowered'; id: string; x: number; y: number }
  | { type: 'scrapGained'; amount: number; x: number; y: number; total: number }
  | { type: 'itemGained'; item: string; name: string; x: number; y: number }
  | { type: 'upgradeGained'; upgrade: string; level: number }
  | { type: 'enemyBlocked'; x: number; y: number }
  | { type: 'backtraceBlocked'; reason: string }
  | { type: 'questUpdated'; questId: string; status: 'started' | 'progress' | 'complete' | 'turnedIn'; text: string }
  | { type: 'flagSet'; flag: string }
  | { type: 'bossStaggered'; x: number; y: number }
  | { type: 'bossTelegraph'; x: number; y: number; attack: string }
  | { type: 'echoRewind'; fromX: number; fromY: number; toX: number; toY: number }
  | { type: 'dialogueOpened'; npcId: string }
  | { type: 'dialogueClosed' }
  | { type: 'vendorOpened'; vendorId: string }
  | { type: 'gameCompleted' }
  | { type: 'airJump'; x: number; y: number }
  | { type: 'loreFound'; id: string; title: string; text: string; x: number; y: number };

export type Emit = (event: GameEvent) => void;
