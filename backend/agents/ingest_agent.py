"""
Document Ingestion Agent.

Pipeline (streaming progress via async generator):
  1. Upload  — file received, size reported
  2. Parsing — extract plain text from PDF / DOCX / TXT / MD
  3. Chunking — recursive character splitter (CHUNK_SIZE chars, OVERLAP overlap)
  4. Embedding — OpenAI text-embedding-ada-002 in batches of 100
  5. Storing  — delete existing chunks for same source_file, insert new ones

Deduplication: uploading the same file name again replaces previous chunks.
"""

import asyncio
import uuid
from pathlib import Path
from typing import AsyncIterator

from openai import AsyncOpenAI
from supabase import create_client, Client

from app.config import settings

_openai = AsyncOpenAI(api_key=settings.openai_api_key)
_supabase: Client = create_client(settings.supabase_url, settings.supabase_anon_key)

EMBEDDING_MODEL = "text-embedding-ada-002"
CHUNK_SIZE = 1500   # characters
CHUNK_OVERLAP = 150  # characters
EMBED_BATCH = 100   # max texts per OpenAI embeddings call


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

def _parse_text(content: bytes, filename: str) -> str:
    ext = Path(filename).suffix.lower()

    if ext in (".txt", ".md"):
        return content.decode("utf-8", errors="replace")

    if ext == ".pdf":
        import io
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(content))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n\n".join(p for p in pages if p.strip())

    if ext == ".docx":
        import io
        from docx import Document
        doc = Document(io.BytesIO(content))
        return "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())

    raise ValueError(f"Unsupported file type: {ext!r}")


# ---------------------------------------------------------------------------
# Chunking — recursive character splitter
# ---------------------------------------------------------------------------

def _split_text(text: str) -> list[str]:
    separators = ["\n\n", "\n", ". ", " ", ""]

    def _split(text: str, seps: list[str]) -> list[str]:
        if not seps or len(text) <= CHUNK_SIZE:
            return [text] if text.strip() else []

        sep, remaining_seps = seps[0], seps[1:]
        if sep not in text:
            return _split(text, remaining_seps)

        chunks: list[str] = []
        current = ""
        for part in text.split(sep):
            candidate = current + (sep if current else "") + part
            if len(candidate) <= CHUNK_SIZE:
                current = candidate
            else:
                if current.strip():
                    chunks.append(current.strip())
                if len(part) > CHUNK_SIZE:
                    sub = _split(part, remaining_seps)
                    chunks.extend(sub[:-1])
                    current = sub[-1] if sub else ""
                else:
                    current = part
        if current.strip():
            chunks.append(current.strip())
        return chunks

    raw = _split(text, separators)

    # Add overlap: prepend tail of previous chunk to each subsequent chunk
    if CHUNK_OVERLAP == 0 or len(raw) <= 1:
        return raw
    result = [raw[0]]
    for i in range(1, len(raw)):
        result.append(raw[i - 1][-CHUNK_OVERLAP:] + " " + raw[i])
    return result


# ---------------------------------------------------------------------------
# Supabase helpers (sync — wrapped in asyncio.to_thread)
# ---------------------------------------------------------------------------

def _delete_existing(source_file: str) -> int:
    result = (
        _supabase.table("document_chunks")
        .delete()
        .eq("source_file", source_file)
        .execute()
    )
    return len(result.data) if result.data else 0


def _insert_chunks(
    batch_id: str,
    source_file: str,
    category: str,
    chunks: list[str],
    embeddings: list[list[float]],
) -> None:
    rows = [
        {
            "batch_id": batch_id,
            "source_file": source_file,
            "category": category,
            "chunk_index": i,
            "content": chunk,
            "embedding": embedding,
            "metadata": {},
        }
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
    ]
    _supabase.table("document_chunks").insert(rows).execute()


# ---------------------------------------------------------------------------
# Embedding
# ---------------------------------------------------------------------------

async def _embed_all(chunks: list[str]) -> list[list[float]]:
    results: list[list[float]] = []
    for i in range(0, len(chunks), EMBED_BATCH):
        batch = chunks[i : i + EMBED_BATCH]
        resp = await _openai.embeddings.create(input=batch, model=EMBEDDING_MODEL)
        results.extend(item.embedding for item in resp.data)
    return results


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

async def run(
    content: bytes,
    filename: str,
    category: str = "",
) -> AsyncIterator[dict]:
    """
    Async generator — yields progress dicts:
      {"step": str, "status": "idle"|"in_progress"|"done"|"error", "message": str}

    Raises after yielding an error message so the route can log it.
    """
    batch_id = str(uuid.uuid4())
    file_mb = f"{len(content) / 1024 / 1024:.1f}"

    # ── Upload ────────────────────────────────────────────────────────────────
    yield {"step": "upload", "status": "done", "message": f"{filename} received ({file_mb} MB)"}

    # ── Parsing ───────────────────────────────────────────────────────────────
    yield {"step": "parsing", "status": "in_progress", "message": "Extracting text..."}
    try:
        text = await asyncio.to_thread(_parse_text, content, filename)
        yield {"step": "parsing", "status": "done", "message": f"Extracted {len(text):,} characters"}
    except Exception as exc:
        yield {"step": "parsing", "status": "error", "message": "Failed to extract text"}
        raise

    # ── Chunking ──────────────────────────────────────────────────────────────
    yield {"step": "chunking", "status": "in_progress", "message": "Splitting into chunks..."}
    chunks = await asyncio.to_thread(_split_text, text)
    if not chunks:
        yield {"step": "chunking", "status": "error", "message": "No content found in file"}
        raise ValueError("No chunks produced — file may be empty")
    yield {"step": "chunking", "status": "done", "message": f"Created {len(chunks)} chunks"}

    # ── Embedding ─────────────────────────────────────────────────────────────
    yield {"step": "embedding", "status": "in_progress", "message": f"Generating {len(chunks)} embeddings..."}
    try:
        embeddings = await _embed_all(chunks)
        yield {"step": "embedding", "status": "done", "message": f"Generated {len(embeddings)} embeddings"}
    except Exception as exc:
        yield {"step": "embedding", "status": "error", "message": "Embedding generation failed"}
        raise

    # ── Storing ───────────────────────────────────────────────────────────────
    yield {"step": "storing", "status": "in_progress", "message": "Storing in vector database..."}
    try:
        deleted = await asyncio.to_thread(_delete_existing, filename)
        await asyncio.to_thread(_insert_chunks, batch_id, filename, category, chunks, embeddings)
        msg = f"Stored {len(chunks)} chunks"
        if deleted:
            msg += f" (replaced {deleted} existing)"
        yield {"step": "storing", "status": "done", "message": msg}
    except Exception as exc:
        yield {"step": "storing", "status": "error", "message": "Failed to store in database"}
        raise
