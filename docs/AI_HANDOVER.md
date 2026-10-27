# AI Handover — NULL REQUIEM

Canonical current state for the next AI developer. Read this first, then `docs/DEVLOG.md` (latest entries), `docs/ROADMAP.md`
and `docs/QA_STATUS.md`. **Verify against the real repo before trusting anything here** (`git status`, `git log`, open PRs, CI).

Claim labels: **[verified]** = checked with a command/CI result recorded in `QA_STATUS.md`; **[inferred]** = deduced from code or
docs, not executed; **[unverified]** = not checked.

## Project identity

- Project: NULL REQUIEM. Repo: https://github.com/egaamnd-bot/null-requiem
- Concept: original 2D side-scrolling urban-cyberpunk action Metroidvania. The Courier can **Backtrace** (personal rewind: snap
  back to where they stood 4 s ago; the world is not rewound). Producer: Muhammad Ega. Lead engineer role: Claude. Backup: ChatGPT.
- Target platforms: browser (GitHub Pages / any static host) and an installable **Android debug APK** for phone testing
  (landscape, touch controls).
- Stack: Phaser 4.2.1, TypeScript 5.9, Vite 8, Vitest 5 (unit), Playwright 1.56.1 (browser smoke), Capacitor 7.4.3 (Android
  wrapper, installed only inside the Android workflow with `--no-save`). Node 22.12+.

## Current verified state

- Current milestone: **Milestone 1.5 — playable Android test build** (touch input fix). Milestone 1 (vertical slice) is merged.
- `main`: `4cad5d6` (merge of PR #2, vertical slice) [verified via `git log` on the fresh clone].
- Active branch: `chore/android-debug-apk-pipeline` = PR #3 "Add Android debug APK build pipeline" (open). Head SHA, CI run URLs and
  APK artifact are recorded in **QA_STATUS.md → "Latest CI evidence"** and in the last DEVLOG entry.
- Note: the Task-27 commit `fe97104` is the parent of `1bb6878`; both are already in `main` [verified]. Older prompts list them in
  the opposite order.
- Working (automated evidence only, see QA_STATUS): simulation, three rooms, enemies, miniboss, Backtrace, save/continue; title,
  pause, game-over and victory menus are now tappable; on-screen controls (d-pad, JMP/ATK/DSH/REW/TLK, pause button) with
  multi-touch; NPC interact works from keyboard F/E and the touch TLK button.
- Not verified on a physical phone: **everything touch-related** (the Producer has not yet tested the new APK) [unverified].

## Architecture map

- `src/core/` engine-agnostic fixed-step (120 Hz) simulation, no Phaser imports (`world.ts`, `player.ts`, `backtrace.ts`,
  `input.ts` = `HeldInput` + `InputLatch`, `npc.ts`, `flow.ts`).
- `src/scenes/` Boot, Title, Game, UI (HUD + pause menu + game-over), Victory, MobileControls (touch overlay), `session.ts`.
- **Input** (`src/input/`):
  - `InputManager.ts` keyboard + gamepad (+ virtual buttons OR'd in `held()`; virtual `interact` feeds `justPressed('interact')`).
  - `virtualButtons.ts` shared mutable virtual state, `mergeHeld`, `clearVirtualButtons`.
  - `touchLayout.ts` pure geometry for the on-screen controls (480x270 reference view, scaled); `TouchTracker.ts` multi-touch
    pointer bookkeeping; `TapGuard.ts` pure tap semantics; `tapTarget.ts` Phaser zone wrapper used by all menus.
  - `MobileControlsScene.ts` draws/handles the overlay. It is launched by `GameScene` with `{isActive, onPause}`; it is only live
    while `world.flow.state === 'playing'` and not transitioning; it hides and releases everything otherwise.
- Phaser config in `src/main.ts`: FIT scaling, `input.activePointers = 4` (Phaser's default allows only ONE touch).
- Save/progression: `src/state/LocalSaveStore.ts` (localStorage) + `src/core/progression.ts`.
- Assets: procedural textures in `src/render/textures.ts` (stable texture keys), synthesized SFX in `src/audio/Sfx.ts`. Gemini asset
  packs live on branch `assets/pack-01` (not merged).
- Build/Android: `.github/workflows/android-debug-apk.yml` (typecheck -> unit tests -> web build -> Playwright smoke ->
  Capacitor `cap add android` -> landscape manifest patch -> immersive `MainActivity` patch -> `assembleDebug` -> verify landscape
  on the BUILT apk with `apkanalyzer` -> upload artifact `null-requiem-android-debug-<sha>`, 14-day retention). `ci.yml` and
  `pages.yml` are separate. The `android/` folder is generated in CI and is not committed.

## Technical decisions and constraints

- Gameplay stays in `src/core`; Phaser is presentation only. Do not add Phaser imports to `src/core`.
- Touch geometry/state logic must stay in the pure modules so it is unit-testable in Node (Vitest env is `node`).
- Menus use `createTapTarget`: activation on pointer-UP over the item after pointer-DOWN on the same item, one pointer owns a
  press, fires once. Do not make "tap anywhere" start the game.
- `shutdown()` methods on Phaser scenes are NOT called by Phaser. Clean up via `this.events.once(Phaser.Scenes.Events.SHUTDOWN, ...)`.
  Scene instances are reused across restarts, so reset arrays/maps in `init()`.
- Android orientation is locked by patching the first `<activity>` in the generated manifest; it is verified on the built APK.
- Rejected: full-screen tap-to-start (violates producer requirement); Playwright browsers cannot be downloaded in the Claude
  sandbox, so browser tests run only in GitHub Actions.
- Known compatibility issues: gamepad button 3 (Y) is bound to both Backtrace and Interact in `config/controls.ts` (pre-existing,
  not changed). Gamepad still unverified on hardware. `ubuntu-latest` began migrating to Ubuntu 26 on 2026-10-19; the workflow pins
  `ubuntu-24.04`. GitHub warns that `checkout@v4`, `setup-node@v4`, `setup-java@v4`, `upload-artifact@v4` run on forced Node 24.

## Current blockers and risks

- Root cause of the original bug [verified by code inspection, not yet by device]: title/pause/game-over/victory menus read only
  keyboard/gamepad; there were no pointer handlers anywhere in `TitleScene`.
- Other defects found in the old touch layer (all fixed on this branch, device-unverified): single touch pointer; Backtrace button
  laid out below the 270 px view (y=319); TLK button never reached the simulation (`InputLatch.pressInteract` was never called, so
  keyboard F/E were dead too); stale buttons after relaunch (scene `shutdown()` hook never ran); no touch way to pause or to use
  pause/game-over menus.
- Risks: immersive `MainActivity.java` is generated by a workflow step and compiled only in CI; if Gradle fails, remove that step
  rather than weakening anything else. Safe-area/cutout behaviour is inferred (FIT letterboxing keeps controls inside a 16:9 area).
- GitHub job logs cannot be downloaded from the Claude sandbox (blob host returns 403); the workflow's smoke-test steps emit the
  failure tail as an annotation readable through `gh api repos/.../check-runs/<job_id>/annotations`.

## Next action (for ChatGPT or Claude)

**Close the loop on device feedback for PR #3.**

1. Inspect: PR #3 head SHA, latest "Android Debug APK" run (QA_STATUS has the URL), and the device checklist in `QA_STATUS.md`.
2. If CI is red, fix the failing step first (read annotations as described above). If green, ask the Producer to install the artifact
   and fill the device checklist.
3. For each failed device item, reproduce with a regression test where possible (pure modules in `tests/`, flows in `e2e/touch.spec.ts`)
   and fix it in small commits on this branch.
4. Expected outcome: Producer can install the APK, tap Start, move/jump/attack/dash/rewind/talk/pause on the touchscreen.
5. Acceptance: CI green on the final commit (typecheck, unit tests, Playwright, APK build, built-APK landscape check, artifact present);
   every row of the device checklist marked pass by the Producer; docs updated; only then propose merging PR #3. Do not start Milestone 2
   content before that.

## Handover verification

- See the final DEVLOG entry for the UTC time, agent, branch, HEAD SHA and command results. Explicitly unverified: all physical-device
  behaviour, gamepad hardware, audio on Android, performance on device, and the immersive-mode/cutout presentation.
