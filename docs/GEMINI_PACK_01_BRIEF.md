# GEMINI PACK 01 BRIEF — RAINLINE ALLEY (Production Pack 01)

**Status: the game is technically ready to receive this art.** Every asset below is already wired: delivering the file replaces
the placeholder with no gameplay change, at the correct world size, and the game falls back to the placeholder for anything not
delivered. This was verified in a real browser with synthetic art (`e2e/finalArt.spec.ts`), **not yet on a phone with real art**.
Facts below were read from the code or measured; **[decision]** marks my choices, **[unverified]** marks what has not been tested.

> **Naming note.** "Production Pack 01" is the art batch for the Rainline Alley region. It draws on manifest packs 01, 02, 03, 04 and 06
> (`docs/GEMINI_ASSET_SPEC.md` stays the by-category catalogue). **All IDs are existing manifest IDs** except the new `npc_desert_man`.
> Companion docs: `docs/ASSET_INTEGRATION_GUIDE.md` (how art gets in), `docs/ASSET_MANIFEST.md` (status of every asset).

---

## 1. What changed since the first audit (all implemented and tested)

| Item | Result |
| --- | --- |
| Desert Man | Real independent NPC in Rainline Alley (col 7), own placeholder silhouette (`wanderer`), own dialogue, completes quest objective "Speak with the Desert Man" in *Dead Man Walking*; state persists in the save. ZERO is untouched. Sheet: 4 idle + 2 talk frames. |
| R0 render scale | The canvas is now rendered at K× the logical size (default 2× on dense phones, user-selectable 1–4×, with an FPS safety net). The logical world (height 270, coordinates, physics, HUD) is unchanged. |
| R1 size independence | A delivered sheet of ANY resolution reports exactly the world size the manifest declares; verified for 1×, 2×, 4×, 5× and by pixel measurement of the Courier on screen. Hitboxes never read art. |
| R2 backgrounds | `env_rainline_bg_far/mid` replace the generated parallax for every Rainline room. |
| R3 tileset | `env_rainline_tiles` auto-tiles terrain (needs all 31 cells), catwalk caps, animated live-current. |
| R4 foreground | `env_rainline_fg_silhouette` strips draw in front of the playfield. |
| R5 props | Props placed in the 3 Rainline rooms (code-drawn stand-ins today); `env_rainline_props` replaces them. |
| R6 Courier animations | `backtrace`, `airjump`, `interact`, `death` play when delivered. |
| R8 effects | Slash (4 frames), hit spark, enemy telegraph, Backtrace arrival + streak, Glitch Strike, plate pulse play as sprite animations when delivered. |
| Asset tool | `npm run assets:build` assembles loose frames or checks sheets, writes sheet + manifest + atlas + report, rejects anything off-spec. |

**Not covered by this pack (still placeholder, by design):** projectile frame animation (first frame only), boss/NPC portraits, audio files (audio is synthesized; loading `.ogg` is not built), tilesets/backgrounds of the other five regions beyond what generic code already supports (they work the same way when delivered).

---

## 2. Engine facts the art must obey (from the code)

| Fact | Value | Source |
| --- | --- | --- |
| World tile | **16 × 16 logical px** | `src/config/tuning.ts` |
| Logical view | **height 270 fixed; width 480–648 (device aspect)** | `src/core/viewport.ts` |
| Rendering | canvas = logical × K (K 1–4); cameras zoom K with origin (0,0); every coordinate stays logical | `src/core/renderScale.ts`, `src/render/renderScaleRuntime.ts` |
| Texture filtering | **linear (`pixelArt:false`) — correct for painted art; never switch to nearest** | `src/main.ts` |
| Sheet layout | **one ROW per animation in manifest order, frames left→right, equal cells; columns = longest animation; unused cells EMPTY** | `src/assets/types.ts` `sheetLayout`, `sheet.ts` |
| Cell size | **world size × integer scale**; 4× is the master; 1×, 2×, 3×, 5× also load (any integer) | `planSheet`, `planWorldSize` |
| Loader | `public/assets/final/manifest.json` → `{ "assets": { "<id>": { "file": "<id>.png" } } }`; bad files are skipped with a console message | `BootScene`, `applyFinalAssets` |
| Facing | all sprites face **right**; the game mirrors | views |
| Courier | cell 31×36, pivot (0.5,1), hitbox 10×22 @ (10.5,14) | manifest |
| Scrap Hound | cell 24×16, pivot (0.5,1), hitbox 18×12 @ (3,4) | manifest |
| Security Drone | cell 20×24, pivot (0.5,0.5), hitbox 14×14 @ (3,5) | manifest |
| NPC | cell 24×32, pivot (0.5,1), hitbox 12×22 @ (6,10) | manifest |
| Opacity | placeholder far/mid layers are drawn at 78%/62% opacity; **painted layers are drawn at 100%** (the art owns its look) | `RoomView` |

**World size rule (R1).** The manifest `display` size is the size the art occupies in the world, always. A frame's pixel size only
sets sharpness. Where a view historically scaled a texture by a constant (Courier 0.65, world textures 0.5) the engine compensates, so
you never need to think about it. **Hitbox rule.** Collision never reads sprite pixels. The painted figure may exceed the hitbox but must
be centred horizontally on it and stand on the cell's bottom edge (pivot y = 1), or the Courier will float or sink.

**Corrected sizes.** The audit found five placeholders whose real in-game size differed from the manifest; the manifest now matches the
game: `obj_sync_relay` is **16×32** (was 20×32), `obj_override_switch` 16×32, `ui_hud_cell` 8×12, the three slash arcs **36×28 / 28×36**,
legacy NPCs `npc_zero/mira/terminal` 20×28, `boss_bulwark_9` 48×40. The cells in §6 already use the corrected sizes.

---

## 3. Android sharpness (measured)

| Measurement | Before R0 | After R0 (default on a 915×412 phone, DPR 2.625) |
| --- | --- | --- |
| WebGL backing store | 600 × 270 | **1200 × 540** (K = 2; K = 3 → 1800×810, K = 4 → 2400×1080) |
| Displayed size | 2402 × 1082 device px | same |
| Browser upscale | ≈ 4.0× bilinear | **≈ 2.0×** (≈ 1.0× at K = 4) |

* `pixelArt:false` (linear filtering) stays: nearest-neighbour would look jagged on painted shapes.
* Text, vector shapes, the HUD and the touch controls are now sharper at once (visible in side-by-side screenshots).
* Placeholder bitmaps that were drawn at 1× (hound, drone, effects) remain soft until their painted art arrives — that is expected.
* **Terrain** is baked in ≤ 32-tile chunks at 2× (placeholder) or min(4, max(2, K))× (painted tiles), so no texture exceeds 4096 px.
* **Texture limits:** keep every sheet ≤ 4096 px on its longest side (the tool enforces it). The largest sheet in this pack is 3840×540.
* **Performance.** Cost scales with canvas pixels. Measured in headless Chromium with a *software* renderer (CPU, **not representative of a phone GPU**): frame rate fell roughly in proportion to pixel count (K = 1 → 18 fps, 2 → 7, 3 → 3, 4 → 2). The default `auto` therefore starts at K = 2 and drops to 1× for the session if the average stays under 38 fps for 4 s after a 4 s warm-up. **[unverified on a real Android device — the Producer should compare Low / Balanced / High in Settings → Render quality and report the feel and heat.]**

---

## 4. Art direction — "Rainline Hand-Painted" (one style for the whole game)

**Name:** Wet-Neon Gouache. Painted production art for a 2D action game: visible brush-shaping and soft value transitions; not pixel
art, not vector-flat, not photoreal 3D.

**Style lock (paste in front of every Gemini prompt)**

- **Medium look:** digital gouache/oil sketch with clean shape design; confident silhouettes, 3–5 value steps per material, soft painted edges, subtle brush texture kept at low contrast so it survives downscaling.
- **Outline:** no uniform black outline. A darker saturated edge colour (deep indigo `#1a0d26` or the local shadow hue), 1–2 px at 4×, on the shadow side only; lit edges get a rim highlight.
- **Lighting (global):** key light from **top-left**, cool pale-violet (`#8f9bbd` highlights). Rim lights: **cyan `#3cf2ff` on right/back edges, magenta `#ff3ea5` on left/front edges**. Wet surfaces carry specular streaks and neon reflections.
- **Atmosphere:** permanent night rain, violet haze, bloom around neon. Backgrounds hazier and lower contrast than gameplay layers.
- **Colour (Rainline):** void `#05060c`, wet concrete `#272c3e`, steel highlight `#8f9bbd`, signal cyan `#3cf2ff`, deep violet `#1a0d26`; magenta `#ff3ea5` and sodium orange `#ffb02e` only as small accents. The playfield stays **mid-dark and low-saturation** so the Courier, enemies, pickups and hazards pop.
- **Readability:** the world is shown ~4× on a phone and the Courier is 36 logical px tall. Every character must read as a silhouette at ¼ size; no meaningful detail smaller than 6 px at 4×.
- **Consistency:** same palette, light direction, brush softness and outline rule in every asset.
- **No** text, logos, watermarks or signatures; neon signs use abstract glyphs (no readable words, no real brands). **All designs original** — nothing imitating an existing game, film, anime or franchise.
- **Forbidden:** pixel-art stair-stepping, plastic 3D/CGI look, photo textures, lens-flare spam, blurry sprites (sprites must be crisp), halos wider than the cell.

**Character anchors**

- **Courier:** lean runner, long dark rain-coat with high collar, grey satchel across the chest, glowing cyan spinal implant at the neck, silver hair, magenta scarf, short cyan rail-blade. Faces right. Identical face/outfit in every frame.
- **Scrap Hound:** hunched scrap-metal quadruped of piping and a cracked dog skull, one red sensor eye, rust-orange and bruise-purple plates; long low wedge silhouette; visibly crouched on `windup`.
- **Security Drone:** palm-sized spherical drone, one wide **magenta** optic, two stubby stabiliser fins, rear thruster plume; gunmetal shell with scratched Precinct stencil; `charge` frame = core white-hot.
- **Desert Man:** weathered wanderer from beyond the walls in a sun-bleached sand-coloured robe and layered wraps over a dark rain-slicker, wide travel hood, cracked amber visor pushed up on the forehead, canteen and rolled blanket on the back. Warm sand/amber against the cold alley so he reads instantly as "from elsewhere"; calm, friendly, not a threat.

---

## 5. Export requirements and how to deliver (exact)

1. **Master scale 4×.** Cell = world size × 4 (§6). Backgrounds 1920×1080; foreground strips 2× (cell 960×540).
2. **Format:** PNG-32 (8-bit RGBA, sRGB, non-premultiplied alpha), lossless. File name = asset ID exactly, lowercase, no suffixes.
3. **Transparency:** real alpha everywhere except `env_rainline_bg_far` (opaque). No baked ground shadow, no checkerboard "fake transparency", no leftover background colour.
4. **Sheet layout:** exactly as §7a — one row per animation in the listed order, frames left→right, equal cells, no gutters/margins/labels/grid lines. **Cells beyond an animation's frame count stay empty.**
5. **Pivot:** encoded by the cell. Bottom-centre (0.5,1): soles on the cell's last row, body centred. Centre (0.5,0.5): centre of mass in the middle. Top-left (0,0): art fills the cell.
6. **Frame consistency:** feet/base position and scale must not drift between frames of an animation; same costume and head size.
7. **Looping:** `loop` animations must loop seamlessly; `once` animations end on a held pose.
8. **Padding:** ≥ 1% transparent margin on all sides of a sprite cell (linear filtering bleeds edge colour). Tiles and backgrounds fill their cell edge to edge and must tile seamlessly.
9. **Size limit:** ≤ 4096 px on the longest side of any file.
10. **Intake for Gemini [decision].** Image generators rarely give exact grids or true alpha **[unverified for the current model]**, so we accept either: **(a)** a finished sheet `<id>.png`, or **(b)** loose frames in a folder `<id>/<anim>_<NN>.png` (NN from 01, e.g. `player_courier_run/run_01.png`; single-animation assets may use `01.png`), each frame the exact cell size, painted on flat green `#00FF00` if alpha is not available.

**Our side (already built): `npm run assets:build`**

```
npm run assets:build -- --in art/incoming --out public/assets/final --chroma 00ff00     # assemble + validate + write
npm run assets:validate -- --in art/incoming                                           # validate only, writes report.md next to the input
```

It writes `<id>.png` sheets, `manifest.json` (merged), `atlas.json` (frame rectangles + runtime keys) and `report.md/json`, and **rejects**
(never silently accepts) anything off-spec. Errors: unknown file/asset id, missing or duplicate frames, mixed frame sizes, size not an integer
multiple of the world size, grid that does not divide, sheet > 4096 px, art in cells beyond an animation's frames, empty frames, an opaque
baked background, a floating sprite (pivot bottom-centre but ink ends high above the bottom edge). Warnings: delivered at ≠ 4×, art touching the
cell edge, off-centre figure, baseline drift between frames, green fringe left after keying. Exit code 1 on any error; `--strict` makes warnings fail.

**Acceptance checklist (before it goes in the game):** `report.md` shows 0 errors; every P0 asset of the wave is present; playtest the room.

---

## 6. Asset index (IDs are in `src/assets/manifest*.ts`; maths generated from the manifest)

Waves: **Wave 1** = Courier core poses (idle, run, jump, fall, dash, attack, hurt), hound, drone, tileset, far/mid backgrounds, slash arcs, hit spark, Backtrace arrival. **Wave 2** = remaining Courier animations, relay/door/plate/pickups, props, foreground, other FX. **Wave 3** = Desert Man and polish.

| # | Asset ID | File | Frames | Cell px | Sheet px | Scale | Pivot | Shown today |
| ---: | --- | --- | --- | --- | --- | :-: | --- | --- |
| 1 | `player_courier_idle` | `player_courier_idle.png` | 2 (1 anim) | 124×144 | 248×144 | 4× | (0.5, 1) | yes (drop-in) |
| 2 | `player_courier_run` | `player_courier_run.png` | 4 (1 anim) | 124×144 | 496×144 | 4× | (0.5, 1) | yes (drop-in) |
| 3 | `player_courier_jump` | `player_courier_jump.png` | 1 (1 anim) | 124×144 | 124×144 | 4× | (0.5, 1) | yes (drop-in) |
| 4 | `player_courier_fall` | `player_courier_fall.png` | 1 (1 anim) | 124×144 | 124×144 | 4× | (0.5, 1) | yes (drop-in) |
| 5 | `player_courier_dash` | `player_courier_dash.png` | 1 (1 anim) | 124×144 | 124×144 | 4× | (0.5, 1) | yes (drop-in) |
| 6 | `player_courier_attack` | `player_courier_attack.png` | 1 (1 anim) | 124×144 | 124×144 | 4× | (0.5, 1) | yes (drop-in) |
| 7 | `player_courier_hurt` | `player_courier_hurt.png` | 1 (1 anim) | 124×144 | 124×144 | 4× | (0.5, 1) | yes (drop-in) |
| 8 | `player_courier_backtrace` | `player_courier_backtrace.png` | 6 (1 anim) | 124×144 | 744×144 | 4× | (0.5, 1) | yes (drop-in) |
| 9 | `player_courier_airjump` | `player_courier_airjump.png` | 3 (1 anim) | 124×144 | 372×144 | 4× | (0.5, 1) | yes (drop-in) |
| 10 | `player_courier_interact` | `player_courier_interact.png` | 3 (1 anim) | 124×144 | 372×144 | 4× | (0.5, 1) | yes (drop-in) |
| 11 | `player_courier_death` | `player_courier_death.png` | 6 (1 anim) | 124×144 | 744×144 | 4× | (0.5, 1) | yes (drop-in) |
| 12 | `enemy_scrap_hound` | `enemy_scrap_hound.png` | 5 (4 anim) | 96×64 | 192×256 | 4× | (0.5, 1) | yes (drop-in) |
| 13 | `enemy_security_drone` | `enemy_security_drone.png` | 3 (2 anim) | 80×96 | 160×192 | 4× | (0.5, 0.5) | yes (drop-in) |
| 14 | `npc_desert_man` | `npc_desert_man.png` | 6 (2 anim) | 96×128 | 384×256 | 4× | (0.5, 1) | yes (drop-in) |
| 15 | `env_rainline_tiles` | `env_rainline_tiles.png` | 31 (4 anim) | 64×64 | 1024×256 | 4× | (0, 0) | yes (drop-in) |
| 16 | `env_rainline_bg_far` | `env_rainline_bg_far.png` | 1 (1 anim) | 1920×1080 | 1920×1080 | 4× | (0, 0) | yes (drop-in) |
| 17 | `env_rainline_bg_mid` | `env_rainline_bg_mid.png` | 1 (1 anim) | 1920×1080 | 1920×1080 | 4× | (0, 0) | yes (drop-in) |
| 18 | `env_rainline_fg_silhouette` | `env_rainline_fg_silhouette.png` | 4 (1 anim) | 960×540 | 3840×540 | 2× | (0, 0) | yes (drop-in) |
| 19 | `env_rainline_props` | `env_rainline_props.png` | 8 (1 anim) | 192×192 | 1536×192 | 4× | (0.5, 1) | yes (drop-in) |
| 20 | `obj_sync_relay` | `obj_sync_relay.png` | 3 (2 anim) | 64×128 | 128×256 | 4× | (0.5, 1) | yes (drop-in) |
| 21 | `obj_security_door` | `obj_security_door.png` | 5 (2 anim) | 64×64 | 256×128 | 4× | (0, 0) | yes (drop-in) |
| 22 | `obj_pressure_plate` | `obj_pressure_plate.png` | 4 (4 anim) | 64×24 | 64×96 | 4× | (0, 1) | yes (drop-in) |
| 23 | `obj_breakable_wall` | `obj_breakable_wall.png` | 7 (4 anim) | 64×64 | 256×256 | 4× | (0, 0) | yes (drop-in) |
| 24 | `pickup_backtrace_module` | `pickup_backtrace_module.png` | 2 (2 anim) | 64×128 | 64×256 | 4× | (0.5, 1) | yes (drop-in) |
| 25 | `pickup_integrity_cell` | `pickup_integrity_cell.png` | 1 (1 anim) | 48×48 | 48×48 | 4× | (0.5, 0.5) | yes (drop-in) |
| 26 | `pickup_glitch_strike` | `pickup_glitch_strike.png` | 1 (1 anim) | 64×128 | 64×128 | 4× | (0.5, 0.5) | yes (drop-in) |
| 27 | `pickup_memory_fragment` | `pickup_memory_fragment.png` | 1 (1 anim) | 48×48 | 48×48 | 4× | (0.5, 0.5) | yes (drop-in) |
| 28 | `pickup_scrap` | `pickup_scrap.png` | 2 (1 anim) | 48×48 | 96×48 | 4× | (0.5, 0.5) | yes (drop-in) |
| 29 | `fx_slash_side` | `fx_slash_side.png` | 4 (1 anim) | 144×112 | 576×112 | 4× | (0.5, 0.5) | yes (drop-in) |
| 30 | `fx_slash_up` | `fx_slash_up.png` | 4 (1 anim) | 112×144 | 448×144 | 4× | (0.5, 0.5) | yes (drop-in) |
| 31 | `fx_slash_down` | `fx_slash_down.png` | 4 (1 anim) | 112×144 | 448×144 | 4× | (0.5, 0.5) | yes (drop-in) |
| 32 | `fx_hit_spark` | `fx_hit_spark.png` | 5 (1 anim) | 96×96 | 480×96 | 4× | (0.5, 0.5) | yes (drop-in) |
| 33 | `fx_enemy_telegraph` | `fx_enemy_telegraph.png` | 4 (1 anim) | 48×48 | 192×48 | 4× | (0.5, 0.5) | yes (drop-in) |
| 34 | `fx_projectile_set` | `fx_projectile_set.png` | 8 (3 anim) | 64×64 | 192×192 | 4× | (0.5, 0.5) | yes (drop-in) |
| 35 | `fx_glitch_strike` | `fx_glitch_strike.png` | 6 (1 anim) | 256×160 | 1536×160 | 4× | (0.5, 0.5) | yes (drop-in) |
| 36 | `fx_backtrace_arrival` | `fx_backtrace_arrival.png` | 8 (1 anim) | 384×384 | 3072×384 | 4× | (0.5, 0.5) | yes (drop-in) |
| 37 | `fx_backtrace_streak` | `fx_backtrace_streak.png` | 4 (1 anim) | 256×32 | 1024×32 | 4× | (0, 0.5) | yes (drop-in) |
| 38 | `fx_temporal_plate_pulse` | `fx_temporal_plate_pulse.png` | 6 (1 anim) | 128×128 | 768×128 | 4× | (0.5, 1) | yes (drop-in) |


*"Shown today = yes (drop-in)": delivering the file changes the game with no code change. Multi-frame effects (spark, telegraph, arrival, streak, glitch strike, plate pulse) play as animations only when **every** frame is delivered; otherwise the code-drawn effect stays. Slash arcs also work with frame 1 alone (it replaces the static arc), so **frame 1 of every effect is its peak frame**.*

**Pack totals:** 38 files (11 Courier, 2 enemy, 1 NPC, 5 environment, 9 object/pickup, 7 combat FX, 3 Backtrace FX). Intentionally **not** requested: `fx_backtrace_echo` (the engine tints the Courier sprite) and `fx_null_void` (Null Cathedral).

---

## 7. How the art is integrated (implemented — no gameplay code is rewritten)

**Principle.** Gameplay never reads sprites. Files go in `public/assets/final/` + `manifest.json`; `BootScene` loads them, slices each sheet with
`planSheet`, creates one texture per frame under the same keys the placeholders used, and `applyWorldSize` declares each frame's world size
(Phaser `source.resolution` + frame source size). Every view, scale constant, origin and hitbox is therefore untouched. Missing/invalid files leave
the placeholder in place and are logged (`[assets] final art`).

| Stage | Where | Behaviour |
| --- | --- | --- |
| R0 | `src/core/renderScale.ts`, `viewportDom.ts`, `main.ts`, every scene `create()` | internal resolution K×, quality setting, FPS guard, pointer → logical |
| R1 | `assetRuntime.ts` (`applyWorldSize`), `sheet.ts` (`planWorldSize`), `assetMap.ts` | world-size independence for every replaced key |
| R2 | `RoomView` | `env-<region>-bg-far/mid` replace generated layers; parallax speed independent of texture size |
| R3 | `RoomView.buildTerrain`, `assets/autotile.ts` | chunked terrain; solids auto-tiled by N·1+E·2+S·4+W·8; catwalk caps; hazard animated; details on enclosed tiles |
| R4 | `RoomView` | one of 4 foreground strips per room, 1.15× parallax, depth above the playfield |
| R5 | `src/world/props.ts`, `RoomView.buildProps` | decorative props behind the terrain; data-only placements |
| R6 | `courierAnim.ts`, `PlayerView.trigger` | backtrace / airjump / interact / death one-shots |
| R7 | `npcs.ts`, `dialogues.ts`, `quests.ts`, `rooms.ts` | Desert Man |
| R8 | `fxSprites.ts`, `Fx`, `PlayerView`, `HoundView` | multi-frame effects with code-drawn fallbacks |

**Tileset contract (`env_rainline_tiles`, 1024×256 at 4×: 16 columns × 4 rows of 64×64 cells; ALL 31 cells must be delivered or the generated terrain stays):**

- Row 1 `solid` — 16 auto-tile cells, index `i = N·1 + E·2 + S·4 + W·8`, each term 1 when that neighbour is **solid** (out-of-room counts as solid). 15 = fully enclosed fill, 0 = isolated block, 14 (E+S+W, open north) = platform top with the wet steel lip, 7 (N+E+S) = open to the west.
- Row 2 `catwalk` — cell 0 left cap, 1 middle, 2 right cap; one-way grating in the top ~8 logical px (32 px at 4×), the rest transparent.
- Row 3 `hazard` — 4 frames @ 6 fps loop, the live-current surface, bottom-aligned.
- Row 4 `details` — 8 decals (panels, rivets, stains, pipe stubs) on transparent ground, scattered over fully enclosed tiles (12%).
- Every solid cell must tile seamlessly with every neighbour variant; platform tops must be the brightest, highest-contrast surface. There are no dedicated inner-corner cells (16-set).

**Regression coverage:** `tests/renderScale.test.ts`, `worldSize.test.ts`, `assetTool.test.ts`, `rendering.data.test.ts`, `courierAnim.test.ts`, `desertMan.test.ts`; browser: `e2e/finalArt.spec.ts` (placeholders already at declared size; 1×/2×/4×/5× sheets keep world size; pixel-measured Courier; painted layers visible; malformed art falls back; Courier interact frames play) and `e2e/touch.spec.ts` (touch controls and render scale).

---

## 7a. Asset specifications (one entry per file, generated from the manifest)

**Special instructions per group**

- **A — Courier.** Same outfit, hair, scarf and implant in every frame; feet on the bottom edge; body centred on the 10-px hitbox centre-line. Run = 4 distinct contact/passing poses @ 10 fps loop; idle = 2-frame breathing loop @ 2.2 fps; `attack` is **one** frame (strike pose; the arc is a separate effect); `jump` rising, `fall` falling, `dash` stretched horizontally, `hurt` recoil. `backtrace` (6 f, plays over the Courier for 0.375 s after a rewind): re-forming from cyan glitch shards; `airjump` (3 f): coil flare at the boots; `interact` (3 f, plays when a conversation opens): reaching out; `death` (6 f, last frame held until respawn): signal loss, flicker, fall.
- **B — Enemies.** Hound `walk` 2-frame loop alternating leg planes; `windup` crouched, head low, eye flaring; `lunge` stretched airborne; `recover` skid. Drone `idle` 2-frame hover bob; `charge` optic white-hot.
- **C — Desert Man.** `idle` 4 f @ 3 fps loop (calm breathing, cloth sway, occasional head tilt); `talk` 2 f @ 5 fps loop (small hand gesture, plays while a conversation is open).
- **D — Environment.** Mood: purple-black sky, wet concrete, cyan signage reflections, rusted fire escapes. `bg_far`: opaque, hazy distant skyline, violet-magenta glow, rain streaks, **seamless left–right**, no focal point. `bg_mid`: closer buildings, fire escapes, pillars, signs; **transparent above the structures**; seamless left–right. `fg_silhouette`: four interchangeable near-black strips (pipes, cables, railings) with a faint rim light; art only in the top 25% or bottom 25% of each 960×540 cell. `props`: 8 cells in this order — dumpster, fire-escape section, neon sign box (abstract glyphs), rain-pipe cluster, crate stack, street lamp, puddle patch, vent unit — each bottom-centre pivot, standing on the cell's bottom edge, 48×48 world px (192×192 at 4×).
- **E — Objects/pickups.** Strong readable shapes with a clear glow colour (relay cyan; cell cyan-white; fragment violet; glitch core magenta; scrap amber; module cyan on a pedestal). Interactive things are brighter and more saturated than the environment. Plate pair: Courier plate glows cyan when pressed; **ECHO plate is translucent violet with a faint clock-face ring**. Door `open` frames: the LAST frame (fully open) is what the game shows for an open door.
- **F — Combat FX.** **Frame 1 is the PEAK frame** (shown if later frames are absent). Slash arcs: bright cyan-white crescent with a magenta trailing edge, fully opaque on transparent, blended additively by the game; 4 frames play across the strike. `fx_projectile_set`: 3 columns × 3 rows: row 1 `bolt` (2 f), row 2 `shockwave` (3 f), row 3 `plasma` (3 f); only the first frame of each is shown today.
- **G — Backtrace FX.** Arrival burst (96×96): cyan-white ring with data shards, frame 1 = widest ring, frames 2–8 shrink and fade, centred on the arrival point. Streak (64×8, pivot left-centre): a horizontal cyan data smear the game stretches and rotates between the start and arrival points. Plate pulse (32×32, pivot bottom-centre): violet clock-ring pulse rising from a pressed plate. The echo (afterimage) needs no art.


### A. Courier (player)

#### 1. `player_courier_idle` — Courier — Idle  [P0]

- **File:** `player_courier_idle.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `player_courier_idle/<anim>_<NN>.png` (see §5).
- **Sheet:** 248×144 px = 2 column(s) × 1 row(s) of 124×144 px cells (4× the world size 31×36).
- **Animations (row order, top to bottom):** idle 2f@2.2fps loop. row 1 = `idle` (2 frames).
- **Pivot / origin:** (0.5, 1) = bottom-centre: the soles/base touch the BOTTOM edge of the cell, body centred horizontally.
- **Collision (gameplay, never changes with art):** 10×22 logical px at offset (10.5, 14) in the 31×36 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Replaces texture keys:** `player-idle0`, `player-idle1`
- **Integration status:** `swap-ready`.

#### 2. `player_courier_run` — Courier — Run  [P0]

- **File:** `player_courier_run.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `player_courier_run/<anim>_<NN>.png` (see §5).
- **Sheet:** 496×144 px = 4 column(s) × 1 row(s) of 124×144 px cells (4× the world size 31×36).
- **Animations (row order, top to bottom):** run 4f@10fps loop. row 1 = `run` (4 frames).
- **Pivot / origin:** (0.5, 1) = bottom-centre: the soles/base touch the BOTTOM edge of the cell, body centred horizontally.
- **Collision (gameplay, never changes with art):** 10×22 logical px at offset (10.5, 14) in the 31×36 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Replaces texture keys:** `player-run0`, `player-run1`, `player-run2`, `player-run3`
- **Integration status:** `swap-ready`.

#### 3. `player_courier_jump` — Courier — Jump  [P0]

- **File:** `player_courier_jump.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `player_courier_jump/<anim>_<NN>.png` (see §5).
- **Sheet:** 124×144 px = 1 column(s) × 1 row(s) of 124×144 px cells (4× the world size 31×36).
- **Animations (row order, top to bottom):** jump 1f@1fps once. row 1 = `jump` (1 frame).
- **Pivot / origin:** (0.5, 1) = bottom-centre: the soles/base touch the BOTTOM edge of the cell, body centred horizontally.
- **Collision (gameplay, never changes with art):** 10×22 logical px at offset (10.5, 14) in the 31×36 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Replaces texture keys:** `player-jump`
- **Integration status:** `swap-ready`.

#### 4. `player_courier_fall` — Courier — Fall  [P0]

- **File:** `player_courier_fall.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `player_courier_fall/<anim>_<NN>.png` (see §5).
- **Sheet:** 124×144 px = 1 column(s) × 1 row(s) of 124×144 px cells (4× the world size 31×36).
- **Animations (row order, top to bottom):** fall 1f@1fps once. row 1 = `fall` (1 frame).
- **Pivot / origin:** (0.5, 1) = bottom-centre: the soles/base touch the BOTTOM edge of the cell, body centred horizontally.
- **Collision (gameplay, never changes with art):** 10×22 logical px at offset (10.5, 14) in the 31×36 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Replaces texture keys:** `player-fall`
- **Integration status:** `swap-ready`.

#### 5. `player_courier_dash` — Courier — Dash  [P0]

- **File:** `player_courier_dash.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `player_courier_dash/<anim>_<NN>.png` (see §5).
- **Sheet:** 124×144 px = 1 column(s) × 1 row(s) of 124×144 px cells (4× the world size 31×36).
- **Animations (row order, top to bottom):** dash 1f@1fps once. row 1 = `dash` (1 frame).
- **Pivot / origin:** (0.5, 1) = bottom-centre: the soles/base touch the BOTTOM edge of the cell, body centred horizontally.
- **Collision (gameplay, never changes with art):** 10×22 logical px at offset (10.5, 14) in the 31×36 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Replaces texture keys:** `player-dash`
- **Integration status:** `swap-ready`.

#### 6. `player_courier_attack` — Courier — Attack  [P0]

- **File:** `player_courier_attack.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `player_courier_attack/<anim>_<NN>.png` (see §5).
- **Sheet:** 124×144 px = 1 column(s) × 1 row(s) of 124×144 px cells (4× the world size 31×36).
- **Animations (row order, top to bottom):** attack 1f@16fps once. row 1 = `attack` (1 frame).
- **Pivot / origin:** (0.5, 1) = bottom-centre: the soles/base touch the BOTTOM edge of the cell, body centred horizontally.
- **Collision (gameplay, never changes with art):** 10×22 logical px at offset (10.5, 14) in the 31×36 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Replaces texture keys:** `player-attack`
- **Integration status:** `swap-ready`. The view shows this frame for the whole active window; extra frames are driven once the final sheet arrives.

#### 7. `player_courier_hurt` — Courier — Hurt  [P0]

- **File:** `player_courier_hurt.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `player_courier_hurt/<anim>_<NN>.png` (see §5).
- **Sheet:** 124×144 px = 1 column(s) × 1 row(s) of 124×144 px cells (4× the world size 31×36).
- **Animations (row order, top to bottom):** hurt 1f@1fps once. row 1 = `hurt` (1 frame).
- **Pivot / origin:** (0.5, 1) = bottom-centre: the soles/base touch the BOTTOM edge of the cell, body centred horizontally.
- **Collision (gameplay, never changes with art):** 10×22 logical px at offset (10.5, 14) in the 31×36 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Replaces texture keys:** `player-hurt`
- **Integration status:** `swap-ready`.

#### 8. `player_courier_backtrace` — Courier — Backtrace Arrival  [P0]

- **File:** `player_courier_backtrace.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `player_courier_backtrace/<anim>_<NN>.png` (see §5).
- **Sheet:** 744×144 px = 6 column(s) × 1 row(s) of 124×144 px cells (4× the world size 31×36).
- **Animations (row order, top to bottom):** backtrace 6f@16fps once. row 1 = `backtrace` (6 frames; Dissolve in from cyan glitch shards).
- **Pivot / origin:** (0.5, 1) = bottom-centre: the soles/base touch the BOTTOM edge of the cell, body centred horizontally.
- **Collision (gameplay, never changes with art):** 10×22 logical px at offset (10.5, 14) in the 31×36 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Replaces texture keys:** `player_courier_backtrace__backtrace_0`, `player_courier_backtrace__backtrace_1`, `player_courier_backtrace__backtrace_2`, `player_courier_backtrace__backtrace_3`, `player_courier_backtrace__backtrace_4`, `player_courier_backtrace__backtrace_5`
- **Integration status:** `swap-ready`. Plays over the Courier for 6 frames after a Backtrace (R6). Without art the normal pose continues.

#### 9. `player_courier_airjump` — Courier — Kinetic Coil Air Jump  [P0]

- **File:** `player_courier_airjump.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `player_courier_airjump/<anim>_<NN>.png` (see §5).
- **Sheet:** 372×144 px = 3 column(s) × 1 row(s) of 124×144 px cells (4× the world size 31×36).
- **Animations (row order, top to bottom):** airjump 3f@14fps once. row 1 = `airjump` (3 frames).
- **Pivot / origin:** (0.5, 1) = bottom-centre: the soles/base touch the BOTTOM edge of the cell, body centred horizontally.
- **Collision (gameplay, never changes with art):** 10×22 logical px at offset (10.5, 14) in the 31×36 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Replaces texture keys:** `player_courier_airjump__airjump_0`, `player_courier_airjump__airjump_1`, `player_courier_airjump__airjump_2`
- **Integration status:** `swap-ready`.

#### 10. `player_courier_interact` — Courier — Interact  [P0]

- **File:** `player_courier_interact.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `player_courier_interact/<anim>_<NN>.png` (see §5).
- **Sheet:** 372×144 px = 3 column(s) × 1 row(s) of 124×144 px cells (4× the world size 31×36).
- **Animations (row order, top to bottom):** interact 3f@8fps once. row 1 = `interact` (3 frames).
- **Pivot / origin:** (0.5, 1) = bottom-centre: the soles/base touch the BOTTOM edge of the cell, body centred horizontally.
- **Collision (gameplay, never changes with art):** 10×22 logical px at offset (10.5, 14) in the 31×36 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Replaces texture keys:** `player_courier_interact__interact_0`, `player_courier_interact__interact_1`, `player_courier_interact__interact_2`
- **Integration status:** `swap-ready`.

#### 11. `player_courier_death` — Courier — Death  [P0]

- **File:** `player_courier_death.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `player_courier_death/<anim>_<NN>.png` (see §5).
- **Sheet:** 744×144 px = 6 column(s) × 1 row(s) of 124×144 px cells (4× the world size 31×36).
- **Animations (row order, top to bottom):** death 6f@10fps once. row 1 = `death` (6 frames).
- **Pivot / origin:** (0.5, 1) = bottom-centre: the soles/base touch the BOTTOM edge of the cell, body centred horizontally.
- **Collision (gameplay, never changes with art):** 10×22 logical px at offset (10.5, 14) in the 31×36 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Replaces texture keys:** `player_courier_death__death_0`, `player_courier_death__death_1`, `player_courier_death__death_2`, `player_courier_death__death_3`, `player_courier_death__death_4`, `player_courier_death__death_5`
- **Integration status:** `swap-ready`.


### B. Enemies

#### 12. `enemy_scrap_hound` — Scrap Hound  [P0]

- **File:** `enemy_scrap_hound.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `enemy_scrap_hound/<anim>_<NN>.png` (see §5).
- **Sheet:** 192×256 px = 2 column(s) × 4 row(s) of 96×64 px cells (4× the world size 24×16).
- **Animations (row order, top to bottom):** walk 2f@5fps loop | windup 1f@1fps once | lunge 1f@1fps once | recover 1f@1fps once. row 1 = `walk` (2 frames); row 2 = `windup` (1 frame, columns 2–2 stay EMPTY); row 3 = `lunge` (1 frame, columns 2–2 stay EMPTY); row 4 = `recover` (1 frame, columns 2–2 stay EMPTY).
- **Pivot / origin:** (0.5, 1) = bottom-centre: the soles/base touch the BOTTOM edge of the cell, body centred horizontally.
- **Collision (gameplay, never changes with art):** 18×12 logical px at offset (3, 4) in the 24×16 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** A hunched scrap-metal quadruped built from piping and a cracked dog skull, one red sensor eye, rust-orange and bruise-purple plates. The wind-up pose crouches visibly low.
- **Palette:** #2a1a1a #8a4a2a #ff3b4e #c9a46a
- **Variations:** Elite: glowing red joints
- **Replaces texture keys:** `hound-walk0`, `hound-walk1`, `hound-windup`, `hound-lunge`, `hound-recover`
- **Integration status:** `swap-ready`.

#### 13. `enemy_security_drone` — Security Drone  [P0]

- **File:** `enemy_security_drone.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `enemy_security_drone/<anim>_<NN>.png` (see §5).
- **Sheet:** 160×192 px = 2 column(s) × 2 row(s) of 80×96 px cells (4× the world size 20×24).
- **Animations (row order, top to bottom):** idle 2f@3fps loop | charge 1f@1fps once. row 1 = `idle` (2 frames); row 2 = `charge` (1 frame, columns 2–2 stay EMPTY; Core glows white-hot while winding up a shot.).
- **Pivot / origin:** (0.5, 0.5) = cell centre; centre of mass on the cell centre.
- **Collision (gameplay, never changes with art):** 14×14 logical px at offset (3, 5) in the 20×24 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** A palm-sized spherical drone with a single wide magenta optic, two stubby stabiliser fins and a rear thruster plume. Matte gunmetal shell with scratched Precinct stencil; the optic must read from far away.
- **Palette:** #1a1a28 #6a6a88 #ff3ea5 #ffb02e
- **Variations:** Elite: red optic, extra side pods
- **Replaces texture keys:** `drone-idle0`, `drone-idle1`, `drone-charge`
- **Integration status:** `swap-ready`.


### C. NPC

#### 14. `npc_desert_man` — Desert Man (Rainline Wanderer)  [P0]

- **File:** `npc_desert_man.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `npc_desert_man/<anim>_<NN>.png` (see §5).
- **Sheet:** 384×256 px = 4 column(s) × 2 row(s) of 96×128 px cells (4× the world size 24×32).
- **Animations (row order, top to bottom):** idle 4f@3fps loop | talk 2f@5fps loop. row 1 = `idle` (4 frames); row 2 = `talk` (2 frames, columns 3–4 stay EMPTY).
- **Pivot / origin:** (0.5, 1) = bottom-centre: the soles/base touch the BOTTOM edge of the cell, body centred horizontally.
- **Collision (gameplay, never changes with art):** 12×22 logical px at offset (6, 10) in the 24×32 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** A weathered wanderer from beyond the city walls in a sun-bleached sand-coloured robe and layered wraps over a dark rain-slicker, wide travel hood, a cracked amber visor pushed up on the forehead, a canteen and rolled blanket on the back. Out of place in the rain: dry-coloured, calm, unhurried.
- **Palette:** #2a2014 #c9a46a #ffb02e #3cf2ff
- **Replaces texture keys:** `npc_desert_man__idle_0`, `npc_desert_man__idle_1`, `npc_desert_man__idle_2`, `npc_desert_man__idle_3`, `npc_desert_man__talk_0`, `npc_desert_man__talk_1`
- **Integration status:** `swap-ready`. NEW id (Production Pack 01). Independent NPC in Rainline Alley; speaking to him completes the first main-quest objective. Idle and talk rows are both played by NpcView.


### D. Rainline environment: tileset, parallax, props

#### 15. `env_rainline_tiles` — Rainline Alley — Tileset  [P1]

- **File:** `env_rainline_tiles.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `env_rainline_tiles/<anim>_<NN>.png` (see §5).
- **Sheet:** 1024×256 px = 16 column(s) × 4 row(s) of 64×64 px cells (4× the world size 16×16).
- **Animations (row order, top to bottom):** solid 16f@1fps once | catwalk 3f@1fps once | hazard 4f@6fps loop | details 8f@1fps once. row 1 = `solid` (16 frames; 4x4 auto-tile set (edges + corners + fill)); row 2 = `catwalk` (3 frames, columns 4–16 stay EMPTY; left cap, middle, right cap); row 3 = `hazard` (4 frames, columns 5–16 stay EMPTY; animated live-current surface); row 4 = `details` (8 frames, columns 9–16 stay EMPTY; wall panels, rivets, stains).
- **Pivot / origin:** (0, 0) = top-left; the art fills the whole cell (tile/background).
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** Night alley in permanent rain: purple-black sky, wet concrete, cyan signage reflections, rusted fire escapes. Tiles are 16x16 logical px and must tile seamlessly. Strong top lip highlight, darker underside, readable platform edges.
- **Palette:** #05060c #272c3e #8f9bbd #3cf2ff #1a0d26
- **Variations:** Day-variant not required
- **Replaces texture keys:** `env_rainline_tiles__solid_0`, `env_rainline_tiles__solid_1`, `env_rainline_tiles__solid_2`, `env_rainline_tiles__solid_3`, `env_rainline_tiles__solid_4`, `env_rainline_tiles__solid_5`, `env_rainline_tiles__solid_6`, `env_rainline_tiles__solid_7`, `env_rainline_tiles__solid_8`, `env_rainline_tiles__solid_9`, `env_rainline_tiles__solid_10`, `env_rainline_tiles__solid_11`, `env_rainline_tiles__solid_12`, `env_rainline_tiles__solid_13`, `env_rainline_tiles__solid_14`, `env_rainline_tiles__solid_15`, `env_rainline_tiles__catwalk_0`, `env_rainline_tiles__catwalk_1`, `env_rainline_tiles__catwalk_2`, `env_rainline_tiles__hazard_0`, `env_rainline_tiles__hazard_1`, `env_rainline_tiles__hazard_2`, `env_rainline_tiles__hazard_3`, `env_rainline_tiles__details_0`, `env_rainline_tiles__details_1`, `env_rainline_tiles__details_2`, `env_rainline_tiles__details_3`, `env_rainline_tiles__details_4`, `env_rainline_tiles__details_5`, `env_rainline_tiles__details_6`, `env_rainline_tiles__details_7`
- **Integration status:** `swap-ready`. RoomView auto-tiles solids from this sheet when ALL 31 cells are delivered (index = N·1 + E·2 + S·4 + W·8; see src/assets/autotile.ts). Until then the generated terrain is drawn.

#### 16. `env_rainline_bg_far` — Rainline Alley — Far Background  [P1]

- **File:** `env_rainline_bg_far.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `env_rainline_bg_far/<anim>_<NN>.png` (see §5).
- **Sheet:** 1920×1080 px = 1 column(s) × 1 row(s) of 1920×1080 px cells (4× the world size 480×270).
- **Animations (row order, top to bottom):** far 1f@1fps once. row 1 = `far` (1 frame).
- **Pivot / origin:** (0, 0) = top-left; the art fills the whole cell (tile/background).
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** fully opaque (farthest layer).
- **Visual description:** Far skyline/ceiling layer. Night alley in permanent rain: purple-black sky, wet concrete, cyan signage reflections, rusted fire escapes. Low contrast, atmospheric perspective, no gameplay-readable detail, seamless left-right tile. Landscape 16:9 at 480x270 logical (deliver 1920x1080).
- **Palette:** #05060c #272c3e #8f9bbd #3cf2ff #1a0d26
- **Replaces texture keys:** `env-rainline-bg-far`
- **Integration status:** `swap-ready`. RoomView uses this layer for every room of the region when delivered (tile scale fits the 270 px view height; painted layers are drawn at full opacity).

#### 17. `env_rainline_bg_mid` — Rainline Alley — Mid Background  [P1]

- **File:** `env_rainline_bg_mid.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `env_rainline_bg_mid/<anim>_<NN>.png` (see §5).
- **Sheet:** 1920×1080 px = 1 column(s) × 1 row(s) of 1920×1080 px cells (4× the world size 480×270).
- **Animations (row order, top to bottom):** mid 1f@1fps once. row 1 = `mid` (1 frame).
- **Pivot / origin:** (0, 0) = top-left; the art fills the whole cell (tile/background).
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** Mid layer: larger structures and architecture with more contrast than the far layer. dumpsters, fire escapes, neon sign boxes, rain pipes, crates, a flickering street lamp, puddle reflections. Seamless left-right tile, transparent where the far layer should show through.
- **Palette:** #05060c #272c3e #8f9bbd #3cf2ff #1a0d26
- **Replaces texture keys:** `env-rainline-bg-mid`
- **Integration status:** `swap-ready`. Used for every room of the region when delivered; opacity is the art's own.

#### 18. `env_rainline_fg_silhouette` — Rainline Alley — Foreground Silhouettes  [P1]

- **File:** `env_rainline_fg_silhouette.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `env_rainline_fg_silhouette/<anim>_<NN>.png` (see §5).
- **Sheet:** 3840×540 px = 4 column(s) × 1 row(s) of 960×540 px cells (2× the world size 480×270).
- **Animations (row order, top to bottom):** fg 4f@1fps once. row 1 = `fg` (4 frames; 4 interchangeable strips).
- **Pivot / origin:** (0, 0) = top-left; the art fills the whole cell (tile/background).
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** Near-black foreground silhouettes with a subtle coloured rim light. Never cover the player: keep to the top/bottom 25% of the screen. dumpsters, fire escapes, neon sign boxes, rain pipes, crates, a flickering street lamp, puddle reflections.
- **Palette:** #05060c #272c3e #8f9bbd #3cf2ff #1a0d26
- **Replaces texture keys:** `env_rainline_fg_silhouette__fg_0`, `env_rainline_fg_silhouette__fg_1`, `env_rainline_fg_silhouette__fg_2`, `env_rainline_fg_silhouette__fg_3`
- **Integration status:** `swap-ready`. One of the 4 strips (chosen per room) is drawn in front of the playfield with 1.15x parallax; there is no placeholder.

#### 19. `env_rainline_props` — Rainline Alley — Props  [P1]

- **File:** `env_rainline_props.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `env_rainline_props/<anim>_<NN>.png` (see §5).
- **Sheet:** 1536×192 px = 8 column(s) × 1 row(s) of 192×192 px cells (4× the world size 48×48).
- **Animations (row order, top to bottom):** props 8f@1fps once. row 1 = `props` (8 frames; 8 props; see description).
- **Pivot / origin:** (0.5, 1) = bottom-centre: the soles/base touch the BOTTOM edge of the cell, body centred horizontally.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** Eight standalone props on a transparent background, each within 48x48 logical px: dumpsters, fire escapes, neon sign boxes, rain pipes, crates, a flickering street lamp, puddle reflections. Each must read at small size and share the region palette.
- **Palette:** #05060c #272c3e #8f9bbd #3cf2ff #1a0d26
- **Replaces texture keys:** `env_rainline_props__props_0`, `env_rainline_props__props_1`, `env_rainline_props__props_2`, `env_rainline_props__props_3`, `env_rainline_props__props_4`, `env_rainline_props__props_5`, `env_rainline_props__props_6`, `env_rainline_props__props_7`
- **Integration status:** `swap-ready`. Placed by src/world/props.ts in the three Rainline rooms (code-drawn stand-ins today).


### E. Rainline interactive objects and pickups

#### 20. `obj_sync_relay` — Sync Relay  [P0]

- **File:** `obj_sync_relay.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `obj_sync_relay/<anim>_<NN>.png` (see §5).
- **Sheet:** 128×256 px = 2 column(s) × 2 row(s) of 64×128 px cells (4× the world size 16×32).
- **Animations (row order, top to bottom):** off 1f@1fps loop | on 2f@3fps loop. row 1 = `off` (1 frame, columns 2–2 stay EMPTY); row 2 = `on` (2 frames).
- **Pivot / origin:** (0.5, 1) = bottom-centre: the soles/base touch the BOTTOM edge of the cell, body centred horizontally.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** A waist-high relay pylon with a cyan ring that lights up when linked; a vertical glass tube with a pulsing coil.
- **Palette:** #14102a #3a4a6a #3cf2ff
- **Replaces texture keys:** `obj-relay-off`, `obj-relay-on`
- **Integration status:** `swap-ready`.

#### 21. `obj_security_door` — Security Door  [P0]

- **File:** `obj_security_door.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `obj_security_door/<anim>_<NN>.png` (see §5).
- **Sheet:** 256×128 px = 4 column(s) × 2 row(s) of 64×64 px cells (4× the world size 16×16).
- **Animations (row order, top to bottom):** closed 1f@1fps loop | open 4f@12fps once. row 1 = `closed` (1 frame, columns 2–4 stay EMPTY); row 2 = `open` (4 frames; iris/slide open).
- **Pivot / origin:** (0, 0) = top-left; the art fills the whole cell (tile/background).
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** A heavy steel shutter segment with a hazard-stripe edge and a status light (red locked, amber waiting, green open). Stacks vertically without seams.
- **Palette:** #2a2a38 #8a8aa0 #ff3b4e #4dff9a
- **Replaces texture keys:** `obj-door-closed`, `obj_security_door__open_0`, `obj_security_door__open_1`, `obj_security_door__open_2`, `obj-door-open`
- **Integration status:** `swap-ready`.

#### 22. `obj_pressure_plate` — Pressure Plate  [P0]

- **File:** `obj_pressure_plate.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `obj_pressure_plate/<anim>_<NN>.png` (see §5).
- **Sheet:** 64×96 px = 1 column(s) × 4 row(s) of 64×24 px cells (4× the world size 16×6).
- **Animations (row order, top to bottom):** up 1f@1fps loop | down 1f@1fps loop | echoUp 1f@1fps loop | echoDown 1f@1fps loop. row 1 = `up` (1 frame); row 2 = `down` (1 frame); row 3 = `echoUp` (1 frame); row 4 = `echoDown` (1 frame).
- **Pivot / origin:** (0, 1) = x=0, y=1.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** A shallow steel plate flush with the floor. Courier plates glow cyan when pressed. ECHO plates are translucent violet with a faint clock-face ring so players learn they respond to the afterimage.
- **Palette:** #2a2a38 #8a8aa0 #3cf2ff #9b59ff
- **Replaces texture keys:** `obj-plate-up`, `obj-plate-down`, `obj-plate-echo-up`, `obj-plate-echo-down`
- **Integration status:** `swap-ready`.

#### 23. `obj_breakable_wall` — Cracked Wall  [P1]

- **File:** `obj_breakable_wall.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `obj_breakable_wall/<anim>_<NN>.png` (see §5).
- **Sheet:** 256×256 px = 4 column(s) × 4 row(s) of 64×64 px cells (4× the world size 16×16).
- **Animations (row order, top to bottom):** intact 1f@1fps loop | damaged1 1f@1fps loop | damaged2 1f@1fps loop | debris 4f@12fps once. row 1 = `intact` (1 frame, columns 2–4 stay EMPTY); row 2 = `damaged1` (1 frame, columns 2–4 stay EMPTY); row 3 = `damaged2` (1 frame, columns 2–4 stay EMPTY); row 4 = `debris` (4 frames).
- **Pivot / origin:** (0, 0) = top-left; the art fills the whole cell (tile/background).
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** Concrete tile with a glowing hairline crack and exposed rebar; damage stages widen the crack.
- **Palette:** #272c3e #8f9bbd #ffb02e
- **Replaces texture keys:** `tile-cracked`
- **Integration status:** `swap-ready`.

#### 24. `pickup_backtrace_module` — Backtrace Module  [P0]

- **File:** `pickup_backtrace_module.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `pickup_backtrace_module/<anim>_<NN>.png` (see §5).
- **Sheet:** 64×256 px = 1 column(s) × 2 row(s) of 64×128 px cells (4× the world size 16×32).
- **Animations (row order, top to bottom):** full 1f@1fps loop | spent 1f@1fps loop. row 1 = `full` (1 frame); row 2 = `spent` (1 frame).
- **Pivot / origin:** (0.5, 1) = bottom-centre: the soles/base touch the BOTTOM edge of the cell, body centred horizontally.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** A glowing cyan module on a small pedestal; spent version is dark.
- **Palette:** #14102a #3cf2ff #ffffff
- **Replaces texture keys:** `obj-backtrace-module`, `obj-backtrace-module-spent`
- **Integration status:** `swap-ready`.

#### 25. `pickup_integrity_cell` — Integrity Cell  [P1]

- **File:** `pickup_integrity_cell.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `pickup_integrity_cell/<anim>_<NN>.png` (see §5).
- **Sheet:** 48×48 px = 1 column(s) × 1 row(s) of 48×48 px cells (4× the world size 12×12).
- **Animations (row order, top to bottom):** idle 1f@1fps loop. row 1 = `idle` (1 frame).
- **Pivot / origin:** (0.5, 0.5) = cell centre; centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** A small cyan-white energy cell with a heart-like glow.
- **Palette:** #0a2a3a #3cf2ff
- **Replaces texture keys:** `obj-integrity-cell`
- **Integration status:** `swap-ready`.

#### 26. `pickup_glitch_strike` — Glitch Strike Core  [P1]

- **File:** `pickup_glitch_strike.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `pickup_glitch_strike/<anim>_<NN>.png` (see §5).
- **Sheet:** 64×128 px = 1 column(s) × 1 row(s) of 64×128 px cells (4× the world size 16×32).
- **Animations (row order, top to bottom):** idle 1f@1fps loop. row 1 = `idle` (1 frame).
- **Pivot / origin:** (0.5, 0.5) = cell centre; centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** A magenta core with orbiting broken-square glitch shards.
- **Palette:** #2a0a2a #ff3ea5 #ffffff
- **Replaces texture keys:** `obj-glitch-strike`
- **Integration status:** `swap-ready`.

#### 27. `pickup_memory_fragment` — Memory Fragment  [P1]

- **File:** `pickup_memory_fragment.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `pickup_memory_fragment/<anim>_<NN>.png` (see §5).
- **Sheet:** 48×48 px = 1 column(s) × 1 row(s) of 48×48 px cells (4× the world size 12×12).
- **Animations (row order, top to bottom):** idle 1f@1fps loop. row 1 = `idle` (1 frame).
- **Pivot / origin:** (0.5, 0.5) = cell centre; centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** A violet crystalline shard containing a tiny flicker of a memory.
- **Palette:** #14102a #9b59ff #ffffff
- **Replaces texture keys:** `obj-fragment`
- **Integration status:** `swap-ready`.

#### 28. `pickup_scrap` — Scrap Cache  [P1]

- **File:** `pickup_scrap.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `pickup_scrap/<anim>_<NN>.png` (see §5).
- **Sheet:** 96×48 px = 2 column(s) × 1 row(s) of 48×48 px cells (4× the world size 12×12).
- **Animations (row order, top to bottom):** idle 2f@3fps loop. row 1 = `idle` (2 frames).
- **Pivot / origin:** (0.5, 0.5) = cell centre; centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** A handful of bright amber metal scrap and wire, glinting.
- **Palette:** #2a1808 #ffb02e #ffffff
- **Replaces texture keys:** `pickup-scrap`
- **Integration status:** `swap-ready`.


### F. Combat effects

#### 29. `fx_slash_side` — Slash — Side  [P1]

- **File:** `fx_slash_side.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `fx_slash_side/<anim>_<NN>.png` (see §5).
- **Sheet:** 576×112 px = 4 column(s) × 1 row(s) of 144×112 px cells (4× the world size 36×28).
- **Animations (row order, top to bottom):** slash 4f@20fps once. row 1 = `slash` (4 frames).
- **Pivot / origin:** (0.5, 0.5) = cell centre; centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** A bright white-cyan crescent arc with a motion-blur tail, additive blend.
- **Palette:** #ffffff #3cf2ff
- **Replaces texture keys:** `fx-slash-side`, `fx_slash_side__slash_1`, `fx_slash_side__slash_2`, `fx_slash_side__slash_3`
- **Integration status:** `swap-ready`.

#### 30. `fx_slash_up` — Slash — Up  [P1]

- **File:** `fx_slash_up.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `fx_slash_up/<anim>_<NN>.png` (see §5).
- **Sheet:** 448×144 px = 4 column(s) × 1 row(s) of 112×144 px cells (4× the world size 28×36).
- **Animations (row order, top to bottom):** slash 4f@20fps once. row 1 = `slash` (4 frames).
- **Pivot / origin:** (0.5, 0.5) = cell centre; centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** Vertical crescent for upward attacks.
- **Palette:** #ffffff #3cf2ff
- **Replaces texture keys:** `fx-slash-up`, `fx_slash_up__slash_1`, `fx_slash_up__slash_2`, `fx_slash_up__slash_3`
- **Integration status:** `swap-ready`.

#### 31. `fx_slash_down` — Slash — Down  [P1]

- **File:** `fx_slash_down.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `fx_slash_down/<anim>_<NN>.png` (see §5).
- **Sheet:** 448×144 px = 4 column(s) × 1 row(s) of 112×144 px cells (4× the world size 28×36).
- **Animations (row order, top to bottom):** slash 4f@20fps once. row 1 = `slash` (4 frames).
- **Pivot / origin:** (0.5, 0.5) = cell centre; centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** Vertical crescent pointing down with a spark tip.
- **Palette:** #ffffff #ffb02e
- **Replaces texture keys:** `fx-slash-down`, `fx_slash_down__slash_1`, `fx_slash_down__slash_2`, `fx_slash_down__slash_3`
- **Integration status:** `swap-ready`.

#### 32. `fx_hit_spark` — Hit Spark  [P1]

- **File:** `fx_hit_spark.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `fx_hit_spark/<anim>_<NN>.png` (see §5).
- **Sheet:** 480×96 px = 5 column(s) × 1 row(s) of 96×96 px cells (4× the world size 24×24).
- **Animations (row order, top to bottom):** spark 5f@24fps once. row 1 = `spark` (5 frames).
- **Pivot / origin:** (0.5, 0.5) = cell centre; centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** A star-shaped white flash fading to amber embers; 5 frames.
- **Palette:** #ffffff #ffb02e
- **Replaces texture keys:** `fx_hit_spark__spark_0`, `fx_hit_spark__spark_1`, `fx_hit_spark__spark_2`, `fx_hit_spark__spark_3`, `fx_hit_spark__spark_4`
- **Integration status:** `swap-ready`.

#### 33. `fx_enemy_telegraph` — Enemy Telegraph Glint  [P1]

- **File:** `fx_enemy_telegraph.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `fx_enemy_telegraph/<anim>_<NN>.png` (see §5).
- **Sheet:** 192×48 px = 4 column(s) × 1 row(s) of 48×48 px cells (4× the world size 12×12).
- **Animations (row order, top to bottom):** glint 4f@14fps once. row 1 = `glint` (4 frames).
- **Pivot / origin:** (0.5, 0.5) = cell centre; centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** A sharp white four-point star that pulses once before an attack lands.
- **Palette:** #ffffff #ff3b4e
- **Replaces texture keys:** `fx_enemy_telegraph__glint_0`, `fx_enemy_telegraph__glint_1`, `fx_enemy_telegraph__glint_2`, `fx_enemy_telegraph__glint_3`
- **Integration status:** `swap-ready`.

#### 34. `fx_projectile_set` — Projectiles  [P1]

- **File:** `fx_projectile_set.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `fx_projectile_set/<anim>_<NN>.png` (see §5).
- **Sheet:** 192×192 px = 3 column(s) × 3 row(s) of 64×64 px cells (4× the world size 16×16).
- **Animations (row order, top to bottom):** bolt 2f@12fps loop | shockwave 3f@12fps loop | plasma 3f@12fps loop. row 1 = `bolt` (2 frames, columns 3–3 stay EMPTY); row 2 = `shockwave` (3 frames); row 3 = `plasma` (3 frames).
- **Pivot / origin:** (0.5, 0.5) = cell centre; centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** Magenta bolt, amber ground shockwave front, red falling plasma. All glow additively.
- **Palette:** #ff3ea5 #ffb02e #ff3b4e
- **Replaces texture keys:** `proj-bolt`, `proj-shockwave`, `proj-plasma`
- **Integration status:** `swap-ready`. Placeholder reuses each key for every frame of its row.

#### 35. `fx_glitch_strike` — Glitch Strike  [P1]

- **File:** `fx_glitch_strike.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `fx_glitch_strike/<anim>_<NN>.png` (see §5).
- **Sheet:** 1536×160 px = 6 column(s) × 1 row(s) of 256×160 px cells (4× the world size 64×40).
- **Animations (row order, top to bottom):** strike 6f@20fps once. row 1 = `strike` (6 frames).
- **Pivot / origin:** (0.5, 0.5) = cell centre; centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** A broken-square magenta shockwave with RGB split, wider than the slash.
- **Palette:** #ff3ea5 #3cf2ff #ffffff
- **Replaces texture keys:** `fx_glitch_strike__strike_0` … `fx_glitch_strike__strike_5` (dedicated keys)
- **Integration status:** `swap-ready`. Played as a sprite animation when delivered (R8); the code-drawn effect remains the fallback.


### G. Backtrace effects

#### 36. `fx_backtrace_arrival` — Backtrace Arrival Burst  [P0]

- **File:** `fx_backtrace_arrival.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `fx_backtrace_arrival/<anim>_<NN>.png` (see §5).
- **Sheet:** 3072×384 px = 8 column(s) × 1 row(s) of 384×384 px cells (4× the world size 96×96).
- **Animations (row order, top to bottom):** burst 8f@24fps once. row 1 = `burst` (8 frames).
- **Pivot / origin:** (0.5, 0.5) = cell centre; centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** An expanding cyan shockwave ring with glitch slices and time-dial tick marks; white core flash first.
- **Palette:** #3cf2ff #ffffff #ff3ea5
- **Replaces texture keys:** `fx_backtrace_arrival__burst_0`, `fx_backtrace_arrival__burst_1`, `fx_backtrace_arrival__burst_2`, `fx_backtrace_arrival__burst_3`, `fx_backtrace_arrival__burst_4`, `fx_backtrace_arrival__burst_5`, `fx_backtrace_arrival__burst_6`, `fx_backtrace_arrival__burst_7`
- **Integration status:** `swap-ready`.

#### 37. `fx_backtrace_streak` — Backtrace Streak  [P1]

- **File:** `fx_backtrace_streak.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `fx_backtrace_streak/<anim>_<NN>.png` (see §5).
- **Sheet:** 1024×32 px = 4 column(s) × 1 row(s) of 256×32 px cells (4× the world size 64×8).
- **Animations (row order, top to bottom):** streak 4f@20fps once. row 1 = `streak` (4 frames).
- **Pivot / origin:** (0, 0.5) = x=0, y=0.5.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** A horizontal cyan motion streak with trailing glitch squares (the game stretches it between two points).
- **Palette:** #3cf2ff #ffffff
- **Replaces texture keys:** `fx_backtrace_streak__streak_0`, `fx_backtrace_streak__streak_1`, `fx_backtrace_streak__streak_2`, `fx_backtrace_streak__streak_3`
- **Integration status:** `swap-ready`. Drawn as a code line today.

#### 38. `fx_temporal_plate_pulse` — Temporal Plate Pulse  [P1]

- **File:** `fx_temporal_plate_pulse.png` (PNG-32 RGBA, sRGB, non-premultiplied alpha). Loose frames are accepted instead: `fx_temporal_plate_pulse/<anim>_<NN>.png` (see §5).
- **Sheet:** 768×128 px = 6 column(s) × 1 row(s) of 128×128 px cells (4× the world size 32×32).
- **Animations (row order, top to bottom):** pulse 6f@16fps once. row 1 = `pulse` (6 frames).
- **Pivot / origin:** (0.5, 1) = bottom-centre: the soles/base touch the BOTTOM edge of the cell, body centred horizontally.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow or halo larger than the cell.
- **Visual description:** A violet clock-ring that expands from the plate and ticks.
- **Palette:** #9b59ff #ffffff
- **Replaces texture keys:** `fx_temporal_plate_pulse__pulse_0` … `fx_temporal_plate_pulse__pulse_5` (dedicated keys)
- **Integration status:** `swap-ready`. Played as a sprite animation when delivered (R8); the code-drawn effect remains the fallback.



---

## 8. Gemini workflow

**Order:** (1) style anchor: Courier turn-around + one tile + one background, approved by the Producer; (2) Wave 1; (3) Wave 2; (4) Wave 3. Always attach the approved anchor.

**Prompt template:**

> *[paste the Style lock from §4]*  
> Create **[asset name]** for the 2D side-scroller NULL REQUIEM, Rainline Alley. Output: **[one animation frame / a sprite sheet]** of **[cell W×H px]** per cell, **[N] columns × [M] rows**, on a flat pure green `#00FF00` background, no ground shadow, no text. Subject: **[visual description from §7a]**. Pose/animation: **[anim notes]**. The figure faces right, feet on the bottom edge of the cell, centred horizontally. Palette: **[palette]**. Same costume and proportions in every frame. Crisp, readable silhouette at ¼ size.

**When files arrive:** drop them in `art/incoming/` (loose frames or sheets), run `npm run assets:build -- --in art/incoming --out public/assets/final --chroma 00ff00`, read `report.md`, send fixes back to Gemini for rejected assets, commit `public/assets/final/`, run the e2e suite and a phone playtest.

---

## 9. Open questions and risks

1. **Real-device verification is pending.** Sharpness, frame rate and heat at 2×/3×/4× need a Producer test on the phone (Settings → Render quality). The software-renderer benchmark only shows cost scales with pixels.
2. **Gemini fidelity risks [unverified]:** character consistency across frames, exact grids and true transparency. The tool exists to catch these; expect several iterations on the Courier run cycle.
3. **Tileset mask has no inner-corner cells (16-set).** If L-shaped rooms look wrong we extend to a 47-tile blob set (manifest + `autotile.ts` change, no art lost).
4. **Single-frame animations** (`player_courier_attack`, hurt, jump, fall, dash) are limited by the current state machine; extra frames need a manifest + view change first.
5. **Quest title.** The game's first main quest is titled *Dead Man Walking* (not "Desert Man Walking"); its first objective now reads "Speak with the Desert Man in Rainline Alley". Tell me if you want the title changed too.
