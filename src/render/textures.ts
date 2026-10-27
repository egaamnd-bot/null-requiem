import Phaser from 'phaser';
import { createRng } from '../core/math';
import { css, mix, PALETTE } from './palette';

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
  rain: 'fx-rain',
  ring: 'fx-ring',
  vignette: 'fx-vignette',
  scanlines: 'fx-scanlines',
  slashSide: 'fx-slash-side',
  slashUp: 'fx-slash-up',
  slashDown: 'fx-slash-down',
  bolt: 'proj-bolt',
  shockwave: 'proj-shockwave',
  plasma: 'proj-plasma',
  rainMarker: 'fx-strike-marker',
  relayOff: 'obj-relay-off',
  relayOn: 'obj-relay-on',
  module: 'obj-backtrace-module',
  moduleSpent: 'obj-backtrace-module-spent',
  cell: 'obj-integrity-cell',
  crackedWall: 'tile-cracked',
  bossGate: 'tile-boss-gate',
  laserGate: 'tile-laser-gate',
  switchIdle: 'obj-switch-idle',
  switchLive: 'obj-switch-live',
  hudCellFull: 'hud-cell-full',
  hudCellEmpty: 'hud-cell-empty',
  hudBacktrace: 'hud-backtrace',
  title: 'ui-title-emblem',
  fragment: 'obj-fragment',
  glitchStrikePickup: 'obj-glitch-strike',
} as const;

export const PLAYER_FRAMES = ['idle0', 'idle1', 'run0', 'run1', 'run2', 'run3', 'jump', 'fall', 'dash', 'attack', 'hurt'] as const;
export type PlayerFrame = (typeof PLAYER_FRAMES)[number];
export const playerKey = (f: PlayerFrame): string => `player-${f}`;

export const HOUND_FRAMES = ['walk0', 'walk1', 'windup', 'lunge', 'recover'] as const;
export type HoundFrame = (typeof HOUND_FRAMES)[number];
export const houndKey = (f: HoundFrame): string => `hound-${f}`;

export const DRONE_FRAMES = ['idle0', 'idle1', 'charge'] as const;
export type DroneFrame = (typeof DRONE_FRAMES)[number];
export const droneKey = (f: DroneFrame): string => `drone-${f}`;

export const BULWARK_FRAMES = ['idle', 'windup', 'charge', 'leap', 'stunned', 'dead'] as const;
export type BulwarkFrame = (typeof BULWARK_FRAMES)[number];
export const bulwarkKey = (f: BulwarkFrame): string => `bulwark-${f}`;

export const NPC_KINDS = ['zero', 'mira', 'terminal'] as const;
export type NpcKind = (typeof NPC_KINDS)[number];
export const npcKey = (kind: NpcKind): string => `npc-${kind}`;

export const PANOPTIX_FRAMES = ['idle', 'laser', 'stagger', 'dead'] as const;
export type PanoptixFrame = (typeof PANOPTIX_FRAMES)[number];
export const panoptixKey = (f: PanoptixFrame): string => `panoptix-${f}`;

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
  canvasTexture(scene, TEX.rain, 1, 7, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 7);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,0.9)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1, 7);
  });
  canvasTexture(scene, TEX.ring, 64, 64, (ctx) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(32, 32, 29, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(32, 32, 24, 0, Math.PI * 2);
    ctx.stroke();
  });
  canvasTexture(scene, TEX.vignette, 240, 135, (ctx) => {
    const g = ctx.createRadialGradient(120, 67, 40, 120, 67, 150);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.7, 'rgba(3,4,10,0.35)');
    g.addColorStop(1, 'rgba(3,4,10,0.85)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 240, 135);
  });
  canvasTexture(scene, TEX.scanlines, 4, 4, (ctx) => px(ctx, PALETTE.void, 0, 0, 4, 1, 0.35));

  // Slash arcs: a crescent of cyan light with a white leading edge (a mono-blade cut).
  const crescent = (ctx: Ctx, cx: number, cy: number, r: number, a0: number, a1: number) => {
    ctx.lineCap = 'round';
    ctx.strokeStyle = css(PALETTE.cyanDeep, 0.6);
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 2, a0, a1);
    ctx.stroke();
    ctx.strokeStyle = css(PALETTE.cyan, 0.95);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1);
    ctx.stroke();
    ctx.strokeStyle = css(PALETTE.white, 1);
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
      [0, css(PALETTE.white)],
      [0.35, css(PALETTE.magenta)],
      [0.7, css(PALETTE.magenta, 0.5)],
      [1, css(PALETTE.magenta, 0)],
    ]);
  });
  canvasTexture(scene, TEX.shockwave, 14, 14, (ctx) => {
    // A crackling arc of electricity hugging the floor.
    ctx.strokeStyle = css(PALETTE.sodium, 0.9);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(3, 6);
    ctx.lineTo(6, 10);
    ctx.lineTo(8, 2);
    ctx.lineTo(11, 8);
    ctx.lineTo(14, 14);
    ctx.stroke();
    poly(ctx, PALETTE.sodiumDeep, [[2, 14], [7, 9], [12, 14]], 0.8);
    px(ctx, PALETTE.white, 7, 9, 1, 4);
  });
  canvasTexture(scene, TEX.plasma, 8, 14, (ctx) => {
    poly(ctx, PALETTE.danger, [[4, 0], [8, 9], [4, 14], [0, 9]], 0.85);
    poly(ctx, PALETTE.white, [[4, 5], [6, 9], [4, 12], [2, 9]]);
  });
  canvasTexture(scene, TEX.rainMarker, 18, 6, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 18, 0);
    g.addColorStop(0, css(PALETTE.danger, 0));
    g.addColorStop(0.5, css(PALETTE.danger, 1));
    g.addColorStop(1, css(PALETTE.danger, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 2, 18, 2);
    px(ctx, PALETTE.white, 8, 0, 2, 6);
  });
}

// ---------------------------------------------------------------- player: the Courier

interface CourierPose {
  bob?: number;
  lean?: number;
  flare?: number;
  stride?: number;
  tail?: number;
  visor?: number;
  pale?: boolean;
  stretch?: number;
}

/**
 * The Courier: a lean runner in a hooded, high-collared jacket with a horizontal cyan visor
 * across the face and a long data-cable tail trailing from the collar. Drawn facing right.
 */
function drawCourier(ctx: Ctx, pose: CourierPose): void {
  const H = 28;
  const bob = pose.bob ?? 0;
  const lean = pose.lean ?? 0;
  const flare = pose.flare ?? 0;
  const stride = pose.stride ?? 0;
  const tail = pose.tail ?? 0;
  const stretch = pose.stretch ?? 0;
  const jacket = pose.pale ? PALETTE.chrome : 0x1c2236;
  const hood = pose.pale ? PALETTE.white : 0x262e48;
  const trim = PALETTE.steel;
  const cx = 12 + lean;
  const top = 3 + bob - stretch;
  const footY = H - 2;

  // Legs and boots
  px(ctx, 0x10131f, cx - 3 + stride, footY - 4, 2, 5);
  px(ctx, 0x10131f, cx + 1 - stride, footY - 4, 2, 5);
  px(ctx, PALETTE.steel, cx - 3 + stride, footY, 3, 1, 0.8);
  px(ctx, PALETTE.steel, cx + 1 - stride, footY, 3, 1, 0.8);

  // Jacket: cropped, flares at the hem
  poly(ctx, jacket, [
    [cx - 4, top + 9],
    [cx + 4, top + 9],
    [cx + 5 + flare * 0.6, footY - 4],
    [cx - 5 - flare - lean * 0.4, footY - 4],
  ]);
  px(ctx, trim, cx - 5 - flare, footY - 5, 10 + flare * 1.6, 1, 0.7);
  // Chest light strip
  px(ctx, PALETTE.cyan, cx + 2, top + 12, 1, 4, pose.pale ? 0.4 : 0.85);

  // Hood with a high, squared collar
  poly(ctx, hood, [
    [cx - 5, top + 10],
    [cx - 5, top + 3],
    [cx - 2, top - 1],
    [cx + 3, top - 1],
    [cx + 5, top + 3],
    [cx + 5, top + 10],
  ]);
  // Face shadow and the visor band
  px(ctx, PALETTE.ink, cx - 1, top + 3, 6, 5);
  const visor = pose.visor ?? 1;
  px(ctx, PALETTE.cyan, cx - 1, top + 5, 6, 2, visor);
  px(ctx, PALETTE.white, cx + 3, top + 5, 2, 1, visor * 0.9);
  px(ctx, trim, cx - 5, top + 3, 1, 7, 0.7);

  // Data-cable tail from the collar, glowing at the tip
  ctx.strokeStyle = css(PALETTE.magenta, pose.pale ? 0.4 : 0.9);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 5, top + 8);
  ctx.quadraticCurveTo(cx - 8 - tail, top + 9 - tail * 0.4, cx - 11 - tail, top + 12 - tail * 0.7);
  ctx.stroke();
  px(ctx, PALETTE.magenta, cx - 12 - tail, top + 11 - tail * 0.7, 2, 2, pose.pale ? 0.4 : 1);
}

function makePlayer(scene: Phaser.Scene): void {
  const poses: Record<PlayerFrame, CourierPose> = {
    idle0: { bob: 0, tail: 0 },
    idle1: { bob: 1, tail: 1 },
    run0: { lean: 1, stride: 2, tail: 2, flare: 1 },
    run1: { lean: 1, bob: 1, stride: 0, tail: 3, flare: 0 },
    run2: { lean: 1, stride: -2, tail: 2, flare: 1 },
    run3: { lean: 1, bob: 1, stride: 0, tail: 3, flare: 0 },
    jump: { stretch: 1, flare: -1, tail: 1 },
    fall: { flare: 2, tail: 4, bob: -1 },
    dash: { lean: 3, flare: 2, tail: 6 },
    attack: { lean: 2, stride: 1, tail: 2, flare: 1 },
    hurt: { pale: true, lean: -2, flare: 2, visor: 0.3 },
  };
  for (const f of PLAYER_FRAMES) canvasTexture(scene, playerKey(f), 24, 28, (ctx) => drawCourier(ctx, poses[f]));
}

// ---------------------------------------------------------------- Scrap Hound

function drawHound(ctx: Ctx, f: HoundFrame): void {
  const H = 16;
  const crouch = f === 'windup' ? 2 : 0;
  const flat = f === 'lunge' ? -1 : 0;
  const step = f === 'walk1' ? 1 : 0;
  const eye = f === 'windup' ? PALETTE.white : f === 'recover' ? 0x4a2a30 : PALETTE.danger;
  const body = 0x4a5068;
  const dark = 0x262a3a;
  // Legs (four thin struts)
  for (let i = 0; i < 4; i++) {
    const lx = 5 + i * 4;
    const off = (i + step) % 2;
    px(ctx, dark, lx + off, H - 4 + crouch * 0.5, 1, 4 - crouch * 0.5);
  }
  // Chassis
  poly(ctx, body, [
    [3, H - 4 + crouch],
    [4, 7 + crouch + flat],
    [17, 6 + crouch + flat],
    [20, H - 5 + crouch],
  ]);
  px(ctx, PALETTE.steel, 5, 7 + crouch + flat, 11, 1, 0.9);
  // Hazard plate and exposed coil
  px(ctx, PALETTE.sodium, 7, 9 + crouch + flat, 2, 3, f === 'recover' ? 0.3 : 0.8);
  px(ctx, PALETTE.sodium, 11, 9 + crouch + flat, 2, 3, f === 'recover' ? 0.3 : 0.8);
  // Head with a single sensor eye (front = right)
  px(ctx, dark, 17, 6 + crouch + flat, 6, 5);
  px(ctx, eye, 20, 7 + crouch + flat, 2, 2);
  // Antenna
  px(ctx, PALETTE.steel, 5, 3 + crouch + flat, 1, 4);
  px(ctx, PALETTE.danger, 5, 2 + crouch + flat, 1, 1, f === 'recover' ? 0.3 : 1);
}

function makeHound(scene: Phaser.Scene): void {
  for (const f of HOUND_FRAMES) canvasTexture(scene, houndKey(f), 24, 16, (ctx) => drawHound(ctx, f));
}

// ---------------------------------------------------------------- Watcher Drone

function drawDrone(ctx: Ctx, f: DroneFrame): void {
  const tilt = f === 'idle1' ? 1 : 0;
  const charge = f === 'charge';
  // Rotor arms
  px(ctx, 0x2a3044, 1, 5 + tilt, 18, 2);
  px(ctx, PALETTE.steel, 0, 3 + tilt, 5, 1);
  px(ctx, PALETTE.steel, 15, 3 - tilt + 1, 5, 1);
  // Body shell
  poly(ctx, 0x1c2132, [[4, 7], [16, 7], [15, 16], [5, 16]]);
  px(ctx, PALETTE.steel, 5, 7, 10, 1, 0.8);
  // Magenta ring lights
  px(ctx, PALETTE.magenta, 4, 9, 1, 4, 0.9);
  px(ctx, PALETTE.magenta, 15, 9, 1, 4, 0.9);
  // Lens
  radial(ctx, 10, 12, charge ? 6 : 4, [
    [0, css(PALETTE.white)],
    [0.4, css(charge ? PALETTE.sodium : PALETTE.magenta)],
    [1, css(PALETTE.magenta, 0)],
  ]);
  // Hanging sensor
  px(ctx, PALETTE.steel, 9, 16, 2, 4);
  px(ctx, PALETTE.danger, 9, 20, 2, 1);
}

function makeDrone(scene: Phaser.Scene): void {
  for (const f of DRONE_FRAMES) canvasTexture(scene, droneKey(f), 20, 24, (ctx) => drawDrone(ctx, f));
}

// ---------------------------------------------------------------- BULWARK-9

function drawBulwark(ctx: Ctx, f: BulwarkFrame): void {
  const H = 40;
  const dead = f === 'dead';
  const stunned = f === 'stunned';
  const visor = dead ? 0x2a1a1e : stunned ? 0x5a2030 : f === 'windup' ? PALETTE.white : PALETTE.danger;
  const lean = f === 'charge' ? 3 : 0;
  const crouch = f === 'windup' || f === 'leap' ? 2 : 0;
  const plate = dead ? 0x2e3242 : 0x4c5470;
  const dark = dead ? 0x1c1f2a : 0x2a2f42;

  // Legs: hydraulic pistons
  px(ctx, dark, 12 + lean, H - 7, 7, 7);
  px(ctx, dark, 29 + lean, H - 7, 7, 7);
  px(ctx, PALETTE.steel, 14 + lean, H - 7, 1, 6, dead ? 0.3 : 0.8);
  px(ctx, PALETTE.steel, 31 + lean, H - 7, 1, 6, dead ? 0.3 : 0.8);
  // Torso: boxy armoured shell
  poly(ctx, plate, [
    [8 + lean, H - 6],
    [7 + lean, 13 + crouch],
    [12 + lean, 8 + crouch],
    [36 + lean, 8 + crouch],
    [41 + lean, 13 + crouch],
    [40 + lean, H - 6],
  ]);
  // Hazard stripes across the chest
  for (let x = 12; x < 36; x += 6) {
    poly(ctx, dead ? 0x3a3020 : PALETTE.sodium, [
      [x + lean, 24 + crouch],
      [x + 3 + lean, 24 + crouch],
      [x + 6 + lean, 28 + crouch],
      [x + 3 + lean, 28 + crouch],
    ]);
  }
  px(ctx, dark, 11 + lean, 23 + crouch, 26, 1);
  px(ctx, dark, 11 + lean, 28 + crouch, 26, 1);
  // Head: low dome with a full-width visor
  px(ctx, dark, 16 + lean, 2 + crouch, 16, 8);
  px(ctx, visor, 18 + lean, 5 + crouch, 12, 2);
  if (!dead && !stunned) px(ctx, PALETTE.white, 26 + lean, 5 + crouch, 3, 1);
  // Shoulder lamps
  px(ctx, dead ? 0x2a2a30 : PALETTE.cyan, 8 + lean, 10 + crouch, 3, 2, dead ? 0.4 : 0.9);
  px(ctx, dead ? 0x2a2a30 : PALETTE.cyan, 37 + lean, 10 + crouch, 3, 2, dead ? 0.4 : 0.9);
  // Arms: riot shields
  const armUp = f === 'windup' ? -6 : f === 'leap' ? -8 : 0;
  px(ctx, plate, 1 + lean, 14 + crouch + armUp, 7, 15);
  px(ctx, plate, 40 + lean, 14 + crouch + armUp, 7, 15);
  px(ctx, PALETTE.steel, 1 + lean, 14 + crouch + armUp, 7, 1, 0.9);
  px(ctx, PALETTE.steel, 40 + lean, 14 + crouch + armUp, 7, 1, 0.9);
  px(ctx, PALETTE.chrome, 12 + lean, 8 + crouch, 24, 1, dead ? 0.2 : 0.6);
  if (stunned) {
    // Sparks from the visor
    px(ctx, PALETTE.sodium, 21, 1, 1, 1);
    px(ctx, PALETTE.white, 26, 0, 1, 1);
    px(ctx, PALETTE.sodium, 30, 2, 1, 1);
  }
}

function makeBulwark(scene: Phaser.Scene): void {
  for (const f of BULWARK_FRAMES) canvasTexture(scene, bulwarkKey(f), 48, 40, (ctx) => drawBulwark(ctx, f));
}

// ---------------------------------------------------------------- objects & tiles

function makeObjects(scene: Phaser.Scene): void {
  // Sync relay: a street terminal booth whose screen links when touched.
  const relay = (ctx: Ctx, on: boolean) => {
    px(ctx, 0x1c2132, 3, 4, 10, 28);
    px(ctx, PALETTE.steel, 3, 4, 10, 1);
    px(ctx, 0x0b0d18, 5, 7, 6, 8);
    px(ctx, on ? PALETTE.cyan : PALETTE.magentaDeep, 6, 8, 4, 6, on ? 0.95 : 0.6);
    if (on) {
      px(ctx, PALETTE.white, 6, 10, 4, 1);
      px(ctx, PALETTE.white, 7, 12, 2, 1, 0.7);
    }
    px(ctx, on ? PALETTE.cyan : PALETTE.danger, 7, 18, 2, 1);
    px(ctx, PALETTE.steel, 5, 22, 6, 1, 0.6);
    px(ctx, PALETTE.steel, 5, 25, 6, 1, 0.6);
    px(ctx, 0x10131f, 2, 30, 12, 2);
  };
  canvasTexture(scene, TEX.relayOff, 16, 32, (ctx) => relay(ctx, false));
  canvasTexture(scene, TEX.relayOn, 16, 32, (ctx) => relay(ctx, true));

  // Backtrace module: a pedestal holding a ring-shaped core.
  const module = (ctx: Ctx, spent: boolean) => {
    poly(ctx, 0x2a3044, [[3, 32], [4, 22], [12, 22], [13, 32]]);
    px(ctx, PALETTE.steel, 4, 22, 8, 1);
    const c = spent ? PALETTE.steel : PALETTE.cyan;
    ctx.strokeStyle = css(c, spent ? 0.5 : 1);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(8, 13, 5.5, 0, Math.PI * 2);
    ctx.stroke();
    // A clock hand turned backwards
    ctx.beginPath();
    ctx.moveTo(8, 13);
    ctx.lineTo(5, 10);
    ctx.stroke();
    px(ctx, spent ? PALETTE.steel : PALETTE.white, 7, 12, 2, 2);
  };
  canvasTexture(scene, TEX.module, 16, 32, (ctx) => module(ctx, false));
  canvasTexture(scene, TEX.moduleSpent, 16, 32, (ctx) => module(ctx, true));

  canvasTexture(scene, TEX.cell, 12, 12, (ctx) => {
    px(ctx, PALETTE.steel, 4, 0, 4, 2);
    px(ctx, 0x1c2132, 2, 2, 8, 10);
    px(ctx, PALETTE.cyan, 3, 6, 6, 5);
    px(ctx, PALETTE.white, 4, 7, 1, 3);
    px(ctx, PALETTE.steel, 2, 2, 8, 1);
  });

  canvasTexture(scene, TEX.crackedWall, 16, 16, (ctx) => {
    px(ctx, 0x1f2333, 0, 0, 16, 16);
    px(ctx, 0x2a2f42, 1, 1, 14, 14);
    ctx.strokeStyle = css(PALETTE.steel, 0.9);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(3, 1);
    ctx.lineTo(7, 6);
    ctx.lineTo(5, 10);
    ctx.lineTo(9, 15);
    ctx.moveTo(7, 6);
    ctx.lineTo(13, 8);
    ctx.stroke();
    px(ctx, PALETTE.sodium, 7, 6, 1, 1, 0.6);
  });

  canvasTexture(scene, TEX.bossGate, 16, 16, (ctx) => {
    px(ctx, 0x2a2f42, 0, 0, 16, 16);
    for (let y = 0; y < 16; y += 4) {
      poly(ctx, PALETTE.sodium, [[0, y], [4, y], [8, y + 4], [4, y + 4]], 0.8);
      poly(ctx, PALETTE.sodium, [[8, y], [12, y], [16, y + 4], [12, y + 4]], 0.8);
    }
    px(ctx, PALETTE.ink, 0, 0, 16, 1);
  });

  canvasTexture(scene, TEX.laserGate, 16, 16, (ctx) => {
    for (const x of [3, 8, 13]) {
      px(ctx, PALETTE.magentaDeep, x - 1, 0, 3, 16, 0.5);
      px(ctx, PALETTE.magenta, x, 0, 1, 16);
    }
  });

  const sw = (ctx: Ctx, live: boolean) => {
    px(ctx, PALETTE.steel, 7, 18, 2, 14);
    px(ctx, 0x1c2132, 2, 4, 12, 14);
    px(ctx, PALETTE.steel, 2, 4, 12, 1);
    px(ctx, live ? PALETTE.cyan : PALETTE.danger, 5, 7, 6, 3);
    px(ctx, live ? PALETTE.white : PALETTE.magentaDeep, 6, 12, 4, 3);
    px(ctx, PALETTE.sodium, 4, 16, 8, 1, 0.8);
  };
  canvasTexture(scene, TEX.switchIdle, 16, 32, (ctx) => sw(ctx, false));
  canvasTexture(scene, TEX.switchLive, 16, 32, (ctx) => sw(ctx, true));

  // Memory fragment: translucent crystal shard. 12×12px.
  canvasTexture(scene, TEX.fragment, 12, 12, (ctx) => {
    poly(ctx, PALETTE.cyanDeep, [[6, 0], [12, 5], [9, 12], [3, 12], [0, 5]], 0.9);
    poly(ctx, 0x1a4a5c,         [[6, 1], [11, 5], [8, 11], [4, 11], [1, 5]], 0.8);
    poly(ctx, PALETTE.violet,   [[6, 3], [9, 5],  [7, 10], [5, 10], [3, 5]], 0.6);
    poly(ctx, PALETTE.cyan,     [[6, 0], [9, 4],  [6, 3],  [3, 4]],          0.45);
    px(ctx, PALETTE.white, 5, 1, 3, 2, 0.8);
    px(ctx, PALETTE.white, 6, 5, 1, 2, 0.9);
    px(ctx, PALETTE.white, 5, 6, 2, 1, 0.9);
  });

  // Glitch-strike pickup: magenta lightning bolt on a pedestal. 16×32px.
  canvasTexture(scene, TEX.glitchStrikePickup, 16, 32, (ctx) => {
    // Pedestal base
    poly(ctx, 0x1c2030, [[2, 24], [14, 24], [14, 32], [2, 32]]);
    px(ctx, PALETTE.steel,       2, 24, 12, 1, 0.7);
    px(ctx, PALETTE.magentaDeep, 4, 26,  8, 2, 0.7);
    // Lightning bolt: top-right to bottom-left zigzag (upper 24 px)
    poly(ctx, PALETTE.magentaDeep, [
      [10, 0], [15, 0], [9, 13], [13, 13], [6, 24], [1, 24], [8, 11], [4, 11],
    ], 0.9);
    poly(ctx, PALETTE.magenta, [
      [10, 1], [14, 1], [9, 12], [12, 12], [7, 23], [2, 23], [8, 12], [5, 12],
    ], 0.85);
    px(ctx, PALETTE.white, 10, 2, 3, 3, 0.7);
    px(ctx, PALETTE.white,  8, 12, 2, 2, 0.5);
    radial(ctx, 8, 12, 9, [
      [0,   css(PALETTE.white,   0.25)],
      [0.5, css(PALETTE.magenta, 0.15)],
      [1,   css(PALETTE.magenta, 0)],
    ]);
  });
}

// ---------------------------------------------------------------- NPCs

/** Zero: hooded data-courier, 20×28px. */
function drawNpcZero(ctx: Ctx): void {
  // Hood shell
  poly(ctx, 0x1e2840, [[3, 2], [17, 2], [18, 8], [16, 11], [4, 11], [2, 8]]);
  poly(ctx, 0x2a3850, [[4, 3], [16, 3], [17, 7], [10, 9], [3, 7]]);
  // Cyan visor
  px(ctx, PALETTE.cyanDeep, 6, 5, 8, 2, 0.9);
  px(ctx, PALETTE.cyan,     7, 5, 6, 1, 0.65);
  px(ctx, PALETTE.white,   11, 5, 2, 1, 0.55);
  // Long coat body
  poly(ctx, 0x1a1e2e, [[4, 11], [16, 11], [15, 24], [5, 24]]);
  px(ctx, PALETTE.steel,  4, 11, 12, 1, 0.6);
  px(ctx, 0x282e44,       8, 13,  4, 7, 0.8);
  px(ctx, PALETTE.cyanDeep, 9, 14, 2, 4, 0.5);
  // Data cable from collar
  ctx.strokeStyle = css(PALETTE.magenta, 0.65);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(4, 13);
  ctx.quadraticCurveTo(1, 14, 0, 17);
  ctx.stroke();
  px(ctx, PALETTE.magenta, 0, 17, 2, 2, 0.9);
  // Legs
  px(ctx, 0x121520,  6, 24, 3, 4);
  px(ctx, 0x121520, 11, 24, 3, 4);
  // Boots
  px(ctx, PALETTE.steel,  5, 26, 5, 2, 0.5);
  px(ctx, PALETTE.steel, 10, 26, 5, 2, 0.5);
}

/** Mira: tech-vest smuggler, 20×28px. */
function drawNpcMira(ctx: Ctx): void {
  // Hair
  px(ctx, 0x2e1428,        6, 0, 8, 3);
  px(ctx, PALETTE.magentaDeep, 5, 1, 10, 2, 0.8);
  // Head / face
  px(ctx, 0x806055, 6, 3, 8, 6);
  // Data-jack at temple
  px(ctx, PALETTE.steel,  4, 4, 2, 2);
  px(ctx, PALETTE.violet, 4, 5, 2, 1, 0.9);
  // Eyes
  px(ctx, PALETTE.cyan,  7, 5, 2, 1, 0.9);
  px(ctx, PALETTE.cyan, 11, 5, 2, 1, 0.9);
  // Tech vest body
  poly(ctx, 0x222840, [[4, 9], [16, 9], [15, 24], [5, 24]]);
  px(ctx, PALETTE.magenta, 7, 10, 6, 3, 0.45);
  px(ctx, PALETTE.steel,   4,  9, 12, 1, 0.8);
  px(ctx, 0x1c2032,        8, 13,  4, 5, 0.9);
  // Arms (exposed skin)
  px(ctx, 0x806055,  1, 10, 3, 7);
  px(ctx, 0x806055, 16, 10, 3, 7);
  // Tech bracelet (left wrist)
  px(ctx, PALETTE.violet, 1, 16, 3, 2, 0.9);
  px(ctx, PALETTE.white,  2, 16, 1, 1, 0.5);
  // Legs
  px(ctx, 0x141824,  6, 24, 3, 4);
  px(ctx, 0x141824, 11, 24, 3, 4);
  // Boots with trim
  px(ctx, 0x1a1c28,     5, 26, 5, 2);
  px(ctx, PALETTE.steel, 5, 26, 5, 1, 0.4);
  px(ctx, 0x1a1c28,    10, 26, 5, 2);
  px(ctx, PALETTE.steel, 10, 26, 5, 1, 0.4);
}

/** Ghost Terminal: hovering holographic kiosk, 20×28px. */
function drawNpcTerminal(ctx: Ctx): void {
  // Hover glow underneath chassis
  radial(ctx, 10, 26, 10, [
    [0,   css(PALETTE.violet, 0.4)],
    [0.5, css(PALETTE.violet, 0.15)],
    [1,   css(PALETTE.violet, 0)],
  ]);
  // Terminal chassis
  poly(ctx, 0x161228, [[2, 4], [18, 4], [18, 21], [2, 21]]);
  px(ctx, PALETTE.steel, 2,  4, 16, 1, 0.7);
  px(ctx, PALETTE.steel, 2, 21, 16, 1, 0.7);
  px(ctx, PALETTE.steel, 2,  4,  1, 17, 0.5);
  px(ctx, PALETTE.steel, 17, 4,  1, 17, 0.5);
  // Screen inset
  px(ctx, 0x09071a, 4, 6, 12, 12);
  // Holographic data lines on screen
  px(ctx, PALETTE.violet,  5,  7, 7, 1, 0.8);
  px(ctx, PALETTE.cyan,    5,  9, 5, 1, 0.6);
  px(ctx, PALETTE.violet,  5, 11, 8, 1, 0.7);
  px(ctx, PALETTE.cyan,    5, 13, 4, 1, 0.5);
  px(ctx, PALETTE.magenta, 5, 15, 6, 1, 0.6);
  // Warning exclamation glyph
  px(ctx, PALETTE.magenta, 11,  8, 2, 4, 0.9);
  px(ctx, PALETTE.magenta, 11, 13, 2, 2, 0.9);
  // Corner indicator LEDs
  px(ctx, PALETTE.violet,  2, 2, 2, 2, 0.9);
  px(ctx, PALETTE.violet, 16, 2, 2, 2, 0.9);
  // Floating base bracket
  px(ctx, PALETTE.steel,  5, 22, 10, 2, 0.6);
  px(ctx, PALETTE.violet, 6, 22,  8, 1, 0.5);
}

function makeNpcs(scene: Phaser.Scene): void {
  canvasTexture(scene, npcKey('zero'),     20, 28, drawNpcZero);
  canvasTexture(scene, npcKey('mira'),     20, 28, drawNpcMira);
  canvasTexture(scene, npcKey('terminal'), 20, 28, drawNpcTerminal);
}

// ---------------------------------------------------------------- PANOPTIX-0 boss

function drawPanoptix(ctx: Ctx, f: PanoptixFrame): void {
  const dead    = f === 'dead';
  const stagger = f === 'stagger';
  const laser   = f === 'laser';

  const irisColor   = laser ? PALETTE.danger : stagger ? PALETTE.sodium  : PALETTE.violet;
  const irisInner   = laser ? PALETTE.white  : stagger ? PALETTE.sodium  : PALETTE.cyan;
  const chassisCol  = dead  ? 0x1c1e26      : 0x2e3248;
  const ringCol     = dead  ? 0x1a1c22      : 0x454c6a;
  const legCol      = dead  ? 0x181a22      : 0x3a4058;

  // Eight spider-legs radiating from centre, each bent at a mid-joint
  const legAngles = [22, 67, 112, 157, 202, 247, 292, 337];
  for (const angleDeg of legAngles) {
    const a   = angleDeg * Math.PI / 180;
    const bx  = 32 + Math.cos(a) * 11;
    const by  = 32 + Math.sin(a) * 11;
    const jx  = 32 + Math.cos(a) * 18;
    const jy  = 32 + Math.sin(a) * 18;
    const perp = a + Math.PI / 2 * (angleDeg < 180 ? 1 : -1);
    const ex  = jx + Math.cos(a) * 9 + Math.cos(perp) * 3;
    const ey  = jy + Math.sin(a) * 9 + Math.sin(perp) * 3;
    ctx.strokeStyle = css(legCol, dead ? 0.3 : 0.78);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(jx, jy); ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(jx, jy); ctx.lineTo(ex, ey); ctx.stroke();
    // joint node
    ctx.fillStyle = css(dead ? 0x20222a : PALETTE.steel, dead ? 0.2 : 0.55);
    ctx.fillRect(jx - 1, jy - 1, 2, 2);
    // claw tip
    ctx.fillStyle = css(dead ? 0x12141a : PALETTE.danger, dead ? 0.12 : 0.6);
    ctx.fillRect(ex - 1, ey - 1, 2, 2);
  }

  // Outer armoured ring
  ctx.strokeStyle = css(ringCol, dead ? 0.4 : 0.95);
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(32, 32, 18, 0, Math.PI * 2); ctx.stroke();
  // Ring segment notches
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.strokeStyle = css(dead ? 0x14161e : PALETTE.steel, dead ? 0.08 : 0.42);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(32 + Math.cos(a) * 15, 32 + Math.sin(a) * 15);
    ctx.lineTo(32 + Math.cos(a) * 21, 32 + Math.sin(a) * 21);
    ctx.stroke();
  }

  // Chassis fill inside ring
  ctx.fillStyle = css(chassisCol, dead ? 0.75 : 1);
  ctx.beginPath(); ctx.arc(32, 32, 15, 0, Math.PI * 2); ctx.fill();

  // Iris
  if (!dead) {
    radial(ctx, 32, 32, 13, [
      [0,    css(irisInner, laser ? 0.95 : 0.55)],
      [0.45, css(irisColor, 0.85)],
      [0.85, css(mix(irisColor, PALETTE.void, 0.6), 0.9)],
      [1,    css(chassisCol, 1)],
    ]);
  } else {
    ctx.fillStyle = css(0x080a10, 0.95);
    ctx.beginPath(); ctx.arc(32, 32, 13, 0, Math.PI * 2); ctx.fill();
  }

  // Vertical-slit pupil
  poly(ctx, dead ? 0x060810 : 0x03050a, [
    [32, 32 - 9], [34, 32 - 4], [34, 32 + 4], [32, 32 + 9], [30, 32 + 4], [30, 32 - 4],
  ], dead ? 0.22 : 0.96);
  if (!dead) px(ctx, irisInner, 31, 28, 2, 5, laser ? 0.95 : 0.48);

  // Laser charge glow overlay
  if (laser) {
    radial(ctx, 32, 32, 9, [
      [0,    css(PALETTE.white,  0.95)],
      [0.35, css(PALETTE.danger, 0.65)],
      [0.75, css(PALETTE.danger, 0.2)],
      [1,    css(PALETTE.danger, 0)],
    ]);
  }

  // Stagger: sparks + ring cracks
  if (stagger) {
    for (const [sx, sy] of [[20, 22], [44, 18], [22, 44], [46, 43], [32, 15]] as [number, number][]) {
      px(ctx, PALETTE.sodium, sx,     sy,     2, 1, 0.9);
      px(ctx, PALETTE.white,  sx + 1, sy - 1, 1, 1, 0.65);
    }
    ctx.strokeStyle = css(PALETTE.sodium, 0.45);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(22, 21); ctx.lineTo(27, 26);
    ctx.moveTo(44, 21); ctx.lineTo(39, 27);
    ctx.stroke();
  }

  // Armour caps (top + bottom structural plates)
  const capA = dead ? 0.28 : 0.85;
  px(ctx, chassisCol,                      24, 14, 16, 4, capA);
  px(ctx, chassisCol,                      24, 46, 16, 4, capA);
  px(ctx, dead ? 0x1e202a : PALETTE.steel, 25, 14, 14, 1, dead ? 0.08 : 0.48);
  px(ctx, dead ? 0x1e202a : PALETTE.steel, 25, 46, 14, 1, dead ? 0.08 : 0.48);
}

function makePanoptix(scene: Phaser.Scene): void {
  for (const f of PANOPTIX_FRAMES) canvasTexture(scene, panoptixKey(f), 64, 64, (ctx) => drawPanoptix(ctx, f));
}

function makeHud(scene: Phaser.Scene): void {
  const cell = (ctx: Ctx, full: boolean) => {
    px(ctx, full ? PALETTE.cyanDeep : 0x1c2132, 0, 0, 8, 12);
    if (full) {
      px(ctx, PALETTE.cyan, 1, 1, 6, 10);
      px(ctx, PALETTE.white, 2, 2, 1, 8, 0.8);
    } else {
      ctx.strokeStyle = css(PALETTE.steel, 0.9);
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, 7, 11);
    }
  };
  canvasTexture(scene, TEX.hudCellFull, 8, 12, (ctx) => cell(ctx, true));
  canvasTexture(scene, TEX.hudCellEmpty, 8, 12, (ctx) => cell(ctx, false));
  canvasTexture(scene, TEX.hudBacktrace, 16, 16, (ctx) => {
    ctx.strokeStyle = css(PALETTE.cyan);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(8, 8, 6, Math.PI * 0.15, Math.PI * 1.85);
    ctx.stroke();
    poly(ctx, PALETTE.cyan, [[12, 1], [15, 5], [11, 6]]);
    ctx.beginPath();
    ctx.moveTo(8, 8);
    ctx.lineTo(5, 5);
    ctx.stroke();
    px(ctx, PALETTE.white, 7, 7, 2, 2);
  });
  canvasTexture(scene, TEX.title, 64, 64, (ctx) => {
    radial(ctx, 32, 32, 30, [
      [0, css(PALETTE.cyan, 0.7)],
      [0.35, css(PALETTE.violet, 0.3)],
      [1, css(PALETTE.violet, 0)],
    ]);
    // A broken clock face whose hand points backwards.
    ctx.strokeStyle = css(PALETTE.chrome, 0.95);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(32, 32, 15, -Math.PI * 0.35, Math.PI * 1.45);
    ctx.stroke();
    ctx.strokeStyle = css(PALETTE.cyan);
    ctx.beginPath();
    ctx.moveTo(32, 32);
    ctx.lineTo(23, 24);
    ctx.stroke();
    px(ctx, PALETTE.magenta, 30, 30, 4, 4);
  });
}

// ---------------------------------------------------------------- backgrounds

/** Tileable city backdrop layers: a far skyline with lit windows, and near overpass pillars with signs. */
export function makeBackdrop(scene: Phaser.Scene, key: string, tint: number, layer: 'far' | 'mid', seed: number): void {
  const W = 512;
  const H = 300;
  canvasTexture(scene, key, W, H, (ctx) => {
    const rng = createRng(seed);
    if (layer === 'far') {
      for (let x = 0; x < W; ) {
        const w = 18 + rng() * 34;
        const h = 90 + rng() * 170;
        const top = H - h;
        px(ctx, tint, x, top, w, h, 0.95);
        if (rng() < 0.4) px(ctx, tint, x + w * 0.4, top - 12 - rng() * 14, 2, 26, 0.95); // antenna
        // Windows: sparse lit cells
        for (let wy = top + 6; wy < H - 6; wy += 6) {
          for (let wx = x + 3; wx < x + w - 3; wx += 5) {
            const r = rng();
            if (r < 0.1) px(ctx, PALETTE.sodium, wx, wy, 2, 2, 0.55);
            else if (r < 0.14) px(ctx, PALETTE.cyan, wx, wy, 2, 2, 0.45);
          }
        }
        x += w + 2 + rng() * 6;
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const x = (i / 5) * W + rng() * 40;
        const w = 22 + rng() * 18;
        px(ctx, tint, x, 0, w, H, 0.9);
        // Overpass deck spanning between pillars
        px(ctx, tint, x - 30, 40 + rng() * 30, w + 110, 12, 0.9);
        // Unreadable neon sign blocks (shapes only, no text)
        if (rng() < 0.8) {
          const sc = rng() < 0.5 ? PALETTE.magenta : PALETTE.cyan;
          const sy = 90 + rng() * 120;
          px(ctx, sc, x + 4, sy, w - 8, 2, 0.6);
          for (let k = 0; k < 3; k++) px(ctx, sc, x + 6 + k * ((w - 14) / 3), sy + 5, (w - 18) / 3, 6, 0.35);
          px(ctx, sc, x + 4, sy + 14, w - 8, 2, 0.6);
        }
        px(ctx, mix(tint, PALETTE.white, 0.3), x + 2, 0, 1, H, 0.12);
      }
    }
  });
}

export function makeAllTextures(scene: Phaser.Scene): void {
  makeEffects(scene);
  makePlayer(scene);
  makeHound(scene);
  makeDrone(scene);
  makeBulwark(scene);
  makeNpcs(scene);
  makePanoptix(scene);
  makeObjects(scene);
  makeHud(scene);
}

export { canvasTexture, px, poly, radial };
