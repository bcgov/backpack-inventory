import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { getCurrentInventory } from '$lib/server/services/inventory.js';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) throw error(401, 'Unauthorized');
  const officeId = url.searchParams.get('office') ?? undefined;
  const db     = await getDb();
  const schema = await getSchema();
  const rows = await getCurrentInventory(db, schema, locals.user, officeId);
  return json(rows);
};
