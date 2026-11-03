import Phaser from 'phaser';
import { TILE_SIZE } from '../config/tuning';
import { view } from '../config/view';
import type { TileGrid } from '../core/tiles';
import { createRng } from '../core/math';
import { Tile } from '../core/tiles';
import { canvasTexture } from './textures';
import { css, PALETTE } from './palette';

/**
 * Presentation-only atmosphere for a room (rainy-night grade, fog, near rain, wet-floor sheen, ripples, drifting motes).
 * Reads the tile grid and camera; never touches simulation state. Everything is generated at runtime and sits between the
 * existing layers, so painted art replacing the backdrop keeps working underneath it.
 */

const D = {
  grade: -76, // over far/mid parallax, under the (existing) rain and the playfield
  fogFar: -78,
  fogNear: -72,
  sheen: 1,
  ripple: 2,
  motes: 6,
  nearRain: 38,
  haze: 39,
} as const;

export const ATM_KEYS = { grade: 'atm-grade', fog: 'atm-fog', rainNear: 'atm-rain-near', ripple: 'atm-ripple', glint: 'atm-glint', haze: 'atm-haze', mote: 'atm-mote' } as const;

/** Soft cloud-like strip, tileable horizontally (a handful of wrapped radial blobs). */
function makeFog(scene: Phaser.Scene): void {
  canvasTexture(scene, ATM_KEYS.fog, 256, 64, (ctx) => {
    const rng = createRng(1337);
    for (let i = 0; i < 26; i++) {
      const x = rng() * 256;
      const y = 14 + rng() * 38;
      const r = 14 + rng() * 26;
      for (const dx of [-256, 0, 256]) {
        const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, r);
        g.addColorStop(0, 'rgba(255,255,255,0.34)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x + dx - r, y - r, r * 2, r * 2);
      }
    }
  });
}

export function makeAtmosphereTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(ATM_KEYS.grade)) return;
  // Night grade: deep violet/void toward the top and bottom, clear through the middle where the action reads.
  canvasTexture(scene, ATM_KEYS.grade, 4, 135, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 135);
    g.addColorStop(0, css(0x05060c, 0.72));
    g.addColorStop(0.35, css(0x1a0d26, 0.32));
    g.addColorStop(0.7, css(0x1a0d26, 0.18));
    g.addColorStop(1, css(0x05060c, 0.6));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 135);
  });
  makeFog(scene);
  canvasTexture(scene, ATM_KEYS.rainNear, 2, 16, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 16);
    g.addColorStop(0, 'rgba(200,225,255,0)');
    g.addColorStop(1, 'rgba(200,225,255,0.9)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1, 16);
  });
  canvasTexture(scene, ATM_KEYS.ripple, 16, 6, (ctx) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(8, 3, 6, 1.6, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
  canvasTexture(scene, ATM_KEYS.glint, 24, 3, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 24, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 1, 24, 1);
  });
  canvasTexture(scene, ATM_KEYS.haze, 4, 64, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 64);
  });
  canvasTexture(scene, ATM_KEYS.mote, 3, 3, (ctx) => {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(0, 0, 3, 3);
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.fillRect(1, 1, 1, 1);
  });
}

interface Run {
  x: number;
  y: number;
  w: number;
}

/** Horizontal runs of floor-top surfaces (a solid tile with open air above it). */
export function floorRuns(grid: TileGrid, minTiles = 2): Run[] {
  const runs: Run[] = [];
  for (let r = 1; r < grid.rows; r++) {
    let start = -1;
    for (let c = 0; c <= grid.cols; c++) {
      const top = c < grid.cols && grid.get(c, r) === Tile.Solid && !grid.isSolid(c, r - 1) && grid.get(c, r - 1) !== Tile.Hazard;
      if (top && start < 0) start = c;
      if (!top && start >= 0) {
        if (c - start >= minTiles) runs.push({ x: start * TILE_SIZE, y: r * TILE_SIZE, w: (c - start) * TILE_SIZE });
        start = -1;
      }
    }
  }
  return runs;
}

export class Atmosphere {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly grade: Phaser.GameObjects.Image;
  private readonly fogFar: Phaser.GameObjects.TileSprite;
  private readonly fogNear: Phaser.GameObjects.TileSprite;
  private readonly haze: Phaser.GameObjects.Image;
  private readonly glints: { img: Phaser.GameObjects.Image; run: Run; speed: number; phase: number }[] = [];
  private readonly runs: Run[];
  private readonly emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  /** Lite mode (render scale demoted to 1x by the FPS safety net or chosen by the player): no particles, glints or ripples. */
  private lite = false;
  private rippleClock = 0;
  private lastT = 0;
  private readonly rng: () => number;

  constructor(
    private readonly scene: Phaser.Scene,
    grid: TileGrid,
    seed: number,
    glow: number,
  ) {
    makeAtmosphereTextures(scene);
    this.rng = createRng(seed * 7 + 5);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.objects.push(o);
      return o;
    };

    this.grade = add(scene.add.image(0, 0, ATM_KEYS.grade).setOrigin(0).setDisplaySize(view.width, view.height).setScrollFactor(0).setDepth(D.grade));

    this.fogFar = add(
      scene.add.tileSprite(0, view.height * 0.34, view.width, 64, ATM_KEYS.fog).setOrigin(0).setScrollFactor(0).setDepth(D.fogFar).setTint(0x7a4cc2).setAlpha(0.28).setTileScale(2.4, 1.4),
    );
    this.fogNear = add(
      scene.add.tileSprite(0, view.height * 0.58, view.width, 64, ATM_KEYS.fog).setOrigin(0).setScrollFactor(0).setDepth(D.fogNear).setTint(glow).setAlpha(0.14).setTileScale(3.2, 1.8),
    );
    // Ground haze in front of everything but the HUD, kept faint so silhouettes stay readable.
    this.haze = add(scene.add.image(0, view.height - 64, ATM_KEYS.haze).setOrigin(0).setDisplaySize(view.width, 64).setScrollFactor(0).setDepth(D.haze).setTint(0x1a0d26).setAlpha(0.45));

    // Wet floor: a bright wet edge, a sodium/cyan sheen just under the surface, and slow glints sliding along the run.
    this.runs = floorRuns(grid);
    const rng = this.rng;
    for (const run of this.runs) {
      add(scene.add.rectangle(run.x, run.y, run.w, 1, 0xc9d6ff, 0.38).setOrigin(0).setDepth(D.sheen));
      add(scene.add.image(run.x, run.y + 1, ATM_KEYS.haze).setOrigin(0).setDisplaySize(run.w, 7).setFlipY(true).setTint(glow).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.22).setDepth(D.sheen));
      const n = Math.max(1, Math.round(run.w / 120));
      for (let i = 0; i < n; i++) {
        const tint = rng() < 0.55 ? glow : rng() < 0.5 ? PALETTE.magenta : PALETTE.sodium;
        const img = add(scene.add.image(run.x, run.y + 1, ATM_KEYS.glint).setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(D.sheen + 1));
        this.glints.push({ img, run, speed: 6 + rng() * 10, phase: rng() * 100 });
      }
    }

    // Drifting dust/embers: world space, very slow, additive.
    const w = grid.widthPx;
    const h = grid.heightPx;
    this.emitters.push(
      add(
      scene.add
        .particles(0, 0, ATM_KEYS.mote, {
          x: { min: 0, max: w },
          y: { min: 0, max: h },
          speedX: { min: -6, max: 6 },
          speedY: { min: -9, max: -2 },
          lifespan: { min: 4000, max: 8000 },
          scale: { start: 0.6, end: 0.2 },
          alpha: { start: 0, end: 0, ease: (t: number) => Math.sin(t * Math.PI) * 0.55 },
          tint: [glow, PALETTE.magenta, PALETTE.sodium, 0xc9d6ff],
          blendMode: Phaser.BlendModes.ADD,
          frequency: Math.max(130, 520000 / Math.max(w, 480)),
          quantity: 1,
        })
        .setDepth(D.motes),
      ),
    );
    // Near rain: sparse, longer, brighter streaks falling in front of the playfield.
    this.emitters.push(
      add(
      scene.add
        .particles(0, 0, ATM_KEYS.rainNear, {
          x: { min: -40, max: w },
          y: { min: -20, max: h * 0.55 },
          speedY: { min: 520, max: 640 },
          speedX: { min: 70, max: 95 },
          rotate: -9,
          lifespan: 900,
          alpha: { min: 0.1, max: 0.28 },
          frequency: Math.max(34, 40000 / Math.max(w, 480)),
          quantity: 1,
        })
        .setDepth(D.nearRain),
      ),
    );
  }

  resize(width: number, height: number): void {
    this.grade.setDisplaySize(width, height);
    this.fogFar.setSize(width, 64).setY(height * 0.34);
    this.fogNear.setSize(width, 64).setY(height * 0.58);
    this.haze.setDisplaySize(width, 64).setY(height - 64);
  }

  update(time: number, camera: Phaser.Cameras.Scene2D.Camera, glow: number): void {
    const t = time / 1000;
    const dt = Math.min(0.1, Math.max(0, t - this.lastT));
    this.lastT = t;
    const lite = view.renderScale <= 1;
    if (lite !== this.lite) {
      this.lite = lite;
      for (const e of this.emitters) {
        e.emitting = !lite;
        e.setVisible(!lite);
      }
      for (const g of this.glints) g.img.setVisible(!lite);
    }
    this.fogFar.tilePositionX = t * 5 + camera.scrollX * 0.05;
    this.fogNear.tilePositionX = -t * 9 + camera.scrollX * 0.14;
    this.fogNear.setAlpha(0.12 + Math.sin(t * 0.35) * 0.03);

    for (const g of this.lite ? [] : this.glints) {
      const u = ((t * g.speed + g.phase) % (g.run.w + 60)) - 30;
      g.img.setPosition(g.run.x + u, g.run.y + 1);
      const edge = Math.min(1, Math.max(0, Math.min(u + 30, g.run.w + 30 - u) / 30));
      g.img.setAlpha(0.28 * edge);
    }

    // Rain ripples on the floors currently on screen.
    this.rippleClock -= dt;
    if (this.rippleClock <= 0 && this.runs.length && !this.lite) {
      this.rippleClock = 0.14;
      const x0 = camera.scrollX;
      const x1 = camera.scrollX + camera.width;
      const y0 = camera.scrollY;
      const y1 = camera.scrollY + camera.height;
      const vis = this.runs.filter((r) => r.x < x1 && r.x + r.w > x0 && r.y > y0 && r.y < y1);
      const run = vis[Math.floor(this.rng() * vis.length)];
      if (run) {
        const x = Math.max(run.x + 4, Math.min(run.x + run.w - 4, x0 + this.rng() * (x1 - x0)));
        const img = this.scene.add.image(x, run.y + 2, ATM_KEYS.ripple).setTint(glow).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.55).setScale(0.3, 0.3).setDepth(D.ripple);
        this.scene.tweens.add({ targets: img, scaleX: 1, scaleY: 1, alpha: 0, duration: 520, ease: 'Sine.easeOut', onComplete: () => img.destroy() });
      }
    }
  }

  destroy(): void {
    for (const o of this.objects) o.destroy();
    this.objects.length = 0;
  }
}
