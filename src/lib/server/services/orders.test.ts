import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestDb, seedTestOffice, seedTestProduct, seedTestUser,
} from '../db/test-db.js';
import { createOrder, listOrders, getOrder, cancelOrder, receiveOrderBatch } from './orders.js';
import type { SessionUser } from '$lib/types.js';

let ctx: ReturnType<typeof createTestDb>;
let supervisor: SessionUser;
let supervisorId: string;

beforeEach(() => {
  ctx = createTestDb();
  seedTestOffice(ctx.db);
  seedTestProduct(ctx.db);
  supervisorId = seedTestUser(ctx.db, { role: 'supervisor', teamId: 'team-test', regionId: 'region-test' });
  supervisor = { id: supervisorId, name: 'Sup', email: 's@x', role: 'supervisor', teamId: 'team-test', regionId: 'region-test' };
  ctx.db.insert(ctx.schema.emailTemplates).values([
    { id: 'tpl-1', key: 'order_placed',    subject: 'Order {orderId}', body: 'For {officeName}: {itemList}' },
    { id: 'tpl-2', key: 'order_cancelled', subject: 'Cancelled {orderId}', body: '{itemsRemaining}' },
  ]).run();
  ctx.db.insert(ctx.schema.officeEmailRecipients).values({
    id: crypto.randomUUID(),
    officeId: 'office-test',
    email: 'recipient@example.com',
  }).run();
  process.env.EMAIL_TRANSPORT = 'stub';
});

describe('createOrder', () => {
  it('creates an order, line items, and writes an outbox row', async () => {
    const { confirmationId } = await createOrder(ctx.db, ctx.schema, supervisor, {
      officeId: 'office-test',
      lineItems: [{ productId: 'prod-test', quantityOrdered: 10 }],
    });
    expect(confirmationId).toMatch(/^[A-F0-9]{8}$/);

    const orders = ctx.db.select().from(ctx.schema.orders).all();
    expect(orders).toHaveLength(1);
    expect(orders[0].status).toBe('pending');

    const lines = ctx.db.select().from(ctx.schema.orderLineItems).all();
    expect(lines).toHaveLength(1);
    expect(lines[0].quantityOrdered).toBe(10);
    expect(lines[0].quantityReceived).toBe(0);

    const outbox = ctx.db.select().from(ctx.schema.emailOutbox).all();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].relatedKind).toBe('order_placed');
  });

  it('rejects users without create_order', async () => {
    const ci: SessionUser = { ...supervisor, role: 'ci_specialist' };
    await expect(createOrder(ctx.db, ctx.schema, ci, {
      officeId: 'office-test',
      lineItems: [{ productId: 'prod-test', quantityOrdered: 1 }],
    })).rejects.toThrow(/permission/i);
  });

  it('rejects orders with no positive line items', async () => {
    await expect(createOrder(ctx.db, ctx.schema, supervisor, {
      officeId: 'office-test',
      lineItems: [],
    })).rejects.toThrow();
  });

  it('rejects offices outside scope', async () => {
    await expect(createOrder(ctx.db, ctx.schema, supervisor, {
      officeId: 'office-other',
      lineItems: [{ productId: 'prod-test', quantityOrdered: 1 }],
    })).rejects.toThrow();
  });

  it('supports isOther line items with otherDescription', async () => {
    await createOrder(ctx.db, ctx.schema, supervisor, {
      officeId: 'office-test',
      lineItems: [{ isOther: true, otherDescription: 'Special hat', quantityOrdered: 3 }],
    });
    const lines = ctx.db.select().from(ctx.schema.orderLineItems).all();
    expect(lines[0].isOther).toBe(true);
    expect(lines[0].otherDescription).toBe('Special hat');
    expect(lines[0].productId).toBeNull();
  });
});

describe('listOrders', () => {
  it('returns orders in scope, optionally filtered by status', async () => {
    await createOrder(ctx.db, ctx.schema, supervisor, {
      officeId: 'office-test',
      lineItems: [{ productId: 'prod-test', quantityOrdered: 1 }],
    });
    const all = await listOrders(ctx.db, ctx.schema, supervisor, {});
    expect(all).toHaveLength(1);
    const pending = await listOrders(ctx.db, ctx.schema, supervisor, { status: 'pending' });
    expect(pending).toHaveLength(1);
    const received = await listOrders(ctx.db, ctx.schema, supervisor, { status: 'received' });
    expect(received).toHaveLength(0);
  });
});

describe('getOrder', () => {
  it('returns the order with line items', async () => {
    const { confirmationId } = await createOrder(ctx.db, ctx.schema, supervisor, {
      officeId: 'office-test',
      lineItems: [{ productId: 'prod-test', quantityOrdered: 4 }],
    });
    const detail = await getOrder(ctx.db, ctx.schema, supervisor, confirmationId);
    expect(detail.order.confirmationId).toBe(confirmationId);
    expect(detail.lineItems).toHaveLength(1);
    expect(detail.lineItems[0].productName).toBe('Test Product');
  });

  it('rejects orders for offices out of scope', async () => {
    // Seed an out-of-scope office (different team/region than supervisor)
    seedTestOffice(ctx.db, {
      regionId: 'region-other',
      teamId: 'team-other',
      officeId: 'office-other',
    });
    // Insert an order directly for the non-scope office
    await ctx.db.insert(ctx.schema.orders).values({
      id: 'o-out', confirmationId: 'OUTSIDE1', officeId: 'office-other',
      status: 'pending', createdByUserId: supervisorId, createdAt: new Date().toISOString(),
    }).run();
    await expect(getOrder(ctx.db, ctx.schema, supervisor, 'OUTSIDE1')).rejects.toThrow();
  });
});

describe('cancelOrder', () => {
  it('transitions pending → cancelled and writes the cancellation message', async () => {
    const { orderId } = await createOrder(ctx.db, ctx.schema, supervisor, {
      officeId: 'office-test',
      lineItems: [{ productId: 'prod-test', quantityOrdered: 5 }],
    });
    await cancelOrder(ctx.db, ctx.schema, supervisor, orderId, 'Custom message body');
    const [o] = ctx.db.select().from(ctx.schema.orders).all();
    expect(o.status).toBe('cancelled');
    expect(o.cancellationMessage).toBe('Custom message body');
    expect(o.cancelledByUserId).toBe(supervisor.id);
  });

  it('rejects users without cancel_order', async () => {
    const { orderId } = await createOrder(ctx.db, ctx.schema, supervisor, {
      officeId: 'office-test',
      lineItems: [{ productId: 'prod-test', quantityOrdered: 1 }],
    });
    const ci: SessionUser = { ...supervisor, role: 'ci_specialist' };
    await expect(cancelOrder(ctx.db, ctx.schema, ci, orderId, 'msg')).rejects.toThrow(/permission/i);
  });

  it('blocks cancelling an already-received order', async () => {
    const { orderId } = await createOrder(ctx.db, ctx.schema, supervisor, {
      officeId: 'office-test',
      lineItems: [{ productId: 'prod-test', quantityOrdered: 1 }],
    });
    ctx.db.update(ctx.schema.orders).set({ status: 'received' }).run();
    await expect(cancelOrder(ctx.db, ctx.schema, supervisor, orderId, 'msg')).rejects.toThrow(/cannot.*cancel/i);
  });
});

describe('receiveOrderBatch', () => {
  it('creates a receive transaction and transitions to partial', async () => {
    const { orderId } = await createOrder(ctx.db, ctx.schema, supervisor, {
      officeId: 'office-test',
      lineItems: [{ productId: 'prod-test', quantityOrdered: 10 }],
    });
    const [line] = ctx.db.select().from(ctx.schema.orderLineItems).all();
    const result = await receiveOrderBatch(ctx.db, ctx.schema, supervisor, orderId, {
      lines: [{ orderLineItemId: line.id, quantityReceived: 4 }],
    });
    expect(result.newStatus).toBe('partial');
    const [o] = ctx.db.select().from(ctx.schema.orders).all();
    expect(o.status).toBe('partial');
    const [updated] = ctx.db.select().from(ctx.schema.orderLineItems).all();
    expect(updated.quantityReceived).toBe(4);
    // Transaction was created
    const txns = ctx.db.select().from(ctx.schema.transactions).all();
    expect(txns).toHaveLength(1);
    expect(txns[0].action).toBe('receive');
    // Receive event recorded
    const events = ctx.db.select().from(ctx.schema.orderReceiveEvents).all();
    expect(events).toHaveLength(1);
    expect(events[0].transactionId).toBe(result.transactionId);
  });

  it('transitions to received when fully fulfilled', async () => {
    const { orderId } = await createOrder(ctx.db, ctx.schema, supervisor, {
      officeId: 'office-test',
      lineItems: [{ productId: 'prod-test', quantityOrdered: 5 }],
    });
    const [line] = ctx.db.select().from(ctx.schema.orderLineItems).all();
    const r = await receiveOrderBatch(ctx.db, ctx.schema, supervisor, orderId, {
      lines: [{ orderLineItemId: line.id, quantityReceived: 5 }],
    });
    expect(r.newStatus).toBe('received');
  });

  it('allows a second batch on a partial order to close it out', async () => {
    const { orderId } = await createOrder(ctx.db, ctx.schema, supervisor, {
      officeId: 'office-test',
      lineItems: [{ productId: 'prod-test', quantityOrdered: 10 }],
    });
    const [line] = ctx.db.select().from(ctx.schema.orderLineItems).all();
    await receiveOrderBatch(ctx.db, ctx.schema, supervisor, orderId, {
      lines: [{ orderLineItemId: line.id, quantityReceived: 4 }],
    });
    const r = await receiveOrderBatch(ctx.db, ctx.schema, supervisor, orderId, {
      lines: [{ orderLineItemId: line.id, quantityReceived: 6 }],
    });
    expect(r.newStatus).toBe('received');
  });

  it('rejects users without receive_order', async () => {
    const { orderId } = await createOrder(ctx.db, ctx.schema, supervisor, {
      officeId: 'office-test',
      lineItems: [{ productId: 'prod-test', quantityOrdered: 1 }],
    });
    const [line] = ctx.db.select().from(ctx.schema.orderLineItems).all();
    const directorOnly: SessionUser = { ...supervisor, role: 'director_3p', teamId: null, regionId: null };
    await expect(receiveOrderBatch(ctx.db, ctx.schema, directorOnly, orderId, {
      lines: [{ orderLineItemId: line.id, quantityReceived: 1 }],
    })).rejects.toThrow(/permission/i);
  });

  it('skips lines with quantityReceived = 0 and does not create empty transactions', async () => {
    const { orderId } = await createOrder(ctx.db, ctx.schema, supervisor, {
      officeId: 'office-test',
      lineItems: [
        { productId: 'prod-test', quantityOrdered: 5 },
      ],
    });
    const [line] = ctx.db.select().from(ctx.schema.orderLineItems).all();
    await expect(receiveOrderBatch(ctx.db, ctx.schema, supervisor, orderId, {
      lines: [{ orderLineItemId: line.id, quantityReceived: 0 }],
    })).rejects.toThrow(/at least one/i);
  });
});
