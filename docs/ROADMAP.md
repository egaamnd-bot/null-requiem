# Null Requiem — Roadmap

Principle: **don't add breadth until the current slice is stable and enjoyable.** Each milestone ends with a playtest and a go/no-go on feel.

## Milestone 1 — Vertical slice (this PR)
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
- Optional touch controls. The input layer already produces a device-agnostic `HeldInput`.
- Performance budget, browser compatibility matrix, bundle splitting.
- Packaging decision (web-only vs. desktop wrapper). Producer call.

## Open decisions for the Producer
- Whether to merge this PR into `main`, which moves the Godot prototype to `legacy/`.
- License.
- Healing design, and whether Backtrace should also restore dash or attack state.
