import { f as fail } from './index-B2LGyy1l.js';
import { g as getDb, a as getSchema } from './index2-BRX5Berz.js';
import { u as updateUser, d as listUsers } from './admin-D6cQCER8.js';
import { U as USER_ROLES, a as ROLE_SCOPE_MAP } from './types-Dpk4TN7N.js';
import './shared-server-DaWdgxVh.js';
import 'crypto';

const load = async ({ locals }) => {
  const db = await getDb();
  const schema = await getSchema();
  const user = locals.user;
  const [users, teams, regions] = await Promise.all([
    listUsers(db, schema, user),
    db.select({ id: schema.teams.id, name: schema.teams.name }).from(schema.teams).orderBy(schema.teams.name),
    db.select({ id: schema.regions.id, name: schema.regions.name }).from(schema.regions).orderBy(schema.regions.name)
  ]);
  return { users, teams, regions, roles: USER_ROLES, roleScopeMap: ROLE_SCOPE_MAP };
};
const actions = {
  updateUser: async ({ request, locals }) => {
    const db = await getDb();
    const schema = await getSchema();
    const admin = locals.user;
    const data = await request.formData();
    const targetId = data.get("userId");
    const role = data.get("role");
    const teamId = data.get("teamId") || null;
    const regionId = data.get("regionId") || null;
    const isActive = data.get("isActive") === "true";
    if (!USER_ROLES.includes(role)) {
      return fail(400, { error: "Invalid role" });
    }
    try {
      await updateUser(db, schema, admin, targetId, {
        role,
        teamId,
        regionId,
        isActive
      });
      return { success: true };
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : "Update failed" });
    }
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions,
  load: load
});

const index = 8;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-C7FEIgme.js')).default;
const server_id = "src/routes/(app)/admin/users/+page.server.ts";
const imports = ["_app/immutable/nodes/8.WZgSRTcG.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/uwKY8xQT.js","_app/immutable/chunks/DIeogL5L.js","_app/immutable/chunks/Cm6brbW_.js","_app/immutable/chunks/C4P3zt49.js","_app/immutable/chunks/Peabs2Tj.js","_app/immutable/chunks/DgflIAKz.js","_app/immutable/chunks/DyAjWB2Z.js","_app/immutable/chunks/Pi8bXYsL.js","_app/immutable/chunks/1qvwCiOG.js","_app/immutable/chunks/DAcvOs1t.js","_app/immutable/chunks/CfG_s9zU.js","_app/immutable/chunks/Dx78MLBa.js","_app/immutable/chunks/hE7HE9bc.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=8-C_MRfBWL.js.map
