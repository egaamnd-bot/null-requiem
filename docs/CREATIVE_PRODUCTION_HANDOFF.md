# NULL REQUIEM — Creative Production Handoff

**Branch:** `creative/pack-01-production`  
**Status:** Production plan and handoff contract; generated concept boards are references only. No concept-board image is approved as a runtime sprite sheet.

## Ownership and non-negotiable rules

- Producer: project owner; has approved the creative direction and delegated creative decisions.
- Creative production: ChatGPT; responsible for art direction, visual/audio asset specifications, generated source assets where supported, and QA documentation.
- Engineering/integration: Claude; responsible for repository integration, asset pipeline, audio playback implementation, runtime UI wiring, tests, and Android verification.
- Preserve all existing gameplay, physics, collision, save data, scene flow, and stable manifest IDs.
- Keep procedural placeholders and fallback behavior until each individual final asset passes validation.
- Do not overwrite or remove existing assets or generated manifests without inspecting the current source of truth.
- Never treat a collage, mood board, or concept sheet as a collection of production-ready files.
- Do not claim an asset is delivered until the actual file exists in the repository and passes the relevant validation.

## Source of truth

Read these before asset work:
1. `docs/GEMINI_PACK_01_BRIEF.md` — detailed Pack 01 art specifications.
2. `docs/ASSET_INTEGRATION_GUIDE.md` — runtime asset contract and assembly workflow.
3. `docs/GEMINI_ASSET_SPEC.md` — broader asset catalogue.
4. `docs/ASSET_MANIFEST.md` — generated current integration status; regenerate with `npm run docs:assets`, never hand-edit.
5. `src/assets/manifest*.ts` and asset build/validation scripts — authoritative IDs, sizes, pivots and tooling.

Art direction: **Wet-Neon Gouache**. Hand-painted digital gouache, rain-soaked cyberpunk, rich brush texture, strong readable silhouettes, controlled cyan/magenta neon, dark atmospheric playfield. No pixel art, flat vector, plastic CGI, or photorealistic textures. Match the existing detailed Pack 01 brief exactly for dimensions, frame counts, pivots, palette, transparency, naming, and animation rates.

## Delivery layout

Use the existing integration guide and asset builder. Proposed source organization (adapt only if the current scripts prescribe a different path):

- `art/incoming/pack-01/` — unmodified generated/source art awaiting validation.
- `public/assets/final/` — only validated runtime-ready files assembled by the existing pipeline.
- `public/audio/music/` — final music files.
- `public/audio/sfx/` — final sound effects.
- `public/audio/ui/` — UI interaction sounds.
- `docs/audio/README.md` — audio catalogue, loops, gain targets, triggers, and integration notes.
- `docs/UI_ASSET_SPEC.md` — UI component inventory, states, dimensions, safe areas, and export rules.
- `docs/CREATIVE_DELIVERY_LOG.md` — dated delivery ledger with filenames, validation result, and outstanding work.

Do not create duplicate asset IDs or invent runtime paths without checking the current code.

## Workstream A — Pack 01 visuals (38 specified files)

Deliver all 38 files in `docs/GEMINI_PACK_01_BRIEF.md`:
- Courier: 11
- Enemies: 2
- NPC: 1
- Environment: 5
- Interactive objects and pickups: 9
- Combat effects: 7
- Backtrace effects: 3

Produce each asset as its own correctly named transparent PNG/sheet, with exact cell size, sheet dimensions, frame order, pivot, baseline, frame count and animation rate from the brief. For every file, record source path, final path, dimensions, alpha/transparency check, frame/cell check, and validation outcome. Do not substitute a flattened board.

## Workstream B — Music and ambience

Create original music, not imitations of existing game or film scores. Core identity: nocturnal cyberpunk, restrained dark synths, wet industrial ambience, pulse-like electronic percussion, memorable melodic motif, and a distinctive Backtrace sonic signature.

Initial music catalogue (IDs are proposed until reconciled with the audio loader/code):
- `music_title_theme` — title/menu identity, memorable main motif.
- `music_rainline_exploration` — Rainline Alley exploration loop.
- `music_rainline_combat` — combat intensity layer/loop.
- `music_boss_bulwark9` — miniboss encounter loop.
- `music_backtrace_motif` — short musical identity/stinger usable as a motif or layered cue.
- `music_victory` — victory resolution.
- `music_game_over` — restrained failure resolution.
- `music_safe_room` — low-intensity recovery/save ambience.
- `amb_rainline_loop` — rain, distant traffic, electrical hum, wet industrial atmosphere.
- `amb_transit_stacks_loop` — elevated transit rumble, wind, cables, distant machinery.
- `amb_precinct_vault_loop` — enclosed electrical hum, security systems, heavy machinery.

Audio deliverables should include a high-quality master plus a game-ready compressed format selected to suit the existing runtime. Loops must be seamless; provide exact loop points or loop metadata. Include sample rate, channels, bit depth/encoding, duration, loudness/gain guidance, and licensing/originality declaration. Avoid clipping and leave headroom for simultaneous SFX. Music and ambience should be independently mixable; combat intensity can be layered if supported.

## Workstream C — Sound effects

Produce short, original, readable, non-fatiguing SFX. Catalogue:
- Player: `sfx_player_footstep_wet`, `sfx_player_jump`, `sfx_player_land`, `sfx_player_airjump`, `sfx_player_dash`, `sfx_player_attack`, `sfx_player_hurt`, `sfx_player_death`.
- Backtrace: `sfx_backtrace_charge`, `sfx_backtrace_release`, `sfx_backtrace_arrival`, `sfx_backtrace_ready`, `sfx_backtrace_cooldown`.
- Combat/enemies: `sfx_enemy_telegraph`, `sfx_scrap_hound_lunge`, `sfx_drone_charge`, `sfx_drone_projectile`, `sfx_hit_light`, `sfx_hit_heavy`, `sfx_enemy_death`, `sfx_boss_warning`.
- World/interactions: `sfx_door_open`, `sfx_door_close`, `sfx_relay_activate`, `sfx_pressure_plate`, `sfx_breakable_wall`, `sfx_pickup_integrity`, `sfx_pickup_memory`, `sfx_pickup_scrap`, `sfx_pickup_module`, `sfx_checkpoint`, `sfx_quest_update`.
- UI: `ui_focus`, `ui_confirm`, `ui_back`, `ui_pause`, `ui_error`, `ui_tab`, `ui_slider`, `ui_save`, `ui_continue`.
- Atmosphere: reusable rain, thunder/distant rumble, electrical buzz, neon sign hum, machinery, distant city traffic, and water drips.

Provide variations for frequently repeated footsteps/hits where useful. Keep SFX transient and distinct from music; specify trigger, duration, gain, pitch variation range, and whether it may overlap/retrigger. Do not make UI sounds excessively loud or fatiguing.

## Workstream D — UI, buttons, icons, and HUD

Create a consistent UI kit matching Wet-Neon Gouache while prioritizing readability on Android landscape:
- Title/logo treatment and title-screen background treatment.
- Primary/secondary/disabled button states; normal, hover/focus, pressed, disabled, selected, and destructive states.
- Pause panel, settings panel, audio sliders/toggles, controls/help panel, save/continue/new game/confirm dialogs.
- Touch controls: movement joystick base/knob, attack, jump, interact, Backtrace; clear pressed states and adequate touch target sizes.
- HUD: health/integrity, Backtrace cooldown/ready, scrap/currency if used, objective/quest text, boss health, contextual interaction prompt.
- Icons: health/integrity, Backtrace, interaction, relay, door, pressure plate, memory fragment, scrap, module, quest, save/checkpoint, audio, controls, settings.
- Dialogue panel and speaker/name treatment; portrait slot artwork only if the current engine has a supported slot.
- Quest/objective markers and readable map/region markers if the current game has those systems.

Respect safe areas and landscape phone aspect ratios. Avoid baking text into reusable button sprites; use runtime text for localization/readability unless the existing UI architecture explicitly requires a text-bearing asset. Deliver 1x/2x/3x or vector/source equivalents only where the existing UI pipeline supports them. Document exact dimensions, nine-slice margins if applicable, and state naming.

## Workstream E — Integration and validation

Claude must:
1. Inspect current branch, manifest, loader, audio implementation, UI architecture, build scripts and existing files before integration.
2. Report which audio/UI capabilities already exist and which require engine work. Do not silently change gameplay.
3. Use existing asset build/validate commands for Pack 01. Never hand-edit generated manifest docs.
4. Implement audio loading/mixing only in a separate, reviewable engineering change if not already supported. Keep SFX responsive and avoid delaying input/gameplay for audio.
5. Keep all assets optional with existing fallback behavior until validated.
6. Add automated tests for file existence, dimensions, alpha, sheet layout, audio decode/loop metadata, and UI safe-area/resolution behavior where practical.
7. Run typecheck, unit tests, browser tests, production build, Android build, and physical-device checks for rendering/audio performance before declaring complete.
8. Record every delivered file and test result in `docs/CREATIVE_DELIVERY_LOG.md`.

## Release gates

- Gate 0 — style lock and approved visual/audio references.
- Gate 1 — Courier and one representative environment asset validated end-to-end.
- Gate 2 — remaining Pack 01 characters, environments, props, objects and effects validated.
- Gate 3 — title/exploration/combat/boss music and essential SFX integrated and tested.
- Gate 4 — UI kit and touch-control states integrated and checked on real Android aspect ratios.
- Gate 5 — full asset audit, no missing references, no broken fallbacks, performance and audio-mix QA.

## Current delivery status

The generated visual boards are **concept references only**. They are not the 38 production PNGs. No music, ambience, SFX, or UI sprite files should be marked delivered until actual files are committed and validated. Preserve all existing placeholders and runtime behavior in the meantime.

## Instructions for the next engineer/agent

Start by reading the source-of-truth docs listed above and inspecting the actual repository state on this branch. Do not assume this document means assets have already been generated. Continue from the delivery ledger, create a small representative asset batch first, validate it with the repository's actual tools, and only then scale up production. If an asset format or audio path is unsupported, document the required engine work separately rather than inventing an integration path.
