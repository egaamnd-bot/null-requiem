/**
 * NPC dialogue graphs and memory-fragment lore.
 *
 * Story in one breath (see docs/STORY_BIBLE.md): NullCorp's Memory Audit scrubbed the Lowlands' worst night from
 * everyone's head. The scrub engine fed on what it erased and became THE NULL. The Courier (subject VD-7) carried a
 * stolen prototype that can rewind its owner's own timeline: Backtrace. Mysteries are paid out slowly: the Courier's
 * name is never given until the end.
 */
import type { DialogueDef, DialogueNode } from '../core/dialogue';
import type { Effect } from '../core/dialogue';

/** Legacy marker-keyed NPCs were migrated to the NPC registry; kept empty for import compatibility. */
export const NPC_DEFS: Readonly<Record<string, never>> = {};

type Chain = { speaker: string; text: string }[];

/** Build a linear chain of nodes `${prefix}0..n`, with `last` effects on the final line. */
function chain(prefix: string, lines: Chain, opts: { last?: Effect[]; first?: Effect[]; then?: string } = {}): Record<string, DialogueNode> {
  const nodes: Record<string, DialogueNode> = {};
  lines.forEach((l, i) => {
    const node: DialogueNode = { speaker: l.speaker, text: l.text };
    if (i < lines.length - 1) node.next = `${prefix}${i + 1}`;
    else if (opts.then) node.next = opts.then;
    if (i === 0 && opts.first) node.effects = opts.first;
    if (i === lines.length - 1 && opts.last) node.effects = [...(node.effects ?? []), ...opts.last];
    nodes[`${prefix}${i}`] = node;
  });
  return nodes;
}

const say = (speaker: string, ...texts: string[]): Chain => texts.map((text) => ({ speaker, text }));

/** Memory fragment lore text, keyed by fragment ID. */
export const FRAGMENT_LORE: Readonly<Record<string, string>> = {
  'alley:F:0': '[MEMORY SHARD — CORRUPTED]\n"I had a name before VD-7.\nI had a street I walked home on.\nI had—"',
  'alley:F:1': '[SHARD — NullCorp Intake Form]\n"Subject shows resistance to neural scrub.\nIncrease amplitude. Authorize full extraction."',
  'transit:F:0': '[SHARD — Mira\'s Archive]\n"Null count in Jakarta sector: 1,247.\nThey\'re not criminals. They\'re witnesses."',
  'transit:F:1': '[SHARD — Engineering Note]\n"Backtrace unit #7 went missing from R&D.\nDo NOT log this to PRECINCT. Contain quietly."',
  'undercroft:F:0': '[SHARD — Ghost Transmission]\n"The Archive is at sub-level 4.\nCode: your birthday. You\'ll know it when you see it."',
  'null_archive:F:0': '[SHARD — Your Own Memory]\n"I remember now. My name is—\nThe data is fragmenting.\nI am more than what they erased."',
};

export const DIALOGUES: Record<string, DialogueDef> = {
  // ─────────────────────────────────────────────────────────────── RAINLINE ALLEY
  zero: {
    id: 'zero',
    entries: [{ when: { flag: 'depot-door-open' }, node: 'after' }, { when: { flag: 'met-zero' }, node: 'again' }, { node: 'z0' }],
    nodes: {
      ...chain(
        'z',
        say(
          'ZERO',
          'You are not supposed to be walking. NullCorp logged you as wiped three nights ago.',
          'That thing on your spine is a Backtrace implant. Stolen from their R&D vault. Prototype number seven.',
          'It keeps a record of where you have been. Press rewind and you snap back to the afterimage you left four seconds ago.',
          'The world does not rewind with you. Remember that. Doors stay shut, enemies stay angry, and gravity keeps score.',
          'The Rainline Depot is east of here. Your module is in there. Go get your own memory back, courier.',
        ),
        { last: [{ setFlag: 'met-zero' }] },
      ),
      again: { speaker: 'ZERO', text: 'Depot is east. Do not stand in the rain talking to me.' },
      after: { speaker: 'ZERO', text: 'So the old door opened for you. Good. The Stacks are next. Mira can tell you what hides in them.' },
    },
  },

  'depot-terminal': {
    id: 'depot-terminal',
    entries: [{ node: 'd0' }],
    nodes: chain('d', [
      { speaker: 'DEPOT TERMINAL', text: '[RAINLINE DEPOT / MAINTENANCE] Door interlock: two plates, one pulse. Plate A holds for three seconds.' },
      { speaker: 'DEPOT TERMINAL', text: '[ADVISORY] Plate B listens only to a past self. Stand on it, then reach plate A inside four seconds. Your echo keeps the plate down.' },
      { speaker: 'DEPOT TERMINAL', text: '[TIP] REW snaps you back to your echo and undoes damage taken since. The arrival burst hurts what stands there.' },
    ]),
  },

  // ─────────────────────────────────────────────────────────────── TRANSIT STACKS
  mira: {
    id: 'mira',
    entries: [{ when: { flag: 'met-mira' }, node: 'again' }, { node: 'm0' }],
    nodes: {
      ...chain(
        'm',
        say(
          'MIRA',
          'Memory shards. You are picking them up. Smart null.',
          'Each shard is someone\'s stolen moment. To NullCorp it is data. To us it is everything.',
          'They call us Nulls: people who failed the memory audit. I prefer survivor.',
          'The Stacks are climbable if you can read the lifts. Halden keeps the yard running. Trade with him, he will not cheat you.',
        ),
        { last: [{ setFlag: 'met-mira' }] },
      ),
      again: { speaker: 'MIRA', text: 'Past the Stacks is the Precinct Vault. Bring a keycard, or bring a very good reason.' },
    },
  },

  halden: {
    id: 'halden',
    entries: [
      { when: { quest: { id: 'side-coil', status: 'complete' } }, node: 'turnin' },
      { when: { flag: 'halden-met' }, node: 'menu' },
      { node: 'h0' },
    ],
    nodes: {
      h0: { speaker: 'HALDEN', text: 'Name\'s Halden. I keep the Stacks lift alive with tape and spite.', next: 'h1', effects: [{ setFlag: 'halden-met' }] },
      h1: { speaker: 'HALDEN', text: 'You carry a rewind implant? I can tune it. Faster recoil, cleaner signal. Costs scrap. Always costs scrap.', next: 'menu' },
      menu: {
        speaker: 'HALDEN',
        text: 'What do you need?',
        choices: [
          { text: 'Tune my implant.', effects: [{ openVendor: 'halden' }] },
          { text: 'Anything I can do for you?', next: 'job', when: { quest: { id: 'side-coil', status: 'none' } } },
          { text: 'How is the coil hunt going?', next: 'hint', when: { quest: { id: 'side-coil', status: 'active' } } },
          { text: 'Just passing through.' },
        ],
      },
      job: {
        speaker: 'HALDEN',
        text: 'The lift motor needs a Hall coil. There was one in the pipeworks, deep in the Industrial Core. Fetch it and I will tune you for free.',
        effects: [{ startQuest: 'side-coil' }],
      },
      hint: { speaker: 'HALDEN', text: 'Scorched copper, about this big. It will be somewhere the steam has not cooked yet. Pipeworks, past the first vents.' },
      turnin: {
        speaker: 'HALDEN',
        text: 'That is the one. Hold still, this will sting a little.',
        next: 'thanks',
        effects: [{ turnInQuest: 'side-coil' }, { takeItem: { id: 'mech-coil' } }],
      },
      thanks: { speaker: 'HALDEN', text: 'Quick Recoil installed. Come back any time. The lift still wobbles, but it is our wobble.' },
    },
  },

  // ─────────────────────────────────────────────────────────────── PRECINCT VAULT
  'ghost-terminal': {
    id: 'ghost-terminal',
    entries: [{ node: 'g0' }],
    nodes: chain('g', [
      { speaker: 'GHOST TERMINAL', text: '[NULLCORP INTERNAL / DECRYPTED] "Subject VD-7 escaped memory extraction. Status: hostile."' },
      { speaker: 'GHOST TERMINAL', text: '[LOG 2087-11-02] "Backtrace prototype confirmed active on subject. Dispatch BULWARK-9 to the vault; PANOPTIX-0 to the Archive."' },
      { speaker: 'GHOST TERMINAL', text: '[LOG 2087-11-03] "Memory audit failure rate: 34%. Board recommends expanded Precinct authority."' },
      { speaker: 'GHOST TERMINAL', text: '[ENCRYPTED / PARTIAL] "...the Archive holds 847,000 memory cores... yours among them..."' },
    ]),
  },

  'cell-terminal': {
    id: 'cell-terminal',
    entries: [{ node: 'c0' }],
    nodes: chain('c', [
      { speaker: 'CELL BLOCK LOG', text: '[HOLDING / CELL 4] "Officer Brannt refused the Quiet order. Transferred to maintenance. Badge confiscated."' },
      { speaker: 'CELL BLOCK LOG', text: '[HOLDING / CELL 9] "Medical kit seized from the underground clinic. Evidence locker: do not release."' },
      { speaker: 'CELL BLOCK LOG', text: '[NOTE] "Laser interlocks cycle every 2.4 seconds. Walk the dark, run the light."' },
    ]),
  },

  // ─────────────────────────────────────────────────────────────── NEON UNDERCITY
  wren: {
    id: 'wren',
    entries: [{ when: { flag: 'wren-lead' }, node: 'again' }, { node: 'w0' }],
    nodes: {
      ...chain(
        'w',
        say(
          'WREN',
          'You came down from the Vault. Nobody does that. Not walking, anyway.',
          'I sell directions, mostly. Today I am giving them away. There is a coil in the arcade. A Kinetic Coil. NullCorp built them for the Core crews.',
          'Without it the towers are a wall. With it, you can climb to the Industrial Core.',
          'Mind the Stalkers in the arcade. They blink. They like it when you stand still.',
        ),
        { last: [{ setFlag: 'wren-lead' }] },
      ),
      again: { speaker: 'WREN', text: 'Arcade is east of the plaza. Do not stop moving in there. That is not advice, that is survival.' },
    },
  },

  ilse: {
    id: 'ilse',
    entries: [
      { when: { quest: { id: 'side-med', status: 'complete' } }, node: 'turnin' },
      { when: { flag: 'ilse-met' }, node: 'menu' },
      { node: 'i0' },
    ],
    nodes: {
      i0: { speaker: 'DOC ILSE', text: 'Sit. You are leaking integrity. I run a clinic out of a tram carriage and I do not do names.', next: 'menu', effects: [{ setFlag: 'ilse-met' }, { heal: true }] },
      menu: {
        speaker: 'DOC ILSE',
        text: 'I can patch you up. Anything else?',
        choices: [
          { text: 'Patch me up.', next: 'patched', effects: [{ heal: true }] },
          { text: 'Do you need help?', next: 'job', when: { quest: { id: 'side-med', status: 'none' } } },
          { text: 'About that medical kit...', next: 'hint', when: { quest: { id: 'side-med', status: 'active' } } },
          { text: 'Goodbye.' },
        ],
      },
      patched: { speaker: 'DOC ILSE', text: 'There. Good as the day you were scrubbed. Try not to need me twice in one hour.' },
      job: {
        speaker: 'DOC ILSE',
        text: 'The Precinct seized my field kit. Evidence locker, cell block. If you pass through, bring it back. It has real surgical thread.',
        effects: [{ startQuest: 'side-med' }],
      },
      hint: { speaker: 'DOC ILSE', text: 'Cell block, behind a cracked wall. They hid it where the lasers keep the guards from looking.' },
      turnin: {
        speaker: 'DOC ILSE',
        text: 'My kit. Thank you. Here: a reinforced cell. It is the best stitching I have ever done.',
        effects: [{ turnInQuest: 'side-med' }, { takeItem: { id: 'med-kit' } }],
      },
    },
  },

  kestrel: {
    id: 'kestrel',
    entries: [{ when: { flag: 'kestrel-met' }, node: 'menu' }, { node: 'k0' }],
    nodes: {
      k0: { speaker: 'KESTREL', text: 'Kestrel. I trade in things that were not supposed to survive. Scrap in, power out.', next: 'menu', effects: [{ setFlag: 'kestrel-met' }] },
      menu: {
        speaker: 'KESTREL',
        text: 'Looking to deepen your echo, or hit harder when you land?',
        choices: [
          { text: 'Show me what you have.', effects: [{ openVendor: 'kestrel' }] },
          { text: 'I need a relay fuse.', next: 'fuse', when: { quest: { id: 'side-fuse', status: 'none' } } },
          { text: 'About that fuse...', next: 'fusehint', when: { quest: { id: 'side-fuse', status: 'active' } } },
          { text: 'Handing over the fuse.', next: 'fuseturn', when: { quest: { id: 'side-fuse', status: 'complete' } } },
          { text: 'Not now.' },
        ],
      },
      fuse: { speaker: 'KESTREL', text: 'Funny. I need one too. The plaza relay is dead without it. Check the arcade. Somewhere with a lot of quarters.', effects: [{ startQuest: 'side-fuse' }] },
      fusehint: { speaker: 'KESTREL', text: 'A heavy fuse. Hidden booth in the arcade. You have to power the booth door before it will open.' },
      fuseturn: { speaker: 'KESTREL', text: 'Beautiful. The plaza lights are back. Take this, and a better price on everything from now on.', effects: [{ turnInQuest: 'side-fuse' }, { takeItem: { id: 'relay-fuse' } }] },
    },
  },

  brannt: {
    id: 'brannt',
    entries: [
      { when: { quest: { id: 'side-badge', status: 'complete' } }, node: 'turnin' },
      { when: { flag: 'brannt-met' }, node: 'menu' },
      { node: 'b0' },
    ],
    nodes: {
      b0: { speaker: 'BRANNT', text: 'Do not salute. I am not that anymore. I was Precinct, once. I refused the Quiet order and they took my badge.', next: 'b1', effects: [{ setFlag: 'brannt-met' }] },
      b1: { speaker: 'BRANNT', text: 'The Quiet. That was the night they wiped the Lowlands: the flood, the fire, the people who did not wake. The Audit cleaned our heads and told us the city was always quiet.', next: 'menu' },
      menu: {
        speaker: 'BRANNT',
        text: 'What do you want from an old guard?',
        choices: [
          { text: 'What happened on the Quiet night?', next: 'quiet' },
          { text: 'Can I help you?', next: 'job', when: { quest: { id: 'side-badge', status: 'none' } } },
          { text: 'About that badge...', next: 'hint', when: { quest: { id: 'side-badge', status: 'active' } } },
          { text: 'Nothing. Stay safe.' },
        ],
      },
      quiet: { speaker: 'BRANNT', text: 'The Audit Engine was not meant to feed. It ate every memory it took, and what it could not digest it kept. People started calling the leftover quiet "the Null". It has a shape now. It sits in the old cathedral.' },
      job: { speaker: 'BRANNT', text: 'My badge was left in the cell block, cell four. If I can hold it again, I might remember my own service number.', effects: [{ startQuest: 'side-badge' }] },
      hint: { speaker: 'BRANNT', text: 'Cell four. The wall is cracked. They did not want anyone to find it.' },
      turnin: { speaker: 'BRANNT', text: 'My badge. My number. Thank you, courier. Take my arrival trick: I have seen your burst. This will make it hit harder.', effects: [{ turnInQuest: 'side-badge' }, { takeItem: { id: 'badge-fragment' } }] },
    },
  },

  'null-echo-npc': {
    id: 'null-echo-npc',
    entries: [{ node: 'n0' }],
    nodes: chain('n', say('NULL ECHO', 'This is where they stash us. The ones they could not fully erase.', 'We loop down here. Same last moment, again and again.', 'Your implant lets you choose which moment you loop back to. That is the difference.', 'Find the Archive. End the loop. For all of us.')),
  },

  // ─────────────────────────────────────────────────────────────── INDUSTRIAL CORE
  vesper: {
    id: 'vesper',
    entries: [
      { when: { quest: { id: 'side-shard', status: 'complete' } }, node: 'turnin' },
      { when: { flag: 'vesper-met' }, node: 'menu' },
      { node: 'v0' },
    ],
    nodes: {
      ...chain(
        'v',
        say(
          'DR. VESPER',
          'You are still moving. You are VD-7, aren\'t you. I put that implant in your spine.',
          'I designed Backtrace to undo the Audit. Not to hide from it. To rewind one person\'s scrub, four seconds at a time, until the memory fit back.',
          'NullCorp made it a weapon. A way to chase deserters. I stole prototype seven before they could.',
          'The implant knows your name. It will not tell you until you earn it.',
        ),
        { last: [{ setFlag: 'vesper-met' }], then: 'menu' },
      ),
      menu: {
        speaker: 'DR. VESPER',
        text: 'Ask what you need.',
        choices: [
          { text: 'Tell me about the Null.', next: 'null' },
          { text: 'What do you need?', next: 'job', when: { quest: { id: 'side-shard', status: 'none' } } },
          { text: 'The shard...', next: 'hint', when: { quest: { id: 'side-shard', status: 'active' } } },
          { text: 'Goodbye.' },
        ],
      },
      null: { speaker: 'DR. VESPER', text: 'It is every erased minute in this city. It rewinds itself the way you do, and you can exploit that: stand where its afterimage will land.' },
      job: { speaker: 'DR. VESPER', text: 'A Null Shard condensed in the reactor vault, past the plates. Bring me one and I will boost your signal.', effects: [{ startQuest: 'side-shard' }] },
      hint: { speaker: 'DR. VESPER', text: 'The vault is sealed by two temporal plates. Use your echo, courier. It is why you carry it.' },
      turnin: { speaker: 'DR. VESPER', text: 'A real one. Thank you. Signal Siphon is yours.', effects: [{ turnInQuest: 'side-shard' }, { takeItem: { id: 'null-shard' } }] },
    },
  },

  'reactor-console': {
    id: 'reactor-console',
    entries: [{ when: { flag: 'reactor-online' }, node: 'on' }, { node: 'r0' }],
    nodes: {
      r0: {
        speaker: 'REACTOR CONSOLE',
        text: '[CORE REACTOR] Standby. Seal the coolant loop and restart?',
        choices: [{ text: 'Restart the reactor.', next: 'r1', effects: [{ setFlag: 'reactor-online' }] }, { text: 'Leave it.' }],
      },
      r1: { speaker: 'REACTOR CONSOLE', text: '[ONLINE] The kiln gate is unlocked. Furnace-warden KILN-7 is awake.' },
      on: { speaker: 'REACTOR CONSOLE', text: '[ONLINE] All systems nominal. The kiln gate is open.' },
    },
  },

  // ─────────────────────────────────────────────────────────────── NULL CATHEDRAL
  'archive-console': {
    id: 'archive-console',
    entries: [{ node: 'a0' }],
    nodes: chain('a', say('ARCHIVE CONSOLE', '[NULL ARCHIVE] 847,000 cores catalogued. The Courier\'s core is flagged: DO NOT RESTORE.', '[AUDIT NOTE] "The subject delivered the first scrub cores. They carried a quiet city\'s memories in a satchel and did not know."', '[AUDIT NOTE] "The Null grows with every delivery. The Courier is the last person who can end it. Prevent."')),
  },

  choir: {
    id: 'choir',
    entries: [{ node: 'c0' }],
    nodes: chain('c', say('THE CHOIR', 'Every erased minute sings here. They sing the same four seconds.', 'You are not the first to come. You are the first to come back.', 'The Null keeps a mirror of your power. Do not let it step where you stood.')),
  },
};

