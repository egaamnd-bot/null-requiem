/**
 * Asset assembly & validation CLI.
 *
 *   npm run assets:build -- --in art/incoming --out public/assets/final [options]
 *
 * Input (either form per asset id, never both):
 *   <in>/<asset_id>.png                      a completed sheet
 *   <in>/<asset_id>/<anim>_<NN>.png          loose frames, NN = 01.. (single-animation assets may use <NN>.png)
 * Output:
 *   <out>/<asset_id>.png     exact sheet (only for assets without errors)
 *   <out>/manifest.json      the loader manifest (merged with the existing one unless --no-merge)
 *   <out>/atlas.json         frame rectangles and runtime texture keys of every accepted sheet
 *   <out>/report.json|.md    every issue found. Nothing is ever accepted silently.
 * Exit code 1 when any asset has an error (unless --allow-errors).
 *
 * Options: --report <dir>, --chroma RRGGBB (key loose frames), --tolerance N (default 60), --only id,id,
 *          --validate-only (write nothing but the report), --no-merge, --allow-errors, --strict (warnings fail too)
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PNG } from 'pngjs';
import { ASSET_BY_ID, ASSETS } from '../../src/assets/manifest';
import { assembleSheet, atlasFrames, keyOutChroma, validateSheet, type Issue, type Rgba } from '../../src/assets/validate';

interface Args {
  in: string;
  out: string;
  chroma: [number, number, number] | null;
  tolerance: number;
  only: Set<string> | null;
  validateOnly: boolean;
  merge: boolean;
  allowErrors: boolean;
  strict: boolean;
  report: string | null;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { in: 'art/incoming', out: 'public/assets/final', chroma: null, tolerance: 60, only: null, validateOnly: false, merge: true, allowErrors: false, strict: false, report: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]!;
    const next = () => argv[++i] ?? '';
    if (k === '--in') a.in = next();
    else if (k === '--out') a.out = next();
    else if (k === '--chroma') {
      const h = next().replace('#', '');
      if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error('--chroma expects RRGGBB');
      a.chroma = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    } else if (k === '--tolerance') a.tolerance = Number(next());
    else if (k === '--only') a.only = new Set(next().split(',').filter(Boolean));
    else if (k === '--validate-only') a.validateOnly = true;
    else if (k === '--no-merge') a.merge = false;
    else if (k === '--allow-errors') a.allowErrors = true;
    else if (k === '--strict') a.strict = true;
    else if (k === '--report') a.report = next();
    else throw new Error(`Unknown option ${k}`);
  }
  return a;
}

const readPng = (file: string): Rgba => {
  const p = PNG.sync.read(readFileSync(file));
  return { width: p.width, height: p.height, data: p.data };
};
const writePng = (file: string, img: Rgba): void => {
  const p = new PNG({ width: img.width, height: img.height });
  p.data = Buffer.from(img.data);
  writeFileSync(file, PNG.sync.write(p));
};

export interface AssetOutcome {
  id: string;
  status: 'accepted' | 'rejected' | 'accepted-with-warnings';
  source: 'sheet' | 'frames';
  file?: string;
  scale?: number;
  sheet?: { w: number; h: number };
  issues: Issue[];
}

const err = (asset: string, code: string, message: string): Issue => ({ level: 'error', code, asset, message });
const warn = (asset: string, code: string, message: string): Issue => ({ level: 'warn', code, asset, message });

export function run(args: Args): { outcomes: AssetOutcome[]; unknown: Issue[]; exitCode: number } {
  const inDir = resolve(args.in);
  const outDir = resolve(args.out);
  if (!existsSync(inDir)) throw new Error(`Input folder not found: ${inDir}`);
  const entries = readdirSync(inDir);
  const unknown: Issue[] = [];
  const outcomes: AssetOutcome[] = [];
  const atlas: Record<string, unknown> = {};
  const accepted: Record<string, { file: string }> = {};
  if (!args.validateOnly) mkdirSync(outDir, { recursive: true });

  const ids = new Set<string>();
  for (const e of entries) {
    const full = join(inDir, e);
    const isDir = statSync(full).isDirectory();
    const id = isDir ? e : e.replace(/\.png$/i, '');
    if (!isDir && !/\.png$/i.test(e)) {
      unknown.push(warn(e, 'W-IGNORED-FILE', `"${e}" is not a PNG and was ignored (PNG-32 is the required format).`));
      continue;
    }
    if (!ASSET_BY_ID.has(id)) {
      unknown.push(err(e, 'E-UNKNOWN-ASSET', `"${e}" does not match any asset id in the manifest (ids are exact, lowercase snake_case; never renamed).`));
      continue;
    }
    ids.add(id);
  }

  for (const id of [...ids].sort()) {
    if (args.only && !args.only.has(id)) continue;
    const def = ASSET_BY_ID.get(id)!;
    const sheetFile = join(inDir, `${id}.png`);
    const dir = join(inDir, id);
    const hasSheet = existsSync(sheetFile) && statSync(sheetFile).isFile();
    const hasDir = existsSync(dir) && statSync(dir).isDirectory();
    const o: AssetOutcome = { id, status: 'rejected', source: hasSheet ? 'sheet' : 'frames', issues: [] };
    outcomes.push(o);
    if (hasSheet && hasDir) {
      o.issues.push(err(id, 'E-DUPLICATE-INPUT', 'both a sheet and a frames folder exist; deliver exactly one.'));
      continue;
    }
    let sheet: Rgba | null = null;
    try {
      if (hasSheet) {
        sheet = readPng(sheetFile);
        const v = validateSheet(def, sheet);
        o.issues.push(...v.issues);
        o.scale = v.scale;
        if (v.scale === 0) sheet = null;
      } else {
        const frames = new Map<string, Rgba>();
        for (const f of readdirSync(dir).sort()) {
          if (!/\.png$/i.test(f)) {
            o.issues.push(warn(id, 'W-IGNORED-FILE', `${f}: not a PNG, ignored.`));
            continue;
          }
          const m = /^(?:(.+)_)?(\d+)\.png$/i.exec(f);
          const animNames = Object.keys(def.anims);
          const anim = m?.[1] ?? (animNames.length === 1 ? animNames[0] : undefined);
          if (!m || !anim) {
            o.issues.push(err(id, 'E-BAD-FRAME-NAME', `${f}: expected "<anim>_<NN>.png" (NN starts at 01; animations: ${animNames.join(', ')}).`));
            continue;
          }
          const n = parseInt(m[2]!, 10);
          if (n < 1) {
            o.issues.push(err(id, 'E-BAD-FRAME-NAME', `${f}: frame numbers start at 01.`));
            continue;
          }
          const key = `${anim}:${n - 1}`;
          if (frames.has(key)) {
            o.issues.push(err(id, 'E-DUPLICATE-FRAME', `${f}: frame ${anim}_${n} delivered twice.`));
            continue;
          }
          const img = readPng(join(dir, f));
          if (args.chroma) {
            const k = keyOutChroma(img, args.chroma, args.tolerance);
            if (k.fringe > 0) o.issues.push(warn(id, 'W-CHROMA-FRINGE', `${f}: ${k.fringe} green-tinted edge pixel(s) remain after keying; clean the edge or lower the background bleed.`));
          }
          frames.set(key, img);
        }
        const r = assembleSheet(def, frames);
        o.issues.push(...r.issues);
        sheet = r.sheet;
        if (sheet) o.scale = sheet.width / (Math.max(...Object.values(def.anims).map((a) => a.frames)) * def.display.w);
      }
    } catch (e) {
      o.issues.push(err(id, 'E-UNREADABLE', `could not read/decode: ${(e as Error).message}`));
      sheet = null;
    }
    const hasErr = o.issues.some((i) => i.level === 'error');
    if (!sheet || hasErr) {
      o.status = 'rejected';
      continue;
    }
    o.sheet = { w: sheet.width, h: sheet.height };
    o.file = `${id}.png`;
    o.status = o.issues.some((i) => i.level === 'warn') ? 'accepted-with-warnings' : 'accepted';
    if (args.strict && o.status === 'accepted-with-warnings') {
      o.status = 'rejected';
      o.issues.push(err(id, 'E-STRICT', 'rejected because --strict treats warnings as errors.'));
      continue;
    }
    const layoutCols = Math.max(...Object.values(def.anims).map((a) => a.frames));
    const frameW = sheet.width / layoutCols;
    const frameH = sheet.height / Object.keys(def.anims).length;
    atlas[id] = { file: o.file, sheet: { w: sheet.width, h: sheet.height }, scale: o.scale, cell: { w: frameW, h: frameH }, worldSize: def.display, pivot: def.anchor, frames: atlasFrames(def, frameW, frameH) };
    accepted[id] = { file: o.file };
    if (!args.validateOnly) writePng(join(outDir, o.file), sheet);
  }

  const all: Issue[] = [...unknown, ...outcomes.flatMap((o) => o.issues)];
  const errors = all.filter((i) => i.level === 'error').length;
  const warnings = all.filter((i) => i.level === 'warn').length;

  if (!args.validateOnly) {
    let assets: Record<string, { file: string }> = {};
    const mf = join(outDir, 'manifest.json');
    if (args.merge && existsSync(mf)) {
      try {
        assets = { ...(JSON.parse(readFileSync(mf, 'utf8')) as { assets?: Record<string, { file: string }> }).assets };
      } catch {
        /* a corrupt old manifest is replaced */
      }
    }
    Object.assign(assets, accepted);
    writeFileSync(mf, `${JSON.stringify({ version: 1, assets }, null, 2)}\n`);
    const af = join(outDir, 'atlas.json');
    let prev: Record<string, unknown> = {};
    if (args.merge && existsSync(af)) {
      try {
        prev = (JSON.parse(readFileSync(af, 'utf8')) as { assets?: Record<string, unknown> }).assets ?? {};
      } catch {
        /* replaced */
      }
    }
    writeFileSync(af, `${JSON.stringify({ version: 1, assets: { ...prev, ...atlas } }, null, 2)}\n`);
  }
  const reportDir = resolve(args.report ?? (args.validateOnly ? args.in : args.out));
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, 'report.json'), `${JSON.stringify({ errors, warnings, assets: outcomes, other: unknown }, null, 2)}\n`);
  writeFileSync(join(reportDir, 'report.md'), renderReport(outcomes, unknown, errors, warnings, args));
  return { outcomes, unknown, exitCode: errors > 0 && !args.allowErrors ? 1 : 0 };
}

function renderReport(outcomes: AssetOutcome[], unknown: Issue[], errors: number, warnings: number, args: Args): string {
  const L = [
    '# Asset build report',
    '',
    `Input \`${args.in}\` → output \`${args.out}\`${args.validateOnly ? ' (validate only, nothing written)' : ''}. **${outcomes.filter((o) => o.status !== 'rejected').length} accepted, ${outcomes.filter((o) => o.status === 'rejected').length} rejected**, ${errors} error(s), ${warnings} warning(s).`,
    '',
    '| Asset | Result | Source | Scale | Sheet | Issues |',
    '| --- | --- | --- | :-: | --- | ---: |',
    ...outcomes.map((o) => `| \`${o.id}\` | ${o.status} | ${o.source} | ${o.scale ? `${o.scale}×` : '—'} | ${o.sheet ? `${o.sheet.w}×${o.sheet.h}` : '—'} | ${o.issues.length} |`),
    '',
  ];
  const withIssues = outcomes.filter((o) => o.issues.length);
  if (withIssues.length || unknown.length) L.push('## Issues', '');
  for (const o of withIssues) {
    L.push(`### \`${o.id}\` — ${o.status}`, '');
    for (const i of o.issues) L.push(`- **${i.level.toUpperCase()}** \`${i.code}\`: ${i.message}`);
    L.push('');
  }
  if (unknown.length) {
    L.push('### Unrecognised input', '');
    for (const i of unknown) L.push(`- **${i.level.toUpperCase()}** \`${i.code}\`: ${i.message}`);
    L.push('');
  }
  const missingP0 = ASSETS.filter((a) => a.priority === 'P0' && !outcomes.some((o) => o.id === a.id)).length;
  L.push(`_${missingP0} P0 asset(s) of the whole manifest were not part of this delivery._`, '');
  return L.join('\n');
}

const isMain = process.argv[1] && resolve(process.argv[1]).endsWith('build.ts');
if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const { outcomes, unknown, exitCode } = run(args);
    for (const o of outcomes) {
      console.log(`${o.status === 'rejected' ? '✘' : o.issues.length ? '!' : '✔'} ${o.id}  ${o.status}${o.sheet ? `  ${o.sheet.w}×${o.sheet.h} (${o.scale}×)` : ''}`);
      for (const i of o.issues) console.log(`    ${i.level === 'error' ? 'ERROR' : 'warn '} ${i.code}: ${i.message}`);
    }
    for (const i of unknown) console.log(`${i.level === 'error' ? 'ERROR' : 'warn '} ${i.code}: ${i.message}`);
    console.log(`\nReport: ${join(args.report ?? (args.validateOnly ? args.in : args.out), 'report.md')}`);
    process.exit(exitCode);
  } catch (e) {
    console.error((e as Error).message);
    process.exit(2);
  }
}
