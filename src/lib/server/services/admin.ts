import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { ROLE_SCOPE_MAP } from '$lib/types.js';
import type { SessionUser, UserRole } from '$lib/types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySchema = any;

// ─── Users ────────────────────────────────────────────────────────────────────

export interface AdminUserRow {
  id:       string;
  name:     string;
  email:    string;
  role:     string;
  teamId:   string | null;
  regionId: string | null;
  isActive: boolean;
}

/** List all users visible to `adminUser` (scope-filtered). */
export async function listUsers(
  db:        AnyDB,
  schema:    AnySchema,
  adminUser: SessionUser,
): Promise<AdminUserRow[]> {
  const scope = ROLE_SCOPE_MAP[adminUser.role];

  const base = db.select({
    id:       schema.users.id,
    name:     schema.users.name,
    email:    schema.users.email,
    role:     schema.users.role,
    teamId:   schema.users.teamId,
    regionId: schema.users.regionId,
    isActive: schema.users.isActive,
  }).from(schema.users);

  if (scope === 'all') return base.orderBy(schema.users.name);

  if (scope === 'region') {
    return base
      .where(eq(schema.users.regionId, adminUser.regionId!))
      .orderBy(schema.users.name);
  }

  // team scope
  return base
    .where(eq(schema.users.teamId, adminUser.teamId!))
    .orderBy(schema.users.name);
}

export interface UpdateUserInput {
  role:     UserRole;
  teamId:   string | null;
  regionId: string | null;
  isActive: boolean;
}

/** Update a user's role/scope/active status. */
export async function updateUser(
  db:        AnyDB,
  schema:    AnySchema,
  adminUser: SessionUser,
  targetId:  string,
  input:     UpdateUserInput,
): Promise<void> {
  // Prevent self-demotion / deactivation
  if (targetId === adminUser.id) {
    throw new Error('You cannot edit your own account via the admin panel');
  }
  await db
    .update(schema.users)
    .set({
      role:      input.role,
      teamId:    input.teamId,
      regionId:  input.regionId,
      isActive:  input.isActive,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.users.id, targetId))
    .run();
}

// ─── Products ─────────────────────────────────────────────────────────────────

export interface ProductRow {
  id:       string;
  name:     string;
  slug:     string;
  isOther:  boolean;
  isActive: boolean;
}

export interface CategoryWithProducts {
  id:        string;
  name:      string;
  sortOrder: number;
  products:  ProductRow[];
}

/** List all categories with their products (all statuses). */
export async function listCategories(
  db:     AnyDB,
  schema: AnySchema,
): Promise<CategoryWithProducts[]> {
  const cats = await db
    .select()
    .from(schema.productCategories)
    .orderBy(schema.productCategories.sortOrder);

  const products = await db
    .select({
      id:         schema.products.id,
      name:       schema.products.name,
      slug:       schema.products.slug,
      isOther:    schema.products.isOther,
      isActive:   schema.products.isActive,
      categoryId: schema.products.categoryId,
    })
    .from(schema.products)
    .orderBy(schema.products.name);

  return cats.map((cat: { id: string; name: string; sortOrder: number }) => ({
    ...cat,
    products: products.filter((p: { categoryId: string }) => p.categoryId === cat.id),
  }));
}

/** Add a new product to a category. */
export async function addProduct(
  db:     AnyDB,
  schema: AnySchema,
  input:  { categoryId: string; name: string },
): Promise<string> {
  const id   = randomUUID();
  const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const now  = new Date().toISOString();
  db.insert(schema.products).values({
    id, categoryId: input.categoryId, name: input.name, slug,
    isOther: false, isActive: true, createdAt: now,
  }).run();
  return id;
}

/** Toggle a product's active status. */
export async function toggleProduct(
  db:        AnyDB,
  schema:    AnySchema,
  productId: string,
  isActive:  boolean,
): Promise<void> {
  await db
    .update(schema.products)
    .set({ isActive })
    .where(eq(schema.products.id, productId))
    .run();
}

// ─── Offices ──────────────────────────────────────────────────────────────────

export interface AdminOfficeRow {
  id:           string;
  officeNumber: string;
  name:         string;
  officeType:   string | null;
  isActive:     boolean;
  teamName:     string;
  regionName:   string;
}

/** List offices in the admin user's scope (all statuses). */
export async function listOffices(
  db:        AnyDB,
  schema:    AnySchema,
  adminUser: SessionUser,
): Promise<AdminOfficeRow[]> {
  const scope = ROLE_SCOPE_MAP[adminUser.role];

  let rows: AdminOfficeRow[];

  if (scope === 'all') {
    rows = await db
      .select({
        id:           schema.offices.id,
        officeNumber: schema.offices.officeNumber,
        name:         schema.offices.name,
        officeType:   schema.offices.officeType,
        isActive:     schema.offices.isActive,
        teamName:     schema.teams.name,
        regionName:   schema.regions.name,
      })
      .from(schema.offices)
      .leftJoin(schema.teams,   eq(schema.offices.teamId,   schema.teams.id))
      .leftJoin(schema.regions, eq(schema.teams.regionId,   schema.regions.id))
      .orderBy(schema.offices.officeNumber);
  } else if (scope === 'region') {
    rows = await db
      .select({
        id:           schema.offices.id,
        officeNumber: schema.offices.officeNumber,
        name:         schema.offices.name,
        officeType:   schema.offices.officeType,
        isActive:     schema.offices.isActive,
        teamName:     schema.teams.name,
        regionName:   schema.regions.name,
      })
      .from(schema.offices)
      .leftJoin(schema.teams,   eq(schema.offices.teamId,   schema.teams.id))
      .leftJoin(schema.regions, eq(schema.teams.regionId,   schema.regions.id))
      .where(eq(schema.teams.regionId, adminUser.regionId!))
      .orderBy(schema.offices.officeNumber);
  } else {
    rows = await db
      .select({
        id:           schema.offices.id,
        officeNumber: schema.offices.officeNumber,
        name:         schema.offices.name,
        officeType:   schema.offices.officeType,
        isActive:     schema.offices.isActive,
        teamName:     schema.teams.name,
        regionName:   schema.regions.name,
      })
      .from(schema.offices)
      .leftJoin(schema.teams,   eq(schema.offices.teamId,   schema.teams.id))
      .leftJoin(schema.regions, eq(schema.teams.regionId,   schema.regions.id))
      .where(eq(schema.offices.teamId, adminUser.teamId!))
      .orderBy(schema.offices.officeNumber);
  }

  return rows.map((r) => ({
    ...r,
    teamName:   r.teamName   ?? '(unknown team)',
    regionName: r.regionName ?? '(unknown region)',
  }));
}

/** Toggle an office's active status. */
export async function toggleOffice(
  db:        AnyDB,
  schema:    AnySchema,
  adminUser: SessionUser,
  officeId:  string,
  isActive:  boolean,
): Promise<void> {
  // Verify the office is in scope before modifying it
  const offices = await listOffices(db, schema, adminUser);
  if (!offices.find((o) => o.id === officeId)) {
    throw new Error(`Office ${officeId} is not in your scope`);
  }
  await db
    .update(schema.offices)
    .set({ isActive })
    .where(eq(schema.offices.id, officeId))
    .run();
}
