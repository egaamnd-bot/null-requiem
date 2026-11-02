# NULL REQUIEM — Asset Manifest

> GENERATED from `src/assets/manifest*.ts` by `npm run docs:assets`. Do not edit by hand.

151 assets. **Placeholder** = code-drawn stand-in in the game now. **Swap-ready** = drop the final file into `public/assets/final/` and list it in `manifest.json`. **Needs engine work** = the spec exists but the game cannot show new art for it yet (see the integration guide).

## Pack 01 — Courier

| Id | Name | Category | Frames | Priority | Placeholder | Integration |
| --- | --- | --- | ---: | :-: | --- | --- |
| `player_courier_idle` | Courier — Idle | player | 2 | P0 | procedural-legacy | swap-ready |
| `player_courier_run` | Courier — Run | player | 4 | P0 | procedural-legacy | swap-ready |
| `player_courier_jump` | Courier — Jump | player | 1 | P0 | procedural-legacy | swap-ready |
| `player_courier_fall` | Courier — Fall | player | 1 | P0 | procedural-legacy | swap-ready |
| `player_courier_dash` | Courier — Dash | player | 1 | P0 | procedural-legacy | swap-ready |
| `player_courier_attack` | Courier — Attack | player | 1 | P0 | procedural-legacy | swap-ready |
| `player_courier_hurt` | Courier — Hurt | player | 1 | P0 | procedural-legacy | swap-ready |
| `player_courier_backtrace` | Courier — Backtrace Arrival | player | 6 | P0 | spec-only | needs-engine-work |
| `player_courier_airjump` | Courier — Kinetic Coil Air Jump | player | 3 | P0 | spec-only | needs-engine-work |
| `player_courier_interact` | Courier — Interact | player | 3 | P0 | spec-only | needs-engine-work |
| `player_courier_death` | Courier — Death | player | 6 | P0 | spec-only | needs-engine-work |

## Pack 02 — Core Enemies

| Id | Name | Category | Frames | Priority | Placeholder | Integration |
| --- | --- | --- | ---: | :-: | --- | --- |
| `enemy_security_drone` | Security Drone | enemy | 3 | P0 | procedural-legacy | swap-ready |
| `enemy_scrap_hound` | Scrap Hound | enemy | 5 | P0 | procedural-legacy | swap-ready |
| `enemy_street_scavenger` | Street Scavenger | enemy | 14 | P0 | procedural | swap-ready |
| `enemy_heavy_enforcer` | Heavy Enforcer | enemy | 18 | P0 | procedural | swap-ready |
| `enemy_phase_stalker` | Phase Stalker | enemy | 14 | P0 | procedural | swap-ready |
| `enemy_sentry_turret` | Sentry Turret | enemy | 13 | P0 | procedural | swap-ready |
| `enemy_null_echo` | Null Echo | enemy | 8 | P0 | procedural | swap-ready |

## Pack 03 — NPCs

| Id | Name | Category | Frames | Priority | Placeholder | Integration |
| --- | --- | --- | ---: | :-: | --- | --- |
| `npc_zero` | Zero | npc | 1 | P0 | procedural-legacy | swap-ready |
| `npc_mira` | Mira | npc | 1 | P0 | procedural-legacy | swap-ready |
| `npc_terminal` | Terminal | npc | 1 | P0 | procedural-legacy | swap-ready |
| `npc_station_mechanic` | Halden (Station Mechanic) | npc | 6 | P0 | procedural | swap-ready |
| `npc_underground_medic` | Doc Ilse (Underground Medic) | npc | 6 | P0 | procedural | swap-ready |
| `npc_former_officer` | Brannt (Former Security Officer) | npc | 6 | P1 | procedural | swap-ready |
| `npc_street_informant` | Wren (Street Informant) | npc | 6 | P1 | procedural | swap-ready |
| `npc_black_market_trader` | Kestrel (Black-Market Trader) | npc | 6 | P0 | procedural | swap-ready |
| `npc_temporal_researcher` | Dr. Vesper (Temporal Researcher) | npc | 6 | P1 | procedural | swap-ready |
| `npc_null_echo` | Null Echo (Erased Survivor) | npc | 6 | P2 | procedural | swap-ready |

## Pack 04 — Environment

| Id | Name | Category | Frames | Priority | Placeholder | Integration |
| --- | --- | --- | ---: | :-: | --- | --- |
| `env_rainline_tiles` | Rainline Alley — Tileset | tileset | 31 | P1 | code-drawn | needs-engine-work |
| `env_rainline_bg_far` | Rainline Alley — Far Background | background | 1 | P1 | code-drawn | swap-ready |
| `env_rainline_bg_mid` | Rainline Alley — Mid Background | background | 1 | P1 | code-drawn | swap-ready |
| `env_rainline_fg_silhouette` | Rainline Alley — Foreground Silhouettes | background | 4 | P1 | spec-only | needs-engine-work |
| `env_rainline_props` | Rainline Alley — Props | object | 8 | P1 | spec-only | needs-engine-work |
| `env_transit_tiles` | Transit Stacks — Tileset | tileset | 31 | P1 | code-drawn | needs-engine-work |
| `env_transit_bg_far` | Transit Stacks — Far Background | background | 1 | P1 | code-drawn | swap-ready |
| `env_transit_bg_mid` | Transit Stacks — Mid Background | background | 1 | P1 | code-drawn | swap-ready |
| `env_transit_fg_silhouette` | Transit Stacks — Foreground Silhouettes | background | 4 | P1 | spec-only | needs-engine-work |
| `env_transit_props` | Transit Stacks — Props | object | 8 | P1 | spec-only | needs-engine-work |
| `env_precinct_tiles` | Precinct Vault — Tileset | tileset | 31 | P1 | code-drawn | needs-engine-work |
| `env_precinct_bg_far` | Precinct Vault — Far Background | background | 1 | P1 | code-drawn | swap-ready |
| `env_precinct_bg_mid` | Precinct Vault — Mid Background | background | 1 | P1 | code-drawn | swap-ready |
| `env_precinct_fg_silhouette` | Precinct Vault — Foreground Silhouettes | background | 4 | P1 | spec-only | needs-engine-work |
| `env_precinct_props` | Precinct Vault — Props | object | 8 | P1 | spec-only | needs-engine-work |
| `obj_sync_relay` | Sync Relay | object | 3 | P0 | procedural-legacy | swap-ready |
| `obj_security_door` | Security Door | object | 5 | P0 | procedural | swap-ready |
| `obj_pressure_plate` | Pressure Plate | object | 4 | P0 | procedural | swap-ready |
| `obj_moving_platform` | Moving Platform | object | 3 | P0 | procedural | swap-ready |
| `obj_power_node` | Power Node | object | 3 | P1 | procedural | swap-ready |
| `obj_hazard_emitter` | Hazard Emitter | object | 5 | P1 | procedural | swap-ready |
| `obj_breakable_wall` | Cracked Wall | object | 7 | P1 | procedural-legacy | swap-ready |
| `obj_laser_gate` | Timed Laser Gate | object | 1 | P1 | procedural-legacy | swap-ready |
| `obj_override_switch` | Override Switch | object | 2 | P1 | procedural-legacy | swap-ready |
| `pickup_backtrace_module` | Backtrace Module | collectible | 2 | P0 | procedural-legacy | swap-ready |
| `pickup_integrity_cell` | Integrity Cell | collectible | 1 | P1 | procedural-legacy | swap-ready |
| `pickup_memory_fragment` | Memory Fragment | collectible | 1 | P1 | procedural-legacy | swap-ready |
| `pickup_glitch_strike` | Glitch Strike Core | collectible | 1 | P1 | procedural-legacy | swap-ready |

## Pack 05 — Environment Expansion

| Id | Name | Category | Frames | Priority | Placeholder | Integration |
| --- | --- | --- | ---: | :-: | --- | --- |
| `env_undercity_tiles` | Neon Undercity — Tileset | tileset | 31 | P1 | code-drawn | needs-engine-work |
| `env_undercity_bg_far` | Neon Undercity — Far Background | background | 1 | P1 | code-drawn | swap-ready |
| `env_undercity_bg_mid` | Neon Undercity — Mid Background | background | 1 | P1 | code-drawn | swap-ready |
| `env_undercity_fg_silhouette` | Neon Undercity — Foreground Silhouettes | background | 4 | P1 | spec-only | needs-engine-work |
| `env_undercity_props` | Neon Undercity — Props | object | 8 | P1 | spec-only | needs-engine-work |
| `env_industrial_tiles` | Industrial Core — Tileset | tileset | 31 | P1 | code-drawn | needs-engine-work |
| `env_industrial_bg_far` | Industrial Core — Far Background | background | 1 | P1 | code-drawn | swap-ready |
| `env_industrial_bg_mid` | Industrial Core — Mid Background | background | 1 | P1 | code-drawn | swap-ready |
| `env_industrial_fg_silhouette` | Industrial Core — Foreground Silhouettes | background | 4 | P1 | spec-only | needs-engine-work |
| `env_industrial_props` | Industrial Core — Props | object | 8 | P1 | spec-only | needs-engine-work |
| `env_cathedral_tiles` | Null Cathedral — Tileset | tileset | 31 | P1 | code-drawn | needs-engine-work |
| `env_cathedral_bg_far` | Null Cathedral — Far Background | background | 1 | P1 | code-drawn | swap-ready |
| `env_cathedral_bg_mid` | Null Cathedral — Mid Background | background | 1 | P1 | code-drawn | swap-ready |
| `env_cathedral_fg_silhouette` | Null Cathedral — Foreground Silhouettes | background | 4 | P1 | spec-only | needs-engine-work |
| `env_cathedral_props` | Null Cathedral — Props | object | 8 | P1 | spec-only | needs-engine-work |
| `pickup_kinetic_coil` | Kinetic Coil | collectible | 4 | P0 | code-drawn | swap-ready |
| `pickup_scrap` | Scrap Cache | collectible | 2 | P1 | code-drawn | swap-ready |
| `pickup_upgrade_core` | Upgrade Core | collectible | 2 | P1 | code-drawn | swap-ready |
| `pickup_item` | Quest Item / Parcel | collectible | 1 | P1 | code-drawn | swap-ready |
| `pickup_record` | Lore Record | collectible | 1 | P1 | code-drawn | swap-ready |

## Pack 06 — Bosses and Effects

| Id | Name | Category | Frames | Priority | Placeholder | Integration |
| --- | --- | --- | ---: | :-: | --- | --- |
| `boss_bulwark_9` | BULWARK-9 | boss | 6 | P0 | procedural-legacy | swap-ready |
| `boss_panoptix_0` | PANOPTIX-0 | boss | 4 | P0 | procedural-legacy | swap-ready |
| `boss_kiln_7` | KILN-7 | boss | 14 | P0 | procedural | swap-ready |
| `boss_the_null` | THE NULL | boss | 20 | P0 | procedural | swap-ready |
| `obj_boss_gate` | Boss Gate | object | 1 | P0 | procedural-legacy | swap-ready |
| `fx_slash_side` | Slash — Side | fx-combat | 4 | P1 | code-drawn | swap-ready |
| `fx_slash_up` | Slash — Up | fx-combat | 4 | P1 | code-drawn | swap-ready |
| `fx_slash_down` | Slash — Down | fx-combat | 4 | P1 | code-drawn | swap-ready |
| `fx_hit_spark` | Hit Spark | fx-combat | 5 | P1 | code-drawn | swap-ready |
| `fx_glitch_strike` | Glitch Strike | fx-combat | 6 | P1 | code-drawn | placeholder |
| `fx_enemy_telegraph` | Enemy Telegraph Glint | fx-combat | 4 | P1 | code-drawn | swap-ready |
| `fx_boss_floor_telegraph` | Boss Floor Telegraph | fx-combat | 7 | P0 | code-drawn | placeholder |
| `fx_laser_beam` | Laser / Steam Beam | fx-combat | 10 | P1 | code-drawn | placeholder |
| `fx_projectile_set` | Projectiles | fx-combat | 8 | P1 | code-drawn | swap-ready |
| `fx_steam_vent` | Steam Plume | fx-combat | 6 | P1 | code-drawn | placeholder |
| `fx_backtrace_arrival` | Backtrace Arrival Burst | fx-backtrace | 8 | P0 | code-drawn | swap-ready |
| `fx_backtrace_echo` | Backtrace Echo (Afterimage) | fx-backtrace | 5 | P0 | procedural-legacy | swap-ready |
| `fx_backtrace_streak` | Backtrace Streak | fx-backtrace | 4 | P1 | code-drawn | swap-ready |
| `fx_temporal_plate_pulse` | Temporal Plate Pulse | fx-backtrace | 6 | P1 | code-drawn | placeholder |
| `fx_null_void` | Null Void Cracks | fx-backtrace | 18 | P0 | code-drawn | placeholder |

## Pack 07 — UI and Audio

| Id | Name | Category | Frames | Priority | Placeholder | Integration |
| --- | --- | --- | ---: | :-: | --- | --- |
| `ui_portrait_zero` | Zero — Portrait | ui | 4 | P1 | spec-only | needs-engine-work |
| `ui_portrait_mira` | Mira — Portrait | ui | 4 | P1 | spec-only | needs-engine-work |
| `ui_portrait_halden` | Halden — Portrait | ui | 4 | P1 | spec-only | needs-engine-work |
| `ui_portrait_ilse` | Doc Ilse — Portrait | ui | 4 | P1 | spec-only | needs-engine-work |
| `ui_portrait_brannt` | Brannt — Portrait | ui | 4 | P1 | spec-only | needs-engine-work |
| `ui_portrait_wren` | Wren — Portrait | ui | 4 | P1 | spec-only | needs-engine-work |
| `ui_portrait_kestrel` | Kestrel — Portrait | ui | 4 | P1 | spec-only | needs-engine-work |
| `ui_portrait_vesper` | Dr. Vesper — Portrait | ui | 4 | P1 | spec-only | needs-engine-work |
| `ui_title_emblem` | Title Emblem | ui | 1 | P1 | procedural-legacy | swap-ready |
| `ui_hud_cell` | Integrity Cell (HUD) | ui | 2 | P0 | procedural-legacy | swap-ready |
| `ui_hud_backtrace` | Backtrace Indicator | ui | 1 | P0 | procedural-legacy | swap-ready |
| `ui_panel_9slice` | Panel (9-slice) | ui | 1 | P1 | code-drawn | placeholder |
| `ui_button_9slice` | Button (9-slice) | ui | 3 | P1 | code-drawn | placeholder |
| `ui_touch_controls` | Touch Controls | ui | 14 | P0 | code-drawn | placeholder |
| `ui_boss_bar` | Boss Health Bar | ui | 4 | P1 | code-drawn | placeholder |
| `ui_map_frame` | World Map Frame and Markers | ui | 6 | P1 | code-drawn | placeholder |
| `ui_dialogue_choice` | Dialogue Choice Button | ui | 2 | P1 | code-drawn | placeholder |
| `icon_scrap` | Scrap | icon | 1 | P1 | code-drawn | placeholder |
| `icon_item_keycard` | Precinct Keycard | icon | 1 | P1 | code-drawn | placeholder |
| `icon_item_med_kit` | Med Kit | icon | 1 | P1 | code-drawn | placeholder |
| `icon_item_hall_coil` | Hall Coil | icon | 1 | P1 | code-drawn | placeholder |
| `icon_item_relay_fuse` | Relay Fuse | icon | 1 | P1 | code-drawn | placeholder |
| `icon_item_badge` | Officer Badge | icon | 1 | P1 | code-drawn | placeholder |
| `icon_item_null_shard` | Null Shard | icon | 1 | P1 | code-drawn | placeholder |
| `icon_item_parcel` | Parcel | icon | 1 | P1 | code-drawn | placeholder |
| `icon_upgrade_window` | Deep Echo | icon | 1 | P1 | code-drawn | placeholder |
| `icon_upgrade_cooldown` | Quick Recoil | icon | 1 | P1 | code-drawn | placeholder |
| `icon_upgrade_burst` | Arrival Burst | icon | 1 | P1 | code-drawn | placeholder |
| `icon_upgrade_signal` | Signal Siphon | icon | 1 | P1 | code-drawn | placeholder |
| `icon_ability_backtrace` | Backtrace | icon | 1 | P1 | code-drawn | placeholder |
| `icon_ability_glitch` | Glitch Strike | icon | 1 | P1 | code-drawn | placeholder |
| `icon_ability_coil` | Kinetic Coil | icon | 1 | P1 | code-drawn | placeholder |
| `icon_quest_main` | Main Quest Marker | icon | 1 | P1 | code-drawn | placeholder |
| `icon_quest_side` | Side Quest Marker | icon | 1 | P1 | code-drawn | placeholder |
| `icon_map_relay` | Relay Pin | icon | 1 | P1 | code-drawn | placeholder |
| `audio_music_title` | Title Theme | audio | audio | P1 | code-drawn | swap-ready |
| `audio_music_rainline` | Rainline Alley | audio | audio | P1 | code-drawn | swap-ready |
| `audio_music_transit` | Transit Stacks | audio | audio | P1 | code-drawn | swap-ready |
| `audio_music_precinct` | Precinct Vault | audio | audio | P1 | code-drawn | swap-ready |
| `audio_music_undercity` | Neon Undercity | audio | audio | P1 | code-drawn | swap-ready |
| `audio_music_industrial` | Industrial Core | audio | audio | P1 | code-drawn | swap-ready |
| `audio_music_cathedral` | Null Cathedral | audio | audio | P1 | code-drawn | swap-ready |
| `audio_music_boss` | Boss Battle | audio | audio | P1 | code-drawn | swap-ready |
| `audio_music_final_boss` | THE NULL | audio | audio | P1 | code-drawn | swap-ready |
| `audio_music_ending` | Ending | audio | audio | P1 | code-drawn | swap-ready |
| `audio_sfx_player` | Courier SFX set | audio | audio | P1 | code-drawn | swap-ready |
| `audio_sfx_combat` | Combat SFX set | audio | audio | P1 | code-drawn | swap-ready |
| `audio_sfx_enemies` | Enemy SFX set | audio | audio | P1 | code-drawn | swap-ready |
| `audio_sfx_backtrace` | Backtrace SFX set | audio | audio | P1 | code-drawn | swap-ready |
| `audio_sfx_world` | World SFX set | audio | audio | P1 | code-drawn | swap-ready |
| `audio_sfx_ui` | UI SFX set | audio | audio | P1 | code-drawn | swap-ready |
| `audio_sfx_dialogue_blips` | Dialogue Blips | audio | audio | P1 | code-drawn | swap-ready |
| `audio_amb_rain` | Ambience — Rain | audio | audio | P1 | code-drawn | swap-ready |
| `audio_amb_industrial` | Ambience — Industrial | audio | audio | P1 | code-drawn | swap-ready |
| `audio_amb_cathedral` | Ambience — Cathedral | audio | audio | P1 | code-drawn | swap-ready |
