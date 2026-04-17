# Recipe Roost — Project Plan

A food recipe web application with user authentication, full recipe CRUD, image uploads, full-text search, and bookmarking. Built to scale to ~100,000 users.

Tech stack, schema, architecture patterns, and Docker Compose services are documented in **PROJECT_KNOWLEDGE.md**.

---

## Completed Phases

| Phase | Summary |
|---|---|
| 1 — Foundation | SvelteKit scaffold, Drizzle schema + migrations, Docker Compose, `/api/health` |
| 2 — Authentication | better-auth register/login/logout, protected routes, superforms |
| 3 — Recipe CRUD | Create/edit/delete with MinIO image uploads, tags, public listing/detail, dashboard |
| 4 — Discovery & Search | FTS search, tag filtering, debounced search UI, save/bookmark system, dashboard tabs |
| 5 — Production Hardening | PgBouncer, Redis session cache, rate limiting, security headers, pino logging, Playwright e2e tests, Dockerfile, seed script |
| 6 — Deployment Readiness | Slim recipe model (dropped timing/difficulty fields), liveness + readiness probes, Prometheus metrics, Grafana Docker profile, pg_dump backup script, README |
| 7 — Role System | `user_roles` table, `isAdmin` on `App.Locals`, `handleRoles` hook, admin bypass for edit/delete, admin seed user |
| 8 — User Management Screen | `(admin)` layout group, `/admin/users` paginated table, `grantAdmin`/`revokeAdmin` actions, Admin nav link for admins |
| 9 — Search Prefix Matching | Switch `plainto_tsquery` → `to_tsquery` with `:*` prefix operator; ≥ 2-char minimum on frontend + server |

---

## Upcoming Phases

### Phase 7: Role System ✅ Complete

**Goal:** Introduce an admin role that allows designated users to edit or delete any recipe, regardless of authorship.

#### Design decisions to resolve before implementing
- Evaluated better-auth's built-in admin plugin vs. a custom `user_roles` application table. Chose custom table to keep role logic in the app layer without touching better-auth's managed schema.

#### Backend
- [x] Add `user_roles` table to schema; generate and apply migration
- [x] Extend `app.d.ts` — add `isAdmin: boolean` to `App.Locals`
- [x] Load roles in `hooks.server.ts` after session resolution via new `handleRoles` hook
- [x] Add helper `isAdmin(locals)` in `src/lib/server/roles.ts`
- [x] Update `(protected)/+layout.server.ts` to pass `isAdmin` down via layout data
- [x] Update recipe edit and delete server actions — bypass the `authorId` ownership check when the requesting user is an admin

#### Notes
- Non-admin ownership `WHERE` clause is unchanged — admin bypass is an additive path only
- Seed script creates `admin@example.com` with the `admin` role

---

### Phase 8: User Management Screen ✅ Complete

**Goal:** Provide an admin-only screen where admins can view all user accounts and manage their roles. Designed to be extensible for future admin features.

#### Routing & layout
- [x] Create a new `(admin)` layout group at `src/routes/(admin)/`
- [x] `(admin)/+layout.server.ts` — redirect non-admin users to `/dashboard` (similar pattern to `(protected)`)
- [x] `(admin)/+layout.svelte` — admin shell with header, sidebar nav, and stubbed nav links for future screens

#### User list page (`/admin/users`)
- [x] `src/routes/(admin)/admin/users/+page.server.ts`
  - Load paginated list of all users (from the `user` table)
  - Join against `user_roles` to surface current roles per user
  - Support `?page=` query param; default page size 20
- [x] `src/routes/(admin)/admin/users/+page.svelte`
  - Table: user name, email, created date, current roles, actions
  - "Grant Admin" / "Revoke Admin" form actions per row
  - Pagination controls

#### Backend actions
- [x] Named form actions `?/grantAdmin` and `?/revokeAdmin` — insert/delete from `user_roles`; prevent an admin from revoking their own role

#### Notes
- Admin cannot remove their own admin role (guard in the action)
- Admin nav link added to `(protected)/+layout.svelte` — only visible to admin users
- Future admin screens (recipe moderation, analytics) slot into the sidebar nav without restructuring the layout

---

### Phase 9: Search — Prefix Matching ✅ Complete

**Goal:** Fix partial-word search so that typing "choc", "toma", or any prefix of a word in a recipe title/description returns matching results, with search firing at ≥ 2 characters typed.

**Root cause:** `plainto_tsquery('english', q)` requires full lexeme matches after English stemming. Prefixes like "choco" don't match the stored lexeme `chocol` (the stem of "chocolate").

#### Backend
- [x] `src/lib/server/db/queries/recipes.ts` — replace `plainto_tsquery` with a prefix-aware builder that constructs `to_tsquery('english', 'word1:* & word2:* ...')` from the trimmed, whitespace-split input words (non-alphanumeric chars stripped from each word)
- [x] Apply the same change to the `ts_rank` expression in the ORDER BY clause

#### Server
- [x] `src/routes/recipes/+page.server.ts` — enforce minimum query length: only pass `q` to `listPublishedRecipes` when `q.length >= 2`; shorter values treated as no query

#### Frontend
- [x] `src/routes/recipes/+page.svelte` — in `handleSearchInput`, only call `goto` with a `q` param when `searchValue.length >= 2`; clearing to 0 chars resets the listing; 1 char does nothing

---

### Phase 10: Recipe Ranking

**Goal:** Allow recipe authors to assign an optional letter rank to their recipes, displayed everywhere the recipe appears.

**Rank values:** `S`, `A`, `B`, `C`, `D` (nullable — rank is optional)

#### Schema changes
- Add `rank varchar(1)` column to the `recipes` table with a `CHECK (rank IN ('S', 'A', 'B', 'C', 'D'))` constraint (nullable).
- Generate and apply a Drizzle migration.

#### Backend
- [ ] Update `src/lib/server/db/schema.ts` — add `rank` to the `recipes` table definition
- [ ] Run `npm run db:generate` then `npm run db:migrate`
- [ ] Update `src/lib/recipe-form.ts` — add optional `rank` field (`z.enum(['S','A','B','C','D']).nullable().optional()`)
- [ ] Update query functions in `src/lib/server/db/queries/recipes.ts` to select and write `rank`
- [ ] Update create and edit server actions to pass `rank` through to the DB

#### UI
- [ ] Add rank selector to create form (`(protected)/recipes/new/`) — dropdown or button group for S/A/B/C/D + a "No rank" / clear option
- [ ] Add rank selector to edit form (`(protected)/recipes/[id]/edit/`) — pre-populate with existing value
- [ ] Display rank badge on public recipe listing (`src/routes/recipes/+page.svelte`)
- [ ] Display rank badge on recipe detail page (`src/routes/recipes/[id]/+page.svelte`)
- [ ] Rank selector is only rendered for the recipe author (edit form is already author-gated; display is read-only everywhere)
