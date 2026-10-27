/**
 * Engine-agnostic geometry for the on-screen touch controls.
 * Coordinates are logical game pixels (the 480x270 world view), origin top-left.
 */

export type HoldKey = 'left' | 'right' | 'up' | 'down' | 'jump' | 'attack' | 'dash' | 'backtrace' | 'interact';

export interface Circle { x: number; y: number; r: number }
export interface Point { x: number; y: number }

export interface ActionButton {
  key: HoldKey;
  label: string;
  r: number;
  hitR: number;
  x: number;
  y: number;
}

export interface TouchLayout {
  width: number;
  height: number;
  /** Sizing reference only. The joystick itself is now floating, not anchored here. */
  dpad: Circle;
  dpadReach: number;
  dpadDeadzone: number;
  /** Touches beginning in this lower-left region create a floating joystick. */
  joystickZone: { left: number; right: number; top: number; bottom: number };
  buttons: ActionButton[];
  pause: Circle & { hitR: number };
}

const REF_W = 480;
const REF_H = 270;

export function createTouchLayout(width: number, height: number): TouchLayout {
  const s = Math.min(width / REF_W, height / REF_H);
  const rightX = (offset: number) => width - offset * s;
  const bottomY = (offset: number) => height - offset * s;
  const btn = (key: HoldKey, label: string, xOff: number, yOff: number, r: number): ActionButton => ({
    key, label, r: r * s, hitR: (r + 5) * s, x: rightX(xOff), y: bottomY(yOff),
  });
  return {
    width, height,
    dpad: { x: 64 * s, y: bottomY(72), r: 52 * s },
    dpadReach: 1.5,
    dpadDeadzone: 0.18,
    joystickZone: { left: 0, right: width * 0.43, top: height * 0.30, bottom: height },
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

/** True when a new touch should create a floating joystick anchored at that touch. */
export function isJoystickZone(layout: TouchLayout, x: number, y: number): boolean {
  const z = layout.joystickZone;
  return x >= z.left && x <= z.right && y >= z.top && y <= z.bottom;
}

/** Direction keys relative to a floating joystick's touch-down point. */
export function joystickKeysAt(layout: TouchLayout, origin: Point, x: number, y: number): HoldKey[] {
  const dx = x - origin.x;
  const dy = y - origin.y;
  const distance = Math.hypot(dx, dy);
  const deadzone = layout.dpad.r * layout.dpadDeadzone;
  if (distance < deadzone) return [];
  if (distance > layout.dpad.r * layout.dpadReach) {
    const scale = (layout.dpad.r * layout.dpadReach) / distance;
    return directionKeys(dx * scale, dy * scale, deadzone);
  }
  return directionKeys(dx, dy, deadzone);
}

function directionKeys(dx: number, dy: number, deadzone: number): HoldKey[] {
  const keys: HoldKey[] = [];
  if (dx < -deadzone) keys.push('left');
  if (dx > deadzone) keys.push('right');
  if (dy < -deadzone) keys.push('up');
  if (dy > deadzone) keys.push('down');
  return keys;
}

/** Directions selected by a finger at (x,y) on the legacy fixed pad geometry. */
export function dpadKeysAt(layout: TouchLayout, x: number, y: number): HoldKey[] {
  const dx = x - layout.dpad.x;
  const dy = y - layout.dpad.y;
  if (Math.hypot(dx, dy) > layout.dpad.r * layout.dpadReach) return [];
  return directionKeys(dx, dy, layout.dpad.r * layout.dpadDeadzone);
}

export function buttonAt(layout: TouchLayout, x: number, y: number): ActionButton | null {
  let best: ActionButton | null = null;
  let bestD = Infinity;
  for (const b of layout.buttons) {
    const d = dist(x, y, b.x, b.y);
    if (d <= b.hitR && d < bestD) { best = b; bestD = d; }
  }
  return best;
}

export function holdKeysAt(layout: TouchLayout, x: number, y: number): HoldKey[] {
  const pad = dpadKeysAt(layout, x, y);
  if (pad.length > 0) return pad;
  const b = buttonAt(layout, x, y);
  return b ? [b.key] : [];
}

export function isOnPause(layout: TouchLayout, x: number, y: number): boolean {
  return dist(x, y, layout.pause.x, layout.pause.y) <= layout.pause.hitR;
}
