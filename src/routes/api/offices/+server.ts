import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { getOfficesForUser } from '$lib/server/services/scope.js';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized');
  const db     = await getDb();
  const schema = await getSchema();
  const offices = await getOfficesForUser(db, schema, locals.user);
  return json(offices);
};
