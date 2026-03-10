import { f as fail } from './index-B2LGyy1l.js';
import { g as getDb, a as getSchema, e as eq } from './index2-BRX5Berz.js';
import { g as getOfficesForUser } from './scope-_J_qWR4v.js';
import { c as createTransaction } from './transactions-BaYBlP1f.js';
import { a as asc } from './select-C0cBrsvG.js';
import './shared-server-DaWdgxVh.js';
import './types-Dpk4TN7N.js';
import 'crypto';

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

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions,
  load: load
});

const index = 11;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-CfFt3iR4.js')).default;
const server_id = "src/routes/(app)/inventory-count/+page.server.ts";
const imports = ["_app/immutable/nodes/11.DMHuEJzT.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/uwKY8xQT.js","_app/immutable/chunks/DIeogL5L.js","_app/immutable/chunks/Cm6brbW_.js","_app/immutable/chunks/C4P3zt49.js","_app/immutable/chunks/Peabs2Tj.js","_app/immutable/chunks/DgflIAKz.js","_app/immutable/chunks/DyAjWB2Z.js","_app/immutable/chunks/Pi8bXYsL.js","_app/immutable/chunks/1qvwCiOG.js","_app/immutable/chunks/DAcvOs1t.js","_app/immutable/chunks/CfG_s9zU.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=11-CZSoBej3.js.map
