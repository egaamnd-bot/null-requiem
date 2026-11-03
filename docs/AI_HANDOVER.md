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

## Current state (2026-11-03) — stack of PRs, none merged

`main` ← #4 `milestone/full-production` ← #5 `feature/render-foundation` ← #6 `creative/pack-01-production` (ChatGPT's handoff, docs only) ← #7 `feature/creative-readiness` ← **#8 `feature/audio-runtime`** (tip).

- **Roles:** Producer approves; ChatGPT is Creative Director / asset producer and delivers validated batches; Claude owns engine integration, tests and Android verification.
- **Nothing creative has been delivered.** `docs/CREATIVE_DELIVERY_LOG.md` lists all 38 Pack 01 files and 55 sounds as `Not delivered`; `public/assets/final/manifest.json` and `public/audio/` are empty. A test keeps the ledger honest.
- Visuals: pipeline complete (PR #5); `npm run assets:validate:pack01` / `assets:build:pack01`; intake folder `art/incoming/pack-01/`.
- Audio: contract `src/audio/catalog.ts` (+ generated `docs/audio/CATALOG.md`); runtime for recorded SFX/music/ambience with procedural fallback; `npm run audio:validate|audio:build`; intake `art/incoming/audio/`. Details: `docs/audio/README.md`.
- UI: not started on the engine side (only spec): `docs/UI_ASSET_SPEC.md` §4 lists the skin layer to build when the first UI batch arrives.
- Review of PR #6 and the implemented-vs-missing matrix: `docs/CREATIVE_HANDOFF_REVIEW.md`.
- CI: APK job needed `--legacy-peer-deps` for the Capacitor install (see QA_STATUS); the creative branch needs a rebase on #5 to get it.

## Architecture map

- `src/core/` engine-agnostic fixed-step (120 Hz) simulation, no Phaser imports (`world.ts`, `player.ts`, `backtrace.ts`,
  `input.ts` = `HeldInput` + `InputLatch`, `npc.ts`, `flow.ts`).
- `src/assets/` manifest + `sheet.ts` (planSheet/planWorldSize) + `validate.ts` (pure delivery validation) + `autotile.ts`; `tools/assets/build.ts` CLI. `src/core/renderScale.ts` + `src/render/renderScaleRuntime.ts` (R0). `src/render/{fxSprites,courierAnim,tileset}.ts`.
- `src/scenes/` Boot, Title, Game, UI (HUD, dialogue panel, pause, game-over), Menu (tabbed overlay), Victory (slides), MobileControls, `session.ts`.
- `src/world/` room data (`rooms/*.ts` via the `RoomBuilder` DSL), NPCs, dialogues, quests, items, regions, `reach.ts` (physics reachability validator). `src/assets/` manifest + sheet planner. `src/audio/` procedural music/SFX. `src/ui/menuModel.ts` pure menu view-models.
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

## Next action

1. Producer: review PR #6 + #7 (+ #8); tell ChatGPT the id decisions (`sfx_ui_*`), the audio format rules and the Gate order. Merge order #4 → #5 → #6 → #7 → #8.
2. First delivery (Gate 1): Courier + one environment asset into `art/incoming/pack-01/` → `npm run assets:validate:pack01` → fix/build → ledger → browser test → phone check.
3. Audio batch: files into `art/incoming/audio/` → `npm run audio:validate`/`audio:build`; implement the `needs-hook` triggers that batch needs (footsteps, door close, UI back/tab…), keep gameplay untouched.
4. Engine work awaiting a Producer decision: in-combat signal (combat music), per-boss theme, safe-room definition, stingers (victory/game over/Backtrace motif), atmosphere one-shot scheduler, UI skin layer + portrait slot.
5. Device checks: decoded-audio memory/latency, Render quality at 2×/3×/4× with painted art.

## Handover verification

- Completed 2026-10-28 (UTC evening of the 27th into the 28th in the sandbox; Producer timezone Asia/Jakarta) by Claude (Sonnet 5.5).
- Branch `chore/android-debug-apk-pipeline`; code commit `31f1ce4` (CI green); docs-only commit(s) on top. Working tree clean after push.
- Results: local `npm run typecheck` pass, `npm test` 145/145, `npm run build` pass; CI (Actions API): Playwright touch smoke, APK build,
  built-APK landscape check, artifact upload all success. See QA_STATUS for URLs.
- Explicitly unverified: all physical-device behaviour (touch feel, gamepad, audio on Android, performance), the immersive-mode/cutout
  presentation on real hardware, and per-test Playwright counts (retries=1 in CI).
