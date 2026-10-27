import { describe, expect, it } from 'vitest';
import { Health } from '../src/core/health';

describe('Health', () => {
  it('applies damage and reports death at zero', () => {
    const h = new Health(3);
    expect(h.tryDamage(1)).toEqual({ applied: true, died: false });
    expect(h.current).toBe(2);
    expect(h.tryDamage(5)).toEqual({ applied: true, died: true });
    expect(h.current).toBe(0);
    expect(h.isDead).toBe(true);
  });

  it('ignores damage during invulnerability and accepts it again once it expires', () => {
    const h = new Health(5);
    expect(h.tryDamage(1, 1.0).applied).toBe(true);
    expect(h.isInvulnerable).toBe(true);
    // Repeated hits inside the window are ignored.
    for (let i = 0; i < 10; i++) {
      h.tick(0.05);
      expect(h.tryDamage(1, 1.0).applied).toBe(false);
    }
    expect(h.current).toBe(4);
    h.tick(0.5); // total 1.0s elapsed
    expect(h.isInvulnerable).toBe(false);
    expect(h.tryDamage(1, 1.0).applied).toBe(true);
    expect(h.current).toBe(3);
  });

  it('cannot be damaged or healed once dead', () => {
    const h = new Health(1);
    h.tryDamage(1);
    expect(h.tryDamage(1).applied).toBe(false);
    h.heal(1);
    expect(h.current).toBe(0);
  });

  it('caps healing at max and supports raising max health', () => {
    const h = new Health(5);
    h.tryDamage(2);
    h.heal(10);
    expect(h.current).toBe(5);
    h.setMax(6);
    expect(h.max).toBe(6);
    expect(h.current).toBe(6);
  });

  it('restoreFull revives to max and clears invulnerability', () => {
    const h = new Health(4);
    h.tryDamage(1, 2);
    h.restoreFull();
    expect(h.current).toBe(4);
    expect(h.isInvulnerable).toBe(false);
  });

  it('rejects non-positive max health', () => {
    expect(() => new Health(0)).toThrow();
  });
});
