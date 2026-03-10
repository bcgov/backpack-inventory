import { f as fail, e as error } from './index-B2LGyy1l.js';
import { g as getDb, a as getSchema } from './index2-BRX5Berz.js';
import { r as reconcileCount, g as getCountDetail } from './reconcile-OnyS4z3j.js';
import './shared-server-DaWdgxVh.js';
import 'crypto';
import './types-Dpk4TN7N.js';
import './scope-_J_qWR4v.js';

const load = async ({ locals, params }) => {
  const db = await getDb();
  const schema = await getSchema();
  const detail = await getCountDetail(db, schema, locals.user, params.id);
  if (!detail) throw error(404, "Inventory count not found");
  return { detail };
};
const actions = {
  default: async ({ request, locals, params }) => {
    const user = locals.user;
    const data = await request.formData();
    const action = data.get("decision");
    const reasonCode = data.get("reasonCode") || void 0;
    const notes = data.get("notes") || void 0;
    if (action !== "accept" && action !== "reject") {
      return fail(400, { error: "Invalid decision" });
    }
    const db = await getDb();
    const schema = await getSchema();
    try {
      await reconcileCount(db, schema, user, params.id, { action, reasonCode, notes });
      return { success: true, decision: action };
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : "Failed to reconcile" });
    }
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions,
  load: load
});

const index = 13;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-DK_XH1Xz.js')).default;
const server_id = "src/routes/(app)/reconcile/[id]/+page.server.ts";
const imports = ["_app/immutable/nodes/13.BdLKlJyZ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/uwKY8xQT.js","_app/immutable/chunks/DIeogL5L.js","_app/immutable/chunks/Cm6brbW_.js","_app/immutable/chunks/C4P3zt49.js","_app/immutable/chunks/Peabs2Tj.js","_app/immutable/chunks/DgflIAKz.js","_app/immutable/chunks/DyAjWB2Z.js","_app/immutable/chunks/Pi8bXYsL.js","_app/immutable/chunks/1qvwCiOG.js","_app/immutable/chunks/DAcvOs1t.js","_app/immutable/chunks/Dx78MLBa.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=13-DmICmBkq.js.map
