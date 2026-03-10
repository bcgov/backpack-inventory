import { a as ROLE_SCOPE_MAP } from './types-Dpk4TN7N.js';
import { e as eq, i as inArray } from './index2-BRX5Berz.js';

async function getUsersInScope(db, schema, user) {
  const scope = ROLE_SCOPE_MAP[user.role];
  if (scope === "all") {
    return db.select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      teamId: schema.users.teamId
    }).from(schema.users).where(eq(schema.users.isActive, true)).orderBy(schema.users.name);
  }
  if (scope === "region" && user.regionId) {
    const teams = await db.select({ id: schema.teams.id }).from(schema.teams).where(eq(schema.teams.regionId, user.regionId));
    const teamIds = teams.map((t) => t.id);
    if (!teamIds.length) return [];
    return db.select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      teamId: schema.users.teamId
    }).from(schema.users).where(inArray(schema.users.teamId, teamIds)).orderBy(schema.users.name);
  }
  if (!user.teamId) return [];
  return db.select({
    id: schema.users.id,
    name: schema.users.name,
    email: schema.users.email,
    role: schema.users.role,
    teamId: schema.users.teamId
  }).from(schema.users).where(eq(schema.users.teamId, user.teamId)).orderBy(schema.users.name);
}

export { getUsersInScope as g };
//# sourceMappingURL=users-DN0KG5mI.js.map
