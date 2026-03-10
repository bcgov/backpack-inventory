// @ts-nocheck
import { fail }              from '@sveltejs/kit';
import { asc, eq }           from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { getDb, getSchema }  from '$lib/server/db/index.js';
import { getOfficesForUser } from '$lib/server/services/scope.js';
import { createTransaction } from '$lib/server/services/transactions.js';

export const load = async ({ locals }: Parameters<PageServerLoad>[0]) => {
  const db     = await getDb();
  const schema = await getSchema();
  const user   = locals.user!;

  const [offices, products] = await Promise.all([
    getOfficesForUser(db, schema, user),
    db.select({
      id:         schema.products.id,
      name:       schema.products.name,
      categoryId: schema.products.categoryId,
    })
      .from(schema.products)
      .where(eq(schema.products.isActive, true))
      .orderBy(asc(schema.products.name)),
  ]);

  return { offices, products };
};

export const actions = {
  default: async ({ request, locals }: import('./$types').RequestEvent) => {
    const user = locals.user!;
    const data = await request.formData();

    const officeId  = data.get('officeId')  as string | null;
    const productId = data.get('productId') as string | null;
    const action    = data.get('action')    as string | null;
    const qtyRaw    = data.get('quantity')  as string | null;
    const notes     = data.get('notes')     as string | null;

    if (!officeId || !productId || !action || !qtyRaw) {
      return fail(400, { error: 'officeId, productId, action, and quantity are required' });
    }

    if (action !== 'receive' && action !== 'remove') {
      return fail(400, { error: 'action must be "receive" or "remove"' });
    }

    const quantity = parseInt(qtyRaw, 10);
    if (!quantity || quantity <= 0) {
      return fail(400, { error: 'quantity must be a positive integer' });
    }

    const db     = await getDb();
    const schema = await getSchema();

    try {
      const { confirmationId } = await createTransaction(db, schema, user, {
        action:            action as 'receive' | 'remove',
        officeId,
        performedByUserId: user.id,
        lineItems: [{ productId, quantity }],
        notes:     notes || undefined,
      });
      return { confirmationId };
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : 'Failed to record transaction' });
    }
  },
};
;null as any as Actions;