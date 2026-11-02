/**
 * Pure viewport maths (no Phaser, no DOM) so it can be unit-tested in Node.
 *
 * Design: the logical view height is fixed (gameplay scale never changes), while the logical
 * width follows the device aspect ratio inside a safe range. Phaser's FIT mode then fills the
 * screen exactly (no black margins) on the 16:9 .. ~21:9 phones in the wild, and shows a little
 * more of the world horizontally on wider screens instead of stretching anything.
 */

export const BASE_VIEW_HEIGHT = 270;
export const MIN_VIEW_ASPECT = 16 / 9;
export const MAX_VIEW_ASPECT = 2.4;

export interface ViewSize {
  width: number;
  height: number;
}

/** Insets in CSS pixels, as reported by the browser's safe-area environment variables. */
export interface CssInsets {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export const NO_INSETS: CssInsets = { left: 0, right: 0, top: 0, bottom: 0 };

/** Logical size for a window of the given CSS size. Width is always even to avoid half-pixel seams. */
export function computeViewSize(windowWidth: number, windowHeight: number): ViewSize {
  if (!(windowWidth > 0) || !(windowHeight > 0)) {
    return { width: Math.round(BASE_VIEW_HEIGHT * MIN_VIEW_ASPECT), height: BASE_VIEW_HEIGHT };
  }
  const aspect = Math.min(MAX_VIEW_ASPECT, Math.max(MIN_VIEW_ASPECT, windowWidth / windowHeight));
  const width = Math.round((BASE_VIEW_HEIGHT * aspect) / 2) * 2;
  return { width, height: BASE_VIEW_HEIGHT };
}

/** Convert CSS-pixel insets to logical (game) pixels for the displayed canvas size. */
export function insetsToLogical(insets: CssInsets, canvasCssWidth: number, view: ViewSize): CssInsets {
  const k = canvasCssWidth > 0 ? view.width / canvasCssWidth : 1;
  const conv = (v: number) => (Number.isFinite(v) && v > 0 ? Math.ceil(v * k) : 0);
  return { left: conv(insets.left), right: conv(insets.right), top: conv(insets.top), bottom: conv(insets.bottom) };
}

/**
 * Minimum inset applied to HUD and touch controls even when the device reports none: rounded
 * display corners and gesture-navigation areas are not always exposed to web content.
 */
export const MIN_HUD_MARGIN = { x: 10, y: 6 } as const;

export function hudMargins(safe: CssInsets): CssInsets {
  return {
    left: Math.max(safe.left, MIN_HUD_MARGIN.x),
    right: Math.max(safe.right, MIN_HUD_MARGIN.x),
    top: Math.max(safe.top, MIN_HUD_MARGIN.y),
    bottom: Math.max(safe.bottom, MIN_HUD_MARGIN.y),
  };
}
