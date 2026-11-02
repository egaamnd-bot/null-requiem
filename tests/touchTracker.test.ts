import { describe, expect, it } from 'vitest';
import { TouchTracker } from '../src/input/TouchTracker';
import { createTouchLayout } from '../src/input/touchLayout';
import { clearVirtualButtons, mergeHeld, virtualButtons } from '../src/input/virtualButtons';
import { NO_INPUT } from '../src/core/input';

const layout = createTouchLayout(480, 270);
const btn = (k: string) => layout.buttons.find((b) => b.key === k)!;
const joystickStart = { x: 70, y: 185 };
const joystickLeft = { x: 25, y: 185 };
const joystickRight = { x: 125, y: 185 };

describe('TouchTracker (multi-touch virtual controls)', () => {
  it('holds move and jump at the same time from two fingers', () => {
    const t = new TouchTracker(layout);
    t.down(1, joystickStart.x, joystickStart.y);
    t.move(1, joystickLeft.x, joystickLeft.y);
    t.down(2, btn('jump').x, btn('jump').y);
    expect([...t.held()].sort()).toEqual(['jump', 'left']);
  });

  it('releases only the lifted finger', () => {
    const t = new TouchTracker(layout);
    t.down(1, joystickStart.x, joystickStart.y);
    t.move(1, joystickLeft.x, joystickLeft.y);
    t.down(2, btn('attack').x, btn('attack').y);
    t.up(2);
    expect([...t.held()]).toEqual(['left']);
    t.up(1);
    expect(t.held().size).toBe(0);
  });

  it('follows a finger sliding from left to right on the pad', () => {
    const t = new TouchTracker(layout);
    t.down(1, joystickStart.x, joystickStart.y);
    t.move(1, joystickRight.x, joystickRight.y);
    expect([...t.held()]).toEqual(['right']);
  });


  it('anchors the floating joystick at the initial touch rather than the screen corner', () => {
    const t = new TouchTracker(layout);
    const start = { x: 95, y: 145 };
    t.down(7, start.x, start.y);
    expect(t.joystickVisual()?.origin).toEqual(start);
    expect(t.held().size).toBe(0);
    t.move(7, start.x + 40, start.y);
    expect(t.held().has('right')).toBe(true);
    expect(t.joystickVisual()?.knob.x).toBeGreaterThan(start.x);
  });

  it('releases the floating joystick when its pointer lifts', () => {
    const t = new TouchTracker(layout);
    t.down(8, 80, 180);
    t.move(8, 35, 180);
    expect(t.held().has('left')).toBe(true);
    t.up(8);
    expect(t.held().size).toBe(0);
    expect(t.joystickVisual()).toBeNull();
  });

  it('keeps a key held while another finger is still on it', () => {
    const t = new TouchTracker(layout);
    t.down(1, btn('dash').x, btn('dash').y);
    t.down(2, btn('dash').x, btn('dash').y);
    t.up(1);
    expect(t.held().has('dash')).toBe(true);
    t.up(2);
    expect(t.held().has('dash')).toBe(false);
  });

  it('ignores moves from pointers that never went down on the controls', () => {
    const t = new TouchTracker(layout);
    t.move(9, btn('jump').x, btn('jump').y);
    expect(t.held().size).toBe(0);
  });

  it('releaseAll (focus loss / cancel / shutdown) clears every held key', () => {
    const t = new TouchTracker(layout);
    t.down(1, joystickStart.x, joystickStart.y);
    t.move(1, joystickLeft.x, joystickLeft.y);
    t.down(2, btn('backtrace').x, btn('backtrace').y);
    t.down(3, btn('interact').x, btn('interact').y);
    t.releaseAll();
    expect(t.held().size).toBe(0);
    expect(t.ids()).toEqual([]);
  });
});

describe('virtual button -> gameplay action mapping', () => {
  it('maps each on-screen button onto the matching HeldInput action', () => {
    const cases: Array<[keyof typeof virtualButtons, keyof typeof NO_INPUT]> = [
      ['left', 'left'],
      ['right', 'right'],
      ['up', 'up'],
      ['down', 'down'],
      ['jump', 'jump'],
      ['attack', 'attack'],
      ['dash', 'dash'],
      ['backtrace', 'backtrace'],
    ];
    for (const [virt, held] of cases) {
      clearVirtualButtons();
      virtualButtons[virt] = true;
      const merged = mergeHeld({ ...NO_INPUT }, virtualButtons);
      expect(merged[held]).toBe(true);
      for (const other of Object.keys(NO_INPUT) as Array<keyof typeof NO_INPUT>) {
        if (other !== held) expect(merged[other]).toBe(false);
      }
    }
    clearVirtualButtons();
  });

  it('ORs with physical input rather than replacing it', () => {
    clearVirtualButtons();
    virtualButtons.jump = true;
    const merged = mergeHeld({ ...NO_INPUT, left: true }, virtualButtons);
    expect(merged.left).toBe(true);
    expect(merged.jump).toBe(true);
    clearVirtualButtons();
  });

  it('clearVirtualButtons leaves nothing stuck', () => {
    for (const k of Object.keys(virtualButtons) as Array<keyof typeof virtualButtons>) virtualButtons[k] = true;
    clearVirtualButtons();
    expect(Object.values(virtualButtons).every((v) => v === false)).toBe(true);
  });
});

describe('floating joystick is not restricted by its activation zone', () => {
  const l = createTouchLayout(560, 270);
  const reach = l.dpad.r * l.dpadReach;

  it('keeps steering after the finger leaves the zone (even onto the action buttons)', () => {
    const t = new TouchTracker(l);
    t.down(1, 100, 170);
    t.move(1, 100 + reach * 0.9, 170);
    expect(t.held().has('right')).toBe(true);
    // Drag far right, straight across the jump / attack buttons: still only a joystick finger.
    const jump = l.buttons.find((b) => b.key === 'jump')!;
    t.move(1, jump.x, jump.y);
    expect(t.held().has('right')).toBe(true);
    expect(t.held().has('jump')).toBe(false);
  });

  it('keeps steering when the finger leaves the screen bounds entirely', () => {
    const t = new TouchTracker(l);
    t.down(1, 60, 200);
    t.move(1, -80, 330);
    expect([...t.held()].sort()).toEqual(['down', 'left']);
  });

  it('input is not clamped by the knob radius: far drags still register', () => {
    const t = new TouchTracker(l);
    t.down(1, 120, 150);
    t.move(1, 120 + 900, 150);
    expect(t.held().has('right')).toBe(true);
  });

  it('drags the anchor along so reversing direction is immediate', () => {
    const t = new TouchTracker(l);
    t.down(1, 100, 170);
    t.move(1, 100 + reach * 4, 170); // overshoot far to the right
    expect(t.held().has('right')).toBe(true);
    // Move back left by only a small amount: with a fixed anchor this would still read "right".
    t.move(1, 100 + reach * 4 - reach * 1.2, 170);
    expect(t.held().has('left')).toBe(true);
    expect(t.held().has('right')).toBe(false);
  });

  it('anchors a new joystick anywhere in the left half, not just near the bottom corner', () => {
    const t = new TouchTracker(l);
    t.down(1, 250, 70);
    expect(t.joystickVisual()?.origin).toEqual({ x: 250, y: 70 });
  });

  it('a joystick finger and button fingers are fully independent (move + jump + attack + dash + rewind)', () => {
    const t = new TouchTracker(l);
    const b = (k: string) => l.buttons.find((x) => x.key === k)!;
    t.down(1, 100, 170);
    t.move(1, 40, 170);
    t.down(2, b('jump').x, b('jump').y);
    t.down(3, b('attack').x, b('attack').y);
    t.down(4, b('dash').x, b('dash').y);
    expect([...t.held()].sort()).toEqual(['attack', 'dash', 'jump', 'left']);
    t.up(1);
    expect([...t.held()].sort()).toEqual(['attack', 'dash', 'jump']);
    t.down(5, b('backtrace').x, b('backtrace').y);
    expect(t.held().has('backtrace')).toBe(true);
  });

  it('a button-only finger sliding into the joystick zone does not become a joystick', () => {
    const t = new TouchTracker(l);
    const jump = l.buttons.find((x) => x.key === 'jump')!;
    t.down(2, jump.x, jump.y);
    t.move(2, 100, 170);
    expect(t.joystickVisual()).toBeNull();
    expect(t.held().size).toBe(0);
  });

  it('a lost pointer (cancel, app backgrounding) never leaves movement stuck', () => {
    const t = new TouchTracker(l);
    t.down(1, 100, 170);
    t.move(1, 40, 170);
    t.up(1); // what the scene does for POINTER_UP / cancel / safety-net sweep
    expect(t.held().size).toBe(0);
    t.down(2, 100, 170);
    t.move(2, 160, 170);
    t.releaseAll(); // blur / hidden
    expect(t.held().size).toBe(0);
    expect(t.joystickVisual()).toBeNull();
  });
});
