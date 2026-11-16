# Architecture Documentation — AI Academic Assistant

This document details the engineering architecture, data models, pipelines, and infrastructure of **AI Academic Assistant**.

---

## 1. System Topology Overview

AI Academic Assistant is structured as a decoupled full-stack application:

```mermaid
flowchart TD
    subgraph Client["Frontend Client (Vite + React 18 + TS)"]
        UI["Chat Workspace UI"]
        SourcesRail["Sources Rail (Upload & Manage)"]
        ChatPanel["Discussion Thread (SSE Streaming)"]
        StudyStudio["Study Studio (8 Tools + Modals)"]
        ThemeEngine["Theme Engine (Pre-paint + Dark/Light)"]
    end

    subgraph CDN["Edge / Hosting"]
        Vercel["Vercel SPA Hosting (/(.*) -> /)"]
    end

    subgraph BackendHost["Backend Service (FastAPI + Python 3.13)"]
        MigrateRunner["app.db.migrate (Advisory Lock 7238423)"]
        Uvicorn["Uvicorn Server (:8000)"]
        FastAPILifespan["FastAPI Lifespan (SELECT 1 ping)"]
        AuthService["Auth & Security (JWT HS256 + Bcrypt)"]
        GroundingService["GroundingService (Chunking & Citations)"]
        DocExtractor["Extractor Engine (PyMuPDF, docx, pptx)"]
        StudyService["StudyStudio Engine (SSE & JSON Repair)"]
    end

    subgraph External["External Services & Storage"]
        Gemini["Google Gemini API (gemini-2.5-flash)"]
        Postgres["PostgreSQL Database (Railway Managed)"]
        DiskStorage["Local / S3 Storage (Multi-Format Files)"]
    end

    Client -->|HTTPS / WSS| Vercel
    Vercel -->|REST / SSE Requests| Uvicorn
    Uvicorn --> AuthService
    Uvicorn --> GroundingService
    Uvicorn --> DocExtractor
    Uvicorn --> StudyService

    MigrateRunner -->|Pre-startup Migration| Postgres
    FastAPILifespan -->|Health Probe| Postgres
    GroundingService -->|Prompt Injection| Gemini
    StudyService -->|Direct LLM Inference| Gemini
    DocExtractor -->|File Storage| DiskStorage
    AuthService -->|User / Scoped Queries| Postgres
```

---

## 2. Workspace & Data Model

The application revolves around one primary concept: **Academic Chats**, internally backed by the **`Notebook`** entity.

```mermaid
erDiagram
    User ||--o{ Notebook : "owns"
    Notebook ||--o{ Source : "contains"
    Notebook ||--o{ Conversation : "contains"
    Notebook ||--o{ StudyMaterial : "contains"
    Conversation ||--o{ Message : "contains"

    User {
        uuid id PK
        string email UK
        string password_hash
        string name
        string role
        boolean is_active
        datetime created_at
    }

    Notebook {
        uuid id PK
        uuid user_id FK
        string title
        string description
        datetime created_at
        datetime updated_at
    }

    Source {
        uuid id PK
        uuid notebook_id FK
        string source_type
        string original_filename
        string display_title
        string mime_type
        int file_size_bytes
        string content_hash
        string processing_status
        string extracted_text
        datetime created_at
    }

    Conversation {
        uuid id PK
        uuid notebook_id FK
        uuid user_id FK
        string title
        datetime created_at
        datetime updated_at
    }

    Message {
        uuid id PK
        uuid conversation_id FK
        string role
        string content
        datetime created_at
    }

    StudyMaterial {
        uuid id PK
        uuid notebook_id FK
        string material_type
        string title
        json content
        datetime created_at
    }
```

### Data Isolation Principles:
- Every database query resolving notebooks, sources, conversations, messages, or study materials strictly filters by `user_id == current_user.id`.
- Accessing a resource owned by another user yields HTTP `404 Not Found` rather than `403 Forbidden`, preventing resource ID enumeration.
- Database foreign key constraints enforce strict referential integrity (`check_conversation_ownership_consistency`).

---

## 3. Multi-Format Source Ingestion Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as Sources Rail UI
    participant Backend as Sources API
    participant Extractor as Extraction Service
    participant Storage as Storage Manager
    participant DB as PostgreSQL

    User->>Frontend: Drag-and-drop file (PDF, DOCX, PPTX, TXT)
    Frontend->>Frontend: Client validation (type, size <= 20MB)
    Frontend->>Backend: POST /api/v1/notebooks/{id}/sources (Multipart)
    Backend->>Backend: Verify Notebook ownership (user_id == current_user.id)
    Backend->>Backend: Magic bytes signature validation
    Backend->>Storage: Persist file to local disk / S3
    Backend->>Extractor: Parse file format
    alt PDF
        Extractor->>Extractor: PyMuPDF (fitz) text & page extraction
    else DOCX
        Extractor->>Extractor: python-docx paragraph extraction
    else PPTX
        Extractor->>Extractor: python-pptx slide text extraction
    else TXT
        Extractor->>Extractor: UTF-8 stream decode & clean
    end
    Extractor-->>Backend: Cleaned extracted text & page count
    Backend->>DB: Insert Source record (status='completed', extracted_text=...)
    Backend-->>Frontend: Return SourceResponse (Metadata only, no raw text)
    Frontend->>Frontend: Update Sources Rail with completed badge
```

---

## 4. Grounded RAG & Inline Citations Pipeline

When a user chats in a workspace with attached sources, the conversation is grounded dynamically:

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant UI as Chat Workspace
    participant API as /conversations/{id}/messages/stream
    participant Grounding as GroundingService
    participant Gemini as Google Gemini API
    participant DB as PostgreSQL

    Student->>UI: Submit question ("Explain Raft leader election")
    UI->>API: POST SSE request
    API->>DB: Load active workspace sources (status='completed')
    API->>Grounding: build_grounded_context(sources, user_query)
    Grounding->>Grounding: Sliding-window chunking (1200 chars, 200 overlap)
    Grounding->>Grounding: Token budgeting (Max 8 relevant chunks)
    Grounding->>Grounding: Construct academic prompt with citation instructions
    API->>Gemini: Stream completion (system_prompt + history + grounded_context)
    loop SSE Stream
        Gemini-->>API: Response text delta
        API-->>UI: event: delta {"text": "..."}
    end
    API->>API: Extract structured citations [Source: ..., Page: ...]
    API-->>UI: event: citation {"source_title": "...", "page": 4}
    API->>DB: Persist assistant message in Message table
    API-->>UI: event: done {"message_id": "..."}
```

---

## 5. Study Studio Generation Engine

The Study Studio provides eight interactive study tools + two modal curriculum generators:

### Tool Matrix:

| Category | Tool | Endpoint | Format | Parser / Runner |
| :--- | :--- | :--- | :---: | :--- |
| **Notes & Summaries** | Comprehensive Notes | `/api/v1/generate/notes` | SSE Markdown | Streamed Markdown viewer with copy/export |
| | Executive Summary | `/api/v1/generate/summary` | SSE Markdown | Streamed Markdown viewer |
| | Study Guide Chapters | `/api/v1/notebooks/{id}/generate/study-guide` | Saved JSON | Multi-chapter accordion with completion tracking |
| **Exams & Tests** | 5-Mark Exam Answer | `/api/v1/generate/5-mark-answer` | SSE Markdown | Structured 250–350 word model answer format |
| | 10-Mark Exam Answer | `/api/v1/generate/10-mark-answer` | SSE Markdown | Detailed essay structure with sections & conclusion |
| | Interactive MCQ Quiz | `/api/v1/generate/mcqs` | Validated JSON | Interactive runner (`parseMCQResponse`) with scoring & feedback |
| | Viva Question Prep | `/api/v1/generate/viva-questions` | Validated JSON | Oral exam simulator (`parseVivaResponse`) with answer reveal |
| | Full Exam Simulator | `/api/v1/notebooks/{id}/generate/exam-paper` | Saved JSON | Timed exam paper with section mark weighting (50/100 marks) |
| **Concept Breakdown** | Spaced Flashcards | `/api/v1/generate/flashcards` | Validated JSON | 3D Flip-card engine (`parseFlashcardResponse`) for active recall |
| | Explain Simply (ELI5) | `/api/v1/generate/explain-simply` | SSE Markdown | Intuitive plain-language analogies |

### Server-Side Document Resolution:
All tools pass `notebook_id` or `source_id` directly in `NotesGenerationRequest`. The backend resolves the text server-side from PostgreSQL, preventing client payload bloat and securing proprietary materials.

---

## 6. Database Startup Lifecycle & Advisory Locking

```mermaid
flowchart TD
    Start["Container Startup: Dockerfile CMD"] --> MigrateCmd["python -m app.db.migrate"]
    MigrateCmd --> PollDB["wait_for_database() (Timeout: 60s, Exponential Backoff)"]
    PollDB -->|Failure| FailExit["sys.exit(1) — Fail Fast"]
    PollDB -->|Connected| Lock["Acquire PostgreSQL Advisory Lock (7238423)"]
    Lock --> RunAlembic["command.upgrade(alembic_cfg, 'head') on locked session"]
    RunAlembic --> Unlock["Release Advisory Lock in finally block"]
    Unlock --> ExecUvicorn["exec uvicorn app.main:app (Replaces Shell Process)"]
    ExecUvicorn --> FastAPILifespan["FastAPI Lifespan (SELECT 1 Health Check)"]
    FastAPILifespan --> Ready["FastAPI Ready on :8000"]
```

### Key Engineering Guarantees:
- **No Concurrency Races:** Replicas wait for advisory lock `7238423`, preventing concurrent migration collisions.
- **Lifespan Purity:** FastAPI lifespan only runs `SELECT 1` connectivity probes; Alembic is never invoked inside lifespan.
- **Fail Fast:** If migrations or connectivity fail, the container exits immediately without starting a broken web server.

---

## 7. Frontend Design System & Theme Engine

- **Academic Monolith Palette:**
  - Background: Cinematic Black (`#0B0B0C`)
  - Card & Surfaces: Charcoal Gray (`#131315`), Border (`#26262A`)
  - Primary Accent: Electric Lime (`#C6F432`)
  - Text: High-contrast pure white (`#FFFFFF`) and muted slate (`#94A3B8`)
  - Contrast Ratio: Exceeds 12:1 (WCAG AA requirement: 4.5:1)
- **Pre-paint Theme Script (`index.html`):**
  Reads `studyhub_theme` and system preference before DOM render to prevent white/dark flashes during initial page load.
- **Production SPA Rewrite (`vercel.json`):**
  Maps `/(.*)` to `/` for clean direct navigation and browser refresh across all routes.
