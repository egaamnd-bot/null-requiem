import Phaser from 'phaser';
import { VIEW } from '../config/tuning';
import { InputManager } from '../input/InputManager';
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

  constructor() {
    super(SCENES.victory);
  }

  init(data: VictoryData): void {
    this.victory = data;
    this.age = 0;
  }

  create(): void {
    const { width: W, height: H } = VIEW;
    this.cameras.main.setBackgroundColor(PALETTE.void);
    this.cameras.main.fadeIn(900, 255, 236, 210);
    this.add.image(W / 2, H / 2 - 20, TEX.glowSoft).setTint(PALETTE.ember).setBlendMode(Phaser.BlendModes.ADD).setScale(3).setAlpha(0.4);
    this.add
      .text(W / 2, 62, 'THE SANCTUM COOLS', { fontFamily: UI_FONT, fontSize: '22px', color: css(PALETTE.bone), resolution: 2 })
      .setOrigin(0.5)
      .setLetterSpacing(5)
      .setShadow(0, 0, css(PALETTE.ember), 10, false, true);
    this.add
      .text(W / 2, 92, 'The Kiln Warden is quenched. Beyond its gate, the veil runs deeper.', {
        fontFamily: UI_FONT,
        fontSize: '10px',
        color: css(PALETTE.stone),
        fontStyle: 'italic',
        resolution: 2,
      })
      .setOrigin(0.5);
    const d = this.victory;
    this.add
      .text(W / 2, 140, [`Time   ${formatTime(d.playTime)}`, `Deaths   ${d.deaths}`, `Secrets   ${d.secretsFound} / ${d.secretsTotal}`].join('\n'), {
        fontFamily: UI_MONO,
        fontSize: '10px',
        color: css(PALETTE.bone),
        align: 'center',
        lineSpacing: 6,
        resolution: 2,
      })
      .setOrigin(0.5);
    this.add
      .text(W / 2, H - 46, 'End of the Emberveil vertical slice — thank you for playing.\nPress Enter to return to the title', {
        fontFamily: UI_FONT,
        fontSize: '9px',
        color: css(PALETTE.stoneDark),
        align: 'center',
        lineSpacing: 4,
        resolution: 2,
      })
      .setOrigin(0.5);
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
      this.scene.start(SCENES.title, { services: this.victory.services });
    }
  }
}
