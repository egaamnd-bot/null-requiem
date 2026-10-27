/** EMBERVEIL palette: near-black depths, warm ember light, pale stone, cool bioluminescence. */
export const PALETTE = {
  void: 0x07060a,
  ink: 0x0e0c12,
  shadow: 0x1a1720,
  stone: 0xb9ad9a,
  stoneDark: 0x6e655a,
  bone: 0xe8dcc8,
  ember: 0xff8a3d,
  emberBright: 0xffcf6b,
  emberDeep: 0xc2412b,
  cinder: 0x7a2418,
  bio: 0x5fd4c0,
  bioDeep: 0x1f6f66,
  danger: 0xff4a2a,
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

export const UI_FONT = '"Georgia", "Times New Roman", serif';
export const UI_MONO = '"Trebuchet MS", "Segoe UI", sans-serif';
