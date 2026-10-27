import { BOSS, COMBAT, FLOW, PLAYER, TILE_SIZE } from '../config/tuning';
import type { RoomDef, TilePoint, TileRect } from '../world/types';
import { bodyRect } from './body';
import { hitConnects, type Damageable, type DamageSource } from './combat';
import { Ashgrub } from './enemies/ashgrub';
import type { Enemy, EnemyContext } from './enemies/enemy';
import { KilnWarden } from './enemies/kilnWarden';
import { LanternWisp } from './enemies/lanternWisp';
import type { Emit, GameEvent } from './events';
import { GameFlow } from './flow';
import { emptyFrame, type InputFrame } from './input';
import { insetRect, rectCenter, rectsOverlap, sign, type Rect } from './math';
import { Player } from './player';
import { Progression } from './progression';
import { Projectile, type ProjectileSpec } from './projectile';
import { Tile, TileGrid, type TileMarker } from './tiles';

export interface CheckpointState {
  id: string;
  rect: Rect;
  feetX: number;
  feetY: number;
  touching: boolean;
}

export interface PickupState {
  id: string;
  kind: 'veilstep' | 'heartcoal';
  rect: Rect;
  taken: boolean;
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

export interface RoomState {
  def: RoomDef;
  grid: TileGrid;
  enemies: Enemy[];
  boss: KilnWarden | null;
  projectiles: Projectile[];
  checkpoints: CheckpointState[];
  pickups: PickupState[];
  walls: BreakableWall[];
  doors: DoorState[];
  gates: TilePoint[];
  gateClosed: boolean;
}

export interface HudSnapshot {
  health: number;
  maxHealth: number;
  invulnerable: boolean;
  hasVeilstep: boolean;
  dashCooldown: number;
  roomName: string;
  boss: { name: string; health: number; max: number; phase: number } | null;
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

  private readonly defs = new Map<string, RoomDef>();
  private readonly parsed = new Map<string, { grid: TileGrid; markers: TileMarker[] }>();
  private readonly rng: () => number;
  private readonly onSave: (p: Progression) => void;
  private readonly startRoom: string;
  private eventQueue: GameEvent[] = [];
  private deathTimer = 0;
  private victoryTimer = -1;
  private lastSafe = { x: 0, y: 0 };
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
    const room: RoomState = {
      def,
      grid,
      enemies: [],
      boss: null,
      projectiles: [],
      checkpoints: [],
      pickups: [],
      walls: [],
      doors: def.doors.map((d) => ({ id: d.id, rect: tileRectToPx(d.area), to: d.to })),
      gates: [],
      gateClosed: false,
    };

    let wispIndex = 0;
    for (const m of parsed.markers) {
      const id = `${roomId}:${m.char}:${m.col},${m.row}`;
      switch (m.char) {
        case 'C':
          room.enemies.push(new Ashgrub(id, tileCenterX(m.col), tileFeetY(m.row)));
          break;
        case 'W':
          room.enemies.push(new LanternWisp(id, tileCenterX(m.col), (m.row + 0.5) * TILE_SIZE, wispIndex++ * 1.7));
          break;
        case 'X': {
          if (this.progression.bossDefeated) break;
          const arena = def.bossArena ? tileRectToPx(def.bossArena) : { x: 0, y: 0, w: grid.widthPx, h: grid.heightPx };
          room.boss = new KilnWarden(id, tileCenterX(m.col), tileFeetY(m.row), {
            left: arena.x,
            right: arena.x + arena.w,
            ceilingY: arena.y,
            floorY: arena.y + arena.h,
          });
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
            kind: 'veilstep',
            rect: { x: m.col * TILE_SIZE, y: (m.row - 1) * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE * 2 },
            taken: this.progression.has('veilstep'),
          });
          break;
        case 'H':
          room.pickups.push({
            id,
            kind: 'heartcoal',
            rect: { x: m.col * TILE_SIZE + 2, y: m.row * TILE_SIZE + 2, w: TILE_SIZE - 4, h: TILE_SIZE - 4 },
            taken: this.progression.secrets.has(id),
          });
          break;
        case 'D':
          room.gates.push({ col: m.col, row: m.row });
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

    this.room = room;
    this.roomVersion++;
    this.player.placeAt(feetX, feetY);
    this.lastSafe = { x: feetX, y: feetY };
    this.emit({ type: 'roomEntered', roomId, name: def.name });
  }

  // ------------------------------------------------------------------ simulation

  step(input: InputFrame, dt: number): void {
    if (!this.flow.simulating || this.pendingTransition) return;
    const room = this.room;
    const player = this.player;

    if (this.flow.state === 'dying') {
      player.step(emptyFrame(), room.grid, dt, { veilstep: false }, this.emit);
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.flow.dispatch('deathFinished');
      return;
    }

    this.progression.playTime += dt;
    player.step(input, room.grid, dt, { veilstep: this.progression.has('veilstep') }, this.emit);

    this.handleHazards();

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
    for (const p of room.projectiles) p.update(room.grid, dt, this.emit);

    this.resolvePlayerAttack();
    this.resolveDamageToPlayer();

    room.enemies = room.enemies.filter((e) => e.isAlive());
    room.projectiles = room.projectiles.filter((p) => p.alive);

    if (!player.dead) {
      this.handleCheckpoints();
      this.handlePickups();
      this.handleBossTrigger();
      this.handleDoors();
    }
    this.handleBossOutcome(dt);

    if (player.dead && this.flow.state === 'playing') {
      this.flow.dispatch('playerDied');
      this.progression.deaths++;
      this.deathTimer = FLOW.deathAnimation;
      room.projectiles = [];
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
    const targets: Damageable[] = [
      ...room.enemies,
      ...(room.boss && room.boss.isActive ? [room.boss] : []),
      ...room.projectiles,
      ...room.walls,
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
      if (t.targetKind !== 'projectile') connected = true;
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
      if (p.kind === 'veilstep') {
        this.progression.unlock('veilstep');
        this.emit({ type: 'abilityUnlocked', ability: 'veilstep', x: c.x, y: c.y });
      } else {
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
    const boss = room.boss;
    if (!boss || boss.state !== 'dormant' || room.def.bossTriggerCol === undefined) return;
    if (this.player.centerX <= room.def.bossTriggerCol * TILE_SIZE) return;
    this.setGates(true);
    boss.activate();
    this.emit({ type: 'bossStart', name: boss.displayName });
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
      this.victoryTimer = BOSS.kilnWarden.victoryDelay;
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
    const boss = this.room?.boss;
    return {
      health: this.player.health.current,
      maxHealth: this.player.health.max,
      invulnerable: this.player.health.isInvulnerable,
      hasVeilstep: this.progression.has('veilstep'),
      dashCooldown: this.player.dashCooldownRatio,
      roomName: this.room?.def.name ?? '',
      boss:
        boss && boss.state !== 'dormant'
          ? { name: boss.displayName, health: boss.health.current, max: boss.health.max, phase: boss.phase }
          : null,
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
