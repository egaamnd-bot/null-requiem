# Emberveil

An original 2D action-adventure Metroidvania about a hooded wanderer — the Kindler — descending through ember-lit caverns beneath a veil of ash. Built with **Phaser 4.2.1**, **TypeScript**, and **Vite**.

This branch contains **Milestone 1: a playable vertical slice** — three connected rooms, two enemy archetypes, an ability-gated route, a secret, checkpoints, and a miniboss.

## Quick start

Requires Node.js 22.12+ (see `.nvmrc`).

```bash
npm ci            # install exact locked dependencies
npm run dev       # play at http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm run typecheck` | Strict TypeScript check (`tsc --noEmit`) |
| `npm test` | Vitest unit + simulation tests |
| `npm run build` | Typecheck, then production build into `dist/` |
| `npm run preview` | Serve the production build at http://localhost:4173 |

The build uses relative paths, so `dist/` can be served from any static host. It needs a web server (not `file://`), e.g. `npm run preview` or `npx serve dist`.

**CI build artifact:** every CI run uploads the playable build as `emberveil-build-<sha>`. Download it from the run page, unzip, then `npx serve .` inside the folder.

## Controls

| Action | Keyboard | Gamepad (standard mapping) |
|---|---|---|
| Move | A / D or ← / → | Left stick / D-pad |
| Jump (hold for height) | Space or Z | A / Cross |
| Strike | J or X | X / Square |
| Aim strike up / down (down only in air) | W / S or ↑ / ↓ | Stick / D-pad |
| Drop through ledge | ↓ + Jump | Down + A |
| Veilstep dash (once unlocked) | K, C or Shift | B / Circle, RB, RT |
| Pause | Esc or P | Start |
| Mute | M | — |

All bindings live in [`src/config/controls.ts`](src/config/controls.ts).

## What's in the slice

1. **Ashfall Hollow** — learn movement and striking against Ashgrubs; kindle the first Hearth Lantern (checkpoint). A cracked wall near the start hides a **Heartcoal** (+1 max ember).
2. **Lantern Gallery** — climb ledges past Lantern Wisps to the **Veilstep shrine**. The lower corridor is cut by an ember pit too wide to jump; Veilstep (dash) is required to cross. A second lantern waits beyond.
3. **Cinder Sanctum** — the gate seals and **the Kiln Warden** wakes: charge (stuns itself on the wall), leap slam with shockwaves, and below half health, telegraphed ember rain. Defeat it to finish the slice.

## Project structure

```
src/
  config/       tuning.ts (all gameplay numbers), controls.ts (bindings)
  core/         engine-agnostic simulation — no Phaser imports
    world.ts      GameWorld: rooms, doors, checkpoints, hazards, combat resolution, progression
    player.ts     movement + combat state machine
    body.ts       tile collision (axis-separated AABB, one-way ledges, corner correction)
    enemies/      Ashgrub, LanternWisp, KilnWarden (+ shared Enemy base)
    flow.ts       title / playing / paused / dying / gameover / victory state machine
    fixedStep.ts, input.ts, camera.ts, health.ts, combat.ts, progression.ts, ...
  world/        room data (ASCII layouts) and room types
  render/       Phaser views: procedural textures, room, actors, FX
  scenes/       Boot, Title, Game, UI (HUD/pause/game over), Victory
  input/        keyboard + gamepad → bindings
  audio/        synthesized placeholder SFX (Web Audio)
  state/        localStorage save slot
tests/          Vitest suites (run headless in Node)
docs/           game design, roadmap, playtest checklist
```

### Architecture in one paragraph

Gameplay is a deterministic simulation in `src/core`, stepped at a fixed **120 Hz** regardless of display refresh rate, with input latched so every press reaches exactly one step. Phaser is the presentation shell: it samples input, advances the simulation, and renders interpolated state. The simulation emits events (`hit`, `playerLand`, `bossSlam`, ...) that drive particles, hit-stop, camera shake, audio and HUD toasts — it never calls rendering or audio code. That split is what lets the tests prove movement, collision, combat and progression rules without a browser.

### Replacing placeholder art and audio

All art is generated at boot by original drawing code in `src/render/textures.ts`; every texture has a stable key (`player-run0`, `ashgrub-windup`, `warden-stunned`, ...). Load a sprite sheet under the same key in `BootScene` and the views keep working. Sounds are addressed by cue name in `src/audio/Sfx.ts`; swap a cue's synth for a loaded sample without touching gameplay.

## Status

| Area | State |
|---|---|
| Player controller (accel/decel, variable jump, coyote, buffer, drop-through, dash, 3-direction strike, pogo, knockback, i-frames) | Done, unit-tested |
| Enemies (Ashgrub melee, Lantern Wisp ranged) | Done, unit-tested |
| Miniboss (3 patterns, phase 2, victory) | Done, unit-tested |
| Rooms, doors, checkpoint, hazard respawn, ability gate, secret | Done, tested in simulation |
| Title, pause, HUD, game over, victory | Done, browser-smoke-tested |
| Save/continue (localStorage) | Done |
| Gamepad | Implemented, **not verified on hardware** |

See [`docs/PLAYTEST_CHECKLIST.md`](docs/PLAYTEST_CHECKLIST.md) for manual verification.

## Known limitations

- **Feel is first-pass.** Numbers in `tuning.ts` are reasoned starting points, verified for correctness by tests, not tuned by human playtesting yet.
- **Placeholder presentation.** One drawn frame per pose (no animation sheets), synthesized SFX, no music.
- **No in-game rebinding UI** — remap in `src/config/controls.ts`.
- **WebGL required.** Phaser 4's Canvas renderer is deprecated and untested here.
- **Saves** happen at lanterns, the shrine, the Heartcoal and on boss defeat; finishing the slice clears the save.
- **Bundle size** is ~1.5 MB (mostly Phaser), unsplit.
- **No license chosen yet** — all code and art here is original to this project.
