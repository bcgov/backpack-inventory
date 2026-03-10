// src/lib/server/services/reconcile.ts
import { and, eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { ROLE_PERMISSIONS } from '$lib/types.js';
import { getOfficeIdsForUser, assertOfficeInScope } from './scope.js';
import type { SessionUser } from '$lib/types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = any; type AnySchema = any;

/** Lists all pending inventory counts within the user's location scope. */
export async function listPendingCounts(
  db:     AnyDB,
  schema: AnySchema,
  user:   SessionUser,
) {
  const officeIds = await getOfficeIdsForUser(db, schema, user);
  if (!officeIds.length) return [];

  return db
    .select({
      transactionId:    schema.inventoryCounts.transactionId,
      status:           schema.inventoryCounts.status,
      confirmationId:   schema.transactions.confirmationId,
      officeId:         schema.transactions.officeId,
      officeName:       schema.offices.name,
      officeNumber:     schema.offices.officeNumber,
      performedByName:  schema.users.name,
      createdAt:        schema.transactions.createdAt,
    })
    .from(schema.inventoryCounts)
    .innerJoin(schema.transactions,
      eq(schema.inventoryCounts.transactionId, schema.transactions.id))
    .innerJoin(schema.offices,
      eq(schema.transactions.officeId, schema.offices.id))
    .innerJoin(schema.users,
      eq(schema.transactions.performedByUserId, schema.users.id))
    .where(
      and(
        eq(schema.inventoryCounts.status, 'pending'),
        inArray(schema.transactions.officeId, officeIds),
      ),
    )
    .orderBy(schema.transactions.createdAt);
}

/**
 * Returns a single count's metadata and a side-by-side comparison of
 * the physical count vs. the current system inventory.
 * Returns null if not found.
 */
export async function getCountDetail(
  db:            AnyDB,
  schema:        AnySchema,
  user:          SessionUser,
  transactionId: string,
) {
  const [count] = await db
    .select({
      transactionId:    schema.inventoryCounts.transactionId,
      status:           schema.inventoryCounts.status,
      reasonCode:       schema.inventoryCounts.reasonCode,
      reconcilerNotes:  schema.inventoryCounts.reconcilerNotes,
      reconciledAt:     schema.inventoryCounts.reconciledAt,
      confirmationId:   schema.transactions.confirmationId,
      officeId:         schema.transactions.officeId,
      officeName:       schema.offices.name,
      officeNumber:     schema.offices.officeNumber,
      performedByName:  schema.users.name,
      createdAt:        schema.transactions.createdAt,
    })
    .from(schema.inventoryCounts)
    .innerJoin(schema.transactions,
      eq(schema.inventoryCounts.transactionId, schema.transactions.id))
    .innerJoin(schema.offices,
      eq(schema.transactions.officeId, schema.offices.id))
    .innerJoin(schema.users,
      eq(schema.transactions.performedByUserId, schema.users.id))
    .where(eq(schema.inventoryCounts.transactionId, transactionId))
    .limit(1);

  if (!count) return null;

  await assertOfficeInScope(db, schema, user, count.officeId);

  // Physical count line items
  const lineItems = await db
    .select({
      productId:        schema.transactionLineItems.productId,
      productName:      schema.products.name,
      categoryName:     schema.productCategories.name,
      physicalQuantity: schema.transactionLineItems.quantity,
    })
    .from(schema.transactionLineItems)
    .innerJoin(schema.products,
      eq(schema.transactionLineItems.productId, schema.products.id))
    .innerJoin(schema.productCategories,
      eq(schema.products.categoryId, schema.productCategories.id))
    .where(eq(schema.transactionLineItems.transactionId, transactionId))
    .orderBy(schema.productCategories.name, schema.products.name);

  // Current system inventory for this office
  const currentRows = await db
    .select({
      productId: schema.currentInventory.productId,
      quantity:  schema.currentInventory.quantity,
    })
    .from(schema.currentInventory)
    .where(eq(schema.currentInventory.officeId, count.officeId));

  const systemMap = new Map<string, number>(
    currentRows.map((r: { productId: string; quantity: number }) => [r.productId, r.quantity]),
  );

  const comparison = lineItems.map((li: {
    productId: string;
    productName: string;
    categoryName: string;
    physicalQuantity: number;
  }) => {
    const systemQuantity = systemMap.get(li.productId) ?? 0;
    return {
      ...li,
      systemQuantity,
      discrepancy: li.physicalQuantity - systemQuantity,
    };
  });

  return { count, comparison };
}

export async function reconcileCount(
  db:            AnyDB,
  schema:        AnySchema,
  user:          SessionUser,
  transactionId: string,
  decision: {
    action:      'accept' | 'reject';
    reasonCode?: string;
    notes?:      string;
  },
): Promise<void> {
  // Permission check
  if (!ROLE_PERMISSIONS[user.role].has('reconcile_count')) {
    throw new Error(`Your role (${user.role}) does not have permission to reconcile counts`);
  }

  // Load the count
  const [count] = await db
    .select({
      status:    schema.inventoryCounts.status,
      officeId:  schema.transactions.officeId,
    })
    .from(schema.inventoryCounts)
    .innerJoin(schema.transactions,
      eq(schema.inventoryCounts.transactionId, schema.transactions.id))
    .where(eq(schema.inventoryCounts.transactionId, transactionId))
    .limit(1);

  if (!count) throw new Error('Inventory count not found');
  if (count.status !== 'pending') throw new Error('Only pending counts can be reconciled');

  await assertOfficeInScope(db, schema, user, count.officeId);

  // Load line items before entering the sync transaction
  const lineItems: Array<{ productId: string; quantity: number }> = decision.action === 'accept'
    ? await db
        .select({
          productId: schema.transactionLineItems.productId,
          quantity:  schema.transactionLineItems.quantity,
        })
        .from(schema.transactionLineItems)
        .where(eq(schema.transactionLineItems.transactionId, transactionId))
    : [];

  const now = new Date().toISOString();

  db.transaction((tx: AnyDB) => {
    tx.update(schema.inventoryCounts)
      .set({
        status:             decision.action === 'accept' ? 'accepted' : 'rejected',
        reconciledByUserId: user.id,
        reconciledAt:       now,
        reasonCode:         decision.reasonCode ?? null,
        reconcilerNotes:    decision.notes ?? null,
      })
      .where(eq(schema.inventoryCounts.transactionId, transactionId))
      .run();

    if (decision.action === 'accept') {
      // SET current_inventory to the physical count (absolute value, NOT a delta).
      // This is the key difference from adjustInventory().
      for (const li of lineItems) {
        tx.insert(schema.currentInventory)
          .values({
            id:        randomUUID(),
            officeId:  count.officeId,
            productId: li.productId,
            quantity:  li.quantity,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [schema.currentInventory.officeId, schema.currentInventory.productId],
            set: { quantity: li.quantity, updatedAt: now },
          })
          .run();
      }
    }
  });
}
