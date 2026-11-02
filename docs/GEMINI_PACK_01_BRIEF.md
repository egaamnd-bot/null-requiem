# GEMINI PACK 01 BRIEF — RAINLINE ALLEY (Production Pack 01)

Status: **production-ready brief, nothing replaced yet.** The game stays fully playable with the current placeholders. Written 2026-11-02 after
a code audit of `milestone/full-production` (head `e1453df` + this change). Every number below was read from the repo (`src/assets/manifest*.ts`,
`src/render/*`, `src/main.ts`, `src/config/*`) or measured in a browser; anything that is a decision of mine rather than a fact from the code is
labelled **[decision]**, and anything not verified is labelled **[unverified]**.

> **Naming note.** "Production Pack 01" is the art-production batch for the Rainline Alley region. It draws assets from manifest packs 01, 02, 03,
> 04 and 06 (see `docs/GEMINI_ASSET_SPEC.md`, which stays the by-category catalogue). **All asset IDs below are existing manifest IDs** except one
> new ID, `npc_desert_man`.

---

## 1. Audit result (what is there, what is missing, what is unsuitable)

### 1.1 What exists today

| Area | Reality in the code |
| --- | --- |
| Courier | Procedural 2× canvas drawings, 10 textures (`player-idle0/1`, `run0-3`, `jump`, `fall`, `dash`, `attack`, `hurt`), 48×56 px displayed at scale 0.65 = 31×36 logical px. All 10 are used by `PlayerView`. |
| Scrap Hound | Procedural, **1× (24×16 px)**, 5 textures (`hound-walk0/1`, `windup`, `lunge`, `recover`). |
| Security Drone | Procedural, **1× (20×24 px)**, 3 textures (`drone-idle0/1`, `charge`). |
| Rainline terrain | **No tile art at all.** `RoomView.drawTerrain` paints the whole room into one canvas from the room theme colours. |
| Backgrounds | Generated per room (`far-<roomId>`, `mid-<roomId>`, 960×540 canvas, drawn by `makeBackdrop`). Not driven by the manifest keys. |
| NPCs in Rainline | ZERO (`npc-zero`, 20×28 px, 1×) in `alley`; Null Echo and two terminals in other Rainline rooms. |
| Effects | Slash crescents 36×28 / 28×36, sparks 3×3, motes, rings 64×64 (all tiny or code-drawn); Backtrace echo = the Courier `idle0` texture tinted cyan (not a separate sprite). |

### 1.2 Missing, incomplete or unsuitable (blocking final art)

1. **"Desert Man" does not exist.** A search of `src/`, `docs/` and the manifest finds no such NPC (the only hit is the word "deserters" in a Zero
   dialogue line). I added the **new** ID `npc_desert_man` to the manifest as `spec-only / needs-engine-work`. It is **not placed in any room and has
   no NPC-registry entry**. Delivering the art is safe; making him appear needs a small content hook (registry + dialogue + room placement) which you
   have not asked for. See §9 (question 1).
2. **Backgrounds are not swap-ready, contrary to what the manifest said.** `env_*_bg_far/mid` were marked `swap-ready`, but `RoomView` never reads those keys
   (it builds `far-<roomId>` itself). I corrected the manifest status to `needs-engine-work` and regenerated the docs. Patch **R2** fixes it.
3. **Tileset hook missing** (`env_rainline_tiles`): terrain is drawn by code. Patch **R3**.
4. **Foreground silhouettes and props have no renderer slot.** Patches **R4**, **R5**.
5. **Courier extra animations** (`backtrace`, `airjump`, `interact`, `death`) are not played by `PlayerView`. They can be painted now; they show after patch **R6**.
6. **Size normalisation is incomplete.** Only `PlayerView`, `HoundView`, `DroneView` (scale-normalised in commit "texture scale normalisation") and `AssetSprite`-based views
   keep their world size when a bigger texture replaces a placeholder. Every other legacy view uses a hard-coded scale tied to the placeholder's pixel size
   (examples: `CampaignViews` doors/plates/nodes use `setScale(0.5)`; `EchoView` uses `setScale(0.65)`; `RoomView` relay/module/cell/fragment/cracked-wall use scale 1; slash arcs use scale 1).
   Dropping 4× art into those would render it 2–4× too large. Patch **R1**.
7. **Multi-frame effects only show frame 1.** Slash arcs, hit spark, enemy telegraph, Backtrace arrival and streak have 1 texture key for 4–8 animation frames.
   Frame 1 of each sheet is what the game displays today, so **frame 1 must be the "peak" frame** (specified below). Patch **R8** (optional) plays the rest.
8. **Rendering resolution (blur).** See §3. This is the single biggest quality problem and is independent of the art. Patch **R0**.

### 1.3 Fully replaceable today, with no code change (contract verified by unit-planning, not yet by a real file in a browser **[unverified]**)

`player_courier_idle/run/jump/fall/dash/attack/hurt`, `enemy_scrap_hound`, `enemy_security_drone` (Courier, hound and drone views normalise size by texture ratio).
Everything else needs one of the render-only patches in §7.

---

## 2. Engine facts the art must obey (all from the code)

| Fact | Value | Source |
| --- | --- | --- |
| World tile | **16 × 16 logical px** | `src/config/tuning.ts` `TILE_SIZE` |
| Logical view | **height 270 fixed; width 480–648 (follows device aspect)** | `src/config/view.ts`, `src/core/viewport.ts` |
| Courier cell | 31 × 36 logical px, pivot (0.5, 1), hitbox 10×22 at offset (10.5, 14) | manifest `player_courier_*` |
| Scrap Hound cell | 24 × 16, pivot (0.5, 1), hitbox 18×12 at (3, 4) | `enemy_scrap_hound` |
| Security Drone cell | 20 × 24, pivot (0.5, 0.5), hitbox 14×14 at (3, 5) | `enemy_security_drone` |
| NPC cell | 24 × 32, pivot (0.5, 1), hitbox 12×22 at (6, 10) | `npc_*` |
| Sheet layout | **one ROW per animation in manifest order, frames left→right, all cells equal size; columns = the longest animation** | `src/assets/types.ts` `sheetLayout`, `src/assets/sheet.ts` `planSheet` |
| Accepted resolution | any integer-ish multiple: grid must divide the image, frame aspect within 6% of the manifest's | `planSheet` |
| Loader | `public/assets/final/manifest.json` → `{ "assets": { "<id>": { "file": "<name>.png" } } }`; formats png/webp/jpg; unknown ids and bad sheets are skipped with a console message | `parseFinalManifest`, `BootScene`, `applyFinalAssets` |
| Frame rates | per animation, listed in §6 | manifest `anims` |
| Facing | all sprites drawn **facing right**; the game mirrors with `flipX` | all views |
| Sim rate | fixed 120 Hz simulation, render follows; animation clocks are time-based | `src/core` |
| Colour policy | the game applies tints/alpha in code (hit flash = white fill tint; elite aura; echo = cyan additive tint; far layer alpha 0.78, mid layer alpha 0.62) | `ActorViews`, `RoomView` |

`public/` does not exist yet in the repo; the first delivery creates `public/assets/final/`.

**Hitbox rule.** Collision never reads sprite pixels. The painted figure may exceed the hitbox, but must be **centred horizontally on it and stand on the cell's bottom edge** (pivot y = 1), or the Courier will visibly float/sink on the floor.

---

## 3. Android blur / texture-filtering audit

Measured with Chromium emulating a Pixel-class phone (915×412 CSS px, devicePixelRatio 2.625) on the production build:

| Measurement | Value |
| --- | --- |
| WebGL canvas backing store | **600 × 270** |
| Canvas displayed size (CSS px) | 915 × 412 (= **2402 × 1082 device px**) |
| Effective upscale factor | **≈ 4.0×**, done by the browser compositor with `image-rendering: auto` (bilinear) |
| Phaser config | `pixelArt: false`, `roundPixels: false`, `scale.mode = FIT`, no resolution/zoom option (Phaser 4 has none at game level) |

**Consequences**

1. **The whole game renders at 270 px tall and is stretched ~4× by the browser.** That alone explains the "prototype / soft" look from the playtest. Hand-painted art at 4× will be
   minified into the 270-px framebuffer and then magnified again: the extra detail is **lost**. Final art will not look sharp until patch **R0** (render at K× internally) is done.
2. `pixelArt:false` means linear filtering. That is correct for painted art (nearest-neighbour would look jagged on painted shapes). Do not switch to nearest.
3. Minifying 4× art to 1× without mipmaps shimmers on movement. R0 (rendering at 2–4×) removes the minification; until then expect mild aliasing on the Courier and tiles.
4. Placeholders are mixed resolution: Courier 2×, world objects 2×, but hound/drone/NPC/slash/spark are **1×** (e.g. the drone is 20×24 real pixels). They look blurry on phones by construction. Final art fixes this only after R0.
5. Text is already rendered at `resolution: 2` (fine).
6. Texture size limits: keep every delivered sheet **≤ 4096 px on its longest side** (safe on mobile GPUs). The largest sheet in this pack is 3840×540 (foreground strips at 2×).
7. VRAM estimate **[inferred]**: two 1920×1080 backgrounds ≈ 16.6 MB + foreground 3840×540 ≈ 8.3 MB + the rest < 3 MB — acceptable. The existing 960×540 NPOT `tileSprite` already runs on the tested phone, so NPOT repeat is not a blocker.
8. Edge halos: do not bake white/black fringes. Every sprite needs ≥ 4 px (at 4×) of transparent padding inside its cell on all sides **unless** it is a tile/background. Linear filtering bleeds edge colour.
9. Pivot precision: because linear filtering interpolates, align feet to the cell's last row exactly (no stray semi-transparent rows below the soles).

**Decision [R0].** Deliver all art at **4× master** (cells are 4× the manifest display size). If R0 ships at K=2, the loader/engine downsamples 4→2 at load; no re-paint needed. R0 is an engine task and is **not** part of this art brief, but I recommend it is scheduled **before** the first batch is judged.

---

## 4. Art direction — "Rainline Hand-Painted" (one style for the whole game)

**Name:** Wet-Neon Gouache. Think painted production art for a 2D action game: visible brush-shaping and soft value transitions, not pixel art, not vector-flat, not photoreal 3D render.

**Rules (the style lock — paste this in front of every Gemini prompt)**

- **Medium look:** digital gouache/oil sketch with clean shape design. Confident silhouettes, 3–5 value steps per material, soft painted edges, subtle canvas/brush texture (kept at low contrast so it survives downscaling).
- **Outline:** no uniform black outline. Use a **darker, saturated edge colour** (deep indigo `#1a0d26` or the local shadow hue) 1–2 px at 4× on the shadow side only; lit edges get a rim highlight instead.
- **Lighting (global, never change):** key light from **top-left**, cool pale-violet (`#8f9bbd` highlights). Rim lights: **cyan `#3cf2ff` on the right/back edges, magenta `#ff3ea5` on the left/front edges** (matches the existing placeholder Courier). Wet surfaces carry specular streaks and neon reflections.
- **Atmosphere:** permanent night rain, violet haze, light blooms around neon. Backgrounds are hazier and lower contrast than gameplay layers (atmospheric perspective).
- **Colour:** Rainline palette — void `#05060c`, wet concrete `#272c3e`, steel highlight `#8f9bbd`, signal cyan `#3cf2ff`, deep violet `#1a0d26`. Magenta `#ff3ea5` and sodium orange `#ffb02e` only as small accents. The playfield (tiles, props the player touches) must stay **mid-dark and low-saturation**, so the Courier, enemies, pickups and hazards (the bright neon accents) pop.
- **Readability at phone size:** the world is shown ~4× on a phone; the Courier is 36 logical px tall (~144 device px). Every character must read as a silhouette at 1/4 size. No detail smaller than ~1.5 logical px (6 px at 4×) carries meaning.
- **Consistency:** same palette, same light direction, same brush softness and same outline rule across all assets. A character must look like it was painted on the same day as the tiles.
- **No text/logos/watermarks/signature** in any image. Neon signs use abstract glyph shapes, not readable words (no copyrighted marks, no real brands).
- **Originality:** all designs original; do not imitate an existing game, film, anime, comic or franchise character, prop or poster.
- **Forbidden:** pixel-art stair-stepping, 3D/CGI plastic look, photo textures, lens flare spam, blur-filled sprites (sprites must be crisp), semi-transparent halos wider than the cell.

**Character design anchors (Rainline)**

- **Courier** (`player_courier_*`): lean runner, long dark rain-coat with a high collar, grey satchel across the chest, glowing cyan spinal implant at the neck, silver hair and a magenta scarf (current in-game placeholder; keep these identifying features), a short cyan mono-blade (rail blade) for the attack. Faces right. Same face/outfit in every frame.
- **Scrap Hound** (`enemy_scrap_hound`): hunched scrap-metal quadruped of piping and a cracked dog skull, one red sensor eye, rust-orange and bruise-purple plates. Silhouette = long low wedge; visibly crouched on `windup`.
- **Security Drone** (`enemy_security_drone`): palm-sized spherical drone, one wide **magenta** optic, two stubby stabiliser fins, rear thruster plume; gunmetal shell with scratched Precinct stencil. `charge` frame: core glows white-hot.
- **Desert Man** (`npc_desert_man`): see the asset entry; warm sand/amber against the cold alley, so he reads instantly as "from elsewhere".

---

## 5. Production, export and intake rules

1. **Master scale 4×.** Cell size = manifest display size × 4 (table in §6). Backgrounds 1920×1080; foreground strips 2× (cell 960×540) to stay under 4096 px.
2. **Format:** PNG-32 (8-bit RGBA, sRGB, non-premultiplied alpha). Lossless only (no JPEG, no WebP for pack 01). One file per asset ID: `<asset_id>.png`.
3. **Transparency:** real alpha channel for everything except `env_rainline_bg_far` (opaque). No baked drop shadows on the ground, no checkerboard "fake transparency", no coloured background left in.
4. **Sheet layout:** exactly as §6 — one row per animation in the order listed, frames left→right, equal cells, no gutters, no margins, no labels or grid lines drawn into the image.
5. **Pivot:** encoded by the cell, not metadata: bottom-centre (0.5, 1) means soles on the last pixel row, body centred on the cell's vertical centre-line; centre (0.5, 0.5) means centre of mass in the cell centre; top-left (0, 0) means the art fills the whole cell.
6. **Frame consistency:** the character's **feet/base position and scale must not drift between frames** of one animation (jitter shows as a vibrating sprite). The same head size, the same costume.
7. **Looping:** animations marked `loop` must loop seamlessly (last frame flows into the first). `once` animations end on a held pose.
8. **Colour:** sRGB, no embedded ICC profile needed; do not apply a global vignette or colour grade to individual sprites.
9. **File names:** lowercase, exactly the asset ID. No version suffixes (versions go in folders: `v1/`, `v2/`).
10. **Intake workaround for Gemini [decision]:** image generators rarely produce exact grids or true alpha **[unverified for the current Gemini model]**. So accept **either**
    (a) a finished sheet exactly as specified, **or** (b) loose frames named `<asset_id>/<anim>_<NN>.png` (NN = 01…) painted on a flat `#00FF00` chroma-green background, one frame per image. We then assemble and key them into the exact sheet with a script (not yet written; offered in §8) so the grid is pixel-perfect.
11. **Acceptance checks** (done by us before integration): file name = ID; image size divisible by the grid; cell ratio within 1% of §6; alpha present; edge rows empty; feet on the bottom row (pivot (0.5,1)); loop continuity eyeballed; palette within the style lock.
12. **Do not rename IDs, reorder animations or change frame counts.** Extra frames require a manifest change on our side first.

---

## 6. Asset index (all IDs are in `src/assets/manifest*.ts`; the sheet maths is generated from the manifest)

Waves: **Wave 1 (do first, visible as soon as hooks exist)** = Courier P0 frames, hound, drone, tileset, far/mid backgrounds, slash/spark, Backtrace arrival. **Wave 2** = remaining Courier, props, objects, foreground, remaining FX. **Wave 3** = Desert Man + `needs-engine-work` extras.

| # | Asset ID | File | Frames (anims) | Cell px | Sheet px | Scale | Pivot | Status today |
| ---: | --- | --- | --- | --- | --- | :-: | --- | --- |
| 1 | `player_courier_idle` | `player_courier_idle.png` | 2 frames in 1 anim(s) | 124×144 | 248×144 | 4× | (0.5, 1) | swap-ready; procedural-legacy; keys 2/2 |
| 2 | `player_courier_run` | `player_courier_run.png` | 4 frames in 1 anim(s) | 124×144 | 496×144 | 4× | (0.5, 1) | swap-ready; procedural-legacy; keys 4/4 |
| 3 | `player_courier_jump` | `player_courier_jump.png` | 1 frames in 1 anim(s) | 124×144 | 124×144 | 4× | (0.5, 1) | swap-ready; procedural-legacy; keys 1/1 |
| 4 | `player_courier_fall` | `player_courier_fall.png` | 1 frames in 1 anim(s) | 124×144 | 124×144 | 4× | (0.5, 1) | swap-ready; procedural-legacy; keys 1/1 |
| 5 | `player_courier_dash` | `player_courier_dash.png` | 1 frames in 1 anim(s) | 124×144 | 124×144 | 4× | (0.5, 1) | swap-ready; procedural-legacy; keys 1/1 |
| 6 | `player_courier_attack` | `player_courier_attack.png` | 1 frames in 1 anim(s) | 124×144 | 124×144 | 4× | (0.5, 1) | swap-ready; procedural-legacy; keys 1/1 |
| 7 | `player_courier_hurt` | `player_courier_hurt.png` | 1 frames in 1 anim(s) | 124×144 | 124×144 | 4× | (0.5, 1) | swap-ready; procedural-legacy; keys 1/1 |
| 8 | `player_courier_backtrace` | `player_courier_backtrace.png` | 6 frames in 1 anim(s) | 124×144 | 744×144 | 4× | (0.5, 1) | needs-engine-work; spec-only; keys 0/6 |
| 9 | `player_courier_airjump` | `player_courier_airjump.png` | 3 frames in 1 anim(s) | 124×144 | 372×144 | 4× | (0.5, 1) | needs-engine-work; spec-only; keys 0/3 |
| 10 | `player_courier_interact` | `player_courier_interact.png` | 3 frames in 1 anim(s) | 124×144 | 372×144 | 4× | (0.5, 1) | needs-engine-work; spec-only; keys 0/3 |
| 11 | `player_courier_death` | `player_courier_death.png` | 6 frames in 1 anim(s) | 124×144 | 744×144 | 4× | (0.5, 1) | needs-engine-work; spec-only; keys 0/6 |
| 12 | `enemy_scrap_hound` | `enemy_scrap_hound.png` | 5 frames in 4 anim(s) | 96×64 | 192×256 | 4× | (0.5, 1) | swap-ready; procedural-legacy; keys 5/5 |
| 13 | `enemy_security_drone` | `enemy_security_drone.png` | 3 frames in 2 anim(s) | 80×96 | 160×192 | 4× | (0.5, 0.5) | swap-ready; procedural-legacy; keys 3/3 |
| 14 | `npc_desert_man` | `npc_desert_man.png` | 6 frames in 2 anim(s) | 96×128 | 384×256 | 4× | (0.5, 1) | needs-engine-work; spec-only; keys 0/6 |
| 15 | `env_rainline_tiles` | `env_rainline_tiles.png` | 31 frames in 4 anim(s) | 64×64 | 1024×256 | 4× | (0, 0) | needs-engine-work; code-drawn; keys 31/31 |
| 16 | `env_rainline_bg_far` | `env_rainline_bg_far.png` | 1 frames in 1 anim(s) | 1920×1080 | 1920×1080 | 4× | (0, 0) | needs-engine-work; code-drawn; keys 1/1 |
| 17 | `env_rainline_bg_mid` | `env_rainline_bg_mid.png` | 1 frames in 1 anim(s) | 1920×1080 | 1920×1080 | 4× | (0, 0) | needs-engine-work; code-drawn; keys 1/1 |
| 18 | `env_rainline_fg_silhouette` | `env_rainline_fg_silhouette.png` | 4 frames in 1 anim(s) | 960×540 | 3840×540 | 2× | (0, 0) | needs-engine-work; spec-only; keys 4/4 |
| 19 | `env_rainline_props` | `env_rainline_props.png` | 8 frames in 1 anim(s) | 192×192 | 1536×192 | 4× | (0.5, 1) | needs-engine-work; spec-only; keys 8/8 |
| 20 | `obj_sync_relay` | `obj_sync_relay.png` | 3 frames in 2 anim(s) | 80×128 | 160×256 | 4× | (0.5, 1) | swap-ready; procedural-legacy; keys 3/3 |
| 21 | `obj_security_door` | `obj_security_door.png` | 5 frames in 2 anim(s) | 64×64 | 256×128 | 4× | (0, 0) | swap-ready; procedural; keys 5/5 |
| 22 | `obj_pressure_plate` | `obj_pressure_plate.png` | 4 frames in 4 anim(s) | 64×24 | 64×96 | 4× | (0, 1) | swap-ready; procedural; keys 4/4 |
| 23 | `obj_breakable_wall` | `obj_breakable_wall.png` | 7 frames in 4 anim(s) | 64×64 | 256×256 | 4× | (0, 0) | swap-ready; procedural-legacy; keys 7/7 |
| 24 | `pickup_backtrace_module` | `pickup_backtrace_module.png` | 2 frames in 2 anim(s) | 64×128 | 64×256 | 4× | (0.5, 1) | swap-ready; procedural-legacy; keys 2/2 |
| 25 | `pickup_integrity_cell` | `pickup_integrity_cell.png` | 1 frames in 1 anim(s) | 48×48 | 48×48 | 4× | (0.5, 0.5) | swap-ready; procedural-legacy; keys 1/1 |
| 26 | `pickup_glitch_strike` | `pickup_glitch_strike.png` | 1 frames in 1 anim(s) | 64×128 | 64×128 | 4× | (0.5, 0.5) | swap-ready; procedural-legacy; keys 1/1 |
| 27 | `pickup_memory_fragment` | `pickup_memory_fragment.png` | 1 frames in 1 anim(s) | 48×48 | 48×48 | 4× | (0.5, 0.5) | swap-ready; procedural-legacy; keys 1/1 |
| 28 | `pickup_scrap` | `pickup_scrap.png` | 2 frames in 1 anim(s) | 48×48 | 96×48 | 4× | (0.5, 0.5) | swap-ready; code-drawn; keys 1/2 |
| 29 | `fx_slash_side` | `fx_slash_side.png` | 4 frames in 1 anim(s) | 160×112 | 640×112 | 4× | (0.5, 0.5) | swap-ready; code-drawn; keys 1/4 |
| 30 | `fx_slash_up` | `fx_slash_up.png` | 4 frames in 1 anim(s) | 112×160 | 448×160 | 4× | (0.5, 0.5) | swap-ready; code-drawn; keys 1/4 |
| 31 | `fx_slash_down` | `fx_slash_down.png` | 4 frames in 1 anim(s) | 112×160 | 448×160 | 4× | (0.5, 0.5) | swap-ready; code-drawn; keys 1/4 |
| 32 | `fx_hit_spark` | `fx_hit_spark.png` | 5 frames in 1 anim(s) | 96×96 | 480×96 | 4× | (0.5, 0.5) | swap-ready; code-drawn; keys 1/5 |
| 33 | `fx_enemy_telegraph` | `fx_enemy_telegraph.png` | 4 frames in 1 anim(s) | 48×48 | 192×48 | 4× | (0.5, 0.5) | swap-ready; code-drawn; keys 1/4 |
| 34 | `fx_projectile_set` | `fx_projectile_set.png` | 8 frames in 3 anim(s) | 64×64 | 192×192 | 4× | (0.5, 0.5) | swap-ready; code-drawn; keys 8/8 |
| 35 | `fx_glitch_strike` | `fx_glitch_strike.png` | 6 frames in 1 anim(s) | 256×160 | 1536×160 | 4× | (0.5, 0.5) | placeholder; code-drawn; keys 0/6 |
| 36 | `fx_backtrace_arrival` | `fx_backtrace_arrival.png` | 8 frames in 1 anim(s) | 384×384 | 3072×384 | 4× | (0.5, 0.5) | swap-ready; code-drawn; keys 1/8 |
| 37 | `fx_backtrace_streak` | `fx_backtrace_streak.png` | 4 frames in 1 anim(s) | 256×32 | 1024×32 | 4× | (0, 0.5) | swap-ready; code-drawn; keys 1/4 |
| 38 | `fx_temporal_plate_pulse` | `fx_temporal_plate_pulse.png` | 6 frames in 1 anim(s) | 128×128 | 768×128 | 4× | (0.5, 1) | placeholder; code-drawn; keys 0/6 |


*Scale column: 4× master except the foreground strips (2×). "keys a/b" = texture keys the engine can already replace vs total frames; fewer keys than frames means only the first frames are displayed until patch R8.*

**Pack totals:** 38 files (11 Courier + 2 enemy + 1 NPC + 5 environment + 9 object/pickup + 7 combat FX + 3 Backtrace FX) — and 2 further Backtrace items are intentionally **not** requested: `fx_backtrace_echo` (the engine tints the Courier sprite; no art needed) and `fx_null_void` (Null Cathedral).

---

## 7. Integration plan (render-layer only; `src/core` gameplay is not touched)

**Principle.** Gameplay never reads sprites. Art is delivered as files in `public/assets/final/` and registered in `public/assets/final/manifest.json`. At boot `BootScene` loads the manifest, slices each sheet with `planSheet`, and replaces the placeholder textures **under the same texture keys**. If a file is missing or invalid the placeholder stays, so the game is always playable.

Delivery example:

```json
{ "version": 1, "assets": {
  "player_courier_run": { "file": "player_courier_run.png" },
  "enemy_scrap_hound":  { "file": "enemy_scrap_hound.png" }
} }
```

**Readiness matrix**

| Asset group | Works on drop-in today? | Needs |
| --- | --- | --- |
| Courier idle/run/jump/fall/dash/attack/hurt | **Yes** (PlayerView normalises size) | nothing (looks sharp only after R0) |
| Scrap Hound, Security Drone | **Yes** (HoundView/DroneView normalise) | nothing |
| Courier backtrace/airjump/interact/death | No | R6 |
| Rainline tileset | No | R3 |
| bg_far / bg_mid | No | R2 |
| fg_silhouette, props | No | R4, R5 |
| relay, module, cell, fragment, cracked wall, door, plate, scrap, doors | Only if size-normalised | R1 |
| Slash, spark, telegraph, arrival, streak, projectiles | Only if size-normalised | R1 (+ R8 for animation) |
| Desert Man | No | R7 (content decision) |
| Sharpness of everything | — | **R0** |

**Patches (all render-only; each has a fallback to the placeholder; placeholders render identically before/after because the normalising factor is 1.0 for them)**

| ID | Change | Files | Test |
| --- | --- | --- | --- |
| R0 | Render at K× internally (K = 2, up to 4 on strong devices) so 4× art is not minified then magnified. Needs a spike (Phaser 4 has no game-level `resolution`; options: larger game size + camera zoom K, or a render-texture pass). Measure with the canvas probe in §3 and an on-device FPS check. | `src/main.ts`, `src/render/viewportDom.ts`, camera setup in scenes | probe: canvas.width ≈ CSS width × dpr×(K/…); e2e unchanged; **device FPS [unverified]** |
| R1 | Size normalisation: multiply every hard-coded view scale by `texScale(scene, key)` (already exists in `assetRuntime.ts`). Sites: `EchoView` (0.65), legacy `NpcView` (zero/mira/terminal), slash arcs, `RoomView` relay/module/cell/fragment/cracked wall/boss gate, `CampaignViews` doors/plates/platforms/nodes/emitters (0.5), `Fx` rings/sparks/motes. | `src/render/*.ts` | unit test: factor = 1.0 for all current placeholder keys; Playwright screenshot equality of the title/first room before and after |
| R2 | Backgrounds: in `RoomView`, if `env-<region>-bg-far/mid` texture exists use it, else the generated one; `tileScale = displayWidth(480)/textureWidth` (today it is hard-coded 0.5 for the 960-px placeholder; 1920-px art needs 0.25). Opacity stays code-driven (0.78 / 0.62). | `src/render/RoomView.ts` | existing room tests + new texture-key test |
| R3 | Tileset: `RoomView.drawTerrain` samples `env_rainline_tiles` when present. Contract below. | `src/render/RoomView.ts` | visual diff + a unit test of the neighbour-mask function |
| R4 | Foreground silhouettes: new depth layer above the playfield, parallax 1.15×, top/bottom bands only. | `RoomView.ts`, `DEPTH` | screenshot |
| R5 | Props: optional `props` list in room data (pure decoration, non-colliding). Data-only change per room; no collision. | `src/world/types.ts`, rooms, `RoomView.ts` | campaign tests untouched |
| R6 | Courier state→animation mapping for backtrace arrival, air jump, interact, death in `PlayerView` (reads existing events/state; no sim change). | `ActorViews.ts` | unit test of the pure mapping function |
| R7 | Desert Man: NPC registry entry + dialogue graph + room placement. **Content, needs Producer text and placement.** | `src/world/npcs.ts`, `dialogues.ts`, a room | `campaign.test.ts` (new dialogue/NPC validity) |
| R8 | Multi-frame FX playback (slash, spark, telegraph, arrival, streak). | `Fx.ts`, `ActorViews.ts` | pure frame-timing test (`frameAt` already exists) |

**Tileset contract for R3 (`env_rainline_tiles`, 1024×256 at 4×: 16 columns × 4 rows of 64×64 cells)** **[decision]**

- Row 1 `solid` — **16 auto-tile cells**, index `i = N·1 + E·2 + S·4 + W·8`, where N/E/S/W = 1 when the neighbouring tile in that direction is **solid**.
  So cell 0 = isolated block, cell 15 = fully enclosed fill, cell 7 (N+E+S) = a block open to the west (left wall face), cell 14 (E+S+W) = a block open to the north (**top surface with the lip highlight**), etc.
  Edges that face open air get the wet steel lip and the rim light; fully enclosed cells (15) are the dark interior fill. There are no dedicated inner-corner cells (16-set limitation); the `details` row compensates.
- Row 2 `catwalk` — 3 cells used (left cap, middle, right cap), one-way platform, about the top 8 logical px (32 px at 4×) of the cell is the grating; the lower part of the cell is transparent.
- Row 3 `hazard` — 4 frames @ 6 fps loop, the live-current strip (animated cyan arcs), bottom-aligned in the cell.
- Row 4 `details` — 8 cells of wall decals (panels, rivets, stains, pipe stubs), transparent background, placed over enclosed tiles by a seeded hash.
- Every solid cell must tile seamlessly with itself and with every neighbour variant (matching edge colours at the cell borders); no seams at 4×.
- Because the tileset also drives readability: tops of platforms must be the **brightest, most contrasting** surface in the tileset.

---

## 7a. Asset specifications (one entry per file)

All entries below are generated from the manifest, so they cannot drift from the code. Where an entry says "keys a/b" in the index, only those frames are displayed today.

**Special instructions per group**

- **A — Courier.** Same outfit, hairstyle, scarf and implant in every frame. Feet on the bottom edge; body centred on the 10-px hitbox centre-line. Run cycle = 4 distinct contact/passing poses at 10 fps loop; idle = 2-frame breathing loop (coat/scarf sway) at 2.2 fps; `attack` is **one** frame today (the rail-blade extended in the strike pose, the slash arc is a separate effect); `jump` rising pose, `fall` falling pose; `dash` stretched horizontally; `hurt` recoil pose. `backtrace` (6 f): the Courier re-forming at the echo point (cyan glitch shards coalescing); `airjump` (3 f): coil flare at the boots; `interact` (3 f): reaching toward a terminal; `death` (6 f): signal loss, flicker then fall (held last frame).
- **B — Enemies.** Hound: walk (2 f loop) alternates leg planes; `windup` = crouched, head low, eye flaring; `lunge` = stretched airborne; `recover` = skid. Drone: `idle` 2-frame hover bob; `charge` = optic white-hot (also serves as the telegraph frame).
- **C — Desert Man.** Idle 4 f @ 3 fps loop: calm breathing, cloth sway, occasional head tilt. Talk 2 f @ 5 fps loop: small hand gesture. Sand/amber robe against a dark rain-slicker; the amber visor catches the neon cyan. **Reads as friendly/neutral, not a threat.**
- **D — Environment.** Alley mood: purple-black sky, wet concrete, cyan signage reflections, rusted fire escapes. `bg_far`: opaque, hazy distant skyline with violet-magenta glow and rain streaks, **seamless left–right**, no strong focal point. `bg_mid`: closer buildings, fire escapes, overpass pillars and signs; **transparent above the structures** so the far layer shows through; seamless left–right; slightly more contrast. `fg_silhouette`: four interchangeable near-black strips (pipes, cables, railings, hanging laundry-less ironwork) with a faint cyan/magenta rim; art only in the top 25% or bottom 25% of each 960×540 cell; never in the middle band where the Courier plays. `props`: 8 standalone 48×48 (192×192 at 4×) props on transparent ground: dumpster, fire-escape section, neon sign box (abstract glyphs), rain pipe cluster, crate stack, flickering street lamp, puddle reflection patch, vent/AC unit — each on the bottom-centre pivot.
- **E — Objects/pickups.** Strong, readable shapes with a clear glow colour (relay cyan; cell cyan-white; fragment violet; glitch core magenta; scrap amber; module cyan on pedestal). Interactive things must be **brighter and more saturated than the surrounding environment**. Plate pair: Courier plate glows cyan when pressed, **ECHO plate is translucent violet with a faint clock-face ring**.
- **F — Combat FX.** **Frame 1 of every multi-frame effect is the PEAK frame** (the one used today); frames 2–4 fade/disperse. Slash arcs: bright cyan-white crescent with a magenta trailing edge, painted fully opaque on transparent; the game blends it additively. `fx_projectile_set`: sheet is 3 columns × 3 rows: row 1 `bolt` (2 f), row 2 `shockwave` (3 f), row 3 `plasma` (3 f).
- **G — Backtrace FX.** Arrival burst (96×96): cyan-white ring with data shards, frame 1 = widest bright ring (used today), frames 2–8 shrink and fade. Streak (64×8): horizontal cyan data smear, origin at the left-centre (pivot 0, 0.5). The echo itself needs no art (the engine tints the Courier sprite). Plate pulse (32×32, pivot (0.5, 1)): violet clock-ring pulse rising from the plate.


### A. Courier (player)

#### 1. `player_courier_idle` — Courier — Idle  [P0]

- **File:** `player_courier_idle.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/player_courier_idle.png`
- **Sheet:** 248×144 px = 2 column(s) × 1 row(s) of 124×144 px cells (4× the in-game size 31×36).
- **Animations (row order, top to bottom):** idle 2f@2.2fps loop. row 1 = `idle` (2 used of 2 columns).
- **Pivot / origin:** (0.5, 1) of the cell = bottom-centre: the soles/base touch the BOTTOM edge of the cell, horizontally centred.
- **Collision (gameplay, do not change):** 10×22 logical px at offset (10.5, 14) inside the 31×36 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Textures it replaces:** `player-idle0`, `player-idle1`
- **Status in the repo today:** `swap-ready`, placeholder `procedural-legacy`.

#### 2. `player_courier_run` — Courier — Run  [P0]

- **File:** `player_courier_run.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/player_courier_run.png`
- **Sheet:** 496×144 px = 4 column(s) × 1 row(s) of 124×144 px cells (4× the in-game size 31×36).
- **Animations (row order, top to bottom):** run 4f@10fps loop. row 1 = `run` (4 used of 4 columns).
- **Pivot / origin:** (0.5, 1) of the cell = bottom-centre: the soles/base touch the BOTTOM edge of the cell, horizontally centred.
- **Collision (gameplay, do not change):** 10×22 logical px at offset (10.5, 14) inside the 31×36 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Textures it replaces:** `player-run0`, `player-run1`, `player-run2`, `player-run3`
- **Status in the repo today:** `swap-ready`, placeholder `procedural-legacy`.

#### 3. `player_courier_jump` — Courier — Jump  [P0]

- **File:** `player_courier_jump.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/player_courier_jump.png`
- **Sheet:** 124×144 px = 1 column(s) × 1 row(s) of 124×144 px cells (4× the in-game size 31×36).
- **Animations (row order, top to bottom):** jump 1f@1fps once. row 1 = `jump` (1 used of 1 columns).
- **Pivot / origin:** (0.5, 1) of the cell = bottom-centre: the soles/base touch the BOTTOM edge of the cell, horizontally centred.
- **Collision (gameplay, do not change):** 10×22 logical px at offset (10.5, 14) inside the 31×36 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Textures it replaces:** `player-jump`
- **Status in the repo today:** `swap-ready`, placeholder `procedural-legacy`.

#### 4. `player_courier_fall` — Courier — Fall  [P0]

- **File:** `player_courier_fall.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/player_courier_fall.png`
- **Sheet:** 124×144 px = 1 column(s) × 1 row(s) of 124×144 px cells (4× the in-game size 31×36).
- **Animations (row order, top to bottom):** fall 1f@1fps once. row 1 = `fall` (1 used of 1 columns).
- **Pivot / origin:** (0.5, 1) of the cell = bottom-centre: the soles/base touch the BOTTOM edge of the cell, horizontally centred.
- **Collision (gameplay, do not change):** 10×22 logical px at offset (10.5, 14) inside the 31×36 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Textures it replaces:** `player-fall`
- **Status in the repo today:** `swap-ready`, placeholder `procedural-legacy`.

#### 5. `player_courier_dash` — Courier — Dash  [P0]

- **File:** `player_courier_dash.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/player_courier_dash.png`
- **Sheet:** 124×144 px = 1 column(s) × 1 row(s) of 124×144 px cells (4× the in-game size 31×36).
- **Animations (row order, top to bottom):** dash 1f@1fps once. row 1 = `dash` (1 used of 1 columns).
- **Pivot / origin:** (0.5, 1) of the cell = bottom-centre: the soles/base touch the BOTTOM edge of the cell, horizontally centred.
- **Collision (gameplay, do not change):** 10×22 logical px at offset (10.5, 14) inside the 31×36 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Textures it replaces:** `player-dash`
- **Status in the repo today:** `swap-ready`, placeholder `procedural-legacy`.

#### 6. `player_courier_attack` — Courier — Attack  [P0]

- **File:** `player_courier_attack.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/player_courier_attack.png`
- **Sheet:** 124×144 px = 1 column(s) × 1 row(s) of 124×144 px cells (4× the in-game size 31×36).
- **Animations (row order, top to bottom):** attack 1f@16fps once. row 1 = `attack` (1 used of 1 columns).
- **Pivot / origin:** (0.5, 1) of the cell = bottom-centre: the soles/base touch the BOTTOM edge of the cell, horizontally centred.
- **Collision (gameplay, do not change):** 10×22 logical px at offset (10.5, 14) inside the 31×36 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Textures it replaces:** `player-attack`
- **Status in the repo today:** `swap-ready`, placeholder `procedural-legacy`. Note: The view shows this frame for the whole active window; extra frames are driven once the final sheet arrives.

#### 7. `player_courier_hurt` — Courier — Hurt  [P0]

- **File:** `player_courier_hurt.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/player_courier_hurt.png`
- **Sheet:** 124×144 px = 1 column(s) × 1 row(s) of 124×144 px cells (4× the in-game size 31×36).
- **Animations (row order, top to bottom):** hurt 1f@1fps once. row 1 = `hurt` (1 used of 1 columns).
- **Pivot / origin:** (0.5, 1) of the cell = bottom-centre: the soles/base touch the BOTTOM edge of the cell, horizontally centred.
- **Collision (gameplay, do not change):** 10×22 logical px at offset (10.5, 14) inside the 31×36 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Textures it replaces:** `player-hurt`
- **Status in the repo today:** `swap-ready`, placeholder `procedural-legacy`.

#### 8. `player_courier_backtrace` — Courier — Backtrace Arrival  [P0]

- **File:** `player_courier_backtrace.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/player_courier_backtrace.png`
- **Sheet:** 744×144 px = 6 column(s) × 1 row(s) of 124×144 px cells (4× the in-game size 31×36).
- **Animations (row order, top to bottom):** backtrace 6f@16fps once. row 1 = `backtrace` (6 used of 6 columns; Dissolve in from cyan glitch shards).
- **Pivot / origin:** (0.5, 1) of the cell = bottom-centre: the soles/base touch the BOTTOM edge of the cell, horizontally centred.
- **Collision (gameplay, do not change):** 10×22 logical px at offset (10.5, 14) inside the 31×36 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Textures it replaces:** (none yet — see integration status)
- **Status in the repo today:** `needs-engine-work`, placeholder `spec-only`. Note: Not yet played by the player view (the arrival uses fx_backtrace_arrival).

#### 9. `player_courier_airjump` — Courier — Kinetic Coil Air Jump  [P0]

- **File:** `player_courier_airjump.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/player_courier_airjump.png`
- **Sheet:** 372×144 px = 3 column(s) × 1 row(s) of 124×144 px cells (4× the in-game size 31×36).
- **Animations (row order, top to bottom):** airjump 3f@14fps once. row 1 = `airjump` (3 used of 3 columns).
- **Pivot / origin:** (0.5, 1) of the cell = bottom-centre: the soles/base touch the BOTTOM edge of the cell, horizontally centred.
- **Collision (gameplay, do not change):** 10×22 logical px at offset (10.5, 14) inside the 31×36 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Textures it replaces:** (none yet — see integration status)
- **Status in the repo today:** `needs-engine-work`, placeholder `spec-only`.

#### 10. `player_courier_interact` — Courier — Interact  [P0]

- **File:** `player_courier_interact.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/player_courier_interact.png`
- **Sheet:** 372×144 px = 3 column(s) × 1 row(s) of 124×144 px cells (4× the in-game size 31×36).
- **Animations (row order, top to bottom):** interact 3f@8fps once. row 1 = `interact` (3 used of 3 columns).
- **Pivot / origin:** (0.5, 1) of the cell = bottom-centre: the soles/base touch the BOTTOM edge of the cell, horizontally centred.
- **Collision (gameplay, do not change):** 10×22 logical px at offset (10.5, 14) inside the 31×36 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Textures it replaces:** (none yet — see integration status)
- **Status in the repo today:** `needs-engine-work`, placeholder `spec-only`.

#### 11. `player_courier_death` — Courier — Death  [P0]

- **File:** `player_courier_death.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/player_courier_death.png`
- **Sheet:** 744×144 px = 6 column(s) × 1 row(s) of 124×144 px cells (4× the in-game size 31×36).
- **Animations (row order, top to bottom):** death 6f@10fps once. row 1 = `death` (6 used of 6 columns).
- **Pivot / origin:** (0.5, 1) of the cell = bottom-centre: the soles/base touch the BOTTOM edge of the cell, horizontally centred.
- **Collision (gameplay, do not change):** 10×22 logical px at offset (10.5, 14) inside the 31×36 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Textures it replaces:** (none yet — see integration status)
- **Status in the repo today:** `needs-engine-work`, placeholder `spec-only`.


### B. Enemies

#### 12. `enemy_scrap_hound` — Scrap Hound  [P0]

- **File:** `enemy_scrap_hound.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/enemy_scrap_hound.png`
- **Sheet:** 192×256 px = 2 column(s) × 4 row(s) of 96×64 px cells (4× the in-game size 24×16).
- **Animations (row order, top to bottom):** walk 2f@5fps loop | windup 1f@1fps once | lunge 1f@1fps once | recover 1f@1fps once. row 1 = `walk` (2 used of 2 columns); row 2 = `windup` (1 used of 2 columns); row 3 = `lunge` (1 used of 2 columns); row 4 = `recover` (1 used of 2 columns).
- **Pivot / origin:** (0.5, 1) of the cell = bottom-centre: the soles/base touch the BOTTOM edge of the cell, horizontally centred.
- **Collision (gameplay, do not change):** 18×12 logical px at offset (3, 4) inside the 24×16 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** A hunched scrap-metal quadruped built from piping and a cracked dog skull, one red sensor eye, rust-orange and bruise-purple plates. The wind-up pose crouches visibly low.
- **Palette:** #2a1a1a #8a4a2a #ff3b4e #c9a46a
- **Variations:** Elite: glowing red joints
- **Textures it replaces:** `hound-walk0`, `hound-walk1`, `hound-windup`, `hound-lunge`, `hound-recover`
- **Status in the repo today:** `swap-ready`, placeholder `procedural-legacy`.

#### 13. `enemy_security_drone` — Security Drone  [P0]

- **File:** `enemy_security_drone.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/enemy_security_drone.png`
- **Sheet:** 160×192 px = 2 column(s) × 2 row(s) of 80×96 px cells (4× the in-game size 20×24).
- **Animations (row order, top to bottom):** idle 2f@3fps loop | charge 1f@1fps once. row 1 = `idle` (2 used of 2 columns); row 2 = `charge` (1 used of 2 columns; Core glows white-hot while winding up a shot.).
- **Pivot / origin:** (0.5, 0.5) of the cell = cell centre; keep the visual centre of mass on the cell centre.
- **Collision (gameplay, do not change):** 14×14 logical px at offset (3, 5) inside the 20×24 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** A palm-sized spherical drone with a single wide magenta optic, two stubby stabiliser fins and a rear thruster plume. Matte gunmetal shell with scratched Precinct stencil; the optic must read from far away.
- **Palette:** #1a1a28 #6a6a88 #ff3ea5 #ffb02e
- **Variations:** Elite: red optic, extra side pods
- **Textures it replaces:** `drone-idle0`, `drone-idle1`, `drone-charge`
- **Status in the repo today:** `swap-ready`, placeholder `procedural-legacy`.


### C. NPC

#### 14. `npc_desert_man` — Desert Man (Rainline Wanderer)  [P0]

- **File:** `npc_desert_man.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/npc_desert_man.png`
- **Sheet:** 384×256 px = 4 column(s) × 2 row(s) of 96×128 px cells (4× the in-game size 24×32).
- **Animations (row order, top to bottom):** idle 4f@3fps loop | talk 2f@5fps loop. row 1 = `idle` (4 used of 4 columns); row 2 = `talk` (2 used of 4 columns).
- **Pivot / origin:** (0.5, 1) of the cell = bottom-centre: the soles/base touch the BOTTOM edge of the cell, horizontally centred.
- **Collision (gameplay, do not change):** 12×22 logical px at offset (6, 10) inside the 24×32 cell. The painted figure may be larger than the hitbox but must be centred on it.
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** A weathered wanderer from beyond the city walls in a sun-bleached sand-coloured robe and layered wraps over a dark rain-slicker, wide travel hood, a cracked amber visor pushed up on the forehead, a canteen and rolled blanket on the back. Out of place in the rain: dry-coloured, calm, unhurried.
- **Palette:** #2a2014 #c9a46a #ffb02e #3cf2ff
- **Textures it replaces:** (none yet — see integration status)
- **Status in the repo today:** `needs-engine-work`, placeholder `spec-only`. Note: NEW id (Production Pack 01). Not placed in any room and has no NPC-registry entry yet: delivering art is safe; showing him needs a content hook (registry + dialogue), which the Producer has not requested.


### D. Rainline environment: tileset, parallax, props

#### 15. `env_rainline_tiles` — Rainline Alley — Tileset  [P1]

- **File:** `env_rainline_tiles.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/env_rainline_tiles.png`
- **Sheet:** 1024×256 px = 16 column(s) × 4 row(s) of 64×64 px cells (4× the in-game size 16×16).
- **Animations (row order, top to bottom):** solid 16f@1fps once | catwalk 3f@1fps once | hazard 4f@6fps loop | details 8f@1fps once. row 1 = `solid` (16 used of 16 columns; 4x4 auto-tile set (edges + corners + fill)); row 2 = `catwalk` (3 used of 16 columns; left cap, middle, right cap); row 3 = `hazard` (4 used of 16 columns; animated live-current surface); row 4 = `details` (8 used of 16 columns; wall panels, rivets, stains).
- **Pivot / origin:** (0, 0) of the cell = top-left of the cell; the art fills the whole cell (tile/background).
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** Night alley in permanent rain: purple-black sky, wet concrete, cyan signage reflections, rusted fire escapes. Tiles are 16x16 logical px and must tile seamlessly. Strong top lip highlight, darker underside, readable platform edges.
- **Palette:** #05060c #272c3e #8f9bbd #3cf2ff #1a0d26
- **Variations:** Day-variant not required
- **Textures it replaces:** `env_rainline_tiles__solid_0`, `env_rainline_tiles__solid_1`, `env_rainline_tiles__solid_2`, `env_rainline_tiles__solid_3`, `env_rainline_tiles__solid_4`, `env_rainline_tiles__solid_5`, `env_rainline_tiles__solid_6`, `env_rainline_tiles__solid_7`, `env_rainline_tiles__solid_8`, `env_rainline_tiles__solid_9`, `env_rainline_tiles__solid_10`, `env_rainline_tiles__solid_11`, `env_rainline_tiles__solid_12`, `env_rainline_tiles__solid_13`, `env_rainline_tiles__solid_14`, `env_rainline_tiles__solid_15`, `env_rainline_tiles__catwalk_0`, `env_rainline_tiles__catwalk_1`, `env_rainline_tiles__catwalk_2`, `env_rainline_tiles__hazard_0`, `env_rainline_tiles__hazard_1`, `env_rainline_tiles__hazard_2`, `env_rainline_tiles__hazard_3`, `env_rainline_tiles__details_0`, `env_rainline_tiles__details_1`, `env_rainline_tiles__details_2`, `env_rainline_tiles__details_3`, `env_rainline_tiles__details_4`, `env_rainline_tiles__details_5`, `env_rainline_tiles__details_6`, `env_rainline_tiles__details_7`
- **Status in the repo today:** `needs-engine-work`, placeholder `code-drawn`. Note: Terrain is drawn by code today (RoomView.drawTerrain). The tileset hook (auto-tiling from this sheet) is specified in ASSET_INTEGRATION_GUIDE.md and not implemented yet.

#### 16. `env_rainline_bg_far` — Rainline Alley — Far Background  [P1]

- **File:** `env_rainline_bg_far.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/env_rainline_bg_far.png`
- **Sheet:** 1920×1080 px = 1 column(s) × 1 row(s) of 1920×1080 px cells (4× the in-game size 480×270).
- **Animations (row order, top to bottom):** far 1f@1fps once. row 1 = `far` (1 used of 1 columns).
- **Pivot / origin:** (0, 0) of the cell = top-left of the cell; the art fills the whole cell (tile/background).
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** fully opaque (it is the farthest layer).
- **Visual description:** Far skyline/ceiling layer. Night alley in permanent rain: purple-black sky, wet concrete, cyan signage reflections, rusted fire escapes. Low contrast, atmospheric perspective, no gameplay-readable detail, seamless left-right tile. Landscape 16:9 at 480x270 logical (deliver 1920x1080).
- **Palette:** #05060c #272c3e #8f9bbd #3cf2ff #1a0d26
- **Textures it replaces:** `env-rainline-bg-far`
- **Status in the repo today:** `needs-engine-work`, placeholder `code-drawn`. Note: AUDIT: RoomView builds per-room textures `far-<roomId>` and never reads this key, so delivering the file does not replace the backdrop yet. See docs/GEMINI_PACK_01_BRIEF.md §7 (patch R2).

#### 17. `env_rainline_bg_mid` — Rainline Alley — Mid Background  [P1]

- **File:** `env_rainline_bg_mid.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/env_rainline_bg_mid.png`
- **Sheet:** 1920×1080 px = 1 column(s) × 1 row(s) of 1920×1080 px cells (4× the in-game size 480×270).
- **Animations (row order, top to bottom):** mid 1f@1fps once. row 1 = `mid` (1 used of 1 columns).
- **Pivot / origin:** (0, 0) of the cell = top-left of the cell; the art fills the whole cell (tile/background).
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** Mid layer: larger structures and architecture with more contrast than the far layer. dumpsters, fire escapes, neon sign boxes, rain pipes, crates, a flickering street lamp, puddle reflections. Seamless left-right tile, transparent where the far layer should show through.
- **Palette:** #05060c #272c3e #8f9bbd #3cf2ff #1a0d26
- **Textures it replaces:** `env-rainline-bg-mid`
- **Status in the repo today:** `needs-engine-work`, placeholder `code-drawn`. Note: AUDIT: not read by RoomView yet (patch R2 in the Pack 01 brief).

#### 18. `env_rainline_fg_silhouette` — Rainline Alley — Foreground Silhouettes  [P1]

- **File:** `env_rainline_fg_silhouette.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/env_rainline_fg_silhouette.png`
- **Sheet:** 3840×540 px = 4 column(s) × 1 row(s) of 960×540 px cells (2× the in-game size 480×270).
- **Animations (row order, top to bottom):** fg 4f@1fps once. row 1 = `fg` (4 used of 4 columns; 4 interchangeable strips).
- **Pivot / origin:** (0, 0) of the cell = top-left of the cell; the art fills the whole cell (tile/background).
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** Near-black foreground silhouettes with a subtle coloured rim light. Never cover the player: keep to the top/bottom 25% of the screen. dumpsters, fire escapes, neon sign boxes, rain pipes, crates, a flickering street lamp, puddle reflections.
- **Palette:** #05060c #272c3e #8f9bbd #3cf2ff #1a0d26
- **Textures it replaces:** `env_rainline_fg_silhouette__fg_0`, `env_rainline_fg_silhouette__fg_1`, `env_rainline_fg_silhouette__fg_2`, `env_rainline_fg_silhouette__fg_3`
- **Status in the repo today:** `needs-engine-work`, placeholder `spec-only`. Note: No foreground layer exists yet; the renderer slot is specified in the guide.

#### 19. `env_rainline_props` — Rainline Alley — Props  [P1]

- **File:** `env_rainline_props.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/env_rainline_props.png`
- **Sheet:** 1536×192 px = 8 column(s) × 1 row(s) of 192×192 px cells (4× the in-game size 48×48).
- **Animations (row order, top to bottom):** props 8f@1fps once. row 1 = `props` (8 used of 8 columns; 8 props; see description).
- **Pivot / origin:** (0.5, 1) of the cell = bottom-centre: the soles/base touch the BOTTOM edge of the cell, horizontally centred.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** Eight standalone props on a transparent background, each within 48x48 logical px: dumpsters, fire escapes, neon sign boxes, rain pipes, crates, a flickering street lamp, puddle reflections. Each must read at small size and share the region palette.
- **Palette:** #05060c #272c3e #8f9bbd #3cf2ff #1a0d26
- **Textures it replaces:** `env_rainline_props__props_0`, `env_rainline_props__props_1`, `env_rainline_props__props_2`, `env_rainline_props__props_3`, `env_rainline_props__props_4`, `env_rainline_props__props_5`, `env_rainline_props__props_6`, `env_rainline_props__props_7`
- **Status in the repo today:** `needs-engine-work`, placeholder `spec-only`. Note: Rooms do not place props yet; slots are reserved.


### E. Rainline interactive objects and pickups

#### 20. `obj_sync_relay` — Sync Relay  [P0]

- **File:** `obj_sync_relay.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/obj_sync_relay.png`
- **Sheet:** 160×256 px = 2 column(s) × 2 row(s) of 80×128 px cells (4× the in-game size 20×32).
- **Animations (row order, top to bottom):** off 1f@1fps loop | on 2f@3fps loop. row 1 = `off` (1 used of 2 columns); row 2 = `on` (2 used of 2 columns).
- **Pivot / origin:** (0.5, 1) of the cell = bottom-centre: the soles/base touch the BOTTOM edge of the cell, horizontally centred.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** A waist-high relay pylon with a cyan ring that lights up when linked; a vertical glass tube with a pulsing coil.
- **Palette:** #14102a #3a4a6a #3cf2ff
- **Textures it replaces:** `obj-relay-off`, `obj-relay-on`
- **Status in the repo today:** `swap-ready`, placeholder `procedural-legacy`.

#### 21. `obj_security_door` — Security Door  [P0]

- **File:** `obj_security_door.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/obj_security_door.png`
- **Sheet:** 256×128 px = 4 column(s) × 2 row(s) of 64×64 px cells (4× the in-game size 16×16).
- **Animations (row order, top to bottom):** closed 1f@1fps loop | open 4f@12fps once. row 1 = `closed` (1 used of 4 columns); row 2 = `open` (4 used of 4 columns; iris/slide open).
- **Pivot / origin:** (0, 0) of the cell = top-left of the cell; the art fills the whole cell (tile/background).
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** A heavy steel shutter segment with a hazard-stripe edge and a status light (red locked, amber waiting, green open). Stacks vertically without seams.
- **Palette:** #2a2a38 #8a8aa0 #ff3b4e #4dff9a
- **Textures it replaces:** `obj_security_door__closed_0`, `obj_security_door__open_0`, `obj_security_door__open_1`, `obj_security_door__open_2`, `obj_security_door__open_3`
- **Status in the repo today:** `swap-ready`, placeholder `procedural`.

#### 22. `obj_pressure_plate` — Pressure Plate  [P0]

- **File:** `obj_pressure_plate.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/obj_pressure_plate.png`
- **Sheet:** 64×96 px = 1 column(s) × 4 row(s) of 64×24 px cells (4× the in-game size 16×6).
- **Animations (row order, top to bottom):** up 1f@1fps loop | down 1f@1fps loop | echoUp 1f@1fps loop | echoDown 1f@1fps loop. row 1 = `up` (1 used of 1 columns); row 2 = `down` (1 used of 1 columns); row 3 = `echoUp` (1 used of 1 columns); row 4 = `echoDown` (1 used of 1 columns).
- **Pivot / origin:** (0, 1) of the cell = x=0, y=1.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** A shallow steel plate flush with the floor. Courier plates glow cyan when pressed. ECHO plates are translucent violet with a faint clock-face ring so players learn they respond to the afterimage.
- **Palette:** #2a2a38 #8a8aa0 #3cf2ff #9b59ff
- **Textures it replaces:** `obj_pressure_plate__up_0`, `obj_pressure_plate__down_0`, `obj_pressure_plate__echoUp_0`, `obj_pressure_plate__echoDown_0`
- **Status in the repo today:** `swap-ready`, placeholder `procedural`.

#### 23. `obj_breakable_wall` — Cracked Wall  [P1]

- **File:** `obj_breakable_wall.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/obj_breakable_wall.png`
- **Sheet:** 256×256 px = 4 column(s) × 4 row(s) of 64×64 px cells (4× the in-game size 16×16).
- **Animations (row order, top to bottom):** intact 1f@1fps loop | damaged1 1f@1fps loop | damaged2 1f@1fps loop | debris 4f@12fps once. row 1 = `intact` (1 used of 4 columns); row 2 = `damaged1` (1 used of 4 columns); row 3 = `damaged2` (1 used of 4 columns); row 4 = `debris` (4 used of 4 columns).
- **Pivot / origin:** (0, 0) of the cell = top-left of the cell; the art fills the whole cell (tile/background).
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** Concrete tile with a glowing hairline crack and exposed rebar; damage stages widen the crack.
- **Palette:** #272c3e #8f9bbd #ffb02e
- **Textures it replaces:** `tile-cracked`
- **Status in the repo today:** `swap-ready`, placeholder `procedural-legacy`.

#### 24. `pickup_backtrace_module` — Backtrace Module  [P0]

- **File:** `pickup_backtrace_module.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/pickup_backtrace_module.png`
- **Sheet:** 64×256 px = 1 column(s) × 2 row(s) of 64×128 px cells (4× the in-game size 16×32).
- **Animations (row order, top to bottom):** full 1f@1fps loop | spent 1f@1fps loop. row 1 = `full` (1 used of 1 columns); row 2 = `spent` (1 used of 1 columns).
- **Pivot / origin:** (0.5, 1) of the cell = bottom-centre: the soles/base touch the BOTTOM edge of the cell, horizontally centred.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** A glowing cyan module on a small pedestal; spent version is dark.
- **Palette:** #14102a #3cf2ff #ffffff
- **Textures it replaces:** `obj-backtrace-module`, `obj-backtrace-module-spent`
- **Status in the repo today:** `swap-ready`, placeholder `procedural-legacy`.

#### 25. `pickup_integrity_cell` — Integrity Cell  [P1]

- **File:** `pickup_integrity_cell.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/pickup_integrity_cell.png`
- **Sheet:** 48×48 px = 1 column(s) × 1 row(s) of 48×48 px cells (4× the in-game size 12×12).
- **Animations (row order, top to bottom):** idle 1f@1fps loop. row 1 = `idle` (1 used of 1 columns).
- **Pivot / origin:** (0.5, 0.5) of the cell = cell centre; keep the visual centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** A small cyan-white energy cell with a heart-like glow.
- **Palette:** #0a2a3a #3cf2ff
- **Textures it replaces:** `obj-integrity-cell`
- **Status in the repo today:** `swap-ready`, placeholder `procedural-legacy`.

#### 26. `pickup_glitch_strike` — Glitch Strike Core  [P1]

- **File:** `pickup_glitch_strike.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/pickup_glitch_strike.png`
- **Sheet:** 64×128 px = 1 column(s) × 1 row(s) of 64×128 px cells (4× the in-game size 16×32).
- **Animations (row order, top to bottom):** idle 1f@1fps loop. row 1 = `idle` (1 used of 1 columns).
- **Pivot / origin:** (0.5, 0.5) of the cell = cell centre; keep the visual centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** A magenta core with orbiting broken-square glitch shards.
- **Palette:** #2a0a2a #ff3ea5 #ffffff
- **Textures it replaces:** `obj-glitch-strike`
- **Status in the repo today:** `swap-ready`, placeholder `procedural-legacy`.

#### 27. `pickup_memory_fragment` — Memory Fragment  [P1]

- **File:** `pickup_memory_fragment.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/pickup_memory_fragment.png`
- **Sheet:** 48×48 px = 1 column(s) × 1 row(s) of 48×48 px cells (4× the in-game size 12×12).
- **Animations (row order, top to bottom):** idle 1f@1fps loop. row 1 = `idle` (1 used of 1 columns).
- **Pivot / origin:** (0.5, 0.5) of the cell = cell centre; keep the visual centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** A violet crystalline shard containing a tiny flicker of a memory.
- **Palette:** #14102a #9b59ff #ffffff
- **Textures it replaces:** `obj-fragment`
- **Status in the repo today:** `swap-ready`, placeholder `procedural-legacy`.

#### 28. `pickup_scrap` — Scrap Cache  [P1]

- **File:** `pickup_scrap.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/pickup_scrap.png`
- **Sheet:** 96×48 px = 2 column(s) × 1 row(s) of 48×48 px cells (4× the in-game size 12×12).
- **Animations (row order, top to bottom):** idle 2f@3fps loop. row 1 = `idle` (2 used of 2 columns).
- **Pivot / origin:** (0.5, 0.5) of the cell = cell centre; keep the visual centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** A handful of bright amber metal scrap and wire, glinting.
- **Palette:** #2a1808 #ffb02e #ffffff
- **Textures it replaces:** `pickup-scrap`
- **Status in the repo today:** `swap-ready`, placeholder `code-drawn`.


### F. Combat effects

#### 29. `fx_slash_side` — Slash — Side  [P1]

- **File:** `fx_slash_side.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/fx_slash_side.png`
- **Sheet:** 640×112 px = 4 column(s) × 1 row(s) of 160×112 px cells (4× the in-game size 40×28).
- **Animations (row order, top to bottom):** slash 4f@20fps once. row 1 = `slash` (4 used of 4 columns).
- **Pivot / origin:** (0.5, 0.5) of the cell = cell centre; keep the visual centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** A bright white-cyan crescent arc with a motion-blur tail, additive blend.
- **Palette:** #ffffff #3cf2ff
- **Textures it replaces:** `fx-slash-side`
- **Status in the repo today:** `swap-ready`, placeholder `code-drawn`.

#### 30. `fx_slash_up` — Slash — Up  [P1]

- **File:** `fx_slash_up.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/fx_slash_up.png`
- **Sheet:** 448×160 px = 4 column(s) × 1 row(s) of 112×160 px cells (4× the in-game size 28×40).
- **Animations (row order, top to bottom):** slash 4f@20fps once. row 1 = `slash` (4 used of 4 columns).
- **Pivot / origin:** (0.5, 0.5) of the cell = cell centre; keep the visual centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** Vertical crescent for upward attacks.
- **Palette:** #ffffff #3cf2ff
- **Textures it replaces:** `fx-slash-up`
- **Status in the repo today:** `swap-ready`, placeholder `code-drawn`.

#### 31. `fx_slash_down` — Slash — Down  [P1]

- **File:** `fx_slash_down.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/fx_slash_down.png`
- **Sheet:** 448×160 px = 4 column(s) × 1 row(s) of 112×160 px cells (4× the in-game size 28×40).
- **Animations (row order, top to bottom):** slash 4f@20fps once. row 1 = `slash` (4 used of 4 columns).
- **Pivot / origin:** (0.5, 0.5) of the cell = cell centre; keep the visual centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** Vertical crescent pointing down with a spark tip.
- **Palette:** #ffffff #ffb02e
- **Textures it replaces:** `fx-slash-down`
- **Status in the repo today:** `swap-ready`, placeholder `code-drawn`.

#### 32. `fx_hit_spark` — Hit Spark  [P1]

- **File:** `fx_hit_spark.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/fx_hit_spark.png`
- **Sheet:** 480×96 px = 5 column(s) × 1 row(s) of 96×96 px cells (4× the in-game size 24×24).
- **Animations (row order, top to bottom):** spark 5f@24fps once. row 1 = `spark` (5 used of 5 columns).
- **Pivot / origin:** (0.5, 0.5) of the cell = cell centre; keep the visual centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** A star-shaped white flash fading to amber embers; 5 frames.
- **Palette:** #ffffff #ffb02e
- **Textures it replaces:** `fx-spark`
- **Status in the repo today:** `swap-ready`, placeholder `code-drawn`.

#### 33. `fx_enemy_telegraph` — Enemy Telegraph Glint  [P1]

- **File:** `fx_enemy_telegraph.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/fx_enemy_telegraph.png`
- **Sheet:** 192×48 px = 4 column(s) × 1 row(s) of 48×48 px cells (4× the in-game size 12×12).
- **Animations (row order, top to bottom):** glint 4f@14fps once. row 1 = `glint` (4 used of 4 columns).
- **Pivot / origin:** (0.5, 0.5) of the cell = cell centre; keep the visual centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** A sharp white four-point star that pulses once before an attack lands.
- **Palette:** #ffffff #ff3b4e
- **Textures it replaces:** `fx-spark`
- **Status in the repo today:** `swap-ready`, placeholder `code-drawn`.

#### 34. `fx_projectile_set` — Projectiles  [P1]

- **File:** `fx_projectile_set.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/fx_projectile_set.png`
- **Sheet:** 192×192 px = 3 column(s) × 3 row(s) of 64×64 px cells (4× the in-game size 16×16).
- **Animations (row order, top to bottom):** bolt 2f@12fps loop | shockwave 3f@12fps loop | plasma 3f@12fps loop. row 1 = `bolt` (2 used of 3 columns); row 2 = `shockwave` (3 used of 3 columns); row 3 = `plasma` (3 used of 3 columns).
- **Pivot / origin:** (0.5, 0.5) of the cell = cell centre; keep the visual centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** Magenta bolt, amber ground shockwave front, red falling plasma. All glow additively.
- **Palette:** #ff3ea5 #ffb02e #ff3b4e
- **Textures it replaces:** `proj-bolt`, `proj-shockwave`, `proj-plasma`
- **Status in the repo today:** `swap-ready`, placeholder `code-drawn`. Note: Placeholder reuses each key for every frame of its row.

#### 35. `fx_glitch_strike` — Glitch Strike  [P1]

- **File:** `fx_glitch_strike.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/fx_glitch_strike.png`
- **Sheet:** 1536×160 px = 6 column(s) × 1 row(s) of 256×160 px cells (4× the in-game size 64×40).
- **Animations (row order, top to bottom):** strike 6f@20fps once. row 1 = `strike` (6 used of 6 columns).
- **Pivot / origin:** (0.5, 0.5) of the cell = cell centre; keep the visual centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** A broken-square magenta shockwave with RGB split, wider than the slash.
- **Palette:** #ff3ea5 #3cf2ff #ffffff
- **Textures it replaces:** (none yet — see integration status)
- **Status in the repo today:** `placeholder`, placeholder `code-drawn`.


### G. Backtrace effects

#### 36. `fx_backtrace_arrival` — Backtrace Arrival Burst  [P0]

- **File:** `fx_backtrace_arrival.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/fx_backtrace_arrival.png`
- **Sheet:** 3072×384 px = 8 column(s) × 1 row(s) of 384×384 px cells (4× the in-game size 96×96).
- **Animations (row order, top to bottom):** burst 8f@24fps once. row 1 = `burst` (8 used of 8 columns).
- **Pivot / origin:** (0.5, 0.5) of the cell = cell centre; keep the visual centre of mass on the cell centre.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** An expanding cyan shockwave ring with glitch slices and time-dial tick marks; white core flash first.
- **Palette:** #3cf2ff #ffffff #ff3ea5
- **Textures it replaces:** `fx-ring`
- **Status in the repo today:** `swap-ready`, placeholder `code-drawn`.

#### 37. `fx_backtrace_streak` — Backtrace Streak  [P1]

- **File:** `fx_backtrace_streak.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/fx_backtrace_streak.png`
- **Sheet:** 1024×32 px = 4 column(s) × 1 row(s) of 256×32 px cells (4× the in-game size 64×8).
- **Animations (row order, top to bottom):** streak 4f@20fps once. row 1 = `streak` (4 used of 4 columns).
- **Pivot / origin:** (0, 0.5) of the cell = x=0, y=0.5.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** A horizontal cyan motion streak with trailing glitch squares (the game stretches it between two points).
- **Palette:** #3cf2ff #ffffff
- **Textures it replaces:** `fx-glow`
- **Status in the repo today:** `swap-ready`, placeholder `code-drawn`. Note: Drawn as a code line today.

#### 38. `fx_temporal_plate_pulse` — Temporal Plate Pulse  [P1]

- **File:** `fx_temporal_plate_pulse.png` (PNG-32, RGBA, sRGB, non-premultiplied) → `public/assets/final/fx_temporal_plate_pulse.png`
- **Sheet:** 768×128 px = 6 column(s) × 1 row(s) of 128×128 px cells (4× the in-game size 32×32).
- **Animations (row order, top to bottom):** pulse 6f@16fps once. row 1 = `pulse` (6 used of 6 columns).
- **Pivot / origin:** (0.5, 1) of the cell = bottom-centre: the soles/base touch the BOTTOM edge of the cell, horizontally centred.
- **Collision:** none from this sprite (visual only; physics come from room data).
- **Transparency:** transparent background (alpha 0) outside the art; no baked ground shadow, no baked glow halo larger than the cell.
- **Visual description:** A violet clock-ring that expands from the plate and ticks.
- **Palette:** #9b59ff #ffffff
- **Textures it replaces:** (none yet — see integration status)
- **Status in the repo today:** `placeholder`, placeholder `code-drawn`.



---

## 8. Gemini workflow (recommended order and prompt template)

**Order:** (1) Style anchor sheet: Courier concept turn-around + one Rainline tile sample + one background sample; approve it. (2) Wave 1. (3) Wave 2. (4) Wave 3. Never generate a new asset without attaching the approved style anchor.

**Prompt template (fill the brackets):**

> *[paste the Style lock from §4]*  
> Create **[asset name]** for the 2D side-scroller NULL REQUIEM, Rainline Alley. Output: **[one animation frame / a sprite sheet]** of **[cell W×H px]** per cell, **[N] columns × [M] rows**, on a flat pure green `#00FF00` background, no shadows on the ground, no text. Subject: **[visual description from the entry]**. Pose/animation: **[anim notes]**. The figure faces right, feet on the bottom edge of the cell, centred horizontally. Palette: **[palette]**. Same costume and proportions in every frame. Crisp, readable silhouette at 1/4 size.

**What we will do on our side when files arrive:** key the chroma, assemble cells into exact sheets, validate (§5.11), drop into `public/assets/final/`, list in `manifest.json`, and re-run `npm run docs:assets` (flips status to `final`). A small `assets:build` script for that is **not written yet**; I can add it as the next task.

---

## 9. Open questions and risks

1. **Who is the Desert Man?** The codebase has no such NPC. I assumed a **new Rainline NPC** (new ID `npc_desert_man`, not replacing ZERO). Tell me if you meant a re-skin of ZERO or a character from another document; if so the ID changes to `npc_zero` and only the visual description changes.
2. **R0 (render resolution) decides whether this whole pack looks sharp on your phone.** Measured: the game is drawn at 270 px tall and stretched ~4×. Recommend scheduling R0 before judging the first art. Risk: GPU fill-rate on mid-range Android **[unverified]**; plan K=2 default with a device FPS check.
3. **Gemini fidelity risks [unverified]:** frame-to-frame character consistency, exact grid layout and real transparency are known weak spots of image generators. That is why §5.10 accepts loose frames and why the style anchor comes first. Expect several iterations on the Courier run cycle.
4. **Tileset mask has no inner-corner cells** (16-set). If it looks wrong on L-shaped rooms we extend to a 47-tile blob set later; that is an additional manifest change, not part of this pack.
5. Animation counts are limited by the current engine (e.g. `player_courier_attack` is 1 frame). More frames need a manifest change first; do not ask Gemini for extras.

## 10. Verification performed for this brief

- Manifest values extracted by script from `src/assets/manifest*.ts` (sheet maths in §6/§7a is generated, not typed by hand).
- Canvas size probe run in headless Chromium (Pixel-class emulation) on the production build: backing 600×270 vs CSS 915×412 at DPR 2.625.
- `npm run docs:assets` re-run; manifest and tests green (see the commit). **No placeholder was replaced and no gameplay file was changed.** Physical-device behaviour of final art: **not tested**.
