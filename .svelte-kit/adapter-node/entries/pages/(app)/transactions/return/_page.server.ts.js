import { fail } from "@sveltejs/kit";
import { g as getDb, a as getSchema } from "../../../../../chunks/index2.js";
import { a as getOfficesForUser } from "../../../../../chunks/scope.js";
import { g as getUsersInScope } from "../../../../../chunks/users.js";
import { c as createTransaction } from "../../../../../chunks/transactions.js";
import { asc, eq } from "drizzle-orm";
const load = async ({ locals }) => {
  const db = await getDb();
  const schema = await getSchema();
  const user = locals.user;
  const [offices, categories, products, onBehalfUsers] = await Promise.all([
    getOfficesForUser(db, schema, user),
    db.select().from(schema.productCategories).orderBy(asc(schema.productCategories.sortOrder)),
    db.select().from(schema.products).where(eq(schema.products.isActive, true)).orderBy(asc(schema.products.name)),
    getUsersInScope(db, schema, user)
  ]);
  return { offices, categories, products, onBehalfUsers };
};
const actions = {
  default: async ({ request, locals }) => {
    const user = locals.user;
    const data = await request.formData();
    const officeId = data.get("officeId");
    const performedByUserId = data.get("performedByUserId") || user.id;
    const productIds = data.getAll("productId");
    const quantities = data.getAll("quantity");
    const otherDescs = data.getAll("otherDescription");
    const lineItems = productIds.map((productId, i) => ({ productId, quantity: parseInt(quantities[i] ?? "0", 10), otherDescription: otherDescs[i] || void 0 })).filter((li) => li.productId && li.quantity > 0);
    const db = await getDb();
    const schema = await getSchema();
    try {
      const { confirmationId } = await createTransaction(db, schema, user, {
        action: "return",
        officeId,
        performedByUserId,
        lineItems,
        notes: data.get("notes") || void 0
      });
      return { confirmationId };
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : "Failed" });
    }
  }
};
export {
  actions,
  load
};
