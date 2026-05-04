// src/lib/server/services/audit.ts
import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { getOfficeIdsForUser } from './scope.js';
import type { SessionUser, InventoryAction } from '$lib/types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = any; type AnySchema = any;

export interface AuditFilters {
  officeId?:          string;
  action?:            InventoryAction;
  performedByUserId?: string;
  dateFrom?:          string;
  dateTo?:            string;
}

export type AuditSortField = 'id' | 'action' | 'office' | 'performedBy' | 'recordedBy' | 'date';
export interface AuditSort { field: AuditSortField; dir: 'asc' | 'desc' }

export const AUDIT_SORT_FIELDS: ReadonlySet<AuditSortField> = new Set([
  'id', 'action', 'office', 'performedBy', 'recordedBy', 'date',
]);

const DEFAULT_PAGE_SIZE = 50;

export async function getAuditLog(
  db:      AnyDB,
  schema:  AnySchema,
  user:    SessionUser,
  filters: AuditFilters,
  paging:  { page?: number; pageSize?: number } = {},
  sort?:   AuditSort,
) {
  const officeIds = await getOfficeIdsForUser(db, schema, user);
  if (!officeIds.length) return { rows: [], total: 0 };

  const page     = paging.page     ?? 0;
  const pageSize = paging.pageSize ?? DEFAULT_PAGE_SIZE;

  const conditions = [inArray(schema.transactions.officeId, officeIds)];
  if (filters.officeId)          conditions.push(eq(schema.transactions.officeId,          filters.officeId));
  if (filters.action)            conditions.push(eq(schema.transactions.action,            filters.action));
  if (filters.performedByUserId) conditions.push(eq(schema.transactions.performedByUserId, filters.performedByUserId));
  if (filters.dateFrom)          conditions.push(gte(schema.transactions.createdAt,        filters.dateFrom));
  if (filters.dateTo)            conditions.push(lte(schema.transactions.createdAt,        filters.dateTo + 'T23:59:59Z'));

  const where = and(...conditions);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.transactions)
    .where(where);
  const total = Number(count);

  const performer = alias(schema.users, 'performer');
  const recorder  = alias(schema.users, 'recorder');

  const sortField = sort && AUDIT_SORT_FIELDS.has(sort.field) ? sort.field : null;
  const dirFn = sort?.dir === 'asc' ? asc : desc;

  const orderByClauses = (() => {
    switch (sortField) {
      case 'id':          return [dirFn(schema.transactions.confirmationId)];
      case 'action':      return [dirFn(schema.transactions.action)];
      case 'office':      return [dirFn(schema.offices.officeNumber)];
      case 'performedBy': return [dirFn(performer.name)];
      case 'recordedBy':  return [dirFn(recorder.name)];
      case 'date':        return [dirFn(schema.transactions.createdAt)];
      default:            return [desc(schema.transactions.createdAt)];
    }
  })();
  // Stable tie-breaker for cross-page ordering.
  orderByClauses.push(desc(schema.transactions.id));

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
      performedByName:   performer.name,
      recordedByName:    recorder.name,
    })
    .from(schema.transactions)
    .innerJoin(schema.offices, eq(schema.transactions.officeId,        schema.offices.id))
    .innerJoin(performer,      eq(schema.transactions.performedByUserId, performer.id))
    .innerJoin(recorder,       eq(schema.transactions.recordedByUserId,  recorder.id))
    .where(where)
    .orderBy(...orderByClauses)
    .limit(pageSize)
    .offset(page * pageSize);

  if (!txns.length) return { rows: [], total };

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
    performedByName: string; recordedByName: string;
    notes: string | null; createdAt: string;
  }) => ({
    ...t,
    lineItems: lineItemMap.get(t.id) ?? [],
  }));

  return { rows, total };
}
