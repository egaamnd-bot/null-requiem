import { holdKeysAt, type HoldKey, type TouchLayout } from './touchLayout';

/**
 * Multi-touch bookkeeping for the virtual controls, independent of Phaser.
 *
 * Each pointer id owns the set of keys under its finger. The union over all pointers is the
 * held state. Releasing, cancelling or `releaseAll()` always drops a pointer's keys, which is what
 * prevents stuck buttons.
 */
export class TouchTracker {
  private readonly pointers = new Map<number, HoldKey[]>();

  constructor(private layout: TouchLayout) {}

  setLayout(layout: TouchLayout): void {
    this.layout = layout;
  }

  down(id: number, x: number, y: number): void {
    this.pointers.set(id, holdKeysAt(this.layout, x, y));
  }

  /** Slide a tracked finger. Ignored for pointers that did not start on the controls. */
  move(id: number, x: number, y: number): void {
    if (!this.pointers.has(id)) return;
    this.pointers.set(id, holdKeysAt(this.layout, x, y));
  }

  up(id: number): void {
    this.pointers.delete(id);
  }

  releaseAll(): void {
    this.pointers.clear();
  }

  has(id: number): boolean {
    return this.pointers.has(id);
  }

  ids(): number[] {
    return [...this.pointers.keys()];
  }

  held(): Set<HoldKey> {
    const out = new Set<HoldKey>();
    for (const keys of this.pointers.values()) for (const k of keys) out.add(k);
    return out;
  }
}
