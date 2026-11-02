import { maxUpgradeLevel, nextUpgradeCost, UPGRADES, UPGRADE_IDS, upgradeValue, type UpgradeId } from '../config/upgrades';
import type { Progression } from '../core/progression';
import { REGION_BY_ID } from '../world/regions';
import type { RoomDef } from '../world/types';

/**
 * Pure view-models for the menu screens (map, gear, vendor, records). No Phaser: unit-tested in Node.
 */

export interface MapCell {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
  visited: boolean;
  /** Seen only as the far side of a door from a visited room. */
  known: boolean;
  current: boolean;
  hasRelay: boolean;
  hasBoss: boolean;
}

export interface MapLink {
  from: string;
  to: string;
}

export interface MapModel {
  cells: MapCell[];
  links: MapLink[];
  /** Total rooms in the world and how many the Courier has seen. */
  total: number;
  discovered: number;
}

/** Lay the world map out on a grid. Unvisited rooms stay hidden unless a visited room has a door to them. */
export function buildMapModel(rooms: readonly RoomDef[], progression: Progression, currentRoom: string, cellW: number, cellH: number, gap: number, originX: number, originY: number): MapModel {
  const byId = new Map(rooms.map((r) => [r.id, r]));
  const visited = progression.visitedRooms;
  const known = new Set<string>();
  for (const id of visited) for (const d of byId.get(id)?.doors ?? []) known.add(d.to.room);
  const minX = Math.min(...rooms.map((r) => r.mapPos?.x ?? 0));
  const minY = Math.min(...rooms.map((r) => r.mapPos?.y ?? 0));
  const cells: MapCell[] = [];
  for (const r of rooms) {
    const isVisited = visited.has(r.id);
    const isKnown = known.has(r.id);
    if (!isVisited && !isKnown) continue;
    const p = r.mapPos ?? { x: 0, y: 0 };
    cells.push({
      id: r.id,
      name: isVisited ? r.name : '???',
      x: originX + (p.x - minX) * (cellW + gap),
      y: originY + (p.y - minY) * (cellH + gap),
      w: cellW,
      h: cellH,
      color: REGION_BY_ID.get(r.region ?? 'rainline')?.color ?? 0x888888,
      visited: isVisited,
      known: !isVisited && isKnown,
      current: r.id === currentRoom,
      hasRelay: r.layout.some((l) => l.includes('K')),
      hasBoss: r.layout.some((l) => l.includes('X')) || (r.spawns ?? []).some((s) => s.kind === 'boss'),
    });
  }
  const shown = new Set(cells.map((c) => c.id));
  const links: MapLink[] = [];
  const seen = new Set<string>();
  for (const r of rooms) {
    if (!visited.has(r.id)) continue;
    for (const d of r.doors) {
      const key = [r.id, d.to.room].sort().join('|');
      if (seen.has(key) || !shown.has(d.to.room)) continue;
      seen.add(key);
      links.push({ from: r.id, to: d.to.room });
    }
  }
  return { cells, links, total: rooms.length, discovered: visited.size };
}

export interface StockLine {
  id: UpgradeId;
  name: string;
  description: string;
  level: number;
  max: number;
  /** Current and next value of the stat. */
  value: number;
  next: number | null;
  unit: string;
  cost: number | null;
  affordable: boolean;
}

/** Vendor stock for an NPC's upgrade list. */
export function vendorStock(ids: readonly UpgradeId[], progression: Progression): StockLine[] {
  return ids.map((id) => {
    const def = UPGRADES[id];
    const level = progression.upgradeLevel(id);
    const max = maxUpgradeLevel(id);
    const cost = nextUpgradeCost(id, level);
    return {
      id,
      name: def.name,
      description: def.description,
      level,
      max,
      value: upgradeValue(id, level),
      next: level < max ? upgradeValue(id, level + 1) : null,
      unit: def.unit,
      cost,
      affordable: cost !== null && progression.scrap >= cost,
    };
  });
}

export interface GearModel {
  abilities: { id: string; name: string; owned: boolean; description: string }[];
  stats: { label: string; value: string }[];
  items: { id: string; count: number }[];
  scrap: number;
  upgrades: StockLine[];
}

export function buildGearModel(progression: Progression, maxHealth: number, health: number): GearModel {
  const owned = (a: string) => progression.abilities.has(a as never);
  return {
    abilities: [
      { id: 'dash', name: 'Dash', owned: true, description: 'Always available. Cooldown 0.4 s.' },
      { id: 'backtrace', name: 'Backtrace', owned: owned('backtrace'), description: 'Rewind your own timeline to your echo. The world does not rewind.' },
      { id: 'glitch-strike', name: 'Glitch Strike', owned: owned('glitch-strike'), description: 'Hold ATK to charge a piercing heavy strike (costs Signal).' },
      { id: 'air-jump', name: 'Kinetic Coil', owned: owned('air-jump'), description: 'One extra jump in mid-air.' },
    ],
    stats: [
      { label: 'Integrity', value: `${health} / ${maxHealth}` },
      { label: 'Echo window', value: `${upgradeValue('backtraceWindow', progression.upgradeLevel('backtraceWindow')).toFixed(1)} s` },
      { label: 'Backtrace recharge', value: `${upgradeValue('backtraceCooldown', progression.upgradeLevel('backtraceCooldown')).toFixed(1)} s` },
      { label: 'Arrival burst', value: `${upgradeValue('backtraceBurst', progression.upgradeLevel('backtraceBurst'))} dmg` },
      { label: 'Signal regen', value: `${upgradeValue('signalRegen', progression.upgradeLevel('signalRegen'))} /s` },
      { label: 'Deaths', value: String(progression.deaths) },
    ],
    items: Object.entries(progression.inventory).map(([id, count]) => ({ id, count })),
    scrap: progression.scrap,
    upgrades: vendorStock(UPGRADE_IDS, progression),
  };
}

export interface RecordEntry {
  id: string;
  title: string;
  text: string;
}

/** Lore records the Courier has collected, in world order. */
export function collectedRecords(rooms: readonly RoomDef[], progression: Progression): { entries: RecordEntry[]; total: number } {
  const all: RecordEntry[] = [];
  for (const r of rooms) {
    for (const s of r.spawns ?? []) {
      if (s.kind === 'pickup' && s.pickup === 'record') all.push({ id: s.id, title: s.title ?? 'Record', text: s.text ?? '' });
    }
  }
  return { entries: all.filter((e) => progression.collected.has(e.id)), total: all.length };
}

/** Wrap text to a character width (monospace-ish estimate), preserving explicit newlines. */
export function wrapText(text: string, maxChars: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      if (!word) continue;
      if ((line + ' ' + word).trim().length > maxChars) {
        if (line) out.push(line);
        line = word;
      } else line = (line + ' ' + word).trim();
    }
    out.push(line);
  }
  return out;
}
