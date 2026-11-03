# Audio build report

Input `/tmp/ain2` → `public/audio` (validate only). **11 accepted, 5 rejected**, 9 error(s), 17 warning(s). Ogg analysis via ffmpeg decode.

| Sound | Result | Files | Issues |
| --- | --- | --- | ---: |
| `amb_rain` | rejected | 0 | 2 |
| `music_boss_bulwark9` | rejected | 0 | 3 |
| `music_rainline_combat` | rejected | 0 | 3 |
| `music_rainline_exploration` | rejected | 0 | 3 |
| `music_title_theme` | rejected | 0 | 3 |
| `sfx_backtrace_arrival` | accepted-with-warnings | 1 | 1 |
| `sfx_backtrace_release` | accepted-with-warnings | 1 | 1 |
| `sfx_door_open` | accepted-with-warnings | 1 | 1 |
| `sfx_hit_light` | accepted-with-warnings | 1 | 1 |
| `sfx_pickup_memory` | accepted-with-warnings | 1 | 1 |
| `sfx_player_attack` | accepted-with-warnings | 1 | 1 |
| `sfx_player_dash` | accepted-with-warnings | 1 | 1 |
| `sfx_player_jump` | accepted-with-warnings | 1 | 1 |
| `sfx_ui_back` | accepted-with-warnings | 1 | 1 |
| `sfx_ui_confirm` | accepted-with-warnings | 1 | 2 |
| `sfx_ui_focus` | accepted-with-warnings | 1 | 1 |

### `amb_rain`

- **WARN** `W-LOUDNESS`: amb_rain.wav: integrated loudness -30.6 LUFS is outside -24 ± 3 LUFS.
- **ERROR** `E-NEEDS-OGG`: amb_rain.wav: ambience must be delivered as Ogg Vorbis (WAV is only accepted for sfx/ui up to 3 s). Re-run with --encode (needs ffmpeg) or encode it yourself.

### `music_boss_bulwark9`

- **ERROR** `E-DURATION`: music_boss_bulwark9.wav: duration 26.00 s is outside the expected 45–180 s for music "music_boss_bulwark9".
- **WARN** `W-LOUDNESS`: music_boss_bulwark9.wav: integrated loudness -29.5 LUFS is outside -16 ± 3 LUFS.
- **ERROR** `E-NEEDS-OGG`: music_boss_bulwark9.wav: music must be delivered as Ogg Vorbis (WAV is only accepted for sfx/ui up to 3 s). Re-run with --encode (needs ffmpeg) or encode it yourself.

### `music_rainline_combat`

- **ERROR** `E-DURATION`: music_rainline_combat.wav: duration 24.00 s is outside the expected 45–180 s for music "music_rainline_combat".
- **WARN** `W-LOUDNESS`: music_rainline_combat.wav: integrated loudness -27.2 LUFS is outside -16 ± 3 LUFS.
- **ERROR** `E-NEEDS-OGG`: music_rainline_combat.wav: music must be delivered as Ogg Vorbis (WAV is only accepted for sfx/ui up to 3 s). Re-run with --encode (needs ffmpeg) or encode it yourself.

### `music_rainline_exploration`

- **ERROR** `E-DURATION`: music_rainline_exploration.wav: duration 28.00 s is outside the expected 45–240 s for music "music_rainline_exploration".
- **WARN** `W-LOUDNESS`: music_rainline_exploration.wav: integrated loudness -27.9 LUFS is outside -16 ± 3 LUFS.
- **ERROR** `E-NEEDS-OGG`: music_rainline_exploration.wav: music must be delivered as Ogg Vorbis (WAV is only accepted for sfx/ui up to 3 s). Re-run with --encode (needs ffmpeg) or encode it yourself.

### `music_title_theme`

- **ERROR** `E-DURATION`: music_title_theme.wav: duration 32.00 s is outside the expected 45–240 s for music "music_title_theme".
- **WARN** `W-LOUDNESS`: music_title_theme.wav: integrated loudness -28.4 LUFS is outside -16 ± 3 LUFS.
- **ERROR** `E-NEEDS-OGG`: music_title_theme.wav: music must be delivered as Ogg Vorbis (WAV is only accepted for sfx/ui up to 3 s). Re-run with --encode (needs ffmpeg) or encode it yourself.

### `sfx_backtrace_arrival`

- **WARN** `W-STEREO-SFX`: sfx_backtrace_arrival.wav: SFX/UI are expected mono (positionless, half the memory).

### `sfx_backtrace_release`

- **WARN** `W-STEREO-SFX`: sfx_backtrace_release.wav: SFX/UI are expected mono (positionless, half the memory).

### `sfx_door_open`

- **WARN** `W-STEREO-SFX`: sfx_door_open.wav: SFX/UI are expected mono (positionless, half the memory).

### `sfx_hit_light`

- **WARN** `W-STEREO-SFX`: sfx_hit_light.wav: SFX/UI are expected mono (positionless, half the memory).

### `sfx_pickup_memory`

- **WARN** `W-STEREO-SFX`: sfx_pickup_memory.wav: SFX/UI are expected mono (positionless, half the memory).

### `sfx_player_attack`

- **WARN** `W-STEREO-SFX`: sfx_player_attack.wav: SFX/UI are expected mono (positionless, half the memory).

### `sfx_player_dash`

- **WARN** `W-STEREO-SFX`: sfx_player_dash.wav: SFX/UI are expected mono (positionless, half the memory).

### `sfx_player_jump`

- **WARN** `W-STEREO-SFX`: sfx_player_jump.wav: SFX/UI are expected mono (positionless, half the memory).

### `sfx_ui_back`

- **WARN** `W-STEREO-SFX`: sfx_ui_back.wav: SFX/UI are expected mono (positionless, half the memory).

### `sfx_ui_confirm`

- **WARN** `W-STEREO-SFX`: sfx_ui_confirm.wav: SFX/UI are expected mono (positionless, half the memory).
- **WARN** `W-LOUD`: sfx_ui_confirm.wav: peak -7.7 dBFS is far above the -14 dBFS target.

### `sfx_ui_focus`

- **WARN** `W-STEREO-SFX`: sfx_ui_focus.wav: SFX/UI are expected mono (positionless, half the memory).

_48 of 59 catalogue sounds are not part of the accepted set._
