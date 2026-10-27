import Phaser from 'phaser';
import { Sfx } from './audio/Sfx';
import { VIEW } from './config/tuning';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import type { Services } from './scenes/session';
import { TitleScene } from './scenes/TitleScene';
import { UIScene } from './scenes/UIScene';
import { VictoryScene } from './scenes/VictoryScene';
import { LocalSaveStore } from './state/LocalSaveStore';

const services: Services = {
  sfx: new Sfx(),
  store: new LocalSaveStore(),
};

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW.width,
  height: VIEW.height,
  backgroundColor: '#07060a',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    gamepad: true,
  },
  scene: [new BootScene(services), TitleScene, GameScene, UIScene, VictoryScene],
});

// Unlock audio on the first user gesture anywhere on the page.
const unlock = () => services.sfx.unlock();
window.addEventListener('keydown', unlock, { once: true });
window.addEventListener('pointerdown', unlock, { once: true });

export default game;
