# NULL REQUIEM — World Map

> GENERATED from `src/world/rooms*.ts` by `npm run docs:assets`. Do not edit by hand.

19 rooms in 6 regions. Doors connect rooms through named entries; every connection is checked by `tests/campaign.test.ts` (both directions exist) and reachability by `tests/campaign.reach.test.ts` (the real Player, scripted inputs).

## Rainline Alley

_Where the Courier wakes._

### `alley` — Rainline Alley

- **Size:** 64×24 tiles; map cell (3, 1)
- **Connections:** `alley-east` → `alley_depot` (entry `west`); `alley-undercroft` → `undercroft` (entry `east`)
- **Entries:** `east`, `undercroft`
- **Gates / puzzles:** —
- **Encounters:** streetScavenger
- **NPCs:** desert-man, zero
- **Pickups:** `alley:cache` (scrap), `parcel:alley` (item), `rec:alley` (record)

### `alley_depot` — Rainline Depot

- **Size:** 60×20 tiles; map cell (4, 1)
- **Connections:** `depot-west` → `alley` (entry `east`); `depot-east` → `transit` (entry `west`)
- **Entries:** `west`, `east`
- **Gates / puzzles:** echo plate `dep-b` (Backtrace afterimage); door `depot-door` opens when dep-a and dep-b ("Two plates, one pulse. Plate B only listens to your echo.")
- **Encounters:** —
- **NPCs:** depot-terminal
- **Pickups:** `depot:backtrace` (ability), `depot:cache` (scrap), `parcel:depot` (item)

### `undercroft` — The Undercroft

- **Size:** 60×18 tiles; map cell (2, 1)
- **Connections:** `undercroft-east` → `alley` (entry `undercroft`)
- **Entries:** `east`
- **Gates / puzzles:** —
- **Encounters:** —
- **NPCs:** null-echo-npc
- **Pickups:** `undercroft:cell` (upgrade), `rec:undercroft` (record), `undercroft:scrap` (scrap)

## Transit Stacks

_Lifts, girders and loose gravity._

### `transit` — Transit Stacks

- **Size:** 80×30 tiles; map cell (5, 1)
- **Connections:** `transit-west` → `alley_depot` (entry `east`); `transit-east` → `transit_yard` (entry `west`)
- **Entries:** `west`, `east`
- **Gates / puzzles:** —
- **Encounters:** streetScavenger
- **NPCs:** mira
- **Pickups:** `transit:cache` (scrap), `rec:transit` (record)

### `transit_yard` — Stacks Yard

- **Size:** 72×22 tiles; map cell (6, 1)
- **Connections:** `yard-west` → `transit` (entry `east`); `yard-east` → `transit_shaft` (entry `bottom_west`); `yard-east-high` → `transit_shaft` (entry `upper_west`)
- **Entries:** `west`, `east`, `east_high`
- **Gates / puzzles:** —
- **Encounters:** 2× streetScavenger, securityDrone
- **NPCs:** halden
- **Pickups:** `yard:cache` (scrap), `parcel:yard` (item), `yard:core` (upgrade), `rec:yard` (record)

### `transit_shaft` — The Stacks Shaft

- **Size:** 44×36 tiles; map cell (7, 0)
- **Connections:** `shaft-bottom-west` → `transit_yard` (entry `east`); `shaft-upper-west` → `transit_yard` (entry `east_high`); `shaft-top-east` → `precinct_gate` (entry `west`)
- **Entries:** `bottom_west`, `upper_west`, `top_east`
- **Gates / puzzles:** —
- **Encounters:** sentryTurret, streetScavenger
- **Pickups:** `shaft:cache` (scrap), `rec:shaft` (record)

## Precinct Vault

_Security that remembers you._

### `precinct_gate` — Precinct Checkpoint

- **Size:** 64×20 tiles; map cell (8, 0)
- **Connections:** `gate-west` → `transit_shaft` (entry `top_east`); `gate-east` → `precinct_cells` (entry `west`)
- **Entries:** `west`, `east`
- **Gates / puzzles:** door `gate-door` opens when item:precinct-keycard ("LEVEL-3 ACCESS REQUIRED. The checkpoint barracks, up the steps, may have a card.")
- **Encounters:** 2× sentryTurret, streetScavenger, elite heavyEnforcer
- **Pickups:** `gate:keycard` (item), `gate:cache` (scrap), `rec:gate` (record)

### `precinct_cells` — Holding Cells

- **Size:** 60×20 tiles; map cell (9, 0)
- **Connections:** `cells-west` → `precinct_gate` (entry `east`); `cells-east` → `precinct` (entry `west`)
- **Entries:** `west`, `east`
- **Gates / puzzles:** —
- **Encounters:** 2× streetScavenger, securityDrone
- **NPCs:** cell-terminal
- **Pickups:** `cells:medkit` (item), `cells:badge` (item), `cells:cache` (scrap), `parcel:cells` (item)

### `precinct` — Precinct Vault

- **Size:** 44×20 tiles; map cell (10, 0)
- **Connections:** `precinct-west` → `precinct_cells` (entry `east`); `precinct-plaza` → `undercity_plaza` (entry `west`)
- **Entries:** `west`, `east`
- **Gates / puzzles:** door `bulwark-exit` opens when boss:bulwark-9 ("The vault exit is sealed while BULWARK-9 is online.")
- **Encounters:** —
- **NPCs:** ghost-terminal

## Neon Undercity

_The survivors' market._

### `undercity_plaza` — Undercity Plaza

- **Size:** 76×22 tiles; map cell (11, 1)
- **Connections:** `plaza-west` → `precinct` (entry `east`); `plaza-east` → `undercity_arcade` (entry `west`)
- **Entries:** `west`, `east`
- **Gates / puzzles:** —
- **Encounters:** —
- **NPCs:** kestrel, ilse, brannt, wren
- **Pickups:** `plaza:cache` (scrap), `rec:plaza` (record), `parcel:plaza` (item)

### `undercity_arcade` — Derelict Arcade

- **Size:** 64×20 tiles; map cell (12, 1)
- **Connections:** `arcade-west` → `undercity_plaza` (entry `east`); `arcade-east` → `undercity_towers` (entry `west`)
- **Entries:** `west`, `east`
- **Gates / puzzles:** door `booth-door` opens when node:booth-node ("The booth is dead. A power node nearby could wake it.")
- **Encounters:** streetScavenger, scrapHound, securityDrone, elite phaseStalker, sentryTurret
- **Pickups:** `arcade:coil` (ability), `arcade:fuse` (item), `arcade:core` (upgrade), `rec:arcade` (record), `parcel:arcade` (item)

### `undercity_towers` — The Leaning Towers

- **Size:** 46×40 tiles; map cell (13, 0)
- **Connections:** `towers-west` → `undercity_arcade` (entry `east`); `towers-top-east` → `core_pipeworks` (entry `west`)
- **Entries:** `west`, `top_east`
- **Gates / puzzles:** —
- **Encounters:** 2× phaseStalker, securityDrone, streetScavenger, sentryTurret
- **Pickups:** `towers:cache` (scrap), `rec:towers` (record)

## Industrial Core

_Heat, steam and the heart of the city._

### `core_pipeworks` — The Pipeworks

- **Size:** 70×22 tiles; map cell (14, 0)
- **Connections:** `pipeworks-west` → `undercity_towers` (entry `top_east`); `pipeworks-east` → `core_foundry` (entry `west`)
- **Entries:** `west`, `east`
- **Gates / puzzles:** —
- **Encounters:** streetScavenger, heavyEnforcer, sentryTurret, securityDrone
- **Pickups:** `pipeworks:coil` (item), `pipeworks:cache` (scrap), `rec:pipeworks` (record)

### `core_foundry` — The Foundry

- **Size:** 72×26 tiles; map cell (15, 0)
- **Connections:** `foundry-west` → `core_pipeworks` (entry `east`); `foundry-east` → `core_reactor` (entry `west`)
- **Entries:** `west`, `east`
- **Gates / puzzles:** —
- **Encounters:** elite heavyEnforcer, sentryTurret, 2× securityDrone
- **Pickups:** `foundry:cache` (scrap), `rec:foundry` (record), `parcel:foundry` (item)

### `core_reactor` — Reactor Hall

- **Size:** 64×22 tiles; map cell (16, 0)
- **Connections:** `reactor-west` → `core_foundry` (entry `east`); `reactor-east` → `core_kiln` (entry `west`)
- **Entries:** `west`, `east`
- **Gates / puzzles:** echo plate `rx-b` (Backtrace afterimage); door `vault-door` opens when rx-a and rx-b ("The vault wants two plates at once. One must be pressed by your echo."); door `kiln-gate` opens when flag:reactor-online ("The kiln gate is sealed until the reactor is running.")
- **Encounters:** nullEcho, phaseStalker, sentryTurret
- **NPCs:** vesper, reactor-console
- **Pickups:** `reactor:shard` (item), `reactor:cache` (scrap), `rec:reactor` (record)

### `core_kiln` — The Kiln

- **Size:** 64×20 tiles; map cell (17, 0)
- **Connections:** `kiln-west` → `core_reactor` (entry `east`); `kiln-east` → `null_archive` (entry `west`)
- **Entries:** `west`, `east`
- **Gates / puzzles:** door `kiln-exit` opens when boss:kiln-7 ("KILN-7 must go cold first.")
- **Encounters:** BOSS kiln-7

## Null Cathedral

_Everything erased, kept._

### `null_archive` — The Null Archive

- **Size:** 61×18 tiles; map cell (18, 0)
- **Connections:** `archive-west` → `core_kiln` (entry `east`); `archive-east` → `cathedral_nave` (entry `west`)
- **Entries:** `west`, `east`
- **Gates / puzzles:** door `archive-exit` opens when boss:panoptix-0 ("PANOPTIX-0 keeps the Archive sealed.")
- **Encounters:** —
- **NPCs:** archive-console

### `cathedral_nave` — The Nave

- **Size:** 80×24 tiles; map cell (19, 0)
- **Connections:** `nave-west` → `null_archive` (entry `east`); `nave-east` → `cathedral_sanctum` (entry `west`)
- **Entries:** `west`, `east`
- **Gates / puzzles:** echo plate `nv-b` (Backtrace afterimage); door `sanctum-door` opens when nv-a and nv-b ("The sanctum answers a past self and a present one.")
- **Encounters:** 2× nullEcho, elite phaseStalker, elite heavyEnforcer, sentryTurret
- **NPCs:** choir
- **Pickups:** `nave:cache` (scrap), `rec:nave` (record), `parcel:nave` (item)

### `cathedral_sanctum` — The Sanctum

- **Size:** 64×22 tiles; map cell (20, 0)
- **Connections:** `sanctum-west` → `cathedral_nave` (entry `east`)
- **Entries:** `west`
- **Gates / puzzles:** —
- **Encounters:** BOSS the-null
