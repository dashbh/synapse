# Testing Strategy — Synapse Platform

**Version:** 1.1  
**Last Updated:** April 18, 2026  
**Status:** E2E tests operational (11 passing) · k6 load testing in backlog

---

## 1. Philosophy

**Test the user's experience, not the implementation.**

- Tests verify that the system does what users see — not that internal functions exist.
- Mock-free where possible: the FE mock API routes let E2E tests run without a real backend, exercising the same code paths the real system uses.
- Observability is the first line of defence for production issues; tests are a regression net for known-good behaviour.
- A flaky test that sometimes passes is worse than no test — every test in this suite must have a deterministic pass condition.

---

## 2. Testing Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 4: Load Testing (k6)              — 🔲 Backlog           │
│  Concurrent users, RAG throughput, ingest stress → Grafana      │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: E2E Testing (Playwright)       — ✅ 11/12 passing     │
│  Browser automation against the running app (mock backend)      │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: API / Integration (curl + health checks)  — manual    │
│  Backend endpoints, session API, SSE stream shape               │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Observability (Grafana)        — operational          │
│  Real traffic → Loki logs, Tempo traces, Prometheus metrics     │
└─────────────────────────────────────────────────────────────────┘
```

We do not have unit tests at this stage. The RAG pipeline is end-to-end by nature (embedding + vector search + LLM) and does not benefit from mocking. The FE rendering layer is covered by E2E tests.

---

## 3. E2E Tests (Playwright)

### Stack

- **Framework:** `@playwright/test` v1.48+
- **Browser:** Chromium (headless by default)
- **Backend mode:** Mock — Next.js API routes have built-in mock fallbacks when `BACKEND_URL` is unset. Tests run against `http://localhost:3000` with no real backend dependency.
- **Config:** `frontend/playwright.config.ts`

### Running tests

```bash
# Pre-requisite: dev server must be running
cd frontend && npm run dev   # in a separate terminal

# Run all E2E tests
npm run test:e2e             # or: make test-e2e from repo root

# Open Playwright UI (interactive, step-through)
npm run test:e2e-ui          # or: make test-e2e-ui

# Run a single spec file
npx playwright test tests/e2e/knowledge-qa.spec.ts

# Run in headed mode (see the browser)
npx playwright test --headed

# Generate a report
npx playwright show-report
```

### Test files

| File | What it tests |
|---|---|
| `frontend/tests/e2e/home.spec.ts` | Root redirect to `/knowledge-qa`; query input visible; page title set |
| `frontend/tests/e2e/knowledge-qa.spec.ts` | Empty state on first load; session badge visible; query submit → TurnView appears; ⌘K opens command palette |
| `frontend/tests/e2e/session.spec.ts` | Session badge shows `sid:…` prefix; New Chat via command palette resets to empty state; Document drawer opens |
| `frontend/tests/e2e/upload.spec.ts` | Drag-drop test intentionally skipped (Chromium sandbox blocks synthetic DragEvent.dataTransfer); `/api/agents/ingest` returns 200 for file upload |

### `data-testid` attributes

Stable selectors are preferred over CSS or text. These attributes are in the production build (low cost, no conditionals):

| `data-testid` | Element | File |
|---|---|---|
| `empty-state` | Empty state container | `KnowledgeQAApp.tsx` |
| `turn-view` | Each query/answer turn | `KnowledgeQAApp.tsx` |
| `session-badge` | Session ID button in header | `KnowledgeQAApp.tsx` |

### CI behaviour

Set `BASE_URL` to override the target host. Retries are 2 on CI, 0 locally. The HTML report is always generated at `frontend/playwright-report/`.

```yaml
# Example GitHub Actions step
- name: Run E2E tests
  run: |
    cd frontend
    npm ci
    npm run build && npm run start &
    npx wait-on http://localhost:3000
    npm run test:e2e
  env:
    BASE_URL: http://localhost:3000
```

### Adding new tests

1. Create a new `*.spec.ts` file in `frontend/tests/e2e/`
2. Use `page.getByTestId()` or `page.getByRole()` — avoid class-based selectors
3. Add `data-testid` to the component if no stable selector exists
4. Keep timeouts explicit (`{ timeout: 15000 }` for streaming flows, `{ timeout: 10000 }` for session badge/init, `{ timeout: 3000 }` for UI interactions)
5. Mock mode means no real data — tests assert structure and interaction, not content
6. Always call `deleteTestSession(page)` in `test.afterEach` to clean up Supabase rows created during the test run

---

## 4. API / Integration Testing (Manual)

These are manual curl-based checks for validating backend contracts. Run them when the full stack is up (`make dev`).

### Health check

```bash
curl http://localhost:8000/health
# Expected: { "status": "ok", "openai": true, "supabase": true }
```

### RAG query (2-message SSE stream)

```bash
curl -sN -X POST \
  "http://localhost:8000/api/agents/knowledge-qa?query=What+is+RAG" \
  | while IFS= read -r line; do echo "$line" | python -m json.tool; done
# Expected: createSurface message, then updateComponents message
```

### Session lifecycle

```bash
# Create session
curl -X POST http://localhost:8000/api/sessions -c /tmp/cookies.txt
# → { "id": "<uuid>", "name": null, ... }

# List sessions
curl http://localhost:8000/api/sessions -b /tmp/cookies.txt
# → [{ "id": "...", "name": null, "message_count": 0 }]

# Rename session
curl -X PATCH http://localhost:8000/api/sessions/<uuid> \
  -b /tmp/cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name": "Test session"}'

# Delete session
curl -X DELETE http://localhost:8000/api/sessions/<uuid> -b /tmp/cookies.txt
# → 204 No Content
```

### Document ingestion

```bash
curl -s -X POST http://localhost:8000/api/agents/ingest \
  -F "file=@/path/to/doc.pdf" \
  --no-buffer
# Expected: SSE progress events: upload → parsing → chunking → embedding → storing
```

---

## 5. Load Testing (k6) — Backlog

**Status: backlog.** Three scenarios planned: RAG query ramp, concurrent sessions, ingest stress. Makefile targets (`load-test-query`, `load-test-sessions`, `load-test-ingest`) are already wired. Scenario files and Grafana k6 dashboard JSON not yet created. See [Roadmap.md](Roadmap.md).

---

## 6. Observability as a Testing Tool

Grafana is a first-class debugging tool during test runs, not just production monitoring.

**During E2E tests:** Check the Frontend row in the Synapse Observability dashboard. Each test submission generates `query_submit`, `stream_start`, `stream_complete` log events. If a test fails intermittently, the FE error logs panel shows what went wrong.

**During load tests:** The k6 dashboard shows latency percentiles per phase. Cross-reference with the RAG Pipeline row to see which step (embed/retrieval/LLM) is the bottleneck.

**For debugging failures:**
1. Find the session_id from the session badge in the UI
2. Query Loki: `{service_name="synapse-frontend"} | json | session_id="<uuid>"`
3. Find the `trace_id` on the `stream_connected` event
4. Jump to Tempo: `{ trace:id = "<trace_id>" }`
5. See exactly which BE step failed and how long it took

For full observability instructions, see [Observability.md](Observability.md).

---

## 7. What We Don't Test (and Why)

| Area | Why skipped |
|---|---|
| Unit tests (FE components) | Rendering is deterministic from A2UI protocol — E2E tests cover the rendered output more accurately than snapshot tests |
| Unit tests (BE RAG pipeline) | The pipeline is inherently end-to-end (real embeddings, real vector search, real LLM); mocking any step loses the value of the test |
| Contract tests | Contracts are validated by the E2E tests (FE submits → A2UI protocol received) and the curl integration tests |
| Visual regression | No snapshot baseline yet; planned alongside the design system audit in a future iteration |
| Accessibility (a11y) | Shadcn/ui components have built-in ARIA; Playwright can run axe checks — planned for v2 |

---

## 8. Document Reference

| Need | Document |
|---|---|
| FE + BE logging setup | [Observability.md](Observability.md) |
| System architecture | [Architecture.md](Architecture.md) |
| FE component APIs | [FE_Reference.md](FE_Reference.md) |
| API contracts | [Contracts.md](Contracts.md) |
| Code quality standards | [Governance.md](Governance.md) |
