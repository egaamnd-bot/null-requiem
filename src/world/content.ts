import type { DialogueDef } from '../core/dialogue';
import type { QuestDef } from '../core/quests';
import { DIALOGUES } from './dialogues';
import { NPC_REGISTRY, type NpcRegistryEntry } from './npcs';
import { QUESTS } from './quests';

/** Everything story-shaped the simulation needs, injected so tests can run with tiny custom content. */
export interface WorldContent {
  quests: readonly QuestDef[];
  dialogues: Readonly<Record<string, DialogueDef>>;
  npcs: Readonly<Record<string, NpcRegistryEntry>>;
}

export const DEFAULT_CONTENT: WorldContent = { quests: QUESTS, dialogues: DIALOGUES, npcs: NPC_REGISTRY };
