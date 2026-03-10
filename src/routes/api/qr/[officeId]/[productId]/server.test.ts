import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
  env: { AUTH_URL: 'https://app.example.com' },
}));

vi.mock('qrcode', () => ({
  default: { toString: vi.fn().mockResolvedValue('<svg>mock-qr</svg>') },
}));

vi.mock('$lib/server/db/index.js', () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'office-1', name: 'Test Office' }]),
        }),
      }),
    }),
  }),
  getSchema: vi.fn().mockResolvedValue({
    offices:  { id: 'id' },
    products: { id: 'id', isActive: 'isActive' },
  }),
}));

import { GET } from './+server.js';
import qrcode from 'qrcode';

describe('GET /api/qr/[officeId]/[productId]', () => {
  it('returns SVG with correct content-type', async () => {
    const response = await GET({
      params: { officeId: 'office-1', productId: 'prod-1' },
    } as never);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image/svg+xml');
    expect(await response.text()).toContain('<svg>');
  });

  it('encodes the full scan URL into the QR code', async () => {
    await GET({ params: { officeId: 'office-1', productId: 'prod-1' } } as never);

    expect(vi.mocked(qrcode.toString)).toHaveBeenCalledWith(
      'https://app.example.com/scan/office-1/prod-1',
      expect.objectContaining({ type: 'svg' }),
    );
  });

  it('returns 404 when office does not exist', async () => {
    const { getDb } = await import('$lib/server/db/index.js');
    vi.mocked(getDb).mockResolvedValueOnce({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),   // office not found
          }),
        }),
      }),
    } as never);

    const response = await GET({
      params: { officeId: 'bad-office', productId: 'prod-1' },
    } as never);

    expect(response.status).toBe(404);
  });
});
