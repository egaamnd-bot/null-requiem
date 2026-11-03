import type { AudioEntry } from './catalog';

/**
 * Pure audio validation (no file I/O): WAV parsing, Ogg Vorbis header parsing, level/loudness/loop analysis and the checks against a
 * catalog entry. Used by tools/audio/build.ts and unit-tested with synthetic signals. Never silently accepts: every finding is an Issue.
 */
export interface AudioIssue {
  level: 'error' | 'warn';
  code: string;
  id: string;
  message: string;
}
const issue = (level: AudioIssue['level'], code: string, id: string, message: string): AudioIssue => ({ level, code, id, message });

export interface PcmInfo {
  sampleRate: number;
  channels: number;
  /** One Float32Array per channel, -1..1. */
  samples: Float32Array[];
  bitDepth: number;
}

export function parseWav(bytes: Uint8Array): PcmInfo {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (o: number) => String.fromCharCode(bytes[o]!, bytes[o + 1]!, bytes[o + 2]!, bytes[o + 3]!);
  if (bytes.length < 44 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('not a RIFF/WAVE file');
  let fmt: { format: number; channels: number; rate: number; bits: number } | null = null;
  let dataOff = -1;
  let dataLen = 0;
  for (let o = 12; o + 8 <= bytes.length; ) {
    const id = tag(o);
    const len = dv.getUint32(o + 4, true);
    if (id === 'fmt ') {
      let format = dv.getUint16(o + 8, true);
      if (format === 0xfffe && len >= 26) format = dv.getUint16(o + 8 + 24, true); // WAVE_FORMAT_EXTENSIBLE sub-format
      fmt = { format, channels: dv.getUint16(o + 10, true), rate: dv.getUint32(o + 12, true), bits: dv.getUint16(o + 22, true) };
    } else if (id === 'data') {
      dataOff = o + 8;
      dataLen = Math.min(len, bytes.length - dataOff);
      break;
    }
    o += 8 + len + (len % 2);
  }
  if (!fmt || dataOff < 0) throw new Error('WAV without fmt/data chunk');
  if (![1, 3].includes(fmt.format)) throw new Error(`unsupported WAV encoding ${fmt.format} (PCM or float only)`);
  const bytesPer = fmt.bits / 8;
  if (![1, 2, 3, 4].includes(bytesPer)) throw new Error(`unsupported bit depth ${fmt.bits}`);
  const frames = Math.floor(dataLen / (bytesPer * fmt.channels));
  const samples = Array.from({ length: fmt.channels }, () => new Float32Array(frames));
  for (let f = 0; f < frames; f++) {
    for (let c = 0; c < fmt.channels; c++) {
      const p = dataOff + (f * fmt.channels + c) * bytesPer;
      let v: number;
      if (fmt.format === 3) v = bytesPer === 4 ? dv.getFloat32(p, true) : dv.getFloat64(p, true);
      else if (bytesPer === 1) v = (dv.getUint8(p) - 128) / 128;
      else if (bytesPer === 2) v = dv.getInt16(p, true) / 32768;
      else if (bytesPer === 3) v = (((dv.getUint8(p + 2) << 24) | (dv.getUint8(p + 1) << 16) | (dv.getUint8(p) << 8)) >> 8) / 8388608;
      else v = dv.getInt32(p, true) / 2147483648;
      samples[c]![f] = v;
    }
  }
  return { sampleRate: fmt.rate, channels: fmt.channels, samples, bitDepth: fmt.bits };
}

export interface OggInfo {
  codec: 'vorbis' | 'opus';
  sampleRate: number;
  channels: number;
  durationSeconds: number;
}

/** Header-level Ogg inspection (no decoding): codec, rate, channels, and duration from the last page's granule position. */
export function parseOgg(bytes: Uint8Array): OggInfo {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const at = (o: number, s: string) => s.split('').every((ch, i) => bytes[o + i] === ch.charCodeAt(0));
  if (bytes.length < 64 || !at(0, 'OggS')) throw new Error('not an Ogg file');
  const segs = bytes[26]!;
  const p = 27 + segs;
  let codec: OggInfo['codec'];
  let channels: number;
  let rate: number;
  if (bytes[p] === 1 && at(p + 1, 'vorbis')) {
    codec = 'vorbis';
    channels = bytes[p + 11]!;
    rate = dv.getUint32(p + 12, true);
  } else if (at(p, 'OpusHead')) {
    codec = 'opus';
    channels = bytes[p + 9]!;
    rate = 48000;
  } else throw new Error('Ogg stream is neither Vorbis nor Opus');
  let last = -1;
  for (let o = bytes.length - 14; o >= 0; o--) {
    if (at(o, 'OggS')) {
      last = o;
      break;
    }
  }
  const granule = last >= 0 ? Number(dv.getBigInt64(last + 6, true)) : 0;
  return { codec, sampleRate: rate, channels, durationSeconds: granule > 0 ? granule / rate : 0 };
}

export interface Analysis {
  durationSeconds: number;
  peakDb: number;
  clippedSamples: number;
  dcOffset: number;
  lufs: number | null;
  leadingSilenceMs: number;
  trailingSilenceMs: number;
  /** Ratio of the jump between the last and first sample to the typical sample-to-sample step. >8 suggests an audible loop click. */
  loopSeamRatio: number;
  silent: boolean;
}

const toDb = (x: number) => (x > 1e-9 ? 20 * Math.log10(x) : -180);

function kWeight(x: Float32Array, rate: number): Float64Array {
  // ITU-R BS.1770 K-weighting: high-shelf + high-pass, coefficients derived for the actual sample rate.
  const shelf = (() => {
    const f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196;
    const K = Math.tan((Math.PI * f0) / rate), Vh = Math.pow(10, G / 20), Vb = Math.pow(Vh, 0.4996667741545416);
    const a0 = 1 + K / Q + K * K;
    return { b: [(Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0], a: [1, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0] };
  })();
  const hp = (() => {
    const f0 = 38.13547087602444, Q = 0.5003270373238773;
    const K = Math.tan((Math.PI * f0) / rate);
    const a0 = 1 + K / Q + K * K;
    return { b: [1, -2, 1], a: [1, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0] };
  })();
  const run = (src: ArrayLike<number>, f: { b: number[]; a: number[] }) => {
    const out = new Float64Array(src.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < src.length; i++) {
      const x0 = src[i]!;
      const y0 = f.b[0]! * x0 + f.b[1]! * x1 + f.b[2]! * x2 - f.a[1]! * y1 - f.a[2]! * y2;
      out[i] = y0; x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    }
    return out;
  };
  return run(run(x, shelf), hp);
}

/** Integrated loudness (BS.1770-4, absolute −70 LUFS + relative −10 LU gating). Null for clips too short for one 400 ms block. */
export function integratedLufs(pcm: Pick<PcmInfo, 'samples' | 'sampleRate'>): number | null {
  const rate = pcm.sampleRate;
  const block = Math.round(0.4 * rate);
  const hop = Math.round(0.1 * rate);
  const n = pcm.samples[0]?.length ?? 0;
  if (n < block) return null;
  const weighted = pcm.samples.map((c) => kWeight(c, rate));
  const energies: number[] = [];
  for (let s = 0; s + block <= n; s += hop) {
    let sum = 0;
    for (const ch of weighted) {
      let e = 0;
      for (let i = s; i < s + block; i++) e += ch[i]! * ch[i]!;
      sum += e / block;
    }
    energies.push(sum);
  }
  const lk = (z: number) => -0.691 + 10 * Math.log10(z);
  const abs = energies.filter((z) => z > 0 && lk(z) > -70);
  if (!abs.length) return -70;
  const rel = lk(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const gated = abs.filter((z) => lk(z) > rel);
  return gated.length ? lk(gated.reduce((a, b) => a + b, 0) / gated.length) : -70;
}

export function analyse(pcm: PcmInfo): Analysis {
  const n = pcm.samples[0]?.length ?? 0;
  let peak = 0, clipped = 0, sum = 0;
  for (const ch of pcm.samples) {
    for (let i = 0; i < ch.length; i++) {
      const a = Math.abs(ch[i]!);
      if (a > peak) peak = a;
      if (a >= 0.9995) clipped++;
      sum += ch[i]!;
    }
  }
  const mono = pcm.samples[0] ?? new Float32Array(0);
  const thresh = 0.0005;
  let lead = 0;
  while (lead < n && Math.abs(mono[lead]!) < thresh) lead++;
  let trail = 0;
  while (trail < n - lead && Math.abs(mono[n - 1 - trail]!) < thresh) trail++;
  let stepSum = 0;
  for (let i = 1; i < n; i++) stepSum += Math.abs(mono[i]! - mono[i - 1]!);
  const meanStep = n > 1 ? stepSum / (n - 1) : 0;
  const jump = n > 1 ? Math.abs(mono[0]! - mono[n - 1]!) : 0;
  return {
    durationSeconds: n / pcm.sampleRate,
    peakDb: toDb(peak),
    clippedSamples: clipped,
    dcOffset: n ? sum / (n * Math.max(1, pcm.samples.length)) : 0,
    lufs: integratedLufs(pcm),
    leadingSilenceMs: (lead / pcm.sampleRate) * 1000,
    trailingSilenceMs: (trail / pcm.sampleRate) * 1000,
    loopSeamRatio: meanStep > 1e-6 ? jump / meanStep : jump > 0.01 ? 99 : 0,
    silent: peak < 0.0005,
  };
}

/** Targets documented in docs/audio/README.md. */
export const TARGETS = {
  musicLufs: -16,
  ambienceLufs: -24,
  sfxPeakDb: -10,
  uiPeakDb: -14,
  lufsTolerance: 3,
};

/** Checks of a delivered file against its catalog entry. `a` may be partial for header-only formats (no decoded signal). */
export function validateAgainstEntry(
  entry: AudioEntry,
  info: { sampleRate: number; channels: number; ext: string; codec?: string },
  a: Partial<Analysis> & { durationSeconds: number },
): AudioIssue[] {
  const out: AudioIssue[] = [];
  const id = entry.id;
  const [lo, hi] = entry.seconds;
  if (!(a.durationSeconds >= lo) || !(a.durationSeconds <= hi)) out.push(issue('error', 'E-DURATION', id, `duration ${a.durationSeconds.toFixed(2)} s is outside the expected ${lo}–${hi} s for ${entry.kind} "${id}".`));
  if (info.sampleRate < 22050) out.push(issue('error', 'E-SAMPLE-RATE', id, `sample rate ${info.sampleRate} Hz is below 22050 Hz.`));
  else if (![22050, 32000, 44100, 48000].includes(info.sampleRate)) out.push(issue('warn', 'W-SAMPLE-RATE', id, `unusual sample rate ${info.sampleRate} Hz (use 44100 or 48000).`));
  if (info.channels > 2) out.push(issue('error', 'E-CHANNELS', id, `${info.channels} channels; only mono or stereo are supported.`));
  if ((entry.kind === 'sfx' || entry.kind === 'ui') && info.channels === 2) out.push(issue('warn', 'W-STEREO-SFX', id, 'SFX/UI are expected mono (positionless, half the memory).'));
  if ((entry.kind === 'music' || entry.kind === 'stinger') && info.channels === 1) out.push(issue('warn', 'W-MONO-MUSIC', id, 'music is expected stereo.'));
  if (info.codec === 'opus') out.push(issue('warn', 'W-OPUS', id, 'Opus is not decodable on every target; Ogg Vorbis is the supported runtime codec.'));
  if (a.silent) out.push(issue('error', 'E-SILENT', id, 'the file is silent.'));
  if (a.clippedSamples && a.clippedSamples > 0) out.push(issue('error', 'E-CLIPPING', id, `${a.clippedSamples} clipped sample(s); leave headroom (peak ≤ −1 dBFS).`));
  if (a.peakDb !== undefined && a.peakDb > -1 && !a.clippedSamples) out.push(issue('warn', 'W-HOT-PEAK', id, `peak ${a.peakDb.toFixed(1)} dBFS leaves no headroom.`));
  if (a.peakDb !== undefined && (entry.kind === 'sfx' || entry.kind === 'ui')) {
    const t = entry.kind === 'ui' ? TARGETS.uiPeakDb : TARGETS.sfxPeakDb;
    if (a.peakDb > t + 6) out.push(issue('warn', 'W-LOUD', id, `peak ${a.peakDb.toFixed(1)} dBFS is far above the ${t} dBFS target.`));
  }
  if (a.lufs != null && (entry.kind === 'music' || entry.kind === 'ambience')) {
    const t = entry.kind === 'music' ? TARGETS.musicLufs : TARGETS.ambienceLufs;
    if (Math.abs(a.lufs - t) > TARGETS.lufsTolerance) out.push(issue('warn', 'W-LOUDNESS', id, `integrated loudness ${a.lufs.toFixed(1)} LUFS is outside ${t} ± ${TARGETS.lufsTolerance} LUFS.`));
  }
  if (entry.loop && a.loopSeamRatio !== undefined && a.loopSeamRatio > 8) out.push(issue('error', 'E-LOOP-SEAM', id, `the last sample jumps ${a.loopSeamRatio.toFixed(0)}× the typical step to the first sample: the loop will click. Make the file itself the seamless loop or provide loopStart/loopEnd.`));
  if (entry.loop && ((a.leadingSilenceMs ?? 0) > 250 || (a.trailingSilenceMs ?? 0) > 250)) out.push(issue('warn', 'W-LOOP-SILENCE', id, 'silence at the head/tail of a loop creates an audible gap.'));
  if (!entry.loop && (a.leadingSilenceMs ?? 0) > 60) out.push(issue('warn', 'W-LEADING-SILENCE', id, `${(a.leadingSilenceMs ?? 0).toFixed(0)} ms of leading silence delays the sound; trim it.`));
  if (a.dcOffset !== undefined && Math.abs(a.dcOffset) > 0.01) out.push(issue('warn', 'W-DC-OFFSET', id, `DC offset ${a.dcOffset.toFixed(3)} (clicks on start/stop).`));
  return out;
}
