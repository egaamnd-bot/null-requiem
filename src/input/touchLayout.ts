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
  /** Sizing reference only. The joystick itself is floating, not anchored here. */
  dpad: Circle;
  dpadReach: number;
  dpadDeadzone: number;
  /**
   * A touch that begins here (and not on a button / the pause button) creates a floating joystick.
   * The zone only decides where a joystick may START: once a finger owns a joystick it is tracked by
   * pointer id everywhere on screen, so dragging out of this zone never drops movement.
   */
  joystickZone: { left: number; right: number; top: number; bottom: number };
  buttons: ActionButton[];
  pause: Circle & { hitR: number };
}

const REF_W = 480;
const REF_H = 270;
/** Margin already baked into the reference offsets below. */
const BASE_MARGIN = 10;

export interface LayoutMargins { left: number; right: number; top: number; bottom: number }

export function createTouchLayout(
  width: number,
  height: number,
  margin: LayoutMargins = { left: BASE_MARGIN, right: BASE_MARGIN, top: 6, bottom: 6 },
  /** Player-configurable control size multiplier (clamped to a range that cannot overlap). */
  userScale = 1,
): TouchLayout {
  // Control size follows the (fixed) logical height so it does not change with the device aspect ratio.
  const s = Math.min(width / REF_W, height / REF_H) * Math.min(1.2, Math.max(0.8, userScale));
  const extraR = Math.max(0, margin.right - BASE_MARGIN);
  const extraB = Math.max(0, margin.bottom - 6);
  const extraT = Math.max(0, margin.top - 6);
  const rightX = (offset: number) => width - offset * s - extraR;
  const bottomY = (offset: number) => height - offset * s - extraB;
  const btn = (key: HoldKey, label: string, xOff: number, yOff: number, r: number): ActionButton => ({
    key, label, r: r * s, hitR: (r + 5) * s, x: rightX(xOff), y: bottomY(yOff),
  });
  return {
    width, height,
    dpad: { x: 64 * s + Math.max(0, margin.left - BASE_MARGIN), y: bottomY(72), r: 52 * s },
    dpadReach: 1.5,
    dpadDeadzone: 0.18,
    // Whole left half below the top bar: the thumb never has to "find" a pad.
    joystickZone: { left: 0, right: width * 0.5, top: height * 0.16, bottom: height },
    buttons: [
      btn('jump', 'JMP', 44, 64, 24),
      btn('attack', 'ATK', 98, 48, 24),
      btn('dash', 'DSH', 44, 118, 22),
      btn('backtrace', 'REW', 98, 102, 22),
      btn('interact', 'TLK', 152, 48, 20),
    ],
    pause: { x: rightX(26), y: 26 * s + extraT, r: 14 * s, hitR: 24 * s },
  };
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

/** True when a new touch should create a floating joystick anchored at that touch. */
export function isJoystickZone(layout: TouchLayout, x: number, y: number): boolean {
  const z = layout.joystickZone;
  if (!(x >= z.left && x <= z.right && y >= z.top && y <= z.bottom)) return false;
  // A button that happens to sit in the zone (very narrow views) keeps priority.
  return buttonAt(layout, x, y) === null && !isOnPause(layout, x, y);
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

/**
 * Keys for a non-joystick finger: action buttons only. (The legacy fixed pad geometry is intentionally
 * not consulted here; movement comes exclusively from the floating joystick.)
 */
export function holdKeysAt(layout: TouchLayout, x: number, y: number): HoldKey[] {
  const b = buttonAt(layout, x, y);
  return b ? [b.key] : [];
}

export function isOnPause(layout: TouchLayout, x: number, y: number): boolean {
  return dist(x, y, layout.pause.x, layout.pause.y) <= layout.pause.hitR;
}
