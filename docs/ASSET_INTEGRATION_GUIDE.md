# Asset Integration Guide

How painted art gets into NULL REQUIEM without touching gameplay. Everything below is implemented and tested; the status of every
single asset is in the generated `docs/ASSET_MANIFEST.md`, the exact per-asset specs in `docs/GEMINI_ASSET_SPEC.md` and, for the first
production batch, `docs/GEMINI_PACK_01_BRIEF.md`.

## The contract

1. **Stable ids.** Every visual has one id in `src/assets/manifest*.ts` (never renamed). Gameplay asks for ids / texture keys, never pixels.
2. **World size is declared, not inferred.** `display` in the manifest is the size the art occupies in the world (logical px, 1 px = 1/270 of the view height). A delivered frame of any integer scale (1×, 2×, 4×…) is declared to be exactly that size (`planWorldSize` → `applyWorldSize`). Views that historically scaled a texture by a constant (Courier 0.65, 2× world textures 0.5) are compensated through `MANIFEST_VIEW_SCALE` / `noteViewScale`.
3. **Hitboxes are independent of art.** Collision comes from `src/config/tuning.ts` and room data; the manifest `hitbox` only documents the relation.
4. **Placeholders are the fallback.** A missing, wrong or malformed file is skipped with a console message (`[assets] final art`); the game never depends on delivered art.
5. **Sheet layout.** One row per animation in manifest order, frames left→right, equal cells, columns = the longest animation, unused cells empty. Cell = world size × integer scale (4× master). Files ≤ 4096 px.

## Delivering art

```
art/incoming/<asset_id>.png                      a finished sheet, or
art/incoming/<asset_id>/<anim>_<NN>.png          loose frames (NN from 01), optionally on #00FF00

npm run assets:build -- --in art/incoming --out public/assets/final --chroma 00ff00
```

`tools/assets/build.ts` validates (errors reject the asset, warnings are reported), assembles loose frames, writes `public/assets/final/<id>.png`,
`manifest.json` (merged with existing entries), `atlas.json` and `report.md/json`. `npm run assets:validate -- --in art/incoming` only reports.
Validation rules and error codes are listed in the Pack 01 brief §5. The runtime reads `manifest.json`:

```json
{ "version": 1, "assets": { "player_courier_run": { "file": "player_courier_run.png" } } }
```

At boot `BootScene` loads it, `planSheet` slices each sheet, one texture per frame is created under the asset's `textureKeys` (the first occurrence of
a key wins), and `applyWorldSize` fixes its world size.

## What each kind of asset does in the game

| Asset | Mechanism |
| --- | --- |
| Courier / enemies / NPCs | views look the key up every frame; sizes compensated (R1); `AssetSprite` for manifest-driven actors (`idle`/`talk`, per-enemy rows) |
| Courier extras (`backtrace`, `airjump`, `interact`, `death`) | `PlayerView.trigger` from events; death holds its last frame until respawn; no-op without art |
| Parallax `env-<region>-bg-far/mid` | `RoomView` uses it for every room of the region; tile scale fits the 270 px height; parallax speed is independent of texture size; opaque layers at 100% |
| Foreground `env_<region>_fg_silhouette__fg_0..3` | one strip per room, 1.15× parallax, in front of the playfield |
| Tileset `env_<region>_tiles` | needs all 31 cells; solids auto-tiled by neighbour mask `N·1+E·2+S·4+W·8`; catwalk caps 0/1/2; hazard 4 frames @ 6 fps; details on enclosed tiles; baked in ≤ 32-tile chunks at min(4, max(2, K))× |
| Props `env_<region>_props__props_i` | placed from `src/world/props.ts` (Rainline only so far), behind the terrain |
| Combat / Backtrace effects | `fxSprites.ts`: played when ALL frames exist, otherwise the particles/rings remain; slash arcs animate across the strike |

## Rendering resolution (R0)

The WebGL canvas is `logical × K` (K 1–4). Cameras use origin (0,0) and zoom K, so coordinates, physics, HUD and pointer handling stay logical
(`logicalPointer` converts canvas pixels). Settings → Render quality: Auto (2× with an FPS guard that drops to 1×), Low 1×, Balanced 2×, High 3×,
Max 4×; K never exceeds what the screen can show. Linear texture filtering is intentional (painted art).

## Known gaps (documented, not hidden)

- Recorded audio: runtime implemented (`src/audio/AudioBank.ts`, `Sfx`, `Music`, `Ambience`; catalog `src/audio/catalog.ts`; CLI `npm run audio:build`; see `docs/audio/README.md`). No audio file has been delivered; the old manifest `audio_*` entries are superseded by the catalog.
- Projectile frames: only the first frame of each projectile kind is shown.
- Props and tilesets exist as placements/logic for Rainline (props) and for every region (tileset); other regions' props have no placements yet.
- Portraits (`ui_portrait_*`) have no renderer slot yet (the dialogue panel is text only).
- Tileset has no inner-corner cells (16-set).
- Real-device checks of sharpness/performance with painted art are pending the Producer.

## Verification

`npx vitest run` (unit, incl. world-size planner, asset tool, autotile, props, one-shot timing), `npx playwright test` (browser: placeholders already at declared sizes; 1×/2×/4×/5× sheets keep world size; pixel-measured Courier; painted background/tiles/props visible; malformed art falls back; touch controls and render scale).
