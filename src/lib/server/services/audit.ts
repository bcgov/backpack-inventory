// src/lib/server/services/audit.ts
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { getOfficeIdsForUser } from './scope.js';
import type { SessionUser, InventoryAction } from '$lib/types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = any; type AnySchema = any;

export interface AuditFilters {
  officeId?:          string;
  action?:            InventoryAction;
  performedByUserId?: string;
  dateFrom?:          string; // ISO date string YYYY-MM-DD
  dateTo?:            string; // ISO date string YYYY-MM-DD
}

const DEFAULT_PAGE_SIZE = 50;

export async function getAuditLog(
  db:      AnyDB,
  schema:  AnySchema,
  user:    SessionUser,
  filters: AuditFilters,
  paging:  { page?: number; pageSize?: number } = {},
) {
  const officeIds = await getOfficeIdsForUser(db, schema, user);
  if (!officeIds.length) return { rows: [], total: 0 };

  const page     = paging.page     ?? 0;
  const pageSize = paging.pageSize ?? DEFAULT_PAGE_SIZE;

  // Build WHERE conditions
  const conditions = [inArray(schema.transactions.officeId, officeIds)];

  if (filters.officeId)          conditions.push(eq(schema.transactions.officeId,          filters.officeId));
  if (filters.action)            conditions.push(eq(schema.transactions.action,             filters.action));
  if (filters.performedByUserId) conditions.push(eq(schema.transactions.performedByUserId, filters.performedByUserId));
  if (filters.dateFrom)          conditions.push(gte(schema.transactions.createdAt,         filters.dateFrom));
  if (filters.dateTo)            conditions.push(lte(schema.transactions.createdAt,         filters.dateTo + 'T23:59:59Z'));

  const where = and(...conditions);

  // Total count (for pagination UI)
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.transactions)
    .where(where);

  const total = Number(count);

  // Paginated transaction rows
  const txns = await db
    .select({
      id:                schema.transactions.id,
      confirmationId:    schema.transactions.confirmationId,
      action:            schema.transactions.action,
      officeId:          schema.transactions.officeId,
      officeName:        schema.offices.name,
      officeNumber:      schema.offices.officeNumber,
      performedByUserId: schema.transactions.performedByUserId,
      recordedByUserId:  schema.transactions.recordedByUserId,
      notes:             schema.transactions.notes,
      createdAt:         schema.transactions.createdAt,
    })
    .from(schema.transactions)
    .innerJoin(schema.offices, eq(schema.transactions.officeId, schema.offices.id))
    .where(where)
    .orderBy(desc(schema.transactions.createdAt))
    .limit(pageSize)
    .offset(page * pageSize);

  if (!txns.length) return { rows: [], total };

  // Fetch user names for all unique user IDs on this page
  const userIds = [...new Set([
    ...txns.map((t: { performedByUserId: string }) => t.performedByUserId),
    ...txns.map((t: { recordedByUserId: string }) => t.recordedByUserId),
  ])];

  const userRows = await db
    .select({ id: schema.users.id, name: schema.users.name })
    .from(schema.users)
    .where(inArray(schema.users.id, userIds));

  const userMap = new Map<string, string>(userRows.map((u: { id: string; name: string }) => [u.id, u.name]));

  // Fetch line items for this page of transactions
  const txnIds = txns.map((t: { id: string }) => t.id);
  const lineItemRows = await db
    .select({
      transactionId: schema.transactionLineItems.transactionId,
      productId:     schema.transactionLineItems.productId,
      productName:   schema.products.name,
      quantity:      schema.transactionLineItems.quantity,
      otherDesc:     schema.transactionLineItems.otherDescription,
    })
    .from(schema.transactionLineItems)
    .innerJoin(schema.products, eq(schema.transactionLineItems.productId, schema.products.id))
    .where(inArray(schema.transactionLineItems.transactionId, txnIds));

  // Group line items by transactionId
  const lineItemMap = new Map<string, typeof lineItemRows>();
  for (const li of lineItemRows) {
    const list = lineItemMap.get(li.transactionId) ?? [];
    list.push(li);
    lineItemMap.set(li.transactionId, list);
  }

  const rows = txns.map((t: {
    id: string; confirmationId: string; action: string;
    officeId: string; officeName: string; officeNumber: string;
    performedByUserId: string; recordedByUserId: string;
    notes: string | null; createdAt: string;
  }) => ({
    ...t,
    performedByName: userMap.get(t.performedByUserId) ?? t.performedByUserId,
    recordedByName:  userMap.get(t.recordedByUserId)  ?? t.recordedByUserId,
    lineItems:       lineItemMap.get(t.id) ?? [],
  }));

  return { rows, total };
}
