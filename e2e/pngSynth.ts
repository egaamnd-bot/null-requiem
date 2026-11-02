import { PNG } from 'pngjs';

/** A solid-colour RGBA PNG (optionally with a transparent border) for synthetic "final art" in browser tests. */
export function solidPng(w: number, h: number, rgba: [number, number, number, number], border = 0): Buffer {
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const inside = x >= border && y >= border && x < w - border && y < h - border;
      png.data[i] = rgba[0];
      png.data[i + 1] = rgba[1];
      png.data[i + 2] = rgba[2];
      png.data[i + 3] = inside ? rgba[3] : 0;
    }
  }
  return PNG.sync.write(png);
}
