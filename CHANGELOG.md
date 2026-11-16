# Changelog

All notable milestones and release iterations for the **AI Academic Assistant** project are documented in this file, aligned directly with the repository's Git commit history.

---

## [Unreleased / Current Milestone] - Chat-Centric Workspace Consolidation & Production Hardening
*Corresponds to commits `18503fc` through `131aa86` and current working-tree consolidation.*

### Added
- **Chat-Centric Workspace Architecture:** Unified user experience revolving around **Chats** backed internally by Course Notebooks, integrating source documents, conversation history, and Study Studio into a cohesive 3-panel workspace.
- **Study Studio 10-Tool Client Suite across 3 Categories:**
  - *Notes & Summaries:* Comprehensive Notes (streaming), Executive Summary (streaming), Study Guide Chapters (persisted modal action).
  - *Exams & Tests:* 5-Mark Exam Answer (streaming), 10-Mark Exam Answer (streaming), Interactive MCQ Quiz (streaming), Viva Question Prep (streaming), Full Exam Simulator (persisted modal action).
  - *Concept Breakdown:* Spaced Flashcards (streaming), Explain Simply / ELI5 (streaming).
- **Backend Dual-Tier Generative Engine:**
  - 8 streaming generation endpoints (`/api/v1/generate/*`) in `backend/app/api/generation.py`.
  - 3 persisted-material generation endpoints (`/api/v1/notebooks/{id}/generate/*`) in `backend/app/api/study_materials.py`.
- **Single-Path Container Migration Runner (`app.db.migrate`):**
  - Dedicated pre-Uvicorn migration runner invoked via Docker entrypoint.
  - PostgreSQL session advisory lock (`7238423`) to serialize migrations across multiple instances or replicas.
  - Bounded exponential readiness polling (up to `DB_CONNECT_TIMEOUT_SECONDS`, default 60s) to handle database startup latency.
- **Server-Side Generation Resolution:** Enhanced `StudyStudioPanel` and backend `/generate/*` endpoints to resolve document text directly on the server by document ID, eliminating the transmission of raw document text across the wire.
- **Academic Monolith Design System:** Pre-paint zero-flash theme script in `index.html` supporting Dark (`#0B0B0C`), Charcoal (`#131315`), Electric Lime (`#C6F432`), Light (`#F8F9FA`), and System mode with WCAG AA compliance (> 12:1 contrast).
- **Vercel SPA Deployment Configuration:** Added `frontend/vercel.json` SPA catch-all rewrite rule (`/(.*) -> /`) to guarantee clean direct navigation and reloads across all routes.
- **Top-Level Error Boundary & Toast Provider:** Root `ErrorBoundary` and `ToastProvider` wrapping the entire React tree in `App.tsx` to prevent blank screen crashes.
- **Comprehensive Test Suite:**
  - 162 frontend tests across 11 test suites running on Node's native test runner (`node --test`).
  - 36 backend generation unit tests verifying all generation tools, error states, and schemas.
  - 5 database startup and migration lifecycle tests.

### Changed
- **Branding Consolidation:** Unified all user-facing copy, login/registration screens, navigation labels, footers, and page titles strictly under the official name **AI Academic Assistant**.
- **Alembic Lifespan Isolation:** Removed all `command.upgrade()` calls from FastAPI application startup lifespan. Lifespan now strictly performs non-blocking read-only health checks (`SELECT 1`).
- **Database Driver Alignment:** Standardized on `psycopg` (v3) for SQLAlchemy 2.0 with automatic connection URL coercion (`postgresql://` -> `postgresql+psycopg://`).
- **Navigation Streamlining:** Simplified primary sidebar to 3 destinations: **Chats (Workspace)**, **New Chat (+)**, and **Settings**, with secondary utilities (Documents, Tools) maintained under clean routes.

### Security
- **Source Response Sanitization:** Removed sensitive `extracted_text` and `storage_key` fields from public `SourceResponse` DTOs to prevent full document exposure in browser network payloads.
- **Prompt Injection Defense:** Encapsulated all student document context within sovereign `<grounding_context>` XML delimiters with explicit model hierarchy instructions treating source directives as inert text.
- **Strict Multi-Tenant Scoping:** Enforced `user_id == current_user.id` on all database queries and verified safe HTTP 404 responses on cross-user resource access.

---

## [Historical Milestone: StudyHub V2 Release] - 2026-03-15
*Corresponds to Git commit `6351832` (`Merge branch 'v2/studyhub' into main`).*

### Added
- Multi-format document parsing engine supporting PDF, DOCX, PPTX, and TXT files using PyMuPDF (`fitz`), `python-docx`, and `python-pptx`.
- Grounded RAG pipeline with character chunking (1200 chars), overlap (200 chars), token budgeting (32k chars), and inline `[Source: ...]` citations.
- Server-Sent Events (SSE) streaming chat endpoint (`/api/v1/conversations/{id}/messages/stream`).
- Course Notebook data model and multi-source containment.
- Initial Study Studio prototypes for notes and flashcard generation.

---

## [Historical Milestone: Initial Release] - 2025-10-10
*Corresponds to Git commit `2f3e5f8` (`Initial release`).*

### Added
- Initial project architecture with FastAPI backend and React frontend.
- Single-document upload and direct Gemini chat integration.
- User authentication with JWT access tokens and bcrypt password hashing.
- SQLite and PostgreSQL support.
