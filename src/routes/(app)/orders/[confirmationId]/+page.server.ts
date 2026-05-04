import { error, fail } from '@sveltejs/kit';
import { writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { join } from 'node:path';
import { env } from '$env/dynamic/private';
import type { PageServerLoad, Actions } from './$types';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { getOrder, receiveOrderBatch, cancelOrder } from '$lib/server/services/orders.js';
import { getTemplate, renderTemplate } from '$lib/server/services/orderTemplates.js';

export const load: PageServerLoad = async ({ locals, params }) => {
  const db = await getDb(); const schema = await getSchema(); const user = locals.user!;
  try {
    const detail = await getOrder(db, schema, user, params.confirmationId);
    const cancelTpl = await getTemplate(db, schema, 'order_cancelled');
    const cancellationDraft = renderTemplate(cancelTpl, {
      orderId: detail.order.confirmationId,
      officeNumber: detail.order.officeNumber,
      officeName: detail.order.officeName,
      itemsAlreadyReceived: detail.lineItems
        .filter((l) => l.quantityReceived > 0)
        .map((l) => `  - ${l.productName ?? l.otherDescription} × ${l.quantityReceived}`)
        .join('\n') || '  (none)',
      itemsRemaining: detail.lineItems
        .filter((l) => l.remaining > 0)
        .map((l) => `  - ${l.productName ?? l.otherDescription} × ${l.remaining}`)
        .join('\n') || '  (none)',
      cancelledBy: user.name,
    }).body;
    return { detail, cancellationDraft };
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
      const filename   = `${randomUUID()}-${file.name}`;
      const buffer     = Buffer.from(await file.arrayBuffer());
      const uploadsDir = env.UPLOADS_DIR ?? 'uploads';
      await writeFile(join(uploadsDir, 'receipts', filename), buffer);
      shippingReceiptPath = `receipts/${filename}`;
    }
    try {
      await receiveOrderBatch(db, schema, user, detail.order.id, { lines, notes, shippingReceiptPath });
      return { success: true };
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : 'Failed' });
    }
  },
  cancel: async ({ request, locals, params }) => {
    const db = await getDb(); const schema = await getSchema(); const user = locals.user!;
    const detail = await getOrder(db, schema, user, params.confirmationId);
    const message = String((await request.formData()).get('message') ?? '').trim();
    if (!message) return fail(400, { error: 'Cancellation message is required' });
    try {
      await cancelOrder(db, schema, user, detail.order.id, message);
      return { success: true };
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : 'Failed' });
    }
  },
};
