import { f as fail } from './index-B2LGyy1l.js';
import { g as getDb, a as getSchema } from './index2-BRX5Berz.js';
import { t as toggleOffice, l as listOffices } from './admin-D6cQCER8.js';
import './shared-server-DaWdgxVh.js';
import 'crypto';
import './types-Dpk4TN7N.js';

const load = async ({ locals }) => {
  const db = await getDb();
  const schema = await getSchema();
  const user = locals.user;
  return { offices: await listOffices(db, schema, user) };
};
const actions = {
  toggleOffice: async ({ request, locals }) => {
    const db = await getDb();
    const schema = await getSchema();
    const user = locals.user;
    const data = await request.formData();
    const officeId = data.get("officeId");
    const isActive = data.get("isActive") === "true";
    try {
      await toggleOffice(db, schema, user, officeId, isActive);
      return { success: true };
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

const index = 5;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-C7hWjiBw.js')).default;
const server_id = "src/routes/(app)/admin/offices/+page.server.ts";
const imports = ["_app/immutable/nodes/5.fcsWUNHZ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/uwKY8xQT.js","_app/immutable/chunks/DIeogL5L.js","_app/immutable/chunks/Cm6brbW_.js","_app/immutable/chunks/C4P3zt49.js","_app/immutable/chunks/Peabs2Tj.js","_app/immutable/chunks/DgflIAKz.js","_app/immutable/chunks/DyAjWB2Z.js","_app/immutable/chunks/Pi8bXYsL.js","_app/immutable/chunks/1qvwCiOG.js","_app/immutable/chunks/DAcvOs1t.js","_app/immutable/chunks/CfG_s9zU.js","_app/immutable/chunks/Dx78MLBa.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=5-BysHLRs0.js.map
