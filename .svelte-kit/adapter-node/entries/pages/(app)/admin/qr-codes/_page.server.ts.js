import { asc } from "drizzle-orm";
import { g as getDb, a as getSchema } from "../../../../../chunks/index2.js";
import { a as getOfficesForUser } from "../../../../../chunks/scope.js";
const load = async ({ url, locals }) => {
  const user = locals.user;
  const db = await getDb();
  const schema = await getSchema();
  const [offices, categories, products] = await Promise.all([
    getOfficesForUser(db, schema, user),
    db.select().from(schema.productCategories).orderBy(asc(schema.productCategories.sortOrder)),
    db.select({
      id: schema.products.id,
      name: schema.products.name,
      categoryId: schema.products.categoryId
    }).from(schema.products).orderBy(asc(schema.products.name))
  ]);
  const requestedId = url.searchParams.get("officeId");
  const selectedOffice = offices.find((o) => o.id === requestedId) ?? offices[0] ?? null;
  return { offices, categories, products, selectedOffice };
};
export {
  load
};
