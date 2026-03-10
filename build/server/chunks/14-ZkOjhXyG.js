import { g as getDb, a as getSchema, i as inArray, e as eq, b as gte, l as lte, s as sql, c as and } from './index2-BRX5Berz.js';
import { g as getOfficesForUser, a as getOfficeIdsForUser } from './scope-_J_qWR4v.js';
import { d as desc } from './select-C0cBrsvG.js';
import './shared-server-DaWdgxVh.js';
import './types-Dpk4TN7N.js';

async function getTransactionHistory(db, schema, user, filters) {
  const officeIds = await getOfficeIdsForUser(db, schema, user);
  if (!officeIds.length) return [];
  const conditions = [inArray(schema.transactions.officeId, officeIds)];
  if (filters.officeId) conditions.push(eq(schema.transactions.officeId, filters.officeId));
  if (filters.dateFrom) conditions.push(gte(schema.transactions.createdAt, filters.dateFrom));
  if (filters.dateTo) conditions.push(lte(schema.transactions.createdAt, filters.dateTo + "T23:59:59Z"));
  return db.select({
    month: sql`strftime('%Y-%m', ${schema.transactions.createdAt})`,
    action: schema.transactions.action,
    txnCount: sql`cast(count(*) as integer)`,
    totalItems: sql`cast(sum(${schema.transactionLineItems.quantity}) as integer)`
  }).from(schema.transactions).innerJoin(
    schema.transactionLineItems,
    eq(schema.transactions.id, schema.transactionLineItems.transactionId)
  ).where(and(...conditions)).groupBy(
    sql`strftime('%Y-%m', ${schema.transactions.createdAt})`,
    schema.transactions.action
  ).orderBy(desc(sql`strftime('%Y-%m', ${schema.transactions.createdAt})`));
}
async function getUsageByStaff(db, schema, user) {
  const officeIds = await getOfficeIdsForUser(db, schema, user);
  if (!officeIds.length) return [];
  return db.select({
    userId: schema.transactions.performedByUserId,
    userName: schema.users.name,
    action: schema.transactions.action,
    txnCount: sql`cast(count(*) as integer)`
  }).from(schema.transactions).innerJoin(schema.users, eq(schema.transactions.performedByUserId, schema.users.id)).where(inArray(schema.transactions.officeId, officeIds)).groupBy(
    schema.transactions.performedByUserId,
    schema.users.name,
    schema.transactions.action
  ).orderBy(schema.users.name, schema.transactions.action);
}
const load = async ({ locals, url }) => {
  const db = await getDb();
  const schema = await getSchema();
  const user = locals.user;
  const filters = {
    officeId: url.searchParams.get("office") || void 0,
    dateFrom: url.searchParams.get("dateFrom") || void 0,
    dateTo: url.searchParams.get("dateTo") || void 0
  };
  const [history, staffUsage, offices] = await Promise.all([
    getTransactionHistory(db, schema, user, filters),
    getUsageByStaff(db, schema, user),
    getOfficesForUser(db, schema, user)
  ]);
  return { history, staffUsage, offices, filters };
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 14;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-bdwt-J4-.js')).default;
const server_id = "src/routes/(app)/reports/+page.server.ts";
const imports = ["_app/immutable/nodes/14.Bis4oZgE.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/uwKY8xQT.js","_app/immutable/chunks/DIeogL5L.js","_app/immutable/chunks/Cm6brbW_.js","_app/immutable/chunks/C4P3zt49.js","_app/immutable/chunks/Peabs2Tj.js","_app/immutable/chunks/DgflIAKz.js","_app/immutable/chunks/CfG_s9zU.js","_app/immutable/chunks/Dx78MLBa.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=14-ZkOjhXyG.js.map
