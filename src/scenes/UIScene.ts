import Phaser from 'phaser';
import { VIEW } from '../config/tuning';
import type { GameEvent } from '../core/events';
import { InputManager } from '../input/InputManager';
import { createTapTarget, type TapTarget } from '../input/tapTarget';
import { css, PALETTE, UI_FONT, UI_MONO } from '../render/palette';
import { TEX } from '../render/textures';
import { SCENES, type Session } from './session';

const W = VIEW.width;
const H = VIEW.height;

interface Menu {
  container: Phaser.GameObjects.Container;
  labels: Phaser.GameObjects.Text[];
  frames: Phaser.GameObjects.Rectangle[];
  pressed: boolean[];
  targets: TapTarget[];
  actions: (() => void)[];
  index: number;
}

/**
 * HUD and overlays drawn above the game: integrity cells (health), Backtrace indicator, boss bar,
 * toasts and area banners, the pause menu and the game-over prompt.
 */
export class UIScene extends Phaser.Scene {
  private session!: Session;
  private controls!: InputManager;
  private cells: Phaser.GameObjects.Image[] = [];
  private btIcon!: Phaser.GameObjects.Image;
  private btFill!: Phaser.GameObjects.Rectangle;
  private btLabel!: Phaser.GameObjects.Text;
  private bossName!: Phaser.GameObjects.Text;
  private bossBarBg!: Phaser.GameObjects.Rectangle;
  private bossBar!: Phaser.GameObjects.Rectangle;
  private bossBarLag!: Phaser.GameObjects.Rectangle;
  private bossLag = 1;
  private toast!: Phaser.GameObjects.Text;
  private toastTimer = 0;
  private banner!: Phaser.GameObjects.Text;
  private bannerTimer = 0;
  private hurtFlash = 0;
  private pauseMenu!: Menu;
  private gameOver!: Phaser.GameObjects.Container;
  private gameOverTargets: TapTarget[] = [];
  private gameOverPressed: boolean[] = [];
  private gameOverFrames: Phaser.GameObjects.Rectangle[] = [];
  private wasPaused = false;
  private wasOver = false;
  private overlayFrames = 0;
  private readonly onEvent = (e: GameEvent) => this.handleEvent(e);

  constructor() {
    super(SCENES.ui);
  }

  init(data: { session: Session }): void {
    this.session = data.session;
    this.cells = [];
    this.toastTimer = 0;
    this.bannerTimer = 0;
    this.overlayFrames = 0;
    this.gameOverTargets = [];
    this.gameOverPressed = [];
    this.gameOverFrames = [];
    this.wasPaused = false;
    this.wasOver = false;
    this.bossLag = 1;
  }

  create(): void {
    this.controls = new InputManager(this);
    this.controls.swallow();

    this.btIcon = this.add.image(0, 0, TEX.hudBacktrace).setOrigin(0, 0.5).setVisible(false);
    this.btFill = this.add.rectangle(0, 0, 16, 16, PALETTE.void, 0.7).setOrigin(0, 1).setVisible(false);
    this.btLabel = this.add
      .text(0, 0, 'BACKTRACE', { fontFamily: UI_MONO, fontSize: '7px', color: css(PALETTE.cyan), resolution: 2 })
      .setOrigin(0, 0.5)
      .setVisible(false);

    this.bossName = this.add
      .text(W / 2, H - 26, '', { fontFamily: UI_FONT, fontSize: '10px', color: css(PALETTE.chrome), resolution: 2 })
      .setOrigin(0.5)
      .setLetterSpacing(2)
      .setVisible(false);
    this.bossBarBg = this.add.rectangle(W / 2, H - 14, 202, 6, PALETTE.ink, 0.9).setStrokeStyle(1, PALETTE.steel).setVisible(false);
    this.bossBarLag = this.add.rectangle(W / 2 - 100, H - 14, 200, 4, PALETTE.chrome, 0.5).setOrigin(0, 0.5).setVisible(false);
    this.bossBar = this.add.rectangle(W / 2 - 100, H - 14, 200, 4, PALETTE.magenta, 1).setOrigin(0, 0.5).setVisible(false);

    this.toast = this.add
      .text(W / 2, H - 52, '', {
        fontFamily: UI_FONT,
        fontSize: '10px',
        color: css(PALETTE.chrome),
        align: 'center',
        backgroundColor: css(PALETTE.void, 0.6),
        padding: { x: 8, y: 4 },
        resolution: 2,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.banner = this.add
      .text(W / 2, 46, '', { fontFamily: UI_FONT, fontSize: '16px', color: css(PALETTE.chrome), resolution: 2 })
      .setOrigin(0.5)
      .setLetterSpacing(4)
      .setShadow(0, 0, css(PALETTE.magenta), 8, false, true)
      .setAlpha(0);

    this.pauseMenu = this.buildMenu('Paused', [
      ['Resume', () => this.session.resume()],
      ['Resync at last relay', () => this.session.retry()],
      ['Quit to title', () => this.session.quit()],
    ]);
    this.gameOver = this.buildGameOver();

    this.session.bus.on('event', this.onEvent);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.session.bus.off('event', this.onEvent);
      this.controls.destroy();
    });
  }

  private buildMenu(title: string, items: [string, () => void][]): Menu {
    const c = this.add.container(0, 0).setDepth(50).setVisible(false);
    c.add(this.add.rectangle(0, 0, W, H, PALETTE.void, 0.72).setOrigin(0));
    c.add(
      this.add
        .text(W / 2, 74, title.toUpperCase(), { fontFamily: UI_FONT, fontSize: '18px', color: css(PALETTE.chrome), resolution: 2 })
        .setOrigin(0.5)
        .setLetterSpacing(5),
    );
    const menu: Menu = { container: c, labels: [], frames: [], pressed: [], targets: [], actions: items.map(([, act]) => act), index: 0 };
    items.forEach(([label], i) => {
      const y = 112 + i * 32;
      const frame = this.add.rectangle(W / 2, y, 200, 26, PALETTE.ink, 0.6).setStrokeStyle(1, PALETTE.steel, 0.6);
      const t = this.add.text(W / 2, y, label, { fontFamily: UI_FONT, fontSize: '12px', color: css(PALETTE.mist), resolution: 2 }).setOrigin(0.5);
      c.add([frame, t]);
      menu.frames.push(frame);
      menu.labels.push(t);
      menu.pressed.push(false);
      menu.targets.push(
        createTapTarget(this, {
          x: W / 2,
          y,
          width: 200,
          height: 30,
          container: c,
          enabled: () => this.menuLive(),
          onFocus: () => {
            menu.index = i;
          },
          onPress: (down) => {
            menu.pressed[i] = down;
          },
          onTap: () => {
            this.session.services.sfx.play('confirm');
            menu.index = 0;
            menu.actions[i]?.();
          },
        }),
      );
    });
    c.add(
      this.add
        .text(W / 2, H - 28, 'Tap an option  -  or Up/Down, Enter/Space confirm, Esc resume', {
          fontFamily: UI_MONO,
          fontSize: '8px',
          color: css(PALETTE.steel),
          resolution: 2,
        })
        .setOrigin(0.5),
    );
    return menu;
  }

  private buildGameOver(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0).setDepth(50).setVisible(false);
    c.add(this.add.rectangle(0, 0, W, H, PALETTE.void, 0.78).setOrigin(0));
    c.add(
      this.add
        .text(W / 2, H / 2 - 52, 'SIGNAL LOST', { fontFamily: UI_FONT, fontSize: '18px', color: css(PALETTE.danger), resolution: 2 })
        .setOrigin(0.5)
        .setLetterSpacing(4)
        .setShadow(0, 0, css(PALETTE.magenta), 8, false, true),
    );
    const buttons: [string, () => void][] = [
      ['Resync at last relay', () => this.session.retry()],
      ['Return to title', () => this.session.quit()],
    ];
    buttons.forEach(([label, action], i) => {
      const y = H / 2 - 14 + i * 34;
      const frame = this.add.rectangle(W / 2, y, 210, 28, PALETTE.ink, 0.6).setStrokeStyle(1, PALETTE.steel, 0.7);
      const t = this.add.text(W / 2, y, label, { fontFamily: UI_FONT, fontSize: '11px', color: css(PALETTE.chrome), resolution: 2 }).setOrigin(0.5);
      c.add([frame, t]);
      this.gameOverFrames.push(frame);
      this.gameOverPressed.push(false);
      this.gameOverTargets.push(
        createTapTarget(this, {
          x: W / 2,
          y,
          width: 210,
          height: 32,
          container: c,
          enabled: () => this.overLive(),
          onPress: (down) => {
            this.gameOverPressed[i] = down;
            frame.setFillStyle(down ? PALETTE.violet : PALETTE.ink, down ? 0.85 : 0.6).setScale(down ? 0.97 : 1);
          },
          onTap: () => {
            this.session.services.sfx.play('confirm');
            action();
          },
        }),
      );
    });
    c.add(
      this.add
        .text(W / 2, H / 2 + 62, 'Enter / Space: resync    Esc: title', { fontFamily: UI_MONO, fontSize: '8px', color: css(PALETTE.steel), resolution: 2 })
        .setOrigin(0.5),
    );
    return c;
  }

  private menuLive(): boolean {
    return this.session.world.flow.state === 'paused' && this.overlayFrames >= 2;
  }

  private overLive(): boolean {
    return this.session.world.flow.state === 'gameover' && this.overlayFrames >= 2;
  }

  private showToast(text: string, seconds = 3.2): void {
    this.toast.setText(text);
    this.toastTimer = seconds;
  }

  private showBanner(text: string): void {
    this.banner.setText(text);
    this.bannerTimer = 2.6;
  }

  private handleEvent(e: GameEvent): void {
    switch (e.type) {
      case 'roomEntered':
        this.showBanner(e.name);
        break;
      case 'checkpoint':
        this.showToast(e.firstTime ? 'Sync relay linked - integrity restored, progress saved' : 'Integrity restored');
        break;
      case 'abilityUnlocked':
        this.showToast('BACKTRACE online\nPress L / V: snap back to your echo (4 s ago) and undo damage taken since', 6);
        break;
      case 'secretFound':
        this.showToast('Integrity Cell installed - +1 max integrity', 4);
        break;
      case 'wallBroken':
        this.showToast('The cracked wall gives way', 2);
        break;
      case 'switchHit':
        this.showToast('OVERRIDE ACCEPTED - gate cycling for 1 second', 1.6);
        break;
      case 'gateLocked':
        this.showToast(
          this.session.world.progression.has('backtrace')
            ? 'Security gate locked - the override switch is back down the line'
            : 'Security gate locked - the override switch is too far to reach in time',
          3,
        );
        break;
      case 'gateLatched':
        this.showToast('Gate bypassed - it will stay open', 2.2);
        break;
      case 'bossStart':
        this.showBanner(e.name);
        break;
      case 'bossPhase':
        this.showToast('BULWARK-9 is overclocking...', 2.5);
        break;
      case 'bossDefeated':
        this.showToast('BULWARK-9 offline', 3);
        break;
      case 'playerHurt':
        this.hurtFlash = 0.25;
        break;
      default:
        break;
    }
  }

  private updateHud(dt: number): void {
    const hud = this.session.world.hud();
    // Integrity cells (health) — top left.
    while (this.cells.length < hud.maxHealth) {
      this.cells.push(this.add.image(12 + this.cells.length * 10, 14, TEX.hudCellFull).setOrigin(0, 0.5));
    }
    this.cells.forEach((img, i) => {
      const visible = i < hud.maxHealth;
      const full = i < hud.health;
      img.setVisible(visible).setTexture(full ? TEX.hudCellFull : TEX.hudCellEmpty);
      const pulse = full && i === hud.health - 1 && hud.health <= 2 ? 0.6 + Math.sin(this.time.now / 120) * 0.4 : 1;
      img.setAlpha(this.hurtFlash > 0 && !full ? 0.5 + Math.sin(this.time.now / 30) * 0.5 : pulse);
    });
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);

    // Backtrace indicator: icon dims and fills from the bottom while cooling down.
    const bx = 14 + hud.maxHealth * 10 + 8;
    this.btIcon.setVisible(hud.hasBacktrace).setPosition(bx, 14).setAlpha(hud.backtraceReady ? 1 : 0.45);
    this.btFill.setVisible(hud.hasBacktrace && hud.backtraceCooldown > 0).setPosition(bx, 22).setSize(16, 16 * hud.backtraceCooldown);
    this.btLabel.setVisible(hud.hasBacktrace).setPosition(bx + 19, 14).setAlpha(hud.backtraceReady ? 0.9 : 0.35);

    // Boss bar.
    const boss = hud.boss;
    const showBoss = !!boss && boss.health > 0;
    for (const o of [this.bossName, this.bossBarBg, this.bossBar, this.bossBarLag]) o.setVisible(showBoss);
    if (boss) {
      const ratio = boss.health / boss.max;
      this.bossLag = Math.max(ratio, this.bossLag - dt * 0.4);
      this.bossName.setText(boss.name.toUpperCase());
      this.bossBar.setSize(200 * ratio, 4).setFillStyle(boss.phase === 2 ? PALETTE.danger : PALETTE.sodium);
      this.bossBarLag.setSize(200 * this.bossLag, 4);
    } else {
      this.bossLag = 1;
    }

    // Toast & banner fades.
    this.toastTimer -= dt;
    this.toast.setAlpha(Math.max(0, Math.min(1, this.toastTimer * 3)));
    this.bannerTimer -= dt;
    this.banner.setAlpha(Math.max(0, Math.min(1, this.bannerTimer * 1.5, (2.6 - this.bannerTimer) * 2)));
  }

  private updateMenu(menu: Menu): void {
    const inp = this.controls;
    const sfx = this.session.services.sfx;
    if (inp.justPressed('up') || inp.justPressed('down')) {
      const n = menu.labels.length;
      menu.index = (menu.index + (inp.justPressed('up') ? n - 1 : 1)) % n;
      sfx.play('menu');
    }
    menu.labels.forEach((l, i) => {
      const sel = i === menu.index;
      const down = menu.pressed[i] === true;
      l.setColor(css(down ? PALETTE.chrome : sel ? PALETTE.cyan : PALETTE.steel)).setScale(down ? 0.97 : 1);
      menu.frames[i]
        ?.setFillStyle(down ? PALETTE.violet : PALETTE.ink, down ? 0.85 : 0.6)
        .setStrokeStyle(1, sel ? PALETTE.cyan : PALETTE.steel, sel ? 0.9 : 0.6)
        .setScale(down ? 0.97 : 1);
    });
    // Ignore input on the frame the overlay opened (the same key press that opened it).
    if (this.overlayFrames < 2) return;
    if (inp.justPressed('back') || inp.justPressed('pause')) {
      this.session.resume();
      return;
    }
    if (inp.justPressed('confirm') || inp.justPressed('attack')) {
      sfx.play('confirm');
      const action = menu.actions[menu.index];
      menu.index = 0;
      action?.();
    }
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.25);
    this.controls.update();
    this.updateHud(dt);

    const state = this.session.world.flow.state;
    const paused = state === 'paused';
    const over = state === 'gameover';
    this.pauseMenu.container.setVisible(paused);
    this.gameOver.setVisible(over);
    this.overlayFrames = paused || over ? this.overlayFrames + 1 : 0;
    // Re-arm the tap targets every time an overlay opens, and drop any press left over from before.
    if (paused && !this.wasPaused) {
      this.pauseMenu.index = 0;
      this.pauseMenu.targets.forEach((t) => t.reset());
    }
    if (over && !this.wasOver) this.gameOverTargets.forEach((t) => t.reset());
    this.wasPaused = paused;
    this.wasOver = over;

    if (paused) this.updateMenu(this.pauseMenu);
    if (over && this.overlayFrames >= 2) {
      if (this.controls.justPressed('confirm') || this.controls.justPressed('attack')) {
        this.session.services.sfx.play('confirm');
        this.session.retry();
      } else if (this.controls.justPressed('back')) {
        this.session.quit();
      }
    }
  }
}
