import { TILE_SIZE } from '../config/tuning';
import type { DamageSource } from './combat';
import type { Emit } from './events';
import { rectsOverlap, type Rect } from './math';
import type { Progression } from './progression';
import { Tile, type TileGrid } from './tiles';

/**
 * Reusable environmental interaction system. Everything here is data-driven (see `InteractableDef`) and
 * deliberately independent of the player's own timeline: **the world never rewinds with Backtrace.**
 * Doors, platforms and hazards keep running while the Courier jumps back in time, which is what makes them
 * useful for Backtrace puzzles. The only thing that reads the Courier's past is the Echo Plate, which can be
 * pressed by the Courier's afterimage (the position they held `window` seconds ago).
 */

export type Signal = string;

export interface PlateDef {
  type: 'plate';
  id: string;
  col: number;
  row: number;
  cols?: number;
  /** Who can press it. `echo` plates respond only to the Courier's afterimage (temporal plates). */
  pressedBy?: 'courier' | 'echo' | 'either';
  /** Stays down this long after being released (seconds). */
  hold?: number;
}

export interface DoorDef {
  type: 'door';
  id: string;
  col: number;
  row: number;
  cols: number;
  rows: number;
  /** Signals that open it (plate ids, `flag:x`, `boss:x`, `item:x`, `node:x`). */
  opensWhen: Signal[];
  mode?: 'all' | 'any';
  /** Stay open for good once opened (persisted). */
  latch?: boolean;
  /** Close again this long after the signals stop (seconds); default closes immediately. */
  closeDelay?: number;
  /** Shown to the player on a locked bump. */
  lockedHint?: string;
}

export interface PlatformDef {
  type: 'platform';
  id: string;
  col: number;
  row: number;
  cols: number;
  /** Waypoints (tile coordinates of the platform's top-left), starting with the start position. */
  path: { col: number; row: number }[];
  /** Pixels per second. */
  speed: number;
  /** pingpong: runs forever. toggle: goes to the far end while `trigger` is active, returns when not. */
  mode: 'pingpong' | 'toggle';
  trigger?: Signal;
  /** Dwell time at each end (seconds). */
  wait?: number;
}

export interface NodeDef {
  type: 'node';
  id: string;
  col: number;
  row: number;
  /** Strikes needed to power it. */
  hits?: number;
}

export interface EmitterDef {
  type: 'emitter';
  id: string;
  col: number;
  row: number;
  dir: 'up' | 'down' | 'left' | 'right';
  /** Beam length in tiles (it stops early at solid tiles). */
  length: number;
  /** Seconds between starts of a cycle. */
  period: number;
  telegraph: number;
  active: number;
  offset?: number;
  damage?: number;
  style: 'laser' | 'steam';
  /** Disabled while this signal is active (e.g. a power node). */
  disabledBy?: Signal;
}

export type InteractableDef = PlateDef | DoorDef | PlatformDef | NodeDef | EmitterDef;

// ---------------------------------------------------------------------------------------------- runtime

export interface PlateState {
  def: PlateDef;
  rect: Rect;
  pressed: boolean;
  heldFor: number;
}

export interface DoorState {
  def: DoorDef;
  rect: Rect;
  open: boolean;
  /** Time the open condition has been unmet. */
  unmetFor: number;
  latched: boolean;
}

export interface PlatformState {
  def: PlatformDef;
  /** Top-left in pixels. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Displacement during the most recent step (carried riders move by this). */
  dx: number;
  dy: number;
  target: number;
  waiting: number;
  dir: 1 | -1;
}

export interface NodeState {
  def: NodeDef;
  rect: Rect;
  hitsLeft: number;
  powered: boolean;
}

export interface EmitterState {
  def: EmitterDef;
  clock: number;
  phase: 'off' | 'telegraph' | 'active';
  /** Current beam rectangle in pixels (after clipping on solid tiles). */
  beam: Rect;
}

const PLATE_H = 5;
export const PLATFORM_H = 8;

const px = (n: number): number => n * TILE_SIZE;

export interface InteractContext {
  grid: TileGrid;
  progression: Progression;
  player: Rect;
  /** The Courier's afterimage rectangle, or null when Backtrace is not unlocked / has no history. */
  echo: Rect | null;
  emit: Emit;
  onChange: () => void;
}

export class InteractableSystem {
  readonly plates: PlateState[] = [];
  readonly doors: DoorState[] = [];
  readonly platforms: PlatformState[] = [];
  readonly nodes: NodeState[] = [];
  readonly emitters: EmitterState[] = [];
  private readonly pressedIds = new Set<string>();

  constructor(
    defs: readonly InteractableDef[],
    private readonly grid: TileGrid,
    private readonly progression: Progression,
  ) {
    for (const d of defs) {
      switch (d.type) {
        case 'plate':
          this.plates.push({
            def: d,
            rect: { x: px(d.col), y: px(d.row + 1) - PLATE_H, w: px(d.cols ?? 1), h: PLATE_H },
            pressed: false,
            heldFor: 0,
          });
          break;
        case 'door': {
          const latched = progression.interactState[d.id] === 'open';
          const s: DoorState = { def: d, rect: { x: px(d.col), y: px(d.row), w: px(d.cols), h: px(d.rows) }, open: latched, unmetFor: 0, latched };
          this.doors.push(s);
          this.applyDoor(s);
          break;
        }
        case 'platform': {
          const start = d.path[0];
          if (!start || d.path.length < 2) throw new Error(`Platform ${d.id} needs at least two waypoints`);
          this.platforms.push({ def: d, x: px(start.col), y: px(start.row), w: px(d.cols), h: PLATFORM_H, dx: 0, dy: 0, target: 1, waiting: 0, dir: 1 });
          break;
        }
        case 'node': {
          const powered = progression.interactState[d.id] === 'on';
          this.nodes.push({ def: d, rect: { x: px(d.col), y: px(d.row), w: TILE_SIZE, h: TILE_SIZE }, hitsLeft: powered ? 0 : (d.hits ?? 2), powered });
          break;
        }
        case 'emitter':
          this.emitters.push({ def: d, clock: d.offset ?? 0, phase: 'off', beam: { x: 0, y: 0, w: 0, h: 0 } });
          this.updateEmitterBeam(this.emitters[this.emitters.length - 1] as EmitterState, grid);
          break;
      }
    }
  }

  /** Is a named signal currently on? */
  isActive(signal: Signal): boolean {
    if (signal.startsWith('flag:')) return this.progression.hasFlag(signal.slice(5));
    if (signal.startsWith('boss:')) return this.progression.defeatedBosses.has(signal.slice(5));
    if (signal.startsWith('item:')) return this.progression.itemCount(signal.slice(5)) > 0;
    if (signal.startsWith('node:')) return this.nodes.some((n) => n.def.id === signal.slice(5) && n.powered);
    return this.pressedIds.has(signal);
  }

  private doorWantsOpen(d: DoorState): boolean {
    const sigs = d.def.opensWhen;
    if (sigs.length === 0) return false;
    return (d.def.mode ?? 'all') === 'any' ? sigs.some((s) => this.isActive(s)) : sigs.every((s) => this.isActive(s));
  }

  private applyDoor(d: DoorState): void {
    const t = d.open ? Tile.Empty : Tile.Gate;
    const c0 = Math.round(d.rect.x / TILE_SIZE);
    const r0 = Math.round(d.rect.y / TILE_SIZE);
    for (let r = 0; r < d.def.rows; r++) for (let c = 0; c < d.def.cols; c++) this.grid.set(c0 + c, r0 + r, t);
  }

  /** Strike a power node (called when a player attack overlaps it). Returns true if it just powered. */
  hitNode(id: string): boolean {
    const n = this.nodes.find((x) => x.def.id === id);
    if (!n || n.powered) return false;
    n.hitsLeft--;
    if (n.hitsLeft > 0) return false;
    n.powered = true;
    this.progression.interactState[id] = 'on';
    return true;
  }

  step(dt: number, ctx: InteractContext): void {
    this.updatePlates(dt, ctx);
    this.updateDoors(dt, ctx);
    this.updatePlatforms(dt);
    this.updateEmitters(dt);
  }

  private updatePlates(dt: number, ctx: InteractContext): void {
    for (const p of this.plates) {
      const by = p.def.pressedBy ?? 'either';
      const courier = (by === 'courier' || by === 'either') && rectsOverlap(this.footRect(ctx.player), p.rect);
      const echo = (by === 'echo' || by === 'either') && ctx.echo !== null && rectsOverlap(this.footRect(ctx.echo), p.rect);
      const down = courier || echo;
      const was = p.pressed;
      if (down) p.heldFor = p.def.hold ?? 0;
      else p.heldFor = Math.max(0, p.heldFor - dt);
      p.pressed = down || p.heldFor > 0;
      if (p.pressed) this.pressedIds.add(p.def.id);
      else this.pressedIds.delete(p.def.id);
      if (p.pressed !== was) ctx.emit({ type: 'plateChanged', id: p.def.id, pressed: p.pressed, x: p.rect.x + p.rect.w / 2, y: p.rect.y });
    }
  }

  /** The lower part of a body: what actually stands on a plate. */
  private footRect(r: Rect): Rect {
    return { x: r.x, y: r.y + r.h - 6, w: r.w, h: 8 };
  }

  private updateDoors(dt: number, ctx: InteractContext): void {
    for (const d of this.doors) {
      if (d.latched) continue;
      const want = this.doorWantsOpen(d);
      if (want) {
        d.unmetFor = 0;
        if (!d.open) this.setDoor(d, true, ctx);
      } else if (d.open) {
        d.unmetFor += dt;
        // Never close on top of the Courier.
        if (d.unmetFor >= (d.def.closeDelay ?? 0) && !rectsOverlap(ctx.player, d.rect)) this.setDoor(d, false, ctx);
      }
      if (d.open && d.def.latch) {
        d.latched = true;
        this.progression.interactState[d.def.id] = 'open';
        ctx.onChange();
      }
    }
  }

  private setDoor(d: DoorState, open: boolean, ctx: InteractContext): void {
    d.open = open;
    this.applyDoor(d);
    ctx.emit({ type: 'doorChanged', id: d.def.id, open, x: d.rect.x + d.rect.w / 2, y: d.rect.y + d.rect.h / 2 });
  }

  private updatePlatforms(dt: number): void {
    for (const p of this.platforms) {
      const path = p.def.path;
      const prevX = p.x;
      const prevY = p.y;
      if (p.def.mode === 'toggle') {
        const on = p.def.trigger ? this.isActive(p.def.trigger) : false;
        p.target = on ? path.length - 1 : 0;
      }
      if (p.waiting > 0) {
        p.waiting -= dt;
      } else {
        const tgt = path[p.target] as { col: number; row: number };
        const tx = px(tgt.col);
        const ty = px(tgt.row);
        const dx = tx - p.x;
        const dy = ty - p.y;
        const dist = Math.hypot(dx, dy);
        const move = p.def.speed * dt;
        if (dist <= move) {
          p.x = tx;
          p.y = ty;
          if (p.def.mode === 'pingpong') {
            if (p.target >= path.length - 1) p.dir = -1;
            else if (p.target <= 0) p.dir = 1;
            p.target += p.dir;
            p.waiting = p.def.wait ?? 0.6;
          }
        } else {
          p.x += (dx / dist) * move;
          p.y += (dy / dist) * move;
        }
      }
      p.dx = p.x - prevX;
      p.dy = p.y - prevY;
    }
  }

  private updateEmitters(dt: number): void {
    for (const e of this.emitters) {
      const d = e.def;
      if (d.disabledBy && this.isActive(d.disabledBy)) {
        e.phase = 'off';
        continue;
      }
      e.clock = (e.clock + dt) % d.period;
      const prev = e.phase;
      const cycleStart = d.period - d.telegraph - d.active;
      if (e.clock >= cycleStart + d.telegraph) e.phase = 'active';
      else if (e.clock >= cycleStart) e.phase = 'telegraph';
      else e.phase = 'off';
      if (prev !== e.phase || e.phase !== 'off') this.updateEmitterBeam(e, this.grid);
    }
  }

  private updateEmitterBeam(e: EmitterState, grid: TileGrid): void {
    const d = e.def;
    const ox = px(d.col);
    const oy = px(d.row);
    const dxs = d.dir === 'left' ? -1 : d.dir === 'right' ? 1 : 0;
    const dys = d.dir === 'up' ? -1 : d.dir === 'down' ? 1 : 0;
    let len = 0;
    for (let i = 1; i <= d.length; i++) {
      if (grid.isSolid(d.col + dxs * i, d.row + dys * i)) break;
      len = i;
    }
    const L = len * TILE_SIZE;
    if (dxs !== 0) e.beam = { x: dxs > 0 ? ox + TILE_SIZE : ox - L, y: oy + 3, w: L, h: TILE_SIZE - 6 };
    else e.beam = { x: ox + 3, y: dys > 0 ? oy + TILE_SIZE : oy - L, w: TILE_SIZE - 6, h: L };
  }

  /** Active hazard beams as damage sources against the Courier. */
  damageSources(): DamageSource[] {
    const out: DamageSource[] = [];
    for (const e of this.emitters) {
      if (e.phase !== 'active' || e.beam.w <= 0 || e.beam.h <= 0) continue;
      out.push({
        rect: e.beam,
        damage: e.def.damage ?? 1,
        originX: e.beam.x + e.beam.w / 2,
        originY: e.beam.y + e.beam.h / 2,
        requiresLineOfSight: false,
      });
    }
    return out;
  }

  /** The platform (if any) a body with these bounds is standing on, given where its feet were `prevBottom`. */
  platformUnder(body: Rect, prevBottom: number, vy: number): PlatformState | null {
    if (vy < 0) return null;
    const bottom = body.y + body.h;
    for (const p of this.platforms) {
      const overlapX = body.x + body.w > p.x + 1 && body.x < p.x + p.w - 1;
      if (!overlapX) continue;
      // Feet were at/above the platform top last step and are at/below it now.
      if (prevBottom <= p.y + 2 && bottom >= p.y - 0.01 && bottom <= p.y + p.h + 6) return p;
    }
    return null;
  }

  /** Persisted open-state map for doors, for debugging/tests. */
  openDoorIds(): string[] {
    return this.doors.filter((d) => d.open).map((d) => d.def.id);
  }
}
