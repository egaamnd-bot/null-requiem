import { AUDIO_CATALOG, type AudioEntry } from './catalog';

/** docs/audio/CATALOG.md, generated from src/audio/catalog.ts by `npm run docs:assets`. */
export function renderAudioCatalog(): string {
  const row = (e: AudioEntry) =>
    `| \`${e.id}\` | ${e.kind} | \`public/audio/${e.dir}/${e.id}.ogg\` | ${e.seconds[0]}–${e.seconds[1]} s | ${e.loop ? 'loop' : 'once'} | ${e.gainDb} dB | ${e.pitchVar ? `±${e.pitchVar} st` : '—'} | ${e.maxVoices} / ${e.retrigger} | ${e.cue ? `cue \`${e.cue}\`` : e.theme ? `theme \`${e.theme}\`` : e.region ? `region \`${e.region}\`` : '—'} | ${e.engine} | ${e.trigger}${e.note ? ` ${e.note}` : ''} |`;
  const head = '| Id | Kind | File | Duration | Loop | Trim | Pitch var | Voices / retrigger | Replaces | Engine | Trigger |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |';
  const out = [
    '# Audio Catalog',
    '',
    '> GENERATED from `src/audio/catalog.ts` by `npm run docs:assets`. Do not edit by hand.',
    '',
    `${AUDIO_CATALOG.length} sounds. **Engine** = \`wired\`: an existing procedural cue/theme/region/layer maps to it (the file replaces that sound); \`hooked\`: the audio-only trigger is implemented, silent until the file arrives; \`needs-hook\`: nothing triggers it; \`needs-engine\`: a system is missing; \`blocked\`: deliberately not built (Producer decision). Nothing in this table is delivered unless \`docs/CREATIVE_DELIVERY_LOG.md\` says so.`,
    '',
  ];
  for (const [title, f] of [
    ['Music, stingers and ambience beds', (e: AudioEntry) => e.kind === 'music' || e.kind === 'stinger' || (e.kind === 'ambience' && !!e.region)],
    ['Sound effects', (e: AudioEntry) => e.kind === 'sfx'],
    ['UI sounds', (e: AudioEntry) => e.kind === 'ui'],
    ['Atmosphere layers', (e: AudioEntry) => e.kind === 'ambience' && !e.region],
  ] as const) {
    out.push(`## ${title}`, '', head, ...AUDIO_CATALOG.filter(f).map(row), '');
  }
  const count = (s: string) => AUDIO_CATALOG.filter((e) => e.engine === s).length;
  out.push('## Summary', '', `wired ${count('wired')} · hooked ${count('hooked')} · needs-hook ${count('needs-hook')} · needs-engine ${count('needs-engine')} · blocked ${count('blocked')}`, '');
  return `${out.join('\n').trimEnd()}\n`;
}
