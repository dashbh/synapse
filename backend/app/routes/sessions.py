import uuid
import logging
from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
from supabase import create_client

from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

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
        logger.error("Failed to fetch session %s: %s", session_id, e)
        return JSONResponse(status_code=500, content={"detail": "Database error"})

    if not result.data:
        return JSONResponse(status_code=404, content={"detail": "Session not found"})

    return result.data[0]


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
        logger.error("Failed to create session: %s", e)
        return JSONResponse(status_code=500, content={"detail": "Failed to create session"})

    response.set_cookie(
        key=COOKIE_NAME,
        value=session_id,
        max_age=COOKIE_MAX_AGE,
        path="/",
        samesite="lax",
        httponly=False,  # FE can read for debug display
    )
    return session


@router.delete("/{session_id}")
async def delete_session(session_id: str, response: Response):
    """Delete a session (cascades to messages) and clear the cookie."""
    try:
        _supabase.table("sessions").delete().eq("id", session_id).execute()
    except Exception as e:
        logger.error("Failed to delete session %s: %s", session_id, e)
        return JSONResponse(status_code=500, content={"detail": "Failed to delete session"})

    # Clear cookie if it matches the deleted session
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return Response(status_code=204)
