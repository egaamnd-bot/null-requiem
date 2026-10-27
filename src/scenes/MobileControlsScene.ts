import Phaser from 'phaser';
import { virtualButtons } from '../input/virtualButtons';
import { PALETTE } from '../render/palette';

export const MOBILE_SCENE = 'mobile-controls';

/** Detects whether the device likely has a touchscreen. */
function hasTouchScreen(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
}

interface Btn {
  zone: Phaser.Geom.Rectangle;
  key: keyof typeof virtualButtons;
  label: string;
  color: number;
  gfx: Phaser.GameObjects.Graphics;
  txt: Phaser.GameObjects.Text;
  held: boolean;
}

interface DPad {
  center: { x: number; y: number };
  radius: number;
  gfx: Phaser.GameObjects.Graphics;
  arrows: Phaser.GameObjects.Graphics;
}

/**
 * Transparent touch-control overlay rendered above everything else.
 * Only activates on devices that report touch support.
 *
 * Layout (landscape phone):
 *   Left 25% : D-pad (left / right / up / down)
 *   Right 20%: action column — Jump (Y), Attack (B), Dash (A), Backtrace (X), Interact (*)
 */
export class MobileControlsScene extends Phaser.Scene {
  private buttons: Btn[] = [];
  private dpad!: DPad;
  private pointers = new Map<number, string[]>(); // pointerId → list of active keys

  constructor() {
    super({ key: MOBILE_SCENE, active: false });
  }

  create(): void {
    if (!hasTouchScreen()) {
      this.scene.stop();
      return;
    }
    this.buildLayout();
    this.input.setPollAlways();
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    // Each frame, reset virtual buttons then re-assert held state.
    this.events.on(Phaser.Scenes.Events.UPDATE, this.syncVirtual, this);
  }

  private buildLayout(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    // --- D-pad ---
    const padX = W * 0.13;
    const padY = H * 0.68;
    const padR = Math.min(W * 0.11, H * 0.18);

    const dGfx = this.add.graphics().setDepth(1000).setScrollFactor(0).setAlpha(0.45);
    const dArrows = this.add.graphics().setDepth(1001).setScrollFactor(0).setAlpha(0.8);
    this.dpad = { center: { x: padX, y: padY }, radius: padR, gfx: dGfx, arrows: dArrows };
    this.drawDpad();

    // --- Action buttons (right side) ---
    const btnR = Math.min(W * 0.055, H * 0.1);
    const btnX0 = W * 0.84;
    const btnY0 = H * 0.45;
    const gap = btnR * 2.5;

    const defs: Array<{ key: keyof typeof virtualButtons; label: string; color: number; col: number; row: number }> = [
      { key: 'jump', label: 'JMP', color: PALETTE.cyan, col: 0, row: 0 },
      { key: 'attack', label: 'ATK', color: PALETTE.magenta, col: 0, row: 1 },
      { key: 'dash', label: 'DSH', color: PALETTE.neonOrange, col: 0, row: 2 },
      { key: 'backtrace', label: 'REW', color: PALETTE.violet, col: 0, row: 3 },
      { key: 'interact', label: 'TLK', color: PALETTE.chrome, col: -1, row: 1 },
    ];

    for (const d of defs) {
      const cx = btnX0 + d.col * gap;
      const cy = btnY0 + d.row * gap;
      const gfx = this.add.graphics().setDepth(1000).setScrollFactor(0).setAlpha(0.5);
      const txt = this.add
        .text(cx, cy, d.label, {
          fontFamily: "'Courier New', monospace",
          fontSize: Math.round(btnR * 0.55) + 'px',
          color: '#' + d.color.toString(16).padStart(6, '0'),
        })
        .setOrigin(0.5)
        .setDepth(1001)
        .setScrollFactor(0)
        .setAlpha(0.9);

      const half = btnR * 0.9;
      const zone = new Phaser.Geom.Rectangle(cx - half, cy - half, half * 2, half * 2);
      const btn: Btn = { zone, key: d.key, label: d.label, color: d.color, gfx, txt, held: false };
      this.buttons.push(btn);
      this.drawButton(btn);
    }
  }

  private drawDpad(): void {
    const { center: c, radius: r, gfx, arrows } = this.dpad;
    gfx.clear();
    gfx.fillStyle(0x1a1a2e, 0.6);
    gfx.fillCircle(c.x, c.y, r);
    gfx.lineStyle(1.5, PALETTE.steel, 0.5);
    gfx.strokeCircle(c.x, c.y, r);

    arrows.clear();
    arrows.fillStyle(PALETTE.chrome, 0.7);
    const a = r * 0.38;
    // Left arrow
    arrows.fillTriangle(c.x - r * 0.6, c.y, c.x - r * 0.28, c.y - a, c.x - r * 0.28, c.y + a);
    // Right arrow
    arrows.fillTriangle(c.x + r * 0.6, c.y, c.x + r * 0.28, c.y - a, c.x + r * 0.28, c.y + a);
    // Up arrow
    arrows.fillTriangle(c.x, c.y - r * 0.6, c.x - a, c.y - r * 0.28, c.x + a, c.y - r * 0.28);
    // Down arrow
    arrows.fillTriangle(c.x, c.y + r * 0.6, c.x - a, c.y + r * 0.28, c.x + a, c.y + r * 0.28);
  }

  private drawButton(btn: Btn): void {
    const { gfx, zone, color, held } = btn;
    gfx.clear();
    const alpha = held ? 0.75 : 0.35;
    gfx.fillStyle(color, alpha);
    gfx.fillRoundedRect(zone.x, zone.y, zone.width, zone.height, 8);
    gfx.lineStyle(1.5, color, held ? 1 : 0.5);
    gfx.strokeRoundedRect(zone.x, zone.y, zone.width, zone.height, 8);
  }

  private dpadKeysAt(x: number, y: number): string[] {
    const { center: c, radius: r } = this.dpad;
    const dx = x - c.x;
    const dy = y - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > r * 1.1) return [];
    const keys: string[] = [];
    const threshold = r * 0.28;
    if (dx < -threshold) keys.push('left');
    if (dx > threshold) keys.push('right');
    if (dy < -threshold) keys.push('up');
    if (dy > threshold) keys.push('down');
    return keys;
  }

  private keysAt(x: number, y: number): string[] {
    const dpadKeys = this.dpadKeysAt(x, y);
    if (dpadKeys.length > 0) return dpadKeys;
    for (const btn of this.buttons) {
      if (Phaser.Geom.Rectangle.Contains(btn.zone, x, y)) return [btn.key];
    }
    return [];
  }

  private onDown(ptr: Phaser.Input.Pointer): void {
    const keys = this.keysAt(ptr.x, ptr.y);
    this.pointers.set(ptr.id, keys);
    this.updateButtons();
  }

  private onMove(ptr: Phaser.Input.Pointer): void {
    if (this.pointers.has(ptr.id)) {
      this.pointers.set(ptr.id, this.keysAt(ptr.x, ptr.y));
      this.updateButtons();
    }
  }

  private onUp(ptr: Phaser.Input.Pointer): void {
    this.pointers.delete(ptr.id);
    this.updateButtons();
  }

  private updateButtons(): void {
    const activeKeys = new Set<string>();
    for (const keys of this.pointers.values()) for (const k of keys) activeKeys.add(k);
    for (const btn of this.buttons) {
      const wasHeld = btn.held;
      btn.held = activeKeys.has(btn.key);
      if (btn.held !== wasHeld) this.drawButton(btn);
    }
  }

  private syncVirtual(): void {
    const activeKeys = new Set<string>();
    for (const keys of this.pointers.values()) for (const k of keys) activeKeys.add(k);
    virtualButtons.left = activeKeys.has('left');
    virtualButtons.right = activeKeys.has('right');
    virtualButtons.up = activeKeys.has('up');
    virtualButtons.down = activeKeys.has('down');
    virtualButtons.jump = activeKeys.has('jump');
    virtualButtons.attack = activeKeys.has('attack');
    virtualButtons.dash = activeKeys.has('dash');
    virtualButtons.backtrace = activeKeys.has('backtrace');
    virtualButtons.interact = activeKeys.has('interact');
  }

  shutdown(): void {
    // Clear virtual buttons so they don't stay stuck
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
}
