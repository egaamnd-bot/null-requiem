import Phaser from 'phaser';
import { view } from '../config/view';
import { VIEW_CHANGED } from '../render/viewportDom';
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
  private slide = 0;
  private slideCount = 0;
  private slides: { title: string; body: string }[] = [];
  private titleText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private nextLabel!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENES.victory);
  }

  init(data: VictoryData): void {
    this.victory = data;
    this.age = 0;
    this.leaving = false;
    this.slide = 0;
  }

  create(): void {
    const { width: W, height: H } = view;
    const onView = () => {
      if (!this.leaving) this.scene.restart(this.victory);
    };
    this.game.events.on(VIEW_CHANGED, onView);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(VIEW_CHANGED, onView));
    this.cameras.main.setBackgroundColor(PALETTE.void);
    this.cameras.main.fadeIn(900, 200, 240, 255);
    this.add.image(W / 2, H / 2 - 20, TEX.glowSoft).setTint(PALETTE.cyan).setBlendMode(Phaser.BlendModes.ADD).setScale(3).setAlpha(0.3);
    const d = this.victory;
    const slides: { title: string; body: string }[] = [
      { title: 'THE NULL UNRAVELS', body: 'The silence breaks like glass.\nEvery stolen second pours back into the city.' },
      { title: 'RAINLINE REMEMBERS', body: 'The alleys hum. The trams run on time again.\nSomeone, somewhere, finally gets to finish a sentence.' },
      { title: 'THE COURIER', body: 'Package delivered.\nYour echo steps back into you, and stays.' },
      {
        title: 'RUN RECORD',
        body: [
          `Time   ${formatTime(d.playTime)}     Deaths   ${d.deaths}`,
          `Rooms   ${d.rooms} / ${d.roomsTotal}     Records   ${d.records} / ${d.recordsTotal}`,
          `Secrets   ${d.secretsFound} / ${d.secretsTotal}     Quests   ${d.questsDone} / ${d.questsTotal}`,
          `Scrap   ${d.scrap}`,
        ].join('\n'),
      },
    ];
    this.slideCount = slides.length;
    this.titleText = this.add
      .text(W / 2, 70, '', { fontFamily: UI_FONT, fontSize: '20px', color: css(PALETTE.chrome), resolution: 2 })
      .setOrigin(0.5)
      .setLetterSpacing(4)
      .setShadow(0, 0, css(PALETTE.magenta), 10, false, true);
    this.bodyText = this.add
      .text(W / 2, 130, '', { fontFamily: UI_FONT, fontSize: '10px', color: css(PALETTE.mist), align: 'center', lineSpacing: 6, resolution: 2 })
      .setOrigin(0.5);
    this.slides = slides;
    this.showSlide(0);
    this.add
      .text(W / 2, H - 62, 'NULL REQUIEM  -  thank you for playing.', { fontFamily: UI_FONT, fontSize: '9px', color: css(PALETTE.steel), align: 'center', resolution: 2 })
      .setOrigin(0.5);
    const frame = this.add.rectangle(W / 2, H - 32, 190, 28, PALETTE.ink, 0.6).setStrokeStyle(1, PALETTE.cyan, 0.9);
    this.nextLabel = this.add.text(W / 2, H - 32, 'Next', { fontFamily: UI_MONO, fontSize: '12px', color: css(PALETTE.cyan), resolution: 2 }).setOrigin(0.5);
    createTapTarget(this, {
      x: W / 2,
      y: H - 32,
      width: 190,
      height: 32,
      enabled: () => this.age > 0.8 && !this.leaving,
      onPress: (down) => frame.setFillStyle(down ? PALETTE.violet : PALETTE.ink, down ? 0.85 : 0.6).setScale(down ? 0.97 : 1),
      onTap: () => this.advance(),
    });
    this.controls = new InputManager(this);
    this.controls.swallow();
    this.victory.services.sfx.play('victory');
    this.victory.services.music.setTheme('ending');
    this.victory.services.sfx.stopDrone();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.controls.destroy());
  }

  override update(_t: number, deltaMs: number): void {
    this.age += deltaMs / 1000;
    this.controls.update();
    if (this.age > 0.8 && (this.controls.justPressed('confirm') || this.controls.justPressed('attack'))) {
      this.advance();
    }
  }

  private showSlide(i: number): void {
    this.slide = i;
    const sl = this.slides[i]!;
    this.titleText.setText(sl.title).setAlpha(0);
    this.bodyText.setText(sl.body).setAlpha(0);
    this.tweens.add({ targets: [this.titleText, this.bodyText], alpha: 1, duration: 500 });
    this.nextLabel?.setText(i >= this.slideCount - 1 ? 'Return to title' : 'Next');
  }

  private advance(): void {
    if (this.slide >= this.slideCount - 1) this.toTitle();
    else this.showSlide(this.slide + 1);
  }

  private toTitle(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start(SCENES.title, { services: this.victory.services });
  }
}
