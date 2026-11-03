# Audio — contract, formats and integration notes

Per-sound table (generated): `docs/audio/CATALOG.md`. Source of truth in code: `src/audio/catalog.ts`. Ledger: `docs/CREATIVE_DELIVERY_LOG.md`.

## What exists today (verified in the code)

- `src/audio/Sfx.ts`: Web Audio context created on the first user gesture; **36 procedural cues** (oscillators/noise) mapped from game events in `Sfx.handle`; master gain = 0.35 × SFX volume; mute.
- `src/audio/Music.ts`: **procedural music**, one theme at a time (drone + arpeggio), cross-fade on theme change; theme chosen by `themeFor(region, boss…)` → `title`, the six regions, `boss`, `finalBoss`, `ending`, `silence`.
- Settings: music volume, effects volume (persisted).
- **Recorded audio runtime (this branch, `feature/audio-runtime`):** `AudioBank` (manifest + decode, optional), file playback in `Sfx` (variations, pitch variation, voice limits, retrigger policy, gain trims), recorded music with loop regions in `Music`, region `Ambience` bed. Everything falls back to the procedural sound when a file is missing or undecodable. `public/audio/` is empty (no audio delivered).

## What the creative handoff needs that does not exist yet

| Need | Status |
| --- | --- |
| Play delivered files in place of the procedural cue/theme, falling back when a file is missing or undecodable | **implemented** on `feature/audio-runtime` (browser-tested with synthetic WAV) |
| Variations, pitch variation, max voices, retrigger policy per sound | **implemented** |
| Seamless loops with loop points | **implemented** (sidecar `loopStart`/`loopEnd`) |
| Ambience channel — region beds | **implemented** (rainline, transit, precinct) |
| Ambience one-shots / atmosphere layers (thunder, drips, buzz…) | still needs a scheduler |
| Combat music layer (needs an "in combat" world signal) | **new gameplay-adjacent signal — needs your approval** |
| Per-boss music (BULWARK-9 vs the shared `boss` theme) | small change in theme selection |
| Safe-room music | **needs a definition** (candidate: at a sync relay) |
| Hooks: footsteps, door close, relay link, hound/drone windups, heavy hits, Backtrace charge/arrival/ready/cooldown, integrity pickup, UI back/pause/error/tab/slider/save/continue | presentation-side hooks, added together with the audio batch that needs them |

## File formats and delivery (decisions for the deliverer)

- **Runtime files:** Ogg Vorbis (`.ogg`) in `public/audio/{music,sfx,ui,ambience}/<id>.ogg` (variations `<id>_01.ogg`…). Android WebView and Chrome decode it sample-accurately (gapless loops). **MP3/AAC are not accepted for loops** (encoder padding creates a gap). WAV is accepted for very short SFX/UI.
- **Masters (Producer decision 2026-11-03):** high-quality masters live in **`art/audio/masters/`** (outside the game bundle); validated runtime Ogg Vorbis files live in **`public/audio/`**. Ogg Vorbis is the approved runtime format.
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

## Producer decisions (2026-11-03) and how they are built

1. **Ogg Vorbis** is the runtime format. 2. **Masters** in `art/audio/masters/`, runtime files in `public/audio/`.
3. **Safe-room music is blocked** (`music_safe_room`, status `blocked`): it plays only if a genuine safe-room/checkpoint *state* exists. The game has only a
   one-frame `checkpoint` event (touching a sync relay heals and saves) and no persistent state, so nothing was invented.
4. **Audio-only combat signal** (`CombatTracker`, `src/audio/triggers.ts`): raised by existing events (`enemyWindup`, `enemyShoot`, `enemyBlocked`,
   `playerHurt`, `bossStaggered`, hits on enemies/bosses/projectiles), held 5 s after the last one, falls over 2.5 s, reset on room change/death. It only
   drives the combat stem `music_rainline_combat` (phase-aligned over `music_rainline_exploration`, so both files must have the **same length and tempo**, and the
   exploration loop should start at 0). It reads events; it never changes enemy AI, balance or any simulation state.
5. **The boss theme stays shared**: `music_boss_bulwark9` is the file for the `boss` theme and plays for every non-final boss until unique themes are commissioned.

## Hooks now implemented (audio-only, silent until the file arrives)

Footsteps (distance-based, `FootstepTracker`), Backtrace arrival/cooldown/ready/motif, Scrap Hound and Drone wind-ups (the `enemyWindup` event now carries the
enemy kind — an extra field, no behaviour change), heavy hits (Glitch Strike, boss stagger), door close, relay activate, integrity pickup, UI back/pause/error/tab/
slider/save/continue, game-over stinger, victory stinger. Where a procedural sound already existed it still plays when no file is delivered (e.g. UI back falls back to the
old menu blip). Stingers follow the **music** volume. Still missing: `sfx_backtrace_charge` (Backtrace has no charge phase) and the atmosphere one-shot scheduler.

## Procedural-only cues (no catalog entry, stay procedural)

`secret`, `slam`, `gate`, `clang`, `switch`, `burst`, `item`, `upgrade`, `rewindSelf`, `talk`, `blink`, `telegraph`, `victory` (until `music_victory`), dialogue blips. Add entries when the Producer wants them recorded.

## Validation and intake (implemented)

```
npm run audio:validate                    # report only (art/incoming/audio/report.md)
npm run audio:build                       # validate + write public/audio/<dir>/ + public/audio/manifest.json
npm run audio:build -- --encode           # also convert WAV music/ambience to Ogg Vorbis (needs ffmpeg)
```

Checks: catalog id, duration window, sample rate, channels, silence, clipping, peak and integrated loudness (ITU-R BS.1770 K-weighted, gated) vs the targets, loop-seam
click detection (loops only), leading/trailing silence, DC offset, sidecar loop points, duplicate formats. Ogg files are decoded with ffmpeg when it is installed
(otherwise only the header is checked and a warning says so). Rejected sounds are never written; the manifest is merged. The browser reads
`public/audio/manifest.json`; `tests/creativeLedger.test.ts` requires every file in `public/audio/` to be listed in `docs/CREATIVE_DELIVERY_LOG.md`.
