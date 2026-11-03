import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { ASSET_BY_ID } from '../src/assets/manifest';
import { parseFinalManifest } from '../src/assets/sheet';
import { validateSheet } from '../src/assets/validate';
import { AUDIO_BY_ID } from '../src/audio/catalog';
import { parseAudioManifest } from '../src/audio/files';
import { analyse, parseOgg, parseWav, validateAgainstEntry } from '../src/audio/validate';

/**
 * Guards for everything that has actually been DELIVERED into public/ (empty today, so these loops run zero times).
 * The day ChatGPT's first batch lands, these tests re-validate every delivered file with the same rules as the build tools.
 */
const art = existsSync('public/assets/final/manifest.json') ? parseFinalManifest(JSON.parse(readFileSync('public/assets/final/manifest.json', 'utf8'))) : { assets: {} };
const audio = existsSync('public/audio/manifest.json') ? parseAudioManifest(JSON.parse(readFileSync('public/audio/manifest.json', 'utf8'))) : { sounds: {} };

describe('delivered visual assets (public/assets/final)', () => {
  it('every manifest entry is a known id whose file exists and passes sheet validation with no errors', () => {
    for (const [id, { file }] of Object.entries(art.assets)) {
      const def = ASSET_BY_ID.get(id);
      expect(def, `${id} is not a manifest id`).toBeTruthy();
      const path = join('public/assets/final', file);
      expect(existsSync(path), `${path} missing`).toBe(true);
      const png = PNG.sync.read(readFileSync(path));
      const r = validateSheet(def!, { width: png.width, height: png.height, data: png.data });
      expect(r.issues.filter((i) => i.level === 'error').map((i) => `${i.code}: ${i.message}`), id).toEqual([]);
    }
  });
});

describe('delivered audio (public/audio)', () => {
  it('every manifest entry has existing files that pass the catalog checks with no errors', () => {
    for (const [id, { files }] of Object.entries(audio.sounds)) {
      const entry = AUDIO_BY_ID.get(id);
      expect(entry, `${id} is not a catalog id`).toBeTruthy();
      for (const f of files) {
        const path = join('public/audio', entry!.dir, f.file);
        expect(existsSync(path), `${path} missing`).toBe(true);
        const bytes = new Uint8Array(readFileSync(path));
        if (f.file.toLowerCase().endsWith('.wav')) {
          const pcm = parseWav(bytes);
          const issues = validateAgainstEntry(entry!, { sampleRate: pcm.sampleRate, channels: pcm.channels, ext: '.wav' }, analyse(pcm));
          expect(issues.filter((i) => i.level === 'error').map((i) => i.message), `${id}/${f.file}`).toEqual([]);
        } else {
          const og = parseOgg(bytes);
          expect(og.codec, `${f.file} must be Ogg Vorbis`).toBe('vorbis');
          const issues = validateAgainstEntry(entry!, { sampleRate: og.sampleRate, channels: og.channels, ext: '.ogg', codec: og.codec }, { durationSeconds: og.durationSeconds });
          expect(issues.filter((i) => i.level === 'error').map((i) => i.message), `${id}/${f.file}`).toEqual([]);
        }
      }
    }
  });
});
