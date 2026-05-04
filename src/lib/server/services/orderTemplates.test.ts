import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../db/test-db.js';
import { getTemplate, setTemplate, renderTemplate } from './orderTemplates.js';
import type { SessionUser } from '$lib/types.js';

let ctx: ReturnType<typeof createTestDb>;
const supervisor: SessionUser = { id: 'u', name: 'S', email: 's@x', role: 'supervisor', teamId: 't', regionId: null };

beforeEach(() => {
  ctx = createTestDb();
  ctx.db.insert(ctx.schema.emailTemplates).values({
    id: 'tpl-1', key: 'order_placed',
    subject: 'Hi {officeName}', body: 'Order {orderId} created by {createdBy}',
  }).run();
});

describe('getTemplate', () => {
  it('returns the stored subject + body for a key', async () => {
    const t = await getTemplate(ctx.db, ctx.schema, 'order_placed');
    expect(t.subject).toBe('Hi {officeName}');
    expect(t.body).toContain('{orderId}');
  });

  it('throws for unknown keys', async () => {
    // @ts-expect-error - intentionally invalid key
    await expect(getTemplate(ctx.db, ctx.schema, 'bogus')).rejects.toThrow();
  });
});

describe('setTemplate', () => {
  it('upserts subject + body for an existing key', async () => {
    await setTemplate(ctx.db, ctx.schema, supervisor, 'order_placed', { subject: 'New', body: 'Body' });
    const t = await getTemplate(ctx.db, ctx.schema, 'order_placed');
    expect(t.subject).toBe('New');
    expect(t.body).toBe('Body');
  });

  it('rejects users without manage_email_settings', async () => {
    const ci: SessionUser = { ...supervisor, role: 'ci_specialist' };
    await expect(
      setTemplate(ctx.db, ctx.schema, ci, 'order_placed', { subject: 'x', body: 'y' }),
    ).rejects.toThrow(/permission/i);
  });
});

describe('renderTemplate', () => {
  it('substitutes all known placeholders', () => {
    const out = renderTemplate(
      { subject: 'Hi {officeName}', body: 'Order {orderId} by {createdBy}' },
      { officeName: 'Test', orderId: 'ABC123', createdBy: 'Alice' },
    );
    expect(out.subject).toBe('Hi Test');
    expect(out.body).toBe('Order ABC123 by Alice');
  });

  it('leaves unknown placeholders intact', () => {
    const out = renderTemplate({ subject: 'a', body: 'Hello {nope}' }, {});
    expect(out.body).toBe('Hello {nope}');
  });

  it('replaces all occurrences of the same placeholder', () => {
    const out = renderTemplate({ subject: '', body: '{x}-{x}-{x}' }, { x: 'y' });
    expect(out.body).toBe('y-y-y');
  });
});
