import uuid
from fastapi import APIRouter, Body, Request, Response
from fastapi.responses import JSONResponse
from supabase import create_client

from app.config import settings
from app.telemetry import get_logger

router = APIRouter()
log = get_logger(__name__)

_supabase = create_client(settings.supabase_url, settings.supabase_anon_key)

COOKIE_NAME = "kqa_session_id"
COOKIE_MAX_AGE = 60 * 60 * 24 * 30  # 30 days


@router.get("")
async def list_sessions():
    """Return all sessions ordered by most recently updated, with message counts."""
    try:
        sessions_result = (
            _supabase.table("sessions")
            .select("id, name, created_at, updated_at")
            .order("updated_at", desc=True)
            .execute()
        )
        sessions = sessions_result.data or []

        # Fetch message counts in one query and join in Python
        if sessions:
            session_ids = [s["id"] for s in sessions]
            counts_result = (
                _supabase.table("messages")
                .select("session_id")
                .in_("session_id", session_ids)
                .execute()
            )
            count_map: dict[str, int] = {}
            for msg in (counts_result.data or []):
                sid = msg["session_id"]
                count_map[sid] = count_map.get(sid, 0) + 1
            for s in sessions:
                s["message_count"] = count_map.get(s["id"], 0)

        log.info("sessions_listed", count=len(sessions))
        return sessions
    except Exception as e:
        log.error("sessions_list_failed", error=str(e), exc_info=True)
        return JSONResponse(status_code=500, content={"detail": "Database error"})


@router.get("/current")
async def get_current_session(request: Request):
    """Return the active session from cookie, or 404 if none."""
    session_id = request.cookies.get(COOKIE_NAME)
    if not session_id:
        log.info("session_no_cookie")
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
        log.warning("session_cookie_stale", cookie_session_id=session_id)
        return JSONResponse(status_code=404, content={"detail": "Session not found"})

    session = result.data[0]
    log.info("session_fetched", session_id=session_id)
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
    log.info("session_created", session_id=session_id, session_name=session.get("name"))
    return session


@router.patch("/{session_id}")
async def rename_session(session_id: str, body: dict = Body(...)):
    """Rename a session. Body: { name: string }"""
    name = (body.get("name") or "").strip()
    if not name:
        return JSONResponse(status_code=422, content={"detail": "name is required"})
    try:
        result = (
            _supabase.table("sessions")
            .update({"name": name})
            .eq("id", session_id)
            .execute()
        )
        if not result.data:
            return JSONResponse(status_code=404, content={"detail": "Session not found"})
        log.info("session_renamed", session_id=session_id, new_name=name)
        return result.data[0]
    except Exception as e:
        log.error("session_rename_failed", session_id=session_id, error=str(e), exc_info=True)
        return JSONResponse(status_code=500, content={"detail": "Database error"})


@router.post("/{session_id}/activate")
async def activate_session(session_id: str, response: Response):
    """Switch active session: verify it exists, then update the cookie to point at it."""
    try:
        result = (
            _supabase.table("sessions")
            .select("id, name, created_at, updated_at")
            .eq("id", session_id)
            .execute()
        )
        if not result.data:
            return JSONResponse(status_code=404, content={"detail": "Session not found"})
        session = result.data[0]
    except Exception as e:
        log.error("session_activate_failed", session_id=session_id, error=str(e), exc_info=True)
        return JSONResponse(status_code=500, content={"detail": "Database error"})

    response.set_cookie(
        key=COOKIE_NAME,
        value=session_id,
        max_age=COOKIE_MAX_AGE,
        path="/",
        samesite="lax",
        httponly=False,
    )
    log.info("session_activated", session_id=session_id, session_name=session.get("name"))
    return session


@router.get("/{session_id}/messages")
async def get_session_messages(session_id: str):
    """Return stored turns as pre-paired {query, a2ui_payload} objects, oldest first.
    Used by the FE to hydrate (replay) a session on page load."""
    try:
        result = (
            _supabase.table("messages")
            .select("role, content, a2ui_payload")
            .eq("session_id", session_id)
            .order("created_at", desc=False)
            .execute()
        )
    except Exception as e:
        log.error("session_messages_fetch_failed", session_id=session_id, error=str(e), exc_info=True)
        return JSONResponse(status_code=500, content={"detail": "Database error"})

    messages = result.data or []

    # Pair user queries with their subsequent assistant payloads
    turns = []
    pending_query: str | None = None
    for msg in messages:
        if msg["role"] == "user":
            pending_query = msg.get("content", "")
        elif msg["role"] == "assistant" and msg.get("a2ui_payload") and pending_query is not None:
            turns.append({"query": pending_query, "a2ui_payload": msg["a2ui_payload"]})
            pending_query = None

    log.info("session_messages_fetched", session_id=session_id, turns_count=len(turns))
    return turns


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
