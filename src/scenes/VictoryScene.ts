import Phaser from 'phaser';
import { VIEW } from '../config/tuning';
import { InputManager } from '../input/InputManager';
import { createTapTarget } from '../input/tapTarget';
import { css, PALETTE, UI_FONT, UI_MONO } from '../render/palette';
import { TEX } from '../render/textures';
import { SCENES, type VictoryData } from './session';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export class VictoryScene extends Phaser.Scene {
  private victory!: VictoryData;
  private controls!: InputManager;
  private age = 0;
  private leaving = false;

  constructor() {
    super(SCENES.victory);
  }

  init(data: VictoryData): void {
    this.victory = data;
    this.age = 0;
    this.leaving = false;
  }

  create(): void {
    const { width: W, height: H } = VIEW;
    this.cameras.main.setBackgroundColor(PALETTE.void);
    this.cameras.main.fadeIn(900, 200, 240, 255);
    this.add.image(W / 2, H / 2 - 20, TEX.glowSoft).setTint(PALETTE.cyan).setBlendMode(Phaser.BlendModes.ADD).setScale(3).setAlpha(0.3);
    this.add
      .text(W / 2, 62, 'VAULT BREACHED', { fontFamily: UI_FONT, fontSize: '22px', color: css(PALETTE.chrome), resolution: 2 })
      .setOrigin(0.5)
      .setLetterSpacing(5)
      .setShadow(0, 0, css(PALETTE.magenta), 10, false, true);
    this.add
      .text(W / 2, 92, 'BULWARK-9 is offline. Somewhere below the precinct, a clock is running backwards.', {
        fontFamily: UI_FONT,
        fontSize: '10px',
        color: css(PALETTE.mist),
                resolution: 2,
      })
      .setOrigin(0.5);
    const d = this.victory;
    this.add
      .text(W / 2, 140, [`Time   ${formatTime(d.playTime)}`, `Deaths   ${d.deaths}`, `Secrets   ${d.secretsFound} / ${d.secretsTotal}`].join('\n'), {
        fontFamily: UI_MONO,
        fontSize: '10px',
        color: css(PALETTE.chrome),
        align: 'center',
        lineSpacing: 6,
        resolution: 2,
      })
      .setOrigin(0.5);
    this.add
      .text(W / 2, H - 62, 'End of the Null Requiem vertical slice - thank you for playing.', {
        fontFamily: UI_FONT,
        fontSize: '9px',
        color: css(PALETTE.steel),
        align: 'center',
        resolution: 2,
      })
      .setOrigin(0.5);
    const frame = this.add.rectangle(W / 2, H - 32, 190, 28, PALETTE.ink, 0.6).setStrokeStyle(1, PALETTE.cyan, 0.9);
    this.add
      .text(W / 2, H - 32, 'Return to title', { fontFamily: UI_MONO, fontSize: '12px', color: css(PALETTE.cyan), resolution: 2 })
      .setOrigin(0.5);
    this.add
      .text(W / 2, H - 12, 'or press Enter', { fontFamily: UI_MONO, fontSize: '8px', color: css(PALETTE.steel), resolution: 2 })
      .setOrigin(0.5);
    createTapTarget(this, {
      x: W / 2,
      y: H - 32,
      width: 190,
      height: 32,
      enabled: () => this.age > 1.2 && !this.leaving,
      onPress: (down) => frame.setFillStyle(down ? PALETTE.violet : PALETTE.ink, down ? 0.85 : 0.6).setScale(down ? 0.97 : 1),
      onTap: () => this.toTitle(),
    });
    this.controls = new InputManager(this);
    this.controls.swallow();
    this.victory.services.sfx.play('victory');
    this.victory.services.sfx.stopDrone();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.controls.destroy());
  }

  override update(_t: number, deltaMs: number): void {
    this.age += deltaMs / 1000;
    this.controls.update();
    if (this.age > 1.2 && (this.controls.justPressed('confirm') || this.controls.justPressed('attack'))) {
      this.toTitle();
    }
  }

  private toTitle(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start(SCENES.title, { services: this.victory.services });
  }
}
