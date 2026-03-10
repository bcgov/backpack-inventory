import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, seedTestOffice, seedTestProduct, seedTestUser } from '../db/test-db.js';
import {
  listUsers, updateUser,
  listCategories, addProduct, toggleProduct,
  listOffices, toggleOffice,
} from './admin.js';
import type { SessionUser } from '../../types.js';

let ctx: ReturnType<typeof createTestDb>;
let managerUser: SessionUser;

beforeEach(() => {
  ctx = createTestDb();
  seedTestOffice(ctx.db);
  seedTestProduct(ctx.db);
  const id = seedTestUser(ctx.db, { role: 'manager', regionId: 'region-test', teamId: null });
  managerUser = { id, name: 'Manager', email: 'm@m.com', role: 'manager', teamId: null, regionId: 'region-test' };
});

describe('listUsers', () => {
  it('returns users in the manager scope (region)', async () => {
    const rows = await listUsers(ctx.db, ctx.schema, managerUser);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toMatchObject({ role: expect.any(String), name: expect.any(String) });
  });
});

describe('updateUser', () => {
  it('updates a user role', async () => {
    const targetId = seedTestUser(ctx.db, { role: 'ci_specialist', teamId: 'team-test', regionId: 'region-test' });
    await updateUser(ctx.db, ctx.schema, managerUser, targetId, { role: 'supervisor', teamId: 'team-test', regionId: null, isActive: true });
    const [u] = await ctx.db.select().from(ctx.schema.users).where(eq(ctx.schema.users.id, targetId));
    expect(u.role).toBe('supervisor');
  });
});

describe('listCategories', () => {
  it('returns categories with products', async () => {
    const cats = await listCategories(ctx.db, ctx.schema);
    expect(cats).toHaveLength(1);
    expect(cats[0].products).toHaveLength(1);
  });
});

describe('addProduct', () => {
  it('creates a product in a category', async () => {
    await addProduct(ctx.db, ctx.schema, { categoryId: 'cat-test', name: 'New Item' });
    const cats = await listCategories(ctx.db, ctx.schema);
    expect(cats[0].products).toHaveLength(2);
  });
});

describe('toggleProduct', () => {
  it('deactivates then reactivates a product', async () => {
    await toggleProduct(ctx.db, ctx.schema, 'prod-test', false);
    const [p] = await ctx.db.select().from(ctx.schema.products);
    expect(p.isActive).toBe(false);
    await toggleProduct(ctx.db, ctx.schema, 'prod-test', true);
    const [p2] = await ctx.db.select().from(ctx.schema.products);
    expect(p2.isActive).toBe(true);
  });
});

describe('listOffices — scope filtering', () => {
  beforeEach(() => {
    // Seed a second isolated region → team → office chain
    seedTestOffice(ctx.db, { regionId: 'region-b', teamId: 'team-b', officeId: 'office-b' });
  });

  it('region scope returns only offices in that region', async () => {
    // managerUser is in region-test — should see office-test, NOT office-b
    const rows = await listOffices(ctx.db, ctx.schema, managerUser);
    const ids = rows.map((r) => r.id);
    expect(ids).toContain('office-test');
    expect(ids).not.toContain('office-b');
  });

  it('region scope does not bleed into another region', async () => {
    const otherManagerId = seedTestUser(ctx.db, { role: 'manager', regionId: 'region-b', teamId: null });
    const otherManager: SessionUser = {
      id: otherManagerId, name: 'Other', email: 'o@o.com',
      role: 'manager', teamId: null, regionId: 'region-b',
    };
    const rows = await listOffices(ctx.db, ctx.schema, otherManager);
    const ids = rows.map((r) => r.id);
    expect(ids).toContain('office-b');
    expect(ids).not.toContain('office-test');
  });

  it('team scope returns only that team\'s offices', async () => {
    const supervisorId = seedTestUser(ctx.db, { role: 'supervisor', teamId: 'team-test', regionId: 'region-test' });
    const supervisor: SessionUser = {
      id: supervisorId, name: 'Sup', email: 's@s.com',
      role: 'supervisor', teamId: 'team-test', regionId: 'region-test',
    };
    const rows = await listOffices(ctx.db, ctx.schema, supervisor);
    const ids = rows.map((r) => r.id);
    expect(ids).toContain('office-test');
    expect(ids).not.toContain('office-b');
    expect(rows).toHaveLength(1);
  });

  it('includes teamName and regionName in each row', async () => {
    const rows = await listOffices(ctx.db, ctx.schema, managerUser);
    expect(rows[0].teamName).toBe('team-test');
    expect(rows[0].regionName).toBe('region-test');
  });
});

describe('toggleOffice', () => {
  it('deactivates an office', async () => {
    await toggleOffice(ctx.db, ctx.schema, managerUser, 'office-test', false);
    const [o] = await ctx.db.select().from(ctx.schema.offices);
    expect(o.isActive).toBe(false);
  });
});
