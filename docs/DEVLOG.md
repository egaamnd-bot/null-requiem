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
