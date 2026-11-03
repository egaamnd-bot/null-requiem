# Audio upgrade 01 (branch `feature/audio-upgrade-01`, stacked on `feature/visual-upgrade-02`)

Producer approval (2026-11-03): use the creative audio package as preliminary material, improve it, validate it through the pipeline, keep Ogg Vorbis at runtime and the procedural fallback. Nothing here is composed or added by Claude: `tools/audio/process_handoff.py` only conditions the supplied sketches.

## Pipeline

```
art/audio/masters/handoff-01/*.flac      (lossless copies of the 17 supplied WAV sketches, not shipped)
  └─ python3 tools/audio/process_handoff.py  →  art/incoming/audio/<catalog id>.ogg   (Ogg Vorbis q5)
       └─ npm run audio:validate  →  npm run audio:build  →  public/audio/** + manifest.json (the game loads this)
```

Processing: SFX/UI → mono, trim silence, 3 ms/12 ms fades, peak −10 dBFS (SFX) / −14 dBFS (UI). Music/ambience → equal-power tail→head crossfade (seamless loop), repeated ×2 to reach the catalog's minimum length, two-pass EBU R128 loudness to −16 LUFS (music) / −24 LUFS (ambience, TP −1.5 dBTP). Exploration and combat were gently tempo-matched (28 s and 24 s → 26 s, pitch preserved, ≈ ±8 %) so both are exactly 51 s and the combat stem can join phase-aligned (the runtime requires equal length).

## Result (verified): `npm run audio:validate` → 17 accepted, 0 errors, 0 warnings

| Catalog id | Source sketch | Result |
| --- | --- | --- |
| `music_title_theme` | 01_title_ambient | 62 s loop, −16 LUFS |
| `music_rainline_exploration` | 02_rainline_exploration | 51 s loop, −16 LUFS (tempo-matched) |
| `music_rainline_combat` | 03_combat_pulse | 51 s loop, −16 LUFS (tempo-matched; stem of the above) |
| `music_boss_bulwark9` | 04_boss_pressure | 51 s loop — the shared boss theme (not replaced) |
| `amb_rainline_loop` | rainline_rain_loop | 34 s loop, −24 LUFS |
| `sfx_ui_focus` / `_confirm` / `_back` | ui_focus / ui_confirm / ui_back | mono, −14 dBFS |
| `sfx_player_jump` / `_dash` / `_attack` | sfx_jump / sfx_dash / sfx_attack | mono, −10 dBFS |
| `sfx_hit_light` | sfx_hit | mono |
| `sfx_backtrace_release` / `_arrival` | sfx_backtrace_start / _end | mono |
| `sfx_pickup_memory` | pickup_memory_fragment | mono |
| `sfx_door_open` | sfx_door_open | mono |
| `sfx_drone_charge` | sfx_enemy_drone | **assumption**: the drone sketch is its charge-up (the only drone cue with an existing event) |

Browser check on the production build (software renderer, Chromium): manifest loads, title theme / exploration music / rain bed / SFX decode and play from the files, no console errors; the combat and exploration buffers both decode to 51.0 s.

## What is NOT verified

- Nobody has listened to the result on a phone: musical quality, balance between music/ambience/SFX, whether the tempo match of exploration vs combat sounds right, and whether the combat stem is harmonically compatible with the exploration loop are **for the Producer's ears**.
- The combat stem joining in real play (the in-game combat signal) was verified only by the synthetic e2e test and equal buffer lengths, not by an actual fight.
- Memory: decoded buffers are float32 — about 22 MB (title, released after leaving the title), 18 MB each for exploration and combat, 12 MB for the rain bed. Roughly 50 MB while playing; check on a low-end phone.

## Gaps (flagged, not invented)

- **No source material** (sounds still procedural): city/transit/precinct ambience, victory/game-over/transition/Backtrace-motif stingers, footsteps, land, air-jump, hurt, death, enemy telegraph/projectile/death, scrap-hound lunge, door close, relay, pressure plate, breakable wall, other pickups, boss warning, checkpoint, quest update, UI pause/error/tab/slider/save/continue.
- **Missing triggers (need approval; no gameplay changed):** `sfx_backtrace_charge` (Backtrace is instant, no charge phase); the atmosphere one-shots `amb_thunder_rumble`, `amb_electrical_buzz`, `amb_neon_sign_hum`, `amb_machinery`, `amb_city_traffic`, `amb_water_drip` (need an ambience scheduler); `music_safe_room` (no genuine safe-room state — blocked by Producer decision).
- `sfx_enemy_drone` mapping above needs confirmation from ChatGPT/Producer.
