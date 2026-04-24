# A2UIPlatform Governance & Architecture Rules

**Last Updated:** April 7, 2026  
**Scope:** Shared rules across all layers (Frontend, Backend, Infrastructure)

---

## Core Project Definition

**What is A2UIPlatform?**  
A Next.js platform shell that renders agent-generated UIs using the Google A2UI v0.9 protocol. First app: Knowledge Q&A. Platform shell must remain app-agnostic.

---

## Architecture Rules (Never Break These)

### Layer Boundaries

```
src/platform/
  ↓ (imports from)
src/a2ui/
  ↓ (imports from)
src/apps/ ← can import from both above
```

**Specific rules:**
- ✅ `src/platform/` can import from `src/a2ui/` and `src/shared/`
- ❌ `src/platform/` CANNOT import from `src/apps/` (must stay app-agnostic)
- ✅ `src/a2ui/` can import from `src/shared/` only
- ❌ `src/a2ui/` CANNOT import from `src/apps/` (protocol layer, reusable)
- ✅ `src/apps/` can import from `src/platform/`, `src/a2ui/`, and `src/shared/`
- ✅ New apps registered in `src/platform/registry/AppRegistry.ts` only

**Why:** Platform shell must work with any app. A2UI is pluggable. Apps are feature bundles.

---

## A2UI Protocol Rules

- ✅ Use `@a2ui/web_core/v0_9` for protocol: MessageProcessor, Catalog, state, data binding
- ✅ Import path: `import { ... } from '@a2ui/web_core/v0_9'` (NOT the root export — that resolves to v0.8)
- ✅ MessageProcessor is the single source of truth for surface state — never duplicate it
- ✅ Catalog components are pure rendering — map A2UI types to React + design tokens only
- ✅ useAgentStream is the only place that touches SSE — no direct EventSource elsewhere
- ✅ ComponentHost dynamically resolves A2UI component types to React components

**Why:** Centralized state management, protocol compliance, single transport layer.

---

## Code Rules

- ✅ **TypeScript strict mode** throughout (`tsconfig.json: { strict: true }` and `strict: true` in individual files)
- ❌ **No `any`** types — always declare explicit types
- ❌ **No `as unknown as X`** casts — use proper type narrowing
- ✅ **One component per file** — file name matches component name
  - ❌ ~~BadgeComponent.tsx exporting Button~~ 
  - ✅ ButtonComponent.tsx exporting only Button
- ✅ **Hooks start with `use`** and live in `hooks/` directories
- ❌ **No barrel re-exports** that import from multiple layers (causes circular dependencies)
- ✅ **When in doubt, make it smaller and more focused** — break components into smaller units

---

## Import Rules

### No Circular Dependencies
- Platform shell cannot depend on app-specific logic
- A2UI layer is self-contained (except `src/shared/`)
- Apps can depend on platform + a2ui, not vice versa

### Destructive Imports
- ✅ `import { Foo } from './Foo'` — specific imports
- ❌ ~~`import * as bar from './bar'`~~ — barrel imports can hide circular deps
- Exception: re-exports at layer boundaries OK (e.g., `src/a2ui/renderer/index.ts`)

### Path Aliases
- Use `@/*` for all imports: `import { X } from '@/a2ui/renderer'`
- Never use relative paths across layers: `../../a2ui` ❌

---

## Naming Conventions

| Category | Rule | Example |
|---|---|---|
| Components | PascalCase, match filename | `TextComponent.tsx` exports `TextComponent` |
| Hooks | camelCase, start with `use` | `useAgentStream.ts` exports `useAgentStream` |
| Utilities | camelCase | `resolveStaticString.ts` exports `resolveStaticString` |
| Types | PascalCase | `export type StreamStatus = ...` |
| Constants | UPPER_SNAKE_CASE | `export const KNOWLEDGE_QA_CONFIG = ...` |
| Folders | kebab-case or lowercase | `src/a2ui/`, `src/apps/`, not `src/A2UI/` |
| React Context | PascalCase + "Context" suffix | `MessageProcessorContext` |

---

## What NOT to Do (v1 Constraints)

- ❌ No real authentication / authorization (mock bypass — real OAuth deferred, see Roadmap)

- ❌ No over-engineering (follow YAGNI principle)
- ❌ No client-side secrets (never leak API keys to browser)
- ❌ No polling or WebSocket overhead (SSE only)
- ❌ No manual A2UI JSON parsing (always use MessageProcessor)
- ❌ No littering console.log in production code (use debug utility if needed)

---

## State Management Rules

| Layer | State Owner | Tool | Scope |
|---|---|---|---|
| **Platform** | `platformStore` | Zustand | Current active app, global UI state |
| **A2UI Surface** | `MessageProcessor` | @a2ui/web_core/v0_9 | Component definitions, data bindings, rendering tree |
| **App** | Component local state | React hooks | Query input, form state, validation |
| **Transport** | None (streaming only) | SSE | No persistent connection state |

**Rule:** MessageProcessor is the single source of truth for surface state. Never duplicate it in local state.

---

## Data Flow Rules

1. **User → App:** App captures user input (e.g., query text)
2. **App → Transport:** App calls `useAgentStream.start(query)` with endpoint
3. **Transport → Backend (SSE):** Opens stream, receives JSONL messages
4. **Backend → Transport (SSE):** Sends 2-message sequence (`createSurface` → `updateComponents`)
5. **Transport → MessageProcessor:** Each message fed via `processor.processMessages()`
6. **MessageProcessor → React State:** Surfaces/components render via SurfaceView + ComponentHost
7. **React → User:** UI displayed in browser

**No shortcuts:** Never bypass MessageProcessor for state, never fetch directly from app component.

---

## Error Handling Rules

- ✅ Network error → show "Connection failed" + retry button
- ✅ SSE timeout (30s+) → show error state + retry button
- ✅ Invalid A2UI message → console warn + show error (don't crash)
- ✅ Unknown component type → log warning + render fallback (don't crash)
- ✅ Backend error (HTTP 500) → show error message + retry button

**Rule:** Never throw uncaught errors to user. Always catch and display user-friendly message.

---

## Testing Rules

- ✅ Playwright E2E tests operational — see [Testing_Strategy.md](Testing_Strategy.md)
- ✅ E2E test: user query → full render pipeline
- Critical paths covered: home, knowledge-qa, session, upload

---

## Documentation Rules

- ✅ Each file has single responsibility (documented at top)
- ✅ Architecture rules here (this file)
- ✅ Tech stack decisions in Architecture.md §3
- ✅ How-to guides in FE_Patterns.md
- ✅ Reference (components, tokens) in FE_Reference.md
- ✅ Protocol details in A2UI_Specification.md
- ✅ Layer contracts in Contracts.md

---

## When Adding New Things

### Adding a New App
1. Create folder `src/apps/<app-name>/`
2. Create `<app-name>/index.ts` exporting app definition
3. Register in `src/platform/registry/AppRegistry.ts`
4. Follow KnowledgeQAApp pattern
5. See [FE_Patterns.md](FE_Patterns.md) for step-by-step

### Adding a New Catalog Component
1. Create `src/a2ui/catalog/components/NewComponent.tsx`
2. Register in `src/a2ui/catalog/catalogRegistry.tsx`
3. Update ComponentHost type map
4. Add to FE_Reference.md
5. See [FE_Patterns.md](FE_Patterns.md) for step-by-step

### Adding a New Design Token
1. Add to `src/a2ui/catalog/designTokens.ts`
2. Update `FE_Reference.md` reference table
3. Ensure Tailwind config includes new token
4. Test in one component first

### Adding a New Endpoint (Backend)
1. Follow Contracts.md SSE spec exactly
2. Stream 2-message A2UI v0.9 sequence (`createSurface` → `updateComponents`)
3. Test with curl (template in Contracts.md §7)
4. Add route in `backend/app/routes/` following `knowledge_qa.py` pattern

---

## Build Quality & Resilience Standards

### Stream Handling & Resource Management

**Connection Lifecycle:**
- ✅ Explicit SSE connection close when navigating between apps (prevent leaks)
- ✅ Single source of truth for surface state (MessageProcessor only)
- ✅ Clear MessageProcessor state on app change
- ✅ Cancel pending requests when user navigates away

**Error Resilience:**
- ✅ Graceful degradation on stream interruption (display partial state, not blank screen)
- ✅ Retry with exponential backoff for transient errors
- ✅ User-visible error messaging for all failures
- ✅ Abort requests when user navigates away

### TypeScript & Runtime Safety

- ✅ **Strict mode** throughout (`tsconfig.json: { "strict": true }`)
- ✅ **Runtime schema validation** of incoming A2UI messages (reject invalid JSON)
- ✅ **All A2UI types validated at compile time** (no type coercion)
- ✅ **Never manually parse A2UI** — always use MessageProcessor

### Performance Standards (SLAs)

**Frontend Targets:**
- Initial app load: < 2 seconds
- Semantic search query → result: < 2 seconds
- SSE frame rendering latency: < 100ms after message arrival
- Ingestion progress update (per step): < 500ms

**Backend Targets (v2):**
- Document parsing: < 5 seconds per 100KB file
- Embedding generation: < 10 seconds per 100 chunks
- Semantic search response: < 1 second (including network)

**Monorepo Health:**
- No resource leaks on app switching
- No console warnings in production builds
- Bundle size < 200KB gzipped (frontend)

### Security & Authorization

**Authentication (current: mock bypass — real OAuth in backlog):**
- Ingestion endpoint uses a mock bypass; real OAuth/SAML deferred (see [Roadmap.md](Roadmap.md))

**Authorization:**
- Admin role: Access to ingestion endpoints
- User role: Access to app queries
- Role-based access control (RBAC) per app — deferred until real auth is implemented

**Data Privacy:**
- ✅ No sensitive data in logs
- ✅ Vector store access: credentialed requests only
- ✅ SSE streams: encrypted in transit (HTTPS in production)
- ✅ No secrets in browser (never leak API keys to client)

### Testing Requirements

- ✅ Unit tests for catalog components (React Testing Library)
- ✅ Integration tests for SSE streaming (messaging flow)
- ✅ E2E tests for critical paths (query → render)
- ✅ Visual regression tests for design tokens (if using Percy/etc.)

---

## Review Checklist (Before PR)

- [ ] No circular dependencies (check imports)
- [ ] TypeScript strict mode passes (`npm run build`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Component files match export names
- [ ] No `any` types
- [ ] A2UI rules followed (if touching renderer/transport)
- [ ] Layer boundaries respected
- [ ] Documentation updated if new concept introduced

---

**For implementation details, see:**
- [FE_Reference.md](FE_Reference.md) — Component & token APIs
- [FE_Patterns.md](FE_Patterns.md) — How-to guides
- [Architecture.md](Architecture.md) — System design + backend layout
- [Contracts.md](Contracts.md) — SSE protocol contract
