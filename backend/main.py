import os
import time
import uuid
import logging
import uvicorn
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from structlog.contextvars import bind_contextvars, clear_contextvars
from supabase import create_client

# OTel instrumentation — imported before FastAPI app creation so the
# instrumentation wraps the ASGI stack correctly.
from opentelemetry import trace as otel_trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from prometheus_client import make_asgi_app

from app.telemetry import setup_telemetry, get_logger
from app.routes import knowledge_qa, ingest, sessions
from app.config import settings

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize telemetry on startup; flush spans/logs on shutdown."""
    setup_telemetry()
    # Auto-trace all HTTPX calls (OpenAI SDK uses httpx internally).
    HTTPXClientInstrumentor().instrument()
    # httpx logs every outbound request as a plain-string INFO line.
    # HTTPXClientInstrumentor already captures these as OTel spans, so the
    # stdlib logs are redundant noise. Raise to WARNING to silence them.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    yield
    otel_trace.get_tracer_provider().shutdown()


app = FastAPI(title="A2UI Platform Backend", version="1.0.0", lifespan=lifespan)

# FastAPI OTel instrumentation — creates an HTTP span for every request and
# extracts W3C traceparent from incoming headers automatically.
FastAPIInstrumentor.instrument_app(app)

# Mount the Prometheus scrape endpoint (served by opentelemetry-exporter-prometheus)
app.mount("/metrics", make_asgi_app())

_cors_origins = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["POST", "GET", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=True,
    expose_headers=["X-Trace-ID"],  # allow browser JS to read the trace ID
)


# Paths that produce only noise when logged (high-frequency infrastructure polls).
# Requests to these paths still execute normally — they just don't emit log lines.
_SILENT_PATHS = frozenset({"/metrics", "/metrics/", "/health"})


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    """
    Per-request structured logging middleware.

    Binds the following fields to structlog contextvars so that EVERY log
    call made anywhere in the request chain (route, agent, util) automatically
    carries them — no manual field-passing needed:

        request_id   — UUID generated per request (correlate logs within one call)
        session_id   — from ?session_id= query param (correlate across a session)
        http_method  — GET / POST / …
        http_path    — /api/agents/knowledge-qa
        client_ip    — requester IP

    trace_id / span_id are injected by the _inject_otel_context structlog
    processor at emit time — no need to bind them here.

    High-frequency infra paths (/metrics, /health) are silenced to avoid noise.
    """
    if request.url.path in _SILENT_PATHS:
        return await call_next(request)

    clear_contextvars()  # prevent context leak between requests on the same worker

    request_id = str(uuid.uuid4())
    session_id = request.query_params.get("session_id") or None

    bind_contextvars(
        request_id=request_id,
        session_id=session_id,
        http_method=request.method,
        http_path=request.url.path,
        client_ip=request.client.host if request.client else None,
    )

    logger.info(
        "http_request_started",
        http_query=str(request.url.query)[:300] if request.url.query else None,
        user_agent=request.headers.get("user-agent", "")[:120],
        traceparent=request.headers.get("traceparent"),
        content_length=request.headers.get("content-length"),
        accept=request.headers.get("accept", "")[:80],
        origin=request.headers.get("origin"),
    )

    t0 = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - t0) * 1000, 1)

    # Add X-Trace-ID to every response
    span_ctx = otel_trace.get_current_span().get_span_context()
    if span_ctx.is_valid:
        response.headers["X-Trace-ID"] = format(span_ctx.trace_id, "032x")

    # For StreamingResponse (SSE), duration_ms is time-to-first-byte, not stream
    # duration. The true end-to-end duration is in sse_stream_completed.duration_ms.
    logger.info(
        "http_request_completed",
        http_status=response.status_code,
        duration_ms=duration_ms,
        is_streaming=response.headers.get("content-type", "").startswith("text/plain"),
        response_content_type=response.headers.get("content-type"),
    )


    return response


app.include_router(knowledge_qa.router, prefix="/api/agents")
app.include_router(ingest.router, prefix="/api/agents")
app.include_router(sessions.router, prefix="/api/sessions")


@app.get("/health")
def health():
    """
    Health check endpoint.
    Returns 200 if all checks pass, 503 otherwise.
    Internal error details are logged server-side only — never exposed in the response.
    """
    checks = {"server": "ok", "database": "ok", "api_keys": "ok"}

    try:
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY not set")
        if not settings.supabase_url or not settings.supabase_anon_key:
            raise ValueError("Supabase credentials not set")
    except Exception as e:
        logger.error("health_check_failed", check="api_keys", error=str(e))
        checks["api_keys"] = "error"

    try:
        supabase = create_client(settings.supabase_url, settings.supabase_anon_key)
        supabase.table("document_chunks").select("count", count="exact").limit(1).execute()
    except Exception as e:
        logger.error("health_check_failed", check="database", error=str(e))
        checks["database"] = "error"

    if any(v == "error" for v in checks.values()):
        return JSONResponse(status_code=503, content={"status": "unhealthy", "checks": checks})

    logger.info("health_check_ok", checks=checks)
    return {"status": "healthy", "checks": checks}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=True)
