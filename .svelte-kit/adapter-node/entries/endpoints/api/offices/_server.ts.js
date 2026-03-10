import { error, json } from "@sveltejs/kit";
import { g as getDb, a as getSchema } from "../../../../chunks/index2.js";
import { a as getOfficesForUser } from "../../../../chunks/scope.js";
const GET = async ({ locals }) => {
  if (!locals.user) throw error(401, "Unauthorized");
  const db = await getDb();
  const schema = await getSchema();
  const offices = await getOfficesForUser(db, schema, locals.user);
  return json(offices);
};
export {
  GET
};
