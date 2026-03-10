import { g as getDb, a as getSchema } from "../../../../chunks/index2.js";
import { l as listPendingCounts } from "../../../../chunks/reconcile.js";
const load = async ({ locals }) => {
  const db = await getDb();
  const schema = await getSchema();
  const counts = await listPendingCounts(db, schema, locals.user);
  return { counts };
};
export {
  load
};
