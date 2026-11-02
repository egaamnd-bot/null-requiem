import type Phaser from 'phaser';
import { setView, view } from '../config/view';
import { computeViewSize, insetsToLogical, NO_INSETS, type CssInsets } from '../core/viewport';

/** Reads env(safe-area-inset-*) through a hidden probe element (CSS env() is not readable from JS directly). */
export function readSafeInsetsCss(): CssInsets {
  if (typeof document === 'undefined') return { ...NO_INSETS };
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
    'padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);' +
    'padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const insets = {
    left: parseFloat(cs.paddingLeft) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    top: parseFloat(cs.paddingTop) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
  };
  probe.remove();
  return insets;
}

function windowSize(): { w: number; h: number } {
  const vv = window.visualViewport;
  return { w: vv?.width ?? window.innerWidth, h: vv?.height ?? window.innerHeight };
}

/** Compute the logical view for the current window and publish it to the shared `view` object. */
export function applyWindowView(): { width: number; height: number } {
  const { w, h } = windowSize();
  const size = computeViewSize(w, h);
  const css = readSafeInsetsCss();
  // After FIT the canvas is w wide at most; the ratio logical/CSS is width-based.
  const safe = insetsToLogical(css, Math.min(w, h * (size.width / size.height)), size);
  setView(size.width, size.height, safe);
  return size;
}

/**
 * Keep the Phaser game sized to the device: re-evaluates on resize / orientation / visual-viewport
 * changes (Android immersive mode changes the WebView size after load).
 */
/** Game-level event fired after the logical view size or safe insets changed. Payload: none (read `view`). */
export const VIEW_CHANGED = 'null-requiem:view-changed';

/**
 * Keep the Phaser game sized to the device: re-evaluates on resize / orientation / visual-viewport
 * changes (Android immersive mode changes the WebView size after load).
 */
export function installViewportWatcher(game: Phaser.Game): () => void {
  let raf = 0;
  let last = JSON.stringify([view.width, view.height, view.safe]);
  const evaluate = () => {
    raf = 0;
    const size = applyWindowView();
    const sig = JSON.stringify([view.width, view.height, view.safe]);
    if (size.width !== game.scale.gameSize.width || size.height !== game.scale.gameSize.height) {
      game.scale.setGameSize(size.width, size.height);
    }
    game.scale.refresh();
    if (sig !== last) {
      last = sig;
      game.events.emit(VIEW_CHANGED);
    }
  };
  const schedule = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(evaluate);
  };
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  // Immersive mode / cutout insets are often applied a moment after load.
  const timers = [300, 1200, 3000].map((ms) => window.setTimeout(schedule, ms));
  return () => {
    window.removeEventListener('resize', schedule);
    window.removeEventListener('orientationchange', schedule);
    window.visualViewport?.removeEventListener('resize', schedule);
    timers.forEach((t) => window.clearTimeout(t));
    if (raf) cancelAnimationFrame(raf);
  };
}
