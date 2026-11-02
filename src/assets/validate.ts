import { sheetLayout, type AssetDef } from './types';

/**
 * Pure validation/assembly of delivered art (no file I/O, no Phaser). Used by `tools/assets/build.ts` and its tests.
 * Principle: never silently accept. Every deviation from the manifest contract becomes an Issue; errors exclude the asset.
 */

export interface Rgba {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel, row-major. */
  data: Uint8Array | Uint8ClampedArray;
}

export interface Issue {
  level: 'error' | 'warn';
  code: string;
  asset: string;
  message: string;
}

export const OPAQUE = 16; // alpha above this counts as "ink"
export const MAX_TEXTURE_EDGE = 4096;
export const MASTER_SCALE = 4;

const issue = (level: Issue['level'], code: string, asset: string, message: string): Issue => ({ level, code, asset, message });

export function newImage(width: number, height: number): Rgba {
  return { width, height, data: new Uint8Array(width * height * 4) };
}

export function crop(img: Rgba, x: number, y: number, w: number, h: number): Rgba {
  const out = newImage(w, h);
  for (let r = 0; r < h; r++) {
    const src = ((y + r) * img.width + x) * 4;
    out.data.set(img.data.subarray(src, src + w * 4), r * w * 4);
  }
  return out;
}

export function blit(dst: Rgba, src: Rgba, x: number, y: number): void {
  for (let r = 0; r < src.height; r++) {
    const s = r * src.width * 4;
    dst.data.set(src.data.subarray(s, s + src.width * 4), ((y + r) * dst.width + x) * 4);
  }
}

/** Replace pixels close to `key` (RGB) with transparent. Returns counts of keyed pixels and remaining near-key fringe. */
export function keyOutChroma(img: Rgba, key: [number, number, number], tolerance = 60): { keyed: number; fringe: number } {
  let keyed = 0;
  let fringe = 0;
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const dist = Math.hypot(d[i]! - key[0], d[i + 1]! - key[1], d[i + 2]! - key[2]);
    if (dist <= tolerance) {
      d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0;
      keyed++;
    } else if (d[i + 3]! > OPAQUE && dist <= tolerance * 2 && d[i + 1]! > d[i]! + 30 && d[i + 1]! > d[i + 2]! + 30 && key[1] > 200) {
      fringe++; // greenish edge pixels left after keying
    }
  }
  return { keyed, fringe };
}

export interface FrameStats {
  inkPixels: number;
  total: number;
  /** Bounding box of ink, or null for an empty frame. */
  box: { minX: number; maxX: number; minY: number; maxY: number } | null;
  /** Ink-weighted horizontal centre, in px from the cell's left edge. */
  centreX: number;
}

export function frameStats(img: Rgba): FrameStats {
  let ink = 0;
  let minX = img.width, maxX = -1, minY = img.height, maxY = -1, sx = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4 + 3]! > OPAQUE) {
        ink++;
        sx += x;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { inkPixels: ink, total: img.width * img.height, box: ink ? { minX, maxX, minY, maxY } : null, centreX: ink ? sx / ink : img.width / 2 };
}

const isTiling = (def: AssetDef) => def.category === 'tileset' || def.category === 'background';
const isFarLayer = (def: AssetDef) => def.id.endsWith('_bg_far');

/** Per-frame content checks, with the frame's cell already cut out. */
export function validateFrameContent(def: AssetDef, anim: string, index: number, cell: Rgba): Issue[] {
  const out: Issue[] = [];
  const where = `${def.id} ${anim}[${index + 1}]`;
  const st = frameStats(cell);
  if (isFarLayer(def)) {
    if (st.inkPixels < st.total * 0.98) out.push(issue('warn', 'W-TRANSPARENT-OPAQUE-LAYER', def.id, `${where}: the far background should be fully opaque (${((1 - st.inkPixels / st.total) * 100).toFixed(1)}% transparent).`));
    return out;
  }
  if (!st.box) {
    out.push(issue('error', 'E-EMPTY-FRAME', def.id, `${where}: frame is completely transparent.`));
    return out;
  }
  const opaqueShare = st.inkPixels / st.total;
  if (!isTiling(def) && opaqueShare > 0.985) {
    out.push(issue('error', 'E-NO-TRANSPARENCY', def.id, `${where}: frame is ${(opaqueShare * 100).toFixed(1)}% opaque; sprites need a transparent background (alpha), not a baked background colour.`));
  }
  if (!isTiling(def)) {
    const pad = Math.max(1, Math.round(cell.width * 0.01));
    const { minX, maxX, minY, maxY } = st.box;
    if (minX < pad || minY < pad || maxX > cell.width - 1 - pad || (def.anchor.y !== 1 && maxY > cell.height - 1 - pad)) {
      out.push(issue('warn', 'W-EDGE-CONTACT', def.id, `${where}: art touches the cell edge; linear filtering will bleed. Leave ≥${pad}px transparent padding.`));
    }
    if (def.anchor.y === 1) {
      const floatGap = cell.height - 1 - st.box.maxY;
      if (floatGap > Math.max(2, cell.height * 0.06)) {
        out.push(issue('error', 'E-PIVOT-FLOATING', def.id, `${where}: pivot is bottom-centre but the lowest ink is ${floatGap}px above the cell's bottom edge; the sprite will float above the ground.`));
      }
    }
    if (def.anchor.x === 0.5 && Math.abs(st.centreX - cell.width / 2) > cell.width * 0.2) {
      out.push(issue('warn', 'W-OFF-CENTRE', def.id, `${where}: ink centre is ${(st.centreX - cell.width / 2).toFixed(0)}px from the cell centre (pivot x=0.5).`));
    }
  }
  return out;
}

/** Cross-frame checks inside one animation: baseline drift. */
export function validateAnimConsistency(def: AssetDef, anim: string, cells: Rgba[]): Issue[] {
  const out: Issue[] = [];
  if (def.anchor.y !== 1 || cells.length < 2 || isTiling(def)) return out;
  const bottoms = cells.map((c) => frameStats(c).box?.maxY ?? -1).filter((v) => v >= 0);
  if (bottoms.length >= 2) {
    const drift = Math.max(...bottoms) - Math.min(...bottoms);
    const cell = cells[0]!;
    if (drift > Math.max(3, cell.height * 0.04)) out.push(issue('warn', 'W-BASELINE-DRIFT', def.id, `${anim}: feet baseline differs by ${drift}px between frames; the sprite will vibrate vertically.`));
  }
  return out;
}

/** Decide the integer scale of a delivered cell size relative to the manifest, or report why not. */
export function inferScale(def: AssetDef, cellW: number, cellH: number): { scale: number; issues: Issue[] } {
  const issues: Issue[] = [];
  const sw = cellW / def.display.w;
  const sh = cellH / def.display.h;
  const scale = Math.round(sw);
  if (!Number.isInteger(cellW / def.display.w) || !Number.isInteger(cellH / def.display.h) || sw !== sh || scale < 1) {
    issues.push(issue('error', 'E-FRAME-SIZE', def.id, `cell ${cellW}×${cellH} is not an integer multiple of the declared ${def.display.w}×${def.display.h} (got ×${sw.toFixed(3)} / ×${sh.toFixed(3)}). Expected ${def.display.w * MASTER_SCALE}×${def.display.h * MASTER_SCALE} (4× master).`));
    return { scale: 0, issues };
  }
  if (scale !== MASTER_SCALE) issues.push(issue('warn', 'W-NOT-MASTER-SCALE', def.id, `delivered at ${scale}× (cell ${cellW}×${cellH}); the master scale is ${MASTER_SCALE}×. Accepted (the engine is resolution independent).`));
  if (cellW > MAX_TEXTURE_EDGE || cellH > MAX_TEXTURE_EDGE) issues.push(issue('error', 'E-TOO-LARGE', def.id, `cell is larger than ${MAX_TEXTURE_EDGE}px.`));
  return { scale, issues };
}

export interface SheetResult {
  issues: Issue[];
  scale: number;
  columns: number;
  rows: number;
  frameW: number;
  frameH: number;
}

/** Validate a completed sheet against the manifest layout (one row per animation, equal cells, columns = longest anim). */
export function validateSheet(def: AssetDef, img: Rgba): SheetResult {
  const L = sheetLayout(def);
  const issues: Issue[] = [];
  const fail = (): SheetResult => ({ issues, scale: 0, columns: L.columns, rows: L.rows, frameW: 0, frameH: 0 });
  if (img.width > MAX_TEXTURE_EDGE || img.height > MAX_TEXTURE_EDGE) {
    issues.push(issue('error', 'E-TOO-LARGE', def.id, `sheet ${img.width}×${img.height} exceeds ${MAX_TEXTURE_EDGE}px on an edge (mobile GPUs).`));
  }
  if (img.width % L.columns !== 0 || img.height % L.rows !== 0) {
    issues.push(issue('error', 'E-SHEET-GRID', def.id, `sheet ${img.width}×${img.height} does not divide into ${L.columns} columns × ${L.rows} rows (one row per animation; columns = longest animation).`));
    return fail();
  }
  const frameW = img.width / L.columns;
  const frameH = img.height / L.rows;
  const sc = inferScale(def, frameW, frameH);
  issues.push(...sc.issues);
  if (sc.scale === 0) return fail();
  let row = 0;
  for (const [anim, a] of Object.entries(def.anims)) {
    const cells: Rgba[] = [];
    for (let i = 0; i < a.frames; i++) {
      const cell = crop(img, i * frameW, row * frameH, frameW, frameH);
      cells.push(cell);
      issues.push(...validateFrameContent(def, anim, i, cell));
    }
    // Unused cells to the right of a shorter animation must be empty, or something was drawn in the wrong row/column.
    for (let i = a.frames; i < L.columns; i++) {
      const extra = frameStats(crop(img, i * frameW, row * frameH, frameW, frameH));
      if (extra.inkPixels > 0) issues.push(issue('error', 'E-EXTRA-FRAME', def.id, `row ${row + 1} (${anim}) has art in column ${i + 1} but only ${a.frames} frame(s) are defined.`));
    }
    issues.push(...validateAnimConsistency(def, anim, cells));
    row++;
  }
  return { issues, scale: sc.scale, columns: L.columns, rows: L.rows, frameW, frameH };
}

/** Assemble loose frames (keyed `anim:index`, 0-based) into the sheet. Reports missing/extra/mis-sized frames. */
export function assembleSheet(def: AssetDef, frames: Map<string, Rgba>): { sheet: Rgba | null; issues: Issue[] } {
  const L = sheetLayout(def);
  const issues: Issue[] = [];
  let size: { w: number; h: number } | null = null;
  const expected = new Set<string>();
  for (const [anim, a] of Object.entries(def.anims)) for (let i = 0; i < a.frames; i++) expected.add(`${anim}:${i}`);
  for (const k of frames.keys()) if (!expected.has(k)) issues.push(issue('error', 'E-UNKNOWN-FRAME', def.id, `frame "${k.replace(':', '_')}" does not exist in the manifest (animations: ${Object.entries(def.anims).map(([n, a]) => `${n}×${a.frames}`).join(', ')}).`));
  const missing = [...expected].filter((k) => !frames.has(k));
  if (missing.length) issues.push(issue('error', 'E-MISSING-FRAMES', def.id, `incomplete: ${missing.length} of ${expected.size} frame(s) missing: ${missing.map((m) => m.replace(':', '_')).join(', ')}.`));
  for (const [k, img] of frames) {
    if (!expected.has(k)) continue;
    if (!size) size = { w: img.width, h: img.height };
    else if (img.width !== size.w || img.height !== size.h) issues.push(issue('error', 'E-FRAME-MISMATCH', def.id, `frame ${k.replace(':', '_')} is ${img.width}×${img.height} but earlier frames are ${size.w}×${size.h}; every cell must be identical.`));
  }
  if (issues.some((i) => i.level === 'error') || !size) return { sheet: null, issues };
  const sc = inferScale(def, size.w, size.h);
  issues.push(...sc.issues);
  if (sc.scale === 0) return { sheet: null, issues };
  const sheet = newImage(size.w * L.columns, size.h * L.rows);
  let row = 0;
  for (const [anim, a] of Object.entries(def.anims)) {
    for (let i = 0; i < a.frames; i++) blit(sheet, frames.get(`${anim}:${i}`)!, i * size.w, row * size.h);
    row++;
  }
  // Content checks run on the assembled sheet (same code path as a delivered sheet).
  issues.push(...validateSheet(def, sheet).issues.filter((i) => i.code !== 'W-NOT-MASTER-SCALE'));
  return { sheet, issues };
}

/** Frame rectangles of a validated sheet, with the runtime texture keys (same order as planSheet). */
export function atlasFrames(def: AssetDef, frameW: number, frameH: number): { key: string; anim: string; index: number; x: number; y: number; w: number; h: number }[] {
  const out: { key: string; anim: string; index: number; x: number; y: number; w: number; h: number }[] = [];
  let k = 0;
  let row = 0;
  for (const [anim, a] of Object.entries(def.anims)) {
    for (let i = 0; i < a.frames; i++) out.push({ key: def.textureKeys[k++] ?? `${def.id}__${anim}_${i}`, anim, index: i, x: i * frameW, y: row * frameH, w: frameW, h: frameH });
    row++;
  }
  return out;
}
