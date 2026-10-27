import Phaser from 'phaser';
import { TILE_SIZE, VIEW } from '../config/tuning';
import { createRng } from '../core/math';
import { Tile, type TileGrid } from '../core/tiles';
import type { GameWorld, RoomState } from '../core/world';
import { css, mix, PALETTE } from './palette';
import { canvasTexture, makeBackdrop, px, TEX } from './textures';

export const DEPTH = {
  sky: -100,
  far: -90,
  mid: -80,
  rain: -70,
  terrain: 0,
  hazardGlow: 2,
  objects: 5,
  enemies: 10,
  echo: 18,
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
  /** Electrical flicker instead of a smooth sine. */
  flicker?: boolean;
}

/** Hash a tile coordinate to a stable pseudo-random number in [0,1). */
function hash(c: number, r: number, salt = 0): number {
  let h = (c * 374761393 + r * 668265263 + salt * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Builds and animates everything static or semi-static about a room: sky, skyline parallax,
 * terrain, live-current hazards, neon trim, relays, the Backtrace module, breakables and gates.
 */
export class RoomView {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly far: Phaser.GameObjects.TileSprite;
  private readonly mid: Phaser.GameObjects.TileSprite;
  private readonly pulses: Pulse[] = [];
  private readonly relays: { id: string; img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image }[] = [];
  private readonly pickups: { id: string; img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image; baseY: number }[] = [];
  private readonly wallTiles = new Map<string, { img: Phaser.GameObjects.Image; x: number }[]>();
  private readonly bossGateTiles: Phaser.GameObjects.Image[] = [];
  private readonly laserTiles: Phaser.GameObjects.Image[] = [];
  private readonly switches: { img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image }[] = [];

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

    // Skyline parallax — kept darker and lower-contrast than the playable terrain.
    makeBackdrop(scene, `far-${id}`, mix(theme.skyTop, theme.rock, 0.45), 'far', id.length * 31 + 7);
    makeBackdrop(scene, `mid-${id}`, mix(theme.skyTop, theme.rock, 0.6), 'mid', id.length * 17 + 3);
    this.far = scene.add.tileSprite(0, 0, VIEW.width, VIEW.height, `far-${id}`).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.far).setAlpha(0.7);
    this.mid = scene.add.tileSprite(0, 0, VIEW.width, VIEW.height, `mid-${id}`).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.mid).setAlpha(0.45);
    this.add(this.far);
    this.add(this.mid);

    const terrainKey = `terrain-${id}`;
    const grid = room.grid;
    canvasTexture(scene, terrainKey, grid.widthPx, grid.heightPx, (ctx) => this.drawTerrain(ctx, grid, room));
    this.add(scene.add.image(0, 0, terrainKey).setOrigin(0).setDepth(DEPTH.terrain));

    this.buildLights(grid, room);
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
    const face = mix(theme.rock, theme.edge, 0.08);
    const deep = mix(theme.rock, PALETTE.void, 0.35);
    const seam = mix(theme.rock, PALETTE.void, 0.45);
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const t = grid.get(c, r);
        const x = c * ts;
        const y = r * ts;
        if (t === Tile.Solid) {
          const enclosed = solid(c, r - 1) && solid(c, r + 1) && solid(c - 1, r) && solid(c + 1, r);
          px(ctx, enclosed ? deep : face, x, y, ts, ts);
          // Concrete panels: seams every 2 tiles, offset per row, plus rivets.
          if (c % 2 === r % 2) px(ctx, seam, x, y, 1, ts, enclosed ? 0.5 : 0.9);
          if (r % 2 === 0) px(ctx, seam, x, y, ts, 1, enclosed ? 0.4 : 0.7);
          if (!enclosed && hash(c, r, 2) < 0.25) px(ctx, theme.edge, x + 3, y + 3, 1, 1, 0.5);
          if (!enclosed && hash(c, r, 5) < 0.12) {
            // Water stains running down
            px(ctx, mix(theme.rock, PALETTE.void, 0.3), x + 4 + Math.floor(hash(c, r, 6) * 8), y, 2, ts, 0.6);
          }
          if (!solid(c, r - 1)) {
            // Exposed top: steel lip with a wet highlight.
            px(ctx, theme.edge, x, y, ts, 2);
            px(ctx, mix(theme.edge, theme.rock, 0.6), x, y + 2, ts, 1);
            if (hash(c, r, 9) < 0.3) px(ctx, PALETTE.white, x + Math.floor(hash(c, r, 4) * 12), y, 3, 1, 0.5);
          }
          if (!solid(c - 1, r)) px(ctx, mix(theme.edge, theme.rock, 0.5), x, y, 1, ts);
          if (!solid(c + 1, r)) px(ctx, mix(theme.edge, theme.rock, 0.5), x + ts - 1, y, 1, ts);
          if (!solid(c, r + 1)) px(ctx, mix(theme.rock, PALETTE.void, 0.6), x, y + ts - 2, ts, 2);
        } else if (t === Tile.OneWay) {
          // Steel catwalk with grating.
          px(ctx, mix(theme.rock, theme.edge, 0.3), x, y, ts, 3);
          px(ctx, theme.edge, x, y, ts, 1);
          for (let gx = 1; gx < ts; gx += 3) px(ctx, PALETTE.void, x + gx, y + 1, 1, 2, 0.6);
          if (c % 4 === 0) px(ctx, mix(theme.rock, PALETTE.void, 0.2), x + 7, y + 3, 2, 6);
        } else if (t === Tile.Hazard) {
          // Flooded live current: dark water, bright arcing surface.
          const g = ctx.createLinearGradient(0, y, 0, y + ts);
          g.addColorStop(0, css(PALETTE.cyanDeep, 0.0));
          g.addColorStop(0.55, css(PALETTE.cyanDeep, 0.45));
          g.addColorStop(1, css(0x0a2a3a, 0.95));
          ctx.fillStyle = g;
          ctx.fillRect(x, y, ts, ts);
          if (grid.get(c, r + 1) !== Tile.Hazard) {
            px(ctx, PALETTE.cyan, x, y + 9, ts, 1, 0.8);
            for (let i = 0; i < 3; i++) {
              const ax = x + 2 + i * 5 + Math.floor(hash(c, r, i) * 3);
              px(ctx, PALETTE.white, ax, y + 4 + Math.floor(hash(c, i) * 4), 1, 5, 0.8);
            }
          }
        }
      }
    }
  }

  private buildLights(grid: TileGrid, room: RoomState): void {
    const theme = room.def.theme;
    const rng = createRng(room.def.id.length * 101);
    let count = 0;
    for (let r = 1; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const t = grid.get(c, r);
        if (t === Tile.Hazard && grid.get(c, r + 1) !== Tile.Hazard) {
          const glow = this.scene.add
            .image((c + 0.5) * TILE_SIZE, (r + 0.6) * TILE_SIZE, TEX.glow)
            .setTint(PALETTE.cyan)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setScale(1.1)
            .setDepth(DEPTH.hazardGlow);
          this.add(glow);
          this.pulses.push({ obj: glow, base: 0.5, amp: 0.25, speed: 18, phase: c * 1.7, flicker: true });
        }
        // Neon strip lights mounted under ledges, and puddle reflections on floors.
        if (count < 60 && grid.get(c, r) === Tile.Solid && !grid.isSolid(c, r + 1) && grid.inBounds(c, r + 1) && grid.get(c, r + 1) !== Tile.Hazard) {
          if (hash(c, r, 3) < 0.07) {
            count++;
            const color = rng() < 0.6 ? theme.glow : PALETTE.magenta;
            const x = c * TILE_SIZE + 2;
            const y = (r + 1) * TILE_SIZE;
            this.add(this.scene.add.rectangle(x, y - 1, 12, 1, color).setOrigin(0).setDepth(DEPTH.terrain + 1));
            const glow = this.scene.add.image(x + 6, y + 4, TEX.glow).setTint(color).setBlendMode(Phaser.BlendModes.ADD).setScale(0.6, 0.35).setDepth(DEPTH.terrain + 1);
            this.add(glow);
            this.pulses.push({ obj: glow, base: 0.45, amp: 0.15, speed: 0.6 + rng(), phase: rng() * 6, flicker: rng() < 0.25 });
          }
        }
        if (count < 60 && grid.get(c, r) === Tile.Solid && !grid.isSolid(c, r - 1) && grid.get(c, r - 1) !== Tile.Hazard && hash(c, r, 8) < 0.06) {
          count++;
          const glow = this.scene.add
            .image(c * TILE_SIZE + 8, r * TILE_SIZE + 1, TEX.glow)
            .setTint(rng() < 0.5 ? PALETTE.magenta : theme.glow)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setScale(0.5, 0.12)
            .setDepth(DEPTH.terrain + 1);
          this.add(glow);
          this.pulses.push({ obj: glow, base: 0.4, amp: 0.1, speed: 0.4, phase: rng() * 6 });
        }
      }
    }
  }

  private buildObjects(room: RoomState): void {
    const s = this.scene;
    for (const cp of room.checkpoints) {
      const img = this.add(s.add.image(cp.feetX, cp.feetY, TEX.relayOff).setOrigin(0.5, 1).setDepth(DEPTH.objects));
      const glow = this.add(
        s.add.image(cp.feetX, cp.feetY - 20, TEX.glowSoft).setTint(PALETTE.cyan).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.objects - 1),
      );
      this.relays.push({ id: cp.id, img, glow });
    }
    for (const p of room.pickups) {
      const cx = p.rect.x + p.rect.w / 2;
      if (p.kind === 'backtrace') {
        const img = this.add(s.add.image(cx, p.rect.y + p.rect.h, TEX.module).setOrigin(0.5, 1).setDepth(DEPTH.objects));
        const glow = this.add(
          s.add.image(cx, p.rect.y + 13, TEX.glowSoft).setTint(PALETTE.cyan).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.objects - 1),
        );
        this.pickups.push({ id: p.id, img, glow, baseY: img.y });
      } else {
        const cy = p.rect.y + p.rect.h / 2;
        const img = this.add(s.add.image(cx, cy, TEX.cell).setDepth(DEPTH.objects));
        const glow = this.add(s.add.image(cx, cy, TEX.glow).setTint(PALETTE.cyan).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.objects - 1));
        this.pickups.push({ id: p.id, img, glow, baseY: cy });
      }
    }
    for (const wall of room.walls) {
      const imgs = wall.tiles.map((t) => {
        const x = t.col * TILE_SIZE;
        return { img: this.add(s.add.image(x, t.row * TILE_SIZE, TEX.crackedWall).setOrigin(0).setDepth(DEPTH.terrain + 1)), x };
      });
      this.wallTiles.set(wall.id, imgs);
    }
    for (const g of room.gates) {
      this.bossGateTiles.push(
        this.add(s.add.image(g.col * TILE_SIZE, g.row * TILE_SIZE, TEX.bossGate).setOrigin(0).setDepth(DEPTH.objects).setVisible(false)),
      );
    }
    if (room.timedGate) {
      for (const t of room.timedGate.tiles) {
        this.laserTiles.push(
          this.add(s.add.image(t.col * TILE_SIZE, t.row * TILE_SIZE, TEX.laserGate).setOrigin(0).setDepth(DEPTH.objects).setBlendMode(Phaser.BlendModes.ADD)),
        );
      }
      const r = room.timedGate.rect;
      this.add(s.add.rectangle(r.x, r.y - 2, r.w, 2, PALETTE.steel).setOrigin(0).setDepth(DEPTH.objects));
    }
    for (const sw of room.switches) {
      const img = this.add(s.add.image(sw.rect.x + sw.rect.w / 2, sw.rect.y + sw.rect.h, TEX.switchIdle).setOrigin(0.5, 1).setDepth(DEPTH.objects));
      const glow = this.add(
        s.add.image(sw.rect.x + sw.rect.w / 2, sw.rect.y + 9, TEX.glow).setBlendMode(Phaser.BlendModes.ADD).setScale(0.6).setDepth(DEPTH.objects - 1),
      );
      this.switches.push({ img, glow });
    }
  }

  update(time: number, camera: Phaser.Cameras.Scene2D.Camera): void {
    const t = time / 1000;
    this.far.tilePositionX = camera.scrollX * 0.12;
    this.far.tilePositionY = camera.scrollY * 0.06;
    this.mid.tilePositionX = camera.scrollX * 0.3;
    this.mid.tilePositionY = camera.scrollY * 0.15;

    for (const p of this.pulses) {
      const v = p.flicker
        ? p.base + (Math.sin(t * p.speed + p.phase) * Math.sin(t * p.speed * 0.37 + p.phase * 2) > 0.2 ? p.amp : -p.amp)
        : p.base + Math.sin(t * p.speed + p.phase) * p.amp;
      p.obj.setAlpha(v);
    }

    const room = this.world.room;
    const cp = this.world.progression.checkpoint;
    for (const l of this.relays) {
      const state = room.checkpoints.find((c) => c.id === l.id);
      const on = !!state && !!cp && cp.roomId === room.def.id && cp.x === state.feetX && cp.y === state.feetY;
      l.img.setTexture(on ? TEX.relayOn : TEX.relayOff);
      l.glow.setVisible(on).setAlpha(0.4 + Math.sin(t * 2.3) * 0.05);
    }
    for (const p of this.pickups) {
      const state = room.pickups.find((x) => x.id === p.id);
      const taken = state?.taken ?? true;
      if (state?.kind === 'backtrace') {
        p.img.setTexture(taken ? TEX.moduleSpent : TEX.module);
        p.glow.setVisible(!taken).setAlpha(0.5 + Math.sin(t * 2) * 0.15);
      } else {
        p.img.setVisible(!taken).setY(p.baseY + Math.sin(t * 2.2) * 1.5);
        p.glow.setVisible(!taken).setAlpha(0.6 + Math.sin(t * 4) * 0.2);
      }
    }
    for (const [id, imgs] of this.wallTiles) {
      const wall = room.walls.find((w) => w.id === id);
      const alive = !!wall && wall.isAlive();
      imgs.forEach(({ img, x }, i) => {
        img.setVisible(alive);
        if (wall && alive) {
          const damaged = 3 - wall.hp;
          img.setTint(mix(0xffffff, PALETTE.sodium, damaged * 0.18));
          img.x = x + (damaged > 0 ? Math.sin(t * 60 + i) * 0.3 * damaged : 0);
        }
      });
    }
    for (const g of this.bossGateTiles) g.setVisible(room.gateClosed);

    const gate = room.timedGate;
    if (gate) {
      // Closing soon: the lasers flicker as a warning.
      const warn = gate.open && !gate.latched && gate.timer < 0.35;
      const showClosed = !gate.open || (warn && Math.floor(t * 20) % 2 === 0);
      for (const l of this.laserTiles) l.setVisible(!gate.latched).setAlpha(showClosed ? 0.8 + Math.sin(t * 30) * 0.15 : 0.12);
      for (const s of this.switches) {
        const live = gate.open && !gate.latched;
        s.img.setTexture(live || gate.latched ? TEX.switchLive : TEX.switchIdle);
        s.glow.setTint(live || gate.latched ? PALETTE.cyan : PALETTE.danger).setAlpha(live ? 0.9 : 0.45 + Math.sin(t * 4) * 0.15);
      }
    }
  }

  destroy(): void {
    for (const o of this.objects) o.destroy();
    this.objects.length = 0;
  }
}
