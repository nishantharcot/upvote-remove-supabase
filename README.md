# Upvote

A feature voting board (submit ideas, upvote/downvote, comment, track status).  
This version uses **plain Postgres** and **TanStack Start server functions** — no Supabase.

## Architecture

```
Browser
   │
   ▼
TanStack Start (React + SSR + server functions)   ← single app process
   │
   ▼
Drizzle ORM
   │
   ▼
Postgres (Docker: upvote-postgres on port 5433)
```

There is **no separate backend server**. `npm run dev` starts the UI and API together.

---

## Prerequisites

Install these before you begin:

| Tool | Version | Check |
|------|---------|--------|
| [Node.js](https://nodejs.org/) | 22+ | `node -v` |
| npm | 10+ | `npm -v` |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | latest | `docker info` |
| `psql` (Postgres client) | any | `psql --version` |

`psql` is only needed once to create tables. On macOS:

```bash
brew install libpq
brew link --force libpq   # if psql is not found
```

---

## Setup (first time)

Run each step from the project root.

### Step 1 — Clone and enter the project

```bash
cd /path/to/upvote-remove-supabase
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Start Postgres

```bash
docker run -d \
  --name upvote-postgres \
  -p 5433:5432 \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=upvote \
  -v upvote_postgres_data:/var/lib/postgresql/data \
  postgres:16
```

**Verify the container is running:**

```bash
docker ps --filter name=upvote-postgres
```

You should see port `5433->5432`.

> **Already created the container?** Start it with `docker start upvote-postgres`.

> **Port 5433 in use?** Change `-p 5433:5432` to another host port (e.g. `5434:5432`) and use that port in `.env` below.

### Step 4 — Create environment file

```bash
cp .env.example .env
```

Default contents:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/upvote
```

Change the port in `.env` if you mapped a different host port in Step 3.

### Step 5 — Create database tables

```bash
PGPASSWORD=postgres psql "postgresql://postgres:postgres@127.0.0.1:5433/upvote" -f db/init.sql
```

**Verify tables exist:**

```bash
PGPASSWORD=postgres psql "postgresql://postgres:postgres@127.0.0.1:5433/upvote" -c "\dt"
```

Expected tables: `users`, `sessions`, `feature_requests`, `votes`, `comments`, `user_roles`.

### Step 6 — Start the app

```bash
npm run dev
```

Open the URL printed in the terminal (usually **http://localhost:8080**; if that port is busy, Vite picks the next one, e.g. 8081).

### Step 7 — Create an account and test

1. On the landing page, scroll to **Get started** (or sign in section).
2. **Sign up** with email and password.
3. Submit a feature idea, upvote it, open it and add a comment.

If all of that works, setup is complete.

---

## Daily workflow

```bash
# 1. Start Postgres (if not already running)
docker start upvote-postgres

# 2. Start the app
cd /path/to/upvote-remove-supabase
npm run dev
```

Stop the app with `Ctrl+C`. Postgres keeps running in Docker until you stop it:

```bash
docker stop upvote-postgres
```

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Postgres connection string for server functions |

Example:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/upvote
```

---

## Project layout

| Path | Purpose |
|------|---------|
| `db/init.sql` | Postgres schema (run once on fresh DB) |
| `src/db/schema.ts` | Drizzle table definitions |
| `src/db/index.ts` | Database client |
| `src/server/session.ts` | Cookie-based auth sessions |
| `src/server/functions/auth.ts` | Sign up, sign in, sign out |
| `src/server/functions/feature-requests.ts` | CRUD for ideas |
| `src/server/functions/votes.ts` | Upvote / downvote |
| `src/server/functions/comments.ts` | Comments |
| `src/hooks/` | React hooks that call server functions |
| `src/components/` | UI (board, landing page, auth) |

---

## Make a user admin (optional)

Sign up first, then find your user id:

```bash
PGPASSWORD=postgres psql "postgresql://postgres:postgres@127.0.0.1:5433/upvote" \
  -c "SELECT id, email FROM users;"
```

Grant admin role:

```sql
INSERT INTO user_roles (user_id, role) VALUES ('<your-user-uuid>', 'admin');
```

---

## Troubleshooting

### `connection refused` or database errors

- Postgres not running → `docker start upvote-postgres`
- Wrong port → check `docker ps` and match `.env`
- Tables missing → re-run Step 5 (`db/init.sql`)

### `psql: command not found`

```bash
brew install libpq
brew link --force libpq
```

### Port 8080 already in use

Vite automatically tries the next port. Use whatever URL it prints.

### `docker: container name already in use`

Container already exists — start it instead:

```bash
docker start upvote-postgres
```

To recreate from scratch (deletes data):

```bash
docker rm -f upvote-postgres
docker volume rm upvote_postgres_data
# then repeat Step 3 and Step 5
```

### Sign up works but board is empty after refresh

- Check `.env` `DATABASE_URL` matches your Postgres container
- Restart `npm run dev` after changing `.env`

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (UI + API) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run db:init` | Apply `db/init.sql` (requires `DATABASE_URL` exported in shell) |

---

## Differences from the original Supabase `upvote` template

| Original | This project |
|----------|--------------|
| Supabase client from browser | TanStack server functions |
| Supabase Auth | Email/password + session cookie |
| Supabase RLS | Authorization in server code |
| Supabase Realtime | Polling every 10 seconds |
| Google OAuth (Lovable) | Not included |

---

## Production notes

- Replace session secret / cookie settings for production hardening.
- Use a managed Postgres (Neon, RDS, etc.) and set `DATABASE_URL` accordingly.
- Cloudflare Workers deploy may need a serverless Postgres driver (e.g. Neon) — local dev uses the `postgres` package via Node.
