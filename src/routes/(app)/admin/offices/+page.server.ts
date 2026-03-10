import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { listOffices, toggleOffice } from '$lib/server/services/admin.js';

export const load: PageServerLoad = async ({ locals }) => {
  const db     = await getDb();
  const schema = await getSchema();
  const user   = locals.user!;
  return { offices: await listOffices(db, schema, user) };
};

export const actions: Actions = {
  toggleOffice: async ({ request, locals }) => {
    const db     = await getDb();
    const schema = await getSchema();
    const user   = locals.user!;
    const data   = await request.formData();

    const officeId = data.get('officeId') as string;
    const isActive = data.get('isActive') === 'true';

    try {
      await toggleOffice(db, schema, user, officeId, isActive);
      return { success: true };
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : 'Failed' });
    }
  },
};
