import { randomUUID } from 'crypto';
import { R as ROLE_PERMISSIONS } from './types-Dpk4TN7N.js';
import { a as getOfficeIdsForUser, b as assertOfficeInScope } from './scope-_J_qWR4v.js';
import { e as eq, c as and, i as inArray } from './index2-BRX5Berz.js';

async function listPendingCounts(db, schema, user) {
  const officeIds = await getOfficeIdsForUser(db, schema, user);
  if (!officeIds.length) return [];
  return db.select({
    transactionId: schema.inventoryCounts.transactionId,
    status: schema.inventoryCounts.status,
    confirmationId: schema.transactions.confirmationId,
    officeId: schema.transactions.officeId,
    officeName: schema.offices.name,
    officeNumber: schema.offices.officeNumber,
    performedByName: schema.users.name,
    createdAt: schema.transactions.createdAt
  }).from(schema.inventoryCounts).innerJoin(
    schema.transactions,
    eq(schema.inventoryCounts.transactionId, schema.transactions.id)
  ).innerJoin(
    schema.offices,
    eq(schema.transactions.officeId, schema.offices.id)
  ).innerJoin(
    schema.users,
    eq(schema.transactions.performedByUserId, schema.users.id)
  ).where(
    and(
      eq(schema.inventoryCounts.status, "pending"),
      inArray(schema.transactions.officeId, officeIds)
    )
  ).orderBy(schema.transactions.createdAt);
}
async function getCountDetail(db, schema, user, transactionId) {
  const [count] = await db.select({
    transactionId: schema.inventoryCounts.transactionId,
    status: schema.inventoryCounts.status,
    reasonCode: schema.inventoryCounts.reasonCode,
    reconcilerNotes: schema.inventoryCounts.reconcilerNotes,
    reconciledAt: schema.inventoryCounts.reconciledAt,
    confirmationId: schema.transactions.confirmationId,
    officeId: schema.transactions.officeId,
    officeName: schema.offices.name,
    officeNumber: schema.offices.officeNumber,
    performedByName: schema.users.name,
    createdAt: schema.transactions.createdAt
  }).from(schema.inventoryCounts).innerJoin(
    schema.transactions,
    eq(schema.inventoryCounts.transactionId, schema.transactions.id)
  ).innerJoin(
    schema.offices,
    eq(schema.transactions.officeId, schema.offices.id)
  ).innerJoin(
    schema.users,
    eq(schema.transactions.performedByUserId, schema.users.id)
  ).where(eq(schema.inventoryCounts.transactionId, transactionId)).limit(1);
  if (!count) return null;
  await assertOfficeInScope(db, schema, user, count.officeId);
  const lineItems = await db.select({
    productId: schema.transactionLineItems.productId,
    productName: schema.products.name,
    categoryName: schema.productCategories.name,
    physicalQuantity: schema.transactionLineItems.quantity
  }).from(schema.transactionLineItems).innerJoin(
    schema.products,
    eq(schema.transactionLineItems.productId, schema.products.id)
  ).innerJoin(
    schema.productCategories,
    eq(schema.products.categoryId, schema.productCategories.id)
  ).where(eq(schema.transactionLineItems.transactionId, transactionId)).orderBy(schema.productCategories.name, schema.products.name);
  const currentRows = await db.select({
    productId: schema.currentInventory.productId,
    quantity: schema.currentInventory.quantity
  }).from(schema.currentInventory).where(eq(schema.currentInventory.officeId, count.officeId));
  const systemMap = new Map(
    currentRows.map((r) => [r.productId, r.quantity])
  );
  const comparison = lineItems.map((li) => {
    const systemQuantity = systemMap.get(li.productId) ?? 0;
    return {
      ...li,
      systemQuantity,
      discrepancy: li.physicalQuantity - systemQuantity
    };
  });
  return { count, comparison };
}
async function reconcileCount(db, schema, user, transactionId, decision) {
  if (!ROLE_PERMISSIONS[user.role].has("reconcile_count")) {
    throw new Error(`Your role (${user.role}) does not have permission to reconcile counts`);
  }
  const [count] = await db.select({
    status: schema.inventoryCounts.status,
    officeId: schema.transactions.officeId
  }).from(schema.inventoryCounts).innerJoin(
    schema.transactions,
    eq(schema.inventoryCounts.transactionId, schema.transactions.id)
  ).where(eq(schema.inventoryCounts.transactionId, transactionId)).limit(1);
  if (!count) throw new Error("Inventory count not found");
  if (count.status !== "pending") throw new Error("Only pending counts can be reconciled");
  await assertOfficeInScope(db, schema, user, count.officeId);
  const lineItems = decision.action === "accept" ? await db.select({
    productId: schema.transactionLineItems.productId,
    quantity: schema.transactionLineItems.quantity
  }).from(schema.transactionLineItems).where(eq(schema.transactionLineItems.transactionId, transactionId)) : [];
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.transaction((tx) => {
    tx.update(schema.inventoryCounts).set({
      status: decision.action === "accept" ? "accepted" : "rejected",
      reconciledByUserId: user.id,
      reconciledAt: now,
      reasonCode: decision.reasonCode ?? null,
      reconcilerNotes: decision.notes ?? null
    }).where(eq(schema.inventoryCounts.transactionId, transactionId)).run();
    if (decision.action === "accept") {
      for (const li of lineItems) {
        tx.insert(schema.currentInventory).values({
          id: randomUUID(),
          officeId: count.officeId,
          productId: li.productId,
          quantity: li.quantity,
          updatedAt: now
        }).onConflictDoUpdate({
          target: [schema.currentInventory.officeId, schema.currentInventory.productId],
          set: { quantity: li.quantity, updatedAt: now }
        }).run();
      }
    }
  });
}

export { getCountDetail as g, listPendingCounts as l, reconcileCount as r };
//# sourceMappingURL=reconcile-OnyS4z3j.js.map
