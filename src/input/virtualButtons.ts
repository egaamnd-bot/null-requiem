import type { HeldInput } from '../core/input';

/**
 * Shared mutable virtual button state.
 * MobileControlsScene writes here; InputManager ORs it into the real keyboard/gamepad state.
 * This is intentionally a plain mutable object — single frame, single player, no need for events.
 */
export interface VirtualState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  attack: boolean;
  dash: boolean;
  backtrace: boolean;
  interact: boolean;
}

export const virtualButtons: VirtualState = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  attack: false,
  dash: false,
  backtrace: false,
  interact: false,
};

/** Release every virtual button (focus loss, scene shutdown, menus opening). */
export function clearVirtualButtons(): void {
  virtualButtons.left = false;
  virtualButtons.right = false;
  virtualButtons.up = false;
  virtualButtons.down = false;
  virtualButtons.jump = false;
  virtualButtons.attack = false;
  virtualButtons.dash = false;
  virtualButtons.backtrace = false;
  virtualButtons.interact = false;
}

/** Combine physical (keyboard/gamepad) held state with the on-screen virtual buttons. */
export function mergeHeld(physical: HeldInput, virtual: VirtualState): HeldInput {
  return {
    left: physical.left || virtual.left,
    right: physical.right || virtual.right,
    up: physical.up || virtual.up,
    down: physical.down || virtual.down,
    jump: physical.jump || virtual.jump,
    attack: physical.attack || virtual.attack,
    dash: physical.dash || virtual.dash,
    backtrace: physical.backtrace || virtual.backtrace,
  };
}
