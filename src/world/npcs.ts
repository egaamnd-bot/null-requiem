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
  /** Upgrades this NPC sells (opens the vendor screen from dialogue via `openVendor: <id>`). */
  vendor?: readonly ('backtraceWindow' | 'backtraceCooldown' | 'backtraceBurst' | 'signalRegen')[];
}

export const NPC_KINDS_ALL = ['zero', 'mira', 'terminal', 'mechanic', 'medic', 'officer', 'trader', 'informant', 'researcher', 'echo', 'desertman'] as const;

export const NPC_REGISTRY: Record<string, NpcRegistryEntry> = {
  'desert-man': { id: 'desert-man', name: 'DESERT MAN', kind: 'desertman', dialogue: 'desert-man', verb: 'Talk', archetype: 'wanderer from beyond the walls' },
  zero: { id: 'zero', name: 'ZERO', kind: 'zero', dialogue: 'zero', archetype: 'street informant' },
  mira: { id: 'mira', name: 'MIRA', kind: 'mira', dialogue: 'mira', archetype: 'survivor archivist' },
  'ghost-terminal': { id: 'ghost-terminal', name: 'GHOST TERMINAL', kind: 'terminal', dialogue: 'ghost-terminal', verb: 'Read', archetype: 'narrative terminal' },
  'null-echo-npc': { id: 'null-echo-npc', name: 'NULL ECHO', kind: 'echo', dialogue: 'null-echo-npc', archetype: 'erased survivor' },
  'depot-terminal': { id: 'depot-terminal', name: 'DEPOT TERMINAL', kind: 'terminal', dialogue: 'depot-terminal', verb: 'Read', archetype: 'tutorial terminal' },
  halden: { id: 'halden', name: 'HALDEN', kind: 'mechanic', dialogue: 'halden', verb: 'Talk', archetype: 'station mechanic', vendor: ['backtraceCooldown', 'signalRegen'] },
  'cell-terminal': { id: 'cell-terminal', name: 'CELL BLOCK LOG', kind: 'terminal', dialogue: 'cell-terminal', verb: 'Read', archetype: 'narrative terminal' },
  ilse: { id: 'ilse', name: 'DOC ILSE', kind: 'medic', dialogue: 'ilse', archetype: 'underground medic' },
  kestrel: { id: 'kestrel', name: 'KESTREL', kind: 'trader', dialogue: 'kestrel', verb: 'Trade', archetype: 'black-market trader', vendor: ['backtraceWindow', 'backtraceBurst'] },
  brannt: { id: 'brannt', name: 'BRANNT', kind: 'officer', dialogue: 'brannt', archetype: 'former security officer' },
  wren: { id: 'wren', name: 'WREN', kind: 'informant', dialogue: 'wren', archetype: 'street informant' },
  vesper: { id: 'vesper', name: 'DR. VESPER', kind: 'researcher', dialogue: 'vesper', archetype: 'temporal researcher' },
  'reactor-console': { id: 'reactor-console', name: 'REACTOR CONSOLE', kind: 'terminal', dialogue: 'reactor-console', verb: 'Operate', archetype: 'power terminal' },
  'archive-console': { id: 'archive-console', name: 'ARCHIVE CONSOLE', kind: 'terminal', dialogue: 'archive-console', verb: 'Read', archetype: 'narrative terminal' },
  choir: { id: 'choir', name: 'THE CHOIR', kind: 'terminal', dialogue: 'choir', verb: 'Listen', archetype: 'narrative terminal' },
};
