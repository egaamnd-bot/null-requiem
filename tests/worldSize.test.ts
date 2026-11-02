import { describe, expect, it } from 'vitest';
import { MANIFEST_VIEW_SCALE } from '../src/assets/assetMap';
import { ASSETS } from '../src/assets/manifest';
import { planSheet, planWorldSize } from '../src/assets/sheet';

const def = (w: number, h: number) => ({ display: { w, h } });

describe('R1 world size independence (pure)', () => {
  it('a 1x, 2x, 4x or 5x frame all report the same world size after the view constant', () => {
    for (const k of [1, 2, 4, 5]) {
      const p = planWorldSize(def(24, 32), 1, { w: 24 * k, h: 32 * k });
      expect(p.frameW * 1).toBeCloseTo(24, 6);
      expect(p.frameH).toBeCloseTo(32, 6);
      expect(p.resolution).toBeCloseTo(k, 6);
    }
  });
  it('views with a constant scale (Courier 0.65, 2x world textures 0.5) still end at the declared size', () => {
    const p = planWorldSize(def(31, 36), 0.65, { w: 124, h: 144 });
    expect(p.frameW * 0.65).toBeCloseTo(31, 6);
    expect(p.frameH * 0.65).toBeCloseTo(36, 6);
    const q = planWorldSize(def(16, 16), 0.5, { w: 64, h: 64 });
    expect(q.frameW * 0.5).toBeCloseTo(16, 6);
  });
  it('never stretches: height follows the same factor as width', () => {
    const p = planWorldSize(def(40, 28), 1, { w: 160, h: 118 }); // slightly off aspect, within tolerance
    expect(p.frameH / p.frameW).toBeCloseTo(118 / 160, 6);
  });
  it('is safe on degenerate input', () => {
    const p = planWorldSize(def(24, 32), 0, { w: 0, h: 0 });
    expect(Number.isFinite(p.resolution)).toBe(true);
  });
  it('planSheet accepts exact multiples of the declared cell and rejects the wrong aspect', () => {
    const courier = ASSETS.find((a) => a.id === 'player_courier_run')!;
    expect(planSheet(courier, 4 * 124, 144).ok).toBe(true);
    expect(planSheet(courier, 4 * 62, 72).ok).toBe(true);
    expect(planSheet(courier, 4 * 124, 100).ok).toBe(false);
  });
});

describe('manifest integrity for replacement', () => {
  it('no texture key is claimed by two different assets (each replacement is unambiguous)', () => {
    const owner = new Map<string, string>();
    for (const a of ASSETS) {
      for (const k of new Set(a.textureKeys)) {
        const o = owner.get(k);
        expect(o === undefined || o === a.id, `${k} claimed by ${o} and ${a.id}`).toBe(true);
        owner.set(k, a.id);
      }
    }
  });
  it('view-scale entries refer to real manifest keys', () => {
    const keys = new Set(ASSETS.flatMap((a) => a.textureKeys));
    for (const k of Object.keys(MANIFEST_VIEW_SCALE)) expect(keys.has(k), k).toBe(true);
  });
});
