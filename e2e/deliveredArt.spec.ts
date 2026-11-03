import { readFileSync, existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';

/**
 * Runs against whatever has actually been delivered to public/assets/final (nothing yet → skipped). For every delivered asset the
 * real file is loaded by the real game and each of its textures must occupy exactly the world size the manifest declares.
 */
const mf = 'public/assets/final/manifest.json';
const delivered: string[] = existsSync(mf) ? Object.keys((JSON.parse(readFileSync(mf, 'utf8')) as { assets?: object }).assets ?? {}) : [];

test.skip(delivered.length === 0, 'no visual assets delivered yet');

test('delivered art loads without errors and every texture keeps its declared world size', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/favicon/i.test(m.text()) && errors.push(m.text()));
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { nullRequiemGame?: { scene: { isActive(k: string): boolean } } }).nullRequiemGame?.scene.isActive('title'), null, { timeout: 30000 });
  const bad = await page.evaluate((ids) => {
    const w = window as unknown as {
      nullRequiemGame: { scene: { getScene(k: string): { textures: { get(k: string): { get(): { realWidth: number; realHeight: number } }; exists(k: string): boolean } } } };
      nullRequiemAssets: { ASSETS: { id: string; display: { w: number; h: number }; category: string; textureKeys: string[] }[]; viewScaleOf(k: string): number };
    };
    const tm = w.nullRequiemGame.scene.getScene('title').textures;
    const out: string[] = [];
    for (const id of ids) {
      const a = w.nullRequiemAssets.ASSETS.find((x) => x.id === id);
      if (!a) {
        out.push(`${id}: unknown id`);
        continue;
      }
      if (a.category === 'background') continue; // tiled layers are sized by their tile scale
      for (const key of new Set(a.textureKeys)) {
        if (!tm.exists(key)) {
          out.push(`${id}: texture ${key} missing`);
          continue;
        }
        const f = tm.get(key).get();
        const s = w.nullRequiemAssets.viewScaleOf(key);
        if (Math.abs(f.realWidth * s - a.display.w) > 0.5 || Math.abs(f.realHeight * s - a.display.h) > 0.5) out.push(`${id}: ${key} is ${f.realWidth * s}x${f.realHeight * s}, expected ${a.display.w}x${a.display.h}`);
      }
    }
    return out;
  }, delivered);
  expect(bad).toEqual([]);
  expect(errors).toEqual([]);
});
