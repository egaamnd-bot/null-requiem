import Phaser from 'phaser';
import type { Enemy } from '../core/enemies/enemy';
import type { HeavyEnforcer } from '../core/enemies/heavyEnforcer';
import type { PhaseStalker } from '../core/enemies/phaseStalker';
import type { SentryTurret } from '../core/enemies/sentryTurret';
import type { StreetScavenger } from '../core/enemies/streetScavenger';
import type { PatternBoss } from '../core/bosses/patternBoss';
import type { TheNull } from '../core/bosses/theNull';
import type { InteractableSystem } from '../core/interactables';
import { TILE_SIZE } from '../config/tuning';
import { AssetSprite } from './assetRuntime';
import { PALETTE } from './palette';
import { DEPTH } from './RoomView';
import { WTEX } from './worldTextures';

export interface RenderPos {
  x: number;
  y: number;
}

/** Asset id per enemy kind (the manifest owns the sprite sheets). */
export const ENEMY_ASSET: Readonly<Record<string, string>> = {
  streetScavenger: 'enemy_street_scavenger',
  heavyEnforcer: 'enemy_heavy_enforcer',
  phaseStalker: 'enemy_phase_stalker',
  sentryTurret: 'enemy_sentry_turret',
  nullEcho: 'enemy_null_echo',
};

const flash = (img: Phaser.GameObjects.Image, on: boolean, color: number = PALETTE.white): void => {
  if (on) img.setTint(color).setTintMode(Phaser.TintModes.FILL);
  else img.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
};

export interface CampaignEnemyView {
  update(e: Enemy, pos: RenderPos, time: number): void;
  destroy(): void;
}

/** Generic manifest-driven enemy view: state -> animation, elite outline, armour clang, aim line for turrets. */
export class ManifestEnemyView implements CampaignEnemyView {
  private readonly sprite: AssetSprite;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly aim: Phaser.GameObjects.Graphics | null;
  private readonly crown: Phaser.GameObjects.Image | null = null;
  private clangTimer = 0;
  private lastBlocked = false;

  constructor(scene: Phaser.Scene, kind: string, elite: boolean) {
    const asset = ENEMY_ASSET[kind];
    if (!asset) throw new Error(`No asset for enemy kind ${kind}`);
    this.sprite = new AssetSprite(scene, asset, DEPTH.enemies);
    const tint = kind === 'nullEcho' ? PALETTE.cyan : kind === 'phaseStalker' ? PALETTE.violet : kind === 'sentryTurret' ? PALETTE.danger : PALETTE.sodium;
    this.glow = scene.add.image(0, 0, 'fx-glow').setTint(elite ? PALETTE.magenta : tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.enemies - 1).setAlpha(elite ? 0.55 : 0.22);
    this.aim = kind === 'sentryTurret' ? scene.add.graphics().setDepth(DEPTH.enemies + 1) : null;
    if (elite) this.crown = scene.add.image(0, 0, 'fx-spark').setTint(PALETTE.magenta).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.enemies + 2).setScale(1.6);
  }

  update(e: Enemy, pos: RenderPos, time: number): void {
    const b = e.body;
    const t = time / 1000;
    const cx = Math.round(pos.x + b.w / 2);
    const cy = Math.round(pos.y + b.h / 2);
    const feet = Math.round(pos.y + b.h);
    const sprite = this.sprite;
    const moving = Math.abs(b.vx) > 6;
    let anim = Object.keys(sprite.def.anims)[0] as string;
    let clock = t;
    let alpha = 1;
    let rotation = 0;
    const st = e.state as string;

    switch (e.kind) {
      case 'streetScavenger': {
        const s = e as StreetScavenger;
        anim = st === 'windup' || st === 'throw' ? 'windup' : st === 'strike' || st === 'combo' ? 'strike' : st === 'stagger' ? 'hurt' : moving || st === 'chase' ? 'walk' : 'idle';
        if (anim === 'windup') clock = s.windupProgress * (sprite.def.anims['windup']?.frames ?? 1) / (sprite.def.anims['windup']?.fps ?? 1) * 0.999;
        break;
      }
      case 'heavyEnforcer': {
        const h = e as HeavyEnforcer;
        anim = st === 'windup' || st === 'slam2gap' ? 'windup' : st === 'slam' || st === 'slam2' ? 'slam' : st === 'recover' ? 'recover' : st === 'stagger' ? 'hurt' : moving ? 'walk' : 'idle';
        if (anim === 'windup') clock = h.windupProgress * 0.999 * (sprite.def.anims['windup']?.frames ?? 1) / (sprite.def.anims['windup']?.fps ?? 1);
        break;
      }
      case 'phaseStalker': {
        const p = e as PhaseStalker;
        anim = p.phased ? 'blink' : st === 'windup' ? 'windup' : st === 'strike' ? 'strike' : st === 'recover' ? 'recover' : st === 'stagger' ? 'hurt' : 'lurk';
        alpha = p.phased ? (st === 'blinkOut' ? 0.25 : 0.55) : st === 'lurk' ? 0.8 : 1;
        if (anim === 'blink') clock = (e.stateTime * 18) / 18;
        break;
      }
      case 'sentryTurret': {
        const tr = e as SentryTurret;
        anim = st === 'lock' ? 'lock' : st === 'burst' ? 'fire' : st === 'vent' ? 'vent' : 'idle';
        if (anim === 'lock') clock = tr.lockProgress * 0.999 * (sprite.def.anims['lock']?.frames ?? 1) / (sprite.def.anims['lock']?.fps ?? 1);
        rotation = tr.aim;
        break;
      }
      case 'nullEcho':
        anim = st === 'stagger' ? 'hurt' : 'float';
        alpha = st === 'dormant' ? 0.35 : 0.65 + Math.sin(t * 9) * 0.15;
        break;
      default:
        break;
    }
    sprite.show(anim, clock, e.facing < 0 && e.kind !== 'sentryTurret');
    const image = sprite.image;
    image.setPosition(cx, e.kind === 'sentryTurret' || e.kind === 'nullEcho' ? cy : feet).setAlpha(alpha).setRotation(rotation);
    if (e.kind === 'sentryTurret') image.setFlipX(false);
    // Armour clang and hit flash.
    if (e.blocked && !this.lastBlocked) this.clangTimer = 0.12;
    this.lastBlocked = e.blocked;
    this.clangTimer = Math.max(0, this.clangTimer - 0.016);
    flash(image, e.flash > 0 || this.clangTimer > 0, this.clangTimer > 0 ? PALETTE.sodium : PALETTE.white);
    this.glow.setPosition(cx, cy).setScale(e.kind === 'heavyEnforcer' ? 1.1 : 0.7);
    if (this.crown) this.crown.setPosition(cx, cy - b.h / 2 - 8).setAlpha(0.6 + Math.sin(t * 8) * 0.3);

    // Turret aim line during the lock (and a short afterglow while it fires).
    if (this.aim && e.kind === 'sentryTurret') {
      const tr = e as SentryTurret;
      this.aim.clear();
      if (st === 'lock' || st === 'burst') {
        const a = tr.lockedAngle;
        const p = st === 'lock' ? tr.lockProgress : 1;
        this.aim.lineStyle(1.2, PALETTE.danger, 0.25 + 0.6 * p);
        this.aim.beginPath();
        this.aim.moveTo(cx, cy);
        this.aim.lineTo(cx + Math.cos(a) * 140, cy + Math.sin(a) * 140);
        this.aim.strokePath();
      }
    }
  }

  destroy(): void {
    this.sprite.destroy();
    this.glow.destroy();
    this.aim?.destroy();
    this.crown?.destroy();
  }
}

// ---------------------------------------------------------------------------------------------- pattern bosses

const BOSS_ASSET: Readonly<Record<string, string>> = { kiln7: 'boss_kiln_7', theNull: 'boss_the_null' };

/** KILN-7 / THE NULL: sprite per stage, plus telegraphed hazards and marks drawn from the boss's own data. */
export class PatternBossView {
  private readonly sprite: AssetSprite;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly echoImg: Phaser.GameObjects.Image;
  private readonly markImgs: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, boss: PatternBoss) {
    const asset = BOSS_ASSET[boss.kind];
    if (!asset) throw new Error(`No asset for boss ${boss.kind}`);
    this.sprite = new AssetSprite(scene, asset, DEPTH.enemies);
    this.glow = scene.add.image(0, 0, 'fx-glow-soft').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.enemies - 1);
    this.gfx = scene.add.graphics().setDepth(DEPTH.projectiles - 1);
    this.echoImg = scene.add.image(0, 0, WTEX.echoMark).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.enemies + 2).setScale(0.5).setVisible(false);
    void this.markImgs;
  }

  update(boss: PatternBoss, time: number): void {
    const t = time / 1000;
    const cx = boss.centerX;
    const cy = boss.centerY;
    const isNull = boss.kind === 'theNull';
    let anim = 'idle';
    let clock = t;
    let alpha = 1;
    switch (boss.stage) {
      case 'dormant':
      case 'intro':
        alpha = boss.stage === 'dormant' ? 0.7 : 0.7 + 0.3 * Math.min(1, boss.stageTime / 1.2);
        break;
      case 'telegraph':
        anim = 'telegraph';
        clock = boss.stageTime;
        break;
      case 'active':
        anim = isNull ? (boss.attack?.name === 'rewind' ? 'rewind' : 'attack') : 'active';
        clock = boss.stageTime;
        break;
      case 'exposed':
        anim = 'exposed';
        break;
      case 'dying':
      case 'dead':
        anim = 'death';
        clock = boss.stageTime * 6;
        alpha = boss.stage === 'dead' ? 0 : Math.max(0.15, 1 - boss.stageTime / (isNull ? 3 : 2.2));
        break;
      default:
        break;
    }
    if (boss.flash > 0 && this.sprite.def.anims['hurt']) anim = 'hurt';
    this.sprite.show(anim, clock, boss.facing < 0 && isNull);
    const feetY = isNull ? cy : boss.body.y + boss.body.h;
    this.sprite.image.setPosition(Math.round(cx), Math.round(isNull ? cy : feetY)).setAlpha(alpha);
    flash(this.sprite.image, boss.flash > 0);
    const hot = boss.stage === 'exposed' ? 0.9 : boss.stage === 'telegraph' ? 0.6 : 0.3;
    this.glow
      .setPosition(cx, cy)
      .setTint(isNull ? PALETTE.magenta : 0xff6a2e)
      .setAlpha(alpha * hot)
      .setScale(isNull ? 2.4 : 3);

    // Hazards and marks.
    const g = this.gfx;
    g.clear();
    for (const h of boss.hazards) {
      const r = h.rect;
      if (h.state === 'telegraph') {
        const pulse = 0.25 + 0.2 * Math.sin(t * 22);
        g.fillStyle(PALETTE.danger, pulse);
        g.fillRect(r.x, r.y, r.w, r.h);
        g.lineStyle(1, PALETTE.danger, 0.9);
        g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      } else {
        const col = h.style === 'spike' || h.style === 'beam' ? PALETTE.magenta : h.style === 'vent' ? 0xc9d4ff : 0xffffff;
        g.fillStyle(col, 0.85);
        g.fillRect(r.x, r.y, r.w, r.h);
        g.fillStyle(0xffffff, 0.9);
        g.fillRect(r.x + r.w * 0.35, r.y, r.w * 0.3, r.h);
      }
    }
    let echoShown = false;
    for (const m of boss.marks) {
      const p = Math.max(0, Math.min(1, 1 - m.timer / m.total));
      if (m.kind === 'imprint') {
        g.lineStyle(1.5, PALETTE.magenta, 0.5 + 0.5 * p);
        g.strokeEllipse(m.x, m.y - 2, 30 * (1 - 0.3 * p), 8 * (1 - 0.3 * p));
        g.lineStyle(1, PALETTE.magenta, 0.35 + 0.5 * p);
        g.strokeEllipse(m.x, m.y - 2, 14 + 20 * (1 - p), 4 + 6 * (1 - p));
        g.lineStyle(1, PALETTE.magenta, 0.25 * p);
        g.lineBetween(m.x, m.y, m.x, m.y - 120 * p);
      } else if (m.kind === 'echo') {
        echoShown = true;
        this.echoImg.setVisible(true).setPosition(m.x, m.y - 14).setAlpha(0.4 + 0.5 * p).setTint(PALETTE.cyan).setScale(0.5 * (1 + 0.2 * Math.sin(t * 10)));
        g.lineStyle(1, PALETTE.cyan, 0.4);
        g.lineBetween(cx, cy, m.x, m.y - 14);
      } else {
        g.lineStyle(1, PALETTE.danger, 0.4 + 0.5 * p);
        g.strokeRect(m.x - 5, m.y - 3, 10, 3);
      }
    }
    if (!echoShown) this.echoImg.setVisible(false);
  }

  destroy(): void {
    this.sprite.destroy();
    this.glow.destroy();
    this.gfx.destroy();
    this.echoImg.destroy();
  }
}

export function isTheNull(b: PatternBoss): b is TheNull {
  return b.kind === 'theNull';
}

// ---------------------------------------------------------------------------------------------- interactables

/** Doors, plates, moving platforms, power nodes and hazard emitters, driven by the InteractableSystem state. */
export class InteractViews {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly doorTiles = new Map<string, Phaser.GameObjects.Image[]>();
  private readonly plateImgs = new Map<string, { img: Phaser.GameObjects.Image; echo: boolean }>();
  private readonly platformImgs = new Map<string, Phaser.GameObjects.Image[]>();
  private readonly nodeImgs = new Map<string, { img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image }>();
  private readonly emitterImgs = new Map<string, { head: Phaser.GameObjects.Image; beam: Phaser.GameObjects.TileSprite }>();

  constructor(scene: Phaser.Scene, private readonly sys: InteractableSystem) {
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => (this.objects.push(o), o);
    for (const d of sys.doors) {
      const tiles: Phaser.GameObjects.Image[] = [];
      for (let r = 0; r < d.def.rows; r++) {
        for (let c = 0; c < d.def.cols; c++) {
          tiles.push(add(scene.add.image(d.rect.x + c * TILE_SIZE, d.rect.y + r * TILE_SIZE, WTEX.doorClosed).setOrigin(0).setScale(0.5).setDepth(DEPTH.objects + 1)));
        }
      }
      this.doorTiles.set(d.def.id, tiles);
    }
    for (const p of sys.plates) {
      const echo = p.def.pressedBy === 'echo';
      const img = add(scene.add.image(p.rect.x, p.rect.y + p.rect.h, echo ? WTEX.plateEchoUp : WTEX.plateUp).setOrigin(0, 1).setScale(0.5).setDepth(DEPTH.objects));
      this.plateImgs.set(p.def.id, { img, echo });
    }
    for (const p of sys.platforms) {
      const imgs: Phaser.GameObjects.Image[] = [];
      for (let i = 0; i < p.def.cols; i++) {
        const key = i === 0 ? WTEX.platformLeft : i === p.def.cols - 1 ? WTEX.platformRight : WTEX.platformMid;
        imgs.push(add(scene.add.image(p.x + i * TILE_SIZE, p.y, key).setOrigin(0).setScale(0.5).setDepth(DEPTH.objects + 1)));
      }
      this.platformImgs.set(p.def.id, imgs);
    }
    for (const n of sys.nodes) {
      const img = add(scene.add.image(n.rect.x, n.rect.y, WTEX.nodeOff).setOrigin(0).setScale(0.5).setDepth(DEPTH.objects));
      const glow = add(scene.add.image(n.rect.x + 8, n.rect.y + 8, 'fx-glow').setTint(PALETTE.cyan).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.objects - 1).setVisible(false));
      this.nodeImgs.set(n.def.id, { img, glow });
    }
    for (const e of sys.emitters) {
      const head = add(scene.add.image(e.def.col * TILE_SIZE, e.def.row * TILE_SIZE, WTEX.emitter).setOrigin(0).setScale(0.5).setDepth(DEPTH.objects));
      const beam = add(scene.add.tileSprite(0, 0, 16, 16, e.def.style === 'laser' ? WTEX.beamLaser : WTEX.beamSteam).setOrigin(0).setDepth(DEPTH.projectiles - 2).setVisible(false));
      beam.setTileScale(0.5, 0.5);
      this.emitterImgs.set(e.def.id, { head, beam });
    }
  }

  update(time: number): void {
    const t = time / 1000;
    for (const d of this.sys.doors) {
      for (const img of this.doorTiles.get(d.def.id) ?? []) {
        img.setTexture(d.open ? WTEX.doorOpen : WTEX.doorClosed).setAlpha(d.open ? 0.55 : 1);
        if (!d.open) img.setTint(d.latched ? 0xffffff : 0xffffff);
      }
    }
    for (const p of this.sys.plates) {
      const v = this.plateImgs.get(p.def.id);
      if (!v) continue;
      v.img.setTexture(v.echo ? (p.pressed ? WTEX.plateEchoDown : WTEX.plateEchoUp) : p.pressed ? WTEX.plateDown : WTEX.plateUp);
      v.img.setAlpha(v.echo ? 0.8 + Math.sin(t * 3) * 0.1 : 1);
    }
    for (const p of this.sys.platforms) {
      this.platformImgs.get(p.def.id)?.forEach((img, i) => img.setPosition(Math.round(p.x) + i * TILE_SIZE, Math.round(p.y)));
    }
    for (const n of this.sys.nodes) {
      const v = this.nodeImgs.get(n.def.id);
      if (!v) continue;
      v.img.setTexture(n.powered ? WTEX.nodeOn : WTEX.nodeOff);
      v.glow.setVisible(n.powered).setAlpha(0.5 + Math.sin(t * 6) * 0.2);
    }
    for (const e of this.sys.emitters) {
      const v = this.emitterImgs.get(e.def.id);
      if (!v) continue;
      const b = e.beam;
      const show = e.phase !== 'off' && b.w > 0 && b.h > 0;
      v.beam.setVisible(show).setPosition(b.x, b.y).setSize(Math.max(1, b.w), Math.max(1, b.h));
      v.beam.setAlpha(e.phase === 'telegraph' ? 0.25 + 0.2 * Math.sin(t * 40) : 0.95);
      v.head.setTint(e.phase === 'off' ? 0xffffff : e.phase === 'telegraph' ? 0xffb02e : 0xff6a6a);
    }
  }

  destroy(): void {
    for (const o of this.objects) o.destroy();
    this.objects.length = 0;
  }
}
