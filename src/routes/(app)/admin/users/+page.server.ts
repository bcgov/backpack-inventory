import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { listUsers, updateUser } from '$lib/server/services/admin.js';
import { USER_ROLES, ROLE_SCOPE_MAP } from '$lib/types.js';

export const load: PageServerLoad = async ({ locals }) => {
  const db     = await getDb();
  const schema = await getSchema();
  const user   = locals.user!;

  const [users, teams, regions] = await Promise.all([
    listUsers(db, schema, user),
    db.select({ id: schema.teams.id, name: schema.teams.name }).from(schema.teams).orderBy(schema.teams.name),
    db.select({ id: schema.regions.id, name: schema.regions.name }).from(schema.regions).orderBy(schema.regions.name),
  ]);

  return { users, teams, regions, roles: USER_ROLES, roleScopeMap: ROLE_SCOPE_MAP };
};

export const actions: Actions = {
  updateUser: async ({ request, locals }) => {
    const db     = await getDb();
    const schema = await getSchema();
    const admin  = locals.user!;
    const data   = await request.formData();

    const targetId = data.get('userId') as string;
    const role     = data.get('role') as string;
    const teamId   = data.get('teamId') as string | null || null;
    const regionId = data.get('regionId') as string | null || null;
    const isActive = data.get('isActive') === 'true';

    if (!USER_ROLES.includes(role as typeof USER_ROLES[number])) {
      return fail(400, { error: 'Invalid role' });
    }

    try {
      await updateUser(db, schema, admin, targetId, {
        role: role as typeof USER_ROLES[number],
        teamId,
        regionId,
        isActive,
      });
      return { success: true };
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : 'Update failed' });
    }
  },
};
