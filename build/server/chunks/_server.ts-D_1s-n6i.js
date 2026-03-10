import { e as error, j as json } from './index-B2LGyy1l.js';
import { g as getDb, a as getSchema } from './index2-BRX5Berz.js';
import { g as getUsersInScope } from './users-DN0KG5mI.js';
import { R as ROLE_PERMISSIONS } from './types-Dpk4TN7N.js';
import './shared-server-DaWdgxVh.js';

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

export { GET };
//# sourceMappingURL=_server.ts-D_1s-n6i.js.map
