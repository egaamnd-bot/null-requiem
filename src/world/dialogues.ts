/**
 * NPC dialogue data and memory fragment lore.
 * The story: VOID is a data-ghost — a person whose memories were forcibly extracted by NullCorp.
 * The Backtrace implant lets them rewind their own timeline. They're breaking into the Null Archive
 * to recover what was taken from them — and expose what NullCorp has been doing to thousands of Nulls.
 */

export interface NpcDialogueDef {
  id: string;
  name: string;
  kind: 'zero' | 'mira' | 'terminal';
  lines: readonly string[];
}

/** NPC definitions keyed by room then marker position index (for multi-NPC rooms). */
export const NPC_DEFS: Readonly<Record<string, NpcDialogueDef>> = {
  'alley:N:0': {
    id: 'zero',
    name: 'ZERO',
    kind: 'zero',
    lines: [
      'Zero: "You\'re not supposed to be alive. NullCorp logged you as wiped three days ago."',
      'Zero: "That implant on your spine — that\'s Backtrace tech. Stolen from their R&D vault."',
      'Zero: "It records your timeline. Lets you snap back to a ghost of yourself."',
      'Zero: "The Null Archive is past the Precinct. Every stolen memory ends up there."',
      'Zero: "...and whatever you remember about who you were? Guard it. NullCorp wants it gone."',
    ],
  },
  'transit:N:0': {
    id: 'mira',
    name: 'MIRA',
    kind: 'mira',
    lines: [
      'Mira: "Memory shards. You\'re picking them up. Smart null."',
      'Mira: "Each shard is someone\'s stolen moment. To NullCorp it\'s data. To us it\'s everything."',
      'Mira: "They call us Nulls. People who failed their memory audit. I prefer survivor."',
      'Mira: "Past the Stacks, something watches. Optical array. Don\'t blink — it scans movement."',
      'Mira: "If you get to the Archive... whatever you find in there, bring it back. People deserve to know."',
    ],
  },
  'precinct:N:0': {
    id: 'ghost-terminal',
    name: 'GHOST TERMINAL',
    kind: 'terminal',
    lines: [
      '[NULLCORP INTERNAL — DECRYPTED] "Subject VD-7 escaped memory extraction. Status: hostile."',
      '[LOG 2087-11-02] "Backtrace prototype confirmed active on subject. Dispatch PANOPTIX-0."',
      '[LOG 2087-11-02] "PANOPTIX-0 assigned to Null Archive guard duty. Threat assessment: lethal."',
      '[LOG 2087-11-03] "Memory audit failure rate: 34%. Board recommends expanded Precinct access."',
      '[ENCRYPTED — PARTIAL DECODE] "...the archive contains 847,000 memory cores... yours among them..."',
    ],
  },
  'undercroft:N:0': {
    id: 'null-echo',
    name: 'NULL ECHO',
    kind: 'zero',
    lines: [
      'Null Echo: "This is where they stash us. The ones they couldn\'t fully erase."',
      'Null Echo: "We loop down here. Same last moment, again and again."',
      'Null Echo: "Your implant — it lets you choose which moment you loop back to. That\'s the difference."',
      'Null Echo: "Find the Archive. End the loop. For all of us."',
    ],
  },
};

/** Memory fragment lore text, keyed by fragment ID. */
export const FRAGMENT_LORE: Readonly<Record<string, string>> = {
  'alley:F:0': '[MEMORY SHARD — CORRUPTED]\n"I had a name before VD-7.\nI had a street I walked home on.\nI had—"',
  'alley:F:1': '[SHARD — NullCorp Intake Form]\n"Subject shows resistance to neural scrub.\nIncrease amplitude. Authorize full extraction."',
  'transit:F:0': '[SHARD — Mira\'s Archive]\n"Null count in Jakarta sector: 1,247.\nThey\'re not criminals. They\'re witnesses."',
  'transit:F:1': '[SHARD — Engineering Note]\n"Backtrace unit #7 went missing from R&D.\nDo NOT log this to PRECINCT. Contain quietly."',
  'undercroft:F:0': '[SHARD — Ghost Transmission]\n"The Archive is at sub-level 4.\nCode: your birthday. You\'ll know it when you see it."',
  'null_archive:F:0': '[SHARD — Your Own Memory]\n"I remember now. My name is—\nThe data is fragmenting.\nI am more than what they erased."',
};
