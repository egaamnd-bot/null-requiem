/** NPC registry: who exists, what they look like (placeholder sprite key) and which dialogue they run. */

export interface NpcRegistryEntry {
  id: string;
  name: string;
  /** Sprite key (placeholder generator + final art both key on this). */
  kind: string;
  dialogue: string;
  /** Interaction verb for the prompt. */
  verb?: string;
  archetype: string;
}

export const NPC_REGISTRY: Record<string, NpcRegistryEntry> = {};
