import { anim, def, type Spec } from './builders';
import type { AnimDef, AssetDef } from './types';
import { COLLECTIBLE_AND_OBJECT_ASSETS, ENVIRONMENT_ASSETS } from './manifest.world';
import { AUDIO_ASSETS } from './manifest.audio';
import { FX_ASSETS, UI_ASSETS } from './manifest.ui';

/** THE asset manifest. docs/GEMINI_ASSET_SPEC.md and docs/ASSET_MANIFEST.md are generated from it (`npm run docs:assets`). */

const COURIER_PALETTE = ['#0b0b16', '#2a2a46', '#3cf2ff', '#ff3ea5', '#e8dcc8'];
const COURIER_LOC = ['All rooms'];
const courierHit = { w: 10, h: 22, offsetX: 10.5, offsetY: 14 };
const courier = (id: string, name: string, purpose: string, anims: Record<string, AnimDef>, keys: string[], extra: Partial<Spec> = {}): AssetDef =>
  def({
    id,
    name,
    category: 'player',
    pack: 'pack-01',
    purpose,
    w: 31,
    h: 36,
    hitbox: courierHit,
    anims,
    description:
      'The Courier: a lean runner in a long dark rain-coat with a high collar, a grey satchel slung across the chest and a glowing cyan spinal implant visible at the neck. Expressive, readable silhouette; magenta rim light on the left, cyan on the right. Faces right; the game mirrors it.',
    palette: COURIER_PALETTE,
    locations: COURIER_LOC,
    priority: 'P0',
    placeholder: 'procedural-legacy',
    keys,
    ...extra,
  });

// ───────────────────────────────────────────────────────────────────────────────────────── PACK 01 — COURIER
const PLAYER: AssetDef[] = [
  courier('player_courier_idle', 'Courier — Idle', 'Standing still; breathing loop.', { idle: anim(2, 2.2) }, ['player-idle0', 'player-idle1']),
  courier('player_courier_run', 'Courier — Run', 'Run cycle (150 px/s).', { run: anim(4, 10) }, ['player-run0', 'player-run1', 'player-run2', 'player-run3']),
  courier('player_courier_jump', 'Courier — Jump', 'Rising.', { jump: anim(1, 1, false) }, ['player-jump']),
  courier('player_courier_fall', 'Courier — Fall', 'Falling.', { fall: anim(1, 1, false) }, ['player-fall']),
  courier('player_courier_dash', 'Courier — Dash', 'Horizontal dash (0.2 s). Stretched, afterimage friendly.', { dash: anim(1, 1, false) }, ['player-dash']),
  courier('player_courier_attack', 'Courier — Attack', 'Rail-blade swing; the slash arc is a separate effect. Final art may use up to 4 frames.', { attack: anim(1, 16, false) }, ['player-attack'], { note: 'The view shows this frame for the whole active window; extra frames are driven once the final sheet arrives.' }),
  courier('player_courier_hurt', 'Courier — Hurt', 'Knocked back and stunned (0.25 s).', { hurt: anim(1, 1, false) }, ['player-hurt']),
  courier('player_courier_backtrace', 'Courier — Backtrace Arrival', 'The Courier materialising at the echo point after a rewind.', { backtrace: anim(6, 16, false, 'Dissolve in from cyan glitch shards') }, [], { placeholder: 'spec-only', integration: 'needs-engine-work', note: 'Not yet played by the player view (the arrival uses fx_backtrace_arrival).' }),
  courier('player_courier_airjump', 'Courier — Kinetic Coil Air Jump', 'Second jump in mid-air: coil flares at the boots.', { airjump: anim(3, 14, false) }, [], { placeholder: 'spec-only', integration: 'needs-engine-work' }),
  courier('player_courier_interact', 'Courier — Interact', 'Reaching out to a terminal or NPC.', { interact: anim(3, 8, false) }, [], { placeholder: 'spec-only', integration: 'needs-engine-work' }),
  courier('player_courier_death', 'Courier — Death', 'Signal loss: the Courier flickers and falls.', { death: anim(6, 10, false) }, [], { placeholder: 'spec-only', integration: 'needs-engine-work' }),
];

// ───────────────────────────────────────────────────────────────────────────────────────── PACK 02 — ENEMIES
const enemy = (s: Omit<Spec, 'category' | 'pack' | 'locations'> & { locations: string[] }): AssetDef => def({ ...s, category: 'enemy', pack: 'pack-02', priority: s.priority ?? 'P0' });

const ENEMIES: AssetDef[] = [
  enemy({
    id: 'enemy_security_drone',
    name: 'Security Drone',
    purpose: 'Hovering patrol drone that locks on and fires bolts. (Code name: Watcher Drone.)',
    w: 20, h: 24, anchor: { x: 0.5, y: 0.5 },
    hitbox: { w: 14, h: 14, offsetX: 3, offsetY: 5 },
    anims: { idle: anim(2, 3), charge: anim(1, 1, false, 'Core glows white-hot while winding up a shot.') },
    description: 'A palm-sized spherical drone with a single wide magenta optic, two stubby stabiliser fins and a rear thruster plume. Matte gunmetal shell with scratched Precinct stencil; the optic must read from far away.',
    palette: ['#1a1a28', '#6a6a88', '#ff3ea5', '#ffb02e'], variations: ['Elite: red optic, extra side pods'],
    locations: ['Rainline Depot', 'Stacks Yard', 'Stacks Shaft', 'Precinct', 'Foundry'],
    placeholder: 'procedural-legacy', shape: 'drone', keys: ['drone-idle0', 'drone-idle1', 'drone-charge'],
  }),
  enemy({
    id: 'enemy_scrap_hound',
    name: 'Scrap Hound',
    purpose: 'Low four-legged crawler that lunges (wind-up, lunge, recover).',
    w: 24, h: 16, hitbox: { w: 18, h: 12, offsetX: 3, offsetY: 4 },
    anims: { walk: anim(2, 5), windup: anim(1, 1, false), lunge: anim(1, 1, false), recover: anim(1, 1, false) },
    description: 'A hunched scrap-metal quadruped built from piping and a cracked dog skull, one red sensor eye, rust-orange and bruise-purple plates. The wind-up pose crouches visibly low.',
    palette: ['#2a1a1a', '#8a4a2a', '#ff3b4e', '#c9a46a'], variations: ['Elite: glowing red joints'],
    locations: ['Rainline Alley', 'Transit Stacks', 'Undercroft', 'Arcade'],
    placeholder: 'procedural-legacy', shape: 'hound', keys: ['hound-walk0', 'hound-walk1', 'hound-windup', 'hound-lunge', 'hound-recover'],
  }),
  enemy({
    id: 'enemy_street_scavenger',
    name: 'Street Scavenger',
    purpose: 'Basic ground enemy: patrols, chases, stabs with a rail spike. Elite variant throws shivs.',
    w: 24, h: 32, hitbox: { w: 12, h: 22, offsetX: 6, offsetY: 10 },
    anims: { idle: anim(2, 2.5), walk: anim(4, 8), windup: anim(2, 6, false), strike: anim(2, 14, false), hurt: anim(1, 1, false), death: anim(3, 8, false) },
    description: 'A gaunt human looter in layered rags and a rain tarp hood, taped goggles, carrying a sharpened rail spike. Orange scarf as the colour code for "Scavenger". Wind-up raises the spike behind the head for a clear tell.',
    palette: ['#2a2018', '#8a6a3a', '#ff9f3e', '#d8c8a8'], variations: ['Elite: red scarf, bandolier of shivs'],
    locations: ['Rainline Alley', 'Transit Stacks', 'Precinct', 'Undercity', 'Industrial Core'],
    shape: 'humanoid', colors: [0x8a6a3a, 0xff9f3e, 0xffb02e],
  }),
  enemy({
    id: 'enemy_heavy_enforcer',
    name: 'Heavy Enforcer',
    purpose: 'Armoured brute: frontal armour deflects, long slam wind-up, open during recovery.',
    w: 40, h: 46, hitbox: { w: 22, h: 30, offsetX: 9, offsetY: 16 },
    anims: { idle: anim(2, 2), walk: anim(4, 6), windup: anim(3, 4, false, 'Raises the maul overhead; chest plate flares.'), slam: anim(2, 14, false), recover: anim(2, 3, false, 'Plate opens; core visible.'), hurt: anim(1, 1, false), death: anim(4, 8, false) },
    description: 'A wide riot-armoured Precinct brute in a steel-blue plate suit, enormous shoulder guards, a shield-plate across the chest that visibly splits open on recovery, carrying a two-handed hydraulic maul. Slow, heavy silhouette.',
    palette: ['#1a2230', '#4a6a9a', '#9ab8e8', '#ff3b4e'], variations: ['Elite: black plate with red trim'],
    locations: ['Precinct Checkpoint', 'Pipeworks', 'Foundry', 'Nave'],
    shape: 'heavy', colors: [0x4a6a9a, 0x9ab8e8, 0xff3b4e],
  }),
  enemy({
    id: 'enemy_phase_stalker',
    name: 'Phase Stalker',
    purpose: 'Blinking predator: lurks, vanishes, reappears beside the Courier, stabs.',
    w: 24, h: 32, hitbox: { w: 12, h: 22, offsetX: 6, offsetY: 10 },
    anims: { lurk: anim(2, 4), blink: anim(3, 18, false, 'Dissolve out / in with glitch slices.'), windup: anim(2, 8, false), strike: anim(2, 16, false), recover: anim(1, 1, false), hurt: anim(1, 1, false), death: anim(3, 8, false) },
    description: 'A tall thin figure in a violet shroud with a smooth featureless mask and long hands ending in blade-fingers; the edges of its body are slightly out of register (chromatic split). Semi-transparent, unsettling.',
    palette: ['#120a22', '#6a3ac8', '#c9a0ff', '#ffffff'], variations: ['Elite: double afterimage trail'],
    locations: ['Undercity Arcade', 'Leaning Towers', 'Reactor Hall', 'Nave'],
    shape: 'stalker', colors: [0x6a3ac8, 0xc9a0ff, 0xffffff],
  }),
  enemy({
    id: 'enemy_sentry_turret',
    name: 'Sentry Turret',
    purpose: 'Stationary mounted gun with an aim line; shield opens only while venting.',
    w: 24, h: 24, anchor: { x: 0.5, y: 0.5 }, hitbox: { w: 16, h: 16, offsetX: 4, offsetY: 4 },
    anims: { idle: anim(2, 2), lock: anim(3, 6, false, 'Barrel snaps toward the target; red lens brightens.'), fire: anim(2, 16, false), vent: anim(2, 5, false, 'Armour petals open; core exposed.'), hurt: anim(1, 1, false), death: anim(3, 8, false) },
    description: 'A compact twin-barrel gun pod on a swivel mount, wrapped in armour petals that open when it vents. Matte Precinct grey with one red lens. The barrel is drawn pointing RIGHT; the game rotates it toward the target.',
    palette: ['#1c1c24', '#5a5a70', '#ff3b4e', '#ffb02e'], variations: ['Elite: gold stripes', 'Mounts: floor, ceiling, left wall, right wall (game rotates)'],
    locations: ['Stacks Shaft', 'Precinct Checkpoint', 'Arcade', 'Foundry', 'Pipeworks', 'Nave'],
    shape: 'turret', colors: [0x5a5a70, 0xff3b4e, 0xffb02e],
  }),
  enemy({
    id: 'enemy_null_echo',
    name: 'Null Echo',
    purpose: 'A hostile afterimage of the Courier that retraces their recorded path.',
    w: 24, h: 32, anchor: { x: 0.5, y: 0.5 }, hitbox: { w: 12, h: 22, offsetX: 6, offsetY: 5 },
    anims: { float: anim(4, 6), hurt: anim(1, 1, false), death: anim(3, 10, false, 'Shatters into cyan static.') },
    description: 'A ghost-like copy of the Courier silhouette rendered as translucent cyan-white static with scan lines, trailing wisps, empty hollow eyes. Must be instantly recognisable as "me, from before".',
    palette: ['#0a1a22', '#3cf2ff', '#e8ffff', '#ff3ea5'], variations: ['Elite: magenta edge glow'],
    locations: ['Reactor Hall', 'Nave', 'Sanctum (summoned)'],
    shape: 'echo', colors: [0x3cf2ff, 0xe8ffff, 0xff3ea5],
  }),
];

// ───────────────────────────────────────────────────────────────────────────────────────── PACK 06 — BOSSES
const boss = (s: Omit<Spec, 'category' | 'pack'>): AssetDef => def({ ...s, category: 'boss', pack: 'pack-06', priority: s.priority ?? 'P0' });
const BOSSES: AssetDef[] = [
  boss({
    id: 'boss_bulwark_9', name: 'BULWARK-9', purpose: 'Riot-control mech miniboss (charge, leap, plasma rain).',
    w: 56, h: 48, hitbox: { w: 34, h: 30, offsetX: 11, offsetY: 18 },
    anims: { idle: anim(1, 1), windup: anim(1, 1), charge: anim(1, 1), leap: anim(1, 1), stunned: anim(1, 1), dead: anim(1, 1) },
    description: 'A squat decommissioned riot mech: slab-like torso, drop-down visor with a single red slit, hydraulic piston legs, shoulder-mounted plasma launchers. Peeling Precinct stencil, sparks from the neck when stunned.',
    palette: ['#1a1a22', '#6a6a82', '#ff3b4e', '#ffb02e'], locations: ['Precinct Vault'],
    placeholder: 'procedural-legacy', keys: ['bulwark-idle', 'bulwark-windup', 'bulwark-charge', 'bulwark-leap', 'bulwark-stunned', 'bulwark-dead'],
  }),
  boss({
    id: 'boss_panoptix_0', name: 'PANOPTIX-0', purpose: 'Surveillance-AI boss (sweeping laser, drones, death beams).',
    w: 64, h: 64, anchor: { x: 0.5, y: 0.5 },
    anims: { idle: anim(1, 1), laser: anim(1, 1), stagger: anim(1, 1), dead: anim(1, 1) },
    description: 'A floating mechanical eye the size of a cart on a ring of spider legs, iris of concentric violet rings, cables trailing into the ceiling. The iris dilates before each laser.',
    palette: ['#14102a', '#7755cc', '#cc44ff', '#ffffff'], locations: ['Null Archive'],
    placeholder: 'procedural-legacy', keys: ['panoptix-idle', 'panoptix-laser', 'panoptix-stagger', 'panoptix-dead'],
  }),
  boss({
    id: 'boss_kiln_7', name: 'KILN-7', purpose: 'Industrial furnace-warden: piston slams, steam vents, ember rain, furnace sweep.',
    w: 80, h: 64, hitbox: { w: 60, h: 46, offsetX: 10, offsetY: 18 },
    anims: { idle: anim(2, 2), telegraph: anim(2, 6, false), active: anim(3, 14, false), exposed: anim(2, 5, false, 'Furnace core visible; this is the damage window.'), hurt: anim(1, 1, false), death: anim(4, 6, false) },
    description: 'A furnace as a creature: a barrel-chested iron kiln with a glowing grated core in its belly, three piston arms hung from the ceiling-rails, steam stacks on its back. The core is hidden behind iron shutters that clang open during the exposed window.',
    palette: ['#1c1210', '#6a3a22', '#ff6a2e', '#ffd070'], locations: ['The Kiln'],
    shape: 'machine', colors: [0x6a3a22, 0xff6a2e, 0xffd070],
  }),
  boss({
    id: 'boss_the_null', name: 'THE NULL', purpose: 'Final boss: a void entity that rewinds itself like the Courier.',
    w: 48, h: 72, anchor: { x: 0.5, y: 0.5 }, hitbox: { w: 22, h: 36, offsetX: 13, offsetY: 18 },
    anims: { idle: anim(4, 4), telegraph: anim(2, 6, false), attack: anim(3, 14, false), exposed: anim(2, 5, false), rewind: anim(3, 16, false, 'Snaps back along its own trail.'), death: anim(6, 6, false, 'Unravels into every colour it ever erased.') },
    description: 'A tall humanoid hole in the world: a void-black silhouette with a faintly human posture, edges torn into scan-lined shards, a ring of floating magenta/cyan dots (erased minutes) around its chest. Its face is a smooth blank; occasional flickers show a stranger\'s faces.',
    palette: ['#05020a', '#3a0a5a', '#ff3ea5', '#3cf2ff'], locations: ['The Sanctum'],
    shape: 'void', colors: [0x3a0a5a, 0xff3ea5, 0x3cf2ff],
  }),
];

// ───────────────────────────────────────────────────────────────────────────────────────── PACK 03 — NPCs
const npc = (id: string, name: string, desc: string, palette: string[], loc: string[], colors: readonly [number, number, number], extra: Partial<Spec> = {}): AssetDef =>
  def({
    id, name, category: 'npc', pack: 'pack-03', purpose: `${name}: dialogue NPC.`, w: 24, h: 32, hitbox: { w: 12, h: 22, offsetX: 6, offsetY: 10 },
    anims: { idle: anim(4, 3), talk: anim(2, 5) }, description: desc, palette, locations: loc, shape: 'npc', colors, ...extra,
  });
const NPCS: AssetDef[] = [
  npc('npc_zero', 'Zero', 'A street informant in a hooded green rain-poncho, face half-covered by a scarf, one cybernetic eye ring glowing cyan.', ['#0c1c18', '#2a8a6a', '#3cf2ff'], ['Rainline Alley'], [0x2a8a6a, 0x3cf2ff, 0x3cf2ff], { placeholder: 'procedural-legacy', anims: { idle: anim(1, 1) }, keys: ['npc-zero'], priority: 'P0' }),
  npc('npc_mira', 'Mira', 'A survivor archivist in a patchwork coat covered in tiny paper tags, round glasses, a satchel of memory shards.', ['#1c1018', '#a04a8a', '#ffb02e'], ['Transit Stacks'], [0xa04a8a, 0xffb02e, 0xff3ea5], { placeholder: 'procedural-legacy', anims: { idle: anim(1, 1) }, keys: ['npc-mira'], priority: 'P0' }),
  def({
    id: 'npc_terminal', name: 'Terminal', category: 'npc', pack: 'pack-03', purpose: 'Readable data terminal (lore logs, tutorial, power console).', w: 24, h: 32, anims: { idle: anim(1, 1) },
    description: 'A waist-high wall-mounted CRT terminal with a green-violet screen, bundles of cable, a blinking cursor. Reads as "interact here".', palette: ['#14102a', '#7755cc', '#4dff9a'],
    locations: ['Depot', 'Precinct', 'Cells', 'Reactor', 'Archive', 'Nave'], placeholder: 'procedural-legacy', keys: ['npc-terminal'], priority: 'P0', shape: 'terminal',
  }),
  npc('npc_station_mechanic', 'Halden (Station Mechanic)', 'A broad mechanic in oil-stained orange overalls, welding goggles pushed up on a bald head, a tool belt, one arm a patched servo prosthetic.', ['#2a1808', '#e08a2e', '#c9c9d8'], ['Stacks Yard'], [0xe08a2e, 0xc9c9d8, 0xffb02e], { priority: 'P0' }),
  npc('npc_underground_medic', 'Doc Ilse (Underground Medic)', 'A tired medic in a long white coat stained at the cuffs, a red cross armband, grey-streaked hair in a bun, carrying a hard-shell med case.', ['#241820', '#e8e0f0', '#ff3b4e'], ['Undercity Plaza'], [0xe8e0f0, 0xff3b4e, 0x4dff9a], { priority: 'P0' }),
  npc('npc_former_officer', 'Brannt (Former Security Officer)', 'A stocky ex-guard in a stripped Precinct jacket (insignia torn off), grey stubble, a faded blue cap, arms crossed.', ['#101828', '#3a5a8a', '#9ab8e8'], ['Undercity Plaza'], [0x3a5a8a, 0x9ab8e8, 0xffb02e], { priority: 'P1' }),
  npc('npc_street_informant', 'Wren (Street Informant)', 'A wiry young informant on a rooftop perch in an oversized yellow windbreaker, a cap on backwards, a pocket full of paper maps.', ['#2a2410', '#e8d030', '#3cf2ff'], ['Undercity Plaza'], [0xe8d030, 0x3cf2ff, 0xff3ea5], { priority: 'P1' }),
  npc('npc_black_market_trader', 'Kestrel (Black-Market Trader)', 'A sleek trader with a long burgundy coat lined with glowing contraband vials, a half-mask of gold filigree, a rolling display case.', ['#240a18', '#a02a5a', '#ffd070'], ['Undercity Plaza'], [0xa02a5a, 0xffd070, 0xff3ea5], { priority: 'P0' }),
  npc('npc_temporal_researcher', 'Dr. Vesper (Temporal Researcher)', 'A lean scientist in a cracked lab coat over a pressure suit, hair streaked with static-white, a tablet projecting rewinding clock faces.', ['#0c1c28', '#3a8ac8', '#e8ffff'], ['Reactor Hall'], [0x3a8ac8, 0xe8ffff, 0x3cf2ff], { priority: 'P1' }),
  npc('npc_null_echo', 'Null Echo (Erased Survivor)', 'A faded, looping figure in the Courier\'s silhouette with a pale face and a missing-pixel patch where an identity should be.', ['#14102a', '#9b59ff', '#e8dcc8'], ['Undercroft'], [0x9b59ff, 0xe8dcc8, 0x3cf2ff], { priority: 'P2', shape: 'echo' }),
];

const portrait = (npcId: string, name: string, extra: Partial<Spec> = {}): AssetDef =>
  def({
    id: `ui_portrait_${npcId}`, name: `${name} — Portrait`, category: 'ui', pack: 'pack-07', purpose: 'Bust shown beside dialogue lines.', w: 96, h: 96, anchor: { x: 0.5, y: 1 },
    anims: { neutral: anim(1, 1), talk: anim(2, 5), alt: anim(1, 1) }, description: `Half-length portrait of ${name}, facing slightly left (toward the dialogue text), strong rim light, transparent background, neutral/talking/emotional variants.`,
    palette: ['#14102a', '#e8dcc8', '#3cf2ff'], locations: ['Dialogue panel'], priority: 'P1', placeholder: 'spec-only', integration: 'needs-engine-work',
    note: 'The dialogue panel currently shows the NPC placeholder sprite enlarged; the portrait slot is reserved.', ...extra,
  });
const PORTRAITS: AssetDef[] = ['zero:Zero', 'mira:Mira', 'halden:Halden', 'ilse:Doc Ilse', 'brannt:Brannt', 'wren:Wren', 'kestrel:Kestrel', 'vesper:Dr. Vesper'].map((s) => {
  const [id, n] = s.split(':') as [string, string];
  return portrait(id, n);
});

export const ASSETS: readonly AssetDef[] = [
  ...PLAYER,
  ...ENEMIES,
  ...BOSSES,
  ...NPCS,
  ...PORTRAITS,
  ...ENVIRONMENT_ASSETS,
  ...COLLECTIBLE_AND_OBJECT_ASSETS,
  ...FX_ASSETS,
  ...UI_ASSETS,
  ...AUDIO_ASSETS,
];

export const ASSET_BY_ID: ReadonlyMap<string, AssetDef> = new Map(ASSETS.map((a) => [a.id, a]));
