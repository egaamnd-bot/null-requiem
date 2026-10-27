/**
 * Engine-agnostic geometry for the on-screen touch controls.
 *
 * Everything here is pure maths so it can be unit tested without Phaser or a browser.
 * Coordinates are in logical game pixels (the 480x270 view), origin top-left.
 */

/** Virtual buttons that are *held* while a finger is on them. */
export type HoldKey = 'left' | 'right' | 'up' | 'down' | 'jump' | 'attack' | 'dash' | 'backtrace' | 'interact';

export interface Circle {
  x: number;
  y: number;
  r: number;
}

export interface ActionButton {
  key: HoldKey;
  label: string;
  /** Visible radius. */
  r: number;
  /** Radius used for hit testing (a little larger than what is drawn). */
  hitR: number;
  x: number;
  y: number;
}

export interface TouchLayout {
  width: number;
  height: number;
  dpad: Circle;
  /** How far from the pad centre a finger may drift before the pad releases (as a multiple of dpad.r). */
  dpadReach: number;
  /** Fraction of dpad.r a finger must move from the centre before a direction registers. */
  dpadDeadzone: number;
  buttons: ActionButton[];
  /** Tap-only button that opens the pause menu. */
  pause: Circle & { hitR: number };
}

const REF_W = 480;
const REF_H = 270;

/** Build the layout for a view of `width` x `height` logical pixels. */
export function createTouchLayout(width: number, height: number): TouchLayout {
  const s = Math.min(width / REF_W, height / REF_H);
  const rightX = (offset: number) => width - offset * s;
  const bottomY = (offset: number) => height - offset * s;
  const btn = (key: HoldKey, label: string, xOff: number, yOff: number, r: number): ActionButton => ({
    key,
    label,
    r: r * s,
    hitR: (r + 5) * s,
    x: rightX(xOff),
    y: bottomY(yOff),
  });

  return {
    width,
    height,
    dpad: { x: 64 * s, y: bottomY(72), r: 52 * s },
    dpadReach: 1.5,
    dpadDeadzone: 0.28,
    buttons: [
      btn('jump', 'JMP', 44, 64, 24),
      btn('attack', 'ATK', 98, 48, 24),
      btn('dash', 'DSH', 44, 118, 22),
      btn('backtrace', 'REW', 98, 102, 22),
      btn('interact', 'TLK', 152, 48, 20),
    ],
    pause: { x: rightX(26), y: 26 * s, r: 14 * s, hitR: 24 * s },
  };
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

/** Directions currently selected by a finger at (x, y) on the d-pad. */
export function dpadKeysAt(layout: TouchLayout, x: number, y: number): HoldKey[] {
  const { dpad } = layout;
  const dx = x - dpad.x;
  const dy = y - dpad.y;
  if (Math.hypot(dx, dy) > dpad.r * layout.dpadReach) return [];
  const t = dpad.r * layout.dpadDeadzone;
  const keys: HoldKey[] = [];
  if (dx < -t) keys.push('left');
  if (dx > t) keys.push('right');
  if (dy < -t) keys.push('up');
  if (dy > t) keys.push('down');
  return keys;
}

/** The action button under (x, y), picking the nearest centre when hit circles overlap. */
export function buttonAt(layout: TouchLayout, x: number, y: number): ActionButton | null {
  let best: ActionButton | null = null;
  let bestD = Infinity;
  for (const b of layout.buttons) {
    const d = dist(x, y, b.x, b.y);
    if (d <= b.hitR && d < bestD) {
      best = b;
      bestD = d;
    }
  }
  return best;
}

/** Every held key selected by a finger at (x, y): d-pad directions or a single action button. */
export function holdKeysAt(layout: TouchLayout, x: number, y: number): HoldKey[] {
  const pad = dpadKeysAt(layout, x, y);
  if (pad.length > 0) return pad;
  const b = buttonAt(layout, x, y);
  return b ? [b.key] : [];
}

export function isOnPause(layout: TouchLayout, x: number, y: number): boolean {
  const p = layout.pause;
  return dist(x, y, p.x, p.y) <= p.hitR;
}
