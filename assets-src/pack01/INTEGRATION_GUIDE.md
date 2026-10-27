# EMBERVEIL — Phaser 4.2.1 Integration Guide (Asset Pack 01, as received)

> Archived as delivered by the external asset generator. **Nothing here has been executed against the game.**
> The protagonist items (§2, §3) refer to a player sheet that is **not** part of this repo — see `README.md`.
> The game's current conventions (480×270 view, 16 px tiles, 10×22 player body) differ from these; reconcile before integrating.

## 1. Key technical decisions

1. **SVG vs. pre-rasterized PNG pipeline**
   - `build-sprites.mjs` outputs `.svg` sprite sheets and TexturePacker-style JSON-hash frame maps.
   - Option A (no build-time image dependency): rasterize the SVG to an offscreen `<canvas>` at boot and register it with `scene.textures.addAtlas(key, canvas, atlasJson)`.
   - Option B: add `sharp` (or `@resvg/resvg-js`) as a devDependency and add a `sharp(svgPath).png().toFile(pngPath)` step so Vite serves static `.png` files.
2. **Player body offset and facing flip** — *superseded (no player sheet in this repo).*
   - Delivered spec: 96×64 frames, feet at (48, 60), origin (0.5, 0.9375); flip with `setFlipX` without moving the body. Suggested body 18×44 at offset (39, 16).
3. **Melee hitbox window** — *superseded; the game's attack timing lives in `src/config/tuning.ts`.*
   - Delivered spec: `attack_slash` 5 frames @ 20 fps; frame 0 wind-up (50 ms), frames 1–2 active (100 ms, hitbox 42×36 from +10 to +52 px), frames 3–4 recovery (100 ms, cancellable).
