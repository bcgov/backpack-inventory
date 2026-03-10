// src/lib/server/services/users.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, seedTestOffice, seedTestUser } from '../db/test-db.js';
import { getUsersInScope } from './users.js';
import type { SessionUser } from '../../types.js';

let ctx: ReturnType<typeof createTestDb>;

beforeEach(() => {
  ctx = createTestDb();
  seedTestOffice(ctx.db);
});

describe('getUsersInScope', () => {
  it('supervisor sees only users in their team', async () => {
    seedTestUser(ctx.db, { role: 'ci_specialist', teamId: 'team-test' });
    const supId = seedTestUser(ctx.db, { role: 'supervisor', teamId: 'team-test' });

    const supervisor: SessionUser = {
      id: supId, name: 'Sup', email: 'sup@t.com',
      role: 'supervisor', teamId: 'team-test', regionId: 'region-test',
    };

    const users = await getUsersInScope(ctx.db, ctx.schema, supervisor);
    expect(users.length).toBe(2); // ci_specialist + supervisor themselves
    expect(users.every((u: { teamId: string | null }) => u.teamId === 'team-test')).toBe(true);
  });

  it('excludes users from other teams', async () => {
    ctx.db.insert(ctx.schema.teams).values({
      id: 'team-other', regionId: 'region-test', name: 'Other', slug: 'other',
      createdAt: new Date().toISOString(),
    }).run();
    seedTestUser(ctx.db, { role: 'ci_specialist', teamId: 'team-other' });

    const supId = seedTestUser(ctx.db, { role: 'supervisor', teamId: 'team-test' });
    const supervisor: SessionUser = {
      id: supId, name: 'S', email: 's@t.com',
      role: 'supervisor', teamId: 'team-test', regionId: 'region-test',
    };

    const users = await getUsersInScope(ctx.db, ctx.schema, supervisor);
    expect(users.every((u: { teamId: string | null }) => u.teamId === 'team-test')).toBe(true);
  });
});
