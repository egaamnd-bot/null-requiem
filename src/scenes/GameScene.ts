import Phaser from 'phaser';
import { applyRenderScale } from '../render/renderScaleRuntime';
import { SIM } from '../config/tuning';
import { view } from '../config/view';
import { VIEW_CHANGED } from '../render/viewportDom';
import type { Body } from '../core/body';
import { CameraFollow } from '../core/camera';
import { FixedStepper } from '../core/fixedStep';
import { InputLatch } from '../core/input';
import { saveProgression } from '../core/progression';
import { GameWorld } from '../core/world';
import { InputManager } from '../input/InputManager';
import { BossView, EchoView, EnemyViewRegistry, NpcView, PanoptixView, PlayerView, ProjectileViews, type RenderPos } from '../render/ActorViews';
import { InteractViews, PatternBossView } from '../render/CampaignViews';
import { themeFor } from '../audio/musicTheory';
import { CombatTracker, FootstepTracker } from '../audio/triggers';
import { collectedRecords } from '../ui/menuModel';
import { MENU_SCENE, type MenuTab } from './MenuScene';
import { Fx } from '../render/Fx';
import { DEPTH, RoomView } from '../render/RoomView';
import { TEX } from '../render/textures';
import { ROOMS, START_ROOM } from '../world/rooms';
import { virtualButtons } from '../input/virtualButtons';
import { MOBILE_SCENE } from './MobileControlsScene';
import { SCENES, type GameSceneData, type Services, type Session, type VictoryData } from './session';

/** Teleports larger than this are not interpolated (room entry, respawn, hazard return). */
const SNAP_DISTANCE = 24;

/**
 * Runs the simulation on a fixed timestep and keeps the presentation in sync with it.
 * Gameplay rules live in `core/`; this scene only wires input → world → views/FX/audio.
 */
export class GameScene extends Phaser.Scene {
  private services!: Services;
  private world!: GameWorld;
  private controls!: InputManager;
  private readonly latch = new InputLatch();
  private readonly stepper = new FixedStepper(1 / SIM.stepHz, SIM.maxFrameDelta);
  private camFollow!: CameraFollow;
  private vignette!: Phaser.GameObjects.Image;
  private roomView: RoomView | null = null;
  private playerView!: PlayerView;
  // Audio-only observers: they read events/state and never feed back into the simulation.
  private readonly combatTracker = new CombatTracker();
  private readonly footsteps = new FootstepTracker();
  private lastBacktraceCooldown = 0;
  private echoView!: EchoView;
  private enemyViews!: EnemyViewRegistry;
  private projectileViews!: ProjectileViews;
  private bossView: BossView | null = null;
  private panoptixView: PanoptixView | null = null;
  private pbossView: PatternBossView | null = null;
  private interactViews: InteractViews | null = null;
  private npcViews: NpcView[] = [];
  private fx!: Fx;
  private bus!: Phaser.Events.EventEmitter;
  private builtRoomVersion = -1;
  private transitioning = false;
  private hitstop = 0;
  private ended = false;
  private sessionRef!: Session;
  private readonly prevPos = new Map<Body, RenderPos>();

  constructor() {
    super(SCENES.game);
  }

  init(data: GameSceneData): void {
    this.services = data.services;
    this.world = new GameWorld(ROOMS, data.progression, {
      startRoom: START_ROOM,
      onSave: (p) => saveProgression(this.services.store, p),
    });
    this.builtRoomVersion = -1;
    this.transitioning = false;
    this.hitstop = 0;
    this.ended = false;
    this.prevPos.clear();
    this.stepper.reset();
  }

  create(): void {
    applyRenderScale(this);
    this.cameras.main.setBackgroundColor(0x05060c);
    this.cameras.main.setRoundPixels(true);
    this.controls = new InputManager(this);
    this.controls.swallow();
    this.latch.reset(this.controls.held());
    this.bus = new Phaser.Events.EventEmitter();
    this.camFollow = new CameraFollow(view.width, view.height, { width: view.width, height: view.height });

    this.playerView = new PlayerView(this);
    this.echoView = new EchoView(this);
    this.enemyViews = new EnemyViewRegistry(this);
    this.projectileViews = new ProjectileViews(this);
    this.fx = new Fx(this);
    this.vignette = this.add.image(0, 0, TEX.vignette).setOrigin(0).setDisplaySize(view.width, view.height).setScrollFactor(0).setDepth(DEPTH.vignette);
    this.game.events.on(VIEW_CHANGED, this.onViewChanged, this);

    this.world.start();
    this.syncRoom();

    const session: Session = this.sessionRef = {
      world: this.world,
      services: this.services,
      bus: this.bus,
      pause: () => this.pause(),
      resume: () => this.resume(),
      retry: () => this.retry(),
      quit: () => this.quit(),
      openMenu: (tab, vendorId) => this.openMenu(tab, vendorId),
      menuOpen: () => this.scene.isActive(MENU_SCENE),
    };
    this.scene.launch(SCENES.ui, { session });
    this.scene.launch(MOBILE_SCENE, {
      isActive: () => this.world.flow.state === 'playing' && !this.transitioning,
      onPause: () => this.pause(),
    });

    this.combatTracker.reset();
    this.footsteps.reset();
    this.lastBacktraceCooldown = 0;
    const onBlur = () => this.pause();
    this.game.events.on(Phaser.Core.Events.BLUR, onBlur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, onBlur);
      this.game.events.off(VIEW_CHANGED, this.onViewChanged, this);
      this.scene.stop(MOBILE_SCENE);
      this.services.music.setCombat(0);
      this.controls.destroy();
      this.roomView?.destroy();
      this.roomView = null;
      this.enemyViews.clear();
      this.projectileViews.clear();
      this.bossView?.destroy();
      this.bossView = null;
      this.panoptixView?.destroy();
      this.panoptixView = null;
      this.pbossView?.destroy();
      this.pbossView = null;
      this.interactViews?.destroy();
      this.interactViews = null;
      this.scene.stop(MENU_SCENE);
      for (const v of this.npcViews) v.destroy();
      this.npcViews = [];
      this.playerView.destroy();
      this.echoView.destroy();
      this.fx.destroy();
      this.bus.removeAllListeners();
    });

    this.cameras.main.fadeIn(500, 5, 6, 12);
    this.exposeDebugHandle();
  }

  /** Window / orientation / immersive-mode change: refit camera, parallax layers and vignette. */
  private onViewChanged(): void {
    this.camFollow.setView(view.width, view.height);
    this.vignette.setDisplaySize(view.width, view.height);
    this.roomView?.resize(view.width, view.height);
    this.camFollow.snap(this.world.player.centerX, this.world.player.centerY, this.world.player.facing);
  }

  // ------------------------------------------------------------------ flow actions

  /** Open the tabbed menu over the (paused) game. Vendors pause the world themselves. */
  private openMenu(tab: MenuTab, vendorId?: string): void {
    if (this.scene.isActive(MENU_SCENE)) return;
    const fromPause = this.world.flow.state === 'paused';
    if (!fromPause && !this.world.pause()) return;
    this.fx.setPaused(true);
    this.scene.launch(MENU_SCENE, {
      services: this.services,
      session: this.sessionRef,
      tab,
      ...(vendorId ? { vendorId } : {}),
      onClose: () => {
        // Closing a menu opened from the pause screen returns to it; a vendor resumes play.
        if (!fromPause) this.resume();
      },
    });
  }

  /** Footsteps, Backtrace-ready chime and the combat signal for layered music. Read-only: nothing here touches the simulation. */
  private updateAudioObservers(now: number, dt: number): void {
    const w = this.world;
    const p = w.player;
    const sfx = this.services.sfx;
    if (this.footsteps.update(dt, { onGround: p.body.onGround, vx: p.body.vx, active: w.flow.state === 'playing' && !p.dead && !p.isDashing && !w.inDialogue })) sfx.play('footstep');
    const cd = w.backtrace.cooldown;
    if (this.lastBacktraceCooldown > 0 && cd <= 0 && w.progression.has('backtrace') && !p.dead) sfx.play('btReady');
    this.lastBacktraceCooldown = cd;
    this.services.music.setCombat(this.combatTracker.update(now, dt));
  }

  private pause(): void {
    if (this.world.pause()) {
      this.fx.setPaused(true);
      this.services.sfx.playOr('uiPause', 'menu');
    }
  }

  private resume(): void {
    if (this.world.resume()) {
      this.fx.setPaused(false);
      this.controls.swallow();
      this.latch.reset(this.controls.held());
    }
  }

  private retry(): void {
    if (this.transitioning) return;
    const state = this.world.flow.state;
    if (state !== 'gameover' && state !== 'paused') return;
    this.transitioning = true;
    this.cameras.main.fadeOut(260, 5, 6, 12);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.world.retry();
      this.fx.setPaused(false);
      this.syncRoom();
      this.controls.swallow();
      this.latch.reset(this.controls.held());
      this.cameras.main.fadeIn(320, 5, 6, 12);
      this.transitioning = false;
    });
  }

  private quit(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.world.quitToTitle();
    this.cameras.main.fadeOut(300, 5, 6, 12);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop(SCENES.ui);
      this.scene.start(SCENES.title, { services: this.services });
    });
  }

  private startDoorTransition(): void {
    this.transitioning = true;
    this.cameras.main.fadeOut(160, 5, 6, 12);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.world.completeTransition();
      this.syncRoom();
      this.latch.clearPresses();
      this.cameras.main.fadeIn(220, 5, 6, 12);
      this.transitioning = false;
    });
  }

  private finish(): void {
    this.ended = true;
    const p = this.world.progression;
    const rec = collectedRecords(ROOMS, p);
    const journal = this.world.quests.journal();
    const data: VictoryData = {
      services: this.services,
      playTime: p.playTime,
      deaths: p.deaths,
      secretsFound: p.secrets.size,
      secretsTotal: 2,
      rooms: p.visitedRooms.size,
      roomsTotal: ROOMS.length,
      records: rec.entries.length,
      recordsTotal: rec.total,
      questsDone: journal.filter((q) => q.status === 'turnedIn').length,
      questsTotal: this.world.content.quests.length,
      scrap: p.scrap,
    };
    // The slice is complete: clear the save so the title offers a fresh journey.
    this.services.store.clear();
    this.cameras.main.fadeOut(1200, 200, 240, 255);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop(SCENES.ui);
      this.scene.start(SCENES.victory, data);
    });
  }

  // ------------------------------------------------------------------ room views

  /** Rebuild room-bound views whenever the simulation has loaded a (new) room. */
  private syncRoom(): void {
    if (this.world.roomVersion === this.builtRoomVersion) return;
    this.builtRoomVersion = this.world.roomVersion;
    this.roomView?.destroy();
    this.enemyViews.clear();
    this.projectileViews.clear();
    this.bossView?.destroy();
    this.bossView = null;
    this.panoptixView?.destroy();
    this.panoptixView = null;
    this.pbossView?.destroy();
    this.pbossView = null;
    this.interactViews?.destroy();
    for (const v of this.npcViews) v.destroy();
    this.npcViews = [];
    this.prevPos.clear();

    const room = this.world.room;
    this.roomView = new RoomView(this, this.world);
    if (room.boss) this.bossView = new BossView(this);
    if (room.panoptix) this.panoptixView = new PanoptixView(this);
    if (room.pboss) this.pbossView = new PatternBossView(this, room.pboss);
    this.interactViews = new InteractViews(this, room.interact);
    this.npcViews = room.npcs.map((npc) => new NpcView(this, npc));
    const w = room.grid.widthPx;
    const h = room.grid.heightPx;
    this.fx.setRoom(w, h);
    this.camFollow.setBounds({ width: w, height: h });
    const p = this.world.player;
    this.camFollow.snap(p.centerX, p.centerY, p.facing);
    this.cameras.main.setScroll(this.camFollow.x, this.camFollow.y);
  }

  // ------------------------------------------------------------------ frame loop

  private bodies(): Body[] {
    const room = this.world.room;
    const list: Body[] = [this.world.player.body];
    for (const e of room.enemies) list.push(e.body);
    if (room.boss) list.push(room.boss.body);
    return list;
  }

  private renderPos(body: Body, alpha: number): RenderPos {
    const prev = this.prevPos.get(body);
    if (!prev || Math.abs(prev.x - body.x) > SNAP_DISTANCE || Math.abs(prev.y - body.y) > SNAP_DISTANCE) {
      return { x: body.x, y: body.y };
    }
    return { x: prev.x + (body.x - prev.x) * alpha, y: prev.y + (body.y - prev.y) * alpha };
  }

  override update(time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, SIM.maxFrameDelta);
    const world = this.world;
    this.controls.update();

    if (this.controls.justPressed('mute')) this.services.sfx.toggleMute();
    if (world.flow.state === 'playing' && !this.transitioning && this.controls.justPressed('pause')) {
      this.pause();
    }
    if (world.flow.state === 'playing' && !this.transitioning && this.controls.justPressed('interact')) {
      this.latch.pressInteract();
    }

    this.latch.sample(this.controls.held());

    if (!this.transitioning && world.flow.simulating) {
      if (this.hitstop > 0) {
        this.hitstop = Math.max(0, this.hitstop - dt);
      } else {
        this.stepper.advance(dt, (stepDt) => {
          for (const b of this.bodies()) this.prevPos.set(b, { x: b.x, y: b.y });
          world.step(this.latch.consume(), stepDt);
        });
      }
    }

    for (const e of world.drainEvents()) {
      this.fx.handle(e);
      this.services.sfx.handle(e);
      this.combatTracker.note(e, time / 1000);
      if (e.type === 'playerLand') this.playerView.onLand(e.heavy);
      if (e.type === 'playerJump') this.playerView.onJump();
      if (e.type === 'backtrace') this.playerView.trigger('backtrace');
      if (e.type === 'playerJump' && e.air) this.playerView.trigger('airjump');
      if (e.type === 'dialogueOpened') this.playerView.trigger('interact');
      if (e.type === 'playerDied') this.playerView.trigger('death');
      if (e.type === 'vendorOpened') this.openMenu('vendor', e.vendorId);
      this.bus.emit('event', e);
    }
    this.services.ambience.setRegion(world.room.def.region ?? null);
    this.services.music.setTheme(
      themeFor(world.room.def.region, {
        inGame: true,
        bossActive: !!((world.room.boss && world.room.boss.isActive) || (world.room.pboss && world.room.pboss.isActive) || (world.room.panoptix && world.room.panoptix.state !== 'intro' && !world.room.panoptix.defeated)),
        finalBoss: world.room.pbossFinal,
      }),
    );
    this.hitstop = Math.max(this.hitstop, this.fx.takeHitstop());

    this.syncRoom();
    if (world.pendingTransition && !this.transitioning) this.startDoorTransition();
    if (world.flow.state === 'victory' && !this.ended) this.finish();

    // --- presentation sync ---
    const alpha = this.hitstop > 0 ? 1 : this.stepper.alpha;
    const room = world.room;
    const player = world.player;
    const ppos = this.renderPos(player.body, alpha);
    this.playerView.update(player, ppos, dt, time);
    this.updateAudioObservers(time / 1000, dt);
    this.echoView.update(world, time);
    this.enemyViews.sync(room.enemies, (en) => this.renderPos(en.body, alpha), time);
    if (room.boss && this.bossView) this.bossView.update(room.boss, this.renderPos(room.boss.body, alpha), time);
    if (room.panoptix && this.panoptixView) this.panoptixView.update(room.panoptix, time);
    const promptIdx = world.promptNpcIndex();
    this.npcViews.forEach((v, i) => v.update(room.activeNpcIndex === i, time, promptIdx === i ? room.npcs[i]?.verb ?? null : null));
    if (room.pboss && this.pbossView) this.pbossView.update(room.pboss, time);
    this.interactViews?.update(time);
    this.projectileViews.sync(room.projectiles, time);

    if (world.flow.simulating && !this.transitioning) {
      this.camFollow.update(ppos.x + player.body.w / 2, ppos.y + player.body.h / 2, player.facing, dt);
    }
    this.cameras.main.setScroll(this.camFollow.x, this.camFollow.y);
    this.roomView?.update(time, this.cameras.main);
  }

  /**
   * Read-only handle used by automated browser smoke tests and for debugging in the console.
   * Game code never reads it.
   */
  private exposeDebugHandle(): void {
    if (typeof window === 'undefined') return;
    (window as unknown as { nullRequiem?: unknown }).nullRequiem = {
      world: this.world,
      scene: this,
      virtualButtons,
    };
  }
}
