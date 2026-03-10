// @ts-nocheck
import { fail } from '@sveltejs/kit';
import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { PageServerLoad, Actions } from './$types';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { getOfficesForUser } from '$lib/server/services/scope.js';
import { getUsersInScope } from '$lib/server/services/users.js';
import { createTransaction } from '$lib/server/services/transactions.js';
import { asc, eq } from 'drizzle-orm';

export const load = async ({ locals }: Parameters<PageServerLoad>[0]) => {
  const db     = await getDb();
  const schema = await getSchema();
  const user   = locals.user!;

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

    const officeId          = data.get('officeId') as string;
    const performedByInput  = data.get('performedByUserId') as string;
    const performedByUserId = performedByInput || user.id;
    const notes             = data.get('notes') as string | null;
    const productIds        = data.getAll('productId') as string[];
    const quantities        = data.getAll('quantity') as string[];
    const otherDescs        = data.getAll('otherDescription') as string[];

    const lineItems = productIds
      .map((productId, i) => ({
        productId,
        quantity:         parseInt(quantities[i] ?? '0', 10),
        otherDescription: otherDescs[i] || undefined,
      }))
      .filter((li) => li.productId && li.quantity > 0);

    // Handle optional shipping receipt upload
    let shippingReceiptPath: string | undefined;
    const receiptFile = data.get('shippingReceipt');
    if (receiptFile instanceof File && receiptFile.size > 0) {
      const ext      = extname(receiptFile.name) || '.bin';
      const filename = `${randomUUID()}${ext}`;
      const buffer   = Buffer.from(await receiptFile.arrayBuffer());
      await writeFile(`uploads/receipts/${filename}`, buffer);
      shippingReceiptPath = `receipts/${filename}`;
    }

    const db     = await getDb();
    const schema = await getSchema();

    try {
      const { confirmationId } = await createTransaction(db, schema, user, {
        action: 'receive',
        officeId,
        performedByUserId,
        lineItems,
        notes: notes || undefined,
        shippingReceiptPath,
      });
      return { confirmationId };
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : 'Failed to record transaction' });
    }
  },
};
;null as any as Actions;