# ── Build stage ───────────────────────────────────────────────────────────────
FROM registry.access.redhat.com/ubi9/nodejs-20:latest as build

# UBI9 images default to uid 1001, which cannot write to directories created
# by COPY (which always runs as root). Switch to root for the build stage so
# npm ci and the SvelteKit build can write node_modules and .svelte-kit/.
USER root

WORKDIR /opt/app-root/src

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

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

CMD ["node", "/opt/app-root/src/build/index.js"]
