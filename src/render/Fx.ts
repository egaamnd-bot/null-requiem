import Phaser from 'phaser';
import type { GameEvent } from '../core/events';
import { PALETTE } from './palette';
import { DEPTH } from './RoomView';
import { TEX } from './textures';

/** Hit-stop durations (seconds of frozen simulation) — the "weight" of impacts. */
const HITSTOP = { hit: 0.045, kill: 0.08, hurt: 0.07, backtrace: 0.06, bossKill: 0.25 } as const;

/**
 * Visual feedback driven entirely by simulation events: particles, camera shake,
 * hit-stop and screen flashes. Purely cosmetic; it never touches gameplay state.
 */
export class Fx {
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly debris: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly data: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly arcs: Phaser.GameObjects.Particles.ParticleEmitter;
  private rain: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private hitstop = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.sparks = scene.add
      .particles(0, 0, TEX.spark, {
        speed: { min: 60, max: 190 },
        lifespan: { min: 160, max: 360 },
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [PALETTE.white, PALETTE.cyan, PALETTE.sodium],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(DEPTH.fx);
    this.dust = scene.add
      .particles(0, 0, TEX.dust, {
        speedX: { min: -60, max: 60 },
        speedY: { min: -30, max: -5 },
        lifespan: { min: 220, max: 420 },
        scale: { start: 0.8, end: 0.1 },
        alpha: { start: 0.45, end: 0 },
        tint: PALETTE.mist,
        gravityY: 60,
        emitting: false,
      })
      .setDepth(DEPTH.fx);
    this.debris = scene.add
      .particles(0, 0, TEX.mote, {
        speed: { min: 20, max: 120 },
        angle: { min: 200, max: 340 },
        lifespan: { min: 500, max: 1000 },
        scale: { start: 1, end: 0.2 },
        alpha: { start: 1, end: 0 },
        tint: [PALETTE.sodium, PALETTE.danger, PALETTE.white],
        gravityY: 220,
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(DEPTH.fx);
    this.data = scene.add
      .particles(0, 0, TEX.mote, {
        speed: { min: 10, max: 60 },
        lifespan: { min: 300, max: 700 },
        scale: { start: 1, end: 0 },
        alpha: { start: 0.95, end: 0 },
        tint: [PALETTE.cyan, PALETTE.white],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(DEPTH.fx);
    this.arcs = scene.add
      .particles(0, 0, TEX.spark, {
        speed: { min: 80, max: 220 },
        lifespan: { min: 80, max: 200 },
        scale: { start: 1, end: 0.3 },
        tint: [PALETTE.cyan, PALETTE.white],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(DEPTH.fx);
  }

  /** Restart the slanted rain for a room of the given size. */
  setRoom(width: number, height: number): void {
    this.rain?.destroy();
    this.rain = this.scene.add
      .particles(0, 0, TEX.rain, {
        x: { min: -60, max: width },
        y: { min: -20, max: height * 0.6 },
        speedY: { min: 300, max: 380 },
        speedX: { min: 45, max: 60 },
        rotate: -9,
        lifespan: 1400,
        alpha: { min: 0.15, max: 0.35 },
        tint: [0x8fb4ff, PALETTE.mist],
        frequency: Math.max(6, 9000 / width),
        quantity: 1,
      })
      .setDepth(DEPTH.rain);
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

  /** An expanding ring of light (Backtrace arrival burst, relay link). */
  private ring(x: number, y: number, color: number, toScale: number, ms: number): void {
    const img = this.scene.add.image(x, y, TEX.ring).setTint(color).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.fx).setScale(0.2);
    this.scene.tweens.add({ targets: img, scale: toScale, alpha: 0, duration: ms, ease: 'Cubic.easeOut', onComplete: () => img.destroy() });
  }

  /** A streak of data particles along the path the player rewound through. */
  private streak(x0: number, y0: number, x1: number, y1: number): void {
    const n = Math.min(40, Math.max(8, Math.round(Math.hypot(x1 - x0, y1 - y0) / 6)));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.data.emitParticleAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 1);
    }
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
        this.data.explode(8, e.x, e.y);
        break;
      case 'backtrace':
        this.streak(e.fromX, e.fromY, e.toX, e.toY);
        this.ring(e.toX, e.toY, PALETTE.cyan, 1.5, 320);
        this.data.explode(18, e.toX, e.toY);
        this.stop(HITSTOP.backtrace);
        this.scene.cameras.main.flash(120, 40, 200, 230);
        break;
      case 'hit':
        this.sparks.explode(e.killed ? 14 : 7, e.x, e.y);
        if (e.target === 'enemy' || e.target === 'boss') this.stop(e.killed ? HITSTOP.kill : HITSTOP.hit);
        if (e.target === 'wall') this.dust.explode(6, e.x, e.y);
        if (e.target === 'switch') this.arcs.explode(10, e.x, e.y);
        break;
      case 'enemyDied':
        this.debris.explode(18, e.x, e.y);
        break;
      case 'playerHurt':
        this.sparks.explode(10, e.x, e.y);
        this.stop(HITSTOP.hurt);
        this.shake(140, 0.008);
        this.scene.cameras.main.flash(90, 140, 20, 40);
        break;
      case 'playerDied':
        this.data.explode(30, e.x, e.y);
        this.shake(260, 0.012);
        break;
      case 'playerPogo':
        this.sparks.explode(5, e.x, e.y);
        break;
      case 'hazardRespawn':
        this.arcs.explode(14, e.x, e.y - 10);
        break;
      case 'projectileBurst':
        this.sparks.explode(5, e.x, e.y);
        break;
      case 'checkpoint':
        this.ring(e.x, e.y - 18, PALETTE.cyan, e.firstTime ? 1.2 : 0.7, 400);
        break;
      case 'abilityUnlocked':
        this.data.explode(40, e.x, e.y);
        this.ring(e.x, e.y, PALETTE.cyan, 2.5, 600);
        this.scene.cameras.main.flash(250, 40, 180, 220);
        break;
      case 'secretFound':
        this.data.explode(26, e.x, e.y);
        break;
      case 'wallBroken':
        this.dust.explode(26, e.x, e.y);
        this.shake(160, 0.006);
        break;
      case 'switchHit':
        this.ring(e.x, e.y, PALETTE.cyan, 0.8, 250);
        break;
      case 'bossStart':
        this.shake(600, 0.006);
        break;
      case 'bossSlam':
        this.dust.explode(20, e.x, e.y);
        this.arcs.explode(12, e.x, e.y);
        this.shake(220, 0.012);
        break;
      case 'bossWallImpact':
        this.sparks.explode(16, e.x, e.y);
        this.shake(260, 0.014);
        break;
      case 'bossPhase':
        this.shake(400, 0.008);
        this.scene.cameras.main.flash(200, 160, 20, 40);
        break;
      case 'bossDefeated':
        this.debris.explode(60, e.x, e.y);
        this.stop(HITSTOP.bossKill);
        this.shake(700, 0.012);
        this.scene.cameras.main.flash(400, 200, 240, 255);
        break;
      default:
        break;
    }
  }

  setPaused(paused: boolean): void {
    for (const em of [this.sparks, this.dust, this.debris, this.data, this.arcs, this.rain]) {
      if (!em) continue;
      if (paused) em.pause();
      else em.resume();
    }
  }

  destroy(): void {
    for (const em of [this.sparks, this.dust, this.debris, this.data, this.arcs, this.rain]) em?.destroy();
  }
}
