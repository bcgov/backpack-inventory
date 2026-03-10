import { describe, it, expect, vi, beforeEach } from 'vitest';

const OFFICE_ID   = 'office-1';
const PRODUCT_ID  = 'prod-1';
const USER_ID     = 'user-1';

const mockUser = {
  id: USER_ID, name: 'Test', email: 't@t.com',
  role: 'ci_specialist' as const,
  teamId: 'team-1', regionId: null,
};

vi.mock('$lib/server/db/index.js', () => ({
  getDb:     vi.fn(),
  getSchema: vi.fn(),
}));

vi.mock('$lib/server/services/scope.js', () => ({
  assertOfficeInScope: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('$lib/server/services/transactions.js', () => ({
  createTransaction: vi.fn().mockResolvedValue({
    confirmationId: 'ABCD1234',
    transactionId:  'tx-1',
  }),
}));

import { load, actions }       from './+page.server.js';
import { assertOfficeInScope } from '$lib/server/services/scope.js';
import { createTransaction }   from '$lib/server/services/transactions.js';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(assertOfficeInScope).mockResolvedValue(undefined);
  vi.mocked(createTransaction).mockResolvedValue({ confirmationId: 'ABCD1234', transactionId: 'tx-1' });
});

describe('scan page — load', () => {
  it('returns office and product for valid params', async () => {
    const { getDb, getSchema } = await import('$lib/server/db/index.js');
    vi.mocked(getDb).mockResolvedValue({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: OFFICE_ID, name: 'Test Office' }]),
          }),
        }),
      }),
    } as never);
    vi.mocked(getSchema).mockResolvedValue({ offices: {}, products: {} } as never);

    const result = await load({
      params: { officeId: OFFICE_ID, productId: PRODUCT_ID },
      locals: { user: mockUser },
    } as never);

    expect(result.office.id).toBe(OFFICE_ID);
    expect(result.product).toBeDefined();
  });

  it('checks office is in scope', async () => {
    const { getDb, getSchema } = await import('$lib/server/db/index.js');
    vi.mocked(getDb).mockResolvedValue({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: OFFICE_ID, name: 'Test Office' }]),
          }),
        }),
      }),
    } as never);
    vi.mocked(getSchema).mockResolvedValue({ offices: {}, products: {} } as never);

    await load({
      params: { officeId: OFFICE_ID, productId: PRODUCT_ID },
      locals: { user: mockUser },
    } as never);

    expect(assertOfficeInScope).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), mockUser, OFFICE_ID,
    );
  });
});

describe('scan page — action', () => {
  it('calls createTransaction with route param office and product', async () => {
    const { getDb, getSchema } = await import('$lib/server/db/index.js');
    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(getSchema).mockResolvedValue({} as never);

    const formData = new FormData();
    formData.set('action',   'remove');
    formData.set('quantity', '3');

    const result = await actions.default({
      params:  { officeId: OFFICE_ID, productId: PRODUCT_ID },
      request: { formData: () => Promise.resolve(formData) },
      locals:  { user: mockUser },
    } as never);

    expect(createTransaction).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), mockUser,
      expect.objectContaining({
        action:    'remove',
        officeId:  OFFICE_ID,
        lineItems: [{ productId: PRODUCT_ID, quantity: 3 }],
      }),
    );
    expect(result).toMatchObject({ confirmationId: 'ABCD1234' });
  });

  it('returns fail(400) for missing quantity', async () => {
    const formData = new FormData();
    formData.set('action', 'remove');
    // no quantity

    const result = await actions.default({
      params:  { officeId: OFFICE_ID, productId: PRODUCT_ID },
      request: { formData: () => Promise.resolve(formData) },
      locals:  { user: mockUser },
    } as never);

    expect((result as { status: number }).status).toBe(400);
  });
});
