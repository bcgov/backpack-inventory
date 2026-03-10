import { fail } from "@sveltejs/kit";
import { asc, eq } from "drizzle-orm";
import { g as getDb, a as getSchema } from "../../../../chunks/index2.js";
import { a as getOfficesForUser } from "../../../../chunks/scope.js";
import { c as createTransaction } from "../../../../chunks/transactions.js";
const load = async ({ locals }) => {
  const db = await getDb();
  const schema = await getSchema();
  const user = locals.user;
  const [offices, categories, products] = await Promise.all([
    getOfficesForUser(db, schema, user),
    db.select().from(schema.productCategories).orderBy(asc(schema.productCategories.sortOrder)),
    db.select().from(schema.products).where(eq(schema.products.isActive, true)).orderBy(asc(schema.products.name))
  ]);
  return { offices, categories, products };
};
const actions = {
  default: async ({ request, locals }) => {
    const user = locals.user;
    const data = await request.formData();
    const officeId = data.get("officeId");
    if (!officeId) return fail(400, { error: "Office is required" });
    const lineItems = [];
    for (const [key, value] of data.entries()) {
      if (key.startsWith("qty_") && value !== "") {
        const productId = key.slice(4);
        const quantity = parseInt(value, 10);
        if (!isNaN(quantity) && quantity >= 0) {
          lineItems.push({ productId, quantity });
        }
      }
    }
    if (!lineItems.length) {
      return fail(400, { error: "Enter at least one product quantity to record a count" });
    }
    const db = await getDb();
    const schema = await getSchema();
    try {
      const { confirmationId } = await createTransaction(db, schema, user, {
        action: "inventory_count",
        officeId,
        performedByUserId: user.id,
        lineItems,
        notes: data.get("notes") || void 0
      });
      return { confirmationId };
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : "Failed to record count" });
    }
  }
};
export {
  actions,
  load
};
