import { g as getDb, a as getSchema } from "../../../../chunks/index2.js";
import { inArray, eq, gte, lte, sql, and, desc } from "drizzle-orm";
import { g as getOfficeIdsForUser, a as getOfficesForUser } from "../../../../chunks/scope.js";
async function getTransactionHistory(db, schema, user, filters) {
  const officeIds = await getOfficeIdsForUser(db, schema, user);
  if (!officeIds.length) return [];
  const conditions = [inArray(schema.transactions.officeId, officeIds)];
  if (filters.officeId) conditions.push(eq(schema.transactions.officeId, filters.officeId));
  if (filters.dateFrom) conditions.push(gte(schema.transactions.createdAt, filters.dateFrom));
  if (filters.dateTo) conditions.push(lte(schema.transactions.createdAt, filters.dateTo + "T23:59:59Z"));
  return db.select({
    month: sql`strftime('%Y-%m', ${schema.transactions.createdAt})`,
    action: schema.transactions.action,
    txnCount: sql`cast(count(*) as integer)`,
    totalItems: sql`cast(sum(${schema.transactionLineItems.quantity}) as integer)`
  }).from(schema.transactions).innerJoin(
    schema.transactionLineItems,
    eq(schema.transactions.id, schema.transactionLineItems.transactionId)
  ).where(and(...conditions)).groupBy(
    sql`strftime('%Y-%m', ${schema.transactions.createdAt})`,
    schema.transactions.action
  ).orderBy(desc(sql`strftime('%Y-%m', ${schema.transactions.createdAt})`));
}
async function getUsageByStaff(db, schema, user) {
  const officeIds = await getOfficeIdsForUser(db, schema, user);
  if (!officeIds.length) return [];
  return db.select({
    userId: schema.transactions.performedByUserId,
    userName: schema.users.name,
    action: schema.transactions.action,
    txnCount: sql`cast(count(*) as integer)`
  }).from(schema.transactions).innerJoin(schema.users, eq(schema.transactions.performedByUserId, schema.users.id)).where(inArray(schema.transactions.officeId, officeIds)).groupBy(
    schema.transactions.performedByUserId,
    schema.users.name,
    schema.transactions.action
  ).orderBy(schema.users.name, schema.transactions.action);
}
const load = async ({ locals, url }) => {
  const db = await getDb();
  const schema = await getSchema();
  const user = locals.user;
  const filters = {
    officeId: url.searchParams.get("office") || void 0,
    dateFrom: url.searchParams.get("dateFrom") || void 0,
    dateTo: url.searchParams.get("dateTo") || void 0
  };
  const [history, staffUsage, offices] = await Promise.all([
    getTransactionHistory(db, schema, user, filters),
    getUsageByStaff(db, schema, user),
    getOfficesForUser(db, schema, user)
  ]);
  return { history, staffUsage, offices, filters };
};
export {
  load
};
