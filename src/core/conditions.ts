import type { Progression, QuestStatus } from './progression';

/** A declarative predicate over persistent progress. All present fields must hold (logical AND). */
export interface Condition {
  flag?: string;
  notFlag?: string;
  item?: string;
  notItem?: string;
  boss?: string;
  notBoss?: string;
  quest?: { id: string; status: QuestStatus | 'none' | 'started' };
  scrapAtLeast?: number;
  ability?: string;
  visited?: string;
}

export function evalCondition(c: Condition | undefined, p: Progression): boolean {
  if (!c) return true;
  if (c.flag !== undefined && !p.hasFlag(c.flag)) return false;
  if (c.notFlag !== undefined && p.hasFlag(c.notFlag)) return false;
  if (c.item !== undefined && p.itemCount(c.item) <= 0) return false;
  if (c.notItem !== undefined && p.itemCount(c.notItem) > 0) return false;
  if (c.boss !== undefined && !p.defeatedBosses.has(c.boss)) return false;
  if (c.notBoss !== undefined && p.defeatedBosses.has(c.notBoss)) return false;
  if (c.scrapAtLeast !== undefined && p.scrap < c.scrapAtLeast) return false;
  if (c.ability !== undefined && !p.abilities.has(c.ability as never)) return false;
  if (c.visited !== undefined && !p.visitedRooms.has(c.visited)) return false;
  if (c.quest) {
    const q = p.quests[c.quest.id];
    const want = c.quest.status;
    if (want === 'none') return q === undefined;
    if (want === 'started') return q !== undefined;
    if (!q || q.status !== want) return false;
  }
  return true;
}
