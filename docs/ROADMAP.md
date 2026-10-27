# Emberveil — Roadmap

Principle: **don't add breadth until the current slice is stable and enjoyable.** Each milestone ends with a playtest and a go/no-go on feel.

## Milestone 1 — Vertical slice (this PR)
Player controller, two enemies, three rooms, checkpoint, ability gate, secret, miniboss, title/pause/game over/victory, CI, tests.

## Milestone 2 — Feel pass (recommended next)
Driven by human playtest data, not new content.
- Tune `tuning.ts` from recorded playtests: jump arc, dash distance, enemy wind-ups, boss HP and punish windows.
- Real animation frames for the Kindler (run cycle, attack smear, land) and enemies; keep texture keys stable.
- A small debug overlay (hitboxes, state names, FPS) toggled with a key.
- Healing resource (design decision needed: on-hit charge vs. lantern-only).
- Verify gamepad on hardware; add rebinding UI.
- Accessibility basics: reduced screen shake/flash toggles.

## Milestone 3 — First real area
- 8–12 rooms forming one biome with a loop back to the start (shortcut doors).
- Two more enemy archetypes; one more ability that opens alternate routes.
- Map screen with explored-room reveal; save multiple checkpoints.
- Original music (ambient bed + boss theme) and recorded SFX.

## Milestone 4 — Content and polish
- Second biome and boss; boss checkpoints (respawn outside the arena).
- Collectibles, lore tablets, optional challenge rooms.
- Difficulty balancing, accessibility options (assist modes).

## Later
- Optional touch controls (the input layer already produces a device-agnostic `HeldInput`).
- Performance budget and browser compatibility matrix; bundle splitting.
- Packaging decision (web-only vs. desktop wrapper) — Producer call.

## Open decisions for the Producer
- Repository visibility (affects free GitHub Pages hosting).
- License.
- Healing design, and whether pogo should extend to hazards later (it is currently disabled to protect the ability gate).
