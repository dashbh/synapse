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

Instrumentation:
  Each pipeline step is a named OTel child span with GenAI semantic attributes.
  Step latencies are recorded in the synapse_rag_step_duration_seconds histogram.
  asyncio propagates ContextVar (including OTel span context) to child coroutines
  and to asyncio.to_thread() calls automatically — no manual copy_context() needed.
"""

import asyncio
import os
import time

from openai import AsyncOpenAI
from opentelemetry.trace import StatusCode
from supabase import create_client, Client

from app.config import settings
from app.telemetry import get_logger, get_rag_step_histogram, get_tracer

_LOG_QUERY_CONTENT = os.getenv("LOG_QUERY_CONTENT", "false").lower() == "true"

_openai = AsyncOpenAI(api_key=settings.openai_api_key)
_supabase: Client = create_client(settings.supabase_url, settings.supabase_anon_key)

tracer = get_tracer(__name__)
log = get_logger(__name__)

EMBEDDING_MODEL = "text-embedding-ada-002"
CHAT_MODEL = "gpt-4o-mini"
TOP_K = 5
MIN_SIMILARITY = 0.75  # chunks below this score are not relevant — raise to tighten, lower to broaden


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
    t0 = time.perf_counter()
    try:
        _supabase.table("messages").insert([
            {"session_id": session_id, "role": "user", "content": query},
            {"session_id": session_id, "role": "assistant", "a2ui_payload": a2ui_payload},
        ]).execute()
        log.info(
            "messages_stored",
            messages_inserted=2,
            duration_ms=round((time.perf_counter() - t0) * 1000, 1),
        )
    except Exception as e:
        log.error(
            "store_messages_failed",
            error=str(e),
            duration_ms=round((time.perf_counter() - t0) * 1000, 1),
            exc_info=True,
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

    Each pipeline step is wrapped in a named OTel child span. asyncio propagates
    ContextVar (and thus the active OTel span) automatically into coroutines and
    asyncio.to_thread() calls — no manual context copying is required.
    """
    hist = get_rag_step_histogram()

    # ── Step 1: embed_query (+ history fetch in parallel) ───────────────────
    t0 = time.perf_counter()
    with tracer.start_as_current_span(
        "embed_query",
        attributes={
            "gen_ai.system": "openai",
            "gen_ai.request.model": EMBEDDING_MODEL,
            "gen_ai.operation.name": "embeddings",
        },
    ) as embed_span:
        try:
            history_coro = (
                asyncio.to_thread(_fetch_history, session_id)
                if session_id
                else asyncio.sleep(0)  # no-op placeholder
            )
            embed_response, history_result = await asyncio.gather(
                _openai.embeddings.create(input=query, model=EMBEDDING_MODEL),
                history_coro,
            )
            embed_tokens = embed_response.usage.prompt_tokens if embed_response.usage else 0
            if embed_tokens:
                embed_span.set_attribute("gen_ai.usage.input_tokens", embed_tokens)
            embedding = embed_response.data[0].embedding
        except Exception as e:
            embed_span.record_exception(e)
            embed_span.set_status(StatusCode.ERROR, str(e))
            e._synapse_stage = "embed"  # type: ignore[attr-defined]
            raise
    embed_duration_ms = round((time.perf_counter() - t0) * 1000, 1)
    hist.record(embed_duration_ms / 1000, {"step": "embed_query"})

    history: list[dict] = history_result if session_id else []

    history_user = sum(1 for m in history if m["role"] == "user")
    history_assistant = sum(1 for m in history if m["role"] == "assistant")

    log.info(
        "session_history_loaded",
        history_turns=len(history),
        history_user_messages=history_user,
        history_assistant_messages=history_assistant,
        session_active=bool(session_id),
    )

    log.info(
        "embed_complete",
        embedding_model=EMBEDDING_MODEL,
        embedding_dimensions=len(embedding),
        embed_tokens=embed_tokens,
        duration_ms=embed_duration_ms,
        openai_request_id=getattr(embed_response, "_request_id", None),
    )

    # ── Step 2: hybrid_retrieval ─────────────────────────────────────────────
    t0 = time.perf_counter()
    with tracer.start_as_current_span(
        "hybrid_retrieval",
        attributes={
            "db.system": "postgresql",
            "db.operation": "rpc",
            "db.statement": "match_document_chunks",
            "synapse.retrieval.min_similarity": MIN_SIMILARITY,
            "synapse.retrieval.top_k": TOP_K,
        },
    ) as retrieval_span:
        try:
            chunks = await asyncio.to_thread(
                _search_chunks, embedding, category, date_from, date_to
            )
            relevant_chunks = [
                c for c in chunks if float(c.get("similarity", 0)) >= MIN_SIMILARITY
            ]
            retrieval_span.set_attribute("synapse.retrieval.chunks_total", len(chunks))
            retrieval_span.set_attribute(
                "synapse.retrieval.chunks_returned", len(relevant_chunks)
            )
        except Exception as e:
            retrieval_span.record_exception(e)
            retrieval_span.set_status(StatusCode.ERROR, str(e))
            e._synapse_stage = "retrieval"  # type: ignore[attr-defined]
            raise
    retrieval_duration_ms = round((time.perf_counter() - t0) * 1000, 1)
    hist.record(retrieval_duration_ms / 1000, {"step": "hybrid_retrieval"})

    scores = [float(c.get("similarity", 0)) for c in chunks]
    log.info(
        "retrieval_complete",
        chunks_fetched=len(chunks),
        chunks_after_filter=len(relevant_chunks),
        zero_results=len(relevant_chunks) == 0,
        similarity_threshold=MIN_SIMILARITY,
        similarity_top=round(max(scores), 4) if scores else None,
        similarity_min=round(min(scores), 4) if scores else None,
        similarity_mean=round(sum(scores) / len(scores), 4) if scores else None,
        filter_category=category,
        filter_date_from=date_from,
        filter_date_to=date_to,
        duration_ms=retrieval_duration_ms,
    )

    if not relevant_chunks:
        return (
            "I don't have any relevant information in the knowledge base to answer that question.",
            [],
            {},
        )

    # ── Step 3: llm_completion ───────────────────────────────────────────────
    prompt = _build_prompt(query, relevant_chunks, history)
    history_turns_included = len([m for m in history if m["role"] == "user"])

    log.info(
        "llm_request",
        llm_model=CHAT_MODEL,
        max_tokens=1024,
        context_chunks=len(relevant_chunks),
        history_turns_included=history_turns_included,
        estimated_prompt_chars=len(prompt),
        temperature=None,  # using model default
    )

    t0 = time.perf_counter()
    with tracer.start_as_current_span(
        "llm_completion",
        attributes={
            "gen_ai.system": "openai",
            "gen_ai.request.model": CHAT_MODEL,
            "gen_ai.operation.name": "chat",
            "synapse.retrieval.context_chunks": len(relevant_chunks),
        },
    ) as llm_span:
        try:
            response = await _openai.chat.completions.create(
                model=CHAT_MODEL,
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}],
            )
            if response.usage:
                llm_span.set_attribute("gen_ai.usage.input_tokens", response.usage.prompt_tokens)
                llm_span.set_attribute("gen_ai.usage.output_tokens", response.usage.completion_tokens)
                llm_span.set_attribute("gen_ai.usage.total_tokens", response.usage.total_tokens)
        except Exception as e:
            llm_span.record_exception(e)
            llm_span.set_status(StatusCode.ERROR, str(e))
            e._synapse_stage = "llm"  # type: ignore[attr-defined]
            raise
    llm_duration_ms = round((time.perf_counter() - t0) * 1000, 1)
    hist.record(llm_duration_ms / 1000, {"step": "llm_completion"})

    answer = response.choices[0].message.content.strip()
    finish_reason = response.choices[0].finish_reason if response.choices else None

    usage = {
        "model": CHAT_MODEL,
        "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
        "completion_tokens": response.usage.completion_tokens if response.usage else 0,
        "total_tokens": response.usage.total_tokens if response.usage else 0,
    }

    sources = _format_sources(relevant_chunks)

    _rag_complete_extra = {}
    if _LOG_QUERY_CONTENT:
        _rag_complete_extra["query_preview"] = query[:200]
        _rag_complete_extra["answer_preview"] = answer[:150]

    log.info(
        "rag_pipeline_complete",
        chunks_used=len(relevant_chunks),
        prompt_tokens=usage["prompt_tokens"],
        completion_tokens=usage["completion_tokens"],
        total_tokens=usage["total_tokens"],
        sources_count=len(sources),
        llm_model=CHAT_MODEL,
        answer_length=len(answer),
        finish_reason=finish_reason,
        llm_duration_ms=llm_duration_ms,
        openai_request_id=getattr(response, "_request_id", None),
        **_rag_complete_extra,
    )

    return answer, sources, usage
