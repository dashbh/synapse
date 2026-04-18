# CLAUDE.md — Navigation & Layer Routing

**Purpose:** Agent navigation guide — identify your role, find your docs, execute efficiently  
**Scope:** For Claude, Copilot, and any AI agent working on this codebase  
**Full navigation:** See [README.md](README.md)

---

## 🎯 How to Use This Repository

### Step 1: Identify Your Role
Choose **one** layer/role below:

### Step 2: Navigate to Layer Resources
- Start at the **Entry Point** listed for your role
- Entry points provide setup, status, and doc map
- Follow the links from there

### Step 3: Execute Your Task
- Use the layer-specific README to understand that layer
- Use `docs/` files for reference (requirements, architecture, governance, contracts)
- Reference [README.md](README.md) for task-to-document mapping

---

## 👤 Which Layer Are You Working On?

### 🎨 Frontend Development

| Item | Link |
|---|---|
| **Entry Point** | [frontend/README.md](frontend/README.md) |
| **Your Code** | `frontend/src/` |
| **Setup** | [frontend/README.md](frontend/README.md) § Quick Start |
| **Add New App** | [docs/FE_Patterns.md](docs/FE_Patterns.md) § Add a New App |
| **Add Component** | [docs/FE_Patterns.md](docs/FE_Patterns.md) § Add a New Catalog Component |
| **Debug Rendering** | [docs/FE_Patterns.md](docs/FE_Patterns.md) § Debug Rendering |

**Reference Docs (in priority order):**
1. [docs/Product_Requirements.md](docs/Product_Requirements.md) — What we're building
2. [docs/Architecture.md](docs/Architecture.md) — System design
3. [docs/FE_Reference.md](docs/FE_Reference.md) — Component APIs + design tokens
4. [docs/Contracts.md](docs/Contracts.md) — Backend interface
5. [docs/Governance.md](docs/Governance.md) — Rules & standards
6. [docs/A2UI_Specification.md](docs/A2UI_Specification.md) — Protocol (if debugging)

---

### 🔧 Backend Development (v2+)

| Item | Link |
|---|---|
| **Entry Point** | `backend/README.md` (not yet created) |
| **Your Code** | `backend/app/` and `backend/agents/` |
| **Contract Spec** | [docs/Contracts.md](docs/Contracts.md) |
| **Message Format** | [docs/A2UI_Specification.md](docs/A2UI_Specification.md) |

**Reference Docs (in priority order):**
1. [docs/Product_Requirements.md](docs/Product_Requirements.md) — Business context & feature scope
2. [docs/Contracts.md](docs/Contracts.md) — What FE expects from backend
3. [docs/Architecture.md](docs/Architecture.md) § 3 — Implementation hints
4. [docs/A2UI_Specification.md](docs/A2UI_Specification.md) — Message protocol details

---

### 🏗️ Infrastructure / DevOps (v2+)

| Item | Link |
|---|---|
| **Entry Point** | `infra/README.md` (not yet created) |
| **Your Code** | `infra/terraform/`, `infra/docker-compose.yml` |
| **System Overview** | [docs/Architecture.md](docs/Architecture.md) |
| **Standards** | [docs/Governance.md](docs/Governance.md) |

---

## 🔄 Session Tracking & Progress

**Feature:** Session notes are stored in layer-specific READMEs, not separate files.

**Where to track progress:**
- **Frontend:** Session notes in [frontend/README.md](frontend/README.md) top section (updates while working)
- **Backend:** Add to `backend/README.md` when layer starts
- **Infra:** Add to `infra/README.md` when layer starts

**What to capture:**
- Current task / objective
- Blockers or decisions made
- What needs to be done next session
- Links to relevant documentation sections

---

## 📚 Quick Reference

| Need | Read |
|---|---|
| **Repo overview** | [README.md](README.md) |
| **What are we building?** | [docs/Product_Requirements.md](docs/Product_Requirements.md) |
| **System architecture** | [docs/Architecture.md](docs/Architecture.md) |
| **Rules & constraints** | [docs/Governance.md](docs/Governance.md) |
| **Message contracts** | [docs/Contracts.md](docs/Contracts.md) |
| **Protocol details** | [docs/A2UI_Specification.md](docs/A2UI_Specification.md) |
| **FE: Component APIs** | [docs/FE_Reference.md](docs/FE_Reference.md) |
| **FE: How-to guides** | [docs/FE_Patterns.md](docs/FE_Patterns.md) |
| **FE: Current status** | [frontend/README.md](frontend/README.md) § Status |
| **Observability & logging** | [docs/Observability.md](docs/Observability.md) |
| **Testing strategy** | [docs/Testing_Strategy.md](docs/Testing_Strategy.md) |

---

## ✨ Key Principles

1. **No redundant docs** — Each document has a single purpose
2. **Layer-specific entry points** — Start at layer/README.md
3. **Cross-references, not duplication** — Docs link to each other
4. **Session notes in README** — Track progress where you work
5. **Governance is everywhere** — Check `docs/Governance.md` before coding
6. **Docs stay current** — When a new feature is implemented, update the relevant section in `docs/` immediately (same PR/session). New FE components → `Architecture.md` catalog list + `Product_Requirements.md` table. New BE capabilities → `Product_Requirements.md` BE table + `Architecture.md` data-flow. Infrastructure changes → `Architecture.md` §4 + `Product_Requirements.md` Infra table.

---

**After identifying your role above, go to your layer's entry point (README.md or docs/) and start there.**
