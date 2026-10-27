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
    this.add.image(W / 2, H / 2, TEX.glowSoft).setTint(PALETTE.emberDeep).setBlendMode(Phaser.BlendModes.ADD).setScale(4, 2.4).setAlpha(0.35);
    this.emblem = this.add.image(W / 2, 70, TEX.title).setBlendMode(Phaser.BlendModes.ADD);
    this.add
      .particles(0, 0, TEX.mote, {
        x: { min: 0, max: W },
        y: H + 4,
        speedY: { min: -40, max: -15 },
        speedX: { min: -8, max: 8 },
        lifespan: 9000,
        frequency: 160,
        tint: [PALETTE.ember, PALETTE.emberBright],
        alpha: { start: 0.8, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(-1);

    this.add
      .text(W / 2, 112, 'EMBERVEIL', { fontFamily: UI_FONT, fontSize: '34px', color: css(PALETTE.bone), resolution: 2 })
      .setOrigin(0.5)
      .setLetterSpacing(6)
      .setShadow(0, 0, css(PALETTE.ember), 10, false, true);
    this.add
      .text(W / 2, 138, 'a vertical slice', { fontFamily: UI_FONT, fontSize: '11px', color: css(PALETTE.stone), fontStyle: 'italic', resolution: 2 })
      .setOrigin(0.5);

    const save = loadProgression(this.services.store);
    if (save && save.checkpoint) {
      this.items.push({ label: 'Continue', action: () => this.begin(save) });
      this.items.push({
        label: 'New Journey',
        action: () => {
          this.services.store.clear();
          this.begin(new Progression());
        },
      });
    } else {
      this.items.push({ label: 'Begin', action: () => this.begin(new Progression()) });
    }
    this.items.forEach((item, i) => {
      this.labels.push(
        this.add
          .text(W / 2, 170 + i * 18, item.label, { fontFamily: UI_FONT, fontSize: '14px', color: css(PALETTE.stone), resolution: 2 })
          .setOrigin(0.5),
      );
    });

    this.add
      .text(
        W / 2,
        H - 34,
        'Move  A/D or ←/→    Jump  Space/Z    Strike  J/X    Veilstep  K/C/Shift\nAim strikes with W/S or ↑/↓    Pause  Esc/P    Mute  M    Gamepad supported',
        { fontFamily: UI_MONO, fontSize: '8px', color: css(PALETTE.stoneDark), align: 'center', lineSpacing: 4, resolution: 2 },
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
      l.setColor(css(sel ? PALETTE.emberBright : PALETTE.stoneDark));
      l.setText(sel ? `—  ${this.items[i]!.label}  —` : this.items[i]!.label);
    });
  }

  private begin(progression: Progression): void {
    if (this.starting) return;
    this.starting = true;
    this.services.sfx.unlock();
    this.services.sfx.play('confirm');
    this.services.sfx.startDrone();
    this.cameras.main.fadeOut(400, 7, 6, 10);
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
