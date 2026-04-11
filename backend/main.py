import os
import logging
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from supabase import create_client

from app.routes import knowledge_qa, ingest, sessions
from app.config import settings

logger = logging.getLogger(__name__)

app = FastAPI(title="A2UI Platform Backend", version="1.0.0")

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
)

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
        logger.error("Health check — api_keys failed: %s", e)
        checks["api_keys"] = "error"

    try:
        supabase = create_client(settings.supabase_url, settings.supabase_anon_key)
        supabase.table("document_chunks").select("count", count="exact").limit(1).execute()
    except Exception as e:
        logger.error("Health check — database failed: %s", e)
        checks["database"] = "error"

    if any(v == "error" for v in checks.values()):
        return JSONResponse(status_code=503, content={"status": "unhealthy", "checks": checks})

    return {"status": "healthy", "checks": checks}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=True)
