# DEVLOG (append-only)

Newest entries at the bottom. Never rewrite history here; add a new entry. Times are UTC.

---

## Baseline (before the handover protocol existed)

- `main` = `4cad5d6` (PR #2 merged: Milestone 1 vertical slice). Relevant commits already in `main`: `fe97104` (Task 27: NPC views,
  PANOPTIX-0 boss, fragment and glitch-strike pickups) then `1bb6878` (NPC/boss sim, mobile controls, Signal Energy, dialogue,
  PANOPTIX unit).
- PR #3 `chore/android-debug-apk-pipeline` added Capacitor config and `android-debug-apk.yml`; the last green run before this
  session was https://github.com/egaamnd-bot/null-requiem/actions/runs/40544769886 (head `ae6c4b3`). Producer reported the installed
  APK showed the title screen but tapping did nothing.

## Session 2026-10-28 — Mobile touch fix + handover protocol (Claude)

Agent: Claude (Sonnet 5.5). Branch: `chore/android-debug-apk-pipeline`. Started from `ae6c4b3`.

What was done
- Inspected the real code first (fresh clone; no `CLAUDE.md`/`AGENTS.md` existed). Confirmed the title menu had no pointer handling
  and found further touch defects (see QA_STATUS "Known bugs fixed").
- Added pure modules `touchLayout.ts`, `TouchTracker.ts`, `TapGuard.ts`, Phaser wrapper `tapTarget.ts`; rewrote
  `MobileControlsScene.ts`; made Title, pause, game-over and Victory menus tappable; added an on-screen pause button; wired interact
  to the input latch; set `input.activePointers = 4`; hid/released the overlay outside gameplay.
- Added tests (`touchLayout`, `touchTracker`, `tapGuard`, `androidConfig`) and a Playwright smoke test (`e2e/touch.spec.ts`).
- Workflow: runs Playwright smoke test before packaging, patches an immersive `MainActivity`, verifies landscape on the BUILT apk,
  pins `ubuntu-24.04`.
- Created `AGENTS.md`, `docs/AI_HANDOVER.md`, `DEVLOG.md`, `QA_STATUS.md`; updated `ROADMAP.md` and README.

Decisions
- Title taps activate on pointer-up after a pointer-down on the same item (no full-screen tap-to-start).
- Kept gamepad Y bound to both Backtrace and Interact (pre-existing); flagged, not changed.
- Browser tests run in CI only: the Claude sandbox cannot download Playwright browsers.

Commands and real results (local sandbox)
- `npm ci`: ok. `npm run typecheck`: pass. `npm test`: 12 files, 145 tests pass (baseline was 112). `npm run build`: pass.
- `npx playwright install chromium` in the sandbox: FAILED (download blocked), so `npm run test:e2e` was NOT run locally.
- Commits pushed: `c2b6335` (fix), `2980676` (CI pin + diagnostics + AGENTS.md/README). First CI run on `c2b6335`: typecheck, unit
  tests and web build passed; the Playwright browser install failed on `ubuntu-latest` (cause not readable from the sandbox);
  mitigated by pinning `ubuntu-24.04` in `2980676`.

CI outcome and artifact: see QA_STATUS "Latest CI evidence" (updated at the end of this session).

Unfinished
- Producer device test. Anything touch-related on hardware is unverified.

### Session close addendum (2026-10-28, Claude)

Further commits after `2980676`: `c37b996` (fixed my e2e helper: CDP `touchEnd` lists the points being released) and `31f1ce4`
(landscape-on-built-APK check accepts enum name or raw value and reports details). Results, all from the GitHub Actions API:
- Run on `31f1ce4`: success (push run 40583546432, PR run 40583554319, CI 40583554474). Artifact
  `null-requiem-android-debug-31f1ce477fa9450b7d2257b637dc3fbffb9d57c7` present, 14-day retention.
- Technique worth keeping: raw job logs are not downloadable from the Claude sandbox (403), so smoke-test/verification steps write their
  failure tail into `::error` annotations, readable with `gh api repos/<repo>/check-runs/<job_id>/annotations`.
- Docs-only commit follows (QA/handover/devlog updated with the above); it re-triggers CI on identical code.

Next action for the next agent: see `docs/AI_HANDOVER.md` -> "Next action".


## Session 2026-10-28 — Producer feedback: floating joystick, readability, art direction

Agent: ChatGPT. Branch: `feature/floating-touch-and-visual-pass`, based on PR #3 branch head `983e4287786a23308c73aa930b88a9ffe1c2c443`.

Requested outcomes:
- Replace the fixed movement pad with a floating joystick.
- Improve low-resolution/readability.
- Move away from the previous flat procedural look toward the supplied purple/cyan illustrated action-platformer reference.

Changes implemented:
- `src/input/touchLayout.ts`: added a lower-left floating joystick activation zone and relative direction mapping.
- `src/input/TouchTracker.ts`: each movement pointer stores its own origin/current point; supports multi-touch with action buttons.
- `src/scenes/MobileControlsScene.ts`: joystick ring appears under the initial touch and the knob follows the thumb.
- `src/main.ts`, `index.html`: remove forced pixel-art scaling and allow smooth canvas scaling.
- `src/render/textures.ts`, `src/render/RoomView.ts`: added illustrated neon-purple city/bridge background layers at 2x source resolution, plus a 2x vector-rendered Courier sprite (silver hair, magenta scarf, cyan mono-blade). `src/render/ActorViews.ts` applies a scale that preserves world proportions.
- `tests/touchTracker.test.ts`, `tests/touchLayout.test.ts`: added floating joystick regression coverage. `e2e/touch.spec.ts` now begins movement touches at a chosen lower-left origin and drags to steer, matching the new control behaviour.

Not yet verified at handover: CI for final head, Android visual rendering, actual joystick feel/readability on phone. The Courier, enemies, NPCs and terrain still use procedural placeholder art; a dedicated sprite pack is required for a faithful match to the reference. Do not overstate the art pass.

---

## Session 2026-11-02 — Full production milestone (M0–M12) (Claude, Sonnet 5.5)

Branch `milestone/full-production` (from the visual/touch pass branch). Producer directive: execute milestones 0–12 in order with
placeholder art and stable asset ids.

What was built
- M1: dynamic logical viewport (height 270, width 480–648), safe-area insets, VIEW_CHANGED; joystick over the whole left half with a
  following anchor; settings (volume, control scale/opacity, shake, flash, FPS).
- M2/M6/M8: 19 rooms in 6 regions from an ASCII RoomBuilder DSL + spawns + interactables; physics-based reachability validator
  that runs the real Player; ability gating proven (towers need Kinetic Coil); NPC registry, dialogue graph, 16 quests.
- M3/M4/M5: air jump, Glitch Strike charge, Backtrace upgrades; Street Scavenger, Heavy Enforcer, Phase Stalker, Sentry Turret,
  Null Echo + elites; `PatternBoss` framework; KILN-7, THE NULL (telefrag) alongside BULWARK-9 and PANOPTIX-0.
- M7: progression save v2 with v1 migration; scrap economy; four upgrade ladders; vendors; records and cells.
- M9: tabbed MenuScene, dialogue panel, HUD extras, procedural music per region/boss/ending, SFX cues, slide ending.
- M10: asset manifest (stable ids, texture keys, sheet planner), procedural placeholders at 2x, final-art loader
  (`public/assets/final/manifest.json`), generated Gemini spec/manifest/world map docs.
- M12: CI triggers for `milestone/**`.

Notable fixes: manifest `def()` dropped the `audio` field (found by the new manifest test); legacy actor views now normalise
scale for replaced textures; e2e menu coordinates updated for the new title/pause layouts (intentional, documented).

Not done / limits: final-art hooks for tilesets/backgrounds, extra Courier animations and audio file loading are spec-only
(`needs-engine-work`). No physical-device testing.

---

## Session 2026-11-02 (night) — Art production foundation (Claude, Sonnet 5.5)

Branch `feature/render-foundation` (from `milestone/full-production`). Producer decisions: Desert Man is a NEW NPC; implement R0 and R1; build the asset tool; then R2–R8; make the game ready for Gemini Pack 01.

- Desert Man: registry entry `desert-man` (kind `desertman`), `wanderer` placeholder silhouette, dialogue graph, `main-1` objective now `met-desert-man`, placed at alley col 7; ZERO unchanged and still talks independently. The quest is still titled *Dead Man Walking* (the Producer remembered "Desert Man Walking").
- R0: Phaser 4 has no game-level resolution, so the canvas is `logical × K` and cameras use origin (0,0) + zoom K (Phaser's own bounds clamp assumes origin 0.5, so camera bounds were removed; `CameraFollow` clamps). Pointers converted with `logicalPointer`. Measured: backing store 600×270 → 1200×540 on a 915×412 / DPR 2.625 phone profile. Software-render benchmark scales with pixels (not a phone result).
- R1: first idea (multiply per-view scales) was dropped for a central mechanism: replaced textures set `source.resolution` and the frame's `sourceSize` (Phaser 4 `realWidth` is a getter over `data.sourceSize`). Placeholders of manifest actors use the same call.
- Manifest audit fixes: relay/switch/hud cell/slash/legacy NPC/BULWARK sizes now match the game; door/plate/platform/node/emitter keys now point at the textures the views use; FX keys are dedicated (no more sharing particle textures); duplicate key owners are now a test failure; the `audio` field was never copied by `def()` (fixed earlier).
- R2–R8 and the tool: see `docs/GEMINI_PACK_01_BRIEF.md` §7 and `docs/ASSET_INTEGRATION_GUIDE.md`.
- Tests: 546 unit, 18 browser (touch, render scale, final-art world size, pixel measurement, painted layers, fallback).
- CI note: the first run of a new branch needed `feature/**` in the APK workflow triggers (added).

---

## Session 2026-11-03 — Creative handoff review, readiness and audio runtime (Claude, Sonnet 5.5)

PR #6 (`CREATIVE_PRODUCTION_HANDOFF.md`, docs only, draft) was reviewed, **not merged**. Branches (stacked): `feature/creative-readiness` (PR #7) → `feature/audio-runtime`.

- Review/gap analysis: `docs/CREATIVE_HANDOFF_REVIEW.md`. Notable findings: audio `ui_*` ids clash with visual `ui_*` ids (renamed `sfx_ui_*`); the manifest wrongly called audio `swap-ready` (no loader existed); no footstep/in-combat/safe-room/per-boss triggers exist.
- Readiness: `src/audio/catalog.ts` (contract, one entry per sound + engine status), generated `docs/audio/CATALOG.md`, `docs/CREATIVE_DELIVERY_LOG.md` + ledger tests, `docs/UI_ASSET_SPEC.md`, `art/incoming/pack-01/`, `--pack pack-01` completeness report.
- Audio runtime: `AudioBank` (optional manifest, lazy decode, release), recorded SFX in `Sfx` (variations, pitch, voices, retrigger, trims), recorded music with loop regions in `Music`, region `Ambience`; procedural audio is always the fallback. Bug found by the browser tests: music/ambience decided "nothing to play" before the manifest arrived (fixed with `manifestLoaded`/`onManifest`).
- Audio tool: `npm run audio:build` — WAV/Ogg analysis (peak, clipping, BS.1770 loudness, loop seam, silence, DC), catalog windows, sidecar loop points, optional ffmpeg encode.
- Nothing was delivered: ledger rows are all `Not delivered`; `public/assets/final/manifest.json` and `public/audio/` are empty.

---

## Session 2026-11-03 (later) — Producer decisions, audio hooks, delivery guards (Claude, Sonnet 5.5)

Branch `feature/audio-hooks-intake` (stacked on `feature/audio-runtime`, PR #9). The Producer's Android test passed; decisions recorded in `docs/audio/README.md`.

- Combat signal (audio-only) → `CombatTracker`, combat stem layered phase-aligned over exploration music. Safe-room music **blocked** (no genuine state exists; none invented). Shared boss theme kept.
- Hooks (silent until files arrive): footsteps, Backtrace arrival/cooldown/ready/motif, per-enemy windups (`enemyWindup` event gained an optional `kind`), heavy hit, door close, relay activate, integrity pickup, UI back/pause/error/tab/slider/save/continue, game-over and victory stingers.
- Observation from the browser tests: in the software renderer the simulation runs in slow motion (dt is capped), so distance-based triggers must be awaited by sim progress, not wall-clock time.
- Guards for the first real delivery: `tests/deliveredAssets.test.ts` and `e2e/deliveredArt.spec.ts` re-validate every delivered visual/audio file (zero today; proven once with a synthetic file that was then removed). `docs/INTEGRATION_RUNBOOK.md` describes the batch procedure (separate `integrate/*` branch per batch, APK for the Producer).
- Nothing creative was created or delivered.
