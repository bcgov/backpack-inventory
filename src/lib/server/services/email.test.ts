import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../db/test-db.js';
import { sendEmail } from './email.js';

let ctx: ReturnType<typeof createTestDb>;

beforeEach(() => {
  ctx = createTestDb();
  process.env.EMAIL_TRANSPORT = 'stub';
});

describe('sendEmail', () => {
  it('inserts an outbox row and reports success when using the stub transport', async () => {
    const result = await sendEmail(ctx.db, ctx.schema, {
      to: ['a@example.com', 'b@example.com'],
      subject: 'Hello',
      body: 'Hi there',
      relatedKind: 'order_placed',
      relatedId: 'order-1',
    });
    expect(result.success).toBe(true);
    const rows = ctx.db.select().from(ctx.schema.emailOutbox).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].subject).toBe('Hello');
    expect(JSON.parse(rows[0].recipients)).toEqual(['a@example.com', 'b@example.com']);
    expect(rows[0].success).toBe(true);
    expect(rows[0].relatedKind).toBe('order_placed');
    expect(rows[0].relatedId).toBe('order-1');
  });

  it('returns success: false and writes the error to the outbox when transport throws', async () => {
    process.env.EMAIL_TRANSPORT = 'throwing-stub';  // recognised by sendEmail's stub switch
    const result = await sendEmail(ctx.db, ctx.schema, {
      to: ['x@example.com'],
      subject: 'Boom',
      body: 'will fail',
      relatedKind: 'order_placed',
      relatedId: 'order-2',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    const rows = ctx.db.select().from(ctx.schema.emailOutbox).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].success).toBe(false);
    expect(rows[0].error).toContain('forced stub failure');
  });

  it('does not throw when the transport fails — failures are returned, not raised', async () => {
    process.env.EMAIL_TRANSPORT = 'throwing-stub';
    await expect(sendEmail(ctx.db, ctx.schema, {
      to: ['x@example.com'],
      subject: 's',
      body: 'b',
      relatedKind: 'order_cancelled',
      relatedId: 'o',
    })).resolves.toBeDefined();
  });
});
