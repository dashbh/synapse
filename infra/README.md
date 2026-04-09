# Infra — Docker Compose

Containerizes FE + BE for local dev and production. Database stays in hosted Supabase (no local DB container).

---

## Prerequisites

- Docker Desktop ≥ 4.x (Compose v2 built in)
- A root-level `.env` file (copy `.env.example` and fill in values)

---

## Setup

```bash
# From repo root
cp .env.example .env
# Edit .env — fill in OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
```

---

## Development (hot reload)

```bash
docker compose -f infra/docker-compose.yml --profile dev up --build
```

- Frontend: http://localhost:3000 — Next.js hot reload active
- Backend:  http://localhost:8000 — Uvicorn --reload active
- Edit files under `frontend/src/` or `backend/` and changes apply immediately

**Logs:**
```bash
docker compose -f infra/docker-compose.yml --profile dev logs -f
```

**Stop:**
```bash
docker compose -f infra/docker-compose.yml --profile dev down
```

---

## Production (local smoke test)

```bash
docker compose -f infra/docker-compose.yml --profile prod up --build
```

Same ports. No volume mounts — code is baked into images. Next.js runs in standalone mode.

---

## Rebuild after dependency changes

If you add npm packages or Python packages, rebuild without cache:

```bash
docker compose -f infra/docker-compose.yml --profile dev build --no-cache
```

---

## Session Notes

- **2026-04-10:** V1 infra layer scaffolded. Docker Compose with dev/prod profiles. FE multi-stage (dev hot-reload + prod standalone). BE multi-stage (dev reload + prod workers). Supabase stays hosted (cloud). Secrets via root `.env`.
