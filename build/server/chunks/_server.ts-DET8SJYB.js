import qrcode from 'qrcode';
import { b as private_env } from './shared-server-DaWdgxVh.js';
import { g as getDb, a as getSchema, e as eq, c as and } from './index2-BRX5Berz.js';

const GET = async ({ params }) => {
  const { officeId, productId } = params;
  const db = await getDb();
  const schema = await getSchema();
  const [office] = await db.select({ id: schema.offices.id }).from(schema.offices).where(eq(schema.offices.id, officeId)).limit(1);
  if (!office) return new Response("Office not found", { status: 404 });
  const [product] = await db.select({ id: schema.products.id }).from(schema.products).where(and(eq(schema.products.id, productId), eq(schema.products.isActive, true))).limit(1);
  if (!product) return new Response("Product not found", { status: 404 });
  const baseUrl = (private_env.AUTH_URL ?? "").replace(/\/$/, "");
  const scanUrl = `${baseUrl}/scan/${officeId}/${productId}`;
  const svg = await qrcode.toString(scanUrl, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1
  });
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=86400"
    }
  });
};

export { GET };
//# sourceMappingURL=_server.ts-DET8SJYB.js.map
