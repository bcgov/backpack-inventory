/**
 * Seeded PRNG and helpers for deterministic dev seed generation.
 * mulberry32: small, fast, deterministic — suitable for non-cryptographic use.
 */

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let t = seed >>> 0;
  return function (): number {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(r: Rng, min: number, max: number): number {
  return Math.floor(r() * (max - min + 1)) + min;
}

export function pick<T>(r: Rng, arr: readonly T[]): T {
  if (arr.length === 0) throw new Error('pick: empty array');
  return arr[Math.floor(r() * arr.length)]!;
}

export function weightedPick<T extends string>(
  r: Rng,
  weighted: ReadonlyArray<readonly [T, number]>,
): T {
  const total = weighted.reduce((s, [, w]) => s + w, 0);
  let roll = r() * total;
  for (const [value, weight] of weighted) {
    roll -= weight;
    if (roll < 0) return value;
  }
  return weighted[weighted.length - 1]![0];
}
