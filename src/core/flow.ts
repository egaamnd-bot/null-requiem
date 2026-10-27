/**
 * Top-level game state machine. Only legal transitions succeed; everything else is a no-op
 * returning false, so stray inputs (pausing on the game-over screen, double retries, ...)
 * can never put the game in an invalid state.
 */
export type FlowState = 'title' | 'playing' | 'paused' | 'dying' | 'gameover' | 'victory';

export type FlowAction = 'start' | 'pause' | 'resume' | 'playerDied' | 'deathFinished' | 'retry' | 'win' | 'quit';

const TRANSITIONS: Readonly<Record<FlowState, Partial<Record<FlowAction, FlowState>>>> = {
  title: { start: 'playing' },
  playing: { pause: 'paused', playerDied: 'dying', win: 'victory', quit: 'title' },
  paused: { resume: 'playing', retry: 'playing', quit: 'title' },
  dying: { deathFinished: 'gameover' },
  gameover: { retry: 'playing', quit: 'title' },
  victory: { quit: 'title' },
};

export class GameFlow {
  private current: FlowState;

  constructor(initial: FlowState = 'title') {
    this.current = initial;
  }

  get state(): FlowState {
    return this.current;
  }

  can(action: FlowAction): boolean {
    return TRANSITIONS[this.current][action] !== undefined;
  }

  dispatch(action: FlowAction): boolean {
    const next = TRANSITIONS[this.current][action];
    if (!next) return false;
    this.current = next;
    return true;
  }

  /** True while the simulation should advance. */
  get simulating(): boolean {
    return this.current === 'playing' || this.current === 'dying';
  }
}
