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

### Phase 8: User Management Screen

**Goal:** Provide an admin-only screen where admins can view all user accounts and manage their roles. Designed to be extensible for future admin features.

#### Routing & layout
- [ ] Create a new `(admin)` layout group at `src/routes/(admin)/`
- [ ] `(admin)/+layout.server.ts` — redirect non-admin users to `/dashboard` (similar pattern to `(protected)`)
- [ ] `(admin)/+layout.svelte` — admin shell layout with a sidebar or top nav; stub navigation links so future admin screens can be added without restructuring the layout

#### User list page (`/admin/users`)
- [ ] `src/routes/(admin)/admin/users/+page.server.ts`
  - Load paginated list of all users (from the `user` table)
  - Join against `user_roles` to surface current roles per user
  - Support `?page=` query param; default page size 20
- [ ] `src/routes/(admin)/admin/users/+page.svelte`
  - Table: user name, email, created date, current roles, actions
  - "Grant admin" / "Revoke admin" form actions per row (superforms or plain POST actions)
  - Pagination controls

#### Backend actions
- [ ] Named form actions `?/grantAdmin` and `?/revokeAdmin` — insert/delete from `user_roles`; prevent an admin from revoking their own role

#### Notes
- Admin cannot remove their own admin role (guard in the action)
- The admin layout's sidebar nav is intentionally stubbed with placeholders — future screens (e.g., recipe moderation, analytics) should slot in without requiring a layout rewrite

---

### Phase 9: Recipe Ranking

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
