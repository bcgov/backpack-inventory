import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { asc, eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized');
  const db     = await getDb();
  const schema = await getSchema();

  const categories = await db
    .select()
    .from(schema.productCategories)
    .orderBy(asc(schema.productCategories.sortOrder));

  const products = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.isActive, true))
    .orderBy(asc(schema.products.name));

  return json({ categories, products });
};
