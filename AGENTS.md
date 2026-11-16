# AGENTS.md — AI Academic Assistant Engineering Guidelines

Welcome to **AI Academic Assistant**. This document defines the permanent engineering standards, architecture constraints, skill activation policies, and operational workflows for all AI agents and developers working in this repository.

---

## 1. Product Identity and Branding

- **Official Product Name:** **AI Academic Assistant**
- **Strict Brand Rule:** Legacy names (such as "StudyHub", "StudyHub V2", or related legacy project names) are strictly forbidden in all new user-facing UI copy, page titles, navigation labels, footers, meta tags, commit messages, and documentation.
- **Login & Auth Screens:** Footers, headings, and branding banners must consistently read "AI Academic Assistant".
- **Browser Documents:** `<title>` tags and document metadata in `index.html` must reflect "AI Academic Assistant".

---

## 2. Architecture and Compatibility Principles

### 2.1 Workspace Model
- Every academic chat workspace is internally backed by the **`Notebook`** entity.
- A "Chat" in the unified experience corresponds to an underlying Notebook with attached sources, conversation message history, and optional study materials.
- Preserving the Notebook model retains existing multi-source ingestion, RAG grounding, and study studio capabilities without schema churn.

### 2.2 Reusable Backend Subsystems
Always leverage the existing, production-tested backend services:
- **Notebooks API:** `backend/app/api/notebooks.py` and `NotebookService` for course notebooks and source containment.
- **Conversations & Chat API:** `backend/app/api/conversations.py` and `ConversationService` for message persistence, context building, and event-stream generation.
- **Streaming Flow:** Standard SSE streaming endpoint (`/api/v1/conversations/{id}/messages/stream`) utilizing `_sse_event()` framing with complete newline and double-newline encoding protection.
- **Grounded RAG Pipeline:** `GroundingService` (`backend/app/services/grounding_service.py`) for source document chunking, token budgeting, prompt injection, and citations format `[Source: <filename>, Page: <page>]`.
- **Direct Gemini Client:** Resilient Gemini API integration via `google-genai` SDK with exponential backoff and structured output support.
- **Study Materials Engine:** `backend/app/api/study_materials.py` for flashcards, study guides, and exam paper generation.
- **Document & Extraction Services:** Multi-format PDF, DOCX, PPTX, and TXT parsing with text scrubbing and storage management via PyMuPDF (`fitz`), `python-docx`, and `python-pptx`.

### 2.3 Database Migration and Startup Lifecycle
- **Single Execution Path:** Database migrations must execute **exclusively** via the dedicated migration runner (`python -m app.db.migrate`) prior to starting Uvicorn.
- **FastAPI Lifespan Separation:** Never invoke `command.upgrade()` or Alembic migrations inside FastAPI's `lifespan` handler (`backend/app/main.py`). The lifespan handler must only verify database connectivity (`SELECT 1`) and fail fast with `RuntimeError` if the database is unreachable.
- **PostgreSQL Advisory Locking:** All migrations must acquire the well-known 64-bit advisory lock (`MIGRATION_ADVISORY_LOCK_ID = 7238423`) on a dedicated autocommit connection before invoking Alembic, serializing multi-replica deployments safely.
- **Bounded Readiness Polling:** The runner polls database connectivity with exponential backoff (`db_connect_timeout_seconds=60.0`), gracefully handling cold starts and transient SQLSTATE `57P03` ("FATAL: the database system is starting up").
- **Container Entrypoint:** The Docker entrypoint strictly adheres to:
  `CMD ["sh", "-c", "python -m app.db.migrate && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]`

### 2.4 Chat-Centric Workspace UX Standards
- **Three-Panel Unified Workspace:**
  1. **Sources Rail (Left, collapsible):** Document uploads, processing status badges (`pending`, `completed`, `failed`), and source management.
  2. **Discussion Thread (Center):** Grounded AI dialogue, markdown rendering, code highlighting, and structured inline citations. The composer must remain pinned to the viewport bottom (`shrink-0 border-t`) with reading-aware auto-scrolling (`distanceFromBottom <= 80px`).
  3. **Study Studio (Right, collapsible):** Fixed sticky header with independent vertical scrolling housing all 8 AI study generation tools + Study Guide & Exam Simulator modals.
- **Pruned Navigation:** The global sidebar is consolidated to exactly three primary destinations:
  1. **New Chat** (creates an academic workspace container).
  2. **Recent Chats** (chronological list with title synchronization and deletion).
  3. **Settings** (user preferences, account metadata, appearance).
- **Theme Engine:** Academic Monolith design system supporting Dark mode (Cinematic Black `#0B0B0C`, Charcoal Card `#131315`, Electric Lime `#C6F432` accent), Light mode (`#F8F9FA`), and System mode. Theme initialization must happen pre-paint in `index.html` to eliminate layout and color flashes.

### 2.5 Security, Payloads & Server-Side Document Resolution
- **No Raw Document Text in Metadata:** `SourceResponse` in `backend/app/schemas/notebook.py` and `frontend/src/lib/api.ts` must **never** include `extracted_text` or `storage_key`. Source listings must remain lightweight metadata payloads (< 2KB).
- **Server-Side Generation Resolution:** Generation requests in `backend/app/api/generation.py` resolve text server-side via `source_id` or `notebook_id` verified against `current_user.id`. Client browsers must not upload entire document text back to the server for generation.
- **SPA Routing Integrity:** `frontend/vercel.json` enforces SPA rewrites (`/(.*) -> /`) to prevent 404s on direct navigation or page refreshes. All views must be wrapped by the root `ErrorBoundary` and `ToastProvider`.

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

---

## 4. Engineering & Quality Standards

### 4.1 Test-Driven Development (TDD)
- **Red-Green-Refactor:** For any bug fix or new capability, write a failing unit or integration test first. Confirm failure, implement the minimal viable code to turn it green, and then refactor.
- **No Test Suppression:** Never delete, skip (`@pytest.mark.skip`), comment out, or weaken existing assertions to make a test suite pass. If a test fails, fix the underlying defect.

### 4.2 Security & Multi-Tenant Data Isolation
- **Authentication First:** All data queries must resolve the user via `Depends(get_current_user)`.
- **Ownership Scoping:** Every database query filtering documents, notebooks, conversations, sources, or study materials must enforce `user_id == current_user.id`.
- **Spoofable Headers Forbidden:** Never trust client-supplied headers (such as `X-Session-ID`) for ownership or authorization decisions. Session IDs can only group anonymous sessions when explicitly allowed, never bypass authentication.
- **Safe 404s:** When an authenticated user requests a resource ID owned by another user, return HTTP 404 (Not Found) rather than 403 (Forbidden) to prevent resource enumeration.

### 4.3 UI Accessibility & Design Consistency
- **WCAG AA Compliance:** Ensure color contrast meets 4.5:1 for normal text across both Dark and Light themes (Electric Lime `#C6F432` on `#0B0B0C` exceeds 12:1).
- **Keyboard Navigation:** Modals, dropdowns, tabs, and action buttons must support full keyboard navigation (`Tab`, `Esc`, `Enter`, `Space`) with visible focus rings.
- **Responsive Layouts:** Test and verify desktop (1440×900), short laptop (1280×720), tablet (768×1024), and mobile (375px). Primary navigation folds into mobile drawers cleanly.

---

## 5. Development & Verification Commands

| Scope | Command | Purpose |
| :--- | :--- | :--- |
| **Frontend Test Suite** | `npm --prefix frontend test -- --run` | Executes 162 unit tests across all 11 suites via Node built-in runner. |
| **Frontend Build** | `npm --prefix frontend run build` | Runs TypeScript compilation (`tsc -b`) and Vite production bundle. |
| **Frontend Dev Server** | `npm --prefix frontend run dev` | Starts Vite local development server on port 5173. |
| **Backend Unit Tests** | `python -m unittest backend/tests/test_generation.py -v` | Tests PromptService, JSON parsers, Pydantic schemas, and text resolution. |
| **Backend Lifecycle Tests**| `python -m unittest backend/tests/test_database_startup_and_migration_lifecycle.py -v` | Tests advisory locks, retry logic, and verifies absence of Alembic in lifespan. |
| **Backend Migrations** | `python -m app.db.migrate` (from `backend/` dir) | Polls database readiness and applies Alembic migrations to head under advisory lock. |
| **Backend Dev Server** | `uvicorn app.main:app --reload --port 8000` (from `backend/` dir) | Runs FastAPI development server with hot-reload. |
| **Formatting & Git Check** | `git diff --check` | Confirms zero trailing whitespace or formatting defects. |

---

## 6. Project Safety Rules

- **Small Verifiable Slices:** Implement complex features in thin, incremental slices. Verify each slice with tests before proceeding to the next.
- **No Unauthorized Git Actions:** Never stage, commit, push, create tags, or alter Git remotes unless explicitly instructed by the user.
- **No Unauthorized Migrations or DB Resets:** Never run destructive database commands (`drop database`, `alembic downgrade base`, manual table drops) without explicit authorization.
- **Preserve Clean Working Directory:** Frequently check `git status --short` and `git diff --check` to ensure zero accidental file modifications, trailing whitespaces, or extraneous untracked files.
- **OmniRoute Boundary:** OmniRoute is an optional external proxy. The application core (`backend/` and `frontend/`) must never depend on OmniRoute.
