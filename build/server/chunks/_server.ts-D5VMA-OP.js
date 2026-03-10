import { e as error, j as json } from './index-B2LGyy1l.js';
import { g as getDb, a as getSchema, e as eq } from './index2-BRX5Berz.js';
import { a as asc } from './select-C0cBrsvG.js';
import './shared-server-DaWdgxVh.js';

const GET = async ({ locals }) => {
  if (!locals.user) throw error(401, "Unauthorized");
  const db = await getDb();
  const schema = await getSchema();
  const categories = await db.select().from(schema.productCategories).orderBy(asc(schema.productCategories.sortOrder));
  const products = await db.select().from(schema.products).where(eq(schema.products.isActive, true)).orderBy(asc(schema.products.name));
  return json({ categories, products });
};

export { GET };
//# sourceMappingURL=_server.ts-D5VMA-OP.js.map
