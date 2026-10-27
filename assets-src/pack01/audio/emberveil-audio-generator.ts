/**
 * EMBERVEIL — Procedural Master WAV & WebAudio Synthesizer
 * Renders actual 16-bit 44.1kHz PCM WAV blobs/files & WebAudio AudioBuffers
 * for the initial 3 music tracks and 5 core gameplay SFX.
 */

export interface AudioAssetSpec {
  id: string;
  filename: string;
  durationSec: number;
  loop: boolean;
  loopStartSec: number;
  loopEndSec: number;
  recommendedVolume: number;
}

export const AUDIO_PACK_01_SPECS: AudioAssetSpec[] = [
  { id: 'mus_main_theme', filename: 'AUDIO/MUSIC/mus_main_theme.wav', durationSec: 26.67, loop: true, loopStartSec: 0, loopEndSec: 26.67, recommendedVolume: 0.75 },
  { id: 'mus_underground_exploration', filename: 'AUDIO/MUSIC/mus_underground_exploration.wav', durationSec: 32.0, loop: true, loopStartSec: 0, loopEndSec: 32.0, recommendedVolume: 0.60 },
  { id: 'mus_combat_loop', filename: 'AUDIO/MUSIC/mus_combat_loop.wav', durationSec: 15.0, loop: true, loopStartSec: 0, loopEndSec: 15.0, recommendedVolume: 0.70 },
  { id: 'sfx_player_slash_light', filename: 'AUDIO/SFX/sfx_player_slash_light.wav', durationSec: 0.18, loop: false, loopStartSec: 0, loopEndSec: 0.18, recommendedVolume: 0.85 },
  { id: 'sfx_weapon_impact', filename: 'AUDIO/SFX/sfx_weapon_impact.wav', durationSec: 0.22, loop: false, loopStartSec: 0, loopEndSec: 0.22, recommendedVolume: 0.90 },
  { id: 'sfx_player_dash', filename: 'AUDIO/SFX/sfx_player_dash.wav', durationSec: 0.28, loop: false, loopStartSec: 0, loopEndSec: 0.28, recommendedVolume: 0.80 },
  { id: 'sfx_enemy_hit', filename: 'AUDIO/SFX/sfx_enemy_hit.wav', durationSec: 0.20, loop: false, loopStartSec: 0, loopEndSec: 0.20, recommendedVolume: 0.85 },
  { id: 'sfx_player_hurt', filename: 'AUDIO/SFX/sfx_player_hurt.wav', durationSec: 0.35, loop: false, loopStartSec: 0, loopEndSec: 0.35, recommendedVolume: 0.95 },
];

const SAMPLE_RATE = 44100;

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Encodes a Float32Array stereo/mono buffer into a standard 16-bit PCM WAV Blob.
 */
export function encodeWAV(samples: Float32Array, sampleRate = SAMPLE_RATE): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true);  // PCM format
  view.setUint16(22, 1, true);  // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-0.98, Math.min(0.98, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Synthesizes Main Theme ("Embers Beneath the Veil") — D minor, 72 BPM
 */
export function renderMainThemePCM(): Float32Array {
  const duration = 26.666; // 8 bars of 4/4 at 72 BPM
  const totalSamples = Math.floor(duration * SAMPLE_RATE);
  const out = new Float32Array(totalSamples);

  // Arpeggio & melody notes in D minor: D4, F4, A4, Bb4, A4, G4, F4, E4
  const arpPattern = [62, 65, 69, 70, 69, 67, 65, 64];
  const bassNotes = [38, 34, 36, 33]; // D2, Bb1, C2, A1
  const stepSec = 60 / 72 / 2; // 8th notes

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const barIdx = Math.floor(t / (stepSec * 8)) % 4;
    const stepIdx = Math.floor(t / stepSec) % 8;
    const stepLocalT = (t % stepSec);

    // 1. Deep Sub-Bass Drone
    const bassFreq = midiToFreq(bassNotes[barIdx]);
    const drone = 0.22 * Math.sin(2 * Math.PI * bassFreq * t) +
                  0.08 * Math.sin(2 * Math.PI * (bassFreq * 2) * t);

    // 2. Felt Piano / Harp Arpeggio
    const noteFreq = midiToFreq(arpPattern[stepIdx]);
    const env = Math.exp(-stepLocalT * 4.5) * Math.min(1, stepLocalT * 80);
    const pluck = env * (
      0.24 * Math.sin(2 * Math.PI * noteFreq * t) +
      0.08 * Math.sin(2 * Math.PI * noteFreq * 2 * t) +
      0.03 * Math.sin(2 * Math.PI * noteFreq * 3 * t)
    );

    // 3. Bowed Glass Pad (Fifth interval D4 + A4)
    const padEnv = 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / duration);
    const pad = 0.10 * padEnv * (
      Math.sin(2 * Math.PI * midiToFreq(62) * t) +
      Math.sin(2 * Math.PI * midiToFreq(69) * t)
    );

    out[i] = Math.tanh(drone + pluck + pad);
  }
  return out;
}

/**
 * Synthesizes Underground Exploration ("Hollow Calcified Vaults") — D Dorian, 60 BPM
 */
export function renderExplorationPCM(): Float32Array {
  const duration = 32.0;
  const totalSamples = Math.floor(duration * SAMPLE_RATE);
  const out = new Float32Array(totalSamples);
  const motif = [62, 69, 71, 67, 64, 69, 62, 57]; // D4, A4, B4, G4, E4, A4, D4, A3
  const stepSec = 2.0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const stepIdx = Math.floor(t / stepSec) % motif.length;
    const localT = t % stepSec;

    const drone = 0.18 * Math.sin(2 * Math.PI * midiToFreq(38) * t) +
                  0.10 * Math.sin(2 * Math.PI * midiToFreq(45) * t);
    const bellEnv = Math.exp(-localT * 2.2) * Math.min(1, localT * 40);
    const f = midiToFreq(motif[stepIdx]);
    const bell = bellEnv * (0.16 * Math.sin(2 * Math.PI * f * t) + 0.05 * Math.sin(2 * Math.PI * f * 2.756 * t));

    out[i] = Math.tanh(drone + bell);
  }
  return out;
}

/**
 * Synthesizes Combat Loop ("Cinderbrand Awakened") — 128 BPM, 15.0s seamless loop
 */
export function renderCombatPCM(): Float32Array {
  const duration = 15.0; // 8 bars at 128 BPM
  const totalSamples = Math.floor(duration * SAMPLE_RATE);
  const out = new Float32Array(totalSamples);
  const sixteenth = 60 / 128 / 4;
  const ostinato = [50, 50, 53, 50, 56, 55, 53, 49]; // D3 Phrygian ostinato

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const step = Math.floor(t / sixteenth);
    const localT = t % sixteenth;

    // Driving bass pulse
    const f = midiToFreq(ostinato[step % ostinato.length]);
    const bassEnv = Math.exp(-localT * 18);
    const bass = 0.32 * bassEnv * Math.tanh(2.5 * Math.sin(2 * Math.PI * f * t));

    // Metallic Anvil Percussion on beats 0, 3, 6
    const isHit = (step % 8 === 0) || (step % 8 === 3) || (step % 8 === 6);
    const percEnv = isHit ? Math.exp(-localT * 35) : 0;
    const noise = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const perc = percEnv * (0.28 * noise + 0.2 * Math.sin(2 * Math.PI * 180 * Math.exp(-localT * 25) * localT));

    out[i] = Math.tanh(bass + perc);
  }
  return out;
}

/**
 * Core Gameplay SFX Generators
 */
export function renderSfxPCM(id: string): Float32Array {
  if (id === 'sfx_player_slash_light') {
    const len = Math.floor(0.18 * SAMPLE_RATE);
    const buf = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / SAMPLE_RATE;
      const env = Math.sin((t / 0.18) * Math.PI) * Math.exp(-t * 14);
      const sweep = Math.sin(2 * Math.PI * (900 - t * 3800) * t);
      const noise = ((Math.sin(i * 78.233) * 43758.5453) % 1) * 2 - 1;
      buf[i] = env * (0.55 * noise + 0.45 * sweep);
    }
    return buf;
  }
  if (id === 'sfx_weapon_impact' || id === 'sfx_enemy_hit') {
    const len = Math.floor(0.22 * SAMPLE_RATE);
    const buf = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / SAMPLE_RATE;
      const env = Math.exp(-t * 22);
      const thud = Math.sin(2 * Math.PI * (160 * Math.exp(-t * 18)) * t);
      const ring = Math.sin(2 * Math.PI * 1420 * t) * Math.exp(-t * 35);
      buf[i] = Math.tanh(env * (0.7 * thud + 0.4 * ring));
    }
    return buf;
  }
  if (id === 'sfx_player_dash') {
    const len = Math.floor(0.28 * SAMPLE_RATE);
    const buf = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / SAMPLE_RATE;
      const env = Math.exp(-t * 11);
      const whoosh = Math.sin(2 * Math.PI * (240 + t * 620) * t);
      buf[i] = 0.6 * env * whoosh;
    }
    return buf;
  }
  // Default: sfx_player_hurt
  const len = Math.floor(0.35 * SAMPLE_RATE);
  const buf = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 9);
    buf[i] = 0.75 * env * Math.tanh(3 * Math.sin(2 * Math.PI * (220 - t * 320) * t));
  }
  return buf;
}