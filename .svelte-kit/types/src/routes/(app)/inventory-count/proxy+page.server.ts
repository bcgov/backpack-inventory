// @ts-nocheck
// src/routes/(app)/inventory-count/+page.server.ts
import { fail } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { getOfficesForUser } from '$lib/server/services/scope.js';
import { createTransaction } from '$lib/server/services/transactions.js';

export const load = async ({ locals }: Parameters<PageServerLoad>[0]) => {
  const db     = await getDb();
  const schema = await getSchema();
  const user   = locals.user!;

  const [offices, categories, products] = await Promise.all([
    getOfficesForUser(db, schema, user),
    db.select().from(schema.productCategories).orderBy(asc(schema.productCategories.sortOrder)),
    db.select().from(schema.products)
      .where(eq(schema.products.isActive, true))
      .orderBy(asc(schema.products.name)),
  ]);

  return { offices, categories, products };
};

export const actions = {
  default: async ({ request, locals }: import('./$types').RequestEvent) => {
    const user = locals.user!;
    const data = await request.formData();

    const officeId = data.get('officeId') as string;
    if (!officeId) return fail(400, { error: 'Office is required' });

    // Products are submitted as qty_{productId} = quantity.
    // Skip blank entries (not counted); include 0s (explicitly counted as zero).
    const lineItems: Array<{ productId: string; quantity: number }> = [];
    for (const [key, value] of data.entries()) {
      if (key.startsWith('qty_') && value !== '') {
        const productId = key.slice(4);
        const quantity  = parseInt(value as string, 10);
        if (!isNaN(quantity) && quantity >= 0) {
          lineItems.push({ productId, quantity });
        }
      }
    }

    if (!lineItems.length) {
      return fail(400, { error: 'Enter at least one product quantity to record a count' });
    }

    const db     = await getDb();
    const schema = await getSchema();

    try {
      const { confirmationId } = await createTransaction(db, schema, user, {
        action:            'inventory_count',
        officeId,
        performedByUserId: user.id,
        lineItems,
        notes: (data.get('notes') as string) || undefined,
      });
      return { confirmationId };
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : 'Failed to record count' });
    }
  },
};
;null as any as Actions;