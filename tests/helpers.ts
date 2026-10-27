import { SIM, TILE_SIZE } from '../src/config/tuning';
import type { GameEvent } from '../src/core/events';
import { emptyFrame, type InputFrame } from '../src/core/input';
import { Player, type PlayerAbilities } from '../src/core/player';
import { Progression } from '../src/core/progression';
import { TileGrid } from '../src/core/tiles';
import { GameWorld } from '../src/core/world';
import { ROOMS, START_ROOM } from '../src/world/rooms';
import { createRng } from '../src/core/math';

export const DT = 1 / SIM.stepHz;

export function gridFrom(lines: string[]): TileGrid {
  return TileGrid.fromAscii(lines, TILE_SIZE).grid;
}

export function input(partial: Partial<InputFrame> = {}): InputFrame {
  return { ...emptyFrame(), ...partial };
}

export interface RunResult {
  events: GameEvent[];
}

/** Step a lone player for `steps` fixed steps with a per-step input function. */
export function runPlayer(
  player: Player,
  grid: TileGrid,
  steps: number,
  inputAt: (step: number) => InputFrame,
  abilities: PlayerAbilities = { veilstep: false },
  onStep?: (step: number) => void,
): GameEvent[] {
  const events: GameEvent[] = [];
  for (let i = 0; i < steps; i++) {
    player.step(inputAt(i), grid, DT, abilities, (e) => events.push(e));
    onStep?.(i);
  }
  return events;
}

/** Let a freshly placed player settle onto the ground. */
export function settle(player: Player, grid: TileGrid): void {
  runPlayer(player, grid, 30, () => input());
}

export const tileX = (col: number): number => (col + 0.5) * TILE_SIZE;
export const tileFeet = (row: number): number => (row + 1) * TILE_SIZE;

/** Create a world that spawns at a given room/feet position via a pre-set checkpoint. */
export function worldAt(
  roomId: string,
  col: number,
  row: number,
  configure?: (p: Progression) => void,
  onSave?: (p: Progression) => void,
): GameWorld {
  const progression = new Progression();
  progression.checkpoint = { roomId, x: tileX(col), y: tileFeet(row) };
  configure?.(progression);
  const world = new GameWorld(ROOMS, progression, { startRoom: START_ROOM, rng: createRng(1234), ...(onSave ? { onSave } : {}) });
  world.start();
  return world;
}

export function stepWorld(world: GameWorld, steps: number, inputAt: (step: number) => InputFrame = () => input()): GameEvent[] {
  const events: GameEvent[] = [];
  for (let i = 0; i < steps; i++) {
    world.step(inputAt(i), DT);
    events.push(...world.drainEvents());
  }
  return events;
}
