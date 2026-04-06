# A2UIPlatform Architecture Overview

**Last Updated:** April 2, 2026  
**Status:** FE architecture locked, BE/Infra outline pending

---

## 1. System Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  FRONTEND (Next.js)                                     │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │ PlatformShell (Nav + Surface Area)              │   │   │
│  │  ├──────────────────────────────────────────────────┤   │   │
│  │  │ Active App: KnowledgeQAApp                       │   │   │
│  │  │ ├─ QueryInput (textarea)                        │   │   │
│  │  │ └─ A2UISurface (MessageProcessor → React)       │   │   │
│  │  │     └─ ComponentHost (type → component mapper)  │   │   │
│  │  │        └─ Catalog (Text/Card/Button/Badge/...)  │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │
         │ SSE (Server-Sent Events)
         │ POST /api/agents/knowledge-qa
         │ Content-Type: text/stream
         │ A2UI JSONL (surfaceUpdate, dataModelUpdate, beginRendering)
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Python FastAPI)  [v2]               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ POST /query                                            │   │
│  │  1. Validate query + extract intent                   │   │
│  │  2. LangChain: retrieve document chunks (Supabase pgvector) │
│  │  3. LLM: generate A2UI surface                 │   │
│  │  4. Stream A2UI JSONL messages (surfaceUpdate → dataModel → beginRendering)  │   │
│  │  5. Close SSE stream                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │
         │ pgvector queries + embeddings
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER (Supabase)  [v2]                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ pgvector embeddings table                              │   │
│  │ documents table (title, excerpt, source)              │   │
│  │ Semantic search via koalas library                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Governance & Rules

For detailed rules covering architecture constraints, code standards, layer boundaries, and import rules, see [Governance.md](Governance.md).

---

### Component Hierarchy

```
App Root (Next.js)
 │
 └─ PlatformShell (Layout)
     ├─ NavBar
     │  ├─ AppSwitcher (dropdown)
     │  └─ [+ Add App] (for future)
     │
     └─ Surface Area
        │
        └─ Active App (KnowledgeQAApp, etc.)
           ├─ QueryInput (app UI)
           ├─ StreamStatusBar (app UI)
           │
           └─ A2UISurface (A2UI layer — owned by MessageProcessor)
              │
              └─ ComponentHost
                 │
                 └─ Catalog Components (mapped from A2UI types)
                    ├─ TextComponent (h1/h2/h3/p/caption)
                    ├─ CardComponent (shadcn wrapper)
                    ├─ ButtonComponent (interaction)
                    ├─ BadgeComponent (metadata)
                    └─ SourceListComponent (custom — source attribution)
```

### State Ownership (Critical)

| Layer | State Owner | Scope |
|---|---|---|
| **Platform** | `platformStore` (Zustand) | Current active app, global UI state |
| **A2UI Surface** | `MessageProcessor` (@a2ui/web-lib) | Component definitions, data bindings, rendering tree |
| **App** | Component local state (React hooks) | Query input, form state, validation |
| **HTTP** | None (SSE streaming only) | No polling, no persistent connection mgmt |

**Rule:** MessageProcessor is the single source of truth for surface state. Never duplicate it.

### Data Flow (Message Sequence)

```
1. User types query
   ↓
2. KnowledgeQAApp.onSubmit()
   ├─ Validate query
   ├─ useAgentStream.start(query)
   └─ Set status → STREAMING
   ↓
3. useAgentStream opens SSE (EventSource)
   └─ Connects to: POST /api/agents/knowledge-qa?query=...
   ↓
4. MessageProcessor receives messages (in order):
   │
   ├─ Message 1: surfaceUpdate
   │  └─ Defines: [answer-label, answer-body, sources-label, sources-list]
   │
   ├─ Message 2: dataModelUpdate
   │  └─ Populates: /answer/text = "...", /sources[0..n] = [...]
   │
   └─ Message 3: beginRendering
      └─ Signals: root = "answer-label", now render
   ↓
5. A2UISurface re-renders from processor state
   ├─ ComponentHost resolves types to React components
   ├─ Each component gets props from processor
   ├─ Catalog components render with design tokens
   └─ User sees: Answer text + Source cards
   ↓
6. Stream closes
   └─ Status → DONE
```

### Design System Integration

```
A2UI Component → usageHint (semantic hint) → Design Token
   Example:
   Text with usageHint: "h2"
     ↓
   TextComponent calls: getTokenForHint("h2")
     ↓
   Returns: { fontSize: "1.5rem", fontWeight: "700", color: "#1F2937" }
     ↓
   <h2 className="text-2xl font-bold text-gray-900">...</h2>
```

All styling driven by design tokens — defined as TypeScript constants in `src/a2ui/catalog/index.ts`.

---

## 3. Platform Shell Implementation (Frontend)

### Core Stack Decisions

**Why these choices?**

| Choice | Tech | Reason |
|---|---|---|
| **Framework** | React 19 + Next.js 16+ | SSR ready, App Router for clean routing, fast refresh |
| **Styling** | Tailwind CSS 4 + design tokens | Utility-first, design system integration, performant |
| **Components** | shadcn/ui (headless) | Composable, unstyled base for design token customization |
| **State** | Zustand (platform level) | Lightweight, minimal boilerplate, app registry management |
| **Protocol** | A2UI v0.9 via MessageProcessor | Decoupled UI layer, vendor-agnostic rendering |
| **Transport** | SSE (Server-Sent Events) | Streaming, simpler than WebSocket, unidirectional fits use case |

### Platform Shell Responsibilities

```
Next.js App Router
└─ Layout (root RootLayout)
   ├─ MessageProcessorProvider (context wrapper)
   ├─ PlatformShell (nav + surface area)
   │  ├─ AppSwitcher (route-aware nav)
   │  └─ Main content area
   │     └─ Current app (KnowledgeQAApp, etc.)
   │        └─ A2UISurface (MessageProcessor-driven rendering)
   │           └─ ComponentHost (type map → React)
   │              └─ Catalog components
   └─ [future: Auth, theme provider, etc.]
```

**What Platform Shell DOES:**
- Route-based app switching (`/knowledge-qa`, `/reflexive-brain`)
- Maintain `platformStore` (Zustand) for active app ID
- Provide navigation UI (AppSwitcher)
- Wrap `MessageProcessorProvider` (single processor instance)
- Host surface area for rendering

**What Platform Shell DOES NOT DO:**
- ❌ Import from `src/apps/` (stays app-agnostic)
- ❌ Know about specific app logic (RAG, LLM, etc.)
- ❌ Manage authentication (deferred to v2)
- ❌ Direct state mutations (apps own their state)

### A2UI Rendering Layer

**Flow:**
```
A2UI Protocol Message (JSONL)
  ↓
useAgentStream (SSE transporter)
  ↓
MessageProcessor (@a2ui/web_core/v0_9)
  ├─ Parse surfaceUpdate → creates surface model
  ├─ Parse dataModelUpdate → populates data bindings
  └─ Parse beginRendering → signals ready
  ↓
A2UISurface (React component)
  └─ Subscribes to MessageProcessor events
  └─ Renders SurfaceView per surface
     ↓
     ComponentHost (dynamic resolver)
     └─ Resolves A2UI component type → React component
        ↓
        Catalog component receives props + data bindings
        └─ TextComponent, CardComponent, ButtonComponent, etc.
           └─ Styled via designTokens.ts + Tailwind
```

**Key Rule:** MessageProcessor is the **single source of truth**. Apps never duplicate component state.

### Communication Layer (SSE)

**Why SSE over WebSocket/polling?**
- **Simpler:** Unidirectional (server → browser only)
- **Native:** No library needed (fetch + ReadableStream)
- **Stateless:** Each connection independent, easy to close
- **Fit:** Perfect for inference streaming (think: LLM token-by-token)

**Implementation:**
```
useSSE hook:
├─ Opens fetch() POST with AbortController
├─ Reads response.body as ReadableStream
└─ Parses newline-delimited JSON

useAgentStream hook (uses useSSE):
├─ Calls useSSE to open stream
├─ Feeds each line to MessageProcessor
└─ Updates React state (status: IDLE/STREAMING/DONE/ERROR)
```

**Resource Management:**
- Explicit `.abort()` on route change (prevent leaks)
- Single connection per query (no pooling)
- Auto-close after `beginRendering` message

### Design System Integration

**Token-Driven UI:**
```typescript
// designTokens.ts (single source)
export const designTokens = {
  colors: { primary: '#3B82F6', error: '#EF4444', ... },
  typography: { h1: { fontSize: '2.25rem', ... }, ... },
  spacing: { xs: '0.5rem', md: '1rem', ... }
}

// Component usage
<h2 className="text-3xl font-bold text-gray-900">  // Tokens applied
```

**Propagation:**
```
A2UI Prop (usageHint: "h2")
  ↓
TextComponent.getTokenForHint("h2")
  ↓
designTokens.typography.h2
  ↓
Tailwind className: "text-3xl font-bold text-gray-900"
  ↓
Rendered HTML with design token styling
```

---

## 3. Backend Architecture (v2 — Implementation Guide)

### Request/Response Contract (v0.1)

```
POST /api/agents/knowledge-qa?query=<string>
Content-Type: application/x-www-form-urlencoded

Response:
Content-Type: text/event-stream
Transfer-Encoding: chunked

Message 1: {"surfaceUpdate": {...}}
Message 2: {"dataModelUpdate": {...}}
Message 3: {"beginRendering": {...}}

Connection closes after beginRendering
```

**Full spec:** See [Contracts.md](Contracts.md) § 1-12.

### Python Service Stack (v2 Sprint Only)

- **Framework:** FastAPI
- **Agent Orchestration:** LangChain / LangGraph
- **LLM:** Claude via Anthropic SDK
- **Vector Store:** Supabase pgvector
- **Validation:** jsonschema against A2UI v0.8 spec

**Not in v1 scope.** FE works with mock SSE handler in Next.js Route Handler.

---

## 4. Infrastructure (v2 — Outline Only)

### Local Dev (docker-compose)

```yaml
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
  backend:
    build: ./backend
    ports:
      - "8000:8000"
  postgres:
    image: pgvector/pgvector:0.4.1-pg15
    environment:
      POSTGRES_PASSWORD: dev
```

### Deployment (Future)

- **FE:** Vercel (Next.js native)
- **BE:** Railway or Fly.io (Python FastAPI)
- **DB:** Supabase managed pgvector
- **IaC:** Terraform (infra/ folder)

---

## 5. Communication Contracts

### FE → BE (v1: Mock Handler, v2: FastAPI Proxy)

**Input:**
- `query` (string, required)
- `cursor` (string, optional — for pagination, v2+)

**Output (Streaming JSONL):**
```
Line 1: surfaceUpdate
Line 2: dataModelUpdate
Line 3: beginRendering
```

### A2UI Message Schema (v0.8)

See [A2UI_Specification.md](A2UI_Specification.md) § A2UI v0.9 Message Reference.

---

## 6. Scalability Patterns (Future)

### Multi-App Routing
```
AppRegistry
├─ KnowledgeQAApp  (v1)
├─ ChatbotApp      (planned v2)
├─ AnalyticsApp    (planned v2)
└─ ...
```
New apps added to AppRegistry only. No root changes.

### Catalog Extensibility
```
src/a2ui/catalog/components/
├─ TextComponent      (v1)
├─ CardComponent      (v1)
├─ SourceListComponent (v1 custom)
├─ ImageComponent     (v2+)
├─ FormComponent      (v2+)
└─ ...
```
New components added to catalog + registered in ComponentHost. No renderer changes.

### Design Token Scaling
```
src/a2ui/catalog/designTokens.ts

export const designTokens = {
  colors: { primary, secondary, success, warning, error, ... },
  typography: { h1, h2, h3, body, caption, ... },
  spacing: { xs, sm, md, lg, xl, ... },
  shadows: { sm, md, lg, ... },
}
```
All shadcn overrides + Tailwind config driven from this single file.

---

## 7. Cross-Layer Contracts (What Each Layer Owns)

| Concern | Owner | Responsibility |
|---|---|---|
| User intent (query) | Frontend | Capture + validate |
| Agent logic (RAG, LLM) | Backend (v2) | Generate A2UI surface |
| A2UI protocol compliance | Backend | Stream valid JSONL |
| Message transport (SSE) | Frontend | Open/close EventSource, handle errors |
| State management (MessageProcessor) | Frontend | Receive messages, update internal state |
| UI rendering (React) | Frontend | Map A2UI → React components + tokens |
| Design system (tokens) | Frontend | Define + apply consistently |

**No Layer Owns:** Authentication, authorization, persistence (all optional in v1).

---

## 8. Error Handling

### FE Error Cases

| Case | Handler | User Sees |
|---|---|---|
| Network error | `useAgentStream.error` | "Connection failed. Retry?" |
| SSE timeout (30s+) | Status → ERROR | Spinner → error message |
| Invalid A2UI message | `catch` in MessageProcessor | "Render failed. Retry?" |
| Unknown component type | ComponentHost fallback | "Unknown component: Type" |

### BE Error Cases (v2)

| Case | Response |
|---|---|
| Query validation fails | HTTP 400 + error message |
| RAG retrieval fails | HTTP 500 + error log |
| LLM timeout | SSE error message (non-standard) |
| Invalid A2UI generation | HTTP 500 + validation error |

---

## 9. Next-Session Checkpoints

- [ ] **T1 Execution:** Scaffold frontend/src/ + frontend/app/ structure
- [ ] **v2 Planning:** Backend service skeleton (FastAPI + LangChain)
- [ ] **v2 Planning:** Infra (docker-compose, Terraform)
- [ ] **Design Tokens v1:** Define colors, typography, spacing constants
- [ ] **Catalog v1:** Implement all 5 catalog components (Text, Card, Button, Badge, SourceList)

**Questions to answer before BE work:**
- What RAG backend? (Supabase pgvector vs Pinecone vs Milvus?)
- What LLM? (Claude vs GPT-4 vs Llama?)
- What LangChain orchestrator? (LangGraph vs native chains?)

---

*This document is conceptual. For implementation details, see [Product_Requirements.md](Product_Requirements.md) (business rules) and [Contracts.md](Contracts.md) (interface specs).*
