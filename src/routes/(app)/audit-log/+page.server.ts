// src/routes/(app)/audit-log/+page.server.ts
import type { PageServerLoad } from './$types';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { getAuditLog, AUDIT_SORT_FIELDS, type AuditFilters, type AuditSortField, type AuditSort } from '$lib/server/services/audit.js';
import { getOfficesForUser } from '$lib/server/services/scope.js';
import { getUsersInScope } from '$lib/server/services/users.js';
import { INVENTORY_ACTIONS } from '$lib/types.js';
import { parseSortParam } from '$lib/utils/sort.js';

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ locals, url }) => {
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

  const parsed = parseSortParam(url);
  const sort: AuditSort | undefined =
    parsed && AUDIT_SORT_FIELDS.has(parsed.field as AuditSortField)
      ? { field: parsed.field as AuditSortField, dir: parsed.dir }
      : undefined;

  const [{ rows, total }, offices, users] = await Promise.all([
    getAuditLog(db, schema, user, filters, { page, pageSize: PAGE_SIZE }, sort),
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
    sort: sort ?? null,
  };
};
