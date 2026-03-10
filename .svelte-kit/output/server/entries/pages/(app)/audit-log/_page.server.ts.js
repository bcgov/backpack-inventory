import { g as getDb, a as getSchema } from "../../../../chunks/index2.js";
import { inArray, eq, gte, lte, and, sql, desc } from "drizzle-orm";
import { g as getOfficeIdsForUser, a as getOfficesForUser } from "../../../../chunks/scope.js";
import { g as getUsersInScope } from "../../../../chunks/users.js";
import { I as INVENTORY_ACTIONS } from "../../../../chunks/types.js";
const DEFAULT_PAGE_SIZE = 50;
async function getAuditLog(db, schema, user, filters, paging = {}) {
  const officeIds = await getOfficeIdsForUser(db, schema, user);
  if (!officeIds.length) return { rows: [], total: 0 };
  const page = paging.page ?? 0;
  const pageSize = paging.pageSize ?? DEFAULT_PAGE_SIZE;
  const conditions = [inArray(schema.transactions.officeId, officeIds)];
  if (filters.officeId) conditions.push(eq(schema.transactions.officeId, filters.officeId));
  if (filters.action) conditions.push(eq(schema.transactions.action, filters.action));
  if (filters.performedByUserId) conditions.push(eq(schema.transactions.performedByUserId, filters.performedByUserId));
  if (filters.dateFrom) conditions.push(gte(schema.transactions.createdAt, filters.dateFrom));
  if (filters.dateTo) conditions.push(lte(schema.transactions.createdAt, filters.dateTo + "T23:59:59Z"));
  const where = and(...conditions);
  const [{ count }] = await db.select({ count: sql`count(*)` }).from(schema.transactions).where(where);
  const total = Number(count);
  const txns = await db.select({
    id: schema.transactions.id,
    confirmationId: schema.transactions.confirmationId,
    action: schema.transactions.action,
    officeId: schema.transactions.officeId,
    officeName: schema.offices.name,
    officeNumber: schema.offices.officeNumber,
    performedByUserId: schema.transactions.performedByUserId,
    recordedByUserId: schema.transactions.recordedByUserId,
    notes: schema.transactions.notes,
    createdAt: schema.transactions.createdAt
  }).from(schema.transactions).innerJoin(schema.offices, eq(schema.transactions.officeId, schema.offices.id)).where(where).orderBy(desc(schema.transactions.createdAt)).limit(pageSize).offset(page * pageSize);
  if (!txns.length) return { rows: [], total };
  const userIds = [.../* @__PURE__ */ new Set([
    ...txns.map((t) => t.performedByUserId),
    ...txns.map((t) => t.recordedByUserId)
  ])];
  const userRows = await db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).where(inArray(schema.users.id, userIds));
  const userMap = new Map(userRows.map((u) => [u.id, u.name]));
  const txnIds = txns.map((t) => t.id);
  const lineItemRows = await db.select({
    transactionId: schema.transactionLineItems.transactionId,
    productId: schema.transactionLineItems.productId,
    productName: schema.products.name,
    quantity: schema.transactionLineItems.quantity,
    otherDesc: schema.transactionLineItems.otherDescription
  }).from(schema.transactionLineItems).innerJoin(schema.products, eq(schema.transactionLineItems.productId, schema.products.id)).where(inArray(schema.transactionLineItems.transactionId, txnIds));
  const lineItemMap = /* @__PURE__ */ new Map();
  for (const li of lineItemRows) {
    const list = lineItemMap.get(li.transactionId) ?? [];
    list.push(li);
    lineItemMap.set(li.transactionId, list);
  }
  const rows = txns.map((t) => ({
    ...t,
    performedByName: userMap.get(t.performedByUserId) ?? t.performedByUserId,
    recordedByName: userMap.get(t.recordedByUserId) ?? t.recordedByUserId,
    lineItems: lineItemMap.get(t.id) ?? []
  }));
  return { rows, total };
}
const PAGE_SIZE = 50;
const load = async ({ locals, url }) => {
  const db = await getDb();
  const schema = await getSchema();
  const user = locals.user;
  const filters = {
    officeId: url.searchParams.get("office") || void 0,
    action: url.searchParams.get("action") || void 0,
    performedByUserId: url.searchParams.get("user") || void 0,
    dateFrom: url.searchParams.get("dateFrom") || void 0,
    dateTo: url.searchParams.get("dateTo") || void 0
  };
  const page = parseInt(url.searchParams.get("page") ?? "0", 10);
  const [{ rows, total }, offices, users] = await Promise.all([
    getAuditLog(db, schema, user, filters, { page, pageSize: PAGE_SIZE }),
    getOfficesForUser(db, schema, user),
    getUsersInScope(db, schema, user)
  ]);
  return {
    rows,
    total,
    page,
    pageSize: PAGE_SIZE,
    filters,
    offices,
    users,
    actions: INVENTORY_ACTIONS
  };
};
export {
  load
};
