import type Phaser from 'phaser';
import { noteBaseSize, noteViewScale } from './assetRuntime';
import { css, PALETTE } from './palette';

/** Code-drawn textures for the campaign's interactive objects, pickups and extra HUD icons. */

type Ctx = CanvasRenderingContext2D;

export const WTEX = {
  pickupScrap: 'pickup-scrap',
  pickupUpgrade: 'pickup-upgrade',
  pickupItem: 'pickup-item',
  pickupRecord: 'pickup-record',
  pickupCoil: 'pickup-coil',
  doorClosed: 'obj-door-closed',
  doorOpen: 'obj-door-open',
  plateUp: 'obj-plate-up',
  plateDown: 'obj-plate-down',
  plateEchoUp: 'obj-plate-echo-up',
  plateEchoDown: 'obj-plate-echo-down',
  platformLeft: 'obj-platform-left',
  platformMid: 'obj-platform-mid',
  platformRight: 'obj-platform-right',
  nodeOff: 'obj-node-off',
  nodeOn: 'obj-node-on',
  emitter: 'obj-emitter',
  beamLaser: 'fx-beam-laser',
  beamSteam: 'fx-beam-steam',
  iconScrap: 'icon-scrap',
  ring: 'fx-ring-soft',
  echoMark: 'fx-echo-mark',
  imprintMark: 'fx-imprint-mark',
  telegraphBar: 'fx-telegraph-bar',
} as const;

function tex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void): void {
  noteBaseSize(key, w * 2, h * 2);
  // World textures are drawn at 2x and every view displays them at 0.5.
  noteViewScale(key, 0.5);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const t = scene.textures.createCanvas(key, w * 2, h * 2);
  if (!t) return;
  const ctx = t.getContext();
  ctx.scale(2, 2);
  draw(ctx);
  t.refresh();
}

const fill = (ctx: Ctx, color: number, x: number, y: number, w: number, h: number, a = 1) => {
  ctx.fillStyle = css(color, a);
  ctx.fillRect(x, y, w, h);
};

function circle(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

export function makeWorldTextures(scene: Phaser.Scene): void {
  // --- pickups (12x12 at 1x) ---
  tex(scene, WTEX.pickupScrap, 12, 12, (c) => {
    fill(c, 0xffb02e, 2, 6, 8, 4);
    fill(c, 0xffd070, 3, 4, 5, 3);
    fill(c, 0x8a5a14, 6, 8, 5, 2);
    fill(c, 0xffffff, 4, 4, 1, 1, 0.9);
    c.strokeStyle = css(0xc9c9d8);
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(3, 7);
    c.lineTo(9, 3);
    c.stroke();
  });
  tex(scene, WTEX.pickupUpgrade, 14, 14, (c) => {
    c.fillStyle = css(0x2a1a5a);
    c.beginPath();
    for (let i = 0; i < 6; i++) c.lineTo(7 + Math.cos((i / 6) * Math.PI * 2) * 6, 7 + Math.sin((i / 6) * Math.PI * 2) * 6);
    c.closePath();
    c.fill();
    c.strokeStyle = css(PALETTE.violet);
    c.lineWidth = 1.2;
    c.stroke();
    circle(c, 7, 7, 3, css(PALETTE.cyan));
    circle(c, 7, 7, 1.2, css(0xffffff));
  });
  tex(scene, WTEX.pickupItem, 12, 12, (c) => {
    fill(c, 0x8a8aa0, 2, 4, 8, 6);
    fill(c, 0xc9c9d8, 2, 4, 8, 2);
    fill(c, 0x3a3a50, 5, 4, 2, 6);
    circle(c, 9, 9, 1.2, css(PALETTE.sodium));
  });
  tex(scene, WTEX.pickupRecord, 12, 12, (c) => {
    fill(c, 0xe8dcc8, 2, 1, 8, 10);
    fill(c, 0x7a6a58, 3, 3, 6, 1);
    fill(c, 0x7a6a58, 3, 5, 6, 1);
    fill(c, 0x7a6a58, 3, 7, 4, 1);
    c.strokeStyle = css(PALETTE.violet, 0.9);
    c.lineWidth = 0.8;
    c.strokeRect(1.5, 0.5, 9, 11);
  });
  tex(scene, WTEX.pickupCoil, 16, 32, (c) => {
    fill(c, 0x2a1808, 5, 24, 6, 7);
    c.strokeStyle = css(0xe08a2e);
    c.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.ellipse(8, 8 + i * 4.2, 5, 2, 0, 0, Math.PI * 2);
      c.stroke();
    }
    circle(c, 8, 6, 2, css(PALETTE.cyan));
    fill(c, 0xffffff, 7, 4, 2, 2, 0.8);
  });
  // --- doors (one tile; the game stacks them) ---
  tex(scene, WTEX.doorClosed, 16, 16, (c) => {
    fill(c, 0x2a2a38, 0, 0, 16, 16);
    fill(c, 0x8a8aa0, 0, 0, 2, 16);
    fill(c, 0x8a8aa0, 14, 0, 2, 16);
    for (let y = 0; y < 16; y += 4) fill(c, y % 8 === 0 ? 0xffb02e : 0x14102a, 2, y, 12, 2);
    fill(c, 0xff3b4e, 6, 7, 4, 2);
  });
  tex(scene, WTEX.doorOpen, 16, 16, (c) => {
    fill(c, 0x2a2a38, 0, 0, 2, 16);
    fill(c, 0x2a2a38, 14, 0, 2, 16);
    fill(c, 0x4dff9a, 7, 7, 2, 2, 0.8);
  });
  // --- plates (16x6) ---
  const plate = (key: string, main: number, glow: number, down: boolean) =>
    tex(scene, key, 16, 6, (c) => {
      fill(c, 0x2a2a38, 0, down ? 3 : 1, 16, down ? 3 : 5);
      fill(c, main, 1, down ? 3 : 1, 14, 1.5);
      fill(c, glow, 3, down ? 3.6 : 2.2, 10, 1, down ? 1 : 0.5);
    });
  plate(WTEX.plateUp, 0x8a8aa0, 0x3cf2ff, false);
  plate(WTEX.plateDown, 0x8a8aa0, 0x3cf2ff, true);
  plate(WTEX.plateEchoUp, 0x6a4ac8, 0x9b59ff, false);
  plate(WTEX.plateEchoDown, 0x6a4ac8, 0x9b59ff, true);
  // --- platforms (16x8 segments) ---
  tex(scene, WTEX.platformMid, 16, 8, (c) => {
    fill(c, 0x2a2a38, 0, 2, 16, 4);
    fill(c, 0x8a8aa0, 0, 2, 16, 1.5);
    for (let x = 1; x < 16; x += 3) fill(c, 0x14102a, x, 3, 1, 2);
    fill(c, PALETTE.cyan, 2, 6, 12, 1, 0.8);
  });
  tex(scene, WTEX.platformLeft, 16, 8, (c) => {
    fill(c, 0x2a2a38, 2, 2, 14, 4);
    fill(c, 0x8a8aa0, 2, 2, 14, 1.5);
    fill(c, 0x14102a, 0, 3, 3, 3);
    fill(c, PALETTE.cyan, 4, 6, 12, 1, 0.8);
  });
  tex(scene, WTEX.platformRight, 16, 8, (c) => {
    fill(c, 0x2a2a38, 0, 2, 14, 4);
    fill(c, 0x8a8aa0, 0, 2, 14, 1.5);
    fill(c, 0x14102a, 13, 3, 3, 3);
    fill(c, PALETTE.cyan, 0, 6, 12, 1, 0.8);
  });
  // --- power node ---
  const node = (key: string, on: boolean) =>
    tex(scene, key, 16, 16, (c) => {
      fill(c, 0x2a2a38, 3, 1, 10, 14);
      fill(c, 0x14102a, 5, 3, 6, 10);
      circle(c, 8, 8, 3, on ? css(PALETTE.cyan) : css(0x3a3a50));
      if (on) circle(c, 8, 8, 1.4, css(0xffffff));
    });
  node(WTEX.nodeOff, false);
  node(WTEX.nodeOn, true);
  tex(scene, WTEX.emitter, 16, 16, (c) => {
    fill(c, 0x2a2a38, 2, 2, 12, 12);
    fill(c, 0x8a8aa0, 2, 2, 12, 2);
    circle(c, 8, 9, 3, css(0x14102a));
    circle(c, 8, 9, 1.6, css(PALETTE.danger));
  });
  // --- beams: tiling 16x16 ---
  tex(scene, WTEX.beamLaser, 16, 16, (c) => {
    fill(c, PALETTE.danger, 6, 0, 4, 16, 0.55);
    fill(c, 0xffffff, 7.2, 0, 1.6, 16, 0.95);
  });
  tex(scene, WTEX.beamSteam, 16, 16, (c) => {
    for (let i = 0; i < 6; i++) circle(c, 4 + ((i * 5) % 9), 2 + ((i * 7) % 13), 3, css(0xc9d4ff, 0.35));
    fill(c, 0xffffff, 5, 0, 6, 16, 0.18);
  });
  tex(scene, WTEX.iconScrap, 10, 10, (c) => {
    fill(c, 0xffb02e, 1, 4, 8, 4);
    fill(c, 0xffd070, 2, 2, 5, 3);
    fill(c, 0x8a5a14, 5, 6, 4, 2);
  });
  tex(scene, WTEX.ring, 64, 64, (c) => {
    c.strokeStyle = 'rgba(255,255,255,0.95)';
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(32, 32, 28, 0, Math.PI * 2);
    c.stroke();
    c.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.beginPath();
      c.moveTo(32 + Math.cos(a) * 25, 32 + Math.sin(a) * 25);
      c.lineTo(32 + Math.cos(a) * 31, 32 + Math.sin(a) * 31);
      c.stroke();
    }
  });
  tex(scene, WTEX.echoMark, 32, 32, (c) => {
    c.strokeStyle = css(PALETTE.cyan);
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(16, 16, 12, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.moveTo(16, 16);
    c.lineTo(16, 7);
    c.moveTo(16, 16);
    c.lineTo(22, 19);
    c.stroke();
  });
  tex(scene, WTEX.imprintMark, 32, 16, (c) => {
    c.strokeStyle = css(PALETTE.magenta);
    c.lineWidth = 1.5;
    c.beginPath();
    c.ellipse(16, 8, 14, 5, 0, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.ellipse(16, 8, 7, 2.5, 0, 0, Math.PI * 2);
    c.stroke();
  });
  tex(scene, WTEX.telegraphBar, 16, 16, (c) => {
    for (let i = -2; i < 6; i++) {
      c.fillStyle = css(PALETTE.danger, 0.55);
      c.beginPath();
      c.moveTo(i * 6, 16);
      c.lineTo(i * 6 + 3, 16);
      c.lineTo(i * 6 + 11, 0);
      c.lineTo(i * 6 + 8, 0);
      c.closePath();
      c.fill();
    }
  });
}
