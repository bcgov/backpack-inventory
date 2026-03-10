// src/routes/(app)/dashboard/+page.server.ts
import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { getOfficesForUser } from '$lib/server/services/scope.js';
import { getInventoryWithForecast } from '$lib/server/services/forecast.js';
import type { ForecastConfig } from '$lib/types.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  const db     = await getDb();
  const schema = await getSchema();
  const user   = locals.user!;

  const officeId = url.searchParams.get('office') || undefined;

  const config: ForecastConfig = {
    burnRateDays: parseInt(env.BURN_RATE_DAYS  ?? '30', 10),
    greenDays:    parseInt(env.DAYS_GREEN       ?? '30', 10),
    yellowDays:   parseInt(env.DAYS_YELLOW      ?? '14', 10),
  };

  const [inventory, offices] = await Promise.all([
    getInventoryWithForecast(db, schema, user, officeId, config),
    getOfficesForUser(db, schema, user),
  ]);

  // Group by office
  const byOffice = new Map<string, {
    officeId: string; officeName: string; officeNumber: string;
    items: typeof inventory;
  }>();

  for (const row of inventory) {
    if (!byOffice.has(row.officeId)) {
      byOffice.set(row.officeId, {
        officeId:     row.officeId,
        officeName:   row.officeName,
        officeNumber: row.officeNumber,
        items:        [],
      });
    }
    byOffice.get(row.officeId)!.items.push(row);
  }

  return {
    officeGroups:   [...byOffice.values()].sort((a, b) => a.officeNumber.localeCompare(b.officeNumber)),
    offices,
    selectedOffice: officeId ?? '',
    config,
  };
};
