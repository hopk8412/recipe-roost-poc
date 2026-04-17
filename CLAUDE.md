# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Branching

Before starting any new work, create a feature branch from `main`:

```bash
git checkout main && git pull
git checkout -b feature-<tag>   # e.g. feature-recipe-search, feature-auth-refresh
```

Branch names must follow the `feature-<tag>` convention. All work for that feature lives on the branch; merge back to `main` when complete.

---

## Critical Constraints — Read First

Violations here cause silent failures or data loss:

- **Never remove `prepare: false`** from the Drizzle client — required for PgBouncer transaction pooling; removing it causes prepared-statement errors under load.
- **Never use `dataType: 'json'`** on the recipe create/edit forms — it is incompatible with file inputs; the current multipart pattern is intentional.
- **Always use Zod v4 syntax** — `{ error: '...' }` not `{ message: '...' }`, `.check(z.email())` not `.email()`. See [Forms](#forms-superforms--zod-v4) below.
- **Never add auth to `/api/metrics`** — it is intentionally unauthenticated for Prometheus scraping.
- **`npm run db:push` is dev-only** — never use it in production; always use `db:migrate` with a proper migration file.
- **Import `user` from `$lib/server/db/schema`**, not directly from `auth.schema.ts` — the app schema re-exports it and that is the stable import path.

---

## Commands

```bash
npm run dev           # Dev server on :5173
npm run build         # Production build
npm run preview       # Serve production build on :4173

npm run check         # Type-check (svelte-kit sync + svelte-check) — run before committing
npm run lint          # prettier --check + eslint
npm run format        # prettier --write

npm run db:push       # Push schema changes directly to DB (dev only — skips migration files)
npm run db:migrate    # Apply Drizzle migrations (uses DATABASE_URL_DIRECT, bypasses PgBouncer)
npm run db:generate   # Generate a new migration from schema changes
npm run db:studio     # Drizzle Studio GUI
npm run db:seed       # Seed dev DB (tsx, dotenv/config — run after migrations)
npm run auth:schema   # Regenerate src/lib/server/db/auth.schema.ts from better-auth config

npm run test:e2e      # Playwright tests (requires production build + full Docker stack running)
```

**Running a single Playwright test file:**
```bash
npx playwright test tests/e2e/auth.test.ts
```

**Docker dev dependencies:**
```bash
docker compose up db redis minio pgbouncer   # Start only the dependencies (no app container)
docker compose --profile full up             # Full stack including SvelteKit app on :3000
docker compose --profile monitoring up       # + Prometheus (:9090) + Grafana (:3001)
```

---

## Environment

Copy `.env.example` to `.env` — it is the canonical list of all required variables. Non-obvious values:

- `DATABASE_URL` → PgBouncer on port **5433** (transaction pooling; app always connects here)
- `DATABASE_URL_DIRECT` → PostgreSQL directly on port **5434** (migrations only — DDL is incompatible with PgBouncer transaction pooling)
- `MINIO_ENDPOINT` → internal hostname (`minio` inside Docker, `localhost` outside)
- `MINIO_PUBLIC_URL` → browser-accessible base URL — differs from `MINIO_ENDPOINT` when the app runs inside Docker
- `ORIGIN` → must match the request origin; wrong value breaks CSRF protection
- `BETTER_AUTH_SECRET` → must be 32+ characters; app will fail to start without it

PostgreSQL host port is **5434** (not 5432) — a local PostgreSQL install already occupies 5432.

---

## Architecture

**`PROJECT_KNOWLEDGE.md`** at the repo root is a living codebase reference. Read it before exploring manually — it covers schema, patterns, gotchas, and non-obvious decisions in detail.

### Request lifecycle

```
Request
  → hooks.server.ts (rate-limit → Redis session cache → auth.api.getSession → role resolution → security headers)
  → Route +layout.server.ts (redirect guard)
  → Page +page.server.ts (load / actions)
  → Svelte component
```

### Route groups

| Group | Path | Behaviour |
|---|---|---|
| `(public)/` | `/login`, `/register` | Redirects **authenticated** users → `/dashboard` |
| `(protected)/` | `/dashboard`, `/recipes/new`, `/recipes/[id]/edit`, `/recipes/[id]/delete` | Redirects **unauthenticated** users → `/login` |
| `(admin)/` | `/admin/users` | Redirects unauthenticated → `/login`, non-admins → `/dashboard`; reads `event.locals.isAdmin` (set by hooks — see [Auth pattern](#auth-pattern)) |
| `routes/recipes/` | `/recipes`, `/recipes/[id]` | No redirect — `user` is passed but optional |

`routes/recipes/` lives **outside** both layout groups and has its own layout. `/recipes/new` (protected) takes static-segment priority over `recipes/[id]` (public) — standard SvelteKit behaviour.

### Auth pattern

- `event.locals.user` / `event.locals.session` — set by `hooks.server.ts` for every request (authenticated or not).
- `event.locals.isAdmin: boolean` — set by the `handleRoles` hook immediately after session resolution; do not query `user_roles` again in page code.
- In protected pages, `event.locals.user!` is safe to non-null assert — the layout redirect guarantees it.
- `data.user` flows from `(protected)/+layout.server.ts` to all child pages via SvelteKit layout data merging.

Checking admin status in a page or layout:
```typescript
// (admin)/+layout.server.ts — already done for you
if (!event.locals.isAdmin) redirect(302, '/dashboard');

// In any other server file
if (event.locals.isAdmin) { /* show extra controls */ }
```

### Database

- Drizzle query-builder only — no `relations.ts` / relational API.
- Queries live in `src/lib/server/db/queries/recipes.ts` (recipe CRUD) and `src/lib/server/db/queries/users.ts` (user + role management).
- **Import `user` as `import { user } from '$lib/server/db/schema'`** — it is re-exported there via `export * from './auth.schema'`. Do not import from `auth.schema.ts` directly.
- Schema has **11 tables**: 4 better-auth (`user`, `session`, `account`, `verification`), 6 app (`recipes`, `ingredients`, `steps`, `tags`, `recipe_tags`, `saved_recipes`), plus `user_roles`.
- `recipes.rank` — nullable `varchar(1)`, values `S/A/B/C/D`, enforced by a DB `CHECK` constraint; set by admins only.
- `prepare: false` on the Drizzle client — required for PgBouncer transaction pooling. Never remove it.

### Forms (superforms + Zod v4)

This project uses **Zod v4** — the API differs from v3:

```typescript
z.string().check(z.email({ error: 'Invalid email' }))  // NOT .email()
z.string().min(1, { error: 'Required' })                // { error } not { message }

// Adapters
import { zod4, zod4Client } from 'sveltekit-superforms/adapters';
// Server: zod4(schema) — Client: zod4Client(schema)
```

In Svelte components, always initialise superForm with `untrack`:
```typescript
const { form, errors, enhance } = superForm(untrack(() => data.form), { validators: zod4Client(schema) });
```
This suppresses a false-positive Svelte 5 reactivity warning.

### Recipe forms (file upload + JSON arrays)

**Do not switch to `dataType: 'json'`** — it is incompatible with file inputs. The current multipart pattern is intentional:

1. `enctype="multipart/form-data"` on the form element.
2. Extract the image file from `formData` **before** calling `superValidate` — do not let superforms touch it.
3. Ingredients/steps serialised as JSON into hidden `<input type="hidden">` fields (`ingredientsJson`, `stepsJson`); parsed manually server-side.
4. Numeric fields kept as `z.string()` in the Zod schema; cast to numbers server-side.

Shared schema and helpers live in `src/lib/recipe-form.ts` (no server-only imports — safe in `.svelte` files).

### Observability endpoints

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/health` | None | Liveness probe — process-level only, no deps |
| `GET /api/ready` | None | Readiness probe — checks PostgreSQL + Redis; returns 503 when degraded |
| `GET /api/metrics` | None | Prometheus metrics (prom-client) — **must stay unauthenticated** for scraping |

### Logging

`src/lib/server/logger.ts` exports a pino singleton. Use structured logging: `logger.info({ recipeId }, 'Recipe created')`. Log level defaults to `debug` in dev, `info` in prod; override with `LOG_LEVEL` env var.
