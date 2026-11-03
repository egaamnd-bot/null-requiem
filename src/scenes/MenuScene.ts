import Phaser from 'phaser';
import { RENDER_QUALITIES } from '../core/renderScale';
import { applyRenderScale } from '../render/renderScaleRuntime';
import { view } from '../config/view';
import { InputManager } from '../input/InputManager';
import { createTapTarget, type TapTarget } from '../input/tapTarget';
import { css, PALETTE, UI_FONT, UI_MONO } from '../render/palette';
import { VIEW_CHANGED } from '../render/viewportDom';
import { getSettings, updateSettings } from '../state/settings';
import { buildGearModel, buildMapModel, collectedRecords, vendorStock, wrapText } from '../ui/menuModel';
import { ITEMS } from '../world/items';
import { NPC_REGISTRY } from '../world/npcs';
import { REGION_BY_ID, REGIONS } from '../world/regions';
import { ROOMS } from '../world/rooms';
import type { Services, Session } from './session';

export const MENU_SCENE = 'menu';

export type MenuTab = 'map' | 'journal' | 'gear' | 'settings' | 'vendor';

export interface MenuData {
  services: Services;
  /** Present when opened from gameplay; absent from the title screen (settings only). */
  session?: Session;
  tab: MenuTab;
  vendorId?: string;
  onClose: () => void;
}

const TAB_LABEL: Record<Exclude<MenuTab, 'vendor'>, string> = { map: 'MAP', journal: 'JOURNAL', gear: 'GEAR', settings: 'SETTINGS' };

/**
 * Full-screen tabbed overlay: world map, quest journal + records, gear and upgrades, settings, and the vendor screen.
 * All content is rebuilt from pure view-models (ui/menuModel.ts) whenever something changes, so it can never show stale
 * numbers. Touch first (tap targets), with keyboard / gamepad parity (left/right = tabs, up/down = scroll, back = close).
 */
export class MenuScene extends Phaser.Scene {
  private data0!: MenuData;
  private controls!: InputManager;
  private tab: MenuTab = 'map';
  private root!: Phaser.GameObjects.Container;
  private content!: Phaser.GameObjects.Container;
  private targets: TapTarget[] = [];
  private tabTargets: TapTarget[] = [];
  private scroll = 0;
  private journalMode: 'quests' | 'records' = 'quests';
  private selected = 0;
  private selectedRoom: string | null = null;
  private closing = false;
  private armed = 0;
  private restartPending = false;
  private readonly onViewChanged = () => {
    this.restartPending = true;
  };

  constructor() {
    super(MENU_SCENE);
  }

  init(data: MenuData): void {
    this.data0 = data;
    this.tab = data.tab;
    this.scroll = 0;
    this.selected = 0;
    this.closing = false;
    this.armed = 0;
    this.targets = [];
    this.tabTargets = [];
    this.restartPending = false;
    this.selectedRoom = null;
  }

  create(): void {
    applyRenderScale(this);
    this.controls = new InputManager(this);
    this.controls.swallow();
    this.game.events.on(VIEW_CHANGED, this.onViewChanged);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(VIEW_CHANGED, this.onViewChanged);
      this.controls.destroy();
    });
    this.root = this.add.container(0, 0).setDepth(200);
    this.build();
  }

  // ---------------------------------------------------------------------------------------------- layout

  private get W(): number {
    return view.width;
  }
  private get H(): number {
    return view.height;
  }

  private tabs(): MenuTab[] {
    if (this.data0.tab === 'vendor') return ['vendor'];
    return this.data0.session ? ['map', 'journal', 'gear', 'settings'] : ['settings'];
  }

  private build(): void {
    this.root.removeAll(true);
    this.tabTargets.forEach((t) => t.destroy());
    this.tabTargets = [];
    const W = this.W;
    const H = this.H;
    const m = view.margin;
    this.root.add(this.add.rectangle(0, 0, W, H, PALETTE.void, 0.92).setOrigin(0));
    this.root.add(this.add.rectangle(m.left, m.top + 2, W - m.left - m.right, H - m.top - m.bottom - 4, PALETTE.ink, 0.55).setOrigin(0).setStrokeStyle(1, PALETTE.steel, 0.7));
    // Tabs
    const tabs = this.tabs();
    const tabW = Math.min(88, (W - m.left - m.right - 90) / Math.max(1, tabs.length));
    tabs.forEach((t, i) => {
      const x = m.left + 8 + i * (tabW + 4) + tabW / 2;
      const y = m.top + 16;
      const label = t === 'vendor' ? (NPC_REGISTRY[this.data0.vendorId ?? '']?.name ?? 'TRADE') : TAB_LABEL[t];
      const active = t === this.tab;
      const frame = this.add.rectangle(x, y, tabW, 18, active ? PALETTE.violet : PALETTE.ink, active ? 0.8 : 0.6).setStrokeStyle(1, active ? PALETTE.cyan : PALETTE.steel, 0.9);
      const txt = this.add.text(x, y, label, { fontFamily: UI_FONT, fontSize: '9px', color: css(active ? PALETTE.chrome : PALETTE.mist), resolution: 2 }).setOrigin(0.5).setLetterSpacing(1);
      this.root.add([frame, txt]);
      if (tabs.length > 1) {
        this.tabTargets.push(
          createTapTarget(this, {
            x, y, width: tabW, height: 22,
            onTap: () => this.switchTab(t),
            enabled: () => !this.closing,
          }),
        );
      }
    });
    // Close
    this.button(W - m.right - 34, m.top + 16, 56, 18, 'CLOSE', () => this.close(), true, this.root, true);
    this.content = this.add.container(0, 0);
    this.root.add(this.content);
    this.renderContent();
  }

  private switchTab(t: MenuTab): void {
    if (this.tab === t) return;
    this.tab = t;
    this.scroll = 0;
    this.selected = 0;
    this.data0.services.sfx.playOr('uiTab', 'menu');
    this.build();
  }

  private clearContent(): void {
    this.targets.forEach((t) => t.destroy());
    this.targets = [];
    this.content.removeAll(true);
  }

  private renderContent(): void {
    this.clearContent();
    switch (this.tab) {
      case 'map':
        return this.renderMap();
      case 'journal':
        return this.renderJournal();
      case 'gear':
        return this.renderGear();
      case 'settings':
        return this.renderSettings();
      case 'vendor':
        return this.renderVendor();
    }
  }

  /** A framed tap button. Returns its text so callers can restyle it. */
  private button(x: number, y: number, w: number, h: number, label: string, onTap: () => void, enabled = true, into?: Phaser.GameObjects.Container, persistent = false): Phaser.GameObjects.Text {
    const frame = this.add.rectangle(x, y, w, h, PALETTE.ink, 0.7).setStrokeStyle(1, enabled ? PALETTE.cyan : PALETTE.steel, enabled ? 0.8 : 0.4);
    const txt = this.add.text(x, y, label, { fontFamily: UI_FONT, fontSize: '9px', color: css(enabled ? PALETTE.chrome : PALETTE.steel), resolution: 2 }).setOrigin(0.5);
    (into ?? this.content).add([frame, txt]);
    const tt = createTapTarget(this, {
      x, y, width: w + 4, height: h + 4,
      onPress: (d) => frame.setFillStyle(d ? PALETTE.violet : PALETTE.ink, d ? 0.85 : 0.7),
      onTap: () => {
        if (!enabled) return;
        this.data0.services.sfx.play('confirm');
        onTap();
      },
      enabled: () => !this.closing && this.armed >= 2,
    });
    if (persistent) this.tabTargets.push(tt);
    else this.targets.push(tt);
    return txt;
  }

  private text(x: number, y: number, s: string, size = 9, color: number = PALETTE.mist, origin: [number, number] = [0, 0], mono = false): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, s, { fontFamily: mono ? UI_MONO : UI_FONT, fontSize: `${size}px`, color: css(color), resolution: 2, lineSpacing: 2 }).setOrigin(origin[0], origin[1]);
    this.content.add(t);
    return t;
  }

  // ---------------------------------------------------------------------------------------------- MAP

  private renderMap(): void {
    const s = this.data0.session;
    if (!s) return;
    const W = this.W;
    const m = view.margin;
    const cols = 19;
    const gap = 2;
    const cellW = Math.max(14, Math.min(26, Math.floor((W - m.left - m.right - 24 - gap * cols) / cols)));
    const cellH = 34;
    const originX = Math.round((W - (cols * (cellW + gap) - gap)) / 2);
    const model = buildMapModel(ROOMS, s.world.progression, s.world.room.def.id, cellW, cellH, gap, originX, m.top + 48);
    const byId = new Map(model.cells.map((c) => [c.id, c]));
    const g = this.add.graphics();
    this.content.add(g);
    g.lineStyle(1, PALETTE.steel, 0.6);
    for (const l of model.links) {
      const a = byId.get(l.from);
      const b = byId.get(l.to);
      if (a && b) g.lineBetween(a.x + a.w / 2, a.y + a.h / 2, b.x + b.w / 2, b.y + b.h / 2);
    }
    for (const c of model.cells) {
      const alpha = c.visited ? 0.9 : 0.28;
      g.fillStyle(c.color, alpha);
      g.fillRect(c.x, c.y, c.w, c.h);
      g.lineStyle(1, c.current ? PALETTE.white : c.color, c.current ? 1 : 0.8);
      g.strokeRect(c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1);
      if (c.hasRelay && c.visited) {
        g.fillStyle(PALETTE.void, 0.9);
        g.fillTriangle(c.x + 4, c.y + c.h - 4, c.x + 8, c.y + c.h - 11, c.x + 12, c.y + c.h - 4);
        g.fillStyle(PALETTE.cyan, 1);
        g.fillTriangle(c.x + 5, c.y + c.h - 5, c.x + 8, c.y + c.h - 10, c.x + 11, c.y + c.h - 5);
      }
      if (c.hasBoss && c.visited) this.text(c.x + c.w - 4, c.y + 2, '!', 11, PALETTE.danger, [1, 0]);
      this.targets.push(
        createTapTarget(this, {
          x: c.x + c.w / 2, y: c.y + c.h / 2, width: c.w + gap, height: c.h + gap,
          onTap: () => {
            this.selectedRoom = c.id;
            this.renderContent();
          },
        }),
      );
    }
    // Player marker pulses over the current room.
    const cur = byId.get(s.world.room.def.id);
    if (cur) {
      const pin = this.add.triangle(cur.x + cur.w / 2, cur.y - 5, 0, 0, 8, 0, 4, 6, PALETTE.white).setOrigin(0.5);
      this.content.add(pin);
      this.tweens.add({ targets: pin, y: pin.y - 3, duration: 450, yoyo: true, repeat: -1 });
    }
    const sel = byId.get(this.selectedRoom ?? s.world.room.def.id);
    const room = ROOMS.find((r) => r.id === sel?.id);
    const region = room?.region ? REGION_BY_ID.get(room.region) : undefined;
    this.text(m.left + 12, this.H - m.bottom - 56, sel ? sel.name : '', 12, PALETTE.chrome);
    this.text(m.left + 12, this.H - m.bottom - 40, region ? `${region.name}  -  ${region.tagline}` : '', 8, region?.color ?? PALETTE.mist);
    this.text(m.left + 12, this.H - m.bottom - 26, `Rooms discovered ${model.discovered} / ${model.total}    Tap a room for details`, 8, PALETTE.steel, [0, 0], true);
    // Legend
    REGIONS.forEach((r, i) => {
      const lx = this.W - m.right - 118;
      const ly = this.H - m.bottom - 72 + i * 11;
      const sw = this.add.rectangle(lx, ly + 4, 7, 7, r.color, 0.9);
      this.content.add(sw);
      this.text(lx + 8, ly, r.name, 7, PALETTE.mist);
    });
  }

  // ---------------------------------------------------------------------------------------------- JOURNAL

  private renderJournal(): void {
    const s = this.data0.session;
    if (!s) return;
    const m = view.margin;
    const W = this.W;
    const top = m.top + 36;
    this.button(m.left + 40, top + 8, 66, 16, 'QUESTS', () => ((this.journalMode = 'quests'), (this.scroll = 0), (this.selected = 0), this.renderContent()), this.journalMode !== 'quests');
    this.button(m.left + 112, top + 8, 66, 16, 'RECORDS', () => ((this.journalMode = 'records'), (this.scroll = 0), (this.selected = 0), this.renderContent()), this.journalMode !== 'records');
    const listX = m.left + 10;
    const listY = top + 24;
    const listW = Math.floor((W - m.left - m.right) * 0.4);
    const rows = 8;
    const rowH = 15;
    if (this.journalMode === 'quests') {
      const j = s.world.quests.journal();
      this.scroll = Math.max(0, Math.min(this.scroll, Math.max(0, j.length - rows)));
      if (j.length === 0) this.text(listX, listY, 'No quests yet.\nTalk to people. Explore.', 9, PALETTE.steel);
      j.slice(this.scroll, this.scroll + rows).forEach((q, i) => {
        const idx = this.scroll + i;
        const y = listY + i * rowH;
        const sel = idx === this.selected;
        const mark = q.status === 'turnedIn' ? '✓' : q.status === 'complete' ? '!' : q.category === 'main' ? '◆' : '•';
        const col = q.status === 'turnedIn' ? PALETTE.steel : q.status === 'complete' ? PALETTE.sodium : q.category === 'main' ? PALETTE.chrome : PALETTE.mist;
        this.content.add(this.add.rectangle(listX, y, listW, rowH - 1, sel ? PALETTE.violet : PALETTE.ink, sel ? 0.6 : 0.35).setOrigin(0));
        this.text(listX + 4, y + 2, `${mark} ${q.title}`.slice(0, Math.floor(listW / 5.2)), 8, col);
        this.targets.push(createTapTarget(this, { x: listX + listW / 2, y: y + rowH / 2, width: listW, height: rowH, onTap: () => ((this.selected = idx), this.renderContent()) }));
      });
      const q = j[this.selected];
      const dx = listX + listW + 14;
      if (q) {
        this.text(dx, listY, q.title, 12, PALETTE.chrome);
        this.text(dx, listY + 15, `${q.category.toUpperCase()}  -  ${q.status === 'turnedIn' ? 'DONE' : q.status === 'complete' ? 'READY TO HAND IN' : 'ACTIVE'}`, 7, q.status === 'complete' ? PALETTE.sodium : PALETTE.cyan);
        const lines = wrapText(q.summary, Math.floor((W - dx - m.right - 12) / 4.8));
        this.text(dx, listY + 28, lines.join('\n'), 8, PALETTE.mist);
        let y = listY + 28 + lines.length * 11 + 6;
        for (const o of q.objectives) {
          const col = o.done ? PALETTE.steel : o.current ? PALETTE.chrome : PALETTE.mist;
          const prog = o.count > 1 ? ` (${o.progress}/${o.count})` : '';
          const ol = wrapText(`${o.done ? '[x]' : o.current ? '[>]' : '[ ]'} ${o.text}${prog}`, Math.floor((W - dx - m.right - 12) / 4.8));
          this.text(dx, y, ol.join('\n'), 8, col);
          y += ol.length * 11 + 2;
        }
        if (q.rewardText) this.text(dx, Math.min(y + 4, this.H - m.bottom - 20), `Reward: ${q.rewardText}`, 8, PALETTE.sodium);
      }
      if (j.length > rows) {
        this.button(listX + 20, listY + rows * rowH + 8, 34, 14, 'UP', () => ((this.scroll = Math.max(0, this.scroll - rows)), this.renderContent()));
        this.button(listX + 60, listY + rows * rowH + 8, 34, 14, 'DOWN', () => ((this.scroll = Math.min(j.length - rows, this.scroll + rows)), this.renderContent()));
      }
    } else {
      const rec = collectedRecords(ROOMS, s.world.progression);
      const frags = s.world.progression.fragmentCount;
      this.text(listX, listY - 2, `Records ${rec.entries.length} / ${rec.total}   Memory shards ${frags}`, 8, PALETTE.cyan);
      this.scroll = Math.max(0, Math.min(this.scroll, Math.max(0, rec.entries.length - rows + 1)));
      rec.entries.slice(this.scroll, this.scroll + rows - 1).forEach((r, i) => {
        const idx = this.scroll + i;
        const y = listY + 10 + i * rowH;
        const sel = idx === this.selected;
        this.content.add(this.add.rectangle(listX, y, listW, rowH - 1, sel ? PALETTE.violet : PALETTE.ink, sel ? 0.6 : 0.35).setOrigin(0));
        this.text(listX + 4, y + 2, r.title.slice(0, Math.floor(listW / 5.2)), 8, PALETTE.mist);
        this.targets.push(createTapTarget(this, { x: listX + listW / 2, y: y + rowH / 2, width: listW, height: rowH, onTap: () => ((this.selected = idx), this.renderContent()) }));
      });
      const r = rec.entries[this.selected];
      const dx = listX + listW + 14;
      if (r) {
        this.text(dx, listY - 2, r.title, 11, PALETTE.chrome);
        this.text(dx, listY + 14, wrapText(r.text, Math.floor((W - dx - m.right - 12) / 4.8)).join('\n'), 8, PALETTE.mist);
      } else this.text(dx, listY, 'Find lore records and\nmemory shards in the world.', 9, PALETTE.steel);
      if (rec.entries.length > rows - 1) {
        this.button(listX + 20, listY + rows * rowH + 8, 34, 14, 'UP', () => ((this.scroll = Math.max(0, this.scroll - 1)), this.renderContent()));
        this.button(listX + 60, listY + rows * rowH + 8, 34, 14, 'DOWN', () => ((this.scroll = this.scroll + 1), this.renderContent()));
      }
    }
  }

  // ---------------------------------------------------------------------------------------------- GEAR

  private renderGear(): void {
    const s = this.data0.session;
    if (!s) return;
    const m = view.margin;
    const W = this.W;
    const g = buildGearModel(s.world.progression, s.world.player.health.max, s.world.player.health.current);
    let y = m.top + 40;
    const x1 = m.left + 12;
    const x2 = Math.round(W * 0.52);
    this.text(x1, y, 'ABILITIES', 8, PALETTE.cyan);
    g.abilities.forEach((a, i) => {
      this.text(x1, y + 12 + i * 22, `${a.owned ? '●' : '○'} ${a.name}`, 9, a.owned ? PALETTE.chrome : PALETTE.steel);
      this.text(x1 + 8, y + 22 + i * 22, a.owned ? a.description.slice(0, 60) : 'Not found yet', 7, a.owned ? PALETTE.mist : PALETTE.steel);
    });
    this.text(x2, y, 'STATUS', 8, PALETTE.cyan);
    g.stats.forEach((st, i) => {
      this.text(x2, y + 12 + i * 12, st.label, 8, PALETTE.mist);
      this.text(x2 + 120, y + 12 + i * 12, st.value, 8, PALETTE.chrome);
    });
    y += 108;
    this.text(x1, y, `SCRAP  ${g.scrap}`, 9, PALETTE.sodium);
    this.text(x1, y + 14, 'ITEMS', 8, PALETTE.cyan);
    if (g.items.length === 0) this.text(x1, y + 26, 'Nothing carried.', 8, PALETTE.steel);
    g.items.slice(0, 5).forEach((it, i) => {
      const def = ITEMS[it.id];
      this.text(x1, y + 26 + i * 11, `${def?.name ?? it.id}${it.count > 1 ? ` x${it.count}` : ''}`, 8, def ? PALETTE.chrome : PALETTE.mist);
    });
    this.text(x2, y, 'UPGRADES  (buy from tuners: Halden, Kestrel)', 8, PALETTE.cyan);
    g.upgrades.forEach((u, i) => {
      this.text(x2, y + 14 + i * 12, `${u.name}  Lv ${u.level}/${u.max}   ${u.value}${u.unit}`, 8, u.level > 0 ? PALETTE.chrome : PALETTE.mist);
    });
  }

  // ---------------------------------------------------------------------------------------------- SETTINGS

  private renderSettings(): void {
    const m = view.margin;
    const set = getSettings();
    const x = m.left + 16;
    let y = m.top + 44;
    const row = (label: string, value: string, minus: () => void, plus: () => void) => {
      this.text(x, y - 5, label, 9, PALETTE.mist);
      this.button(this.W - m.right - 110, y, 22, 16, '-', minus);
      this.text(this.W - m.right - 82, y - 5, value, 9, PALETTE.chrome, [0, 0]);
      this.button(this.W - m.right - 28, y, 22, 16, '+', plus);
      y += 24;
    };
    const apply = (patch: Parameters<typeof updateSettings>[0]) => {
      updateSettings(patch);
      this.data0.services.sfx.applySettings();
      this.data0.services.sfx.play('uiSlider');
      this.game.events.emit('settings-changed');
      this.renderContent();
    };
    const step = (v: number, d: number, lo: number, hi: number) => Math.round(Math.min(hi, Math.max(lo, v + d)) * 100) / 100;
    const Q = RENDER_QUALITIES;
    const qNow = Q.indexOf(set.renderQuality);
    const qLabel: Record<string, string> = { auto: `Auto ${view.renderScale}x`, low: 'Low 1x', balanced: 'Balanced 2x', high: 'High 3x', max: 'Max 4x' };
    row('Render quality', qLabel[set.renderQuality] ?? set.renderQuality, () => apply({ renderQuality: Q[(qNow + Q.length - 1) % Q.length]! }), () => apply({ renderQuality: Q[(qNow + 1) % Q.length]! }));
    row('Music volume', `${Math.round(set.musicVolume * 100)}%`, () => apply({ musicVolume: step(set.musicVolume, -0.1, 0, 1) }), () => apply({ musicVolume: step(set.musicVolume, 0.1, 0, 1) }));
    row('Effects volume', `${Math.round(set.sfxVolume * 100)}%`, () => apply({ sfxVolume: step(set.sfxVolume, -0.1, 0, 1) }), () => apply({ sfxVolume: step(set.sfxVolume, 0.1, 0, 1) }));
    row('Touch control size', `${Math.round(set.controlScale * 100)}%`, () => apply({ controlScale: step(set.controlScale, -0.05, 0.8, 1.2) }), () => apply({ controlScale: step(set.controlScale, 0.05, 0.8, 1.2) }));
    row('Touch control opacity', `${Math.round(set.controlOpacity * 100)}%`, () => apply({ controlOpacity: step(set.controlOpacity, -0.1, 0.3, 1) }), () => apply({ controlOpacity: step(set.controlOpacity, 0.1, 0.3, 1) }));
    const toggle = (label: string, on: boolean, patch: () => Parameters<typeof updateSettings>[0]) => {
      this.text(x, y - 5, label, 9, PALETTE.mist);
      this.button(this.W - m.right - 69, y, 84, 16, on ? 'ON' : 'OFF', () => apply(patch()));
      y += 24;
    };
    toggle('Screen shake', set.screenShake, () => ({ screenShake: !set.screenShake }));
    toggle('Reduce flashes', set.reduceFlash, () => ({ reduceFlash: !set.reduceFlash }));
    toggle('Show FPS', set.showFps, () => ({ showFps: !set.showFps }));
  }

  // ---------------------------------------------------------------------------------------------- VENDOR

  private renderVendor(): void {
    const s = this.data0.session;
    const id = this.data0.vendorId ?? '';
    const npc = NPC_REGISTRY[id];
    if (!s || !npc?.vendor) return;
    const m = view.margin;
    const x = m.left + 14;
    let y = m.top + 42;
    const stock = vendorStock(npc.vendor, s.world.progression);
    this.text(x, y, `${npc.name} tunes implants. Scrap pays.`, 9, PALETTE.mist);
    this.text(this.W - m.right - 14, y, `SCRAP ${s.world.progression.scrap}`, 10, PALETTE.sodium, [1, 0]);
    y += 22;
    for (const u of stock) {
      this.content.add(this.add.rectangle(x, y - 2, this.W - m.left - m.right - 28, 42, PALETTE.ink, 0.5).setOrigin(0).setStrokeStyle(1, PALETTE.steel, 0.5));
      this.text(x + 6, y + 1, u.name, 10, PALETTE.chrome);
      this.text(x + 6, y + 15, u.description, 8, PALETTE.mist);
      this.text(x + 6, y + 27, `Level ${u.level}/${u.max}   ${u.value}${u.unit}${u.next !== null ? `  ->  ${u.next}${u.unit}` : '  (max)'}`, 8, PALETTE.cyan);
      const label = u.cost === null ? 'MAXED' : `BUY ${u.cost}`;
      this.button(this.W - m.right - 56, y + 20, 76, 20, label, () => {
        const r = s.world.buyUpgrade(u.id);
        if (!r.ok) this.data0.services.sfx.playOr('uiError', 'menu');
        this.renderContent();
      }, u.cost !== null && u.affordable);
      y += 48;
    }
  }

  // ---------------------------------------------------------------------------------------------- flow

  private close(): void {
    if (this.closing) return;
    this.closing = true;
    this.data0.services.sfx.playOr('uiBack', 'menu');
    this.data0.onClose();
    this.scene.stop();
  }

  override update(): void {
    this.armed++;
    if (this.restartPending) {
      this.restartPending = false;
      this.scene.restart(this.data0);
      return;
    }
    this.controls.update();
    if (this.closing || this.armed < 2) return;
    const c = this.controls;
    if (c.justPressed('back') || c.justPressed('pause')) return this.close();
    const tabs = this.tabs();
    if (tabs.length > 1 && (c.justPressed('left') || c.justPressed('right'))) {
      const i = tabs.indexOf(this.tab);
      this.switchTab(tabs[(i + (c.justPressed('right') ? 1 : tabs.length - 1)) % tabs.length] as MenuTab);
      return;
    }
    if (this.tab === 'journal' && (c.justPressed('up') || c.justPressed('down'))) {
      this.selected = Math.max(0, this.selected + (c.justPressed('down') ? 1 : -1));
      const rows = 8;
      if (this.selected < this.scroll) this.scroll = this.selected;
      if (this.selected >= this.scroll + rows) this.scroll = this.selected - rows + 1;
      this.renderContent();
    }
  }
}
