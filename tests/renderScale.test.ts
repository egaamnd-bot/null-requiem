import { describe, expect, it } from 'vitest';
import { canvasSize, chooseRenderScale, FpsGuard, isRenderQuality, MAX_CANVAS_EDGE, toLogical } from '../src/core/renderScale';

const base = { logicalWidth: 600, logicalHeight: 270 };

describe('chooseRenderScale', () => {
  it('auto/balanced renders at 2x on a high-density phone (device is ~4 px per logical px)', () => {
    expect(chooseRenderScale({ ...base, quality: 'auto', deviceHeightPx: 1082 })).toBe(2);
    expect(chooseRenderScale({ ...base, quality: 'balanced', deviceHeightPx: 1082 })).toBe(2);
  });
  it('high and max reach 3x and 4x on a dense phone, but never exceed what the device can show', () => {
    expect(chooseRenderScale({ ...base, quality: 'high', deviceHeightPx: 1082 })).toBe(3);
    expect(chooseRenderScale({ ...base, quality: 'max', deviceHeightPx: 1082 })).toBe(4);
    expect(chooseRenderScale({ ...base, quality: 'max', deviceHeightPx: 540 })).toBe(2);
    expect(chooseRenderScale({ ...base, quality: 'high', deviceHeightPx: 270 })).toBe(1);
  });
  it('low is always 1x; tiny/odd inputs never go below 1', () => {
    expect(chooseRenderScale({ ...base, quality: 'low', deviceHeightPx: 3000 })).toBe(1);
    expect(chooseRenderScale({ ...base, quality: 'max', deviceHeightPx: 0 })).toBe(1);
    expect(chooseRenderScale({ ...base, quality: 'max', deviceHeightPx: Number.NaN })).toBe(1);
  });
  it('respects the canvas edge and pixel budget', () => {
    const k = chooseRenderScale({ logicalWidth: 648, logicalHeight: 270, quality: 'max', deviceHeightPx: 5000 });
    const { width, height } = canvasSize(648, 270, k);
    expect(width).toBeLessThanOrEqual(MAX_CANVAS_EDGE);
    expect(height).toBeLessThanOrEqual(MAX_CANVAS_EDGE);
    expect(width * height).toBeLessThanOrEqual(3_200_000);
    expect(k).toBeGreaterThanOrEqual(3);
  });
  it('the FPS guard demotes auto to 1x but never affects an explicit choice', () => {
    expect(chooseRenderScale({ ...base, quality: 'auto', deviceHeightPx: 1082, demoted: true })).toBe(1);
    expect(chooseRenderScale({ ...base, quality: 'high', deviceHeightPx: 1082, demoted: true })).toBe(3);
  });
});

describe('coordinates stay logical', () => {
  it('canvas size is logical x K and pointer coordinates map back exactly', () => {
    expect(canvasSize(600, 270, 2)).toEqual({ width: 1200, height: 540 });
    expect(toLogical(1200, 540, 2)).toEqual({ x: 600, y: 270 });
    expect(toLogical(301, 135, 2)).toEqual({ x: 150.5, y: 67.5 });
  });
  it('validates quality values', () => {
    expect(isRenderQuality('auto')).toBe(true);
    expect(isRenderQuality('ultra')).toBe(false);
  });
});

describe('FpsGuard', () => {
  const run = (g: FpsGuard, fps: number, seconds: number): boolean => {
    let fired = false;
    for (let i = 0; i < seconds * fps; i++) fired = g.frame(1 / fps) || fired;
    return fired;
  };
  it('stays quiet at 60 fps', () => {
    const g = new FpsGuard();
    expect(run(g, 60, 20)).toBe(false);
    expect(g.demoted).toBe(false);
  });
  it('recommends demotion once after sustained low fps, ignoring warmup and stalls', () => {
    const g = new FpsGuard();
    expect(run(g, 15, 3)).toBe(false); // warm-up (shader compile etc.)
    expect(g.frame(2)).toBe(false); // a stall is ignored
    expect(run(g, 20, 8)).toBe(true);
    expect(g.demoted).toBe(true);
    expect(run(g, 20, 8)).toBe(false); // fires once only
  });
  it('does not demote for one slow window', () => {
    const g = new FpsGuard();
    run(g, 60, 5);
    run(g, 20, 2);
    expect(run(g, 60, 10)).toBe(false);
  });
});
