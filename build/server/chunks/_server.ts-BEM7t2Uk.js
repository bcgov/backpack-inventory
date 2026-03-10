import { e as error, j as json } from './index-B2LGyy1l.js';
import { g as getDb, a as getSchema } from './index2-BRX5Berz.js';
import { c as createTransaction } from './transactions-BaYBlP1f.js';
import './shared-server-DaWdgxVh.js';
import 'crypto';
import './types-Dpk4TN7N.js';
import './scope-_J_qWR4v.js';

const POST = async ({ locals, request }) => {
  if (!locals.user) throw error(401, "Unauthorized");
  let body;
  try {
    body = await request.json();
  } catch {
    throw error(400, "Invalid JSON body");
  }
  const db = await getDb();
  const schema = await getSchema();
  try {
    const result = await createTransaction(db, schema, locals.user, body);
    return json(result, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    throw error(400, msg);
  }
};

export { POST };
//# sourceMappingURL=_server.ts-BEM7t2Uk.js.map
