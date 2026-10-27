import { describe, expect, it } from 'vitest';
import { clampScroll, CameraFollow } from '../src/core/camera';
import { GameFlow, type FlowAction, type FlowState } from '../src/core/flow';
import { createRng } from '../src/core/math';
import { loadProgression, MemorySaveStore, Progression, saveProgression } from '../src/core/progression';

describe('GameFlow state machine', () => {
  it('follows the expected happy path', () => {
    const f = new GameFlow();
    const path: [FlowAction, FlowState][] = [
      ['start', 'playing'],
      ['pause', 'paused'],
      ['resume', 'playing'],
      ['playerDied', 'dying'],
      ['deathFinished', 'gameover'],
      ['retry', 'playing'],
      ['win', 'victory'],
      ['quit', 'title'],
    ];
    for (const [action, expected] of path) {
      expect(f.dispatch(action), action).toBe(true);
      expect(f.state).toBe(expected);
    }
  });

  it('rejects every transition not in the table', () => {
    const all: FlowAction[] = ['start', 'pause', 'resume', 'playerDied', 'deathFinished', 'retry', 'win', 'quit'];
    const legal: Record<FlowState, FlowAction[]> = {
      title: ['start'],
      playing: ['pause', 'playerDied', 'win', 'quit'],
      paused: ['resume', 'retry', 'quit'],
      dying: ['deathFinished'],
      gameover: ['retry', 'quit'],
      victory: ['quit'],
    };
    for (const state of Object.keys(legal) as FlowState[]) {
      for (const action of all) {
        const f = new GameFlow(state);
        expect(f.dispatch(action), `${state} + ${action}`).toBe(legal[state].includes(action));
        if (!legal[state].includes(action)) expect(f.state).toBe(state);
      }
    }
  });

  it('only simulates while playing or dying', () => {
    expect(new GameFlow('playing').simulating).toBe(true);
    expect(new GameFlow('dying').simulating).toBe(true);
    for (const s of ['title', 'paused', 'gameover', 'victory'] as FlowState[]) expect(new GameFlow(s).simulating).toBe(false);
  });
});

describe('Save data', () => {
  it('round-trips progression through a store', () => {
    const p = new Progression();
    p.unlock('backtrace');
    p.latchedGates.add('gallery:timedGate');
    p.secrets.add('ashfall:H:2,19');
    p.brokenWalls.add('ashfall:wall:5,16');
    p.maxHealthBonus = 1;
    p.checkpoint = { roomId: 'gallery', x: 904, y: 416 };
    p.bossDefeated = true;
    p.deaths = 3;
    p.playTime = 123.5;
    const store = new MemorySaveStore();
    saveProgression(store, p);
    const loaded = loadProgression(store);
    expect(loaded?.serialize()).toEqual(p.serialize());
  });

  it('returns null for missing, corrupt, or wrong-version saves', () => {
    const store = new MemorySaveStore();
    expect(loadProgression(store)).toBeNull();
    store.save('{not json');
    expect(loadProgression(store)).toBeNull();
    store.save(JSON.stringify({ version: 99 }));
    expect(loadProgression(store)).toBeNull();
  });

  it('sanitises unexpected values', () => {
    const p = Progression.deserialize({ version: 1, abilities: ['backtrace', 'flight', 3], maxHealthBonus: -4, checkpoint: { roomId: 7 } });
    expect(p).not.toBeNull();
    expect([...p!.abilities]).toEqual(['backtrace']);
    expect(p!.maxHealthBonus).toBe(0);
    expect(p!.checkpoint).toBeNull();
  });
});

describe('Camera bounds', () => {
  it('never scrolls outside the room, wherever the player goes', () => {
    const rng = createRng(5);
    const bounds = { width: 1280, height: 480 };
    const cam = new CameraFollow(480, 270, bounds);
    cam.snap(10, 10, 1);
    for (let i = 0; i < 5000; i++) {
      const fx = rng() * 1600 - 160;
      const fy = rng() * 700 - 100;
      cam.update(fx, fy, rng() < 0.5 ? -1 : 1, 1 / 60);
      expect(cam.x).toBeGreaterThanOrEqual(0);
      expect(cam.y).toBeGreaterThanOrEqual(0);
      expect(cam.x + 480).toBeLessThanOrEqual(bounds.width + 1e-9);
      expect(cam.y + 270).toBeLessThanOrEqual(bounds.height + 1e-9);
    }
  });

  it('re-clamps immediately when moving to a smaller room', () => {
    const cam = new CameraFollow(480, 270, { width: 2000, height: 900 });
    cam.snap(1900, 850, 1);
    cam.setBounds({ width: 704, height: 320 });
    expect(cam.x).toBeLessThanOrEqual(704 - 480);
    expect(cam.y).toBeLessThanOrEqual(320 - 270);
  });

  it('clampScroll keeps the view inside the room', () => {
    expect(clampScroll(-50, -50, 480, 270, { width: 1000, height: 500 })).toEqual({ x: 0, y: 0 });
    expect(clampScroll(900, 400, 480, 270, { width: 1000, height: 500 })).toEqual({ x: 520, y: 230 });
  });
});
