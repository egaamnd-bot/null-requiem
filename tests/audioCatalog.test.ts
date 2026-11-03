import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AUDIO_BY_ID, AUDIO_CATALOG, ENTRY_FOR_CUE, ENTRY_FOR_THEME } from '../src/audio/catalog';
import { THEMES } from '../src/audio/musicTheory';

describe('audio catalog', () => {
  it('has unique snake_case ids and valid ranges', () => {
    expect(new Set(AUDIO_CATALOG.map((e) => e.id)).size).toBe(AUDIO_CATALOG.length);
    for (const e of AUDIO_CATALOG) {
      expect(e.id).toMatch(/^[a-z0-9_]+$/);
      expect(e.seconds[0]).toBeGreaterThan(0);
      expect(e.seconds[1]).toBeGreaterThanOrEqual(e.seconds[0]);
      expect(e.maxVoices).toBeGreaterThanOrEqual(1);
      expect(e.gainDb).toBeLessThanOrEqual(0);
      if (e.kind === 'music' || e.kind === 'ambience') expect(e.loop).toBe(true);
      if (e.kind === 'sfx' || e.kind === 'ui' || e.kind === 'stinger') expect(e.loop).toBe(false);
    }
  });
  it('maps each procedural cue and theme to at most one entry, and every theme exists', () => {
    const cues = AUDIO_CATALOG.filter((e) => e.cue).map((e) => e.cue);
    expect(new Set(cues).size).toBe(cues.length);
    const themes = AUDIO_CATALOG.filter((e) => e.theme).map((e) => e.theme!);
    expect(new Set(themes).size).toBe(themes.length);
    for (const t of themes) expect(Object.keys(THEMES)).toContain(t);
    expect(ENTRY_FOR_CUE.size).toBe(cues.length);
    expect(ENTRY_FOR_THEME.size).toBe(themes.length);
  });
  it('anything marked wired really has a cue or theme to attach to; hooks/engine entries have none', () => {
    for (const e of AUDIO_CATALOG) {
      if (e.engine === 'wired') expect(e.cue ?? e.theme ?? e.region, e.id).toBeTruthy();
      else expect(e.cue ?? e.theme ?? e.region, e.id).toBeUndefined();
    }
  });
  it('covers every sound id named in the creative handoff (UI sounds are renamed sfx_ui_*)', () => {
    const doc = readFileSync('docs/CREATIVE_PRODUCTION_HANDOFF.md', 'utf8');
    const section = doc.slice(doc.indexOf('## Workstream B'), doc.indexOf('## Workstream D'));
    const ids = [...section.matchAll(/`((?:music|amb|sfx|ui)_[a-z0-9_]+)`/g)].map((m) => m[1]!);
    expect(ids.length).toBeGreaterThanOrEqual(50);
    for (const id of ids) {
      const canonical = id.startsWith('ui_') ? `sfx_${id}` : id;
      expect(AUDIO_BY_ID.has(canonical), `${id} (${canonical}) missing from the catalog`).toBe(true);
    }
  });
});
