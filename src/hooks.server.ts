/**
 * SvelteKit server hooks.
 *
 * Responsibilities:
 *   1. Run Auth.js session handling (sets locals.auth)
 *   2. Resolve the authenticated user from DB and attach to locals.user
 *   3. Guard protected routes with RBAC — unauthenticated → /auth/signin,
 *      insufficient permission → 403
 */

import { sequence }   from '@sveltejs/kit/hooks';
import { redirect, error } from '@sveltejs/kit';
import { handle as authHandle } from '$lib/server/auth';
import { eq }         from 'drizzle-orm';
import { getDb, getSchema } from '$lib/server/db/index.js';
import { ROLE_PERMISSIONS } from '$lib/types.js';
import { env }        from '$env/dynamic/private';
import type { Handle }       from '@sveltejs/kit';
import type { AppPermission } from '$lib/types.js';

// ─── Route access rules ───────────────────────────────────────────────────────
//
// Routes not listed here are public (e.g. /auth/signin).
// Listed routes require authentication; those with a permission additionally
// require the user's role to hold that permission.
//
const PROTECTED_ROUTES: Array<{ prefix: string; permission?: AppPermission }> = [
  { prefix: '/dashboard' },
  { prefix: '/transactions' },
  { prefix: '/scan' },
  { prefix: '/inventory-count' },
  { prefix: '/reconcile',    permission: 'reconcile_count' },
  { prefix: '/audit-log',    permission: 'view_audit_log' },
  { prefix: '/reports',      permission: 'view_reports' },
  { prefix: '/admin',        permission: 'manage_users' },
];

// ─── User resolution handle ───────────────────────────────────────────────────

const userHandle: Handle = async ({ event, resolve }) => {
  // ── Local dev bypass ──────────────────────────────────────────────────────
  // Set DEV_AUTH_USER_ID in .env to skip OAuth entirely during local development.
  // The user is auto-created as a supervisor on first request (requires db:seed
  // to have run so at least one team/region exists).
  if (env.DEV_AUTH_USER_ID) {
    const devId  = env.DEV_AUTH_USER_ID;
    const db     = await getDb();
    const schema = await getSchema();

    let [devUser] = await db
      .select({
        id: schema.users.id, name: schema.users.name, email: schema.users.email,
        role: schema.users.role, teamId: schema.users.teamId, regionId: schema.users.regionId,
      })
      .from(schema.users)
      .where(eq(schema.users.id, devId))
      .limit(1);

    if (!devUser) {
      // Auto-create the dev user as a supervisor using the first seeded team/region
      const [firstTeam] = await db
        .select({ id: schema.teams.id, regionId: schema.teams.regionId })
        .from(schema.teams)
        .limit(1);
      if (firstTeam) {
        const now = new Date().toISOString();
        db.insert(schema.users).values({
          id: devId, name: 'Dev User', email: 'dev@localhost',
          role: 'manager', teamId: null, regionId: firstTeam.regionId,
          isActive: true, createdAt: now, updatedAt: now,
        }).run();
        [devUser] = await db
          .select({
            id: schema.users.id, name: schema.users.name, email: schema.users.email,
            role: schema.users.role, teamId: schema.users.teamId, regionId: schema.users.regionId,
          })
          .from(schema.users)
          .where(eq(schema.users.id, devId))
          .limit(1);
      }
    }

    if (devUser) {
      event.locals.user = devUser as typeof event.locals.user;
      const path = event.url.pathname;
      const rule = PROTECTED_ROUTES.find((r) => path.startsWith(r.prefix));
      if (rule?.permission) {
        const allowed = ROLE_PERMISSIONS[event.locals.user.role]?.has(rule.permission);
        if (!allowed) throw error(403, 'You do not have permission to access this page.');
      }
      return resolve(event);
    }
  }
  // ── End local dev bypass ──────────────────────────────────────────────────

  // ── Test-only auth bypass ─────────────────────────────────────────────────
  // ALLOW_TEST_AUTH is never set in production (it is not in the .env).
  // Playwright sets it when starting the preview server so tests can skip OAuth.
  // We handle ALL cases here (with or without header) so event.locals.auth()
  // is never called — avoiding the broken Azure AD provider config in test.
  if (process.env.ALLOW_TEST_AUTH === 'true') {
    const testUserId = event.request.headers.get('x-test-user-id');
    if (testUserId) {
      const db     = await getDb();
      const schema = await getSchema();
      const [dbUser] = await db
        .select({
          id:       schema.users.id,
          name:     schema.users.name,
          email:    schema.users.email,
          role:     schema.users.role,
          teamId:   schema.users.teamId,
          regionId: schema.users.regionId,
        })
        .from(schema.users)
        .where(eq(schema.users.id, testUserId))
        .limit(1);
      if (dbUser) {
        event.locals.user = dbUser as typeof event.locals.user;
        const path = event.url.pathname;
        const rule = PROTECTED_ROUTES.find((r) => path.startsWith(r.prefix));
        if (rule && rule.permission) {
          const allowed = ROLE_PERMISSIONS[event.locals.user.role]?.has(rule.permission);
          if (!allowed) throw error(403, 'You do not have permission to access this page.');
        }
        return resolve(event);
      }
    }
    // No x-test-user-id header → unauthenticated; apply RBAC and let guard redirect
    event.locals.user = null;
    const path = event.url.pathname;
    const rule = PROTECTED_ROUTES.find((r) => path.startsWith(r.prefix));
    if (rule) {
      throw redirect(303, `/auth/signin?callbackUrl=${encodeURIComponent(path)}`);
    }
    return resolve(event);
  }
  // ── End test bypass ───────────────────────────────────────────────────────

  const session = await event.locals.auth();

  // Auth.js attaches userId via our jwt/session callbacks
  const userId = (session?.user as (typeof session.user & { userId?: string }) | undefined)
    ?.userId;

  if (userId) {
    const db     = await getDb();
    const schema = await getSchema();

    const [dbUser] = await db
      .select({
        id:       schema.users.id,
        name:     schema.users.name,
        email:    schema.users.email,
        role:     schema.users.role,
        teamId:   schema.users.teamId,
        regionId: schema.users.regionId,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (dbUser) {
      // Cast: role is stored as TEXT but always matches UserRole
      event.locals.user = dbUser as typeof event.locals.user;
    }
  } else {
    event.locals.user = null;
  }

  // ── RBAC guard ──────────────────────────────────────────────────────────
  const path = event.url.pathname;

  const rule = PROTECTED_ROUTES.find((r) => path.startsWith(r.prefix));
  if (rule) {
    if (!event.locals.user) {
      // Not signed in → send to sign-in page
      throw redirect(303, `/auth/signin?callbackUrl=${encodeURIComponent(path)}`);
    }

    if (rule.permission) {
      const allowed = ROLE_PERMISSIONS[event.locals.user.role]?.has(rule.permission);
      if (!allowed) {
        throw error(403, 'You do not have permission to access this page.');
      }
    }
  }

  return resolve(event);
};

// When the local dev bypass is active, skip Auth.js entirely to avoid
// OAuth configuration warnings. In production, Auth.js runs first.
export const handle = env.DEV_AUTH_USER_ID
  ? userHandle
  : sequence(authHandle, userHandle);
