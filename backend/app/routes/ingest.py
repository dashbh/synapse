import json
import logging
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse, JSONResponse

import agents.ingest_agent as agent

router = APIRouter()
logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md", ".docx"}


async def _stream(content: bytes, filename: str, category: str):
    try:
        async for msg in agent.run(content, filename, category):
            yield json.dumps(msg) + "\n"
    except Exception as exc:
        logger.error("Ingestion pipeline error for file=%r: %s", filename, exc, exc_info=True)


@router.post("/ingest")
async def ingest(request: Request):
    form = await request.form()
    file = form.get("file")

    if not file or not hasattr(file, "filename"):
        return JSONResponse(status_code=400, content={"detail": "file field is required"})

    ext = Path(file.filename).suffix.lower() if file.filename else ""
    if ext not in SUPPORTED_EXTENSIONS:
        return JSONResponse(
            status_code=400,
            content={"detail": f"Unsupported file type. Allowed: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"},
        )

    content = await file.read()
    category = str(form.get("category", "")).strip()

    return StreamingResponse(
        _stream(content, file.filename, category),
        media_type="text/plain; charset=utf-8",
        headers={
            "Cache-Control": "no-cache, no-store",
            "X-Accel-Buffering": "no",
        },
    )
