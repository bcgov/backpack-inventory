# ── Build stage ───────────────────────────────────────────────────────────────
FROM registry.access.redhat.com/ubi9/nodejs-20:latest as build

# UBI9 images default to uid 1001, which cannot write to directories created
# by COPY (which always runs as root). Switch to root for the build stage so
# npm ci and the SvelteKit build can write node_modules and .svelte-kit/.
USER root

WORKDIR /opt/app-root/src

# Copy only package.json (not package-lock.json) so npm resolves
# platform-specific optional dependencies for Linux rather than
# replaying a lockfile generated on macOS/Windows.
COPY package.json ./
# Skip Playwright browser downloads — Chromium/Firefox/WebKit are not needed
# for a production build and each binary is ~300-500 MB.
RUN PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install

COPY . .
# ROLLUP_SKIP_LOAD_NATIVE_BINDINGS forces the WASM fallback, keeping Rollup's
# memory inside the V8 heap rather than adding to native heap on top of it.
# NODE_OPTIONS caps V8 heap at 1536 MB, leaving ~500 MB for Node runtime +
# WASM linear memory + OS overhead within the 2 GB pod limit.
RUN NODE_OPTIONS=--max-old-space-size=1536 npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM registry.access.redhat.com/ubi9/nodejs-20:latest AS runtime

USER root

WORKDIR /opt/app-root/src

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the SvelteKit build output (adapter-node produces build/)
COPY --from=build /opt/app-root/src/build ./build

# Create the uploads directory used by the file upload feature
RUN mkdir -p uploads/receipts

# Copy DB init script and SQLite migration files
COPY scripts/init-db.mjs ./scripts/init-db.mjs
COPY src/lib/server/db/migrations/sqlite/*.sql ./migrations/

# Copy the entrypoint script
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# OpenShift runs containers with an arbitrary UID in group 0.
# Setting group ownership + g=u ensures the process can write uploads
# and read app files regardless of which UID OpenShift assigns.
RUN chown -R 0:0 /opt/app-root/src && chmod -R g=u /opt/app-root/src

# Drop back to the non-root user for the running process
USER 1001

EXPOSE 3000
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production

CMD ["/opt/app-root/src/entrypoint.sh"]
