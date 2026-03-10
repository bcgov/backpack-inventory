import { describe, it, expect } from 'vitest';
import {
  buildDataPoints,
  weightedLinearRegression,
  applySeasonality,
  computeColor,
  computeDaysRemaining,
} from './forecast-math.js';
import type { ForecastConfig } from '../../types.js';

const CONFIG: ForecastConfig = { burnRateDays: 30, greenDays: 30, yellowDays: 14 };

// ─── buildDataPoints ──────────────────────────────────────────────────────────

describe('buildDataPoints', () => {
  it('returns burnRateDays points', () => {
    const today = new Date('2026-03-08');
    const pts = buildDataPoints(new Map(), 7, today);
    expect(pts).toHaveLength(7);
  });

  it('fills zeros for days with no data', () => {
    const today = new Date('2026-03-08');
    const pts = buildDataPoints(new Map(), 3, today);
    expect(pts.every((p) => p.quantity === 0)).toBe(true);
  });

  it('maps historical removals to the correct day offset', () => {
    const today = new Date('2026-03-08');
    const removals = new Map([
      ['2026-03-08', 5],  // offset 0
      ['2026-03-07', 10], // offset -1
    ]);
    const pts = buildDataPoints(removals, 3, today);
    const todayPt = pts.find((p) => p.dayOffset === 0);
    const yestPt  = pts.find((p) => p.dayOffset === -1);
    expect(todayPt?.quantity).toBe(5);
    expect(yestPt?.quantity).toBe(10);
  });

  it('gives recent 7 days weight=3 and older days weight=1', () => {
    const today = new Date('2026-03-08');
    const pts = buildDataPoints(new Map(), 30, today);
    const recent = pts.filter((p) => p.dayOffset >= -6);
    const older  = pts.filter((p) => p.dayOffset < -6);
    expect(recent.every((p) => p.weight === 3)).toBe(true);
    expect(older.every((p) => p.weight === 1)).toBe(true);
  });

  it('offset 0 (today) always gets weight 3', () => {
    const today = new Date('2026-03-08');
    const pts = buildDataPoints(new Map(), 30, today);
    expect(pts.find((p) => p.dayOffset === 0)?.weight).toBe(3);
  });
});

// ─── weightedLinearRegression ─────────────────────────────────────────────────

describe('weightedLinearRegression', () => {
  it('returns 0 for all-zero data', () => {
    const pts = [
      { dayOffset: -2, quantity: 0, weight: 1 },
      { dayOffset: -1, quantity: 0, weight: 1 },
      { dayOffset:  0, quantity: 0, weight: 1 },
    ];
    expect(weightedLinearRegression(pts)).toBe(0);
  });

  it('returns the constant value for flat data', () => {
    // Every day: exactly 5 units removed
    const pts = [-4, -3, -2, -1, 0].map((d) => ({
      dayOffset: d, quantity: 5, weight: 1,
    }));
    expect(weightedLinearRegression(pts)).toBeCloseTo(5, 5);
  });

  it('predicts a value above the mean for an upward-trending series', () => {
    // Removals increasing: 1, 2, 3, 4, 5
    const pts = [-4, -3, -2, -1, 0].map((d, i) => ({
      dayOffset: d, quantity: i + 1, weight: 1,
    }));
    const rate = weightedLinearRegression(pts);
    // Regression at x=0 should be ≥ 5 (the trend line passes through or above 5)
    expect(rate).toBeGreaterThanOrEqual(4.5);
  });

  it('never returns a negative value', () => {
    // Strongly declining series ending near zero
    const pts = [-4, -3, -2, -1, 0].map((d, i) => ({
      dayOffset: d, quantity: 5 - i, weight: 1,
    }));
    expect(weightedLinearRegression(pts)).toBeGreaterThanOrEqual(0);
  });

  it('gives heavier recent weight more influence', () => {
    // Days -9 to -7: high removals (10). Days -6 to 0: very low (1).
    // Without weighting the intercept would be pulled toward 10.
    // With 3x weight on recent days, it should be much closer to 1.
    const pts = [
      ...[-9, -8, -7].map((d) => ({ dayOffset: d, quantity: 10, weight: 1 })),
      ...[-6, -5, -4, -3, -2, -1, 0].map((d) => ({ dayOffset: d, quantity: 1, weight: 3 })),
    ];
    const rate = weightedLinearRegression(pts);
    expect(rate).toBeLessThan(5); // weighted result biased toward recent low usage
  });

  it('handles single data point without crashing', () => {
    const pts = [{ dayOffset: 0, quantity: 7, weight: 1 }];
    expect(() => weightedLinearRegression(pts)).not.toThrow();
  });
});

// ─── applySeasonality ─────────────────────────────────────────────────────────

describe('applySeasonality', () => {
  it('returns baseRate when no prior-year data', () => {
    expect(applySeasonality(5, null, null)).toBe(5);
  });

  it('returns baseRate when only same-month data but no full-year data', () => {
    // Can't compute annual avg without other months
    expect(applySeasonality(5, { totalQty: 100, days: 31 }, null)).toBe(5);
  });

  it('scales up when same month historically busier than average', () => {
    // Annual avg: 200 qty / 365 days ≈ 0.548/day
    // Same month: 60 qty / 30 days = 2/day → factor ≈ 3.65
    const result = applySeasonality(
      4,
      { totalQty: 60, days: 30 },
      { totalQty: 140, days: 335 },
    );
    // factor = (60/30) / (200/365) = 2 / 0.548 ≈ 3.65 → rate = 4 * 3.65 ≈ 14.6
    expect(result).toBeGreaterThan(4);
  });

  it('scales down when same month historically quieter than average', () => {
    // Annual avg: 200/365 ≈ 0.548
    // Same month: 5/30 ≈ 0.167 → factor ≈ 0.30
    const result = applySeasonality(
      4,
      { totalQty: 5, days: 30 },
      { totalQty: 195, days: 335 },
    );
    expect(result).toBeLessThan(4);
  });

  it('caps the seasonality factor at 10 (extreme high season)', () => {
    // Same month: 1000/day, annual avg: 1/day → factor would be 1000 → capped to 10
    const result = applySeasonality(
      2,
      { totalQty: 31000, days: 31 },
      { totalQty: 335, days: 335 },
    );
    expect(result).toBeLessThanOrEqual(2 * 10 + 0.001);
  });

  it('caps the seasonality factor at 0.1 (extreme low season)', () => {
    // Same month: 0.001/day, annual avg: 100/day → factor 0.00001 → capped to 0.1
    const result = applySeasonality(
      10,
      { totalQty: 0, days: 31 },       // 0 removes in same month
      { totalQty: 33500, days: 335 },
    );
    expect(result).toBeGreaterThanOrEqual(10 * 0.1 - 0.001);
  });

  it('returns baseRate when annual avg is zero', () => {
    expect(applySeasonality(5, { totalQty: 0, days: 30 }, { totalQty: 0, days: 335 })).toBe(5);
  });
});

// ─── computeDaysRemaining ─────────────────────────────────────────────────────

describe('computeDaysRemaining', () => {
  it('returns null when burn rate is null', () => {
    expect(computeDaysRemaining(50, null)).toBeNull();
  });

  it('returns null when burn rate is zero', () => {
    expect(computeDaysRemaining(50, 0)).toBeNull();
  });

  it('returns 0 when current quantity is 0', () => {
    expect(computeDaysRemaining(0, 5)).toBe(0);
  });

  it('returns ceiling of qty / rate', () => {
    // 10 / 3 = 3.33 → ceiling = 4
    expect(computeDaysRemaining(10, 3)).toBe(4);
  });

  it('returns ceiling of exact division', () => {
    expect(computeDaysRemaining(15, 5)).toBe(3);
  });
});

// ─── computeColor ─────────────────────────────────────────────────────────────

describe('computeColor', () => {
  it('returns none when daysRemaining is null', () => {
    expect(computeColor(null, CONFIG)).toBe('none');
  });

  it('returns green when > greenDays', () => {
    expect(computeColor(31, CONFIG)).toBe('green');
  });

  it('returns green when exactly equal to greenDays', () => {
    expect(computeColor(30, CONFIG)).toBe('green');
  });

  it('returns yellow when between yellowDays and greenDays', () => {
    expect(computeColor(20, CONFIG)).toBe('yellow');
    expect(computeColor(14, CONFIG)).toBe('yellow');
  });

  it('returns red when below yellowDays', () => {
    expect(computeColor(13, CONFIG)).toBe('red');
    expect(computeColor(0, CONFIG)).toBe('red');
  });
});
