/**
 * NULL REQUIEM palette: wet concrete and steel under a near-black night sky, lit by cyan
 * (the player, time, safety) and magenta (surveillance, the city), with sodium-amber signage
 * and hot red reserved for danger.
 */
export const PALETTE = {
  void: 0x05060c,
  ink: 0x0b0d18,
  shadow: 0x141828,
  concrete: 0x2a2f42,
  steel: 0x5b6480,
  /** Secondary text and UI hints. */
  mist: 0x9aa6c4,
  chrome: 0xd8e1f0,
  cyan: 0x3cf2ff,
  cyanDeep: 0x157a8c,
  magenta: 0xff3ea5,
  magentaDeep: 0x8a1f5c,
  sodium: 0xffb347,
  sodiumDeep: 0xa4581a,
  danger: 0xff3b4e,
  violet: 0x8a5cff,
  white: 0xffffff,
} as const;

export function css(color: number, alpha = 1): string {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

export function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

/** System font stacks only — the game must run offline. */
export const UI_FONT = '"Trebuchet MS", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
export const UI_MONO = '"Consolas", "Lucida Console", "Courier New", monospace';
