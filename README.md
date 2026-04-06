# A2UI Platform (Project Synapse)

**Repository Entry Point** — For humans and AI agents (Claude Copilot, GitHub Copilot)

---

## 🎯 First Time Here?

1. **What is this project?** → [docs/Product_Requirements.md](docs/Product_Requirements.md) (10 min)
2. **How is it structured?** → [docs/Architecture.md](docs/Architecture.md) (10 min)
3. **What are the rules?** → [docs/Governance.md](docs/Governance.md) (5 min)
4. **Choose your role below** ↓

---

## 👥 By Role / Layer

### Frontend Developer

**Where to start:**
1. [frontend/README.md](frontend/README.md) — FE layer overview + doc map
2. [docs/Product_Requirements.md](docs/Product_Requirements.md) — Business context
3. [docs/Architecture.md](docs/Architecture.md) — System design
4. Then pick your task from the "By Task" table below

**Key docs:**
- [docs/Governance.md](docs/Governance.md) — Rules you must follow
- [docs/Contracts.md](docs/Contracts.md) — FE↔BE interface spec
- [docs/FE_Reference.md](docs/FE_Reference.md) — Component APIs + design tokens
- [docs/FE_Patterns.md](docs/FE_Patterns.md) — Step-by-step guides

**Code location:** `frontend/src/`

---

### Backend Developer (v2+)

**Where to start:**
1. [docs/Product_Requirements.md](docs/Product_Requirements.md) — What we're building
2. [docs/Contracts.md](docs/Contracts.md) — FE↔BE interface spec (§1-12)
3. [docs/Architecture.md](docs/Architecture.md) § 3 — Backend implementation guide

**Key docs:**
- [docs/Governance.md](docs/Governance.md) — Shared rules
- [docs/A2UI_Specification.md](docs/A2UI_Specification.md) — Protocol details

**Code location:** `backend/app/` and `backend/agents/`

---

### Infrastructure / DevOps (v2+)

**Where to start:**
1. [docs/Architecture.md](docs/Architecture.md) — System Overview
2. [docs/Governance.md](docs/Governance.md) — Shared rules

**Code location:** `infra/terraform/`, `infra/docker-compose.yml`

---

## 📋 By Task

| Task | Read | Time |
|---|---|---|
| **Understand what we're building** | [docs/Product_Requirements.md](docs/Product_Requirements.md) | 10 min |
| **Understand system architecture** | [docs/Architecture.md](docs/Architecture.md) | 10 min |
| **Learn the rules** | [docs/Governance.md](docs/Governance.md) | 5 min |
| **Check implementation status** | [docs/Product_Requirements.md](docs/Product_Requirements.md) § 10 | 5 min |
| **Set up frontend dev** | [frontend/README.md](frontend/README.md) | 10 min |
| **Add a new app** | [docs/FE_Patterns.md](docs/FE_Patterns.md) | 20 min |
| **Add a catalog component** | [docs/FE_Reference.md](docs/FE_Reference.md) + [docs/FE_Patterns.md](docs/FE_Patterns.md) | 20 min |
| **Debug rendering issue** | [docs/FE_Patterns.md](docs/FE_Patterns.md) | 10 min |
| **Understand data flow** | [docs/Architecture.md](docs/Architecture.md) + [docs/Contracts.md](docs/Contracts.md) | 15 min |
| **Write backend for FE** | [docs/Contracts.md](docs/Contracts.md) | 10 min |

---

## 📚 Complete Document Map

| Document | Purpose | For Whom | Time |
|---|---|---|---|
| **docs/Product_Requirements.md** | Project vision, goals, scope, success metrics, deviations | Everyone (especially Product, Architects) | 15 min |
| **docs/Architecture.md** | System layers, data flow, component hierarchy, tech decisions | Everyone | 25 min |
| **docs/Governance.md** | Rules, constraints, standards, naming conventions, error handling | Engineers | 5 min |
| **docs/Contracts.md** | FE↔BE message specs, data model, ingestion endpoint | FE + BE developers | 10 min |
| **docs/A2UI_Specification.md** | A2UI v0.9 protocol, message types, data binding | Protocol developers | 15 min |
| **frontend/README.md** | FE layer overview, setup, doc map, current status | FE developers | 10 min |
| **docs/FE_Reference.md** | Catalog component APIs, design tokens, lookup table | FE developers (lookup) | 5 min |
| **docs/FE_Patterns.md** | How-to guides: add app, add component, debug, connect backend | FE developers | 15 min |

---

## 🔗 Document Navigation Flow

Start with your role above, then follow the arrows:

```
Everyone: Product_Requirements.md → Architecture.md → Governance.md

Frontend:
  frontend/README.md
    ↓
  docs/Contracts.md (what backend sends)
  docs/FE_Reference.md (what components do)
  docs/FE_Patterns.md (how to build)
  docs/A2UI_Specification.md (if debugging)

Backend (v2+):
  docs/Contracts.md (what FE expects)
  docs/A2UI_Specification.md (message format)
  docs/Architecture.md § 3 (implementation hints)
```

---

## ⚡ Quick Start Commands

**Frontend:**
```bash
cd frontend
npm install
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Build for production
npm run lint         # Check code style
```

**Test a backend integration:**
```bash
curl -X POST "http://localhost:3000/api/agents/knowledge-qa" \
  -d "query=test" --no-buffer
```

---

## ✨ Key Architecture Decisions

*All rules in [docs/Governance.md](docs/Governance.md), but quick reference:*

- ✅ **App-agnostic platform:** Shell never imports from `apps/`
- ✅ **A2UI protocol locked:** Uses `@a2ui/web_core/v0_9` (not root v0.8)
- ✅ **Single source of truth:** MessageProcessor owns all surface state
- ✅ **SSE streaming only:** `fetch` + `ReadableStream` (no EventSource or WebSocket)
- ✅ **Strict TypeScript:** No `any`, all A2UI types validated

---

## 🚀 Implementation Status

**Frontend v1:** ✅ **COMPLETE & DEMO-READY**
- Platform shell with multi-app routing
- A2UI rendering (MessageProcessor + 5 catalog components)
- Knowledge Q&A app (end-to-end)
- Design system (tokens + Tailwind)
- Error handling & UX polish

**Known Deviations:** See [docs/Product_Requirements.md](docs/Product_Requirements.md) § 10

**Backend v2:** ⏳ Coming soon (Python FastAPI + LangChain + Claude)

**Infra v2:** ⏳ Coming soon (Docker + Terraform)

---

## ❓ For AI Agents (Claude, Copilot)

**When invoked:**
1. Read this file (you are here)
2. Identify user's role/layer (Frontend, Backend, Infra)
3. Follow "By Role" section above
4. Reference specific docs listed for that role
5. If user asks "architectural question", start with `docs/Architecture.md`
6. If user asks "protocol question", use `docs/Contracts.md` + `docs/A2UI_Specification.md`
7. Always validate against [docs/Governance.md](docs/Governance.md) rules before coding

**Session tracking:** Each layer has a README with session notes. Update before pausing work.

---

## 📞 Need Help?

| Question | Answer Location |
|---|---|
| "What are we building?" | [docs/Product_Requirements.md](docs/Product_Requirements.md) |
| "How does the system work?" | [docs/Architecture.md](docs/Architecture.md) |
| "Why did we choose X tech?" | [docs/Architecture.md](docs/Architecture.md) § Platform Shell Implementation |
| "What are the rules?" | [docs/Governance.md](docs/Governance.md) |
| "How do I build a component?" | [docs/FE_Patterns.md](docs/FE_Patterns.md) |
| "What's the backend contract?" | [docs/Contracts.md](docs/Contracts.md) |
| "Where's the code?" | See "By Role" section (Code location) |

---

**Last Updated:** April 7, 2026  
**Status:** Frontend v1 complete, documentation organized per SOLID principles  
**For session notes:** See layer-specific README files (frontend/README.md, etc.)
