# NULL REQUIEM — Gemini Asset Specification

> GENERATED from `src/assets/manifest*.ts` by `npm run docs:assets`. Do not edit by hand.

## Global art direction

- **Setting:** an original rain-soaked urban cyberpunk megacity; hard 2D side-scroller, readable at phone size (the world is 270 logical px tall; a phone shows it ~4× scaled).
- **Style:** pixel-art-adjacent, crisp edges, **no anti-aliased blur on sprites**, transparent PNG background. Dark concrete and wet steel, saturated neon accents (cyan, magenta, sodium orange, violet). Strong silhouette first, detail second.
- **Lighting:** top-left key light, cyan/magenta rim lights. Backtrace/echo effects are cyan-violet. The Null is desaturated chrome-white with violet edge.
- **Originality:** all designs must be original. Do not imitate any existing game, film, anime or franchise character, logo or poster.
- **Sheet rules:** one ROW per animation, frames left to right, equal frame cells, transparent padding allowed inside a cell but never between cells. Facing RIGHT; the game mirrors.
- **Naming:** the file name is the asset id plus extension, exactly as listed. Never rename ids.
- **Scale:** deliver at 1×, 2× or 4× the stated frame size. The loader derives the scale from the image size and rejects non-integer ratios (see `docs/ASSET_INTEGRATION_GUIDE.md`).

## Packs

| Pack | Contents | Assets | Frames/sounds |
| --- | --- | ---: | ---: |
| Pack 01 — Courier | Complete player sprite sheets, movement and combat animations, Backtrace animations, damage and death. | 11 | 29 |
| Pack 02 — Core Enemies | Security Drone, Scrap Hound, Street Scavenger, Heavy Enforcer, Phase Stalker, Sentry Turret, Null Echo. | 7 | 75 |
| Pack 03 — NPCs | All initial NPC characters with idle and interaction animations, and dialogue portraits. | 11 | 51 |
| Pack 04 — Environment | Rainline Alley, Transit Stacks, Precinct Vault: tilesets, backgrounds, props and interactive objects. | 28 | 173 |
| Pack 05 — Environment Expansion | Neon Undercity, Industrial Core, Null Cathedral: tilesets, backgrounds, props. | 20 | 145 |
| Pack 06 — Bosses and Effects | Boss sprite sheets, combat effects, Backtrace effects, environmental effects. | 20 | 144 |
| Pack 07 — UI and Audio | UI artwork, icons, dialogue portraits, music and sound effects. | 55 | 104 |

## Pack 01 — Courier

Complete player sprite sheets, movement and combat animations, Backtrace animations, damage and death.

#### `player_courier_idle` — Courier — Idle  [P0]

- **Purpose:** Standing still; breathing loop.
- **Description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Frame size:** 31×36 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 2 columns × 1 rows = 62×36 px at 1×. Animations in row order: `idle` 2f @ 2.2fps loop
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 10×22 at offset 10.5, 14
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Appears in:** All rooms
- **Delivery:** `player_courier_idle.png`

#### `player_courier_run` — Courier — Run  [P0]

- **Purpose:** Run cycle (150 px/s).
- **Description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Frame size:** 31×36 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 1 rows = 124×36 px at 1×. Animations in row order: `run` 4f @ 10fps loop
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 10×22 at offset 10.5, 14
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Appears in:** All rooms
- **Delivery:** `player_courier_run.png`

#### `player_courier_jump` — Courier — Jump  [P0]

- **Purpose:** Rising.
- **Description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Frame size:** 31×36 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 31×36 px at 1×. Animations in row order: `jump` 1f @ 1fps once
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 10×22 at offset 10.5, 14
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Appears in:** All rooms
- **Delivery:** `player_courier_jump.png`

#### `player_courier_fall` — Courier — Fall  [P0]

- **Purpose:** Falling.
- **Description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Frame size:** 31×36 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 31×36 px at 1×. Animations in row order: `fall` 1f @ 1fps once
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 10×22 at offset 10.5, 14
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Appears in:** All rooms
- **Delivery:** `player_courier_fall.png`

#### `player_courier_dash` — Courier — Dash  [P0]

- **Purpose:** Horizontal dash (0.2 s). Stretched, afterimage friendly.
- **Description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Frame size:** 31×36 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 31×36 px at 1×. Animations in row order: `dash` 1f @ 1fps once
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 10×22 at offset 10.5, 14
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Appears in:** All rooms
- **Delivery:** `player_courier_dash.png`

#### `player_courier_attack` — Courier — Attack  [P0]

- **Purpose:** Rail-blade swing; the slash arc is a separate effect. Final art may use up to 4 frames.
- **Description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Frame size:** 31×36 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 31×36 px at 1×. Animations in row order: `attack` 1f @ 16fps once
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 10×22 at offset 10.5, 14
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Appears in:** All rooms
- **Delivery:** `player_courier_attack.png` — The view shows this frame for the whole active window; extra frames are driven once the final sheet arrives.

#### `player_courier_hurt` — Courier — Hurt  [P0]

- **Purpose:** Knocked back and stunned (0.25 s).
- **Description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Frame size:** 31×36 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 31×36 px at 1×. Animations in row order: `hurt` 1f @ 1fps once
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 10×22 at offset 10.5, 14
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Appears in:** All rooms
- **Delivery:** `player_courier_hurt.png`

#### `player_courier_backtrace` — Courier — Backtrace Arrival  [P0]

- **Purpose:** The Courier materialising at the echo point after a rewind.
- **Description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Frame size:** 31×36 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 6 columns × 1 rows = 186×36 px at 1×. Animations in row order: `backtrace` 6f @ 16fps once (Dissolve in from cyan glitch shards)
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 10×22 at offset 10.5, 14
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Appears in:** All rooms
- **Delivery:** `player_courier_backtrace.png` — Not yet played by the player view (the arrival uses fx_backtrace_arrival).

#### `player_courier_airjump` — Courier — Kinetic Coil Air Jump  [P0]

- **Purpose:** Second jump in mid-air: coil flares at the boots.
- **Description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Frame size:** 31×36 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 3 columns × 1 rows = 93×36 px at 1×. Animations in row order: `airjump` 3f @ 14fps once
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 10×22 at offset 10.5, 14
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Appears in:** All rooms
- **Delivery:** `player_courier_airjump.png`

#### `player_courier_interact` — Courier — Interact  [P0]

- **Purpose:** Reaching out to a terminal or NPC.
- **Description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Frame size:** 31×36 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 3 columns × 1 rows = 93×36 px at 1×. Animations in row order: `interact` 3f @ 8fps once
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 10×22 at offset 10.5, 14
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Appears in:** All rooms
- **Delivery:** `player_courier_interact.png`

#### `player_courier_death` — Courier — Death  [P0]

- **Purpose:** Signal loss: the Courier flickers and falls.
- **Description:** The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.
- **Frame size:** 31×36 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 6 columns × 1 rows = 186×36 px at 1×. Animations in row order: `death` 6f @ 10fps once
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 10×22 at offset 10.5, 14
- **Palette:** #0b0b16 #2a2a46 #3cf2ff #ff3ea5 #e8dcc8
- **Appears in:** All rooms
- **Delivery:** `player_courier_death.png`


## Pack 02 — Core Enemies

Security Drone, Scrap Hound, Street Scavenger, Heavy Enforcer, Phase Stalker, Sentry Turret, Null Echo.

#### `enemy_security_drone` — Security Drone  [P0]

- **Purpose:** Hovering patrol drone that locks on and fires bolts. (Code name: Watcher Drone.)
- **Description:** A palm-sized spherical drone with a single wide magenta optic, two stubby stabiliser fins and a rear thruster plume. Matte gunmetal shell with scratched Precinct stencil; the optic must read from far away.
- **Frame size:** 20×24 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 2 columns × 2 rows = 40×48 px at 1×. Animations in row order: `idle` 2f @ 3fps loop; `charge` 1f @ 1fps once (Core glows white-hot while winding up a shot.)
- **Anchor:** 0.5, 0.5
- **Hitbox (gameplay, for reference):** 14×14 at offset 3, 5
- **Palette:** #1a1a28 #6a6a88 #ff3ea5 #ffb02e
- **Variations:** Elite: red optic, extra side pods
- **Appears in:** Rainline Depot, Stacks Yard, Stacks Shaft, Precinct, Foundry
- **Delivery:** `enemy_security_drone.png`

#### `enemy_scrap_hound` — Scrap Hound  [P0]

- **Purpose:** Low four-legged crawler that lunges (wind-up, lunge, recover).
- **Description:** A hunched scrap-metal quadruped built from piping and a cracked dog skull, one red sensor eye, rust-orange and bruise-purple plates. The wind-up pose crouches visibly low.
- **Frame size:** 24×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 2 columns × 4 rows = 48×64 px at 1×. Animations in row order: `walk` 2f @ 5fps loop; `windup` 1f @ 1fps once; `lunge` 1f @ 1fps once; `recover` 1f @ 1fps once
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 18×12 at offset 3, 4
- **Palette:** #2a1a1a #8a4a2a #ff3b4e #c9a46a
- **Variations:** Elite: glowing red joints
- **Appears in:** Rainline Alley, Transit Stacks, Undercroft, Arcade
- **Delivery:** `enemy_scrap_hound.png`

#### `enemy_street_scavenger` — Street Scavenger  [P0]

- **Purpose:** Basic ground enemy: patrols, chases, stabs with a rail spike. Elite variant throws shivs.
- **Description:** A gaunt human looter in layered rags and a rain tarp hood, taped goggles, carrying a sharpened rail spike. Orange scarf as the colour code for "Scavenger". Wind-up raises the spike behind the head for a clear tell.
- **Frame size:** 24×32 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 6 rows = 96×192 px at 1×. Animations in row order: `idle` 2f @ 2.5fps loop; `walk` 4f @ 8fps loop; `windup` 2f @ 6fps once; `strike` 2f @ 14fps once; `hurt` 1f @ 1fps once; `death` 3f @ 8fps once
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 12×22 at offset 6, 10
- **Palette:** #2a2018 #8a6a3a #ff9f3e #d8c8a8
- **Variations:** Elite: red scarf, bandolier of shivs
- **Appears in:** Rainline Alley, Transit Stacks, Precinct, Undercity, Industrial Core
- **Delivery:** `enemy_street_scavenger.png`

#### `enemy_heavy_enforcer` — Heavy Enforcer  [P0]

- **Purpose:** Armoured brute: frontal armour deflects, long slam wind-up, open during recovery.
- **Description:** A wide riot-armoured Precinct brute in a steel-blue plate suit, enormous shoulder guards, a shield-plate across the chest that visibly splits open on recovery, carrying a two-handed hydraulic maul. Slow, heavy silhouette.
- **Frame size:** 40×46 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 7 rows = 160×322 px at 1×. Animations in row order: `idle` 2f @ 2fps loop; `walk` 4f @ 6fps loop; `windup` 3f @ 4fps once (Raises the maul overhead; chest plate flares.); `slam` 2f @ 14fps once; `recover` 2f @ 3fps once (Plate opens; core visible.); `hurt` 1f @ 1fps once; `death` 4f @ 8fps once
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 22×30 at offset 9, 16
- **Palette:** #1a2230 #4a6a9a #9ab8e8 #ff3b4e
- **Variations:** Elite: black plate with red trim
- **Appears in:** Precinct Checkpoint, Pipeworks, Foundry, Nave
- **Delivery:** `enemy_heavy_enforcer.png`

#### `enemy_phase_stalker` — Phase Stalker  [P0]

- **Purpose:** Blinking predator: lurks, vanishes, reappears beside the Courier, stabs.
- **Description:** A tall thin figure in a violet shroud with a smooth featureless mask and long hands ending in blade-fingers; the edges of its body are slightly out of register (chromatic split). Semi-transparent, unsettling.
- **Frame size:** 24×32 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 3 columns × 7 rows = 72×224 px at 1×. Animations in row order: `lurk` 2f @ 4fps loop; `blink` 3f @ 18fps once (Dissolve out / in with glitch slices.); `windup` 2f @ 8fps once; `strike` 2f @ 16fps once; `recover` 1f @ 1fps once; `hurt` 1f @ 1fps once; `death` 3f @ 8fps once
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 12×22 at offset 6, 10
- **Palette:** #120a22 #6a3ac8 #c9a0ff #ffffff
- **Variations:** Elite: double afterimage trail
- **Appears in:** Undercity Arcade, Leaning Towers, Reactor Hall, Nave
- **Delivery:** `enemy_phase_stalker.png`

#### `enemy_sentry_turret` — Sentry Turret  [P0]

- **Purpose:** Stationary mounted gun with an aim line; shield opens only while venting.
- **Description:** A compact twin-barrel gun pod on a swivel mount, wrapped in armour petals that open when it vents. Matte Precinct grey with one red lens. The barrel is drawn pointing RIGHT; the game rotates it toward the target.
- **Frame size:** 24×24 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 3 columns × 6 rows = 72×144 px at 1×. Animations in row order: `idle` 2f @ 2fps loop; `lock` 3f @ 6fps once (Barrel snaps toward the target; red lens brightens.); `fire` 2f @ 16fps once; `vent` 2f @ 5fps once (Armour petals open; core exposed.); `hurt` 1f @ 1fps once; `death` 3f @ 8fps once
- **Anchor:** 0.5, 0.5
- **Hitbox (gameplay, for reference):** 16×16 at offset 4, 4
- **Palette:** #1c1c24 #5a5a70 #ff3b4e #ffb02e
- **Variations:** Elite: gold stripes; Mounts: floor, ceiling, left wall, right wall (game rotates)
- **Appears in:** Stacks Shaft, Precinct Checkpoint, Arcade, Foundry, Pipeworks, Nave
- **Delivery:** `enemy_sentry_turret.png`

#### `enemy_null_echo` — Null Echo  [P0]

- **Purpose:** A hostile afterimage of the Courier that retraces their recorded path.
- **Description:** A ghost-like copy of the Courier silhouette rendered as translucent cyan-white static with scan lines, trailing wisps, empty hollow eyes. Must be instantly recognisable as "me, from before".
- **Frame size:** 24×32 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 3 rows = 96×96 px at 1×. Animations in row order: `float` 4f @ 6fps loop; `hurt` 1f @ 1fps once; `death` 3f @ 10fps once (Shatters into cyan static.)
- **Anchor:** 0.5, 0.5
- **Hitbox (gameplay, for reference):** 12×22 at offset 6, 5
- **Palette:** #0a1a22 #3cf2ff #e8ffff #ff3ea5
- **Variations:** Elite: magenta edge glow
- **Appears in:** Reactor Hall, Nave, Sanctum (summoned)
- **Delivery:** `enemy_null_echo.png`


## Pack 03 — NPCs

All initial NPC characters with idle and interaction animations, and dialogue portraits.

#### `npc_zero` — Zero  [P0]

- **Purpose:** Zero: dialogue NPC.
- **Description:** A street informant in a hooded green rain-poncho, face half-covered by a scarf, one cybernetic eye ring glowing cyan.
- **Frame size:** 20×28 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 20×28 px at 1×. Animations in row order: `idle` 1f @ 1fps loop
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 12×22 at offset 4, 6
- **Palette:** #0c1c18 #2a8a6a #3cf2ff
- **Appears in:** Rainline Alley
- **Delivery:** `npc_zero.png`

#### `npc_mira` — Mira  [P0]

- **Purpose:** Mira: dialogue NPC.
- **Description:** A survivor archivist in a patchwork coat covered in tiny paper tags, round glasses, a satchel of memory shards.
- **Frame size:** 20×28 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 20×28 px at 1×. Animations in row order: `idle` 1f @ 1fps loop
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 12×22 at offset 4, 6
- **Palette:** #1c1018 #a04a8a #ffb02e
- **Appears in:** Transit Stacks
- **Delivery:** `npc_mira.png`

#### `npc_terminal` — Terminal  [P0]

- **Purpose:** Readable data terminal (lore logs, tutorial, power console).
- **Description:** A waist-high wall-mounted CRT terminal with a green-violet screen, bundles of cable, a blinking cursor. Reads as "interact here".
- **Frame size:** 20×28 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 20×28 px at 1×. Animations in row order: `idle` 1f @ 1fps loop
- **Anchor:** 0.5, 1
- **Palette:** #14102a #7755cc #4dff9a
- **Appears in:** Depot, Precinct, Cells, Reactor, Archive, Nave
- **Delivery:** `npc_terminal.png`

#### `npc_station_mechanic` — Halden (Station Mechanic)  [P0]

- **Purpose:** Halden (Station Mechanic): dialogue NPC.
- **Description:** A broad mechanic in oil-stained orange overalls, welding goggles pushed up on a bald head, a tool belt, one arm a patched servo prosthetic.
- **Frame size:** 24×32 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 2 rows = 96×64 px at 1×. Animations in row order: `idle` 4f @ 3fps loop; `talk` 2f @ 5fps loop
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 12×22 at offset 6, 10
- **Palette:** #2a1808 #e08a2e #c9c9d8
- **Appears in:** Stacks Yard
- **Delivery:** `npc_station_mechanic.png`

#### `npc_underground_medic` — Doc Ilse (Underground Medic)  [P0]

- **Purpose:** Doc Ilse (Underground Medic): dialogue NPC.
- **Description:** A tired medic in a long white coat stained at the cuffs, a red cross armband, grey-streaked hair in a bun, carrying a hard-shell med case.
- **Frame size:** 24×32 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 2 rows = 96×64 px at 1×. Animations in row order: `idle` 4f @ 3fps loop; `talk` 2f @ 5fps loop
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 12×22 at offset 6, 10
- **Palette:** #241820 #e8e0f0 #ff3b4e
- **Appears in:** Undercity Plaza
- **Delivery:** `npc_underground_medic.png`

#### `npc_former_officer` — Brannt (Former Security Officer)  [P1]

- **Purpose:** Brannt (Former Security Officer): dialogue NPC.
- **Description:** A stocky ex-guard in a stripped Precinct jacket (insignia torn off), grey stubble, a faded blue cap, arms crossed.
- **Frame size:** 24×32 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 2 rows = 96×64 px at 1×. Animations in row order: `idle` 4f @ 3fps loop; `talk` 2f @ 5fps loop
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 12×22 at offset 6, 10
- **Palette:** #101828 #3a5a8a #9ab8e8
- **Appears in:** Undercity Plaza
- **Delivery:** `npc_former_officer.png`

#### `npc_street_informant` — Wren (Street Informant)  [P1]

- **Purpose:** Wren (Street Informant): dialogue NPC.
- **Description:** A wiry young informant on a rooftop perch in an oversized yellow windbreaker, a cap on backwards, a pocket full of paper maps.
- **Frame size:** 24×32 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 2 rows = 96×64 px at 1×. Animations in row order: `idle` 4f @ 3fps loop; `talk` 2f @ 5fps loop
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 12×22 at offset 6, 10
- **Palette:** #2a2410 #e8d030 #3cf2ff
- **Appears in:** Undercity Plaza
- **Delivery:** `npc_street_informant.png`

#### `npc_black_market_trader` — Kestrel (Black-Market Trader)  [P0]

- **Purpose:** Kestrel (Black-Market Trader): dialogue NPC.
- **Description:** A sleek trader with a long burgundy coat lined with glowing contraband vials, a half-mask of gold filigree, a rolling display case.
- **Frame size:** 24×32 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 2 rows = 96×64 px at 1×. Animations in row order: `idle` 4f @ 3fps loop; `talk` 2f @ 5fps loop
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 12×22 at offset 6, 10
- **Palette:** #240a18 #a02a5a #ffd070
- **Appears in:** Undercity Plaza
- **Delivery:** `npc_black_market_trader.png`

#### `npc_temporal_researcher` — Dr. Vesper (Temporal Researcher)  [P1]

- **Purpose:** Dr. Vesper (Temporal Researcher): dialogue NPC.
- **Description:** A lean scientist in a cracked lab coat over a pressure suit, hair streaked with static-white, a tablet projecting rewinding clock faces.
- **Frame size:** 24×32 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 2 rows = 96×64 px at 1×. Animations in row order: `idle` 4f @ 3fps loop; `talk` 2f @ 5fps loop
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 12×22 at offset 6, 10
- **Palette:** #0c1c28 #3a8ac8 #e8ffff
- **Appears in:** Reactor Hall
- **Delivery:** `npc_temporal_researcher.png`

#### `npc_desert_man` — Desert Man (Rainline Wanderer)  [P0]

- **Purpose:** Desert Man (Rainline Wanderer): dialogue NPC.
- **Description:** A weathered wanderer from beyond the city walls in a sun-bleached sand-coloured robe and layered wraps over a dark rain-slicker, wide travel hood, a cracked amber visor pushed up on the forehead, a canteen and rolled blanket on the back. Out of place in the rain: dry-coloured, calm, unhurried.
- **Frame size:** 24×32 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 2 rows = 96×64 px at 1×. Animations in row order: `idle` 4f @ 3fps loop; `talk` 2f @ 5fps loop
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 12×22 at offset 6, 10
- **Palette:** #2a2014 #c9a46a #ffb02e #3cf2ff
- **Appears in:** Rainline Alley
- **Delivery:** `npc_desert_man.png` — NEW id (Production Pack 01). Independent NPC in Rainline Alley; speaking to him completes the first main-quest objective. Idle and talk rows are both played by NpcView.

#### `npc_null_echo` — Null Echo (Erased Survivor)  [P2]

- **Purpose:** Null Echo (Erased Survivor): dialogue NPC.
- **Description:** A faded, looping figure in the Courier's silhouette with a pale face and a missing-pixel patch where an identity should be.
- **Frame size:** 24×32 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 2 rows = 96×64 px at 1×. Animations in row order: `idle` 4f @ 3fps loop; `talk` 2f @ 5fps loop
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 12×22 at offset 6, 10
- **Palette:** #14102a #9b59ff #e8dcc8
- **Appears in:** Undercroft
- **Delivery:** `npc_null_echo.png`


## Pack 04 — Environment

Rainline Alley, Transit Stacks, Precinct Vault: tilesets, backgrounds, props and interactive objects.

#### `env_rainline_tiles` — Rainline Alley — Tileset  [P1]

- **Purpose:** Terrain tiles: solid with top/left/right/bottom edges and inner corners, one-way catwalk, hazard, background wall fill.
- **Description:** Night alley in permanent rain: purple-black sky, wet concrete, cyan signage reflections, rusted fire escapes. Tiles are 16x16 logical px and must tile seamlessly. Strong top lip highlight, darker underside, readable platform edges.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 16 columns × 4 rows = 256×64 px at 1×. Animations in row order: `solid` 16f @ 1fps once (4x4 auto-tile set (edges + corners + fill)); `catwalk` 3f @ 1fps once (left cap, middle, right cap); `hazard` 4f @ 6fps loop (animated live-current surface); `details` 8f @ 1fps once (wall panels, rivets, stains)
- **Anchor:** 0, 0
- **Palette:** #05060c #272c3e #8f9bbd #3cf2ff #1a0d26
- **Variations:** Day-variant not required
- **Appears in:** Rainline Alley, Rainline Depot, The Undercroft
- **Delivery:** `env_rainline_tiles.png` — Terrain is drawn by code today (RoomView.drawTerrain). The tileset hook (auto-tiling from this sheet) is specified in ASSET_INTEGRATION_GUIDE.md and not implemented yet.

#### `env_rainline_bg_far` — Rainline Alley — Far Background  [P1]

- **Purpose:** Slowest parallax layer (0.12x camera). Tiles horizontally.
- **Description:** Far skyline/ceiling layer. Night alley in permanent rain: purple-black sky, wet concrete, cyan signage reflections, rusted fire escapes. Low contrast, atmospheric perspective, no gameplay-readable detail, seamless left-right tile. Landscape 16:9 at 480x270 logical (deliver 1920x1080).
- **Frame size:** 480×270 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 480×270 px at 1×. Animations in row order: `far` 1f @ 1fps once
- **Anchor:** 0, 0
- **Palette:** #05060c #272c3e #8f9bbd #3cf2ff #1a0d26
- **Appears in:** Rainline Alley, Rainline Depot, The Undercroft
- **Delivery:** `env_rainline_bg_far.png` — AUDIT: RoomView builds per-room textures `far-<roomId>` and never reads this key, so delivering the file does not replace the backdrop yet. See docs/GEMINI_PACK_01_BRIEF.md §7 (patch R2).

#### `env_rainline_bg_mid` — Rainline Alley — Mid Background  [P1]

- **Purpose:** Mid parallax layer (0.3x). Tiles horizontally. Larger structures.
- **Description:** Mid layer: larger structures and architecture with more contrast than the far layer. dumpsters, fire escapes, neon sign boxes, rain pipes, crates, a flickering street lamp, puddle reflections. Seamless left-right tile, transparent where the far layer should show through.
- **Frame size:** 480×270 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 480×270 px at 1×. Animations in row order: `mid` 1f @ 1fps once
- **Anchor:** 0, 0
- **Palette:** #05060c #272c3e #8f9bbd #3cf2ff #1a0d26
- **Appears in:** Rainline Alley, Rainline Depot, The Undercroft
- **Delivery:** `env_rainline_bg_mid.png` — AUDIT: not read by RoomView yet (patch R2 in the Pack 01 brief).

#### `env_rainline_fg_silhouette` — Rainline Alley — Foreground Silhouettes  [P1]

- **Purpose:** Strong dark foreground shapes drawn in front of the playfield (pipes, cables, railings) at the screen edges.
- **Description:** Near-black foreground silhouettes with a subtle coloured rim light. Never cover the player: keep to the top/bottom 25% of the screen. dumpsters, fire escapes, neon sign boxes, rain pipes, crates, a flickering street lamp, puddle reflections.
- **Frame size:** 480×270 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 1 rows = 1920×270 px at 1×. Animations in row order: `fg` 4f @ 1fps once (4 interchangeable strips)
- **Anchor:** 0, 0
- **Palette:** #05060c #272c3e #8f9bbd #3cf2ff #1a0d26
- **Appears in:** Rainline Alley, Rainline Depot, The Undercroft
- **Delivery:** `env_rainline_fg_silhouette.png` — No foreground layer exists yet; the renderer slot is specified in the guide.

#### `env_rainline_props` — Rainline Alley — Props  [P1]

- **Purpose:** Decorative set dressing placed by room data (non-colliding).
- **Description:** Eight standalone props on a transparent background, each within 48x48 logical px: dumpsters, fire escapes, neon sign boxes, rain pipes, crates, a flickering street lamp, puddle reflections. Each must read at small size and share the region palette.
- **Frame size:** 48×48 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 8 columns × 1 rows = 384×48 px at 1×. Animations in row order: `props` 8f @ 1fps once (8 props; see description)
- **Anchor:** 0.5, 1
- **Palette:** #05060c #272c3e #8f9bbd #3cf2ff #1a0d26
- **Appears in:** Rainline Alley, Rainline Depot, The Undercroft
- **Delivery:** `env_rainline_props.png` — Rooms do not place props yet; slots are reserved.

#### `env_transit_tiles` — Transit Stacks — Tileset  [P1]

- **Purpose:** Terrain tiles: solid with top/left/right/bottom edges and inner corners, one-way catwalk, hazard, background wall fill.
- **Description:** Multi-level industrial transit infrastructure: girders, escalator shafts, platform edges, magenta emergency lights, steam. Tiles are 16x16 logical px and must tile seamlessly. Strong top lip highlight, darker underside, readable platform edges.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 16 columns × 4 rows = 256×64 px at 1×. Animations in row order: `solid` 16f @ 1fps once (4x4 auto-tile set (edges + corners + fill)); `catwalk` 3f @ 1fps once (left cap, middle, right cap); `hazard` 4f @ 6fps loop (animated live-current surface); `details` 8f @ 1fps once (wall panels, rivets, stains)
- **Anchor:** 0, 0
- **Palette:** #04060e #252a3a #9aa6c4 #ff3ea5 #0d1830
- **Variations:** Day-variant not required
- **Appears in:** Transit Stacks, Stacks Yard, The Stacks Shaft
- **Delivery:** `env_transit_tiles.png` — Terrain is drawn by code today (RoomView.drawTerrain). The tileset hook (auto-tiling from this sheet) is specified in ASSET_INTEGRATION_GUIDE.md and not implemented yet.

#### `env_transit_bg_far` — Transit Stacks — Far Background  [P1]

- **Purpose:** Slowest parallax layer (0.12x camera). Tiles horizontally.
- **Description:** Far skyline/ceiling layer. Multi-level industrial transit infrastructure: girders, escalator shafts, platform edges, magenta emergency lights, steam. Low contrast, atmospheric perspective, no gameplay-readable detail, seamless left-right tile. Landscape 16:9 at 480x270 logical (deliver 1920x1080).
- **Frame size:** 480×270 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 480×270 px at 1×. Animations in row order: `far` 1f @ 1fps once
- **Anchor:** 0, 0
- **Palette:** #04060e #252a3a #9aa6c4 #ff3ea5 #0d1830
- **Appears in:** Transit Stacks, Stacks Yard, The Stacks Shaft
- **Delivery:** `env_transit_bg_far.png` — AUDIT: RoomView builds per-room textures `far-<roomId>` and never reads this key, so delivering the file does not replace the backdrop yet. See docs/GEMINI_PACK_01_BRIEF.md §7 (patch R2).

#### `env_transit_bg_mid` — Transit Stacks — Mid Background  [P1]

- **Purpose:** Mid parallax layer (0.3x). Tiles horizontally. Larger structures.
- **Description:** Mid layer: larger structures and architecture with more contrast than the far layer. girders, lift cages, track bumpers, signal gantries, cable bundles, hazard-striped pillars. Seamless left-right tile, transparent where the far layer should show through.
- **Frame size:** 480×270 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 480×270 px at 1×. Animations in row order: `mid` 1f @ 1fps once
- **Anchor:** 0, 0
- **Palette:** #04060e #252a3a #9aa6c4 #ff3ea5 #0d1830
- **Appears in:** Transit Stacks, Stacks Yard, The Stacks Shaft
- **Delivery:** `env_transit_bg_mid.png` — AUDIT: not read by RoomView yet (patch R2 in the Pack 01 brief).

#### `env_transit_fg_silhouette` — Transit Stacks — Foreground Silhouettes  [P1]

- **Purpose:** Strong dark foreground shapes drawn in front of the playfield (pipes, cables, railings) at the screen edges.
- **Description:** Near-black foreground silhouettes with a subtle coloured rim light. Never cover the player: keep to the top/bottom 25% of the screen. girders, lift cages, track bumpers, signal gantries, cable bundles, hazard-striped pillars.
- **Frame size:** 480×270 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 1 rows = 1920×270 px at 1×. Animations in row order: `fg` 4f @ 1fps once (4 interchangeable strips)
- **Anchor:** 0, 0
- **Palette:** #04060e #252a3a #9aa6c4 #ff3ea5 #0d1830
- **Appears in:** Transit Stacks, Stacks Yard, The Stacks Shaft
- **Delivery:** `env_transit_fg_silhouette.png` — No foreground layer exists yet; the renderer slot is specified in the guide.

#### `env_transit_props` — Transit Stacks — Props  [P1]

- **Purpose:** Decorative set dressing placed by room data (non-colliding).
- **Description:** Eight standalone props on a transparent background, each within 48x48 logical px: girders, lift cages, track bumpers, signal gantries, cable bundles, hazard-striped pillars. Each must read at small size and share the region palette.
- **Frame size:** 48×48 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 8 columns × 1 rows = 384×48 px at 1×. Animations in row order: `props` 8f @ 1fps once (8 props; see description)
- **Anchor:** 0.5, 1
- **Palette:** #04060e #252a3a #9aa6c4 #ff3ea5 #0d1830
- **Appears in:** Transit Stacks, Stacks Yard, The Stacks Shaft
- **Delivery:** `env_transit_props.png` — Rooms do not place props yet; slots are reserved.

#### `env_precinct_tiles` — Precinct Vault — Tileset  [P1]

- **Purpose:** Terrain tiles: solid with top/left/right/bottom edges and inner corners, one-way catwalk, hazard, background wall fill.
- **Description:** Restricted security complex: cold concrete, red alarm light, laser grids, steel cell doors, scuffed Precinct stencils. Tiles are 16x16 logical px and must tile seamlessly. Strong top lip highlight, darker underside, readable platform edges.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 16 columns × 4 rows = 256×64 px at 1×. Animations in row order: `solid` 16f @ 1fps once (4x4 auto-tile set (edges + corners + fill)); `catwalk` 3f @ 1fps once (left cap, middle, right cap); `hazard` 4f @ 6fps loop (animated live-current surface); `details` 8f @ 1fps once (wall panels, rivets, stains)
- **Anchor:** 0, 0
- **Palette:** #08050a #2c2a36 #a69e92 #ff3b4e #2a0a14
- **Variations:** Day-variant not required
- **Appears in:** Precinct Checkpoint, Holding Cells, Precinct Vault
- **Delivery:** `env_precinct_tiles.png` — Terrain is drawn by code today (RoomView.drawTerrain). The tileset hook (auto-tiling from this sheet) is specified in ASSET_INTEGRATION_GUIDE.md and not implemented yet.

#### `env_precinct_bg_far` — Precinct Vault — Far Background  [P1]

- **Purpose:** Slowest parallax layer (0.12x camera). Tiles horizontally.
- **Description:** Far skyline/ceiling layer. Restricted security complex: cold concrete, red alarm light, laser grids, steel cell doors, scuffed Precinct stencils. Low contrast, atmospheric perspective, no gameplay-readable detail, seamless left-right tile. Landscape 16:9 at 480x270 logical (deliver 1920x1080).
- **Frame size:** 480×270 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 480×270 px at 1×. Animations in row order: `far` 1f @ 1fps once
- **Anchor:** 0, 0
- **Palette:** #08050a #2c2a36 #a69e92 #ff3b4e #2a0a14
- **Appears in:** Precinct Checkpoint, Holding Cells, Precinct Vault
- **Delivery:** `env_precinct_bg_far.png` — AUDIT: RoomView builds per-room textures `far-<roomId>` and never reads this key, so delivering the file does not replace the backdrop yet. See docs/GEMINI_PACK_01_BRIEF.md §7 (patch R2).

#### `env_precinct_bg_mid` — Precinct Vault — Mid Background  [P1]

- **Purpose:** Mid parallax layer (0.3x). Tiles horizontally. Larger structures.
- **Description:** Mid layer: larger structures and architecture with more contrast than the far layer. cell doors, laser emitters, camera pods, barrier gates, evidence lockers, stencil lettering. Seamless left-right tile, transparent where the far layer should show through.
- **Frame size:** 480×270 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 480×270 px at 1×. Animations in row order: `mid` 1f @ 1fps once
- **Anchor:** 0, 0
- **Palette:** #08050a #2c2a36 #a69e92 #ff3b4e #2a0a14
- **Appears in:** Precinct Checkpoint, Holding Cells, Precinct Vault
- **Delivery:** `env_precinct_bg_mid.png` — AUDIT: not read by RoomView yet (patch R2 in the Pack 01 brief).

#### `env_precinct_fg_silhouette` — Precinct Vault — Foreground Silhouettes  [P1]

- **Purpose:** Strong dark foreground shapes drawn in front of the playfield (pipes, cables, railings) at the screen edges.
- **Description:** Near-black foreground silhouettes with a subtle coloured rim light. Never cover the player: keep to the top/bottom 25% of the screen. cell doors, laser emitters, camera pods, barrier gates, evidence lockers, stencil lettering.
- **Frame size:** 480×270 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 1 rows = 1920×270 px at 1×. Animations in row order: `fg` 4f @ 1fps once (4 interchangeable strips)
- **Anchor:** 0, 0
- **Palette:** #08050a #2c2a36 #a69e92 #ff3b4e #2a0a14
- **Appears in:** Precinct Checkpoint, Holding Cells, Precinct Vault
- **Delivery:** `env_precinct_fg_silhouette.png` — No foreground layer exists yet; the renderer slot is specified in the guide.

#### `env_precinct_props` — Precinct Vault — Props  [P1]

- **Purpose:** Decorative set dressing placed by room data (non-colliding).
- **Description:** Eight standalone props on a transparent background, each within 48x48 logical px: cell doors, laser emitters, camera pods, barrier gates, evidence lockers, stencil lettering. Each must read at small size and share the region palette.
- **Frame size:** 48×48 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 8 columns × 1 rows = 384×48 px at 1×. Animations in row order: `props` 8f @ 1fps once (8 props; see description)
- **Anchor:** 0.5, 1
- **Palette:** #08050a #2c2a36 #a69e92 #ff3b4e #2a0a14
- **Appears in:** Precinct Checkpoint, Holding Cells, Precinct Vault
- **Delivery:** `env_precinct_props.png` — Rooms do not place props yet; slots are reserved.

#### `obj_sync_relay` — Sync Relay  [P0]

- **Purpose:** Checkpoint: heals and saves.
- **Description:** A waist-high relay pylon with a cyan ring that lights up when linked; a vertical glass tube with a pulsing coil.
- **Frame size:** 16×32 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 2 columns × 2 rows = 32×64 px at 1×. Animations in row order: `off` 1f @ 1fps loop; `on` 2f @ 3fps loop
- **Anchor:** 0.5, 1
- **Palette:** #14102a #3a4a6a #3cf2ff
- **Appears in:** Most rooms
- **Delivery:** `obj_sync_relay.png`

#### `obj_security_door` — Security Door  [P0]

- **Purpose:** Locked door (keycard / plates / power / boss). One 16x16 tile; the game stacks them to fill the opening.
- **Description:** A heavy steel shutter segment with a hazard-stripe edge and a status light (red locked, amber waiting, green open). Stacks vertically without seams.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 2 rows = 64×32 px at 1×. Animations in row order: `closed` 1f @ 1fps loop; `open` 4f @ 12fps once (iris/slide open)
- **Anchor:** 0, 0
- **Palette:** #2a2a38 #8a8aa0 #ff3b4e #4dff9a
- **Appears in:** Depot, Checkpoint, Reactor, Kiln, Archive, Nave
- **Delivery:** `obj_security_door.png`

#### `obj_pressure_plate` — Pressure Plate  [P0]

- **Purpose:** Floor plate pressed by the Courier or by their echo.
- **Description:** A shallow steel plate flush with the floor. Courier plates glow cyan when pressed. ECHO plates are translucent violet with a faint clock-face ring so players learn they respond to the afterimage.
- **Frame size:** 16×6 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 4 rows = 16×24 px at 1×. Animations in row order: `up` 1f @ 1fps loop; `down` 1f @ 1fps loop; `echoUp` 1f @ 1fps loop; `echoDown` 1f @ 1fps loop
- **Anchor:** 0, 1
- **Palette:** #2a2a38 #8a8aa0 #3cf2ff #9b59ff
- **Appears in:** Depot, Reactor, Nave
- **Delivery:** `obj_pressure_plate.png`

#### `obj_moving_platform` — Moving Platform  [P0]

- **Purpose:** Rideable one-way platform segment (the game tiles the middle and caps the ends).
- **Description:** A grated steel deck with a glowing underside strip and small thrusters/rollers; clearly movable (not terrain). Left cap, tiling middle, right cap.
- **Frame size:** 16×8 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 3 rows = 16×24 px at 1×. Animations in row order: `left` 1f @ 1fps loop; `mid` 1f @ 1fps loop; `right` 1f @ 1fps loop
- **Anchor:** 0, 0
- **Palette:** #2a2a38 #8a8aa0 #3cf2ff
- **Appears in:** Stacks Shaft, Pipeworks, Foundry, Nave
- **Delivery:** `obj_moving_platform.png`

#### `obj_power_node` — Power Node  [P1]

- **Purpose:** Strikeable node that powers doors.
- **Description:** A cracked glass energy cell on a wall bracket; dim when off, bright steady cyan-green when powered, sparks when struck.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 2 columns × 2 rows = 32×32 px at 1×. Animations in row order: `off` 1f @ 1fps loop; `on` 2f @ 6fps loop
- **Anchor:** 0.5, 1
- **Palette:** #1a1a28 #3a4a6a #4dff9a
- **Appears in:** Arcade
- **Delivery:** `obj_power_node.png`

#### `obj_hazard_emitter` — Hazard Emitter  [P1]

- **Purpose:** Source of laser grids and steam jets; the beam itself is code-drawn.
- **Description:** A compact nozzle/lens housing that mounts to a ceiling or floor. Idle dark, telegraph warning-red flicker, active full bright. Four orientations are rotations of one drawing (the game rotates).
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 2 columns × 3 rows = 32×48 px at 1×. Animations in row order: `idle` 1f @ 1fps loop; `telegraph` 2f @ 8fps loop; `active` 2f @ 12fps loop
- **Anchor:** 0, 0
- **Palette:** #2a2a38 #ff3b4e #ffb02e #ffffff
- **Appears in:** Cells, Pipeworks, Foundry
- **Delivery:** `obj_hazard_emitter.png`

#### `obj_breakable_wall` — Cracked Wall  [P1]

- **Purpose:** Breakable wall tile (3 strikes).
- **Description:** Concrete tile with a glowing hairline crack and exposed rebar; damage stages widen the crack.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 4 rows = 64×64 px at 1×. Animations in row order: `intact` 1f @ 1fps loop; `damaged1` 1f @ 1fps loop; `damaged2` 1f @ 1fps loop; `debris` 4f @ 12fps once
- **Anchor:** 0, 0
- **Palette:** #272c3e #8f9bbd #ffb02e
- **Appears in:** Alley, Yard, Cells, Arcade
- **Delivery:** `obj_breakable_wall.png`

#### `obj_laser_gate` — Timed Laser Gate  [P1]

- **Purpose:** Override-switch gate (1 s open).
- **Description:** A full-height curtain of cyan laser rails; flickers before closing.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 16×16 px at 1×. Animations in row order: `gate` 1f @ 1fps loop
- **Anchor:** 0, 0
- **Palette:** #0a2a3a #3cf2ff #ffffff
- **Appears in:** Transit Stacks, Reactor Hall
- **Delivery:** `obj_laser_gate.png`

#### `obj_override_switch` — Override Switch  [P1]

- **Purpose:** Strike to open the timed gate.
- **Description:** A wall-mounted lever box with a big shock plate; red when idle, cyan when live.
- **Frame size:** 16×32 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 2 rows = 16×64 px at 1×. Animations in row order: `idle` 1f @ 1fps loop; `live` 1f @ 1fps loop
- **Anchor:** 0.5, 1
- **Palette:** #2a2a38 #ff3b4e #3cf2ff
- **Appears in:** Transit Stacks, Reactor Hall
- **Delivery:** `obj_override_switch.png`

#### `pickup_backtrace_module` — Backtrace Module  [P0]

- **Purpose:** The ability pickup that unlocks Backtrace.
- **Description:** A glowing cyan module on a small pedestal; spent version is dark.
- **Frame size:** 16×32 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 2 rows = 16×64 px at 1×. Animations in row order: `full` 1f @ 1fps loop; `spent` 1f @ 1fps loop
- **Anchor:** 0.5, 1
- **Palette:** #14102a #3cf2ff #ffffff
- **Appears in:** Rainline Depot
- **Delivery:** `pickup_backtrace_module.png`

#### `pickup_integrity_cell` — Integrity Cell  [P1]

- **Purpose:** +1 max integrity.
- **Description:** A small cyan-white energy cell with a heart-like glow.
- **Frame size:** 12×12 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 12×12 px at 1×. Animations in row order: `idle` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #0a2a3a #3cf2ff
- **Appears in:** Alley secret
- **Delivery:** `pickup_integrity_cell.png`

#### `pickup_memory_fragment` — Memory Fragment  [P1]

- **Purpose:** Lore shard.
- **Description:** A violet crystalline shard containing a tiny flicker of a memory.
- **Frame size:** 12×12 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 12×12 px at 1×. Animations in row order: `idle` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #14102a #9b59ff #ffffff
- **Appears in:** Most regions
- **Delivery:** `pickup_memory_fragment.png`

#### `pickup_glitch_strike` — Glitch Strike Core  [P1]

- **Purpose:** Ability pickup (charged heavy attack).
- **Description:** A magenta core with orbiting broken-square glitch shards.
- **Frame size:** 16×32 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 16×32 px at 1×. Animations in row order: `idle` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #2a0a2a #ff3ea5 #ffffff
- **Appears in:** Undercroft
- **Delivery:** `pickup_glitch_strike.png`


## Pack 05 — Environment Expansion

Neon Undercity, Industrial Core, Null Cathedral: tilesets, backgrounds, props.

#### `env_undercity_tiles` — Neon Undercity — Tileset  [P1]

- **Purpose:** Terrain tiles: solid with top/left/right/bottom edges and inner corners, one-way catwalk, hazard, background wall fill.
- **Description:** Abandoned residential and commercial district reclaimed by survivors: stacked shop signs, hanging laundry, neon, arcade glow. Tiles are 16x16 logical px and must tile seamlessly. Strong top lip highlight, darker underside, readable platform edges.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 16 columns × 4 rows = 256×64 px at 1×. Animations in row order: `solid` 16f @ 1fps once (4x4 auto-tile set (edges + corners + fill)); `catwalk` 3f @ 1fps once (left cap, middle, right cap); `hazard` 4f @ 6fps loop (animated live-current surface); `details` 8f @ 1fps once (wall panels, rivets, stains)
- **Anchor:** 0, 0
- **Palette:** #0c0516 #2a2236 #b8a0d8 #ff3ea5 #4a1450
- **Variations:** Day-variant not required
- **Appears in:** Undercity Plaza, Derelict Arcade, The Leaning Towers
- **Delivery:** `env_undercity_tiles.png` — Terrain is drawn by code today (RoomView.drawTerrain). The tileset hook (auto-tiling from this sheet) is specified in ASSET_INTEGRATION_GUIDE.md and not implemented yet.

#### `env_undercity_bg_far` — Neon Undercity — Far Background  [P1]

- **Purpose:** Slowest parallax layer (0.12x camera). Tiles horizontally.
- **Description:** Far skyline/ceiling layer. Abandoned residential and commercial district reclaimed by survivors: stacked shop signs, hanging laundry, neon, arcade glow. Low contrast, atmospheric perspective, no gameplay-readable detail, seamless left-right tile. Landscape 16:9 at 480x270 logical (deliver 1920x1080).
- **Frame size:** 480×270 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 480×270 px at 1×. Animations in row order: `far` 1f @ 1fps once
- **Anchor:** 0, 0
- **Palette:** #0c0516 #2a2236 #b8a0d8 #ff3ea5 #4a1450
- **Appears in:** Undercity Plaza, Derelict Arcade, The Leaning Towers
- **Delivery:** `env_undercity_bg_far.png` — AUDIT: RoomView builds per-room textures `far-<roomId>` and never reads this key, so delivering the file does not replace the backdrop yet. See docs/GEMINI_PACK_01_BRIEF.md §7 (patch R2).

#### `env_undercity_bg_mid` — Neon Undercity — Mid Background  [P1]

- **Purpose:** Mid parallax layer (0.3x). Tiles horizontally. Larger structures.
- **Description:** Mid layer: larger structures and architecture with more contrast than the far layer. market stalls, hanging lanterns, arcade cabinets, laundry lines, tram carriage, murals, leaning tower facades. Seamless left-right tile, transparent where the far layer should show through.
- **Frame size:** 480×270 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 480×270 px at 1×. Animations in row order: `mid` 1f @ 1fps once
- **Anchor:** 0, 0
- **Palette:** #0c0516 #2a2236 #b8a0d8 #ff3ea5 #4a1450
- **Appears in:** Undercity Plaza, Derelict Arcade, The Leaning Towers
- **Delivery:** `env_undercity_bg_mid.png` — AUDIT: not read by RoomView yet (patch R2 in the Pack 01 brief).

#### `env_undercity_fg_silhouette` — Neon Undercity — Foreground Silhouettes  [P1]

- **Purpose:** Strong dark foreground shapes drawn in front of the playfield (pipes, cables, railings) at the screen edges.
- **Description:** Near-black foreground silhouettes with a subtle coloured rim light. Never cover the player: keep to the top/bottom 25% of the screen. market stalls, hanging lanterns, arcade cabinets, laundry lines, tram carriage, murals, leaning tower facades.
- **Frame size:** 480×270 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 1 rows = 1920×270 px at 1×. Animations in row order: `fg` 4f @ 1fps once (4 interchangeable strips)
- **Anchor:** 0, 0
- **Palette:** #0c0516 #2a2236 #b8a0d8 #ff3ea5 #4a1450
- **Appears in:** Undercity Plaza, Derelict Arcade, The Leaning Towers
- **Delivery:** `env_undercity_fg_silhouette.png` — No foreground layer exists yet; the renderer slot is specified in the guide.

#### `env_undercity_props` — Neon Undercity — Props  [P1]

- **Purpose:** Decorative set dressing placed by room data (non-colliding).
- **Description:** Eight standalone props on a transparent background, each within 48x48 logical px: market stalls, hanging lanterns, arcade cabinets, laundry lines, tram carriage, murals, leaning tower facades. Each must read at small size and share the region palette.
- **Frame size:** 48×48 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 8 columns × 1 rows = 384×48 px at 1×. Animations in row order: `props` 8f @ 1fps once (8 props; see description)
- **Anchor:** 0.5, 1
- **Palette:** #0c0516 #2a2236 #b8a0d8 #ff3ea5 #4a1450
- **Appears in:** Undercity Plaza, Derelict Arcade, The Leaning Towers
- **Delivery:** `env_undercity_props.png` — Rooms do not place props yet; slots are reserved.

#### `env_industrial_tiles` — Industrial Core — Tileset  [P1]

- **Purpose:** Terrain tiles: solid with top/left/right/bottom edges and inner corners, one-way catwalk, hazard, background wall fill.
- **Description:** Heavy machinery and heat: pipes, conveyors, molten channels, amber light, steam plumes, reactor cyan. Tiles are 16x16 logical px and must tile seamlessly. Strong top lip highlight, darker underside, readable platform edges.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 16 columns × 4 rows = 256×64 px at 1×. Animations in row order: `solid` 16f @ 1fps once (4x4 auto-tile set (edges + corners + fill)); `catwalk` 3f @ 1fps once (left cap, middle, right cap); `hazard` 4f @ 6fps loop (animated live-current surface); `details` 8f @ 1fps once (wall panels, rivets, stains)
- **Anchor:** 0, 0
- **Palette:** #100804 #2e2a2a #c99a6a #ff9f3e #4a1a0a
- **Variations:** Day-variant not required
- **Appears in:** The Pipeworks, The Foundry, Reactor Hall, The Kiln
- **Delivery:** `env_industrial_tiles.png` — Terrain is drawn by code today (RoomView.drawTerrain). The tileset hook (auto-tiling from this sheet) is specified in ASSET_INTEGRATION_GUIDE.md and not implemented yet.

#### `env_industrial_bg_far` — Industrial Core — Far Background  [P1]

- **Purpose:** Slowest parallax layer (0.12x camera). Tiles horizontally.
- **Description:** Far skyline/ceiling layer. Heavy machinery and heat: pipes, conveyors, molten channels, amber light, steam plumes, reactor cyan. Low contrast, atmospheric perspective, no gameplay-readable detail, seamless left-right tile. Landscape 16:9 at 480x270 logical (deliver 1920x1080).
- **Frame size:** 480×270 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 480×270 px at 1×. Animations in row order: `far` 1f @ 1fps once
- **Anchor:** 0, 0
- **Palette:** #100804 #2e2a2a #c99a6a #ff9f3e #4a1a0a
- **Appears in:** The Pipeworks, The Foundry, Reactor Hall, The Kiln
- **Delivery:** `env_industrial_bg_far.png` — AUDIT: RoomView builds per-room textures `far-<roomId>` and never reads this key, so delivering the file does not replace the backdrop yet. See docs/GEMINI_PACK_01_BRIEF.md §7 (patch R2).

#### `env_industrial_bg_mid` — Industrial Core — Mid Background  [P1]

- **Purpose:** Mid parallax layer (0.3x). Tiles horizontally. Larger structures.
- **Description:** Mid layer: larger structures and architecture with more contrast than the far layer. pipes, valve wheels, conveyor segments, furnace mouths, crane hooks, reactor rods, warning lamps. Seamless left-right tile, transparent where the far layer should show through.
- **Frame size:** 480×270 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 480×270 px at 1×. Animations in row order: `mid` 1f @ 1fps once
- **Anchor:** 0, 0
- **Palette:** #100804 #2e2a2a #c99a6a #ff9f3e #4a1a0a
- **Appears in:** The Pipeworks, The Foundry, Reactor Hall, The Kiln
- **Delivery:** `env_industrial_bg_mid.png` — AUDIT: not read by RoomView yet (patch R2 in the Pack 01 brief).

#### `env_industrial_fg_silhouette` — Industrial Core — Foreground Silhouettes  [P1]

- **Purpose:** Strong dark foreground shapes drawn in front of the playfield (pipes, cables, railings) at the screen edges.
- **Description:** Near-black foreground silhouettes with a subtle coloured rim light. Never cover the player: keep to the top/bottom 25% of the screen. pipes, valve wheels, conveyor segments, furnace mouths, crane hooks, reactor rods, warning lamps.
- **Frame size:** 480×270 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 1 rows = 1920×270 px at 1×. Animations in row order: `fg` 4f @ 1fps once (4 interchangeable strips)
- **Anchor:** 0, 0
- **Palette:** #100804 #2e2a2a #c99a6a #ff9f3e #4a1a0a
- **Appears in:** The Pipeworks, The Foundry, Reactor Hall, The Kiln
- **Delivery:** `env_industrial_fg_silhouette.png` — No foreground layer exists yet; the renderer slot is specified in the guide.

#### `env_industrial_props` — Industrial Core — Props  [P1]

- **Purpose:** Decorative set dressing placed by room data (non-colliding).
- **Description:** Eight standalone props on a transparent background, each within 48x48 logical px: pipes, valve wheels, conveyor segments, furnace mouths, crane hooks, reactor rods, warning lamps. Each must read at small size and share the region palette.
- **Frame size:** 48×48 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 8 columns × 1 rows = 384×48 px at 1×. Animations in row order: `props` 8f @ 1fps once (8 props; see description)
- **Anchor:** 0.5, 1
- **Palette:** #100804 #2e2a2a #c99a6a #ff9f3e #4a1a0a
- **Appears in:** The Pipeworks, The Foundry, Reactor Hall, The Kiln
- **Delivery:** `env_industrial_props.png` — Rooms do not place props yet; slots are reserved.

#### `env_cathedral_tiles` — Null Cathedral — Tileset  [P1]

- **Purpose:** Terrain tiles: solid with top/left/right/bottom edges and inner corners, one-way catwalk, hazard, background wall fill.
- **Description:** A converted cathedral holding every erased memory: gothic arches, server stacks as pews, violet light, floating data motes, void cracks. Tiles are 16x16 logical px and must tile seamlessly. Strong top lip highlight, darker underside, readable platform edges.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 16 columns × 4 rows = 256×64 px at 1×. Animations in row order: `solid` 16f @ 1fps once (4x4 auto-tile set (edges + corners + fill)); `catwalk` 3f @ 1fps once (left cap, middle, right cap); `hazard` 4f @ 6fps loop (animated live-current surface); `details` 8f @ 1fps once (wall panels, rivets, stains)
- **Anchor:** 0, 0
- **Palette:** #06020e #1c1030 #b070ff #cc44ff #2a0a4a
- **Variations:** Day-variant not required
- **Appears in:** The Null Archive, The Nave, The Sanctum
- **Delivery:** `env_cathedral_tiles.png` — Terrain is drawn by code today (RoomView.drawTerrain). The tileset hook (auto-tiling from this sheet) is specified in ASSET_INTEGRATION_GUIDE.md and not implemented yet.

#### `env_cathedral_bg_far` — Null Cathedral — Far Background  [P1]

- **Purpose:** Slowest parallax layer (0.12x camera). Tiles horizontally.
- **Description:** Far skyline/ceiling layer. A converted cathedral holding every erased memory: gothic arches, server stacks as pews, violet light, floating data motes, void cracks. Low contrast, atmospheric perspective, no gameplay-readable detail, seamless left-right tile. Landscape 16:9 at 480x270 logical (deliver 1920x1080).
- **Frame size:** 480×270 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 480×270 px at 1×. Animations in row order: `far` 1f @ 1fps once
- **Anchor:** 0, 0
- **Palette:** #06020e #1c1030 #b070ff #cc44ff #2a0a4a
- **Appears in:** The Null Archive, The Nave, The Sanctum
- **Delivery:** `env_cathedral_bg_far.png` — AUDIT: RoomView builds per-room textures `far-<roomId>` and never reads this key, so delivering the file does not replace the backdrop yet. See docs/GEMINI_PACK_01_BRIEF.md §7 (patch R2).

#### `env_cathedral_bg_mid` — Null Cathedral — Mid Background  [P1]

- **Purpose:** Mid parallax layer (0.3x). Tiles horizontally. Larger structures.
- **Description:** Mid layer: larger structures and architecture with more contrast than the far layer. arches, server pews, memory-core racks, stained-glass data windows, void cracks, floating motes. Seamless left-right tile, transparent where the far layer should show through.
- **Frame size:** 480×270 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 480×270 px at 1×. Animations in row order: `mid` 1f @ 1fps once
- **Anchor:** 0, 0
- **Palette:** #06020e #1c1030 #b070ff #cc44ff #2a0a4a
- **Appears in:** The Null Archive, The Nave, The Sanctum
- **Delivery:** `env_cathedral_bg_mid.png` — AUDIT: not read by RoomView yet (patch R2 in the Pack 01 brief).

#### `env_cathedral_fg_silhouette` — Null Cathedral — Foreground Silhouettes  [P1]

- **Purpose:** Strong dark foreground shapes drawn in front of the playfield (pipes, cables, railings) at the screen edges.
- **Description:** Near-black foreground silhouettes with a subtle coloured rim light. Never cover the player: keep to the top/bottom 25% of the screen. arches, server pews, memory-core racks, stained-glass data windows, void cracks, floating motes.
- **Frame size:** 480×270 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 1 rows = 1920×270 px at 1×. Animations in row order: `fg` 4f @ 1fps once (4 interchangeable strips)
- **Anchor:** 0, 0
- **Palette:** #06020e #1c1030 #b070ff #cc44ff #2a0a4a
- **Appears in:** The Null Archive, The Nave, The Sanctum
- **Delivery:** `env_cathedral_fg_silhouette.png` — No foreground layer exists yet; the renderer slot is specified in the guide.

#### `env_cathedral_props` — Null Cathedral — Props  [P1]

- **Purpose:** Decorative set dressing placed by room data (non-colliding).
- **Description:** Eight standalone props on a transparent background, each within 48x48 logical px: arches, server pews, memory-core racks, stained-glass data windows, void cracks, floating motes. Each must read at small size and share the region palette.
- **Frame size:** 48×48 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 8 columns × 1 rows = 384×48 px at 1×. Animations in row order: `props` 8f @ 1fps once (8 props; see description)
- **Anchor:** 0.5, 1
- **Palette:** #06020e #1c1030 #b070ff #cc44ff #2a0a4a
- **Appears in:** The Null Archive, The Nave, The Sanctum
- **Delivery:** `env_cathedral_props.png` — Rooms do not place props yet; slots are reserved.

#### `pickup_kinetic_coil` — Kinetic Coil  [P0]

- **Purpose:** Ability pickup: air jump.
- **Description:** A spring-like copper-and-cyan coil crackling with kinetic sparks, on a bracket from the Core crews.
- **Frame size:** 16×32 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 1 rows = 64×32 px at 1×. Animations in row order: `idle` 4f @ 6fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #2a1808 #e08a2e #3cf2ff
- **Appears in:** Derelict Arcade
- **Delivery:** `pickup_kinetic_coil.png`

#### `pickup_scrap` — Scrap Cache  [P1]

- **Purpose:** Currency cache.
- **Description:** A handful of bright amber metal scrap and wire, glinting.
- **Frame size:** 12×12 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 2 columns × 1 rows = 24×12 px at 1×. Animations in row order: `idle` 2f @ 3fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #2a1808 #ffb02e #ffffff
- **Appears in:** Most rooms
- **Delivery:** `pickup_scrap.png`

#### `pickup_upgrade_core` — Upgrade Core  [P1]

- **Purpose:** Free Backtrace upgrade level.
- **Description:** A hexagonal violet-cyan core with an inner ring, brighter than a cell.
- **Frame size:** 14×14 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 2 columns × 1 rows = 28×14 px at 1×. Animations in row order: `idle` 2f @ 3fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #14102a #9b59ff #3cf2ff
- **Appears in:** Hidden rooms
- **Delivery:** `pickup_upgrade_core.png`

#### `pickup_item` — Quest Item / Parcel  [P1]

- **Purpose:** Keycards, med kit, parcels, shard, fuse. One icon per item is in icons_items.
- **Description:** A small package on the ground with a coloured status light (colour per item).
- **Frame size:** 12×12 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 12×12 px at 1×. Animations in row order: `idle` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #2a2a38 #c9d4ff #ffb02e
- **Appears in:** Various
- **Delivery:** `pickup_item.png`

#### `pickup_record` — Lore Record  [P1]

- **Purpose:** Readable record: counts toward Echoes of the Lowlands.
- **Description:** A torn notice, plaque or data slate with a faint violet glow.
- **Frame size:** 12×12 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 12×12 px at 1×. Animations in row order: `idle` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #14102a #e8dcc8 #9b59ff
- **Appears in:** All regions
- **Delivery:** `pickup_record.png`


## Pack 06 — Bosses and Effects

Boss sprite sheets, combat effects, Backtrace effects, environmental effects.

#### `boss_bulwark_9` — BULWARK-9  [P0]

- **Purpose:** Riot-control mech miniboss (charge, leap, plasma rain).
- **Description:** A squat decommissioned riot mech: slab-like torso, drop-down visor with a single red slit, hydraulic piston legs, shoulder-mounted plasma launchers. Peeling Precinct stencil, sparks from the neck when stunned.
- **Frame size:** 48×40 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 6 rows = 48×240 px at 1×. Animations in row order: `idle` 1f @ 1fps loop; `windup` 1f @ 1fps loop; `charge` 1f @ 1fps loop; `leap` 1f @ 1fps loop; `stunned` 1f @ 1fps loop; `dead` 1f @ 1fps loop
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 34×30 at offset 7, 10
- **Palette:** #1a1a22 #6a6a82 #ff3b4e #ffb02e
- **Appears in:** Precinct Vault
- **Delivery:** `boss_bulwark_9.png`

#### `boss_panoptix_0` — PANOPTIX-0  [P0]

- **Purpose:** Surveillance-AI boss (sweeping laser, drones, death beams).
- **Description:** A floating mechanical eye the size of a cart on a ring of spider legs, iris of concentric violet rings, cables trailing into the ceiling. The iris dilates before each laser.
- **Frame size:** 64×64 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 4 rows = 64×256 px at 1×. Animations in row order: `idle` 1f @ 1fps loop; `laser` 1f @ 1fps loop; `stagger` 1f @ 1fps loop; `dead` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #14102a #7755cc #cc44ff #ffffff
- **Appears in:** Null Archive
- **Delivery:** `boss_panoptix_0.png`

#### `boss_kiln_7` — KILN-7  [P0]

- **Purpose:** Industrial furnace-warden: piston slams, steam vents, ember rain, furnace sweep.
- **Description:** A furnace as a creature: a barrel-chested iron kiln with a glowing grated core in its belly, three piston arms hung from the ceiling-rails, steam stacks on its back. The core is hidden behind iron shutters that clang open during the exposed window.
- **Frame size:** 80×64 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 6 rows = 320×384 px at 1×. Animations in row order: `idle` 2f @ 2fps loop; `telegraph` 2f @ 6fps once; `active` 3f @ 14fps once; `exposed` 2f @ 5fps once (Furnace core visible; this is the damage window.); `hurt` 1f @ 1fps once; `death` 4f @ 6fps once
- **Anchor:** 0.5, 1
- **Hitbox (gameplay, for reference):** 60×46 at offset 10, 18
- **Palette:** #1c1210 #6a3a22 #ff6a2e #ffd070
- **Appears in:** The Kiln
- **Delivery:** `boss_kiln_7.png`

#### `boss_the_null` — THE NULL  [P0]

- **Purpose:** Final boss: a void entity that rewinds itself like the Courier.
- **Description:** A tall humanoid hole in the world: a void-black silhouette with a faintly human posture, edges torn into scan-lined shards, a ring of floating magenta/cyan dots (erased minutes) around its chest. Its face is a smooth blank; occasional flickers show a stranger's faces.
- **Frame size:** 48×72 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 6 columns × 6 rows = 288×432 px at 1×. Animations in row order: `idle` 4f @ 4fps loop; `telegraph` 2f @ 6fps once; `attack` 3f @ 14fps once; `exposed` 2f @ 5fps once; `rewind` 3f @ 16fps once (Snaps back along its own trail.); `death` 6f @ 6fps once (Unravels into every colour it ever erased.)
- **Anchor:** 0.5, 0.5
- **Hitbox (gameplay, for reference):** 22×36 at offset 13, 18
- **Palette:** #05020a #3a0a5a #ff3ea5 #3cf2ff
- **Appears in:** The Sanctum
- **Delivery:** `boss_the_null.png`

#### `obj_boss_gate` — Boss Gate  [P0]

- **Purpose:** Arena seal that closes when a boss fight begins.
- **Description:** A vertical force-shutter tile: red-white laser bars with a bright top cap.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 16×16 px at 1×. Animations in row order: `gate` 1f @ 1fps loop
- **Anchor:** 0, 0
- **Palette:** #2a0a14 #ff3b4e #ffffff
- **Appears in:** Boss arenas
- **Delivery:** `obj_boss_gate.png`

#### `fx_slash_side` — Slash — Side  [P1]

- **Purpose:** Rail-blade arc for side attacks.
- **Description:** A bright white-cyan crescent arc with a motion-blur tail, additive blend.
- **Frame size:** 36×28 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 1 rows = 144×28 px at 1×. Animations in row order: `slash` 4f @ 20fps once
- **Anchor:** 0.5, 0.5
- **Palette:** #ffffff #3cf2ff
- **Appears in:** Combat
- **Delivery:** `fx_slash_side.png`

#### `fx_slash_up` — Slash — Up  [P1]

- **Purpose:** Upward arc.
- **Description:** Vertical crescent for upward attacks.
- **Frame size:** 28×36 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 1 rows = 112×36 px at 1×. Animations in row order: `slash` 4f @ 20fps once
- **Anchor:** 0.5, 0.5
- **Palette:** #ffffff #3cf2ff
- **Appears in:** Combat
- **Delivery:** `fx_slash_up.png`

#### `fx_slash_down` — Slash — Down  [P1]

- **Purpose:** Downward arc (pogo).
- **Description:** Vertical crescent pointing down with a spark tip.
- **Frame size:** 28×36 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 1 rows = 112×36 px at 1×. Animations in row order: `slash` 4f @ 20fps once
- **Anchor:** 0.5, 0.5
- **Palette:** #ffffff #ffb02e
- **Appears in:** Combat
- **Delivery:** `fx_slash_down.png`

#### `fx_hit_spark` — Hit Spark  [P1]

- **Purpose:** Impact flash on hits.
- **Description:** A star-shaped white flash fading to amber embers; 5 frames.
- **Frame size:** 24×24 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 5 columns × 1 rows = 120×24 px at 1×. Animations in row order: `spark` 5f @ 24fps once
- **Anchor:** 0.5, 0.5
- **Palette:** #ffffff #ffb02e
- **Appears in:** Combat
- **Delivery:** `fx_hit_spark.png`

#### `fx_glitch_strike` — Glitch Strike  [P1]

- **Purpose:** Charged heavy attack burst.
- **Description:** A broken-square magenta shockwave with RGB split, wider than the slash.
- **Frame size:** 64×40 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 6 columns × 1 rows = 384×40 px at 1×. Animations in row order: `strike` 6f @ 20fps once
- **Anchor:** 0.5, 0.5
- **Palette:** #ff3ea5 #3cf2ff #ffffff
- **Appears in:** Combat
- **Delivery:** `fx_glitch_strike.png`

#### `fx_enemy_telegraph` — Enemy Telegraph Glint  [P1]

- **Purpose:** Readable tell above an enemy about to attack.
- **Description:** A sharp white four-point star that pulses once before an attack lands.
- **Frame size:** 12×12 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 1 rows = 48×12 px at 1×. Animations in row order: `glint` 4f @ 14fps once
- **Anchor:** 0.5, 0.5
- **Palette:** #ffffff #ff3b4e
- **Appears in:** Combat
- **Delivery:** `fx_enemy_telegraph.png`

#### `fx_boss_floor_telegraph` — Boss Floor Telegraph  [P0]

- **Purpose:** Danger zone markers on the floor / columns.
- **Description:** A red hazard-chevron bar that fills with light as the strike approaches; strike frames are a solid white-red column.
- **Frame size:** 32×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 2 rows = 128×32 px at 1×. Animations in row order: `telegraph` 4f @ 8fps loop; `strike` 3f @ 16fps once
- **Anchor:** 0.5, 1
- **Palette:** #ff3b4e #ffffff
- **Appears in:** Combat
- **Delivery:** `fx_boss_floor_telegraph.png`

#### `fx_laser_beam` — Laser / Steam Beam  [P1]

- **Purpose:** Hazard emitter beams.
- **Description:** Tileable beam segments (laser: thin red-white; steam: soft white plume). They tile along the beam length.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 4 rows = 64×64 px at 1×. Animations in row order: `laserTelegraph` 2f @ 10fps loop; `laserActive` 2f @ 20fps loop; `steamTelegraph` 2f @ 10fps loop; `steamActive` 4f @ 12fps loop
- **Anchor:** 0, 0
- **Palette:** #ff3b4e #ffffff #c9d4ff
- **Appears in:** Combat
- **Delivery:** `fx_laser_beam.png`

#### `fx_projectile_set` — Projectiles  [P1]

- **Purpose:** Bolt, shockwave, plasma rain.
- **Description:** Magenta bolt, amber ground shockwave front, red falling plasma. All glow additively.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 3 columns × 3 rows = 48×48 px at 1×. Animations in row order: `bolt` 2f @ 12fps loop; `shockwave` 3f @ 12fps loop; `plasma` 3f @ 12fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #ff3ea5 #ffb02e #ff3b4e
- **Appears in:** Combat
- **Delivery:** `fx_projectile_set.png` — Placeholder reuses each key for every frame of its row.

#### `fx_steam_vent` — Steam Plume  [P1]

- **Purpose:** Ambient / hazard steam.
- **Description:** A rising soft white-grey steam plume with turbulence.
- **Frame size:** 32×48 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 6 columns × 1 rows = 192×48 px at 1×. Animations in row order: `plume` 6f @ 10fps loop
- **Anchor:** 0.5, 1
- **Palette:** #c9d4ff #ffffff
- **Appears in:** Pipeworks, Kiln
- **Delivery:** `fx_steam_vent.png`

#### `fx_backtrace_arrival` — Backtrace Arrival Burst  [P0]

- **Purpose:** Burst at the echo point on arrival (damages enemies).
- **Description:** An expanding cyan shockwave ring with glitch slices and time-dial tick marks; white core flash first.
- **Frame size:** 96×96 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 8 columns × 1 rows = 768×96 px at 1×. Animations in row order: `burst` 8f @ 24fps once
- **Anchor:** 0.5, 0.5
- **Palette:** #3cf2ff #ffffff #ff3ea5
- **Appears in:** Combat
- **Delivery:** `fx_backtrace_arrival.png`

#### `fx_backtrace_echo` — Backtrace Echo (Afterimage)  [P0]

- **Purpose:** The translucent afterimage showing where Backtrace will send the Courier (and what echo plates respond to).
- **Description:** The Courier silhouette in translucent cyan with scan lines and a small clock-dial above the head; fainter and desaturated while cooling down.
- **Frame size:** 31×36 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 2 rows = 124×72 px at 1×. Animations in row order: `ready` 4f @ 6fps loop; `cooling` 1f @ 1fps loop
- **Anchor:** 0.5, 1
- **Palette:** #3cf2ff #e8ffff
- **Appears in:** Combat
- **Delivery:** `fx_backtrace_echo.png` — The echo view reuses Courier frames tinted cyan.

#### `fx_backtrace_streak` — Backtrace Streak  [P1]

- **Purpose:** Line drawn from where you were to where you arrive.
- **Description:** A horizontal cyan motion streak with trailing glitch squares (the game stretches it between two points).
- **Frame size:** 64×8 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 4 columns × 1 rows = 256×8 px at 1×. Animations in row order: `streak` 4f @ 20fps once
- **Anchor:** 0, 0.5
- **Palette:** #3cf2ff #ffffff
- **Appears in:** Combat
- **Delivery:** `fx_backtrace_streak.png` — Drawn as a code line today.

#### `fx_temporal_plate_pulse` — Temporal Plate Pulse  [P1]

- **Purpose:** Pulse when an echo plate is pressed by the afterimage.
- **Description:** A violet clock-ring that expands from the plate and ticks.
- **Frame size:** 32×32 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 6 columns × 1 rows = 192×32 px at 1×. Animations in row order: `pulse` 6f @ 16fps once
- **Anchor:** 0.5, 1
- **Palette:** #9b59ff #ffffff
- **Appears in:** Combat
- **Delivery:** `fx_temporal_plate_pulse.png`

#### `fx_null_void` — Null Void Cracks  [P0]

- **Purpose:** THE NULL arena ambience, imprint marker and unravelling.
- **Description:** Imprint: a pulsing magenta ring with tick marks. Cracks: jagged void fissures with starlight inside. Unravel: the boss dissolving into coloured dust.
- **Frame size:** 64×64 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 8 columns × 3 rows = 512×192 px at 1×. Animations in row order: `imprint` 6f @ 8fps loop; `crack` 4f @ 6fps loop; `unravel` 8f @ 10fps once
- **Anchor:** 0.5, 0.5
- **Palette:** #05020a #ff3ea5 #3cf2ff
- **Appears in:** The Sanctum
- **Delivery:** `fx_null_void.png`


## Pack 07 — UI and Audio

UI artwork, icons, dialogue portraits, music and sound effects.

#### `ui_portrait_zero` — Zero — Portrait  [P1]

- **Purpose:** Bust shown beside dialogue lines.
- **Description:** Half-length portrait of Zero, facing slightly left (toward the dialogue text), strong rim light, transparent background, neutral/talking/emotional variants.
- **Frame size:** 96×96 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 2 columns × 3 rows = 192×288 px at 1×. Animations in row order: `neutral` 1f @ 1fps loop; `talk` 2f @ 5fps loop; `alt` 1f @ 1fps loop
- **Anchor:** 0.5, 1
- **Palette:** #14102a #e8dcc8 #3cf2ff
- **Appears in:** Dialogue panel
- **Delivery:** `ui_portrait_zero.png` — The dialogue panel currently shows the NPC placeholder sprite enlarged; the portrait slot is reserved.

#### `ui_portrait_mira` — Mira — Portrait  [P1]

- **Purpose:** Bust shown beside dialogue lines.
- **Description:** Half-length portrait of Mira, facing slightly left (toward the dialogue text), strong rim light, transparent background, neutral/talking/emotional variants.
- **Frame size:** 96×96 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 2 columns × 3 rows = 192×288 px at 1×. Animations in row order: `neutral` 1f @ 1fps loop; `talk` 2f @ 5fps loop; `alt` 1f @ 1fps loop
- **Anchor:** 0.5, 1
- **Palette:** #14102a #e8dcc8 #3cf2ff
- **Appears in:** Dialogue panel
- **Delivery:** `ui_portrait_mira.png` — The dialogue panel currently shows the NPC placeholder sprite enlarged; the portrait slot is reserved.

#### `ui_portrait_halden` — Halden — Portrait  [P1]

- **Purpose:** Bust shown beside dialogue lines.
- **Description:** Half-length portrait of Halden, facing slightly left (toward the dialogue text), strong rim light, transparent background, neutral/talking/emotional variants.
- **Frame size:** 96×96 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 2 columns × 3 rows = 192×288 px at 1×. Animations in row order: `neutral` 1f @ 1fps loop; `talk` 2f @ 5fps loop; `alt` 1f @ 1fps loop
- **Anchor:** 0.5, 1
- **Palette:** #14102a #e8dcc8 #3cf2ff
- **Appears in:** Dialogue panel
- **Delivery:** `ui_portrait_halden.png` — The dialogue panel currently shows the NPC placeholder sprite enlarged; the portrait slot is reserved.

#### `ui_portrait_ilse` — Doc Ilse — Portrait  [P1]

- **Purpose:** Bust shown beside dialogue lines.
- **Description:** Half-length portrait of Doc Ilse, facing slightly left (toward the dialogue text), strong rim light, transparent background, neutral/talking/emotional variants.
- **Frame size:** 96×96 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 2 columns × 3 rows = 192×288 px at 1×. Animations in row order: `neutral` 1f @ 1fps loop; `talk` 2f @ 5fps loop; `alt` 1f @ 1fps loop
- **Anchor:** 0.5, 1
- **Palette:** #14102a #e8dcc8 #3cf2ff
- **Appears in:** Dialogue panel
- **Delivery:** `ui_portrait_ilse.png` — The dialogue panel currently shows the NPC placeholder sprite enlarged; the portrait slot is reserved.

#### `ui_portrait_brannt` — Brannt — Portrait  [P1]

- **Purpose:** Bust shown beside dialogue lines.
- **Description:** Half-length portrait of Brannt, facing slightly left (toward the dialogue text), strong rim light, transparent background, neutral/talking/emotional variants.
- **Frame size:** 96×96 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 2 columns × 3 rows = 192×288 px at 1×. Animations in row order: `neutral` 1f @ 1fps loop; `talk` 2f @ 5fps loop; `alt` 1f @ 1fps loop
- **Anchor:** 0.5, 1
- **Palette:** #14102a #e8dcc8 #3cf2ff
- **Appears in:** Dialogue panel
- **Delivery:** `ui_portrait_brannt.png` — The dialogue panel currently shows the NPC placeholder sprite enlarged; the portrait slot is reserved.

#### `ui_portrait_wren` — Wren — Portrait  [P1]

- **Purpose:** Bust shown beside dialogue lines.
- **Description:** Half-length portrait of Wren, facing slightly left (toward the dialogue text), strong rim light, transparent background, neutral/talking/emotional variants.
- **Frame size:** 96×96 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 2 columns × 3 rows = 192×288 px at 1×. Animations in row order: `neutral` 1f @ 1fps loop; `talk` 2f @ 5fps loop; `alt` 1f @ 1fps loop
- **Anchor:** 0.5, 1
- **Palette:** #14102a #e8dcc8 #3cf2ff
- **Appears in:** Dialogue panel
- **Delivery:** `ui_portrait_wren.png` — The dialogue panel currently shows the NPC placeholder sprite enlarged; the portrait slot is reserved.

#### `ui_portrait_kestrel` — Kestrel — Portrait  [P1]

- **Purpose:** Bust shown beside dialogue lines.
- **Description:** Half-length portrait of Kestrel, facing slightly left (toward the dialogue text), strong rim light, transparent background, neutral/talking/emotional variants.
- **Frame size:** 96×96 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 2 columns × 3 rows = 192×288 px at 1×. Animations in row order: `neutral` 1f @ 1fps loop; `talk` 2f @ 5fps loop; `alt` 1f @ 1fps loop
- **Anchor:** 0.5, 1
- **Palette:** #14102a #e8dcc8 #3cf2ff
- **Appears in:** Dialogue panel
- **Delivery:** `ui_portrait_kestrel.png` — The dialogue panel currently shows the NPC placeholder sprite enlarged; the portrait slot is reserved.

#### `ui_portrait_vesper` — Dr. Vesper — Portrait  [P1]

- **Purpose:** Bust shown beside dialogue lines.
- **Description:** Half-length portrait of Dr. Vesper, facing slightly left (toward the dialogue text), strong rim light, transparent background, neutral/talking/emotional variants.
- **Frame size:** 96×96 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 2 columns × 3 rows = 192×288 px at 1×. Animations in row order: `neutral` 1f @ 1fps loop; `talk` 2f @ 5fps loop; `alt` 1f @ 1fps loop
- **Anchor:** 0.5, 1
- **Palette:** #14102a #e8dcc8 #3cf2ff
- **Appears in:** Dialogue panel
- **Delivery:** `ui_portrait_vesper.png` — The dialogue panel currently shows the NPC placeholder sprite enlarged; the portrait slot is reserved.

#### `ui_title_emblem` — Title Emblem  [P1]

- **Purpose:** Title screen emblem behind the logotype.
- **Description:** A cyan-magenta clock-ring (rewind arrow) over a rain-streaked cityscape glow. Additive blend friendly; transparent background.
- **Frame size:** 160×90 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 160×90 px at 1×. Animations in row order: `emblem` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #3cf2ff #ff3ea5 #05060c
- **Appears in:** UI
- **Delivery:** `ui_title_emblem.png`

#### `ui_hud_cell` — Integrity Cell (HUD)  [P0]

- **Purpose:** Health pips.
- **Description:** A small hex-cell: bright cyan when full, dark outlined when empty.
- **Frame size:** 8×12 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 2 rows = 8×24 px at 1×. Animations in row order: `full` 1f @ 1fps loop; `empty` 1f @ 1fps loop
- **Anchor:** 0, 0.5
- **Palette:** #3cf2ff #14102a
- **Appears in:** UI
- **Delivery:** `ui_hud_cell.png`

#### `ui_hud_backtrace` — Backtrace Indicator  [P0]

- **Purpose:** Backtrace readiness icon with cooldown fill.
- **Description:** A rewind clock-arrow glyph in a ring.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 16×16 px at 1×. Animations in row order: `icon` 1f @ 1fps loop
- **Anchor:** 0, 0.5
- **Palette:** #3cf2ff #9b59ff
- **Appears in:** UI
- **Delivery:** `ui_hud_backtrace.png`

#### `ui_panel_9slice` — Panel (9-slice)  [P1]

- **Purpose:** Dialogue panel, menus, journal pages. Scales without distortion.
- **Description:** A dark translucent plate with a thin cyan outline, chamfered corners, subtle scan lines; 16px corner slices.
- **Frame size:** 48×48 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 48×48 px at 1×. Animations in row order: `panel` 1f @ 1fps loop
- **Anchor:** 0, 0
- **Palette:** #0a0a18 #3cf2ff #9b59ff
- **Appears in:** UI
- **Delivery:** `ui_panel_9slice.png` — Panels are drawn by code (rectangles); a 9-slice hook is specified in the guide.

#### `ui_button_9slice` — Button (9-slice)  [P1]

- **Purpose:** Menu buttons with idle / focus / pressed states.
- **Description:** A chamfered rectangle button; focus adds a bright cyan edge, pressed a violet fill.
- **Frame size:** 48×24 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 3 rows = 48×72 px at 1×. Animations in row order: `idle` 1f @ 1fps loop; `focus` 1f @ 1fps loop; `pressed` 1f @ 1fps loop
- **Anchor:** 0, 0
- **Palette:** #0a0a18 #3cf2ff #9b59ff
- **Appears in:** UI
- **Delivery:** `ui_button_9slice.png`

#### `ui_touch_controls` — Touch Controls  [P0]

- **Purpose:** On-screen action buttons and the floating joystick.
- **Description:** Round buttons with a glyph (not text) per action: boot-spring (jump), blade (attack), chevrons (dash), rewind arrow (REW), hand (talk), bars (pause). Each has idle and pressed frames. Stick: translucent ring base and a bright knob.
- **Frame size:** 48×48 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 2 columns × 8 rows = 96×384 px at 1×. Animations in row order: `jump` 2f @ 1fps loop; `attack` 2f @ 1fps loop; `dash` 2f @ 1fps loop; `backtrace` 2f @ 1fps loop; `interact` 2f @ 1fps loop; `pause` 2f @ 1fps loop; `stickBase` 1f @ 1fps loop; `stickKnob` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #0a0a18 #3cf2ff #ff3ea5 #ff9f3e #9b59ff
- **Appears in:** UI
- **Delivery:** `ui_touch_controls.png` — Buttons are drawn by code today.

#### `ui_boss_bar` — Boss Health Bar  [P1]

- **Purpose:** Boss HP bar with name plate and phase pips.
- **Description:** A wide ornate bar frame with a segmented fill and three phase notches.
- **Frame size:** 220×24 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 2 columns × 3 rows = 440×72 px at 1×. Animations in row order: `frame` 1f @ 1fps loop; `fill` 1f @ 1fps loop; `phasePip` 2f @ 1fps loop
- **Anchor:** 0.5, 1
- **Palette:** #0a0a18 #ff3ea5 #ffb02e
- **Appears in:** UI
- **Delivery:** `ui_boss_bar.png`

#### `ui_map_frame` — World Map Frame and Markers  [P1]

- **Purpose:** World map: room cells, region colours, player pin, relay pin, unexplored.
- **Description:** Chunky schematic map cells with connector ticks; player pin is a pulsing cyan arrow, relay pin a small diamond.
- **Frame size:** 24×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 2 columns × 5 rows = 48×80 px at 1×. Animations in row order: `room` 1f @ 1fps loop; `roomVisited` 1f @ 1fps loop; `playerPin` 2f @ 3fps loop; `relayPin` 1f @ 1fps loop; `doorTick` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #0a0a18 #3cf2ff #ffb02e
- **Appears in:** UI
- **Delivery:** `ui_map_frame.png`

#### `ui_dialogue_choice` — Dialogue Choice Button  [P1]

- **Purpose:** Choice rows in conversations.
- **Description:** A slim bar with a chevron marker; focus is bright.
- **Frame size:** 200×20 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 2 rows = 200×40 px at 1×. Animations in row order: `idle` 1f @ 1fps loop; `focus` 1f @ 1fps loop
- **Anchor:** 0, 0
- **Palette:** #0a0a18 #3cf2ff
- **Appears in:** UI
- **Delivery:** `ui_dialogue_choice.png`

#### `icon_scrap` — Scrap  [P1]

- **Purpose:** Scrap icon.
- **Description:** A pile of amber scrap with a bolt. 16x16 logical px, transparent background, 1px dark outline for legibility.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 16×16 px at 1×. Animations in row order: `icon` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #ffb02e #0a0a18 #ffffff
- **Appears in:** HUD, Gear, Journal
- **Delivery:** `icon_scrap.png`

#### `icon_item_keycard` — Precinct Keycard  [P1]

- **Purpose:** Precinct Keycard icon.
- **Description:** A grey access card with a red stripe. 16x16 logical px, transparent background, 1px dark outline for legibility.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 16×16 px at 1×. Animations in row order: `icon` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #ffb02e #0a0a18 #ffffff
- **Appears in:** HUD, Gear, Journal
- **Delivery:** `icon_item_keycard.png`

#### `icon_item_med_kit` — Med Kit  [P1]

- **Purpose:** Med Kit icon.
- **Description:** A white case with a green cross. 16x16 logical px, transparent background, 1px dark outline for legibility.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 16×16 px at 1×. Animations in row order: `icon` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #4dff9a #0a0a18 #ffffff
- **Appears in:** HUD, Gear, Journal
- **Delivery:** `icon_item_med_kit.png`

#### `icon_item_hall_coil` — Hall Coil  [P1]

- **Purpose:** Hall Coil icon.
- **Description:** A scorched copper coil. 16x16 logical px, transparent background, 1px dark outline for legibility.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 16×16 px at 1×. Animations in row order: `icon` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #3cf2ff #0a0a18 #ffffff
- **Appears in:** HUD, Gear, Journal
- **Delivery:** `icon_item_hall_coil.png`

#### `icon_item_relay_fuse` — Relay Fuse  [P1]

- **Purpose:** Relay Fuse icon.
- **Description:** A fat magenta cartridge fuse. 16x16 logical px, transparent background, 1px dark outline for legibility.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 16×16 px at 1×. Animations in row order: `icon` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #ff3ea5 #0a0a18 #ffffff
- **Appears in:** HUD, Gear, Journal
- **Delivery:** `icon_item_relay_fuse.png`

#### `icon_item_badge` — Officer Badge  [P1]

- **Purpose:** Officer Badge icon.
- **Description:** A cracked blue shield badge. 16x16 logical px, transparent background, 1px dark outline for legibility.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 16×16 px at 1×. Animations in row order: `icon` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #c9d4ff #0a0a18 #ffffff
- **Appears in:** HUD, Gear, Journal
- **Delivery:** `icon_item_badge.png`

#### `icon_item_null_shard` — Null Shard  [P1]

- **Purpose:** Null Shard icon.
- **Description:** A black crystal with violet cracks. 16x16 logical px, transparent background, 1px dark outline for legibility.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 16×16 px at 1×. Animations in row order: `icon` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #9b59ff #0a0a18 #ffffff
- **Appears in:** HUD, Gear, Journal
- **Delivery:** `icon_item_null_shard.png`

#### `icon_item_parcel` — Parcel  [P1]

- **Purpose:** Parcel icon.
- **Description:** A taped grey courier parcel. 16x16 logical px, transparent background, 1px dark outline for legibility.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 16×16 px at 1×. Animations in row order: `icon` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #c9c9d8 #0a0a18 #ffffff
- **Appears in:** HUD, Gear, Journal
- **Delivery:** `icon_item_parcel.png`

#### `icon_upgrade_window` — Deep Echo  [P1]

- **Purpose:** Deep Echo icon.
- **Description:** A clock face with a long trailing arc. 16x16 logical px, transparent background, 1px dark outline for legibility.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 16×16 px at 1×. Animations in row order: `icon` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #3cf2ff #0a0a18 #ffffff
- **Appears in:** HUD, Gear, Journal
- **Delivery:** `icon_upgrade_window.png`

#### `icon_upgrade_cooldown` — Quick Recoil  [P1]

- **Purpose:** Quick Recoil icon.
- **Description:** A clock with a lightning spring. 16x16 logical px, transparent background, 1px dark outline for legibility.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 16×16 px at 1×. Animations in row order: `icon` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #ff9f3e #0a0a18 #ffffff
- **Appears in:** HUD, Gear, Journal
- **Delivery:** `icon_upgrade_cooldown.png`

#### `icon_upgrade_burst` — Arrival Burst  [P1]

- **Purpose:** Arrival Burst icon.
- **Description:** A starburst ring. 16x16 logical px, transparent background, 1px dark outline for legibility.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 16×16 px at 1×. Animations in row order: `icon` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #ff3ea5 #0a0a18 #ffffff
- **Appears in:** HUD, Gear, Journal
- **Delivery:** `icon_upgrade_burst.png`

#### `icon_upgrade_signal` — Signal Siphon  [P1]

- **Purpose:** Signal Siphon icon.
- **Description:** A wave with a funnel. 16x16 logical px, transparent background, 1px dark outline for legibility.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 16×16 px at 1×. Animations in row order: `icon` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #4dff9a #0a0a18 #ffffff
- **Appears in:** HUD, Gear, Journal
- **Delivery:** `icon_upgrade_signal.png`

#### `icon_ability_backtrace` — Backtrace  [P1]

- **Purpose:** Backtrace icon.
- **Description:** A rewind arrow in a ring. 16x16 logical px, transparent background, 1px dark outline for legibility.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 16×16 px at 1×. Animations in row order: `icon` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #3cf2ff #0a0a18 #ffffff
- **Appears in:** HUD, Gear, Journal
- **Delivery:** `icon_ability_backtrace.png`

#### `icon_ability_glitch` — Glitch Strike  [P1]

- **Purpose:** Glitch Strike icon.
- **Description:** A broken square slash. 16x16 logical px, transparent background, 1px dark outline for legibility.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 16×16 px at 1×. Animations in row order: `icon` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #ff3ea5 #0a0a18 #ffffff
- **Appears in:** HUD, Gear, Journal
- **Delivery:** `icon_ability_glitch.png`

#### `icon_ability_coil` — Kinetic Coil  [P1]

- **Purpose:** Kinetic Coil icon.
- **Description:** A coil spring with sparks. 16x16 logical px, transparent background, 1px dark outline for legibility.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 16×16 px at 1×. Animations in row order: `icon` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #e08a2e #0a0a18 #ffffff
- **Appears in:** HUD, Gear, Journal
- **Delivery:** `icon_ability_coil.png`

#### `icon_quest_main` — Main Quest Marker  [P1]

- **Purpose:** Main Quest Marker icon.
- **Description:** A bold diamond. 16x16 logical px, transparent background, 1px dark outline for legibility.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 16×16 px at 1×. Animations in row order: `icon` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #ffb02e #0a0a18 #ffffff
- **Appears in:** HUD, Gear, Journal
- **Delivery:** `icon_quest_main.png`

#### `icon_quest_side` — Side Quest Marker  [P1]

- **Purpose:** Side Quest Marker icon.
- **Description:** A small round marker. 16x16 logical px, transparent background, 1px dark outline for legibility.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 16×16 px at 1×. Animations in row order: `icon` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #3cf2ff #0a0a18 #ffffff
- **Appears in:** HUD, Gear, Journal
- **Delivery:** `icon_quest_side.png`

#### `icon_map_relay` — Relay Pin  [P1]

- **Purpose:** Relay Pin icon.
- **Description:** A relay pylon pin. 16x16 logical px, transparent background, 1px dark outline for legibility.
- **Frame size:** 16×16 logical px (deliver at 1×, 2× or 4×; integer multiples only)
- **Sheet:** one row per animation, 1 columns × 1 rows = 16×16 px at 1×. Animations in row order: `icon` 1f @ 1fps loop
- **Anchor:** 0.5, 0.5
- **Palette:** #3cf2ff #0a0a18 #ffffff
- **Appears in:** HUD, Gear, Journal
- **Delivery:** `icon_map_relay.png`

#### `audio_music_title` — Title Theme  [P1]

- **Purpose:** Background music: Title screen.
- **Description:** Sparse, melancholic synth pad over distant rain; a slow rewinding arpeggio.
- **Audio:** music, ~90s, seamless loop, ogg. Seamless loop; stereo; around -16 LUFS; no vocals.
- **Palette:** 
- **Appears in:** Title screen
- **Delivery:** `audio_music_title.ogg` — Procedural ambient music plays today (audio/Music.ts); a file at public/assets/final/audio/<id>.ogg replaces it.

#### `audio_music_rainline` — Rainline Alley  [P1]

- **Purpose:** Background music: Rainline Alley / Depot.
- **Description:** Wet, lonely, cool: low pulse, rain texture, one hesitant lead.
- **Audio:** music, ~120s, seamless loop, ogg. Seamless loop; stereo; around -16 LUFS; no vocals.
- **Palette:** 
- **Appears in:** Rainline Alley / Depot
- **Delivery:** `audio_music_rainline.ogg` — Procedural ambient music plays today (audio/Music.ts); a file at public/assets/final/audio/<id>.ogg replaces it.

#### `audio_music_transit` — Transit Stacks  [P1]

- **Purpose:** Background music: Transit Stacks.
- **Description:** Industrial rhythm: distant clanks and a pulsing bass, rising tension as you climb.
- **Audio:** music, ~120s, seamless loop, ogg. Seamless loop; stereo; around -16 LUFS; no vocals.
- **Palette:** 
- **Appears in:** Transit Stacks
- **Delivery:** `audio_music_transit.ogg` — Procedural ambient music plays today (audio/Music.ts); a file at public/assets/final/audio/<id>.ogg replaces it.

#### `audio_music_precinct` — Precinct Vault  [P1]

- **Purpose:** Background music: Precinct Vault.
- **Description:** Cold, claustrophobic: sub drone, alarm-tone stabs, sparse hi-hats.
- **Audio:** music, ~120s, seamless loop, ogg. Seamless loop; stereo; around -16 LUFS; no vocals.
- **Palette:** 
- **Appears in:** Precinct Vault
- **Delivery:** `audio_music_precinct.ogg` — Procedural ambient music plays today (audio/Music.ts); a file at public/assets/final/audio/<id>.ogg replaces it.

#### `audio_music_undercity` — Neon Undercity  [P1]

- **Purpose:** Background music: Neon Undercity.
- **Description:** Warm, hopeful community: marimba-like synth, dusty drum machine, a human hum.
- **Audio:** music, ~150s, seamless loop, ogg. Seamless loop; stereo; around -16 LUFS; no vocals.
- **Palette:** 
- **Appears in:** Neon Undercity
- **Delivery:** `audio_music_undercity.ogg` — Procedural ambient music plays today (audio/Music.ts); a file at public/assets/final/audio/<id>.ogg replaces it.

#### `audio_music_industrial` — Industrial Core  [P1]

- **Purpose:** Background music: Industrial Core.
- **Description:** Heavy, rhythmic machinery percussion with a looping bass riff and a heated drone.
- **Audio:** music, ~150s, seamless loop, ogg. Seamless loop; stereo; around -16 LUFS; no vocals.
- **Palette:** 
- **Appears in:** Industrial Core
- **Delivery:** `audio_music_industrial.ogg` — Procedural ambient music plays today (audio/Music.ts); a file at public/assets/final/audio/<id>.ogg replaces it.

#### `audio_music_cathedral` — Null Cathedral  [P1]

- **Purpose:** Background music: Null Cathedral.
- **Description:** Vast, reverent and wrong: choral pads played backwards, reversed bells, a ticking clock.
- **Audio:** music, ~150s, seamless loop, ogg. Seamless loop; stereo; around -16 LUFS; no vocals.
- **Palette:** 
- **Appears in:** Null Cathedral
- **Delivery:** `audio_music_cathedral.ogg` — Procedural ambient music plays today (audio/Music.ts); a file at public/assets/final/audio/<id>.ogg replaces it.

#### `audio_music_boss` — Boss Battle  [P1]

- **Purpose:** Background music: Boss arenas.
- **Description:** Driving, tense, percussive; clear phase-up layer. Layered stems: base, +phase2, +phase3.
- **Audio:** music, ~100s, seamless loop, ogg. Seamless loop; stereo; around -16 LUFS; no vocals.
- **Palette:** 
- **Appears in:** Boss arenas
- **Delivery:** `audio_music_boss.ogg` — Procedural ambient music plays today (audio/Music.ts); a file at public/assets/final/audio/<id>.ogg replaces it.

#### `audio_music_final_boss` — THE NULL  [P1]

- **Purpose:** Background music: The Sanctum.
- **Description:** A rewinding theme that stutters and re-plays itself; choir fragments.
- **Audio:** music, ~140s, seamless loop, ogg. Seamless loop; stereo; around -16 LUFS; no vocals.
- **Palette:** 
- **Appears in:** The Sanctum
- **Delivery:** `audio_music_final_boss.ogg` — Procedural ambient music plays today (audio/Music.ts); a file at public/assets/final/audio/<id>.ogg replaces it.

#### `audio_music_ending` — Ending  [P1]

- **Purpose:** Background music: Ending sequence.
- **Description:** A resolved, bittersweet theme built from the title melody played forward at last.
- **Audio:** music, ~80s, seamless loop, ogg. Seamless loop; stereo; around -16 LUFS; no vocals.
- **Palette:** 
- **Appears in:** Ending sequence
- **Delivery:** `audio_music_ending.ogg` — Procedural ambient music plays today (audio/Music.ts); a file at public/assets/final/audio/<id>.ogg replaces it.

#### `audio_sfx_player` — Courier SFX set  [P1]

- **Purpose:** Jump, land, dash, attack swing, hurt, air jump, glitch strike.
- **Description:** Crisp, short cyberpunk foley: cloth-and-servo.
- **Audio:** sfx, ~0.4s, one-shot, ogg. Mono, short tail, normalised to -10 dBFS peak.
- **Palette:** 
- **Appears in:** Gameplay
- **Delivery:** `audio_sfx_player.ogg` — Synthesised in code today (audio/Sfx.ts).

#### `audio_sfx_combat` — Combat SFX set  [P1]

- **Purpose:** Hit, kill, armour clang, projectile, burst.
- **Description:** Punchy impacts; a metallic clang for deflected hits; a dry crack for kills.
- **Audio:** sfx, ~0.5s, one-shot, ogg. Mono, short tail, normalised to -10 dBFS peak.
- **Palette:** 
- **Appears in:** Gameplay
- **Delivery:** `audio_sfx_combat.ogg` — Synthesised in code today (audio/Sfx.ts).

#### `audio_sfx_enemies` — Enemy SFX set  [P1]

- **Purpose:** Per-enemy telegraph and attack sounds (drone whine, scavenger shout, enforcer maul, stalker blink, turret lock, echo hum).
- **Description:** Each enemy needs a distinct audible tell for its wind-up.
- **Audio:** sfx, ~1.2s, one-shot, ogg. Mono, short tail, normalised to -10 dBFS peak.
- **Palette:** 
- **Appears in:** Gameplay
- **Delivery:** `audio_sfx_enemies.ogg` — Synthesised in code today (audio/Sfx.ts).

#### `audio_sfx_backtrace` — Backtrace SFX set  [P1]

- **Purpose:** Backtrace activation, arrival burst, echo plate pulse, cooldown ready.
- **Description:** A rewinding tape sweep into a bright chime; a deep clock tick for plates.
- **Audio:** sfx, ~1s, one-shot, ogg. Mono, short tail, normalised to -10 dBFS peak.
- **Palette:** 
- **Appears in:** Gameplay
- **Delivery:** `audio_sfx_backtrace.ogg` — Synthesised in code today (audio/Sfx.ts).

#### `audio_sfx_world` — World SFX set  [P1]

- **Purpose:** Doors, platforms, plates, nodes, relays, pickups, laser and steam hazards.
- **Description:** Mechanical, readable, short.
- **Audio:** sfx, ~1s, one-shot, ogg. Mono, short tail, normalised to -10 dBFS peak.
- **Palette:** 
- **Appears in:** Gameplay
- **Delivery:** `audio_sfx_world.ogg` — Synthesised in code today (audio/Sfx.ts).

#### `audio_sfx_ui` — UI SFX set  [P1]

- **Purpose:** Menu move/confirm/back, dialogue blip, quest update, scrap, item, upgrade.
- **Description:** Soft synth blips and chimes.
- **Audio:** sfx, ~0.6s, one-shot, ogg. Mono, short tail, normalised to -10 dBFS peak.
- **Palette:** 
- **Appears in:** Gameplay
- **Delivery:** `audio_sfx_ui.ogg` — Synthesised in code today (audio/Sfx.ts).

#### `audio_sfx_dialogue_blips` — Dialogue Blips  [P1]

- **Purpose:** One short voice-blip per NPC for text scroll.
- **Description:** Distinct pitch/timbre per NPC (Zero low and dry, Mira bright, Halden gruff, Ilse warm, Kestrel silky, Wren quick, Brannt gravelly, Vesper airy).
- **Audio:** sfx, ~0.15s, one-shot, ogg. Mono, short tail, normalised to -10 dBFS peak.
- **Palette:** 
- **Appears in:** Gameplay
- **Delivery:** `audio_sfx_dialogue_blips.ogg` — Synthesised in code today (audio/Sfx.ts).

#### `audio_amb_rain` — Ambience — Rain  [P1]

- **Purpose:** Looping rain and distant city for Rainline and Undercity.
- **Description:** Heavy city rain on metal, far traffic hum.
- **Audio:** ambience, ~30s, seamless loop, ogg. Seamless loop, stereo.
- **Palette:** 
- **Appears in:** Gameplay
- **Delivery:** `audio_amb_rain.ogg` — Synthesised in code today (audio/Sfx.ts).

#### `audio_amb_industrial` — Ambience — Industrial  [P1]

- **Purpose:** Looping machinery, steam and furnace roar.
- **Description:** Pipes, hydraulics, furnace rumble.
- **Audio:** ambience, ~30s, seamless loop, ogg. Seamless loop, stereo.
- **Palette:** 
- **Appears in:** Gameplay
- **Delivery:** `audio_amb_industrial.ogg` — Synthesised in code today (audio/Sfx.ts).

#### `audio_amb_cathedral` — Ambience — Cathedral  [P1]

- **Purpose:** Looping vast reverb room tone with ticking clocks.
- **Description:** Cavernous drone, distant ticking, faint whispers.
- **Audio:** ambience, ~30s, seamless loop, ogg. Seamless loop, stereo.
- **Palette:** 
- **Appears in:** Gameplay
- **Delivery:** `audio_amb_cathedral.ogg` — Synthesised in code today (audio/Sfx.ts).
