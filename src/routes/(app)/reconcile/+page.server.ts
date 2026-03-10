import type { PageServerLoad } from './$types';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { listPendingCounts } from '$lib/server/services/reconcile.js';

export const load: PageServerLoad = async ({ locals }) => {
  const db     = await getDb();
  const schema = await getSchema();
  const counts = await listPendingCounts(db, schema, locals.user!);
  return { counts };
};
