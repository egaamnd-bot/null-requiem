import Phaser from 'phaser';
import { ASSETS } from './assets/manifest';
import { viewScaleOf } from './render/assetRuntime';
import { Ambience } from './audio/Ambience';
import { AudioBank } from './audio/AudioBank';
import { Music } from './audio/Music';
import { Sfx } from './audio/Sfx';
import { canvasSize, FpsGuard } from './core/renderScale';
import { view } from './config/view';
import { applyWindowView, installViewportWatcher, renderGuard } from './render/viewportDom';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import type { Services } from './scenes/session';
import { TitleScene } from './scenes/TitleScene';
import { MenuScene } from './scenes/MenuScene';
import { MobileControlsScene } from './scenes/MobileControlsScene';
import { UIScene } from './scenes/UIScene';
import { VictoryScene } from './scenes/VictoryScene';
import { LocalSaveStore } from './state/LocalSaveStore';
import { getSettings, loadSettings } from './state/settings';

loadSettings();
applyWindowView();
const initialCanvas = canvasSize(view.width, view.height, view.renderScale);

const sfx = new Sfx();
const music = new Music(sfx);
const ambience = new Ambience(sfx);
// Recorded audio is optional: the bank starts loading when the AudioContext exists and everything falls back to the procedural sound.
const bank = new AudioBank();
sfx.bank = bank;
music.bank = bank;
ambience.bank = bank;
sfx.onContext = (ctx) => bank.attach(ctx);
bank.onManifest = () => music.notifyManifest();
bank.onReady = (id) => {
  music.notifyReady(id);
  ambience.notifyReady(id);
};
const services: Services = {
  sfx,
  music,
  ambience,
  store: new LocalSaveStore(),
};

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  // R0: the canvas is logical x renderScale; cameras zoom back down so all game coordinates stay logical.
  width: initialCanvas.width,
  height: initialCanvas.height,
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
  scene: [new BootScene(services), TitleScene, GameScene, UIScene, VictoryScene, MobileControlsScene, MenuScene],
});

installViewportWatcher(game);
// One global hook keeps the score scheduled regardless of which scene is active.
game.events.on(Phaser.Core.Events.POST_STEP, () => {
  services.music.update();
  services.ambience.update();
});

// R0 safety net: `auto` quality drops to 1x if a slow device cannot hold the frame rate (one-way, per session).
const fpsGuard = new FpsGuard();
game.events.on(Phaser.Core.Events.POST_STEP, () => {
  if (getSettings().renderQuality !== 'auto' || view.renderScale <= 1) return;
  if (fpsGuard.frame(game.loop.delta / 1000)) {
    renderGuard.demoted = true;
    game.events.emit('render-scale-reevaluate');
  }
});

// Unlock audio on the first user gesture anywhere on the page.
const unlock = () => services.sfx.unlock();
window.addEventListener('keydown', unlock, { once: true });
window.addEventListener('pointerdown', unlock, { once: true });

// Read-only handle for browser smoke tests and console debugging; game code never reads it.
(window as unknown as { nullRequiemGame?: Phaser.Game }).nullRequiemGame = game;

// Read-only asset introspection for browser regression tests (never read by game code).
(window as unknown as { nullRequiemAssets?: unknown }).nullRequiemAssets = { viewScaleOf, ASSETS };

(window as unknown as { nullRequiemAudio?: unknown }).nullRequiemAudio = { bank, sfx, music, ambience };

export default game;
