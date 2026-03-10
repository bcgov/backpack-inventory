// @ts-nocheck
// src/routes/(app)/audit-log/+page.server.ts
import type { PageServerLoad } from './$types';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { getAuditLog, type AuditFilters } from '$lib/server/services/audit.js';
import { getOfficesForUser } from '$lib/server/services/scope.js';
import { getUsersInScope } from '$lib/server/services/users.js';
import { INVENTORY_ACTIONS } from '$lib/types.js';

const PAGE_SIZE = 50;

export const load = async ({ locals, url }: Parameters<PageServerLoad>[0]) => {
  const db     = await getDb();
  const schema = await getSchema();
  const user   = locals.user!;

  // Parse filters from URL search params
  const filters: AuditFilters = {
    officeId:          url.searchParams.get('office')      || undefined,
    action:            url.searchParams.get('action')      as AuditFilters['action'] || undefined,
    performedByUserId: url.searchParams.get('user')        || undefined,
    dateFrom:          url.searchParams.get('dateFrom')    || undefined,
    dateTo:            url.searchParams.get('dateTo')      || undefined,
  };
  const page = parseInt(url.searchParams.get('page') ?? '0', 10);

  const [{ rows, total }, offices, users] = await Promise.all([
    getAuditLog(db, schema, user, filters, { page, pageSize: PAGE_SIZE }),
    getOfficesForUser(db, schema, user),
    getUsersInScope(db, schema, user),
  ]);

  return {
    rows,
    total,
    page,
    pageSize: PAGE_SIZE,
    filters,
    offices,
    users,
    actions: INVENTORY_ACTIONS,
  };
};
