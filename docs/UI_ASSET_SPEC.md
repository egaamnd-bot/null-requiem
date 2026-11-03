# UI Asset Spec (engine-side)

What the game's UI is today, what a UI artist can deliver now, and what needs engine work first. Dimensions are **logical px** (view height 270,
width 480–648, rendered at K× — see `docs/ASSET_INTEGRATION_GUIDE.md`). Master delivery scale is **4×** like sprites (cell = logical × 4).
Safe areas: the HUD/controls already respect display cutouts via `view.margin` (min 10 px sides, 6 px top/bottom); art must not assume corner positions.

## 1. Current architecture (verified)

All UI is built in Phaser scenes from **shapes and text drawn in code**: `UIScene` (HUD, toasts, pause menu, game over, dialogue panel), `TitleScene`,
`MenuScene` (tabs: map, journal, gear, settings, vendor), `MobileControlsScene` (touch controls, Graphics), `VictoryScene`. Interaction uses
`createTapTarget` (tap on release, one pointer, keyboard/gamepad parity). Text is runtime text (good for localisation): **do not bake text into art**.
Only three UI bitmaps exist as manifest assets and are swap-ready: `ui_title_emblem`, `ui_hud_cell`, `ui_hud_backtrace`. Everything else in the manifest
(`ui_touch_controls`, `ui_boss_bar`, `ui_map_frame`, 24 `icon_*`) is `placeholder` with **no
texture keys and no renderer hook**; the three nine-slice kinds (`ui_panel_9slice`, `ui_button_9slice`, `ui_dialogue_choice`) are now swap-ready (§4); the 8 `ui_portrait_*` are `needs-engine-work`.

## 2. Component inventory and real geometry

| Component | Where | Today | Size / position (logical px) | States needed |
| --- | --- | --- | --- | --- |
| Title logo | TitleScene | `ui_title_emblem` texture 64×64 at y 70 + text | manifest 160×90 | — |
| Title menu buttons | TitleScene | rectangle + text | 190×26, step 30, first y 162 | normal, pressed, focused |
| Pause buttons (7) | UIScene | rectangle + text | 200×22, step 26, first y 66 | normal, pressed, focused |
| Menu panel / tabs / buttons | MenuScene | rectangles + text | full screen, tab bar, buttons 84×16 / 22×16 | normal, pressed, selected (tab), disabled |
| Settings rows | MenuScene | text + −/+ buttons, ON/OFF toggles | row step 24 | normal, pressed |
| HUD integrity | UIScene | `ui_hud_cell` × max health | 8×12 per cell, step 10, at the top-left margin | full, empty |
| HUD Backtrace | UIScene | `ui_hud_backtrace` + cooldown fill | 16×16 icon + 16×16 fill | ready, cooling |
| HUD scrap / tracker / FPS | UIScene | icon (`icon_scrap`, code-drawn 10×10) + text | top-left / top-centre | — |
| Boss bar | UIScene | rectangles | 200×4 (manifest asks 220×24 frame) | phase 1/2, lag |
| Dialogue panel | UIScene | rectangles + text, ≤ 440×104, choices 15 px rows (17 step) | upper-middle | normal, choice selected |
| Touch joystick | MobileControlsScene | Graphics circles | zone = left half; base radius 52 × scale | idle, active |
| Touch buttons JMP/ATK/DSH/REW/TLK | MobileControlsScene | Graphics circles | radius 24/24/22/22/20 (hit +5), right side | normal, pressed |
| Pause button | MobileControlsScene | Graphics | radius 14, top-right | normal, pressed |
| Map / journal / gear icons | MenuScene | code | 16×16 `icon_*` (placeholders) | — |
| Dialogue portrait | — | **no slot** | manifest 96×96 | neutral, talk×2, alt |

## 3. What can be delivered right now (no engine work)

`ui_title_emblem` (manifest cell 160×90 → 640×360 at 4×), `ui_hud_cell` (8×12 → 32×48; `full`,`empty`), `ui_hud_backtrace` (16×16 → 64×64). Same rules as
sprites (`docs/GEMINI_PACK_01_BRIEF.md` §5, `npm run assets:build`). Caution: the title emblem placeholder is drawn at 64×64 and displayed at that world
size; the manifest says 160×90 — **the title scene will be updated to the manifest size when the first emblem arrives** (otherwise it would shrink/stretch).

## 4. Engine support (status)

**Implemented (branch `feature/ui-skin-layer`, PR #10): the nine-slice skin layer.** `src/render/uiSkin.ts` + `src/assets/ui9.ts`. When the art of a kind is delivered, a
NineSlice is placed over the existing code-drawn rectangle, the rectangle is hidden, and the state art follows the interaction; hit areas, text and layout are untouched.
Without the art nothing changes. Verified in a browser with synthetic art (`e2e/finalArt.spec.ts`: states, size and margins independent of the art's pixel size).

| Kind | Asset id (cell → margins L/R/T/B, logical px) | States (one row each, in this order) | Used by |
| --- | --- | --- | --- |
| button | `ui_button_9slice` (48×24 → 10/10/8/8) | idle, focus, pressed, disabled, selected, destructive | title menu, pause menu, game-over buttons, every menu button, menu tabs (selected = active tab) |
| panel | `ui_panel_9slice` (48×48 → 16/16/16/16) | panel (one row) | dialogue panel, full-screen menu panel |
| choice | `ui_dialogue_choice` (200×20 → 14/8/6/6) | idle, focus | dialogue choice rows |

Rules for the art: the art cell is drawn at its manifest size ×4; the corner slices are exactly the margins above (×4 px); the edge slices are stretched, so keep them uniform
along the stretch direction; the centre fills. `destructive` has no caller yet (reserved for confirm-delete dialogs). A state row that is missing falls back to `idle`.

**Still to engineer (not started), one change per item, each keeping the code-drawn look until its art passes validation:**

1. Icon slots: `icon_*` textures where a hook exists (scrap 10×10 today, Backtrace, items, upgrades, quest, map relay).
2. Touch-control art: joystick base/knob and the five action buttons + pause (two states each); hit areas stay independent of the art (`touchLayout.ts`).
3. Portrait slot in the dialogue panel (`ui_portrait_*`, 96×96, `talk` frames).
4. Boss bar frame/fill/phase pips around the existing fill.
5. Title emblem at its manifest size 160×90 (the placeholder is 64×64 and the scene layout assumes it).
6. Safe-area/aspect tests with painted UI at 16:9, 20:9, 21:9.

## 5. Export rules for UI art

PNG-32 RGBA, 4× master, transparent outside the art, **no text**, nine-slice margins declared in the delivery note (logical px), state sheets laid out as
one row per state in the order listed above, touch buttons ≥ 44 logical px hit diameter (the code already enforces hit radii independent of art). Icons
16×16 logical (64×64 at 4×), centred, 1 px (4 px) transparent padding.
