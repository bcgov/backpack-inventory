import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { createTransaction } from '$lib/server/services/transactions.js';
import type { TransactionInput } from '$lib/server/services/transactions.js';

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) throw error(401, 'Unauthorized');

  let body: TransactionInput;
  try {
    body = await request.json();
  } catch {
    throw error(400, 'Invalid JSON body');
  }

  const db     = await getDb();
  const schema = await getSchema();

  try {
    const result = await createTransaction(db, schema, locals.user, body);
    return json(result, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    throw error(400, msg);
  }
};
