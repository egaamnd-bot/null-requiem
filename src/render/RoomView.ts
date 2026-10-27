import Phaser from 'phaser';
import { TILE_SIZE, VIEW } from '../config/tuning';
import { Tile, type TileGrid } from '../core/tiles';
import type { GameWorld, RoomState } from '../core/world';
import { createRng } from '../core/math';
import { css, mix, PALETTE } from './palette';
import { canvasTexture, makeBackdrop, poly, px, TEX } from './textures';

export const DEPTH = {
  sky: -100,
  far: -90,
  mid: -80,
  terrain: 0,
  hazardGlow: 2,
  objects: 5,
  enemies: 10,
  player: 20,
  projectiles: 25,
  fx: 30,
  vignette: 100,
} as const;

interface Pulse {
  obj: Phaser.GameObjects.Image;
  base: number;
  amp: number;
  speed: number;
  phase: number;
}

/** Hash a tile coordinate to a stable pseudo-random number in [0,1). */
function hash(c: number, r: number, salt = 0): number {
  let h = (c * 374761393 + r * 668265263 + salt * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Builds and animates everything static or semi-static about a room:
 * sky, parallax, terrain, hazards, bioluminescence, lanterns, shrine, breakables and gates.
 */
export class RoomView {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly far: Phaser.GameObjects.TileSprite;
  private readonly mid: Phaser.GameObjects.TileSprite;
  private readonly pulses: Pulse[] = [];
  private readonly lanterns: { id: string; img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image }[] = [];
  private readonly pickups: { id: string; img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image; baseY: number }[] = [];
  private readonly wallTiles = new Map<string, Phaser.GameObjects.Image[]>();
  private readonly gateTiles: Phaser.GameObjects.Image[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: GameWorld,
  ) {
    const room = world.room;
    const theme = room.def.theme;
    const id = room.def.id;

    // Sky gradient (screen-fixed).
    const skyKey = `sky-${id}`;
    canvasTexture(scene, skyKey, 4, 135, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 135);
      g.addColorStop(0, css(theme.skyTop));
      g.addColorStop(1, css(theme.skyBottom));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 4, 135);
    });
    this.add(scene.add.image(0, 0, skyKey).setOrigin(0).setDisplaySize(VIEW.width, VIEW.height).setScrollFactor(0).setDepth(DEPTH.sky));

    // Parallax layers.
    // Kept deliberately darker and lower-contrast than the playable terrain so the
    // foreground always reads as solid.
    makeBackdrop(scene, `far-${id}`, mix(theme.skyTop, theme.rock, 0.4), 'far', id.length * 31 + 7);
    makeBackdrop(scene, `mid-${id}`, mix(theme.skyTop, theme.rock, 0.55), 'mid', id.length * 17 + 3);
    this.far = scene.add.tileSprite(0, 0, VIEW.width, VIEW.height, `far-${id}`).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.far).setAlpha(0.55);
    this.mid = scene.add.tileSprite(0, 0, VIEW.width, VIEW.height, `mid-${id}`).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.mid).setAlpha(0.35);
    this.add(this.far);
    this.add(this.mid);

    // Terrain baked into one texture.
    const terrainKey = `terrain-${id}`;
    const grid = room.grid;
    canvasTexture(scene, terrainKey, grid.widthPx, grid.heightPx, (ctx) => this.drawTerrain(ctx, grid, room));
    this.add(scene.add.image(0, 0, terrainKey).setOrigin(0).setDepth(DEPTH.terrain));

    this.buildGlows(grid, room);
    this.buildObjects(room);
  }

  private add<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.objects.push(obj);
    return obj;
  }

  private drawTerrain(ctx: CanvasRenderingContext2D, grid: TileGrid, room: RoomState): void {
    const theme = room.def.theme;
    const ts = TILE_SIZE;
    const solid = (c: number, r: number) => grid.get(c, r) === Tile.Solid || !grid.inBounds(c, r);
    const face = mix(theme.rock, theme.edge, 0.1);
    const deep = mix(theme.rock, PALETTE.void, 0.35);
    const strata = mix(theme.rock, theme.edge, 0.2);
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const t = grid.get(c, r);
        const x = c * ts;
        const y = r * ts;
        if (t === Tile.Solid) {
          const enclosed = solid(c, r - 1) && solid(c, r + 1) && solid(c - 1, r) && solid(c + 1, r);
          px(ctx, enclosed ? deep : face, x, y, ts, ts);
          // Layered strata give the rock a readable, solid texture.
          for (let sy = 3 + (r % 2) * 2; sy < ts; sy += 5) {
            const len = 5 + Math.floor(hash(c, r, sy) * 9);
            const sx = Math.floor(hash(r, c, sy) * (ts - len));
            px(ctx, strata, x + sx, y + sy, len, 1, enclosed ? 0.35 : 0.7);
          }
          // Mottled stone.
          for (let i = 0; i < 3; i++) {
            const h = hash(c, r, i);
            px(ctx, mix(theme.rock, PALETTE.void, 0.4), x + Math.floor(h * 14), y + Math.floor(hash(r, c, i) * 14), 2, 1, 0.6);
          }
          if (!solid(c, r - 1)) {
            // Exposed top: pale stone lip.
            px(ctx, theme.edge, x, y, ts, 2);
            px(ctx, mix(theme.edge, theme.rock, 0.6), x, y + 2, ts, 1);
            if (hash(c, r, 9) < 0.35) px(ctx, theme.edge, x + Math.floor(hash(c, r, 4) * 12), y + 2, 3, 1, 0.8);
          }
          if (!solid(c - 1, r)) px(ctx, mix(theme.edge, theme.rock, 0.55), x, y, 1, ts);
          if (!solid(c + 1, r)) px(ctx, mix(theme.edge, theme.rock, 0.55), x + ts - 1, y, 1, ts);
          if (!solid(c, r + 1)) {
            px(ctx, mix(theme.rock, PALETTE.void, 0.6), x, y + ts - 2, ts, 2);
            if (hash(c, r, 7) < 0.3) {
              const dx = x + 3 + Math.floor(hash(c, r, 8) * 9);
              poly(ctx, theme.rock, [[dx, y + ts], [dx + 4, y + ts], [dx + 2, y + ts + 5]]);
            }
          }
        } else if (t === Tile.OneWay) {
          px(ctx, mix(theme.rock, theme.edge, 0.25), x, y, ts, 4);
          px(ctx, theme.edge, x, y, ts, 1);
          px(ctx, mix(theme.rock, PALETTE.void, 0.3), x, y + 4, ts, 1);
          if (c % 3 === 0) px(ctx, mix(theme.rock, PALETTE.void, 0.2), x + 6, y + 5, 3, 4);
        } else if (t === Tile.Hazard) {
          const g = ctx.createLinearGradient(0, y, 0, y + ts);
          g.addColorStop(0, css(PALETTE.emberDeep, 0.0));
          g.addColorStop(0.6, css(PALETTE.emberDeep, 0.55));
          g.addColorStop(1, css(PALETTE.ember, 0.9));
          ctx.fillStyle = g;
          ctx.fillRect(x, y, ts, ts);
          if (grid.get(c, r + 1) !== Tile.Hazard) {
            // Bed of coals.
            for (let i = 0; i < 4; i++) {
              const cx = x + i * 4 + Math.floor(hash(c, r, i) * 3);
              poly(ctx, i % 2 ? PALETTE.emberBright : PALETTE.ember, [[cx, y + ts], [cx + 2, y + ts - 6 - hash(c, i) * 5], [cx + 4, y + ts]]);
            }
          }
        }
      }
    }
  }

  private buildGlows(grid: TileGrid, room: RoomState): void {
    const theme = room.def.theme;
    const rng = createRng(room.def.id.length * 101);
    let count = 0;
    for (let r = 1; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const t = grid.get(c, r);
        if (t === Tile.Hazard && grid.get(c, r + 1) !== Tile.Hazard) {
          const glow = this.scene.add
            .image((c + 0.5) * TILE_SIZE, (r + 0.6) * TILE_SIZE, TEX.glow)
            .setTint(PALETTE.ember)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setScale(1.1)
            .setDepth(DEPTH.hazardGlow);
          this.add(glow);
          this.pulses.push({ obj: glow, base: 0.55, amp: 0.2, speed: 2.4, phase: c * 0.7 });
        }
        if (count < 70 && grid.get(c, r) === Tile.Solid && !grid.isSolid(c, r - 1) && grid.get(c, r - 1) !== Tile.Hazard) {
          if (hash(c, r, 3) < 0.09) {
            count++;
            const x = c * TILE_SIZE + 4 + rng() * 8;
            const y = r * TILE_SIZE;
            // Tiny fungal caps + their glow.
            const cap = this.scene.add.image(x, y - 1, TEX.mote).setTint(theme.glow).setDepth(DEPTH.terrain + 1);
            const glow = this.scene.add.image(x, y - 2, TEX.glow).setTint(theme.glow).setBlendMode(Phaser.BlendModes.ADD).setScale(0.45).setDepth(DEPTH.terrain + 1);
            this.add(cap);
            this.add(glow);
            this.pulses.push({ obj: glow, base: 0.35, amp: 0.2, speed: 0.8 + rng(), phase: rng() * 6 });
          }
        }
      }
    }
  }

  private buildObjects(room: RoomState): void {
    const s = this.scene;
    for (const cp of room.checkpoints) {
      const img = this.add(s.add.image(cp.feetX, cp.feetY, TEX.lanternUnlit).setOrigin(0.5, 1).setDepth(DEPTH.objects));
      const glow = this.add(
        s.add.image(cp.feetX + 4, cp.feetY - 18, TEX.glowSoft).setTint(PALETTE.ember).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.objects - 1),
      );
      this.lanterns.push({ id: cp.id, img, glow });
    }
    for (const p of room.pickups) {
      const cx = p.rect.x + p.rect.w / 2;
      if (p.kind === 'veilstep') {
        const img = this.add(s.add.image(cx, p.rect.y + p.rect.h, TEX.shrine).setOrigin(0.5, 1).setDepth(DEPTH.objects));
        const glow = this.add(
          s.add.image(cx, p.rect.y + 14, TEX.glowSoft).setTint(PALETTE.bio).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.objects - 1),
        );
        this.pickups.push({ id: p.id, img, glow, baseY: img.y });
      } else {
        const cy = p.rect.y + p.rect.h / 2;
        const img = this.add(s.add.image(cx, cy, TEX.heartcoal).setDepth(DEPTH.objects));
        const glow = this.add(s.add.image(cx, cy, TEX.glow).setTint(PALETTE.emberDeep).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.objects - 1));
        this.pickups.push({ id: p.id, img, glow, baseY: cy });
      }
    }
    for (const wall of room.walls) {
      const imgs = wall.tiles.map((t) =>
        this.add(s.add.image(t.col * TILE_SIZE, t.row * TILE_SIZE, TEX.crackedWall).setOrigin(0).setDepth(DEPTH.terrain + 1)),
      );
      this.wallTiles.set(wall.id, imgs);
    }
    for (const g of room.gates) {
      this.gateTiles.push(
        this.add(s.add.image(g.col * TILE_SIZE, g.row * TILE_SIZE, TEX.gate).setOrigin(0).setDepth(DEPTH.objects).setVisible(false)),
      );
    }
  }

  update(time: number, camera: Phaser.Cameras.Scene2D.Camera): void {
    const t = time / 1000;
    this.far.tilePositionX = camera.scrollX * 0.15;
    this.far.tilePositionY = camera.scrollY * 0.08;
    this.mid.tilePositionX = camera.scrollX * 0.35;
    this.mid.tilePositionY = camera.scrollY * 0.18;

    for (const p of this.pulses) p.obj.setAlpha(p.base + Math.sin(t * p.speed + p.phase) * p.amp);

    const room = this.world.room;
    const cp = this.world.progression.checkpoint;
    for (const l of this.lanterns) {
      const state = room.checkpoints.find((c) => c.id === l.id);
      const lit = !!state && !!cp && cp.roomId === room.def.id && cp.x === state.feetX && cp.y === state.feetY;
      l.img.setTexture(lit ? TEX.lanternLit : TEX.lanternUnlit);
      l.glow.setVisible(lit).setAlpha(0.55 + Math.sin(t * 3.1) * 0.08 + Math.sin(t * 7.3) * 0.04);
    }
    for (const p of this.pickups) {
      const state = room.pickups.find((x) => x.id === p.id);
      const taken = state?.taken ?? true;
      if (state?.kind === 'veilstep') {
        p.img.setTexture(taken ? TEX.shrineSpent : TEX.shrine);
        p.glow.setVisible(!taken).setAlpha(0.5 + Math.sin(t * 2) * 0.15);
      } else {
        p.img.setVisible(!taken).setY(p.baseY + Math.sin(t * 2.2) * 1.5);
        p.glow.setVisible(!taken).setAlpha(0.6 + Math.sin(t * 4) * 0.2);
      }
    }
    for (const [id, imgs] of this.wallTiles) {
      const wall = room.walls.find((w) => w.id === id);
      const alive = !!wall && wall.isAlive();
      imgs.forEach((img, i) => {
        img.setVisible(alive);
        if (wall && alive) {
          const damaged = 3 - wall.hp;
          img.setTint(mix(0xffffff, PALETTE.ember, damaged * 0.18));
          img.x = room.grid.colAt(img.x + 1) * TILE_SIZE + (damaged > 0 ? Math.sin(t * 60 + i) * 0.3 * damaged : 0);
        }
      });
    }
    for (const g of this.gateTiles) g.setVisible(room.gateClosed).setAlpha(0.85 + Math.sin(t * 8) * 0.1);
  }

  destroy(): void {
    for (const o of this.objects) o.destroy();
    this.objects.length = 0;
  }
}
