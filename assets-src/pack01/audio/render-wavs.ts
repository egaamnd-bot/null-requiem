/**
 * Renders Pack 01 audio to 44.1 kHz 16-bit mono WAV files under EMBERVEIL_ASSETS/AUDIO and
 * checks basic quality gates (loop seam, DC offset, clipping, one-shot tails).
 *
 * Run: npm run assets:audio   (Node 22.12+, uses --experimental-strip-types)
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  AUDIO_PACK_01_SPECS,
  encodeWAV,
  renderCombatPCM,
  renderExplorationPCM,
  renderMainThemePCM,
  renderSfxPCM,
} from './emberveil-audio-generator.ts';

const OUT_ROOT = path.resolve(process.cwd(), 'EMBERVEIL_ASSETS');
const MUSIC: Record<string, () => Float32Array> = {
  mus_main_theme: renderMainThemePCM,
  mus_underground_exploration: renderExplorationPCM,
  mus_combat_loop: renderCombatPCM,
};

/**
 * Quality gates.
 * - Loop seam: the jump from the last sample back to the first must be no sharper than the sharpest
 *   edge already inside the loop (so a loop that starts on a drum hit is fine; a click is not).
 * - DC offset: strict for loops (continuous playback, mixing headroom); looser for short one-shots,
 *   where a small net mean is normal for a thud but a biased noise source is a bug.
 * - One-shots must end at (near) silence.
 */
const MAX_DC_LOOP = 0.01;
const MAX_DC_ONESHOT = 0.05;
const MAX_TAIL = 0.005;

let failures = 0;
for (const spec of AUDIO_PACK_01_SPECS) {
  const s = (MUSIC[spec.id] ?? (() => renderSfxPCM(spec.id)))();
  const n = s.length;
  let peak = 0;
  let sum = 0;
  let maxStep = 0;
  for (let i = 0; i < n; i++) {
    const v = s[i] as number;
    peak = Math.max(peak, Math.abs(v));
    sum += v;
    if (i > 0) maxStep = Math.max(maxStep, Math.abs(v - (s[i - 1] as number)));
  }
  const dc = sum / n;
  const problems: string[] = [];
  let detail: string;
  if (spec.loop) {
    const ratio = Math.abs((s[0] as number) - (s[n - 1] as number)) / maxStep;
    detail = `seam ${(ratio * 100).toFixed(0)}% of max edge`;
    if (ratio > 1) problems.push('audible loop seam');
  } else {
    const tail = Math.abs(s[n - 1] as number);
    detail = `tail ${tail.toFixed(4)}`;
    if (tail > MAX_TAIL) problems.push('ends abruptly');
  }
  if (Math.abs(dc) > (spec.loop ? MAX_DC_LOOP : MAX_DC_ONESHOT)) problems.push('DC offset');
  if (peak >= 0.98) problems.push('clipping');

  const file = path.join(OUT_ROOT, spec.filename);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await encodeWAV(s).arrayBuffer()));
  const status = problems.length ? `FAIL (${problems.join(', ')})` : 'ok';
  if (problems.length) failures++;
  console.log(
    `${spec.id.padEnd(28)} ${(n / 44100).toFixed(2).padStart(6)}s  peak ${peak.toFixed(2)}  dc ${dc.toFixed(3).padStart(6)}  ${detail.padEnd(24)} ${status}`,
  );
}
console.log(failures ? `\n${failures} asset(s) failed quality gates` : `\nAll audio written to ${path.relative(process.cwd(), OUT_ROOT)}/AUDIO`);
process.exit(failures ? 1 : 0);
