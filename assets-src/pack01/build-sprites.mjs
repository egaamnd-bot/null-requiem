#!/usr/bin/env node
/**
 * EMBERVEIL — Asset Pack 01 Deterministic SVG/PNG & Phaser 4 Atlas Builder
 * Generates:
 *  - CHARACTERS/ENEMIES/chr_enemy_cinder_husk_sheet.{svg,png,json}
 *  - CHARACTERS/ENEMIES/chr_enemy_veil_moth_sheet.{svg,png,json}
 *  - VFX/vfx_combat_sheet.{svg,png,json}
 */

import fs from 'node:fs';
import path from 'node:path';

const OUT_ROOT = path.resolve(process.cwd(), 'EMBERVEIL_ASSETS');

const dirs = [
  'CHARACTERS/PLAYER',
  'CHARACTERS/ENEMIES',
  'ENVIRONMENTS/UNDERGROUND',
  'ENVIRONMENTS/BACKGROUNDS',
  'VFX',
  'UI',
  'LOGO',
  'AUDIO/MUSIC',
  'AUDIO/SFX',
];

for (const d of dirs) {
  fs.mkdirSync(path.join(OUT_ROOT, d), { recursive: true });
}

// ---------------------------------------------------------------------------
// 1. PROTAGONIST — intentionally omitted. See assets-src/pack01/README.md.
// ---------------------------------------------------------------------------

function buildSpriteSheet({
  name,
  outDir,
  frameW,
  frameH,
  cols,
  rows,
  origin,
  animations,
  renderFn,
}) {
  const sheetW = frameW * cols;
  const sheetH = frameH * rows;
  const framesJson = {};
  const animsMeta = {};
  let svgCells = '';

  let rowIdx = 0;
  for (const anim of animations) {
    animsMeta[anim.name] = {
      frames: [],
      fps: anim.fps,
      repeat: anim.loop ? -1 : 0,
    };
    for (let f = 0; f < anim.count; f++) {
      const col = f % cols;
      const r = rowIdx + Math.floor(f / cols);
      const x = col * frameW;
      const y = r * frameH;
      const frameKey = `${anim.name}_${String(f).padStart(2, '0')}`;
      framesJson[frameKey] = {
        frame: { x, y, w: frameW, h: frameH },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: frameW, h: frameH },
        sourceSize: { w: frameW, h: frameH },
        pivot: origin,
      };
      animsMeta[anim.name].frames.push(frameKey);
      svgCells += `<g transform="translate(${x}, ${y})">${renderFn(anim.name, f)}</g>\n`;
    }
    rowIdx += Math.ceil(anim.count / cols);
  }

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}" viewBox="0 0 ${sheetW} ${sheetH}">
${svgCells}</svg>`;

  const svgPath = path.join(OUT_ROOT, outDir, `${name}.svg`);
  const jsonPath = path.join(OUT_ROOT, outDir, `${name}.json`);
  fs.writeFileSync(svgPath, svgContent, 'utf8');

  const atlasPayload = {
    frames: framesJson,
    animations: animsMeta,
    meta: {
      app: 'EMBERVEIL Asset Builder',
      version: '1.0.0',
      image: `${name}.png`,
      svgSource: `${name}.svg`,
      format: 'RGBA8888',
      size: { w: sheetW, h: sheetH },
      scale: '1',
    },
  };
  fs.writeFileSync(jsonPath, JSON.stringify(atlasPayload, null, 2), 'utf8');
  return { svgPath, jsonPath, pngPath: path.join(OUT_ROOT, outDir, `${name}.png`) };
}

// ---------------------------------------------------------------------------
// 2. ENEMY 01 ("Cinder Husk" — Ground Melee) — 80x64 per frame
// ---------------------------------------------------------------------------
function renderCinderHuskFrame(anim, f) {
  const cx = 40;
  const footY = 58;
  let hunch = 0;
  let cleaverAngle = 20;
  let coreColor = '#E85D1A';
  let slash = '';

  if (anim === 'idle') {
    hunch = Math.sin((f / 4) * Math.PI * 2) * 1.5;
  } else if (anim === 'patrol') {
    hunch = Math.abs(Math.sin((f / 6) * Math.PI * 2)) * -2.5;
    cleaverAngle = 10 + (f % 3) * 8;
  } else if (anim === 'windup') {
    hunch = -3;
    cleaverAngle = -75 - f * 8;
    coreColor = f % 2 === 0 ? '#FFF3D1' : '#FF9E2C';
  } else if (anim === 'attack') {
    hunch = 5;
    cleaverAngle = 115;
    if (f === 0) {
      slash = `<path d="M 16 14 Q 72 24 68 54 Q 52 44 24 24 Z" fill="#FF9E2C" opacity="0.9"/>`;
    }
  } else if (anim === 'hurt') {
    coreColor = '#FFFFFF';
    hunch = -4;
  } else if (anim === 'death') {
    hunch = f * 6;
    coreColor = '#434A5E';
  }

  return `
    <g>
      <!-- Hunched Carapace -->
      <ellipse cx="${cx}" cy="${footY - 20 + hunch}" rx="15" ry="13" fill="#262B38" stroke="#07080B" stroke-width="1.8"/>
      <!-- Glowing Ember Back Vent -->
      <circle cx="${cx - 3}" cy="${footY - 24 + hunch}" r="5" fill="${coreColor}"/>
      <!-- Head -->
      <circle cx="${cx + 11}" cy="${footY - 22 + hunch}" r="6" fill="#434A5E" stroke="#07080B" stroke-width="1.5"/>
      <circle cx="${cx + 13}" cy="${footY - 23 + hunch}" r="2" fill="#FF9E2C"/>
      <!-- Slag Cleaver -->
      <g transform="translate(${cx + 10}, ${footY - 18 + hunch}) rotate(${cleaverAngle})">
        <polygon points="0,0 4,-22 14,-18 8,2" fill="#7D654C" stroke="#07080B" stroke-width="1.4"/>
        <line x1="4" y1="-20" x2="12" y2="-16" stroke="#FF9E2C" stroke-width="2"/>
      </g>
      ${slash}
    </g>
  `;
}

// ---------------------------------------------------------------------------
// 3. ENEMY 02 ("Veil Moth" — Airborne Ranged) — 64x64 per frame
// ---------------------------------------------------------------------------
function renderVeilMothFrame(anim, f) {
  const cx = 32;
  const cy = 32 + Math.sin((f / 4) * Math.PI * 2) * 3;
  const wingFlap = f % 2 === 0 ? -14 : 10;
  const glow = anim === 'windup_spit' ? '#B8FFF1' : '#2CE8C6';

  return `
    <g>
      <!-- Wings -->
      <path d="M ${cx} ${cy - 4} Q ${cx - 22} ${cy - 18 + wingFlap} ${cx - 18} ${cy + 6} Z" fill="#1E2436" stroke="#2CE8C6" stroke-width="1.2"/>
      <path d="M ${cx} ${cy - 4} Q ${cx + 22} ${cy - 18 + wingFlap} ${cx + 18} ${cy + 6} Z" fill="#1E2436" stroke="#2CE8C6" stroke-width="1.2"/>
      <!-- Bioluminescent Abdomen -->
      <ellipse cx="${cx}" cy="${cy + 6}" rx="6" ry="9" fill="${glow}" stroke="#07080B" stroke-width="1.5"/>
      <!-- Thorax & Mask -->
      <circle cx="${cx}" cy="${cy - 4}" r="5" fill="#C9C6B8" stroke="#07080B" stroke-width="1.4"/>
      <circle cx="${cx - 2}" cy="${cy - 4}" r="1.5" fill="#2CE8C6"/>
      <circle cx="${cx + 2}" cy="${cy - 4}" r="1.5" fill="#2CE8C6"/>
    </g>
  `;
}

// ---------------------------------------------------------------------------
// 4. VFX COMBAT SHEET — 64x64 per frame
// ---------------------------------------------------------------------------
function renderVfxFrame(anim, f) {
  if (anim === 'slash_arc') {
    const op = (1 - f * 0.22).toFixed(2);
    return `<path d="M 8 12 Q 58 26 52 54 Q 36 40 12 20 Z" fill="#FF9E2C" opacity="${op}"/><path d="M 16 16 Q 52 28 48 48 Z" fill="#FFF3D1" opacity="${op}"/>`;
  }
  if (anim === 'hit_spark') {
    const r = 6 + f * 6;
    return `<circle cx="32" cy="32" r="${r}" fill="none" stroke="#FFF3D1" stroke-width="${4 - f}"/><line x1="${32 - r}" y1="32" x2="${32 + r}" y2="32" stroke="#FF9E2C" stroke-width="2"/><line x1="32" y1="${32 - r}" x2="32" y2="${32 + r}" stroke="#FF9E2C" stroke-width="2"/>`;
  }
  if (anim === 'dust_land') {
    const spread = 6 + f * 6;
    const r = Math.max(1, 5 - f);
    return `<circle cx="${32 - spread}" cy="${54 - f * 2}" r="${r}" fill="#8A8F9E" opacity="0.7"/><circle cx="${32 + spread}" cy="${54 - f * 2}" r="${r}" fill="#8A8F9E" opacity="0.7"/>`;
  }
  if (anim === 'projectile_teal') {
    const r = 6 + (f % 2) * 2;
    return `<circle cx="32" cy="32" r="${r + 3}" fill="#2CE8C6" opacity="0.4"/><circle cx="32" cy="32" r="${r}" fill="#B8FFF1"/>`;
  }
  return `<circle cx="32" cy="32" r="${8 + f * 3}" fill="#E85D1A" opacity="${(0.8 - f * 0.2).toFixed(2)}"/>`;
}

// Execute builds
buildSpriteSheet({
  name: 'chr_enemy_cinder_husk_sheet',
  outDir: 'CHARACTERS/ENEMIES',
  frameW: 80,
  frameH: 64,
  cols: 6,
  rows: 7,
  origin: { x: 0.5, y: 0.90625 },
  animations: [
    { name: 'idle', count: 4, fps: 8, loop: true },
    { name: 'patrol', count: 6, fps: 12, loop: true },
    { name: 'windup', count: 4, fps: 10, loop: false },
    { name: 'attack', count: 3, fps: 18, loop: false },
    { name: 'recovery', count: 2, fps: 10, loop: false },
    { name: 'hurt', count: 2, fps: 14, loop: false },
    { name: 'death', count: 3, fps: 10, loop: false },
  ],
  renderFn: renderCinderHuskFrame,
});

buildSpriteSheet({
  name: 'chr_enemy_veil_moth_sheet',
  outDir: 'CHARACTERS/ENEMIES',
  frameW: 64,
  frameH: 64,
  cols: 6,
  rows: 6,
  origin: { x: 0.5, y: 0.5 },
  animations: [
    { name: 'fly_idle', count: 4, fps: 12, loop: true },
    { name: 'fly_move', count: 4, fps: 14, loop: true },
    { name: 'windup_spit', count: 4, fps: 12, loop: false },
    { name: 'attack_spit', count: 3, fps: 16, loop: false },
    { name: 'hurt', count: 2, fps: 14, loop: false },
    { name: 'death', count: 3, fps: 12, loop: false },
  ],
  renderFn: renderVeilMothFrame,
});

buildSpriteSheet({
  name: 'vfx_combat_sheet',
  outDir: 'VFX',
  frameW: 64,
  frameH: 64,
  cols: 6,
  rows: 5,
  origin: { x: 0.5, y: 0.5 },
  animations: [
    { name: 'slash_arc', count: 4, fps: 24, loop: false },
    { name: 'hit_spark', count: 4, fps: 24, loop: false },
    { name: 'enemy_blood_ember', count: 4, fps: 20, loop: false },
    { name: 'dust_land', count: 4, fps: 18, loop: false },
    { name: 'projectile_teal', count: 4, fps: 16, loop: true },
  ],
  renderFn: renderVfxFrame,
});

console.log('✅ EMBERVEIL Asset Pack 01 SVG Sheets & JSON Atlases generated in EMBERVEIL_ASSETS/');