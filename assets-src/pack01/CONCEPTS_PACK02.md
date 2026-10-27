# Future enemy concepts (from Asset Pack 01 delivery, for Pack 02)

Design specs only — no art or code exists yet.

## Enemy 03 — Bell-Warden Automaton (heavy shielded sentinel)
- ~64×96 px. Tall, tarnished-bronze clockwork construct carrying a cracked bell-shield.
- Blocks attacks from the front. Striking the shield emits a resonant shockwave.
- Slow overhead slam; the intended answer is dashing behind it during the slam.
- Fit with current systems: needs a "blocks from front" rule in combat resolution and uses Veilstep as the counter — a good second use of the dash.

## Enemy 04 — Root-Lurker (ceiling ambusher)
- ~48×64 px. Inverted arachnid disguised as charred stalactites.
- Drops vertically on a silk-cinder tether when the player crosses its vertical detection ray, then retracts.
- Fit with current systems: line-of-sight and detection already exist (`TileGrid.lineOfSight`); needs a clear pre-drop tell to stay fair.

## Pack 02 scope proposed by the generator
32×32 underground tileset (`env_ashvault_tileset`), 4-layer parallax, interactive objects (Ember Shrine checkpoint, Ancient Seal Gate, Breakable Cinder Urn, Lore Tablet).
Note: the game currently uses 16 px tiles. A 32 px tileset implies a scale change; decide that before commissioning.
