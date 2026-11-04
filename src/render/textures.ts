import Phaser from 'phaser';
import { createRng } from '../core/math';
import { applyWorldSize, noteBaseSize } from './assetRuntime';
import { makePlaceholderActors } from './placeholders';
import { makeWorldTextures } from './worldTextures';
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
export const npcKey = (kind: string): string => `npc-${kind}`;

export const PANOPTIX_FRAMES = ['idle', 'laser', 'stagger', 'dead'] as const;
export type PanoptixFrame = (typeof PANOPTIX_FRAMES)[number];
export const panoptixKey = (f: PanoptixFrame): string => `panoptix-${f}`;

function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void): void {
  noteBaseSize(key, w, h);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) throw new Error(`Could not create texture ${key}`);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  tex.refresh();
}

/** Vector sprite drawn at `res`x pixel density; the frame still reports its WORLD size so views, hitboxes and scales are unchanged. */
function hiresTexture(scene: Phaser.Scene, key: string, w: number, h: number, res: number, draw: (ctx: Ctx) => void): void {
  noteBaseSize(key, w, h);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w * res, h * res);
  if (!tex) throw new Error(`Could not create texture ${key}`);
  const ctx = tex.getContext();
  ctx.scale(res, res);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx);
  tex.refresh();
  applyWorldSize(tex, res, w, h);
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
  // 2x vector-rendered Courier: silver hair, long dark coat, magenta scarf and a cyan energy blade.
  // The world simulation remains in logical pixels; the source texture carries finer detail.
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const bob = pose.bob ?? 0;
  const lean = pose.lean ?? 0;
  const flare = pose.flare ?? 0;
  const stride = pose.stride ?? 0;
  const tail = pose.tail ?? 0;
  const stretch = pose.stretch ?? 0;
  const cx = 12 + lean * 0.5;
  const top = 3 + bob - stretch;
  const footY = 27;
  const coat = ctx.createLinearGradient(cx-7,top,cx+7,footY);
  coat.addColorStop(0, pose.pale ? '#f3efff' : '#454064');
  coat.addColorStop(0.48, '#211c3b');
  coat.addColorStop(1, '#101427');
  const metal = ctx.createLinearGradient(cx-5,top,cx+5,footY);
  metal.addColorStop(0,'#f8f4ff'); metal.addColorStop(1,'#7e8bb8');

  // Boots and articulated legs.
  ctx.fillStyle='#111426';
  ctx.beginPath(); ctx.moveTo(cx-4+stride,footY-6); ctx.lineTo(cx-1+stride,footY-6); ctx.lineTo(cx-1,footY-1); ctx.lineTo(cx-6,footY); ctx.lineTo(cx-7,footY-2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx+1-stride,footY-6); ctx.lineTo(cx+4-stride,footY-6); ctx.lineTo(cx+7,footY-2); ctx.lineTo(cx+6,footY); ctx.lineTo(cx+1,footY-1); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#7b8aa9'; ctx.lineWidth=0.8;
  ctx.beginPath();ctx.moveTo(cx-5+stride,footY-1);ctx.lineTo(cx-2+stride,footY-1);ctx.moveTo(cx+2-stride,footY-1);ctx.lineTo(cx+6,footY-1);ctx.stroke();

  // Long split coat, with a flowing asymmetric hem.
  ctx.fillStyle=coat;
  ctx.beginPath();
  ctx.moveTo(cx-5,top+9); ctx.quadraticCurveTo(cx,top+7,cx+5,top+10);
  ctx.lineTo(cx+6+flare*0.45,footY-4); ctx.lineTo(cx+1,footY-7);
  ctx.lineTo(cx-2,footY-3); ctx.lineTo(cx-6-flare*0.4,footY-4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#8c8bbd';ctx.lineWidth=0.65;
  ctx.beginPath();ctx.moveTo(cx-4,top+12);ctx.lineTo(cx-3,footY-6);ctx.moveTo(cx+3,top+12);ctx.lineTo(cx+2,footY-7);ctx.stroke();
  ctx.strokeStyle='#42f5ee';ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(cx+1,top+13);ctx.lineTo(cx+2,top+19);ctx.stroke();

  // Shoulder mantle and magenta scarf, trailing behind the dash.
  ctx.fillStyle='#17162f';
  ctx.beginPath();ctx.moveTo(cx-5,top+9);ctx.lineTo(cx-8,top+14);ctx.lineTo(cx-5,top+19);ctx.lineTo(cx-2,top+12);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#ff57c8';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(cx-5,top+8);ctx.quadraticCurveTo(cx-10-tail*0.45,top+9-tail*0.15,cx-11-tail,top+12-tail*0.25);ctx.stroke();
  ctx.strokeStyle='#ffb4ed';ctx.lineWidth=0.55;
  ctx.beginPath();ctx.moveTo(cx-5,top+9);ctx.quadraticCurveTo(cx-9-tail*0.4,top+10-tail*0.15,cx-11-tail,top+12-tail*0.25);ctx.stroke();

  // Head and high swept silver hair.
  ctx.fillStyle='#14162a';
  ctx.beginPath();ctx.ellipse(cx,top+5,5.2,6.2,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=metal;
  ctx.beginPath();
  ctx.moveTo(cx-5,top+5);ctx.lineTo(cx-6,top+1);ctx.lineTo(cx-2,top+2);
  ctx.lineTo(cx,top-2);ctx.lineTo(cx+1,top+1);ctx.lineTo(cx+5,top-1);
  ctx.lineTo(cx+4,top+3);ctx.lineTo(cx+6,top+5);ctx.lineTo(cx+3,top+7);
  ctx.lineTo(cx-3,top+7);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#ffffff';ctx.lineWidth=0.6;
  ctx.beginPath();ctx.moveTo(cx-3,top+2);ctx.lineTo(cx-1,top);ctx.moveTo(cx+1,top+2);ctx.lineTo(cx+4,top+1);ctx.stroke();
  ctx.fillStyle='#17162b';
  ctx.beginPath();ctx.moveTo(cx-4,top+5);ctx.lineTo(cx+4,top+5);ctx.lineTo(cx+3,top+10);ctx.lineTo(cx-3,top+10);ctx.closePath();ctx.fill();
  ctx.fillStyle=pose.pale?'#ff86d4':'#55fff2';
  ctx.fillRect(cx-2,top+6,5,1.5);
  ctx.fillStyle='#ffffff';ctx.fillRect(cx+1,top+6,1.6,0.7);

  // Visor bloom, coat rim light (cyan from the blade side) and cloth folds for volume at 4x.
  const vg = ctx.createRadialGradient(cx + 0.5, top + 6.7, 0, cx + 0.5, top + 6.7, 5);
  vg.addColorStop(0, pose.pale ? 'rgba(255,134,212,0.45)' : 'rgba(85,255,242,0.45)'); vg.addColorStop(1, 'rgba(85,255,242,0)');
  ctx.fillStyle = vg; ctx.fillRect(cx - 5, top + 2, 11, 10);
  ctx.strokeStyle = pose.pale ? 'rgba(255,255,255,0.5)' : 'rgba(60,242,255,0.7)'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(cx + 5, top + 10); ctx.lineTo(cx + 6 + flare * 0.45, footY - 4); ctx.stroke();
  ctx.strokeStyle = 'rgba(8,8,20,0.55)'; ctx.lineWidth = 0.45;
  ctx.beginPath(); ctx.moveTo(cx - 1, top + 11); ctx.lineTo(cx - 2, footY - 5); ctx.moveTo(cx + 1, top + 12); ctx.lineTo(cx + 1.5, footY - 7); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,87,200,0.6)'; ctx.lineWidth = 0.4; // sodium/magenta bounce on the hem
  ctx.beginPath(); ctx.moveTo(cx - 6 - flare * 0.4, footY - 4); ctx.lineTo(cx - 2, footY - 3); ctx.stroke();

  // Signature mono-blade. It brightens in attack/dash poses.
  const bladeAlpha = pose.pale ? 0.4 : (pose.flare || pose.lean ? 0.98 : 0.75);
  ctx.save();
  ctx.translate(cx+5,top+13);
  ctx.rotate(pose.lean ? -0.58 : 0.22);
  ctx.fillStyle='rgba(78,255,242,0.22)';
  ctx.beginPath();ctx.moveTo(-1.8,0);ctx.lineTo(3.2,0);ctx.lineTo(2.2,11);ctx.lineTo(0,15.4);ctx.lineTo(-1.6,10);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(54,245,239,'+bladeAlpha+')';
  ctx.beginPath();ctx.moveTo(-0.9,0);ctx.lineTo(2.1,0);ctx.lineTo(1.2,11);ctx.lineTo(0,14);ctx.lineTo(-0.7,10);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#f1ffff';ctx.lineWidth=0.7;ctx.beginPath();ctx.moveTo(0,1);ctx.lineTo(0.2,10);ctx.stroke();
  ctx.restore();
  ctx.restore();
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
  for (const f of PLAYER_FRAMES) hiresTexture(scene, playerKey(f), 48, 56, 2, (ctx) => { ctx.scale(2, 2); drawCourier(ctx, poses[f]); });
}

// ---------------------------------------------------------------- Scrap Hound

function drawHound(ctx: Ctx, f: HoundFrame): void {
  const H = 16;
  const crouch = f === 'windup' ? 2.2 : f === 'recover' ? 1.2 : 0;
  const stretch = f === 'lunge' ? 1.6 : 0;
  const dim = f === 'recover';
  const ph = f === 'walk1' ? 1 : f === 'walk0' ? 0 : 0.5;
  const eye = f === 'windup' ? '#ffffff' : dim ? '#5a2a34' : '#ff3b4e';
  const top = 6.4 + crouch - (f === 'lunge' ? 0.8 : 0);

  // Contact shadow-free: legs first. Four digitigrade struts with a knee joint.
  const legs: [number, number][] = [[6, 0], [9, 1], [14, 1], [17, 0]];
  for (const [lx, side] of legs) {
    const sw = f === 'lunge' ? (side ? -2.4 : 2.6) : (side ? 1 : -1) * (ph - 0.5) * 2.6;
    const hipY = top + 5;
    const kneeX = lx + sw * 0.5 + (f === 'lunge' ? -1.2 : 0.8);
    const kneeY = H - 3.6 + crouch * 0.4;
    const footX = lx + sw;
    const footY = f === 'lunge' ? H - 6 : H - 0.6;
    ctx.strokeStyle = side ? '#1a1e2e' : '#323a52';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(lx, hipY); ctx.lineTo(kneeX, kneeY); ctx.lineTo(footX, footY); ctx.stroke();
    ctx.strokeStyle = side ? '#3a4260' : '#6e7aa0';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(lx, hipY); ctx.lineTo(kneeX, kneeY); ctx.stroke();
    ctx.fillStyle = dim ? '#5a2a34' : '#ffb347';
    ctx.beginPath(); ctx.arc(kneeX, kneeY, 0.55, 0, Math.PI * 2); ctx.fill();
  }

  // Chassis: dark armoured wedge with a steel top plate and a sodium hazard band.
  const bodyG = ctx.createLinearGradient(0, top, 0, top + 7);
  bodyG.addColorStop(0, '#7b86a8'); bodyG.addColorStop(0.18, '#4a5270'); bodyG.addColorStop(1, '#1a1e2e');
  ctx.fillStyle = bodyG;
  ctx.beginPath();
  ctx.moveTo(3, top + 6.5); ctx.lineTo(4.2, top + 1.4 - stretch * 0.4); ctx.lineTo(17.5, top - stretch);
  ctx.lineTo(20.2, top + 3); ctx.lineTo(18.5, top + 6.8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(60,242,255,0.85)'; ctx.lineWidth = 0.4; // wet-neon rim on the spine
  ctx.beginPath(); ctx.moveTo(4.4, top + 1.3 - stretch * 0.4); ctx.lineTo(17.4, top - stretch - 0.1); ctx.stroke();
  ctx.fillStyle = dim ? '#5a3a2a' : '#ffb347';
  for (let i = 0; i < 3; i++) { // hazard chevrons
    ctx.beginPath(); ctx.moveTo(6.5 + i * 2.2, top + 3.2); ctx.lineTo(7.7 + i * 2.2, top + 3.2); ctx.lineTo(8.5 + i * 2.2, top + 5.2); ctx.lineTo(7.3 + i * 2.2, top + 5.2); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = '#0c0f1a'; ctx.lineWidth = 0.35; // panel seams
  ctx.beginPath(); ctx.moveTo(12, top + 0.4); ctx.lineTo(12.6, top + 6.6); ctx.moveTo(15.6, top); ctx.lineTo(16, top + 6.2); ctx.stroke();
  // Exposed power coil on the haunch.
  ctx.fillStyle = dim ? 'rgba(255,59,78,0.25)' : 'rgba(255,59,78,0.9)';
  ctx.fillRect(4.6, top + 3, 1.6, 2);

  // Tail antenna with a blinking tip.
  ctx.strokeStyle = '#8f9bbd'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(4.6, top + 1.4); ctx.lineTo(3.2, top - 2.2 + (f === 'windup' ? 1 : 0)); ctx.stroke();
  ctx.fillStyle = dim ? '#5a2a34' : '#ff3b4e';
  ctx.beginPath(); ctx.arc(3.2, top - 2.4, 0.6, 0, Math.PI * 2); ctx.fill();

  // Head: wedge snout, jaw plate, single sensor eye with glow (front = right).
  const jaw = f === 'windup' || f === 'lunge' ? 1.1 : 0.2;
  ctx.fillStyle = '#20253a';
  ctx.beginPath(); ctx.moveTo(17.2, top - stretch - 0.6); ctx.lineTo(23.4, top + 1.6); ctx.lineTo(23.2, top + 3.4 + jaw * 0.4); ctx.lineTo(17.6, top + 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#10131f';
  ctx.beginPath(); ctx.moveTo(18, top + 4); ctx.lineTo(23, top + 3.6 + jaw * 0.4); ctx.lineTo(22 , top + 5.4 + jaw); ctx.lineTo(18.4, top + 5.2 + jaw * 0.6); ctx.closePath(); ctx.fill();
  if (f === 'windup' || f === 'lunge') { // teeth flash while the jaw is open
    ctx.fillStyle = '#e8e8f4';
    for (let i = 0; i < 3; i++) ctx.fillRect(19 + i * 1.3, top + 4.3 + jaw * 0.3, 0.55, 0.9);
  }
  const eg = ctx.createRadialGradient(21, top + 1.7, 0, 21, top + 1.7, f === 'windup' ? 3.4 : 2.4);
  eg.addColorStop(0, eye); eg.addColorStop(0.35, dim ? 'rgba(120,50,60,0.6)' : 'rgba(255,59,78,0.85)'); eg.addColorStop(1, 'rgba(255,59,78,0)');
  ctx.fillStyle = eg; ctx.fillRect(17, top - 2, 8, 8);
  ctx.fillStyle = eye; ctx.fillRect(20.4, top + 1.2, 1.4, 1);
}

function makeHound(scene: Phaser.Scene): void {
  for (const f of HOUND_FRAMES) hiresTexture(scene, houndKey(f), 24, 16, 4, (ctx) => drawHound(ctx, f));
}

// ---------------------------------------------------------------- Watcher Drone

function drawDrone(ctx: Ctx, f: DroneFrame): void {
  const tilt = f === 'idle1' ? 0.6 : 0;
  const charge = f === 'charge';
  const cx = 10;
  // Rotor discs: translucent blur ellipses either side, with a bright leading edge.
  for (const sx of [-1, 1]) {
    const rx = cx + sx * 7.2;
    const ry = 5.2 + (sx > 0 ? -tilt : tilt);
    ctx.fillStyle = 'rgba(143,155,189,0.22)';
    ctx.beginPath(); ctx.ellipse(rx, ry, 3.6, 0.9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(216,225,240,0.8)'; ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(rx - 3.4, ry); ctx.lineTo(rx + 3.4, ry); ctx.stroke();
    ctx.strokeStyle = '#2a3044'; ctx.lineWidth = 1.1; // arm strut
    ctx.beginPath(); ctx.moveTo(cx + sx * 3.6, 8.4); ctx.lineTo(rx, ry + 0.4); ctx.stroke();
  }
  // Shell: rounded armour with steel top light and a violet underside bounce.
  const shell = ctx.createLinearGradient(0, 6, 0, 17);
  shell.addColorStop(0, '#8f9bbd'); shell.addColorStop(0.15, '#3c4560'); shell.addColorStop(0.7, '#1a1f30'); shell.addColorStop(1, '#2a1a3a');
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.moveTo(4.2, 11); ctx.quadraticCurveTo(4.4, 6.6, cx, 6.4); ctx.quadraticCurveTo(15.6, 6.6, 15.8, 11);
  ctx.lineTo(14.2, 16.4); ctx.lineTo(5.8, 16.4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(60,242,255,0.7)'; ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(5, 8.4); ctx.quadraticCurveTo(cx, 6.2, 15, 8.4); ctx.stroke();
  ctx.strokeStyle = '#0c0f1a'; ctx.lineWidth = 0.35; // panel seams
  ctx.beginPath(); ctx.moveTo(6, 9.6); ctx.lineTo(14, 9.6); ctx.moveTo(cx, 7); ctx.lineTo(cx, 9.6); ctx.stroke();
  // Magenta ring lights down both flanks.
  ctx.fillStyle = charge ? '#ffd080' : '#ff3ea5';
  ctx.fillRect(4.2, 10, 0.9, 3.6); ctx.fillRect(14.9, 10, 0.9, 3.6);
  // Lens housing and glowing eye.
  ctx.fillStyle = '#0c0f1a';
  ctx.beginPath(); ctx.arc(cx, 12.2, 3, 0, Math.PI * 2); ctx.fill();
  const lr = charge ? 6.2 : 4;
  const lg = ctx.createRadialGradient(cx, 12.2, 0, cx, 12.2, lr);
  lg.addColorStop(0, '#ffffff'); lg.addColorStop(0.3, charge ? '#ffb347' : '#ff3ea5'); lg.addColorStop(1, 'rgba(255,62,165,0)');
  ctx.fillStyle = lg; ctx.fillRect(cx - lr, 12.2 - lr, lr * 2, lr * 2);
  ctx.strokeStyle = charge ? '#ffd080' : '#5b6480'; ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.arc(cx, 12.2, 3, 0, Math.PI * 2); ctx.stroke();
  // Hanging sensor probe.
  ctx.strokeStyle = '#8f9bbd'; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(cx, 16.4); ctx.lineTo(cx, 20.4); ctx.stroke();
  ctx.fillStyle = '#ff3b4e'; ctx.beginPath(); ctx.arc(cx, 20.8, 0.8, 0, Math.PI * 2); ctx.fill();
}

function makeDrone(scene: Phaser.Scene): void {
  for (const f of DRONE_FRAMES) hiresTexture(scene, droneKey(f), 20, 24, 4, (ctx) => drawDrone(ctx, f));
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
  // High-detail illustrated cyberpunk scenery, deliberately rendered above logical resolution.
  // This is an original procedural art pass: layered violet haze, luminous windows, curved
  // elevated rails and heavy foreground silhouettes, rather than flat pixel-block buildings.
  const W = 960;
  const H = 540;
  canvasTexture(scene, key, W, H, (ctx) => {
    const rng = createRng(seed);
    const glow = (x: number, y: number, r: number, color: string, alpha = 1) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color.replace('ALPHA', String(0.5 * alpha)));
      g.addColorStop(1, color.replace('ALPHA', '0'));
      ctx.fillStyle = g;
      ctx.fillRect(x-r, y-r, r*2, r*2);
    };
    if (layer === 'far') {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#0a0614');
      sky.addColorStop(0.42, '#2a1048');
      sky.addColorStop(0.72, '#9a2a7c');
      sky.addColorStop(1, '#1a0d26');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      glow(735, 148, 240, 'rgba(255,153,231,ALPHA)', 0.8);
      glow(225, 270, 230, 'rgba(91,77,255,ALPHA)', 0.8);
      // Large pale moon / atmospheric light source.
      const moon = ctx.createRadialGradient(740, 145, 12, 740, 145, 120);
      moon.addColorStop(0, 'rgba(255,236,255,0.8)');
      moon.addColorStop(0.72, 'rgba(255,170,240,0.4)');
      moon.addColorStop(1, 'rgba(255,160,245,0)');
      ctx.fillStyle = moon;
      ctx.beginPath(); ctx.arc(740,145,120,0,Math.PI*2); ctx.fill();
      // Far skyline: varied towers, rounded roofs, lit windows and aerial bridges.
      for (let x = -12; x < W + 30;) {
        const w = 28 + rng() * 66;
        const h = 145 + rng() * 260;
        const top = H - h;
        const grad = ctx.createLinearGradient(x, top, x+w, H);
        grad.addColorStop(0, css(mix(tint, 0x9c3eae, 0.52), 0.96));
        grad.addColorStop(1, css(mix(tint, 0x17152f, 0.58), 0.98));
        ctx.fillStyle = grad;
        ctx.beginPath();
        if (rng() > 0.55) {
          ctx.moveTo(x, H); ctx.lineTo(x, top+18); ctx.quadraticCurveTo(x+w*0.5, top-22, x+w, top+18); ctx.lineTo(x+w,H);
        } else {
          ctx.moveTo(x, H); ctx.lineTo(x, top+8); ctx.lineTo(x+w*0.78, top); ctx.lineTo(x+w, top+16); ctx.lineTo(x+w,H);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(231,139,255,0.24)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x+4,top+22); ctx.lineTo(x+4,H); ctx.stroke();
        for (let wy = top+28; wy < H-16; wy += 17+rng()*7) {
          for (let wx = x+7; wx < x+w-7; wx += 13+rng()*5) {
            if (rng() < 0.44) {
              const colors = ['#a6ffbd','#69f5ff','#ffd0fb','#ffb7d7'];
              ctx.fillStyle = colors[Math.floor(rng()*colors.length)] || '#a6ffbd';
              ctx.globalAlpha = 0.35 + rng()*0.55;
              ctx.fillRect(wx, wy, 4+rng()*2, 6+rng()*3);
              ctx.globalAlpha = 1;
            }
          }
        }
        if (rng() < 0.58) {
          ctx.strokeStyle = 'rgba(82,255,224,0.72)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x+w*0.55,top); ctx.lineTo(x+w*0.55,top-26-rng()*26); ctx.stroke();
          glow(x+w*0.55,top-24,22,'rgba(71,255,205,ALPHA)',0.65);
        }
        x += w + 7 + rng()*13;
      }
      // Atmospheric rain and a faint distant elevated transit line.
      ctx.strokeStyle = 'rgba(216,178,255,0.15)'; ctx.lineWidth = 1;
      for (let i=0;i<90;i++) {
        const x=rng()*W, y=rng()*H;
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-7,y+20+rng()*18); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(28,23,57,0.9)'; ctx.lineWidth = 13;
      ctx.beginPath(); ctx.moveTo(0,330); ctx.bezierCurveTo(240,300,440,370,960,305); ctx.stroke();
      ctx.strokeStyle = 'rgba(118,241,232,0.58)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0,320); ctx.bezierCurveTo(240,290,440,360,960,295); ctx.stroke();
    } else {
      // Mid-ground industrial bridges and enormous curved conduits frame the play space.
      const haze = ctx.createLinearGradient(0,0,0,H);
      haze.addColorStop(0,'rgba(173,67,189,0.03)');
      haze.addColorStop(0.6,'rgba(29,25,66,0.30)');
      haze.addColorStop(1,'rgba(5,8,25,0.88)');
      ctx.fillStyle=haze; ctx.fillRect(0,0,W,H);
      for (let i=0;i<7;i++) {
        const x=i*165-60, w=50+rng()*38;
        const grad=ctx.createLinearGradient(x,0,x+w,0);
        grad.addColorStop(0,'rgba(11,17,43,0.88)');
        grad.addColorStop(0.5,'rgba(49,44,91,0.88)');
        grad.addColorStop(1,'rgba(8,13,35,0.96)');
        ctx.fillStyle=grad;
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x+w*0.75,0); ctx.lineTo(x+w,H); ctx.lineTo(x-12,H); ctx.closePath(); ctx.fill();
        ctx.strokeStyle='rgba(89,255,227,0.32)'; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(x+w*0.65,0); ctx.lineTo(x+w*0.88,H); ctx.stroke();
        for(let wy=30;wy<H-30;wy+=48) {
          ctx.fillStyle=rng()>0.5?'rgba(113,255,207,0.72)':'rgba(255,104,213,0.62)';
          ctx.fillRect(x+12,wy,7,18);
        }
      }
      // Heavy elevated walkway, arch ribs and a luminous under-rail.
      ctx.lineCap='round';
      ctx.strokeStyle='rgba(5,10,29,0.96)'; ctx.lineWidth=46;
      ctx.beginPath(); ctx.moveTo(-40,360); ctx.bezierCurveTo(180,315,350,390,510,350); ctx.bezierCurveTo(680,310,820,345,1000,295); ctx.stroke();
      ctx.strokeStyle='rgba(43,57,91,0.98)'; ctx.lineWidth=30;
      ctx.beginPath(); ctx.moveTo(-40,352); ctx.bezierCurveTo(180,307,350,382,510,342); ctx.bezierCurveTo(680,302,820,337,1000,287); ctx.stroke();
      ctx.strokeStyle='rgba(83,255,223,0.75)'; ctx.lineWidth=4;
      ctx.beginPath(); ctx.moveTo(-40,337); ctx.bezierCurveTo(180,292,350,367,510,327); ctx.bezierCurveTo(680,287,820,322,1000,272); ctx.stroke();
      ctx.strokeStyle='rgba(9,14,37,0.98)'; ctx.lineWidth=22;
      ctx.beginPath(); ctx.moveTo(90,540); ctx.bezierCurveTo(165,320,360,315,455,540); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(560,540); ctx.bezierCurveTo(640,350,820,340,920,540); ctx.stroke();
      ctx.strokeStyle='rgba(124,80,169,0.78)'; ctx.lineWidth=7;
      ctx.beginPath(); ctx.moveTo(90,540); ctx.bezierCurveTo(165,320,360,315,455,540); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(560,540); ctx.bezierCurveTo(640,350,820,340,920,540); ctx.stroke();
      // Glowing cables, signal lamps and scattered foreground rain.
      for(let i=0;i<18;i++) {
        const x=rng()*W, y=80+rng()*370;
        const cyan=rng()>0.5;
        // (the glow() helper substitutes ALPHA; a plain rgba() here used to paint a hard square)
        glow(x,y,26,cyan?'rgba(63,255,218,ALPHA)':'rgba(255,72,210,ALPHA)',1.1);
        ctx.fillStyle=cyan?'rgba(150,255,238,0.95)':'rgba(255,150,225,0.9)'; ctx.beginPath(); ctx.arc(x,y,2+rng()*2,0,Math.PI*2); ctx.fill();
      }
      ctx.strokeStyle='rgba(195,207,255,0.22)'; ctx.lineWidth=1;
      for(let i=0;i<65;i++) {
        const x=rng()*W,y=rng()*H;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-5-rng()*4,y+12+rng()*16);ctx.stroke();
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
  makeWorldTextures(scene);
  makePlaceholderActors(scene);
}

export { canvasTexture, px, poly, radial };
