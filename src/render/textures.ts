import Phaser from 'phaser';
import { createRng } from '../core/math';
import { css, PALETTE } from './palette';

/**
 * All placeholder art is generated procedurally at boot from original drawing code.
 * Every texture key below is the seam for swapping in hand-made sprite sheets later:
 * load an image under the same key and the views keep working.
 */

type Ctx = CanvasRenderingContext2D;

export const TEX = {
  glow: 'fx-glow',
  glowSoft: 'fx-glow-soft',
  spark: 'fx-spark',
  mote: 'fx-mote',
  dust: 'fx-dust',
  vignette: 'fx-vignette',
  slashSide: 'fx-slash-side',
  slashUp: 'fx-slash-up',
  slashDown: 'fx-slash-down',
  bolt: 'proj-bolt',
  shockwave: 'proj-shockwave',
  fallingEmber: 'proj-ember',
  rainMarker: 'fx-rain-marker',
  lanternUnlit: 'obj-lantern-unlit',
  lanternLit: 'obj-lantern-lit',
  shrine: 'obj-shrine',
  shrineSpent: 'obj-shrine-spent',
  heartcoal: 'obj-heartcoal',
  crackedWall: 'tile-cracked',
  gate: 'tile-gate',
  hudEmberFull: 'hud-ember-full',
  hudEmberEmpty: 'hud-ember-empty',
  hudVeilstep: 'hud-veilstep',
  title: 'ui-title-emblem',
} as const;

export const PLAYER_FRAMES = ['idle0', 'idle1', 'run0', 'run1', 'run2', 'run3', 'jump', 'fall', 'dash', 'attack', 'hurt'] as const;
export type PlayerFrame = (typeof PLAYER_FRAMES)[number];
export const playerKey = (f: PlayerFrame): string => `player-${f}`;

export const GRUB_FRAMES = ['walk0', 'walk1', 'windup', 'lunge', 'recover'] as const;
export type GrubFrame = (typeof GRUB_FRAMES)[number];
export const grubKey = (f: GrubFrame): string => `ashgrub-${f}`;

export const WISP_FRAMES = ['idle0', 'idle1', 'charge'] as const;
export type WispFrame = (typeof WISP_FRAMES)[number];
export const wispKey = (f: WispFrame): string => `wisp-${f}`;

export const WARDEN_FRAMES = ['idle', 'windup', 'charge', 'leap', 'stunned', 'dead'] as const;
export type WardenFrame = (typeof WARDEN_FRAMES)[number];
export const wardenKey = (f: WardenFrame): string => `warden-${f}`;

function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) throw new Error(`Could not create texture ${key}`);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  tex.refresh();
}

function px(ctx: Ctx, color: number, x: number, y: number, w = 1, h = 1, alpha = 1): void {
  ctx.fillStyle = css(color, alpha);
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function radial(ctx: Ctx, cx: number, cy: number, r: number, stops: [number, string][]): void {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
}

function poly(ctx: Ctx, color: number, pts: [number, number][], alpha = 1): void {
  ctx.fillStyle = css(color, alpha);
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------- effects

function makeEffects(scene: Phaser.Scene): void {
  canvasTexture(scene, TEX.glow, 64, 64, (ctx) =>
    radial(ctx, 32, 32, 32, [
      [0, 'rgba(255,255,255,0.9)'],
      [0.25, 'rgba(255,255,255,0.45)'],
      [0.6, 'rgba(255,255,255,0.12)'],
      [1, 'rgba(255,255,255,0)'],
    ]),
  );
  canvasTexture(scene, TEX.glowSoft, 128, 128, (ctx) =>
    radial(ctx, 64, 64, 64, [
      [0, 'rgba(255,255,255,0.5)'],
      [0.5, 'rgba(255,255,255,0.15)'],
      [1, 'rgba(255,255,255,0)'],
    ]),
  );
  canvasTexture(scene, TEX.spark, 3, 3, (ctx) => {
    px(ctx, PALETTE.white, 1, 0, 1, 3);
    px(ctx, PALETTE.white, 0, 1, 3, 1);
  });
  canvasTexture(scene, TEX.mote, 2, 2, (ctx) => px(ctx, PALETTE.white, 0, 0, 2, 2));
  canvasTexture(scene, TEX.dust, 4, 4, (ctx) => {
    px(ctx, PALETTE.white, 1, 0, 2, 4, 0.8);
    px(ctx, PALETTE.white, 0, 1, 4, 2, 0.8);
  });
  canvasTexture(scene, TEX.vignette, 240, 135, (ctx) => {
    const g = ctx.createRadialGradient(120, 67, 40, 120, 67, 150);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.7, 'rgba(4,3,6,0.35)');
    g.addColorStop(1, 'rgba(4,3,6,0.85)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 240, 135);
  });

  // Slash arcs: crescent of warm light with a pale leading edge.
  const crescent = (ctx: Ctx, cx: number, cy: number, r: number, a0: number, a1: number) => {
    ctx.lineCap = 'round';
    ctx.strokeStyle = css(PALETTE.ember, 0.55);
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 2, a0, a1);
    ctx.stroke();
    ctx.strokeStyle = css(PALETTE.emberBright, 0.9);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1);
    ctx.stroke();
    ctx.strokeStyle = css(PALETTE.bone, 1);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 1.5, a0 + 0.15, a1 - 0.15);
    ctx.stroke();
  };
  canvasTexture(scene, TEX.slashSide, 36, 28, (ctx) => crescent(ctx, 4, 14, 26, -1.15, 1.15));
  canvasTexture(scene, TEX.slashUp, 28, 36, (ctx) => crescent(ctx, 14, 32, 26, -Math.PI + 0.45, -0.45));
  canvasTexture(scene, TEX.slashDown, 28, 36, (ctx) => crescent(ctx, 14, 4, 26, 0.45, Math.PI - 0.45));

  canvasTexture(scene, TEX.bolt, 12, 12, (ctx) => {
    radial(ctx, 6, 6, 6, [
      [0, css(PALETTE.bone)],
      [0.35, css(PALETTE.emberBright)],
      [0.7, css(PALETTE.ember, 0.6)],
      [1, css(PALETTE.ember, 0)],
    ]);
  });
  canvasTexture(scene, TEX.shockwave, 14, 14, (ctx) => {
    poly(ctx, PALETTE.emberDeep, [[0, 14], [3, 5], [6, 9], [8, 1], [11, 7], [14, 14]], 0.9);
    poly(ctx, PALETTE.ember, [[2, 14], [4, 8], [7, 11], [8, 5], [10, 10], [12, 14]]);
    poly(ctx, PALETTE.emberBright, [[5, 14], [7, 10], [9, 14]]);
  });
  canvasTexture(scene, TEX.fallingEmber, 8, 14, (ctx) => {
    poly(ctx, PALETTE.ember, [[4, 0], [8, 9], [4, 14], [0, 9]], 0.85);
    poly(ctx, PALETTE.emberBright, [[4, 4], [6, 9], [4, 12], [2, 9]]);
  });
  canvasTexture(scene, TEX.rainMarker, 18, 6, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 18, 0);
    g.addColorStop(0, css(PALETTE.ember, 0));
    g.addColorStop(0.5, css(PALETTE.emberBright, 1));
    g.addColorStop(1, css(PALETTE.ember, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 2, 18, 2);
    px(ctx, PALETTE.bone, 8, 1, 2, 4);
  });
}

// ---------------------------------------------------------------- player: the Kindler

interface KindlerPose {
  bob?: number;
  lean?: number;
  flare?: number;
  stride?: number;
  scarf?: number;
  eye?: number;
  pale?: boolean;
  stretch?: number;
}

/**
 * The Kindler: a slim wanderer in a long, pointed charcoal hood with a single ember-lit eye
 * and a cinder-red scarf. Drawn facing right; the view flips it.
 */
function drawKindler(ctx: Ctx, pose: KindlerPose): void {
  const W = 24;
  const H = 28;
  const bob = pose.bob ?? 0;
  const lean = pose.lean ?? 0;
  const flare = pose.flare ?? 0;
  const stride = pose.stride ?? 0;
  const scarf = pose.scarf ?? 0;
  const stretch = pose.stretch ?? 0;
  const cloak = pose.pale ? PALETTE.bone : 0x2b2632;
  const hood = pose.pale ? PALETTE.white : 0x3b3442;
  const rim = PALETTE.stone;
  const cx = W / 2 + lean;
  const top = 2 + bob - stretch;

  // Feet / legs (peeking beneath the cloak).
  const footY = H - 2;
  px(ctx, 0x15121a, cx - 3 + stride, footY - 1, 2, 3);
  px(ctx, 0x15121a, cx + 1 - stride, footY - 1, 2, 3);

  // Cloak body: a trapezoid flaring toward the hem.
  poly(ctx, cloak, [
    [cx - 4, top + 9],
    [cx + 4, top + 9],
    [cx + 6 + flare, footY - 1],
    [cx + 2, footY],
    [cx - 2, footY + 0.5],
    [cx - 6 - flare - lean * 0.6, footY - 1],
  ]);
  // Pale stitched hem.
  px(ctx, rim, cx - 5 - flare, footY - 2, 10 + flare * 2, 1, 0.6);

  // Hood: tall point that sweeps backward.
  poly(ctx, hood, [
    [cx - 5, top + 10],
    [cx - 5, top + 5],
    [cx - 3 - lean * 0.5, top - 1],
    [cx - 6 - lean, top - 3],
    [cx + 1, top + 1],
    [cx + 5, top + 5],
    [cx + 5, top + 10],
  ]);
  // Face opening and the single ember eye.
  poly(ctx, PALETTE.ink, [
    [cx - 1, top + 4],
    [cx + 4.5, top + 5],
    [cx + 4.5, top + 9],
    [cx, top + 9],
  ]);
  const eye = pose.eye ?? 1;
  px(ctx, PALETTE.emberBright, cx + 2, top + 6, 2, 2, eye);
  px(ctx, PALETTE.ember, cx + 1, top + 6, 1, 1, eye * 0.6);
  // Hood rim highlight.
  px(ctx, rim, cx + 4, top + 5, 1, 4, 0.8);

  // Scarf: wraps the neck and trails behind.
  px(ctx, PALETTE.emberDeep, cx - 5, top + 9, 10, 2);
  poly(ctx, PALETTE.emberDeep, [
    [cx - 5, top + 9],
    [cx - 10 - scarf, top + 10 - scarf * 0.6],
    [cx - 11 - scarf, top + 12 - scarf * 0.4],
    [cx - 5, top + 11],
  ]);
  px(ctx, PALETTE.ember, cx - 4, top + 9, 3, 1, 0.8);
}

function makePlayer(scene: Phaser.Scene): void {
  const poses: Record<PlayerFrame, KindlerPose> = {
    idle0: { bob: 0, scarf: 0 },
    idle1: { bob: 1, scarf: 1 },
    run0: { lean: 1, stride: 2, scarf: 2, flare: 1 },
    run1: { lean: 1, bob: 1, stride: 0, scarf: 3, flare: 0 },
    run2: { lean: 1, stride: -2, scarf: 2, flare: 1 },
    run3: { lean: 1, bob: 1, stride: 0, scarf: 3, flare: 0 },
    jump: { stretch: 1, flare: -1, scarf: 1 },
    fall: { flare: 3, scarf: 4, bob: -1 },
    dash: { lean: 3, flare: 2, scarf: 6, eye: 1 },
    attack: { lean: 2, stride: 1, scarf: 2, flare: 1 },
    hurt: { pale: true, lean: -2, flare: 2, eye: 0.3 },
  };
  for (const f of PLAYER_FRAMES) canvasTexture(scene, playerKey(f), 24, 28, (ctx) => drawKindler(ctx, poses[f]));
}

// ---------------------------------------------------------------- Ashgrub

function drawAshgrub(ctx: Ctx, f: GrubFrame): void {
  const W = 24;
  const H = 16;
  const rear = f === 'windup' ? 3 : 0;
  const flat = f === 'lunge' ? 2 : 0;
  const core = f === 'windup' ? PALETTE.emberBright : f === 'recover' ? 0x5a3a2e : PALETTE.ember;
  const leg = f === 'walk1' ? 1 : 0;
  // Legs
  for (let i = 0; i < 3; i++) {
    const lx = 6 + i * 5;
    px(ctx, 0x2a2228, lx + ((i + leg) % 2), H - 3, 1, 3);
  }
  // Molten underbelly
  px(ctx, core, 4, H - 6 + flat, W - 8, 3, f === 'recover' ? 0.8 : 1);
  // Carapace dome (pale stone plates)
  poly(ctx, 0x8f8576, [
    [2, H - 4 + flat],
    [4, 6 - rear + flat * 2],
    [10, 3 - rear + flat * 2],
    [17, 4 - rear * 0.5 + flat * 2],
    [22, H - 4 + flat],
  ]);
  poly(ctx, PALETTE.stone, [
    [5, 8 - rear + flat * 2],
    [10, 4 - rear + flat * 2],
    [16, 5 - rear * 0.5 + flat * 2],
    [13, 8 - rear * 0.5 + flat * 2],
  ]);
  // Glowing seams between plates
  const seam = f === 'recover' ? 0x6a4030 : core;
  px(ctx, seam, 9, 5 - rear + flat * 2, 1, H - 9 + rear - flat * 2);
  px(ctx, seam, 15, 5 - rear + flat * 2, 1, H - 9 + rear - flat * 2);
  // Head + single slit eye (front = right)
  px(ctx, 0x3a2f30, 19, H - 8 + flat, 4, 4);
  px(ctx, f === 'windup' ? PALETTE.bone : PALETTE.emberBright, 21, H - 7 + flat, 2, 1);
}

function makeAshgrub(scene: Phaser.Scene): void {
  for (const f of GRUB_FRAMES) canvasTexture(scene, grubKey(f), 24, 16, (ctx) => drawAshgrub(ctx, f));
}

// ---------------------------------------------------------------- Lantern Wisp

function drawWisp(ctx: Ctx, f: WispFrame): void {
  const sway = f === 'idle1' ? 1 : 0;
  const charge = f === 'charge';
  // Tendrils
  ctx.strokeStyle = css(PALETTE.bio, 0.55);
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const x = 6 + i * 4;
    ctx.beginPath();
    ctx.moveTo(x, 13);
    ctx.quadraticCurveTo(x + (i - 1) * 2 + sway, 18, x + sway * (i - 1), 23);
    ctx.stroke();
  }
  // Translucent bell
  poly(ctx, PALETTE.bioDeep, [[2, 13], [3, 6], [10, 1], [17, 6], [18, 13]], 0.75);
  poly(ctx, PALETTE.bio, [[4, 12], [5, 6], [10, 3], [15, 6], [16, 12]], 0.45);
  px(ctx, PALETTE.bone, 7, 4, 3, 1, 0.7);
  // Ember core
  radial(ctx, 10, 9, charge ? 6 : 4, [
    [0, css(PALETTE.bone)],
    [0.4, css(PALETTE.emberBright)],
    [1, css(PALETTE.ember, 0)],
  ]);
  // Rim
  px(ctx, PALETTE.bioDeep, 2, 12, 17, 2, 0.9);
}

function makeWisp(scene: Phaser.Scene): void {
  for (const f of WISP_FRAMES) canvasTexture(scene, wispKey(f), 20, 24, (ctx) => drawWisp(ctx, f));
}

// ---------------------------------------------------------------- Kiln Warden

function drawWarden(ctx: Ctx, f: WardenFrame): void {
  const W = 48;
  const H = 40;
  const dead = f === 'dead';
  const stunned = f === 'stunned';
  const fire = dead ? 0x2a1a16 : stunned ? 0x6a2a18 : f === 'windup' ? PALETTE.emberBright : PALETTE.ember;
  const lean = f === 'charge' ? 3 : 0;
  const crouch = f === 'windup' || f === 'leap' ? 2 : 0;
  const body = dead ? 0x3a332f : 0x5a4e46;
  const brick = dead ? 0x2e2825 : 0x463c36;

  // Legs: stubby stone pillars
  px(ctx, brick, 12 + lean, H - 6, 7, 6);
  px(ctx, brick, 29 + lean, H - 6, 7, 6);
  // Kiln body (domed)
  poly(ctx, body, [
    [8 + lean, H - 5],
    [7 + lean, 16 + crouch],
    [14 + lean, 8 + crouch],
    [34 + lean, 8 + crouch],
    [41 + lean, 16 + crouch],
    [40 + lean, H - 5],
  ]);
  // Brick courses
  for (let y = 12 + crouch; y < H - 6; y += 5) {
    px(ctx, brick, 8 + lean, y, 32, 1);
    for (let x = 10 + ((y / 5) % 2) * 4; x < 39; x += 8) px(ctx, brick, x + lean, y - 4, 1, 4);
  }
  // Furnace grate mouth
  px(ctx, 0x1a1210, 15 + lean, 18 + crouch, 18, 12);
  px(ctx, fire, 16 + lean, 19 + crouch, 16, 10);
  for (let x = 17; x < 32; x += 4) px(ctx, 0x1a1210, x + lean, 19 + crouch, 1, 10);
  if (!dead && !stunned) px(ctx, PALETTE.bone, 18 + lean, 26 + crouch, 12, 1, 0.6);
  // Chimney head with two ember eyes
  px(ctx, brick, 19 + lean, 2 + crouch, 10, 7);
  px(ctx, dead ? 0x221a18 : PALETTE.emberBright, 21 + lean, 4 + crouch, 2, 2);
  px(ctx, dead ? 0x221a18 : PALETTE.emberBright, 25 + lean, 4 + crouch, 2, 2);
  // Arms
  const armUp = f === 'windup' ? -6 : f === 'leap' ? -8 : 0;
  px(ctx, body, 1 + lean, 16 + crouch + armUp, 7, 14);
  px(ctx, body, 40 + lean, 16 + crouch + armUp, 7, 14);
  px(ctx, PALETTE.stone, 1 + lean, 16 + crouch + armUp, 7, 2, 0.7);
  px(ctx, PALETTE.stone, 40 + lean, 16 + crouch + armUp, 7, 2, 0.7);
  // Pale stone cap highlight
  px(ctx, PALETTE.stone, 15 + lean, 8 + crouch, 18, 2, dead ? 0.3 : 0.8);
  if (stunned) {
    // Wisps of smoke
    px(ctx, 0x8a8078, 22, 0, 2, 2, 0.6);
    px(ctx, 0x8a8078, 26, 1, 2, 1, 0.4);
  }
  void W;
}

function makeWarden(scene: Phaser.Scene): void {
  for (const f of WARDEN_FRAMES) canvasTexture(scene, wardenKey(f), 48, 40, (ctx) => drawWarden(ctx, f));
}

// ---------------------------------------------------------------- objects & tiles

function makeObjects(scene: Phaser.Scene): void {
  const lantern = (ctx: Ctx, lit: boolean) => {
    // Iron post and hook
    px(ctx, 0x2a2630, 7, 6, 2, 26);
    px(ctx, 0x2a2630, 4, 30, 8, 2);
    px(ctx, 0x2a2630, 9, 6, 4, 1);
    px(ctx, 0x2a2630, 12, 6, 1, 3);
    // Cage
    px(ctx, 0x3a3440, 9, 9, 7, 9);
    px(ctx, lit ? PALETTE.emberBright : 0x2a2228, 10, 10, 5, 7);
    if (lit) px(ctx, PALETTE.bone, 12, 12, 1, 3);
    px(ctx, 0x3a3440, 12, 10, 1, 7);
    px(ctx, PALETTE.stone, 9, 9, 7, 1, 0.7);
  };
  canvasTexture(scene, TEX.lanternUnlit, 16, 32, (ctx) => lantern(ctx, false));
  canvasTexture(scene, TEX.lanternLit, 16, 32, (ctx) => lantern(ctx, true));

  const shrine = (ctx: Ctx, spent: boolean) => {
    poly(ctx, 0x4a4450, [[2, 32], [3, 6], [8, 1], [13, 6], [14, 32]]);
    poly(ctx, PALETTE.stone, [[4, 30], [4, 7], [8, 3], [12, 7], [12, 30]], spent ? 0.35 : 0.6);
    // Glyph: an ember with two swept veils (wings)
    const c = spent ? 0x6e655a : PALETTE.emberBright;
    px(ctx, c, 7, 12, 2, 4);
    poly(ctx, spent ? 0x4a4450 : PALETTE.bio, [[7, 13], [3, 10], [4, 15]], 0.9);
    poly(ctx, spent ? 0x4a4450 : PALETTE.bio, [[9, 13], [13, 10], [12, 15]], 0.9);
    px(ctx, c, 6, 20, 4, 1, 0.8);
    px(ctx, c, 7, 23, 2, 1, 0.6);
  };
  canvasTexture(scene, TEX.shrine, 16, 32, (ctx) => shrine(ctx, false));
  canvasTexture(scene, TEX.shrineSpent, 16, 32, (ctx) => shrine(ctx, true));

  canvasTexture(scene, TEX.heartcoal, 12, 12, (ctx) => {
    poly(ctx, PALETTE.cinder, [[6, 0], [12, 4], [10, 11], [2, 11], [0, 4]]);
    poly(ctx, PALETTE.emberDeep, [[6, 2], [10, 5], [8, 9], [3, 9], [2, 5]]);
    poly(ctx, PALETTE.ember, [[6, 3], [8, 5], [6, 8], [4, 5]]);
    px(ctx, PALETTE.bone, 5, 4, 1, 1);
  });

  canvasTexture(scene, TEX.crackedWall, 16, 16, (ctx) => {
    px(ctx, 0x1f1b24, 0, 0, 16, 16);
    px(ctx, 0x2a2530, 1, 1, 14, 14);
    ctx.strokeStyle = css(PALETTE.stoneDark, 0.9);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(3, 1);
    ctx.lineTo(7, 6);
    ctx.lineTo(5, 10);
    ctx.lineTo(9, 15);
    ctx.moveTo(7, 6);
    ctx.lineTo(13, 8);
    ctx.stroke();
    px(ctx, PALETTE.ember, 7, 6, 1, 1, 0.5);
  });

  canvasTexture(scene, TEX.gate, 16, 16, (ctx) => {
    for (let x = 1; x < 16; x += 5) {
      px(ctx, 0x3a2a24, x, 0, 3, 16);
      px(ctx, PALETTE.ember, x + 1, 0, 1, 16, 0.55);
    }
    px(ctx, 0x2a1e1a, 0, 7, 16, 2);
  });
}

function makeHud(scene: Phaser.Scene): void {
  const ember = (ctx: Ctx, full: boolean) => {
    poly(ctx, full ? PALETTE.emberDeep : 0x2a2228, [[6, 0], [11, 6], [9, 13], [3, 13], [1, 6]]);
    if (full) {
      poly(ctx, PALETTE.ember, [[6, 3], [9, 7], [8, 11], [4, 11], [3, 7]]);
      poly(ctx, PALETTE.emberBright, [[6, 6], [7, 9], [5, 9]]);
    } else {
      ctx.strokeStyle = css(PALETTE.stoneDark, 0.9);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(6, 0.5);
      ctx.lineTo(11, 6);
      ctx.lineTo(9, 13);
      ctx.lineTo(3, 13);
      ctx.lineTo(1, 6);
      ctx.closePath();
      ctx.stroke();
    }
  };
  canvasTexture(scene, TEX.hudEmberFull, 12, 14, (ctx) => ember(ctx, true));
  canvasTexture(scene, TEX.hudEmberEmpty, 12, 14, (ctx) => ember(ctx, false));
  canvasTexture(scene, TEX.hudVeilstep, 16, 16, (ctx) => {
    poly(ctx, PALETTE.bio, [[8, 8], [1, 3], [3, 12]], 0.9);
    poly(ctx, PALETTE.bio, [[8, 8], [15, 3], [13, 12]], 0.9);
    px(ctx, PALETTE.emberBright, 7, 5, 2, 7);
  });
  canvasTexture(scene, TEX.title, 64, 64, (ctx) => {
    radial(ctx, 32, 32, 30, [
      [0, css(PALETTE.emberBright, 0.9)],
      [0.3, css(PALETTE.ember, 0.4)],
      [1, css(PALETTE.ember, 0)],
    ]);
    poly(ctx, PALETTE.bone, [[32, 14], [38, 30], [32, 48], [26, 30]], 0.9);
    poly(ctx, PALETTE.ember, [[32, 22], [35, 30], [32, 40], [29, 30]]);
  });
}

// ---------------------------------------------------------------- backgrounds

/** Tileable cave backdrop layers (far stalactites, mid pillars), drawn per theme. */
export function makeBackdrop(scene: Phaser.Scene, key: string, tint: number, layer: 'far' | 'mid', seed: number): void {
  const W = 512;
  const H = 300;
  canvasTexture(scene, key, W, H, (ctx) => {
    const rng = createRng(seed);
    if (layer === 'far') {
      for (let x = 0; x < W; ) {
        const w = 10 + rng() * 26;
        const len = 30 + rng() * 110;
        poly(ctx, tint, [[x, 0], [x + w, 0], [x + w * 0.55, len]], 0.9);
        const floorLen = 20 + rng() * 70;
        poly(ctx, tint, [[x + w * 0.2, H], [x + w * 1.2, H], [x + w * 0.7, H - floorLen]], 0.8);
        x += w * (0.6 + rng() * 0.8);
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const x = (i / 6) * W + rng() * 40;
        const w = 18 + rng() * 22;
        px(ctx, tint, x, 0, w, H, 0.85);
        // Arch between pillars
        ctx.fillStyle = css(tint, 0.85);
        ctx.beginPath();
        ctx.ellipse(x + w + 30, 40 + rng() * 30, 50, 26, 0, Math.PI, 0, true);
        ctx.fill();
        px(ctx, 0xffffff, x + 2, 0, 1, H, 0.03);
      }
    }
  });
}

export function makeAllTextures(scene: Phaser.Scene): void {
  makeEffects(scene);
  makePlayer(scene);
  makeAshgrub(scene);
  makeWisp(scene);
  makeWarden(scene);
  makeObjects(scene);
  makeHud(scene);
}

export { canvasTexture, px, poly, radial };
