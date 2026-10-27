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
