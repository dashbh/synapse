# Synapse — Platform Requirements

**Status:** MVP Complete  
**Last Updated:** April 2026

---

## Vision

Synapse is a modular AI Platform Shell that hosts specialized intelligence "Apps."

- **Modular** — Each app is an independent intelligence service registered via AppRegistry
- **Declarative** — All UI rendered via A2UI v0.9 protocol; never raw JSON blobs
- **Reactive** — SSE streaming delivers real-time, incremental UI updates
- **Stateful** — Named sessions persist across reloads; multi-turn context per session

---

## Platform Shell

- Path-based app routing (`/knowledge-qa`, `/reflexive-brain`) with full UI reset on switch
- App-agnostic shell — no business logic, only orchestration
- Apps registered in `src/platform/registry/AppRegistry.ts` only
- Session state is per-app and volatile on route change

See [Architecture.md](Architecture.md) for implementation detail.

---

## A2UI Component Catalog

7 protocol types available to all apps. For APIs and design tokens see [FE_Reference.md](FE_Reference.md).

| Type | Purpose |
|------|---------|
| TextComponent | Headings and paragraphs (`usageHint`: h1/h2/h3/body/caption) |
| CardComponent | Container for grouped content |
| ButtonComponent | User interaction |
| BadgeComponent | Status and metadata display |
| MarkdownComponent | Markdown body with `[N]` citation badges (react-markdown + GFM) |
| SourceListComponent | Compact citation strip; registers sources for Drawer |
| MetadataCard | Document / Section / Date / Category grid |

Supporting UI (not A2UI types): **ConfidenceBadge** — color-coded tiers (Strong / Good / Relevant / Partial).

---

## Hosted Apps

| App | Spec | Status |
|-----|------|--------|
| Knowledge-QA | [apps/knowledge-qa.md](apps/knowledge-qa.md) | ✅ Complete |
| Reflexive-Brain | — | 🔲 Backlog |

---

## Non-Functional Requirements

**Performance**
- First app load: < 2s
- Query → result display: < 2s
- SSE frame render latency: < 100ms after message arrival

**Stability**
- Full app reset on route navigation — no state bleeding between apps
- Graceful degradation on network interruption
- No resource leaks on app switching
- User-visible error messages — never silent failures

**Security**
- No client-side secrets — API keys server-side only
- Ingestion endpoint: admin-protected (real OAuth deferred — see [Roadmap.md](Roadmap.md))
- SSE streams encrypted in transit (HTTPS in production)

---

## Document Map

| Need | Document |
|------|---------|
| System architecture & data flow | [Architecture.md](Architecture.md) |
| Code rules & standards | [Governance.md](Governance.md) |
| API contracts & message format | [Contracts.md](Contracts.md) |
| A2UI protocol specification | [A2UI_Specification.md](A2UI_Specification.md) |
| FE component APIs & design tokens | [FE_Reference.md](FE_Reference.md) |
| FE how-to guides & patterns | [FE_Patterns.md](FE_Patterns.md) |
| Observability & logging | [Observability.md](Observability.md) |
| Testing strategy & E2E tests | [Testing_Strategy.md](Testing_Strategy.md) |
| Knowledge-QA app spec | [apps/knowledge-qa.md](apps/knowledge-qa.md) |
| Roadmap & backlog | [Roadmap.md](Roadmap.md) |
