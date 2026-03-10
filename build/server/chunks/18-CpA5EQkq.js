import { f as fail } from './index-B2LGyy1l.js';
import { g as getDb, a as getSchema, e as eq } from './index2-BRX5Berz.js';
import { g as getOfficesForUser } from './scope-_J_qWR4v.js';
import { g as getUsersInScope } from './users-DN0KG5mI.js';
import { c as createTransaction } from './transactions-BaYBlP1f.js';
import { a as asc } from './select-C0cBrsvG.js';
import './shared-server-DaWdgxVh.js';
import './types-Dpk4TN7N.js';
import 'crypto';

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
    const lineItems = productIds.map((productId, i) => ({ productId, quantity: parseInt(quantities[i] ?? "0", 10) })).filter((li) => li.productId && li.quantity > 0);
    const db = await getDb();
    const schema = await getSchema();
    try {
      const { confirmationId } = await createTransaction(db, schema, user, {
        action: "remove",
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

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions,
  load: load
});

const index = 18;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-BfH7XFUP.js')).default;
const server_id = "src/routes/(app)/transactions/remove/+page.server.ts";
const imports = ["_app/immutable/nodes/18.C_0P-rxn.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/uwKY8xQT.js","_app/immutable/chunks/DIeogL5L.js","_app/immutable/chunks/DRoJ0DXf.js","_app/immutable/chunks/Cm6brbW_.js","_app/immutable/chunks/C4P3zt49.js","_app/immutable/chunks/Peabs2Tj.js","_app/immutable/chunks/DgflIAKz.js","_app/immutable/chunks/DyAjWB2Z.js","_app/immutable/chunks/Pi8bXYsL.js","_app/immutable/chunks/1qvwCiOG.js","_app/immutable/chunks/DAcvOs1t.js","_app/immutable/chunks/CfG_s9zU.js","_app/immutable/chunks/Ltm9fTdL.js","_app/immutable/chunks/hE7HE9bc.js","_app/immutable/chunks/DRU176QL.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=18-CpA5EQkq.js.map
