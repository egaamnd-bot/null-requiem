/**
 * Decides whether a pointer sequence counts as a "tap" on a menu item, independent of Phaser.
 *
 * Rules:
 *  - a tap starts on pointer-down over the item and only the first pointer owns it;
 *  - it completes on pointer-up over the same item by the same pointer;
 *  - sliding off the item before release cancels it;
 *  - a completed tap fires once, so a second finger or repeated events cannot double-trigger.
 */
export class TapGuard {
  private owner: number | null = null;
  private fired = false;

  /** Returns true if this pointer now owns the press (and the item should show a pressed state). */
  down(pointerId: number): boolean {
    if (this.fired || this.owner !== null) return false;
    this.owner = pointerId;
    return true;
  }

  /** Pointer left the item (or the press was cancelled). */
  cancel(pointerId: number): void {
    if (this.owner === pointerId) this.owner = null;
  }

  /** Pointer released. Returns true exactly once when the tap should activate the item. */
  up(pointerId: number, insideItem: boolean): boolean {
    if (this.owner !== pointerId) return false;
    this.owner = null;
    if (!insideItem || this.fired) return false;
    this.fired = true;
    return true;
  }

  /** Re-arm, e.g. when a menu is shown again. */
  reset(): void {
    this.owner = null;
    this.fired = false;
  }

  get pressed(): boolean {
    return this.owner !== null;
  }
}
