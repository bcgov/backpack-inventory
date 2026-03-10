import { g as getDb, a as getSchema } from './index2-BRX5Berz.js';
import { g as getOfficesForUser } from './scope-_J_qWR4v.js';
import { a as asc } from './select-C0cBrsvG.js';
import './shared-server-DaWdgxVh.js';
import './types-Dpk4TN7N.js';

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

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 7;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-DL7eo7Cp.js')).default;
const server_id = "src/routes/(app)/admin/qr-codes/+page.server.ts";
const imports = ["_app/immutable/nodes/7.nRIIAAFH.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/uwKY8xQT.js","_app/immutable/chunks/DIeogL5L.js","_app/immutable/chunks/Cm6brbW_.js","_app/immutable/chunks/C4P3zt49.js","_app/immutable/chunks/Peabs2Tj.js","_app/immutable/chunks/DgflIAKz.js","_app/immutable/chunks/CfG_s9zU.js","_app/immutable/chunks/DAcvOs1t.js","_app/immutable/chunks/1qvwCiOG.js"];
const stylesheets = ["_app/immutable/assets/7.tn0RQdqM.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=7-z48ZPA1q.js.map
