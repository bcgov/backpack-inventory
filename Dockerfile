# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the SvelteKit build output (adapter-node produces build/)
COPY --from=build /app/build ./build

# Create the uploads directory used by the file upload feature
RUN mkdir -p uploads/receipts

# OpenShift runs containers with an arbitrary UID in group 0.
# Setting group ownership + g=u ensures the process can write uploads
# and read app files regardless of which UID OpenShift assigns.
RUN chown -R 0:0 /app && chmod -R g=u /app

EXPOSE 3000
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production

CMD ["node", "build/index.js"]
