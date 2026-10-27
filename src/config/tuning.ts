/**
 * Central gameplay tuning. Every number that shapes how the game *feels* lives here,
 * so designers can iterate without touching system code.
 *
 * Units: pixels, seconds, pixels/second, pixels/second².
 */

/** Fixed simulation rate. Gameplay is stepped at this rate regardless of display refresh rate. */
export const SIM = {
  stepHz: 120,
  /** Longest real frame we will simulate in one go (prevents a "spiral of death" after a tab stall). */
  maxFrameDelta: 0.25,
} as const;

export const TILE_SIZE = 16;

/** Logical render resolution (scaled to fit the window). */
export const VIEW = {
  width: 480,
  height: 270,
} as const;

export const PLAYER = {
  width: 10,
  height: 22,
  maxHealth: 5,

  runSpeed: 150,
  groundAccel: 1700,
  groundDecel: 2200,
  airAccel: 1200,
  airDecel: 800,

  /** Apex height of a fully held jump, in pixels. */
  jumpHeight: 58,
  /** Seconds to reach the apex of a fully held jump. */
  timeToApex: 0.36,
  /** Gravity is multiplied by this while falling, for a snappier arc. */
  fallGravityMultiplier: 1.6,
  /** Upward velocity is multiplied by this when jump is released early (variable jump height). */
  jumpCutMultiplier: 0.45,
  maxFallSpeed: 420,

  coyoteTime: 0.1,
  jumpBufferTime: 0.12,
  /** Seconds one-way platforms are ignored after pressing down + jump. */
  dropThroughTime: 0.22,
  /** Max pixels the player is nudged sideways when clipping a ceiling corner while rising. */
  cornerCorrection: 4,

  dash: {
    speed: 340,
    duration: 0.2,
    cooldown: 0.4,
  },

  hurt: {
    invulnerability: 1.0,
    stunTime: 0.25,
    knockbackX: 170,
    knockbackY: 210,
  },

  /** Minimum airborne time before a landing counts as a "land" event (avoids noise on tiny bumps). */
  landingMinAirTime: 0.08,
  /** Fall speed above which a landing is considered heavy (bigger dust + squash). */
  heavyLandingSpeed: 300,

  hazardDamage: 1,
} as const;

/** Derived jump physics: g = 2h / t², v0 = 2h / t. */
export const PLAYER_GRAVITY = (2 * PLAYER.jumpHeight) / (PLAYER.timeToApex * PLAYER.timeToApex);
export const PLAYER_JUMP_VELOCITY = (2 * PLAYER.jumpHeight) / PLAYER.timeToApex;

export const COMBAT = {
  attack: {
    startup: 0.035,
    active: 0.09,
    recovery: 0.16,
    /** An attack pressed during recovery is buffered for this long. */
    bufferTime: 0.1,
    damage: 1,
    side: { reach: 26, height: 20 },
    up: { width: 24, reach: 28 },
    down: { width: 22, reach: 24 },
    /** Horizontal push-back on the player when a side attack connects. */
    recoil: 110,
    /** Upward velocity when a downward strike connects with an enemy. */
    pogoVelocity: 270,
  },
  /** Knockback speed applied to standard enemies when hit. */
  enemyKnockback: 150,
} as const;

export const ENEMIES = {
  ashgrub: {
    width: 18,
    height: 12,
    health: 3,
    walkSpeed: 32,
    detectRangeX: 96,
    detectRangeY: 28,
    windup: 0.55,
    lungeSpeed: 230,
    lungeTime: 0.3,
    recover: 0.75,
    staggerTime: 0.3,
    gravity: 900,
    maxFallSpeed: 420,
    decel: 900,
    contactDamage: 1,
    lungeDamage: 1,
  },
  lanternWisp: {
    width: 14,
    height: 14,
    health: 2,
    bobAmpX: 22,
    bobAmpY: 9,
    bobFreqX: 1.1,
    bobFreqY: 1.9,
    maxSpeed: 70,
    accel: 260,
    aggroRange: 150,
    keepDistance: 96,
    hoverAbove: 36,
    leashX: 90,
    leashY: 48,
    windup: 0.6,
    cooldown: 1.9,
    staggerTime: 0.35,
    contactDamage: 1,
    bolt: { speed: 115, size: 8, life: 3.2, damage: 1 },
  },
} as const;

export const BOSS = {
  kilnWarden: {
    name: 'The Kiln Warden',
    width: 34,
    height: 30,
    health: 20,
    gravity: 1400,
    maxFallSpeed: 600,
    introTime: 1.1,
    idleTimeMin: 0.55,
    idleTimeMax: 0.9,
    phase2Threshold: 0.5,
    phase2SpeedMultiplier: 1.15,
    contactDamage: 1,
    charge: { windup: 0.75, backstepSpeed: 30, speed: 250, maxTime: 2.2, stun: 1.4, damage: 2 },
    leap: {
      windup: 0.45,
      airTime: 0.8,
      maxSpeed: 320,
      recover: 0.8,
      shockwave: { speed: 170, width: 14, height: 14, life: 3, damage: 1 },
    },
    rain: {
      windup: 0.6,
      count: 5,
      telegraph: 0.9,
      stagger: 0.12,
      fallSpeed: 280,
      gravity: 300,
      width: 8,
      height: 14,
      recover: 1.0,
      damage: 1,
      minSpacing: 44,
    },
    victoryDelay: 2.2,
  },
} as const;

export const FLOW = {
  /** Seconds between the killing blow and the game-over prompt. */
  deathAnimation: 1.2,
} as const;

export const CAMERA = {
  /** Exponential smoothing rates (1/s). Higher = snappier. */
  followRateX: 7,
  followRateY: 5,
  /** Horizontal look-ahead in the facing direction. */
  lookAhead: 36,
  /** Vertical framing offset: positive moves the camera up so more is visible above the player. */
  verticalBias: 20,
} as const;
