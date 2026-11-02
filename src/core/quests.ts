import { evalCondition, type Condition } from './conditions';
import type { Emit } from './events';
import type { Progression } from './progression';

export type QuestCategory = 'main' | 'side' | 'exploration' | 'recovery';

export type ObjectiveType = 'kill' | 'visit' | 'talk' | 'collect' | 'flag' | 'boss' | 'item';

export interface ObjectiveDef {
  id: string;
  text: string;
  type: ObjectiveType;
  /** kill: enemy kind (or '*'); visit: room id; talk: npc id; collect: pickup id prefix or item id; flag: flag; boss: boss id; item: item id. */
  target: string;
  count?: number;
}

export interface QuestRewards {
  scrap?: number;
  items?: { id: string; n?: number }[];
  flags?: string[];
  maxHealth?: number;
  upgrade?: string;
  /** Short human-readable summary for the journal. */
  text?: string;
}

export interface QuestDef {
  id: string;
  title: string;
  category: QuestCategory;
  summary: string;
  giver?: string;
  objectives: ObjectiveDef[];
  rewards?: QuestRewards;
  /** Main quests turn themselves in on completion; side quests are handed in via dialogue (`turnInQuest`). */
  autoTurnIn?: boolean;
  /** Must hold before the quest can be started. */
  requires?: Condition;
  /** Objectives must be done in order (only the first unfinished one is "current"). */
  sequential?: boolean;
}

export interface QuestView {
  id: string;
  title: string;
  category: QuestCategory;
  summary: string;
  status: 'active' | 'complete' | 'turnedIn';
  objectives: { id: string; text: string; done: boolean; progress: number; count: number; current: boolean }[];
  rewardText: string;
}

export interface QuestHost {
  grantRewards(rewards: QuestRewards): void;
}

/** Problems with quest data that tests (and the campaign validator) should treat as errors. */
export function validateQuests(defs: readonly QuestDef[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const q of defs) {
    if (ids.has(q.id)) problems.push(`duplicate quest ${q.id}`);
    ids.add(q.id);
    if (q.objectives.length === 0) problems.push(`${q.id}: no objectives`);
    const objIds = new Set<string>();
    for (const o of q.objectives) {
      if (objIds.has(o.id)) problems.push(`${q.id}: duplicate objective ${o.id}`);
      objIds.add(o.id);
      if ((o.count ?? 1) < 1) problems.push(`${q.id}.${o.id}: count < 1`);
      if (!o.text) problems.push(`${q.id}.${o.id}: no text`);
    }
  }
  return problems;
}

/**
 * Quest tracking on top of `Progression`. Counting objectives (kill / visit / talk / collect) advance through
 * `notify`; state objectives (flag / boss / item) are re-evaluated by `refresh`, so they can never get out of
 * sync with the world. Everything persists via `progression.quests`.
 */
export class QuestLog {
  private readonly byId = new Map<string, QuestDef>();

  constructor(
    defs: readonly QuestDef[],
    private readonly progression: Progression,
    private readonly host: QuestHost,
    private readonly emit: Emit,
  ) {
    for (const d of defs) this.byId.set(d.id, d);
  }

  def(id: string): QuestDef | undefined {
    return this.byId.get(id);
  }

  status(id: string): 'none' | 'active' | 'complete' | 'turnedIn' {
    return this.progression.quests[id]?.status ?? 'none';
  }

  /** Begin a quest. No-op (false) if unknown, already started, or its requirement is unmet. */
  start(id: string): boolean {
    const def = this.byId.get(id);
    if (!def || this.progression.quests[id]) return false;
    if (!evalCondition(def.requires, this.progression)) return false;
    this.progression.quests[id] = { status: 'active', progress: {} };
    this.emit({ type: 'questUpdated', questId: id, status: 'started', text: def.title });
    this.refresh();
    return true;
  }

  /** Start every not-yet-started quest whose `requires` condition now holds and which has no giver NPC. */
  startAutoQuests(): void {
    for (const def of this.byId.values()) {
      if (!def.giver && !this.progression.quests[def.id]) this.start(def.id);
    }
  }

  private isDone(def: QuestDef, o: ObjectiveDef): boolean {
    return this.countFor(def, o) >= (o.count ?? 1);
  }

  private countFor(def: QuestDef, o: ObjectiveDef): number {
    const q = this.progression.quests[def.id];
    if (!q) return 0;
    switch (o.type) {
      case 'flag':
        return this.progression.hasFlag(o.target) ? (o.count ?? 1) : 0;
      case 'boss':
        return this.progression.defeatedBosses.has(o.target) ? (o.count ?? 1) : 0;
      case 'item':
        return this.progression.itemCount(o.target);
      default:
        return q.progress[o.id] ?? 0;
    }
  }

  /** Report that something countable happened. */
  notify(type: 'kill' | 'visit' | 'talk' | 'collect', target: string, n = 1): void {
    let changed = false;
    for (const def of this.byId.values()) {
      const q = this.progression.quests[def.id];
      if (!q || q.status !== 'active') continue;
      for (const [i, o] of def.objectives.entries()) {
        if (o.type !== type || this.isDone(def, o)) continue;
        if (def.sequential && !this.objectiveReachable(def, i)) continue;
        const matches = o.target === '*' || o.target === target || (type === 'collect' && target.startsWith(o.target));
        if (!matches) continue;
        q.progress[o.id] = Math.min(o.count ?? 1, (q.progress[o.id] ?? 0) + n);
        changed = true;
        this.emit({
          type: 'questUpdated',
          questId: def.id,
          status: 'progress',
          text: `${o.text} (${Math.min(q.progress[o.id] as number, o.count ?? 1)}/${o.count ?? 1})`,
        });
      }
    }
    if (changed) this.refresh();
  }

  private objectiveReachable(def: QuestDef, index: number): boolean {
    for (let i = 0; i < index; i++) if (!this.isDone(def, def.objectives[i] as ObjectiveDef)) return false;
    return true;
  }

  /** Re-evaluate completion for every active quest (call after any state change). */
  refresh(): void {
    for (const def of this.byId.values()) {
      const q = this.progression.quests[def.id];
      if (!q || q.status !== 'active') continue;
      if (def.objectives.every((o) => this.isDone(def, o))) {
        q.status = 'complete';
        this.emit({ type: 'questUpdated', questId: def.id, status: 'complete', text: def.title });
        if (def.autoTurnIn) this.turnIn(def.id);
      }
    }
    // Giver-less quests unlock as their requirements come true.
    this.startAutoQuests();
  }

  /** Hand in a completed quest and receive its rewards (once). */
  turnIn(id: string): boolean {
    const def = this.byId.get(id);
    const q = this.progression.quests[id];
    if (!def || !q || q.status !== 'complete') return false;
    q.status = 'turnedIn';
    if (def.rewards) this.host.grantRewards(def.rewards);
    this.emit({ type: 'questUpdated', questId: id, status: 'turnedIn', text: def.title });
    return true;
  }

  /** Journal view of every started quest, newest-active first, completed last. */
  journal(): QuestView[] {
    const order = { complete: 0, active: 1, turnedIn: 2 } as const;
    const views: QuestView[] = [];
    for (const def of this.byId.values()) {
      const q = this.progression.quests[def.id];
      if (!q) continue;
      let currentAssigned = false;
      const objectives = def.objectives.map((o, i) => {
        const done = this.isDone(def, o);
        const reachable = !def.sequential || this.objectiveReachable(def, i);
        const current = q.status === 'active' && !done && reachable && !currentAssigned;
        if (current) currentAssigned = true;
        return { id: o.id, text: o.text, done, progress: Math.min(this.countFor(def, o), o.count ?? 1), count: o.count ?? 1, current };
      });
      views.push({ id: def.id, title: def.title, category: def.category, summary: def.summary, status: q.status, objectives, rewardText: def.rewards?.text ?? '' });
    }
    return views.sort((a, b) => order[a.status] - order[b.status] || (a.category === 'main' ? -1 : 0) - (b.category === 'main' ? -1 : 0));
  }

  /** The single objective text to show on the HUD (first active main quest, else first active). */
  trackedObjective(): { title: string; text: string } | null {
    const views = this.journal().filter((v) => v.status === 'active' || v.status === 'complete');
    const v = views.find((x) => x.category === 'main' && x.status === 'active') ?? views.find((x) => x.status === 'active') ?? views[0];
    if (!v) return null;
    if (v.status === 'complete') return { title: v.title, text: 'Return to hand in' };
    const o = v.objectives.find((x) => x.current) ?? v.objectives.find((x) => !x.done);
    return o ? { title: v.title, text: o.count > 1 ? `${o.text} (${o.progress}/${o.count})` : o.text } : null;
  }
}
