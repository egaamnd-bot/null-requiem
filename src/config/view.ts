import { computeViewSize, hudMargins, NO_INSETS, type CssInsets } from '../core/viewport';

/**
 * Runtime logical view. Width follows the device aspect ratio (see core/viewport.ts), height is fixed.
 * Scenes read this instead of hard-coded 480x270 and subscribe to resizes via `onViewResize`.
 */
export const view = {
  width: 480,
  height: 270,
  /** Safe-area insets in logical pixels (display cutouts, rounded corners). */
  safe: { ...NO_INSETS } as CssInsets,
  /** R0: canvas backing-store pixels per logical pixel (cameras zoom by this; every coordinate stays logical). */
  renderScale: 1,
  /** Margins HUD and touch controls should respect (safe insets with a sensible minimum). */
  margin: hudMargins(NO_INSETS),
};

export function setRenderScale(k: number): void {
  view.renderScale = Math.max(1, Math.floor(k) || 1);
}

export function setView(width: number, height: number, safe: CssInsets): void {
  view.width = width;
  view.height = height;
  view.safe = { ...safe };
  view.margin = hudMargins(safe);
}

export function setViewFromWindow(winW: number, winH: number, safe: CssInsets): void {
  const s = computeViewSize(winW, winH);
  setView(s.width, s.height, safe);
}
