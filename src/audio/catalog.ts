import type { Cue } from './Sfx';
import type { Theme } from './musicTheory';

/**
 * THE audio contract between creative production and the engine (reconciles docs/CREATIVE_PRODUCTION_HANDOFF.md with the code).
 *
 * - `id` is the canonical file stem: `public/audio/<dir>/<id>.<ext>` (ogg preferred). Variations: `<id>_01`, `<id>_02`, …
 * - `cue` / `theme` / `region` name the EXISTING procedural sound a file replaces 1:1 (the procedural sound stays as fallback).
 * - `engine` says honestly whether a trigger already exists in the game:
 *     wired        an existing cue/theme/region maps to it; delivering the file is enough once the loader runs
 *     needs-hook   the sound is defined but nothing in the game triggers it yet (presentation-side hook needed)
 *     needs-engine a system is missing (layered music, ambience one-shot scheduler, safe-room state…)
 * Pure data: importable from tools and tests.
 */
export type AudioKind = 'music' | 'stinger' | 'ambience' | 'sfx' | 'ui';
export type AudioDir = 'music' | 'sfx' | 'ui' | 'ambience';
export type EngineStatus = 'wired' | 'hooked' | 'needs-hook' | 'needs-engine' | 'blocked';
export type Retrigger = 'overlap' | 'restart' | 'ignore';

export interface AudioEntry {
  id: string;
  kind: AudioKind;
  dir: AudioDir;
  loop: boolean;
  /** Existing procedural cue it replaces (SFX/UI). */
  cue?: Cue;
  /** Existing procedural music theme it replaces. */
  theme?: Theme;
  /** Combat stem: plays on top of this base music id while the audio-only combat signal is active. */
  layerOf?: string;
  /** Region whose rooms play this ambience loop. */
  region?: 'rainline' | 'transit' | 'precinct';
  /** Regions in which this loop plays as a quiet LAYER under the region bed (city traffic, neon hum, machinery…). */
  layerIn?: readonly ('rainline' | 'transit' | 'precinct')[];
  trigger: string;
  engine: EngineStatus;
  /** Playback trim in dB on top of the file (files are mastered to the targets in docs/audio/README.md). */
  gainDb: number;
  /** ± semitones of random pitch variation per play (SFX). */
  pitchVar: number;
  /** Max simultaneous instances of this sound. */
  maxVoices: number;
  retrigger: Retrigger;
  /** Expected duration range in seconds (validation window). */
  seconds: readonly [number, number];
  note?: string;
}

const sfx = (id: string, cue: Cue | undefined, engine: EngineStatus, trigger: string, seconds: readonly [number, number], o: Partial<AudioEntry> = {}): AudioEntry => ({
  id, kind: 'sfx', dir: 'sfx', loop: false, ...(cue ? { cue } : {}), trigger, engine, gainDb: 0, pitchVar: 0, maxVoices: 2, retrigger: 'overlap', seconds, ...o,
});
const ui = (id: string, cue: Cue | undefined, engine: EngineStatus, trigger: string, seconds: readonly [number, number] = [0.04, 0.5], o: Partial<AudioEntry> = {}): AudioEntry => ({
  id, kind: 'ui', dir: 'ui', loop: false, ...(cue ? { cue } : {}), trigger, engine, gainDb: -3, pitchVar: 0, maxVoices: 2, retrigger: 'restart', seconds, ...o,
});
const music = (id: string, theme: Theme | undefined, engine: EngineStatus, trigger: string, o: Partial<AudioEntry> = {}): AudioEntry => ({
  id, kind: 'music', dir: 'music', loop: true, ...(theme ? { theme } : {}), trigger, engine, gainDb: 0, pitchVar: 0, maxVoices: 1, retrigger: 'ignore', seconds: [45, 240], ...o,
});
const amb = (id: string, region: AudioEntry['region'] | undefined, engine: EngineStatus, trigger: string): AudioEntry => ({
  id, kind: 'ambience', dir: 'ambience', loop: true, ...(region ? { region } : {}), trigger, engine, gainDb: -6, pitchVar: 0, maxVoices: 1, retrigger: 'ignore', seconds: [20, 120],
});

export const AUDIO_CATALOG: readonly AudioEntry[] = [
  // ───────────────────────────────────────────────────────────────────────── music (11 handoff IDs incl. 3 ambience beds below)
  music('music_title_theme', 'title', 'wired', 'Title screen and menus'),
  music('music_rainline_exploration', 'rainline', 'wired', 'Exploring any Rainline room (alley, depot, undercroft)'),
  music('music_rainline_combat', undefined, 'wired', 'Combat stem layered over music_rainline_exploration while the audio-only combat signal is active (derived from enemyWindup/enemyShoot/hit/playerHurt events; never touches AI or balance). Must be the same length and tempo as the exploration loop so the two stay in sync', { seconds: [45, 180], layerOf: 'music_rainline_exploration' }),
  music('music_boss_bulwark9', 'boss', 'wired', 'The shared boss theme: plays for every non-final boss (Producer decision 2026-11-03: keep it shared for now; unique per-boss themes are commissioned later)', { seconds: [45, 180] }),
  { ...music('music_backtrace_motif', undefined, 'hooked', 'Short musical identity layered on the Backtrace sound (not a loop)'), kind: 'stinger', cue: 'btMotif', loop: false, seconds: [0.5, 8], retrigger: 'overlap', maxVoices: 2 },
  { ...music('music_victory', undefined, 'wired', 'Game completed (replaces the procedural victory cue)'), kind: 'stinger', cue: 'victory', loop: false, seconds: [3, 40], retrigger: 'restart' },
  { ...music('music_game_over', undefined, 'hooked', 'Player death overlay'), kind: 'stinger', cue: 'gameOver', loop: false, seconds: [2, 30], retrigger: 'restart' },
  music('music_safe_room', undefined, 'blocked', 'BLOCKED by Producer decision (2026-11-03): only plays if a genuine safe-room/checkpoint STATE exists. The game has only a one-frame `checkpoint` event (touch a relay: heal + save), no persistent state, and none will be invented for music. Reconsider if a real safe-room mechanic is ever designed', { seconds: [30, 180] }),
  amb('amb_rainline_loop', 'rainline', 'wired', 'Rainline region bed (rain, distant traffic, hum). Plays on the ambience channel (no procedural fallback: silent without a file)'),
  amb('amb_transit_stacks_loop', 'transit', 'wired', 'Transit Stacks region bed'),
  amb('amb_precinct_vault_loop', 'precinct', 'wired', 'Precinct Vault region bed'),

  // ───────────────────────────────────────────────────────────────────────── player
  sfx('sfx_player_footstep_wet', 'footstep', 'hooked', 'Run-cycle foot contact (no footstep event exists; derive from the run animation frame)', [0.04, 0.4], { pitchVar: 1.5, maxVoices: 3, gainDb: -6, note: 'Provide 4 variations (_01.._04).' }),
  sfx('sfx_player_jump', 'jump', 'wired', 'playerJump (ground)', [0.05, 0.5], { pitchVar: 0.5 }),
  sfx('sfx_player_land', 'land', 'wired', 'playerLand', [0.05, 0.6], { pitchVar: 0.5 }),
  sfx('sfx_player_airjump', 'airjump', 'wired', 'playerJump with air=true', [0.05, 0.6]),
  sfx('sfx_player_dash', 'dash', 'wired', 'playerDash', [0.05, 0.6]),
  sfx('sfx_player_attack', 'swing', 'wired', 'playerAttack', [0.05, 0.5], { pitchVar: 0.7, maxVoices: 3, note: 'Provide 3 variations.' }),
  sfx('sfx_player_hurt', 'hurt', 'wired', 'playerHurt', [0.1, 0.8]),
  sfx('sfx_player_death', 'death', 'wired', 'playerDied', [0.3, 2.5]),
  // ───────────────────────────────────────────────────────────────────────── Backtrace
  sfx('sfx_backtrace_charge', undefined, 'needs-hook', 'Backtrace has no charge phase in the game (it is instant); play on button press before release if wanted', [0.1, 1.5]),
  sfx('sfx_backtrace_release', 'backtrace', 'wired', 'backtrace event (departure)', [0.1, 1.5], { retrigger: 'restart', maxVoices: 1 }),
  sfx('sfx_backtrace_arrival', 'arrival', 'hooked', 'backtrace event, played at the arrival point shortly after release', [0.1, 1.5]),
  sfx('sfx_backtrace_ready', 'btReady', 'hooked', 'Cooldown finished (no event: derive from HUD backtrace cooldown reaching 0)', [0.1, 1], { gainDb: -4 }),
  sfx('sfx_backtrace_cooldown', 'btCooldown', 'hooked', 'Cooldown started (same moment as the backtrace event)', [0.1, 2]),
  // ───────────────────────────────────────────────────────────────────────── combat / enemies
  sfx('sfx_enemy_telegraph', 'windup', 'wired', 'enemyWindup / bossWindup (all enemies share it until per-enemy windups exist)', [0.1, 1], { maxVoices: 3 }),
  sfx('sfx_scrap_hound_lunge', 'houndLunge', 'hooked', 'Scrap Hound lunge; `enemyWindup` carries no enemy kind yet', [0.1, 1]),
  sfx('sfx_drone_charge', 'droneCharge', 'hooked', 'Security Drone charge; `enemyWindup` carries no enemy kind yet', [0.2, 1.5]),
  sfx('sfx_drone_projectile', 'shoot', 'wired', 'enemyShoot', [0.05, 0.8], { pitchVar: 0.5, maxVoices: 3 }),
  sfx('sfx_hit_light', 'hit', 'wired', 'hit on enemy/boss/projectile (not killed)', [0.04, 0.4], { pitchVar: 1, maxVoices: 4, gainDb: -2, note: 'Provide 3 variations.' }),
  sfx('sfx_hit_heavy', 'heavyHit', 'hooked', 'Heavy hits (Glitch Strike, boss stagger); `hit` does not say how heavy', [0.06, 0.8], { maxVoices: 2 }),
  sfx('sfx_enemy_death', 'kill', 'wired', 'hit with killed=true / bossDefeated', [0.1, 1.2], { maxVoices: 3 }),
  sfx('sfx_boss_warning', 'roar', 'wired', 'bossStart / bossPhase', [0.3, 3], { maxVoices: 1, retrigger: 'restart' }),
  // ───────────────────────────────────────────────────────────────────────── world
  sfx('sfx_door_open', 'door', 'wired', 'doorChanged open=true (and nodePowered uses the plate cue)', [0.1, 1.5]),
  sfx('sfx_door_close', 'doorClose', 'hooked', 'doorChanged open=false (today both directions share one cue)', [0.1, 1.5]),
  sfx('sfx_relay_activate', 'relayActivate', 'hooked', 'Sync relay linked (checkpoint event with firstTime=true; today shares sfx_checkpoint)', [0.2, 2]),
  sfx('sfx_pressure_plate', 'plate', 'wired', 'plateChanged / nodePowered', [0.05, 0.8]),
  sfx('sfx_breakable_wall', 'wall', 'wired', 'wallBroken', [0.2, 1.5]),
  sfx('sfx_pickup_integrity', 'integrity', 'hooked', 'Integrity cell pickup (no dedicated event; arrives as a generic pickup today)', [0.1, 1.5]),
  sfx('sfx_pickup_memory', 'record', 'wired', 'loreFound / fragmentCollected', [0.1, 1.5]),
  sfx('sfx_pickup_scrap', 'coin', 'wired', 'scrapGained', [0.03, 0.5], { pitchVar: 1, maxVoices: 4, gainDb: -3 }),
  sfx('sfx_pickup_module', 'ability', 'wired', 'abilityUnlocked (Backtrace module, Kinetic Coil, Glitch Strike)', [0.3, 3]),
  sfx('sfx_checkpoint', 'checkpoint', 'wired', 'checkpoint', [0.2, 2]),
  sfx('sfx_quest_update', 'quest', 'wired', 'questUpdated', [0.1, 1.5]),
  // ───────────────────────────────────────────────────────────────────────── UI (renamed `sfx_ui_*`: bare `ui_*` ids are visual assets in the manifest)
  ui('sfx_ui_focus', 'menu', 'wired', 'Menu selection moves; dialogue opens (today)'),
  ui('sfx_ui_confirm', 'confirm', 'wired', 'Menu item activated'),
  ui('sfx_ui_back', 'uiBack', 'hooked', 'Back / close in menus (no distinct sound today)'),
  ui('sfx_ui_pause', 'uiPause', 'hooked', 'Pause opens'),
  ui('sfx_ui_error', 'uiError', 'hooked', 'Rejected action (e.g. cannot afford an upgrade)'),
  ui('sfx_ui_tab', 'uiTab', 'hooked', 'Menu tab changes'),
  ui('sfx_ui_slider', 'uiSlider', 'hooked', 'Settings value stepped (volume, render quality…)', [0.02, 0.3], { retrigger: 'restart' }),
  ui('sfx_ui_save', 'uiSave', 'hooked', 'Progress saved (checkpoint save)'),
  ui('sfx_ui_continue', 'uiContinue', 'hooked', 'Continue / start a run from the title'),
  // ───────────────────────────────────────────────────────────────────────── atmosphere one-shots / layers (need an ambience scheduler)
  ...['rain', 'thunder_rumble', 'electrical_buzz', 'neon_sign_hum', 'machinery', 'city_traffic', 'water_drip'].map((n) => {
    // Looped layers are wired (they play under the region bed). Rain, thunder and water drips still need a one-shot scheduler.
    const layers: Record<string, { in: readonly ('rainline' | 'transit' | 'precinct')[]; gainDb: number; note: string }> = {
      city_traffic: { in: ['rainline', 'transit'], gainDb: -8, note: 'Distant city traffic layer (Rainline, Transit Stacks)' },
      neon_sign_hum: { in: ['rainline'], gainDb: -12, note: 'Neon sign hum layer (Rainline)' },
      machinery: { in: ['transit', 'precinct'], gainDb: -10, note: 'Machinery layer (Transit Stacks, Precinct Vault)' },
      electrical_buzz: { in: ['precinct'], gainDb: -12, note: 'Electrical buzz layer (Precinct Vault)' },
    };
    const l = layers[n];
    const base = amb(`amb_${n}`, undefined, l ? 'wired' : 'needs-engine', l ? l.note : `Reusable atmosphere layer "${n}" (needs the ambience scheduler: randomised one-shot per room)`);
    return { ...base, dir: 'ambience' as const, seconds: [1, 60] as readonly [number, number], ...(l ? { layerIn: l.in, gainDb: l.gainDb } : {}) };
  }),
];

export const AUDIO_BY_ID: ReadonlyMap<string, AudioEntry> = new Map(AUDIO_CATALOG.map((e) => [e.id, e]));

/** The catalog entry that replaces a procedural cue, if any. */
export const ENTRY_FOR_CUE: ReadonlyMap<Cue, AudioEntry> = new Map(AUDIO_CATALOG.filter((e) => e.cue).map((e) => [e.cue as Cue, e]));
export const ENTRY_FOR_THEME: ReadonlyMap<Theme, AudioEntry> = new Map(AUDIO_CATALOG.filter((e) => e.theme).map((e) => [e.theme as Theme, e]));
