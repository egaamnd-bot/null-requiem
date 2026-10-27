import Phaser from 'phaser';
import { COMBAT } from '../config/tuning';
import type { ScrapHound } from '../core/enemies/scrapHound';
import type { Enemy } from '../core/enemies/enemy';
import type { BulwarkUnit } from '../core/enemies/bulwarkUnit';
import { WatcherDrone } from '../core/enemies/watcherDrone';
import type { Player } from '../core/player';
import type { Projectile } from '../core/projectile';
import type { GameWorld } from '../core/world';
import { PALETTE } from './palette';
import { DEPTH } from './RoomView';
import type { NpcEntity } from '../core/npc';
import type { PanoptixUnit } from '../core/enemies/panoptixUnit';
import { houndKey, playerKey, TEX, bulwarkKey, droneKey, npcKey, panoptixKey, type PlayerFrame, type PanoptixFrame } from './textures';

/** Render-space position (interpolated between simulation steps). */
export interface RenderPos {
  x: number;
  y: number;
}

function flash(sprite: Phaser.GameObjects.Image, on: boolean, color: number = PALETTE.white): void {
  if (on) sprite.setTint(color).setTintMode(Phaser.TintModes.FILL);
  else sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
}

// ---------------------------------------------------------------- player

export class PlayerView {
  readonly sprite: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly slash: Phaser.GameObjects.Image;
  private squash = 0;
  private runClock = 0;
  private lastAttackId = -1;
  private slashTimer = 0;

  constructor(scene: Phaser.Scene) {
    this.glow = scene.add.image(0, 0, TEX.glowSoft).setTint(PALETTE.cyan).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3).setScale(1.2).setDepth(DEPTH.player - 1);
    this.sprite = scene.add.image(0, 0, playerKey('idle0')).setOrigin(0.5, 1).setDepth(DEPTH.player).setScale(0.65);
    this.slash = scene.add.image(0, 0, TEX.slashSide).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.player + 1).setVisible(false);
  }

  /** Bounce/squash cues from simulation events. */
  onLand(heavy: boolean): void {
    this.squash = heavy ? 1 : 0.6;
  }

  onJump(): void {
    this.squash = -0.7;
  }

  update(p: Player, pos: RenderPos, dt: number, time: number): void {
    const b = p.body;
    const feetX = pos.x + b.w / 2;
    const feetY = pos.y + b.h;
    this.sprite.setPosition(Math.round(feetX), Math.round(feetY));
    this.sprite.setFlipX(p.facing < 0);

    let frame: PlayerFrame;
    if (p.dead || p.isStunned) frame = 'hurt';
    else if (p.isDashing) frame = 'dash';
    else if (p.isAttacking && p.attackPhase !== 'recovery') frame = 'attack';
    else if (!b.onGround) frame = b.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(b.vx) > 10) {
      this.runClock += dt * (Math.abs(b.vx) / 150) * 10;
      frame = (['run0', 'run1', 'run2', 'run3'] as const)[Math.floor(this.runClock) % 4] ?? 'run0';
    } else frame = Math.floor(time / 450) % 2 === 0 ? 'idle0' : 'idle1';
    this.sprite.setTexture(playerKey(frame));

    // Squash and stretch (decays exponentially, so it's frame-rate independent).
    this.squash *= Math.exp(-12 * dt);
    const s = this.squash;
    const sx = 1 + s * 0.18;
    const sy = 1 - s * 0.18;
    this.sprite.setScale(p.isDashing ? 0.84 : 0.65 * sx, p.isDashing ? 0.55 : 0.65 * sy);

    // Invulnerability blink, death fade.
    const inv = p.health.isInvulnerable && !p.dead;
    this.sprite.setAlpha(p.dead ? 0.85 : inv && Math.floor(time / 70) % 2 === 0 ? 0.35 : 1);
    flash(this.sprite, p.isDashing, PALETTE.cyan);
    if (p.isDashing) this.sprite.setAlpha(0.85);

    this.glow.setPosition(feetX, feetY - 12).setAlpha(p.dead ? 0.12 : 0.28 + Math.sin(time / 300) * 0.04);

    // Slash arc appears for the active window plus a short fade.
    if (p.attackPhase === 'active' && p.attackId !== this.lastAttackId) {
      this.lastAttackId = p.attackId;
      this.slashTimer = COMBAT.attack.active + 0.06;
      const key = p.attackDir === 'up' ? TEX.slashUp : p.attackDir === 'down' ? TEX.slashDown : TEX.slashSide;
      this.slash.setTexture(key);
    }
    if (this.slashTimer > 0 && !p.dead) {
      this.slashTimer -= dt;
      const hb = p.hitbox();
      const cx = feetX;
      const cy = feetY - b.h / 2;
      if (p.attackDir === 'side') {
        this.slash.setPosition(cx + p.facing * 16, cy - 2).setFlipX(p.facing < 0).setOrigin(0.5);
      } else if (p.attackDir === 'up') {
        this.slash.setPosition(cx, cy - 22).setFlipX(false);
      } else {
        this.slash.setPosition(cx, cy + 20).setFlipX(false);
      }
      this.slash.setVisible(true).setAlpha(Math.min(1, this.slashTimer / 0.06) * (hb ? 1 : 0.6));
    } else {
      this.slash.setVisible(false);
    }
  }

  destroy(): void {
    this.sprite.destroy();
    this.glow.destroy();
    this.slash.destroy();
  }
}

// ---------------------------------------------------------------- Backtrace echo

/**
 * The echo: a translucent afterimage showing exactly where Backtrace will send the player
 * (the oldest recorded spot they can still occupy). Bright when ready, faint while cooling down.
 */
export class EchoView {
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.glow = scene.add.image(0, 0, TEX.glow).setTint(PALETTE.cyan).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.echo - 1).setScale(0.7);
    this.sprite = scene.add
      .image(0, 0, playerKey('idle0'))
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.echo)
      .setTint(PALETTE.cyan)
      .setTintMode(Phaser.TintModes.FILL)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.65);
  }

  update(world: GameWorld, time: number): void {
    const p = world.player;
    const target =
      world.progression.has('backtrace') && !p.dead && world.backtrace.historySeconds > 0.3
        ? world.backtrace.target(world.room.grid, p.body.w, p.body.h)
        : null;
    const visible = !!target && Math.abs(target.feetX - p.feetX) + Math.abs(target.feetY - p.feetY) > 6;
    this.sprite.setVisible(visible);
    this.glow.setVisible(visible);
    if (!target || !visible) return;
    const ready = world.backtrace.ready;
    // Digital flicker: mostly steady, with brief dropouts.
    const flicker = Math.sin(time / 37) * Math.sin(time / 91) > 0.85 ? 0.4 : 1;
    this.sprite
      .setPosition(Math.round(target.feetX), Math.round(target.feetY))
      .setFlipX(target.facing < 0)
      .setAlpha((ready ? 0.45 : 0.14) * flicker);
    this.glow.setPosition(target.feetX, target.feetY - 11).setAlpha(ready ? 0.35 : 0.08);
  }

  destroy(): void {
    this.sprite.destroy();
    this.glow.destroy();
  }
}

// ---------------------------------------------------------------- enemies

interface EnemyView {
  update(e: Enemy, pos: RenderPos, time: number): void;
  destroy(): void;
}

class HoundView implements EnemyView {
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly tell: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.glow = scene.add.image(0, 0, TEX.glow).setTint(PALETTE.danger).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.enemies - 1);
    this.sprite = scene.add.image(0, 0, houndKey('walk0')).setOrigin(0.5, 1).setDepth(DEPTH.enemies);
    this.tell = scene.add.image(0, 0, TEX.spark).setTint(PALETTE.white).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.enemies + 1).setVisible(false);
  }

  update(e: Enemy, pos: RenderPos, time: number): void {
    const g = e as ScrapHound;
    const b = g.body;
    const fx = Math.round(pos.x + b.w / 2);
    const fy = Math.round(pos.y + b.h);
    let shake = 0;
    let key = houndKey(Math.floor(time / 180) % 2 === 0 ? 'walk0' : 'walk1');
    if (g.state === 'windup') {
      key = houndKey('windup');
      shake = Math.sin(time / 18) * 1;
    } else if (g.state === 'lunge') key = houndKey('lunge');
    else if (g.state === 'recover') key = houndKey('recover');
    this.sprite.setTexture(key).setPosition(fx + shake, fy).setFlipX(g.facing < 0);
    flash(this.sprite, g.flash > 0);
    const glowA = g.state === 'windup' ? 0.75 : g.state === 'recover' ? 0.12 : 0.35;
    this.glow.setPosition(fx, fy - 4).setAlpha(glowA).setScale(g.state === 'windup' ? 0.9 : 0.6);
    // A pale glint above the eye announces the lunge.
    this.tell.setVisible(g.state === 'windup' && g.stateTime > 0.1).setPosition(fx + g.facing * 9, fy - 14).setScale(1 + Math.sin(time / 40) * 0.4);
  }

  destroy(): void {
    this.sprite.destroy();
    this.glow.destroy();
    this.tell.destroy();
  }
}

class DroneView implements EnemyView {
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly core: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.glow = scene.add.image(0, 0, TEX.glowSoft).setTint(PALETTE.magenta).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35).setScale(0.7).setDepth(DEPTH.enemies - 1);
    this.sprite = scene.add.image(0, 0, droneKey('idle0')).setDepth(DEPTH.enemies).setAlpha(0.95);
    this.core = scene.add.image(0, 0, TEX.glow).setTint(PALETTE.sodium).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.enemies + 1);
  }

  update(e: Enemy, pos: RenderPos, time: number): void {
    const w = e as WatcherDrone;
    const b = w.body;
    const cx = Math.round(pos.x + b.w / 2);
    const cy = Math.round(pos.y + b.h / 2);
    const charging = w.state === 'windup';
    const key = charging ? droneKey('charge') : droneKey(Math.floor(time / 300) % 2 === 0 ? 'idle0' : 'idle1');
    this.sprite.setTexture(key).setPosition(cx, cy + 4).setFlipX(w.facing < 0);
    flash(this.sprite, w.flash > 0);
    this.glow.setPosition(cx, cy);
    this.core.setPosition(cx, cy).setScale(0.25 + w.charge * 0.55).setAlpha(0.5 + w.charge * 0.5);
  }

  destroy(): void {
    this.sprite.destroy();
    this.glow.destroy();
    this.core.destroy();
  }
}

export class BossView {
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly markers: Phaser.GameObjects.Image[] = [];
  private readonly ceilingMarks: Phaser.GameObjects.Image[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    this.glow = scene.add.image(0, 0, TEX.glowSoft).setTint(PALETTE.danger).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.enemies - 1);
    this.sprite = scene.add.image(0, 0, bulwarkKey('idle')).setOrigin(0.5, 1).setDepth(DEPTH.enemies);
  }

  update(boss: BulwarkUnit, pos: RenderPos, time: number): void {
    const b = boss.body;
    const fx = Math.round(pos.x + b.w / 2);
    const fy = Math.round(pos.y + b.h);
    let key = bulwarkKey('idle');
    let shake = 0;
    switch (boss.state) {
      case 'chargeWindup':
      case 'leapWindup':
      case 'rainWindup':
        key = bulwarkKey('windup');
        shake = Math.sin(time / 20) * (0.5 + boss.windupProgress);
        break;
      case 'charge':
        key = bulwarkKey('charge');
        break;
      case 'leap':
        key = bulwarkKey('leap');
        break;
      case 'stunned':
        key = bulwarkKey('stunned');
        break;
      case 'dead':
        key = bulwarkKey('dead');
        break;
      case 'intro':
        shake = Math.sin(time / 25) * 1.2;
        break;
      default:
        break;
    }
    this.sprite.setTexture(key).setPosition(fx + shake, fy).setFlipX(boss.facing < 0);
    flash(this.sprite, boss.flash > 0);
    const hot = boss.state.endsWith('Windup') ? 0.6 + boss.windupProgress * 0.4 : boss.state === 'stunned' || boss.state === 'dead' ? 0.1 : 0.4;
    this.glow.setPosition(fx, fy - 16).setAlpha(hot * (boss.phase === 2 ? 1.2 : 1)).setScale(boss.phase === 2 ? 1.3 : 1.05);

    // Plasma-rain telegraphs: floor marker + faint ceiling glow per pending strike.
    const pending = boss.rainMarkers.filter((m) => !m.fired);
    while (this.markers.length < pending.length) {
      this.markers.push(this.scene.add.image(0, 0, TEX.rainMarker).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.fx));
      this.ceilingMarks.push(this.scene.add.image(0, 0, TEX.glow).setTint(PALETTE.danger).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.fx));
    }
    this.markers.forEach((m, i) => {
      const r = pending[i];
      const c = this.ceilingMarks[i]!;
      if (!r) {
        m.setVisible(false);
        c.setVisible(false);
        return;
      }
      const urgency = Math.max(0, 1 - r.remaining / 0.9);
      m.setVisible(true).setPosition(r.x, boss.arena.floorY - 2).setScale(1 + urgency, 1).setAlpha(0.5 + urgency * 0.5 + Math.sin(time / 50) * 0.1);
      c.setVisible(true).setPosition(r.x, boss.arena.ceilingY + 4).setScale(0.4 + urgency * 0.4).setAlpha(0.3 + urgency * 0.5);
    });
  }

  destroy(): void {
    this.sprite.destroy();
    this.glow.destroy();
    for (const m of this.markers) m.destroy();
    for (const c of this.ceilingMarks) c.destroy();
  }
}

/** Keeps one view per live enemy, creating and destroying views as enemies come and go. */
export class EnemyViewRegistry {
  private readonly views = new Map<string, EnemyView>();

  constructor(private readonly scene: Phaser.Scene) {}

  sync(enemies: readonly Enemy[], posOf: (e: Enemy) => RenderPos, time: number): void {
    const live = new Set<string>();
    for (const e of enemies) {
      live.add(e.id);
      let v = this.views.get(e.id);
      if (!v) {
        v = e instanceof WatcherDrone ? new DroneView(this.scene) : new HoundView(this.scene);
        this.views.set(e.id, v);
      }
      v.update(e, posOf(e), time);
    }
    for (const [id, v] of this.views) {
      if (!live.has(id)) {
        v.destroy();
        this.views.delete(id);
      }
    }
  }

  clear(): void {
    for (const v of this.views.values()) v.destroy();
    this.views.clear();
  }
}

/** Projectile sprites, pooled by projectile id. */
export class ProjectileViews {
  private readonly views = new Map<string, { sprite: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image }>();

  constructor(private readonly scene: Phaser.Scene) {}

  sync(projectiles: readonly Projectile[], time: number): void {
    const live = new Set<string>();
    for (const p of projectiles) {
      if (!p.alive) continue;
      live.add(p.id);
      let v = this.views.get(p.id);
      if (!v) {
        const key = p.kind === 'laserBolt' ? TEX.bolt : p.kind === 'shockwave' ? TEX.shockwave : TEX.plasma;
        v = {
          sprite: this.scene.add.image(0, 0, key).setDepth(DEPTH.projectiles).setBlendMode(Phaser.BlendModes.ADD),
          glow: this.scene.add.image(0, 0, TEX.glow).setTint(p.kind === 'laserBolt' ? PALETTE.magenta : p.kind === 'shockwave' ? PALETTE.sodium : PALETTE.danger).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.projectiles - 1).setScale(0.6).setAlpha(0.6),
        };
        this.views.set(p.id, v);
      }
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      v.sprite.setPosition(cx, cy).setFlipX(p.vx < 0);
      if (p.kind === 'laserBolt') v.sprite.setRotation(time / 80);
      if (p.kind === 'shockwave') v.sprite.setScale(1, 0.85 + Math.sin(time / 40) * 0.15);
      v.glow.setPosition(cx, cy);
    }
    for (const [id, v] of this.views) {
      if (!live.has(id)) {
        v.sprite.destroy();
        v.glow.destroy();
        this.views.delete(id);
      }
    }
  }

  clear(): void {
    for (const v of this.views.values()) {
      v.sprite.destroy();
      v.glow.destroy();
    }
    this.views.clear();
  }
}

// ---------------------------------------------------------------- NPC

/**
 * Renders a single NPC (zero / mira / terminal).
 * Gentle idle float; a pulsing talk-indicator dot appears when the NPC is active.
 */
export class NpcView {
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly talkBubble: Phaser.GameObjects.Image;
  private readonly baseY: number;

  constructor(scene: Phaser.Scene, npc: NpcEntity) {
    this.baseY = npc.feetY;
    const glowTint = npc.kind === 'terminal' ? PALETTE.violet : PALETTE.cyan;
    this.glow = scene.add
      .image(npc.feetX, npc.feetY - 10, TEX.glowSoft)
      .setTint(glowTint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.2)
      .setScale(0.6)
      .setDepth(DEPTH.enemies - 1);
    this.sprite = scene.add
      .image(npc.feetX, npc.feetY, npcKey(npc.kind))
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.enemies);
    // Pulsing talk-indicator shown when NPC is the active dialogue target
    this.talkBubble = scene.add
      .image(npc.feetX + 7, npc.feetY - 32, TEX.glow)
      .setTint(PALETTE.white)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.22)
      .setDepth(DEPTH.enemies + 1)
      .setVisible(false);
  }

  update(isActive: boolean, time: number): void {
    const t = time / 1000;
    // Gentle idle bob
    const bob = Math.sin(t * 1.1 + this.baseY * 0.01) * 0.7;
    this.sprite.setY(this.baseY + bob);
    this.glow.setAlpha(0.15 + Math.sin(t * 2.0 + this.baseY * 0.01) * 0.06);
    // Talk bubble: pulse when active
    this.talkBubble
      .setVisible(isActive)
      .setY(this.baseY - 32 + Math.sin(t * 7) * 1.5)
      .setAlpha(0.7 + Math.sin(t * 9) * 0.3)
      .setScale(0.22 + Math.sin(t * 12) * 0.04);
  }

  destroy(): void {
    this.sprite.destroy();
    this.glow.destroy();
    this.talkBubble.destroy();
  }
}

// ---------------------------------------------------------------- PANOPTIX-0

/**
 * Renders the PANOPTIX-0 boss — a mechanical eye on a spider chassis.
 * Draws laser / death-beam lines via Graphics; switches texture frame by state.
 */
export class PanoptixView {
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Image;
  private readonly laserGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.laserGraphics = scene.add.graphics().setDepth(DEPTH.enemies - 2);
    this.glow = scene.add
      .image(0, 0, TEX.glowSoft)
      .setTint(PALETTE.violet)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.3)
      .setScale(2.2)
      .setDepth(DEPTH.enemies - 1);
    this.ring = scene.add
      .image(0, 0, TEX.ring)
      .setTint(PALETTE.magenta)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.4)
      .setScale(1.8)
      .setDepth(DEPTH.enemies);
    this.sprite = scene.add
      .image(0, 0, panoptixKey('idle'))
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH.enemies + 1);
  }

  update(panoptix: PanoptixUnit, time: number): void {
    const t  = time / 1000;
    const cx = panoptix.centerX;
    const cy = panoptix.centerY;

    this.sprite.setPosition(cx, cy);
    this.glow.setPosition(cx, cy);
    this.ring.setPosition(cx, cy);

    // Choose texture frame by state
    let frame: PanoptixFrame = 'idle';
    const s = panoptix.state;
    if (s === 'laser-warmup' || s === 'laser-sweep' ||
        s === 'deathbeam-warmup' || s === 'deathbeam-active') {
      frame = 'laser';
    } else if (s === 'stagger') {
      frame = 'stagger';
    } else if (s === 'defeated') {
      frame = 'dead';
    }
    this.sprite.setTexture(panoptixKey(frame));

    // Glow tint and alpha by state
    const defeated = s === 'defeated';
    const isLaser  = frame === 'laser';
    this.glow
      .setTint(isLaser ? PALETTE.danger : PALETTE.violet)
      .setAlpha(defeated ? 0 : isLaser
        ? 0.55 + Math.sin(t * 22) * 0.08
        : 0.28 + Math.sin(t * 2.3) * 0.06);

    // Spinning outer ring
    this.ring
      .setRotation(t * 0.45)
      .setAlpha(defeated ? 0 : 0.3 + Math.sin(t * 3.1) * 0.08);

    // Phase-3 flicker
    this.sprite.setAlpha(
      defeated ? 0.32 :
      panoptix.phase >= 3 ? (Math.sin(t * 28) > 0.25 ? 1 : 0.82) : 1,
    );

    // ── Laser / death-beam lines ──
    this.laserGraphics.clear();
    if (!defeated) {
      const laser = panoptix.laser;
      if (laser) {
        const len = 300;
        const ex = cx + Math.cos(laser.angle) * len;
        const ey = cy + Math.sin(laser.angle) * len;
        if (laser.warmup) {
          // Targeting thread: thin, flickering
          this.laserGraphics.lineStyle(1, PALETTE.danger, 0.4 + Math.sin(t * 25) * 0.2);
          this.laserGraphics.lineBetween(cx, cy, ex, ey);
        } else {
          // Active beam: red glow + bright core
          this.laserGraphics.lineStyle(5, PALETTE.danger, 0.28);
          this.laserGraphics.lineBetween(cx, cy, ex, ey);
          this.laserGraphics.lineStyle(2, PALETTE.white, 0.92);
          this.laserGraphics.lineBetween(cx, cy, ex, ey);
        }
      }
      // Death-beam: multi-angle sweep
      const deathBeams = panoptix.deathBeamAngles;
      if (deathBeams) {
        for (const angle of deathBeams) {
          const len = 300;
          const ex = cx + Math.cos(angle) * len;
          const ey = cy + Math.sin(angle) * len;
          this.laserGraphics.lineStyle(7, PALETTE.magenta, 0.28);
          this.laserGraphics.lineBetween(cx, cy, ex, ey);
          this.laserGraphics.lineStyle(2, PALETTE.white, 0.88);
          this.laserGraphics.lineBetween(cx, cy, ex, ey);
        }
      }
    }
  }

  destroy(): void {
    this.sprite.destroy();
    this.glow.destroy();
    this.ring.destroy();
    this.laserGraphics.destroy();
  }
}

