# Observability Guide — Synapse Platform

**Stack:** OpenTelemetry · structlog · Grafana · Tempo · Loki · Prometheus  
**Last Updated:** April 2026  
**Coverage:** Backend (BE) + Frontend (FE) — both signal sources active

---

## 1. Stack Overview

| Signal | Source | Collected by | Stored in | Queried via |
|---|---|---|---|---|
| **Traces** | BE: every RAG step, HTTP request | OTel SDK (FastAPI auto + manual spans) | Grafana Tempo | Grafana → Explore → Tempo |
| **Logs (BE)** | BE: every `log.info/error()` call | structlog → stdlib → OTELHandler → OTLP gRPC | Grafana Loki | Grafana → Explore → Loki |
| **Logs (FE)** | FE: stream lifecycle, session events, queries, ingest steps, errors | `createLogger()` → `sendBeacon` → `/api/telemetry/log` → OTLP HTTP | Grafana Loki | Grafana → Explore → Loki |
| **Metrics** | BE: RAG step latency histograms, HTTP counts | OTel MeterProvider → Prometheus scrape | Prometheus | Grafana → Explore → Prometheus |

### Data flow

```
Browser (FE)
  │ 1. Generates W3C traceparent header per stream request
  │ 2. Sends structured log events via navigator.sendBeacon → /api/telemetry/log
  ▼
Next.js proxy layer (FE API routes — server-side)
  │ forwards traceparent upstream; relays X-Trace-ID downstream
  │ writes JSON logs to stdout + forwards to OTel Collector directly
  ▼
FastAPI backend (BE)
  ├── FastAPIInstrumentor → HTTP root span (child of browser trace)
  ├── structlog JSON logs → stdlib → OTELHandler → OTLP gRPC (port 4317)
  ├── RAG spans: embed_query → hybrid_retrieval → llm_completion → stream_response
  └── /metrics endpoint → Prometheus histogram per RAG step
  ▼
OTel Collector (port 4317 gRPC / 4318 HTTP)
  ├── traces → Grafana Tempo  (port 3200)
  └── logs   → Grafana Loki   (port 3100)
              (both synapse-backend and synapse-frontend stream labels)
  ▼
Grafana (port 3001)
  ├── Tempo datasource  → trace waterfall (BE spans)
  ├── Loki datasource   → structured JSON logs from BE + FE, cross-linked by trace_id
  └── Prometheus datasource → latency histograms + exemplars → trace jump
```

---

## 2. Starting the Stack

```bash
# From the repo root — starts FE + BE + full observability sidecar
make dev

# Or detached (background)
make dev-d
```

### Service URLs

| Service | URL | Purpose |
|---|---|---|
| App (Knowledge QA) | http://localhost:3000 | Use this to generate traces and logs |
| Grafana | http://localhost:3001 | All observability dashboards |
| Prometheus | http://localhost:9090 | Raw metrics query UI |
| OTel Collector metrics | http://localhost:8888/metrics | Collector self-health |
| Backend metrics | http://localhost:8000/metrics | RAG histogram + SDK metrics |
| Loki health | http://localhost:3100/ready | Returns `ready` if healthy |
| Tempo health | http://localhost:3200/ready | Returns `ready` if healthy |

> **Note:** Loki and Tempo intentionally return 404 at `/` — they have no browser UI. Use Grafana to query them.

---

## 3. Verifying the Stack is Healthy

Run these before testing observability:

```bash
# 1. Check all containers are running
make ps

# 2. Loki
curl -s http://localhost:3100/ready
# Expected: ready

# 3. Tempo
curl -s http://localhost:3200/ready
# Expected: ready

# 4. OTel Collector is receiving data (check after making a query)
curl -s http://localhost:8888/metrics | grep otelcol_receiver_accepted_spans_total
# Expected: a number > 0 after sending a query

# 5. Backend metrics endpoint is live
curl -s http://localhost:8000/metrics | grep synapse_rag
# Expected: synapse_rag_step_duration_seconds_* lines

# 6. FE logs are reaching Loki (check after submitting a query in the app)
# Open Grafana → Explore → Loki → {service_name="synapse-frontend"}
# Expected: log lines with namespace, level, message fields
```

---

## 4. Generating Test Data

Every query you submit in the app generates:
- 1 HTTP span + 4 child spans (traces → Tempo)
- Structured JSON log lines from the backend with `trace_id` (logs → Loki, `service_name=synapse-backend`)
- Structured JSON log lines from the frontend with `session_id` (logs → Loki, `service_name=synapse-frontend`)
- Histogram observations for each RAG step (metrics → Prometheus)

```bash
# Quick way: submit a query from the browser
open http://localhost:3000

# Or use curl directly against the backend
curl -s "http://localhost:8000/api/agents/knowledge-qa?query=what+is+RAG" \
  -X POST --no-buffer
```

---

## 5. Checking Traces (Grafana → Tempo)

Traces show the full pipeline waterfall for a single query: how long each step took and whether it succeeded.

### Step-by-step

1. Open **http://localhost:3001**
2. Left sidebar → click the **Explore** icon (compass)
3. Top-left datasource dropdown → select **Tempo**
4. Click the **Search** tab (not TraceQL)
5. Set:
   - **Service Name:** `synapse-backend`
   - **Time range:** Last 15 minutes
6. Click **Run query**
7. Click any trace row to open the waterfall

### What you will see

```
POST /api/agents/knowledge-qa          ~1.5s  ← HTTP root span
  └─ stream_response                   ~1.4s
       ├─ embed_query                  ~120ms   gen_ai.request.model=text-embedding-ada-002
       ├─ hybrid_retrieval             ~80ms    db.statement=match_document_chunks
       │                                        synapse.retrieval.chunks_returned=3
       └─ llm_completion              ~900ms   gen_ai.usage.total_tokens=847
```

### Trace attributes to look for

| Span | Key attributes |
|---|---|
| `embed_query` | `gen_ai.system`, `gen_ai.request.model`, `gen_ai.usage.input_tokens` |
| `hybrid_retrieval` | `db.system`, `synapse.retrieval.chunks_total`, `synapse.retrieval.chunks_returned`, `synapse.retrieval.min_similarity` |
| `llm_completion` | `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`, `gen_ai.usage.total_tokens` |
| `stream_response` | `synapse.surface_id`, `synapse.query.length`, `synapse.response.sources_count` |

### TraceQL queries (advanced)

```
# All traces from the backend
{ resource.service.name = "synapse-backend" }

# Traces where LLM used more than 500 tokens
{ span.gen_ai.usage.total_tokens > 500 }

# Traces where retrieval returned 0 relevant chunks
{ span.synapse.retrieval.chunks_returned = 0 }

# Traces with errors
{ status = error }

# Traces slower than 2 seconds end-to-end
{ duration > 2s && resource.service.name = "synapse-backend" }
```

---

## 6. Checking Backend Logs (Grafana → Loki)

Backend logs are structured JSON. Every log line emitted during an active OTel span includes `trace_id` and `span_id`, which Grafana renders as a clickable **"View Trace in Tempo"** link.

### Step-by-step

1. Open **http://localhost:3001** → **Explore**
2. Datasource dropdown → select **Loki**
3. Query:

```logql
{service_name="synapse-backend"}
```

4. Click any log line to expand it
5. Look for the **"View Trace in Tempo"** button — click it to jump to the matching trace

### Useful LogQL queries

```logql
# All backend logs
{service_name="synapse-backend"}

# Only error logs
{service_name="synapse-backend"} | json | level="error"

# Logs containing a specific trace ID (paste from browser DevTools X-Trace-ID header)
{service_name="synapse-backend"} | json | trace_id="<your-trace-id>"

# RAG pipeline completion events only
{service_name="synapse-backend"} | json | event="rag_pipeline_complete"

# Queries where no results were retrieved
{service_name="synapse-backend"} | json | event="retrieval_no_results"

# Count errors in the last 1 hour
count_over_time({service_name="synapse-backend"} | json | level="error" [1h])
```

### Backend log fields reference

| Field | Example | Description |
|---|---|---|
| `event` | `rag_pipeline_complete` | The log event name |
| `level` | `info` / `error` | Log level |
| `logger` | `app.routes.knowledge_qa` | Module that emitted the log |
| `timestamp` | `2026-04-11T12:34:56Z` | ISO 8601 |
| `trace_id` | `4bf92f3577b34da6...` | 32-hex — links to Tempo trace |
| `span_id` | `00f067aa0ba902b7` | 16-hex — specific span |
| `session_id` | `uuid` | User session (when present) |
| `query_length` | `42` | Length of the user query |
| `total_tokens` | `847` | LLM token usage |
| `sources_count` | `3` | Number of sources returned |

---

## 7. Checking Frontend Logs (Grafana → Loki)

Frontend logs are emitted by `createLogger()` in `frontend/src/lib/logger.ts`. Browser events batch via `sendBeacon → /api/telemetry/log → OTel Collector → Loki`. Next.js API route logs write JSON directly to the collector from the server side.

All FE logs carry `service_name=synapse-frontend` as the Loki stream label.

### Step-by-step

1. Open **http://localhost:3001** → **Explore** → **Loki**
2. Query:

```logql
{service_name="synapse-frontend"}
```

3. Expand a log line — FE logs with a `trace_id` field link to the matching backend trace in Tempo

### Key FE log events

| Event name | Namespace | Description |
|---|---|---|
| `stream_start` | `fe.transport.sse` | SSE stream initiated (includes `url`) |
| `stream_connected` | `fe.transport.sse` | Response headers received (includes `trace_id`, `status`) |
| `stream_complete` | `fe.transport.sse` | Stream finished successfully (includes `duration_ms`) |
| `stream_error` | `fe.transport.sse` | Stream failed (includes `error`) |
| `stream_aborted` | `fe.transport.sse` | Stream cancelled (route change or stop) |
| `session_restored` | `fe.session` | Existing session resumed from cookie |
| `session_created` | `fe.session` | New session created (first visit) |
| `session_new` | `fe.session` | User explicitly started a new chat |
| `session_switch` | `fe.session` | Switched to a different session |
| `session_init_failed` | `fe.session` | Session init failed — app continues stateless |
| `query_submit` | `fe.app.knowledge-qa` | User submitted a query (includes `session_id`, `query_length`, `turn`) |
| `session_hydrate_start` | `fe.app.knowledge-qa` | Session history load started |
| `session_hydrate_complete` | `fe.app.knowledge-qa` | Session history loaded (includes `turns` count) |
| `session_hydrate_failed` | `fe.app.knowledge-qa` | Session history load failed |
| `session_new_chat` | `fe.app.knowledge-qa` | New chat button triggered |
| `ingest_start` | `fe.ingest` | File upload initiated (includes `file_name`, `file_size`) |
| `ingest_step` | `fe.ingest` | Ingestion pipeline step updated (includes `step`, `status`) |
| `ingest_complete` | `fe.ingest` | Ingestion finished successfully |
| `ingest_unauthorized` | `fe.ingest` | 401/403 on ingest — auth failure |
| `query_proxy` | `fe.api.knowledge-qa` | Server-side proxy forwarded query to BE |
| `session_create` | `fe.api.sessions` | Session creation proxied to BE |
| `session_rename` | `fe.api.sessions` | Session rename proxied to BE |
| `session_delete` | `fe.api.sessions` | Session delete proxied to BE |
| `session_activate` | `fe.api.sessions` | Session switch proxied to BE |

### Useful FE LogQL queries

```logql
# All frontend logs
{service_name="synapse-frontend"}

# FE errors only
{service_name="synapse-frontend"} | json | level="error"

# Session lifecycle events
{service_name="synapse-frontend"} | json | namespace=~"fe\.session.*"

# Query submissions (user activity)
{service_name="synapse-frontend"} | json | message="query_submit"

# Stream events for a specific session
{service_name="synapse-frontend"} | json | session_id="<uuid>"

# Count queries submitted per minute
sum(count_over_time({service_name="synapse-frontend"} | json | message="query_submit" [1m]))

# Ingestion step completions
{service_name="synapse-frontend"} | json | message="ingest_step" | status="done"

# All FE logs with a backend trace_id (cross-service correlation)
{service_name="synapse-frontend"} | json | trace_id!=""
```

### FE log fields reference

| Field | Example | Description |
|---|---|---|
| `message` | `stream_complete` | Event name |
| `level` | `info` / `error` / `warn` | Log level |
| `namespace` | `fe.transport.sse` | Logger namespace (identifies source layer) |
| `timestamp` | `2026-04-18T09:12:34Z` | ISO 8601 |
| `service_name` | `synapse-frontend` | Constant — used as Loki stream label |
| `session_id` | `uuid` | User session (when available) |
| `trace_id` | `4bf92f3577b34da6...` | Backend trace ID relayed via `X-Trace-ID` header |
| `url` | `/api/agents/knowledge-qa?...` | Stream endpoint (on stream events) |
| `duration_ms` | `1423` | Stream or step duration in milliseconds |
| `query_length` | `42` | Length of user query |
| `file_name` | `architecture.pdf` | Uploaded file name (on ingest events) |
| `file_size` | `204800` | Uploaded file size in bytes |
| `step` | `chunking` | Ingestion pipeline step name |
| `status` | `done` / `error` | Step status |
| `error` | `HTTP 500 ...` | Error message (on error-level logs) |

---

## 8. Checking Metrics (Grafana → Prometheus)

Metrics track aggregate performance over time. Use them to see trends, percentile latencies, and error rates.

### Step-by-step

1. Open **http://localhost:3001** → **Explore**
2. Datasource dropdown → select **Prometheus**
3. Enter a query and click **Run query**

### Key metric queries

```promql
# ── RAG step duration histograms ──────────────────────────────────────────

# p50 latency per RAG step (last 5 minutes)
histogram_quantile(0.50,
  sum(rate(synapse_rag_step_duration_seconds_bucket[5m])) by (le, step)
)

# p95 latency per RAG step
histogram_quantile(0.95,
  sum(rate(synapse_rag_step_duration_seconds_bucket[5m])) by (le, step)
)

# Average duration per step
rate(synapse_rag_step_duration_seconds_sum[5m])
  /
rate(synapse_rag_step_duration_seconds_count[5m])

# ── HTTP request metrics (from FastAPIInstrumentor) ───────────────────────

# Request rate (per second)
rate(http_server_duration_milliseconds_count[5m])

# HTTP error rate (5xx)
rate(http_server_duration_milliseconds_count{http_status_code=~"5.."}[5m])

# ── OTel Collector health ──────────────────────────────────────────────────

# Spans received by collector
rate(otelcol_receiver_accepted_spans_total[5m])

# Spans successfully exported to Tempo
rate(otelcol_exporter_sent_spans_total{exporter="otlp/tempo"}[5m])

# Logs successfully exported to Loki
rate(otelcol_exporter_sent_log_records_total{exporter="otlphttp/loki"}[5m])
```

### Step labels

The `synapse_rag_step_duration_seconds` histogram has a `step` label:

| `step` value | What it measures |
|---|---|
| `embed_query` | OpenAI ada-002 embedding API call |
| `hybrid_retrieval` | Supabase pgvector RPC (`match_document_chunks`) |
| `llm_completion` | OpenAI gpt-4o-mini chat completion |

---

## 9. Grafana Dashboard: Synapse Observability

The main dashboard at **http://localhost:3001** (Synapse Observability) contains these rows:

| Row | Panels | Data source |
|---|---|---|
| **HTTP Traffic** | Request rate, HTTP p95 latency | Prometheus |
| **RAG Pipeline** | Step latency p50/p95, token usage over time | Prometheus |
| **Application Logs** | Request flow table (BE logs, excludes infra noise) | Loki |
| **Errors** | Error rate timeseries, error log lines | Prometheus + Loki |
| **Frontend** | FE error count, session events, query submissions, stream lifecycle, ingestion steps, FE error logs | Loki |
| **OTel Collector Health** | Spans/logs received vs exported (collapsed by default) | Prometheus |

The dashboard JSON is at `infra/grafana/dashboards/Synapse_Observability.json` and is provisioned automatically. It auto-reloads every 30 seconds — editing the JSON file and saving is enough to see changes in Grafana.

---

## 10. End-to-End Correlation: One Request, Three Signals

This is the power of the unified telemetry stack — a single trace ID links a FE log line, a BE trace, and a metric exemplar.

### Finding the trace ID from the browser

1. Open browser DevTools (F12) → **Network** tab
2. Submit a query in the app
3. Click the `knowledge-qa` request
4. Look in **Response Headers** for `X-Trace-ID: <32-hex>`
5. Copy that value

### Using the trace ID

**In Tempo:**
```
TraceQL: { trace:id = "<your-trace-id>" }
```

**In Loki (backend):**
```logql
{service_name="synapse-backend"} | json | trace_id="<your-trace-id>"
```

**In Loki (frontend):**
```logql
{service_name="synapse-frontend"} | json | trace_id="<your-trace-id>"
```

**In Grafana (shortcut):**
- In Loki: expand any log line → click **"View Trace in Tempo"**
- In Tempo: click a span → click **"Related logs in Loki"**
- The `stream_connected` FE log event carries the backend `trace_id` — this is the cross-service link

---

## 11. Troubleshooting

### No traces appear in Tempo

```bash
# 1. Check the OTel Collector is receiving spans
curl -s http://localhost:8888/metrics | grep otelcol_receiver_accepted_spans_total

# 2. Check the collector is exporting to Tempo
curl -s http://localhost:8888/metrics | grep 'otelcol_exporter_sent_spans_total{.*tempo'

# 3. Check backend logs for export errors
make logs-be | grep -i "otlp\|exporter\|error"

# 4. Confirm Tempo is ready
curl http://localhost:3200/ready
```

### No backend logs appear in Loki

```bash
# 1. Check the collector is exporting logs
curl -s http://localhost:8888/metrics | grep otelcol_exporter_sent_log_records_total

# 2. Confirm Loki is ready
curl http://localhost:3100/ready

# 3. Check logs are flowing to stdout (always works regardless of Loki)
make logs-be

# 4. If collector shows 0 log records, the OTel LoggingInstrumentor may not
#    be wired — check that setup_telemetry() is called before any requests
```

### No frontend logs appear in Loki

```bash
# 1. Check the frontend container has OTEL_COLLECTOR_URL set
make ps  # verify frontend-dev container is running with observability stack

# 2. Check that the FE API route can reach the collector
make logs-fe | grep "telemetry"

# 3. Try the telemetry route manually (from host with observability stack running)
curl -X POST http://localhost:3000/api/telemetry/log \
  -H "Content-Type: application/json" \
  -d '{"logs": [{"timestamp":"2026-04-18T00:00:00Z","level":"info","namespace":"fe.test","message":"test","service_name":"synapse-frontend"}]}'
# Expected: 204 No Content

# 4. Loki query to confirm — wait ~30 seconds for ingestion
# Grafana → Explore → Loki → {service_name="synapse-frontend"}

# 5. Local dev without Docker: browser events go to /api/telemetry/log on Next.js,
#    but OTEL_COLLECTOR_URL is not set, so logs only appear in console — expected.
```

### No metrics appear in Prometheus

```bash
# 1. Confirm the /metrics endpoint is live
curl -s http://localhost:8000/metrics | grep synapse_rag

# 2. Check Prometheus scrape status
# Open http://localhost:9090 → Status → Targets
# synapse-backend should show state=UP

# 3. If /metrics is missing: the backend container may not have
#    opentelemetry-exporter-prometheus installed — rebuild:
make build-be && make dev
```

### Backend returns 500 on queries

```bash
# View the full backend traceback
make logs-be

# Most common causes after telemetry changes:
# - New packages not installed → make build-be
# - structlog misconfiguration → check logger.py imports
# - OTel Collector unreachable at startup → check: make ps
```

### Containers won't start / port conflicts

```bash
# Stop everything and clean up
make down

# Check what's using port 3001 (Grafana)
lsof -i :3001

# Restart fresh
make dev
```

---

## 12. Telemetry Files Reference

```
backend/
└── app/telemetry/
    ├── __init__.py          Re-exports: setup_telemetry, get_tracer, get_logger
    └── logger.py            OTel providers + structlog chain + stdlib bridge

frontend/src/
└── lib/
    └── logger.ts            createLogger() factory — browser + Node.js dual-mode
frontend/src/app/api/
└── telemetry/log/
    └── route.ts             POST handler: browser log batch → OTLP HTTP → Loki

infra/
├── docker-compose.observability.yml   LGTM services + backend + frontend env overrides
├── otel-collector-config.yaml         OTLP receiver → Tempo + Loki exporters
├── tempo-config.yaml                  Tempo: local storage, 72h retention
├── loki-config.yaml                   Loki: single-node, zone awareness off
├── prometheus.yml                     Scrape: /metrics + collector self-metrics
└── grafana/
    ├── provisioning/datasources/
    │   └── lgtm.yaml        Loki + Tempo + Prometheus auto-provisioned with cross-linking
    └── dashboards/
        └── Synapse_Observability.json   Main dashboard (BE + FE rows, auto-reloads 30s)

Makefile (repo root)
  make dev          Start everything including observability
  make logs-be      Tail backend logs
  make logs-fe      Tail frontend logs
  make logs-obs     Tail otel-collector + loki + tempo + grafana logs
  make ps           Container status
```

---

## 13. Logger Namespace Reference (FE)

The FE logger uses dot-separated namespaces. Filter by prefix in Loki using `namespace=~"fe\.transport\.*"`.

| Namespace | File | What it covers |
|---|---|---|
| `fe.transport.sse` | `src/a2ui/transport/useSSE.ts` | SSE stream start/connected/complete/error/aborted |
| `fe.transport.agent` | `src/a2ui/transport/useAgentStream.ts` | Agent stream start, parse errors, stream errors |
| `fe.session` | `src/apps/knowledge-qa/hooks/useSession.ts` | Session create/restore/switch lifecycle |
| `fe.app.knowledge-qa` | `src/apps/knowledge-qa/KnowledgeQAApp.tsx` | Query submit, hydration, new chat, session switch |
| `fe.ingest` | `src/apps/knowledge-qa/hooks/useIngestionStream.ts` | File upload, pipeline steps, completion |
| `fe.api.knowledge-qa` | `src/app/api/agents/knowledge-qa/route.ts` | Query proxy calls to BE |
| `fe.api.sessions` | `src/app/api/sessions/` (all routes) | Session CRUD proxy calls to BE |
