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

### Phase 2: Authentication
**Goal: Register, login, logout, protected routes**

- [ ] Install + configure better-auth
- [ ] Create `src/lib/auth/index.ts`
- [ ] Add better-auth route handler (`/api/auth/[...all]`)
- [ ] Configure `src/hooks.server.ts` — session resolution
- [ ] Register page + form action
- [ ] Login page + form action
- [ ] Logout form action
- [ ] `(protected)/+layout.server.ts` — redirect unauthenticated users
- [ ] `(public)/+layout.server.ts` — redirect authenticated users
- [ ] Site header with user name + logout
- [ ] **Verify:** full auth flow works

### Phase 3: Recipe CRUD
**Goal: Full create, read, update, delete for recipes**

- [ ] Schema: `recipes`, `ingredients`, `steps`, `tags`, `recipe_tags`
- [ ] Run migrations
- [ ] `src/lib/db/queries/recipes.ts` — typed query functions
- [ ] Public recipe listing page (SSR, paginated)
- [ ] Single recipe view page (SSR)
- [ ] Create recipe form (protected, multi-section with Zod/superforms)
- [ ] Edit recipe form (protected, load existing data)
- [ ] Delete recipe (protected, ownership check)
- [ ] Image upload via MinIO
- [ ] Tag management
- [ ] **Verify:** full CRUD + image upload working

### Phase 4: Discovery & Search
**Goal: Search, filter, and bookmark recipes**

- [ ] `search_vector tsvector` generated column + GIN index
- [ ] Full-text search: `GET /api/recipes?q=...`
- [ ] Debounced search UI
- [ ] Tag-based filtering
- [ ] Difficulty + prep-time filters
- [ ] Save/bookmark: `POST/DELETE /api/recipes/[id]/save`
- [ ] Dashboard: "My Recipes" + "Saved Recipes" tabs
- [ ] **Verify:** search, filters, and bookmarks working

### Phase 5: Production Hardening
**Goal: Security, observability, scale-readiness**

- [ ] PgBouncer integration
- [ ] Redis session caching in `hooks.server.ts`
- [ ] Rate limiting (Redis sliding window)
- [ ] HTTP security headers (CSP, X-Frame-Options, etc.)
- [ ] Structured logging with `pino`
- [ ] `Cache-Control` on public pages
- [ ] Database seed script (`npm run db:seed`)
- [ ] Multi-stage production Dockerfile
- [ ] `docker-compose.dev.yml` with hot reload
- [ ] Playwright integration tests
- [ ] **Verify:** rate limiting, security headers, seed data working

### Phase 6: Deployment Readiness
**Goal: Observable, documented, deployable**

- [ ] Liveness + readiness health endpoints
- [ ] Prometheus metrics (`prom-client`)
- [ ] Optional Grafana + Prometheus Docker profile
- [ ] `pg_dump` backup script
- [ ] `README.md` with quickstart
- [ ] Environment variable documentation
- [ ] **Verify:** health + metrics endpoints, README quickstart

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
