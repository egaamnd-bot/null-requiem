# Audio production 02 (branch `feature/audio-production-02`, stacked on `feature/visual-production-03`)

Producer approval (2026-11-03): produce the sounds the creative package lacked, add city/environment layers, stingers, and review decoded memory. Keep Ogg Vorbis at runtime, FLAC masters in `art/audio/masters/`, procedural fallback.

## What was produced

`python3 tools/audio/synth_missing.py` (deterministic numpy synthesis with fixed seeds; re-running gives identical files) → FLAC masters in `art/audio/masters/claude-synth-01/` → Ogg Vorbis candidates in `art/incoming/audio/` → `npm run audio:validate` / `audio:build` → `public/audio/`.

**Result (verified): 54 accepted (17 from the handoff sketches + 37 new), 0 errors, 0 warnings.** These are preliminary, code-synthesised sounds (oscillators, FM, filtered noise, simple reverb), not authored audio: expect a clean-but-synthetic character. They exist so every existing hook has a real file; replace them with authored audio later.

| Group | Ids |
| --- | --- |
| Movement / player | `sfx_player_footstep_wet`, `_land`, `_airjump`, `_hurt`, `_death` |
| Backtrace | `sfx_backtrace_ready`, `sfx_backtrace_cooldown` (release/arrival come from the handoff sketches) |
| Enemy | `sfx_enemy_telegraph`, `sfx_scrap_hound_lunge`, `sfx_drone_projectile`, `sfx_hit_heavy`, `sfx_enemy_death`, `sfx_boss_warning` |
| World / interaction | `sfx_door_close`, `sfx_relay_activate`, `sfx_pressure_plate`, `sfx_breakable_wall`, `sfx_checkpoint`, `sfx_quest_update` |
| Pickups | `sfx_pickup_integrity`, `sfx_pickup_scrap`, `sfx_pickup_module` |
| UI | `sfx_ui_pause`, `_error`, `_tab`, `_slider`, `_save`, `_continue` |
| Stingers | `music_victory` (8.5 s), `music_game_over` (6.5 s), `music_backtrace_motif` (2.6 s) — all on existing cues (`victory`, `gameOver`, `btMotif`) |
| Ambience beds | `amb_transit_stacks_loop`, `amb_precinct_vault_loop` (region beds that already had hooks) |
| Ambience layers | `amb_city_traffic` (Rainline, Transit), `amb_neon_sign_hum` (Rainline), `amb_machinery` (Transit, Precinct), `amb_electrical_buzz` (Precinct) |

## Engine change (audio-only)

`Ambience` now plays a region's catalog `layerIn` loops quietly under the bed once decoded (each its own gain, following the music volume/mute, faded in/out with the region, buffers released on leaving). No gameplay, AI, save or Backtrace code changed. `AudioBank.decodedBytes()` reports decoded PCM for QA.

## Decoded memory (measured in the production build, Chromium; float32 PCM, same on Android)

| Situation | Decoded audio |
| --- | --- |
| Title screen (title theme 20.9 MB + all short SFX/stingers ≈ 9 MB) | **≈ 30 MB** |
| In Rainline Alley (exploration 17.2 + rain bed 11.4 + city traffic 7.7 + neon hum 1.9 + SFX/stingers ≈ 9) | **≈ 47 MB** |
| …while the combat stem is playing (+ 17.2 MB) | **≈ 65 MB** (computed, not measured in a real fight) |

Not measured on a phone: whether 65 MB is comfortable on a low-RAM device. If it is not, the cheap levers are: mono rain bed (−5.7 MB), 22 kHz ambience, or shorter loops.

## Gaps and missing triggers (documented, not forced)

- No source/trigger: `amb_thunder_rumble`, `amb_water_drip` (need a randomised one-shot scheduler), `amb_rain` (the rain bed is `amb_rainline_loop`), `music_safe_room` (no safe-room state — blocked), `sfx_backtrace_charge` (Backtrace stays instant).
- Footsteps and other `hooked` cues work only where the existing observers fire (see `docs/audio/README.md`).
- Transition stingers: no gameplay "transition" event exists besides the camera fade; none added.
- Not verified: how it all sounds and balances on a phone (the Producer's ears), and the in-game triggering of every new cue beyond the unit/e2e coverage of the audio pipeline.
