// Contact sheet of the code-drawn actor textures at 3x world size, on a dark wet-concrete ground.
// usage: node tools/screenshots/sprites.mjs <out.png>   (vite preview must be running on :4173)
import { chromium } from '@playwright/test';
const out = process.argv[2] ?? 'sprites.png';
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await (await browser.newContext({ viewport: { width: 1400, height: 520 } })).newPage();
await page.goto('http://127.0.0.1:4173/');
await page.waitForFunction(() => window.nullRequiemGame?.scene.isActive('title'), null, { timeout: 30000 });
const url = await page.evaluate(() => {
  const g = window.nullRequiemGame;
  const rows = [
    ['idle0', 'run0', 'run2', 'jump', 'dash', 'attack', 'hurt'].map((f) => `player-${f}`),
    ['walk0', 'walk1', 'windup', 'lunge', 'recover'].map((f) => `hound-${f}`),
    ['idle0', 'idle1', 'charge'].map((f) => `drone-${f}`),
  ];
  const S = 3, cell = 170;
  const c = document.createElement('canvas');
  c.width = 7 * cell; c.height = rows.length * 190;
  const x = c.getContext('2d');
  const bg = x.createLinearGradient(0, 0, 0, c.height); bg.addColorStop(0, '#1a0d26'); bg.addColorStop(1, '#0a0614');
  x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
  rows.forEach((keys, r) => keys.forEach((k, i) => {
    const t = g.textures.get(k); if (!t || t.key === '__MISSING') return;
    const img = t.getSourceImage(); const f = t.get();
    const w = f.realWidth * S, h = f.realHeight * S;
    x.fillStyle = '#272c3e'; x.fillRect(i * cell, r * 190 + 170, cell, 4);
    x.drawImage(img, i * cell + (cell - w) / 2, r * 190 + 170 - h, w, h);
  }));
  return c.toDataURL('image/png');
});
const { writeFileSync } = await import('node:fs');
writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
await browser.close();
console.log('saved', out);
