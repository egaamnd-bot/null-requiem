import { describe, expect, it } from 'vitest';
import { ASSET_BY_ID } from '../src/assets/manifest';
import { fitsMargins, SKINS, skinKey, type SkinKind } from '../src/assets/ui9';

describe('nine-slice skins', () => {
  for (const kind of Object.keys(SKINS) as SkinKind[]) {
    const d = SKINS[kind];
    it(`${kind}: manifest asset, cell size, margins and state keys agree`, () => {
      const a = ASSET_BY_ID.get(d.assetId)!;
      expect(a, d.assetId).toBeTruthy();
      expect(a.display).toEqual(d.cell);
      expect(a.integration).toBe('swap-ready');
      expect(d.margins.left + d.margins.right).toBeLessThan(d.cell.w);
      expect(d.margins.top + d.margins.bottom).toBeLessThan(d.cell.h);
      for (const st of d.states) expect(a.textureKeys, `${kind}/${st}`).toContain(skinKey(kind, st));
      // every animation row of the manifest is a declared state (so a delivered row can never be ignored)
      const rows = Object.keys(a.anims).map((r) => (kind === 'panel' ? 'idle' : r));
      for (const r of rows) expect(d.states as readonly string[]).toContain(r);
    });
  }
  it('falls back to the idle art for a state that has none, and rejects rectangles smaller than the margins', () => {
    expect(skinKey('choice', 'pressed')).toBe(skinKey('choice', 'idle'));
    expect(skinKey('button', 'destructive')).toBe('ui_button_9slice__destructive_0');
    expect(fitsMargins('button', 56, 18)).toBe(true);
    expect(fitsMargins('button', 20, 18)).toBe(false);
    expect(fitsMargins('panel', 440, 104)).toBe(true);
  });
});
