# AI Academic Assistant

> **A production-grade, AI-powered academic learning workspace engineered to transform multi-format course materials into grounded tutor conversations, verified citations, structured study notes, university examination answers, active-recall flashcards, and interactive practice quizzes.**

---

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-2.5%20Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![Tests Passing](https://img.shields.io/badge/Tests-162%20Frontend%20%7C%2041%20Backend-brightgreen?style=flat-square)](docs/Testing.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](#13-license)

---

## 1. Executive Summary

**AI Academic Assistant** is a full-stack academic workspace built for university students, educators, and researchers. By synthesizing course materials (lecture PDFs, DOCX syllabi, PPTX slide decks, and plain text notes), the system eliminates study fragmentation through a unified **Chat-Centric Workspace**.

Unlike generic AI chat wrappers that hallucinate unsupported claims, AI Academic Assistant employs a **Grounded Retrieval-Augmented Generation (RAG)** pipeline that indexes uploaded documents, enforces token budgets, isolates untrusted text inside an anti-injection `<grounding_context>` XML sandbox, and mandates exact inline source citations (`[Source: <filename>]`).

In addition to interactive tutor chat with Server-Sent Events (SSE) streaming, the platform integrates **Study Studio**: a multi-tiered generative engine delivering on-the-fly streaming study aids, interactive quizzes, oral exam preparation, and persisted curriculum-wide course materials.

---

## 2. Core Academic Workflow

```mermaid
flowchart LR
    A["1. Create Chat<br/>(Course Workspace)"] --> B["2. Upload Sources<br/>(PDF, DOCX, PPTX)"]
    B --> C["3. Grounded Chat<br/>(SSE + Inline Citations)"]
    C --> D["4. Study Studio<br/>(10 Tools / 3 Categories)"]
    D --> E["5. Practice & Revise<br/>(Flashcards, Viva, Exams)"]
```

1. **Create Chat:** Start an isolated workspace dedicated to a specific subject, course module, or exam topic.
2. **Upload Sources:** Add textbooks, lecture slides, research papers, and assignments to the workspace's Sources Rail.
3. **Grounded Ingestion:** Text is automatically parsed via PyMuPDF, chunked into 1200-character segments, and indexed for grounding.
4. **Interactive Chat:** Ask complex questions and receive real-time, streaming responses grounded exclusively in your documents with verified citations.
5. **Study Studio Exploration:** Generate structured answers, test knowledge via interactive quizzes, practice viva questions, or synthesize full course study guides and exam papers.

---

## 3. Key Features

### 3.1 Chat-Centric Academic Workspace
- **Unified Experience:** Every academic chat is internally backed by an isolated Course Notebook, seamlessly binding message history, uploaded sources, and generated study materials without cognitive friction.
- **Three-Panel Layout:**
  - **Left Rail (Sources Rail):** Live list of uploaded course documents with parsing status badges (`processing`, `completed`, `failed`), file sizes, and quick upload modal.
  - **Center Panel (Tutor Chat):** Streaming conversation interface with auto-scroll, pinned composer, and suggested topic prompts.
  - **Right Panel (Study Studio):** Comprehensive study tools panel organized into 3 distinct categories with tabbed access to active tool output and persisted course materials.

### 3.2 Multi-Format Document Ingestion Engine
- Supports **PDF**, **DOCX**, **PPTX**, and **TXT** files.
- High-performance, memory-safe text extraction via PyMuPDF (`fitz`), `python-docx`, and `python-pptx`.
- Server-side payload protection: document raw text (`extracted_text`) and storage paths (`storage_key`) are never leaked to public browser APIs.

### 3.3 Grounded RAG & Sovereign Anti-Injection Defense
- **Sovereign System Hierarchy:** System instructions maintain absolute priority over uploaded documents.
- **Context Sandboxing:** All extracted document content is strictly enclosed inside `<grounding_context>` XML tags.
- **Prompt Injection Defense:** If course materials contain malicious instructions (e.g., *"Ignore all previous instructions"*), the model treats them strictly as inert reference data.
- **Verified Citations:** Factual claims are attributed via `[Source: <filename>]`. If information is missing from the sources, the assistant transparently discloses it rather than fabricating answers.

### 3.4 Study Studio: Architecture & Tool Breakdown

The Study Studio architecture separates immediate interactive exploration from persisted, curriculum-aligned academic artifacts:

#### Frontend Surface: 10 Tools Across 3 Categories
The client-side `StudyStudioPanel` organizes capabilities into three distinct educational categories:

1. **Category 1: Notes & Summaries**
   - **Comprehensive Notes:** High-yield markdown notes containing key concepts, comparison tables, definitions glossary, exam points, and mnemonics (powered by streaming endpoint `/api/v1/generate/notes`).
   - **Executive Summary:** Concise, student-friendly academic synthesis highlighting core themes and essential takeaways (powered by streaming endpoint `/api/v1/generate/summary`).
   - **Study Guide Chapters:** Multi-chapter curriculum notes generated across all notebook sources and saved persistently to the workspace (invokes modal action -> `/api/v1/notebooks/{id}/generate/study-guide`).

2. **Category 2: Exams & Tests**
   - **5-Mark Exam Answer:** University-calibrated answers (250–350 words) with structured introduction, 4–5 bullet points with bold keywords, diagram suggestions, and exam tips (powered by streaming endpoint `/api/v1/generate/5-mark-answer`).
   - **10-Mark Exam Answer:** Comprehensive essay-style answers (500–700 words) with numbered subsections, flowcharts, in-depth explanations, and potential exam questions (powered by streaming endpoint `/api/v1/generate/10-mark-answer`).
   - **Interactive MCQ Quiz:** Rigorous multiple-choice quizzes output as structured JSON with 4 balanced options, difficulty ratings, and educational rationales (powered by streaming endpoint `/api/v1/generate/mcqs`).
   - **Viva Question Prep:** Oral exam simulation with examiner-style questions, model 30–120s spoken answers, and scoring criteria key points (powered by streaming endpoint `/api/v1/generate/viva-questions`).
   - **Full Exam Simulator:** Structured university exam paper (e.g., 50 or 100 marks) with 5-mark and 10-mark sections, model answers, and scoring keys saved persistently (invokes modal action -> `/api/v1/notebooks/{id}/generate/exam-paper`).

3. **Category 3: Concept Breakdown**
   - **Spaced Flashcards:** Interactive 3D flip-card study deck formatted for active recall and term memorization (powered by streaming endpoint `/api/v1/generate/flashcards`).
   - **Explain Simply (ELI5):** Plain-language conceptual breakdown pairing technical jargon with intuitive analogies and self-test questions (powered by streaming endpoint `/api/v1/generate/explain-simply`).

#### Backend Implementation: 8 Streaming + 3 Persisted Endpoints
- **8 Streaming Generation Endpoints (`backend/app/api/generation.py`):**
  Deliver immediate Server-Sent Events (SSE) streaming for rapid iteration:
  - `POST /api/v1/generate/notes`
  - `POST /api/v1/generate/summary`
  - `POST /api/v1/generate/5-mark-answer`
  - `POST /api/v1/generate/10-mark-answer`
  - `POST /api/v1/generate/mcqs`
  - `POST /api/v1/generate/viva-questions`
  - `POST /api/v1/generate/flashcards`
  - `POST /api/v1/generate/explain-simply`
  *(All 8 endpoints resolve document text server-side via `source_id` or `notebook_id` to eliminate client payload bloat).*

- **3 Persisted-Material Generation Endpoints (`backend/app/api/study_materials.py`):**
  Synthesize all eligible documents in a workspace and save structured records to PostgreSQL:
  - `POST /api/v1/notebooks/{id}/generate/study-guide`
  - `POST /api/v1/notebooks/{id}/generate/flashcards`
  - `POST /api/v1/notebooks/{id}/generate/exam-paper`

### 3.5 Academic Monolith Theme System
- Designed with **Zero-Flash Pre-Paint Scripting** in `index.html`.
- High-contrast visual tokens:
  - **Dark Mode (Default):** Midnight Black (`#0B0B0C`), Charcoal Surface (`#131315`), and Electric Lime (`#C6F432`) accents.
  - **Light Mode:** Off-white canvas (`#F8F9FA`), Slate borders (`#E5E7EB`), and Deep Charcoal typography (`#111827`).
  - **System Mode:** Automatic synchronization with OS dark/light mode preferences.
- WCAG AA compliant with contrast ratios exceeding 12:1.

---

## 4. System Architecture

```mermaid
flowchart TD
    subgraph Frontend Tier [Frontend — React 18 + Vite]
        AppShell["App Shell & Navigation Sidebar"]
        Workspace["Chat Workspace (3-Panel Layout)"]
        SourcesRail["Sources Rail (Upload & Status)"]
        ChatStream["SSE Chat Stream (Auto-Scroll)"]
        StudyStudio["Study Studio (10 Tools / 3 Categories)"]
    end

    subgraph Backend Tier [Backend — FastAPI & Python 3.10+]
        Router["FastAPI REST & SSE Router (/api/v1)"]
        AuthMiddleware["JWT Auth Middleware (HS256)"]

        subgraph Subsystems
            DocService["Document Ingestion Service<br/>(PyMuPDF, docx, pptx)"]
            GroundingSvc["GroundingService<br/>(Chunking, Token Budget, Sandboxing)"]
            PromptSvc["PromptService<br/>(Prompt Builders & Schema Enforcement)"]
            GeminiClient["Direct Gemini API Client<br/>(gemini-2.5-flash)"]
        end

        MigrateRunner["Container Startup Runner<br/>(app.db.migrate)"]
        AdvisoryLock["PostgreSQL Advisory Lock<br/>(Key: 7238423)"]
    end

    subgraph Persistence [Data Persistence]
        Postgres[("Railway PostgreSQL<br/>SQLAlchemy 2.0 + psycopg v3")]
        FileStorage[("Local / S3 Document Store")]
    end

    Workspace --> SourcesRail
    Workspace --> ChatStream
    Workspace --> StudyStudio

    SourcesRail -->|Multipart Upload| Router
    ChatStream -->|SSE Event Stream| Router
    StudyStudio -->|Streaming & Persisted Calls| Router

    Router --> AuthMiddleware
    AuthMiddleware --> DocService
    AuthMiddleware --> GroundingSvc
    AuthMiddleware --> PromptSvc

    DocService --> FileStorage
    DocService --> Postgres
    GroundingSvc --> GeminiClient
    PromptSvc --> GeminiClient
    GeminiClient -->|Stream / JSON| Router

    MigrateRunner -->|Acquire Session Lock| AdvisoryLock
    AdvisoryLock --> Postgres
```

---

## 5. Visual Layout & User Interface

> [!NOTE]
> To ensure absolute factual accuracy without fabricated UI mockups, interface layouts and component states are represented via vector architecture models and live component tests. The application runs a clean 3-panel workspace:

```
+-------------------+---------------------------------------+----------------------------------+
| Sources Rail      | Grounded Tutor Discussion             | Study Studio (Right Panel)       |
| (Left, 280px)     | (Center, Flexible Viewport)           | (Right, 360px-420px)             |
+-------------------+---------------------------------------+----------------------------------+
| + Add Document    | Message Thread                        | [Notes & Summaries]              |
| [PDF] Syllabus    | - Grounded Answers                    | - Comprehensive Notes            |
| [PPT] Lecture 01  | - [Source: Syllabus, Page 4]          | - Executive Summary              |
| [DOC] Lab Manual  | - Markdown Tables & Code Blocks       | - Study Guide Chapters           |
|                   |                                       | [Exams & Tests]                  |
| Status Badges:    | Pinned Composer (Bottom):             | - 5-Mark / 10-Mark Answers       |
| [completed]       | [ Ask questions about course docs... ]| - MCQ Quiz / Viva Prep           |
| [processing]      | [ Send (Enter) ]                      | - Full Exam Simulator            |
|                   |                                       | [Concept Breakdown]              |
|                   |                                       | - Flashcards / Explain Simply    |
+-------------------+---------------------------------------+----------------------------------+
```

---

## 6. Technology Stack

### Frontend
- **Framework:** React 18.3 with TypeScript 5.5
- **Build Tool:** Vite 6.4 (ESM native, sub-5s production builds)
- **Styling:** Tailwind CSS 3.4 with custom design tokens (8px grid spacing)
- **Icons & Motion:** Lucide React, Framer Motion
- **Markdown & Math:** `react-markdown`, `remark-gfm`, `rehype-raw`, `rehype-katex`
- **Testing:** Node.js native test runner (`node --test`) — 162 passing tests across 11 suites

### Backend
- **Framework:** Python 3.10+ with FastAPI 0.110+
- **ASGI Server:** Uvicorn with single-worker production execution
- **Database Driver & ORM:** SQLAlchemy 2.0 with modern `psycopg` (v3.2.4)
- **Migrations:** Alembic 1.13+ (11 linear migrations up to head `b2c3d4e5f6a7`)
- **Document Processing:** PyMuPDF (`fitz` 1.24+), `python-docx` 1.1+, `python-pptx` 0.6+
- **AI Integration:** Google Gemini SDK (`google-generativeai`) using `gemini-2.5-flash`
- **Security:** Passlib (bcrypt 4.0+), PyJWT (HS256)

### Infrastructure & Deployment
- **Backend & Database:** Railway Cloud (Containerized Dockerfile + Managed PostgreSQL)
- **Frontend:** Vercel Global Edge CDN (Single Page Application with `vercel.json` rewrites)

---

## 7. Local Development Setup

### Prerequisites
- **Node.js:** v18.0.0 or higher (`node -v`)
- **Python:** v3.10 or higher (`python --version`)
- **PostgreSQL:** Local instance or cloud database URL
- **Google Gemini API Key:** From [Google AI Studio](https://aistudio.google.com/)

---

### 7.1 Backend Setup

1. **Navigate to backend and configure virtual environment:**
   ```powershell
   # Windows PowerShell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
   ```bash
   # Linux / macOS / WSL2
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and provide your database URL and Google Gemini API key:
   ```ini
   DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/ai_academic_assistant
   GOOGLE_API_KEY=your_actual_gemini_api_key
   JWT_SECRET_KEY=v2_studyhub_dev_secret_key_only_for_local_development_32chars
   APP_ENV=development
   ```

4. **Apply database migrations:**
   ```bash
   python -m app.db.migrate
   ```

5. **Start backend development server:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *Interactive Swagger API documentation will be available at:* `http://localhost:8000/docs`

---

### 7.2 Frontend Setup

1. **Navigate to frontend and install packages:**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   Confirm `VITE_API_BASE_URL` points to your backend:
   ```ini
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   ```

3. **Start frontend development server:**
   ```bash
   npm run dev
   ```
   *The application will be accessible at:* `http://localhost:5173`

---

## 8. Testing & Quality Verification

The repository enforces strict testing policies before any release or commit.

### 8.1 Backend Unit & Integration Tests (41 Tests)
```powershell
# Windows PowerShell
$env:PYTHONPATH="backend"

# Run Study Studio generation & prompt tests (36 tests)
python -m unittest backend/tests/test_generation.py -v

# Run Database migration runner & advisory lock tests (5 tests)
python -m unittest backend/tests/test_database_startup_and_migration_lifecycle.py -v
```

### 8.2 Frontend Test Suite (162 Tests)
```bash
npm --prefix frontend test -- --run
```
Output:
```text
ℹ tests 162
ℹ suites 0
ℹ pass 162
ℹ fail 0
ℹ duration_ms ~2200ms
```

### 8.3 Frontend Production Build Verification
```bash
npm --prefix frontend run build
```

*For complete testing documentation and CI pre-flight scripts, see [docs/Testing.md](docs/Testing.md).*

---

## 9. Database Migrations & Single-Path Execution

Database migrations are tracked via Alembic with a linear 11-migration chain ending at head `b2c3d4e5f6a7`.

```mermaid
flowchart LR
    M1["4d03923a1a9e<br/>Initial schema"] --> M2["e3f4a5b6c7d8<br/>Documents"]
    M2 --> M3["f4a5b6c7d8e9<br/>Conversations"]
    M3 --> M4["b5c6d7e8f9a0<br/>Citations"]
    M4 --> M5["c6d7e8f9a0b1<br/>Notebooks"]
    M5 --> M6["d7e8f9a0b1c2<br/>Materials"]
    M6 --> M7["e8f9a0b1c2d3<br/>Indexes"]
    M7 --> M8["f9a0b1c2d3e4<br/>FK Constraints"]
    M8 --> M9["a0b1c2d3e4f5<br/>Source Status"]
    M9 --> M10["a1b2c3d4e5f6<br/>Tags & Search"]
    M10 --> M11["b2c3d4e5f6a7 (head)<br/>Cascade Fixes"]
```

### Production Single-Path Migration Rule:
- Migrations run **exclusively** via `python -m app.db.migrate` during container startup before Uvicorn starts.
- Acquires a **PostgreSQL session advisory lock (`7238423`)** to ensure concurrency safety.
- The FastAPI application lifespan (`backend/app/main.py`) performs **read-only health checks only (`SELECT 1`)** and never invokes Alembic.

*For full migration commands and schema details, see [backend/migrations/README.md](backend/migrations/README.md).*

---

## 10. Production Deployment

### 10.1 Backend on Railway
- **Build Type:** Dockerfile (`backend/Dockerfile`)
- **Container Entrypoint:**
  ```dockerfile
  CMD ["sh", "-c", "python -m app.db.migrate && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
  ```
- **Healthcheck Path:** `/api/v1/health`

### 10.2 Frontend on Vercel
- **Framework Preset:** Vite
- **Root Directory:** `frontend`
- **Output Directory:** `dist`
- **SPA Routing Guarantee:** Enforced via `frontend/vercel.json`:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/" }]
  }
  ```
- **Root Protection:** `ToastProvider` and top-level `ErrorBoundary` wrap the entire tree in `App.tsx` to prevent blank screen crashes.

*For detailed production deployment steps, see [docs/Deployment.md](docs/Deployment.md).*

---

## 11. Security & Multi-Tenancy Architecture

1. **Authentication First:** All data endpoints require a valid JWT bearer token resolved via `Depends(get_current_user)`.
2. **Ownership Scoping:** All queries strictly filter on `user_id == current_user.id`.
3. **Safe 404s:** Requests for resource IDs belonging to other users return HTTP 404 (Not Found) rather than 403 (Forbidden) to prevent resource enumeration attacks.
4. **Network Payload Minimization:** Document text is resolved internally on the server during Study Studio generation rather than passed back and forth to the client.
5. **Session ID Policy:** Header `X-Session-ID` is used only for anonymous session correlation, never for authorization or tenant isolation.

---

## 12. Project Directory Structure

```text
ai-academic-assistant/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI REST endpoints (auth, notebooks, sources, chat, generation)
│   │   ├── core/            # Strongly-typed Pydantic Settings, security, and DB session factory
│   │   ├── db/              # Single-path migration runner with advisory lock (migrate.py)
│   │   ├── models/          # SQLAlchemy 2.0 ORM models (User, Notebook, Source, Conversation, Message)
│   │   ├── schemas/         # Pydantic v2 validation DTOs (sanitized SourceResponse, NotebookResponse)
│   │   └── services/        # Business logic (GroundingService, PromptService, GeminiClient, DocumentService)
│   ├── migrations/          # Alembic migrations (11 versions up to head b2c3d4e5f6a7)
│   ├── tests/               # Backend unit and integration test suite
│   ├── Dockerfile           # Multi-stage production container build
│   └── requirements.txt     # Python production dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # Design system primitives, Layout, Navigation, Markdown, Modals
│   │   ├── features/        # SourcesRail, WorkspaceChat, StudyStudio, ThemeContext, AuthContext
│   │   ├── pages/           # Chat Workspace, Hub, Settings, Login, Register, Public Landing
│   │   ├── lib/             # API client (api.ts) with server-side generation helpers
│   │   └── styles/          # Global CSS tokens, 8px grid utilities, Academic Monolith themes
│   ├── tests/               # 11 frontend test suites (162 tests) running on node --test
│   ├── vercel.json          # SPA catch-all rewrite rule for Vercel edge deployment
│   ├── package.json         # Frontend dependencies and test scripts
│   └── vite.config.ts       # Vite bundling and optimization configuration
├── docs/                    # Authoritative engineering and architecture documentation
│   ├── API.md               # Complete REST and SSE API contract specification
│   ├── Architecture.md      # Deep architectural blueprints and data models
│   ├── Setup.md             # Local developer setup for Windows PowerShell and WSL2
│   ├── Environment.md       # Typed environment variables matrix and security policies
│   ├── Deployment.md        # Railway and Vercel production deployment workflows
│   ├── Testing.md           # Testing guide, test suites, and pre-flight checklists
│   ├── PromptEngineering.md # System prompts, XML sandboxing, and JSON repair schemas
│   ├── ConceptNote.md       # Original academic purpose and vision
│   └── ProjectReport.md     # Engineering report and feature audit
├── CHANGELOG.md             # Git milestone release history
├── AGENTS.md                # Permanent agent engineering rules and skill activation matrix
└── README.md                # Project landing page and architectural overview
```

---

## 13. Documentation Sitemap

| Document | Purpose |
| :--- | :--- |
| [docs/API.md](docs/API.md) | Comprehensive API contracts for Auth, Workspaces, Sources Rail, Grounded Chat, Study Studio (8 streaming + 3 persisted), and Saved Materials. |
| [docs/Architecture.md](docs/Architecture.md) | In-depth architectural guide with Mermaid diagrams covering data model ERDs, RAG pipelines, and startup lifecycles. |
| [docs/Setup.md](docs/Setup.md) | Step-by-step local development setup guide for Windows 11 (PowerShell) and WSL2 / Linux. |
| [docs/Environment.md](docs/Environment.md) | Strongly-typed environment variables matrix, security requirements, and template configuration files. |
| [docs/Deployment.md](docs/Deployment.md) | Production deployment guide for Railway (PostgreSQL, Docker entrypoint) and Vercel (SPA rewrites, root ErrorBoundary). |
| [docs/Testing.md](docs/Testing.md) | Test suites, test runners (`node --test`, Python `unittest`), coverage metrics, and pre-flight commands. |
| [docs/PromptEngineering.md](docs/PromptEngineering.md) | System prompt specifications, `<grounding_context>` anti-injection sandboxing, and JSON output repair. |
| [backend/migrations/README.md](backend/migrations/README.md) | Database migration history, PostgreSQL advisory locking (`7238423`), and schema operations. |
| [CHANGELOG.md](CHANGELOG.md) | Git history and milestone release log. |
| [AGENTS.md](AGENTS.md) | Permanent engineering rules, branding invariants, and skill activation matrix. |

---

## 14. License

This project is open-source software licensed under the MIT License.

---

## 15. Author & Acknowledgements

Created and engineered by **Krrish Dang** ([@KrrishDang](https://github.com/KrrishDang)) , **Ishank Batra** ([@Ishank-Batra](https://github.com/Ishank-Batra)).

Special thanks to the Google Gemini team for generative AI capabilities and the open-source community for FastAPI, React, and Tailwind CSS.
