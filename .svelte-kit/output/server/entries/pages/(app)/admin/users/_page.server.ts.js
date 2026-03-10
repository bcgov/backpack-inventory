import { fail } from "@sveltejs/kit";
import { g as getDb, a as getSchema } from "../../../../../chunks/index2.js";
import { u as updateUser, d as listUsers } from "../../../../../chunks/admin.js";
import { U as USER_ROLES, a as ROLE_SCOPE_MAP } from "../../../../../chunks/types.js";
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
export {
  actions,
  load
};
