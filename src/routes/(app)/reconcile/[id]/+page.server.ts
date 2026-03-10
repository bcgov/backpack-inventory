import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { getCountDetail, reconcileCount } from '$lib/server/services/reconcile.js';

export const load: PageServerLoad = async ({ locals, params }) => {
  const db     = await getDb();
  const schema = await getSchema();
  const detail = await getCountDetail(db, schema, locals.user!, params.id);

  if (!detail) throw error(404, 'Inventory count not found');
  return { detail };
};

export const actions: Actions = {
  default: async ({ request, locals, params }) => {
    const user = locals.user!;
    const data = await request.formData();

    const action     = data.get('decision') as 'accept' | 'reject';
    const reasonCode = (data.get('reasonCode') as string) || undefined;
    const notes      = (data.get('notes') as string) || undefined;

    if (action !== 'accept' && action !== 'reject') {
      return fail(400, { error: 'Invalid decision' });
    }

    const db     = await getDb();
    const schema = await getSchema();

    try {
      await reconcileCount(db, schema, user, params.id, { action, reasonCode, notes });
      return { success: true, decision: action };
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : 'Failed to reconcile' });
    }
  },
};
