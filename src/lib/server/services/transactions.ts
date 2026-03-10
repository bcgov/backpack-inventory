// src/lib/server/services/transactions.ts
import { randomBytes, randomUUID } from 'crypto';
import { and, eq, sql } from 'drizzle-orm';
import { ROLE_PERMISSIONS } from '$lib/types.js';
import { assertOfficeInScope } from './scope.js';
import type { SessionUser, InventoryAction } from '$lib/types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = any; type AnySchema = any;

export interface TransactionInput {
  action:            InventoryAction;
  officeId:          string;
  performedByUserId: string;
  lineItems:         Array<{ productId: string; quantity: number; otherDescription?: string }>;
  notes?:            string;
  shippingReceiptPath?: string;
  /** Required when action === 'redistribute' */
  destinationOfficeId?: string;
}

function generateConfirmationId(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

/** Delta direction per action type. inventory_count handled separately. */
const INVENTORY_DELTA: Partial<Record<InventoryAction, 1 | -1>> = {
  receive:  1,
  return:   1,
  remove:  -1,
};

export async function createTransaction(
  db:         AnyDB,
  schema:     AnySchema,
  recordedBy: SessionUser,
  input:      TransactionInput,
): Promise<{ confirmationId: string; transactionId: string }> {
  // ── Validation ────────────────────────────────────────────────────────────
  if (!input.lineItems.length) {
    throw new Error('Transaction must have at least one item');
  }
  if (input.lineItems.some((li) => li.quantity <= 0)) {
    throw new Error('All item quantities must be greater than zero');
  }

  await assertOfficeInScope(db, schema, recordedBy, input.officeId);

  // "Record on behalf" check: if performedByUserId !== recordedBy.id,
  // the logged-in user must have the record_on_behalf permission.
  if (input.performedByUserId !== recordedBy.id) {
    const canDelegate = ROLE_PERMISSIONS[recordedBy.role].has('record_on_behalf');
    if (!canDelegate) {
      throw new Error(
        `Your role (${recordedBy.role}) cannot record on behalf of another user`,
      );
    }
  }

  if (input.action === 'redistribute' && !input.destinationOfficeId) {
    throw new Error('destinationOfficeId is required for redistribute');
  }

  // ── Write (all-or-nothing) ────────────────────────────────────────────────
  // better-sqlite3 transactions are synchronous; drizzle wraps them.
  const transactionId  = randomUUID();
  const confirmationId = generateConfirmationId();
  const now            = new Date().toISOString();

  db.transaction((tx: AnyDB) => {
    tx.insert(schema.transactions).values({
      id:                  transactionId,
      confirmationId,
      action:              input.action,
      officeId:            input.officeId,
      performedByUserId:   input.performedByUserId,
      recordedByUserId:    recordedBy.id,
      shippingReceiptPath: input.shippingReceiptPath ?? null,
      notes:               input.notes ?? null,
      createdAt:           now,
    }).run();

    for (const li of input.lineItems) {
      tx.insert(schema.transactionLineItems).values({
        id:               randomUUID(),
        transactionId,
        productId:        li.productId,
        quantity:         li.quantity,
        otherDescription: li.otherDescription ?? null,
      }).run();
    }

    /** Returns the current quantity for an office+product row (0 if no row yet). */
    const currentQty = (tx: AnyDB, officeId: string, productId: string): number => {
      const [row] = tx
        .select({ quantity: schema.currentInventory.quantity })
        .from(schema.currentInventory)
        .where(and(
          eq(schema.currentInventory.officeId,  officeId),
          eq(schema.currentInventory.productId, productId),
        ))
        .limit(1)
        .all() as Array<{ quantity: number }>;
      return row?.quantity ?? 0;
    };

    if (input.action === 'inventory_count') {
      // Record the physical count snapshot; status starts as 'pending'.
      // current_inventory is intentionally NOT adjusted here.
      tx.insert(schema.inventoryCounts).values({
        id:            randomUUID(),
        transactionId,
        status:        'pending',
      }).run();
    } else if (input.action === 'redistribute') {
      // Guard: source office must have enough stock for each line item
      for (const li of input.lineItems) {
        const available = currentQty(tx, input.officeId, li.productId);
        if (available < li.quantity) {
          throw new Error(
            `Insufficient inventory: cannot redistribute ${li.quantity} of product ${li.productId} (available: ${available})`,
          );
        }
      }

      tx.insert(schema.redistributionDetails).values({
        id:                  randomUUID(),
        transactionId,
        destinationOfficeId: input.destinationOfficeId!,
      }).run();

      for (const li of input.lineItems) {
        const srcDelta  = -li.quantity;
        const destDelta =  li.quantity;

        tx.insert(schema.currentInventory).values({
          id: randomUUID(), officeId: input.officeId, productId: li.productId,
          quantity: srcDelta, updatedAt: now,
        }).onConflictDoUpdate({
          target: [schema.currentInventory.officeId, schema.currentInventory.productId],
          set: { quantity: sql`${schema.currentInventory.quantity} + ${srcDelta}`, updatedAt: now },
        }).run();

        tx.insert(schema.currentInventory).values({
          id: randomUUID(), officeId: input.destinationOfficeId!, productId: li.productId,
          quantity: destDelta, updatedAt: now,
        }).onConflictDoUpdate({
          target: [schema.currentInventory.officeId, schema.currentInventory.productId],
          set: { quantity: sql`${schema.currentInventory.quantity} + ${destDelta}`, updatedAt: now },
        }).run();
      }
    } else {
      const direction = INVENTORY_DELTA[input.action];
      if (direction !== undefined) {
        // Guard: removing items must not exceed available stock
        if (direction === -1) {
          for (const li of input.lineItems) {
            const available = currentQty(tx, input.officeId, li.productId);
            if (available < li.quantity) {
              throw new Error(
                `Insufficient inventory: cannot remove ${li.quantity} of product ${li.productId} (available: ${available})`,
              );
            }
          }
        }

        for (const li of input.lineItems) {
          const delta = direction * li.quantity;
          tx.insert(schema.currentInventory).values({
            id: randomUUID(), officeId: input.officeId, productId: li.productId,
            quantity: delta, updatedAt: now,
          }).onConflictDoUpdate({
            target: [schema.currentInventory.officeId, schema.currentInventory.productId],
            set: { quantity: sql`${schema.currentInventory.quantity} + ${delta}`, updatedAt: now },
          }).run();
        }
      }
    }
  });

  return { confirmationId, transactionId };
}
