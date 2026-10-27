# Null Requiem — Roadmap

Principle: **don't add breadth until the current slice is stable and enjoyable.** Each milestone ends with a playtest and a go/no-go on feel.

## Current milestone — 1.5: playable Android test build (in progress)

Goal: the Producer installs the APK, taps Start, enters the game and controls the character with the touchscreen. No larger
content milestone starts until this is accepted.

Completed (automated evidence in `QA_STATUS.md`; device-unverified):
- Android debug APK pipeline (PR #3), landscape lock, APK artifact with 14-day retention.
- Tappable Title / Pause / Game-over / Victory menus (keyboard and gamepad preserved).
- Rebuilt on-screen controls: d-pad, JMP / ATK / DSH / REW (Backtrace) / TLK, pause button; multi-touch; no stuck buttons.
- NPC interact wired end to end (touch TLK and keyboard F/E).
- Regression tests (layout, tracker, tap guard, Android config) and a Playwright touch smoke test.
- Handover system: `AGENTS.md`, `docs/AI_HANDOVER.md`, `DEVLOG.md`, `QA_STATUS.md`.

Pending:
- Implement producer feedback on branch `feature/floating-touch-and-visual-pass`: floating joystick, high-DPI rendering, and illustrated neon-city backdrop.
- CI validation and fresh APK build for the new branch head.
- Producer device test: joystick feel, text readability, background art and actual Android rendering.
- A faithful match to the supplied reference still needs a dedicated hand-painted Courier/enemy/NPC sprite pack; current actors and terrain remain procedural placeholders.
- Fix any device findings; then merge PR #3 (Producer decision).

Blockers / risks: see `AI_HANDOVER.md`. Acceptance: all device-checklist rows pass on a real phone and CI is green on the merged commit.

## Milestone 1 — Vertical slice (done, merged in PR #2)
- Player controller and Backtrace
- Two enemies and three rooms
- Checkpoints, a Backtrace-gated puzzle and a secret
- Miniboss
- Title, pause, game over and victory screens
- CI and tests

## Milestone 2 — Feel pass and Backtrace depth (recommended next)
Driven by human playtest data, not new content.
- Tune `tuning.ts` from recorded playtests: jump arc, dash, enemy wind-ups, boss HP, and the Backtrace window and cooldown.
- One or two more Backtrace puzzle patterns that reuse world-state persistence. For example:
  - a pressure plate that only holds while something stands on it;
  - an enemy lured onto your echo for the arrival burst.
- Real animation frames for the Courier and enemies; keep texture keys stable.
- Debug overlay (hitboxes, state names, echo path, FPS).
- Verify gamepad on hardware; add a rebinding UI.
- Accessibility basics: toggles for screen shake, flash and rain density.

## Milestone 3 — First district
- 8–12 rooms forming one district, with a loop back to the start (shortcut doors).
- Two more enemy archetypes. Bell-shielded and ceiling-ambush concepts are on file in the asset branch.
- One more traversal ability that opens alternate routes.
- Map screen with explored-room reveal.
- Original music (ambient bed and boss theme) and recorded SFX.

## Milestone 4 — Content and polish
- Second district and boss; boss checkpoints.
- Collectibles, lore terminals, optional challenge rooms.
- Difficulty balancing, accessibility options (assist modes).

## Later
- Touch controls shipped in Milestone 1.5; later: rebinding/size/opacity options for the on-screen controls, haptics.
- Performance budget, browser compatibility matrix, bundle splitting.
- Packaging decision (web-only vs. desktop wrapper). Producer call.

## Open decisions for the Producer
- Whether to merge this PR into `main`, which moves the Godot prototype to `legacy/`.
- License.
- Healing design, and whether Backtrace should also restore dash or attack state.
