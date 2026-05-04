import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { getOfficesForUser } from '$lib/server/services/scope.js';
import { getInventoryWithForecast } from '$lib/server/services/forecast.js';
import { createOrder } from '$lib/server/services/orders.js';
import type { ForecastConfig } from '$lib/types.js';

const FORECAST_CONFIG: ForecastConfig = { burnRateDays: 30, greenDays: 30, yellowDays: 14 };

export const load: PageServerLoad = async ({ locals, url }) => {
  const db = await getDb(); const schema = await getSchema(); const user = locals.user!;
  const offices = await getOfficesForUser(db, schema, user);
  const officeId = url.searchParams.get('office') ?? offices[0]?.id;
  const forecastRows = officeId
    ? await getInventoryWithForecast(db, schema, user, officeId, FORECAST_CONFIG)
    : [];
  return { offices, selectedOffice: officeId ?? null, forecastRows };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const db = await getDb(); const schema = await getSchema(); const user = locals.user!;
    const data = await request.formData();
    const officeId = data.get('officeId') as string;
    const notes = (data.get('notes') as string) || undefined;

    // line-item parsing — entries with qty>0 only
    const lineItems: Array<{ productId?: string; isOther?: boolean; otherDescription?: string; quantityOrdered: number }> = [];
    for (const [k, v] of data.entries()) {
      if (k.startsWith('qty:') && Number(v) > 0) {
        const productId = k.slice('qty:'.length);
        lineItems.push({ productId, quantityOrdered: Number(v) });
      }
      if (k.startsWith('otherDesc:')) {
        const idx = k.slice('otherDesc:'.length);
        const qty = Number(data.get(`otherQty:${idx}`) ?? 0);
        const desc = String(v).trim();
        if (qty > 0 && desc) {
          lineItems.push({ isOther: true, otherDescription: desc, quantityOrdered: qty });
        }
      }
    }

    try {
      const result = await createOrder(db, schema, user, { officeId, notes, lineItems });
      throw redirect(303, `/orders/${result.confirmationId}${result.emailSucceeded ? '' : '?emailFailed=1'}`);
    } catch (e) {
      if (e instanceof Response) throw e;  // redirect
      return fail(400, { error: e instanceof Error ? e.message : 'Failed' });
    }
  },
};
