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
    category: str | None,
    date_from: str | None,
    date_to: str | None,
):
    # Message 1: create surface
    yield json.dumps(create_surface_msg()) + "\n"

    await asyncio.sleep(DELAY_MS)

    # Message 2: populate with RAG result
    try:
        answer, sources = await agent.run(query, category, date_from, date_to)
        yield json.dumps(update_components_msg(answer, sources)) + "\n"
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

    category = params.get("category") or None
    date_from = params.get("dateFrom") or None
    date_to = params.get("dateTo") or None

    return StreamingResponse(
        _stream(query, category, date_from, date_to),
        media_type="text/plain; charset=utf-8",
        headers={
            "Cache-Control": "no-cache, no-store",
            "X-Accel-Buffering": "no",
        },
    )
