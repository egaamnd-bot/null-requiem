import { THE_NULL as T } from '../../config/bossTuning';
import type { EnemyContext } from '../enemies/enemy';
import { clamp } from '../math';
import { PatternBoss, type AttackSpec, type BossArena } from './patternBoss';

export type NullAttack = 'imprint' | 'rewind' | 'nullBeams' | 'echoSummon';

interface TrailPoint {
  x: number;
  y: number;
}

/**
 * THE NULL — the entity the city was built to forget. It owns Backtrace's mirror image: it can rewind itself.
 *
 *  - Imprint: marks the Courier's current spot. A long telegraph (about a Backtrace) later, a void spike erupts there.
 *    Move, dash, or Backtrace out of it; afterwards the Null is exposed.
 *  - Rewind: the Null shows its own afterimage, then snaps back to it and heals. Stand on its afterimage when it lands
 *    ("telefrag") and the Null is shredded, stunned and wide open instead of healed.
 *  - Null beams (phase 2): vertical beams, announced first.
 *  - Echo summon (phase 3): calls Null Echoes that trail the Courier's own path.
 * It can only be hurt while exposed.
 */
export class TheNull extends PatternBoss {
  readonly bossId = T.id;
  readonly displayName = T.name;
  readonly kind = 'theNull';
  private readonly trail: TrailPoint[] = [];
  private trailClock = 0;
  private rewindTarget: TrailPoint | null = null;
  private homeY: number;
  private clock = 0;
  /** Where the next teleport lands; chosen away from the Courier so the arena stays readable. */
  lastChosen: NullAttack | null = null;
  /** Set when the last rewind was a telefrag (for tests and audio). */
  lastRewindWasTelefrag = false;

  constructor(id: string, centerX: number, centerY: number, arena: BossArena) {
    super(id, centerX, centerY, T.width, T.height, T.health, arena, { phase2: T.phase2, phase3: T.phase3 });
    this.homeY = centerY;
  }

  protected introTime(): number {
    return T.introTime;
  }
  protected idleRange(): [number, number] {
    return this.phase >= 3 ? [T.idleMinPhase3, T.idleMax] : [T.idleMin, T.idleMax];
  }
  protected deathTime(): number {
    return T.deathTime;
  }
  protected contactDamage(): number {
    return T.contactDamage;
  }

  /** The afterimage the boss would rewind to (position `echoWindow` seconds ago), if it has that much history. */
  get echo(): TrailPoint | null {
    return this.rewindTarget;
  }

  protected pickAttack(ctx: EnemyContext): AttackSpec {
    const pool: NullAttack[] = ['imprint', 'rewind'];
    if (this.phase >= 2) pool.push('nullBeams');
    if (this.phase >= 3) pool.push('echoSummon');
    let pick = pool[Math.floor(ctx.rng() * pool.length)] as NullAttack;
    if (pick === this.lastChosen) pick = pool[(pool.indexOf(pick) + 1) % pool.length] as NullAttack;
    // A boss that heals must be forced to open itself up: every third attack is an imprint.
    if (this.attackCount % 3 === 2) pick = 'imprint';
    // Rewinding is pointless (and unreadable) when there is no history to rewind to.
    if (pick === 'rewind' && !this.canRewind()) pick = 'imprint';
    this.lastChosen = pick;
    switch (pick) {
      case 'imprint':
        return { name: pick, telegraph: this.phase >= 3 ? T.imprint.telegraphPhase3 : T.imprint.telegraph, active: T.imprint.active, exposed: T.imprint.exposed, recover: 0.5 };
      case 'rewind':
        return { name: pick, telegraph: T.rewind.telegraph, active: T.rewind.active, exposed: T.rewind.exposedAfterNormal, recover: 0.6 };
      case 'nullBeams':
        return { name: pick, telegraph: T.beams.telegraph, active: T.beams.active, exposed: T.beams.exposed, recover: 0.5 };
      case 'echoSummon':
        return { name: pick, telegraph: T.summon.telegraph, active: 0.2, exposed: T.summon.exposed, recover: 0.5 };
    }
  }

  private canRewind(): boolean {
    const old = this.sampleAgo(T.echoWindow);
    return old !== null && Math.hypot(old.x - this.centerX, old.y - this.centerY) >= T.rewind.minDistance;
  }

  private sampleAgo(seconds: number): TrailPoint | null {
    if (this.trail.length === 0) return null;
    const idx = Math.max(0, this.trail.length - 1 - Math.round(seconds * 30));
    return this.trail[idx] ?? null;
  }

  protected onTelegraphStart(spec: AttackSpec, ctx: EnemyContext): void {
    const a = this.arena;
    switch (spec.name as NullAttack) {
      case 'imprint': {
        // Remember where the Courier is now; the spike lands there after the telegraph, wherever they go.
        const x = clamp(ctx.playerX, a.left + T.imprint.width / 2, a.right - T.imprint.width / 2);
        this.addMark({ x, y: a.floorY, kind: 'imprint', timer: spec.telegraph });
        this.imprintX = x;
        break;
      }
      case 'rewind': {
        const old = this.sampleAgo(T.echoWindow);
        this.rewindTarget = old ? { ...old } : null;
        if (old) this.addMark({ x: old.x, y: old.y, kind: 'echo', timer: spec.telegraph });
        break;
      }
      case 'nullBeams': {
        const span = a.right - a.left;
        this.beamXs = [];
        for (let i = 0; i < T.beams.count; i++) {
          // One beam always comes at the Courier; the rest cover space so standing still is never safe.
          const x = i === 0 ? clamp(ctx.playerX, a.left + 12, a.right - 12) : a.left + 12 + ctx.rng() * (span - 24);
          this.beamXs.push(x);
          this.addHazard({
            rect: { x: x - T.beams.width / 2, y: a.ceilingY, w: T.beams.width, h: a.floorY - a.ceilingY },
            damage: T.beams.damage,
            style: 'beam',
            telegraph: spec.telegraph,
            active: T.beams.active,
          });
        }
        break;
      }
      case 'echoSummon':
        break;
    }
  }

  private imprintX = 0;
  private beamXs: number[] = [];

  protected onActiveStart(spec: AttackSpec, ctx: EnemyContext): void {
    const a = this.arena;
    switch (spec.name as NullAttack) {
      case 'imprint':
        this.addHazard({
          rect: { x: this.imprintX - T.imprint.width / 2, y: a.floorY - T.imprint.height, w: T.imprint.width, h: T.imprint.height },
          damage: T.imprint.damage,
          style: 'spike',
          telegraph: 0,
          active: T.imprint.active,
        });
        ctx.emit({ type: 'bossSlam', x: this.imprintX, y: a.floorY });
        break;
      case 'rewind': {
        const target = this.rewindTarget;
        if (!target) break;
        const from = { x: this.centerX, y: this.centerY };
        const dist = Math.hypot(ctx.playerX - target.x, ctx.playerY - target.y);
        this.moveCenter(target.x, target.y);
        ctx.emit({ type: 'echoRewind', fromX: from.x, fromY: from.y, toX: target.x, toY: target.y });
        if (ctx.playerAlive && dist <= T.rewind.telefragRadius) {
          // The Courier stood on the afterimage: the Null lands inside them and unravels.
          this.lastRewindWasTelefrag = true;
          this.forceDamage(T.rewind.telefragDamage);
          if (this.isAlive()) this.forceExposed(T.rewind.stunExposed, ctx);
        } else {
          this.lastRewindWasTelefrag = false;
          this.health.heal(T.rewind.heal);
        }
        break;
      }
      case 'echoSummon':
        for (let i = 0; i < T.summon.count; i++) {
          ctx.spawnEnemy?.('nullEcho', this.centerX + (i === 0 ? -24 : 24), this.centerY - 10, this.phase >= 3);
        }
        break;
      case 'nullBeams':
        ctx.emit({ type: 'bossSlam', x: this.centerX, y: a.floorY });
        break;
    }
  }

  private moveCenter(x: number, y: number): void {
    this.body.x = clamp(x, this.arena.left + this.body.w / 2, this.arena.right - this.body.w / 2) - this.body.w / 2;
    this.body.y = clamp(y, this.arena.ceilingY + this.body.h / 2, this.arena.floorY - this.body.h / 2) - this.body.h / 2;
    this.homeY = this.centerY;
  }

  protected onTick(ctx: EnemyContext): void {
    this.clock += ctx.dt;
    // Record own trail at 30 Hz so the boss can rewind exactly like the Courier does.
    this.trailClock += ctx.dt;
    while (this.trailClock >= 1 / 30) {
      this.trailClock -= 1 / 30;
      this.trail.push({ x: this.centerX, y: this.centerY });
      if (this.trail.length > Math.round((T.echoWindow + 1) * 30)) this.trail.shift();
    }
    // Hover and drift toward a spot opposite the Courier while idle, so the fight keeps moving.
    if (this.stage === 'idle' || this.stage === 'intro') {
      const a = this.arena;
      const wantX = clamp(this.centerX + (ctx.playerX < this.centerX ? 1 : -1) * 20, a.left + 30, a.right - 30);
      this.body.x += clamp((wantX - this.centerX) * 0.8, -50, 50) * ctx.dt;
    }
    const bob = Math.sin(this.clock * T.hover.speed) * T.hover.amplitude;
    this.body.y = this.homeY + bob - this.body.h / 2;
    this.facing = ctx.playerX >= this.centerX ? 1 : -1;
  }
}
