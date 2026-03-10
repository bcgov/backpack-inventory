import { fail } from "@sveltejs/kit";
import { g as getDb, a as getSchema } from "../../../../../chunks/index2.js";
import { a as toggleProduct, b as addProduct, c as listCategories } from "../../../../../chunks/admin.js";
const load = async () => {
  const db = await getDb();
  const schema = await getSchema();
  return { categories: await listCategories(db, schema) };
};
const actions = {
  addProduct: async ({ request }) => {
    const db = await getDb();
    const schema = await getSchema();
    const data = await request.formData();
    const categoryId = data.get("categoryId");
    const name = data.get("name")?.trim();
    if (!name) return fail(400, { addError: "Product name is required" });
    if (!categoryId) return fail(400, { addError: "Category is required" });
    try {
      await addProduct(db, schema, { categoryId, name });
      return { addSuccess: true };
    } catch (e) {
      return fail(400, { addError: e instanceof Error ? e.message : "Failed to add product" });
    }
  },
  toggleProduct: async ({ request }) => {
    const db = await getDb();
    const schema = await getSchema();
    const data = await request.formData();
    const productId = data.get("productId");
    const isActive = data.get("isActive") === "true";
    try {
      await toggleProduct(db, schema, productId, isActive);
      return { toggleSuccess: true };
    } catch (e) {
      return fail(400, { toggleError: e instanceof Error ? e.message : "Failed" });
    }
  }
};
export {
  actions,
  load
};
