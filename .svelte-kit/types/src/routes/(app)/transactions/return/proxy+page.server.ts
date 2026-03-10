// @ts-nocheck
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { getOfficesForUser } from '$lib/server/services/scope.js';
import { getUsersInScope } from '$lib/server/services/users.js';
import { createTransaction } from '$lib/server/services/transactions.js';
import { asc, eq } from 'drizzle-orm';

export const load = async ({ locals }: Parameters<PageServerLoad>[0]) => {
  const db = await getDb(); const schema = await getSchema(); const user = locals.user!;
  const [offices, categories, products, onBehalfUsers] = await Promise.all([
    getOfficesForUser(db, schema, user),
    db.select().from(schema.productCategories).orderBy(asc(schema.productCategories.sortOrder)),
    db.select().from(schema.products).where(eq(schema.products.isActive, true)).orderBy(asc(schema.products.name)),
    getUsersInScope(db, schema, user),
  ]);
  return { offices, categories, products, onBehalfUsers };
};

export const actions = {
  default: async ({ request, locals }: import('./$types').RequestEvent) => {
    const user = locals.user!;
    const data = await request.formData();
    const officeId = data.get('officeId') as string;
    const performedByUserId = (data.get('performedByUserId') as string) || user.id;
    const productIds  = data.getAll('productId') as string[];
    const quantities  = data.getAll('quantity') as string[];
    const otherDescs  = data.getAll('otherDescription') as string[];
    const lineItems = productIds
      .map((productId, i) => ({ productId, quantity: parseInt(quantities[i] ?? '0', 10), otherDescription: otherDescs[i] || undefined }))
      .filter((li) => li.productId && li.quantity > 0);

    const db = await getDb(); const schema = await getSchema();
    try {
      const { confirmationId } = await createTransaction(db, schema, user, {
        action: 'return', officeId, performedByUserId, lineItems,
        notes: (data.get('notes') as string) || undefined,
      });
      return { confirmationId };
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : 'Failed' });
    }
  },
};
;null as any as Actions;