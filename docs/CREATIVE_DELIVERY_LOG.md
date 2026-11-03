# Creative Delivery Log

The ledger of what has **actually** been delivered to the repository. A row may say `Delivered` only when the file exists under `public/` and
passed validation; `tests/creativeLedger.test.ts` fails if a `Delivered` row points at a missing file, or if a file exists in `public/assets/final/`
or `public/audio/` without a `Delivered` row. Concept boards, collages and mood sheets are references, never deliveries.

Status values: `Not delivered` · `In validation` (files in `art/incoming/`) · `Rejected` (see the report) · `Delivered` (in `public/`, validated) ·
`Integrated` (delivered AND shown/heard in the game, with the test or device result noted).

## Delivery events

| Date | Batch | What arrived | Validation result | Notes |
| --- | --- | --- | --- | --- |
| 2026-11-03 | — | **Nothing.** PR #6 contains the handoff document only (no images, no audio). | n/a | Repository prepared to receive deliveries (see `docs/CREATIVE_HANDOFF_REVIEW.md`). |
| 2026-11-03 | — | **Nothing.** Producer confirmed after the Android test that the game still shows the original placeholder art; creative production (all 38 visuals, UI art, music, ambience, SFX) is ChatGPT's and has not started delivering. | n/a | Audio masters go to `art/audio/masters/` (not shipped); runtime Ogg to `public/audio/`. Procedure: `docs/INTEGRATION_RUNBOOK.md`. |
| 2026-11-03 | `Pack_01_Creative_Handoff.zip` | **Reference + sketches only; no runtime asset.** 3 concept PNGs, 4 OST sketches, 1 rain loop, 12 short SFX WAVs. | 11 SFX/UI pass the audio validator (0 errors, stereo/peak warnings); 4 music + rain rejected (duration, loudness, not Ogg); drone SFX unmapped; PNGs are not sprite sheets. | Not marked Delivered (author states they are unfinished). Details: `docs/VISUAL_ENHANCEMENT_01.md`. |
| 2026-11-03 | `Pack_01_Creative_Handoff.zip` → `feature/audio-upgrade-01` | **Audio processed and delivered as preliminary runtime files**: 4 music, 1 ambience, 12 SFX/UI (17 sounds) built from the handoff sketches (masters: `art/audio/masters/handoff-01/*.flac`). | `npm run audio:validate`: 17 accepted, 0 errors, 0 warnings (loudness, loop seam, peak, duration, Ogg decode). | Producer authorised using the package as preliminary material. Not final masters. Still missing: city ambience, stingers, footsteps/land/airjump/hurt/death, enemy telegraph/projectile/death, doors close, relay, pressure plate, etc. |
| 2026-11-03 | `feature/audio-production-02` | **37 further sounds produced and delivered as preliminary runtime files** (28 SFX/UI, 3 stingers, 6 ambience loops) by Claude's deterministic synth (`tools/audio/synth_missing.py`), authorised by the Producer for the sounds the package lacked. | `npm run audio:validate`: 54 accepted (17 earlier + 37), 0 errors, 0 warnings. | Preliminary, code-synthesised; to be replaced by authored audio. Not delivered: `amb_rain` (the rain bed is `amb_rainline_loop`), `amb_thunder_rumble`, `amb_water_drip` (need an ambience one-shot scheduler), `music_safe_room` (no safe-room state), `sfx_backtrace_charge` (no charge phase). |

## Workstream A — Pack 01 visuals (38 files)

Validate with `npm run assets:validate:pack01`, build with `npm run assets:build:pack01`. Cell sizes are the 4× master from `docs/GEMINI_PACK_01_BRIEF.md`.

| Asset id | Group | Final path | Spec | Status | Validation |
| --- | --- | --- | --- | --- | --- |
| `player_courier_idle` | courier | `public/assets/final/player_courier_idle.png` | 124×144 cell | Not delivered | — |
| `player_courier_run` | courier | `public/assets/final/player_courier_run.png` | 124×144 cell | Not delivered | — |
| `player_courier_jump` | courier | `public/assets/final/player_courier_jump.png` | 124×144 cell | Not delivered | — |
| `player_courier_fall` | courier | `public/assets/final/player_courier_fall.png` | 124×144 cell | Not delivered | — |
| `player_courier_dash` | courier | `public/assets/final/player_courier_dash.png` | 124×144 cell | Not delivered | — |
| `player_courier_attack` | courier | `public/assets/final/player_courier_attack.png` | 124×144 cell | Not delivered | — |
| `player_courier_hurt` | courier | `public/assets/final/player_courier_hurt.png` | 124×144 cell | Not delivered | — |
| `player_courier_backtrace` | courier | `public/assets/final/player_courier_backtrace.png` | 124×144 cell | Not delivered | — |
| `player_courier_airjump` | courier | `public/assets/final/player_courier_airjump.png` | 124×144 cell | Not delivered | — |
| `player_courier_interact` | courier | `public/assets/final/player_courier_interact.png` | 124×144 cell | Not delivered | — |
| `player_courier_death` | courier | `public/assets/final/player_courier_death.png` | 124×144 cell | Not delivered | — |
| `enemy_scrap_hound` | enemies | `public/assets/final/enemy_scrap_hound.png` | 96×64 cell | Not delivered | — |
| `enemy_security_drone` | enemies | `public/assets/final/enemy_security_drone.png` | 80×96 cell | Not delivered | — |
| `npc_desert_man` | npc | `public/assets/final/npc_desert_man.png` | 96×128 cell | Not delivered | — |
| `env_rainline_tiles` | environment | `public/assets/final/env_rainline_tiles.png` | 64×64 cell | Not delivered | — |
| `env_rainline_bg_far` | environment | `public/assets/final/env_rainline_bg_far.png` | 1920×1080 cell | Not delivered | — |
| `env_rainline_bg_mid` | environment | `public/assets/final/env_rainline_bg_mid.png` | 1920×1080 cell | Not delivered | — |
| `env_rainline_fg_silhouette` | environment | `public/assets/final/env_rainline_fg_silhouette.png` | 960×540 cell | Not delivered | — |
| `env_rainline_props` | environment | `public/assets/final/env_rainline_props.png` | 192×192 cell | Not delivered | — |
| `obj_sync_relay` | objects | `public/assets/final/obj_sync_relay.png` | 64×128 cell | Not delivered | — |
| `obj_security_door` | objects | `public/assets/final/obj_security_door.png` | 64×64 cell | Not delivered | — |
| `obj_pressure_plate` | objects | `public/assets/final/obj_pressure_plate.png` | 64×24 cell | Not delivered | — |
| `obj_breakable_wall` | objects | `public/assets/final/obj_breakable_wall.png` | 64×64 cell | Not delivered | — |
| `pickup_backtrace_module` | objects | `public/assets/final/pickup_backtrace_module.png` | 64×128 cell | Not delivered | — |
| `pickup_integrity_cell` | objects | `public/assets/final/pickup_integrity_cell.png` | 48×48 cell | Not delivered | — |
| `pickup_glitch_strike` | objects | `public/assets/final/pickup_glitch_strike.png` | 64×128 cell | Not delivered | — |
| `pickup_memory_fragment` | objects | `public/assets/final/pickup_memory_fragment.png` | 48×48 cell | Not delivered | — |
| `pickup_scrap` | objects | `public/assets/final/pickup_scrap.png` | 48×48 cell | Not delivered | — |
| `fx_slash_side` | combatFx | `public/assets/final/fx_slash_side.png` | 144×112 cell | Not delivered | — |
| `fx_slash_up` | combatFx | `public/assets/final/fx_slash_up.png` | 112×144 cell | Not delivered | — |
| `fx_slash_down` | combatFx | `public/assets/final/fx_slash_down.png` | 112×144 cell | Not delivered | — |
| `fx_hit_spark` | combatFx | `public/assets/final/fx_hit_spark.png` | 96×96 cell | Not delivered | — |
| `fx_enemy_telegraph` | combatFx | `public/assets/final/fx_enemy_telegraph.png` | 48×48 cell | Not delivered | — |
| `fx_projectile_set` | combatFx | `public/assets/final/fx_projectile_set.png` | 64×64 cell | Not delivered | — |
| `fx_glitch_strike` | combatFx | `public/assets/final/fx_glitch_strike.png` | 256×160 cell | Not delivered | — |
| `fx_backtrace_arrival` | backtraceFx | `public/assets/final/fx_backtrace_arrival.png` | 384×384 cell | Not delivered | — |
| `fx_backtrace_streak` | backtraceFx | `public/assets/final/fx_backtrace_streak.png` | 256×32 cell | Not delivered | — |
| `fx_temporal_plate_pulse` | backtraceFx | `public/assets/final/fx_temporal_plate_pulse.png` | 128×128 cell | Not delivered | — |

## Workstreams B and C — music, ambience and sound effects (59 catalogue entries)

Canonical ids and the runtime contract are in `src/audio/catalog.ts` (see `docs/audio/README.md`; UI sounds are `sfx_ui_*`). Variations are `<id>_01`, `<id>_02`…

| Asset id | Group | Final path | Spec | Status | Validation |
| --- | --- | --- | --- | --- | --- |
| `music_title_theme` | music | `public/audio/music/music_title_theme.ogg` | 45–240 s, seamless loop | Delivered (preliminary) | 0 errors / 0 warnings — processed from the handoff sketch by `tools/audio/process_handoff.py` (Ogg q5); Producer ear-check pending |
| `music_rainline_exploration` | music | `public/audio/music/music_rainline_exploration.ogg` | 45–240 s, seamless loop | Delivered (preliminary) | 0 errors / 0 warnings — processed from the handoff sketch by `tools/audio/process_handoff.py` (Ogg q5); Producer ear-check pending |
| `music_rainline_combat` | music | `public/audio/music/music_rainline_combat.ogg` | 45–180 s, seamless loop | Delivered (preliminary) | 0 errors / 0 warnings — processed from the handoff sketch by `tools/audio/process_handoff.py` (Ogg q5); Producer ear-check pending |
| `music_boss_bulwark9` | music | `public/audio/music/music_boss_bulwark9.ogg` | 45–180 s, seamless loop | Delivered (preliminary) | 0 errors / 0 warnings — processed from the handoff sketch by `tools/audio/process_handoff.py` (Ogg q5); Producer ear-check pending |
| `music_backtrace_motif` | stinger | `public/audio/music/music_backtrace_motif.ogg` | 0.5–8 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `music_victory` | stinger | `public/audio/music/music_victory.ogg` | 3–40 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `music_game_over` | stinger | `public/audio/music/music_game_over.ogg` | 2–30 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `music_safe_room` | music | `public/audio/music/music_safe_room.ogg` | 30–180 s, seamless loop | Not delivered | — |
| `amb_rainline_loop` | ambience | `public/audio/ambience/amb_rainline_loop.ogg` | 20–120 s, seamless loop | Delivered (preliminary) | 0 errors / 0 warnings — processed from the handoff sketch by `tools/audio/process_handoff.py` (Ogg q5); Producer ear-check pending |
| `amb_transit_stacks_loop` | ambience | `public/audio/ambience/amb_transit_stacks_loop.ogg` | 20–120 s, seamless loop | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `amb_precinct_vault_loop` | ambience | `public/audio/ambience/amb_precinct_vault_loop.ogg` | 20–120 s, seamless loop | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_player_footstep_wet` | sfx | `public/audio/sfx/sfx_player_footstep_wet.ogg` | 0.04–0.4 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_player_jump` | sfx | `public/audio/sfx/sfx_player_jump.ogg` | 0.05–0.5 s | Delivered (preliminary) | 0 errors / 0 warnings — processed from the handoff sketch by `tools/audio/process_handoff.py` (Ogg q5); Producer ear-check pending |
| `sfx_player_land` | sfx | `public/audio/sfx/sfx_player_land.ogg` | 0.05–0.6 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_player_airjump` | sfx | `public/audio/sfx/sfx_player_airjump.ogg` | 0.05–0.6 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_player_dash` | sfx | `public/audio/sfx/sfx_player_dash.ogg` | 0.05–0.6 s | Delivered (preliminary) | 0 errors / 0 warnings — processed from the handoff sketch by `tools/audio/process_handoff.py` (Ogg q5); Producer ear-check pending |
| `sfx_player_attack` | sfx | `public/audio/sfx/sfx_player_attack.ogg` | 0.05–0.5 s | Delivered (preliminary) | 0 errors / 0 warnings — processed from the handoff sketch by `tools/audio/process_handoff.py` (Ogg q5); Producer ear-check pending |
| `sfx_player_hurt` | sfx | `public/audio/sfx/sfx_player_hurt.ogg` | 0.1–0.8 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_player_death` | sfx | `public/audio/sfx/sfx_player_death.ogg` | 0.3–2.5 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_backtrace_charge` | sfx | `public/audio/sfx/sfx_backtrace_charge.ogg` | 0.1–1.5 s | Not delivered | — |
| `sfx_backtrace_release` | sfx | `public/audio/sfx/sfx_backtrace_release.ogg` | 0.1–1.5 s | Delivered (preliminary) | 0 errors / 0 warnings — processed from the handoff sketch by `tools/audio/process_handoff.py` (Ogg q5); Producer ear-check pending |
| `sfx_backtrace_arrival` | sfx | `public/audio/sfx/sfx_backtrace_arrival.ogg` | 0.1–1.5 s | Delivered (preliminary) | 0 errors / 0 warnings — processed from the handoff sketch by `tools/audio/process_handoff.py` (Ogg q5); Producer ear-check pending |
| `sfx_backtrace_ready` | sfx | `public/audio/sfx/sfx_backtrace_ready.ogg` | 0.1–1 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_backtrace_cooldown` | sfx | `public/audio/sfx/sfx_backtrace_cooldown.ogg` | 0.1–2 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_enemy_telegraph` | sfx | `public/audio/sfx/sfx_enemy_telegraph.ogg` | 0.1–1 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_scrap_hound_lunge` | sfx | `public/audio/sfx/sfx_scrap_hound_lunge.ogg` | 0.1–1 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_drone_charge` | sfx | `public/audio/sfx/sfx_drone_charge.ogg` | 0.2–1.5 s | Delivered (preliminary) | 0 errors / 0 warnings — processed from the handoff sketch by `tools/audio/process_handoff.py` (Ogg q5); Producer ear-check pending |
| `sfx_drone_projectile` | sfx | `public/audio/sfx/sfx_drone_projectile.ogg` | 0.05–0.8 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_hit_light` | sfx | `public/audio/sfx/sfx_hit_light.ogg` | 0.04–0.4 s | Delivered (preliminary) | 0 errors / 0 warnings — processed from the handoff sketch by `tools/audio/process_handoff.py` (Ogg q5); Producer ear-check pending |
| `sfx_hit_heavy` | sfx | `public/audio/sfx/sfx_hit_heavy.ogg` | 0.06–0.8 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_enemy_death` | sfx | `public/audio/sfx/sfx_enemy_death.ogg` | 0.1–1.2 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_boss_warning` | sfx | `public/audio/sfx/sfx_boss_warning.ogg` | 0.3–3 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_door_open` | sfx | `public/audio/sfx/sfx_door_open.ogg` | 0.1–1.5 s | Delivered (preliminary) | 0 errors / 0 warnings — processed from the handoff sketch by `tools/audio/process_handoff.py` (Ogg q5); Producer ear-check pending |
| `sfx_door_close` | sfx | `public/audio/sfx/sfx_door_close.ogg` | 0.1–1.5 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_relay_activate` | sfx | `public/audio/sfx/sfx_relay_activate.ogg` | 0.2–2 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_pressure_plate` | sfx | `public/audio/sfx/sfx_pressure_plate.ogg` | 0.05–0.8 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_breakable_wall` | sfx | `public/audio/sfx/sfx_breakable_wall.ogg` | 0.2–1.5 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_pickup_integrity` | sfx | `public/audio/sfx/sfx_pickup_integrity.ogg` | 0.1–1.5 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_pickup_memory` | sfx | `public/audio/sfx/sfx_pickup_memory.ogg` | 0.1–1.5 s | Delivered (preliminary) | 0 errors / 0 warnings — processed from the handoff sketch by `tools/audio/process_handoff.py` (Ogg q5); Producer ear-check pending |
| `sfx_pickup_scrap` | sfx | `public/audio/sfx/sfx_pickup_scrap.ogg` | 0.03–0.5 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_pickup_module` | sfx | `public/audio/sfx/sfx_pickup_module.ogg` | 0.3–3 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_checkpoint` | sfx | `public/audio/sfx/sfx_checkpoint.ogg` | 0.2–2 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_quest_update` | sfx | `public/audio/sfx/sfx_quest_update.ogg` | 0.1–1.5 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_ui_focus` | ui | `public/audio/ui/sfx_ui_focus.ogg` | 0.04–0.5 s | Delivered (preliminary) | 0 errors / 0 warnings — processed from the handoff sketch by `tools/audio/process_handoff.py` (Ogg q5); Producer ear-check pending |
| `sfx_ui_confirm` | ui | `public/audio/ui/sfx_ui_confirm.ogg` | 0.04–0.5 s | Delivered (preliminary) | 0 errors / 0 warnings — processed from the handoff sketch by `tools/audio/process_handoff.py` (Ogg q5); Producer ear-check pending |
| `sfx_ui_back` | ui | `public/audio/ui/sfx_ui_back.ogg` | 0.04–0.5 s | Delivered (preliminary) | 0 errors / 0 warnings — processed from the handoff sketch by `tools/audio/process_handoff.py` (Ogg q5); Producer ear-check pending |
| `sfx_ui_pause` | ui | `public/audio/ui/sfx_ui_pause.ogg` | 0.04–0.5 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_ui_error` | ui | `public/audio/ui/sfx_ui_error.ogg` | 0.04–0.5 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_ui_tab` | ui | `public/audio/ui/sfx_ui_tab.ogg` | 0.04–0.5 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_ui_slider` | ui | `public/audio/ui/sfx_ui_slider.ogg` | 0.02–0.3 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_ui_save` | ui | `public/audio/ui/sfx_ui_save.ogg` | 0.04–0.5 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `sfx_ui_continue` | ui | `public/audio/ui/sfx_ui_continue.ogg` | 0.04–0.5 s | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `amb_rain` | ambience | `public/audio/ambience/amb_rain.ogg` | 1–60 s, seamless loop | Not delivered | — |
| `amb_thunder_rumble` | ambience | `public/audio/ambience/amb_thunder_rumble.ogg` | 1–60 s, seamless loop | Not delivered | — |
| `amb_electrical_buzz` | ambience | `public/audio/ambience/amb_electrical_buzz.ogg` | 1–60 s, seamless loop | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `amb_neon_sign_hum` | ambience | `public/audio/ambience/amb_neon_sign_hum.ogg` | 1–60 s, seamless loop | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `amb_machinery` | ambience | `public/audio/ambience/amb_machinery.ogg` | 1–60 s, seamless loop | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `amb_city_traffic` | ambience | `public/audio/ambience/amb_city_traffic.ogg` | 1–60 s, seamless loop | Delivered (preliminary) | 0 errors / 0 warnings — synthesised by `tools/audio/synth_missing.py` (Producer-authorised, deterministic; FLAC master in `art/audio/masters/claude-synth-01/`); Producer ear-check pending |
| `amb_water_drip` | ambience | `public/audio/ambience/amb_water_drip.ogg` | 1–60 s, seamless loop | Not delivered | — |

## Workstream D — UI kit

Only the assets below can be received today (see `docs/UI_ASSET_SPEC.md` §4: the nine-slice skin layer is built; icons, touch-control art, portraits, boss bar and map frame still need engine work and are
listed there, not here). Validate/build with the same asset tool (`npm run assets:build`, folder `art/incoming/`).

| Asset id | Group | Final path | Spec | Status | Validation |
| --- | --- | --- | --- | --- | --- |
| `ui_title_emblem` | ui | `public/assets/final/ui_title_emblem.png` | 640×360 sheet (640×360 cell) | Not delivered | — |
| `ui_hud_cell` | ui | `public/assets/final/ui_hud_cell.png` | 32×96 sheet (32×48 cell) | Not delivered | — |
| `ui_hud_backtrace` | ui | `public/assets/final/ui_hud_backtrace.png` | 64×64 sheet (64×64 cell) | Not delivered | — |
| `ui_button_9slice` | ui | `public/assets/final/ui_button_9slice.png` | 192×576 sheet (192×96 cell) | Not delivered | — |
| `ui_panel_9slice` | ui | `public/assets/final/ui_panel_9slice.png` | 192×192 sheet (192×192 cell) | Not delivered | — |
| `ui_dialogue_choice` | ui | `public/assets/final/ui_dialogue_choice.png` | 800×160 sheet (800×80 cell) | Not delivered | — |

## Outstanding

Everything above. Order of work: Gate 1 (Courier + one environment asset) → Gate 2 → Gate 3 (audio) → Gate 4 (UI) → Gate 5 (audit).
