import { eq } from 'drizzle-orm';
import * as schema from './schema/sqlite.js';
import { createTransaction } from '$lib/server/services/transactions.js';
import type { SessionUser, InventoryAction } from '$lib/types.js';
import { randInt, pick, weightedPick, type Rng } from './seed-dev-rng.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export interface BulkSeedOptions {
  rng:                Rng;
  /** Days back from `endDate` to start generating. */
  spanDays:           number;
  endDate:            Date;
  /** Min/max transactions per day (inclusive). */
  txPerDayMin:        number;
  txPerDayMax:        number;
  /** Action probability weights. Order: receive, return, remove, redistribute. */
  actionWeights:      ReadonlyArray<readonly [InventoryAction, number]>;
  /** Map of officeId → list of productIds eligible for that office. */
  officeProducts:     ReadonlyMap<string, readonly string[]>;
  /** Users available to record transactions; filtered by scope per-office. */
  users:              ReadonlyArray<SessionUser>;
  /**
   * Per office, returns the set of users whose scope contains it.
   * Computed by the caller using `getOfficeIdsForUser` so the bulk
   * generator stays free of scope concerns.
   */
  recordersForOffice: (officeId: string) => SessionUser[];
}

export async function seedBulkHistory(
  db:    DrizzleDb,
  s:     typeof schema,
  opts:  BulkSeedOptions,
): Promise<{ transactionCount: number; redistributeCount: number }> {
  const { rng, spanDays, endDate, txPerDayMin, txPerDayMax,
          actionWeights, officeProducts, recordersForOffice } = opts;

  const officeIds = [...officeProducts.keys()];
  // In-memory tally of (officeId, productId) → quantity, used to skip
  // remove/redistribute that would underflow without round-tripping the DB.
  const onHand = new Map<string, number>();
  const key = (o: string, p: string) => `${o}::${p}`;

  let transactionCount = 0;
  let redistributeCount = 0;

  for (let dayOffset = spanDays; dayOffset >= 0; dayOffset--) {
    const day = new Date(endDate);
    day.setDate(day.getDate() - dayOffset);
    const txCount = randInt(rng, txPerDayMin, txPerDayMax);

    for (let i = 0; i < txCount; i++) {
      const officeId = pick(rng, officeIds);
      const eligible = officeProducts.get(officeId)!;
      const recorders = recordersForOffice(officeId);
      if (recorders.length === 0) continue;
      const recorder = pick(rng, recorders);

      const action = weightedPick(rng, actionWeights);
      const lineCount = randInt(rng, 1, Math.min(4, eligible.length));
      const lineProducts = pickN(rng, eligible, lineCount);
      let lineItems = lineProducts.map((productId) => {
        const max = action === 'remove' || action === 'redistribute'
          ? Math.min(50, onHand.get(key(officeId, productId)) ?? 0)
          : randInt(rng, 1, 50);
        return { productId, quantity: max <= 0 ? 0 : randInt(rng, 1, max) };
      }).filter((li) => li.quantity > 0);

      if (lineItems.length === 0) continue; // nothing to do (no stock to remove)

      let destinationOfficeId: string | undefined;
      if (action === 'redistribute') {
        const others = officeIds.filter((o) => o !== officeId);
        if (others.length === 0) continue;
        destinationOfficeId = pick(rng, others);

        // Respect the destination's allowlist so excluded (office, product)
        // pairs never receive a current_inventory row via redistribute either.
        const destEligible = new Set(officeProducts.get(destinationOfficeId) ?? []);
        lineItems = lineItems.filter((li) => destEligible.has(li.productId));
        if (lineItems.length === 0) continue;
      }

      let transactionId: string;
      try {
        const result = await createTransaction(db, s, recorder, {
          action, officeId, performedByUserId: recorder.id,
          lineItems, notes: undefined, destinationOfficeId,
        });
        transactionId = result.transactionId;
      } catch {
        // Insufficient inventory or scope mismatch — skip and continue.
        continue;
      }

      // Update local tally to reflect the (now-applied) transaction.
      for (const li of lineItems) {
        const k = key(officeId, li.productId);
        const delta = action === 'receive' || action === 'return'
          ?  li.quantity
          : -li.quantity;
        onHand.set(k, (onHand.get(k) ?? 0) + delta);
        if (action === 'redistribute' && destinationOfficeId) {
          const dk = key(destinationOfficeId, li.productId);
          onHand.set(dk, (onHand.get(dk) ?? 0) + li.quantity);
        }
      }
      transactionCount++;
      if (action === 'redistribute') redistributeCount++;

      // Backdate the transaction so it lands on the synthetic day.
      // createTransaction stamps "now" — update by id to a deterministic time.
      const stamp = new Date(day);
      stamp.setUTCHours(randInt(rng, 8, 17), randInt(rng, 0, 59), 0, 0);
      db.update(s.transactions)
        .set({ createdAt: stamp.toISOString() })
        .where(eq(s.transactions.id, transactionId))
        .run();
    }
  }

  // Force at least one redistribute if the random walk never produced one.
  if (redistributeCount === 0 && officeIds.length >= 2) {
    const src = officeIds[0]!;
    const dst = officeIds[1]!;
    const product = pick(rng, [...officeProducts.get(src)!]);
    // Ensure source has stock first
    const recorder = recordersForOffice(src).find((u) => u.role !== 'ci_specialist')
                  ?? recordersForOffice(src)[0]!;
    await createTransaction(db, s, recorder, {
      action: 'receive', officeId: src,
      performedByUserId: recorder.id,
      lineItems: [{ productId: product, quantity: 10 }],
    });
    await createTransaction(db, s, recorder, {
      action: 'redistribute', officeId: src, destinationOfficeId: dst,
      performedByUserId: recorder.id,
      lineItems: [{ productId: product, quantity: 5 }],
    });
    transactionCount += 2;
    redistributeCount++;
  }

  return { transactionCount, redistributeCount };
}

/** Pick n distinct elements from arr without replacement. */
function pickN<T>(r: Rng, arr: readonly T[], n: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(r() * pool.length);
    out.push(pool.splice(idx, 1)[0]!);
  }
  return out;
}

export const DEFAULT_ACTION_WEIGHTS: ReadonlyArray<readonly [InventoryAction, number]> = [
  ['receive',      45],
  ['remove',       30],
  ['return',       15],
  ['redistribute', 10],
];

/** Seed used to initialize the bulk-gen PRNG. Callers construct a fresh
 *  `mulberry32(BULK_SEED_VALUE)` per invocation so re-running produces
 *  identical state (singleton RNG would consume state across calls). */
export const BULK_SEED_VALUE = 0x5EED_DE7;
