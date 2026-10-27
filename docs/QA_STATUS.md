# QA Status — NULL REQUIEM

Last updated: 2026-10-28 (Claude). Labels: **verified** (command/CI result recorded here), **inferred**, **unverified**.
Automated results below are NOT physical-device verification.

## Latest CI evidence

<!-- CI_EVIDENCE_START -->
(filled in at the end of the session — see below)
<!-- CI_EVIDENCE_END -->

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
