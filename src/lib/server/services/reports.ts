// src/lib/server/services/reports.ts
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { getOfficeIdsForUser } from './scope.js';
import type { SessionUser } from '$lib/types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = any; type AnySchema = any;

export interface HistoryFilters {
  officeId?:  string;
  dateFrom?:  string; // YYYY-MM-DD
  dateTo?:    string; // YYYY-MM-DD
}

/**
 * UC-13: Transaction counts + item totals grouped by calendar month and action type.
 * Returns rows ordered newest month first.
 */
export async function getTransactionHistory(
  db:      AnyDB,
  schema:  AnySchema,
  user:    SessionUser,
  filters: HistoryFilters,
) {
  const officeIds = await getOfficeIdsForUser(db, schema, user);
  if (!officeIds.length) return [];

  const conditions = [inArray(schema.transactions.officeId, officeIds)];
  if (filters.officeId) conditions.push(eq(schema.transactions.officeId, filters.officeId));
  if (filters.dateFrom) conditions.push(gte(schema.transactions.createdAt, filters.dateFrom));
  if (filters.dateTo)   conditions.push(lte(schema.transactions.createdAt, filters.dateTo + 'T23:59:59Z'));

  // SQLite: strftime('%Y-%m', created_at) groups by year-month
  return db
    .select({
      month:      sql<string>`strftime('%Y-%m', ${schema.transactions.createdAt})`,
      action:     schema.transactions.action,
      txnCount:   sql<number>`cast(count(*) as integer)`,
      totalItems: sql<number>`cast(sum(${schema.transactionLineItems.quantity}) as integer)`,
    })
    .from(schema.transactions)
    .innerJoin(
      schema.transactionLineItems,
      eq(schema.transactions.id, schema.transactionLineItems.transactionId),
    )
    .where(and(...conditions))
    .groupBy(
      sql`strftime('%Y-%m', ${schema.transactions.createdAt})`,
      schema.transactions.action,
    )
    .orderBy(desc(sql`strftime('%Y-%m', ${schema.transactions.createdAt})`));
}

/**
 * UC-14: Transaction counts grouped by the staff member who performed them
 * and action type. Used by supervisors to track system usage.
 */
export async function getUsageByStaff(
  db:     AnyDB,
  schema: AnySchema,
  user:   SessionUser,
) {
  const officeIds = await getOfficeIdsForUser(db, schema, user);
  if (!officeIds.length) return [];

  return db
    .select({
      userId:   schema.transactions.performedByUserId,
      userName: schema.users.name,
      action:   schema.transactions.action,
      txnCount: sql<number>`cast(count(*) as integer)`,
    })
    .from(schema.transactions)
    .innerJoin(schema.users, eq(schema.transactions.performedByUserId, schema.users.id))
    .where(inArray(schema.transactions.officeId, officeIds))
    .groupBy(
      schema.transactions.performedByUserId,
      schema.users.name,
      schema.transactions.action,
    )
    .orderBy(schema.users.name, schema.transactions.action);
}
