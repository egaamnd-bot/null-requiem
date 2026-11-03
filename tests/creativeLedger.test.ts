import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PACK_01_GROUPS, PACK_01_IDS } from '../src/assets/pack01';
import { ASSET_BY_ID } from '../src/assets/manifest';
import { UI_READY_IDS } from '../src/assets/uiReady';
import { AUDIO_CATALOG } from '../src/audio/catalog';

const log = readFileSync('docs/CREATIVE_DELIVERY_LOG.md', 'utf8');
const rows = [...log.matchAll(/^\| `([a-z0-9_]+)` \| ([^|]+) \| `([^`]+)` \| [^|]+ \| ([^|]+) \|/gm)].map((m) => ({ id: m[1]!, path: m[3]!, status: m[4]!.trim() }));

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? filesUnder(join(dir, e.name)) : [join(dir, e.name)]));
}

describe('creative delivery ledger', () => {
  it('lists every Pack 01 file and every catalogue sound exactly once', () => {
    const ids = rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of PACK_01_IDS) expect(ids, id).toContain(id);
    for (const e of AUDIO_CATALOG) expect(ids, e.id).toContain(e.id);
    for (const id of UI_READY_IDS) expect(ids, id).toContain(id);
    expect(rows.length).toBe(PACK_01_IDS.length + AUDIO_CATALOG.length + UI_READY_IDS.length);
  });
  it('never claims a delivery that is not in the repository', () => {
    for (const r of rows) {
      if (/^(Delivered|Integrated)/.test(r.status)) expect(existsSync(r.path), `${r.id}: ledger says ${r.status} but ${r.path} is missing`).toBe(true);
    }
  });
  it('has no runtime asset file without a Delivered/Integrated ledger row', () => {
    const claimed = new Set(rows.filter((r) => /^(Delivered|Integrated)/.test(r.status)).map((r) => r.path.replace(/\\/g, '/')));
    const real = [...filesUnder('public/assets/final'), ...filesUnder('public/audio')].map((f) => f.replace(/\\/g, '/')).filter((f) => /\.(png|webp|ogg|wav|mp3|m4a)$/i.test(f));
    for (const f of real) {
      // sound variations (<id>_01.ogg) are covered by their base id
      const base = f.replace(/_\d\d(\.[a-z0-9]+)$/i, '$1').replace(/\.(wav|mp3|m4a)$/i, '.ogg');
      expect(claimed.has(f) || claimed.has(base), `${f} is in public/ but not in the ledger`).toBe(true);
    }
  });
  it('every UI asset listed as receivable is swap-ready in the manifest', () => {
    for (const id of UI_READY_IDS) expect(ASSET_BY_ID.get(id)?.integration, id).toBe('swap-ready');
  });
  it('Pack 01 grouping matches the handoff counts and exists in the manifest as drop-in assets', () => {
    expect(Object.values(PACK_01_GROUPS).map((g) => g.length)).toEqual([11, 2, 1, 5, 9, 7, 3]);
    expect(PACK_01_IDS.length).toBe(38);
    for (const id of PACK_01_IDS) {
      const a = ASSET_BY_ID.get(id);
      expect(a, id).toBeTruthy();
      expect(a!.integration, id).toBe('swap-ready');
      expect(a!.textureKeys.length, id).toBeGreaterThan(0);
    }
  });
});
