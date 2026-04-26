# Architecture Decision Records

**Last Updated:** April 2026  
**Scope:** Significant technical decisions affecting the Synapse platform — backend, frontend, data layer, infrastructure.

This log captures decisions that materially shape the system's behaviour, cost, or evolution. ADRs are **append-only**: once recorded, a decision is not edited. If a decision is later reversed or superseded, a new ADR is appended that references the previous one.

For implementation reference, see [Architecture.md](Architecture.md). For backlog and tech debt, see [Roadmap.md](Roadmap.md).

---

## ADR-001 — RAG Similarity Threshold Adjustment

**Status:** Accepted  
**Date:** 2026-04-26  
**Owners:** Backend · RAG pipeline  
**Affects:** `backend/agents/knowledge_qa_agent.py` · Knowledge-QA answer quality · prompt-token spend

### Context

The Knowledge-QA agent applies a post-retrieval filter `MIN_SIMILARITY` to the chunks returned by the `match_document_chunks` RPC. Any chunk whose cosine similarity (computed as `1 - <=> distance`) falls below the threshold is dropped before the prompt is constructed.

The threshold was originally set to **0.75** to favour precision: only chunks tightly aligned with the query reached the LLM, on the assumption that fewer-but-better sources produced fewer hallucinations.

In practice, broad technical queries (e.g. *"how does the platform handle session persistence?"*) returned zero relevant chunks despite the corpus containing accurate answers. The chunks were topically correct but lexically distant from the query phrasing — exactly the case where pure cosine similarity over `text-embedding-ada-002` underestimates relevance. The agent fell back to `"I don't have any relevant information…"` and the user experience suffered for queries the system should have answered.

### Decision

Lower `MIN_SIMILARITY` from **0.75** to **0.70**.

- The `match_document_chunks` RPC continues to return top-K chunks ranked by cosine distance
- The 0.70 threshold is applied in Python after the RPC returns
- `TOP_K = 5` is unchanged

### Consequences

**Accepted:**
- More chunks reach the LLM prompt window per query — richer context for ambiguous or broad questions
- Recall improves for queries that previously returned the no-results fallback
- Slight increase in average prompt-token spend per request

**Risks (under monitoring):**
- Lower-quality chunks may now reach the prompt, increasing the surface for the LLM to cite weakly relevant material as authoritative
- Prompt-window crowding could push the model toward longer responses, raising completion latency

**Indicators to watch (Grafana):**

| Signal | Source | Expected | Watch for |
|---|---|---|---|
| `synapse.retrieval.chunks_returned` | Tempo span attribute | distribution shifts upward | a long tail of 5/5 chunks where score < 0.72 |
| `synapse_rag_step_duration_seconds{step="llm_completion"}` p95 | Prometheus | ≤ pre-change baseline + 10% | sustained > 15% degradation |
| Answer-quality review (qualitative) | manual sampling | factually grounded | citations to chunks below 0.75 not supporting the claim |

### Reversal Criteria

Revert to a higher threshold (or move to per-query adaptive thresholding) if either holds for one full release cycle:

- Hallucination rate measurably increases in answer-quality review
- p95 LLM-completion latency degrades > 15% without an offsetting recall improvement

---
