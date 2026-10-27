# External Asset Pack 01 — archive and audit

These are generated asset sources delivered by an external AI tool, archived for future use. **None of this is wired into the game.**

They were made for the project's earlier working title (Emberveil, an underground ember-fantasy setting). Null Requiem is now urban cyberpunk, so the art direction does not match. The tooling and the audio are still useful.

## Contents

| File | What it is | Status |
|---|---|---|
| `ART_BIBLE.md` | Palette, scale, animation and naming conventions | Reference only. Off-theme palette; resolution and tile size conflict with the game (see below) |
| `build-sprites.mjs` | Generates SVG sprite sheets + JSON-hash atlases | Runs. Cinder Husk, Veil Moth, combat VFX. **Protagonist removed** (see below) |
| `audio/emberveil-audio-generator.ts` | Procedural music (3 loops) + 5 SFX | Fixed in this branch (see audit) |
| `audio/render-wavs.ts` | Writes WAVs and enforces quality gates | Added in this branch |
| `INTEGRATION_GUIDE.md` | Integration notes as delivered | Unverified; player sections superseded |
| `CONCEPTS_PACK02.md` | Two future enemy concepts | Design notes; both fit Null Requiem mechanically |

Generate everything (outputs go to the gitignored `EMBERVEIL_ASSETS/`):

```bash
npm run assets:pack01   # = assets:sprites + assets:audio (exits 1 if an audio quality gate fails)
```

## Why the protagonist sheet is not here

The delivered player design was a small dark-cloaked figure with a pale, oval, horned mask and a needle-like blade. That combination is the signature silhouette of an existing commercial game's protagonist. The original brief explicitly rules out reproducing that game's characters, and recolouring doesn't change a silhouette match. The renderer was removed before import and was never run. Null Requiem's Courier (hooded jacket, cyan visor, data-cable tail) is the protagonist.

## Audit (measured by running the code, 2026-10-27)

**Sprites.** The generator outputs SVG + JSON only. Despite the delivery notes, it writes **no PNGs**; a rasterizer such as resvg, sharp or Chromium would need to be added. The manifest's numbers were wrong:

| Sheet | Manifest said | Actual |
|---|---|---|
| Cinder Husk | 480×384 | **480×448** (7 rows) |
| Veil Moth | 384×320 | **384×384** (6 rows) |
| Combat VFX | 23 frames / 6 effects incl. `dash_echo` | **20 frames / 5 effects**, no `dash_echo` |

Animation coverage is thin:
- Veil Moth `attack_spit`, `hurt` and `death` look the same as idle.
- Cinder Husk has no legs, so `patrol` would slide, and `recovery` looks the same as idle.
- `hit_spark` reads as a targeting reticle.

Quality is roughly on par with the game's current procedural placeholders.

**Audio** (as delivered → after the fixes in this branch):

| Asset | Problem | Before | After |
|---|---|---|---|
| `mus_main_theme` | Click at the loop point | Seam 29× the average sample step | 3% of the loop's sharpest edge |
| `mus_underground_exploration` | Click at the loop point | 75× | 16% |
| `mus_combat_loop` | — (loop starts on a drum hit) | — | 49% of max edge |
| `sfx_player_slash_light` | Biased noise source (DC offset) | -0.111 | 0.004 |
| `sfx_enemy_hit` | Byte-identical to `sfx_weapon_impact` | identical | distinct (lower, fleshier) |
| `sfx_player_dash`, `sfx_player_hurt` | End abruptly | 0.027 / 0.032 | 0.000 (10 ms fade) |

The music is mono and simple additive synthesis. It is usable as placeholder ambience, but its D-minor "underground" character fits the old theme better than a cyberpunk city.

## Conflicts to resolve before integrating anything

- **Resolution and scale:** the bible specifies 640×360 with 32 px tiles and a 96×64 player frame. The game is 480×270, 16 px tiles, 10×22 player body. Since the sheets are SVG, they can be rasterized at any scale (0.5× fits the current world), but the art direction should be decided first.
- **Fonts:** the bible names Cinzel and Plus Jakarta Sans. Loading them from Google Fonts at runtime would break the "works offline" requirement; they would need to be self-hosted (both are OFL).
- **Theme:** the palette and creatures are ember-fantasy. A cyberpunk Pack 02 brief should replace them.
