# Audio — contract, formats and integration notes

Per-sound table (generated): `docs/audio/CATALOG.md`. Source of truth in code: `src/audio/catalog.ts`. Ledger: `docs/CREATIVE_DELIVERY_LOG.md`.

## What exists today (verified in the code)

- `src/audio/Sfx.ts`: Web Audio context created on the first user gesture; **36 procedural cues** (oscillators/noise) mapped from game events in `Sfx.handle`; master gain = 0.35 × SFX volume; mute.
- `src/audio/Music.ts`: **procedural music**, one theme at a time (drone + arpeggio), cross-fade on theme change; theme chosen by `themeFor(region, boss…)` → `title`, the six regions, `boss`, `finalBoss`, `ending`, `silence`.
- Settings: music volume, effects volume (persisted).
- **No file loading of any kind**, no ambience, no layered music, no sample playback, no variations, no voice limiting. `public/audio/` is empty.

## What the creative handoff needs that does not exist yet

| Need | Status |
| --- | --- |
| Play delivered files in place of the procedural cue/theme, falling back when a file is missing or undecodable | engineering — branch `feature/audio-runtime` (loader, bank, mixer) |
| Variations, pitch variation, max voices, retrigger policy per sound | same change (catalog fields already defined) |
| Seamless loops with loop points | same change |
| Ambience channel (region beds, random one-shots) | same change |
| Combat music layer (needs an "in combat" world signal) | **new gameplay-adjacent signal — needs your approval** |
| Per-boss music (BULWARK-9 vs the shared `boss` theme) | small change in theme selection |
| Safe-room music | **needs a definition** (candidate: at a sync relay) |
| Hooks: footsteps, door close, relay link, hound/drone windups, heavy hits, Backtrace charge/arrival/ready/cooldown, integrity pickup, UI back/pause/error/tab/slider/save/continue | presentation-side hooks, added together with the audio batch that needs them |

## File formats and delivery (decisions for the deliverer)

- **Runtime files:** Ogg Vorbis (`.ogg`) in `public/audio/{music,sfx,ui,ambience}/<id>.ogg` (variations `<id>_01.ogg`…). Android WebView and Chrome decode it sample-accurately (gapless loops). **MP3/AAC are not accepted for loops** (encoder padding creates a gap). WAV is accepted for very short SFX/UI.
- **Masters:** 24-bit/48 kHz WAV stay **outside `public/`** (size). Keep them in your own storage or `art/incoming/audio/masters/` if the Producer accepts the repo size; never commit them to `public/`.
- **Channels/rate:** SFX and UI mono 44.1 or 48 kHz; music stereo 44.1 kHz; ambience stereo 44.1 kHz (mono 22.05 kHz acceptable for dense beds).
- **Levels:** music −16 LUFS integrated, true peak ≤ −1 dBTP; ambience −24 LUFS integrated; SFX peak −10 dBFS (`sfx_*`), UI peak −14 dBFS; no clipping; ≥ 6 dB headroom so music, ambience and SFX can sum.
- **Durations:** the window per sound is in the catalog (`seconds`). Music/ambience loops ≤ 90 s stereo recommended (decoded memory ≈ 31 MB for 90 s stereo float; the runtime holds one music and one ambience bed at a time).
- **Loops:** the file itself is the loop (first sample follows last sample, `loopStart = 0`, `loopEnd = duration`). If a tail must be trimmed, add a sidecar `<id>.json` `{ "loopStart": s, "loopEnd": s }`.
- **Originality declaration:** a one-line statement per batch in the ledger (“original composition/synthesis, no samples from third-party libraries or existing games/films”).
- **Sidecar (optional):** `<id>.json` `{ "loopStart": 0, "loopEnd": 63.2, "gainDb": -2, "notes": "…" }`.

## Reconciliation of ids

The handoff's proposed ids were kept except **UI sounds → `sfx_ui_*`** (bare `ui_*` are visual assets). Old set-level manifest ids (`audio_music_*`, `audio_sfx_player`…) are superseded by the catalog; they remain in the manifest only as documentation and are marked `needs-engine-work`.

| Old manifest id | Replaced by catalog ids |
| --- | --- |
| `audio_music_title/rainline/…/ending` | `music_title_theme`, `music_rainline_exploration`, `music_boss_bulwark9`, `music_victory`… (other regions' music has no catalog entry yet — Packs 02+) |
| `audio_sfx_player`, `audio_sfx_combat`, `audio_sfx_enemies`, `audio_sfx_backtrace`, `audio_sfx_world`, `audio_sfx_ui` | the per-sound `sfx_*` / `sfx_ui_*` entries |
| `audio_amb_rain/industrial/cathedral` | `amb_rainline_loop`, `amb_transit_stacks_loop`, `amb_precinct_vault_loop` (+ atmosphere layers) |

## Procedural-only cues (no catalog entry, stay procedural)

`secret`, `slam`, `gate`, `clang`, `switch`, `burst`, `item`, `upgrade`, `rewindSelf`, `talk`, `blink`, `telegraph`, `victory` (until `music_victory`), dialogue blips. Add entries when the Producer wants them recorded.

## Validation (planned with the loader)

`tools/audio/validate.ts`: sample rate, channels, duration vs catalog window, peak/clipping, loop-seam discontinuity, silence, header sanity for `.ogg`; `art/incoming/audio/` → report; nothing is written to `public/audio/` unless it passes. Until the loader lands, deliveries wait in `art/incoming/audio/` and are listed in the ledger as `In validation`.
