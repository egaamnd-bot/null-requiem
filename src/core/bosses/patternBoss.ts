import { bodyCenterX, bodyCenterY, bodyRect, createBody, type Body } from '../body';
import type { Damageable, DamageSource } from '../combat';
import type { EnemyContext } from '../enemies/enemy';
import type { Emit } from '../events';
import { Health } from '../health';
import type { Rect } from '../math';

export interface BossArena {
  left: number;
  right: number;
  ceilingY: number;
  floorY: number;
}

export type BossStage = 'dormant' | 'intro' | 'idle' | 'telegraph' | 'active' | 'exposed' | 'recover' | 'dying' | 'dead';

/** A timed damage zone owned by a boss. Telegraphs are visible but harmless; only `active` zones hurt. */
export interface BossHazard {
  rect: Rect;
  damage: number;
  state: 'telegraph' | 'active';
  /** Seconds until it becomes active (while telegraphing) or disappears (while active). */
  timer: number;
  activeFor: number;
  style: 'piston' | 'vent' | 'spike' | 'beam';
}

/** A purely visual marker (rings, lines) that explains an upcoming attack. */
export interface BossMark {
  x: number;
  y: number;
  kind: 'imprint' | 'echo' | 'ember';
  timer: number;
  total: number;
}

export interface AttackSpec {
  name: string;
  telegraph: number;
  active: number;
  /** Seconds the boss is open to damage after the active stage. */
  exposed: number;
  recover: number;
}

/**
 * Shared machinery for the pattern-driven bosses:
 *  - dormant -> intro -> idle -> [telegraph -> active -> exposed -> recover] ... -> dying -> dead
 *  - phases from health thresholds
 *  - the boss can only be hurt during its `exposed` stage (a vulnerability window) unless a subclass says otherwise
 *  - telegraphed hazards, visual marks, a death sequence, and event hooks for audio / VFX
 * Subclasses pick attacks and implement what happens at each stage.
 */
export abstract class PatternBoss implements Damageable {
  abstract readonly bossId: string;
  abstract readonly displayName: string;
  abstract readonly kind: string;
  readonly targetKind = 'boss' as const;
  readonly requiresLineOfSight = true;
  readonly pogoable = true;
  readonly health: Health;
  readonly body: Body;
  stage: BossStage = 'dormant';
  stageTime = 0;
  phase = 1;
  attack: AttackSpec | null = null;
  hazards: BossHazard[] = [];
  marks: BossMark[] = [];
  flash = 0;
  facing: 1 | -1 = -1;
  /** Seconds the boss has been exposed this window (presentation). */
  protected attackCount = 0;
  protected idleLeft = 0;
  protected lastAttackName: string | null = null;
  /** Set once at death so the world can award the victory exactly once. */
  defeated = false;

  protected constructor(
    readonly id: string,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    maxHealth: number,
    readonly arena: BossArena,
    protected readonly phaseThresholds: { phase2: number; phase3: number },
  ) {
    this.body = createBody(centerX - width / 2, centerY - height / 2, width, height);
    this.health = new Health(maxHealth);
  }

  get centerX(): number {
    return bodyCenterX(this.body);
  }

  get centerY(): number {
    return bodyCenterY(this.body);
  }

  get state(): BossStage {
    return this.stage;
  }

  get isActive(): boolean {
    return this.stage !== 'dormant' && this.stage !== 'dead' && this.stage !== 'dying';
  }

  /** True while the boss can be damaged. */
  get exposed(): boolean {
    return this.stage === 'exposed';
  }

  isAlive(): boolean {
    return this.stage !== 'dead' && this.stage !== 'dying' && !this.health.isDead;
  }

  hurtbox(): Rect {
    return bodyRect(this.body);
  }

  /** Begin the encounter. */
  activate(): void {
    if (this.stage !== 'dormant') return;
    this.setStage('intro');
  }

  protected setStage(s: BossStage): void {
    this.stage = s;
    this.stageTime = 0;
  }

  // ---- hooks ------------------------------------------------------------------------------

  protected abstract introTime(): number;
  protected abstract idleRange(): [number, number];
  protected abstract deathTime(): number;
  /** Choose the next attack (called when idle time runs out). */
  protected abstract pickAttack(ctx: EnemyContext): AttackSpec;
  /** Called once when an attack's telegraph begins. */
  protected abstract onTelegraphStart(spec: AttackSpec, ctx: EnemyContext): void;
  /** Called once when the telegraph ends and the attack lands. */
  protected abstract onActiveStart(spec: AttackSpec, ctx: EnemyContext): void;
  /** Called every step while the boss is alive, for movement / hover. */
  protected abstract onTick(ctx: EnemyContext): void;
  /** Phase change notification. */
  protected onPhaseChange(_phase: number, _ctx: EnemyContext): void {}
  /** Whether a hit lands right now (default: only while exposed). */
  protected canBeHit(): boolean {
    return this.exposed;
  }

  // ---- lifecycle --------------------------------------------------------------------------

  update(ctx: EnemyContext): void {
    if (this.stage === 'dormant' || this.stage === 'dead') return;
    const dt = ctx.dt;
    this.stageTime += dt;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
    this.tickHazards(dt);
    this.tickMarks(dt);

    if (this.stage === 'dying') {
      if (this.stageTime >= this.deathTime()) {
        this.setStage('dead');
        this.defeated = true;
        this.hazards = [];
        this.marks = [];
      }
      return;
    }

    this.onTick(ctx);

    switch (this.stage) {
      case 'intro':
        if (this.stageTime >= this.introTime()) this.beginIdle(ctx);
        break;
      case 'idle':
        this.idleLeft -= dt;
        if (this.idleLeft <= 0) this.startAttack(ctx);
        break;
      case 'telegraph':
        if (this.attack && this.stageTime >= this.attack.telegraph) {
          this.setStage('active');
          this.onActiveStart(this.attack, ctx);
        }
        break;
      case 'active':
        if (this.attack && this.stageTime >= this.attack.active) {
          if (this.attack.exposed > 0) {
            this.setStage('exposed');
            ctx.emit({ type: 'bossStaggered', x: this.centerX, y: this.centerY });
          } else this.setStage('recover');
        }
        break;
      case 'exposed':
        if (this.attack && this.stageTime >= this.attack.exposed) this.setStage('recover');
        break;
      case 'recover':
        if (this.attack && this.stageTime >= this.attack.recover) this.beginIdle(ctx);
        break;
    }
  }

  protected beginIdle(ctx: EnemyContext): void {
    const [lo, hi] = this.idleRange();
    this.idleLeft = lo + ctx.rng() * (hi - lo);
    this.setStage('idle');
  }

  private startAttack(ctx: EnemyContext): void {
    const spec = this.pickAttack(ctx);
    this.attack = spec;
    this.lastAttackName = spec.name;
    this.attackCount++;
    this.setStage('telegraph');
    this.onTelegraphStart(spec, ctx);
    ctx.emit({ type: 'bossTelegraph', x: this.centerX, y: this.centerY, attack: spec.name });
  }

  /** Force the boss into an exposed window (used by a successful telefrag, a wall slam...). */
  protected forceExposed(seconds: number, ctx: EnemyContext): void {
    this.attack = { name: this.attack?.name ?? 'stun', telegraph: 0, active: 0, exposed: seconds, recover: 0.6 };
    this.hazards = [];
    this.setStage('exposed');
    ctx.emit({ type: 'bossStaggered', x: this.centerX, y: this.centerY });
  }

  // ---- hazards & marks --------------------------------------------------------------------

  protected addHazard(h: Omit<BossHazard, 'state' | 'timer' | 'activeFor'> & { telegraph: number; active: number }): void {
    this.hazards.push({ rect: h.rect, damage: h.damage, style: h.style, state: 'telegraph', timer: h.telegraph, activeFor: h.active });
  }

  private tickHazards(dt: number): void {
    for (const h of this.hazards) {
      h.timer -= dt;
      if (h.timer <= 0) {
        if (h.state === 'telegraph') {
          h.state = 'active';
          h.timer = h.activeFor;
        } else h.timer = -1;
      }
    }
    this.hazards = this.hazards.filter((h) => h.state === 'telegraph' || h.timer > 0);
  }

  protected addMark(m: Omit<BossMark, 'total'>): void {
    this.marks.push({ ...m, total: m.timer });
  }

  private tickMarks(dt: number): void {
    for (const m of this.marks) m.timer -= dt;
    this.marks = this.marks.filter((m) => m.timer > -0.25);
  }

  // ---- damage -----------------------------------------------------------------------------

  /** Fraction of health remaining, 0..1. */
  get healthRatio(): number {
    return this.health.current / this.health.max;
  }

  takeHit(damage: number, _dirX: number, _dirY: number): { killed: boolean } {
    if (!this.isAlive() || !this.canBeHit()) {
      this.flash = 0.04;
      return { killed: false };
    }
    const res = this.health.tryDamage(damage, 0);
    if (!res.applied) return { killed: false };
    this.flash = 0.1;
    if (res.died) {
      this.hazards = [];
      this.marks = [];
      this.setStage('dying');
      return { killed: true };
    }
    this.checkPhase();
    return { killed: false };
  }

  /** Damage that bypasses the vulnerability rule (e.g. a telefrag). */
  protected forceDamage(damage: number): boolean {
    const res = this.health.tryDamage(damage, 0);
    if (res.died) {
      this.hazards = [];
      this.marks = [];
      this.setStage('dying');
    } else this.checkPhase();
    return res.applied;
  }

  private pendingPhase = false;
  private checkPhase(): void {
    const r = this.healthRatio;
    const target = r <= this.phaseThresholds.phase3 ? 3 : r <= this.phaseThresholds.phase2 ? 2 : 1;
    if (target > this.phase) {
      this.phase = target;
      this.pendingPhase = true;
    }
  }

  /** Called by the world every step to flush phase-change notifications. */
  flushPhaseChange(emit: Emit): void {
    if (!this.pendingPhase) return;
    this.pendingPhase = false;
    emit({ type: 'bossPhase', phase: this.phase });
  }

  damageSources(): DamageSource[] {
    if (!this.isAlive()) return [];
    const sources: DamageSource[] = [
      { rect: bodyRect(this.body), damage: this.contactDamage(), originX: this.centerX, originY: this.centerY, requiresLineOfSight: false },
    ];
    for (const h of this.hazards) {
      if (h.state !== 'active') continue;
      sources.push({ rect: h.rect, damage: h.damage, originX: h.rect.x + h.rect.w / 2, originY: h.rect.y + h.rect.h / 2, requiresLineOfSight: false });
    }
    return sources;
  }

  protected abstract contactDamage(): number;
}
