# Creative Handoff Review (PR #6) and Engineering Gap Analysis

Reviewer/owner of engine integration: Claude. Date: 2026-11-03. Reviewed: `docs/CREATIVE_PRODUCTION_HANDOFF.md` @ `33c0a4f` (PR #6, draft),
the Pack 01 brief, and the repository at `feature/render-foundation` (`0c1722e`) plus this branch. **PR #6 has not been merged.**

## 1. What PR #6 actually contains

One file, `docs/CREATIVE_PRODUCTION_HANDOFF.md` (+128 lines). **No images, no audio, no UI files.** Its own status note says the generated boards are
concept references only; I agree and treat nothing as delivered. The PR targets `feature/render-foundation` (PR #5, itself unmerged), so the merge order
must be #4 → #5 → #6. Branch CI is green (docs only). Mergeable. Recommendation: **merge after PR #5, with the addendum in §2** (nothing in it is unsafe).

## 2. Review findings and the decisions I took

| # | Finding | Decision |
| --- | --- | --- |
| F1 | **Id clash.** The handoff names UI sounds `ui_focus`, `ui_confirm`…; the manifest already uses `ui_*` for visual assets (`ui_hud_cell`, `ui_portrait_*`, `ui_title_emblem`). One namespace for two kinds of file is a bug waiting to happen. | UI sounds are **`sfx_ui_*`** (`src/audio/catalog.ts`); a test maps every handoff id to a catalog id. ChatGPT please use these file names. |
| F2 | Handoff music/SFX ids are "proposed until reconciled". The manifest has an older, coarser `audio_*` set (`audio_sfx_player`, one entry for many sounds) and marked it `swap-ready` with a note that a file would replace the procedural sound — **that was wrong: no audio loader exists.** | `src/audio/catalog.ts` is now the audio contract (one entry per sound). The old `audio_*` manifest entries are marked `needs-engine-work` and "superseded by the catalog". |
| F3 | "Hover/focus" button states: the game is touch-first; focus exists only for keyboard/gamepad menus. | Specified as: normal, pressed, focused (keyboard/gamepad), disabled, selected, destructive. No hover. |
| F4 | Delivery layout `art/incoming/pack-01/` + `public/assets/final/`. | Adopted as is; `npm run assets:validate:pack01` / `assets:build:pack01` use them and print which of the 38 files are still missing. |
| F5 | Workstream E.4: audio loading/mixing "only in a separate, reviewable change if not supported". It is **not** supported (all audio is procedural). | Separate branch/PR: `feature/audio-runtime` (stacked on this branch). |
| F6 | Gate 3 asks for combat music and a BULWARK-9 track. The game has **no "in combat" signal** and one shared `boss` theme for every non-final boss. | Needs engine work (see matrix). Catalog marks them `needs-engine` / `needs-hook`. |
| F7 | `music_safe_room` assumes a safe-room state. None exists. | Needs a Producer decision (candidate: standing at a sync relay). |
| F8 | UI kit asks for 1×/2×/3× exports. There is no UI atlas pipeline; three UI textures are swap-ready, the rest are code-drawn. | `docs/UI_ASSET_SPEC.md` defines one master scale (4×, like sprites) and lists the engine work (nine-slice skin layer). |
| F9 | Music master + compressed format: the runtime has no decoder policy. | `docs/audio/README.md`: OGG Vorbis runtime files, WAV masters kept out of `public/`; limits chosen for mobile memory (Producer to confirm). |
| F10 | "Footstep" and several Backtrace/enemy sounds have no game trigger (no footstep event, `enemyWindup` carries no enemy kind, no "Backtrace ready" event). | Listed per sound in the catalog as `needs-hook`; hooks are presentation-side and will be added with each audio batch. |
| F11 | Handoff says never hand-edit generated docs. | Already enforced: `tests/docs.test.ts` fails when generated docs are stale. A new ledger test fails when the delivery log claims files that are not in `public/`. |

## 3. Implemented vs still to engineer (verified in the repository)

| Area | Implemented today | Still needed |
| --- | --- | --- |
| **Pack 01 visuals (38 files)** | Whole pipeline: manifest ids, sheet planner, world-size independence, validation/assembly CLI, loader with fallbacks, renderer hooks for every one of the 38 (verified in a browser with synthetic art). All 38 are `swap-ready`. | **The art itself.** Real-device check of sharpness/performance with painted art. |
| Pipeline polish | `assets:build`, atlas, manifest merge, reports; **new:** `--pack pack-01` completeness report, `art/incoming/pack-01`, empty `public/assets/final/manifest.json`, ledger + tests. | — |
| **Music** | 11 procedural themes, cross-fade, volume; **recorded-track playback with loop regions (audio branch)**. | Layered combat music (needs an in-combat signal), per-boss theme, stingers (victory, game over, Backtrace motif), safe-room state. |
| **SFX** | 36 procedural cues mapped from game events; **recorded playback with variations, pitch variation, voice limits (audio branch)**. | Hooks for footsteps, door close, relay link, hound/drone windups, heavy hits, Backtrace charge/arrival/ready/cooldown, integrity pickup. |
| **Ambience** | **Region beds (rainline, transit, precinct) on their own channel (audio branch)**. | Randomised one-shots / atmosphere layers scheduler. |
| **UI sounds** | `menu` and `confirm` cues only. | back, pause, error, tab, slider, save, continue hooks in the UI scenes. |
| **UI visuals** | HUD cell, Backtrace icon and title emblem textures are swap-ready; touch controls, buttons, panels, dialogue, boss bar and menus are Phaser shapes/text drawn in code. | A skin layer (nine-slice panels/buttons with per-state textures, icon slots, touch-control art) with code-drawn fallback; portrait slot in the dialogue panel. |
| Tests/Android | 546+ unit and 18+ browser tests, CI incl. APK build; audio branch adds unit tests (catalog, files, validation, CLI) and 5 browser tests with synthetic audio. | UI skin tests, **device checks of decoded-audio memory and latency**. |

Details: `docs/audio/README.md`, `docs/UI_ASSET_SPEC.md`, `docs/CREATIVE_DELIVERY_LOG.md`.

## 4. Risks (not hidden)

1. **Decoded music is large.** A 120 s stereo 44.1 kHz loop decodes to ≈ 42 MB of float PCM in Web Audio. On a mid-range Android phone that matters. The runtime therefore keeps one music track and one ambience bed decoded at a time; I propose ≤ 90 s loops (stereo) and mono/22 kHz ambience. **[unverified on device]**
2. **Audio on iOS Safari/older browsers:** Ogg Vorbis support varies; the Capacitor Android WebView and Chrome decode it. Undecodable files fall back to the procedural sound by design.
3. **Looping:** Vorbis decodes sample-accurately in Chrome/Android WebView; MP3/AAC have encoder padding gaps, so they are not accepted for loops.
4. **Nothing has been generated or heard yet.** All numbers about loudness/duration are targets for the deliverer, not measurements.
