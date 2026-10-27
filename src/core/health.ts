export interface DamageResult {
  applied: boolean;
  died: boolean;
}

/**
 * Health with optional invulnerability frames.
 * Damage is ignored while invulnerable or dead, so overlapping hazards can never
 * deal repeated damage within the invulnerability window.
 */
export class Health {
  private value: number;
  private invuln = 0;

  constructor(private maxValue: number) {
    if (maxValue <= 0) throw new Error('Max health must be positive');
    this.value = maxValue;
  }

  get current(): number {
    return this.value;
  }

  get max(): number {
    return this.maxValue;
  }

  get isDead(): boolean {
    return this.value <= 0;
  }

  get isInvulnerable(): boolean {
    return this.invuln > 0;
  }

  get invulnerabilityRemaining(): number {
    return this.invuln;
  }

  tick(dt: number): void {
    if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);
  }

  /**
   * @param amount damage to apply (positive integer)
   * @param invulnerability seconds of invulnerability granted if the damage lands
   */
  tryDamage(amount: number, invulnerability = 0): DamageResult {
    if (this.isDead || this.invuln > 0 || amount <= 0) return { applied: false, died: false };
    this.value = Math.max(0, this.value - amount);
    if (this.value > 0) this.invuln = invulnerability;
    return { applied: true, died: this.value <= 0 };
  }

  heal(amount: number): void {
    if (this.isDead) return;
    this.value = Math.min(this.maxValue, this.value + amount);
  }

  restoreFull(): void {
    this.value = this.maxValue;
    this.invuln = 0;
  }

  setMax(max: number, fill = true): void {
    if (max <= 0) throw new Error('Max health must be positive');
    this.maxValue = max;
    this.value = fill ? max : Math.min(this.value, max);
  }

  grantInvulnerability(seconds: number): void {
    this.invuln = Math.max(this.invuln, seconds);
  }
}
