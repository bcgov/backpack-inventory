# ── Build stage ───────────────────────────────────────────────────────────────
FROM registry.access.redhat.com/ubi9/nodejs-20:latest as build

# UBI9 Node.js images run as uid 1001 and pre-own /opt/app-root/src.
# Using this directory avoids EACCES errors from npm ci running as non-root.
WORKDIR /opt/app-root/src

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM registry.access.redhat.com/ubi9/nodejs-20:latest AS runtime

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

EXPOSE 3000
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production

CMD ["node", "/opt/app-root/src/build/index.js"]
