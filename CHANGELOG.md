# Changelog

All notable changes to the **AI Academic Assistant** project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-11-16

### Added
- **Chat-Centric Workspace Architecture:** Unified user experience revolving around **Chats** backed internally by Course Notebooks, integrating source documents, conversation history, and Study Studio into a cohesive 3-panel workspace.
- **Study Studio 8-Tool Suite:** Server-side generative study tools with verified academic prompt engineering and strict JSON schema enforcement:
  - Comprehensive Notes
  - Executive Summary
  - 5-Mark University Exam Answer (250–350 words with diagrams and exam tips)
  - 10-Mark University Exam Answer (500–700 words with structured depth)
  - Interactive MCQ Quiz (4 options, explanations, difficulty ratings)
  - Viva Question Prep (examiner tone, oral answers, critical key points)
  - Spaced Flashcard Deck (active recall front/back cards)
  - Explain Simply / Beginner Simplifier (plain-language jargon buster and self-test)
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
  - 36 backend generation unit tests verifying all 8 tools, error states, and schemas.
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

## [1.5.0] - 2026-03-15

### Added
- Multi-format document parsing engine supporting PDF, DOCX, PPTX, and TXT files using PyMuPDF (`fitz`), `python-docx`, and `python-pptx`.
- Grounded RAG pipeline with character chunking (1200 chars), overlap (200 chars), token budgeting (32k chars), and inline `[Source: ...]` citations.
- Server-Sent Events (SSE) streaming chat endpoint (`/api/v1/conversations/{id}/messages/stream`).
- Course Notebook data model and multi-source containment.
- Initial Study Studio prototypes for notes and flashcard generation.

---

## [1.0.0] - 2025-10-10

### Added
- Initial project architecture with FastAPI backend and React frontend.
- Single-document upload and direct Gemini chat integration.
- User authentication with JWT access tokens and bcrypt password hashing.
- SQLite and PostgreSQL support.
