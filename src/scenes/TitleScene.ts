import Phaser from 'phaser';
import { VIEW } from '../config/tuning';
import { loadProgression, Progression } from '../core/progression';
import { InputManager } from '../input/InputManager';
import { css, PALETTE, UI_FONT, UI_MONO } from '../render/palette';
import { TEX } from '../render/textures';
import { SCENES, type Services } from './session';

type MenuItem = { label: string; action: () => void };

export class TitleScene extends Phaser.Scene {
  private services!: Services;
  private controls!: InputManager;
  private items: MenuItem[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private index = 0;
  private emblem!: Phaser.GameObjects.Image;
  private starting = false;

  constructor() {
    super(SCENES.title);
  }

  init(data: { services: Services }): void {
    this.services = data.services;
    this.items = [];
    this.labels = [];
    this.index = 0;
    this.starting = false;
  }

  create(): void {
    const { width: W, height: H } = VIEW;
    this.cameras.main.setBackgroundColor(PALETTE.void);
    this.add.image(W / 2, H / 2, TEX.glowSoft).setTint(PALETTE.violet).setBlendMode(Phaser.BlendModes.ADD).setScale(4, 2.4).setAlpha(0.3);
    this.emblem = this.add.image(W / 2, 70, TEX.title).setBlendMode(Phaser.BlendModes.ADD);
    this.add
      .particles(0, 0, TEX.rain, {
        x: { min: -60, max: W },
        y: -10,
        speedY: { min: 280, max: 360 },
        speedX: { min: 40, max: 55 },
        rotate: -9,
        lifespan: 1200,
        frequency: 18,
        tint: [0x8fb4ff, PALETTE.mist],
        alpha: { min: 0.15, max: 0.35 },
      })
      .setDepth(-1);

    this.add
      .text(W / 2, 112, 'NULL REQUIEM', { fontFamily: UI_FONT, fontSize: '32px', fontStyle: 'bold', color: css(PALETTE.chrome), resolution: 2 })
      .setOrigin(0.5)
      .setLetterSpacing(7)
      .setShadow(2, 0, css(PALETTE.magenta), 0, false, true);
    this.add
      .text(W / 2, 138, '// vertical slice', { fontFamily: UI_MONO, fontSize: '10px', color: css(PALETTE.cyan), resolution: 2 })
      .setOrigin(0.5);

    const save = loadProgression(this.services.store);
    if (save && save.checkpoint) {
      this.items.push({ label: 'Continue', action: () => this.begin(save) });
      this.items.push({
        label: 'New Run',
        action: () => {
          this.services.store.clear();
          this.begin(new Progression());
        },
      });
    } else {
      this.items.push({ label: 'Start', action: () => this.begin(new Progression()) });
    }
    this.items.forEach((item, i) => {
      this.labels.push(
        this.add
          .text(W / 2, 170 + i * 18, item.label, { fontFamily: UI_MONO, fontSize: '13px', color: css(PALETTE.mist), resolution: 2 })
          .setOrigin(0.5),
      );
    });

    this.add
      .text(
        W / 2,
        H - 34,
        'Move  A/D or Left/Right    Jump  Space/Z    Strike  J/X    Dash  K/C/Shift    Backtrace  L/V\nAim strikes with W/S or Up/Down    Pause  Esc/P    Mute  M    Gamepad supported',
        { fontFamily: UI_MONO, fontSize: '8px', color: css(PALETTE.steel), align: 'center', lineSpacing: 4, resolution: 2 },
      )
      .setOrigin(0.5);

    this.controls = new InputManager(this);
    this.controls.swallow();
    this.refresh();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.controls.destroy());
  }

  private refresh(): void {
    this.labels.forEach((l, i) => {
      const sel = i === this.index;
      l.setColor(css(sel ? PALETTE.cyan : PALETTE.steel));
      l.setText(sel ? `>  ${this.items[i]!.label}  <` : this.items[i]!.label);
    });
  }

  private begin(progression: Progression): void {
    if (this.starting) return;
    this.starting = true;
    this.services.sfx.unlock();
    this.services.sfx.play('confirm');
    this.services.sfx.startDrone();
    this.cameras.main.fadeOut(400, 5, 6, 12);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENES.game, { services: this.services, progression });
    });
  }

  override update(time: number): void {
    this.emblem.setScale(1 + Math.sin(time / 900) * 0.04).setAlpha(0.85 + Math.sin(time / 600) * 0.1);
    const inp = this.controls;
    inp.update();
    if (this.starting) return;
    if (inp.justPressed('mute')) {
      this.services.sfx.unlock();
      this.services.sfx.toggleMute();
    }
    if (inp.justPressed('up') || inp.justPressed('down')) {
      this.services.sfx.unlock();
      const n = this.items.length;
      this.index = (this.index + (inp.justPressed('up') ? n - 1 : 1)) % n;
      this.services.sfx.play('menu');
      this.refresh();
    }
    if (inp.justPressed('confirm') || inp.justPressed('attack')) this.items[this.index]?.action();
  }
}
