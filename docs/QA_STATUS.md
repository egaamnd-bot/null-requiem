# QA Status — NULL REQUIEM

Last updated: 2026-11-02 (Claude). Labels: **verified** (command/CI result recorded here), **inferred**, **unverified**.
Automated results below are NOT physical-device verification.

## Latest CI evidence — `feature/ui-skin-layer` (PR #10, top of the stack #5 → … → #10)

Code commit built and verified: **`c80f8b9723658a846624bdef7a1e219304267018`**.

| Check | Result (GitHub Actions API) |
|---|---|
| "CI" push / pull_request | **success** |
| "Android Debug APK" | **success** — https://github.com/egaamnd-bot/null-requiem/actions/runs/41562840706 |
| APK artifact | `null-requiem-android-debug-c80f8b9723658a846624bdef7a1e219304267018`, 7,233,540 bytes, expires 2026-11-17 (run page → **Artifacts**; GitHub login required) |

Previous layer `feature/audio-hooks-intake` (PR #9, `0b713b3`): CI and APK success. The APK job needed `--legacy-peer-deps` for the Capacitor install (npm arborist crash, see below).
PR #6 (docs only, ChatGPT's branch) lacks that CI fix until PR #5 is merged/rebased, so its APK check fails by itself.

## Local sandbox results (2026-11-03, tip)

- `npx tsc --noEmit` pass; `npx vitest run` **583/583**; `npm run build` pass; Playwright **26 passed, 1 skipped** (the skipped one is `e2e/deliveredArt.spec.ts`, which only runs once visual assets are delivered).
- **Unverified:** any real art/audio/UI file (none delivered); decoded-audio memory and latency on a phone; the combat stem and every `hooked` sound with real recordings.

## Local sandbox results (2026-11-03)

- `npx tsc --noEmit` pass; `npx vitest run` **571/571**; `npm run build` pass; Playwright (local Chromium, Pixel 7 landscape) **23/23** (touch 11, render scale 1, final-art 6, audio 5).
- **Unverified:** any real audio or art (none delivered); decoded-audio memory and latency on a phone; combat/safe-room/per-boss/stinger triggers (not built).

## Local sandbox results (2026-11-02)

- `npx tsc --noEmit` pass; `npx vitest run` **546/546** (34 files); `npm run build` pass; Playwright (local Chromium, Pixel 7 landscape) **18/18**: touch controls (11), render scale (1), final-art world size / pixel measurement / painted layers / fallback / Courier interact frames (6).
- Render scale measured on the production build (915×412, DPR 2.625): canvas 600×270 → **1200×540** at the default (K = 2); K = 3 → 1800×810; K = 4 → 2400×1080.
- Benchmark in headless Chromium with a **software** renderer (not a phone GPU): K = 1/2/3/4 → 18/7/3/2 fps, i.e. cost scales with pixel count. **Unverified on a real device.**
- **Unverified:** real painted art in the game (all browser tests use synthetic art); Gemini output quality; heat/battery at K ≥ 3.

## Physical-device testing required (Producer)

Settings → Render quality: compare Low / Balanced / High / Max for sharpness, frame rate and heat; check the Desert Man conversation and the
quest tracker; check touch controls still behave (joystick, buttons, pause); confirm nothing looks stretched.

## Known issues / open items

- Audio files cannot be loaded yet; portraits have no renderer slot; projectile frames show only the first frame; props exist only for Rainline; tileset has no inner-corner cells.
- GitHub job logs are not downloadable from the sandbox (read failures via check-run annotations). GitHub warns about Node 20 actions and the ubuntu-latest migration; the APK workflow pins `ubuntu-24.04`.

## Device verification status

The last device test (PR #4 build) passed per the Producer. **No device test of this branch exists yet.**

---

Older QA history follows.

## Local sandbox results (2026-11-02)

- `npx tsc --noEmit`: pass. `npx vitest run`: **498/498 tests, 27 files** (viewport, settings, touch layout/tracker, enemy roster,
  abilities, progression v1→v2 migration, interactables, quests/dialogue, pattern bosses, reachability calibration, campaign
  data + physics reachability + ability gating, headless campaign playthrough, menu model, music, generated-docs freshness, manifest).
- `npm run build`: pass. Playwright touch smoke (local Chromium, Pixel 7 landscape): 11/11.
- **Unverified:** the headless playthrough drives scripted inputs and world APIs, not a human; difficulty, length and feel are
  unmeasured. The final-art swap path (`public/assets/final/manifest.json`) is unit-planned (`planSheet`) but has **not** been
  exercised in a browser with real files.

## Physical-device testing required (Producer)

Joystick feel anywhere in the left half, view fit on your phone (notch/safe areas), HUD readability, dialogue panel taps, menu
taps (map/journal/gear/settings/vendor), audio on Android, sustained performance, battery/thermals, and boss fairness.
Use `docs/PLAYTEST_CHECKLIST.md`.

## Known issues / open items

- Tileset/background and extra Courier animation art hooks are `needs-engine-work`; audio files are not loadable yet.
- GitHub job logs are not downloadable from the sandbox; failures are read via check-run annotations.
- GitHub Actions warns about Node 20 actions and the ubuntu-latest migration; the APK workflow pins `ubuntu-24.04`.

## Device verification status — **NOT DONE**

No physical-device result exists. Nothing in this file may be read as device verification.

---

Older (pre-milestone) QA history follows.

## Local sandbox results (2026-10-28, Claude)

| Command | Result |
|---|---|
| `npm ci` | ok |
| `npm run typecheck` | pass (includes `src`, `tests`, `e2e`, configs) |
| `npm test` | 12 files, **145 tests pass** (baseline 112 + 33 new) |
| `npm run build` | pass |
| `npm run test:e2e` | **not run locally** — Playwright browser download is blocked in the sandbox; runs in GitHub Actions only |

## Regression coverage for the mobile input bugs

| Area | Where | Covers |
|---|---|---|
| Layout in view, no overlaps, thumb-size hit areas, Backtrace on screen | `tests/touchLayout.test.ts` | Backtrace button was laid out below the view |
| Hit-testing, d-pad directions/deadzone/reach, pause is tap-only | `tests/touchLayout.test.ts` | |
| Multi-touch, per-finger release, slide, releaseAll/cancel | `tests/touchTracker.test.ts` | stuck buttons |
| Virtual button -> `HeldInput` action mapping, merge with physical input, clear | `tests/touchTracker.test.ts` | |
| Tap semantics (down+up same pointer, once only, second pointer ignored, slide-off cancels) | `tests/tapGuard.test.ts` | double-start from repeated/multi-pointer events |
| Workflow: landscape check on built APK, artifact name/retention, step order, web shell touch CSS | `tests/androidConfig.test.ts` | |
| Browser (Chromium, Pixel 7 landscape, real touch events via CDP): tap Start; background tap ignored; double tap starts one game; multi-touch move+jump; attack/dash/backtrace/talk reachable; touchcancel releases; pause button, Resume, Quit to title; controls overlay inactive behind menus; relaunch after quit | `e2e/touch.spec.ts` (CI only) | |

Not covered by any automated test: Phaser scene rendering details, audio, gamepad hardware, real Android WebView behaviour,
NPC dialogue text display, performance.

## Known bugs fixed on this branch (all device-unverified)

1. Menus (title, pause, game over, victory) had no pointer handling.
2. Phaser allowed a single touch pointer, so move + jump could not be held together (`activePointers` was 1).
3. Backtrace (REW) button was positioned at y=319 on a 270 px view, i.e. unreachable.
4. TLK button never reached the simulation (`InputLatch.pressInteract` never called); keyboard F/E interact was dead as well.
5. `MobileControlsScene` kept stale button objects after a relaunch and its `shutdown()` hook never ran, so a second playthrough could
   throw on touch and buttons could stay stuck.
6. No touch way to pause; touch controls could stay live behind the pause/game-over menus.

## Known issues / open items

- Gamepad button 3 (Y) is bound to both Backtrace and Interact (`config/controls.ts`). Pre-existing; unchanged.
- Android immersive/cutout presentation is inferred from code only. `MainActivity.java` is generated and compiled only in CI.
- Gamepad, audio unlock on Android, and frame rate on a real phone are unverified.
- Actions warn that `checkout@v4`, `setup-node@v4`, `setup-java@v4`, `upload-artifact@v4` run on forced Node 24; consider bumping.
- README previously claimed menus were "browser-smoke-tested"; no browser test existed before this branch.

## Android packaging status

- Workflow: `.github/workflows/android-debug-apk.yml` (pinned `ubuntu-24.04`). Artifact `null-requiem-android-debug-<commit-sha>`, 14-day retention.
- The built APK's manifest is checked with `apkanalyzer manifest print` for `android:screenOrientation="landscape"`.
- Debug-signed test APK only; not a store release.

## Producer feedback — current visual/touch pass

Feedback: fixed left joystick is uncomfortable; game is too low-resolution; existing style does not match the supplied reference (colorful purple/magenta atmospheric city, bright cyan/green lights, dramatic industrial bridges, illustrated action-platformer art).

Implementation branch: `feature/floating-touch-and-visual-pass` (based on PR #3 head `983e4287786a23308c73aa930b88a9ffe1c2c443`).

Changes on this branch:
- Floating joystick: anchor at the first touch anywhere in the lower-left movement zone, track thumb movement, clamp the visible knob, preserve independent action-button fingers.
- Added unit tests for dynamic anchor, directional movement, release, and multi-touch; updated Playwright touch smoke tests to drag from a floating joystick origin instead of pressing the old fixed-pad coordinates.
- Removed forced pixel-art mode and nearest-neighbour canvas CSS; the new backdrop and Courier art use 2x source textures and text retains high-resolution text textures.
- Replaced flat block skyline textures with high-resolution procedural illustrated skyline, moon/haze, windows, rain, luminous cables, elevated rails and curved industrial bridge ribs.

Validation: CI steps on code commit `3bd60098c9318a127d61e330ec37ecf15aa04cbe` completed typecheck, unit tests (12 files / 148 tests) and production build successfully; the overall run was cancelled by a newer commit after those steps completed. Run: https://github.com/egaamnd-bot/null-requiem/actions/runs/40586029025. A fresh Android APK run for the updated PR branch and the physical-device test are still pending. Do not claim readability, performance, touch feel, or final art direction is verified until the Producer tests the new APK. Important art limitation: Courier/enemy/NPC/terrain textures are still procedural placeholder art; the new backdrop is a direction-setting pass, not a complete hand-painted asset pack.

## Device verification status — **NOT DONE**

Producer to test on a real Android phone and mark each row. Until every row passes, do not claim mobile input is fixed.

| # | Check | Result |
|---|---|---|
| 1 | Install APK; app launches as "NULL REQUIEM" in landscape | |
| 2 | Tap "Start" on the title screen enters the game (single start, no double fade) | |
| 3 | Tap on empty title background does nothing | |
| 4 | After quitting and reopening: "Continue" and "New Run" both tappable | |
| 5 | D-pad moves left/right; up/down aim | |
| 6 | Jump (hold for height), Attack, Dash | |
| 7 | Two or three fingers at once (move + jump + attack) | |
| 8 | Backtrace (REW) after the module is picked up | |
| 9 | TLK next to an NPC starts and advances dialogue | |
| 10 | Pause button; Resume; Resync at last relay; Quit to title all tappable | |
| 11 | Game over: both buttons tappable | |
| 12 | Victory: Return to title tappable | |
| 13 | Home button / app switch while holding a button: no stuck input on return | |
| 14 | Game fills the screen (no browser chrome, notch/cutout not covering controls) | |
| 15 | Audio plays after first tap; no obvious frame-rate problems | |

## `feature/visual-enhancement` (visual pass) — local evidence 2026-11-03

- Verified locally: `npx tsc --noEmit` clean; `npx vitest run` 583/583; `npm run build`; Playwright 26 passed, 1 skipped (delivered-art, no assets).
- Verified: before/after screenshots in `docs/screenshots/` (software renderer, Pixel 7 landscape).
- Unverified: frame rate/battery on a phone with the added particles; CI/APK for this branch (see PR once run).
- CI evidence for `e86a079` (PR #11): "CI" push run 41591921135 and PR run 41591938273 **success**; "Android Debug APK" run 41591921097 **success**, artifact `null-requiem-android-debug-e86a079511307f5df06105c068c60daa619a2757` (7,243,729 bytes, expires 2026-11-17). Device test: pending Producer.
