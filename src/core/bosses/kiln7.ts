import { KILN_7 as T } from '../../config/bossTuning';
import type { EnemyContext } from '../enemies/enemy';
import { clamp } from '../math';
import { PatternBoss, type AttackSpec, type BossArena } from './patternBoss';

export type KilnAttack = 'pistonSlam' | 'steamVents' | 'emberRain' | 'furnaceSweep';

/**
 * KILN-7 — the industrial furnace-warden of the Industrial Core.
 * A stationary machine; the arena is the weapon. It cannot be hurt until it vents its core, which only happens after
 * a piston slam or a furnace sweep. Every attack is announced on the floor first.
 *
 *  Phase 1: piston slams (three lanes around the Courier) and steam vents.
 *  Phase 2: adds ember rain from the ceiling.
 *  Phase 3: adds the furnace sweep (a low shock front from both sides: jump it) and faster rhythm.
 */
export class Kiln7 extends PatternBoss {
  readonly bossId = T.id;
  readonly displayName = T.name;
  readonly kind = 'kiln7';
  private emberQueue: { x: number; at: number }[] = [];
  private queueClock = 0;
  lastChosen: KilnAttack | null = null;

  constructor(id: string, centerX: number, floorY: number, arena: BossArena) {
    super(id, centerX, floorY - T.height / 2, T.width, T.height, T.health, arena, { phase2: T.phase2, phase3: T.phase3 });
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

  protected pickAttack(ctx: EnemyContext): AttackSpec {
    const pool: KilnAttack[] = ['pistonSlam', 'steamVents'];
    if (this.phase >= 2) pool.push('emberRain');
    if (this.phase >= 3) pool.push('furnaceSweep', 'pistonSlam');
    // Never the same attack three times running; a slam is guaranteed every few attacks so the fight keeps opening up.
    let pick = pool[Math.floor(ctx.rng() * pool.length)] as KilnAttack;
    if (pick === this.lastChosen && ctx.rng() < 0.7) pick = pool[(pool.indexOf(pick) + 1) % pool.length] as KilnAttack;
    if (this.attackCount % 3 === 2) pick = this.phase >= 3 && ctx.rng() < 0.5 ? 'furnaceSweep' : 'pistonSlam';
    this.lastChosen = pick;
    switch (pick) {
      case 'pistonSlam':
        return { name: pick, telegraph: this.phase >= 3 ? T.piston.telegraphPhase3 : T.piston.telegraph, active: T.piston.active, exposed: T.piston.exposed, recover: 0.5 };
      case 'steamVents':
        return { name: pick, telegraph: T.vents.telegraph, active: T.vents.active, exposed: 0, recover: T.vents.recover };
      case 'emberRain':
        return { name: pick, telegraph: T.ember.windup, active: T.ember.stagger * T.ember.count, exposed: 0, recover: T.ember.recover };
      case 'furnaceSweep':
        return { name: pick, telegraph: T.sweep.telegraph, active: 0.2, exposed: T.sweep.exposed, recover: 0.6 };
    }
  }

  protected onTelegraphStart(spec: AttackSpec, ctx: EnemyContext): void {
    const a = this.arena;
    const floor = a.floorY;
    switch (spec.name as KilnAttack) {
      case 'pistonSlam': {
        const w = T.piston.width;
        for (let i = 0; i < T.piston.lanes; i++) {
          const cx = clamp(ctx.playerX + (i - 1) * T.piston.laneSpacing, a.left + w, a.right - w);
          this.addHazard({
            rect: { x: cx - w / 2, y: a.ceilingY, w, h: floor - a.ceilingY },
            damage: T.piston.damage,
            style: 'piston',
            telegraph: spec.telegraph,
            active: T.piston.active,
          });
        }
        break;
      }
      case 'steamVents': {
        const span = a.right - a.left;
        for (const f of [0.22, 0.78]) {
          const cx = a.left + span * f + (ctx.rng() - 0.5) * 24;
          this.addHazard({
            rect: { x: cx - T.vents.width / 2, y: floor - T.vents.height, w: T.vents.width, h: T.vents.height },
            damage: T.vents.damage,
            style: 'vent',
            telegraph: T.vents.telegraph,
            active: T.vents.active,
          });
        }
        break;
      }
      case 'emberRain': {
        const span = a.right - a.left;
        this.emberQueue = [];
        for (let i = 0; i < T.ember.count; i++) {
          const x = a.left + 16 + ctx.rng() * (span - 32);
          this.emberQueue.push({ x, at: spec.telegraph + i * T.ember.stagger });
          this.addMark({ x, y: floor - 2, kind: 'ember', timer: spec.telegraph + i * T.ember.stagger });
        }
        this.queueClock = 0;
        break;
      }
      case 'furnaceSweep':
        break;
    }
  }

  protected onActiveStart(spec: AttackSpec, ctx: EnemyContext): void {
    const a = this.arena;
    if (spec.name === 'pistonSlam') ctx.emit({ type: 'bossSlam', x: this.centerX, y: a.floorY });
    if (spec.name === 'furnaceSweep') {
      ctx.emit({ type: 'bossSlam', x: this.centerX, y: a.floorY });
      const s = T.sweep;
      for (const dir of [1, -1] as const) {
        const startX = dir === 1 ? a.left + 6 : a.right - 6 - s.width;
        ctx.spawnProjectile({ kind: 'shockwave', x: startX, y: a.floorY - s.height, w: s.width, h: s.height, vx: dir * s.speed, vy: 0, damage: s.damage, life: s.life });
      }
    }
  }

  protected onTick(ctx: EnemyContext): void {
    // Ember rounds are released on a schedule once their markers have run down.
    if (this.stage === 'telegraph' || this.stage === 'active') {
      if (this.attack?.name === 'emberRain') {
        this.queueClock += ctx.dt;
        while (this.emberQueue.length > 0 && (this.emberQueue[0] as { at: number }).at <= this.queueClock) {
          const e = this.emberQueue.shift() as { x: number; at: number };
          ctx.spawnProjectile({
            kind: 'plasmaRain',
            x: e.x - T.ember.width / 2,
            y: this.arena.ceilingY + 4,
            w: T.ember.width,
            h: T.ember.height,
            vx: 0,
            vy: T.ember.fallSpeed,
            gravity: T.ember.gravity,
            damage: T.ember.damage,
            life: 3,
          });
        }
      }
    }
  }

  protected override onPhaseChange(): void {}
}
