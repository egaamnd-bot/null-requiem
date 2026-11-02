import Phaser from 'phaser';
import { ASSETS } from '../assets/manifest';
import type { AssetDef, PlaceholderShape } from '../assets/types';
import { css } from './palette';

/**
 * Procedural placeholder actors, generated at boot from the asset manifest.
 *
 * Every placeholder has a distinct silhouette and colour code so gameplay stays readable before final art:
 *   scavenger = orange rags + spike, enforcer = broad blue plate, stalker = violet shroud, turret = red-lens pod,
 *   echo = cyan static ghost, KILN-7 = ember furnace, THE NULL = void silhouette with a ring of erased minutes.
 * They are drawn at 2x so they stay crisp on phones. Final art replaces the same texture keys.
 */

export const PLACEHOLDER_RES = 2;

type Ctx = CanvasRenderingContext2D;

interface Pose {
  /** Vertical bob in px. */
  bob: number;
  /** Lean in px (positive = forward). */
  lean: number;
  /** 0..1 raised-weapon amount. */
  raise: number;
  /** 0..1 strike extension. */
  strike: number;
  /** 0..1 body flash (white). */
  flash: number;
  alpha: number;
  /** 0..1 fallen/dissolved (death). */
  fall: number;
  /** 0..1 armour/shell open (vent, exposed). */
  open: number;
  /** Walk phase 0..1. */
  step: number;
  /** Glitch slice offset in px. */
  glitch: number;
  /** Talking mouth/arm flick. */
  talk: number;
}

const BASE: Pose = { bob: 0, lean: 0, raise: 0, strike: 0, flash: 0, alpha: 1, fall: 0, open: 0, step: 0, glitch: 0, talk: 0 };

/** Turn (anim name, frame, frames) into a pose. Names are matched loosely so every asset gets sensible variety. */
function poseFor(anim: string, i: number, n: number): Pose {
  const t = n > 1 ? i / (n - 1) : 0;
  const p = { ...BASE };
  const a = anim.toLowerCase();
  if (/idle|lurk|float|neutral/.test(a)) p.bob = i % 2 === 0 ? 0 : -1;
  else if (/walk|run/.test(a)) {
    p.step = i / n;
    p.bob = i % 2 === 0 ? 0 : -1;
    p.lean = 1;
  } else if (/windup|telegraph|lock/.test(a)) {
    p.raise = 0.5 + 0.5 * t;
    p.lean = -1;
  } else if (/strike|slam|attack|fire|active/.test(a)) {
    p.strike = 1;
    p.lean = 2;
    p.flash = i === 0 ? 0.5 : 0;
  } else if (/recover|vent|exposed|stunned/.test(a)) {
    p.open = 1;
    p.lean = -1;
  } else if (/hurt/.test(a)) {
    p.flash = 0.9;
    p.lean = -2;
  } else if (/death|dead|unravel/.test(a)) {
    p.fall = (i + 1) / n;
    p.alpha = 1 - 0.6 * p.fall;
  } else if (/blink|rewind/.test(a)) {
    p.alpha = i === 1 ? 0.25 : 0.6;
    p.glitch = 3;
  } else if (/talk/.test(a)) {
    p.talk = i % 2 === 0 ? 1 : 0;
  }
  return p;
}

const rgb = (c: number, a = 1) => css(c, a);
const mixc = (a: number, b: number, t: number): number => {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
};

function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawHumanoid(ctx: Ctx, W: number, H: number, c: readonly [number, number, number], p: Pose, kind: 'scavenger' | 'npc'): void {
  const [main, accent, glow] = c;
  const body = rgb(mixc(main, 0xffffff, p.flash * 0.7));
  const dark = rgb(mixc(main, 0x000000, 0.5));
  const cx = W / 2 + p.lean * 0.5;
  const feet = H - 1;
  const legSwing = Math.sin(p.step * Math.PI * 2) * 3;
  // legs
  rect(ctx, cx - 4 + legSwing, feet - 9, 3, 9, dark);
  rect(ctx, cx + 1 - legSwing, feet - 9, 3, 9, dark);
  // torso
  const ty = feet - 20 + p.bob;
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(cx - 6, ty);
  ctx.lineTo(cx + 6, ty);
  ctx.lineTo(cx + 5, ty + 12);
  ctx.lineTo(cx - 5, ty + 12);
  ctx.closePath();
  ctx.fill();
  // coat hem / accent band
  rect(ctx, cx - 5, ty + 9, 10, 2, rgb(accent));
  // head + hood
  ellipse(ctx, cx + p.lean * 0.4, ty - 3, 4.5, 4.5, rgb(mixc(main, 0xe8dcc8, 0.25)));
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(cx + p.lean * 0.4, ty - 4, 5, Math.PI, 0);
  ctx.fill();
  // eye / goggle glow
  rect(ctx, cx + 1 + p.lean * 0.4, ty - 4, 3, 1.5, rgb(glow));
  if (kind === 'scavenger') {
    // scarf
    rect(ctx, cx - 5, ty + 1, 10, 2, rgb(accent));
    // rail spike: raised behind the head (tell), or thrust forward (strike)
    const ax = cx + 5;
    const ay = ty + 4;
    ctx.strokeStyle = rgb(0xd8d8e8);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (p.strike > 0) {
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + 14, ay - 1);
    } else if (p.raise > 0) {
      ctx.moveTo(ax - 1, ay - 2);
      ctx.lineTo(ax + 1, ay - 13 * p.raise - 2);
    } else {
      ctx.moveTo(ax, ay + 1);
      ctx.lineTo(ax + 4, ay + 8);
    }
    ctx.stroke();
    if (p.strike > 0) rect(ctx, ax + 8, ay - 3, 6, 3, rgb(glow, 0.8));
  } else if (p.talk > 0) {
    // NPCs lift a hand when talking.
    rect(ctx, cx + 5, ty + 2, 2, 5, body);
  } else {
    rect(ctx, cx + 5, ty + 4, 2, 7, body);
  }
}

function drawHeavy(ctx: Ctx, W: number, H: number, c: readonly [number, number, number], p: Pose): void {
  const [main, accent, glow] = c;
  const plate = rgb(mixc(main, 0xffffff, p.flash * 0.7));
  const dark = rgb(mixc(main, 0x000000, 0.55));
  const cx = W / 2 + p.lean * 0.5;
  const feet = H - 1;
  const swing = Math.sin(p.step * Math.PI * 2) * 3;
  rect(ctx, cx - 9 + swing, feet - 12, 7, 12, dark);
  rect(ctx, cx + 2 - swing, feet - 12, 7, 12, dark);
  const ty = feet - 32 + p.bob;
  // torso block + shoulder guards
  rect(ctx, cx - 11, ty, 22, 20, plate);
  rect(ctx, cx - 16, ty - 2, 8, 7, rgb(accent));
  rect(ctx, cx + 8, ty - 2, 8, 7, rgb(accent));
  // chest plate / open core
  if (p.open > 0) {
    rect(ctx, cx - 7, ty + 5, 6, 10, dark);
    rect(ctx, cx + 1, ty + 5, 6, 10, dark);
    ellipse(ctx, cx, ty + 10, 3, 4, rgb(glow));
  } else {
    rect(ctx, cx - 7, ty + 5, 14, 10, rgb(mixc(main, accent, 0.4)));
    rect(ctx, cx - 1, ty + 5, 2, 10, dark);
  }
  // helmet
  rect(ctx, cx - 5, ty - 9, 10, 9, plate);
  rect(ctx, cx - 4, ty - 5, 8, 2, rgb(glow));
  // maul
  ctx.strokeStyle = rgb(0xb8b8c8);
  ctx.lineWidth = 3;
  ctx.beginPath();
  const hx = cx + 15;
  if (p.strike > 0) {
    ctx.moveTo(hx, ty + 14);
    ctx.lineTo(hx + 12, ty + 22);
  } else if (p.raise > 0) {
    ctx.moveTo(hx, ty + 8);
    ctx.lineTo(hx - 2, ty - 14 * p.raise - 4);
  } else {
    ctx.moveTo(hx, ty + 6);
    ctx.lineTo(hx + 4, ty + 22);
  }
  ctx.stroke();
}

function drawStalker(ctx: Ctx, W: number, H: number, c: readonly [number, number, number], p: Pose): void {
  const [main, accent, glow] = c;
  const cx = W / 2 + p.lean * 0.5;
  const feet = H - 1;
  const off = p.glitch;
  for (const [dx, col, a] of [[-off, 0xff3ea5, 0.35], [off, 0x3cf2ff, 0.35], [0, main, 1]] as const) {
    ctx.globalAlpha = p.alpha * a;
    ctx.fillStyle = rgb(mixc(col, 0xffffff, p.flash * 0.6));
    ctx.beginPath();
    ctx.moveTo(cx + dx, feet - 28 + p.bob);
    ctx.lineTo(cx + dx + 6, feet - 6);
    ctx.lineTo(cx + dx + 3, feet);
    ctx.lineTo(cx + dx - 3, feet);
    ctx.lineTo(cx + dx - 6, feet - 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = p.alpha;
  ellipse(ctx, cx, feet - 27 + p.bob, 3.5, 4, rgb(0x0a0a14));
  rect(ctx, cx - 1, feet - 28 + p.bob, 3, 1.5, rgb(glow));
  // blade fingers
  ctx.strokeStyle = rgb(accent);
  ctx.lineWidth = 1.4;
  const rx = cx + 5;
  const ry = feet - 16 + p.bob;
  ctx.beginPath();
  if (p.strike > 0) {
    for (const dy of [-2, 0, 2]) (ctx.moveTo(rx, ry + dy), ctx.lineTo(rx + 12, ry + dy - 1));
  } else {
    const up = p.raise > 0 ? -8 * p.raise : 4;
    for (const dy of [-1, 1]) (ctx.moveTo(rx, ry), ctx.lineTo(rx + 5, ry + up + dy * 2));
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawTurret(ctx: Ctx, W: number, H: number, c: readonly [number, number, number], p: Pose): void {
  const [main, lens, accent] = c;
  const cx = W / 2;
  const cy = H / 2;
  // Barrel points RIGHT; the view rotates the sprite.
  rect(ctx, cx, cy - 3, W / 2 - 1, 6, rgb(mixc(main, 0x000000, 0.35)));
  rect(ctx, cx + W / 2 - 5, cy - 4, 4, 8, rgb(accent));
  ellipse(ctx, cx - 1, cy, 8, 8, rgb(mixc(main, 0xffffff, p.flash * 0.7)));
  // armour petals open when venting
  const spread = p.open > 0 ? 5 : 0;
  for (const dy of [-1, 1]) {
    ctx.fillStyle = rgb(mixc(main, 0x000000, 0.2));
    ctx.beginPath();
    ctx.moveTo(cx - 1, cy + dy * (4 + spread));
    ctx.lineTo(cx - 9, cy + dy * (7 + spread));
    ctx.lineTo(cx - 8, cy + dy * (1 + spread));
    ctx.closePath();
    ctx.fill();
  }
  ellipse(ctx, cx - 1, cy, 3.5, 3.5, rgb(lens, 0.5 + 0.5 * Math.max(p.raise, p.strike, p.open)));
  if (p.strike > 0) ellipse(ctx, cx + W / 2 + 1, cy, 4, 3, rgb(0xffffff, 0.9));
}

function drawEcho(ctx: Ctx, W: number, H: number, c: readonly [number, number, number], p: Pose): void {
  const [main, white, edge] = c;
  const cx = W / 2;
  const cy = H / 2 + p.bob;
  ctx.globalAlpha = 0.65 * p.alpha;
  ctx.fillStyle = rgb(main);
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy - 14);
  ctx.lineTo(cx + 5, cy - 14);
  ctx.lineTo(cx + 6, cy + 4);
  ctx.lineTo(cx + 2, cy + 14);
  ctx.lineTo(cx - 2, cy + 8);
  ctx.lineTo(cx - 6, cy + 14);
  ctx.lineTo(cx - 6, cy + 4);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.9 * p.alpha;
  ellipse(ctx, cx, cy - 16, 4, 4, rgb(white));
  ellipse(ctx, cx - 1.5, cy - 16, 1.2, 1.5, rgb(0x0a1a22));
  ellipse(ctx, cx + 1.5, cy - 16, 1.2, 1.5, rgb(0x0a1a22));
  // scan lines + magenta edge
  ctx.globalAlpha = 0.35 * p.alpha;
  for (let y = cy - 18; y < cy + 15; y += 3) rect(ctx, cx - 7, y, 14, 1, rgb(0x0a1a22));
  ctx.globalAlpha = 0.5 * p.alpha;
  rect(ctx, cx - 6, cy - 12, 1, 22, rgb(edge));
  ctx.globalAlpha = 1;
}

function drawMachine(ctx: Ctx, W: number, H: number, c: readonly [number, number, number], p: Pose): void {
  const [iron, ember, core] = c;
  const body = rgb(mixc(iron, 0xffffff, p.flash * 0.6));
  const dark = rgb(mixc(iron, 0x000000, 0.5));
  const base = H - 2;
  // chimneys
  rect(ctx, 12, base - 62, 7, 20, dark);
  rect(ctx, W - 20, base - 58, 7, 18, dark);
  // pistons from the ceiling rails
  const slam = p.strike > 0 ? 10 : p.raise * -8;
  for (const px of [18, W / 2 - 3, W - 24]) {
    rect(ctx, px, 0, 6, base - 50 + slam, dark);
    rect(ctx, px - 2, base - 52 + slam, 10, 5, rgb(ember));
  }
  // barrel body
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(8, base);
  ctx.lineTo(W - 8, base);
  ctx.lineTo(W - 12, base - 46);
  ctx.lineTo(12, base - 46);
  ctx.closePath();
  ctx.fill();
  // core behind shutters
  const shutter = p.open > 0 ? 4 : 14;
  rect(ctx, W / 2 - 14, base - 34, 28, 22, rgb(core, p.open > 0 ? 1 : 0.45));
  rect(ctx, W / 2 - 15, base - 35, 30, shutter, dark);
  rect(ctx, W / 2 - 15, base - 13 - shutter + 4, 30, shutter, dark);
  for (let i = 0; i < 4; i++) rect(ctx, W / 2 - 14 + i * 7, base - 34, 1, 22, dark);
}

function drawVoid(ctx: Ctx, W: number, H: number, c: readonly [number, number, number], p: Pose, i: number): void {
  const [dark, mag, cyan] = c;
  const cx = W / 2;
  const cy = H / 2 + p.bob;
  ctx.globalAlpha = p.alpha;
  ctx.fillStyle = rgb(0x05020a);
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy - 28);
  ctx.lineTo(cx + 8, cy - 28);
  ctx.lineTo(cx + 12, cy + 4);
  ctx.lineTo(cx + 6, cy + 30);
  ctx.lineTo(cx + 1, cy + 22);
  ctx.lineTo(cx - 3, cy + 32);
  ctx.lineTo(cx - 10, cy + 20);
  ctx.lineTo(cx - 12, cy + 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgb(dark, 0.9);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // blank face
  ellipse(ctx, cx, cy - 20, 5, 6, rgb(mixc(0x05020a, 0xffffff, 0.08 + p.flash * 0.5)));
  // ring of erased minutes
  const n = 10;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + i * 0.4 + p.fall * 2;
    const r = 15 + p.raise * 4 + p.fall * 10;
    ellipse(ctx, cx + Math.cos(a) * r, cy - 2 + Math.sin(a) * r * 0.55, 1.4, 1.4, rgb(k % 2 === 0 ? mag : cyan));
  }
  if (p.open > 0) ellipse(ctx, cx, cy - 6, 5, 5, rgb(0xffffff, 0.8));
  ctx.globalAlpha = 1;
}

function drawTerminal(ctx: Ctx, W: number, H: number): void {
  rect(ctx, W / 2 - 6, H - 14, 12, 14, rgb(0x2a2a38));
  rect(ctx, W / 2 - 8, H - 26, 16, 14, rgb(0x14102a));
  rect(ctx, W / 2 - 6, H - 24, 12, 9, rgb(0x4dff9a, 0.7));
}

/** Draw one frame of a procedural asset at 1x logical units (the caller scales the context). */
export function drawPlaceholderFrame(ctx: Ctx, def: AssetDef, anim: string, frame: number, frames: number): void {
  const W = def.display.w;
  const H = def.display.h;
  const colors = def.colors ?? [0x888888, 0xcccccc, 0xffffff];
  const pose = poseFor(anim, frame, frames);
  const shape: PlaceholderShape = def.shape ?? 'humanoid';
  ctx.save();
  if (pose.fall > 0 && shape !== 'echo' && shape !== 'void' && shape !== 'turret' && shape !== 'machine') {
    // Death: tip over and sink.
    ctx.translate(W / 2, H);
    ctx.rotate(pose.fall * 1.2);
    ctx.translate(-W / 2, -H);
    ctx.globalAlpha = pose.alpha;
  }
  switch (shape) {
    case 'humanoid':
      drawHumanoid(ctx, W, H, colors, pose, 'scavenger');
      break;
    case 'npc':
      drawHumanoid(ctx, W, H, colors, pose, 'npc');
      break;
    case 'heavy':
      drawHeavy(ctx, W, H, colors, pose);
      break;
    case 'stalker':
      drawStalker(ctx, W, H, colors, pose);
      break;
    case 'turret':
      drawTurret(ctx, W, H, colors, pose);
      break;
    case 'echo':
      drawEcho(ctx, W, H, colors, pose);
      break;
    case 'machine':
      drawMachine(ctx, W, H, colors, pose);
      break;
    case 'void':
      drawVoid(ctx, W, H, colors, pose, frame);
      break;
    case 'terminal':
      drawTerminal(ctx, W, H);
      break;
    default:
      drawHumanoid(ctx, W, H, colors, pose, 'npc');
  }
  ctx.restore();
}

/** Generate every procedural placeholder frame described by the manifest. */
export function makePlaceholderActors(scene: Phaser.Scene): number {
  let made = 0;
  for (const def of ASSETS) {
    if (def.placeholder !== 'procedural' || !def.shape) continue;
    let k = 0;
    for (const [name, a] of Object.entries(def.anims)) {
      for (let i = 0; i < a.frames; i++) {
        const key = def.textureKeys[k++];
        if (!key) continue;
        if (scene.textures.exists(key)) scene.textures.remove(key);
        const tex = scene.textures.createCanvas(key, def.display.w * PLACEHOLDER_RES, def.display.h * PLACEHOLDER_RES);
        if (!tex) continue;
        const ctx = tex.getContext();
        ctx.scale(PLACEHOLDER_RES, PLACEHOLDER_RES);
        drawPlaceholderFrame(ctx, def, name, i, a.frames);
        tex.refresh();
        made++;
      }
    }
  }
  return made;
}
