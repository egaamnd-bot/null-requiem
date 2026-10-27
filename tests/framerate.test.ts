import { describe, expect, it } from 'vitest';
import { SIM } from '../src/config/tuning';
import { CameraFollow } from '../src/core/camera';
import { FixedStepper } from '../src/core/fixedStep';
import { InputLatch, type HeldInput } from '../src/core/input';
import { expDecay } from '../src/core/math';
import { Player } from '../src/core/player';
import { gridFrom, tileFeet, tileX } from './helpers';

function room(): string[] {
  const rows: string[] = ['#'.repeat(60)];
  for (let r = 1; r < 14; r++) rows.push('#' + '.'.repeat(58) + '#');
  rows[10] = '#' + '.'.repeat(20) + '#'.repeat(6) + '.'.repeat(32) + '#';
  rows.push('#'.repeat(60), '#'.repeat(60));
  return rows;
}

/**
 * Scripted held input as a function of wall-clock time. Changes land on 0.5s boundaries, which
 * fall exactly on frame boundaries for every tested frame rate, so every run presses the same
 * buttons at the same simulated moment.
 */
function heldAt(t: number): HeldInput {
  const q = Math.floor(t * 2 + 1e-9);
  // q: 0 idle | 1 run + held jump | 2 run | 3 run + attack | 4 run + jump + dash | 5 run left
  return {
    left: q === 5,
    right: q >= 1 && q <= 4,
    up: false,
    down: false,
    jump: q === 1 || q === 4,
    attack: q === 3,
    dash: q === 4,
  };
}

function simulate(fps: number, seconds: number) {
  const grid = gridFrom(room());
  const player = new Player(tileX(4), tileFeet(13));
  const stepper = new FixedStepper(1 / SIM.stepHz, SIM.maxFrameDelta);
  const latch = new InputLatch();
  const frames = Math.round(seconds * fps);
  let steps = 0;
  for (let f = 0; f < frames; f++) {
    const t = f / fps;
    latch.sample(heldAt(t));
    steps += stepper.advance(1 / fps, (dt) => {
      player.step(latch.consume(), grid, dt, { veilstep: true }, () => {});
    });
  }
  return { x: player.body.x, y: player.body.y, vx: player.body.vx, steps, attacks: player.attackId };
}

describe('Frame-rate independence', () => {
  it('produces the same gameplay result at 30, 60, 120, 144 and 240 fps', () => {
    const seconds = 3;
    const results = [30, 60, 120, 144, 240].map((fps) => ({ fps, ...simulate(fps, seconds) }));
    const ref = results[2]!;
    expect(ref.steps).toBe(seconds * SIM.stepHz);
    expect(ref.attacks).toBe(1);
    for (const r of results) {
      expect(r.steps, `${r.fps}fps step count`).toBe(ref.steps);
      expect(r.attacks, `${r.fps}fps attack count`).toBe(ref.attacks);
      expect(Math.abs(r.x - ref.x), `${r.fps}fps x`).toBeLessThan(1e-6);
      expect(Math.abs(r.y - ref.y), `${r.fps}fps y`).toBeLessThan(1e-6);
    }
  });

  it('caps a huge frame delta instead of simulating seconds of catch-up', () => {
    const stepper = new FixedStepper(1 / 120, 0.25);
    expect(stepper.advance(5, () => {})).toBe(30);
  });

  it('delivers each button press to exactly one step, even with several or zero steps per frame', () => {
    const latch = new InputLatch();
    const held = (jump: boolean): HeldInput => ({ left: false, right: false, up: false, down: false, jump, attack: false, dash: false });
    latch.sample(held(true));
    const presses = [latch.consume(), latch.consume(), latch.consume()].filter((f) => f.jumpPressed);
    expect(presses).toHaveLength(1);
    // A frame with zero steps keeps the press until the next step.
    latch.sample(held(false));
    latch.sample(held(true));
    latch.sample(held(true));
    expect(latch.consume().jumpPressed).toBe(true);
    expect(latch.consume().jumpPressed).toBe(false);
  });

  it('exponential smoothing is identical however the time is subdivided', () => {
    const whole = expDecay(0, 100, 6, 0.5);
    let split = 0;
    for (let i = 0; i < 37; i++) split = expDecay(split, 100, 6, 0.5 / 37);
    expect(split).toBeCloseTo(whole, 9);
  });

  it('camera follow converges to the same framing at different frame rates', () => {
    const run = (fps: number) => {
      const cam = new CameraFollow(480, 270, { width: 2000, height: 600 });
      cam.snap(100, 300, 1);
      for (let f = 0; f < fps * 2; f++) cam.update(900, 400, 1, 1 / fps);
      return cam;
    };
    const a = run(30);
    const b = run(240);
    expect(Math.abs(a.x - b.x)).toBeLessThan(0.5);
    expect(Math.abs(a.y - b.y)).toBeLessThan(0.5);
  });
});
