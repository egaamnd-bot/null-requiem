/**
 * Tuning for the extended enemy roster. Every number that shapes how an enemy feels lives here
 * (same convention as config/tuning.ts). Elite variants override specific fields; they are not just
 * "more health": each elite also unlocks an extra attack pattern in its state machine.
 */

export const STREET_SCAVENGER = {
  width: 12,
  height: 22,
  health: 3,
  eliteHealth: 5,
  walkSpeed: 26,
  chaseSpeed: 62,
  eliteChaseSpeed: 78,
  sightX: 120,
  sightY: 36,
  /** Distance at which it commits to a swing. */
  attackRange: 22,
  windup: 0.38,
  eliteWindup: 0.3,
  strike: 0.12,
  recover: 0.55,
  /** Elite: second swing follows the first after this gap. */
  eliteComboGap: 0.16,
  /** Elite: throws a scrap shiv at this range instead of closing in. */
  eliteThrowMin: 70,
  eliteThrowCooldown: 2.6,
  staggerTime: 0.28,
  gravity: 900,
  maxFallSpeed: 420,
  decel: 900,
  contactDamage: 1,
  strikeDamage: 1,
  shiv: { speed: 150, size: 6, life: 1.6, damage: 1 },
  /** Lose interest after this long without seeing the player. */
  loseSightTime: 1.6,
} as const;

export const HEAVY_ENFORCER = {
  width: 22,
  height: 30,
  health: 8,
  eliteHealth: 12,
  walkSpeed: 20,
  sightX: 150,
  sightY: 40,
  windup: 0.85,
  eliteWindup: 0.65,
  slamActive: 0.12,
  recover: 1.05,
  /** Time armour is open after a successful hit-block "clang" stagger. */
  staggerTime: 0.22,
  gravity: 1000,
  maxFallSpeed: 500,
  decel: 900,
  contactDamage: 1,
  slamDamage: 2,
  /** Hits with at least this much damage ignore frontal armour (Glitch Strike, Backtrace burst). */
  armourPierce: 2,
  shockwave: { speed: 140, width: 12, height: 10, life: 1.6, damage: 1 },
  eliteSecondSlamGap: 0.45,
  /** Cooldown between attacks while the player is in sight. */
  attackCooldown: 0.5,
} as const;

export const PHASE_STALKER = {
  width: 12,
  height: 22,
  health: 3,
  eliteHealth: 5,
  sightRange: 220,
  /** How far from the player it reappears. */
  blinkMin: 28,
  blinkMax: 78,
  /** Seconds it stays phased (untargetable) while blinking. */
  blinkOut: 0.22,
  blinkIn: 0.2,
  windup: 0.5,
  eliteWindup: 0.4,
  strike: 0.1,
  recover: 0.7,
  /** Idle time before it hunts again. */
  lurkMin: 1.1,
  lurkMax: 1.9,
  /** A player standing still this long gets blinked onto (punishes predictability). */
  stillPunishTime: 1.2,
  /** Backtrace arrival within this distance triggers an immediate blink to the arrival point. */
  backtraceReactRange: 170,
  staggerTime: 0.25,
  contactDamage: 1,
  strikeDamage: 1,
  gravity: 900,
  maxFallSpeed: 420,
  eliteDoubleBlink: true,
} as const;

export const SENTRY_TURRET = {
  width: 16,
  height: 16,
  health: 5,
  eliteHealth: 7,
  range: 200,
  /** Half-angle of the firing arc around the mount normal, radians. */
  arc: (80 * Math.PI) / 180,
  lockTime: 0.75,
  eliteLockTime: 0.55,
  burst: 3,
  eliteBurst: 5,
  burstGap: 0.16,
  /** Shield is open (hittable) for this long after a burst. */
  ventTime: 1.3,
  bolt: { speed: 140, size: 6, life: 2.2, damage: 1 },
  contactDamage: 1,
  idleScan: 0.6,
} as const;

export const NULL_ECHO = {
  width: 12,
  height: 22,
  health: 2,
  eliteHealth: 3,
  /** Seconds behind the Courier it trails. */
  delay: 2.2,
  eliteDelay: 1.5,
  maxSpeed: 96,
  accel: 320,
  /** Seconds it hovers in place after being struck. */
  staggerTime: 0.3,
  contactDamage: 1,
  /** Spawns dormant until the Courier has history to mimic. */
  minTrail: 0.4,
} as const;

/** Scrap (currency) dropped on death. */
export const SCRAP_DROPS: Readonly<Record<string, number>> = {
  scrapHound: 3,
  watcherDrone: 4,
  streetScavenger: 4,
  heavyEnforcer: 12,
  phaseStalker: 8,
  sentryTurret: 8,
  nullEcho: 5,
};
export const ELITE_SCRAP_MULTIPLIER = 3;
