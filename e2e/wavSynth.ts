/** Mono/stereo 16-bit PCM WAV of a sine (for synthetic audio deliveries in browser tests). */
export function sineWav(hz: number, seconds: number, rate = 22050, channels = 1, amp = 0.3): Buffer {
  const frames = Math.round(seconds * rate);
  const buf = Buffer.alloc(44 + frames * channels * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(buf.length - 8, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(channels, 22); buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * channels * 2, 28); buf.writeUInt16LE(channels * 2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(frames * channels * 2, 40);
  for (let f = 0; f < frames; f++) for (let c = 0; c < channels; c++) buf.writeInt16LE(Math.round(amp * 32767 * Math.sin((2 * Math.PI * hz * f) / rate)), 44 + (f * channels + c) * 2);
  return buf;
}
