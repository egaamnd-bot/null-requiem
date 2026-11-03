# Audio Catalog

> GENERATED from `src/audio/catalog.ts` by `npm run docs:assets`. Do not edit by hand.

59 sounds. **Engine** = `wired`: an existing procedural cue/theme/region/layer maps to it (the file replaces that sound); `hooked`: the audio-only trigger is implemented, silent until the file arrives; `needs-hook`: nothing triggers it; `needs-engine`: a system is missing; `blocked`: deliberately not built (Producer decision). Nothing in this table is delivered unless `docs/CREATIVE_DELIVERY_LOG.md` says so.

## Music, stingers and ambience beds

| Id | Kind | File | Duration | Loop | Trim | Pitch var | Voices / retrigger | Replaces | Engine | Trigger |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `music_title_theme` | music | `public/audio/music/music_title_theme.ogg` | 45–240 s | loop | 0 dB | — | 1 / ignore | theme `title` | wired | Title screen and menus |
| `music_rainline_exploration` | music | `public/audio/music/music_rainline_exploration.ogg` | 45–240 s | loop | 0 dB | — | 1 / ignore | theme `rainline` | wired | Exploring any Rainline room (alley, depot, undercroft) |
| `music_rainline_combat` | music | `public/audio/music/music_rainline_combat.ogg` | 45–180 s | loop | 0 dB | — | 1 / ignore | — | wired | Combat stem layered over music_rainline_exploration while the audio-only combat signal is active (derived from enemyWindup/enemyShoot/hit/playerHurt events; never touches AI or balance). Must be the same length and tempo as the exploration loop so the two stay in sync |
| `music_boss_bulwark9` | music | `public/audio/music/music_boss_bulwark9.ogg` | 45–180 s | loop | 0 dB | — | 1 / ignore | theme `boss` | wired | The shared boss theme: plays for every non-final boss (Producer decision 2026-11-03: keep it shared for now; unique per-boss themes are commissioned later) |
| `music_backtrace_motif` | stinger | `public/audio/music/music_backtrace_motif.ogg` | 0.5–8 s | once | 0 dB | — | 2 / overlap | cue `btMotif` | hooked | Short musical identity layered on the Backtrace sound (not a loop) |
| `music_victory` | stinger | `public/audio/music/music_victory.ogg` | 3–40 s | once | 0 dB | — | 1 / restart | cue `victory` | wired | Game completed (replaces the procedural victory cue) |
| `music_game_over` | stinger | `public/audio/music/music_game_over.ogg` | 2–30 s | once | 0 dB | — | 1 / restart | cue `gameOver` | hooked | Player death overlay |
| `music_safe_room` | music | `public/audio/music/music_safe_room.ogg` | 30–180 s | loop | 0 dB | — | 1 / ignore | — | blocked | BLOCKED by Producer decision (2026-11-03): only plays if a genuine safe-room/checkpoint STATE exists. The game has only a one-frame `checkpoint` event (touch a relay: heal + save), no persistent state, and none will be invented for music. Reconsider if a real safe-room mechanic is ever designed |
| `amb_rainline_loop` | ambience | `public/audio/ambience/amb_rainline_loop.ogg` | 20–120 s | loop | -6 dB | — | 1 / ignore | region `rainline` | wired | Rainline region bed (rain, distant traffic, hum). Plays on the ambience channel (no procedural fallback: silent without a file) |
| `amb_transit_stacks_loop` | ambience | `public/audio/ambience/amb_transit_stacks_loop.ogg` | 20–120 s | loop | -6 dB | — | 1 / ignore | region `transit` | wired | Transit Stacks region bed |
| `amb_precinct_vault_loop` | ambience | `public/audio/ambience/amb_precinct_vault_loop.ogg` | 20–120 s | loop | -6 dB | — | 1 / ignore | region `precinct` | wired | Precinct Vault region bed |

## Sound effects

| Id | Kind | File | Duration | Loop | Trim | Pitch var | Voices / retrigger | Replaces | Engine | Trigger |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `sfx_player_footstep_wet` | sfx | `public/audio/sfx/sfx_player_footstep_wet.ogg` | 0.04–0.4 s | once | -6 dB | ±1.5 st | 3 / overlap | cue `footstep` | hooked | Run-cycle foot contact (no footstep event exists; derive from the run animation frame) Provide 4 variations (_01.._04). |
| `sfx_player_jump` | sfx | `public/audio/sfx/sfx_player_jump.ogg` | 0.05–0.5 s | once | 0 dB | ±0.5 st | 2 / overlap | cue `jump` | wired | playerJump (ground) |
| `sfx_player_land` | sfx | `public/audio/sfx/sfx_player_land.ogg` | 0.05–0.6 s | once | 0 dB | ±0.5 st | 2 / overlap | cue `land` | wired | playerLand |
| `sfx_player_airjump` | sfx | `public/audio/sfx/sfx_player_airjump.ogg` | 0.05–0.6 s | once | 0 dB | — | 2 / overlap | cue `airjump` | wired | playerJump with air=true |
| `sfx_player_dash` | sfx | `public/audio/sfx/sfx_player_dash.ogg` | 0.05–0.6 s | once | 0 dB | — | 2 / overlap | cue `dash` | wired | playerDash |
| `sfx_player_attack` | sfx | `public/audio/sfx/sfx_player_attack.ogg` | 0.05–0.5 s | once | 0 dB | ±0.7 st | 3 / overlap | cue `swing` | wired | playerAttack Provide 3 variations. |
| `sfx_player_hurt` | sfx | `public/audio/sfx/sfx_player_hurt.ogg` | 0.1–0.8 s | once | 0 dB | — | 2 / overlap | cue `hurt` | wired | playerHurt |
| `sfx_player_death` | sfx | `public/audio/sfx/sfx_player_death.ogg` | 0.3–2.5 s | once | 0 dB | — | 2 / overlap | cue `death` | wired | playerDied |
| `sfx_backtrace_charge` | sfx | `public/audio/sfx/sfx_backtrace_charge.ogg` | 0.1–1.5 s | once | 0 dB | — | 2 / overlap | — | needs-hook | Backtrace has no charge phase in the game (it is instant); play on button press before release if wanted |
| `sfx_backtrace_release` | sfx | `public/audio/sfx/sfx_backtrace_release.ogg` | 0.1–1.5 s | once | 0 dB | — | 1 / restart | cue `backtrace` | wired | backtrace event (departure) |
| `sfx_backtrace_arrival` | sfx | `public/audio/sfx/sfx_backtrace_arrival.ogg` | 0.1–1.5 s | once | 0 dB | — | 2 / overlap | cue `arrival` | hooked | backtrace event, played at the arrival point shortly after release |
| `sfx_backtrace_ready` | sfx | `public/audio/sfx/sfx_backtrace_ready.ogg` | 0.1–1 s | once | -4 dB | — | 2 / overlap | cue `btReady` | hooked | Cooldown finished (no event: derive from HUD backtrace cooldown reaching 0) |
| `sfx_backtrace_cooldown` | sfx | `public/audio/sfx/sfx_backtrace_cooldown.ogg` | 0.1–2 s | once | 0 dB | — | 2 / overlap | cue `btCooldown` | hooked | Cooldown started (same moment as the backtrace event) |
| `sfx_enemy_telegraph` | sfx | `public/audio/sfx/sfx_enemy_telegraph.ogg` | 0.1–1 s | once | 0 dB | — | 3 / overlap | cue `windup` | wired | enemyWindup / bossWindup (all enemies share it until per-enemy windups exist) |
| `sfx_scrap_hound_lunge` | sfx | `public/audio/sfx/sfx_scrap_hound_lunge.ogg` | 0.1–1 s | once | 0 dB | — | 2 / overlap | cue `houndLunge` | hooked | Scrap Hound lunge; `enemyWindup` carries no enemy kind yet |
| `sfx_drone_charge` | sfx | `public/audio/sfx/sfx_drone_charge.ogg` | 0.2–1.5 s | once | 0 dB | — | 2 / overlap | cue `droneCharge` | hooked | Security Drone charge; `enemyWindup` carries no enemy kind yet |
| `sfx_drone_projectile` | sfx | `public/audio/sfx/sfx_drone_projectile.ogg` | 0.05–0.8 s | once | 0 dB | ±0.5 st | 3 / overlap | cue `shoot` | wired | enemyShoot |
| `sfx_hit_light` | sfx | `public/audio/sfx/sfx_hit_light.ogg` | 0.04–0.4 s | once | -2 dB | ±1 st | 4 / overlap | cue `hit` | wired | hit on enemy/boss/projectile (not killed) Provide 3 variations. |
| `sfx_hit_heavy` | sfx | `public/audio/sfx/sfx_hit_heavy.ogg` | 0.06–0.8 s | once | 0 dB | — | 2 / overlap | cue `heavyHit` | hooked | Heavy hits (Glitch Strike, boss stagger); `hit` does not say how heavy |
| `sfx_enemy_death` | sfx | `public/audio/sfx/sfx_enemy_death.ogg` | 0.1–1.2 s | once | 0 dB | — | 3 / overlap | cue `kill` | wired | hit with killed=true / bossDefeated |
| `sfx_boss_warning` | sfx | `public/audio/sfx/sfx_boss_warning.ogg` | 0.3–3 s | once | 0 dB | — | 1 / restart | cue `roar` | wired | bossStart / bossPhase |
| `sfx_door_open` | sfx | `public/audio/sfx/sfx_door_open.ogg` | 0.1–1.5 s | once | 0 dB | — | 2 / overlap | cue `door` | wired | doorChanged open=true (and nodePowered uses the plate cue) |
| `sfx_door_close` | sfx | `public/audio/sfx/sfx_door_close.ogg` | 0.1–1.5 s | once | 0 dB | — | 2 / overlap | cue `doorClose` | hooked | doorChanged open=false (today both directions share one cue) |
| `sfx_relay_activate` | sfx | `public/audio/sfx/sfx_relay_activate.ogg` | 0.2–2 s | once | 0 dB | — | 2 / overlap | cue `relayActivate` | hooked | Sync relay linked (checkpoint event with firstTime=true; today shares sfx_checkpoint) |
| `sfx_pressure_plate` | sfx | `public/audio/sfx/sfx_pressure_plate.ogg` | 0.05–0.8 s | once | 0 dB | — | 2 / overlap | cue `plate` | wired | plateChanged / nodePowered |
| `sfx_breakable_wall` | sfx | `public/audio/sfx/sfx_breakable_wall.ogg` | 0.2–1.5 s | once | 0 dB | — | 2 / overlap | cue `wall` | wired | wallBroken |
| `sfx_pickup_integrity` | sfx | `public/audio/sfx/sfx_pickup_integrity.ogg` | 0.1–1.5 s | once | 0 dB | — | 2 / overlap | cue `integrity` | hooked | Integrity cell pickup (no dedicated event; arrives as a generic pickup today) |
| `sfx_pickup_memory` | sfx | `public/audio/sfx/sfx_pickup_memory.ogg` | 0.1–1.5 s | once | 0 dB | — | 2 / overlap | cue `record` | wired | loreFound / fragmentCollected |
| `sfx_pickup_scrap` | sfx | `public/audio/sfx/sfx_pickup_scrap.ogg` | 0.03–0.5 s | once | -3 dB | ±1 st | 4 / overlap | cue `coin` | wired | scrapGained |
| `sfx_pickup_module` | sfx | `public/audio/sfx/sfx_pickup_module.ogg` | 0.3–3 s | once | 0 dB | — | 2 / overlap | cue `ability` | wired | abilityUnlocked (Backtrace module, Kinetic Coil, Glitch Strike) |
| `sfx_checkpoint` | sfx | `public/audio/sfx/sfx_checkpoint.ogg` | 0.2–2 s | once | 0 dB | — | 2 / overlap | cue `checkpoint` | wired | checkpoint |
| `sfx_quest_update` | sfx | `public/audio/sfx/sfx_quest_update.ogg` | 0.1–1.5 s | once | 0 dB | — | 2 / overlap | cue `quest` | wired | questUpdated |

## UI sounds

| Id | Kind | File | Duration | Loop | Trim | Pitch var | Voices / retrigger | Replaces | Engine | Trigger |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `sfx_ui_focus` | ui | `public/audio/ui/sfx_ui_focus.ogg` | 0.04–0.5 s | once | -3 dB | — | 2 / restart | cue `menu` | wired | Menu selection moves; dialogue opens (today) |
| `sfx_ui_confirm` | ui | `public/audio/ui/sfx_ui_confirm.ogg` | 0.04–0.5 s | once | -3 dB | — | 2 / restart | cue `confirm` | wired | Menu item activated |
| `sfx_ui_back` | ui | `public/audio/ui/sfx_ui_back.ogg` | 0.04–0.5 s | once | -3 dB | — | 2 / restart | cue `uiBack` | hooked | Back / close in menus (no distinct sound today) |
| `sfx_ui_pause` | ui | `public/audio/ui/sfx_ui_pause.ogg` | 0.04–0.5 s | once | -3 dB | — | 2 / restart | cue `uiPause` | hooked | Pause opens |
| `sfx_ui_error` | ui | `public/audio/ui/sfx_ui_error.ogg` | 0.04–0.5 s | once | -3 dB | — | 2 / restart | cue `uiError` | hooked | Rejected action (e.g. cannot afford an upgrade) |
| `sfx_ui_tab` | ui | `public/audio/ui/sfx_ui_tab.ogg` | 0.04–0.5 s | once | -3 dB | — | 2 / restart | cue `uiTab` | hooked | Menu tab changes |
| `sfx_ui_slider` | ui | `public/audio/ui/sfx_ui_slider.ogg` | 0.02–0.3 s | once | -3 dB | — | 2 / restart | cue `uiSlider` | hooked | Settings value stepped (volume, render quality…) |
| `sfx_ui_save` | ui | `public/audio/ui/sfx_ui_save.ogg` | 0.04–0.5 s | once | -3 dB | — | 2 / restart | cue `uiSave` | hooked | Progress saved (checkpoint save) |
| `sfx_ui_continue` | ui | `public/audio/ui/sfx_ui_continue.ogg` | 0.04–0.5 s | once | -3 dB | — | 2 / restart | cue `uiContinue` | hooked | Continue / start a run from the title |

## Atmosphere layers

| Id | Kind | File | Duration | Loop | Trim | Pitch var | Voices / retrigger | Replaces | Engine | Trigger |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `amb_rain` | ambience | `public/audio/ambience/amb_rain.ogg` | 1–60 s | loop | -6 dB | — | 1 / ignore | — | needs-engine | Reusable atmosphere layer "rain" (needs the ambience scheduler: looped bed or randomised one-shot per room) |
| `amb_thunder_rumble` | ambience | `public/audio/ambience/amb_thunder_rumble.ogg` | 1–60 s | loop | -6 dB | — | 1 / ignore | — | needs-engine | Reusable atmosphere layer "thunder_rumble" (needs the ambience scheduler: looped bed or randomised one-shot per room) |
| `amb_electrical_buzz` | ambience | `public/audio/ambience/amb_electrical_buzz.ogg` | 1–60 s | loop | -6 dB | — | 1 / ignore | — | needs-engine | Reusable atmosphere layer "electrical_buzz" (needs the ambience scheduler: looped bed or randomised one-shot per room) |
| `amb_neon_sign_hum` | ambience | `public/audio/ambience/amb_neon_sign_hum.ogg` | 1–60 s | loop | -6 dB | — | 1 / ignore | — | needs-engine | Reusable atmosphere layer "neon_sign_hum" (needs the ambience scheduler: looped bed or randomised one-shot per room) |
| `amb_machinery` | ambience | `public/audio/ambience/amb_machinery.ogg` | 1–60 s | loop | -6 dB | — | 1 / ignore | — | needs-engine | Reusable atmosphere layer "machinery" (needs the ambience scheduler: looped bed or randomised one-shot per room) |
| `amb_city_traffic` | ambience | `public/audio/ambience/amb_city_traffic.ogg` | 1–60 s | loop | -6 dB | — | 1 / ignore | — | needs-engine | Reusable atmosphere layer "city_traffic" (needs the ambience scheduler: looped bed or randomised one-shot per room) |
| `amb_water_drip` | ambience | `public/audio/ambience/amb_water_drip.ogg` | 1–60 s | loop | -6 dB | — | 1 / ignore | — | needs-engine | Reusable atmosphere layer "water_drip" (needs the ambience scheduler: looped bed or randomised one-shot per room) |

## Summary

wired 31 · hooked 19 · needs-hook 1 · needs-engine 7 · blocked 1
