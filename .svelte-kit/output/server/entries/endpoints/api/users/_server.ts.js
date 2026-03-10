import { error, json } from "@sveltejs/kit";
import { g as getDb, a as getSchema } from "../../../../chunks/index2.js";
import { g as getUsersInScope } from "../../../../chunks/users.js";
import { R as ROLE_PERMISSIONS } from "../../../../chunks/types.js";
const GET = async ({ locals }) => {
  if (!locals.user) throw error(401, "Unauthorized");
  if (!ROLE_PERMISSIONS[locals.user.role].has("record_on_behalf")) {
    return json([]);
  }
  const db = await getDb();
  const schema = await getSchema();
  const users = await getUsersInScope(db, schema, locals.user);
  return json(users);
};
export {
  GET
};
