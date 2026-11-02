import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AUDIO_BY_ID } from '../src/audio/catalog';
import { analyse, integratedLufs, parseOgg, parseWav, validateAgainstEntry } from '../src/audio/validate';

/** Little-endian PCM WAV from float channels. */
export function wav(chs: Float32Array[], rate = 48000, bits: 16 | 24 | 32 = 16): Uint8Array {
  const frames = chs[0]!.length;
  const bytes = bits / 8;
  const out = new Uint8Array(44 + frames * chs.length * bytes);
  const dv = new DataView(out.buffer);
  const w = (o: number, s: string) => [...s].forEach((c, i) => (out[o + i] = c.charCodeAt(0)));
  w(0, 'RIFF'); dv.setUint32(4, out.length - 8, true); w(8, 'WAVE'); w(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, chs.length, true); dv.setUint32(24, rate, true);
  dv.setUint32(28, rate * chs.length * bytes, true); dv.setUint16(32, chs.length * bytes, true); dv.setUint16(34, bits, true);
  w(36, 'data'); dv.setUint32(40, frames * chs.length * bytes, true);
  for (let f = 0; f < frames; f++) for (let c = 0; c < chs.length; c++) {
    const v = Math.max(-1, Math.min(1, chs[c]![f]!));
    const p = 44 + (f * chs.length + c) * bytes;
    if (bits === 16) dv.setInt16(p, Math.round(v * 32767), true);
    else if (bits === 24) { const i = Math.round(v * 8388607); out[p] = i & 255; out[p + 1] = (i >> 8) & 255; out[p + 2] = (i >> 16) & 255; }
    else dv.setInt32(p, Math.round(v * 2147483647), true);
  }
  return out;
}
const sine = (hz: number, seconds: number, amp: number, rate = 48000, phase = 0): Float32Array => Float32Array.from({ length: Math.round(seconds * rate) }, (_, i) => amp * Math.sin(2 * Math.PI * hz * (i / rate) + phase));
const ffmpegOk = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
const entry = (id: string) => AUDIO_BY_ID.get(id)!;

describe('WAV parsing and analysis', () => {
  it('round-trips 16/24/32-bit PCM, mono and stereo', () => {
    for (const bits of [16, 24, 32] as const) {
      const s = sine(440, 0.1, 0.5);
      const p = parseWav(wav([s, s], 44100, bits));
      expect([p.sampleRate, p.channels, p.bitDepth]).toEqual([44100, 2, bits]);
      expect(p.samples[0]!.length).toBe(s.length);
      expect(Math.abs(p.samples[0]![123]! - s[123]!)).toBeLessThan(0.001);
    }
  });
  it('rejects non-WAV and truncated data', () => {
    expect(() => parseWav(new Uint8Array(10))).toThrow();
    expect(() => parseWav(new Uint8Array(100))).toThrow(/RIFF/);
  });
  it('measures peak, clipping, loudness (a −20 dBFS-peak 997 Hz sine is ≈ −23 LUFS) and silence', () => {
    const a = analyse(parseWav(wav([sine(997, 3, 0.1)])));
    expect(a.peakDb).toBeCloseTo(-20, 0);
    expect(a.clippedSamples).toBe(0);
    expect(a.lufs!).toBeGreaterThan(-26);
    expect(a.lufs!).toBeLessThan(-22);
    expect(analyse(parseWav(wav([sine(440, 0.5, 1)]))).clippedSamples).toBeGreaterThan(0);
    expect(analyse(parseWav(wav([new Float32Array(4800)]))).silent).toBe(true);
    expect(integratedLufs({ samples: [new Float32Array(100)], sampleRate: 48000 })).toBeNull();
  });
  it('detects a loop click (non-matching seam) but not a seamless loop', () => {
    const seamless = analyse(parseWav(wav([sine(100, 2, 0.4)]))); // exactly 200 cycles
    const clicky = analyse(parseWav(wav([sine(100.25, 2, 0.4, 48000, 1.2)])));
    expect(seamless.loopSeamRatio).toBeLessThan(8);
    expect(clicky.loopSeamRatio).toBeGreaterThan(8);
  });
});

describe('validation against the catalog', () => {
  const codes = (e: string, info: { sampleRate: number; channels: number; ext: string }, a: Parameters<typeof validateAgainstEntry>[2]) => validateAgainstEntry(entry(e), info, a).map((i) => i.code);
  it('flags durations outside the window, clipping, silence and stereo SFX', () => {
    const ok = { durationSeconds: 0.3, peakDb: -12, clippedSamples: 0, lufs: -30, leadingSilenceMs: 5, trailingSilenceMs: 5, loopSeamRatio: 0, dcOffset: 0, silent: false };
    expect(codes('sfx_player_jump', { sampleRate: 48000, channels: 1, ext: '.wav' }, ok)).toEqual([]);
    expect(codes('sfx_player_jump', { sampleRate: 48000, channels: 1, ext: '.wav' }, { ...ok, durationSeconds: 9 })).toContain('E-DURATION');
    expect(codes('sfx_player_jump', { sampleRate: 48000, channels: 2, ext: '.wav' }, ok)).toContain('W-STEREO-SFX');
    expect(codes('sfx_player_jump', { sampleRate: 48000, channels: 1, ext: '.wav' }, { ...ok, clippedSamples: 3, peakDb: 0 })).toContain('E-CLIPPING');
    expect(codes('sfx_player_jump', { sampleRate: 48000, channels: 1, ext: '.wav' }, { ...ok, silent: true })).toContain('E-SILENT');
    expect(codes('sfx_player_jump', { sampleRate: 8000, channels: 1, ext: '.wav' }, ok)).toContain('E-SAMPLE-RATE');
    expect(codes('sfx_player_jump', { sampleRate: 48000, channels: 1, ext: '.wav' }, { ...ok, leadingSilenceMs: 300 })).toContain('W-LEADING-SILENCE');
  });
  it('requires seamless loops and the loudness target for music', () => {
    const m = { durationSeconds: 80, peakDb: -3, clippedSamples: 0, lufs: -16, leadingSilenceMs: 0, trailingSilenceMs: 0, loopSeamRatio: 1, dcOffset: 0, silent: false };
    expect(codes('music_title_theme', { sampleRate: 44100, channels: 2, ext: '.ogg' }, m)).toEqual([]);
    expect(codes('music_title_theme', { sampleRate: 44100, channels: 2, ext: '.ogg' }, { ...m, loopSeamRatio: 30 })).toContain('E-LOOP-SEAM');
    expect(codes('music_title_theme', { sampleRate: 44100, channels: 2, ext: '.ogg' }, { ...m, lufs: -8 })).toContain('W-LOUDNESS');
    expect(codes('music_title_theme', { sampleRate: 44100, channels: 2, ext: '.ogg' }, { ...m, trailingSilenceMs: 900 })).toContain('W-LOOP-SILENCE');
    expect(codes('music_title_theme', { sampleRate: 44100, channels: 1, ext: '.ogg' }, m)).toContain('W-MONO-MUSIC');
  });
});

describe.skipIf(!ffmpegOk)('Ogg Vorbis and the CLI (needs ffmpeg)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audio-'));
  const encode = (name: string, w: Uint8Array) => {
    const wavPath = join(dir, `${name}.wav`);
    writeFileSync(wavPath, w);
    const ogg = join(dir, `${name}.ogg`);
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', wavPath, '-c:a', 'libvorbis', '-q:a', '5', ogg]);
    expect(r.status).toBe(0);
    return ogg;
  };
  it('reads codec, rate, channels and duration from an Ogg Vorbis header', () => {
    const ogg = encode('probe', wav([sine(440, 1.5, 0.3, 44100)], 44100));
    const o = parseOgg(new Uint8Array(readFileSync(ogg)));
    expect(o).toMatchObject({ codec: 'vorbis', sampleRate: 44100, channels: 1 });
    expect(o.durationSeconds).toBeCloseTo(1.5, 1);
    expect(() => parseOgg(new Uint8Array(100))).toThrow();
  });
  it('CLI: accepts good sounds into public/audio + manifest, rejects bad ones, never writes rejected files', () => {
    const inDir = join(dir, 'in');
    const outDir = join(dir, 'out');
    mkdirSync(inDir, { recursive: true });
    // good: a 0.3 s mono jump sound as WAV (sfx ≤ 3 s may stay WAV) with two variations
    writeFileSync(join(inDir, 'sfx_player_jump_01.wav'), wav([sine(500, 0.3, 0.25)]));
    writeFileSync(join(inDir, 'sfx_player_jump_02.wav'), wav([sine(600, 0.3, 0.25)]));
    // good music: 70 s seamless stereo loop delivered as WAV → needs --encode
    const loop = sine(110, 70, 0.14, 22050); // exactly 7700 cycles
    writeFileSync(join(inDir, 'music_title_theme.wav'), wav([loop, loop], 22050));
    writeFileSync(join(inDir, 'music_title_theme.json'), JSON.stringify({ loopStart: 0, loopEnd: 70, gainDb: -2 }));
    // bad: clipped, wrong id, wrong length
    writeFileSync(join(inDir, 'sfx_player_dash.wav'), wav([sine(300, 0.3, 1)]));
    writeFileSync(join(inDir, 'jump_final.wav'), wav([sine(300, 0.3, 0.2)]));
    writeFileSync(join(inDir, 'sfx_player_land.wav'), wav([sine(300, 12, 0.2)]));
    const run = (extra: string[]) => spawnSync(join(process.cwd(), 'node_modules/.bin/tsx'), ['tools/audio/build.ts', '--in', inDir, '--out', outDir, ...extra], { cwd: process.cwd(), encoding: 'utf8' });
    const noEnc = run([]);
    expect(noEnc.status).toBe(1);
    expect(noEnc.stdout).toMatch(/E-NEEDS-OGG/);
    const r = run(['--encode']);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/E-CLIPPING/);
    expect(r.stdout).toMatch(/E-UNKNOWN-SOUND/);
    expect(r.stdout).toMatch(/E-DURATION/);
    const m = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf8')) as { sounds: Record<string, { files: { file: string; loopEnd?: number; gainDb?: number }[] }> };
    expect(Object.keys(m.sounds).sort()).toEqual(['music_title_theme', 'sfx_player_jump']);
    expect(m.sounds.sfx_player_jump!.files.map((f) => f.file)).toEqual(['sfx_player_jump_01.wav', 'sfx_player_jump_02.wav']);
    expect(m.sounds.music_title_theme!.files[0]).toMatchObject({ file: 'music_title_theme.ogg', loopEnd: 70, gainDb: -2 });
    expect(existsSync(join(outDir, 'music', 'music_title_theme.ogg'))).toBe(true);
    expect(existsSync(join(outDir, 'sfx', 'sfx_player_jump_01.wav'))).toBe(true);
    expect(existsSync(join(outDir, 'sfx', 'sfx_player_dash.wav'))).toBe(false);
    expect(readFileSync(join(outDir, 'report.md'), 'utf8')).toMatch(/rejected/);
  }, 120_000);
});
