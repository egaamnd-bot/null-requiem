# Asset Integration Guide

Gameplay never reads sprite sizes: it asks for an **asset id** (`src/assets/manifest*.ts`). Today every visual is a code-drawn
placeholder with a stable id; final art replaces it without gameplay changes.

## How to deliver art

1. Produce each file exactly as specified in `docs/GEMINI_ASSET_SPEC.md` (transparent PNG; one ROW per animation; frames left to right; facing right).
2. Frame size is the manifest's `display` size. Deliver at 1×, 2× or 4× (integer multiples). The loader derives the scale and rejects other ratios.
3. Put files in `public/assets/final/` and list them in `public/assets/final/manifest.json`:

```json
{ "version": 1, "assets": { "player_courier_idle": { "file": "player_courier_idle.png" } } }
```

4. Reload. `BootScene` loads the manifest, slices each sheet (`planSheet`), and **replaces the placeholder textures that share the asset's `textureKeys`**. Unknown ids and bad sheets are skipped and logged (`[assets] final art`), never fatal.
5. Run `npm run docs:assets` if you change the manifest, then commit the regenerated docs (a test fails when they are stale).

## Integration status

`docs/ASSET_MANIFEST.md` lists every asset with its status:

- **swap-ready** — drop the file in; the view reads the texture key.
- **needs-engine-work** — the spec exists but the game does not play that animation yet (e.g. Courier death/interact/air-jump animation frames, tileset/background override hooks). Delivering art for these is safe but will not show until engine work is done.
- **placeholder** — still the code-drawn stand-in.

## Audio

Audio ids are specified and procedural audio plays today (`src/audio/*`). Loading delivered `.ogg` files is **not wired yet**
(needs-engine-work); the spec exists so the files can be produced in parallel.

## Gemini workflow

Give Gemini one pack at a time from `GEMINI_ASSET_SPEC.md` (packs 01–07). Verify each returned sheet: correct cell grid, transparent
background, no baked-in text, facing right. Mismatches are reported by the loader's console message.
