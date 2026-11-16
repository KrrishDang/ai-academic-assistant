# AGENTS.md — AI Academic Assistant Engineering Guidelines

Welcome to **AI Academic Assistant**. This document defines the permanent engineering standards, architecture constraints, skill activation policies, and operational workflows for all AI agents and developers working in this repository.

---

## 1. Product Identity and Branding

- **Official Product Name:** **AI Academic Assistant**
- **Strict Brand Rule:** Legacy names (such as "StudyHub", "StudyHub V2", or related legacy project names) are strictly forbidden in all new user-facing UI copy, page titles, navigation labels, footers, meta tags, commit messages, and documentation.
- **Login & Auth Screens:** Footers and headings must consistently read "AI Academic Assistant".
- **Browser Documents:** `<title>` tags and document metadata must reflect "AI Academic Assistant".

---

## 2. Architecture and Compatibility Principles

### 2.1 Workspace Model
- Every academic chat workspace is internally backed by the existing **`Notebook`** entity wherever possible.
- A "Chat" in the unified experience corresponds to an underlying Notebook with attached sources, conversation message history, and optional study materials.
- Preserving the Notebook model retains existing source ingestion, RAG grounding, and study studio capabilities without schema churn.

### 2.2 Reusable Backend Subsystems
Always leverage the existing, production-tested backend services:
- **Notebooks API:** `backend/app/api/notebooks.py` and `NotebookService` for course notebooks and source containment.
- **Conversations & Chat API:** `backend/app/api/conversations.py` and `ConversationService` for message persistence, context building, and event-stream generation.
- **Streaming Flow:** Standard SSE streaming endpoint (`/api/v1/conversations/{id}/messages/stream`) utilizing `_sse_event()` framing with complete newline and double-newline encoding protection.
- **Grounded RAG Pipeline:** `GroundingService` (`backend/app/services/grounding_service.py`) for source document chunking, token budgeting, prompt injection, and citations format.
- **Direct Gemini Client:** Resilient Gemini API integration with exponential backoff and structured output support.
- **Study Materials Engine:** `backend/app/api/study_materials.py` for flashcards, study guides, and exam paper generation.
- **Document & Extraction Services:** Multi-format PDF, DOCX, PPTX parsing with text scrubbing and storage management.

### 2.3 Compatibility Invariants
- **API Contracts:** Never alter existing route paths (`/api/v1/notebooks`, `/api/v1/documents`, `/api/v1/conversations`, `/api/v1/study-materials`) or response schemas without explicit versioning.
- **Database Schema:** Never modify columns or table relationships without reviewing existing Alembic migrations and database foreign key event listeners (`check_conversation_ownership_consistency`).
- **Frontend Client:** `frontend/src/lib/api.ts` serves as the centralized API client hub. Maintain method signatures and response typing to avoid cascading breaks across workspace views.
- **Theme System:** Strictly preserve Dark, Light, and System modes. Theme initialization must happen pre-paint (`index.html`) defaulting to dark mode, synchronized with React's `ThemeContext` without layout or color flashes.

---

## 3. Skill Activation Matrix

Antigravity and Claude agents must activate domain skills conditionally based on task scope:

| Domain / Task Scope | Primary Skills | Usage Trigger |
| :--- | :--- | :--- |
| **Frontend UI & Components** | `frontend-ui-engineering`<br>`impeccable`<br>`emil-design-eng`<br>`break-ui` | Building or refining React components, pages, forms, modals, accessible layouts, or stress-testing UI against extreme data edge cases. |
| **Motion & Micro-interactions** | `animate`<br>`animation-performance`<br>`find-animation-opportunities` | Implementing spring animations, transitions, sidebar open/collapse, or fixing jank and frame drops. |
| **API & Contract Design** | `api-and-interface-design` | Defining new endpoints, updating DTOs/schemas, establishing frontend-backend payload boundaries. |
| **Security & Authorization** | `security-and-hardening`<br>`doubt-driven-development` | Designing auth boundaries, scoping database queries to `current_user.id`, reviewing access controls, threat modeling, and input hardening (delegate to `security-auditor` subagent for deep security reviews). |
| **Testing & TDD** | `test-driven-development`<br>`browser-testing-with-devtools` | Writing unit/integration tests before implementing logic, automated browser inspection and DevTools DOM verification. |
| **Code Review & Simplification** | `code-simplification`<br>`code-review-and-quality`<br>`ponytail-review` | Refactoring cluttered functions, multi-axis code audits prior to merging, eliminating accidental over-engineering. |
| **Observability & CI/CD** | `observability-and-instrumentation`<br>`ci-cd-and-automation`<br>`shipping-and-launch` | Production logging, structured error handling, deployment readiness audits, and pre-launch checklists. |
| **Architecture & Dependency Graph** | `graphify` | Exploring project structure, understanding god nodes and cluster connectivity, querying codebase relations. |

### Activation Guidelines:
- **Automatic:** Reference the appropriate skill guidelines whenever operating in its respective domain.
- **Adversarial / Doubt Check:** When touching authentication, authorization, or multi-tenant scoping, employ `doubt-driven-development` to stress-test assumptions before finalizing changes.

---

## 4. Engineering & Quality Standards

### 4.1 Test-Driven Development (TDD)
- **Red-Green-Refactor:** For any bug fix or new capability, write a failing unit or integration test first. Confirm failure, implement the minimal viable code to turn it green, and then refactor.
- **No Test Suppression:** Never delete, skip (`@pytest.mark.skip`), comment out, or weaken existing assertions to make a test suite pass. If a test fails, fix the underlying defect.

### 4.2 Security & Multi-Tenant Data Isolation
- **Authentication First:** All data queries must resolve the user via `Depends(get_current_user)`.
- **Ownership Scoping:** Every database query filtering documents, notebooks, conversations, or study materials must enforce `user_id == current_user.id`.
- **Spoofable Headers Forbidden:** Never trust client-supplied headers (such as `X-Session-ID`) for ownership or authorization decisions. Session IDs can only group anonymous sessions when explicitly allowed, never bypass authentication.
- **Safe 404s:** When an authenticated user requests a resource ID owned by another user, return HTTP 404 (Not Found) rather than 403 (Forbidden) to prevent resource enumeration.

### 4.3 UI Accessibility & Design Consistency
- **WCAG AA Compliance:** Ensure color contrast meets 4.5:1 for normal text across both Dark and Light themes.
- **Keyboard Navigation:** Modals, dropdowns, tabs, and action buttons must support full keyboard navigation (`Tab`, `Esc`, `Enter`, `Space`) with visible focus rings.
- **Responsive Layouts:** Test and verify desktop, tablet, and mobile breakpoints. Primary navigation should fold cleanly into mobile draw/sheet layouts.
- **Loading & Empty States:** Every asynchronous component must provide thoughtful skeleton loaders, clear empty state illustrations, and actionable error states.

---

## 5. Project Execution & Safety Rules

- **Small Verifiable Slices:** Implement complex features in thin, incremental slices. Verify each slice with tests before proceeding to the next.
- **No Unauthorized Git Actions:** Never stage, commit, push, create tags, or alter Git remotes unless explicitly instructed by the user.
- **No Unauthorized Migrations or DB Resets:** Never run destructive database commands (`drop database`, `alembic downgrade base`, manual table drops) without explicit authorization.
- **Preserve Clean Working Directory:** Frequently check `git status --short` and `git diff --check` to ensure zero accidental file modifications, trailing whitespaces, or extraneous untracked files.

---

## 6. Graphify Architecture Baseline Policy

- **Baseline Location:** The project architecture graph is maintained in `graphify-out/`:
  - `graph.json`: Machine-readable dependency graph with clustered communities and god nodes.
  - `graph.html`: Standalone interactive visualization of the codebase topology.
  - `GRAPH_REPORT.md`: Comprehensive architectural report covering cohesion, god nodes, and surprising connections.
  - `.graphify_labels.json`: Curated domain community labels.
  - `manifest.json`: Incremental tracking manifest for fast AST updates.
- **Refresh Protocol:**
  - Do **NOT** run full Graphify rebuilds during routine feature coding or refactoring.
  - Refresh the baseline only after major architectural milestones, significant cross-module refactors, or new database model introductions.
  - For minor updates, run incremental updates via `python -m graphify.cli --update .`.

---

## 7. OmniRoute Policy

- **Strict Boundary:** OmniRoute is an optional multi-provider proxy/routing tool. It is **NOT** part of the application runtime.
- **Zero Core Dependency:** The application codebase (`backend/` and `frontend/`) must never be modified to require OmniRoute. The application directly utilizes the official Google Gemini SDK (`google-generativeai` / `@google/genai`) and standard FastAPI/React architectures.
