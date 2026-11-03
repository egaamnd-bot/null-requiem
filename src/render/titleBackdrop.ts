import Phaser from 'phaser';
import { view } from '../config/view';
import { makeAtmosphereTextures, ATM_KEYS } from './Atmosphere';
import { mix, PALETTE } from './palette';
import { makeBackdrop, playerKey } from './textures';

/**
 * Title-screen backdrop: the generated Rainline skyline (same art as the first room), drifting slowly, with fog, night grade,
 * near rain, a neon-lit Courier silhouette and a breathing neon haze. Presentation only; painted art can replace the layers later.
 * In lite mode (render scale demoted to 1x) the particles and the extra fog band are skipped.
 */
export class TitleBackdrop {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly far: Phaser.GameObjects.TileSprite;
  private readonly mid: Phaser.GameObjects.TileSprite;
  private readonly fog: Phaser.GameObjects.TileSprite;
  private readonly neon: Phaser.GameObjects.Image[] = [];
  private readonly implant: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    const { width: W, height: H } = view;
    makeAtmosphereTextures(scene);
    makeBackdrop(scene, 'title-far', mix(0x1a0d26, 0x2a2f42, 0.45), 'far', 211);
    makeBackdrop(scene, 'title-mid', mix(0x1a0d26, 0x2a2f42, 0.6), 'mid', 97);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.objects.push(o);
      return o;
    };
    const scaleOf = (key: string) => {
      const src = scene.textures.get(key).getSourceImage() as { height?: number };
      return src.height ? H / src.height : 0.5;
    };
    const fs = scaleOf('title-far');
    const ms = scaleOf('title-mid');
    this.far = add(scene.add.tileSprite(0, 0, W, H, 'title-far').setOrigin(0).setDepth(-100).setTileScale(fs, fs));
    this.mid = add(scene.add.tileSprite(0, 0, W, H, 'title-mid').setOrigin(0).setDepth(-90).setAlpha(0.85).setTileScale(ms, ms));
    add(scene.add.image(0, 0, ATM_KEYS.grade).setOrigin(0).setDisplaySize(W, H).setDepth(-80).setAlpha(0.9));
    this.fog = add(scene.add.tileSprite(0, H * 0.5, W, 64, ATM_KEYS.fog).setOrigin(0).setDepth(-75).setTint(0x7a4cc2).setAlpha(0.3).setTileScale(2.6, 1.8));
    // Ground haze + a dark scrim behind the menu so text stays readable.
    add(scene.add.image(0, H - 90, ATM_KEYS.haze).setOrigin(0).setDisplaySize(W, 90).setDepth(-70).setTint(0x05060c).setAlpha(0.85));
    add(scene.add.rectangle(W / 2, H / 2, W, H, PALETTE.void, 0.28).setDepth(-65));

    // Courier silhouette (right of the menu) with a cyan implant and a magenta scarf glint, standing on a ledge line.
    const key = playerKey('idle0');
    if (scene.textures.exists(key)) {
      const sx = W * 0.82;
      const sy = H - 22;
      add(scene.add.rectangle(sx, sy + 1, 90, 1, 0xc9d6ff, 0.35).setDepth(-60));
      add(scene.add.image(sx, sy, key).setOrigin(0.5, 1).setScale(1.25).setFlipX(true).setTint(0x120a1c).setDepth(-59));
      add(scene.add.image(sx, sy - 1, key).setOrigin(0.5, 1).setScale(1.25).setFlipX(true).setTint(PALETTE.magenta).setAlpha(0.12).setBlendMode(Phaser.BlendModes.ADD).setDepth(-58));
      this.implant = add(scene.add.image(sx + 3, sy - 34, 'fx-glow').setTint(PALETTE.cyan).setBlendMode(Phaser.BlendModes.ADD).setScale(0.55).setDepth(-57));
      // Wet-floor reflection of the silhouette.
      add(scene.add.image(sx, sy + 3, key).setOrigin(0.5, 0).setScale(1.25, -1.25).setFlipX(true).setTint(PALETTE.cyan).setAlpha(0.1).setBlendMode(Phaser.BlendModes.ADD).setDepth(-60));
    } else {
      this.implant = add(scene.add.image(-100, -100, 'fx-glow').setVisible(false));
    }
    // Distant neon haze patches that breathe.
    for (const [x, y, c, s] of [[W * 0.18, H * 0.55, PALETTE.magenta, 3.2], [W * 0.5, H * 0.42, PALETTE.cyan, 2.4], [W * 0.9, H * 0.35, PALETTE.violet, 3]] as const) {
      this.neon.push(add(scene.add.image(x, y, 'fx-glow-soft').setTint(c).setBlendMode(Phaser.BlendModes.ADD).setScale(s).setAlpha(0.18).setDepth(-72)));
    }
    if (view.renderScale > 1) {
      add(
        scene.add
          .particles(0, 0, ATM_KEYS.rainNear, {
            x: { min: -40, max: W },
            y: -16,
            speedY: { min: 520, max: 640 },
            speedX: { min: 70, max: 95 },
            rotate: -9,
            lifespan: 700,
            alpha: { min: 0.1, max: 0.3 },
            frequency: 40,
          })
          .setDepth(-50),
      );
    }
  }

  update(time: number): void {
    const t = time / 1000;
    this.far.tilePositionX = t * 3;
    this.mid.tilePositionX = t * 9;
    this.fog.tilePositionX = -t * 7;
    this.neon.forEach((n, i) => n.setAlpha(0.16 + Math.sin(t * (0.6 + i * 0.25) + i) * 0.06));
    this.implant.setAlpha(0.6 + Math.sin(t * 2.2) * 0.2);
  }

  destroy(): void {
    for (const o of this.objects) o.destroy();
    this.objects.length = 0;
  }
}
