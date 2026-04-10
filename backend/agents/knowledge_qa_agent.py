"""
Knowledge QA RAG Agent.

Pipeline:
  1. Embed the query (OpenAI text-embedding-ada-002, 1536-dim)
  2. Search Supabase pgvector via match_document_chunks RPC
  3. Build prompt from top-K chunks
  4. Call OpenAI chat completion to generate an answer
  5. Return (answer, sources) for A2UI message assembly

Requires Supabase function:
  See backend/README.md § Database Setup for the SQL.
"""

import asyncio
from openai import AsyncOpenAI
from supabase import create_client, Client

from app.config import settings

_openai = AsyncOpenAI(api_key=settings.openai_api_key)
_supabase: Client = create_client(settings.supabase_url, settings.supabase_anon_key)

EMBEDDING_MODEL = "text-embedding-ada-002"
CHAT_MODEL = "gpt-4o-mini"
TOP_K = 5
MIN_SIMILARITY = 0.75  # chunks below this score are not relevant — raise to tighten, lower to broaden


async def _embed(text: str) -> list[float]:
    response = await _openai.embeddings.create(input=text, model=EMBEDDING_MODEL)
    return response.data[0].embedding


def _search_chunks(
    query_embedding: list[float],
    category: str | None,
    date_from: str | None,
    date_to: str | None,
) -> list[dict]:
    """Synchronous Supabase RPC call — run in thread via asyncio.to_thread."""
    params = {
        "query_embedding": query_embedding,
        "match_count": TOP_K,
        "filter_category": category,
        "filter_date_from": date_from,
        "filter_date_to": date_to,
    }
    result = _supabase.rpc("match_document_chunks", params).execute()
    return result.data or []


def _fetch_history(session_id: str) -> list[dict]:
    """Return last 10 messages for a session, oldest first."""
    result = (
        _supabase.table("messages")
        .select("role, content, a2ui_payload")
        .eq("session_id", session_id)
        .order("created_at", desc=False)
        .limit(10)
        .execute()
    )
    return result.data or []


def store_messages(session_id: str, query: str, a2ui_payload: dict) -> None:
    """Persist user query + assistant A2UI payload in one batch insert.
    Called as a background task from the route — runs in a thread."""
    try:
        _supabase.table("messages").insert([
            {"session_id": session_id, "role": "user", "content": query},
            {"session_id": session_id, "role": "assistant", "a2ui_payload": a2ui_payload},
        ]).execute()
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(
            "Failed to store messages for session %s: %s", session_id, e
        )


def _build_prompt(query: str, chunks: list[dict], history: list[dict] | None = None) -> str:
    # Conversation history block (oldest first, up to 10 turns)
    history_block = ""
    if history:
        turns = []
        for msg in history:
            if msg["role"] == "user" and msg.get("content"):
                turns.append(f"User: {msg['content']}")
            elif msg["role"] == "assistant" and msg.get("a2ui_payload"):
                components = (
                    msg["a2ui_payload"]
                    .get("updateComponents", {})
                    .get("components", [])
                )
                answer_text = next(
                    (c.get("text", "") for c in components if c.get("id") == "answer-body"),
                    "",
                )
                if answer_text:
                    turns.append(f"Assistant: {answer_text}")
        if turns:
            history_block = "Previous conversation:\n" + "\n".join(turns) + "\n\n"

    context_blocks = []
    for i, chunk in enumerate(chunks, 1):
        source = chunk.get("source_file", "unknown")
        section = chunk.get("metadata", {}).get("section", "")
        content = chunk.get("content", "")
        header = f"[{i}] {source}" + (f" — {section}" if section else "")
        context_blocks.append(f"{header}\n{content}")

    context = "\n\n".join(context_blocks)
    return (
        f"{history_block}"
        f"Answer the following question using only the provided sources. "
        f"Be concise and factual. If the sources don't contain enough information, say so.\n\n"
        f"Question: {query}\n\n"
        f"Sources:\n{context}\n\n"
        f"Answer:"
    )


def _format_sources(chunks: list[dict]) -> list[dict]:
    sources = []
    for chunk in chunks:
        meta = chunk.get("metadata", {})
        sources.append({
            "id": str(chunk.get("id", "")),
            "title": chunk.get("source_file", "Unknown source"),
            "excerpt": chunk.get("content", "")[:400],
            "score": round(float(chunk.get("similarity", 0)), 4),
            "document": chunk.get("source_file", ""),
            "section": meta.get("section", ""),
            "date": str(chunk.get("upload_date", ""))[:10],
            "category": chunk.get("category", ""),
            "url": meta.get("url", ""),
        })
    return sources


async def run(
    query: str,
    session_id: str | None = None,
    category: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> tuple[str, list[dict], dict]:
    """
    Returns (answer_text, sources_list, usage_info).
    usage_info: {model, prompt_tokens, completion_tokens, total_tokens}
    Raises on Supabase or LLM errors — caller handles via A2UI error message.
    """
    # 1. Embed query + fetch session history in parallel
    history_coro = (
        asyncio.to_thread(_fetch_history, session_id)
        if session_id
        else asyncio.sleep(0)  # no-op placeholder
    )
    embedding, history_result = await asyncio.gather(
        _embed(query),
        history_coro,
    )
    history: list[dict] = history_result if session_id else []

    # 2. Search (sync client → offload to thread)
    chunks = await asyncio.to_thread(
        _search_chunks, embedding, category, date_from, date_to
    )

    # 3. Filter by minimum similarity — discard chunks that are not relevant
    relevant_chunks = [c for c in chunks if float(c.get("similarity", 0)) >= MIN_SIMILARITY]

    if not relevant_chunks:
        return (
            "I don't have any relevant information in the knowledge base to answer that question.",
            [],
            {},
        )

    # 4. Generate answer (with conversation history for context)
    prompt = _build_prompt(query, relevant_chunks, history)
    response = await _openai.chat.completions.create(
        model=CHAT_MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    answer = response.choices[0].message.content.strip()

    # 5. Capture token usage
    usage = {
        "model": CHAT_MODEL,
        "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
        "completion_tokens": response.usage.completion_tokens if response.usage else 0,
        "total_tokens": response.usage.total_tokens if response.usage else 0,
    }

    # 6. Format sources
    sources = _format_sources(relevant_chunks)

    return answer, sources, usage
