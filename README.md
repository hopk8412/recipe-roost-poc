# Recipe Roost

A full-stack recipe web application with user authentication, full recipe CRUD, image uploads, full-text search, and bookmarking. Built to scale to ~100,000 users.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | SvelteKit 2.x (`@sveltejs/adapter-node`) |
| Language | TypeScript (strict) |
| ORM | Drizzle ORM + Drizzle Kit |
| Auth | better-auth (email/password, cookie sessions) |
| Styling | Tailwind CSS v4 |
| Forms | Zod v4 + sveltekit-superforms |
| File storage | MinIO (S3-compatible, Docker) |
| Session cache | Redis |
| Connection pooling | PgBouncer |
| Database | PostgreSQL 17 |
| Observability | pino (logging) + prom-client (metrics) |

---

## Quickstart (local development)

### Prerequisites

- [Node.js 22+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 1. Clone and install

```bash
git clone <repo-url>
cd recipe-roost
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set a strong `BETTER_AUTH_SECRET` (32+ chars). Everything else works out of the box for local development.

### 3. Start infrastructure

```bash
docker compose up db redis minio pgbouncer
```

This starts PostgreSQL (port 5434), PgBouncer (port 5433), Redis (port 6379), and MinIO (port 9000 / console 9001).

### 4. Run database migrations

```bash
npm run db:migrate
```

### 5. (Optional) Seed sample data

```bash
npm run db:seed
```

Inserts two demo users and five sample recipes.

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## NPM Scripts

| Script | Description |
|---|---|
| `npm run dev` | SvelteKit dev server with hot reload (port 5173) |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build locally (port 4173) |
| `npm run check` | TypeScript + Svelte type check — run before committing |
| `npm run db:migrate` | Apply pending Drizzle migrations |
| `npm run db:seed` | Insert sample users and recipes |
| `npm run db:studio` | Open Drizzle Studio GUI |
| `npm run test:e2e` | Run Playwright integration tests (requires `npm run build` first) |
| `npm run auth:schema` | Regenerate better-auth schema from config |

---

## Docker Compose Profiles

### Local development (infrastructure only)

```bash
docker compose up db redis minio pgbouncer
```

### Full stack (production image)

```bash
docker compose --profile full up
```

### Dev server with hot reload (no local Node required)

```bash
docker compose -f compose.yaml -f docker-compose.dev.yml up
```

### Monitoring (Prometheus + Grafana)

```bash
docker compose --profile monitoring up
```

- Prometheus: [http://localhost:9090](http://localhost:9090)
- Grafana: [http://localhost:3001](http://localhost:3001) (admin / admin)
- Metrics endpoint: [http://localhost:3000/api/metrics](http://localhost:3000/api/metrics)

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values. All variables are required unless marked optional.

| Variable | Default (dev) | Description |
|---|---|---|
| `DATABASE_URL` | `postgres://recipe_user:secret@localhost:5433/recipe_roost` | App DB connection — routes through PgBouncer (transaction pooling). |
| `DATABASE_URL_DIRECT` | `postgres://recipe_user:secret@localhost:5434/recipe_roost` | Direct DB connection used by Drizzle migrations. Bypasses PgBouncer (required — DDL is incompatible with transaction pooling). |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string for session cache and rate limiting. |
| `MINIO_ENDPOINT` | `localhost` | MinIO hostname. Use `minio` inside Docker. |
| `MINIO_PORT` | `9000` | MinIO API port. |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key. |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO secret key. Change in production. |
| `MINIO_BUCKET` | `recipe-roost` | S3 bucket name. Auto-created on first upload. |
| `MINIO_PUBLIC_URL` | `http://localhost:9000` | Browser-accessible MinIO base URL. Differs from `MINIO_ENDPOINT` when the app runs inside Docker. |
| `ORIGIN` | `http://localhost:5173` | SvelteKit origin. Must match the URL your app is served from. |
| `BETTER_AUTH_SECRET` | *(required)* | Secret for signing session tokens. Generate with `openssl rand -hex 32`. |
| `LOG_LEVEL` | `debug` (dev) / `info` (prod) | Pino log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal`. Optional. |

---

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/health` | Liveness probe — returns `200 { status: "ok" }` if the process is running. |
| `GET /api/ready` | Readiness probe — checks DB + Redis. Returns `200` when all dependencies are up, `503` with details when degraded. |
| `GET /api/metrics` | Prometheus metrics (text format). Restrict to internal networks in production. |

---

## Database Migrations

Migrations live in `drizzle/`. Apply them with:

```bash
npm run db:migrate
```

> **Note:** Migrations use `DATABASE_URL_DIRECT` to connect directly to PostgreSQL, bypassing PgBouncer. DDL statements (`CREATE TABLE`, `ALTER TABLE`, etc.) are not compatible with PgBouncer transaction pooling.

---

## Backups

```bash
./scripts/backup.sh
```

Creates a timestamped `pg_dump` archive in `./backups/`. Prunes dumps older than 30 days (configurable via `RETENTION_DAYS`). See the script header for cron setup instructions.

---

## Production Dockerfile

A multi-stage Dockerfile is included:

```bash
docker build -t recipe-roost .
docker run -p 3000:3000 --env-file .env recipe-roost
```

The final image is based on `node:22-alpine` and runs as a non-root user.
