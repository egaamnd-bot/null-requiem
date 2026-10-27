import { BOSS } from '../../config/tuning';
import { bodyCenterX, createBody, moveBody } from '../body';
import type { DamageSource } from '../combat';
import { approach, clamp, sign } from '../math';
import { Enemy, type EnemyContext } from './enemy';

export type BulwarkState =
  | 'dormant'
  | 'intro'
  | 'idle'
  | 'chargeWindup'
  | 'charge'
  | 'stunned'
  | 'leapWindup'
  | 'leap'
  | 'leapRecover'
  | 'rainWindup'
  | 'rainRecover'
  | 'dead';

export type BulwarkAttack = 'charge' | 'leap' | 'rain';

export interface Arena {
  left: number;
  right: number;
  ceilingY: number;
  floorY: number;
}

export interface RainMarker {
  x: number;
  /** Seconds until this plasma round falls. */
  remaining: number;
  fired: boolean;
}

const T = BOSS.bulwarkUnit;

/**
 * BULWARK-9 — a decommissioned riot-control mech still guarding the precinct vault.
 *
 * Patterns (each with a distinct wind-up and a punish window):
 *  - Charge: drops its visor and backs up, then rushes across the arena. Slamming into a wall
 *    stuns it — the biggest damage window in the fight.
 *  - Leap: crouches, then leaps to where the player stood and slams, sending a shockwave
 *    along the floor in both directions (jump it). Recovers briefly after landing.
 *  - Plasma rain (below half health): raises its arms and calls a strike down from the ceiling;
 *    glowing floor markers show where each will land.
 */
export class BulwarkUnit extends Enemy<BulwarkState> {
  readonly kind = 'bulwarkUnit';
  override readonly targetKind = 'boss' as const;
  phase = 1;
  rainMarkers: RainMarker[] = [];
  private nextIdle = 0.8;
  private lastAttack: BulwarkAttack | null = null;
  private repeatCount = 0;
  private phaseChangePending = false;
  /** Exposed for tests and tuning tools. */
  lastChosenAttack: BulwarkAttack | null = null;

  constructor(
    id: string,
    feetX: number,
    feetY: number,
    readonly arena: Arena,
  ) {
    super(id, createBody(feetX - T.width / 2, feetY - T.height, T.width, T.height), T.health, 'dormant');
  }

  get displayName(): string {
    return T.name;
  }

  get isActive(): boolean {
    return this.state !== 'dormant' && this.state !== 'dead';
  }

  /** Begin the encounter. */
  activate(): void {
    if (this.state === 'dormant') this.setState('intro');
  }

  private get speedMul(): number {
    return this.phase === 2 ? T.phase2SpeedMultiplier : 1;
  }

  /** 0..1 wind-up progress for the current telegraph, for presentation. */
  get windupProgress(): number {
    switch (this.state) {
      case 'chargeWindup':
        return Math.min(1, this.stateTime / (T.charge.windup / this.speedMul));
      case 'leapWindup':
        return Math.min(1, this.stateTime / (T.leap.windup / this.speedMul));
      case 'rainWindup':
        return Math.min(1, this.stateTime / (T.rain.windup / this.speedMul));
      default:
        return 0;
    }
  }

  protected think(ctx: EnemyContext): void {
    const b = this.body;
    const dt = ctx.dt;
    const mul = this.speedMul;

    if (this.phaseChangePending) {
      this.phaseChangePending = false;
      ctx.emit({ type: 'bossPhase', phase: this.phase });
    }

    this.updateRain(ctx);

    switch (this.state) {
      case 'dormant':
        b.vx = 0;
        break;
      case 'intro':
        b.vx = 0;
        if (this.stateTime >= T.introTime) this.enterIdle(ctx);
        break;
      case 'idle':
        this.facePlayer(ctx);
        b.vx = approach(b.vx, 0, 900 * dt);
        if (this.stateTime >= this.nextIdle) this.startAttack(this.chooseAttack(ctx), ctx);
        break;
      case 'chargeWindup':
        b.vx = -this.facing * T.charge.backstepSpeed;
        if (this.stateTime >= T.charge.windup / mul) this.setState('charge');
        break;
      case 'charge':
        b.vx = this.facing * T.charge.speed * mul;
        break;
      case 'stunned':
        b.vx = approach(b.vx, 0, 900 * dt);
        if (this.stateTime >= T.charge.stun) this.enterIdle(ctx);
        break;
      case 'leapWindup':
        b.vx = 0;
        if (this.stateTime >= T.leap.windup / mul) this.launchLeap(ctx);
        break;
      case 'leap':
        break;
      case 'leapRecover':
        b.vx = approach(b.vx, 0, 1200 * dt);
        if (this.stateTime >= T.leap.recover / mul) this.enterIdle(ctx);
        break;
      case 'rainWindup':
        b.vx = 0;
        if (this.stateTime >= T.rain.windup / mul) this.placeRain(ctx);
        break;
      case 'rainRecover': {
        b.vx = 0;
        const pending = this.rainMarkers.some((m) => !m.fired);
        if (!pending && this.stateTime >= T.rain.recover) this.enterIdle(ctx);
        break;
      }
      case 'dead':
        b.vx = 0;
        break;
    }

    b.vy = Math.min(b.vy + T.gravity * dt, T.maxFallSpeed);
    moveBody(b, ctx.grid, dt, { collideOneWay: false });

    if (this.state === 'charge') {
      if (b.hitWallLeft || b.hitWallRight) {
        ctx.emit({ type: 'bossWallImpact', x: this.facing > 0 ? b.x + b.w : b.x, y: this.centerY });
        this.setState('stunned');
      } else if (this.stateTime >= T.charge.maxTime) {
        this.enterIdle(ctx);
      }
    } else if (this.state === 'leap' && b.onGround && this.stateTime > 0.05) {
      this.slam(ctx);
    }
  }

  private facePlayer(ctx: EnemyContext): void {
    this.facing = (sign(ctx.playerX - this.centerX) || this.facing) as 1 | -1;
  }

  private enterIdle(ctx: EnemyContext): void {
    this.setState('idle');
    this.nextIdle = (T.idleTimeMin + ctx.rng() * (T.idleTimeMax - T.idleTimeMin)) / this.speedMul;
  }

  private chooseAttack(ctx: EnemyContext): BulwarkAttack {
    const pool: BulwarkAttack[] = this.phase === 2 ? ['charge', 'leap', 'rain'] : ['charge', 'leap'];
    // Never use the same attack three times in a row.
    const allowed = this.repeatCount >= 2 ? pool.filter((a) => a !== this.lastAttack) : pool;
    const pick = allowed[Math.floor(ctx.rng() * allowed.length)] ?? 'leap';
    this.repeatCount = pick === this.lastAttack ? this.repeatCount + 1 : 1;
    this.lastAttack = pick;
    this.lastChosenAttack = pick;
    return pick;
  }

  private startAttack(attack: BulwarkAttack, ctx: EnemyContext): void {
    this.facePlayer(ctx);
    const state: BulwarkState =
      attack === 'charge' ? 'chargeWindup' : attack === 'leap' ? 'leapWindup' : 'rainWindup';
    this.setState(state);
    ctx.emit({ type: 'bossWindup', x: this.centerX, y: this.centerY, attack });
  }

  private launchLeap(ctx: EnemyContext): void {
    const b = this.body;
    const airTime = T.leap.airTime;
    const targetX = clamp(ctx.playerX, this.arena.left + b.w / 2, this.arena.right - b.w / 2);
    b.vy = (-T.gravity * airTime) / 2;
    b.vx = clamp((targetX - bodyCenterX(b)) / airTime, -T.leap.maxSpeed, T.leap.maxSpeed);
    this.facing = (sign(b.vx) || this.facing) as 1 | -1;
    b.onGround = false;
    this.setState('leap');
  }

  private slam(ctx: EnemyContext): void {
    const b = this.body;
    const sw = T.leap.shockwave;
    const floor = b.y + b.h;
    ctx.emit({ type: 'bossSlam', x: this.centerX, y: floor });
    for (const dir of [-1, 1] as const) {
      ctx.spawnProjectile({
        kind: 'shockwave',
        x: dir < 0 ? b.x - sw.width : b.x + b.w,
        y: floor - sw.height,
        w: sw.width,
        h: sw.height,
        vx: dir * sw.speed * this.speedMul,
        vy: 0,
        damage: sw.damage,
        life: sw.life,
      });
    }
    this.setState('leapRecover');
  }

  private placeRain(ctx: EnemyContext): void {
    const r = T.rain;
    const xs: number[] = [clamp(ctx.playerX, this.arena.left + 12, this.arena.right - 12)];
    let attempts = 0;
    while (xs.length < r.count && attempts < 60) {
      attempts++;
      const x = this.arena.left + 12 + ctx.rng() * (this.arena.right - this.arena.left - 24);
      if (xs.every((o) => Math.abs(o - x) >= r.minSpacing)) xs.push(x);
    }
    this.rainMarkers = xs.map((x, i) => ({ x, remaining: r.telegraph + i * r.stagger, fired: false }));
    this.setState('rainRecover');
  }

  private updateRain(ctx: EnemyContext): void {
    if (this.rainMarkers.length === 0) return;
    const r = T.rain;
    for (const m of this.rainMarkers) {
      if (m.fired) continue;
      m.remaining -= ctx.dt;
      if (m.remaining <= 0) {
        m.fired = true;
        ctx.spawnProjectile({
          kind: 'plasmaRain',
          x: m.x - r.width / 2,
          y: this.arena.ceilingY,
          w: r.width,
          h: r.height,
          vx: 0,
          vy: r.fallSpeed,
          gravity: r.gravity,
          damage: r.damage,
          life: 3,
        });
      }
    }
    if (this.rainMarkers.every((m) => m.fired)) this.rainMarkers = [];
  }

  override takeHit(damage: number, dirX: number, dirY: number): { killed: boolean } {
    if (this.state === 'dormant' || this.state === 'intro' || this.state === 'dead') return { killed: false };
    return super.takeHit(damage, dirX, dirY);
  }

  protected onHurt(_dirX: number, _dirY: number, died: boolean): void {
    if (died) {
      this.setState('dead');
      this.rainMarkers = [];
      this.body.vx = 0;
      return;
    }
    if (this.phase === 1 && this.health.current / this.health.max <= T.phase2Threshold) {
      this.phase = 2;
      this.phaseChangePending = true;
    }
  }

  damageSources(): DamageSource[] {
    if (!this.isAlive()) return [];
    if (this.state === 'dormant' || this.state === 'intro' || this.state === 'stunned') return [];
    const damage = this.state === 'charge' ? T.charge.damage : T.contactDamage;
    return [this.contactSource(damage)];
  }
}
