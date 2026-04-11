import uuid
from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
from supabase import create_client

from app.config import settings
from app.telemetry import get_logger

router = APIRouter()
log = get_logger(__name__)

_supabase = create_client(settings.supabase_url, settings.supabase_anon_key)

COOKIE_NAME = "kqa_session_id"
COOKIE_MAX_AGE = 60 * 60 * 24 * 30  # 30 days


@router.get("/current")
async def get_current_session(request: Request):
    """Return the active session from cookie, or 404 if none."""
    session_id = request.cookies.get(COOKIE_NAME)
    if not session_id:
        return JSONResponse(status_code=404, content={"detail": "No active session"})

    try:
        result = (
            _supabase.table("sessions")
            .select("id, name, created_at, updated_at")
            .eq("id", session_id)
            .execute()
        )
    except Exception as e:
        log.error("session_fetch_failed", error=str(e), exc_info=True)
        return JSONResponse(status_code=500, content={"detail": "Database error"})

    if not result.data:
        return JSONResponse(status_code=404, content={"detail": "Session not found"})

    session = result.data[0]
    log.info("session_fetched", response_payload=session)
    return session


@router.post("")
async def create_session(response: Response):
    """Create a new session, set a cookie, and return the session object."""
    session_id = str(uuid.uuid4())

    try:
        result = (
            _supabase.table("sessions")
            .insert({"id": session_id, "name": "New Session"})
            .execute()
        )
        session = result.data[0]
    except Exception as e:
        log.error("session_create_failed", error=str(e), exc_info=True)
        return JSONResponse(status_code=500, content={"detail": "Failed to create session"})

    response.set_cookie(
        key=COOKIE_NAME,
        value=session_id,
        max_age=COOKIE_MAX_AGE,
        path="/",
        samesite="lax",
        httponly=False,  # FE can read for debug display
    )
    log.info("session_created", response_payload=session)
    return session


@router.delete("/{session_id}")
async def delete_session(session_id: str, response: Response):
    """Delete a session (cascades to messages) and clear the cookie."""
    try:
        _supabase.table("sessions").delete().eq("id", session_id).execute()
    except Exception as e:
        log.error("session_delete_failed", session_id=session_id, error=str(e), exc_info=True)
        return JSONResponse(status_code=500, content={"detail": "Failed to delete session"})

    # Clear cookie if it matches the deleted session
    response.delete_cookie(key=COOKIE_NAME, path="/")
    log.info("session_deleted", deleted_session_id=session_id)
    return Response(status_code=204)
