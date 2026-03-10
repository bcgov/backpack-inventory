import { fail, error } from "@sveltejs/kit";
import { eq, and } from "drizzle-orm";
import { g as getDb, a as getSchema } from "../../../../../../chunks/index2.js";
import { b as assertOfficeInScope } from "../../../../../../chunks/scope.js";
import { c as createTransaction } from "../../../../../../chunks/transactions.js";
const load = async ({ params, locals }) => {
  const { officeId, productId } = params;
  const user = locals.user;
  const db = await getDb();
  const schema = await getSchema();
  const [[office], [product]] = await Promise.all([
    db.select({ id: schema.offices.id, name: schema.offices.name }).from(schema.offices).where(eq(schema.offices.id, officeId)).limit(1),
    db.select({ id: schema.products.id, name: schema.products.name }).from(schema.products).where(and(eq(schema.products.id, productId), eq(schema.products.isActive, true))).limit(1)
  ]);
  if (!office) throw error(404, "Office not found");
  if (!product) throw error(404, "Product not found or inactive");
  await assertOfficeInScope(db, schema, user, officeId);
  return { office, product };
};
const actions = {
  default: async ({ params, request, locals }) => {
    const { officeId, productId } = params;
    const user = locals.user;
    const data = await request.formData();
    const action = data.get("action");
    const qtyRaw = data.get("quantity");
    const notes = data.get("notes");
    if (!action || !qtyRaw) {
      return fail(400, { error: "action and quantity are required" });
    }
    if (action !== "receive" && action !== "remove") {
      return fail(400, { error: 'action must be "receive" or "remove"' });
    }
    const quantity = parseInt(qtyRaw, 10);
    if (!quantity || quantity <= 0) {
      return fail(400, { error: "quantity must be a positive integer" });
    }
    const db = await getDb();
    const schema = await getSchema();
    try {
      const { confirmationId } = await createTransaction(db, schema, user, {
        action,
        officeId,
        performedByUserId: user.id,
        lineItems: [{ productId, quantity }],
        notes: notes || void 0
      });
      return { confirmationId };
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : "Failed to record transaction" });
    }
  }
};
export {
  actions,
  load
};
