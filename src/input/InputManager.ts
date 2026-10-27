import Phaser from 'phaser';
import { GAMEPAD_BINDINGS, GAMEPAD_STICK_DEADZONE, KEYBOARD_BINDINGS, type Action } from '../config/controls';
import type { HeldInput } from '../core/input';

const ACTIONS = Object.keys(KEYBOARD_BINDINGS) as Action[];

/**
 * Reads keyboard and gamepad through the central bindings in `config/controls.ts`.
 * Call `update()` once per render frame, then query `held()`, `isDown()` or `justPressed()`.
 */
export class InputManager {
  private readonly keys = new Map<Action, Phaser.Input.Keyboard.Key[]>();
  private now = new Map<Action, boolean>();
  private prev = new Map<Action, boolean>();
  /** Last observed keydown timestamp per key, to catch taps shorter than a frame. */
  private readonly seenDown = new Map<Phaser.Input.Keyboard.Key, number>();
  private readonly tapped = new Map<Action, boolean>();

  constructor(private readonly scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    for (const action of ACTIONS) {
      const keys: Phaser.Input.Keyboard.Key[] = [];
      if (kb) {
        for (const name of KEYBOARD_BINDINGS[action]) {
          const code = (Phaser.Input.Keyboard.KeyCodes as Record<string, number>)[name];
          if (code === undefined) continue;
          const key = kb.addKey(code, true, false);
          keys.push(key);
          this.seenDown.set(key, key.timeDown);
        }
      }
      this.keys.set(action, keys);
      this.now.set(action, false);
      this.prev.set(action, false);
    }
  }

  private pad(): Phaser.Input.Gamepad.Gamepad | null {
    const gp = this.scene.input.gamepad;
    if (!gp || gp.total === 0) return null;
    return gp.getPad(0) ?? null;
  }

  private padDown(action: Action, pad: Phaser.Input.Gamepad.Gamepad | null): boolean {
    if (!pad) return false;
    for (const i of GAMEPAD_BINDINGS[action]) if (pad.buttons[i]?.pressed) return true;
    const x = pad.axes[0]?.getValue() ?? 0;
    const y = pad.axes[1]?.getValue() ?? 0;
    switch (action) {
      case 'left':
        return x < -GAMEPAD_STICK_DEADZONE;
      case 'right':
        return x > GAMEPAD_STICK_DEADZONE;
      case 'up':
        return y < -GAMEPAD_STICK_DEADZONE * 1.6;
      case 'down':
        return y > GAMEPAD_STICK_DEADZONE * 1.6;
      default:
        return false;
    }
  }

  update(): void {
    const pad = this.pad();
    // A key pressed and released between two frames still counts as one press:
    // its keydown timestamp changed even though it is no longer down.
    const tappedKeys = new Set<Phaser.Input.Keyboard.Key>();
    for (const [key, seen] of this.seenDown) {
      if (key.timeDown !== seen) {
        tappedKeys.add(key);
        this.seenDown.set(key, key.timeDown);
      }
    }
    const next = new Map<Action, boolean>();
    for (const action of ACTIONS) {
      const keys = this.keys.get(action) ?? [];
      const down = keys.some((k) => k.isDown) || this.padDown(action, pad);
      const tap = keys.some((k) => tappedKeys.has(k));
      this.tapped.set(action, tap);
      next.set(action, down || tap);
    }
    this.prev = this.now;
    this.now = next;
  }

  isDown(action: Action): boolean {
    return this.now.get(action) ?? false;
  }

  justPressed(action: Action): boolean {
    const now = this.now.get(action) ?? false;
    const prev = this.prev.get(action) ?? false;
    return (now && !prev) || (this.tapped.get(action) ?? false);
  }

  held(): HeldInput {
    return {
      left: this.isDown('left'),
      right: this.isDown('right'),
      up: this.isDown('up'),
      down: this.isDown('down'),
      jump: this.isDown('jump'),
      attack: this.isDown('attack'),
      dash: this.isDown('dash'),
    };
  }

  /** Treat everything currently held as already handled (no presses on the next frame). */
  swallow(): void {
    this.update();
    this.prev = new Map(this.now);
    for (const a of ACTIONS) this.tapped.set(a, false);
  }

  destroy(): void {
    const kb = this.scene.input.keyboard;
    if (!kb) return;
    for (const keys of this.keys.values()) for (const k of keys) kb.removeKey(k, false);
  }
}
