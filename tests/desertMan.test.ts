import { describe, expect, it } from 'vitest';
import { ASSET_BY_ID } from '../src/assets/manifest';
import { Progression } from '../src/core/progression';
import { DIALOGUES } from '../src/world/dialogues';
import { NPC_REGISTRY } from '../src/world/npcs';
import { QUESTS } from '../src/world/quests';
import { ROOMS } from '../src/world/rooms';
import { NPC_ASSET } from '../src/assets/assetMap';
import { input, stepWorld, worldAt } from './helpers';

const talkAll = (w: ReturnType<typeof worldAt>) => {
  stepWorld(w, 2, () => input({ interactPressed: true }));
  for (let i = 0; i < 14 && w.inDialogue; i++) stepWorld(w, 1, () => input({ interactPressed: true }));
};

describe('Desert Man', () => {
  it('is an independent NPC with his own identity, kind, dialogue and sprite asset', () => {
    const dm = NPC_REGISTRY['desert-man']!;
    const z = NPC_REGISTRY['zero']!;
    expect(dm.name).toBe('DESERT MAN');
    expect(dm.kind).not.toBe(z.kind);
    expect(dm.dialogue).not.toBe(z.dialogue);
    expect(DIALOGUES['desert-man']).toBeTruthy();
    // ZERO is unchanged.
    expect(z).toMatchObject({ id: 'zero', name: 'ZERO', kind: 'zero', archetype: 'street informant' });
    const asset = ASSET_BY_ID.get(NPC_ASSET[dm.kind]!)!;
    expect(asset.id).toBe('npc_desert_man');
    expect(asset.anims.idle?.frames).toBe(4);
    expect(asset.anims.talk?.frames).toBe(2);
    expect(asset.placeholder).toBe('procedural');
    expect(asset.textureKeys).toHaveLength(6);
  });

  it('stands in Rainline Alley on solid ground, away from ZERO', () => {
    const alley = ROOMS.find((r) => r.id === 'alley')!;
    const dm = alley.spawns!.find((s) => s.kind === 'npc' && s.npc === 'desert-man');
    const zero = alley.spawns!.find((s) => s.kind === 'npc' && s.npc === 'zero');
    expect(dm && zero).toBeTruthy();
    if (dm?.kind === 'npc' && zero?.kind === 'npc') expect(Math.abs(dm.col - zero.col)).toBeGreaterThanOrEqual(6);
  });

  it('speaking to him completes the first main-quest objective (and not via ZERO)', () => {
    const q = QUESTS.find((x) => x.id === 'main-1')!;
    expect(q.objectives[0]).toMatchObject({ type: 'flag', target: 'met-desert-man' });
    const w = worldAt('alley', 8, 19);
    w.room.enemies = [];
    const events: string[] = [];
    stepWorld(w, 2, () => input({ interactPressed: true }));
    for (let i = 0; i < 14 && w.inDialogue; i++) {
      for (const e of stepWorld(w, 1, () => input({ interactPressed: true }))) events.push(e.type);
    }
    expect(w.progression.hasFlag('met-desert-man')).toBe(true);
    expect(events).toContain('flagSet');
    expect(w.quests.journal().find((x) => x.id === 'main-1')!.objectives[0]!.done).toBe(true);
    expect(w.progression.hasFlag('met-zero')).toBe(false);
  });

  it('talking to ZERO does not advance the Desert Man objective', () => {
    const w = worldAt('alley', 19, 19);
    w.room.enemies = [];
    talkAll(w);
    expect(w.progression.hasFlag('met-zero')).toBe(true);
    expect(w.progression.hasFlag('met-desert-man')).toBe(false);
  });

  it('his state survives a save/load round trip and changes his dialogue', () => {
    const w = worldAt('alley', 8, 19);
    w.room.enemies = [];
    talkAll(w);
    const saved = JSON.parse(JSON.stringify(w.progression.serialize()));
    const loaded = Progression.deserialize(saved)!;
    expect(loaded.hasFlag('met-desert-man')).toBe(true);
    expect(loaded.quests['main-1']?.status).toBe('active');
    const w2 = worldAt('alley', 8, 19, (p) => {
      p.setFlag('met-desert-man');
    });
    w2.room.enemies = [];
    stepWorld(w2, 1, () => input({ interactPressed: true }));
    expect(w2.hud().dialogue?.text).toMatch(/East, courier/);
  });
});
