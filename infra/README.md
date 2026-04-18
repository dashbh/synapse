# Infra — Docker Compose

Containerizes FE + BE for local dev and production, with an optional LGTM observability sidecar (Loki, Grafana, Tempo, Prometheus). Database stays in hosted Supabase — no local DB container.

**Status:** v1 Closed — dev/prod profiles + LGTM stack fully operational.

---

## Prerequisites

- Docker Desktop ≥ 4.x (Compose v2 built in)
- A root-level `.env` file (copy `.env.example` and fill in values)

---

## Quick Start (Makefile)

From repo root — the Makefile wraps all Docker Compose commands:

```bash
make dev      # FE + BE + observability (dev mode, hot-reload)
make dev-d    # Same, detached
make prod     # FE + BE only (prod mode, no observability)
make down     # Stop all containers
make logs     # Tail all logs
make logs-be  # Backend logs only
make logs-fe  # Frontend logs only
make logs-obs # Observability stack logs only
make ps       # Container status
make build    # Rebuild all images (--no-cache)
make shell-be # Shell into backend container
make shell-fe # Shell into frontend container
make clean    # Stop + remove volumes (destructive)
make help     # List all targets
```

---

## Compose Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | FE + BE (dev/prod profiles) |
| `docker-compose.observability.yml` | LGTM sidecar (merged by `make dev`) |

**Manual compose (without Makefile):**

```bash
# Dev — FE + BE + observability
docker compose -f infra/docker-compose.yml -f infra/docker-compose.observability.yml --profile dev up --build

# Prod — FE + BE only
docker compose -f infra/docker-compose.yml --profile prod up --build
```

---

## Dev vs Prod Profiles

| Feature | Dev | Prod |
|---|---|---|
| Hot-reload | ✅ (volume mounts) | ❌ (baked into image) |
| Next.js mode | Hot-reload | Standalone build |
| Uvicorn | `--reload` | Multi-worker |
| Observability | ✅ Included | ❌ Separate |

---

## Observability Stack (LGTM)

Defined in `docker-compose.observability.yml`. Started automatically with `make dev`.

| Component | Port | Purpose |
|---|---|---|
| **OTel Collector** | 4317 (gRPC), 4318 (HTTP) | Ingest traces + logs from backend |
| **Loki** | 3100 | Log aggregation (structured JSON) |
| **Tempo** | 3200 | Distributed trace storage (72h retention) |
| **Prometheus** | 9090 | Metrics scraping + exemplar storage |
| **Grafana** | 3001 | Dashboards — anonymous admin, datasources auto-provisioned |

**Grafana:** http://localhost:3001

Datasources (Loki, Tempo, Prometheus) are provisioned automatically from `infra/grafana/provisioning/`. Dashboards are cross-linked: log lines link to traces; Prometheus exemplars link to slow traces.

**Trace flow:**
```
Browser → W3C traceparent header
  → Next.js proxy
  → FastAPI (auto-instrumented) → RAG spans (embed, retrieval, LLM, stream)
  → OTel Collector (gRPC 4317)
  → Tempo (trace storage) + Loki (log storage) + Prometheus (metrics)
  → Grafana (unified view)
```

---

## Rebuild After Dependency Changes

```bash
make build    # No-cache rebuild for all services
```

---

## Session Notes

- **2026-04-10:** v1 infra scaffolded — Docker Compose dev/prod profiles, FE multi-stage (dev hot-reload + prod standalone), BE multi-stage (dev reload + prod workers), Supabase stays hosted.
- **2026-04-13:** LGTM observability sidecar added — OTel Collector, Loki, Grafana, Tempo, Prometheus; Grafana auto-provisioned; Makefile expanded with 15+ targets.
- **2026-04-14:** v1 closed. Local Docker deployment fully operational for dev and prod profiles.
