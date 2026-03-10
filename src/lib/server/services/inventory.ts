// src/lib/server/services/inventory.ts
import { eq, inArray, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { getOfficeIdsForUser } from './scope.js';
import type { SessionUser } from '$lib/types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = any; type AnySchema = any;

/**
 * Upsert current_inventory for office+product by delta.
 * Pass a positive delta to add, negative to remove.
 * Call inside a DB transaction for atomicity.
 */
export async function adjustInventory(
  db:        AnyDB,
  schema:    AnySchema,
  officeId:  string,
  productId: string,
  delta:     number,
): Promise<void> {
  await db
    .insert(schema.currentInventory)
    .values({
      id:        randomUUID(),
      officeId,
      productId,
      quantity:  delta,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: [schema.currentInventory.officeId, schema.currentInventory.productId],
      set: {
        quantity:  sql`${schema.currentInventory.quantity} + ${delta}`,
        updatedAt: new Date().toISOString(),
      },
    });
}

export async function getCurrentInventory(
  db:       AnyDB,
  schema:   AnySchema,
  user:     SessionUser,
  officeId?: string,
) {
  const officeIds = officeId
    ? [officeId]
    : await getOfficeIdsForUser(db, schema, user);

  if (!officeIds.length) return [];

  const rows = await db
    .select({
      officeId:    schema.currentInventory.officeId,
      officeName:  schema.offices.name,
      officeNum:   schema.offices.officeNumber,
      productId:   schema.currentInventory.productId,
      productName: schema.products.name,
      categoryId:  schema.products.categoryId,
      quantity:    schema.currentInventory.quantity,
      updatedAt:   schema.currentInventory.updatedAt,
    })
    .from(schema.currentInventory)
    .innerJoin(schema.offices,  eq(schema.currentInventory.officeId,  schema.offices.id))
    .innerJoin(schema.products, eq(schema.currentInventory.productId, schema.products.id))
    .where(inArray(schema.currentInventory.officeId, officeIds))
    .orderBy(schema.offices.officeNumber, schema.products.name);

  return rows;
}
