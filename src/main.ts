import Phaser from 'phaser';
import { Sfx } from './audio/Sfx';
import { applyWindowView, installViewportWatcher } from './render/viewportDom';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import type { Services } from './scenes/session';
import { TitleScene } from './scenes/TitleScene';
import { MobileControlsScene } from './scenes/MobileControlsScene';
import { UIScene } from './scenes/UIScene';
import { VictoryScene } from './scenes/VictoryScene';
import { LocalSaveStore } from './state/LocalSaveStore';
import { loadSettings } from './state/settings';

loadSettings();
const initialView = applyWindowView();

const services: Services = {
  sfx: new Sfx(),
  store: new LocalSaveStore(),
};

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: initialView.width,
  height: initialView.height,
  backgroundColor: '#05060c',
  // Keep the logical world stable while allowing smooth antialiased scaling on high-density screens.
  pixelArt: false,
  roundPixels: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    gamepad: true,
    // Phaser defaults to a single touch pointer; the virtual controls need several fingers at once
    // (move + jump + attack). Pointer 0 is the mouse, so this allows four simultaneous touches.
    activePointers: 4,
  },
  disableContextMenu: true,
  scene: [new BootScene(services), TitleScene, GameScene, UIScene, VictoryScene, MobileControlsScene],
});

installViewportWatcher(game);

// Unlock audio on the first user gesture anywhere on the page.
const unlock = () => services.sfx.unlock();
window.addEventListener('keydown', unlock, { once: true });
window.addEventListener('pointerdown', unlock, { once: true });

// Read-only handle for browser smoke tests and console debugging; game code never reads it.
(window as unknown as { nullRequiemGame?: Phaser.Game }).nullRequiemGame = game;

export default game;
