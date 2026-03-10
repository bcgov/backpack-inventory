import { e as error, j as json } from './index-B2LGyy1l.js';
import { g as getDb, a as getSchema, e as eq, i as inArray } from './index2-BRX5Berz.js';
import { a as getOfficeIdsForUser } from './scope-_J_qWR4v.js';
import './shared-server-DaWdgxVh.js';
import './types-Dpk4TN7N.js';

async function getCurrentInventory(db, schema, user, officeId) {
  const officeIds = officeId ? [officeId] : await getOfficeIdsForUser(db, schema, user);
  if (!officeIds.length) return [];
  const rows = await db.select({
    officeId: schema.currentInventory.officeId,
    officeName: schema.offices.name,
    officeNum: schema.offices.officeNumber,
    productId: schema.currentInventory.productId,
    productName: schema.products.name,
    categoryId: schema.products.categoryId,
    quantity: schema.currentInventory.quantity,
    updatedAt: schema.currentInventory.updatedAt
  }).from(schema.currentInventory).innerJoin(schema.offices, eq(schema.currentInventory.officeId, schema.offices.id)).innerJoin(schema.products, eq(schema.currentInventory.productId, schema.products.id)).where(inArray(schema.currentInventory.officeId, officeIds)).orderBy(schema.offices.officeNumber, schema.products.name);
  return rows;
}
const GET = async ({ locals, url }) => {
  if (!locals.user) throw error(401, "Unauthorized");
  const officeId = url.searchParams.get("office") ?? void 0;
  const db = await getDb();
  const schema = await getSchema();
  const rows = await getCurrentInventory(db, schema, locals.user, officeId);
  return json(rows);
};

export { GET };
//# sourceMappingURL=_server.ts-DvCMT9mV.js.map
