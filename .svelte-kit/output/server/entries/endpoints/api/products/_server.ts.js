import { error, json } from "@sveltejs/kit";
import { g as getDb, a as getSchema } from "../../../../chunks/index2.js";
import { asc, eq } from "drizzle-orm";
const GET = async ({ locals }) => {
  if (!locals.user) throw error(401, "Unauthorized");
  const db = await getDb();
  const schema = await getSchema();
  const categories = await db.select().from(schema.productCategories).orderBy(asc(schema.productCategories.sortOrder));
  const products = await db.select().from(schema.products).where(eq(schema.products.isActive, true)).orderBy(asc(schema.products.name));
  return json({ categories, products });
};
export {
  GET
};
