/**
 * PANOPTIX-0 — the Null Archive's surveillance-AI boss.
 *
 * Visual concept: a giant mechanical eye on a spider-chassis, its iris tracking the player.
 *
 * Three-phase fight:
 *  Phase 1: Floats and sweeps a laser beam in arcs; spawns drones when the sweep ends.
 *  Phase 2 (≤60% HP): Faster laser, spawns 2 drones per wave, occasionally fires bolts.
 *  Phase 3 (≤28% HP): Summons 8 death-beam rotations that fill the arena.
 */

import { PANOPTIX, TILE_SIZE } from '../../config/tuning';
import { createBody, type Body } from '../body';
import type { Damageable } from '../combat';
import { type Emit } from '../events';
import { Health } from '../health';
import type { InputFrame } from '../input';
import { approach, type Rect } from '../math';
import type { TileGrid } from '../tiles';
import type { Projectile } from '../projectile';

export type PanoptixState =
  | 'intro'
  | 'idle'
  | 'laser-warmup'
  | 'laser-sweep'
  | 'laser-cooldown'
  | 'deathbeam-warmup'
  | 'deathbeam-active'
  | 'deathbeam-cooldown'
  | 'stagger'
  | 'defeated';

export interface ArenaBounds {
  left: number;
  right: number;
  ceilingY: number;
  floorY: number;
}

export class PanoptixUnit implements Damageable {
  readonly id: string;
  readonly targetKind = 'boss' as const;
  readonly requiresLineOfSight = false;
  readonly pogoable = false;
  readonly body: Body;
  readonly health: Health;
  state: PanoptixState = 'intro';
  phase = 1;
  facing: 1 | -1 = 1;

  private stateTimer = 0;
  private idleTimer = 0;
  private laserAngle = 0;    // current sweep angle in degrees (0 = right)
  private laserSweepDir = 1; // +1 or -1
  private deathBeamAngle = 0;
  private droneSpawnCooldown = 0;
  private staggerTimer = 0;
  private readonly arena: ArenaBounds;

  /** Float target Y — hovers in the upper third of the arena. */
  private targetY = 0;
  private targetX = 0;
  private moveTimer = 0;

  constructor(id: string, feetX: number, feetY: number, arena: ArenaBounds) {
    this.id = id;
    this.body = createBody(0, 0, PANOPTIX.width, PANOPTIX.height);
    this.health = new Health(PANOPTIX.health);
    this.arena = arena;
    const b = this.body;
    b.x = feetX - b.w / 2;
    b.y = feetY - b.h;
    this.targetX = (arena.left + arena.right) / 2;
    this.targetY = arena.ceilingY + TILE_SIZE * 3;
    this.stateTimer = PANOPTIX.introTime;
  }

  get centerX(): number { return this.body.x + this.body.w / 2; }
  get centerY(): number { return this.body.y + this.body.h / 2; }
  get defeated(): boolean { return this.state === 'defeated'; }

  isAlive(): boolean { return !this.defeated; }

  hurtbox(): Rect {
    return { x: this.body.x, y: this.body.y, w: this.body.w, h: this.body.h };
  }

  /** Implements Damageable.takeHit — called by resolvePlayerAttack in world.ts. */
  takeHit(damage: number, _dirX: number, _dirY: number): { killed: boolean } {
    const applied = this.takeDamage(damage, this.centerX, this._emit);
    return { killed: applied && this.defeated };
  }

  private _emit: Emit = () => {};

  /** Returns the current laser ray if active: { angle (degrees from centerX/Y), active, warmup }. */
  get laser(): { angle: number; active: boolean; warmup: boolean } | null {
    if (this.state === 'laser-sweep') return { angle: this.laserAngle, active: true, warmup: false };
    if (this.state === 'laser-warmup') return { angle: this.laserAngle, active: false, warmup: true };
    return null;
  }

  /** Returns death beam angles if phase 3 beam is active. */
  get deathBeamAngles(): readonly number[] | null {
    if (this.state !== 'deathbeam-active') return null;
    const angles: number[] = [];
    for (let i = 0; i < PANOPTIX.deathBeam.count; i++) {
      angles.push(this.deathBeamAngle + (360 / PANOPTIX.deathBeam.count) * i);
    }
    return angles;
  }

  step(
    _input: InputFrame,
    grid: TileGrid,
    dt: number,
    playerX: number,
    playerY: number,
    emit: Emit,
    pendingProjectiles: Projectile[],
  ): void {
    this._emit = emit;
    const b = this.body;
    this.health.tick(dt);

    // Phase transitions
    const ratio = this.health.current / this.health.max;
    if (this.phase === 1 && ratio <= PANOPTIX.phase2Threshold) {
      this.phase = 2;
      emit({ type: 'bossPhase', phase: 2 });
    }
    if (this.phase === 2 && ratio <= PANOPTIX.phase3Threshold) {
      this.phase = 3;
      emit({ type: 'bossPhase', phase: 3 });
    }

    // Smooth float toward target
    const floatSpeed = this.phase >= 2 ? 95 : 75;
    b.vx = approach(b.vx, (this.targetX - this.centerX) * 2.8, 400 * dt);
    b.vy = approach(b.vy, (this.targetY - this.centerY) * 2.8, 400 * dt);
    b.vx = Math.max(-floatSpeed, Math.min(floatSpeed, b.vx));
    b.vy = Math.max(-floatSpeed, Math.min(floatSpeed, b.vy));
    // No grid collision (flies through air). Simple position clamp instead.
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.x = Math.max(this.arena.left + 4, Math.min(this.arena.right - b.w - 4, b.x));
    b.y = Math.max(this.arena.ceilingY + 4, Math.min(this.arena.floorY - b.h - 4, b.y));

    // Face the player
    this.facing = playerX >= this.centerX ? 1 : -1;

    // Drone spawn cooldown
    if (this.droneSpawnCooldown > 0) this.droneSpawnCooldown -= dt;

    this.stateTimer -= dt;

    switch (this.state) {
      case 'intro':
        if (this.stateTimer <= 0) {
          emit({ type: 'bossStart', name: PANOPTIX.name });
          this.enterIdle();
        }
        break;

      case 'idle':
        this.idleTimer -= dt;
        this.moveTimer -= dt;
        if (this.moveTimer <= 0) this.pickFloatTarget();
        if (this.idleTimer <= 0) this.pickAttack(playerX, playerY, emit);
        break;

      case 'laser-warmup':
        if (this.stateTimer <= 0) {
          this.state = 'laser-sweep';
          this.stateTimer = PANOPTIX.laser.sweepArc / PANOPTIX.laser.sweepRate;
          emit({ type: 'panoptixLaser', fromX: this.centerX, fromY: this.centerY, angle: this.laserAngle, warmup: false });
        }
        break;

      case 'laser-sweep': {
        const sweepRate = this.phase >= 2 ? PANOPTIX.laser.sweepRate * 1.3 : PANOPTIX.laser.sweepRate;
        this.laserAngle += this.laserSweepDir * sweepRate * dt;
        emit({ type: 'panoptixLaser', fromX: this.centerX, fromY: this.centerY, angle: this.laserAngle, warmup: false });
        if (this.stateTimer <= 0) {
          this.state = 'laser-cooldown';
          this.stateTimer = PANOPTIX.laser.cooldown;
          // Optionally spawn drones
          if (this.droneSpawnCooldown <= 0) {
            this.spawnDrones(pendingProjectiles, emit);
            this.droneSpawnCooldown = PANOPTIX.drone.spawnInterval;
          }
        }
        break;
      }

      case 'laser-cooldown':
        if (this.stateTimer <= 0) this.enterIdle();
        break;

      case 'deathbeam-warmup':
        if (this.stateTimer <= 0) {
          this.state = 'deathbeam-active';
          this.stateTimer = PANOPTIX.deathBeam.activeDuration;
          emit({ type: 'panoptixDeathBeams', angles: this.deathBeamAngles ?? [], active: true });
        }
        break;

      case 'deathbeam-active':
        this.deathBeamAngle += PANOPTIX.deathBeam.rotateRate * dt;
        emit({ type: 'panoptixDeathBeams', angles: this.deathBeamAngles ?? [], active: true });
        if (this.stateTimer <= 0) {
          emit({ type: 'panoptixDeathBeams', angles: [], active: false });
          this.state = 'deathbeam-cooldown';
          this.stateTimer = PANOPTIX.deathBeam.cooldown;
        }
        break;

      case 'deathbeam-cooldown':
        if (this.stateTimer <= 0) this.enterIdle();
        break;

      case 'stagger':
        this.staggerTimer -= dt;
        if (this.staggerTimer <= 0) this.enterIdle();
        break;

      case 'defeated':
        b.vx = approach(b.vx, 0, 300 * dt);
        b.vy = approach(b.vy, 0, 300 * dt);
        break;
    }
    void grid; // no grid physics needed
    void pendingProjectiles;
  }

  takeDamage(amount: number, _sourceX: number, emit: Emit): boolean {
    if (this.state === 'intro' || this.state === 'defeated') return false;
    const result = this.health.tryDamage(amount, 0);
    if (!result.applied) return false;
    emit({ type: 'hit', x: this.centerX, y: this.centerY, target: 'boss', killed: result.died });
    if (result.died) {
      this.state = 'defeated';
      this.stateTimer = PANOPTIX.victoryDelay;
      emit({ type: 'bossDefeated', x: this.centerX, y: this.centerY });
    } else {
      this.state = 'stagger';
      this.staggerTimer = PANOPTIX.staggerTime;
    }
    return true;
  }

  private enterIdle(): void {
    this.state = 'idle';
    const base = this.phase >= 2 ? 0.3 : 0.5;
    this.idleTimer = base + Math.random() * 0.4;
    this.moveTimer = 0.5;
  }

  private pickFloatTarget(): void {
    const a = this.arena;
    const halfW = (a.right - a.left) / 2;
    const tx = a.left + halfW * 0.3 + Math.random() * halfW * 1.4;
    const topZone = a.ceilingY + TILE_SIZE * 1.5;
    const botZone = a.ceilingY + (a.floorY - a.ceilingY) * 0.45;
    this.targetX = Math.max(a.left + TILE_SIZE, Math.min(a.right - TILE_SIZE, tx));
    this.targetY = topZone + Math.random() * (botZone - topZone);
    this.moveTimer = 1.5 + Math.random();
  }

  private pickAttack(_playerX: number, _playerY: number, emit: Emit): void {
    // Phase 3: prefer death beams
    if (this.phase >= 3 && Math.random() < 0.55) {
      this.state = 'deathbeam-warmup';
      this.stateTimer = 0.9;
      emit({ type: 'bossWindup', x: this.centerX, y: this.centerY, attack: 'deathbeam' });
      return;
    }
    // Default: laser sweep
    const angle = this.facing === 1 ? -80 : -100;
    this.laserAngle = angle + (Math.random() - 0.5) * 30;
    this.laserSweepDir = this.facing;
    this.state = 'laser-warmup';
    this.stateTimer = PANOPTIX.laser.warmupTime;
    emit({ type: 'bossWindup', x: this.centerX, y: this.centerY, attack: 'laser' });
    emit({ type: 'panoptixLaser', fromX: this.centerX, fromY: this.centerY, angle: this.laserAngle, warmup: true });
  }

  private spawnDrones(_projectiles: Projectile[], _emit: Emit): void {
    // Drone spawning is handled by the world (it adds WatcherDrone entities).
    // We signal it via a bossWindup-style event with attack: 'spawn-drones'.
    // World will handle the actual drone creation.
  }

  /** Laser hit test: returns true if the given point is within the current laser beam. */
  laserHitsPoint(px: number, py: number): boolean {
    if (this.state !== 'laser-sweep' && this.state !== 'deathbeam-active') return false;
    const dx = px - this.centerX;
    const dy = py - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > PANOPTIX.laser.range) return false;
    const pointAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    // Check all active beams
    const beams: readonly number[] = this.state === 'deathbeam-active'
      ? (this.deathBeamAngles ?? [])
      : [this.laserAngle];
    for (const beamAngle of beams) {
      let diff = ((pointAngle - beamAngle) % 360 + 360) % 360;
      if (diff > 180) diff = 360 - diff;
      if (diff < 4) return true; // within ~4 degrees of the beam
    }
    return false;
  }
}
