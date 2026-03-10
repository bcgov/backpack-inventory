/**
 * forecast.ts — inventory burn-rate forecast service.
 *
 * Queries removal history, delegates math to forecast-math.ts,
 * and returns ForecastRow[] enriched with days-remaining and colour.
 */
import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import {
  buildDataPoints,
  weightedLinearRegression,
  applySeasonality,
  computeDaysRemaining,
  computeColor,
} from './forecast-math.js';
import { getOfficeIdsForUser } from './scope.js';
import type { SessionUser, ForecastConfig, ForecastColor } from '$lib/types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = any; type AnySchema = any;

export interface ForecastRow {
  officeId:       string;
  officeName:     string;
  officeNumber:   string;
  productId:      string;
  productName:    string;
  categoryId:     string;
  currentQty:     number;
  updatedAt:      string;
  /** Predicted daily removal rate. null = no data. */
  dailyBurnRate:  number | null;
  /** Ceiling of currentQty / dailyBurnRate. null = no burn rate. */
  daysRemaining:  number | null;
  color:          ForecastColor;
  /** 'local' = office-specific data used; 'global' = fell back to product-wide avg; 'none' = no data */
  burnRateSource: 'local' | 'global' | 'none';
}

export async function getInventoryWithForecast(
  db:        AnyDB,
  schema:    AnySchema,
  user:      SessionUser,
  officeId:  string | undefined,
  config:    ForecastConfig,
): Promise<ForecastRow[]> {
  // ── 1. Determine office scope ─────────────────────────────────────────────
  const officeIds = officeId
    ? [officeId]
    : await getOfficeIdsForUser(db, schema, user);
  if (!officeIds.length) return [];

  // ── 2. Current inventory ──────────────────────────────────────────────────
  const inventory: Array<{
    officeId: string; officeName: string; officeNumber: string;
    productId: string; productName: string; categoryId: string;
    currentQty: number; updatedAt: string;
  }> = await db
    .select({
      officeId:     schema.currentInventory.officeId,
      officeName:   schema.offices.name,
      officeNumber: schema.offices.officeNumber,
      productId:    schema.currentInventory.productId,
      productName:  schema.products.name,
      categoryId:   schema.products.categoryId,
      currentQty:   schema.currentInventory.quantity,
      updatedAt:    schema.currentInventory.updatedAt,
    })
    .from(schema.currentInventory)
    .innerJoin(schema.offices,  eq(schema.currentInventory.officeId,  schema.offices.id))
    .innerJoin(schema.products, eq(schema.currentInventory.productId, schema.products.id))
    .where(inArray(schema.currentInventory.officeId, officeIds))
    .orderBy(schema.offices.officeNumber, schema.products.name);

  if (!inventory.length) return [];

  // ── 3. Removal history for burn-rate window ───────────────────────────────
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - config.burnRateDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  // Daily removals per (officeId, productId):
  //   SELECT office_id, product_id, DATE(created_at) as day, SUM(quantity) as qty
  //   FROM transactions JOIN transaction_line_items ON ...
  //   WHERE action='remove' AND office_id IN (...) AND created_at >= cutoff
  //   GROUP BY office_id, product_id, day
  const removalRows: Array<{
    officeId: string; productId: string; day: string; qty: number;
  }> = await db
    .select({
      officeId:  schema.transactions.officeId,
      productId: schema.transactionLineItems.productId,
      day:       sql<string>`DATE(${schema.transactions.createdAt})`,
      qty:       sql<number>`SUM(${schema.transactionLineItems.quantity})`,
    })
    .from(schema.transactions)
    .innerJoin(
      schema.transactionLineItems,
      eq(schema.transactionLineItems.transactionId, schema.transactions.id),
    )
    .where(
      and(
        eq(schema.transactions.action, 'remove'),
        inArray(schema.transactions.officeId, officeIds),
        gte(schema.transactions.createdAt, cutoffStr),
      ),
    )
    .groupBy(
      schema.transactions.officeId,
      schema.transactionLineItems.productId,
      sql`DATE(${schema.transactions.createdAt})`,
    );

  // Index removal rows by "officeId|productId" → Map<day, qty>
  const removalIndex = new Map<string, Map<string, number>>();
  for (const row of removalRows) {
    const key = `${row.officeId}|${row.productId}`;
    if (!removalIndex.has(key)) removalIndex.set(key, new Map());
    removalIndex.get(key)!.set(row.day, row.qty);
  }

  // ── 4. Global fallback: product-wide daily average ────────────────────────
  const globalRows: Array<{ productId: string; totalQty: number; officeDays: number }> =
    await db
      .select({
        productId: schema.transactionLineItems.productId,
        totalQty:  sql<number>`SUM(${schema.transactionLineItems.quantity})`,
        officeDays: sql<number>`COUNT(DISTINCT ${schema.transactions.officeId} || '|' || DATE(${schema.transactions.createdAt}))`,
      })
      .from(schema.transactions)
      .innerJoin(
        schema.transactionLineItems,
        eq(schema.transactionLineItems.transactionId, schema.transactions.id),
      )
      .where(
        and(
          eq(schema.transactions.action, 'remove'),
          gte(schema.transactions.createdAt, cutoffStr),
        ),
      )
      .groupBy(schema.transactionLineItems.productId);

  const globalIndex = new Map<string, number>(); // productId → daily avg rate
  for (const row of globalRows) {
    if (row.officeDays > 0) {
      globalIndex.set(row.productId, row.totalQty / row.officeDays);
    }
  }

  // ── 5. Seasonality: same calendar month last year ─────────────────────────
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
  const lastYear     = String(today.getFullYear() - 1);

  const seasonRows: Array<{
    officeId: string; productId: string; sameMonth: number;
    totalQty: number; days: number;
  }> = await db
    .select({
      officeId:  schema.transactions.officeId,
      productId: schema.transactionLineItems.productId,
      sameMonth: sql<number>`CASE WHEN strftime('%m', ${schema.transactions.createdAt}) = ${currentMonth} THEN 1 ELSE 0 END`,
      totalQty:  sql<number>`SUM(${schema.transactionLineItems.quantity})`,
      days:      sql<number>`COUNT(DISTINCT DATE(${schema.transactions.createdAt}))`,
    })
    .from(schema.transactions)
    .innerJoin(
      schema.transactionLineItems,
      eq(schema.transactionLineItems.transactionId, schema.transactions.id),
    )
    .where(
      and(
        eq(schema.transactions.action, 'remove'),
        inArray(schema.transactions.officeId, officeIds),
        sql`strftime('%Y', ${schema.transactions.createdAt}) = ${lastYear}`,
      ),
    )
    .groupBy(
      schema.transactions.officeId,
      schema.transactionLineItems.productId,
      sql`CASE WHEN strftime('%m', ${schema.transactions.createdAt}) = ${currentMonth} THEN 1 ELSE 0 END`,
    );

  // Index: "officeId|productId" → { sameMonth: SeasonData, other: SeasonData }
  type SeasonEntry = { totalQty: number; days: number };
  const seasonIndex = new Map<string, { same: SeasonEntry | null; other: SeasonEntry | null }>();

  for (const row of seasonRows) {
    const key = `${row.officeId}|${row.productId}`;
    if (!seasonIndex.has(key)) seasonIndex.set(key, { same: null, other: null });
    const entry = seasonIndex.get(key)!;
    if (row.sameMonth === 1) {
      entry.same  = { totalQty: row.totalQty, days: row.days };
    } else {
      entry.other = { totalQty: row.totalQty, days: row.days };
    }
  }

  // ── 6. Assemble ForecastRow[] ─────────────────────────────────────────────
  return inventory.map((inv) => {
    const key          = `${inv.officeId}|${inv.productId}`;
    const dailyMap     = removalIndex.get(key) ?? new Map<string, number>();
    const hasLocalData = dailyMap.size > 0;

    // Build time series and run WLS
    const points  = buildDataPoints(dailyMap, config.burnRateDays, today);
    const baseRate = weightedLinearRegression(points);

    let dailyBurnRate: number | null;
    let burnRateSource: ForecastRow['burnRateSource'];

    if (hasLocalData && baseRate > 0) {
      // Apply seasonality to the local rate
      const season = seasonIndex.get(key);
      const adjusted = applySeasonality(baseRate, season?.same ?? null, season?.other ?? null);
      dailyBurnRate  = adjusted;
      burnRateSource = 'local';
    } else if (!hasLocalData && globalIndex.has(inv.productId)) {
      dailyBurnRate  = globalIndex.get(inv.productId)!;
      burnRateSource = 'global';
    } else {
      dailyBurnRate  = null;
      burnRateSource = 'none';
    }

    const daysRemaining = computeDaysRemaining(inv.currentQty, dailyBurnRate);
    const color         = computeColor(daysRemaining, config);

    return {
      officeId:      inv.officeId,
      officeName:    inv.officeName,
      officeNumber:  inv.officeNumber,
      productId:     inv.productId,
      productName:   inv.productName,
      categoryId:    inv.categoryId,
      currentQty:    inv.currentQty,
      updatedAt:     inv.updatedAt,
      dailyBurnRate: dailyBurnRate !== null && dailyBurnRate > 0 ? dailyBurnRate : null,
      daysRemaining,
      color,
      burnRateSource,
    };
  });
}
