# Null Requiem

An original 2D urban-cyberpunk action Metroidvania. You play the Courier, a runner in a rain-soaked city who can **Backtrace**: snap back to where they stood four seconds ago, undoing damage taken since, while the world keeps moving. Built with **Phaser 4.2.1**, **TypeScript** and **Vite**.

This branch contains **Milestone 1: a playable vertical slice**. It has three connected rooms, two enemy archetypes, a Backtrace-gated puzzle route, a secret, checkpoints and a miniboss.

> The earlier Godot 4 top-down arena prototype is preserved in [`legacy/godot-prototype/`](legacy/godot-prototype/) for reference.

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
| `npm test` | Vitest unit and simulation tests |
| `npm run build` | Typecheck, then production build into `dist/` |
| `npm run preview` | Serve the production build at http://localhost:4173 |

The build uses relative paths, so `dist/` can be served from any static host. It needs a web server, not `file://`; use `npm run preview` or `npx serve dist`.

**CI build artifact:** every CI run uploads the playable build as `null-requiem-build-<sha>`. Download it from the run page, unzip it, then run `npx serve .` inside the folder.

## Controls

| Action | Keyboard | Gamepad (standard mapping) |
|---|---|---|
| Move | A / D or Left / Right | Left stick / D-pad |
| Jump (hold for height) | Space or Z | A / Cross |
| Strike | J or X | X / Square |
| Aim strike up / down (down only in air) | W / S or Up / Down | Stick / D-pad |
| Drop through catwalk | Down + Jump | Down + A |
| Dash | K, C or Shift | B / Circle, RB, RT |
| **Backtrace** (once found) | L, V or Q | Y / Triangle, LB, LT |
| Pause | Esc or P | Start |
| Mute | M | — |

All bindings live in [`src/config/controls.ts`](src/config/controls.ts).

## Backtrace

- A cyan **echo** of the Courier trails 4 seconds behind them. It is drawn exactly where Backtrace will send you.
- Triggering it snaps you to the echo and restores health lost since then. It never lowers your health.
- Arrival grants 0.45s of invulnerability and releases a 2-damage burst.
- Cooldown is 6 seconds.
- **The world is not rewound.** Enemies, switches and gates keep their current state. That is what makes Backtrace a puzzle tool as well as a combat escape.
- If the world has changed under the echo (for example, a gate closed there), you land at the oldest spot you can still occupy.

## What's in the slice

1. **Rainline Alley** — learn movement and striking against Scrap Hounds. Link the first Sync Relay (checkpoint). A cracked wall near the start hides an **Integrity Cell** (+1 max integrity).
2. **Transit Stacks** — climb catwalks past Watcher Drones to the **Backtrace module**. Cross the live-current pit with a jump and a dash. Beyond the second relay, a security gate opens for **1 second** when its override switch is struck. The fastest possible sprint from the switch takes 1.78s, so the solution is to stand at the gate, run back, strike the switch and Backtrace to the gate.
3. **Precinct Vault** — the shutter seals and **BULWARK-9** activates. Its attacks:
   - a charge, which stuns it when it hits a wall;
   - a leap slam that sends shockwaves along the floor;
   - below half health, telegraphed plasma rain.

## Project structure

```
src/
  config/       tuning.ts (all gameplay numbers), controls.ts (bindings)
  core/         engine-agnostic simulation — no Phaser imports
    world.ts      GameWorld: rooms, doors, checkpoints, hazards, combat, switch/gate, progression
    backtrace.ts  echo ring buffer and target selection
    player.ts     movement and combat state machine
    body.ts       tile collision (axis-separated AABB, one-way catwalks, corner correction)
    enemies/      ScrapHound, WatcherDrone, BulwarkUnit (+ shared Enemy base)
    flow.ts       title / playing / paused / dying / gameover / victory state machine
  world/        room data (ASCII layouts) and room types
  render/       Phaser views: procedural textures, rooms, actors, echo, FX
  scenes/       Boot, Title, Game, UI (HUD/pause/game over), Victory
  input/        keyboard + gamepad → bindings
  audio/        synthesized placeholder SFX (Web Audio)
  state/        localStorage save slot
tests/          Vitest suites (run headless in Node)
docs/           game design, roadmap, playtest checklist
legacy/         the earlier Godot prototype (reference only)
```

### Architecture in one paragraph

Gameplay is a deterministic simulation in `src/core`, stepped at a fixed **120 Hz** whatever the display refresh rate. Input is latched so every press reaches exactly one step. Phaser is the presentation shell: it samples input, advances the simulation, and renders interpolated state. The simulation emits events (`hit`, `backtrace`, `switchHit`, `bossSlam`, ...) that drive particles, hit-stop, camera shake, audio and HUD toasts; it never calls rendering or audio code. Because of that split, the tests can prove movement, collision, combat, Backtrace and progression rules without a browser. The fixed step is also what makes Backtrace exact: it records one sample per step.

### Replacing placeholder art and audio

All art is generated at boot by original drawing code in `src/render/textures.ts`. Every texture has a stable key (`player-run0`, `hound-windup`, `bulwark-stunned`, ...). Load a sprite sheet under the same key in `BootScene` and the views keep working. Sounds are addressed by cue name in `src/audio/Sfx.ts`.

## Status

| Area | State |
|---|---|
| Player controller (accel/decel, variable jump, coyote, buffer, drop-through, dash, 3-direction strike, pogo, knockback, i-frames) | Done, unit-tested |
| Backtrace (echo, snap-back, health restore, burst, cooldown, blocked-spot handling) | Done, unit-tested |
| Enemies (Scrap Hound melee, Watcher Drone ranged) | Done, unit-tested |
| Miniboss (3 patterns, phase 2, victory) | Done, unit-tested |
| Rooms, doors, checkpoints, hazard respawn, switch + timed gate, secret | Done, tested in simulation |
| Title, pause, HUD, game over, victory | Done, browser-smoke-tested |
| Save/continue (localStorage) | Done |
| Gamepad | Implemented, **not verified on hardware** |

See [`docs/PLAYTEST_CHECKLIST.md`](docs/PLAYTEST_CHECKLIST.md) for manual verification.

## Known limitations

- **Feel is first-pass.** The numbers in `tuning.ts` are tested for correctness but haven't been tuned by human playtesting yet.
- **Placeholder presentation.** There is one drawn frame per pose, SFX are synthesized, and there is no music.
- **No in-game rebinding UI.** Remap in `src/config/controls.ts`.
- **WebGL required.** Phaser 4's Canvas renderer is deprecated and untested here.
- Finishing the slice clears the save.
- **Bundle size** is about 1.5 MB, mostly Phaser, and isn't split.
- **No license chosen yet.** All code and art here is original to this project.


## Android phone testing

The project can be packaged as an installable **Android debug APK** using GitHub Actions. The APK is for testing, not a Play Store release.

### Build and download

1. Open the repository's **Actions** tab.
2. Select **Android Debug APK**.
3. Open a successful run for the commit you want to test. Pushes to `main` and the Android pipeline branch trigger a build; pull requests also run the checks.
4. Under **Artifacts**, download `null-requiem-android-debug-<commit-sha>`.
5. Extract the downloaded ZIP and locate `app-debug.apk`.
6. Transfer/open the APK on your Android phone and approve installation from that source if Android asks.
7. Install and launch **NULL REQUIEM**. The app is configured for landscape orientation.

### Important notes

- The workflow runs TypeScript checks, automated tests, the web production build, and the Android debug packaging step before uploading the APK.
- A debug APK is signed for development/testing. It is not a production release.
- Test the APK on a physical device for WebGL rendering, touch controls, app pause/resume, audio, and performance. A successful CI build alone does not prove all device behaviour.
- Each workflow artifact is retained for 14 days. Build a new APK after new code changes; an older APK does not update itself.
