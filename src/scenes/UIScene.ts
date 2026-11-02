import Phaser from 'phaser';
import { view } from '../config/view';
import { VIEW_CHANGED } from '../render/viewportDom';
import type { GameEvent } from '../core/events';
import { InputManager } from '../input/InputManager';
import { createTapTarget, type TapTarget } from '../input/tapTarget';
import { css, PALETTE, UI_FONT, UI_MONO } from '../render/palette';
import { TEX } from '../render/textures';
import { WTEX } from '../render/worldTextures';
import { getSettings } from '../state/settings';
import { itemName } from '../world/items';
import { SCENES, type Session } from './session';

let W = view.width;
let H = view.height;

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
  // dialogue panel
  private dlg!: Phaser.GameObjects.Container;
  private dlgName!: Phaser.GameObjects.Text;
  private dlgText!: Phaser.GameObjects.Text;
  private dlgHint!: Phaser.GameObjects.Text;
  private dlgChoices: { frame: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; target: TapTarget; index: number }[] = [];
  private dlgSelected = 0;
  private dlgShown = false;
  private dlgSig = '';
  private dlgPanel: { x: number; y: number; w: number; h: number } = { x: 0, y: 0, w: 0, h: 0 };
  // HUD extras
  private scrapText!: Phaser.GameObjects.Text;
  private scrapIcon!: Phaser.GameObjects.Image;
  private trackerText!: Phaser.GameObjects.Text;
  private fpsText!: Phaser.GameObjects.Text;
  private airText!: Phaser.GameObjects.Text;
  private scrapShown = -1;
  private readonly onEvent = (e: GameEvent) => this.handleEvent(e);
  private restartPending = false;
  private readonly onViewChanged = () => {
    this.restartPending = true;
  };

  constructor() {
    super(SCENES.ui);
  }

  init(data: { session: Session }): void {
    W = view.width;
    H = view.height;
    this.session = data.session;
    this.restartPending = false;
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
    this.dlgChoices = [];
    this.dlgShown = false;
    this.dlgSig = '';
    this.dlgSelected = 0;
    this.scrapShown = -1;
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
      ['World map', () => this.session.openMenu('map')],
      ['Journal', () => this.session.openMenu('journal')],
      ['Gear & upgrades', () => this.session.openMenu('gear')],
      ['Settings', () => this.session.openMenu('settings')],
      ['Resync at last relay', () => this.session.retry()],
      ['Quit to title', () => this.session.quit()],
    ]);
    this.buildDialogue();
    this.buildHudExtras();
    this.gameOver = this.buildGameOver();

    this.session.bus.on('event', this.onEvent);
    this.game.events.on(VIEW_CHANGED, this.onViewChanged);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(VIEW_CHANGED, this.onViewChanged);
      this.session.bus.off('event', this.onEvent);
      this.controls.destroy();
    });
  }

  // ------------------------------------------------------------------ dialogue panel

  /** Conversation panel: speaker, text, up to four tappable choices. Sits in the upper-middle so thumbs and touch buttons never cover it. */
  private buildDialogue(): void {
    const m = view.margin;
    const w = Math.min(W - m.left - m.right - 8, 440);
    const h = 104;
    const x = Math.round((W - w) / 2);
    const y = m.top + 46;
    this.dlgPanel = { x, y, w, h };
    const c = this.add.container(0, 0).setDepth(45).setVisible(false);
    c.add(this.add.rectangle(x, y, w, h, PALETTE.void, 0.9).setOrigin(0).setStrokeStyle(1, PALETTE.cyan, 0.8));
    c.add(this.add.rectangle(x, y, w, 14, PALETTE.violet, 0.45).setOrigin(0));
    this.dlgName = this.add.text(x + 8, y + 2, '', { fontFamily: UI_FONT, fontSize: '9px', color: css(PALETTE.chrome), resolution: 2 }).setLetterSpacing(2);
    this.dlgText = this.add.text(x + 8, y + 20, '', { fontFamily: UI_FONT, fontSize: '9px', color: css(PALETTE.chrome), wordWrap: { width: w - 16 }, lineSpacing: 3, resolution: 2 });
    this.dlgHint = this.add.text(x + w - 8, y + h - 10, '', { fontFamily: UI_MONO, fontSize: '7px', color: css(PALETTE.cyan), resolution: 2 }).setOrigin(1, 1);
    c.add([this.dlgName, this.dlgText, this.dlgHint]);
    // Tapping the panel body advances a linear line (choice rows sit on top and take precedence).
    createTapTarget(this, {
      x: x + w / 2, y: y + h / 2, width: w, height: h, container: c,
      enabled: () => this.dlgShown && !this.session.menuOpen() && (this.session.world.hud().dialogue?.choices ?? null) === null,
      onTap: () => this.session.world.advanceDialogue(),
    });
    for (let i = 0; i < 4; i++) {
      const cy = y + h - 12 - (3 - i) * 17;
      const frame = this.add.rectangle(x + 8, cy, w - 16, 15, PALETTE.ink, 0.8).setOrigin(0, 0.5).setStrokeStyle(1, PALETTE.steel, 0.7).setVisible(false);
      const label = this.add.text(x + 14, cy, '', { fontFamily: UI_FONT, fontSize: '9px', color: css(PALETTE.mist), resolution: 2 }).setOrigin(0, 0.5).setVisible(false);
      const slot = { frame, label, index: -1, target: null as unknown as TapTarget };
      slot.target = createTapTarget(this, {
        x: x + w / 2, y: cy, width: w - 16, height: 17, container: c,
        enabled: () => this.dlgShown && slot.index >= 0 && !this.session.menuOpen(),
        onFocus: () => {
          const k = this.dlgChoices.indexOf(slot);
          if (k >= 0) this.dlgSelected = k;
        },
        onTap: () => {
          this.session.services.sfx.play('confirm');
          this.session.world.chooseDialogue(slot.index);
        },
      });
      c.add([frame, label]);
      this.dlgChoices.push(slot);
    }
    this.dlg = c;
  }

  private updateDialogue(): void {
    const hud = this.session.world.hud();
    const d = hud.dialogue;
    const show = !!d && this.session.world.flow.state === 'playing';
    this.dlg.setVisible(show);
    this.dlgShown = show;
    if (!show || !d) {
      this.dlgSig = '';
      return;
    }
    const sig = `${d.speaker}|${d.text}|${d.choices?.map((c) => c.index).join(',') ?? ''}`;
    if (sig !== this.dlgSig) {
      this.dlgSig = sig;
      this.dlgSelected = 0;
      this.dlgName.setText((d.speaker || '').toUpperCase());
      this.dlgText.setText(d.text);
      const choices = d.choices ?? [];
      const textLines = this.dlgText.height;
      // Place choices bottom-aligned; hide unused rows.
      const { x, y, h } = this.dlgPanel;
      void x;
      this.dlgChoices.forEach((slot, i) => {
        const k = i - (4 - choices.length);
        const c = k >= 0 ? choices[k] : undefined;
        slot.index = c ? c.index : -1;
        slot.frame.setVisible(!!c);
        slot.label.setVisible(!!c).setText(c ? c.text : '');
        const cy = y + h - 12 - (3 - i) * 17;
        slot.frame.setY(cy);
        slot.label.setY(cy);
      });
      this.dlgHint.setText(d.choices ? 'Tap a choice  /  Up Down + Enter' : d.last ? 'Tap / TLK: close' : 'Tap / TLK: continue');
      void textLines;
    }
    // Keyboard / gamepad selection for choices.
    if (d.choices) {
      const visible = this.dlgChoices.filter((s) => s.index >= 0);
      const inp = this.controls;
      if (inp.justPressed('up')) this.dlgSelected = (this.dlgSelected + visible.length - 1) % visible.length;
      if (inp.justPressed('down')) this.dlgSelected = (this.dlgSelected + 1) % visible.length;
      visible.forEach((s, i) => {
        const sel = i === this.dlgSelected;
        s.frame.setStrokeStyle(1, sel ? PALETTE.cyan : PALETTE.steel, sel ? 1 : 0.6).setFillStyle(sel ? PALETTE.violet : PALETTE.ink, sel ? 0.6 : 0.8);
        s.label.setColor(css(sel ? PALETTE.chrome : PALETTE.mist));
      });
      if (inp.justPressed('confirm') || inp.justPressed('interact')) {
        const s = visible[this.dlgSelected];
        if (s) {
          this.session.services.sfx.play('confirm');
          this.session.world.chooseDialogue(s.index);
        }
      }
    }
  }

  // ------------------------------------------------------------------ extra HUD

  private buildHudExtras(): void {
    const m = view.margin;
    this.scrapIcon = this.add.image(m.left + 6, m.top + 24, WTEX.iconScrap).setScale(0.5).setOrigin(0.5);
    this.scrapText = this.add.text(m.left + 14, m.top + 24, '0', { fontFamily: UI_MONO, fontSize: '8px', color: css(PALETTE.sodium), resolution: 2 }).setOrigin(0, 0.5);
    this.trackerText = this.add
      .text(W / 2, m.top + 8, '', { fontFamily: UI_FONT, fontSize: '8px', color: css(PALETTE.chrome), backgroundColor: css(PALETTE.void, 0.45), padding: { x: 5, y: 2 }, resolution: 2 })
      .setOrigin(0.5)
      .setAlpha(0.85);
    this.fpsText = this.add.text(W - m.right - 6, m.top + 48, '', { fontFamily: UI_MONO, fontSize: '8px', color: css(PALETTE.mist), resolution: 2 }).setOrigin(1, 0);
    this.airText = this.add.text(0, 0, '', { fontFamily: UI_MONO, fontSize: '7px', color: css(PALETTE.sodium), resolution: 2 }).setOrigin(0, 0.5);
  }

  private updateHudExtras(): void {
    const hud = this.session.world.hud();
    if (hud.scrap !== this.scrapShown) {
      if (this.scrapShown >= 0 && hud.scrap > this.scrapShown) this.tweens.add({ targets: [this.scrapText, this.scrapIcon], scale: { from: 1.25, to: 1 }, duration: 160 });
      this.scrapShown = hud.scrap;
      this.scrapText.setText(String(hud.scrap));
    }
    const t = hud.tracked;
    this.trackerText.setText(t ? `${t.title}: ${t.text}` : '').setVisible(!!t && this.session.world.flow.state === 'playing' && !hud.boss);
    const s = getSettings();
    this.fpsText.setVisible(s.showFps).setText(s.showFps ? `${Math.round(this.game.loop.actualFps)} fps` : '');
    // Kinetic Coil indicator sits after the Backtrace label.
    const hy = view.margin.top + 8;
    const bx = view.margin.left + 4 + hud.maxHealth * 10 + 8 + 19 + 44;
    this.airText.setVisible(hud.hasAirJump).setText('COIL').setPosition(bx, hy);
  }

  private buildMenu(title: string, items: [string, () => void][]): Menu {
    const c = this.add.container(0, 0).setDepth(50).setVisible(false);
    c.add(this.add.rectangle(0, 0, W, H, PALETTE.void, 0.72).setOrigin(0));
    c.add(
      this.add
        .text(W / 2, 36, title.toUpperCase(), { fontFamily: UI_FONT, fontSize: '18px', color: css(PALETTE.chrome), resolution: 2 })
        .setOrigin(0.5)
        .setLetterSpacing(5),
    );
    const menu: Menu = { container: c, labels: [], frames: [], pressed: [], targets: [], actions: items.map(([, act]) => act), index: 0 };
    items.forEach(([label], i) => {
      const y = 66 + i * 26;
      const frame = this.add.rectangle(W / 2, y, 200, 22, PALETTE.ink, 0.6).setStrokeStyle(1, PALETTE.steel, 0.6);
      const t = this.add.text(W / 2, y, label, { fontFamily: UI_FONT, fontSize: '11px', color: css(PALETTE.mist), resolution: 2 }).setOrigin(0.5);
      c.add([frame, t]);
      menu.frames.push(frame);
      menu.labels.push(t);
      menu.pressed.push(false);
      menu.targets.push(
        createTapTarget(this, {
          x: W / 2,
          y,
          width: 200,
          height: 24,
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
        .text(W / 2, H - 14, 'Tap an option  -  or Up/Down, Enter/Space confirm, Esc resume', {
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
    return this.session.world.flow.state === 'paused' && this.overlayFrames >= 2 && !this.session.menuOpen();
  }

  private overLive(): boolean {
    return this.session.world.flow.state === 'gameover' && this.overlayFrames >= 2 && !this.session.menuOpen();
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
        if (e.ability === 'backtrace') this.showToast('BACKTRACE online\nREW / L / V: snap back to your echo and undo damage taken since. The world does not rewind.', 6);
        else if (e.ability === 'air-jump') this.showToast('KINETIC COIL installed\nPress jump again in mid-air for a second jump', 5);
        else this.showToast('GLITCH STRIKE online\nHold ATK to charge a piercing heavy strike', 5);
        break;
      case 'questUpdated':
        this.showToast(e.status === 'started' ? `New quest: ${e.text}` : e.status === 'complete' ? `Quest ready: ${e.text}` : e.status === 'turnedIn' ? `Quest complete: ${e.text}` : e.text, e.status === 'progress' ? 2.4 : 3.6);
        break;
      case 'itemGained':
        this.showToast(`Got ${itemName(e.item)}`, 2.4);
        break;
      case 'upgradeGained':
        this.showToast(`Upgrade installed (level ${e.level})`, 3);
        break;
      case 'loreFound':
        this.showToast(`${e.title}\n${e.text.length > 130 ? `${e.text.slice(0, 127)}...` : e.text}`, 7);
        break;
      case 'doorLocked':
        this.showToast(e.hint, 3.4);
        break;
      case 'nodePowered':
        this.showToast('Power node online', 1.8);
        break;
      case 'plateChanged':
        break;
      case 'gameCompleted':
        this.showToast('THE NULL unravels...', 4);
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
        this.showToast(`Phase ${e.phase}: the enemy changes tactics`, 2.5);
        break;
      case 'bossDefeated':
        this.showToast('Enemy offline', 3);
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
      this.cells.push(this.add.image(view.margin.left + 2 + this.cells.length * 10, view.margin.top + 8, TEX.hudCellFull).setOrigin(0, 0.5));
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
    const hy = view.margin.top + 8;
    const bx = view.margin.left + 4 + hud.maxHealth * 10 + 8;
    this.btIcon.setVisible(hud.hasBacktrace).setPosition(bx, hy).setAlpha(hud.backtraceReady ? 1 : 0.45);
    this.btFill.setVisible(hud.hasBacktrace && hud.backtraceCooldown > 0).setPosition(bx, hy + 8).setSize(16, 16 * hud.backtraceCooldown);
    this.btLabel.setVisible(hud.hasBacktrace).setPosition(bx + 19, hy).setAlpha(hud.backtraceReady ? 0.9 : 0.35);

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
    if (this.restartPending) {
      this.restartPending = false;
      this.scene.restart({ session: this.session });
      return;
    }
    const dt = Math.min(deltaMs / 1000, 0.25);
    this.controls.update();
    this.updateHud(dt);
    this.updateHudExtras();
    this.updateDialogue();

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

    if (paused && !this.session.menuOpen()) this.updateMenu(this.pauseMenu);
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
