// @ts-nocheck
// src/routes/(app)/reports/+page.server.ts
import type { PageServerLoad } from './$types';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { getTransactionHistory, getUsageByStaff, type HistoryFilters } from '$lib/server/services/reports.js';
import { getOfficesForUser } from '$lib/server/services/scope.js';

export const load = async ({ locals, url }: Parameters<PageServerLoad>[0]) => {
  const db     = await getDb();
  const schema = await getSchema();
  const user   = locals.user!;

  const filters: HistoryFilters = {
    officeId:  url.searchParams.get('office')   || undefined,
    dateFrom:  url.searchParams.get('dateFrom') || undefined,
    dateTo:    url.searchParams.get('dateTo')   || undefined,
  };

  const [history, staffUsage, offices] = await Promise.all([
    getTransactionHistory(db, schema, user, filters),
    getUsageByStaff(db, schema, user),
    getOfficesForUser(db, schema, user),
  ]);

  return { history, staffUsage, offices, filters };
};
