import json
import logging
import asyncio
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse, JSONResponse

from app.a2ui.messages import create_surface_msg, update_components_msg, SURFACE_ID, VERSION
import agents.knowledge_qa_agent as agent

router = APIRouter()
logger = logging.getLogger(__name__)

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
    # Message 1: create surface
    yield json.dumps(create_surface_msg(surface_id)) + "\n"

    await asyncio.sleep(DELAY_MS)

    # Message 2: populate with RAG result
    try:
        answer, sources, usage = await agent.run(
            query, session_id=session_id, category=category,
            date_from=date_from, date_to=date_to,
        )
        payload = update_components_msg(answer, sources, usage, surface_id)
        yield json.dumps(payload) + "\n"

        # Persist both turns in the background — don't block the stream
        if session_id:
            asyncio.create_task(
                asyncio.to_thread(agent.store_messages, session_id, query, payload)
            )
    except Exception as exc:
        logger.error("RAG pipeline error for query=%r: %s", query, exc, exc_info=True)
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

    return StreamingResponse(
        _stream(query, session_id, surface_id, category, date_from, date_to),
        media_type="text/plain; charset=utf-8",
        headers={
            "Cache-Control": "no-cache, no-store",
            "X-Accel-Buffering": "no",
        },
    )
