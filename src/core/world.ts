import { BACKTRACE, BOSS, COMBAT, FLOW, NPC_TUNING, PANOPTIX, PLAYER, PUZZLE, SIM, TILE_SIZE } from '../config/tuning';
import type { RoomDef, TilePoint, TileRect } from '../world/types';
import { Backtrace } from './backtrace';
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
import { NPC_DEFS, FRAGMENT_LORE } from '../world/dialogues';
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
  kind: 'backtrace' | 'cell' | 'fragment' | 'glitch-strike';
  rect: Rect;
  taken: boolean;
  /** For fragments: lore text to show when collected. */
  lore?: string;
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
  /** Memory fragments collected this run. */
  fragmentsCollected: number;
  fragmentsTotal: number;
  /** 0–1 charge toward Glitch Strike (only shows when ability is unlocked). */
  glitchChargeRatio: number;
  hasGlitchStrike: boolean;
}

export interface WorldOptions {
  rng?: () => number;
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
    this.player = new Player(0, 0, this.maxHealth);
  }

  get maxHealth(): number {
    return PLAYER.maxHealth + this.progression.maxHealthBonus;
  }

  // ------------------------------------------------------------------ lifecycle

  /** Begin play: at the saved checkpoint if there is one, otherwise at the start marker. */
  start(): void {
    if (!this.flow.dispatch('start')) return;
    this.victoryTimer = -1;
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

    // Count N and F markers per room for keying into dialogue defs
    const npcCounters: Record<string, number> = {};
    const fragCounters: Record<string, number> = {};

    const room: RoomState = {
      def,
      grid,
      enemies: [],
      boss: null,
      panoptix: null,
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
        case 'N': {
          // Key: 'roomId:N:index' where index is the Nth N marker in this room
          const nIdx = npcCounters[roomId] ?? 0;
          npcCounters[roomId] = nIdx + 1;
          const dialogueKey = `${roomId}:N:${nIdx}`;
          const dialogueDef = NPC_DEFS[dialogueKey];
          if (dialogueDef) {
            room.npcs.push(new NpcEntity({
              id: dialogueDef.id,
              name: dialogueDef.name,
              lines: dialogueDef.lines,
              feetX: tileCenterX(m.col),
              feetY: tileFeetY(m.row),
              kind: dialogueDef.kind,
            }));
          }
          break;
        }
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

    this.room = room;
    this.roomVersion++;
    this.backtrace.clear();
    this.gateHintShown = false;
    this.player.placeAt(feetX, feetY);
    this.lastSafe = { x: feetX, y: feetY };
    this.emit({ type: 'roomEntered', roomId, name: def.name });
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
    this.emit({ type: 'backtrace', fromX, fromY, toX: p.centerX, toY: p.centerY, restored: p.health.current - before });
    this.backtraceBurst(p.centerX, p.centerY);
    return true;
  }

  /** Damage released where the player arrives. Hits enemies and projectiles in range with line of sight. */
  private backtraceBurst(cx: number, cy: number): void {
    const room = this.room;
    const r = BACKTRACE.burst.radius;
    const bossTargets: Damageable[] = [
      ...(room.boss && room.boss.isActive ? [room.boss] : []),
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
      const { killed } = t.takeHit(BACKTRACE.burst.damage, dx / len, dy / len);
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

    this.progression.playTime += dt;
    this.backtrace.tick(dt);
    if (input.backtracePressed) this.tryBacktrace();

    const abilities = {
      dash: true,
      glitchStrike: this.progression.has('glitch-strike'),
    };
    player.step(input, room.grid, dt, abilities, this.emit);

    this.handleHazards();
    if (!player.dead) {
      this.backtrace.record({ feetX: player.feetX, feetY: player.feetY, facing: player.facing, health: player.health.current });
    }

    const ctx: EnemyContext = {
      grid: room.grid,
      dt,
      playerX: player.centerX,
      playerY: player.centerY,
      playerAlive: !player.dead,
      spawnProjectile: (spec: ProjectileSpec) => room.projectiles.push(new Projectile(spec)),
      emit: this.emit,
      rng: this.rng,
    };
    for (const e of room.enemies) e.update(ctx);
    room.boss?.update(ctx);

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

    room.enemies = room.enemies.filter((e) => e.isAlive());
    room.projectiles = room.projectiles.filter((p) => p.alive);

    this.updateTimedGate(dt);

    // NPC interaction
    if (input.interactPressed) {
      this.handleNpcInteract();
    }

    if (!player.dead) {
      this.handleCheckpoints();
      this.handlePickups();
      this.handleBossTrigger();
      this.handleDoors();
    }
    this.handleBossOutcome(dt);
    this.handlePanoptixOutcome(dt);

    if (player.dead && this.flow.state === 'playing') {
      this.flow.dispatch('playerDied');
      this.progression.deaths++;
      this.deathTimer = FLOW.deathAnimation;
      room.projectiles = [];
      // Dismiss any active dialogue on death
      if (room.activeNpcIndex >= 0) {
        room.activeNpcIndex = -1;
        this.emit({ type: 'npcDismiss' });
      }
    }
  }

  private handleNpcInteract(): void {
    const room = this.room;
    const player = this.player;

    // If already in dialogue, advance or dismiss
    if (room.activeNpcIndex >= 0) {
      const npc = room.npcs[room.activeNpcIndex];
      if (npc) {
        const line = npc.advance();
        // After the last line, dismiss
        if (npc.currentLine === npc.lines[0] && npc.lines.length > 1) {
          room.activeNpcIndex = -1;
          this.emit({ type: 'npcDismiss' });
        } else {
          this.emit({ type: 'npcTalk', npcId: npc.id, line });
        }
      }
      return;
    }

    // Find closest NPC in range
    const px = player.centerX;
    const py = player.centerY;
    const range = NPC_TUNING.talkRange;
    let bestDist = range + 1;
    let bestIdx = -1;
    for (let i = 0; i < room.npcs.length; i++) {
      const npc = room.npcs[i];
      if (!npc) continue;
      const dx = npc.centerX - px;
      const dy = npc.centerY - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      const npc = room.npcs[bestIdx];
      if (npc) {
        room.activeNpcIndex = bestIdx;
        this.emit({ type: 'npcTalk', npcId: npc.id, line: npc.currentLine });
      }
    }
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
      ...panoptixTargets,
      ...room.projectiles,
      ...room.walls,
      ...room.switches,
    ];
    let connected = false;
    let pogoable = false;
    for (const t of targets) {
      if (!t.isAlive() || player.struckThisSwing.has(t.id)) continue;
      const hr = t.hurtbox();
      const ok = t.requiresLineOfSight
        ? hitConnects(room.grid, player.centerX, player.centerY, hb, hr)
        : rectsOverlap(hb, hr);
      if (!ok) continue;
      player.struckThisSwing.add(t.id);
      const tc = rectCenter(hr);
      const dirX = player.attackDir === 'side' ? player.facing : (sign(tc.x - player.centerX) || player.facing) * 0.5;
      const dirY = player.attackDir === 'up' ? -1 : player.attackDir === 'down' ? 1 : 0;
      const { killed } = t.takeHit(COMBAT.attack.damage, dirX, dirY);
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
      this.onSave(this.progression);
      this.victoryTimer = BOSS.bulwarkUnit.victoryDelay;
    }
    if (this.victoryTimer > 0 && !this.player.dead) {
      this.victoryTimer -= dt;
      if (this.victoryTimer <= 0) this.flow.dispatch('win');
    }
  }

  private handlePanoptixOutcome(dt: number): void {
    const panoptix = this.room.panoptix;
    if (!panoptix) return;
    if (panoptix.defeated && !this.progression.panoptixDefeated) {
      this.progression.panoptixDefeated = true;
      this.room.projectiles = [];
      this.setGates(false);
      this.emit({ type: 'bossDefeated', x: panoptix.centerX, y: panoptix.centerY });
      this.onSave(this.progression);
      this.victoryTimer = PANOPTIX.victoryDelay;
    }
    if (this.victoryTimer > 0 && !this.player.dead) {
      this.victoryTimer -= dt;
      if (this.victoryTimer <= 0) this.flow.dispatch('win');
    }
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

    const bossSnap = (() => {
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
      activeNpcLine: activeNpc?.currentLine ?? null,
      activeNpcName: activeNpc?.name ?? null,
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
