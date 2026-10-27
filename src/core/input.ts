/**
 * Engine-agnostic input model. The Phaser input layer produces `HeldInput` every render frame;
 * `InputLatch` turns that into per-simulation-step `InputFrame`s so that a button press is
 * seen exactly once, no matter how many (or how few) fixed steps run in a render frame.
 */

export interface HeldInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  attack: boolean;
  dash: boolean;
  backtrace: boolean;
}

export interface InputFrame {
  /** -1 left, 0 none, 1 right */
  moveX: -1 | 0 | 1;
  /** -1 up, 0 none, 1 down */
  moveY: -1 | 0 | 1;
  jumpHeld: boolean;
  jumpPressed: boolean;
  attackHeld: boolean;
  attackPressed: boolean;
  dashPressed: boolean;
  backtracePressed: boolean;
  interactPressed: boolean;
}

export const NO_INPUT: Readonly<HeldInput> = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  attack: false,
  dash: false,
  backtrace: false,
};

export function emptyFrame(): InputFrame {
  return { moveX: 0, moveY: 0, jumpHeld: false, jumpPressed: false, attackHeld: false, attackPressed: false, dashPressed: false, backtracePressed: false, interactPressed: false };
}

function axis(neg: boolean, pos: boolean): -1 | 0 | 1 {
  if (neg === pos) return 0;
  return neg ? -1 : 1;
}

export class InputLatch {
  private prev: HeldInput = { ...NO_INPUT };
  private current: HeldInput = { ...NO_INPUT };
  private jumpPressed = false;
  private attackPressed = false;
  private dashPressed = false;
  private backtracePressed = false;
  private interactPressed = false;

  /** Call once per render frame with the currently held buttons. */
  sample(held: HeldInput): void {
    if (held.jump && !this.prev.jump) this.jumpPressed = true;
    if (held.attack && !this.prev.attack) this.attackPressed = true;
    if (held.dash && !this.prev.dash) this.dashPressed = true;
    if (held.backtrace && !this.prev.backtrace) this.backtracePressed = true;
    this.prev = { ...held };
    this.current = { ...held };
  }

  /** Signal a virtual interact press from the touch overlay. */
  pressInteract(): void {
    this.interactPressed = true;
  }

  /** Produce the frame for one simulation step and consume any pending presses. */
  consume(): InputFrame {
    const frame: InputFrame = {
      moveX: axis(this.current.left, this.current.right),
      moveY: axis(this.current.up, this.current.down),
      jumpHeld: this.current.jump,
      jumpPressed: this.jumpPressed,
      attackHeld: this.current.attack,
      attackPressed: this.attackPressed,
      dashPressed: this.dashPressed,
      backtracePressed: this.backtracePressed,
      interactPressed: this.interactPressed,
    };
    this.clearPresses();
    return frame;
  }

  /** Drop pending presses (e.g. after unpausing) so menu input doesn't leak into gameplay. */
  clearPresses(): void {
    this.jumpPressed = false;
    this.attackPressed = false;
    this.dashPressed = false;
    this.backtracePressed = false;
    this.interactPressed = false;
  }

  /**
   * Forget held state too. Buttons still physically held will not register as new presses
   * until released, which prevents a menu "confirm" from immediately triggering a jump.
   */
  reset(held: HeldInput = NO_INPUT): void {
    this.prev = { ...held };
    this.current = { ...held };
    this.clearPresses();
  }
}
