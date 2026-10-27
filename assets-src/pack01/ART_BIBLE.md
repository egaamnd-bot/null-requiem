# EMBERVEIL — Master Art & Audio Bible (v1.0.0)

## 1. Color Palette & Usage Rules
Gameplay readability is governed by a strict 4-tier contrast hierarchy: Background -> Midground Terrain -> Interactive/Actors -> Hazards/VFX.

### Core Environment & Void (Backgrounds & Shadows)
* **Abyssal Obsidian (`#0B0C10`)**: Deepest void, unlit caverns, letterbox bars, interior silhouette fill.
* **Charred Slate (`#161922`)**: Primary near-background rock and wall fill.
* **Ash Basalt (`#262B38`)**: Playable ground/platform base fill (ensures player silhouette pops).
* **Weathered Stone (`#434A5E`)**: Platform top bevels, playable ledge highlights, stone brick edges.
* **Pale Calcified Ivory (`#C9C6B8`)**: Ancient carved pillars, high-contrast landmark architecture, bone-stone statues.

### Protagonist & Neutral Metals
* **Veil Cloak Indigo (`#1E2436`)**: Protagonist outer cloak body.
* **Ashen Tunic (`#8A8F9E`)**: Protagonist limbs/torso midtone for limb separation against dark backgrounds.
* **Pale Mask / Ivory (`#EAE6DF`)**: Protagonist head/mask focal point (highest non-emissive value on player).
* **Tarnished Bronze (`#7D654C`)**: Ancient machinery, gates, weapon hilt.

### Ember Energy (Player Attacks, Checkpoints, Warm Light, Hazards)
* **Deep Cinder (`#8F2412`)**: Outer glow trail, cooling magma, ember shadows.
* **Ember Core (`#E85D1A`)**: Primary fire/ember midtone, active shrine aura, enemy attack telegraph base.
* **Incandescent Amber (`#FF9E2C`)**: Inner weapon swing arc, active core, collectible center.
* **Searing White-Gold (`#FFF3D1`)**: 1-2 frame impact flash, critical hitbox edge, parry spark.

### Bioluminescence & Ancient Seals (Lore, Secrets, Ranged/Magic Threats)
* **Deep Verdigris (`#13383A`)**: Subterranean flora shadow.
* **Spectral Teal (`#2CE8C6`)**: Ancient seal runes, ability unlock shrines, ranged enemy projectile core.
* **Soul Cyan (`#B8FFF1`)**: High-contrast magic core and UI mana/ability ready indicator.

### UI & Status Feedback
* **UI Frame Obsidian (`#0F1118`)** (85% opacity)
* **UI Border Antique Brass (`#9E825C`)**
* **Health Vital Crimson (`#D9383A`)** / **Damaged Flash (`#FFB3B3`)**

---

## 2. Scale, Proportions & Camera Conventions
* **Base Internal Resolution:** `640 × 360` (16:9 pixel-clean or crisp HD integer scaling to `1280 × 720` / `1920 × 1080`).
* **Base Tile Grid:** `32 × 32 px`.
* **Player Collision Box:** `18 × 44 px` (centered horizontally, anchored `bottom-center` at `(32, 60)` inside a `64 × 64 px` standard sprite frame; expanded to `96 × 64 px` for melee attacks, or unified at `96 × 64 px` across all player frames for zero-offset origin stability).
* **Unified Player Frame Standard:** **`96 × 64 px`** for ALL player animations. Anchor/Origin is strictly **`(0.5, 0.9375)`** -> pixel **`(48, 60)`** (4px padding below feet for ground dust/overlap).
* **Character Proportions:** 3.5 heads tall, stylized slender limbs, high-contrast head/mantle silhouette, tapered extremities.

---

## 3. Line Weight, Shading & Lighting Rules
* **Outlines:** `1.5px` to `2px` dark selective outline (`#07080B`) on characters and interactive objects. Environment background layers have **no black outlines** (separated by value and atmospheric fog).
* **Shading:** Cel-shaded 2-tone hard edge (Base + 1 Shadow tone + 1 Rim highlight on upper/active surfaces). No noisy dithering or soft airbrushing inside character sprites.
* **Rim Lighting:** Top-left pale cool rim (`#6C7691`) on neutral stone; dynamic warm rim (`#FF9E2C`) on edges facing ember sources.

---

## 4. Animation Principles & Timing Conventions
* **Base Frame Rate:** `12 FPS` for idle/ambient loops; `16–24 FPS` for responsive combat, dashes, and impacts.
* **Combat Cadence (3-Phase Rule):**
  1. **Anticipation (Wind-up):** Distinct silhouette coil (`1–2 frames` for player; `4–6 frames` with ember/teal flash for enemies).
  2. **Active Hit Frame:** 1-frame extreme smear/arc (`#FFF3D1` to `#E85D1A`) matching the exact physics hitbox.
  3. **Recovery (Follow-through):** `2–3 frames` settling back to idle (cancellable by dash/jump for player).

---

## 5. Enemy & Boss Visual Hierarchy
* **Common Ground Enemies:** Darker body values (`#1E222D` to `#3A4152`) with a single bright focal threat marker (glowing eyes, volatile abdomen, or heated blade).
* **Airborne / Ranged Enemies:** Distinct silhouette (wings/tendrils) + contrasting **Spectral Teal (`#2CE8C6`)** or **Incandescent Amber (`#FF9E2C`)** core so players can track them in peripheral vision while platforming.
* **Bosses:** 2.5x–4x player height, multi-part silhouette, visual phase indicator (cracks in armor igniting with `#FF9E2C` at 50% HP).

---

## 6. UI, VFX & Naming Conventions
* **Naming Pattern:** `<category>_<entity>_<state>_<variant>.<ext>` (all `snake_case`).
  * Examples: `chr_player_sheet.png`, `chr_enemy_cinder_husk_sheet.png`, `vfx_combat_sheet.png`, `env_ashvault_tileset.png`, `mus_main_theme.wav`, `sfx_player_slash_light.wav`.
* **Typography:** Licensed OFL Fonts:
  * Display/Headers/Boss Titles: **Cinzel** (SIL Open Font License 1.1).
  * Body/UI/Numbers: **Plus Jakarta Sans** or **JetBrains Mono** (SIL Open Font License 1.1).