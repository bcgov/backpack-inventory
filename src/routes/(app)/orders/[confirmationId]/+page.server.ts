import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { getOrder } from '$lib/server/services/orders.js';

export const load: PageServerLoad = async ({ locals, params }) => {
  const db = await getDb(); const schema = await getSchema(); const user = locals.user!;
  try {
    const detail = await getOrder(db, schema, user, params.confirmationId);
    return { detail };
  } catch (e) {
    throw error(404, e instanceof Error ? e.message : 'Order not found');
  }
};
