import type { GameEvent } from '../core/events';

/**
 * Audio-only observers (pure, no Web Audio). They READ game events/state that already exist and never feed anything back:
 * enemy AI, combat balance and gameplay are untouched.
 */

/** Distance-based footsteps: one step every `stride` world px of ground travel. There is no footstep event in the simulation. */
export class FootstepTracker {
  private travelled = 0;

  constructor(private readonly stride = 26) {}

  /** `dt` seconds; returns true when a step should sound this frame. */
  update(dt: number, s: { onGround: boolean; vx: number; active: boolean }): boolean {
    if (!s.active || !s.onGround || Math.abs(s.vx) < 30) {
      // Standing, airborne or busy: the next contact comes after a short walk, not instantly.
      this.travelled = Math.min(this.travelled, this.stride * 0.5);
      return false;
    }
    this.travelled += Math.abs(s.vx) * dt;
    if (this.travelled >= this.stride) {
      this.travelled %= this.stride;
      return true;
    }
    return false;
  }

  reset(): void {
    this.travelled = 0;
  }
}

/** Events that mean "something is fighting the Courier right now". Existing events only. */
export function isCombatEvent(e: GameEvent): boolean {
  switch (e.type) {
    case 'enemyWindup':
    case 'enemyShoot':
    case 'enemyBlocked':
    case 'playerHurt':
    case 'bossStaggered':
      return true;
    case 'hit':
      return e.target === 'enemy' || e.target === 'boss' || e.target === 'projectile';
    default:
      return false;
  }
}

/**
 * Combat intensity 0..1 for layered music. Rises quickly on the first combat event, holds `hold` seconds after the last one,
 * then falls slowly (so a pause between two enemies does not flap the music). Reset on room change and death.
 */
export class CombatTracker {
  private last = Number.NEGATIVE_INFINITY;
  private value = 0;

  constructor(
    private readonly hold = 5,
    private readonly rise = 0.35,
    private readonly fall = 2.5,
  ) {}

  note(e: GameEvent, now: number): void {
    if (isCombatEvent(e)) this.last = now;
    else if (e.type === 'roomEntered' || e.type === 'playerDied' || e.type === 'bossStart') this.last = Number.NEGATIVE_INFINITY;
  }

  /** Advance by `dt` and return the current intensity. */
  update(now: number, dt: number): number {
    const active = now - this.last < this.hold;
    const target = active ? 1 : 0;
    const rate = target > this.value ? 1 / this.rise : 1 / this.fall;
    this.value = target > this.value ? Math.min(target, this.value + dt * rate) : Math.max(target, this.value - dt * rate);
    return this.value;
  }

  get intensity(): number {
    return this.value;
  }

  reset(): void {
    this.last = Number.NEGATIVE_INFINITY;
    this.value = 0;
  }
}
