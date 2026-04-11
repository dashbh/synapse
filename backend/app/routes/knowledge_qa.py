import json
import time
import asyncio
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse, JSONResponse
from opentelemetry import trace as otel_trace
from opentelemetry.trace import StatusCode

from app.a2ui.messages import create_surface_msg, update_components_msg, SURFACE_ID, VERSION
from app.telemetry import get_logger, get_tracer
import agents.knowledge_qa_agent as agent

router = APIRouter()
tracer = get_tracer(__name__)
log = get_logger(__name__)

DELAY_MS = 0.35  # seconds between Message 1 and Message 2


def _error_components(error_text: str) -> dict:
    """Fallback updateComponents payload shown when the RAG pipeline fails."""
    return {
        "version": VERSION,
        "updateComponents": {
            "surfaceId": SURFACE_ID,
            "components": [
                {
                    "id": "answer-label",
                    "component": "Text",
                    "text": "Error",
                    "usageHint": "h2",
                },
                {
                    "id": "answer-body",
                    "component": "Text",
                    "text": error_text,
                    "usageHint": "body",
                },
            ],
        },
    }


async def _stream(
    query: str,
    session_id: str | None,
    surface_id: str,
    category: str | None,
    date_from: str | None,
    date_to: str | None,
):
    # Span 4: stream_response — wraps the full SSE streaming lifecycle.
    # The parent span (HTTP request) was created by FastAPIInstrumentor.
    # Child spans (embed_query, hybrid_retrieval, llm_completion) are created
    # inside agent.run() as grandchildren of this span.
    # Note: session_id, request_id, http_path etc. are already in structlog
    # contextvars (bound by request_context_middleware) — no need to repeat them.
    with tracer.start_as_current_span(
        "stream_response",
        attributes={
            "synapse.surface_id": surface_id,
            "synapse.query.length": len(query),
            "synapse.session_id": session_id or "",
        },
    ) as stream_span:
        t_stream = time.perf_counter()

        log.info(
            "sse_stream_started",
            query_length=len(query),
            surface_id=surface_id,
            category=category,
            has_date_filter=bool(date_from or date_to),
            delay_ms=round(DELAY_MS * 1000),
        )

        # Message 1: create surface (sent immediately)
        yield json.dumps(create_surface_msg(surface_id)) + "\n"

        await asyncio.sleep(DELAY_MS)

        # Message 2: populate with RAG result
        try:
            t_pipeline = time.perf_counter()
            answer, sources, usage = await agent.run(
                query, session_id=session_id, category=category,
                date_from=date_from, date_to=date_to,
            )
            pipeline_duration_ms = round((time.perf_counter() - t_pipeline) * 1000, 1)
            sources_count = len(sources)
            total_tokens = usage.get("total_tokens", 0)

            stream_span.set_attribute("synapse.response.sources_count", sources_count)
            stream_span.set_attribute("synapse.response.total_tokens", total_tokens)

            payload = update_components_msg(answer, sources, usage, surface_id)
            payload_json = json.dumps(payload)
            yield payload_json + "\n"

            _PAYLOAD_LIMIT = 8192
            log.info(
                "sse_stream_completed",
                duration_ms=round((time.perf_counter() - t_stream) * 1000, 1),
                pipeline_duration_ms=pipeline_duration_ms,
                sources_count=sources_count,
                total_tokens=total_tokens,
                answer_length=len(answer),
                messages_stored=bool(session_id),
                response_payload=payload_json if len(payload_json) < _PAYLOAD_LIMIT else payload_json[:_PAYLOAD_LIMIT],
                response_size_bytes=len(payload_json),
                response_truncated=len(payload_json) >= _PAYLOAD_LIMIT,
            )

            # Persist both turns in the background — don't block the stream
            if session_id:
                asyncio.create_task(
                    asyncio.to_thread(agent.store_messages, session_id, query, payload)
                )
        except Exception as exc:
            stream_span.record_exception(exc)
            stream_span.set_status(StatusCode.ERROR, str(exc))
            log.error(
                "sse_stream_error",
                duration_ms=round((time.perf_counter() - t_stream) * 1000, 1),
                error=str(exc),
                error_type=type(exc).__name__,
                error_stage=getattr(exc, "_synapse_stage", "unknown"),
                exc_info=True,
            )
            yield json.dumps(_error_components(
                "Something went wrong while processing your request. Please try again."
            )) + "\n"


@router.post("/knowledge-qa")
async def knowledge_qa(request: Request):
    params = request.query_params
    query = params.get("query", "").strip()
    if not query:
        return JSONResponse(status_code=400, content={"detail": "query parameter is required"})

    # session_id: URL param (forwarded by FE via filters) — optional
    session_id = params.get("session_id") or None
    # surface_id: unique per turn from FE; fallback to default for backwards compat
    surface_id = params.get("surface_id") or SURFACE_ID

    category = params.get("category") or None
    date_from = params.get("dateFrom") or None
    date_to = params.get("dateTo") or None

    # Extract the trace_id from the current OTel span (created by FastAPIInstrumentor).
    # We add it to the StreamingResponse headers so the frontend can log it.
    span_ctx = otel_trace.get_current_span().get_span_context()
    extra_headers: dict[str, str] = {}
    if span_ctx.is_valid:
        extra_headers["X-Trace-ID"] = format(span_ctx.trace_id, "032x")

    # session_id, request_id, http_method, http_path, client_ip are already
    # in structlog contextvars — no need to repeat them here.
    log.info(
        "knowledge_qa_request",
        query=query[:200],
        query_length=len(query),
        surface_id=surface_id,
        surface_id_is_default=(surface_id == SURFACE_ID),
        category=category,
        date_from=date_from,
        date_to=date_to,
        has_date_filter=bool(date_from or date_to),
        has_session=bool(session_id),
    )

    return StreamingResponse(
        _stream(query, session_id, surface_id, category, date_from, date_to),
        media_type="text/plain; charset=utf-8",
        headers={
            "Cache-Control": "no-cache, no-store",
            "X-Accel-Buffering": "no",
            **extra_headers,
        },
    )
