/**
 * Auth.js configuration for SvelteKit.
 *
 * Provider: Microsoft Entra ID (Azure AD) — the most common enterprise OIDC
 * provider for BC Government systems. To swap providers, replace the import
 * and constructor below with any Auth.js-compatible provider.
 *
 * Required environment variables:
 *   AUTH_SECRET          — min 32-char random string (openssl rand -hex 32)
 *   AUTH_TRUST_HOST      — set to "true" outside Vercel
 *   AZURE_AD_CLIENT_ID   — app registration client ID
 *   AZURE_AD_CLIENT_SECRET — app registration secret
 *   AZURE_AD_TENANT_ID   — directory (tenant) ID
 *
 * On first login, a user row is created in the DB with role = 'ci_specialist'.
 * An admin must update the role and location via the admin panel (UC-16).
 */

import { SvelteKitAuth } from '@auth/sveltekit';
import MicrosoftEntraID from '@auth/sveltekit/providers/microsoft-entra-id';
import { env } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { getDb, getSchema } from '$lib/server/db/index.js';

export const { handle, signIn, signOut } = SvelteKitAuth({
  trustHost: true,
  providers: [
    MicrosoftEntraID({
      clientId: env.AZURE_AD_CLIENT_ID,
      clientSecret: env.AZURE_AD_CLIENT_SECRET,
      tenantId: env.AZURE_AD_TENANT_ID,
    }),
  ],

  callbacks: {
    /**
     * Fires on every sign-in. Upserts the user row in our DB.
     * Returns false to reject the sign-in (e.g. inactive account).
     */
    async signIn({ user }) {
      if (!user.email) return false;

      const db     = await getDb();
      const schema = await getSchema();

      const [existing] = await db
        .select({ id: schema.users.id, isActive: schema.users.isActive })
        .from(schema.users)
        .where(eq(schema.users.email, user.email))
        .limit(1);

      if (!existing) {
        // First login — create user with default (most-restricted) role.
        // An admin must assign the correct role and location afterwards.
        await db.insert(schema.users).values({
          id:          randomUUID(),
          name:        user.name ?? user.email,
          email:       user.email,
          role:        'ci_specialist',
          lastLoginAt: new Date().toISOString(),
        });
      } else {
        if (!existing.isActive) return false; // blocked account

        await db
          .update(schema.users)
          .set({ lastLoginAt: new Date().toISOString() })
          .where(eq(schema.users.email, user.email));
      }

      return true;
    },

    /**
     * Runs after signIn; used to embed our DB user ID into the JWT so we can
     * retrieve full profile data in hooks.server.ts without a second email lookup.
     */
    async jwt({ token, user }) {
      if (user?.email) {
        const db     = await getDb();
        const schema = await getSchema();

        const [dbUser] = await db
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(eq(schema.users.email, user.email))
          .limit(1);

        if (dbUser) token.userId = dbUser.id;
      }
      return token;
    },

    /** Forwards the DB user ID into the session object. */
    async session({ session, token }) {
      if (token.userId) {
        (session.user as typeof session.user & { userId: string }).userId =
          token.userId as string;
      }
      return session;
    },
  },

  pages: {
    signIn: '/auth/signin',
  },
});
