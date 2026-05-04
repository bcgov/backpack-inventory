import type { PageServerLoad } from './$types';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { listOrders } from '$lib/server/services/orders.js';
import { getOfficesForUser } from '$lib/server/services/scope.js';
import type { OrderStatus } from '$lib/types.js';

const VALID: ReadonlySet<OrderStatus> = new Set(['pending', 'partial', 'received', 'cancelled']);

export const load: PageServerLoad = async ({ locals, url }) => {
  const db = await getDb(); const schema = await getSchema(); const user = locals.user!;
  const statusParam = url.searchParams.get('status') as OrderStatus | null;
  const officeId    = url.searchParams.get('office') ?? undefined;
  const status: OrderStatus | undefined =
    statusParam && VALID.has(statusParam) ? statusParam : undefined;
  const orders  = await listOrders(db, schema, user, { status, officeId });
  const offices = await getOfficesForUser(db, schema, user);
  return { orders, offices, filters: { status: status ?? null, officeId: officeId ?? null } };
};
