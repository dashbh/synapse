# A2UIPlatform Frontend

**Layer:** 🎨 Frontend Rendering  
**Framework:** Next.js 16+ | TypeScript | React 19 | A2UI v0.9  
**Status:** v1 Complete & Demo-Ready

---

## Quick Start

### Setup
```bash
cd frontend
npm install
npm run dev                    # Start dev server at http://localhost:3000
npm run lint                   # Check code style
npm run build                  # Production build
```

### Project Structure
```
frontend/src/
├── app/                       # Next.js app router + pages
│   ├── (apps)/               # App-specific pages (nested routes)
│   ├── api/agents/           # Server-side agent endpoints
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home page
├── a2ui/                      # A2UI protocol layer (reusable)
│   ├── catalog/              # Component registry + design tokens
│   ├── processor/            # Message processing
│   ├── renderer/             # A2UI rendering engine
│   ├── transport/            # SSE streaming
│   └── types.ts              # Protocol types
├── apps/                      # Feature bundles (app-specific)
│   └── knowledge-qa/         # Sample: Q&A app
├── platform/                 # Platform shell (app-agnostic)
│   ├── shell/               # Multi-app router
│   ├── registry/            # App registration
│   └── store/               # Global state (Zustand)
├── components/              # Shared UI components (shadcn/ui)
├── lib/                     # Utilities & helpers
└── shared/                  # Shared hooks, types, UI
```

---

## 📚 Documentation Index

**Start here based on your role:**

### For Frontend Developers ("Working on FE code")
1. **First read:** [docs/FE_Reference.md](../docs/FE_Reference.md) — Component APIs & design tokens
2. **Then:** [docs/FE_Patterns.md](../docs/FE_Patterns.md) — How-to guides (add apps, debug, patterns)
3. **Reference:** [docs/A2UI_Specification.md](../docs/A2UI_Specification.md) — A2UI protocol (if debugging rendering)
4. **Rules:** [docs/Governance.md](../docs/Governance.md) — Code standards & quality SLAs

### For New Features ("Adding a new app")
- Follow [docs/FE_Patterns.md](../docs/FE_Patterns.md) § "Add a New App" step-by-step

### For Component Development ("Creating UI components")
- Reference: [docs/FE_Reference.md](../docs/FE_Reference.md) § "Catalog Components"
- Guide: [docs/FE_Patterns.md](../docs/FE_Patterns.md) § "Add a New Catalog Component"
- Design tokens: [src/a2ui/catalog/designTokens.ts](src/a2ui/catalog/designTokens.ts)

### For Debugging ("Something's broken")
- Rendering issues: [docs/FE_Patterns.md](../docs/FE_Patterns.md) § "Debug Rendering"
- Message flow: [docs/A2UI_Specification.md](../docs/A2UI_Specification.md) § "Message Sequence"
- State management: [docs/Governance.md](../docs/Governance.md) § "State Management Rules"

### For Understanding Architecture ("How does this work?")
- System overview: [docs/Architecture.md](../docs/Architecture.md) — Layers, tech choices, data flow
- Platform design: [docs/Architecture.md](../docs/Architecture.md) § 3 "Platform Shell Implementation"
- Contracts: [docs/Contracts.md](../docs/Contracts.md) — What backend sends, what frontend expects

### For Business Context ("Why are we building this?")
- Product spec: [docs/Product_Requirements.md](../docs/Product_Requirements.md) — Vision, goals, scope, v1 features

---

## 📖 Document Reference

| Document | Purpose |
|---|---|
| **FE_Reference.md** | Component API lookup, design tokens, TypeScript interfaces |
| **FE_Patterns.md** | How-to guides: add app, add component, debug, testing patterns |
| **A2UI_Specification.md** | Message protocol, data binding, error codes, rendering sequence |
| **Architecture.md** | System layers, tech stack rationale, data flow diagram |
| **Contracts.md** | Frontend↔Backend interface: message specs, ingestion schema |
| **Governance.md** | Code standards, quality SLAs, security, performance rules |
| **Product_Requirements.md** | Business vision, goals, feature scope, roadmap |

---

## 🛠️ Key Tech Stack

| Layer | Tech | Why |
|---|---|---|
| **Rendering** | Next.js 16+ App Router | Type-safe, streaming SSR, performance |
| **Language** | TypeScript (strict) | Catch bugs at build time, IDE support |
| **React** | React 19 | Latest hooks, concurrent features |
| **State** | Zustand 5.x | Minimal boilerplate, predictable updates |
| **UI** | shadcn/ui + Tailwind CSS 4 | Accessible, composable, fast iteration |
| **Protocol** | A2UI v0.9 | Agent-rendered UI, type-safe message binding |
| **Transport** | SSE (fetch + ReadableStream) | Real-time streaming, bi-directional capable |

---

## 🏗️ Architectural Principles

### Layer Boundaries (Strict)
- **platform/** → App-agnostic shell (no app imports)
- **a2ui/** → Protocol-only rendering (reusable anywhere)
- **apps/** → Feature bundles (can import platform + a2ui)
- Data flows: App → Platform → A2UI → Components

### Component Isolation
- **Catalog:** 5 components, all A2UI-compatible (Text, Card, Button, Badge, SourceList)
- **Design tokens:** Centralized in [designTokens.ts](src/a2ui/catalog/designTokens.ts) (no scattered constants)
- **Shared UI:** shadcn/ui base components in `components/ui/`

### Message Processing
- Single source of truth: [MessageProcessorProvider](src/a2ui/processor/MessageProcessorProvider.tsx)
- Never duplicate processor logic
- A2UI protocol = deterministic rendering

---

## 📊 Current Status

**v1.5 Features (All Complete):**
- ✅ Platform Shell (multi-app routing)
- ✅ A2UI Protocol (message processor + rendering)
- ✅ SSE Transport (streaming) — explicit close on route change
- ✅ Catalog Components (6: Text, Card, Button, Badge, SourceList, MetadataCard)
- ✅ Knowledge-QA App (end-to-end working)
- ✅ TypeScript strict mode
- ✅ Error handling + Graceful degradation
- ✅ Design tokens system
- ✅ Volatile session reset on app navigation
- ✅ Ingestion UI — real-time Parsing → Chunking → Embedding progress
- ✅ SSE `/ingest` endpoint (mock, with per-step streaming)
- ✅ Rich citations side panel (click-to-preview with full metadata)
- ✅ Citation metadata (Document, Section, Date, Category)
- ✅ Semantic search filters (category + date range)
- ✅ Admin token gate for document ingestion

No open implementation gaps. See [docs/Product_Requirements.md](../docs/Product_Requirements.md) § 10 for the full compliance table.

---

## 🚀 Common Tasks

### Start Development
```bash
npm run dev
# Opens http://localhost:3000
# Auto-reloads on file changes
```

### Add a New App
See [docs/FE_Patterns.md](../docs/FE_Patterns.md) § "Add a New App"  
(1 hour, includes shell registration + route setup)

### Add a Catalog Component
See [docs/FE_Patterns.md](../docs/FE_Patterns.md) § "Add a New Catalog Component"  
(30 min, includes A2UI binding + design tokens)

### Debug a Rendering Issue
See [docs/FE_Patterns.md](../docs/FE_Patterns.md) § "Debug Rendering"  
(Check message flow, design tokens, component binding)

### Review Code Style
```bash
npm run lint
# ESLint + TypeScript strict mode
```

### Build for Production
```bash
npm run build
npm start
```

---

## 🔗 Navigation

**Not a frontend dev?** [← Back to repo README](../README.md)  
**Want to work on backend?** [backend/README.md](../backend/README.md) (v2)  
**Need infrastructure?** [infra/README.md](../infra/README.md) (v2)

**Questions about this layer:** See [frontend/CLAUDE.md](CLAUDE.md) (session notes + decisions)
