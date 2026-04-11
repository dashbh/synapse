"""
Centralized telemetry module for Synapse backend.

Signals produced:
  Traces  → OTel TracerProvider → OTLP gRPC  → OTel Collector → Grafana Tempo
  Logs    → structlog JSON → stdlib → LoggingInstrumentor
            → OTel LoggerProvider → OTLP HTTP → OTel Collector → Grafana Loki
            trace_id + span_id injected automatically on every line
  Metrics → OTel MeterProvider → PrometheusMetricReader → GET /metrics → Prometheus

  Fallback: if the OTLP HTTP log exporter is unavailable, logs go to stdout only
  (still structured JSON, still visible in `make logs-be`).

Usage (any module):
    from app.telemetry import get_tracer, get_logger, get_rag_step_histogram

    tracer = get_tracer(__name__)
    log    = get_logger(__name__)

Initialization (main.py lifespan only):
    from app.telemetry import setup_telemetry
    setup_telemetry()
"""

import logging
import os

import structlog
from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.resources import (
    DEPLOYMENT_ENVIRONMENT,
    SERVICE_NAME,
    SERVICE_VERSION,
    Resource,
)
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter

# ── OTel Resource (shared across all three signals) ──────────────────────────
_resource = Resource.create(
    {
        SERVICE_NAME: os.getenv("OTEL_SERVICE_NAME", "synapse-backend"),
        SERVICE_VERSION: os.getenv("SERVICE_VERSION", "1.0.0"),
        DEPLOYMENT_ENVIRONMENT: os.getenv("DEPLOYMENT_ENVIRONMENT", "development"),
    }
)

_otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4317")
# HTTP endpoint for log export (port 4318). Derive from gRPC endpoint by default;
# override independently with OTEL_EXPORTER_OTLP_LOGS_ENDPOINT if needed.
_otlp_http_endpoint = os.getenv(
    "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT",
    _otlp_endpoint.replace(":4317", ":4318"),
)


# ── structlog processor: inject OTel span context into every log line ────────
def _inject_otel_context(logger: object, method_name: str, event_dict: dict) -> dict:
    """Adds trace_id and span_id from the currently active OTel span."""
    span = trace.get_current_span()
    ctx = span.get_span_context()
    if ctx and ctx.is_valid:
        event_dict["trace_id"] = format(ctx.trace_id, "032x")
        event_dict["span_id"] = format(ctx.span_id, "016x")
    return event_dict


# Shared processor chain used by both structlog and the stdlib foreign_pre_chain.
# Defined at module level so both chains stay in sync automatically.
_PROCESSORS = [
    structlog.contextvars.merge_contextvars,   # async-safe per-request bound vars
    structlog.stdlib.add_log_level,
    structlog.stdlib.add_logger_name,          # works because we use stdlib.LoggerFactory
    structlog.processors.TimeStamper(fmt="iso"),
    _inject_otel_context,                      # trace_id + span_id from OTel context
    structlog.processors.format_exc_info,
]


# ── TracerProvider → OTLP → Tempo ────────────────────────────────────────────
def _build_tracer_provider() -> TracerProvider:
    exporter = OTLPSpanExporter(endpoint=_otlp_endpoint, insecure=True)
    provider = TracerProvider(resource=_resource)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    if os.getenv("LOG_LEVEL", "INFO").upper() == "DEBUG":
        provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
    trace.set_tracer_provider(provider)
    return provider


# ── MeterProvider → Prometheus scrape at /metrics ────────────────────────────
def _build_meter_provider() -> MeterProvider:
    reader = PrometheusMetricReader()
    provider = MeterProvider(resource=_resource, metric_readers=[reader])
    metrics.set_meter_provider(provider)
    return provider


# ── LoggerProvider → OTLP HTTP → OTel Collector → Loki ───────────────────────
def _build_log_provider():
    """
    Wire an OTel LoggerProvider that exports log records via OTLP HTTP.
    Uses HTTP (port 4318) rather than gRPC because the gRPC log-exporter
    module path is inconsistent across SDK patch versions.

    Falls back silently if the package is not installed — logs still reach
    stdout as structured JSON.
    """
    try:
        from opentelemetry.exporter.otlp.proto.http._log_exporter import (  # underscore-prefixed in this SDK version
            OTLPLogExporter,
        )
        from opentelemetry.sdk._logs import LoggerProvider
        from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
        from opentelemetry._logs import set_logger_provider
    except ImportError as exc:
        logging.getLogger(__name__).warning(
            "OTel log export disabled — %s. Logs go to stdout only.", exc
        )
        return None

    exporter = OTLPLogExporter(endpoint=f"{_otlp_http_endpoint}/v1/logs")
    provider = LoggerProvider(resource=_resource)
    provider.add_log_record_processor(BatchLogRecordProcessor(exporter))
    set_logger_provider(provider)
    return provider


# ── structlog + stdlib bridge ─────────────────────────────────────────────────
def _configure_logging() -> None:
    """
    Wire structlog → stdlib.LoggerFactory → ProcessorFormatter (JSON stdout)
                                          → OTELHandler (OTLP → Loki).

    Key ordering rules:
      1. Configure structlog FIRST (so get_logger() calls work immediately).
      2. Set up the StreamHandler and call root.handlers.clear() BEFORE
         LoggingInstrumentor.instrument() — the instrumentor appends its
         OTELHandler; clearing after would wipe it.
      3. Call LoggingInstrumentor LAST so it appends alongside our handler.
    """
    # 1. structlog: route through stdlib so records reach both stdout and OTel
    structlog.configure(
        processors=_PROCESSORS
        + [
            # Hand the event dict to ProcessorFormatter for final JSON rendering.
            # Required when using stdlib.LoggerFactory().
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.make_filtering_bound_logger(logging.DEBUG),
        cache_logger_on_first_use=True,
    )

    # 2. Attach JSON stdout handler to the root logger.
    #    ProcessorFormatter handles BOTH structlog records (via wrap_for_formatter)
    #    and plain stdlib records (via foreign_pre_chain).
    formatter = structlog.stdlib.ProcessorFormatter(
        processor=structlog.processors.JSONRenderer(),
        foreign_pre_chain=_PROCESSORS,
    )
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers.clear()          # remove any default handlers
    root.addHandler(stream_handler)
    root.setLevel(os.getenv("LOG_LEVEL", "INFO").upper())

    # 3. Add the OTel log handler AFTER our clear+add so it is not wiped.
    #    LoggingInstrumentor appends an OTELHandler that exports records to the
    #    LoggerProvider → OTLP → OTel Collector → Loki.
    from opentelemetry.instrumentation.logging import LoggingInstrumentor

    LoggingInstrumentor().instrument(set_logging_format=False)


# ── Public API ────────────────────────────────────────────────────────────────
def setup_telemetry() -> None:
    """
    Initialize all telemetry providers and logging.
    Call exactly once from the FastAPI lifespan (main.py).
    """
    _build_tracer_provider()
    _build_log_provider()   # must be before _configure_logging so LoggingInstrumentor finds the provider
    _build_meter_provider()
    _configure_logging()


def get_tracer(name: str):
    """Return an OTel Tracer for the given module name."""
    return trace.get_tracer(name)


def get_logger(name: str):
    """
    Return a structlog BoundLogger.
    Output is JSON-structured, enriched with trace_id/span_id, and routed
    through stdlib so it reaches both stdout and Loki via OTel.
    """
    return structlog.get_logger(name)


_rag_histogram = None


def get_rag_step_histogram():
    """
    Lazily create and return the RAG step duration histogram.

    Labels:  step = embed_query | hybrid_retrieval | llm_completion
    Unit:    seconds
    Purpose: per-step latency visible in Prometheus + Grafana Exemplars
    """
    global _rag_histogram
    if _rag_histogram is None:
        meter = metrics.get_meter("synapse.rag", version="1.0.0")
        _rag_histogram = meter.create_histogram(
            name="synapse_rag_step_duration_seconds",
            description="Duration of each RAG pipeline step in seconds",
            unit="s",
        )
    return _rag_histogram
