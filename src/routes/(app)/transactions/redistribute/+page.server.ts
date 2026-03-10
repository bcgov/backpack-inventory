import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { getOfficesForUser } from '$lib/server/services/scope.js';
import { getUsersInScope } from '$lib/server/services/users.js';
import { createTransaction } from '$lib/server/services/transactions.js';
import { asc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
  const db = await getDb(); const schema = await getSchema(); const user = locals.user!;
  const [offices, categories, products, onBehalfUsers] = await Promise.all([
    getOfficesForUser(db, schema, user),
    db.select().from(schema.productCategories).orderBy(asc(schema.productCategories.sortOrder)),
    db.select().from(schema.products).where(eq(schema.products.isActive, true)).orderBy(asc(schema.products.name)),
    getUsersInScope(db, schema, user),
  ]);
  // Destination can be any office in scope (same list as source for now)
  return { offices, categories, products, onBehalfUsers, destinationOffices: offices };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const user = locals.user!;
    const data = await request.formData();
    const officeId            = data.get('officeId') as string;
    const destinationOfficeId = data.get('destinationOfficeId') as string;
    const performedByUserId   = (data.get('performedByUserId') as string) || user.id;

    if (officeId === destinationOfficeId) {
      return fail(400, { error: 'Source and destination offices must be different' });
    }

    const productIds = data.getAll('productId') as string[];
    const quantities = data.getAll('quantity') as string[];
    const lineItems = productIds
      .map((productId, i) => ({ productId, quantity: parseInt(quantities[i] ?? '0', 10) }))
      .filter((li) => li.productId && li.quantity > 0);

    const db = await getDb(); const schema = await getSchema();
    try {
      const { confirmationId } = await createTransaction(db, schema, user, {
        action: 'redistribute', officeId, destinationOfficeId, performedByUserId, lineItems,
        notes: (data.get('notes') as string) || undefined,
      });
      return { confirmationId };
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : 'Failed' });
    }
  },
};
