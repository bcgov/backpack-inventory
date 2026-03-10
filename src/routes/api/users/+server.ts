import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { getUsersInScope } from '$lib/server/services/users.js';
import { ROLE_PERMISSIONS } from '$lib/types.js';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized');
  if (!ROLE_PERMISSIONS[locals.user.role].has('record_on_behalf')) {
    return json([]);
  }
  const db     = await getDb();
  const schema = await getSchema();
  const users = await getUsersInScope(db, schema, locals.user);
  return json(users);
};
