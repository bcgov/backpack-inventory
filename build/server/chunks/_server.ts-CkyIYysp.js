import { e as error, j as json } from './index-B2LGyy1l.js';
import { g as getDb, a as getSchema } from './index2-BRX5Berz.js';
import { g as getOfficesForUser } from './scope-_J_qWR4v.js';
import './shared-server-DaWdgxVh.js';
import './types-Dpk4TN7N.js';

const GET = async ({ locals }) => {
  if (!locals.user) throw error(401, "Unauthorized");
  const db = await getDb();
  const schema = await getSchema();
  const offices = await getOfficesForUser(db, schema, locals.user);
  return json(offices);
};

export { GET };
//# sourceMappingURL=_server.ts-CkyIYysp.js.map
