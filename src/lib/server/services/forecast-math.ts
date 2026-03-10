/**
 * forecast-math.ts — pure arithmetic for burn-rate forecasting.
 *
 * No database, no I/O. All functions take plain values and return plain values.
 * This makes them trivially testable and reusable.
 */
import type { ForecastColor, ForecastConfig } from '$lib/types.js';

// ─── Data point construction ──────────────────────────────────────────────────

export interface DataPoint {
  dayOffset: number;  // 0 = today, -1 = yesterday, -(burnRateDays-1) = oldest
  quantity:  number;  // units removed that day (0 if no transactions)
  weight:    number;  // 3 for last 7 days (offset >= -6), 1 for older
}

/**
 * Build an array of DataPoints from a map of { ISO-date-string → daily qty }.
 * Fills zeros for days with no removal data.
 *
 * @param dailyRemovals  Map of 'YYYY-MM-DD' → total removed that day
 * @param burnRateDays   Number of days to include (e.g. 30)
 * @param today          Reference date (defaults to now; injectable for testing)
 */
export function buildDataPoints(
  dailyRemovals: Map<string, number>,
  burnRateDays:  number,
  today:         Date = new Date(),
): DataPoint[] {
  const points: DataPoint[] = [];

  for (let offset = -(burnRateDays - 1); offset <= 0; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const key = d.toISOString().slice(0, 10); // 'YYYY-MM-DD'

    points.push({
      dayOffset: offset,
      quantity:  dailyRemovals.get(key) ?? 0,
      weight:    offset >= -6 ? 3 : 1,
    });
  }

  return points;
}

// ─── Weighted linear regression ───────────────────────────────────────────────

/**
 * Weighted Least Squares regression on the data points.
 * Returns the predicted daily removal rate at x=0 (today).
 * Never returns a negative value.
 *
 * Formula: minimise Σ w_i * (y_i - (slope * x_i + intercept))²
 *
 *   Sw    = Σ w_i
 *   Swx   = Σ w_i * x_i
 *   Swy   = Σ w_i * y_i
 *   Swxx  = Σ w_i * x_i²
 *   Swxy  = Σ w_i * x_i * y_i
 *
 *   denom     = Sw * Swxx - Swx²
 *   slope     = (Sw * Swxy - Swx * Swy) / denom
 *   intercept = (Swy - slope * Swx) / Sw
 *
 * Predicted rate at x=0 is the intercept.
 */
export function weightedLinearRegression(points: DataPoint[]): number {
  if (points.length === 0) return 0;

  let Sw = 0, Swx = 0, Swy = 0, Swxx = 0, Swxy = 0;

  for (const { dayOffset: x, quantity: y, weight: w } of points) {
    Sw   += w;
    Swx  += w * x;
    Swy  += w * y;
    Swxx += w * x * x;
    Swxy += w * x * y;
  }

  if (Sw === 0) return 0;

  const denom = Sw * Swxx - Swx * Swx;

  let intercept: number;
  if (Math.abs(denom) < 1e-12) {
    // Degenerate case (e.g. single point): use weighted mean
    intercept = Swy / Sw;
  } else {
    const slope = (Sw * Swxy - Swx * Swy) / denom;
    intercept   = (Swy - slope * Swx) / Sw;
  }

  return Math.max(0, intercept);
}

// ─── Seasonality adjustment ───────────────────────────────────────────────────

export interface SeasonData {
  totalQty: number;
  days:     number;
}

/**
 * Adjust a base burn rate by the ratio of the same calendar month last year
 * relative to that year's overall daily average.
 *
 * Factor is clamped to [0.1, 10] to prevent runaway adjustments.
 * Returns baseRate unchanged if prior-year data is insufficient.
 */
export function applySeasonality(
  baseRate:          number,
  sameMonthLastYear: SeasonData | null,
  otherMonthsLastYear: SeasonData | null,
): number {
  if (!sameMonthLastYear || !otherMonthsLastYear) return baseRate;

  const totalQty  = sameMonthLastYear.totalQty + otherMonthsLastYear.totalQty;
  const totalDays = sameMonthLastYear.days      + otherMonthsLastYear.days;

  if (totalDays === 0 || totalQty === 0) return baseRate;

  const annualDailyAvg    = totalQty / totalDays;
  if (annualDailyAvg === 0) return baseRate;

  const sameMonthDailyAvg = sameMonthLastYear.days > 0
    ? sameMonthLastYear.totalQty / sameMonthLastYear.days
    : 0;

  const rawFactor = sameMonthDailyAvg / annualDailyAvg;
  const factor    = Math.min(10, Math.max(0.1, rawFactor));

  return baseRate * factor;
}

// ─── Days remaining ───────────────────────────────────────────────────────────

/**
 * Returns the ceiling of currentQty / dailyBurnRate.
 * Returns null if burnRate is null or zero (can't predict).
 * Returns 0 if currentQty is 0 or negative.
 */
export function computeDaysRemaining(
  currentQty:    number,
  dailyBurnRate: number | null,
): number | null {
  if (dailyBurnRate === null || dailyBurnRate <= 0) return null;
  if (currentQty <= 0) return 0;
  return Math.ceil(currentQty / dailyBurnRate);
}

// ─── Colour coding ────────────────────────────────────────────────────────────

/**
 * Returns the colour badge for a days-remaining value.
 *
 *   null           → 'none'  (no burn-rate data available)
 *   >= greenDays   → 'green'
 *   >= yellowDays  → 'yellow'
 *   < yellowDays   → 'red'
 */
export function computeColor(
  daysRemaining: number | null,
  config:        ForecastConfig,
): ForecastColor {
  if (daysRemaining === null) return 'none';
  if (daysRemaining >= config.greenDays) return 'green';
  if (daysRemaining >= config.yellowDays) return 'yellow';
  return 'red';
}
