// src/lib/server/services/scope.ts
import { eq, inArray, and } from 'drizzle-orm';
import { ROLE_SCOPE_MAP } from '$lib/types.js';
import type { SessionUser } from '$lib/types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySchema = any;

export async function getOfficeIdsForUser(
  db:     AnyDB,
  schema: AnySchema,
  user:   SessionUser,
): Promise<string[]> {
  const scope = ROLE_SCOPE_MAP[user.role];

  if (scope === 'all') {
    const rows = await db
      .select({ id: schema.offices.id })
      .from(schema.offices)
      .where(eq(schema.offices.isActive, true));
    return rows.map((r: { id: string }) => r.id);
  }

  if (scope === 'region') {
    if (!user.regionId) return [];
    const offices = await db
      .select({ id: schema.offices.id })
      .from(schema.offices)
      .where(and(
        eq(schema.offices.regionId, user.regionId),
        eq(schema.offices.isActive, true),
      ));
    return offices.map((o: { id: string }) => o.id);
  }

  // team scope (ci_specialist, supervisor, assistant_supervisor)
  if (!user.teamId) return [];
  const offices = await db
    .select({ id: schema.offices.id })
    .from(schema.offices)
    .where(eq(schema.offices.teamId, user.teamId));
  return offices.map((o: { id: string }) => o.id);
}

export async function getOfficesForUser(
  db:     AnyDB,
  schema: AnySchema,
  user:   SessionUser,
) {
  const ids = await getOfficeIdsForUser(db, schema, user);
  if (!ids.length) return [];
  return db
    .select({
      id:           schema.offices.id,
      officeNumber: schema.offices.officeNumber,
      name:         schema.offices.name,
      officeType:   schema.offices.officeType,
      teamId:       schema.offices.teamId,
    })
    .from(schema.offices)
    .where(inArray(schema.offices.id, ids))
    .orderBy(schema.offices.officeNumber);
}

/** Throws a 400-like error if the officeId is not in the user's scope. */
export async function assertOfficeInScope(
  db:       AnyDB,
  schema:   AnySchema,
  user:     SessionUser,
  officeId: string,
): Promise<void> {
  const ids = await getOfficeIdsForUser(db, schema, user);
  if (!ids.includes(officeId)) {
    throw new Error(`Office ${officeId} is not in your scope`);
  }
}
