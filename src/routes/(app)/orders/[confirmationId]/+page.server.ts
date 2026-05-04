import { error, fail } from '@sveltejs/kit';
import { writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import type { PageServerLoad, Actions } from './$types';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { getOrder, receiveOrderBatch } from '$lib/server/services/orders.js';

export const load: PageServerLoad = async ({ locals, params }) => {
  const db = await getDb(); const schema = await getSchema(); const user = locals.user!;
  try {
    const detail = await getOrder(db, schema, user, params.confirmationId);
    return { detail };
  } catch (e) {
    throw error(404, e instanceof Error ? e.message : 'Order not found');
  }
};

export const actions: Actions = {
  receive: async ({ request, locals, params }) => {
    const db = await getDb(); const schema = await getSchema(); const user = locals.user!;
    // Look up the order by confirmationId to get orderId
    const detail = await getOrder(db, schema, user, params.confirmationId);
    const data = await request.formData();
    const lines: Array<{ orderLineItemId: string; quantityReceived: number }> = [];
    for (const [k, v] of data.entries()) {
      if (k.startsWith('rcv:')) {
        const id = k.slice('rcv:'.length);
        const n = Number(v);
        if (n > 0) lines.push({ orderLineItemId: id, quantityReceived: n });
      }
    }
    const notes = (data.get('notes') as string) || undefined;
    let shippingReceiptPath: string | undefined;
    const file = data.get('shippingReceipt');
    if (file instanceof File && file.size > 0) {
      const filename = `${randomUUID()}-${file.name}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(`uploads/receipts/${filename}`, buffer);
      shippingReceiptPath = `receipts/${filename}`;
    }
    try {
      await receiveOrderBatch(db, schema, user, detail.order.id, { lines, notes, shippingReceiptPath });
      return { success: true };
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : 'Failed' });
    }
  },
};
