import { fail } from "@sveltejs/kit";
import { g as getDb, a as getSchema } from "../../../../../chunks/index2.js";
import { t as toggleOffice, l as listOffices } from "../../../../../chunks/admin.js";
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
export {
  actions,
  load
};
