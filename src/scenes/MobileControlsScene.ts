import Phaser from 'phaser';
import { TouchTracker } from '../input/TouchTracker';
import { createTouchLayout, isOnPause, type ActionButton, type HoldKey, type TouchLayout } from '../input/touchLayout';
import { clearVirtualButtons, virtualButtons } from '../input/virtualButtons';
import { css, PALETTE, UI_MONO } from '../render/palette';

export const MOBILE_SCENE = 'mobile-controls';

/** Data handed over by GameScene each time the overlay is launched. */
export interface MobileControlsData {
  /** True while the touch controls should be live (gameplay, not menus). */
  isActive: () => boolean;
  /** Called when the on-screen pause button is tapped. */
  onPause: () => void;
}

/** Detects whether the device likely has a touchscreen. */
export function hasTouchScreen(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  return navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
}

const BUTTON_COLORS: Record<ActionButton['key'], number> = {
  jump: PALETTE.cyan,
  attack: PALETTE.magenta,
  dash: PALETTE.neonOrange,
  backtrace: PALETTE.violet,
  interact: PALETTE.chrome,
  left: PALETTE.chrome,
  right: PALETTE.chrome,
  up: PALETTE.chrome,
  down: PALETTE.chrome,
};

interface BtnView {
  def: ActionButton;
  gfx: Phaser.GameObjects.Graphics;
  held: boolean;
}

/**
 * Touch-control overlay rendered above everything else.
 *
 * - Active only while `data.isActive()` is true (gameplay); hidden and fully released otherwise, so it
 *   never fights the pause / game-over menus for taps.
 * - Multi-touch: every finger is tracked by pointer id (`input.activePointers` is raised in main.ts).
 * - Never leaves a button stuck: releases on pointer up/cancel/outside, on a pointer that is no longer
 *   down (checked every frame), on focus loss, on hide, and on shutdown.
 */
export class MobileControlsScene extends Phaser.Scene {
  private data0!: MobileControlsData;
  private layout!: TouchLayout;
  private tracker!: TouchTracker;
  private buttons: BtnView[] = [];
  private dpadGfx: Phaser.GameObjects.Graphics | null = null;
  private pauseGfx: Phaser.GameObjects.Graphics | null = null;
  private all: Phaser.GameObjects.GameObject[] = [];
  private padHeld = new Set<HoldKey>();
  private shown = true;

  constructor() {
    super({ key: MOBILE_SCENE, active: false });
  }

  init(data: MobileControlsData): void {
    this.data0 = data ?? { isActive: () => true, onPause: () => undefined };
    this.buttons = [];
    this.all = [];
    this.dpadGfx = null;
    this.pauseGfx = null;
    this.padHeld = new Set();
    this.shown = true;
  }

  create(): void {
    if (!hasTouchScreen()) {
      this.scene.stop();
      return;
    }
    this.layout = createTouchLayout(this.scale.width, this.scale.height);
    this.tracker = new TouchTracker(this.layout);
    this.buildViews();

    this.input.setPollAlways();
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    this.input.on(Phaser.Input.Events.GAME_OUT, this.releaseAll, this);

    const release = () => this.releaseAll();
    this.game.events.on(Phaser.Core.Events.BLUR, release);
    this.game.events.on(Phaser.Core.Events.HIDDEN, release);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, release);
      this.game.events.off(Phaser.Core.Events.HIDDEN, release);
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
      this.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
      this.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
      this.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
      this.input.off(Phaser.Input.Events.GAME_OUT, this.releaseAll, this);
      this.tracker.releaseAll();
      clearVirtualButtons();
    });
  }

  // ------------------------------------------------------------------ views

  private buildViews(): void {
    const l = this.layout;
    const dpad = this.add.graphics().setDepth(1000).setScrollFactor(0).setVisible(false);
    this.dpadGfx = dpad;
    this.all.push(dpad);
    this.drawDpad();

    for (const def of l.buttons) {
      const gfx = this.add.graphics().setDepth(1000).setScrollFactor(0);
      const txt = this.add
        .text(def.x, def.y, def.label, {
          fontFamily: UI_MONO,
          fontSize: Math.max(7, Math.round(def.r * 0.5)) + 'px',
          color: css(BUTTON_COLORS[def.key]),
          resolution: 2,
        })
        .setOrigin(0.5)
        .setDepth(1001)
        .setScrollFactor(0)
        .setAlpha(0.9);
      this.all.push(gfx, txt);
      const view: BtnView = { def, gfx, held: false };
      this.buttons.push(view);
      this.drawButton(view);
    }

    const pg = this.add.graphics().setDepth(1000).setScrollFactor(0);
    this.pauseGfx = pg;
    this.all.push(pg);
    this.drawPause(false);
  }

  private drawDpad(): void {
    const g = this.dpadGfx;
    if (!g || !this.tracker) return;
    const visual = this.tracker.joystickVisual();
    g.clear();
    if (!visual) {
      g.setVisible(false);
      return;
    }
    g.setVisible(true);
    const { origin, knob, radius: r } = visual;
    // The pad appears exactly where the thumb first lands, then its knob follows the finger.
    g.fillStyle(0x170f2c, 0.42);
    g.fillCircle(origin.x, origin.y, r * 1.22);
    g.lineStyle(2, PALETTE.cyan, 0.72);
    g.strokeCircle(origin.x, origin.y, r * 1.22);
    g.fillStyle(PALETTE.violet, 0.24);
    g.fillCircle(origin.x, origin.y, r * 0.68);
    g.lineStyle(1.5, PALETTE.chrome, 0.72);
    g.strokeCircle(knob.x, knob.y, r * 0.43);
    g.fillStyle(PALETTE.cyan, 0.42);
    g.fillCircle(knob.x, knob.y, r * 0.36);
    const a = r * 0.16;
    const lit = (k: HoldKey) => (this.padHeld.has(k) ? 1 : 0.55);
    if (this.padHeld.has('left')) { g.fillStyle(PALETTE.chrome, lit('left')); g.fillTriangle(knob.x-r*0.18,knob.y,knob.x+r*0.02,knob.y-a,knob.x+r*0.02,knob.y+a); }
    if (this.padHeld.has('right')) { g.fillStyle(PALETTE.chrome, lit('right')); g.fillTriangle(knob.x+r*0.18,knob.y,knob.x-r*0.02,knob.y-a,knob.x-r*0.02,knob.y+a); }
    if (this.padHeld.has('up')) { g.fillStyle(PALETTE.chrome, lit('up')); g.fillTriangle(knob.x,knob.y-r*0.18,knob.x-a,knob.y+r*0.02,knob.x+a,knob.y+r*0.02); }
    if (this.padHeld.has('down')) { g.fillStyle(PALETTE.chrome, lit('down')); g.fillTriangle(knob.x,knob.y+r*0.18,knob.x-a,knob.y-r*0.02,knob.x+a,knob.y-r*0.02); }
  }

  private drawButton(v: BtnView): void {
    const { def, gfx, held } = v;
    const color = BUTTON_COLORS[def.key];
    gfx.clear();
    gfx.fillStyle(color, held ? 0.7 : 0.28);
    gfx.fillCircle(def.x, def.y, def.r);
    gfx.lineStyle(1.5, color, held ? 1 : 0.6);
    gfx.strokeCircle(def.x, def.y, def.r);
  }

  private drawPause(pressed: boolean): void {
    const g = this.pauseGfx;
    if (!g) return;
    const p = this.layout.pause;
    g.clear();
    g.fillStyle(0x1a1a2e, pressed ? 0.85 : 0.5);
    g.fillCircle(p.x, p.y, p.r);
    g.lineStyle(1.5, PALETTE.chrome, pressed ? 1 : 0.6);
    g.strokeCircle(p.x, p.y, p.r);
    g.fillStyle(PALETTE.chrome, 0.9);
    const bw = p.r * 0.26;
    const bh = p.r * 0.8;
    g.fillRect(p.x - bw * 1.6, p.y - bh / 2, bw, bh);
    g.fillRect(p.x + bw * 0.6, p.y - bh / 2, bw, bh);
  }

  // ------------------------------------------------------------------ pointer handling

  private live(): boolean {
    return this.data0.isActive();
  }

  private onDown(ptr: Phaser.Input.Pointer): void {
    if (!this.live()) return;
    if (isOnPause(this.layout, ptr.x, ptr.y)) {
      this.drawPause(true);
      this.time.delayedCall(140, () => this.drawPause(false));
      this.releaseAll();
      this.data0.onPause();
      return;
    }
    this.tracker.down(ptr.id, ptr.x, ptr.y);
    this.render();
  }

  private onMove(ptr: Phaser.Input.Pointer): void {
    if (!this.live() || !this.tracker.has(ptr.id)) return;
    this.tracker.move(ptr.id, ptr.x, ptr.y);
    this.render();
  }

  private onUp(ptr: Phaser.Input.Pointer): void {
    this.tracker.up(ptr.id);
    this.render();
  }

  private releaseAll(): void {
    if (!this.tracker) return;
    this.tracker.releaseAll();
    this.render();
  }

  /** Push the tracker state to the shared virtual-button object and redraw whatever changed. */
  private render(): void {
    const held = this.tracker.held();
    virtualButtons.left = held.has('left');
    virtualButtons.right = held.has('right');
    virtualButtons.up = held.has('up');
    virtualButtons.down = held.has('down');
    virtualButtons.jump = held.has('jump');
    virtualButtons.attack = held.has('attack');
    virtualButtons.dash = held.has('dash');
    virtualButtons.backtrace = held.has('backtrace');
    virtualButtons.interact = held.has('interact');

    for (const v of this.buttons) {
      const now = held.has(v.def.key);
      if (now !== v.held) {
        v.held = now;
        this.drawButton(v);
      }
    }
    const padChanged = ['left', 'right', 'up', 'down'].some((k) => held.has(k as HoldKey) !== this.padHeld.has(k as HoldKey));
    if (padChanged) {
      this.padHeld = new Set((['left', 'right', 'up', 'down'] as HoldKey[]).filter((k) => held.has(k)));
      this.drawDpad();
    } else {
      // Joystick origin and knob move even when the selected direction does not change.
      this.drawDpad();
    }
  }

  override update(): void {
    if (!this.tracker) return;
    const live = this.live();
    if (live !== this.shown) this.setShown(live);
    if (!live) {
      if (this.tracker.ids().length > 0) this.releaseAll();
      return;
    }
    // Safety net: a pointer the engine no longer considers down must not keep a button held
    // (touchcancel, lost pointerup, scene switches, etc).
    let changed = false;
    for (const id of this.tracker.ids()) {
      const p = this.input.manager.pointers.find((q) => q.id === id);
      if (!p || !p.isDown) {
        this.tracker.up(id);
        changed = true;
      }
    }
    if (changed) this.render();
  }

  private setShown(on: boolean): void {
    this.shown = on;
    for (const o of this.all) (o as Phaser.GameObjects.GameObject & { setVisible(v: boolean): unknown }).setVisible(on);
    if (!on) this.releaseAll();
  }
}
