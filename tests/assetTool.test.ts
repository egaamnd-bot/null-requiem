import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { ASSET_BY_ID } from '../src/assets/manifest';
import { planSheet } from '../src/assets/sheet';
import { assembleSheet, keyOutChroma, newImage, validateSheet, type Rgba } from '../src/assets/validate';

const def = (id: string) => ASSET_BY_ID.get(id)!;

/** A transparent cell with an opaque block (the "character"), feet on the bottom row by default. */
function cell(w: number, h: number, opts: { bw?: number; bh?: number; gap?: number; opaque?: boolean } = {}): Rgba {
  const img = newImage(w, h);
  const bw = opts.bw ?? Math.round(w * 0.4);
  const bh = opts.bh ?? Math.round(h * 0.7);
  const gap = opts.gap ?? 2;
  const x0 = Math.round((w - bw) / 2);
  const y1 = h - 1 - gap;
  for (let y = opts.opaque ? 0 : y1 - bh + 1; y <= (opts.opaque ? h - 1 : y1); y++)
    for (let x = opts.opaque ? 0 : x0; x < (opts.opaque ? w : x0 + bw); x++) {
      const i = (y * w + x) * 4;
      img.data[i] = 200;
      img.data[i + 1] = 40;
      img.data[i + 2] = 200;
      img.data[i + 3] = 255;
    }
  return img;
}
const sheetOf = (cells: Rgba[], cols: number, rows: number): Rgba => {
  const cw = cells[0]!.width;
  const ch = cells[0]!.height;
  const s = newImage(cw * cols, ch * rows);
  cells.forEach((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    for (let y = 0; y < ch; y++) s.data.set(c.data.subarray(y * cw * 4, (y + 1) * cw * 4), ((row * ch + y) * s.width + col * cw) * 4);
  });
  return s;
};
const codes = (r: { issues: { code: string }[] }) => r.issues.map((i) => i.code);

describe('validateSheet', () => {
  const run = def('player_courier_run'); // 4 frames, 31x36 -> 124x144 at 4x
  it('accepts a correct 4x sheet', () => {
    const r = validateSheet(run, sheetOf(Array.from({ length: 4 }, () => cell(124, 144)), 4, 1));
    expect(r.issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(r.scale).toBe(4);
    expect(planSheet(run, 496, 144).ok).toBe(true); // and the runtime loader agrees
  });
  it('flags a 2x sheet as a warning only (resolution independent)', () => {
    const r = validateSheet(run, sheetOf(Array.from({ length: 4 }, () => cell(62, 72)), 4, 1));
    expect(r.issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(codes(r)).toContain('W-NOT-MASTER-SCALE');
  });
  it('rejects a sheet whose grid does not divide', () => {
    expect(codes(validateSheet(run, newImage(501, 144)))).toContain('E-SHEET-GRID');
  });
  it('rejects wrong aspect ratio / non-integer scale', () => {
    expect(codes(validateSheet(run, sheetOf(Array.from({ length: 4 }, () => cell(124, 150)), 4, 1)))).toContain('E-FRAME-SIZE');
    expect(codes(validateSheet(run, sheetOf(Array.from({ length: 4 }, () => cell(120, 140)), 4, 1)))).toContain('E-FRAME-SIZE');
  });
  it('rejects a baked opaque background', () => {
    const r = validateSheet(run, sheetOf(Array.from({ length: 4 }, () => cell(124, 144, { opaque: true })), 4, 1));
    expect(codes(r)).toContain('E-NO-TRANSPARENCY');
  });
  it('rejects empty frames and floating sprites (pivot bottom-centre)', () => {
    const cells = [cell(124, 144), newImage(124, 144), cell(124, 144, { gap: 30 }), cell(124, 144)];
    const r = validateSheet(run, sheetOf(cells, 4, 1));
    expect(codes(r)).toContain('E-EMPTY-FRAME');
    expect(codes(r)).toContain('E-PIVOT-FLOATING');
  });
  it('warns about baseline drift between frames', () => {
    const cells = [cell(124, 144, { gap: 0 }), cell(124, 144, { gap: 9 }), cell(124, 144), cell(124, 144)];
    expect(codes(validateSheet(run, sheetOf(cells, 4, 1)))).toContain('W-BASELINE-DRIFT');
  });
  it('rejects art in cells that belong to no frame', () => {
    const hound = def('enemy_scrap_hound'); // rows: walk 2f, windup 1f, lunge 1f, recover 1f; columns = 2
    const cw = 24 * 4, ch = 16 * 4;
    const cells = [cell(cw, ch), cell(cw, ch), cell(cw, ch), cell(cw, ch), cell(cw, ch), cell(cw, ch), cell(cw, ch), cell(cw, ch)];
    expect(codes(validateSheet(hound, sheetOf(cells, 2, 4)))).toContain('E-EXTRA-FRAME');
  });
  it('rejects sheets larger than the mobile texture limit', () => {
    const tiles = def('env_rainline_tiles');
    expect(codes(validateSheet(tiles, newImage(16 * 300, 4 * 300)))).toContain('E-TOO-LARGE');
  });
});

describe('assembleSheet (loose frames)', () => {
  const idle = def('player_courier_idle'); // 2 frames
  const frames = (n: number, w = 124, h = 144) => new Map<string, Rgba>(Array.from({ length: n }, (_, i) => [`idle:${i}`, cell(w, h)] as const));
  it('assembles frames in order into the exact sheet', () => {
    const r = assembleSheet(idle, frames(2));
    expect(r.issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(r.sheet?.width).toBe(248);
    expect(r.sheet?.height).toBe(144);
  });
  it('reports missing frames instead of accepting a partial animation', () => {
    const r = assembleSheet(idle, frames(1));
    expect(r.sheet).toBeNull();
    expect(codes(r)).toContain('E-MISSING-FRAMES');
  });
  it('reports mismatched frame sizes and unknown frames', () => {
    const m = frames(2);
    m.set('idle:1', cell(100, 144));
    expect(codes(assembleSheet(idle, m))).toContain('E-FRAME-MISMATCH');
    const extra = frames(2);
    extra.set('idle:7', cell(124, 144));
    expect(codes(assembleSheet(idle, extra))).toContain('E-UNKNOWN-FRAME');
  });
});

describe('keyOutChroma', () => {
  it('turns the key colour transparent and counts what it removed', () => {
    const img = newImage(4, 1);
    img.data.set([0, 255, 0, 255, 0, 250, 5, 255, 200, 40, 200, 255, 0, 255, 0, 255]);
    const k = keyOutChroma(img, [0, 255, 0], 40);
    expect(k.keyed).toBe(3);
    expect(img.data[3]).toBe(0);
    expect(img.data[11]).toBe(255);
  });
});

function writeCell(file: string, c: Rgba) {
  const p = new PNG({ width: c.width, height: c.height });
  p.data = Buffer.from(c.data);
  writeFileSync(file, PNG.sync.write(p));
}

describe('CLI (tools/assets/build.ts)', () => {
  const tsx = join(process.cwd(), 'node_modules/.bin/tsx');
  const cli = (args: string[]) => spawnSync(tsx, ['tools/assets/build.ts', ...args], { cwd: process.cwd(), encoding: 'utf8' });

  it('assembles loose frames, writes sheet + manifest + atlas + report, and rejects bad deliveries with exit code 1', () => {
    const root = mkdtempSync(join(tmpdir(), 'assets-'));
    const inDir = join(root, 'in');
    const outDir = join(root, 'out');
    // good: player_courier_idle as two loose frames
    mkdirSync(join(inDir, 'player_courier_idle'), { recursive: true });
    writeCell(join(inDir, 'player_courier_idle', 'idle_01.png'), cell(124, 144));
    writeCell(join(inDir, 'player_courier_idle', 'idle_02.png'), cell(124, 144));
    // bad: a hound sheet with the wrong size
    writeCell(join(inDir, 'enemy_scrap_hound.png'), newImage(100, 100));
    // bad: unknown id
    writeCell(join(inDir, 'courier_hero.png'), cell(10, 10));
    const r = cli(['--in', inDir, '--out', outDir]);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/E-SHEET-GRID|E-FRAME-SIZE/);
    expect(r.stdout).toMatch(/E-UNKNOWN-ASSET/);
    const manifest = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf8')) as { assets: Record<string, { file: string }> };
    expect(Object.keys(manifest.assets)).toEqual(['player_courier_idle']);
    expect(existsSync(join(outDir, 'player_courier_idle.png'))).toBe(true);
    expect(existsSync(join(outDir, 'enemy_scrap_hound.png'))).toBe(false); // rejected assets are never written
    const sheet = PNG.sync.read(readFileSync(join(outDir, 'player_courier_idle.png')));
    expect([sheet.width, sheet.height]).toEqual([248, 144]);
    const atlas = JSON.parse(readFileSync(join(outDir, 'atlas.json'), 'utf8')) as { assets: Record<string, { frames: { key: string }[]; scale: number }> };
    expect(atlas.assets.player_courier_idle!.frames.map((f) => f.key)).toEqual(['player-idle0', 'player-idle1']);
    expect(atlas.assets.player_courier_idle!.scale).toBe(4);
    expect(readFileSync(join(outDir, 'report.md'), 'utf8')).toMatch(/rejected/);
    // The runtime loader accepts exactly what the tool wrote.
    expect(planSheet(def('player_courier_idle'), sheet.width, sheet.height).ok).toBe(true);
  }, 60_000);

  it('succeeds (exit 0) on a clean delivery and never overwrites other manifest entries when merging', () => {
    const root = mkdtempSync(join(tmpdir(), 'assets-'));
    const inDir = join(root, 'in');
    const outDir = join(root, 'out');
    mkdirSync(inDir, { recursive: true });
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'manifest.json'), JSON.stringify({ version: 1, assets: { player_courier_run: { file: 'player_courier_run.png' } } }));
    writeCell(join(inDir, 'player_courier_jump.png'), cell(124, 144));
    const r = cli(['--in', inDir, '--out', outDir]);
    expect(r.status).toBe(0);
    const m = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf8')) as { assets: Record<string, unknown> };
    expect(Object.keys(m.assets).sort()).toEqual(['player_courier_jump', 'player_courier_run']);
  }, 60_000);

  it('--validate-only writes only a report (no sheets, no manifest)', () => {
    const root = mkdtempSync(join(tmpdir(), 'assets-'));
    const inDir = join(root, 'in');
    const outDir = join(root, 'out');
    mkdirSync(inDir, { recursive: true });
    writeCell(join(inDir, 'player_courier_jump.png'), cell(124, 144));
    execFileSync(tsx, ['tools/assets/build.ts', '--in', inDir, '--out', outDir, '--validate-only'], { cwd: process.cwd() });
    expect(existsSync(join(outDir, 'manifest.json'))).toBe(false);
    expect(existsSync(join(inDir, 'report.md'))).toBe(true);
  }, 60_000);
});
