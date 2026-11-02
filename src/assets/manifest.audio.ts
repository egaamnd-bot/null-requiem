import { def } from './builders';
import type { AssetDef } from './types';

const base = { category: 'audio' as const, pack: 'pack-07' as const, w: 1, h: 1, anims: {}, palette: [], variations: [] as string[], priority: 'P1' as const, placeholder: 'code-drawn' as const, integration: 'swap-ready' as const, keys: [] as string[] };

const music = (id: string, name: string, where: string, mood: string, seconds: number, extra = '') =>
  def({ ...base, id, name, purpose: `Background music: ${where}.`, description: `${mood} ${extra}`.trim(), locations: [where], audio: { kind: 'music', durationSeconds: seconds, loop: true, format: 'ogg', notes: 'Seamless loop; stereo; around -16 LUFS; no vocals.' }, note: 'Procedural ambient music plays today (audio/Music.ts); a file at public/assets/final/audio/<id>.ogg replaces it.' });

const sfx = (id: string, name: string, purpose: string, desc: string, seconds: number, kind: 'sfx' | 'ambience' = 'sfx', loop = false) =>
  def({ ...base, id, name, purpose, description: desc, locations: ['Gameplay'], audio: { kind, durationSeconds: seconds, loop, format: 'ogg', notes: kind === 'sfx' ? 'Mono, short tail, normalised to -10 dBFS peak.' : 'Seamless loop, stereo.' }, note: 'Synthesised in code today (audio/Sfx.ts).' });

export const AUDIO_ASSETS: AssetDef[] = [
  music('audio_music_title', 'Title Theme', 'Title screen', 'Sparse, melancholic synth pad over distant rain; a slow rewinding arpeggio.', 90),
  music('audio_music_rainline', 'Rainline Alley', 'Rainline Alley / Depot', 'Wet, lonely, cool: low pulse, rain texture, one hesitant lead.', 120),
  music('audio_music_transit', 'Transit Stacks', 'Transit Stacks', 'Industrial rhythm: distant clanks and a pulsing bass, rising tension as you climb.', 120),
  music('audio_music_precinct', 'Precinct Vault', 'Precinct Vault', 'Cold, claustrophobic: sub drone, alarm-tone stabs, sparse hi-hats.', 120),
  music('audio_music_undercity', 'Neon Undercity', 'Neon Undercity', 'Warm, hopeful community: marimba-like synth, dusty drum machine, a human hum.', 150),
  music('audio_music_industrial', 'Industrial Core', 'Industrial Core', 'Heavy, rhythmic machinery percussion with a looping bass riff and a heated drone.', 150),
  music('audio_music_cathedral', 'Null Cathedral', 'Null Cathedral', 'Vast, reverent and wrong: choral pads played backwards, reversed bells, a ticking clock.', 150),
  music('audio_music_boss', 'Boss Battle', 'Boss arenas', 'Driving, tense, percussive; clear phase-up layer.', 100, 'Layered stems: base, +phase2, +phase3.'),
  music('audio_music_final_boss', 'THE NULL', 'The Sanctum', 'A rewinding theme that stutters and re-plays itself; choir fragments.', 140),
  music('audio_music_ending', 'Ending', 'Ending sequence', 'A resolved, bittersweet theme built from the title melody played forward at last.', 80),
  sfx('audio_sfx_player', 'Courier SFX set', 'Jump, land, dash, attack swing, hurt, air jump, glitch strike.', 'Crisp, short cyberpunk foley: cloth-and-servo.', 0.4),
  sfx('audio_sfx_combat', 'Combat SFX set', 'Hit, kill, armour clang, projectile, burst.', 'Punchy impacts; a metallic clang for deflected hits; a dry crack for kills.', 0.5),
  sfx('audio_sfx_enemies', 'Enemy SFX set', 'Per-enemy telegraph and attack sounds (drone whine, scavenger shout, enforcer maul, stalker blink, turret lock, echo hum).', 'Each enemy needs a distinct audible tell for its wind-up.', 1.2),
  sfx('audio_sfx_backtrace', 'Backtrace SFX set', 'Backtrace activation, arrival burst, echo plate pulse, cooldown ready.', 'A rewinding tape sweep into a bright chime; a deep clock tick for plates.', 1.0),
  sfx('audio_sfx_world', 'World SFX set', 'Doors, platforms, plates, nodes, relays, pickups, laser and steam hazards.', 'Mechanical, readable, short.', 1.0),
  sfx('audio_sfx_ui', 'UI SFX set', 'Menu move/confirm/back, dialogue blip, quest update, scrap, item, upgrade.', 'Soft synth blips and chimes.', 0.6),
  sfx('audio_sfx_dialogue_blips', 'Dialogue Blips', 'One short voice-blip per NPC for text scroll.', 'Distinct pitch/timbre per NPC (Zero low and dry, Mira bright, Halden gruff, Ilse warm, Kestrel silky, Wren quick, Brannt gravelly, Vesper airy).', 0.15),
  sfx('audio_amb_rain', 'Ambience — Rain', 'Looping rain and distant city for Rainline and Undercity.', 'Heavy city rain on metal, far traffic hum.', 30, 'ambience', true),
  sfx('audio_amb_industrial', 'Ambience — Industrial', 'Looping machinery, steam and furnace roar.', 'Pipes, hydraulics, furnace rumble.', 30, 'ambience', true),
  sfx('audio_amb_cathedral', 'Ambience — Cathedral', 'Looping vast reverb room tone with ticking clocks.', 'Cavernous drone, distant ticking, faint whispers.', 30, 'ambience', true),
];
