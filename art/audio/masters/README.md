# art/audio/masters — high-quality audio masters (NOT part of the game bundle)

Producer decision (2026-11-03): masters live here, **outside `public/`** (nothing in `art/` is served or shipped in the APK). Validated runtime
Ogg Vorbis files live in `public/audio/<music|sfx|ui|ambience>/` and are produced from these masters by `npm run audio:build`.

- Name masters after the catalog id: `music_title_theme.wav`, `sfx_player_jump_01.wav`… (`src/audio/catalog.ts`).
- 24-bit / 48 kHz WAV (or FLAC). Loops must be sample-exact (first sample follows the last). Stems of one piece (e.g. `music_rainline_exploration` and
  `music_rainline_combat`) must have **identical length and tempo** so the combat stem can join in sync.
- Do not put masters in `art/incoming/audio/`: that folder is only for files waiting for validation.
- Keep the repository small: prefer FLAC for long masters. If the total grows beyond ~100 MB, tell the Producer before committing more.
