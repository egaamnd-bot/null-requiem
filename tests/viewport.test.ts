import { describe, expect, it } from 'vitest';
import { BASE_VIEW_HEIGHT, computeViewSize, hudMargins, insetsToLogical, MAX_VIEW_ASPECT, MIN_VIEW_ASPECT, NO_INSETS } from '../src/core/viewport';
import { CameraFollow } from '../src/core/camera';

describe('computeViewSize', () => {
  it('always keeps the gameplay height fixed', () => {
    for (const [w, h] of [[800, 360], [915, 412], [2400, 1080], [1280, 720], [640, 480]]) {
      expect(computeViewSize(w!, h!).height).toBe(BASE_VIEW_HEIGHT);
    }
  });

  it('16:9 devices get the classic 480x270 view', () => {
    expect(computeViewSize(1920, 1080)).toEqual({ width: 480, height: 270 });
  });

  it('wide phones reveal more world instead of black bars or stretching (20:9)', () => {
    const v = computeViewSize(2400, 1080);
    expect(v.width).toBeGreaterThan(480);
    expect(Math.abs(v.width / v.height - 2400 / 1080)).toBeLessThan(0.02);
  });

  it('clamps extreme aspect ratios to the supported range', () => {
    expect(computeViewSize(4000, 1000).width / BASE_VIEW_HEIGHT).toBeLessThanOrEqual(MAX_VIEW_ASPECT + 0.01);
    expect(computeViewSize(600, 600).width / BASE_VIEW_HEIGHT).toBeGreaterThanOrEqual(MIN_VIEW_ASPECT - 0.01);
  });

  it('produces an even width and survives zero / NaN window sizes', () => {
    expect(computeViewSize(2340, 1080).width % 2).toBe(0);
    expect(computeViewSize(0, 0).width).toBeGreaterThan(0);
    expect(computeViewSize(NaN, 100).width).toBeGreaterThan(0);
  });
});

describe('safe area handling', () => {
  it('converts CSS insets into logical pixels', () => {
    const view = { width: 600, height: 270 };
    const logical = insetsToLogical({ left: 48, right: 0, top: 0, bottom: 24 }, 1200, view);
    expect(logical.left).toBe(24);
    expect(logical.bottom).toBe(12);
    expect(logical.right).toBe(0);
  });

  it('ignores negative or invalid insets', () => {
    const logical = insetsToLogical({ left: -5, right: NaN, top: Infinity, bottom: 0 }, 1000, { width: 500, height: 270 });
    expect(logical).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
  });

  it('HUD margins never fall below a minimum even when the device reports nothing', () => {
    const m = hudMargins(NO_INSETS);
    expect(m.left).toBeGreaterThan(0);
    expect(m.top).toBeGreaterThan(0);
    expect(hudMargins({ left: 30, right: 2, top: 0, bottom: 0 }).left).toBe(30);
  });
});

describe('camera follows view changes', () => {
  it('re-clamps against the new view size and never shows outside the room', () => {
    const cam = new CameraFollow(480, 270, { width: 800, height: 600 });
    cam.snap(780, 300, 1);
    expect(cam.x).toBe(800 - 480);
    cam.setView(648, 270);
    expect(cam.x).toBe(800 - 648);
    cam.snap(780, 300, 1);
    expect(cam.x + cam.viewW).toBeLessThanOrEqual(800);
  });
});
