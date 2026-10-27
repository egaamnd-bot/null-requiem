import Phaser from 'phaser';
import type { GameEvent } from '../core/events';
import { PALETTE } from './palette';
import { DEPTH } from './RoomView';
import { TEX } from './textures';

/** Hit-stop durations (seconds of frozen simulation) — the "weight" of impacts. */
const HITSTOP = { hit: 0.045, kill: 0.08, hurt: 0.07, bossKill: 0.25 } as const;

/**
 * Visual feedback driven entirely by simulation events: particles, camera shake,
 * hit-stop and screen flashes. Purely cosmetic; it never touches gameplay state.
 */
export class Fx {
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly embers: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly bio: Phaser.GameObjects.Particles.ParticleEmitter;
  private ambient: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private hitstop = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.sparks = scene.add.particles(0, 0, TEX.spark, {
      speed: { min: 60, max: 190 },
      lifespan: { min: 160, max: 360 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [PALETTE.emberBright, PALETTE.ember, PALETTE.bone],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    }).setDepth(DEPTH.fx);
    this.dust = scene.add.particles(0, 0, TEX.dust, {
      speedX: { min: -60, max: 60 },
      speedY: { min: -30, max: -5 },
      lifespan: { min: 220, max: 420 },
      scale: { start: 0.8, end: 0.1 },
      alpha: { start: 0.5, end: 0 },
      tint: PALETTE.stone,
      gravityY: 60,
      emitting: false,
    }).setDepth(DEPTH.fx);
    this.embers = scene.add.particles(0, 0, TEX.mote, {
      speed: { min: 20, max: 110 },
      angle: { min: 200, max: 340 },
      lifespan: { min: 500, max: 1100 },
      scale: { start: 1, end: 0.2 },
      alpha: { start: 1, end: 0 },
      tint: [PALETTE.ember, PALETTE.emberBright, PALETTE.emberDeep],
      gravityY: -20,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    }).setDepth(DEPTH.fx);
    this.bio = scene.add.particles(0, 0, TEX.mote, {
      speed: { min: 20, max: 80 },
      lifespan: { min: 500, max: 900 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: PALETTE.bio,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    }).setDepth(DEPTH.fx);
  }

  /** Restart the drifting ambient embers for a room of the given size. */
  setRoom(width: number, height: number): void {
    this.ambient?.destroy();
    this.ambient = this.scene.add
      .particles(0, 0, TEX.mote, {
        x: { min: 0, max: width },
        y: { min: height * 0.3, max: height },
        speedY: { min: -18, max: -6 },
        speedX: { min: -6, max: 6 },
        lifespan: { min: 3500, max: 7000 },
        // Fade each mote in and out over its life.
        alpha: { onEmit: () => 0, onUpdate: (_p: Phaser.GameObjects.Particles.Particle, _k: string, t: number) => Math.sin(t * Math.PI) * 0.6 },
        scale: { min: 0.5, max: 1 },
        tint: [PALETTE.ember, PALETTE.emberBright],
        frequency: Math.max(60, 120000 / width),
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(DEPTH.fx - 1);
  }

  /** Seconds of hit-stop requested since last call (the scene freezes the simulation for this long). */
  takeHitstop(): number {
    const h = this.hitstop;
    this.hitstop = 0;
    return h;
  }

  private stop(seconds: number): void {
    this.hitstop = Math.max(this.hitstop, seconds);
  }

  private shake(duration: number, intensity: number): void {
    this.scene.cameras.main.shake(duration, intensity);
  }

  handle(e: GameEvent): void {
    switch (e.type) {
      case 'playerLand':
        this.dust.explode(e.heavy ? 8 : 4, e.x, e.y);
        break;
      case 'playerJump':
        this.dust.explode(3, e.x, e.y);
        break;
      case 'playerDash':
        this.bio.explode(10, e.x, e.y);
        break;
      case 'hit':
        this.sparks.explode(e.killed ? 14 : 7, e.x, e.y);
        if (e.target === 'enemy' || e.target === 'boss') this.stop(e.killed ? HITSTOP.kill : HITSTOP.hit);
        if (e.target === 'wall') this.dust.explode(6, e.x, e.y);
        break;
      case 'enemyDied':
        this.embers.explode(18, e.x, e.y);
        break;
      case 'playerHurt':
        this.sparks.explode(10, e.x, e.y);
        this.stop(HITSTOP.hurt);
        this.shake(140, 0.008);
        this.scene.cameras.main.flash(90, 120, 20, 10);
        break;
      case 'playerDied':
        this.embers.explode(30, e.x, e.y);
        this.shake(260, 0.012);
        break;
      case 'playerPogo':
        this.sparks.explode(5, e.x, e.y);
        break;
      case 'hazardRespawn':
        this.embers.explode(10, e.x, e.y - 10);
        break;
      case 'projectileBurst':
        this.embers.explode(6, e.x, e.y);
        break;
      case 'checkpoint':
        this.embers.explode(e.firstTime ? 24 : 10, e.x + 4, e.y - 18);
        break;
      case 'abilityUnlocked':
        this.bio.explode(40, e.x, e.y);
        this.scene.cameras.main.flash(250, 60, 160, 150);
        break;
      case 'secretFound':
        this.embers.explode(26, e.x, e.y);
        break;
      case 'wallBroken':
        this.dust.explode(26, e.x, e.y);
        this.shake(160, 0.006);
        break;
      case 'bossStart':
        this.shake(600, 0.006);
        break;
      case 'bossSlam':
        this.dust.explode(20, e.x, e.y);
        this.shake(220, 0.012);
        break;
      case 'bossWallImpact':
        this.sparks.explode(16, e.x, e.y);
        this.shake(260, 0.014);
        break;
      case 'bossPhase':
        this.shake(400, 0.008);
        this.scene.cameras.main.flash(200, 140, 40, 10);
        break;
      case 'bossDefeated':
        this.embers.explode(60, e.x, e.y);
        this.stop(HITSTOP.bossKill);
        this.shake(700, 0.012);
        this.scene.cameras.main.flash(400, 255, 200, 140);
        break;
      default:
        break;
    }
  }

  setPaused(paused: boolean): void {
    for (const em of [this.sparks, this.dust, this.embers, this.bio, this.ambient]) {
      if (!em) continue;
      if (paused) em.pause();
      else em.resume();
    }
  }

  destroy(): void {
    for (const em of [this.sparks, this.dust, this.embers, this.bio, this.ambient]) em?.destroy();
  }
}
