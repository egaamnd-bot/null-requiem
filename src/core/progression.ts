import type { Ability } from './events';

export interface CheckpointRef {
  roomId: string;
  /** Feet position of the respawn point, in pixels. */
  x: number;
  y: number;
}

export interface ProgressionData {
  version: 1;
  abilities: Ability[];
  secrets: string[];
  brokenWalls: string[];
  latchedGates: string[];
  maxHealthBonus: number;
  checkpoint: CheckpointRef | null;
  bossDefeated: boolean;
  deaths: number;
  playTime: number;
}

/** Persistent run progress: what survives death, and what is written to save data. */
export class Progression {
  readonly abilities = new Set<Ability>();
  readonly secrets = new Set<string>();
  readonly brokenWalls = new Set<string>();
  /** Timed gates the player has passed; they stay open for good. */
  readonly latchedGates = new Set<string>();
  maxHealthBonus = 0;
  checkpoint: CheckpointRef | null = null;
  bossDefeated = false;
  deaths = 0;
  playTime = 0;

  has(ability: Ability): boolean {
    return this.abilities.has(ability);
  }

  unlock(ability: Ability): boolean {
    if (this.abilities.has(ability)) return false;
    this.abilities.add(ability);
    return true;
  }

  serialize(): ProgressionData {
    return {
      version: 1,
      abilities: [...this.abilities],
      secrets: [...this.secrets],
      brokenWalls: [...this.brokenWalls],
      latchedGates: [...this.latchedGates],
      maxHealthBonus: this.maxHealthBonus,
      checkpoint: this.checkpoint ? { ...this.checkpoint } : null,
      bossDefeated: this.bossDefeated,
      deaths: this.deaths,
      playTime: this.playTime,
    };
  }

  static deserialize(raw: unknown): Progression | null {
    if (!raw || typeof raw !== 'object') return null;
    const d = raw as Partial<ProgressionData>;
    if (d.version !== 1) return null;
    const p = new Progression();
    const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s) => typeof s === 'string') : []);
    for (const a of strings(d.abilities)) if (a === 'backtrace') p.abilities.add(a);
    for (const s of strings(d.secrets)) p.secrets.add(s);
    for (const w of strings(d.brokenWalls)) p.brokenWalls.add(w);
    for (const g of strings(d.latchedGates)) p.latchedGates.add(g);
    p.maxHealthBonus = typeof d.maxHealthBonus === 'number' ? Math.max(0, Math.floor(d.maxHealthBonus)) : 0;
    const cp = d.checkpoint;
    if (cp && typeof cp.roomId === 'string' && typeof cp.x === 'number' && typeof cp.y === 'number') {
      p.checkpoint = { roomId: cp.roomId, x: cp.x, y: cp.y };
    }
    p.bossDefeated = d.bossDefeated === true;
    p.deaths = typeof d.deaths === 'number' ? d.deaths : 0;
    p.playTime = typeof d.playTime === 'number' ? d.playTime : 0;
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
  store.save(JSON.stringify(p.serialize()));
}

export function loadProgression(store: SaveStore): Progression | null {
  const raw = store.load();
  if (!raw) return null;
  try {
    return Progression.deserialize(JSON.parse(raw));
  } catch {
    return null;
  }
}
