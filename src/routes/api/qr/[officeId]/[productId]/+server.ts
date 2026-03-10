import qrcode                 from 'qrcode';
import { and, eq }            from 'drizzle-orm';
import { env }                from '$env/dynamic/private';
import { getDb, getSchema }   from '$lib/server/db/index.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const { officeId, productId } = params;

  const db     = await getDb();
  const schema = await getSchema();

  // Verify both the office and product exist
  const [office] = await db
    .select({ id: schema.offices.id })
    .from(schema.offices)
    .where(eq(schema.offices.id, officeId))
    .limit(1);

  if (!office) return new Response('Office not found', { status: 404 });

  const [product] = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(and(eq(schema.products.id, productId), eq(schema.products.isActive, true)))
    .limit(1);

  if (!product) return new Response('Product not found', { status: 404 });

  const baseUrl  = (env.AUTH_URL ?? '').replace(/\/$/, '');
  const scanUrl  = `${baseUrl}/scan/${officeId}/${productId}`;

  const svg = await qrcode.toString(scanUrl, {
    type:                 'svg',
    errorCorrectionLevel: 'M',
    margin:               1,
  });

  return new Response(svg, {
    headers: {
      'content-type':  'image/svg+xml',
      'cache-control': 'public, max-age=86400',
    },
  });
};
