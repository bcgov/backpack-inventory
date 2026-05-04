import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { getTemplate, setTemplate } from '$lib/server/services/orderTemplates.js';

export const load: PageServerLoad = async ({ locals }) => {
  const db = await getDb(); const schema = await getSchema(); const user = locals.user!;
  return {
    placed:    await getTemplate(db, schema, 'order_placed'),
    cancelled: await getTemplate(db, schema, 'order_cancelled'),
  };
};

export const actions: Actions = {
  save: async ({ request, locals }) => {
    const db = await getDb(); const schema = await getSchema(); const user = locals.user!;
    const data = await request.formData();
    const key = data.get('key') as 'order_placed' | 'order_cancelled';
    const subject = (data.get('subject') as string ?? '').trim();
    const body    = (data.get('body')    as string ?? '').trim();
    if (!subject || !body) return fail(400, { error: 'Subject and body are required' });
    try {
      await setTemplate(db, schema, user, key, { subject, body });
      return { success: true, key };
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : 'Failed' });
    }
  },
};
