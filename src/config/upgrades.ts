/**
 * Upgrade ladders. Level 0 is the base game; each purchase or upgrade-core pickup raises one level.
 * Scrap is the only currency: it drops from enemies and caches, and is spent at gearsmiths.
 * Costs are intentionally low-count / high-impact: every level changes how the Courier plays.
 */

export type UpgradeId = 'backtraceWindow' | 'backtraceCooldown' | 'backtraceBurst' | 'signalRegen';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  /** Value of the stat at each level (index = level). */
  values: readonly number[];
  /** Scrap cost to reach level (index+1). Length = values.length - 1. */
  costs: readonly number[];
  unit: string;
}

export const UPGRADES: Readonly<Record<UpgradeId, UpgradeDef>> = {
  backtraceWindow: {
    id: 'backtraceWindow',
    name: 'Deep Echo',
    description: 'Backtrace reaches further back in time.',
    values: [4.0, 4.5, 5.0, 5.5],
    costs: [40, 80, 140],
    unit: 's',
  },
  backtraceCooldown: {
    id: 'backtraceCooldown',
    name: 'Quick Recoil',
    description: 'Backtrace recharges faster.',
    values: [6.0, 5.0, 4.2, 3.5],
    costs: [35, 70, 120],
    unit: 's',
  },
  backtraceBurst: {
    id: 'backtraceBurst',
    name: 'Arrival Burst',
    description: 'The shockwave where you arrive hits harder.',
    values: [2, 3, 4],
    costs: [60, 130],
    unit: 'dmg',
  },
  signalRegen: {
    id: 'signalRegen',
    name: 'Signal Siphon',
    description: 'Signal Energy regenerates faster.',
    values: [8, 11, 15],
    costs: [45, 100],
    unit: '/s',
  },
};

export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];

export function maxUpgradeLevel(id: UpgradeId): number {
  return UPGRADES[id].values.length - 1;
}

export function upgradeValue(id: UpgradeId, level: number): number {
  const def = UPGRADES[id];
  const l = Math.max(0, Math.min(level, def.values.length - 1));
  return def.values[l] as number;
}

/** Scrap needed to buy the next level, or null if maxed. */
export function nextUpgradeCost(id: UpgradeId, level: number): number | null {
  const def = UPGRADES[id];
  if (level >= def.values.length - 1) return null;
  return def.costs[level] ?? null;
}
