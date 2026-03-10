// @ts-nocheck
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { listCategories, addProduct, toggleProduct } from '$lib/server/services/admin.js';

export const load = async () => {
  const db     = await getDb();
  const schema = await getSchema();
  return { categories: await listCategories(db, schema) };
};

export const actions = {
  addProduct: async ({ request }: import('./$types').RequestEvent) => {
    const db     = await getDb();
    const schema = await getSchema();
    const data   = await request.formData();

    const categoryId = data.get('categoryId') as string;
    const name       = (data.get('name') as string)?.trim();

    if (!name) return fail(400, { addError: 'Product name is required' });
    if (!categoryId) return fail(400, { addError: 'Category is required' });

    try {
      await addProduct(db, schema, { categoryId, name });
      return { addSuccess: true };
    } catch (e) {
      return fail(400, { addError: e instanceof Error ? e.message : 'Failed to add product' });
    }
  },

  toggleProduct: async ({ request }: import('./$types').RequestEvent) => {
    const db     = await getDb();
    const schema = await getSchema();
    const data   = await request.formData();

    const productId = data.get('productId') as string;
    const isActive  = data.get('isActive') === 'true';

    try {
      await toggleProduct(db, schema, productId, isActive);
      return { toggleSuccess: true };
    } catch (e) {
      return fail(400, { toggleError: e instanceof Error ? e.message : 'Failed' });
    }
  },
};
;null as any as PageServerLoad;;null as any as Actions;