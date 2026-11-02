# UI Asset Spec (engine-side)

What the game's UI is today, what a UI artist can deliver now, and what needs engine work first. Dimensions are **logical px** (view height 270,
width 480–648, rendered at K× — see `docs/ASSET_INTEGRATION_GUIDE.md`). Master delivery scale is **4×** like sprites (cell = logical × 4).
Safe areas: the HUD/controls already respect display cutouts via `view.margin` (min 10 px sides, 6 px top/bottom); art must not assume corner positions.

## 1. Current architecture (verified)

All UI is built in Phaser scenes from **shapes and text drawn in code**: `UIScene` (HUD, toasts, pause menu, game over, dialogue panel), `TitleScene`,
`MenuScene` (tabs: map, journal, gear, settings, vendor), `MobileControlsScene` (touch controls, Graphics), `VictoryScene`. Interaction uses
`createTapTarget` (tap on release, one pointer, keyboard/gamepad parity). Text is runtime text (good for localisation): **do not bake text into art**.
Only three UI bitmaps exist as manifest assets and are swap-ready: `ui_title_emblem`, `ui_hud_cell`, `ui_hud_backtrace`. Everything else in the manifest
(`ui_panel_9slice`, `ui_button_9slice`, `ui_touch_controls`, `ui_boss_bar`, `ui_map_frame`, `ui_dialogue_choice`, 24 `icon_*`) is `placeholder` with **no
texture keys and no renderer hook**; the 8 `ui_portrait_*` are `needs-engine-work`.

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
| HUD scrap / tracker / FPS | UIScene | icon (`icon_scrap` code-drawn 12×12) + text | top-left / top-centre | — |
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

## 4. Engine work required before the rest can be received (proposal — not started)

1. **UI skin layer** (`src/render/uiSkin.ts`): `panel(scene, x, y, w, h)` and `button(scene, …)` returning nine-slice images from `ui_panel_9slice` /
   `ui_button_9slice` states (`normal`, `pressed`, `focused`, `disabled`, `selected`, `destructive`) with the current rectangle drawing as fallback.
   Needs: nine-slice margins per asset (manifest field), per-state keys, and `createTapTarget` state callbacks (already present: `onPress`, `onFocus`).
2. **Icon slots:** replace text/shape stand-ins with `icon_*` textures where a hook exists (scrap, Backtrace, items, upgrades, quest, map relay).
3. **Touch-control art:** swap the Graphics circles for textures (joystick base/knob, 5 buttons × 2 states, pause) keeping hit areas independent of art.
4. **Portrait slot** in the dialogue panel (`ui_portrait_*`, 96×96, left of the text) with `talk` frames.
5. **Boss bar frame** around the existing fill.
6. Tests: skin falls back when textures are missing; hit areas unchanged; safe-area layout at 16:9, 20:9 and 21:9; touch e2e unchanged.

Each item is independent and keeps the code-drawn look until its art passes validation.

## 5. Export rules for UI art

PNG-32 RGBA, 4× master, transparent outside the art, **no text**, nine-slice margins declared in the delivery note (logical px), state sheets laid out as
one row per state in the order listed above, touch buttons ≥ 44 logical px hit diameter (the code already enforces hit radii independent of art). Icons
16×16 logical (64×64 at 4×), centred, 1 px (4 px) transparent padding.
