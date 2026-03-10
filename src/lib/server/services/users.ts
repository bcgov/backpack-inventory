// src/lib/server/services/users.ts
import { eq, inArray } from 'drizzle-orm';
import { ROLE_SCOPE_MAP } from '$lib/types.js';
import type { SessionUser } from '$lib/types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = any; type AnySchema = any;

/**
 * Returns active users within the logged-in user's location scope.
 * Used to populate the "record on behalf of" dropdown.
 */
export async function getUsersInScope(
  db:     AnyDB,
  schema: AnySchema,
  user:   SessionUser,
) {
  const scope = ROLE_SCOPE_MAP[user.role];

  if (scope === 'all') {
    return db
      .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email,
                role: schema.users.role, teamId: schema.users.teamId })
      .from(schema.users)
      .where(eq(schema.users.isActive, true))
      .orderBy(schema.users.name);
  }

  if (scope === 'region' && user.regionId) {
    const teams = await db
      .select({ id: schema.teams.id })
      .from(schema.teams)
      .where(eq(schema.teams.regionId, user.regionId));
    const teamIds = teams.map((t: { id: string }) => t.id);
    if (!teamIds.length) return [];
    return db
      .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email,
                role: schema.users.role, teamId: schema.users.teamId })
      .from(schema.users)
      .where(inArray(schema.users.teamId, teamIds))
      .orderBy(schema.users.name);
  }

  // team scope
  if (!user.teamId) return [];
  return db
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email,
              role: schema.users.role, teamId: schema.users.teamId })
    .from(schema.users)
    .where(eq(schema.users.teamId, user.teamId))
    .orderBy(schema.users.name);
}
