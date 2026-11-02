# Null Requiem — Roadmap

Principle: **don't add breadth until the current slice is stable and enjoyable.** Each milestone ends with a playtest and a go/no-go on feel.

## Current: Full-production milestone (M0–M12) — branch `milestone/full-production`, PR open, not merged

Done on the branch (automated evidence in `QA_STATUS.md`): viewport + floating joystick (M1), 19-room interconnected world (M2),
movement/combat (M3), enemy roster (M4), boss framework + 4 bosses (M5), NPCs/dialogue/quests/story (M6), progression/upgrades/
collectibles/save v2 (M7), environmental puzzles (M8), UI/audio/feel (M9), asset manifest + placeholders + docs (M10), campaign
docs (M11), CI + APK (M12).

Pending:
- Producer device playtest (feel, safe areas, performance, difficulty, length).
- Final art (Gemini packs 01–07) and engine hooks for tilesets/backgrounds/extra Courier animations/audio files.
- Balance pass from real play data.

Next candidates (Producer to choose): content polish pass, accessibility options, localisation, controller testing, Steam/Play packaging.

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
