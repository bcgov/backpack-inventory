import { a as ROLE_SCOPE_MAP } from './types-Dpk4TN7N.js';
import { i as inArray, e as eq } from './index2-BRX5Berz.js';

async function getOfficeIdsForUser(db, schema, user) {
  const scope = ROLE_SCOPE_MAP[user.role];
  if (scope === "all") {
    const rows = await db.select({ id: schema.offices.id }).from(schema.offices).where(eq(schema.offices.isActive, true));
    return rows.map((r) => r.id);
  }
  if (scope === "region") {
    if (!user.regionId) return [];
    const teams = await db.select({ id: schema.teams.id }).from(schema.teams).where(eq(schema.teams.regionId, user.regionId));
    const teamIds = teams.map((t) => t.id);
    if (!teamIds.length) return [];
    const offices2 = await db.select({ id: schema.offices.id }).from(schema.offices).where(inArray(schema.offices.teamId, teamIds));
    return offices2.map((o) => o.id);
  }
  if (!user.teamId) return [];
  const offices = await db.select({ id: schema.offices.id }).from(schema.offices).where(eq(schema.offices.teamId, user.teamId));
  return offices.map((o) => o.id);
}
async function getOfficesForUser(db, schema, user) {
  const ids = await getOfficeIdsForUser(db, schema, user);
  if (!ids.length) return [];
  return db.select({
    id: schema.offices.id,
    officeNumber: schema.offices.officeNumber,
    name: schema.offices.name,
    officeType: schema.offices.officeType,
    teamId: schema.offices.teamId
  }).from(schema.offices).where(inArray(schema.offices.id, ids)).orderBy(schema.offices.officeNumber);
}
async function assertOfficeInScope(db, schema, user, officeId) {
  const ids = await getOfficeIdsForUser(db, schema, user);
  if (!ids.includes(officeId)) {
    throw new Error(`Office ${officeId} is not in your scope`);
  }
}

export { getOfficeIdsForUser as a, assertOfficeInScope as b, getOfficesForUser as g };
//# sourceMappingURL=scope-_J_qWR4v.js.map
