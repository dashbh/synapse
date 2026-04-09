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
MIN_SIMILARITY = 0.78  # chunks below this score are not relevant — raise to tighten, lower to broaden


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


def _build_prompt(query: str, chunks: list[dict]) -> str:
    context_blocks = []
    for i, chunk in enumerate(chunks, 1):
        source = chunk.get("source_file", "unknown")
        section = chunk.get("metadata", {}).get("section", "")
        content = chunk.get("content", "")
        header = f"[{i}] {source}" + (f" — {section}" if section else "")
        context_blocks.append(f"{header}\n{content}")

    context = "\n\n".join(context_blocks)
    return (
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
    category: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> tuple[str, list[dict]]:
    """
    Returns (answer_text, sources_list).
    Raises on Supabase or LLM errors — caller handles via A2UI error message.
    """
    # 1. Embed
    embedding = await _embed(query)

    # 2. Search (sync client → offload to thread)
    chunks = await asyncio.to_thread(
        _search_chunks, embedding, category, date_from, date_to
    )

    # 3. Filter by minimum similarity — discard chunks that are not relevant
    relevant_chunks = [c for c in chunks if float(c.get("similarity", 0)) >= MIN_SIMILARITY]

    if not relevant_chunks:
        return "I don't have any relevant information in the knowledge base to answer that question.", []

    # 4. Generate answer
    prompt = _build_prompt(query, relevant_chunks)
    response = await _openai.chat.completions.create(
        model=CHAT_MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    answer = response.choices[0].message.content.strip()

    # 5. Format sources
    sources = _format_sources(relevant_chunks)

    return answer, sources
