# NULL REQUIEM — Campaign Plan

Room IDs, connections, gates and encounters are in the generated **`docs/WORLD_MAP.md`**. This file is the designed progression.

## Order and gating

| Act | Region | Gate to enter | New ability / tool | Boss |
| --- | --- | --- | --- | --- |
| 1 | Rainline Alley, Depot, Undercroft | none | Backtrace (Depot module) | — |
| 2 | Transit Stacks (yard, shaft) | Backtrace module | Echo plates, moving lifts | — |
| 3 | Precinct Vault (gate, cells, vault) | Stacks climb; checkpoint door needs the sergeant's keycard | Glitch Strike | BULWARK-9 |
| 4 | Neon Undercity (plaza, arcade, towers) | Vault cleared | Kinetic Coil (air jump) in the arcade; vendors open | — |
| 5 | Industrial Core (pipeworks, foundry, reactor, kiln) | Towers need the air jump | Reactor puzzles (echo plates, power nodes) | KILN-7 |
| 6 | Null Cathedral (archive, nave, sanctum) | KILN-7 defeated | — | PANOPTIX-0, THE NULL |

The world is interconnected and revisitable: doors connect both ways, checkpoints (sync relays) persist, and ability gates are
checked by `tests/campaign.reach.test.ts`, which drives the real Player with scripted inputs to prove each room is reachable and
that gated areas are NOT reachable without the ability.

## Backtrace puzzle language

- **Echo plate**: pressed only by the Courier's afterimage. Stand on it, wait, Backtrace away and the echo holds it.
- **Doors, platforms, emitters** run independently of Backtrace: the world does not rewind.
- **Timed gates and hold timers** teach committing to a rewind.

## Economy and progression

Scrap drops from enemies and pickups. Vendors (Halden, Kestrel) sell four upgrade ladders: Backtrace window, Backtrace cooldown,
Backtrace burst, signal regen. Integrity cells raise max health. Save format is v2 with a v1 migration.

## Estimated length

About 60–90 minutes for a first full playthrough including side quests (estimate, not measured on a device).
