# Recipe Roost — Project Plan

A food recipe web application with user authentication, full recipe CRUD, image uploads, full-text search, and bookmarking. Built to scale to ~100,000 users.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | SvelteKit 2.x (`@sveltejs/adapter-node`) |
| Language | TypeScript (strict) |
| ORM | Drizzle ORM + Drizzle Kit |
| DB Driver | postgres.js |
| Auth | better-auth (email/password, cookie sessions) |
| Styling | Tailwind CSS v4 + shadcn-svelte |
| Forms | Zod + sveltekit-superforms |
| File storage | MinIO (S3-compatible, Docker) |
| Session cache | Redis |
| Connection pooling | PgBouncer |
| Database | PostgreSQL 17 |
| Local dev | Docker + Docker Compose |

## Docker Compose Services

| Service | Purpose | Port |
|---|---|---|
| `app` | SvelteKit Node.js server | 3000 |
| `db` | PostgreSQL 17 | 5434 (host) / 5432 (internal) |
| `redis` | Session cache + rate limiting | 6379 |
| `minio` | Image/file storage (S3-compatible) | 9000, 9001 |
| `pgbouncer` | DB connection pooling | 5433 |

---

## Implementation Phases

### Phase 1: Foundation ✅
**Goal: Running skeleton with DB connection**

- [x] Create PLAN.md
- [x] Scaffold SvelteKit (TypeScript, strict) — via `npx sv create` with add-ons
- [x] Configure `@sveltejs/adapter-node`
- [x] Install Drizzle ORM + postgres.js (included in scaffold)
- [x] Install additional packages: Zod, sveltekit-superforms, @aws-sdk/client-s3, ioredis
- [x] Create `src/lib/server/db/index.ts` — DB connection
- [x] Create `src/lib/server/db/schema.ts` — full recipe schema (10 tables)
- [x] Generate better-auth schema (`npm run auth:schema`)
- [x] Configure `drizzle.config.ts`
- [x] Run first migration (`npm run db:migrate`) — all 10 tables + GIN index + FTS trigger
- [x] Write `compose.yaml` with PostgreSQL 17, Redis, MinIO, PgBouncer
- [x] Add `.env` + `.env.example`
- [x] Add `GET /api/health` route
- [x] **Verified:** `docker compose up db` + dev server → `/api/health` → `{"status":"ok","db":"connected"}`

**Notes:**
- PostgreSQL host port remapped to 5434 (5432 was already in use by local install)
- better-auth manages the `user` table; recipe tables reference `user.id` (text FK)
- FTS trigger (`recipes_search_vector_trigger`) populates `search_vector` on insert/update

### Phase 2: Authentication ✅
**Goal: Register, login, logout, protected routes**

- [x] Install + configure better-auth
- [x] Create `src/lib/server/auth.ts` (better-auth with drizzleAdapter + sveltekitCookies)
- [x] Add better-auth route handler (via `svelteKitHandler` in `hooks.server.ts`)
- [x] Configure `src/hooks.server.ts` — session resolution, populates `locals.user/session`
- [x] Register page + form action (`(public)/register/` — Zod + superforms)
- [x] Login page + form action (`(public)/login/` — Zod + superforms)
- [x] Logout form action (`/sign-out` dedicated route)
- [x] `(protected)/+layout.server.ts` — redirect unauthenticated users to `/login`
- [x] `(public)/+layout.server.ts` — redirect authenticated users to `/dashboard`
- [x] Site header with user name + logout (in `(protected)/+layout.svelte`)
- [x] Root `/` redirects to `/dashboard` or `/login` based on session
- [x] **Verified:** 0 type errors, 0 warnings (`npm run check`)

**Notes:**
- Used `zod4` + `zod4Client` adapters (Zod v4 installed); `z.string().check(z.email())` pattern (`.email(params)` is deprecated in v4)
- `untrack(() => data.form)` used in Svelte components to silence false-positive Svelte 5 reactivity warning on superForm init
- Sign-out lives at `/sign-out` as a dedicated form-action route; header POSTs there via `use:enhance`

### Phase 3: Recipe CRUD ✅
**Goal: Full create, read, update, delete for recipes**

- [x] Schema: `recipes`, `ingredients`, `steps`, `tags`, `recipe_tags` (live from Phase 1 migration)
- [x] Run migrations (completed in Phase 1)
- [x] `src/lib/server/db/queries/recipes.ts` — typed query functions (list, get, create, update, delete)
- [x] Public recipe listing page (SSR, paginated) — `src/routes/recipes/`
- [x] Single recipe view page (SSR) — `src/routes/recipes/[id]/`
- [x] Create recipe form (protected, multi-section with Zod/superforms) — `(protected)/recipes/new/`
- [x] Edit recipe form (protected, load existing data) — `(protected)/recipes/[id]/edit/`
- [x] Delete recipe (protected, ownership check) — `(protected)/recipes/[id]/delete/`
- [x] Image upload via MinIO — `src/lib/server/storage.ts`
- [x] Tag management (upsert + association on create/update)
- [x] Dashboard updated with live "My Recipes" list
- [x] **Verified:** 0 type errors, 0 warnings (`npm run check`)

**Notes:**
- Shared form schema lives in `src/lib/recipe-form.ts` (Zod, no server-only deps — safe to import in `.svelte` files)
- Ingredients and steps managed as Svelte state; serialised to hidden JSON fields on submit
- Image upload handled outside superforms (multipart/form-data); old images deleted from MinIO on replacement
- Public recipe pages (`/recipes`, `/recipes/[id]`) use their own layout with conditional auth nav
- Unpublished recipes are only visible to their author; ownership checked server-side on edit/delete
- `MINIO_PUBLIC_URL` env var added for browser-accessible image URLs (differs from internal endpoint in Docker)

### Phase 4: Discovery & Search ✅
**Goal: Search, filter, and bookmark recipes**

- [x] `search_vector tsvector` generated column + GIN index (live from Phase 1 migration)
- [x] Full-text search via `?q=` query param on `/recipes` listing (PostgreSQL `plainto_tsquery` + GIN index)
- [x] Debounced search input (400 ms, `goto()` with `replaceState: true`)
- [x] Tag-based filtering via `?tag=` — tag pills on browse page; tags on recipe detail link to filtered listing
- [x] Difficulty filter buttons (`?difficulty=easy|medium|hard`)
- [x] Prep-time filter buttons (`?maxPrepTime=15|30|45|60`)
- [x] Save/bookmark: named form actions `?/save` and `?/unsave` on `/recipes/[id]`; `saved_recipes` table (composite PK)
- [x] Dashboard: "My Recipes" + "Saved Recipes" tabs with live counts
- [x] **Verified:** 0 type errors, 0 warnings (`npm run check`)

**Notes:**
- Search orders results by `ts_rank` when `q` is set, by `created_at DESC` otherwise
- Filters compose: multiple active simultaneously (q + tag + difficulty + maxPrepTime)
- `listAllTags()` only returns tags that appear on at least one published recipe
- Save button visible to logged-in non-authors only; optimistic UI via superforms `use:enhance` + `form` action data
- Dashboard tab state is client-side `$state` — both datasets loaded on server in one round-trip

### Phase 5: Production Hardening ✅
**Goal: Security, observability, scale-readiness**

- [x] PgBouncer integration — `prepare: false` in `db/index.ts`; `DATABASE_URL_DIRECT` for migrations
- [x] Redis session caching in `hooks.server.ts` — 5-minute write-through cache keyed on session token
- [x] Rate limiting (Redis sliding window) — 10 req/60 s per IP on `/login` and `/register`
- [x] HTTP security headers — `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `CSP`
- [x] Structured logging with `pino` — request log (method/path/status/latency) + storage events
- [x] `Cache-Control` on public pages — `public, max-age=60, stale-while-revalidate=300` (unauthenticated only on detail page)
- [x] Database seed script (`npm run db:seed`) — 2 users + 5 recipes with ingredients, steps, tags
- [x] Multi-stage production Dockerfile — `deps` → `builder` → `runner` (non-root, Node 22 Alpine)
- [x] `docker-compose.dev.yml` with hot reload — source-mounted Vite dev server on port 5173
- [x] Playwright integration tests — auth flow + recipe browse + security headers (`tests/e2e/`)
- [x] **Verified:** 0 type errors, 0 warnings (`npm run check`)

**Notes:**
- PgBouncer uses transaction pooling — `prepare: false` is required; migrations must bypass it via `DATABASE_URL_DIRECT`
- Redis session cache fails open (allows request) if Redis is unreachable — keeps the app functional during Redis outages
- Rate limiter also fails open for the same reason
- CSP allows `unsafe-inline` for scripts/styles (required by Svelte inline scripts and Tailwind) — tighten with nonces in Phase 6 if needed
- `MINIO_PUBLIC_URL` added to dev compose override so browser can reach images
- Seed script uses `tsx` and `dotenv/config` for standalone execution outside SvelteKit
- Playwright config targets `localhost:4173` (preview server); set `E2E_BASE_URL` to override

### Phase 6: Deployment Readiness ✅
**Goal: Slim recipe model, observable, documented, deployable**

- [x] **Slim recipe model** — removed `prepTime`, `cookTime`, `servings`, `difficulty` from schema, queries, forms, UI, and seed data; `drizzle/0001_drop_recipe_timing_difficulty.sql` migration added
- [x] Liveness probe — `GET /api/health` returns `200 { status: "ok" }` (process-level only, no deps)
- [x] Readiness probe — `GET /api/ready` checks PostgreSQL + Redis; returns `503` with per-check detail when degraded
- [x] Prometheus metrics (`prom-client`) — `GET /api/metrics`; HTTP request counter + duration histogram + recipe ops counter; default Node.js process metrics included
- [x] Grafana + Prometheus Docker profile — `docker compose --profile monitoring up`; Prometheus scrapes `/api/metrics`; Grafana on port 3001
- [x] `pg_dump` backup script — `scripts/backup.sh`; timestamped archives in `./backups/`; auto-prunes after 30 days; cron-ready
- [x] `README.md` with quickstart — 6-step local dev guide, all npm scripts, all Docker profiles, full env var table, API endpoint reference
- [x] Environment variable documentation — inline in README and `.env.example`
- [x] **Verified:** 0 type errors, 0 warnings (`npm run check`)

**Notes:**
- Migration `0001` uses `DROP COLUMN IF EXISTS` — safe to run against a DB that already had the columns dropped
- `/api/health` is a pure liveness check (no DB/Redis) so a dependency outage never causes unnecessary container restarts
- `/api/ready` is the readiness check — use this in load balancer health checks
- Prometheus Docker profile requires the `full` app container to be running so it can scrape `/api/metrics`
- `scripts/backup.sh` reads `DATABASE_URL_DIRECT` (or falls back to `DATABASE_URL`) — always bypasses PgBouncer for a clean dump

---

## Database Schema

All 10 tables are live in PostgreSQL. Tables managed by better-auth use singular names and text PKs; recipe tables use uuid PKs.

```
── better-auth managed ──────────────────────────────────────────────────────

user             — id (text PK), name, email, email_verified (bool),
                   image, created_at, updated_at

session          — id (text PK), expires_at, token (unique), created_at,
                   updated_at, ip_address, user_agent, user_id (FK → user)

account          — id (text PK), account_id, provider_id, user_id (FK → user),
                   access_token, refresh_token, id_token,
                   access_token_expires_at, refresh_token_expires_at,
                   scope, password, created_at, updated_at

verification     — id (text PK), identifier, value, expires_at,
                   created_at, updated_at

── application tables ───────────────────────────────────────────────────────

recipes          — id (uuid PK), author_id (text FK → user), title,
                   description, image_url, prep_time, cook_time, servings,
                   difficulty (enum: easy/medium/hard), is_published (bool),
                   search_vector (tsvector), created_at, updated_at

ingredients      — id (uuid PK), recipe_id (uuid FK → recipes), name,
                   quantity, unit, sort_order

steps            — id (uuid PK), recipe_id (uuid FK → recipes), step_number,
                   instruction, image_url

tags             — id (uuid PK), name (unique)

recipe_tags      — recipe_id (uuid FK → recipes), tag_id (uuid FK → tags)
                   PK (recipe_id, tag_id)

saved_recipes    — user_id (text FK → user), recipe_id (uuid FK → recipes),
                   saved_at
                   PK (user_id, recipe_id)

── indexes ──────────────────────────────────────────────────────────────────

recipes_author_id_idx          btree  recipes(author_id)
recipes_created_at_idx         btree  recipes(created_at)
recipes_search_vector_idx      GIN    recipes(search_vector)
recipe_tags_tag_id_idx         btree  recipe_tags(tag_id)
session_userId_idx             btree  session(user_id)
account_userId_idx             btree  account(user_id)
verification_identifier_idx    btree  verification(identifier)

── FTS trigger ──────────────────────────────────────────────────────────────

recipes_search_vector_trigger  — fires BEFORE INSERT OR UPDATE OF title,
                                  description; populates search_vector with
                                  weighted tsvector (title=A, description=B)
```

## Scaling Strategy (100k users)

- **Horizontal:** Stateless SvelteKit app → run 2-3 replicas behind Nginx/Caddy
- **Sessions:** Redis shared session cache across all replicas
- **DB connections:** PgBouncer (transaction pooling) → 20-50 PostgreSQL processes
- **Read replicas:** PostgreSQL read replica for recipe listing/search
- **CDN:** Cache-Control on public recipe pages → Cloudflare caches rendered HTML
- **Search:** PostgreSQL FTS with GIN index — no Elasticsearch needed at this scale
