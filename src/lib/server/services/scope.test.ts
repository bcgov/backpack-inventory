// src/lib/server/services/scope.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, seedTestOffice } from '../db/test-db.js';
import { getOfficeIdsForUser, assertOfficeInScope } from './scope.js';
import type { SessionUser } from '../../types.js';

let ctx: ReturnType<typeof createTestDb>;

beforeEach(() => {
  ctx = createTestDb();
  seedTestOffice(ctx.db);
});

function makeUser(role: SessionUser['role'], overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: 'user-1',
    name: 'Test',
    email: 'test@example.com',
    role,
    teamId: 'team-test',
    regionId: 'region-test',
    ...overrides,
  };
}

describe('getOfficeIdsForUser', () => {
  it('ci_specialist gets only their team offices', async () => {
    const ids = await getOfficeIdsForUser(ctx.db, ctx.schema, makeUser('ci_specialist'));
    expect(ids).toEqual(['office-test']);
  });

  it('supervisor gets only their team offices', async () => {
    const ids = await getOfficeIdsForUser(ctx.db, ctx.schema, makeUser('supervisor'));
    expect(ids).toContain('office-test');
  });

  it('aaa gets all offices in their region', async () => {
    const ids = await getOfficeIdsForUser(ctx.db, ctx.schema, makeUser('aaa'));
    expect(ids).toContain('office-test');
  });

  it('director_3p gets all offices', async () => {
    const ids = await getOfficeIdsForUser(ctx.db, ctx.schema, makeUser('director_3p', { teamId: null, regionId: null }));
    expect(ids).toContain('office-test');
  });

  it('returns empty array if user has no team assigned', async () => {
    const ids = await getOfficeIdsForUser(ctx.db, ctx.schema, makeUser('ci_specialist', { teamId: null }));
    expect(ids).toEqual([]);
  });

  it('throws if officeId is not in user scope', async () => {
    await expect(
      assertOfficeInScope(ctx.db, ctx.schema, makeUser('ci_specialist'), 'other-office')
    ).rejects.toThrow('not in your scope');
  });
});
