/**
 * Audio validation & assembly CLI.
 *
 *   npm run audio:build -- --in art/incoming/audio --out public/audio [--encode] [--validate-only]
 *
 * Input files (flat folder): `<id>.ogg|wav`, variations `<id>_01.ogg`…, optional sidecar `<id>.json`
 * `{ "loopStart": s, "loopEnd": s, "gainDb": dB }`. Ids come from src/audio/catalog.ts (UI sounds are `sfx_ui_*`).
 * Output: public/audio/<dir>/<file>, public/audio/manifest.json (merged), report.md/json. Rejected sounds are never written.
 * Runtime format is Ogg Vorbis; WAV is only accepted for sfx/ui shorter than 3 s. `--encode` converts WAV → Ogg with ffmpeg if installed.
 * Ogg files are decoded with ffmpeg (when installed) for level/loudness/loop analysis; otherwise only the header is checked (warning).
 * Exit code 1 when any sound has an error (unless --allow-errors).
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { AUDIO_BY_ID, AUDIO_CATALOG, type AudioEntry } from '../../src/audio/catalog';
import type { AudioFile, AudioManifest } from '../../src/audio/files';
import { analyse, parseOgg, parseWav, validateAgainstEntry, type AudioIssue, type PcmInfo } from '../../src/audio/validate';

interface Args {
  in: string;
  out: string;
  encode: boolean;
  validateOnly: boolean;
  merge: boolean;
  allowErrors: boolean;
  report: string | null;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { in: 'art/incoming/audio', out: 'public/audio', encode: false, validateOnly: false, merge: true, allowErrors: false, report: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]!;
    if (k === '--in') a.in = argv[++i] ?? '';
    else if (k === '--out') a.out = argv[++i] ?? '';
    else if (k === '--report') a.report = argv[++i] ?? '';
    else if (k === '--encode') a.encode = true;
    else if (k === '--validate-only') a.validateOnly = true;
    else if (k === '--no-merge') a.merge = false;
    else if (k === '--allow-errors') a.allowErrors = true;
    else throw new Error(`Unknown option ${k}`);
  }
  return a;
}

const hasFfmpeg = (): boolean => spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;

function decodeWithFfmpeg(file: string, channels: number, rate: number): PcmInfo | null {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', String(channels), '-ar', String(rate), '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0 || !r.stdout?.length) return null;
  const raw = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.byteLength / 4));
  const frames = Math.floor(raw.length / channels);
  const samples = Array.from({ length: channels }, (_, c) => Float32Array.from({ length: frames }, (_, f) => raw[f * channels + c]!));
  return { sampleRate: rate, channels, samples, bitDepth: 32 };
}

export interface SoundOutcome {
  id: string;
  status: 'accepted' | 'accepted-with-warnings' | 'rejected';
  files: AudioFile[];
  issues: AudioIssue[];
}

const err = (id: string, code: string, message: string): AudioIssue => ({ level: 'error', code, id, message });
const warn = (id: string, code: string, message: string): AudioIssue => ({ level: 'warn', code, id, message });

export function run(args: Args): { outcomes: SoundOutcome[]; other: AudioIssue[]; exitCode: number } {
  const inDir = resolve(args.in);
  const outDir = resolve(args.out);
  if (!existsSync(inDir)) throw new Error(`Input folder not found: ${inDir}`);
  const ffmpeg = hasFfmpeg();
  const groups = new Map<string, string[]>();
  const other: AudioIssue[] = [];
  for (const e of readdirSync(inDir)) {
    if (e.startsWith('.') || /^report\.(md|json)$/.test(e) || /^readme/i.test(e) || extname(e) === '.json' || statSync(join(inDir, e)).isDirectory()) continue;
    const m = /^(.+?)(?:_(\d{2}))?\.(wav|ogg)$/i.exec(e);
    if (!m) {
      other.push(warn(e, 'W-IGNORED-FILE', `"${e}" is not an .ogg/.wav sound file and was ignored.`));
      continue;
    }
    const full = basename(e, extname(e));
    const id = AUDIO_BY_ID.has(full) ? full : m[1]!;
    if (!AUDIO_BY_ID.has(id)) {
      other.push(err(e, 'E-UNKNOWN-SOUND', `"${e}" does not match any catalog id (src/audio/catalog.ts; UI sounds are sfx_ui_*).`));
      continue;
    }
    groups.set(id, [...(groups.get(id) ?? []), e]);
  }

  const outcomes: SoundOutcome[] = [];
  const toWrite: { from: string; to: string }[] = [];
  const encodes: { from: string; id: string; file: string }[] = [];
  for (const [id, names] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    const entry = AUDIO_BY_ID.get(id) as AudioEntry;
    const o: SoundOutcome = { id, status: 'rejected', files: [], issues: [] };
    outcomes.push(o);
    const stems = names.map((n) => basename(n, extname(n)));
    if (new Set(stems).size !== stems.length) o.issues.push(err(id, 'E-DUPLICATE-FORMAT', 'the same file exists as both .wav and .ogg; deliver one.'));
    const files: { file: AudioFile; from: string; to: string; encode: boolean }[] = [];
    for (const name of names.sort()) {
      const from = join(inDir, name);
      const ext = extname(name).toLowerCase();
      const stem = basename(name, extname(name));
      let issues: AudioIssue[] = [];
      let duration = 0;
      try {
        const bytes = new Uint8Array(readFileSync(from));
        let pcm: PcmInfo | null = null;
        let info: { sampleRate: number; channels: number; ext: string; codec?: string };
        if (ext === '.wav') {
          pcm = parseWav(bytes);
          info = { sampleRate: pcm.sampleRate, channels: pcm.channels, ext };
        } else {
          const og = parseOgg(bytes);
          info = { sampleRate: og.sampleRate, channels: og.channels, ext, codec: og.codec };
          duration = og.durationSeconds;
          if (ffmpeg) pcm = decodeWithFfmpeg(from, Math.min(2, og.channels), og.sampleRate);
          if (!pcm) issues.push(warn(id, 'W-NOT-ANALYSED', `${name}: levels, loudness and loop seam were not analysed (install ffmpeg to decode Ogg here); only the header was checked.`));
        }
        const a = pcm ? analyse(pcm) : { durationSeconds: duration };
        issues = [...issues, ...validateAgainstEntry(entry, info, a)].map((i) => ({ ...i, message: `${name}: ${i.message}` }));
        duration = a.durationSeconds;
        const short = (entry.kind === 'sfx' || entry.kind === 'ui') && duration <= 3;
        let to = `${stem}${ext}`;
      let encode = false;
        if (ext === '.wav' && !short) {
          if (args.encode && ffmpeg) {
            to = `${stem}.ogg`;
            encode = true;
          } else issues.push(err(id, 'E-NEEDS-OGG', `${name}: ${entry.kind} must be delivered as Ogg Vorbis (WAV is only accepted for sfx/ui up to 3 s). Re-run with --encode (needs ffmpeg) or encode it yourself.`));
        }
        const sidecar = join(inDir, `${stem}.json`);
        let side: { loopStart?: number; loopEnd?: number; gainDb?: number } = {};
        if (existsSync(sidecar)) {
          try {
            side = JSON.parse(readFileSync(sidecar, 'utf8')) as typeof side;
          } catch {
            issues.push(err(id, 'E-SIDECAR', `${stem}.json is not valid JSON.`));
          }
        }
        if (entry.loop && side.loopEnd !== undefined && side.loopEnd > duration + 0.001) issues.push(err(id, 'E-LOOP-POINT', `${stem}.json loopEnd ${side.loopEnd} s is beyond the file (${duration.toFixed(2)} s).`));
        files.push({ encode, from, to, file: { file: to, durationSeconds: Math.round(duration * 1000) / 1000, ...(side.loopStart !== undefined ? { loopStart: side.loopStart } : {}), ...(side.loopEnd !== undefined ? { loopEnd: side.loopEnd } : {}), ...(side.gainDb !== undefined ? { gainDb: side.gainDb } : {}) } });
      } catch (e) {
        issues.push(err(id, 'E-UNREADABLE', `${name}: ${(e as Error).message}`));
      }
      o.issues.push(...issues);
    }
    if (o.issues.some((i) => i.level === 'error')) continue;
    o.files = files.map((f) => f.file);
    o.status = o.issues.some((i) => i.level === 'warn') ? 'accepted-with-warnings' : 'accepted';
    for (const f of files) {
      if (f.encode) encodes.push({ from: f.from, id, file: f.to });
      else toWrite.push({ from: f.from, to: join(outDir, entry.dir, f.to) });
    }
  }

  const all = [...other, ...outcomes.flatMap((o) => o.issues)];
  const errors = all.filter((i) => i.level === 'error').length;
  const warnings = all.filter((i) => i.level === 'warn').length;
  const accepted = outcomes.filter((o) => o.status !== 'rejected');

  if (!args.validateOnly) {
    for (const o of accepted) mkdirSync(join(outDir, (AUDIO_BY_ID.get(o.id) as AudioEntry).dir), { recursive: true });
    for (const w of toWrite) copyFileSync(w.from, w.to);
    for (const e of encodes) {
      const to = join(outDir, (AUDIO_BY_ID.get(e.id) as AudioEntry).dir, e.file);
      const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', e.from, '-c:a', 'libvorbis', '-q:a', '5', to]);
      if (r.status !== 0) throw new Error(`ffmpeg failed to encode ${e.from}`);
    }
    mkdirSync(outDir, { recursive: true });
    const mf = join(outDir, 'manifest.json');
    let manifest: AudioManifest = { version: 1, sounds: {} };
    if (args.merge && existsSync(mf)) {
      try {
        manifest = JSON.parse(readFileSync(mf, 'utf8')) as AudioManifest;
      } catch {
        /* a corrupt manifest is replaced */
      }
    }
    for (const o of accepted) manifest.sounds[o.id] = { files: o.files };
    writeFileSync(mf, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  const reportDir = resolve(args.report ?? (args.validateOnly ? args.in : args.out));
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, 'report.json'), `${JSON.stringify({ errors, warnings, sounds: outcomes, other }, null, 2)}\n`);
  writeFileSync(join(reportDir, 'report.md'), renderReport(outcomes, other, errors, warnings, args, ffmpeg));
  return { outcomes, other, exitCode: errors > 0 && !args.allowErrors ? 1 : 0 };
}

function renderReport(outcomes: SoundOutcome[], other: AudioIssue[], errors: number, warnings: number, args: Args, ffmpeg: boolean): string {
  const L = [
    '# Audio build report',
    '',
    `Input \`${args.in}\` → \`${args.out}\`${args.validateOnly ? ' (validate only)' : ''}. **${outcomes.filter((o) => o.status !== 'rejected').length} accepted, ${outcomes.filter((o) => o.status === 'rejected').length} rejected**, ${errors} error(s), ${warnings} warning(s). Ogg analysis ${ffmpeg ? 'via ffmpeg decode' : 'header-only (ffmpeg not installed)'}.`,
    '',
    '| Sound | Result | Files | Issues |',
    '| --- | --- | --- | ---: |',
    ...outcomes.map((o) => `| \`${o.id}\` | ${o.status} | ${o.files.length} | ${o.issues.length} |`),
    '',
  ];
  for (const o of outcomes.filter((x) => x.issues.length)) {
    L.push(`### \`${o.id}\``, '');
    for (const i of o.issues) L.push(`- **${i.level.toUpperCase()}** \`${i.code}\`: ${i.message}`);
    L.push('');
  }
  if (other.length) {
    L.push('### Unrecognised input', '');
    for (const i of other) L.push(`- **${i.level.toUpperCase()}** \`${i.code}\`: ${i.message}`);
    L.push('');
  }
  const have = new Set(outcomes.filter((o) => o.status !== 'rejected').map((o) => o.id));
  L.push(`_${AUDIO_CATALOG.length - have.size} of ${AUDIO_CATALOG.length} catalogue sounds are not part of the accepted set._`, '');
  return L.join('\n');
}

const isMain = process.argv[1] && resolve(process.argv[1]).endsWith(join('audio', 'build.ts'));
if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const { outcomes, other, exitCode } = run(args);
    for (const o of outcomes) {
      console.log(`${o.status === 'rejected' ? '✘' : o.issues.length ? '!' : '✔'} ${o.id}  ${o.status}`);
      for (const i of o.issues) console.log(`    ${i.level === 'error' ? 'ERROR' : 'warn '} ${i.code}: ${i.message}`);
    }
    for (const i of other) console.log(`${i.level === 'error' ? 'ERROR' : 'warn '} ${i.code}: ${i.message}`);
    process.exit(exitCode);
  } catch (e) {
    console.error((e as Error).message);
    process.exit(2);
  }
}
