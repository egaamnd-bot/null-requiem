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
