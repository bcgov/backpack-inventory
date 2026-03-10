import { sequence } from "@sveltejs/kit/hooks";
import { redirect, error } from "@sveltejs/kit";
import { b as private_env } from "../chunks/shared-server.js";
import { skipCSRFCheck, setEnvDefaults as setEnvDefaults$1, createActionURL, Auth, raw, isAuthAction } from "@auth/core";
import { d as dev } from "../chunks/false.js";
import { b as building } from "../chunks/environment.js";
import { b as base } from "../chunks/server.js";
import "../chunks/url.js";
import "@sveltejs/kit/internal/server";
import "../chunks/root.js";
import { parse } from "set-cookie-parser";
import "@auth/core/errors";
import MicrosoftEntraID from "@auth/core/providers/microsoft-entra-id";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { g as getDb, a as getSchema } from "../chunks/index2.js";
import { R as ROLE_PERMISSIONS } from "../chunks/types.js";
function setEnvDefaults(envObject, config) {
  config.trustHost ??= dev;
  config.basePath = `${base}/auth`;
  config.skipCSRFCheck = skipCSRFCheck;
  if (building)
    return;
  setEnvDefaults$1(envObject, config);
}
async function signIn(provider, options = {}, authorizationParams, config, event) {
  const { request, url: { protocol } } = event;
  const headers = new Headers(request.headers);
  const { redirect: shouldRedirect = true, redirectTo, ...rest } = options instanceof FormData ? Object.fromEntries(options) : options;
  const callbackUrl = redirectTo?.toString() ?? headers.get("Referer") ?? "/";
  const signInURL = createActionURL("signin", protocol, headers, private_env, config);
  if (!provider) {
    signInURL.searchParams.append("callbackUrl", callbackUrl);
    if (shouldRedirect)
      redirect(302, signInURL.toString());
    return signInURL.toString();
  }
  let url = `${signInURL}/${provider}?${new URLSearchParams(authorizationParams)}`;
  let foundProvider = {};
  for (const providerConfig of config.providers) {
    const { options: options2, ...defaults } = typeof providerConfig === "function" ? providerConfig() : providerConfig;
    const id = options2?.id ?? defaults.id;
    if (id === provider) {
      foundProvider = {
        id,
        type: options2?.type ?? defaults.type
      };
      break;
    }
  }
  if (!foundProvider.id) {
    const url2 = `${signInURL}?${new URLSearchParams({ callbackUrl })}`;
    if (shouldRedirect)
      redirect(302, url2);
    return url2;
  }
  if (foundProvider.type === "credentials") {
    url = url.replace("signin", "callback");
  }
  headers.set("Content-Type", "application/x-www-form-urlencoded");
  const body = new URLSearchParams({ ...rest, callbackUrl });
  const req = new Request(url, { method: "POST", headers, body });
  const res = await Auth(req, { ...config, raw });
  for (const c of res?.cookies ?? []) {
    event.cookies.set(c.name, c.value, { path: "/", ...c.options });
  }
  if (shouldRedirect) {
    return redirect(302, res.redirect);
  }
  return res.redirect;
}
async function signOut(options, config, event) {
  const { request, url: { protocol } } = event;
  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/x-www-form-urlencoded");
  const url = createActionURL("signout", protocol, headers, private_env, config);
  const callbackUrl = options?.redirectTo ?? headers.get("Referer") ?? "/";
  const body = new URLSearchParams({ callbackUrl });
  const req = new Request(url, { method: "POST", headers, body });
  const res = await Auth(req, { ...config, raw });
  for (const c of res?.cookies ?? [])
    event.cookies.set(c.name, c.value, { path: "/", ...c.options });
  if (options?.redirect ?? true)
    return redirect(302, res.redirect);
  return res;
}
async function auth(event, config) {
  setEnvDefaults(private_env, config);
  config.trustHost ??= true;
  const { request: req, url: { protocol } } = event;
  const sessionUrl = createActionURL("session", protocol, req.headers, private_env, config);
  const request = new Request(sessionUrl, {
    headers: { cookie: req.headers.get("cookie") ?? "" }
  });
  const response = await Auth(request, config);
  const authCookies = parse(response.headers.getSetCookie());
  for (const cookie of authCookies) {
    const { name, value, ...options } = cookie;
    event.cookies.set(name, value, { path: "/", ...options });
  }
  const { status = 200 } = response;
  const data = await response.json();
  if (!data || !Object.keys(data).length)
    return null;
  if (status === 200)
    return data;
  throw new Error(data.message);
}
const authorizationParamsPrefix = "authorizationParams-";
function SvelteKitAuth(config) {
  return {
    signIn: async (event) => {
      if (building)
        return;
      const { request } = event;
      const _config = typeof config === "object" ? config : await config(event);
      setEnvDefaults(private_env, _config);
      const formData = await request.formData();
      const { providerId: provider, ...options } = Object.fromEntries(formData);
      const authorizationParams = {};
      const _options = {};
      for (const key in options) {
        if (key.startsWith(authorizationParamsPrefix)) {
          authorizationParams[key.slice(authorizationParamsPrefix.length)] = options[key];
        } else {
          _options[key] = options[key];
        }
      }
      await signIn(provider, _options, authorizationParams, _config, event);
    },
    signOut: async (event) => {
      if (building)
        return;
      const _config = typeof config === "object" ? config : await config(event);
      setEnvDefaults(private_env, _config);
      const options = Object.fromEntries(await event.request.formData());
      await signOut(options, _config, event);
    },
    async handle({ event, resolve }) {
      if (building) {
        event.locals.auth ??= async () => null;
        event.locals.getSession ??= event.locals.auth;
        return resolve(event);
      }
      const _config = typeof config === "object" ? config : await config(event);
      setEnvDefaults(private_env, _config);
      const { url, request } = event;
      event.locals.auth ??= () => auth(event, _config);
      event.locals.getSession ??= event.locals.auth;
      const action = url.pathname.slice(
        // @ts-expect-error - basePath is defined in setEnvDefaults
        _config.basePath.length + 1
      ).split("/")[0];
      if (isAuthAction(action) && url.pathname.startsWith(_config.basePath + "/")) {
        return Auth(request, _config);
      }
      return resolve(event);
    }
  };
}
const { handle: handle$1 } = SvelteKitAuth({
  providers: [
    MicrosoftEntraID({
      clientId: private_env.AZURE_AD_CLIENT_ID,
      clientSecret: private_env.AZURE_AD_CLIENT_SECRET,
      tenantId: private_env.AZURE_AD_TENANT_ID
    })
  ],
  callbacks: {
    /**
     * Fires on every sign-in. Upserts the user row in our DB.
     * Returns false to reject the sign-in (e.g. inactive account).
     */
    async signIn({ user }) {
      if (!user.email) return false;
      const db = await getDb();
      const schema = await getSchema();
      const [existing] = await db.select({ id: schema.users.id, isActive: schema.users.isActive }).from(schema.users).where(eq(schema.users.email, user.email)).limit(1);
      if (!existing) {
        await db.insert(schema.users).values({
          id: randomUUID(),
          name: user.name ?? user.email,
          email: user.email,
          role: "ci_specialist",
          lastLoginAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      } else {
        if (!existing.isActive) return false;
        await db.update(schema.users).set({ lastLoginAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(schema.users.email, user.email));
      }
      return true;
    },
    /**
     * Runs after signIn; used to embed our DB user ID into the JWT so we can
     * retrieve full profile data in hooks.server.ts without a second email lookup.
     */
    async jwt({ token, user }) {
      if (user?.email) {
        const db = await getDb();
        const schema = await getSchema();
        const [dbUser] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, user.email)).limit(1);
        if (dbUser) token.userId = dbUser.id;
      }
      return token;
    },
    /** Forwards the DB user ID into the session object. */
    async session({ session, token }) {
      if (token.userId) {
        session.user.userId = token.userId;
      }
      return session;
    }
  },
  pages: {
    signIn: "/auth/signin"
  }
});
const PROTECTED_ROUTES = [
  { prefix: "/dashboard" },
  { prefix: "/transactions" },
  { prefix: "/scan" },
  { prefix: "/inventory-count" },
  { prefix: "/reconcile", permission: "reconcile_count" },
  { prefix: "/audit-log", permission: "view_audit_log" },
  { prefix: "/reports", permission: "view_reports" },
  { prefix: "/admin", permission: "manage_users" }
];
const userHandle = async ({ event, resolve }) => {
  if (private_env.DEV_AUTH_USER_ID) {
    const devId = private_env.DEV_AUTH_USER_ID;
    const db = await getDb();
    const schema = await getSchema();
    let [devUser] = await db.select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      teamId: schema.users.teamId,
      regionId: schema.users.regionId
    }).from(schema.users).where(eq(schema.users.id, devId)).limit(1);
    if (!devUser) {
      const [firstTeam] = await db.select({ id: schema.teams.id, regionId: schema.teams.regionId }).from(schema.teams).limit(1);
      if (firstTeam) {
        const now = (/* @__PURE__ */ new Date()).toISOString();
        db.insert(schema.users).values({
          id: devId,
          name: "Dev User",
          email: "dev@localhost",
          role: "supervisor",
          teamId: firstTeam.id,
          regionId: firstTeam.regionId,
          isActive: true,
          createdAt: now,
          updatedAt: now
        }).run();
        [devUser] = await db.select({
          id: schema.users.id,
          name: schema.users.name,
          email: schema.users.email,
          role: schema.users.role,
          teamId: schema.users.teamId,
          regionId: schema.users.regionId
        }).from(schema.users).where(eq(schema.users.id, devId)).limit(1);
      }
    }
    if (devUser) {
      event.locals.user = devUser;
      const path2 = event.url.pathname;
      const rule2 = PROTECTED_ROUTES.find((r) => path2.startsWith(r.prefix));
      if (rule2?.permission) {
        const allowed = ROLE_PERMISSIONS[event.locals.user.role]?.has(rule2.permission);
        if (!allowed) throw error(403, "You do not have permission to access this page.");
      }
      return resolve(event);
    }
  }
  if (process.env.ALLOW_TEST_AUTH === "true") {
    const testUserId = event.request.headers.get("x-test-user-id");
    if (testUserId) {
      const db = await getDb();
      const schema = await getSchema();
      const [dbUser] = await db.select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        teamId: schema.users.teamId,
        regionId: schema.users.regionId
      }).from(schema.users).where(eq(schema.users.id, testUserId)).limit(1);
      if (dbUser) {
        event.locals.user = dbUser;
        const path3 = event.url.pathname;
        const rule3 = PROTECTED_ROUTES.find((r) => path3.startsWith(r.prefix));
        if (rule3 && rule3.permission) {
          const allowed = ROLE_PERMISSIONS[event.locals.user.role]?.has(rule3.permission);
          if (!allowed) throw error(403, "You do not have permission to access this page.");
        }
        return resolve(event);
      }
    }
    event.locals.user = null;
    const path2 = event.url.pathname;
    const rule2 = PROTECTED_ROUTES.find((r) => path2.startsWith(r.prefix));
    if (rule2) {
      throw redirect(303, `/auth/signin?callbackUrl=${encodeURIComponent(path2)}`);
    }
    return resolve(event);
  }
  const session = await event.locals.auth();
  const userId = session?.user?.userId;
  if (userId) {
    const db = await getDb();
    const schema = await getSchema();
    const [dbUser] = await db.select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      teamId: schema.users.teamId,
      regionId: schema.users.regionId
    }).from(schema.users).where(eq(schema.users.id, userId)).limit(1);
    if (dbUser) {
      event.locals.user = dbUser;
    }
  } else {
    event.locals.user = null;
  }
  const path = event.url.pathname;
  const rule = PROTECTED_ROUTES.find((r) => path.startsWith(r.prefix));
  if (rule) {
    if (!event.locals.user) {
      throw redirect(303, `/auth/signin?callbackUrl=${encodeURIComponent(path)}`);
    }
    if (rule.permission) {
      const allowed = ROLE_PERMISSIONS[event.locals.user.role]?.has(rule.permission);
      if (!allowed) {
        throw error(403, "You do not have permission to access this page.");
      }
    }
  }
  return resolve(event);
};
const handle = private_env.DEV_AUTH_USER_ID ? userHandle : sequence(handle$1, userHandle);
export {
  handle
};
