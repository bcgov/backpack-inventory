// @ts-nocheck
import { error, fail }          from '@sveltejs/kit';
import { and, eq }              from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { getDb, getSchema }     from '$lib/server/db/index.js';
import { assertOfficeInScope }  from '$lib/server/services/scope.js';
import { createTransaction }    from '$lib/server/services/transactions.js';

export const load = async ({ params, locals }: Parameters<PageServerLoad>[0]) => {
  const { officeId, productId } = params;
  const user = locals.user!;

  const db     = await getDb();
  const schema = await getSchema();

  // Verify office and product exist before doing the scope check, so we
  // return 404 for genuinely unknown IDs rather than a misleading scope error.
  const [[office], [product]] = await Promise.all([
    db.select({ id: schema.offices.id, name: schema.offices.name })
      .from(schema.offices)
      .where(eq(schema.offices.id, officeId))
      .limit(1),
    db.select({ id: schema.products.id, name: schema.products.name })
      .from(schema.products)
      .where(and(eq(schema.products.id, productId), eq(schema.products.isActive, true)))
      .limit(1),
  ]);

  if (!office)  throw error(404, 'Office not found');
  if (!product) throw error(404, 'Product not found or inactive');

  // Scope check — throws if office is not in the user's location scope
  await assertOfficeInScope(db, schema, user, officeId);

  return { office, product };
};

export const actions = {
  default: async ({ params, request, locals }: import('./$types').RequestEvent) => {
    const { officeId, productId } = params;
    const user   = locals.user!;
    const data   = await request.formData();

    const action  = data.get('action')   as string | null;
    const qtyRaw  = data.get('quantity') as string | null;
    const notes   = data.get('notes')    as string | null;

    if (!action || !qtyRaw) {
      return fail(400, { error: 'action and quantity are required' });
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
        lineItems:         [{ productId, quantity }],
        notes:             notes || undefined,
      });
      return { confirmationId };
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : 'Failed to record transaction' });
    }
  },
};
;null as any as Actions;