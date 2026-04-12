# ── Stage 1: dependencies ────────────────────────────────────────────────────
# Install only production dependencies so the final image stays small.
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev


# ── Stage 2: build ───────────────────────────────────────────────────────────
# Install all deps (including dev) and produce the SvelteKit Node build.
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# svelte-kit sync must run before the build (generates $types etc.)
RUN npm run build


# ── Stage 3: production image ────────────────────────────────────────────────
# Minimal runtime: Node + the compiled build output + production node_modules.
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 sveltekit

# Copy the SvelteKit build output
COPY --from=builder --chown=sveltekit:nodejs /app/build ./build

# Copy production node_modules (pre-pruned in stage 1)
COPY --from=deps   --chown=sveltekit:nodejs /app/node_modules ./node_modules

# Copy package.json so Node can resolve "type": "module"
COPY --from=builder --chown=sveltekit:nodejs /app/package.json ./package.json

USER sveltekit

EXPOSE 3000

# adapter-node entry point
CMD ["node", "build"]
