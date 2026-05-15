import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { PageServerLoad, Actions } from './$types';
import { clearDatabase, seedTestData } from '$lib/server/services/db-admin.js';

export const load: PageServerLoad = async () => {
  const driver = env.DB_DRIVER ?? 'sqlite';
  return { driver, supported: driver === 'sqlite' };
};

export const actions: Actions = {
  seed: async () => {
    try {
      await seedTestData();
      return { success: true, action: 'seed' as const };
    } catch (e) {
      return fail(500, { error: e instanceof Error ? e.message : 'Seed failed' });
    }
  },

  clear: async () => {
    try {
      const result = await clearDatabase();
      return {
        success: true,
        action: 'clear' as const,
        archivedAs: result.archivedAs,
      };
    } catch (e) {
      return fail(500, { error: e instanceof Error ? e.message : 'Clear failed' });
    }
  },
};
