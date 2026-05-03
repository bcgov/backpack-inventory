import { describe, it, expect } from 'vitest';
import { mulberry32, randInt, pick, weightedPick } from './seed-dev-rng.js';

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it('returns values in [0, 1)', () => {
    const r = mulberry32(99);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('helpers', () => {
  it('randInt is deterministic and in range', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 50; i++) {
      const v = randInt(r, 1, 10);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('pick returns an element of the array', () => {
    const r = mulberry32(7);
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 20; i++) {
      expect(arr).toContain(pick(r, arr));
    }
  });

  it('weightedPick respects weights', () => {
    const r = mulberry32(123);
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 1000; i++) {
      counts[weightedPick(r, [['a', 9], ['b', 1]])]++;
    }
    // ~90/10 split with some slack
    expect(counts.a).toBeGreaterThan(800);
    expect(counts.b).toBeLessThan(200);
  });
});
