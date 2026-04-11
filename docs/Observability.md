# Observability Guide — Synapse Platform

**Stack:** OpenTelemetry · structlog · Grafana · Tempo · Loki · Prometheus  
**Last Updated:** April 2026

---

## 1. Stack Overview

| Signal | What it captures | Collected by | Stored in | Queried via |
|---|---|---|---|---|
| **Traces** | Every RAG pipeline step, HTTP request, span hierarchy | OTel SDK (FastAPI + manual spans) | Grafana Tempo | Grafana → Explore → Tempo |
| **Logs** | Every `log.info/error()` call, structured JSON with `trace_id` | structlog → stdlib → OTel LoggingInstrumentor | Grafana Loki | Grafana → Explore → Loki |
| **Metrics** | RAG step latency histograms, request counts | OTel MeterProvider → Prometheus scrape | Prometheus | Grafana → Explore → Prometheus |

### Data flow

```
Browser
  │ generates W3C traceparent header
  ▼
Next.js proxy (/api/agents/*)
  │ forwards traceparent upstream; relays X-Trace-ID downstream
  ▼
FastAPI backend
  ├── FastAPIInstrumentor → HTTP root span (child of browser trace)
  ├── structlog JSON logs → stdlib → OTELHandler → OTLP gRPC
  ├── RAG spans: embed_query → hybrid_retrieval → llm_completion → stream_response
  └── /metrics endpoint → Prometheus histogram per step
  ▼
OTel Collector (port 4317 gRPC / 4318 HTTP)
  ├── traces  → Grafana Tempo  (port 3200)
  └── logs    → Grafana Loki   (port 3100)
  ▼
Grafana (port 3001)
  ├── Tempo datasource  → trace waterfall
  ├── Loki datasource   → structured JSON logs + trace_id link
  └── Prometheus datasource → latency histograms + exemplars
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
```

---

## 4. Generating Test Data

Every query you submit in the app generates:
- 1 HTTP span + 4 child spans (traces → Tempo)
- Structured JSON log lines with `trace_id` (logs → Loki)
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

## 6. Checking Logs (Grafana → Loki)

Logs are structured JSON. Every log line that was emitted during an active OTel span includes `trace_id` and `span_id`, which Grafana renders as a clickable "View Trace in Tempo" link.

### Step-by-step

1. Open **http://localhost:3001** → **Explore**
2. Datasource dropdown → select **Loki**
3. Click **Label browser**
4. Select `service_name` → `synapse-backend` → **Show logs**
5. Or type directly in the query box:

```logql
{service_name="synapse-backend"}
```

6. Click any log line to expand it
7. Look for the **"View Trace in Tempo"** button — click it to jump to the matching trace

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

### Log fields reference

Every log line contains these fields:

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

## 7. Checking Metrics (Grafana → Prometheus)

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

### Checking the raw /metrics output

```bash
# See all metrics the backend exposes
curl -s http://localhost:8000/metrics | grep -E "^(synapse|http_server)"
```

---

## 8. End-to-End Correlation: One Request, Three Signals

This is the power of the unified telemetry stack — a single trace ID links a log line, a trace, and a metric exemplar.

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

**In Loki:**
```logql
{service_name="synapse-backend"} | json | trace_id="<your-trace-id>"
```

**In Grafana (shortcut):**
- In Loki: expand any log line → click **"View Trace in Tempo"**
- In Tempo: click a span → click **"Related logs in Loki"**

---

## 9. Troubleshooting

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

### No logs appear in Loki

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

## 10. Telemetry Files Reference

```
backend/
└── app/telemetry/
    ├── __init__.py          Re-exports: setup_telemetry, get_tracer, get_logger
    └── logger.py            OTel providers + structlog chain + stdlib bridge

infra/
├── docker-compose.observability.yml   LGTM services + backend env overrides
├── otel-collector-config.yaml         OTLP receiver → Tempo + Loki exporters
├── tempo-config.yaml                  Tempo: local storage, 72h retention
├── loki-config.yaml                   Loki: single-node, zone awareness off
├── prometheus.yml                     Scrape: /metrics + collector self-metrics
└── grafana/provisioning/
    └── datasources/lgtm.yaml          Loki + Tempo + Prometheus auto-provisioned
                                       with cross-linking (log→trace, trace→log)

Makefile (repo root)
  make dev          Start everything including observability
  make logs-be      Tail backend logs
  make logs-obs     Tail otel-collector + loki + tempo + grafana logs
  make ps           Container status
```
