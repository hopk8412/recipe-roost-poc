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

## Commands

```bash
npm run dev           # Dev server on :5173
npm run build         # Production build
npm run preview       # Serve production build on :4173

npm run check         # Type-check (svelte-kit sync + svelte-check) — run before committing
npm run lint          # prettier --check + eslint
npm run format        # prettier --write

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

Copy `.env.example` to `.env`. Key non-obvious values:

- `DATABASE_URL` → PgBouncer on port **5433** (transaction pooling)
- `DATABASE_URL_DIRECT` → PostgreSQL directly on port **5434** (migrations only — DDL is incompatible with PgBouncer transaction pooling)
- `MINIO_ENDPOINT` → internal hostname (`minio` inside Docker, `localhost` outside)
- `MINIO_PUBLIC_URL` → browser-accessible base URL — differs from `MINIO_ENDPOINT` when the app runs inside Docker

PostgreSQL is mapped to host port **5434** (not 5432) because a local PostgreSQL install already uses 5432.

---

## Architecture

**`PROJECT_KNOWLEDGE.md`** at the repo root is a living codebase reference. Read it before exploring manually — it covers schema, patterns, gotchas, and non-obvious decisions in detail.

### Request lifecycle

```
Request
  → hooks.server.ts (rate-limit → Redis session cache → auth.api.getSession → security headers)
  → Route +layout.server.ts (redirect guard)
  → Page +page.server.ts (load / actions)
  → Svelte component
```

### Route groups

| Group | Path | Behaviour |
|---|---|---|
| `(public)/` | `/login`, `/register` | Redirects **authenticated** users → `/dashboard` |
| `(protected)/` | `/dashboard`, `/recipes/new`, `/recipes/[id]/edit`, `/recipes/[id]/delete` | Redirects **unauthenticated** users → `/login` |
| `routes/recipes/` | `/recipes`, `/recipes/[id]` | No redirect — `user` is passed but optional |

`routes/recipes/` lives **outside** both layout groups and has its own layout. `/recipes/new` (protected) takes static-segment priority over `recipes/[id]` (public) — standard SvelteKit behaviour.

### Auth pattern

Session is resolved globally in `hooks.server.ts` and placed on `event.locals.user` / `event.locals.session`. Protected pages access `event.locals.user!` (non-null — guaranteed by the layout redirect). `data.user` flows to child pages via SvelteKit layout data merging.

### Database

Drizzle query-builder only — no `relations.ts` / relational API. All queries live in `src/lib/server/db/queries/recipes.ts`. The `user` table is managed by better-auth; import it as `import { user } from '$lib/server/db/schema'` (re-exported via `export * from './auth.schema'`).

`prepare: false` is set on the Drizzle client — required for PgBouncer transaction pooling mode. Never remove it.

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

`dataType: 'json'` cannot be mixed with file inputs. The recipe create/edit forms use:

1. Ingredients and steps as Svelte `$state` arrays, serialised into hidden `<input type="hidden">` fields as JSON (`ingredientsJson`, `stepsJson`)
2. Image as a plain `<input type="file" name="image">` extracted from `formData` **before** passing to `superValidate`
3. Numeric fields kept as `z.string()` in the Zod schema, parsed manually server-side
4. `enctype="multipart/form-data"` on the form element

Shared schema and helpers live in `src/lib/recipe-form.ts` (no server-only imports — safe in `.svelte` files).

### Observability endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Liveness probe — process-level only, no deps |
| `GET /api/ready` | Readiness probe — checks PostgreSQL + Redis; returns 503 when degraded |
| `GET /api/metrics` | Prometheus metrics (prom-client) |

### Logging

`src/lib/server/logger.ts` exports a pino singleton. Use structured logging: `logger.info({ recipeId }, 'Recipe created')`. Log level defaults to `debug` in dev, `info` in prod; override with `LOG_LEVEL` env var.
