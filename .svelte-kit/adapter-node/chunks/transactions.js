import { randomUUID, randomBytes } from "crypto";
import { sql, and, eq } from "drizzle-orm";
import { R as ROLE_PERMISSIONS } from "./types.js";
import { b as assertOfficeInScope } from "./scope.js";
function generateConfirmationId() {
  return randomBytes(4).toString("hex").toUpperCase();
}
const INVENTORY_DELTA = {
  receive: 1,
  return: 1,
  remove: -1
};
async function createTransaction(db, schema, recordedBy, input) {
  if (!input.lineItems.length) {
    throw new Error("Transaction must have at least one item");
  }
  if (input.lineItems.some((li) => li.quantity <= 0)) {
    throw new Error("All item quantities must be greater than zero");
  }
  await assertOfficeInScope(db, schema, recordedBy, input.officeId);
  if (input.performedByUserId !== recordedBy.id) {
    const canDelegate = ROLE_PERMISSIONS[recordedBy.role].has("record_on_behalf");
    if (!canDelegate) {
      throw new Error(
        `Your role (${recordedBy.role}) cannot record on behalf of another user`
      );
    }
  }
  if (input.action === "redistribute" && !input.destinationOfficeId) {
    throw new Error("destinationOfficeId is required for redistribute");
  }
  const transactionId = randomUUID();
  const confirmationId = generateConfirmationId();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.transaction((tx) => {
    tx.insert(schema.transactions).values({
      id: transactionId,
      confirmationId,
      action: input.action,
      officeId: input.officeId,
      performedByUserId: input.performedByUserId,
      recordedByUserId: recordedBy.id,
      shippingReceiptPath: input.shippingReceiptPath ?? null,
      notes: input.notes ?? null,
      createdAt: now
    }).run();
    for (const li of input.lineItems) {
      tx.insert(schema.transactionLineItems).values({
        id: randomUUID(),
        transactionId,
        productId: li.productId,
        quantity: li.quantity,
        otherDescription: li.otherDescription ?? null
      }).run();
    }
    const currentQty = (tx2, officeId, productId) => {
      const [row] = tx2.select({ quantity: schema.currentInventory.quantity }).from(schema.currentInventory).where(and(
        eq(schema.currentInventory.officeId, officeId),
        eq(schema.currentInventory.productId, productId)
      )).limit(1).all();
      return row?.quantity ?? 0;
    };
    if (input.action === "inventory_count") {
      tx.insert(schema.inventoryCounts).values({
        id: randomUUID(),
        transactionId,
        status: "pending"
      }).run();
    } else if (input.action === "redistribute") {
      for (const li of input.lineItems) {
        const available = currentQty(tx, input.officeId, li.productId);
        if (available < li.quantity) {
          throw new Error(
            `Insufficient inventory: cannot redistribute ${li.quantity} of product ${li.productId} (available: ${available})`
          );
        }
      }
      tx.insert(schema.redistributionDetails).values({
        id: randomUUID(),
        transactionId,
        destinationOfficeId: input.destinationOfficeId
      }).run();
      for (const li of input.lineItems) {
        const srcDelta = -li.quantity;
        const destDelta = li.quantity;
        tx.insert(schema.currentInventory).values({
          id: randomUUID(),
          officeId: input.officeId,
          productId: li.productId,
          quantity: srcDelta,
          updatedAt: now
        }).onConflictDoUpdate({
          target: [schema.currentInventory.officeId, schema.currentInventory.productId],
          set: { quantity: sql`${schema.currentInventory.quantity} + ${srcDelta}`, updatedAt: now }
        }).run();
        tx.insert(schema.currentInventory).values({
          id: randomUUID(),
          officeId: input.destinationOfficeId,
          productId: li.productId,
          quantity: destDelta,
          updatedAt: now
        }).onConflictDoUpdate({
          target: [schema.currentInventory.officeId, schema.currentInventory.productId],
          set: { quantity: sql`${schema.currentInventory.quantity} + ${destDelta}`, updatedAt: now }
        }).run();
      }
    } else {
      const direction = INVENTORY_DELTA[input.action];
      if (direction !== void 0) {
        if (direction === -1) {
          for (const li of input.lineItems) {
            const available = currentQty(tx, input.officeId, li.productId);
            if (available < li.quantity) {
              throw new Error(
                `Insufficient inventory: cannot remove ${li.quantity} of product ${li.productId} (available: ${available})`
              );
            }
          }
        }
        for (const li of input.lineItems) {
          const delta = direction * li.quantity;
          tx.insert(schema.currentInventory).values({
            id: randomUUID(),
            officeId: input.officeId,
            productId: li.productId,
            quantity: delta,
            updatedAt: now
          }).onConflictDoUpdate({
            target: [schema.currentInventory.officeId, schema.currentInventory.productId],
            set: { quantity: sql`${schema.currentInventory.quantity} + ${delta}`, updatedAt: now }
          }).run();
        }
      }
    }
  });
  return { confirmationId, transactionId };
}
export {
  createTransaction as c
};
