import { describe, expect, it } from 'vitest';
import { evalCondition } from '../src/core/conditions';
import { DialogueRunner, validateDialogue, type DialogueDef, type Effect } from '../src/core/dialogue';
import type { GameEvent } from '../src/core/events';
import { Progression } from '../src/core/progression';
import { QuestLog, validateQuests, type QuestDef, type QuestRewards } from '../src/core/quests';

describe('conditions', () => {
  it('ANDs every present field and treats undefined as true', () => {
    const p = new Progression();
    p.setFlag('a');
    p.addItem('key');
    p.addScrap(10);
    p.defeatedBosses.add('b');
    p.visitedRooms.add('r');
    expect(evalCondition(undefined, p)).toBe(true);
    expect(evalCondition({ flag: 'a', item: 'key', scrapAtLeast: 10, boss: 'b', visited: 'r' }, p)).toBe(true);
    expect(evalCondition({ flag: 'a', notFlag: 'a' }, p)).toBe(false);
    expect(evalCondition({ scrapAtLeast: 11 }, p)).toBe(false);
    expect(evalCondition({ notItem: 'key' }, p)).toBe(false);
    expect(evalCondition({ notBoss: 'zzz' }, p)).toBe(true);
    expect(evalCondition({ ability: 'backtrace' }, p)).toBe(false);
  });

  it('checks quest status', () => {
    const p = new Progression();
    expect(evalCondition({ quest: { id: 'q', status: 'none' } }, p)).toBe(true);
    p.quests['q'] = { status: 'active', progress: {} };
    expect(evalCondition({ quest: { id: 'q', status: 'none' } }, p)).toBe(false);
    expect(evalCondition({ quest: { id: 'q', status: 'started' } }, p)).toBe(true);
    expect(evalCondition({ quest: { id: 'q', status: 'active' } }, p)).toBe(true);
    expect(evalCondition({ quest: { id: 'q', status: 'complete' } }, p)).toBe(false);
  });
});

const DEF: DialogueDef = {
  id: 'medic',
  entries: [
    { when: { flag: 'healed' }, node: 'again' },
    { when: { quest: { id: 'q-med', status: 'complete' } }, node: 'thanks' },
    { node: 'hello' },
  ],
  nodes: {
    hello: { speaker: 'Medic', text: 'Hurt?', next: 'offer', effects: [{ setFlag: 'met-medic' }] },
    offer: {
      speaker: 'Medic',
      text: 'I can patch you up, or I need a favour.',
      choices: [
        { text: 'Patch me up.', next: 'patched', effects: [{ heal: true }, { setFlag: 'healed' }] },
        { text: 'What favour?', next: 'favour', when: { notFlag: 'favour-taken' } },
        { text: 'Pay 20 scrap for a tonic.', next: 'patched', when: { scrapAtLeast: 20 }, effects: [{ scrap: -20 }] },
        { text: 'Never mind.' },
      ],
    },
    favour: { speaker: 'Medic', text: 'Find my kit.', effects: [{ startQuest: 'q-med' }, { setFlag: 'favour-taken' }] },
    patched: { speaker: 'Medic', text: 'Done.' },
    again: { speaker: 'Medic', text: 'You again.' },
    thanks: { speaker: 'Medic', text: 'Thank you!', effects: [{ turnInQuest: 'q-med' }] },
  },
};

function host(p: Progression) {
  const applied: Effect[] = [];
  return { applied, h: { progression: p, apply: (e: Effect) => applied.push(e) } };
}

describe('dialogue runner', () => {
  it('validates the sample as well-formed', () => {
    expect(validateDialogue(DEF)).toEqual([]);
  });

  it('flags dangling references and conditional final entries', () => {
    const broken: DialogueDef = { id: 'x', entries: [{ when: { flag: 'a' }, node: 'missing' }], nodes: { a: { text: 'hi', next: 'nope', choices: [{ text: 'c', next: 'gone' }] } } };
    const problems = validateDialogue(broken);
    expect(problems.some((s) => s.includes('missing node missing'))).toBe(true);
    expect(problems.some((s) => s.includes('next -> missing nope'))).toBe(true);
    expect(problems.some((s) => s.includes('choice -> missing gone'))).toBe(true);
    expect(problems.some((s) => s.includes('final entry must be unconditional'))).toBe(true);
  });

  it('starts at the first matching entry and applies node effects once as it is shown', () => {
    const p = new Progression();
    const { h, applied } = host(p);
    const r = new DialogueRunner(DEF, h);
    const v = r.start()!;
    expect(v.speaker).toBe('Medic');
    expect(v.text).toBe('Hurt?');
    expect(v.choices).toBeNull();
    expect(applied).toEqual([{ setFlag: 'met-medic' }]);
    r.view();
    r.view();
    expect(applied).toHaveLength(1);
  });

  it('presents only the choices whose conditions hold and keeps their original indices', () => {
    const p = new Progression();
    const { h } = host(p);
    const r = new DialogueRunner(DEF, h);
    r.start();
    const v = r.advance()!;
    expect(v.choices!.map((c) => c.text)).toEqual(['Patch me up.', 'What favour?', 'Never mind.']);
    expect(v.choices!.map((c) => c.index)).toEqual([0, 1, 3]);
    p.addScrap(25);
    const r2 = new DialogueRunner(DEF, h);
    r2.start();
    expect(r2.advance()!.choices!.map((c) => c.index)).toEqual([0, 1, 2, 3]);
  });

  it('applies choice effects, follows the branch and can end the conversation', () => {
    const p = new Progression();
    const { h, applied } = host(p);
    const r = new DialogueRunner(DEF, h);
    r.start();
    r.advance();
    const v = r.choose(1)!;
    expect(v.text).toBe('Find my kit.');
    expect(applied).toContainEqual({ startQuest: 'q-med' });
    expect(v.last).toBe(true);
    expect(r.advance()).toBeNull();
    expect(r.active).toBe(false);

    const r2 = new DialogueRunner(DEF, h);
    r2.start();
    r2.advance();
    expect(r2.choose(3)).toBeNull(); // "Never mind." has no next
    expect(r2.active).toBe(false);
  });

  it('ignores advance() on a choice node and rejects a hidden choice index', () => {
    const p = new Progression();
    const { h } = host(p);
    const r = new DialogueRunner(DEF, h);
    r.start();
    r.advance();
    expect(r.advance()!.choices).not.toBeNull();
    expect(r.choose(2)!.choices).not.toBeNull(); // scrap choice hidden: choose does nothing
    expect(r.active).toBe(true);
  });

  it('picks a later entry once flags / quests change what the NPC says', () => {
    const p = new Progression();
    p.setFlag('healed');
    const { h } = host(p);
    const r = new DialogueRunner(DEF, h);
    expect(r.start()!.text).toBe('You again.');
    const p2 = new Progression();
    p2.quests['q-med'] = { status: 'complete', progress: {} };
    expect(new DialogueRunner(DEF, host(p2).h).start()!.text).toBe('Thank you!');
  });

  it('returns null for a definition with no matching entry', () => {
    const p = new Progression();
    const def: DialogueDef = { id: 'z', entries: [{ when: { flag: 'never' }, node: 'a' }], nodes: { a: { text: 'x' } } };
    expect(new DialogueRunner(def, host(p).h).start()).toBeNull();
  });
});

const QUESTS: QuestDef[] = [
  {
    id: 'main-1',
    title: 'Find the relay',
    category: 'main',
    summary: 'Reach the Transit Stacks.',
    autoTurnIn: true,
    sequential: true,
    objectives: [
      { id: 'go', text: 'Reach the Transit Stacks', type: 'visit', target: 'transit' },
      { id: 'kill', text: 'Defeat 2 scavengers', type: 'kill', target: 'streetScavenger', count: 2 },
    ],
    rewards: { scrap: 25, flags: ['main-1-done'], text: '25 scrap' },
  },
  {
    id: 'side-1',
    title: 'The medic\'s kit',
    category: 'side',
    giver: 'medic',
    summary: 'Find the kit.',
    objectives: [
      { id: 'kit', text: 'Find the medical kit', type: 'item', target: 'med-kit' },
      { id: 'flag', text: 'Open the vault', type: 'flag', target: 'vault-open' },
      { id: 'boss', text: 'Beat the boss', type: 'boss', target: 'bulwark-9' },
    ],
    rewards: { scrap: 40, items: [{ id: 'tonic', n: 2 }], maxHealth: 1 },
  },
  { id: 'gated', title: 'Gated', category: 'exploration', summary: '', objectives: [{ id: 'a', text: 'a', type: 'collect', target: 'secret:' }], requires: { flag: 'unlock-gated' } },
];

function questEnv() {
  const p = new Progression();
  const events: GameEvent[] = [];
  const granted: QuestRewards[] = [];
  const log = new QuestLog(QUESTS, p, { grantRewards: (r) => granted.push(r) }, (e) => events.push(e));
  return { p, log, events, granted };
}

describe('quest log', () => {
  it('data validates and detects duplicates / empty objectives', () => {
    expect(validateQuests(QUESTS)).toEqual([]);
    expect(validateQuests([QUESTS[0]!, QUESTS[0]!]).some((s) => s.includes('duplicate quest'))).toBe(true);
    expect(validateQuests([{ ...QUESTS[0]!, id: 'e', objectives: [] }]).some((s) => s.includes('no objectives'))).toBe(true);
  });

  it('starts once, honours requirements, and starts giver-less quests automatically', () => {
    const { p, log, events } = questEnv();
    expect(log.start('nope')).toBe(false);
    expect(log.start('gated')).toBe(false);
    p.setFlag('unlock-gated');
    expect(log.start('gated')).toBe(true);
    expect(log.start('gated')).toBe(false);
    expect(events.filter((e) => e.type === 'questUpdated' && e.status === 'started' && e.questId === 'gated')).toHaveLength(1);
    const env = questEnv();
    env.log.startAutoQuests();
    expect(env.log.status('main-1')).toBe('active');
    expect(env.log.status('side-1')).toBe('none'); // has a giver
  });

  it('counts objectives in sequence, completes, auto-turns-in and grants rewards exactly once', () => {
    const { p, log, granted, events } = questEnv();
    log.start('main-1');
    log.notify('kill', 'streetScavenger'); // ignored: sequential, visit not done
    expect(p.quests['main-1']!.progress['kill']).toBeUndefined();
    log.notify('visit', 'transit');
    log.notify('kill', 'streetScavenger');
    expect(log.status('main-1')).toBe('active');
    log.notify('kill', 'streetScavenger');
    log.notify('kill', 'streetScavenger'); // extra kills do nothing
    expect(log.status('main-1')).toBe('turnedIn');
    expect(granted).toHaveLength(1);
    expect(granted[0]!.scrap).toBe(25);
    expect(events.some((e) => e.type === 'questUpdated' && e.status === 'complete')).toBe(true);
    expect(log.turnIn('main-1')).toBe(false);
    expect(granted).toHaveLength(1);
  });

  it('state objectives (item / flag / boss) follow the world and need a manual hand-in for side quests', () => {
    const { p, log, granted } = questEnv();
    log.start('side-1');
    p.addItem('med-kit');
    log.refresh();
    expect(log.status('side-1')).toBe('active');
    p.setFlag('vault-open');
    p.defeatedBosses.add('bulwark-9');
    log.refresh();
    expect(log.status('side-1')).toBe('complete');
    expect(granted).toHaveLength(0);
    expect(log.turnIn('side-1')).toBe(true);
    expect(granted[0]!.maxHealth).toBe(1);
    expect(log.status('side-1')).toBe('turnedIn');
  });

  it('collect objectives match by prefix', () => {
    const { p, log } = questEnv();
    p.setFlag('unlock-gated');
    log.start('gated');
    log.notify('collect', 'alley:cache:1');
    expect(log.status('gated')).toBe('active');
    log.notify('collect', 'secret:undercroft');
    expect(log.status('gated')).toBe('complete');
  });

  it('journal lists started quests with per-objective state and tracks the main objective', () => {
    const { log } = questEnv();
    expect(log.trackedObjective()).toBeNull();
    log.start('main-1');
    log.start('side-1');
    const j = log.journal();
    expect(j.map((q) => q.id)).toContain('main-1');
    expect(j.find((q) => q.id === 'main-1')!.objectives.filter((o) => o.current)).toHaveLength(1);
    expect(log.trackedObjective()).toEqual({ title: 'Find the relay', text: 'Reach the Transit Stacks' });
    log.notify('visit', 'transit');
    expect(log.trackedObjective()!.text).toBe('Defeat 2 scavengers (0/2)');
  });

  it('survives a save/load round trip mid-quest', () => {
    const { p, log } = questEnv();
    log.start('main-1');
    log.notify('visit', 'transit');
    log.notify('kill', 'streetScavenger');
    const back = Progression.deserialize(JSON.parse(JSON.stringify(p.serialize())))!;
    const log2 = new QuestLog(QUESTS, back, { grantRewards: () => undefined }, () => undefined);
    expect(log2.status('main-1')).toBe('active');
    log2.notify('kill', 'streetScavenger');
    expect(log2.status('main-1')).toBe('turnedIn');
  });
});
