import Phaser from 'phaser';
import { makeAllTextures } from '../render/textures';
import { SCENES, type Services } from './session';

/** Generates all procedural textures, then hands over to the title screen. */
export class BootScene extends Phaser.Scene {
  constructor(private readonly services: Services) {
    super(SCENES.boot);
  }

  create(): void {
    makeAllTextures(this);
    this.scene.start(SCENES.title, { services: this.services });
  }
}
