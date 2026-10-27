/**
 * Fixed-timestep accumulator. The game simulation always advances in identical `step`-sized
 * increments, so gameplay is deterministic and independent of the display's frame rate.
 */
export class FixedStepper {
  private accumulator = 0;

  constructor(
    readonly step: number,
    readonly maxFrameDelta: number,
  ) {
    if (step <= 0) throw new Error('Step must be positive');
  }

  /**
   * Advance by a real frame delta, invoking `stepFn` zero or more times.
   * @returns the number of steps run
   */
  advance(frameDelta: number, stepFn: (dt: number) => void): number {
    const delta = Math.min(Math.max(frameDelta, 0), this.maxFrameDelta);
    this.accumulator += delta;
    let steps = 0;
    // Small epsilon guards against floating-point drift leaving a step "just" unrun.
    while (this.accumulator + 1e-9 >= this.step) {
      this.accumulator -= this.step;
      stepFn(this.step);
      steps++;
    }
    if (this.accumulator < 0) this.accumulator = 0;
    return steps;
  }

  /** Fraction of a step left in the accumulator, for render interpolation (0..1). */
  get alpha(): number {
    return this.accumulator / this.step;
  }

  reset(): void {
    this.accumulator = 0;
  }
}
