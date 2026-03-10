import { g as getDb, a as getSchema } from './index2-BRX5Berz.js';
import { l as listPendingCounts } from './reconcile-OnyS4z3j.js';
import './shared-server-DaWdgxVh.js';
import 'crypto';
import './types-Dpk4TN7N.js';
import './scope-_J_qWR4v.js';

const load = async ({ locals }) => {
  const db = await getDb();
  const schema = await getSchema();
  const counts = await listPendingCounts(db, schema, locals.user);
  return { counts };
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 12;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-Db0B0Fc9.js')).default;
const server_id = "src/routes/(app)/reconcile/+page.server.ts";
const imports = ["_app/immutable/nodes/12.Csd5cS-q.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/uwKY8xQT.js","_app/immutable/chunks/DIeogL5L.js","_app/immutable/chunks/Cm6brbW_.js","_app/immutable/chunks/C4P3zt49.js","_app/immutable/chunks/Peabs2Tj.js","_app/immutable/chunks/DgflIAKz.js","_app/immutable/chunks/CfG_s9zU.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=12-BiPpPIZh.js.map
