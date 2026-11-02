import Phaser from 'phaser';
import { applyFinalAssets, queueFinalManifest } from '../render/assetRuntime';
import { makeAllTextures } from '../render/textures';
import { SCENES, type Services } from './session';

/**
 * Generates all procedural placeholder textures, then (optionally) swaps in delivered final art listed in
 * `assets/final/manifest.json`, then hands over to the title screen. A missing manifest is the normal case.
 */
export class BootScene extends Phaser.Scene {
  constructor(private readonly services: Services) {
    super(SCENES.boot);
  }

  preload(): void {
    queueFinalManifest(this);
  }

  create(): void {
    makeAllTextures(this);
    let started = false;
    const go = () => {
      if (started) return;
      started = true;
      this.scene.start(SCENES.title, { services: this.services });
    };
    try {
      applyFinalAssets(this, (report) => {
        if (report.loaded.length || report.skipped.length) console.info('[assets] final art', report);
        go();
      });
    } catch (err) {
      console.warn('[assets] final art skipped', err);
      go();
    }
  }
}
