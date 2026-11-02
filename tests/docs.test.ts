import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderAssetManifest, renderGeminiSpec } from '../src/assets/docs';
import { ASSETS } from '../src/assets/manifest';
import { PACKS, type PackId } from '../src/assets/types';
import { renderWorldMap } from '../src/world/docs';

const DOCS: [string, () => string][] = [
  ['docs/GEMINI_ASSET_SPEC.md', renderGeminiSpec],
  ['docs/ASSET_MANIFEST.md', renderAssetManifest],
  ['docs/WORLD_MAP.md', renderWorldMap],
];

describe('generated docs', () => {
  for (const [path, render] of DOCS) {
    it(`${path} is up to date (run: npm run docs:assets)`, () => {
      const text = render();
      if (process.env.UPDATE_ASSET_DOCS) {
        mkdirSync('docs', { recursive: true });
        writeFileSync(path, text);
      }
      expect(existsSync(path), `${path} missing`).toBe(true);
      expect(readFileSync(path, 'utf8')).toBe(text);
    });
  }
});

describe('asset manifest', () => {
  it('has unique ids', () => {
    expect(new Set(ASSETS.map((a) => a.id)).size).toBe(ASSETS.length);
  });
  it('uses valid snake_case ids and known packs; every pack has assets; visuals have palettes', () => {
    for (const a of ASSETS) {
      expect(a.id).toMatch(/^[a-z0-9_]+$/);
      expect(PACKS[a.pack]).toBeTruthy();
      if (!a.audio) expect(a.palette.length, a.id).toBeGreaterThan(0);
      for (const k of a.textureKeys) expect(k.length).toBeGreaterThan(0);
    }
    for (const p of Object.keys(PACKS) as PackId[]) expect(ASSETS.some((a) => a.pack === p), p).toBe(true);
  });
  it('procedural placeholders list exactly one texture key per frame', () => {
    for (const a of ASSETS) {
      if (a.placeholder !== 'procedural' && a.placeholder !== 'procedural-legacy') continue;
      const frames = Object.values(a.anims).reduce((n, x) => n + x.frames, 0);
      expect(a.textureKeys.length, a.id).toBe(frames);
    }
  });
  it('every audio asset declares format and duration', () => {
    for (const a of ASSETS.filter((x) => x.category === 'audio')) {
      expect(a.audio, a.id).toBeTruthy();
      expect(a.audio!.durationSeconds).toBeGreaterThan(0);
    }
  });
});
