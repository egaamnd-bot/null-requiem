import { REGIONS } from './regions';
import { ROOMS } from './rooms';
import type { RoomDef } from './types';

/** Renders docs/WORLD_MAP.md from the room data. `tests/docs.test.ts` fails when the committed file is stale. */

function gates(r: RoomDef): string[] {
  const out: string[] = [];
  for (const i of r.interactables ?? []) {
    if (i.type === 'door') out.push(`door \`${i.id}\` opens when ${i.opensWhen.join(mode(i.mode))}${i.lockedHint ? ` ("${i.lockedHint}")` : ''}`);
    if (i.type === 'plate' && i.pressedBy === 'echo') out.push(`echo plate \`${i.id}\` (Backtrace afterimage)`);
  }
  for (const s of r.spawns ?? []) {
    if (s.kind === 'pickup' && s.requiresFlag) out.push(`pickup \`${s.id}\` needs flag \`${s.requiresFlag}\``);
  }
  return out;
}
const mode = (m?: string) => (m === 'any' ? ' or ' : ' and ');

function encounters(r: RoomDef): string {
  const counts = new Map<string, number>();
  for (const s of r.spawns ?? []) {
    if (s.kind === 'enemy') counts.set(`${s.elite ? 'elite ' : ''}${s.type}`, (counts.get(`${s.elite ? 'elite ' : ''}${s.type}`) ?? 0) + 1);
    if (s.kind === 'boss') counts.set(`BOSS ${s.boss}`, 1);
  }
  return [...counts].map(([k, n]) => (n > 1 ? `${n}× ${k}` : k)).join(', ') || '—';
}

export function renderWorldMap(): string {
  const out = [
    '# NULL REQUIEM — World Map',
    '',
    '> GENERATED from `src/world/rooms*.ts` by `npm run docs:assets`. Do not edit by hand.',
    '',
    `${ROOMS.length} rooms in ${REGIONS.length} regions. Doors connect rooms through named entries; every connection is checked by \`tests/campaign.test.ts\` (both directions exist) and reachability by \`tests/campaign.reach.test.ts\` (the real Player, scripted inputs).`,
    '',
  ];
  for (const reg of REGIONS) {
    out.push(`## ${reg.name}`, '', `_${reg.tagline}_`, '');
    for (const r of ROOMS.filter((x) => x.region === reg.id)) {
      const cols = r.layout[0]?.length ?? 0;
      out.push(`### \`${r.id}\` — ${r.name}`, '', `- **Size:** ${cols}×${r.layout.length} tiles; map cell ${r.mapPos ? `(${r.mapPos.x}, ${r.mapPos.y})` : 'n/a'}`);
      out.push(`- **Connections:** ${r.doors.map((d) => `\`${d.id}\` → \`${d.to.room}\` (entry \`${d.to.entry}\`)`).join('; ') || 'none'}`);
      out.push(`- **Entries:** ${Object.keys(r.entries).map((e) => `\`${e}\``).join(', ')}`);
      const g = gates(r);
      out.push(`- **Gates / puzzles:** ${g.length ? g.join('; ') : '—'}`);
      out.push(`- **Encounters:** ${encounters(r)}`);
      const npcs = (r.spawns ?? []).filter((s) => s.kind === 'npc').map((s) => (s.kind === 'npc' ? s.npc : ''));
      if (npcs.length) out.push(`- **NPCs:** ${npcs.join(', ')}`);
      const picks = (r.spawns ?? []).filter((s) => s.kind === 'pickup');
      if (picks.length) out.push(`- **Pickups:** ${picks.map((s) => (s.kind === 'pickup' ? `\`${s.id}\` (${s.pickup})` : '')).join(', ')}`);
      out.push('');
    }
  }
  return `${out.join('\n').trimEnd()}\n`;
}
