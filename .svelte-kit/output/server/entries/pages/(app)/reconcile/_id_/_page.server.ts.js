import { fail, error } from "@sveltejs/kit";
import { g as getDb, a as getSchema } from "../../../../../chunks/index2.js";
import { r as reconcileCount, g as getCountDetail } from "../../../../../chunks/reconcile.js";
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
export {
  actions,
  load
};
