# Recipe Roost — Project Knowledge

A living reference document capturing codebase structure, patterns, and non-obvious decisions.
Update this file whenever you learn something new rather than re-exploring.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | SvelteKit 2.x (`@sveltejs/adapter-node`) | `^2.57` |
| Language | TypeScript (strict) | — |
| ORM | Drizzle ORM + Drizzle Kit | `^0.45` / `^0.31` |
| DB Driver | postgres.js | `^3.4` |
| Auth | better-auth (email/password, cookie sessions) | `~1.4.21` |
| Styling | Tailwind CSS v4 | `^4.2` |
| Forms | Zod v4 + sveltekit-superforms | `^4.3` / `^2.30` |
| File storage | MinIO via `@aws-sdk/client-s3` | `^3.1029` |
| Session cache | Redis (`ioredis`) | `^5.10` |
| DB pooling | PgBouncer (Docker) | — |
| Database | PostgreSQL 17 | — |

---

## Key Environment Variables

Defined in `.env` (copy from `.env.example`):

```
# App DB connection — routes through PgBouncer (transaction pooling)
DATABASE_URL=postgres://recipe_user:secret@localhost:5433/recipe_roost
# Direct DB connection — used only by drizzle-kit migrations (DDL bypasses PgBouncer)
DATABASE_URL_DIRECT=postgres://recipe_user:secret@localhost:5434/recipe_roost
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=localhost          # internal hostname (Docker: minio)
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=recipe-roost
MINIO_PUBLIC_URL=http://localhost:9000   # browser-accessible URL
ORIGIN=http://localhost:5173
BETTER_AUTH_SECRET=<32+ char secret>
LOG_LEVEL=debug                   # optional; defaults: debug (dev), info (prod)
```

**Docker note:** `MINIO_ENDPOINT` is the internal hostname (`minio` inside Docker, `localhost` outside). `MINIO_PUBLIC_URL` is the browser-accessible URL — these differ when running the app inside Docker while the browser hits it from the host.

**Port quirk:** PostgreSQL host port is `5434` (not `5432`) because a local PostgreSQL install was already using 5432. PgBouncer listens on `5433` (both host and internal).

**PgBouncer note:** The app always connects via PgBouncer (`DATABASE_URL` → port 5433). `prepare: false` is set in `db/index.ts` — required for PgBouncer transaction pooling mode. Drizzle Kit migrations use `DATABASE_URL_DIRECT` to bypass PgBouncer (DDL is not compatible with transaction pooling).

---

## Directory Structure

```
src/
├── app.d.ts                          # App.Locals: user, session (better-auth types)
├── hooks.server.ts                   # Rate limiting → session cache → security headers (sequence)
├── lib/
│   ├── recipe-form.ts                # Shared Zod schema + helpers for create/edit forms
│   └── server/
│       ├── auth.ts                   # better-auth config (drizzleAdapter + sveltekitCookies)
│       ├── logger.ts                 # pino singleton — structured JSON logging
│       ├── redis.ts                  # ioredis singleton — session cache + rate limiting
│       ├── rate-limit.ts             # Redis sliding-window rate limiter
│       ├── storage.ts                # MinIO S3 client: uploadImage, deleteImageByUrl
│       ├── metrics.ts                # prom-client registry: HTTP counters/histograms, recipe ops
│       └── db/
│           ├── index.ts              # Drizzle client (postgres.js, prepare:false for PgBouncer)
│           ├── schema.ts             # All app tables + re-exports auth.schema
│           ├── auth.schema.ts        # better-auth managed tables (DO NOT EDIT manually)
│           ├── seed.ts               # Dev seed script — run via `npm run db:seed`
│           └── queries/
│               └── recipes.ts        # Typed query functions for recipe CRUD
tests/
└── e2e/
    ├── auth.test.ts                  # Register/login/logout Playwright tests
    └── recipes.test.ts               # Browse, search, security headers Playwright tests
scripts/
└── backup.sh                         # pg_dump backup — timestamped archives in ./backups/
prometheus.yml                        # Prometheus scrape config (monitoring Docker profile)
├── routes/
│   ├── +layout.svelte               # Root layout (favicon only)
│   ├── +page.server.ts              # Redirects / → /dashboard or /login
│   ├── api/health/+server.ts        # GET /api/health — DB connectivity check
│   ├── sign-out/+page.server.ts     # POST action → better-auth sign out
│   ├── (public)/                    # Layout group: redirects AUTHENTICATED users → /dashboard
│   │   ├── +layout.server.ts
│   │   ├── login/                   # /login
│   │   └── register/                # /register
│   ├── (protected)/                 # Layout group: redirects UNAUTHENTICATED users → /login
│   │   ├── +layout.server.ts        # Returns { user } for all protected pages
│   │   ├── +layout.svelte           # App header with brand, Browse, My Recipes, New Recipe nav
│   │   ├── dashboard/               # /dashboard — My Recipes list + Phase 4 placeholders
│   │   └── recipes/
│   │       ├── new/                 # /recipes/new — create form
│   │       └── [id]/
│   │           ├── edit/            # /recipes/[id]/edit — edit form
│   │           └── delete/          # /recipes/[id]/delete — delete action (no page)
│   └── recipes/                     # Public (no auth redirect)
│       ├── +layout.server.ts        # Returns { user: locals.user ?? null }
│       ├── +layout.svelte           # Public header (conditional auth nav)
│       ├── +page.*                  # /recipes — paginated published listing
│       └── [id]/+page.*             # /recipes/[id] — single recipe view
drizzle/
└── 0000_tiny_bucky.sql              # Single migration: all 10 tables + FTS trigger + GIN index
```

---

## Database Schema (10 tables)

**better-auth managed** (do not modify via Drizzle migrations):
- `user` — id (text PK), name, email, email_verified, image, created_at, updated_at
- `session` — id (text PK), expires_at, token, user_id (FK)
- `account` — id (text PK), user_id (FK), provider credentials
- `verification` — id (text PK), identifier, value, expires_at

**Application tables** (uuid PKs, cascade deletes):
- `recipes` — authorId (text FK → user.id), title, description, imageUrl, isPublished, searchVector (tsvector), timestamps
- `ingredients` — recipeId (FK), name, quantity, unit, sortOrder
- `steps` — recipeId (FK), stepNumber, instruction, imageUrl
- `tags` — id, name (unique)
- `recipe_tags` — (recipeId, tagId) composite PK
- `saved_recipes` — (userId, recipeId) composite PK, savedAt

**Key indexes:** GIN on `recipes.search_vector`, btree on `recipes.author_id`, `recipes.created_at`, `recipe_tags.tag_id`

**FTS trigger:** `recipes_search_vector_trigger` — fires BEFORE INSERT OR UPDATE of title/description; populates `search_vector` with weighted tsvector (title=A, description=B).

---

## Auth Pattern

**Session resolution** (`hooks.server.ts`):
```typescript
const session = await auth.api.getSession({ headers: event.request.headers });
if (session) {
  event.locals.session = session.session;
  event.locals.user = session.user;
}
```

**Protecting routes** — use layout `+layout.server.ts`:
```typescript
// (protected)/+layout.server.ts
if (!event.locals.user) redirect(302, '/login');
return { user: event.locals.user };
```

**Accessing user in protected pages:** `event.locals.user!` (non-null asserted — guaranteed by layout redirect). The `data.user` flows from the protected layout to all child pages via SvelteKit's layout data merging.

**better-auth API:**
```typescript
await auth.api.signInEmail({ body: { email, password } });
await auth.api.signUpEmail({ body: { name, email, password } });
// Sign out via the /sign-out route's form action
```

---

## Zod v4 Patterns

This project uses **Zod v4**. Key differences from v3:

```typescript
// Email validation (v3 .email() is deprecated in v4)
z.string().check(z.email({ error: 'Invalid email' }))

// Error messages use { error: '...' } not { message: '...' }
z.string().min(1, { error: 'Required' })

// superforms adapters
import { zod4, zod4Client } from 'sveltekit-superforms/adapters';
// Server: zod4(schema)
// Client: zod4Client(schema)
```

---

## Form Pattern (superforms)

**Server:**
```typescript
export const load = async () => ({
  form: await superValidate(zod4(schema))
});

export const actions = {
  default: async (event) => {
    const form = await superValidate(event, zod4(schema));
    if (!form.valid) return fail(400, { form });
    // ... business logic
    return message(form, 'Error text', { status: 400 });
    // or: return redirect(302, '/somewhere');
  }
};
```

**Client:**
```svelte
<script>
  import { untrack } from 'svelte';
  // untrack() suppresses a false-positive Svelte 5 reactivity warning on superForm init
  const { form, errors, message, enhance, submitting } = superForm(
    untrack(() => data.form),
    { validators: zod4Client(schema) }
  );
</script>

<form method="post" use:enhance>
  <input bind:value={$form.fieldName} name="fieldName" />
  {#if $errors.fieldName}<p>{$errors.fieldName}</p>{/if}
  {#if $message}<p>{$message}</p>{/if}
</form>
```

**Checkboxes (boolean fields):**
```svelte
<input type="checkbox" name="isPublished" bind:checked={$form.isPublished} />
```
`z.boolean().default(false)` works — superforms coerces "on"/absent to true/false.

**File uploads + JSON arrays** — can't mix `dataType: 'json'` with file inputs. Pattern used in recipe forms:
1. Numeric fields kept as `z.string()` in schema, parsed manually server-side
2. Ingredients/steps as Svelte `$state` arrays, serialised to hidden `<input type="hidden">` fields as JSON
3. Image as a plain `<input type="file" name="image">` extracted from `formData.get('image')` BEFORE passing formData to `superValidate`
4. Form uses `enctype="multipart/form-data"`

---

## Recipe Form Architecture

Shared schema/helpers at [src/lib/recipe-form.ts](src/lib/recipe-form.ts) — safe to import in both `+page.server.ts` and `+page.svelte` (no server-only deps).

**Server-side flow:**
```typescript
const formData = await event.request.formData(); // call ONCE, pass to superValidate
const form = await superValidate(formData, zod4(recipeFormSchema));

const parsedIngredients = ingredientRowSchema.parse(JSON.parse(form.data.ingredientsJson));
const parsedSteps = stepRowSchema.parse(JSON.parse(form.data.stepsJson));

const imageFile = formData.get('image') as File | null;
const imageUrl = imageFile?.size > 0 ? await uploadImage(imageFile) : null;
```

**Numeric field parsing helper:**
```typescript
function parseOptionalPositiveInt(s: string): number | null {
  const n = parseInt(s.trim(), 10);
  return s.trim() !== '' && !isNaN(n) && n >= 0 ? n : null;
}
```

---

## Drizzle Query Pattern

No relational API (no `relations.ts`) — uses explicit query builder throughout:

```typescript
import { db } from '$lib/server/db';
import { recipes, user } from '$lib/server/db/schema';
import { eq, desc, and, count as sqlCount } from 'drizzle-orm';

// Select with join
const rows = await db
  .select({ id: recipes.id, authorName: user.name, ... })
  .from(recipes)
  .leftJoin(user, eq(recipes.authorId, user.id))
  .where(eq(recipes.isPublished, true))
  .orderBy(desc(recipes.createdAt))
  .limit(limit)
  .offset(offset);

// Insert returning
const [recipe] = await db.insert(recipes).values({ ... }).returning();

// Update with ownership check
const [updated] = await db
  .update(recipes)
  .set({ title, updatedAt: new Date() })
  .where(and(eq(recipes.id, id), eq(recipes.authorId, authorId)))
  .returning();

// Delete returning (to get imageUrl for cleanup)
const [deleted] = await db
  .delete(recipes)
  .where(and(eq(recipes.id, id), eq(recipes.authorId, authorId)))
  .returning({ id: recipes.id, imageUrl: recipes.imageUrl });
```

**`user` table import:** re-exported from `src/lib/server/db/schema.ts` via `export * from './auth.schema'`. Import as `import { user } from '$lib/server/db/schema'`.

Left-join on `user` yields `authorName: string | null` — use `?? 'Unknown'` since cascade delete means null is impossible at runtime but TypeScript doesn't know this.

---

## MinIO / Storage

Client at [src/lib/server/storage.ts](src/lib/server/storage.ts) — lazy singleton, auto-creates bucket on first upload.

```typescript
import { uploadImage, deleteImageByUrl } from '$lib/server/storage';

// Upload (returns full public URL, stored in recipes.image_url)
const imageUrl = await uploadImage(file); // File object from formData

// Delete (extracts key from URL automatically)
await deleteImageByUrl(existingImageUrl);
```

Image URLs are stored as full URLs (e.g., `http://localhost:9000/recipe-roost/images/uuid.jpg`). `MINIO_PUBLIC_URL` overrides the base for browser access.

---

## Route Layout Groups — Gotchas

**`(public)/` group** — redirects AUTHENTICATED users to `/dashboard`. Contains login/register only. Do NOT put recipe browse pages here.

**`(protected)/` group** — redirects UNAUTHENTICATED users to `/login`. Auth checked in `+layout.server.ts`.

**Public recipe pages** (`src/routes/recipes/`) live OUTSIDE both groups with their own layout. They receive `user` from `+layout.server.ts` but do not redirect.

**Route priority for `/recipes/new`:** Static segment `new` takes priority over dynamic `[id]`, so `(protected)/recipes/new` correctly wins over `recipes/[id]` even though both exist under `/recipes/`. This is standard SvelteKit behaviour.

**Accessing auth user in public routes:** `event.locals.user` is populated by `hooks.server.ts` for ALL requests — public routes can check it without going through the protected layout.

---

## NPM Scripts

```
npm run dev          # SvelteKit dev server (port 5173)
npm run build        # Production build
npm run check        # svelte-kit sync + svelte-check (type checking) — run before committing
npm run db:migrate   # drizzle-kit migrate (requires DATABASE_URL in env)
npm run db:studio    # Drizzle Studio GUI
npm run auth:schema  # Regenerate src/lib/server/db/auth.schema.ts from better-auth config
```

---

## Docker Compose Services

```
docker compose up db redis minio   # Local dev dependencies only (no app container)
docker compose --profile full up   # Full stack including app container
```

| Service | Image | Host Port | Purpose |
|---|---|---|---|
| `db` | postgres:17-alpine | **5434** → 5432 | PostgreSQL 17 |
| `pgbouncer` | bitnami/pgbouncer | 5433 | Connection pooling |
| `redis` | redis:7-alpine | 6379 | Session cache + rate limiting |
| `minio` | minio/minio | 9000 (API), 9001 (console) | File storage |
| `app` | SvelteKit Node | 3000 | App (profile: full) |

MinIO console: `http://localhost:9001` (login: `minioadmin` / `minioadmin`)

---

## Completed Phases

| Phase | Status | Summary |
|---|---|---|
| 1 — Foundation | ✅ | Scaffold, Drizzle, schema, migrations, Docker Compose, `/api/health` |
| 2 — Authentication | ✅ | better-auth register/login/logout, protected routes, superforms |
| 3 — Recipe CRUD | ✅ | Full CRUD with images, tags, public listing/detail, dashboard |
| 4 — Discovery & Search | ✅ | FTS search (`plainto_tsquery`), tag/difficulty/prepTime filters, debounced search UI, save/unsave bookmarks, dashboard tabs |
| 5 — Production Hardening | ✅ | PgBouncer (`prepare:false`), Redis session cache, sliding-window rate limiter, security headers, pino logging, Cache-Control, seed script, Dockerfile, dev compose, Playwright tests |
| 6 — Deployment Readiness | ✅ | Slim recipe model (dropped prepTime/cookTime/servings/difficulty), liveness + readiness probes, Prometheus metrics, Grafana Docker profile, pg_dump backup script, full README |
