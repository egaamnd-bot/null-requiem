import { SCRAP_DROPS, ELITE_SCRAP_MULTIPLIER } from '../config/enemyTuning';
import { BACKTRACE, COMBAT, FLOW, GLITCH_STRIKE, NPC_TUNING, PANOPTIX, PLAYER, PUZZLE, SIM, TILE_SIZE } from '../config/tuning';
import { maxUpgradeLevel, UPGRADES, upgradeValue, type UpgradeId } from '../config/upgrades';
import type { RoomDef, TilePoint, TileRect } from '../world/types';
import { Backtrace } from './backtrace';
import { Kiln7 } from './bosses/kiln7';
import type { PatternBoss } from './bosses/patternBoss';
import { TheNull } from './bosses/theNull';
import { DialogueRunner, type DialogueDef, type DialogueView, type Effect } from './dialogue';
import { createEnemy, isEnemyType, spawnsOnGround } from './enemies/registry';
import { InteractableSystem } from './interactables';
import { QuestLog, type QuestRewards } from './quests';
import { bodyRect } from './body';
import { hitConnects, type Damageable, type DamageSource } from './combat';
import { ScrapHound } from './enemies/scrapHound';
import type { Enemy, EnemyContext } from './enemies/enemy';
import { BulwarkUnit } from './enemies/bulwarkUnit';
import { PanoptixUnit } from './enemies/panoptixUnit';
import { WatcherDrone } from './enemies/watcherDrone';
import type { Emit, GameEvent } from './events';
import { GameFlow } from './flow';
import { emptyFrame, type InputFrame } from './input';
import { insetRect, rectCenter, rectsOverlap, sign, type Rect } from './math';
import { NpcEntity } from './npc';
import { Player } from './player';
import { Progression } from './progression';
import { Projectile, type ProjectileSpec } from './projectile';
import { Tile, TileGrid, type TileMarker } from './tiles';
import { FRAGMENT_LORE } from '../world/dialogues';
import { DEFAULT_CONTENT, type WorldContent } from '../world/content';
import { itemName } from '../world/items';
import type { PickupSpawnDef } from '../world/types';
import { FRAGMENT } from '../config/tuning';

export interface CheckpointState {
  id: string;
  rect: Rect;
  feetX: number;
  feetY: number;
  touching: boolean;
}

export interface PickupState {
  id: string;
  kind: 'backtrace' | 'cell' | 'fragment' | 'glitch-strike' | 'scrap' | 'upgrade' | 'item' | 'ability' | 'record';
  rect: Rect;
  taken: boolean;
  /** For fragments: lore text to show when collected. */
  lore?: string;
  /** Data-driven pickups keep their spawn definition. */
  def?: PickupSpawnDef;
}

export interface DoorState {
  id: string;
  rect: Rect;
  to: { room: string; entry: string };
}

const WALL_HEALTH = 3;

/** A cracked section of wall that crumbles after a few strikes. */
export class BreakableWall implements Damageable {
  readonly targetKind = 'wall' as const;
  readonly requiresLineOfSight = false;
  readonly pogoable = false;
  hp = WALL_HEALTH;
  readonly rect: Rect;

  constructor(
    readonly id: string,
    readonly tiles: readonly TilePoint[],
  ) {
    const cols = tiles.map((t) => t.col);
    const rows = tiles.map((t) => t.row);
    const c0 = Math.min(...cols);
    const r0 = Math.min(...rows);
    this.rect = {
      x: c0 * TILE_SIZE,
      y: r0 * TILE_SIZE,
      w: (Math.max(...cols) - c0 + 1) * TILE_SIZE,
      h: (Math.max(...rows) - r0 + 1) * TILE_SIZE,
    };
  }

  isAlive(): boolean {
    return this.hp > 0;
  }

  hurtbox(): Rect {
    return this.rect;
  }

  takeHit(damage: number): { killed: boolean } {
    if (this.hp <= 0) return { killed: false };
    this.hp = Math.max(0, this.hp - damage);
    return { killed: this.hp === 0 };
  }
}

/** A gate that an override switch opens for a short time. Passing it latches it open for good. */
export interface TimedGateState {
  id: string;
  tiles: TilePoint[];
  rect: Rect;
  open: boolean;
  /** Seconds left before it closes (while open). */
  timer: number;
  latched: boolean;
}

/** A wall-mounted override switch. Striking it opens the room's timed gate. */
export class OverrideSwitch implements Damageable {
  readonly targetKind = 'switch' as const;
  readonly requiresLineOfSight = true;
  readonly pogoable = false;

  constructor(
    readonly id: string,
    readonly rect: Rect,
    private readonly active: () => boolean,
    private readonly onHit: () => void,
  ) {}

  isAlive(): boolean {
    return this.active();
  }

  hurtbox(): Rect {
    return this.rect;
  }

  takeHit(): { killed: boolean } {
    this.onHit();
    return { killed: false };
  }
}

export interface RoomState {
  def: RoomDef;
  grid: TileGrid;
  enemies: Enemy[];
  boss: BulwarkUnit | null;
  panoptix: PanoptixUnit | null;
  /** Pattern-driven boss (KILN-7, THE NULL). */
  pboss: PatternBoss | null;
  /** True when defeating `pboss` ends the game. */
  pbossFinal: boolean;
  interact: InteractableSystem;
  /** Strikeable power nodes (as attack targets). */
  nodeTargets: NodeTarget[];
  npcs: NpcEntity[];
  projectiles: Projectile[];
  checkpoints: CheckpointState[];
  pickups: PickupState[];
  walls: BreakableWall[];
  doors: DoorState[];
  gates: TilePoint[];
  gateClosed: boolean;
  timedGate: TimedGateState | null;
  switches: OverrideSwitch[];
  /** Index of NPC player is currently talking to, or -1. */
  activeNpcIndex: number;
}

/** A power node as something the player's attacks can hit. */
export class NodeTarget implements Damageable {
  readonly targetKind = 'switch' as const;
  readonly requiresLineOfSight = true;
  readonly pogoable = false;
  constructor(
    readonly id: string,
    private readonly rect: Rect,
    private readonly active: () => boolean,
    private readonly onHit: () => void,
  ) {}
  isAlive(): boolean {
    return this.active();
  }
  hurtbox(): Rect {
    return this.rect;
  }
  takeHit(): { killed: boolean } {
    this.onHit();
    return { killed: false };
  }
}

export interface HudSnapshot {
  health: number;
  maxHealth: number;
  invulnerable: boolean;
  hasBacktrace: boolean;
  /** 1 right after use, 0 when ready. */
  backtraceCooldown: number;
  /** True when Backtrace has enough history and is off cooldown. */
  backtraceReady: boolean;
  dashCooldown: number;
  roomName: string;
  boss: { name: string; health: number; max: number; phase: number } | null;
  /** 0–100 signal energy for Glitch Strike. */
  signalEnergy: number;
  signalMax: number;
  /** Currently displayed NPC dialogue line, or null. */
  activeNpcLine: string | null;
  activeNpcName: string | null;
  /** Full dialogue state (with choices), or null when not talking. */
  dialogue: DialogueView | null;
  /** Prompt for an NPC / terminal in reach ("Talk", "Read"), or null. */
  interactPrompt: string | null;
  scrap: number;
  tracked: { title: string; text: string } | null;
  hasAirJump: boolean;
  /** Courier's current Backtrace window in seconds (for the HUD / journal). */
  backtraceWindow: number;
  /** Memory fragments collected this run. */
  fragmentsCollected: number;
  fragmentsTotal: number;
  /** 0–1 charge toward Glitch Strike (only shows when ability is unlocked). */
  glitchChargeRatio: number;
  hasGlitchStrike: boolean;
}

export interface WorldOptions {
  rng?: () => number;
  /** Quests, dialogues and NPC data. Defaults to the shipped campaign content. */
  content?: WorldContent;
  /** Called whenever progress should be persisted (checkpoint, ability, secret, boss). */
  onSave?: (progression: Progression) => void;
  startRoom: string;
}

const tileCenterX = (col: number): number => (col + 0.5) * TILE_SIZE;
const tileFeetY = (row: number): number => (row + 1) * TILE_SIZE;

function tileRectToPx(r: TileRect): Rect {
  return { x: r.col * TILE_SIZE, y: r.row * TILE_SIZE, w: r.cols * TILE_SIZE, h: r.rows * TILE_SIZE };
}

/**
 * The whole game simulation for one play session. Deterministic given its inputs and RNG.
 * Presentation reads its state and drains `events`; it never mutates gameplay directly.
 */
export class GameWorld {
  readonly flow = new GameFlow('title');
  readonly player: Player;
  room!: RoomState;
  /** Increments every time a room is (re)built, so views know when to rebuild. */
  roomVersion = 0;
  pendingTransition: { room: string; entry: string } | null = null;
  /** The player's personal rewind; its echo is drawn by the presentation layer. */
  readonly backtrace = new Backtrace(SIM.stepHz);

  private readonly defs = new Map<string, RoomDef>();
  private readonly parsed = new Map<string, { grid: TileGrid; markers: TileMarker[] }>();
  private readonly rng: () => number;
  private readonly onSave: (p: Progression) => void;
  private readonly startRoom: string;
  private eventQueue: GameEvent[] = [];
  readonly content: WorldContent;
  /** Quest tracking (persisted through `progression.quests`). */
  readonly quests: QuestLog;
  private dialogue: DialogueRunner | null = null;
  private dialogueNpc: NpcEntity | null = null;
  private dialogueView: DialogueView | null = null;
  private pendingVendor: string | null = null;
  private backtraceArrival: { x: number; y: number } | null = null;
  private stillTime = 0;
  private lastPlayerPos = { x: 0, y: 0 };
  private spawnedEnemyCount = 0;
  private readonly hintsShown = new Set<string>();
  private deathTimer = 0;
  private victoryTimer = -1;
  private lastSafe = { x: 0, y: 0 };
  private gateHintShown = false;
  private readonly emit: Emit = (e) => this.eventQueue.push(e);

  constructor(
    defs: readonly RoomDef[],
    readonly progression: Progression,
    options: WorldOptions,
  ) {
    for (const def of defs) {
      this.defs.set(def.id, def);
      this.parsed.set(def.id, TileGrid.fromAscii(def.layout, TILE_SIZE));
    }
    if (!this.defs.has(options.startRoom)) throw new Error(`Unknown start room ${options.startRoom}`);
    this.startRoom = options.startRoom;
    this.rng = options.rng ?? Math.random;
    this.onSave = options.onSave ?? (() => {});
    this.content = options.content ?? DEFAULT_CONTENT;
    this.quests = new QuestLog(this.content.quests, progression, { grantRewards: (r) => this.grantRewards(r) }, this.emit);
    this.player = new Player(0, 0, this.maxHealth);
    this.applyUpgrades();
  }

  // ------------------------------------------------------------------ upgrades / rewards / effects

  /** Push the current upgrade levels into Backtrace. Call after any upgrade change. */
  applyUpgrades(): void {
    const p = this.progression;
    this.backtrace.setStats({
      window: upgradeValue('backtraceWindow', p.upgradeLevel('backtraceWindow')),
      cooldown: upgradeValue('backtraceCooldown', p.upgradeLevel('backtraceCooldown')),
    });
  }

  get signalRegen(): number {
    return upgradeValue('signalRegen', this.progression.upgradeLevel('signalRegen'));
  }

  private burstDamage(): number {
    return upgradeValue('backtraceBurst', this.progression.upgradeLevel('backtraceBurst'));
  }

  /** Buy the next level of an upgrade with scrap. */
  buyUpgrade(id: UpgradeId): { ok: boolean; reason?: string } {
    const lvl = this.progression.upgradeLevel(id);
    if (lvl >= maxUpgradeLevel(id)) return { ok: false, reason: 'maxed' };
    const cost = UPGRADES[id].costs[lvl] as number;
    if (!this.progression.spendScrap(cost)) return { ok: false, reason: 'scrap' };
    this.progression.raiseUpgrade(id);
    this.applyUpgrades();
    this.emit({ type: 'upgradeGained', upgrade: id, level: this.progression.upgradeLevel(id) });
    this.onSave(this.progression);
    return { ok: true };
  }

  grantRewards(r: QuestRewards): void {
    const p = this.progression;
    if (r.scrap) {
      p.addScrap(r.scrap);
      this.emit({ type: 'scrapGained', amount: r.scrap, x: this.player.centerX, y: this.player.centerY, total: p.scrap });
    }
    for (const it of r.items ?? []) this.giveItem(it.id, it.n ?? 1);
    for (const f of r.flags ?? []) this.setFlag(f);
    if (r.maxHealth) {
      p.maxHealthBonus += r.maxHealth;
      this.player.health.setMax(this.maxHealth, true);
    }
    if (r.upgrade && (r.upgrade as UpgradeId in UPGRADES)) {
      p.raiseUpgrade(r.upgrade as UpgradeId);
      this.applyUpgrades();
      this.emit({ type: 'upgradeGained', upgrade: r.upgrade, level: p.upgradeLevel(r.upgrade as UpgradeId) });
    }
    this.onSave(p);
  }

  private setFlag(flag: string): void {
    if (this.progression.setFlag(flag)) {
      this.emit({ type: 'flagSet', flag });
      this.quests.refresh();
    }
  }

  private giveItem(id: string, n = 1): void {
    this.progression.addItem(id, n);
    this.emit({ type: 'itemGained', item: id, name: itemName(id), x: this.player.centerX, y: this.player.centerY });
    this.quests.notify('collect', id, n);
    this.quests.refresh();
  }

  /** Apply one dialogue / quest effect. */
  applyEffect(e: Effect): void {
    const p = this.progression;
    if (e.setFlag) this.setFlag(e.setFlag);
    if (e.clearFlag) p.flags.delete(e.clearFlag);
    if (e.giveItem) this.giveItem(e.giveItem.id, e.giveItem.n ?? 1);
    if (e.takeItem) {
      p.addItem(e.takeItem.id, -(e.takeItem.n ?? 1));
      this.quests.refresh();
    }
    if (e.scrap) {
      p.addScrap(e.scrap);
      if (e.scrap > 0) this.emit({ type: 'scrapGained', amount: e.scrap, x: this.player.centerX, y: this.player.centerY, total: p.scrap });
    }
    if (e.startQuest) this.quests.start(e.startQuest);
    if (e.turnInQuest) this.quests.turnIn(e.turnInQuest);
    if (e.heal) this.player.health.restoreFull();
    if (e.maxHealth) {
      p.maxHealthBonus += e.maxHealth;
      this.player.health.setMax(this.maxHealth, true);
    }
    if (e.openVendor) this.pendingVendor = e.openVendor;
    if (e.setCheckpointHere) this.activateCheckpointAt(this.player.feetX, this.player.feetY);
    this.onSave(p);
  }

  private activateCheckpointAt(x: number, y: number): void {
    this.progression.checkpoint = { roomId: this.room.def.id, x, y };
    this.emit({ type: 'checkpoint', x, y, firstTime: true });
  }

  get maxHealth(): number {
    return PLAYER.maxHealth + this.progression.maxHealthBonus;
  }

  // ------------------------------------------------------------------ lifecycle

  /** Begin play: at the saved checkpoint if there is one, otherwise at the start marker. */
  start(): void {
    if (!this.flow.dispatch('start')) return;
    this.victoryTimer = -1;
    this.applyUpgrades();
    this.quests.startAutoQuests();
    this.spawnAtRespawnPoint();
  }

  pause(): boolean {
    return this.flow.dispatch('pause');
  }

  resume(): boolean {
    return this.flow.dispatch('resume');
  }

  /** Respawn at the last checkpoint (from game over, or "restart" from the pause menu). */
  retry(): boolean {
    if (!this.flow.dispatch('retry')) return false;
    this.pendingTransition = null;
    this.spawnAtRespawnPoint();
    return true;
  }

  quitToTitle(): boolean {
    return this.flow.dispatch('quit');
  }

  drainEvents(): GameEvent[] {
    const out = this.eventQueue;
    this.eventQueue = [];
    return out;
  }

  /** Where the player will respawn. */
  respawnPoint(): { roomId: string; x: number; y: number } {
    const cp = this.progression.checkpoint;
    if (cp && this.defs.has(cp.roomId)) return { roomId: cp.roomId, x: cp.x, y: cp.y };
    const start = this.parsed.get(this.startRoom)?.markers.find((m) => m.char === 'P');
    if (!start) throw new Error('Start room has no P marker');
    return { roomId: this.startRoom, x: tileCenterX(start.col), y: tileFeetY(start.row) };
  }

  private spawnAtRespawnPoint(): void {
    const p = this.respawnPoint();
    this.player.health.setMax(this.maxHealth);
    this.player.respawn(p.x, p.y);
    this.backtrace.cooldown = 0;
    this.loadRoom(p.roomId, p.x, p.y);
  }

  /** Finish a door transition requested by the simulation (called once the screen has faded). */
  completeTransition(): void {
    const t = this.pendingTransition;
    if (!t) return;
    this.pendingTransition = null;
    const def = this.defs.get(t.room);
    const entry = def?.entries[t.entry];
    if (!def || !entry) throw new Error(`Bad door target ${t.room}:${t.entry}`);
    this.loadRoom(def.id, tileCenterX(entry.col), tileFeetY(entry.row));
  }

  // ------------------------------------------------------------------ room building

  private loadRoom(roomId: string, feetX: number, feetY: number): void {
    const def = this.defs.get(roomId);
    const parsed = this.parsed.get(roomId);
    if (!def || !parsed) throw new Error(`Unknown room ${roomId}`);
    const grid = parsed.grid.clone();

    // Count F markers per room for keying into fragment lore
    const fragCounters: Record<string, number> = {};

    const room: RoomState = {
      def,
      grid,
      enemies: [],
      boss: null,
      panoptix: null,
      pboss: null,
      pbossFinal: false,
      interact: new InteractableSystem([], grid, this.progression),
      nodeTargets: [],
      npcs: [],
      projectiles: [],
      checkpoints: [],
      pickups: [],
      walls: [],
      doors: def.doors.map((d) => ({ id: d.id, rect: tileRectToPx(d.area), to: d.to })),
      gates: [],
      gateClosed: false,
      timedGate: null,
      switches: [],
      activeNpcIndex: -1,
    };
    const timedGateTiles: TilePoint[] = [];
    const switchMarkers: TileMarker[] = [];

    let droneIndex = 0;
    for (const m of parsed.markers) {
      const id = `${roomId}:${m.char}:${m.col},${m.row}`;
      switch (m.char) {
        case 'C':
          room.enemies.push(new ScrapHound(id, tileCenterX(m.col), tileFeetY(m.row)));
          break;
        case 'W':
          room.enemies.push(new WatcherDrone(id, tileCenterX(m.col), (m.row + 0.5) * TILE_SIZE, droneIndex++ * 1.7));
          break;
        case 'X': {
          // Determine boss type based on room id
          if (roomId === 'null_archive') {
            if (this.progression.panoptixDefeated) break;
            const arena = def.bossArena ? tileRectToPx(def.bossArena) : { x: 0, y: 0, w: grid.widthPx, h: grid.heightPx };
            room.panoptix = new PanoptixUnit(id, tileCenterX(m.col), tileFeetY(m.row), {
              left: arena.x,
              right: arena.x + arena.w,
              ceilingY: arena.y,
              floorY: arena.y + arena.h,
            });
          } else {
            if (this.progression.bossDefeated) break;
            const arena = def.bossArena ? tileRectToPx(def.bossArena) : { x: 0, y: 0, w: grid.widthPx, h: grid.heightPx };
            room.boss = new BulwarkUnit(id, tileCenterX(m.col), tileFeetY(m.row), {
              left: arena.x,
              right: arena.x + arena.w,
              ceilingY: arena.y,
              floorY: arena.y + arena.h,
            });
          }
          break;
        }
        case 'K':
          room.checkpoints.push({
            id,
            rect: { x: m.col * TILE_SIZE - 4, y: (m.row - 1) * TILE_SIZE, w: TILE_SIZE + 8, h: TILE_SIZE * 2 },
            feetX: tileCenterX(m.col),
            feetY: tileFeetY(m.row),
            touching: false,
          });
          break;
        case 'A':
          room.pickups.push({
            id,
            kind: 'backtrace',
            rect: { x: m.col * TILE_SIZE, y: (m.row - 1) * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE * 2 },
            taken: this.progression.has('backtrace'),
          });
          break;
        case 'H':
          room.pickups.push({
            id,
            kind: 'cell',
            rect: { x: m.col * TILE_SIZE + 2, y: m.row * TILE_SIZE + 2, w: TILE_SIZE - 4, h: TILE_SIZE - 4 },
            taken: this.progression.secrets.has(id),
          });
          break;
        case 'G': {
          room.pickups.push({
            id,
            kind: 'glitch-strike',
            rect: { x: m.col * TILE_SIZE, y: (m.row - 1) * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE * 2 },
            taken: this.progression.has('glitch-strike'),
          });
          break;
        }
        case 'N':
          // Legacy NPC marker: NPCs are now placed by `spawns` (see world/npcs.ts); ignore stray markers.
          break;
        case 'F': {
          // Key: 'roomId:F:index'
          const fIdx = fragCounters[roomId] ?? 0;
          fragCounters[roomId] = fIdx + 1;
          const fragKey = `${roomId}:F:${fIdx}`;
          const lore = FRAGMENT_LORE[fragKey] ?? '';
          room.pickups.push({
            id: fragKey,
            kind: 'fragment',
            rect: { x: m.col * TILE_SIZE + 2, y: m.row * TILE_SIZE + 2, w: TILE_SIZE - 4, h: TILE_SIZE - 4 },
            taken: this.progression.fragmentsCollected.has(fragKey),
            lore,
          });
          break;
        }
        case 'D':
          room.gates.push({ col: m.col, row: m.row });
          break;
        case 'T':
          timedGateTiles.push({ col: m.col, row: m.row });
          break;
        case 'S':
          switchMarkers.push(m);
          break;
        case 'P':
          break;
        default:
          throw new Error(`Unknown marker '${m.char}' in room ${roomId}`);
      }
    }

    this.spawnContent(room, def, grid);

    for (const tiles of findBreakableGroups(grid)) {
      const first = tiles[0] as TilePoint;
      const wallId = `${roomId}:wall:${first.col},${first.row}`;
      if (this.progression.brokenWalls.has(wallId)) {
        for (const t of tiles) grid.set(t.col, t.row, Tile.Empty);
      } else {
        room.walls.push(new BreakableWall(wallId, tiles));
      }
    }

    if (timedGateTiles.length > 0) this.buildTimedGate(room, timedGateTiles, switchMarkers);
    else if (switchMarkers.length > 0) throw new Error(`Room ${roomId} has a switch but no timed gate`);

    // Interactables must be built after breakable walls / timed gates have shaped the grid.
    room.interact = new InteractableSystem(def.interactables ?? [], grid, this.progression);
    room.nodeTargets = room.interact.nodes.map(
      (n) =>
        new NodeTarget(
          `${def.id}:node:${n.def.id}`,
          n.rect,
          () => !n.powered,
          () => {
            this.emit({ type: 'switchHit', x: n.rect.x + 8, y: n.rect.y + 8 });
            if (room.interact.hitNode(n.def.id)) {
              this.emit({ type: 'nodePowered', id: n.def.id, x: n.rect.x + 8, y: n.rect.y + 8 });
              this.onSave(this.progression);
            }
          },
        ),
    );

    this.room = room;
    this.roomVersion++;
    this.dialogue = null;
    this.dialogueView = null;
    this.dialogueNpc = null;
    this.hintsShown.clear();
    this.progression.visitedRooms.add(roomId);
    this.quests.notify('visit', roomId);
    this.backtrace.clear();
    this.gateHintShown = false;
    this.player.placeAt(feetX, feetY);
    this.lastSafe = { x: feetX, y: feetY };
    this.emit({ type: 'roomEntered', roomId, name: def.name });
  }

  /** Instantiate the data-driven spawns of a room (enemies, NPCs, pickups, bosses). */
  private spawnContent(room: RoomState, def: RoomDef, grid: TileGrid): void {
    let index = 0;
    for (const sp of def.spawns ?? []) {
      const id = `${def.id}:s${index++}`;
      switch (sp.kind) {
        case 'enemy': {
          if (!isEnemyType(sp.type)) throw new Error(`Unknown enemy type ${sp.type} in ${def.id}`);
          const ground = spawnsOnGround(sp.type);
          room.enemies.push(
            createEnemy({
              type: sp.type,
              id,
              x: tileCenterX(sp.col),
              y: ground ? tileFeetY(sp.row) : (sp.row + 0.5) * TILE_SIZE,
              elite: sp.elite ?? false,
              ...(sp.mount ? { mount: sp.mount } : {}),
              phase: index * 1.7,
            }),
          );
          break;
        }
        case 'npc': {
          const entry = this.content.npcs[sp.npc];
          if (!entry) throw new Error(`Unknown NPC ${sp.npc} in ${def.id}`);
          room.npcs.push(
            new NpcEntity({
              id: entry.id,
              npcId: entry.id,
              name: entry.name,
              lines: [],
              feetX: tileCenterX(sp.col),
              feetY: tileFeetY(sp.row),
              kind: entry.kind,
              dialogueId: entry.dialogue,
              ...(entry.verb ? { verb: entry.verb } : {}),
            }),
          );
          break;
        }
        case 'pickup': {
          if (sp.requiresFlag && !this.progression.hasFlag(sp.requiresFlag)) break;
          const taken = sp.pickup === 'cell' ? this.progression.secrets.has(sp.id) : this.progression.collected.has(sp.id);
          const big = sp.pickup === 'ability' || sp.pickup === 'upgrade';
          room.pickups.push({
            id: sp.id,
            kind: sp.pickup === 'cell' ? 'cell' : sp.pickup,
            rect: big
              ? { x: sp.col * TILE_SIZE, y: (sp.row - 1) * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE * 2 }
              : { x: sp.col * TILE_SIZE + 2, y: sp.row * TILE_SIZE + 2, w: TILE_SIZE - 4, h: TILE_SIZE - 4 },
            taken,
            def: sp,
          });
          break;
        }
        case 'boss': {
          if (this.progression.defeatedBosses.has(sp.boss)) break;
          const arena = def.bossArena ? tileRectToPx(def.bossArena) : { x: 0, y: 0, w: grid.widthPx, h: grid.heightPx };
          const a = { left: arena.x, right: arena.x + arena.w, ceilingY: arena.y, floorY: arena.y + arena.h };
          room.pboss = sp.boss === 'kiln-7' ? new Kiln7(id, tileCenterX(sp.col), tileFeetY(sp.row), a) : new TheNull(id, tileCenterX(sp.col), (sp.row + 0.5) * TILE_SIZE, a);
          room.pbossFinal = sp.final === true;
          break;
        }
      }
    }
  }

  private buildTimedGate(room: RoomState, tiles: TilePoint[], switchMarkers: readonly TileMarker[]): void {
    const id = `${room.def.id}:timedGate`;
    const cols = tiles.map((t) => t.col);
    const rows = tiles.map((t) => t.row);
    const c0 = Math.min(...cols);
    const r0 = Math.min(...rows);
    const gate: TimedGateState = {
      id,
      tiles,
      rect: {
        x: c0 * TILE_SIZE,
        y: r0 * TILE_SIZE,
        w: (Math.max(...cols) - c0 + 1) * TILE_SIZE,
        h: (Math.max(...rows) - r0 + 1) * TILE_SIZE,
      },
      open: false,
      timer: 0,
      latched: this.progression.latchedGates.has(id),
    };
    for (const t of tiles) room.grid.set(t.col, t.row, gate.latched ? Tile.Empty : Tile.Gate);
    room.timedGate = gate;
    room.switches = switchMarkers.map((m) => {
      const rect = { x: m.col * TILE_SIZE + 3, y: (m.row - 1) * TILE_SIZE, w: TILE_SIZE - 6, h: TILE_SIZE * 2 };
      return new OverrideSwitch(
        `${room.def.id}:switch:${m.col},${m.row}`,
        rect,
        () => !gate.latched,
        () => {
          this.emit({ type: 'switchHit', x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });
          gate.timer = PUZZLE.gateOpenTime;
          if (!gate.open) this.setTimedGate(gate, true);
        },
      );
    });
  }

  private setTimedGate(gate: TimedGateState, open: boolean): void {
    gate.open = open;
    for (const t of gate.tiles) this.room.grid.set(t.col, t.row, open ? Tile.Empty : Tile.Gate);
    this.emit({ type: 'timedGate', open });
  }

  private updateTimedGate(dt: number): void {
    const gate = this.room.timedGate;
    if (!gate || gate.latched) return;
    const pr = bodyRect(this.player.body);
    // Passing through latches the gate open for good (also covers arriving from the far side).
    if (this.player.body.x >= gate.rect.x + gate.rect.w && pr.y < gate.rect.y + gate.rect.h && pr.y + pr.h > gate.rect.y) {
      gate.latched = true;
      if (!gate.open) this.setTimedGate(gate, true);
      gate.open = true;
      this.progression.latchedGates.add(gate.id);
      this.emit({ type: 'gateLatched' });
      this.onSave(this.progression);
      return;
    }
    if (gate.open) {
      gate.timer -= dt;
      // Never close on top of the player.
      if (gate.timer <= 0 && !rectsOverlap(pr, gate.rect)) this.setTimedGate(gate, false);
    } else if (!this.gateHintShown) {
      const probe = { x: pr.x - 2, y: pr.y, w: pr.w + 4, h: pr.h };
      if (rectsOverlap(probe, gate.rect)) {
        this.gateHintShown = true;
        this.emit({ type: 'gateLocked', x: gate.rect.x, y: pr.y });
      }
    }
  }

  /** Snap the player back to their echo. Returns true if it fired. */
  private tryBacktrace(): boolean {
    const p = this.player;
    if (p.dead || !this.progression.has('backtrace') || !this.backtrace.ready) return false;
    const target = this.backtrace.target(this.room.grid, p.body.w, p.body.h);
    if (!target) return false;
    const fromX = p.centerX;
    const fromY = p.centerY;
    const before = p.health.current;
    const best = Math.min(p.health.max, this.backtrace.bestHealth());
    p.placeAt(target.feetX, target.feetY);
    p.facing = target.facing;
    if (best > p.health.current) p.health.heal(best - p.health.current);
    p.health.grantInvulnerability(BACKTRACE.arrivalInvulnerability);
    this.backtrace.consume();
    this.backtraceArrival = { x: p.centerX, y: p.centerY };
    this.emit({ type: 'backtrace', fromX, fromY, toX: p.centerX, toY: p.centerY, restored: p.health.current - before });
    this.backtraceBurst(p.centerX, p.centerY);
    return true;
  }

  /** Damage released where the player arrives. Hits enemies and projectiles in range with line of sight. */
  private backtraceBurst(cx: number, cy: number): void {
    const room = this.room;
    const r = BACKTRACE.burst.radius;
    void BACKTRACE.burst.damage;
    const bossTargets: Damageable[] = [
      ...(room.boss && room.boss.isActive ? [room.boss] : []),
      ...(room.pboss && room.pboss.isActive ? [room.pboss] : []),
      ...(room.panoptix && !room.panoptix.defeated ? [room.panoptix as unknown as Damageable] : []),
    ];
    const targets: Damageable[] = [...room.enemies, ...bossTargets, ...room.projectiles];
    for (const t of targets) {
      if (!t.isAlive()) continue;
      const hr = t.hurtbox();
      const nx = Math.max(hr.x, Math.min(cx, hr.x + hr.w));
      const ny = Math.max(hr.y, Math.min(cy, hr.y + hr.h));
      if (Math.hypot(nx - cx, ny - cy) > r) continue;
      const tc = rectCenter(hr);
      if (!room.grid.lineOfSight(cx, cy, tc.x, tc.y)) continue;
      const dx = tc.x - cx;
      const dy = tc.y - cy;
      const len = Math.hypot(dx, dy) || 1;
      const { killed } = t.takeHit(this.burstDamage(), dx / len, dy / len);
      this.emit({ type: 'hit', x: tc.x, y: tc.y, target: t.targetKind, killed });
      if (killed && t.targetKind === 'enemy') this.emit({ type: 'enemyDied', x: tc.x, y: tc.y, kind: (t as Enemy).kind });
    }
  }

  // ------------------------------------------------------------------ simulation

  step(input: InputFrame, dt: number): void {
    if (!this.flow.simulating || this.pendingTransition) return;
    const room = this.room;
    const player = this.player;

    if (this.flow.state === 'dying') {
      player.step(emptyFrame(), room.grid, dt, { dash: false, glitchStrike: false }, this.emit);
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.flow.dispatch('deathFinished');
      return;
    }

    // A conversation pauses the world: nobody should die while reading a terminal.
    if (this.dialogue?.active) {
      if (input.interactPressed) this.advanceDialogue();
      return;
    }

    this.progression.playTime += dt;
    this.backtrace.tick(dt);
    this.backtraceArrival = null;
    if (input.backtracePressed) this.tryBacktrace();

    // --- environment first: doors/plates, then ride moving platforms before the player moves ---
    const bodyBefore = bodyRect(player.body);
    room.interact.step(dt, {
      grid: room.grid,
      progression: this.progression,
      player: bodyBefore,
      echo: this.echoRect(),
      emit: this.emit,
      onChange: () => this.onSave(this.progression),
    });
    this.carryRider(bodyBefore);
    const prevBottom = player.body.y + player.body.h;

    const abilities = {
      dash: true,
      glitchStrike: this.progression.has('glitch-strike'),
      airJump: this.progression.has('air-jump'),
      signalRegen: this.signalRegen,
    };
    player.step(input, room.grid, dt, abilities, this.emit);
    const plat = room.interact.platformUnder(bodyRect(player.body), prevBottom, player.body.vy);
    if (plat && !player.dead) player.landOnPlatform(plat.y, this.emit);

    this.handleHazards();
    if (!player.dead) {
      this.backtrace.record({ feetX: player.feetX, feetY: player.feetY, facing: player.facing, health: player.health.current });
    }

    // How long the Courier has been (almost) motionless: lets stalkers punish predictability.
    if (Math.abs(player.centerX - this.lastPlayerPos.x) < 0.05 && Math.abs(player.centerY - this.lastPlayerPos.y) < 0.05) this.stillTime += dt;
    else this.stillTime = 0;
    this.lastPlayerPos = { x: player.centerX, y: player.centerY };

    const ctx: EnemyContext = {
      grid: room.grid,
      dt,
      playerX: player.centerX,
      playerY: player.centerY,
      playerAlive: !player.dead,
      spawnProjectile: (spec: ProjectileSpec) => room.projectiles.push(new Projectile(spec)),
      emit: this.emit,
      rng: this.rng,
      backtraceArrival: this.backtraceArrival,
      trail: (secondsAgo) => {
        const smp = this.backtrace.sampleAgo(secondsAgo);
        return smp ? { x: smp.feetX, y: smp.feetY - PLAYER.height / 2 } : null;
      },
      playerStillTime: this.stillTime,
      spawnEnemy: (type, x, y, elite) => {
        if (!isEnemyType(type)) return;
        room.enemies.push(createEnemy({ type, id: `${room.def.id}:add${this.spawnedEnemyCount++}`, x, y, elite: elite ?? false }));
      },
    };
    for (const e of [...room.enemies]) e.update(ctx);
    room.boss?.update(ctx);
    if (room.pboss) {
      room.pboss.update(ctx);
      room.pboss.flushPhaseChange(this.emit);
    }

    // PANOPTIX boss step
    if (room.panoptix && !room.panoptix.defeated) {
      room.panoptix.step(input, room.grid, dt, player.centerX, player.centerY, this.emit, room.projectiles);
    }

    for (const p of room.projectiles) p.update(room.grid, dt, this.emit);

    this.resolvePlayerAttack();
    this.resolveDamageToPlayer();

    // Panoptix laser hit detection
    if (room.panoptix && !room.panoptix.defeated) {
      this.resolvePanoptixLaserDamage();
    }

    this.reapEnemies();
    room.projectiles = room.projectiles.filter((p) => p.alive);

    this.updateTimedGate(dt);
    this.hintLockedDoors();

    if (input.interactPressed) this.handleNpcInteract();

    if (!player.dead) {
      this.handleCheckpoints();
      this.handlePickups();
      this.handleBossTrigger();
      this.handleDoors();
    }
    this.handleBossOutcome(dt);
    this.handlePanoptixOutcome(dt);
    this.handlePatternBossOutcome(dt);

    if (player.dead && this.flow.state === 'playing') {
      this.flow.dispatch('playerDied');
      this.progression.deaths++;
      this.deathTimer = FLOW.deathAnimation;
      room.projectiles = [];
      this.closeDialogue();
    }
  }

  // ------------------------------------------------------------------ moving platforms & the echo

  /** The Courier's afterimage as a body rectangle, or null before Backtrace is unlocked / without history. */
  private echoRect(): Rect | null {
    if (!this.progression.has('backtrace')) return null;
    const e = this.backtrace.echo();
    if (!e) return null;
    return { x: e.feetX - PLAYER.width / 2, y: e.feetY - PLAYER.height, w: PLAYER.width, h: PLAYER.height };
  }

  /** If the Courier stood on a platform that just moved, move them with it. */
  private carryRider(before: Rect): void {
    const player = this.player;
    if (player.dead) return;
    for (const p of this.room.interact.platforms) {
      if (p.dx === 0 && p.dy === 0) continue;
      const oldTop = p.y - p.dy;
      const oldX = p.x - p.dx;
      const overX = before.x + before.w > oldX + 1 && before.x < oldX + p.w - 1;
      const feet = before.y + before.h;
      if (overX && Math.abs(feet - oldTop) <= 2.5 && player.body.vy >= -0.01) {
        const nx = player.body.x + p.dx;
        const ny = player.body.y + p.dy;
        // Do not carry the Courier into a wall or ceiling.
        if (!this.room.grid.rectOverlapsSolid({ x: nx, y: ny, w: player.body.w, h: player.body.h })) player.carry(p.dx, p.dy);
        return;
      }
    }
  }

  // ------------------------------------------------------------------ kills, scrap, enemy bookkeeping

  /** Remove dead enemies, paying out scrap and notifying quests exactly once per kill. */
  private reapEnemies(): void {
    const room = this.room;
    const alive: Enemy[] = [];
    for (const e of room.enemies) {
      if (e.isAlive()) {
        alive.push(e);
        continue;
      }
      const base = SCRAP_DROPS[e.kind] ?? 2;
      const amount = e.elite ? base * ELITE_SCRAP_MULTIPLIER : base;
      this.progression.addScrap(amount);
      this.progression.recordKill(e.kind);
      this.emit({ type: 'scrapGained', amount, x: e.centerX, y: e.centerY, total: this.progression.scrap });
      this.quests.notify('kill', e.kind);
    }
    room.enemies = alive;
  }

  private hintLockedDoors(): void {
    const pr = bodyRect(this.player.body);
    for (const d of this.room.interact.doors) {
      if (d.open || !d.def.lockedHint) continue;
      const near = { x: d.rect.x - 8, y: d.rect.y, w: d.rect.w + 16, h: d.rect.h };
      if (rectsOverlap(pr, near)) {
        if (!this.hintsShown.has(d.def.id)) {
          this.hintsShown.add(d.def.id);
          this.emit({ type: 'doorLocked', id: d.def.id, hint: d.def.lockedHint });
        }
      } else this.hintsShown.delete(d.def.id);
    }
  }

  /** Nearest NPC / terminal in talking range, with its index in `room.npcs`. */
  private nearestNpc(): { npc: NpcEntity; index: number } | null {
    const room = this.room;
    const px = this.player.centerX;
    const py = this.player.centerY;
    let best: { npc: NpcEntity; index: number } | null = null;
    let bestDist = NPC_TUNING.talkRange + 1;
    room.npcs.forEach((npc, index) => {
      const d = Math.hypot(npc.centerX - px, npc.centerY - py);
      if (d < bestDist) {
        bestDist = d;
        best = { npc, index };
      }
    });
    return best;
  }

  private handleNpcInteract(): void {
    if (this.dialogue?.active) {
      this.advanceDialogue();
      return;
    }
    const near = this.nearestNpc();
    if (!near) return;
    this.startDialogue(near.npc, near.index);
  }

  private startDialogue(npc: NpcEntity, index: number): void {
    const def: DialogueDef | undefined = npc.dialogueId ? this.content.dialogues[npc.dialogueId] : undefined;
    if (!def) {
      // Legacy line-cycling NPC (kept for content that has no dialogue graph yet).
      this.room.activeNpcIndex = index;
      this.dialogueNpc = npc;
      this.dialogueView = { speaker: npc.name, text: npc.currentLine, choices: null, last: false };
      this.emit({ type: 'npcTalk', npcId: npc.id, line: npc.currentLine });
      return;
    }
    const runner = new DialogueRunner(def, { progression: this.progression, apply: (e) => this.applyEffect(e) });
    const view = runner.start();
    if (!view) return;
    this.dialogue = runner;
    this.dialogueNpc = npc;
    this.dialogueView = { ...view, speaker: view.speaker || npc.name };
    this.room.activeNpcIndex = index;
    this.quests.notify('talk', npc.npcId);
    this.emit({ type: 'dialogueOpened', npcId: npc.npcId });
    this.emit({ type: 'npcTalk', npcId: npc.id, line: view.text });
  }

  /** Continue the current conversation (interact button / tap on the panel). */
  advanceDialogue(): void {
    if (!this.dialogue) {
      // Legacy NPC: cycle lines, then close.
      const npc = this.dialogueNpc;
      if (!npc) return;
      const line = npc.advance();
      if (npc.currentLine === npc.lines[0] && npc.lines.length > 1) this.closeDialogue();
      else {
        this.dialogueView = { speaker: npc.name, text: npc.currentLine, choices: null, last: false };
        this.emit({ type: 'npcTalk', npcId: npc.id, line });
      }
      return;
    }
    const view = this.dialogue.advance();
    this.afterDialogueStep(view);
  }

  /** Pick a dialogue choice by index. */
  chooseDialogue(index: number): void {
    if (!this.dialogue) return;
    const view = this.dialogue.choose(index);
    this.afterDialogueStep(view);
  }

  private afterDialogueStep(view: DialogueView | null): void {
    if (!view) {
      this.closeDialogue();
      return;
    }
    this.dialogueView = { ...view, speaker: view.speaker || this.dialogueNpc?.name || '' };
    this.emit({ type: 'npcTalk', npcId: this.dialogueNpc?.id ?? '', line: view.text });
  }

  closeDialogue(): void {
    const wasOpen = this.dialogue !== null || this.dialogueNpc !== null;
    this.dialogue?.close();
    this.dialogue = null;
    this.dialogueNpc = null;
    this.dialogueView = null;
    if (this.room) this.room.activeNpcIndex = -1;
    if (wasOpen) {
      this.emit({ type: 'npcDismiss' });
      this.emit({ type: 'dialogueClosed' });
    }
    if (this.pendingVendor) {
      this.emit({ type: 'vendorOpened', vendorId: this.pendingVendor });
      this.pendingVendor = null;
    }
    this.quests.refresh();
  }

  /** Index (in `room.npcs`) of the NPC the interact button would talk to, or -1. */
  promptNpcIndex(): number {
    if (this.dialogueNpc || !this.room || this.flow.state !== 'playing') return -1;
    return this.nearestNpc()?.index ?? -1;
  }

  get inDialogue(): boolean {
    return this.dialogueNpc !== null;
  }

  private resolvePanoptixLaserDamage(): void {
    const room = this.room;
    const panoptix = room.panoptix;
    if (!panoptix) return;
    const player = this.player;
    if (player.dead || player.health.isInvulnerable) return;
    if (panoptix.laserHitsPoint(player.centerX, player.centerY)) {
      player.takeDamage(PANOPTIX.laserDamage, panoptix.centerX, this.emit);
    }
  }

  private handleHazards(): void {
    const player = this.player;
    if (player.dead) return;
    const grid = this.room.grid;
    const body = player.body;
    if (grid.rectOverlapsHazard(insetRect(bodyRect(body), 2))) {
      player.takeDamage(PLAYER.hazardDamage, player.centerX - player.facing, this.emit);
      if (!player.dead) {
        player.placeAt(this.lastSafe.x, this.lastSafe.y);
        player.health.grantInvulnerability(PLAYER.hurt.invulnerability);
        this.emit({ type: 'hazardRespawn', x: this.lastSafe.x, y: this.lastSafe.y });
      }
      return;
    }
    if (body.onGround) {
      const row = grid.rowAt(body.y + body.h + 0.5);
      const supported =
        grid.isStandable(grid.colAt(body.x + 1), row) && grid.isStandable(grid.colAt(body.x + body.w - 1), row);
      if (supported) this.lastSafe = { x: player.feetX, y: player.feetY };
    }
  }

  private resolvePlayerAttack(): void {
    const player = this.player;
    const hb = player.hitbox();
    if (!hb) return;
    const room = this.room;

    const panoptixTargets: Damageable[] = room.panoptix && !room.panoptix.defeated
      ? [room.panoptix as unknown as Damageable]
      : [];

    const targets: Damageable[] = [
      ...room.enemies,
      ...(room.boss && room.boss.isActive ? [room.boss] : []),
      ...(room.pboss && room.pboss.isActive ? [room.pboss] : []),
      ...panoptixTargets,
      ...room.projectiles,
      ...room.walls,
      ...room.switches,
      ...room.nodeTargets,
    ];
    let connected = false;
    let pogoable = false;
    for (const t of targets) {
      if (!t.isAlive() || player.struckThisSwing.has(t.id)) continue;
      if ((t as Enemy).untargetable) continue;
      const hr = t.hurtbox();
      const ok = t.requiresLineOfSight
        ? hitConnects(room.grid, player.centerX, player.centerY, hb, hr)
        : rectsOverlap(hb, hr);
      if (!ok) continue;
      player.struckThisSwing.add(t.id);
      const tc = rectCenter(hr);
      const dirX = player.attackDir === 'side' ? player.facing : (sign(tc.x - player.centerX) || player.facing) * 0.5;
      const dirY = player.attackDir === 'up' ? -1 : player.attackDir === 'down' ? 1 : 0;
      const dmg = player.isGlitchStrike ? GLITCH_STRIKE.damage : COMBAT.attack.damage;
      const { killed } = t.takeHit(dmg, dirX, dirY);
      if ((t as Enemy).blocked) this.emit({ type: 'enemyBlocked', x: tc.x, y: tc.y });
      const hc = rectCenter(hb);
      this.emit({ type: 'hit', x: (hc.x + tc.x) / 2, y: (hc.y + tc.y) / 2, target: t.targetKind, killed });
      if (killed && t.targetKind === 'enemy') {
        this.emit({ type: 'enemyDied', x: tc.x, y: tc.y, kind: (t as Enemy).kind });
      }
      if (killed && t instanceof BreakableWall) this.breakWall(t);
      if (t.targetKind !== 'projectile') {
        connected = true;
        // Gain signal energy on hit
        if (t.targetKind !== 'wall' && t.targetKind !== 'switch') {
          player.gainSignal(10, this.emit);
        }
      }
      pogoable ||= t.pogoable;
    }
    if (connected) player.onSwingConnected(pogoable, this.emit);
  }

  private breakWall(wall: BreakableWall): void {
    for (const t of wall.tiles) this.room.grid.set(t.col, t.row, Tile.Empty);
    this.room.walls = this.room.walls.filter((w) => w !== wall);
    this.progression.brokenWalls.add(wall.id);
    const c = rectCenter(wall.rect);
    this.emit({ type: 'wallBroken', x: c.x, y: c.y });
  }

  /** All active sources of damage to the player this step. */
  damageSources(): DamageSource[] {
    const room = this.room;
    const sources: DamageSource[] = [];
    for (const e of room.enemies) sources.push(...e.damageSources());
    if (room.boss) sources.push(...room.boss.damageSources());
    if (room.pboss) sources.push(...room.pboss.damageSources());
    sources.push(...room.interact.damageSources());
    // Panoptix contact damage
    if (room.panoptix && !room.panoptix.defeated) {
      const pb = room.panoptix.body;
      sources.push({
        rect: { x: pb.x, y: pb.y, w: pb.w, h: pb.h },
        damage: PANOPTIX.contactDamage,
        originX: room.panoptix.centerX,
        originY: room.panoptix.centerY,
        requiresLineOfSight: false,
      });
    }
    for (const p of room.projectiles) {
      if (!p.alive) continue;
      const c = rectCenter(p.rect());
      sources.push({
        rect: p.rect(),
        damage: p.damage,
        originX: c.x,
        originY: c.y,
        requiresLineOfSight: false,
        onHit: () => p.consume(),
      });
    }
    return sources;
  }

  private resolveDamageToPlayer(): void {
    const player = this.player;
    if (player.dead || player.health.isInvulnerable) return;
    const hurtbox = insetRect(bodyRect(player.body), 1);
    for (const s of this.damageSources()) {
      if (!rectsOverlap(hurtbox, s.rect)) continue;
      if (s.requiresLineOfSight && !hitConnects(this.room.grid, s.originX, s.originY, s.rect, hurtbox)) continue;
      if (player.takeDamage(s.damage, s.originX, this.emit)) {
        s.onHit?.();
        break;
      }
    }
  }

  private handleCheckpoints(): void {
    const pr = bodyRect(this.player.body);
    for (const cp of this.room.checkpoints) {
      const touching = rectsOverlap(pr, cp.rect);
      if (touching && !cp.touching) this.activateCheckpoint(cp);
      cp.touching = touching;
    }
  }

  private activateCheckpoint(cp: CheckpointState): void {
    const prev = this.progression.checkpoint;
    const firstTime = !prev || prev.roomId !== this.room.def.id || prev.x !== cp.feetX || prev.y !== cp.feetY;
    this.progression.checkpoint = { roomId: this.room.def.id, x: cp.feetX, y: cp.feetY };
    this.player.health.restoreFull();
    this.emit({ type: 'checkpoint', x: cp.feetX, y: cp.feetY, firstTime });
    this.onSave(this.progression);
  }

  private handlePickups(): void {
    const pr = bodyRect(this.player.body);
    for (const p of this.room.pickups) {
      if (p.taken || !rectsOverlap(pr, p.rect)) continue;
      p.taken = true;
      const c = rectCenter(p.rect);
      if (p.kind === 'backtrace') {
        this.progression.unlock('backtrace');
        this.backtrace.clear();
        this.emit({ type: 'abilityUnlocked', ability: 'backtrace', x: c.x, y: c.y });
      } else if (p.kind === 'glitch-strike') {
        this.progression.unlock('glitch-strike');
        this.emit({ type: 'abilityUnlocked', ability: 'glitch-strike', x: c.x, y: c.y });
      } else if (p.kind === 'scrap' || p.kind === 'upgrade' || p.kind === 'item' || p.kind === 'ability' || p.kind === 'record') {
        this.collectDataPickup(p, c);
      } else if (p.kind === 'fragment') {
        if (!this.progression.fragmentsCollected.has(p.id)) {
          this.progression.fragmentsCollected.add(p.id);
          this.emit({
            type: 'fragmentCollected',
            id: p.id,
            x: c.x,
            y: c.y,
            total: FRAGMENT.totalInSlice,
            collected: this.progression.fragmentCount,
          });
        }
      } else {
        // 'cell'
        this.progression.secrets.add(p.id);
        this.progression.maxHealthBonus++;
        this.player.health.setMax(this.maxHealth, true);
        this.emit({ type: 'secretFound', id: p.id, x: c.x, y: c.y });
      }
      this.onSave(this.progression);
    }
  }

  private collectDataPickup(p: PickupState, c: { x: number; y: number }): void {
    const d = p.def;
    if (!d) return;
    this.progression.collected.add(p.id);
    switch (p.kind) {
      case 'scrap': {
        const amount = d.amount ?? 10;
        this.progression.addScrap(amount);
        this.emit({ type: 'scrapGained', amount, x: c.x, y: c.y, total: this.progression.scrap });
        break;
      }
      case 'upgrade': {
        const id = d.upgrade;
        if (id && this.progression.raiseUpgrade(id) !== null) {
          this.applyUpgrades();
          this.emit({ type: 'upgradeGained', upgrade: id, level: this.progression.upgradeLevel(id) });
        } else {
          // Already maxed: convert to scrap so the find is never wasted.
          this.progression.addScrap(60);
          this.emit({ type: 'scrapGained', amount: 60, x: c.x, y: c.y, total: this.progression.scrap });
        }
        break;
      }
      case 'item':
        if (d.item) this.giveItem(d.item, d.amount ?? 1);
        break;
      case 'ability':
        if (d.ability && this.progression.unlock(d.ability)) {
          if (d.ability === 'backtrace') this.backtrace.clear();
          this.emit({ type: 'abilityUnlocked', ability: d.ability, x: c.x, y: c.y });
        }
        break;
      case 'record':
        this.emit({ type: 'loreFound', id: p.id, title: d.title ?? 'Record', text: d.text ?? '', x: c.x, y: c.y });
        break;
      default:
        break;
    }
    this.quests.notify('collect', p.id);
    this.quests.refresh();
  }

  private handleBossTrigger(): void {
    const room = this.room;

    // BulwarkUnit trigger
    const boss = room.boss;
    if (boss && boss.state === 'dormant' && room.def.bossTriggerCol !== undefined) {
      if (this.player.centerX > room.def.bossTriggerCol * TILE_SIZE) {
        this.setGates(true);
        boss.activate();
        this.emit({ type: 'bossStart', name: boss.displayName });
      }
    }

    // Pattern boss (KILN-7, THE NULL) trigger
    const pb = room.pboss;
    if (pb && pb.stage === 'dormant' && room.def.bossTriggerCol !== undefined) {
      if (this.player.centerX > room.def.bossTriggerCol * TILE_SIZE) {
        this.setGates(true);
        pb.activate();
        this.emit({ type: 'bossStart', name: pb.displayName });
      }
    }

    // PANOPTIX trigger
    const panoptix = room.panoptix;
    if (panoptix && panoptix.state === 'intro' && room.def.bossTriggerCol !== undefined) {
      if (this.player.centerX > room.def.bossTriggerCol * TILE_SIZE) {
        this.setGates(true);
      }
    }
  }

  private setGates(closed: boolean): void {
    const room = this.room;
    for (const g of room.gates) room.grid.set(g.col, g.row, closed ? Tile.Gate : Tile.Empty);
    room.gateClosed = closed;
    this.emit({ type: closed ? 'gateClosed' : 'gateOpened' });
  }

  private handleBossOutcome(dt: number): void {
    const boss = this.room.boss;
    if (boss && !boss.isAlive() && !this.progression.bossDefeated) {
      this.progression.bossDefeated = true;
      this.room.projectiles = [];
      this.setGates(false);
      this.emit({ type: 'bossDefeated', x: boss.centerX, y: boss.centerY });
      this.quests.refresh();
      this.onSave(this.progression);
    }
    this.tickVictory(dt);
  }

  /** The game is won only by defeating the final boss; earlier bosses just open the way. */
  private tickVictory(dt: number): void {
    if (this.victoryTimer > 0 && !this.player.dead) {
      this.victoryTimer -= dt;
      if (this.victoryTimer <= 0) this.flow.dispatch('win');
    }
  }

  private handlePatternBossOutcome(dt: number): void {
    const pb = this.room.pboss;
    if (pb && pb.defeated && !this.progression.defeatedBosses.has(pb.bossId)) {
      this.progression.defeatedBosses.add(pb.bossId);
      this.room.projectiles = [];
      this.room.enemies = [];
      this.setGates(false);
      this.emit({ type: 'bossDefeated', x: pb.centerX, y: pb.centerY });
      this.quests.refresh();
      this.onSave(this.progression);
      if (this.room.pbossFinal) {
        this.emit({ type: 'gameCompleted' });
        this.victoryTimer = 3;
      }
    }
    this.tickVictory(dt);
  }

  private handlePanoptixOutcome(dt: number): void {
    const panoptix = this.room.panoptix;
    if (!panoptix) return;
    if (panoptix.defeated && !this.progression.panoptixDefeated) {
      this.progression.panoptixDefeated = true;
      this.room.projectiles = [];
      this.setGates(false);
      this.emit({ type: 'bossDefeated', x: panoptix.centerX, y: panoptix.centerY });
      this.quests.refresh();
      this.onSave(this.progression);
    }
    this.tickVictory(dt);
  }

  private handleDoors(): void {
    const pr = bodyRect(this.player.body);
    for (const d of this.room.doors) {
      if (rectsOverlap(pr, d.rect)) {
        this.pendingTransition = { ...d.to };
        return;
      }
    }
  }

  // ------------------------------------------------------------------ queries

  hud(): HudSnapshot {
    const room = this.room;
    const boss = room?.boss;
    const panoptix = room?.panoptix;
    const activeNpc = room?.activeNpcIndex >= 0 ? room.npcs[room.activeNpcIndex] : undefined;

    const pbossSnap = room?.pboss && room.pboss.isActive ? room.pboss : null;
    const nearNpc = room && !this.dialogueNpc ? this.nearestNpc() : null;
    const bossSnap = (() => {
      if (pbossSnap) return { name: pbossSnap.displayName, health: pbossSnap.health.current, max: pbossSnap.health.max, phase: pbossSnap.phase };
      if (boss && boss.state !== 'dormant') {
        return { name: boss.displayName, health: boss.health.current, max: boss.health.max, phase: boss.phase };
      }
      if (panoptix && !panoptix.defeated) {
        return { name: PANOPTIX.name, health: panoptix.health.current, max: panoptix.health.max, phase: panoptix.phase };
      }
      return null;
    })();

    return {
      health: this.player.health.current,
      maxHealth: this.player.health.max,
      invulnerable: this.player.health.isInvulnerable,
      hasBacktrace: this.progression.has('backtrace'),
      backtraceCooldown: this.backtrace.cooldownRatio,
      backtraceReady: this.backtrace.ready,
      dashCooldown: this.player.dashCooldownRatio,
      roomName: room?.def.name ?? '',
      boss: bossSnap,
      signalEnergy: this.player.signalEnergy,
      signalMax: 100,
      activeNpcLine: this.dialogueView?.text ?? activeNpc?.currentLine ?? null,
      activeNpcName: this.dialogueView?.speaker ?? activeNpc?.name ?? null,
      dialogue: this.dialogueView,
      interactPrompt: nearNpc ? nearNpc.npc.verb : null,
      scrap: this.progression.scrap,
      tracked: this.quests.trackedObjective(),
      hasAirJump: this.progression.has('air-jump'),
      backtraceWindow: this.backtrace.currentWindow,
      fragmentsCollected: this.progression.fragmentCount,
      fragmentsTotal: FRAGMENT.totalInSlice,
      glitchChargeRatio: this.player.chargeTimer > 0 ? Math.min(1, this.player.chargeTimer / 0.48) : 0,
      hasGlitchStrike: this.progression.has('glitch-strike'),
    };
  }
}

/** Group contiguous breakable tiles (4-way) into walls. */
export function findBreakableGroups(grid: TileGrid): TilePoint[][] {
  const seen = new Set<number>();
  const groups: TilePoint[][] = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const key = row * grid.cols + col;
      if (seen.has(key) || grid.get(col, row) !== Tile.Breakable) continue;
      const group: TilePoint[] = [];
      const stack: TilePoint[] = [{ col, row }];
      seen.add(key);
      while (stack.length) {
        const t = stack.pop() as TilePoint;
        group.push(t);
        for (const [dc, dr] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nc = t.col + dc;
          const nr = t.row + dr;
          const nk = nr * grid.cols + nc;
          if (grid.inBounds(nc, nr) && !seen.has(nk) && grid.get(nc, nr) === Tile.Breakable) {
            seen.add(nk);
            stack.push({ col: nc, row: nr });
          }
        }
      }
      group.sort((a, b) => a.row - b.row || a.col - b.col);
      groups.push(group);
    }
  }
  return groups;
}
