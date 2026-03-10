import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { a as ROLE_SCOPE_MAP } from "./types.js";
async function listUsers(db, schema, adminUser) {
  const scope = ROLE_SCOPE_MAP[adminUser.role];
  const base = db.select({
    id: schema.users.id,
    name: schema.users.name,
    email: schema.users.email,
    role: schema.users.role,
    teamId: schema.users.teamId,
    regionId: schema.users.regionId,
    isActive: schema.users.isActive
  }).from(schema.users);
  if (scope === "all") return base.orderBy(schema.users.name);
  if (scope === "region") {
    return base.where(eq(schema.users.regionId, adminUser.regionId)).orderBy(schema.users.name);
  }
  return base.where(eq(schema.users.teamId, adminUser.teamId)).orderBy(schema.users.name);
}
async function updateUser(db, schema, adminUser, targetId, input) {
  if (targetId === adminUser.id) {
    throw new Error("You cannot edit your own account via the admin panel");
  }
  await db.update(schema.users).set({
    role: input.role,
    teamId: input.teamId,
    regionId: input.regionId,
    isActive: input.isActive,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }).where(eq(schema.users.id, targetId)).run();
}
async function listCategories(db, schema) {
  const cats = await db.select().from(schema.productCategories).orderBy(schema.productCategories.sortOrder);
  const products = await db.select({
    id: schema.products.id,
    name: schema.products.name,
    slug: schema.products.slug,
    isOther: schema.products.isOther,
    isActive: schema.products.isActive,
    categoryId: schema.products.categoryId
  }).from(schema.products).orderBy(schema.products.name);
  return cats.map((cat) => ({
    ...cat,
    products: products.filter((p) => p.categoryId === cat.id)
  }));
}
async function addProduct(db, schema, input) {
  const id = randomUUID();
  const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.insert(schema.products).values({
    id,
    categoryId: input.categoryId,
    name: input.name,
    slug,
    isOther: false,
    isActive: true,
    createdAt: now
  }).run();
  return id;
}
async function toggleProduct(db, schema, productId, isActive) {
  await db.update(schema.products).set({ isActive }).where(eq(schema.products.id, productId)).run();
}
async function listOffices(db, schema, adminUser) {
  const scope = ROLE_SCOPE_MAP[adminUser.role];
  let rows;
  if (scope === "all") {
    rows = await db.select({
      id: schema.offices.id,
      officeNumber: schema.offices.officeNumber,
      name: schema.offices.name,
      officeType: schema.offices.officeType,
      isActive: schema.offices.isActive,
      teamName: schema.teams.name,
      regionName: schema.regions.name
    }).from(schema.offices).innerJoin(schema.teams, eq(schema.offices.teamId, schema.teams.id)).innerJoin(schema.regions, eq(schema.teams.regionId, schema.regions.id)).orderBy(schema.offices.officeNumber);
  } else if (scope === "region") {
    rows = await db.select({
      id: schema.offices.id,
      officeNumber: schema.offices.officeNumber,
      name: schema.offices.name,
      officeType: schema.offices.officeType,
      isActive: schema.offices.isActive,
      teamName: schema.teams.name,
      regionName: schema.regions.name
    }).from(schema.offices).innerJoin(schema.teams, eq(schema.offices.teamId, schema.teams.id)).innerJoin(schema.regions, eq(schema.teams.regionId, schema.regions.id)).where(eq(schema.teams.regionId, adminUser.regionId)).orderBy(schema.offices.officeNumber);
  } else {
    rows = await db.select({
      id: schema.offices.id,
      officeNumber: schema.offices.officeNumber,
      name: schema.offices.name,
      officeType: schema.offices.officeType,
      isActive: schema.offices.isActive,
      teamName: schema.teams.name,
      regionName: schema.regions.name
    }).from(schema.offices).innerJoin(schema.teams, eq(schema.offices.teamId, schema.teams.id)).innerJoin(schema.regions, eq(schema.teams.regionId, schema.regions.id)).where(eq(schema.offices.teamId, adminUser.teamId)).orderBy(schema.offices.officeNumber);
  }
  return rows;
}
async function toggleOffice(db, schema, adminUser, officeId, isActive) {
  const offices = await listOffices(db, schema, adminUser);
  if (!offices.find((o) => o.id === officeId)) {
    throw new Error(`Office ${officeId} is not in your scope`);
  }
  await db.update(schema.offices).set({ isActive }).where(eq(schema.offices.id, officeId)).run();
}
export {
  toggleProduct as a,
  addProduct as b,
  listCategories as c,
  listUsers as d,
  listOffices as l,
  toggleOffice as t,
  updateUser as u
};
