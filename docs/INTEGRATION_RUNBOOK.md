# Integration Runbook — delivered creative batches

For Claude (engine integration) when ChatGPT delivers a batch. Source of truth for what is delivered: `docs/CREATIVE_DELIVERY_LOG.md`.
**No asset exists in the repository yet; nothing below has been run on real art.** The guards were exercised with one synthetic file and then removed.

## Rules

1. One branch per batch, from the current stack tip: `integrate/pack-01-courier-batch-01`, `integrate/audio-batch-01`, … One PR per branch, in order. Never mix engine changes with asset commits.
2. Placeholders and fallbacks stay. A file is only added after it passes the tools; a rejected file goes back to ChatGPT with `report.md`.
3. A ledger row becomes `Delivered` only in the same commit that adds the file to `public/`; `Integrated` only after the browser test **and** the phone check below are recorded.
4. Never edit generated docs by hand (`npm run docs:assets`). Never hand-edit `public/assets/final/manifest.json` or `public/audio/manifest.json`: the build tools write them.

## Visual batch (e.g. first Courier batch)

```
git checkout <stack tip> && git checkout -b integrate/pack-01-courier-batch-01
# 1. put the files in art/incoming/pack-01/  (sheets <id>.png or frames <id>/<anim>_<NN>.png)
npm run assets:validate:pack01              # report only → art/incoming/pack-01/report.md
# fix/reject with ChatGPT until 0 errors for the files of this batch, then:
npm run assets:build:pack01                 # writes public/assets/final/<id>.png + manifest.json + atlas.json + report
```

Then, in order:
- Update `docs/CREATIVE_DELIVERY_LOG.md` rows → `Delivered` (path, validation result "0 errors / N warnings"), add a delivery event line; `npm run docs:assets`.
- `npx tsc --noEmit && npx vitest run` — `tests/deliveredAssets.test.ts` re-validates every delivered file; `tests/creativeLedger.test.ts` enforces the ledger.
- `npm run build && npx playwright test` — `e2e/deliveredArt.spec.ts` loads the real files and checks every texture's world size; look at a screenshot of the room/Courier.
- Courier-specific eyeball: feet on the ground line (pivot), size against the 31×36 cell, flip, run/idle loops, `attack`/`hurt` poses; `backtrace`/`airjump`/`interact`/`death` frames play when triggered.
- Push, wait for CI (typecheck, unit, Playwright, APK), note the run URLs in `docs/QA_STATUS.md`, and give the Producer the APK artifact link for the device test.
- After the Producer's device result: ledger → `Integrated` with the date and result.

## Audio batch

```
# masters stay in art/audio/masters/ ; runtime candidates go to art/incoming/audio/ (Ogg Vorbis; WAV only for sfx/ui ≤ 3 s)
npm run audio:validate                       # report only
npm run audio:build [-- --encode]            # writes public/audio/<dir>/ + manifest.json; --encode converts WAV → Ogg (ffmpeg)
```

Same ledger/test/CI/APK steps (`tests/deliveredAssets.test.ts` also checks delivered audio). Device check: no stutter on tap, loops seamless, music vs SFX balance, memory (no crash after several room changes).

## UI batch

Needs the UI skin layer first (see `docs/UI_ASSET_SPEC.md` §4); only the title emblem, HUD cell and Backtrace icon can be dropped in today.

## What can go wrong (known)

- Wrong cell size → the tool names the expected 4× size (`E-FRAME-SIZE`). Floating sprite → `E-PIVOT-FLOATING`. Baked background → `E-NO-TRANSPARENCY`.
- Tileset: **all 31 cells** are required or the generated terrain stays. Multi-frame effects need **every** frame or the code-drawn effect stays.
- Combat stem must have the same length as `music_rainline_exploration`, or it cannot be phase-aligned.
