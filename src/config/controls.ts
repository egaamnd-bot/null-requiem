/**
 * Centralised control bindings. Remap here; the input layer reads only this file.
 *
 * Keyboard bindings use Phaser KeyCodes names (e.g. 'SPACE', 'LEFT', 'Z').
 * Gamepad bindings use the W3C "standard" gamepad button indices.
 */

export type Action =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'jump'
  | 'attack'
  | 'dash'
  | 'pause'
  | 'confirm'
  | 'back'
  | 'mute';

export const KEYBOARD_BINDINGS: Readonly<Record<Action, readonly string[]>> = {
  left: ['A', 'LEFT'],
  right: ['D', 'RIGHT'],
  up: ['W', 'UP'],
  down: ['S', 'DOWN'],
  jump: ['SPACE', 'Z'],
  attack: ['J', 'X'],
  dash: ['K', 'C', 'SHIFT'],
  pause: ['ESC', 'P'],
  confirm: ['ENTER', 'SPACE', 'Z'],
  back: ['ESC', 'BACKSPACE'],
  mute: ['M'],
};

/** Standard mapping: 0=A/Cross, 1=B/Circle, 2=X/Square, 3=Y/Triangle, 4/5=bumpers, 9=Start, 12-15=D-pad. */
export const GAMEPAD_BINDINGS: Readonly<Record<Action, readonly number[]>> = {
  left: [14],
  right: [15],
  up: [12],
  down: [13],
  jump: [0],
  attack: [2],
  dash: [1, 5, 7],
  pause: [9],
  confirm: [0, 9],
  back: [1, 8],
  mute: [],
};

/** Analog stick values below this magnitude are ignored. */
export const GAMEPAD_STICK_DEADZONE = 0.35;
