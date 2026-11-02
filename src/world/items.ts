/** Inventory items (quest items and keys). Shown in the Gear screen and used as door / dialogue conditions. */

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  /** Placeholder icon colour (palette key hex). */
  color: number;
}

export const ITEMS: Readonly<Record<string, ItemDef>> = {
  'precinct-keycard': { id: 'precinct-keycard', name: 'Precinct Keycard', description: 'Level-3 access card taken from a dead sergeant. Opens the Vault checkpoint.', color: 0xffb02e },
  'med-kit': { id: 'med-kit', name: 'Field Med Kit', description: 'Sealed trauma pack. Doc Ilse has been asking after it.', color: 0x4dff9a },
  'mech-coil': { id: 'mech-coil', name: 'Hall Coil', description: 'A scorched induction coil. Halden needs it for the Stacks lift.', color: 0x3cf2ff },
  'relay-fuse': { id: 'relay-fuse', name: 'Relay Fuse', description: 'A heavy-duty fuse for the Undercity relay.', color: 0xff3ea5 },
  'badge-fragment': { id: 'badge-fragment', name: 'Officer Badge', description: 'A cracked precinct badge: service number partly legible.', color: 0xc9d4ff },
  'core-key': { id: 'core-key', name: 'Core Authority Chip', description: 'Opens the Industrial Core maintenance lock.', color: 0xff6a2e },
  'null-shard': { id: 'null-shard', name: 'Null Shard', description: 'A shard of nothing, humming. Dr. Vesper wants to study it.', color: 0x9b59ff },
};

export function itemName(id: string): string {
  return ITEMS[id]?.name ?? id;
}
