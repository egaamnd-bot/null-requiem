import { expect, test, type Page } from '@playwright/test';
import { sineWav } from './wavSynth';

/** Browser tests of the recorded-audio runtime with synthetic WAV files: playback replaces the procedural sound only when a file exists. */

interface AudioProbe {
  nullRequiemAudio: { sfx: { play(c: string): void }; music: { playingFile: boolean }; bank: { isReady(id: string): boolean } };
  __starts: { loop: boolean; dur: number; loopEnd: number }[];
  __osc: number;
}

async function deliver(page: Page, manifest: object, files: Record<string, Buffer>) {
  await page.route('**/audio/**', (route) => {
    const rel = route.request().url().split('/audio/')[1]!.split('?')[0]!;
    if (rel === 'manifest.json') return route.fulfill({ contentType: 'application/json', body: JSON.stringify(manifest) });
    const f = files[rel];
    return f ? route.fulfill({ contentType: 'audio/wav', body: f }) : route.fulfill({ status: 404, body: '' });
  });
}

/** Count recorded-buffer starts and oscillator starts so we can tell which kind of sound played. */
async function spy(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as AudioProbe;
    w.__starts = [];
    w.__osc = 0;
    const origStart = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (this: AudioBufferSourceNode, ...a: [number?, number?, number?]) {
      if (this.buffer && this.buffer.duration > 0.05 && this.buffer.duration !== 0.5) w.__starts.push({ loop: this.loop, dur: Math.round(this.buffer.duration * 100) / 100, loopEnd: this.loopEnd });
      return origStart.apply(this, a);
    };
    const origOsc = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (this: OscillatorNode, ...a: [number?]) {
      w.__osc++;
      return origOsc.apply(this, a);
    };
  });
}

const boot = async (page: Page) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { nullRequiemGame: { scene: { isActive(k: string): boolean } } }).nullRequiemGame?.scene.isActive('title'), null, { timeout: 20000 });
  await page.keyboard.press('Shift'); // user gesture: creates the AudioContext (and starts the bank)
  await page.waitForTimeout(400);
};

test('a delivered SFX file plays instead of the procedural cue; without a file the procedural sound plays', async ({ page }) => {
  await spy(page);
  await deliver(page, { version: 1, sounds: { sfx_player_jump: { files: [{ file: 'sfx_player_jump_01.wav' }] } } }, { 'sfx/sfx_player_jump_01.wav': sineWav(500, 0.3) });
  await boot(page);
  await page.waitForFunction(() => (window as unknown as AudioProbe).nullRequiemAudio.bank.isReady('sfx_player_jump'), null, { timeout: 10000 });
  const r = await page.evaluate(() => {
    const w = window as unknown as AudioProbe;
    const osc0 = w.__osc;
    const s0 = w.__starts.length;
    w.nullRequiemAudio.sfx.play('jump'); // recorded
    const afterJump = { osc: w.__osc - osc0, buf: w.__starts.length - s0 };
    w.nullRequiemAudio.sfx.play('dash'); // no file: procedural
    return { afterJump, afterDash: { osc: w.__osc - osc0 - afterJump.osc, buf: w.__starts.length - s0 - afterJump.buf }, dur: w.__starts[s0]?.dur };
  });
  expect(r.afterJump).toEqual({ osc: 0, buf: 1 });
  expect(r.dur).toBeCloseTo(0.3, 1);
  expect(r.afterDash.buf).toBe(0);
  expect(r.afterDash.osc).toBeGreaterThan(0);
});

test('voice limit: a rapidly repeated sound never exceeds its maxVoices and is not doubled by the procedural fallback', async ({ page }) => {
  await spy(page);
  await deliver(page, { version: 1, sounds: { sfx_hit_light: { files: [{ file: 'sfx_hit_light_01.wav' }] } } }, { 'sfx/sfx_hit_light_01.wav': sineWav(800, 0.4) });
  await boot(page);
  await page.waitForFunction(() => (window as unknown as AudioProbe).nullRequiemAudio.bank.isReady('sfx_hit_light'), null, { timeout: 10000 });
  const r = await page.evaluate(() => {
    const w = window as unknown as AudioProbe;
    const osc0 = w.__osc;
    const s0 = w.__starts.length;
    for (let i = 0; i < 12; i++) w.nullRequiemAudio.sfx.play('hit');
    return { buf: w.__starts.length - s0, osc: w.__osc - osc0 };
  });
  expect(r.buf).toBe(4); // sfx_hit_light maxVoices = 4
  expect(r.osc).toBe(0);
});

test('a delivered music track loops with its loop region instead of the procedural score; garbage files fall back silently', async ({ page }) => {
  await spy(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await deliver(
    page,
    { version: 1, sounds: { music_title_theme: { files: [{ file: 'music_title_theme.wav', loopStart: 0.5, loopEnd: 3 }] }, sfx_player_dash: { files: [{ file: 'broken.wav' }] } } },
    { 'music/music_title_theme.wav': sineWav(110, 4, 22050, 2), 'sfx/broken.wav': Buffer.from('not audio at all') },
  );
  await boot(page);
  await page.waitForFunction(() => (window as unknown as AudioProbe).nullRequiemAudio.music.playingFile, null, { timeout: 15000 });
  const loops = await page.evaluate(() => (window as unknown as AudioProbe).__starts.filter((s) => s.loop));
  expect(loops.length).toBe(1);
  expect(loops[0]).toMatchObject({ dur: 4, loopEnd: 3 });
  // the broken dash file must not break the procedural cue
  const osc = await page.evaluate(() => {
    const w = window as unknown as AudioProbe;
    const o0 = w.__osc;
    w.nullRequiemAudio.sfx.play('dash');
    return w.__osc - o0;
  });
  expect(osc).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('with no audio manifest at all the game runs on procedural audio', async ({ page }) => {
  await spy(page);
  await page.route('**/audio/**', (route) => route.fulfill({ status: 404, body: '' }));
  await boot(page);
  const r = await page.evaluate(() => {
    const w = window as unknown as AudioProbe;
    const o0 = w.__osc;
    w.nullRequiemAudio.sfx.play('jump');
    return { osc: w.__osc - o0, file: w.nullRequiemAudio.music.playingFile };
  });
  expect(r.osc).toBeGreaterThan(0);
  expect(r.file).toBe(false);
});

test('region ambience plays as a loop when its file is delivered', async ({ page }) => {
  await spy(page);
  await deliver(page, { version: 1, sounds: { amb_rainline_loop: { files: [{ file: 'amb_rainline_loop.wav' }] } } }, { 'ambience/amb_rainline_loop.wav': sineWav(60, 3, 22050, 2) });
  await boot(page);
  await page.keyboard.press('Enter'); // start the game: Rainline Alley
  await page.waitForFunction(() => (window as unknown as { nullRequiem?: { world: { flow: { state: string } } } }).nullRequiem?.world.flow.state === 'playing', null, { timeout: 20000 });
  await page.waitForFunction(() => (window as unknown as AudioProbe).__starts.some((s) => s.loop && s.dur === 3), null, { timeout: 15000 });
});

// ------------------------------------------------------------------------------------------------ hooks (audio-only triggers)

const startGame = async (page: Page) => {
  await boot(page);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as unknown as { nullRequiem?: { world: { flow: { state: string } } } }).nullRequiem?.world.flow.state === 'playing', null, { timeout: 20000 });
};

test('hooked cues: door close, per-enemy windup and UI sounds play recorded files only when delivered', async ({ page }) => {
  await spy(page);
  await deliver(
    page,
    { version: 1, sounds: { sfx_door_close: { files: [{ file: 'a.wav' }] }, sfx_scrap_hound_lunge: { files: [{ file: 'b.wav' }] }, sfx_ui_back: { files: [{ file: 'c.wav' }] } } },
    { 'sfx/a.wav': sineWav(300, 0.31), 'sfx/b.wav': sineWav(400, 0.32), 'ui/c.wav': sineWav(500, 0.33) },
  );
  await boot(page);
  await page.waitForFunction(() => (window as unknown as AudioProbe).nullRequiemAudio.bank.isReady('sfx_ui_back'), null, { timeout: 10000 });
  const r = await page.evaluate(() => {
    const w = window as unknown as AudioProbe & { nullRequiemAudio: { sfx: { handle(e: unknown): void } } };
    const durs = () => w.__starts.map((s) => s.dur);
    const osc0 = w.__osc;
    w.nullRequiemAudio.sfx.handle({ type: 'doorChanged', id: 'd', open: false, x: 0, y: 0 });
    w.nullRequiemAudio.sfx.handle({ type: 'enemyWindup', x: 0, y: 0, kind: 'scrapHound' });
    w.nullRequiemAudio.sfx.play('uiBack');
    const recorded = durs();
    const oscRecorded = w.__osc - osc0;
    // not delivered: the existing procedural sounds still play
    w.nullRequiemAudio.sfx.handle({ type: 'doorChanged', id: 'd', open: true, x: 0, y: 0 });
    w.nullRequiemAudio.sfx.handle({ type: 'enemyWindup', x: 0, y: 0, kind: 'watcherDrone' });
    w.nullRequiemAudio.sfx.play('uiTab'); // recorded-only cue without a file: silent, never an error
    return { recorded, oscRecorded, oscAfter: w.__osc - osc0 };
  });
  expect(r.recorded).toEqual([0.31, 0.32, 0.33]);
  expect(r.oscRecorded).toBe(0);
  expect(r.oscAfter).toBeGreaterThan(0);
});

test('footsteps follow ground travel and combat events layer the combat stem in sync (audio-only signals)', async ({ page }) => {
  await spy(page);
  await deliver(
    page,
    { version: 1, sounds: { sfx_player_footstep_wet: { files: [{ file: 'f.wav' }] }, music_rainline_exploration: { files: [{ file: 'e.wav' }] }, music_rainline_combat: { files: [{ file: 'c.wav' }] } } },
    { 'sfx/f.wav': sineWav(200, 0.17), 'music/e.wav': sineWav(110, 4, 22050, 2), 'music/c.wav': sineWav(220, 4, 22050, 2) },
  );
  await startGame(page);
  await page.waitForFunction(() => (window as unknown as AudioProbe).nullRequiemAudio.bank.isReady('sfx_player_footstep_wet'), null, { timeout: 10000 });
  await page.waitForFunction(() => (window as unknown as AudioProbe).nullRequiemAudio.music.playingFile, null, { timeout: 15000 });
  // no combat yet: only the exploration loop runs
  expect(await page.evaluate(() => (window as unknown as AudioProbe).__starts.filter((s) => s.loop && s.dur === 4).length)).toBe(1);
  // walking produces footsteps
  const before = await page.evaluate(() => (window as unknown as AudioProbe).__starts.filter((s) => s.dur === 0.17).length);
  // (the software renderer runs the simulation in slow motion, so wait for the sim to cover the distance rather than for wall-clock time)
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction((b0) => (window as unknown as AudioProbe).__starts.filter((s) => s.dur === 0.17).length - b0 >= 2, before, { timeout: 30000 });
  await page.keyboard.up('ArrowRight');
  // a real simulation combat event raises the combat signal and starts the stem
  await page.evaluate(() => {
    const w = window as unknown as { nullRequiem: { world: { emit(e: unknown): void } } };
    w.nullRequiem.world.emit({ type: 'enemyWindup', x: 0, y: 0, kind: 'scrapHound' });
  });
  await page.waitForFunction(() => (window as unknown as AudioProbe).__starts.filter((s) => s.loop && s.dur === 4).length === 2, null, { timeout: 10000 });
});
