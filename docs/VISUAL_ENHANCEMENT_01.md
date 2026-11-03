# Visual enhancement 01 — procedural atmosphere pass (branch `feature/visual-enhancement`)

Presentation-only improvements made **without** waiting for the final art. No gameplay, AI, balance, save-data or Backtrace logic was touched. All placeholders and fallbacks remain; painted art delivered later still replaces the backdrop/sprites underneath these layers.

Before/after (Pixel 7 landscape, production build): `docs/screenshots/before_*.png` vs `after_*.png` (`node tools/screenshots/capture.mjs <dir> <prefix>` with `vite preview` running; set `CHROMIUM_PATH` if Playwright's browser build differs).

## What changed

| Area | Change | Where |
| --- | --- | --- |
| Bug fix | The mid-ground "glow" lights were painting **hard teal/magenta squares** (the helper substitutes `ALPHA`, the call sites had none). They are now soft cyan/magenta glows. This was the main reason the backdrop looked flat. | `src/render/textures.ts` |
| Sky | Hot-pink sky graded toward the palette: void → deep violet → magenta horizon; dimmer moon. | `textures.ts` |
| Atmosphere layer | Night grade (dark top/bottom, clear middle), two parallax fog bands, ground haze, sparse near-rain streaks in front of the playfield, drifting cyan/magenta/sodium motes. | `src/render/Atmosphere.ts` (new), wired in `RoomView` |
| Wet floors | Bright wet edge on every floor-top run, tinted under-sheen, sliding neon glints, rain ripples on floors in view. | `Atmosphere.ts` (`floorRuns`) |
| Courier | Pulsing cyan spinal-implant glow, rail-blade edge light that flares in the attack window, dash afterimage trail. Sprite itself unchanged. | `ActorViews.ts` `PlayerView` |
| Combat FX | Impact flash + halo on every hit (cyan on enemies, sodium on kills, steel on walls), red impact on player hurt, **red contracting telegraph ring on `enemyWindup`** (distinct from cyan player/environment effects), steel ring on heavy landings. Shake/flash/hit-stop untouched (existing settings respected). | `Fx.ts` |
| HUD | Dark plate with cyan hairline behind integrity cells/scrap/Backtrace; pulsing glow behind the Backtrace icon only while it is ready. | `UIScene.ts` |

Palette used: void `#05060c`, deep violet `#1a0d26`, cyan `#3cf2ff`, magenta `#ff3ea5`, sodium `#ffb347`.

## Not done / honest limits

- Procedural effects, not hand-painted gouache; real Courier/enemy/environment art is still ChatGPT's job.
- Title, menu and pause screens, dialogue panel and touch-control art were **not** restyled in this pass (nine-slice layer from PR #10 is still waiting for art). Their screenshots are unchanged.
- Not measured on a phone: frame rate with the extra particles (near-rain ~1 per 22–26 ms capped by room width, motes ~1 per 90+ ms, ripples 11/s). **Producer to check smoothness on device.**
- Reflections are a faux sheen, not real reflections.

## Creative handoff intake (zip `NULL_REQUIEM_Pack_01_Creative_Handoff.zip`)

| Item | Class | Handling |
| --- | --- | --- |
| `pack01_full_art_direction_board.png`, `courier_batch01_sheet_reference.png`, `courier_run_cycle_reference.png` | **Visual references** (concept boards; no valid sprite geometry, labels baked in) | Stored in `art/reference/pack-01/`. Not in `public/`. Ledger unchanged: all 38 visual files stay *Not delivered*. |
| 4 OST WAV sketches (24–32 s) + rain loop (18 s) | **Unfinished sketches** | Validated via `tools/audio/build.ts`: all **rejected** — duration below the 45 s music minimum (rain below 20 s for `amb_rainline_loop`; mapped to `amb_rain`, still `E-NEEDS-OGG`), −27…−30 LUFS vs −16/−24 targets, WAV not allowed for music/ambience. The combat stem (24 s) also cannot phase-align with the 28 s exploration sketch. Not committed (≈20 MB). |
| 11 short SFX/UI WAV sketches | **Unfinished sketches** that pass the validator | Mapped by name: ui_focus/confirm/back → `sfx_ui_*`; pickup_memory_fragment → `sfx_pickup_memory`; jump/dash/attack → `sfx_player_*`; hit → `sfx_hit_light`; backtrace_start → `sfx_backtrace_release`; backtrace_end → `sfx_backtrace_arrival`; door_open → `sfx_door_open`. **0 errors**, warnings: stereo (expect mono), `sfx_ui_confirm` peak −7.7 dBFS. Kept in `art/incoming/audio-sketches/handoff-01/` (not shipped); the game still uses procedural sounds. |
| `sfx_enemy_drone.wav` | Unmapped | No clear catalog id (telegraph vs charge vs projectile). Needs ChatGPT/Producer to say which. |

The handoff README itself states these are sketches, so they are **not** marked Delivered and are not in `public/audio/`. If the Producer wants them in the next APK as temporary sounds: `cp art/incoming/audio-sketches/handoff-01/*.wav` into a flat folder, `npm run audio:build -- --in <folder> --out public/audio`, and add `Delivered (sketch)` rows — one decision, easy to reverse.

## Upgrade 02 (branch `feature/visual-upgrade-02`)

Screenshots: `docs/screenshots/upgrade-02/`. All presentation-only; effects that cost fill-rate or particles are skipped in lite mode (render scale demoted to 1x).

| Area | Change | Where |
| --- | --- | --- |
| Title | Rainline skyline (generated far/mid layers, slow drift), night grade, fog band, ground haze + scrim, near rain, breathing neon haze, neon glow behind the title, Courier silhouette with cyan implant and wet reflection | `src/render/titleBackdrop.ts`, `TitleScene.ts` |
| Reflections | Wet-floor reflection (flipped, squashed, faint) for the Courier and Scrap Hounds while grounded | `src/render/reflection.ts`, `ActorViews.ts` |
| Backtrace | Row of fading cyan/violet echo capsules along the rewind path | `Fx.ts` |
| Touch controls | Neon rim: outer glow ring, dark body, bright rim, wet highlight arc | `MobileControlsScene.ts` |
| Pause menu | Violet-tinted rows, pulsing cyan selection glow; toast no longer prints through the menu | `UIScene.ts` |

Still not done: dialogue panel restyle beyond the nine-slice hooks, icon art, painted foreground, real Courier/enemy sprites (waiting on ChatGPT).

## Production 03 (branch `feature/visual-production-03`)

Screenshots: `docs/screenshots/production-03/`. Presentation only; every added effect that costs particles or fill-rate is off in lite mode (render scale 1x).

| Area | Change | Where |
| --- | --- | --- |
| Environment | Steam vents (≤3 per room on wide floors), volumetric light beams under neon ledge strips, hanging-cable foreground band (parallax 1.2x, only when no painted foreground exists) | `Atmosphere.ts`, `RoomView.ts` |
| Courier | Trailing magenta scarf chain that lags with motion and gravity; run dust at foot-plants | `ActorViews.ts` `PlayerView` |
| Enemies | Contact shadow + red lunge afterimages (Scrap Hound), thrust glow (Security Drone) | `ActorViews.ts` |
| HUD / dialogue | Glow behind full integrity cells (danger tint at ≤ 2), cyan edge + glow + magenta tick on the dialogue panel | `UIScene.ts` |
| Hygiene | `test-results/` is no longer tracked | `.gitignore` |

Fixed while testing: the cable band's vertical sway wrapped the texture and drew stray dashes (removed). Not done: painted foreground/backgrounds and real sprites (ChatGPT), icon art, boss bar frame.

Test note: in this container the browser suite needs `--timeout=120000` (the default 45 s is too tight for the software renderer here); with it all 26 pass (1 skipped). CI uses the normal timeout and passed on every previous branch.
