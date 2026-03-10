import { f as fail, e as error } from './index-B2LGyy1l.js';
import { g as getDb, a as getSchema, e as eq, c as and } from './index2-BRX5Berz.js';
import { b as assertOfficeInScope } from './scope-_J_qWR4v.js';
import { c as createTransaction } from './transactions-BaYBlP1f.js';
import './shared-server-DaWdgxVh.js';
import './types-Dpk4TN7N.js';
import 'crypto';

const load = async ({ params, locals }) => {
  const { officeId, productId } = params;
  const user = locals.user;
  const db = await getDb();
  const schema = await getSchema();
  const [[office], [product]] = await Promise.all([
    db.select({ id: schema.offices.id, name: schema.offices.name }).from(schema.offices).where(eq(schema.offices.id, officeId)).limit(1),
    db.select({ id: schema.products.id, name: schema.products.name }).from(schema.products).where(and(eq(schema.products.id, productId), eq(schema.products.isActive, true))).limit(1)
  ]);
  if (!office) throw error(404, "Office not found");
  if (!product) throw error(404, "Product not found or inactive");
  await assertOfficeInScope(db, schema, user, officeId);
  return { office, product };
};
const actions = {
  default: async ({ params, request, locals }) => {
    const { officeId, productId } = params;
    const user = locals.user;
    const data = await request.formData();
    const action = data.get("action");
    const qtyRaw = data.get("quantity");
    const notes = data.get("notes");
    if (!action || !qtyRaw) {
      return fail(400, { error: "action and quantity are required" });
    }
    if (action !== "receive" && action !== "remove") {
      return fail(400, { error: 'action must be "receive" or "remove"' });
    }
    const quantity = parseInt(qtyRaw, 10);
    if (!quantity || quantity <= 0) {
      return fail(400, { error: "quantity must be a positive integer" });
    }
    const db = await getDb();
    const schema = await getSchema();
    try {
      const { confirmationId } = await createTransaction(db, schema, user, {
        action,
        officeId,
        performedByUserId: user.id,
        lineItems: [{ productId, quantity }],
        notes: notes || void 0
      });
      return { confirmationId };
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : "Failed to record transaction" });
    }
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions,
  load: load
});

const index = 15;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-QJLL1Ith.js')).default;
const server_id = "src/routes/(app)/scan/[officeId]/[productId]/+page.server.ts";
const imports = ["_app/immutable/nodes/15.CISYxszZ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/uwKY8xQT.js","_app/immutable/chunks/DIeogL5L.js","_app/immutable/chunks/Cm6brbW_.js","_app/immutable/chunks/C4P3zt49.js","_app/immutable/chunks/Peabs2Tj.js","_app/immutable/chunks/DgflIAKz.js","_app/immutable/chunks/DyAjWB2Z.js","_app/immutable/chunks/Pi8bXYsL.js","_app/immutable/chunks/1qvwCiOG.js","_app/immutable/chunks/DAcvOs1t.js","_app/immutable/chunks/CfG_s9zU.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=15-CsV9trYV.js.map
