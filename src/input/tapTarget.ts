import Phaser from 'phaser';
import { TapGuard } from './TapGuard';

export interface TapTargetOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Fires once per completed tap (press and release on the item, same pointer). */
  onTap: () => void;
  /** Pressed-state visual: true on press, false on release/cancel. */
  onPress?: (pressed: boolean) => void;
  /** Pointer pressed/hovered the item (use to move the keyboard selection to it). */
  onFocus?: () => void;
  /** When this returns false the target ignores pointers (e.g. its menu is hidden). */
  enabled?: () => boolean;
  /** Optional container to place the hit zone in, so it moves/hides with the menu. */
  container?: Phaser.GameObjects.Container;
}

export interface TapTarget {
  zone: Phaser.GameObjects.Zone;
  guard: TapGuard;
  /** Re-arm the target (call when its menu opens again). */
  reset(): void;
}

/**
 * An interactive rectangle with robust tap semantics for touch and mouse. Uses Phaser pointer events,
 * so it works the same for a finger on Android and a mouse click in a desktop browser.
 */
export function createTapTarget(scene: Phaser.Scene, o: TapTargetOptions): TapTarget {
  const guard = new TapGuard();
  const enabled = () => (o.enabled ? o.enabled() : true);
  const zone = scene.add.zone(o.x, o.y, o.width, o.height).setInteractive({ useHandCursor: true });
  o.container?.add(zone);

  const release = () => {
    guard.reset();
    o.onPress?.(false);
  };

  zone.on(Phaser.Input.Events.POINTER_OVER, () => {
    if (enabled()) o.onFocus?.();
  });
  zone.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
    if (!enabled()) return;
    if (guard.down(p.id)) {
      o.onFocus?.();
      o.onPress?.(true);
    }
  });
  zone.on(Phaser.Input.Events.POINTER_OUT, (p: Phaser.Input.Pointer) => {
    // On touch the engine can report "out" right after the finger lifts; only a pointer that is still
    // down and slid away cancels the press.
    if (p.isDown && guard.pressed) {
      guard.cancel(p.id);
      o.onPress?.(false);
    }
  });
  zone.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
    const fire = guard.up(p.id, true);
    o.onPress?.(false);
    if (fire && enabled()) o.onTap();
  });
  // Released somewhere else: drop the press so the item does not look stuck.
  const onSceneUp = (p: Phaser.Input.Pointer) => {
    if (guard.pressed) {
      guard.up(p.id, false);
      o.onPress?.(false);
    }
  };
  scene.input.on(Phaser.Input.Events.POINTER_UP, onSceneUp);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.input.off(Phaser.Input.Events.POINTER_UP, onSceneUp));

  return {
    zone,
    guard,
    reset: release,
  };
}
