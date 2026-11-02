import { maxUpgradeLevel, UPGRADE_IDS, type UpgradeId } from '../config/upgrades';
import type { Ability } from './events';

export interface CheckpointRef {
  roomId: string;
  /** Feet position of the respawn point, in pixels. */
  x: number;
  y: number;
}

export type QuestStatus = 'active' | 'complete' | 'turnedIn';

export interface QuestProgress {
  status: QuestStatus;
  /** Objective id -> count so far. */
  progress: Record<string, number>;
}

/** Current save schema. Older versions are migrated on load (see `Progression.deserialize`). */
export const SAVE_VERSION = 2;

export interface ProgressionData {
  version: typeof SAVE_VERSION;
  abilities: Ability[];
  secrets: string[];
  brokenWalls: string[];
  latchedGates: string[];
  fragmentsCollected: string[];
  maxHealthBonus: number;
  checkpoint: CheckpointRef | null;
  defeatedBosses: string[];
  deaths: number;
  playTime: number;
  // --- v2 ---
  flags: string[];
  inventory: Record<string, number>;
  scrap: number;
  upgrades: Partial<Record<UpgradeId, number>>;
  visitedRooms: string[];
  collected: string[];
  enemyKills: Record<string, number>;
  quests: Record<string, QuestProgress>;
  /** Interactables whose state persists (opened doors, powered nodes, ...). */
  interactState: Record<string, string>;
}

const VALID_ABILITIES: Ability[] = ['backtrace', 'glitch-strike', 'air-jump'];
const QUEST_STATUSES: QuestStatus[] = ['active', 'complete', 'turnedIn'];

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : []);
const nonNegInt = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : fallback);

function numberRecord(v: unknown, max = 1_000_000): Record<string, number> {
  const out: Record<string, number> = {};
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const [k, n] of Object.entries(v as Record<string, unknown>)) {
      if (typeof n === 'number' && Number.isFinite(n)) out[k] = Math.max(0, Math.min(max, Math.floor(n)));
    }
  }
  return out;
}

function stringRecord(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const [k, s] of Object.entries(v as Record<string, unknown>)) if (typeof s === 'string') out[k] = s;
  }
  return out;
}

function questRecord(v: unknown): Record<string, QuestProgress> {
  const out: Record<string, QuestProgress> = {};
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const [id, q] of Object.entries(v as Record<string, unknown>)) {
      if (!q || typeof q !== 'object') continue;
      const status = (q as { status?: unknown }).status;
      if (!QUEST_STATUSES.includes(status as QuestStatus)) continue;
      out[id] = { status: status as QuestStatus, progress: numberRecord((q as { progress?: unknown }).progress, 9999) };
    }
  }
  return out;
}

/** Persistent run progress: what survives death, and what is written to save data. */
export class Progression {
  readonly abilities = new Set<Ability>();
  readonly secrets = new Set<string>();
  readonly brokenWalls = new Set<string>();
  /** Timed gates the player has passed; they stay open for good. */
  readonly latchedGates = new Set<string>();
  /** Memory fragment IDs collected by the player. */
  readonly fragmentsCollected = new Set<string>();
  readonly defeatedBosses = new Set<string>();
  readonly flags = new Set<string>();
  readonly inventory: Record<string, number> = {};
  readonly upgrades: Partial<Record<UpgradeId, number>> = {};
  readonly visitedRooms = new Set<string>();
  /** Generic one-off pickups (scrap caches, upgrade cores, records...) that must not respawn. */
  readonly collected = new Set<string>();
  readonly enemyKills: Record<string, number> = {};
  readonly quests: Record<string, QuestProgress> = {};
  readonly interactState: Record<string, string> = {};
  maxHealthBonus = 0;
  scrap = 0;
  checkpoint: CheckpointRef | null = null;
  deaths = 0;
  playTime = 0;

  // Back-compat accessors for the two original bosses.
  get bossDefeated(): boolean {
    return this.defeatedBosses.has('bulwark-9');
  }
  set bossDefeated(v: boolean) {
    if (v) this.defeatedBosses.add('bulwark-9');
    else this.defeatedBosses.delete('bulwark-9');
  }
  get panoptixDefeated(): boolean {
    return this.defeatedBosses.has('panoptix-0');
  }
  set panoptixDefeated(v: boolean) {
    if (v) this.defeatedBosses.add('panoptix-0');
    else this.defeatedBosses.delete('panoptix-0');
  }

  has(ability: Ability): boolean {
    return this.abilities.has(ability);
  }

  unlock(ability: Ability): boolean {
    if (this.abilities.has(ability)) return false;
    this.abilities.add(ability);
    return true;
  }

  get fragmentCount(): number {
    return this.fragmentsCollected.size;
  }

  // ---- flags / inventory / currency -------------------------------------------------

  setFlag(flag: string): boolean {
    if (this.flags.has(flag)) return false;
    this.flags.add(flag);
    return true;
  }

  hasFlag(flag: string): boolean {
    return this.flags.has(flag);
  }

  itemCount(item: string): number {
    return this.inventory[item] ?? 0;
  }

  addItem(item: string, n = 1): void {
    this.inventory[item] = Math.max(0, this.itemCount(item) + n);
    if (this.inventory[item] === 0) delete this.inventory[item];
  }

  addScrap(n: number): void {
    this.scrap = Math.max(0, this.scrap + Math.floor(n));
  }

  /** Spend scrap if affordable. */
  spendScrap(n: number): boolean {
    if (n < 0 || this.scrap < n) return false;
    this.scrap -= n;
    return true;
  }

  upgradeLevel(id: UpgradeId): number {
    return this.upgrades[id] ?? 0;
  }

  /** Raise an upgrade by one level (no cost handling here). Returns the new level or null if maxed. */
  raiseUpgrade(id: UpgradeId): number | null {
    const lvl = this.upgradeLevel(id);
    if (lvl >= maxUpgradeLevel(id)) return null;
    this.upgrades[id] = lvl + 1;
    return lvl + 1;
  }

  recordKill(kind: string): void {
    this.enemyKills[kind] = (this.enemyKills[kind] ?? 0) + 1;
  }

  serialize(): ProgressionData {
    return {
      version: SAVE_VERSION,
      abilities: [...this.abilities],
      secrets: [...this.secrets],
      brokenWalls: [...this.brokenWalls],
      latchedGates: [...this.latchedGates],
      fragmentsCollected: [...this.fragmentsCollected],
      maxHealthBonus: this.maxHealthBonus,
      checkpoint: this.checkpoint ? { ...this.checkpoint } : null,
      defeatedBosses: [...this.defeatedBosses],
      deaths: this.deaths,
      playTime: this.playTime,
      flags: [...this.flags],
      inventory: { ...this.inventory },
      scrap: this.scrap,
      upgrades: { ...this.upgrades },
      visitedRooms: [...this.visitedRooms],
      collected: [...this.collected],
      enemyKills: { ...this.enemyKills },
      quests: JSON.parse(JSON.stringify(this.quests)) as Record<string, QuestProgress>,
      interactState: { ...this.interactState },
    };
  }

  /**
   * Parse save data. Accepts the current schema and migrates v1 saves (pre-campaign vertical slice).
   * Returns null for anything that is not a recognisable save; individual bad fields are repaired rather than
   * rejecting the whole save, so a partly corrupt file still continues.
   */
  static deserialize(raw: unknown): Progression | null {
    if (!raw || typeof raw !== 'object') return null;
    const d = raw as Record<string, unknown>;
    const version = d.version;
    if (version !== 1 && version !== 2) return null;
    const p = new Progression();
    for (const a of strings(d.abilities)) if (VALID_ABILITIES.includes(a as Ability)) p.abilities.add(a as Ability);
    for (const s of strings(d.secrets)) p.secrets.add(s);
    for (const w of strings(d.brokenWalls)) p.brokenWalls.add(w);
    for (const g of strings(d.latchedGates)) p.latchedGates.add(g);
    for (const f of strings(d.fragmentsCollected)) p.fragmentsCollected.add(f);
    p.maxHealthBonus = nonNegInt(d.maxHealthBonus, 0);
    const cp = d.checkpoint as Partial<CheckpointRef> | null | undefined;
    if (cp && typeof cp.roomId === 'string' && typeof cp.x === 'number' && typeof cp.y === 'number' && Number.isFinite(cp.x) && Number.isFinite(cp.y)) {
      p.checkpoint = { roomId: cp.roomId, x: cp.x, y: cp.y };
    }
    p.deaths = nonNegInt(d.deaths, 0);
    p.playTime = typeof d.playTime === 'number' && Number.isFinite(d.playTime) ? Math.max(0, d.playTime) : 0;

    if (version === 1) {
      // v1 stored the two slice bosses as booleans.
      if (d.bossDefeated === true) p.defeatedBosses.add('bulwark-9');
      if (d.panoptixDefeated === true) p.defeatedBosses.add('panoptix-0');
      return p;
    }

    for (const b of strings(d.defeatedBosses)) p.defeatedBosses.add(b);
    for (const f of strings(d.flags)) p.flags.add(f);
    Object.assign(p.inventory, numberRecord(d.inventory, 9999));
    for (const k of Object.keys(p.inventory)) if (p.inventory[k] === 0) delete p.inventory[k];
    p.scrap = nonNegInt(d.scrap, 0);
    const up = numberRecord(d.upgrades, 99);
    for (const id of UPGRADE_IDS) {
      const lvl = up[id];
      if (lvl !== undefined) p.upgrades[id] = Math.min(lvl, maxUpgradeLevel(id));
    }
    for (const r of strings(d.visitedRooms)) p.visitedRooms.add(r);
    for (const c of strings(d.collected)) p.collected.add(c);
    Object.assign(p.enemyKills, numberRecord(d.enemyKills));
    Object.assign(p.quests, questRecord(d.quests));
    Object.assign(p.interactState, stringRecord(d.interactState));
    return p;
  }
}

/** Storage abstraction so save logic is testable without a browser. */
export interface SaveStore {
  load(): string | null;
  save(data: string): void;
  clear(): void;
}

export class MemorySaveStore implements SaveStore {
  private data: string | null = null;
  load(): string | null {
    return this.data;
  }
  save(data: string): void {
    this.data = data;
  }
  clear(): void {
    this.data = null;
  }
}

export function saveProgression(store: SaveStore, p: Progression): void {
  try {
    store.save(JSON.stringify(p.serialize()));
  } catch {
    /* storage full or unavailable: the run continues, it just cannot persist right now */
  }
}

export function loadProgression(store: SaveStore): Progression | null {
  let raw: string | null;
  try {
    raw = store.load();
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return Progression.deserialize(JSON.parse(raw));
  } catch {
    return null;
  }
}
