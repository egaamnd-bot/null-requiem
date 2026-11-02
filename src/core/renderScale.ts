/**
 * Render scale (R0): the game's LOGICAL size (height 270, width 480–648) never changes. The WebGL canvas backing store is
 * logical × K so a phone with ~4 device pixels per logical pixel is not upscaled 4× by the browser compositor.
 * Cameras zoom by K (origin 0,0), so every world / HUD / physics coordinate stays logical.
 * Pure module: no Phaser, no DOM.
 */

export type RenderQuality = 'auto' | 'low' | 'balanced' | 'high' | 'max';
export const RENDER_QUALITIES: readonly RenderQuality[] = ['auto', 'low', 'balanced', 'high', 'max'];

/** Largest canvas edge / area we ask a mobile GPU for. 4096 is the safe WebGL texture/renderbuffer limit. */
export const MAX_CANVAS_EDGE = 4096;
export const MAX_CANVAS_PIXELS = 3_200_000;

/** The K each quality asks for before device and budget limits. `auto` starts at balanced (2×). */
export const QUALITY_SCALE: Readonly<Record<RenderQuality, number>> = { auto: 2, low: 1, balanced: 2, high: 3, max: 4 };

export function isRenderQuality(v: unknown): v is RenderQuality {
  return typeof v === 'string' && (RENDER_QUALITIES as readonly string[]).includes(v);
}

export interface RenderScaleInput {
  quality: RenderQuality;
  /** Physical pixels available for the game canvas (CSS px × devicePixelRatio), after FIT. */
  deviceHeightPx: number;
  logicalWidth: number;
  logicalHeight: number;
  /** Set by the FPS guard to force 1× on a device that cannot keep up (only honoured for `auto`). */
  demoted?: boolean;
}

/**
 * Integer K in 1..4. Never larger than the device can show (K ≤ ceil(device px per logical px)), never larger than the
 * canvas edge / pixel budget allows, and always ≥ 1.
 */
export function chooseRenderScale(i: RenderScaleInput): number {
  if (i.quality === 'auto' && i.demoted) return 1;
  let k = QUALITY_SCALE[i.quality];
  const raw = i.logicalHeight > 0 ? i.deviceHeightPx / i.logicalHeight : 1;
  const ideal = Number.isFinite(raw) && raw > 0 ? raw : 1;
  k = Math.min(k, Math.max(1, Math.ceil(ideal - 1e-6)));
  while (k > 1 && (i.logicalWidth * k > MAX_CANVAS_EDGE || i.logicalHeight * k > MAX_CANVAS_EDGE || i.logicalWidth * k * i.logicalHeight * k > MAX_CANVAS_PIXELS)) k--;
  return Math.max(1, Math.floor(k));
}

/** Canvas size (game size) for a logical view. */
export function canvasSize(logicalWidth: number, logicalHeight: number, k: number): { width: number; height: number } {
  return { width: Math.round(logicalWidth * k), height: Math.round(logicalHeight * k) };
}

/** Convert a pointer position in canvas pixels to logical coordinates. */
export function toLogical(canvasX: number, canvasY: number, k: number): { x: number; y: number } {
  return { x: canvasX / k, y: canvasY / k };
}

/**
 * FPS guard for `auto`: if the average frame rate stays below `minFps` for `windowSeconds` (after `warmupSeconds`), recommend
 * demotion to 1×. One-way and sticky for the session so it never flaps.
 */
export class FpsGuard {
  private elapsed = 0;
  private windowTime = 0;
  private windowFrames = 0;
  private lowWindows = 0;
  demoted = false;
  constructor(
    private readonly minFps = 38,
    private readonly warmupSeconds = 4,
    private readonly windowSeconds = 2,
    private readonly lowWindowsNeeded = 2,
  ) {}

  /** Feed one frame's delta in seconds. Returns true exactly once, when demotion is recommended. */
  frame(dt: number): boolean {
    if (this.demoted || !(dt > 0) || dt > 0.5) return false; // ignore tab-switch stalls
    this.elapsed += dt;
    if (this.elapsed < this.warmupSeconds) return false;
    this.windowTime += dt;
    this.windowFrames++;
    if (this.windowTime < this.windowSeconds) return false;
    const fps = this.windowFrames / this.windowTime;
    this.windowTime = 0;
    this.windowFrames = 0;
    this.lowWindows = fps < this.minFps ? this.lowWindows + 1 : 0;
    if (this.lowWindows >= this.lowWindowsNeeded) {
      this.demoted = true;
      return true;
    }
    return false;
  }
}
