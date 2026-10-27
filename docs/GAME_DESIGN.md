# Null Requiem — Game Design Document (Milestone 1)

## Pillars

1. **Movement and combat feel good before content grows.** That means tight acceleration, forgiving inputs (coyote time, jump buffer, attack buffer), readable telegraphs and hit-stop on impact.
2. **Time is a tool, not an undo button for the world.** Backtrace moves *you* back. The city keeps its state. Puzzles come from that asymmetry.
3. **Danger is readable.** Every hostile action has a visible and audible wind-up, and a recovery window that rewards the player who waited for it.

## Premise (original)

The city above is drowning in rain and surveillance. The **Courier** carries data nobody else will touch. A salvaged **Backtrace** module lets them step back along their own recent path. Their trail flickers behind them as a cyan echo. Tonight's job ends in the precinct vault, guarded by a decommissioned riot mech, **BULWARK-9**.

Tone: lonely, wet, neon-lit and quiet between bursts of violence. Text is minimal; story comes from the environment.

## Visual language

| Element | Treatment |
|---|---|
| Sky and depth | Near-black navy; skyline silhouettes with sparse lit windows; rain |
| Terrain | Wet concrete panels with steel lips; catwalks with grating |
| Player, time and safety | Cyan: visor, echo, relays, Backtrace, the strike arc |
| The city and surveillance | Magenta: drones, laser gates, neon strips |
| Signage and machinery | Sodium amber: hazard stripes, the boss bar |
| Danger | Hot red, which brightens during wind-ups |

## Player — the Courier

| Verb | Rules |
|---|---|
| Run | 150 px/s. Deceleration is snappier than acceleration, with extra decel on reversal |
| Jump | 58 px apex in 0.36s. Gravity is heavier while falling; releasing early cuts the jump |
| Forgiveness | 0.10s coyote time, 0.12s jump buffer, 0.10s attack buffer, 4 px ceiling-corner correction |
| Strike | 0.035s startup, 0.09s active, 0.16s recovery. Side, up, or down (air only). Each swing hits a target once |
| Pogo | A down-strike on an enemy bounces the Courier and refreshes the air dash. Hazards, walls and projectiles can't be pogoed |
| Dash (innate) | 340 px/s for 0.2s, ignores gravity, once per airtime, 0.4s cooldown. Dashing cancels a swing in progress |
| Backtrace (unlock) | See below |
| Damage | 5 integrity cells. A hit causes knockback, 0.25s stun and 1.0s invulnerability. A live-current pit costs one cell and returns you to the last safe ground |

## Backtrace

Inspired by player-only rewinds in action games: it rewinds the player, never the world.

| Rule | Value |
|---|---|
| Echo delay | 4.0s (one sample per 1/120s step) |
| On use | Snap to the oldest recorded spot you can still occupy |
| Health | Restored to the highest value inside the window (undoes damage, never lowers) |
| Arrival | 0.45s invulnerability; 44 px burst dealing 2 damage (needs line of sight) |
| Cooldown | 6.0s |
| Resets | On room change, respawn, and use (the echo restarts at the arrival point) |

Design intent:
- **Combat:** commit to a risky trade, then Backtrace out of the consequence. The burst rewards baiting enemies onto your echo.
- **Puzzles:** world state (switch timers, gates, enemy positions) persists through a Backtrace. That lets you be in two places within a few seconds.

## Enemies

**Scrap Hound (melee crawler).** Patrols and never walks off ledges. When it sees the Courier:
1. *Wind-up* (0.55s): crouches, sensor flares white, a glint appears.
2. *Lunge* (0.3s, armoured).
3. *Recover* (0.75s, vulnerable): sensor dims.

Striking it during the wind-up interrupts the attack. 3 HP.

**Watcher Drone (ranged flyer).** Hovers around its patrol point. When it sees the Courier it keeps its distance, heats its lens (0.6s), then fires a slow laser bolt aimed at the Courier. Bolts burst on walls and can be cut out of the air. 2 HP.

**BULWARK-9 (miniboss).** 20 HP.

| Pattern | Telegraph | Punish window |
|---|---|---|
| Charge | Backs up, visor flares (0.75s) | Hits the wall and is stunned for 1.4s, harmless |
| Leap slam | Crouches (0.45s), then leaps to your position | Shockwaves both ways (jump them); 0.8s recovery |
| Plasma rain (≤ 50% HP) | Raises its shields; floor and ceiling markers glow 0.9s before each strike | 1.0s recovery |

It never uses the same pattern three times running. Phase 2 speeds everything up by 15%.

## Level — the vertical slice

```
[ Rainline Alley ] ──▶ [ Transit Stacks ] ──▶ [ Precinct Vault ]
  start, relay #1        climb → Backtrace module      shutter seals → BULWARK-9
  cracked wall →         live pit (jump + dash)         victory
  Integrity Cell         relay #2 → switch ··· timed gate (Backtrace)
```

**Gate proof (measured, not estimated).** The gate stays open for 1.0s after the switch is struck. The fastest possible run from the switch to the gate takes **1.78s**, dashing every time the dash is ready. The tests check two things:
- They brute-force 126 sprint, dash and jump timings, and none gets through without Backtrace.
- They run the intended solve: wait at the gate, run back, strike the switch, Backtrace, walk through.

Thick concrete above the lower line removes any alternate route. Once the player passes, the gate latches open permanently.

## Systems

- **Checkpoints (Sync Relays):** touching one sets the respawn point, restores integrity and saves.
- **Death:** a short death beat, then **SIGNAL LOST**, then retry at the last relay. Enemies and the boss reset. Abilities, secrets, broken walls and latched gates persist.
- **Save data:** versioned JSON in `localStorage`. Corrupt or foreign data is ignored safely.
- **Camera:** exponential smoothing with look-ahead, clamped to room bounds. Rooms are validated to be at least one screen in size.

## Out of scope for Milestone 1

Map screen, currency, healing resource, NPCs and dialogue, music, multiple save slots, touch controls, accessibility options.
