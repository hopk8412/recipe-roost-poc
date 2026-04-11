# Recipe Roost

A full-stack food recipe web application built with SvelteKit. Users can register, create and manage recipes with ingredients and step-by-step instructions, upload photos, search recipes by keyword or tag, and bookmark their favorites.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | SvelteKit 2.x + TypeScript (strict) |
| Database | PostgreSQL 17 |
| ORM | Drizzle ORM + Drizzle Kit |
| Auth | better-auth (email/password, cookie sessions) |
| Styling | Tailwind CSS v4 |
| Forms | Zod + sveltekit-superforms |
| File storage | MinIO (S3-compatible) |
| Session cache | Redis |
| Connection pooling | PgBouncer |
| Local dev | Docker + Docker Compose |

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Local Development

### 1. Install dependencies

```sh
npm install
```

### 2. Configure environment

```sh
cp .env.example .env
```

Edit `.env` if needed. The defaults work out of the box with the Docker services below.

> **Note:** PostgreSQL is exposed on host port **5434** (not 5432) to avoid conflicts with any locally installed PostgreSQL instance.

### 3. Start infrastructure services

```sh
docker compose up db redis minio pgbouncer -d
```

This starts:
- PostgreSQL 17 — port 5434 (host) / 5432 (internal)
- PgBouncer connection pooler — port 5433
- Redis — port 6379
- MinIO object storage — port 9000 (API), 9001 (console)

### 4. Run database migrations

```sh
npm run db:migrate
```

### 5. Start the development server

```sh
npm run dev
```

The app is available at [http://localhost:5173](http://localhost:5173).

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build locally |
| `npm run check` | Type-check with `svelte-check` |
| `npm run lint` | Check formatting and lint |
| `npm run format` | Auto-format all files with Prettier |
| `npm run db:migrate` | Apply pending Drizzle migrations |
| `npm run db:generate` | Generate a new migration from schema changes |
| `npm run db:push` | Push schema directly to DB (dev only, skips migration files) |
| `npm run db:studio` | Open Drizzle Studio (visual DB browser) |
| `npm run auth:schema` | Regenerate the better-auth schema file from auth config |

## Docker Services

| Service | Image | Host Port(s) |
|---|---|---|
| `db` | postgres:17-alpine | 5434 |
| `pgbouncer` | bitnami/pgbouncer | 5433 |
| `redis` | redis:7-alpine | 6379 |
| `minio` | minio/minio | 9000 (API), 9001 (console) |
| `app` | (built locally) | 3000 |

### MinIO Console

The MinIO web console is available at [http://localhost:9001](http://localhost:9001) when the service is running.
Default credentials: `minioadmin` / `minioadmin`

### Running everything via Docker (full stack)

A Dockerfile is planned for Phase 5. Once built, the full stack (including the app container) can be started with:

```sh
docker compose --profile full up
```

## Database

Migrations live in [`drizzle/`](drizzle/) and are applied with `npm run db:migrate`.

### Schema overview

| Table | Managed by | Description |
|---|---|---|
| `user` | better-auth | Registered users |
| `session` | better-auth | Active login sessions |
| `account` | better-auth | Auth provider accounts (email/password) |
| `verification` | better-auth | Email verification tokens |
| `recipes` | app | Recipe metadata and content |
| `ingredients` | app | Per-recipe ingredient list |
| `steps` | app | Ordered recipe steps |
| `tags` | app | Searchable tags |
| `recipe_tags` | app | Recipe ↔ tag join table |
| `saved_recipes` | app | User bookmarks |

Recipes support PostgreSQL full-text search via a `tsvector` column populated automatically by a database trigger on insert/update.

## Project Structure

```
src/
├── lib/
│   ├── server/
│   │   ├── auth.ts          # better-auth configuration
│   │   └── db/
│   │       ├── index.ts     # Drizzle instance (postgres.js driver)
│   │       ├── schema.ts    # Application table definitions
│   │       └── auth.schema.ts  # better-auth table definitions (generated)
│   └── index.ts
├── routes/
│   └── api/
│       └── health/          # GET /api/health — liveness check
├── hooks.server.ts          # Session resolution on every request
└── app.d.ts                 # TypeScript types for App.Locals
drizzle/                     # Migration SQL files
compose.yaml                 # Docker Compose service definitions
drizzle.config.ts            # Drizzle Kit config
```

## Implementation Status

See [PLAN.md](PLAN.md) for the full roadmap and per-phase progress.

| Phase | Description | Status |
|---|---|---|
| 1 | Foundation — scaffold, schema, Docker, health check | Complete |
| 2 | Authentication — register, login, logout, protected routes | Pending |
| 3 | Recipe CRUD — create, view, edit, delete, image upload | Pending |
| 4 | Discovery — full-text search, tag filters, bookmarks | Pending |
| 5 | Production hardening — rate limiting, logging, Dockerfile | Pending |
| 6 | Deployment readiness — metrics, backups, documentation | Pending |
