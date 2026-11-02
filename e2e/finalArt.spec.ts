import { expect, test, type Page } from '@playwright/test';
import { solidPng } from './pngSynth';

/**
 * R1 regression tests (browser): a replaced texture of ANY resolution must occupy exactly the world size the manifest
 * declares, so no view, origin or hitbox changes when final art arrives. The "final art" here is synthetic.
 */

interface AssetProbe {
  nullRequiemGame: { scene: { getScene(k: string): { textures: { get(k: string): { get(): { realWidth: number; realHeight: number }; source: { resolution: number; width: number }[] }; exists(k: string): boolean } } } };
  nullRequiemAssets: {
    ASSETS: { id: string; display: { w: number; h: number }; textureKeys: string[]; anims: Record<string, { frames: number }> }[];
    viewScaleOf(k: string): number;
  };
}

async function boot(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as AssetProbe).nullRequiemGame?.scene.getScene('title')?.textures !== undefined);
  await page.waitForFunction(() => (window as unknown as { nullRequiemGame: { scene: { isActive(k: string): boolean } } }).nullRequiemGame.scene.isActive('title'), null, { timeout: 20000 });
}

/** World size of every texture key that exists, vs the manifest's declared display size. */
async function measure(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as AssetProbe;
    const tm = w.nullRequiemGame.scene.getScene('title').textures;
    const out: { id: string; key: string; worldW: number; worldH: number; dispW: number; dispH: number }[] = [];
    for (const a of w.nullRequiemAssets.ASSETS) {
      for (const key of new Set(a.textureKeys)) {
        if (!tm.exists(key)) continue;
        const f = tm.get(key).get();
        const s = w.nullRequiemAssets.viewScaleOf(key);
        out.push({ id: a.id, key, worldW: f.realWidth * s, worldH: f.realHeight * s, dispW: a.display.w, dispH: a.display.h });
      }
    }
    return out;
  });
}

// Placeholder frames that are deliberately not display-sized cells (shared code-drawn particle/UI textures and the
// per-bolt projectile sprites, whose three kinds differ in size inside one 16x16 sheet).
const NOT_CELL_SIZED = new Set(['proj-bolt', 'proj-shockwave', 'proj-plasma', 'ui-title-emblem', 'hud-backtrace', 'fx-ring-soft']);

test('placeholders: every manifest texture already occupies its declared world size (no hidden scaling)', async ({ page }) => {
  await boot(page);
  const rows = await measure(page);
  expect(rows.length).toBeGreaterThan(100);
  const bad = rows.filter((r) => !NOT_CELL_SIZED.has(r.key) && (Math.abs(r.worldW - r.dispW) > 1.01 || Math.abs(r.worldH - r.dispH) > 1.01));
  expect(bad, JSON.stringify(bad.slice(0, 8))).toEqual([]);
});

test('final art: sheets of 1x, 2x, 4x and 5x keep exactly the declared world size', async ({ page }) => {
  // id, anim frames per row layout from the manifest: columns = longest anim, rows = anim count.
  const deliver: { id: string; scale: number }[] = [
    { id: 'player_courier_run', scale: 4 },
    { id: 'player_courier_idle', scale: 2 },
    { id: 'enemy_scrap_hound', scale: 4 },
    { id: 'enemy_security_drone', scale: 5 },
    { id: 'obj_sync_relay', scale: 4 },
    { id: 'obj_security_door', scale: 4 },
    { id: 'obj_pressure_plate', scale: 2 },
    { id: 'pickup_scrap', scale: 4 },
    { id: 'fx_slash_side', scale: 4 },
    { id: 'npc_desert_man', scale: 4 },
    { id: 'npc_zero', scale: 4 },
  ];
  await page.addInitScript(() => undefined);
  const layouts = await (async () => {
    await page.goto('/');
    await page.waitForFunction(() => (window as unknown as AssetProbe).nullRequiemAssets !== undefined);
    return page.evaluate((ids) => {
      const w = window as unknown as AssetProbe;
      return ids.map((id) => {
        const a = w.nullRequiemAssets.ASSETS.find((x) => x.id === id)!;
        const frames = Object.values(a.anims).map((n) => n.frames);
        return { id, cols: Math.max(...frames), rows: frames.length, w: a.display.w, h: a.display.h, keys: a.textureKeys };
      });
    }, deliver.map((d) => d.id));
  })();
  const files: Record<string, Buffer> = {};
  const manifest: Record<string, { file: string }> = {};
  for (const l of layouts) {
    const sc = deliver.find((d) => d.id === l.id)!.scale;
    files[`${l.id}.png`] = solidPng(l.cols * l.w * sc, l.rows * l.h * sc, [255, 0, 255, 255]);
    manifest[l.id] = { file: `${l.id}.png` };
  }
  await page.route('**/assets/final/**', (route) => {
    const name = route.request().url().split('/assets/final/')[1]!.split('?')[0]!;
    if (name === 'manifest.json') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: 1, assets: manifest }) });
    const f = files[name];
    return f ? route.fulfill({ contentType: 'image/png', body: f }) : route.fulfill({ status: 404, body: '' });
  });
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await boot(page);
  const rows = await measure(page);
  const replaced = await page.evaluate((ids) => {
    const w = window as unknown as AssetProbe;
    const tm = w.nullRequiemGame.scene.getScene('title').textures;
    const res: Record<string, number> = {};
    for (const id of ids) {
      const a = w.nullRequiemAssets.ASSETS.find((x) => x.id === id)!;
      const k = a.textureKeys[0]!;
      res[id] = tm.exists(k) ? tm.get(k).source[0]!.resolution : -1;
    }
    return res;
  }, deliver.map((d) => d.id));
  for (const d of deliver) {
    // The source must report a resolution > 0 (it was replaced) and the world size must be the declared size.
    expect(replaced[d.id], `${d.id} was not loaded`).toBeGreaterThan(0);
    const mine = rows.filter((r) => r.id === d.id);
    expect(mine.length).toBeGreaterThan(0);
    for (const r of mine) {
      expect(Math.abs(r.worldW - r.dispW), `${r.key} width`).toBeLessThan(0.01);
      expect(Math.abs(r.worldH - r.dispH), `${r.key} height`).toBeLessThan(0.01);
    }
  }
  expect(errors.filter((e) => !/favicon|404/i.test(e))).toEqual([]);
});

test('a missing or malformed final-art file leaves the placeholder in place and the game running', async ({ page }) => {
  await page.route('**/assets/final/**', (route) => {
    const name = route.request().url().split('/assets/final/')[1]!.split('?')[0]!;
    if (name === 'manifest.json') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ assets: { player_courier_idle: { file: 'player_courier_idle.png' }, enemy_scrap_hound: { file: 'nope.png' }, not_an_asset: { file: 'x.png' } } }) });
    if (name === 'player_courier_idle.png') return route.fulfill({ contentType: 'image/png', body: solidPng(37, 91, [1, 2, 3, 255]) }); // wrong grid / ratio
    return route.fulfill({ status: 404, body: '' });
  });
  await boot(page);
  const rows = await measure(page);
  const idle = rows.find((r) => r.key === 'player-idle0')!;
  expect(idle.worldW).toBeCloseTo(31, 0);
  expect(idle.worldH).toBeCloseTo(36, 0);
});

test('final art renders at the right size on screen (pixel measurement of the Courier)', async ({ page }) => {
  // 4x Courier sheets: opaque magenta with a 8 px (= 2 logical px) transparent border, so the visible block is 27x32 logical px.
  const sheets: Record<string, Buffer> = {
    'player_courier_idle.png': solidPng(2 * 124, 144, [255, 0, 255, 255], 8),
    'player_courier_run.png': solidPng(4 * 124, 144, [255, 0, 255, 255], 8),
    'player_courier_jump.png': solidPng(124, 144, [255, 0, 255, 255], 8),
    'player_courier_fall.png': solidPng(124, 144, [255, 0, 255, 255], 8),
    'player_courier_dash.png': solidPng(124, 144, [255, 0, 255, 255], 8),
    'player_courier_attack.png': solidPng(124, 144, [255, 0, 255, 255], 8),
    'player_courier_hurt.png': solidPng(124, 144, [255, 0, 255, 255], 8),
  };
  const manifest = Object.fromEntries(Object.keys(sheets).map((f) => [f.replace('.png', ''), { file: f }]));
  await page.route('**/assets/final/**', (route) => {
    const name = route.request().url().split('/assets/final/')[1]!.split('?')[0]!;
    if (name === 'manifest.json') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ assets: manifest }) });
    const f = sheets[name];
    return f ? route.fulfill({ contentType: 'image/png', body: f }) : route.fulfill({ status: 404, body: '' });
  });
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { nullRequiemGame: { scene: { isActive(k: string): boolean } } }).nullRequiemGame?.scene.isActive('title'), null, { timeout: 20000 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as unknown as { nullRequiem?: { world: { flow: { state: string } } } }).nullRequiem?.world.flow.state === 'playing', null, { timeout: 20000 });
  await page.waitForTimeout(800);
  const shot = await page.screenshot();
  const { PNG } = await import('pngjs');
  const img = PNG.sync.read(shot);
  const match = (x: number, y: number): boolean => {
    const i = (y * img.width + x) * 4;
    return img.data[i]! > 70 && img.data[i + 1]! < 14 && img.data[i + 2]! > 70 && Math.abs(img.data[i]! - img.data[i + 2]!) < 14;
  };
  // Largest connected blob of magenta = the Courier (stray background pixels are tiny).
  const seen = new Uint8Array(img.width * img.height);
  let best = { n: 0, minX: 0, maxX: -1, minY: 0, maxY: -1 };
  for (let y0 = 0; y0 < img.height; y0++) {
    for (let x0 = 0; x0 < img.width; x0++) {
      if (seen[y0 * img.width + x0] || !match(x0, y0)) continue;
      const q = [[x0, y0]] as [number, number][];
      seen[y0 * img.width + x0] = 1;
      const c = { n: 0, minX: x0, maxX: x0, minY: y0, maxY: y0 };
      while (q.length) {
        const [x, y] = q.pop()!;
        c.n++; c.minX = Math.min(c.minX, x); c.maxX = Math.max(c.maxX, x); c.minY = Math.min(c.minY, y); c.maxY = Math.max(c.maxY, y);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= img.width || ny >= img.height || seen[ny * img.width + nx] || !match(nx, ny)) continue;
          seen[ny * img.width + nx] = 1;
          q.push([nx, ny]);
        }
      }
      if (c.n > best.n) best = c;
    }
  }
  const { minX, maxX, minY, maxY } = best;
  expect(maxX, 'no magenta Courier visible').toBeGreaterThan(0);
  const css = await page.evaluate(() => {
    const c = document.querySelector('canvas')!;
    return { w: c.clientWidth, h: c.clientHeight, vw: (window as unknown as { nullRequiemGame: { scale: { gameSize: { height: number } } } }).nullRequiemGame.scale.gameSize.height };
  });
  // The canvas fills the viewport, so the screenshot's height maps to the 270 logical px (device pixels included).
  const pxPerLogical = (img.height * (css.h / css.h)) / 270;
  const w = (maxX - minX + 1) / pxPerLogical;
  const h = (maxY - minY + 1) / pxPerLogical;
  expect(w).toBeGreaterThan(27 - 2);
  expect(w).toBeLessThan(27 + 2);
  expect(h).toBeGreaterThan(32 - 2);
  expect(h).toBeLessThan(32 + 2);
});
