import { ASSETS } from './manifest';
import { frameCount, PACKS, sheetLayout, type AssetDef, type PackId } from './types';

/** Renders the generated asset docs from the manifest. `tests/docs.test.ts` fails when the committed files are stale. */

const packIds = Object.keys(PACKS) as PackId[];
const byPack = (p: PackId): AssetDef[] => ASSETS.filter((a) => a.pack === p);

function animLine(a: AssetDef): string {
  return Object.entries(a.anims)
    .map(([n, d]) => `\`${n}\` ${d.frames}f @ ${d.fps}fps ${d.loop ? 'loop' : 'once'}${d.note ? ` (${d.note})` : ''}`)
    .join('; ');
}

function specEntry(a: AssetDef): string {
  const l = sheetLayout(a);
  const lines = [`#### \`${a.id}\` — ${a.name}  [${a.priority}]`, '', `- **Purpose:** ${a.purpose}`, `- **Description:** ${a.description}`];
  if (a.audio) {
    lines.push(`- **Audio:** ${a.audio.kind}, ~${a.audio.durationSeconds}s, ${a.audio.loop ? 'seamless loop' : 'one-shot'}, ${a.audio.format}. ${a.audio.notes}`);
  } else {
    lines.push(
      `- **Frame size:** ${a.display.w}×${a.display.h} logical px (deliver at 1×, 2× or 4×; integer multiples only)`,
      `- **Sheet:** one row per animation, ${l.columns} columns × ${l.rows} rows = ${l.width}×${l.height} px at 1×. Animations in row order: ${animLine(a)}`,
      `- **Anchor:** ${a.anchor.x}, ${a.anchor.y}`,
    );
    if (a.hitbox) lines.push(`- **Hitbox (gameplay, for reference):** ${a.hitbox.w}×${a.hitbox.h} at offset ${a.hitbox.offsetX}, ${a.hitbox.offsetY}`);
  }
  lines.push(`- **Palette:** ${a.palette.join(' ')}`);
  if (a.variations.length) lines.push(`- **Variations:** ${a.variations.join('; ')}`);
  lines.push(`- **Appears in:** ${a.locations.join(', ')}`);
  lines.push(`- **Delivery:** \`${a.id}.${a.audio ? a.audio.format : 'png'}\`${a.note ? ` — ${a.note}` : ''}`);
  return lines.join('\n');
}

export function renderGeminiSpec(): string {
  const out: string[] = [
    '# NULL REQUIEM — Gemini Asset Specification',
    '',
    '> GENERATED from `src/assets/manifest*.ts` by `npm run docs:assets`. Do not edit by hand.',
    '',
    '## Global art direction',
    '',
    '- **Setting:** an original rain-soaked urban cyberpunk megacity; hard 2D side-scroller, readable at phone size (the world is 270 logical px tall; a phone shows it ~4× scaled).',
    '- **Style:** pixel-art-adjacent, crisp edges, **no anti-aliased blur on sprites**, transparent PNG background. Dark concrete and wet steel, saturated neon accents (cyan, magenta, sodium orange, violet). Strong silhouette first, detail second.',
    '- **Lighting:** top-left key light, cyan/magenta rim lights. Backtrace/echo effects are cyan-violet. The Null is desaturated chrome-white with violet edge.',
    '- **Originality:** all designs must be original. Do not imitate any existing game, film, anime or franchise character, logo or poster.',
    '- **Sheet rules:** one ROW per animation, frames left to right, equal frame cells, transparent padding allowed inside a cell but never between cells. Facing RIGHT; the game mirrors.',
    '- **Naming:** the file name is the asset id plus extension, exactly as listed. Never rename ids.',
    '- **Scale:** deliver at 1×, 2× or 4× the stated frame size. The loader derives the scale from the image size and rejects non-integer ratios (see `docs/ASSET_INTEGRATION_GUIDE.md`).',
    '',
    '## Packs',
    '',
    '| Pack | Contents | Assets | Frames/sounds |',
    '| --- | --- | ---: | ---: |',
  ];
  for (const p of packIds) {
    const list = byPack(p);
    out.push(`| ${PACKS[p].name} | ${PACKS[p].summary} | ${list.length} | ${list.reduce((n, a) => n + (a.audio ? 1 : frameCount(a)), 0)} |`);
  }
  for (const p of packIds) {
    out.push('', `## ${PACKS[p].name}`, '', PACKS[p].summary, '');
    for (const a of byPack(p)) out.push(specEntry(a), '');
  }
  return `${out.join('\n').trimEnd()}\n`;
}

export function renderAssetManifest(): string {
  const out = [
    '# NULL REQUIEM — Asset Manifest',
    '',
    '> GENERATED from `src/assets/manifest*.ts` by `npm run docs:assets`. Do not edit by hand.',
    '',
    `${ASSETS.length} assets. **Placeholder** = code-drawn stand-in in the game now. **Swap-ready** = drop the final file into \`public/assets/final/\` and list it in \`manifest.json\`. **Needs engine work** = the spec exists but the game cannot show new art for it yet (see the integration guide).`,
    '',
  ];
  for (const p of packIds) {
    out.push(`## ${PACKS[p].name}`, '', '| Id | Name | Category | Frames | Priority | Placeholder | Integration |', '| --- | --- | --- | ---: | :-: | --- | --- |');
    for (const a of byPack(p)) out.push(`| \`${a.id}\` | ${a.name} | ${a.category} | ${a.audio ? 'audio' : frameCount(a)} | ${a.priority} | ${a.placeholder} | ${a.integration} |`);
    out.push('');
  }
  return `${out.join('\n').trimEnd()}\n`;
}
