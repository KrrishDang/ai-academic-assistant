# AI Academic Assistant — API Specification

The **AI Academic Assistant** backend is a FastAPI application exposing REST and Server-Sent Events (SSE) streaming endpoints mounted under `/api/v1`.

Interactive Swagger API documentation is available at `/docs` (and OpenAPI schema at `/openapi.json`).

---

## 1. Authentication & Security Headers

All data endpoints enforce user isolation through JWT Bearer authentication.

| Header | Description | Required |
| :--- | :--- | :--- |
| `Authorization` | Bearer token format: `Bearer <jwt_token>` | **Yes** (except public auth endpoints) |
| `X-Session-ID` | Anonymous session grouping header (informational only; never bypasses auth) | Optional |
| `Content-Type` | `application/json` or `multipart/form-data` | **Yes** |

### Multi-Tenant Authorization Contract
1. Every protected route resolves the user via `Depends(get_current_user)`.
2. All database queries for workspaces, documents, messages, and study materials filter strictly by `user_id == current_user.id`.
3. If an authenticated user requests a resource ID belonging to another user, the server responds with **HTTP 404 (Not Found)** rather than 403 (Forbidden) to prevent resource enumeration.

---

## 2. Health & System Status (`/api/v1/health`)

Mounted at both `/health` and `/api/v1/health`.

### `GET /api/v1/health`
Probes database connectivity and application status.
- **Auth Required:** No
- **Response 200:**
  ```json
  {
    "status": "healthy",
    "app": "AI Academic Assistant API",
    "environment": "production",
    "database": "connected"
  }
  ```

---

## 3. Authentication Endpoints (`/api/v1/auth`)

### `POST /api/v1/auth/register`
Create a new user account.
- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "email": "student@university.edu",
    "password": "StrongPassword123!",
    "display_name": "Alex Student"
  }
  ```
- **Response 201:**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": "e2a45b6c-7d8e-9f0a-1b2c-3d4e5f6a7b8c",
      "email": "student@university.edu",
      "display_name": "Alex Student"
    }
  }
  ```

### `POST /api/v1/auth/login`
Authenticate with email and password.
- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "email": "student@university.edu",
    "password": "StrongPassword123!"
  }
  ```
- **Response 200:**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": "e2a45b6c-7d8e-9f0a-1b2c-3d4e5f6a7b8c",
      "email": "student@university.edu",
      "display_name": "Alex Student"
    }
  }
  ```

### `GET /api/v1/auth/me`
Retrieve profile of currently authenticated user.
- **Auth Required:** Yes (Bearer)
- **Response 200:**
  ```json
  {
    "id": "e2a45b6c-7d8e-9f0a-1b2c-3d4e5f6a7b8c",
    "email": "student@university.edu",
    "display_name": "Alex Student"
  }
  ```

---

## 4. Academic Workspaces / Course Notebooks (`/api/v1/notebooks`)

Workspaces serve as the container entity for all chats, source documents, message history, and study materials.

### `GET /api/v1/notebooks`
List all workspaces owned by the authenticated user.
- **Auth Required:** Yes (Bearer)
- **Query Parameters:**
  - `archived` *(boolean, optional, default: false)*
- **Response 200:**
  ```json
  [
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "title": "CS 401 — Distributed Systems",
      "description": "Consensus, Raft, Paxos, and Vector Clocks",
      "color": "#C6F432",
      "icon": "book-open",
      "is_archived": false,
      "source_count": 3,
      "conversation_count": 1,
      "created_at": "2026-11-16T12:00:00Z",
      "updated_at": "2026-11-16T12:30:00Z"
    }
  ]
  ```

### `POST /api/v1/notebooks`
Create a new academic workspace container.
- **Auth Required:** Yes (Bearer)
- **Request Body:**
  ```json
  {
    "title": "CS 401 — Distributed Systems",
    "description": "Consensus, Raft, Paxos, and Vector Clocks",
    "color": "#C6F432",
    "icon": "book-open"
  }
  ```
- **Response 201:** `NotebookResponse`.

### `GET /api/v1/notebooks/{id}`
Retrieve a specific workspace by ID, including metadata.
- **Auth Required:** Yes (Bearer)
- **Response 200:** `NotebookResponse`.

### `PATCH /api/v1/notebooks/{id}`
Update workspace metadata (title, description, color, archive state).
- **Auth Required:** Yes (Bearer)
- **Request Body:** Partial `NotebookUpdateRequest`.
- **Response 200:** `NotebookResponse`.

### `DELETE /api/v1/notebooks/{id}`
Delete a workspace and cascade-delete its sources, conversations, messages, and study materials.
- **Auth Required:** Yes (Bearer)
- **Response 204:** No Content.

---

## 5. Sources Rail & Ingestion (`/api/v1/notebooks/{id}/sources` & `/sources`)

### `POST /api/v1/notebooks/{id}/sources`
Upload and ingest a document into an owned workspace.
- **Auth Required:** Yes (Bearer)
- **Content-Type:** `multipart/form-data`
- **Supported Formats:** PDF (`application/pdf`), DOCX (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`), PPTX (`application/vnd.openxmlformats-officedocument.presentationml.presentation`), TXT (`text/plain`).
- **Size Limit:** Max 20MB (`MAX_UPLOAD_SIZE_BYTES`).
- **Response 201:**
  ```json
  {
    "id": "18f9bc62-c1ec-4c6e-8ff5-cf1f04495e50",
    "notebook_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "source_type": "upload",
    "original_filename": "Lecture04_Raft_Consensus.pdf",
    "display_title": "Lecture04_Raft_Consensus",
    "mime_type": "application/pdf",
    "file_size_bytes": 1048576,
    "content_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "processing_status": "completed",
    "error_message": null,
    "created_at": "2026-11-16T12:05:00Z",
    "updated_at": "2026-11-16T12:05:02Z"
  }
  ```

### `GET /api/v1/notebooks/{id}/sources`
List all sources in an owned workspace.
- **Auth Required:** Yes (Bearer)
- **Response 200:** `list[SourceResponse]`.

### `GET /api/v1/sources/{source_id}`
Retrieve individual source metadata.
- **Auth Required:** Yes (Bearer)
- **Response 200:** `SourceResponse`.

### `DELETE /api/v1/sources/{source_id}`
Delete a source and remove its underlying disk storage.
- **Auth Required:** Yes (Bearer)
- **Response 204:** No Content.

---

## 6. Grounded AI Conversations & Chat (`/api/v1/conversations`)

### `POST /api/v1/conversations`
Initialize a conversation associated with a workspace.
- **Auth Required:** Yes (Bearer)
- **Request Body:**
  ```json
  {
    "title": "Discussion: Raft Leader Election",
    "notebook_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
  }
  ```
- **Response 201:** `ConversationResponse`.

### `GET /api/v1/conversations/{id}/messages`
Retrieve message history for an authorized conversation.
- **Auth Required:** Yes (Bearer)
- **Response 200:** `list[MessageResponse]`.

### `POST /api/v1/conversations/{id}/messages/stream` (SSE Live Streaming)
Send a message and stream the grounded AI response with citations over Server-Sent Events.
- **Auth Required:** Yes (Bearer)
- **Request Body:**
  ```json
  {
    "content": "Explain split vote scenarios in Raft consensus."
  }
  ```
- **Response:** `text/event-stream`
- **Stream Event Types:**
  - `event: delta` — Text chunk: `{"text": "In Raft, a split vote occurs when..."}`
  - `event: citation` — Grounded citation reference:
    ```json
    {
      "source_title": "Lecture04_Raft_Consensus.pdf",
      "page": 12,
      "chunk_text": "If many candidates appear simultaneously, split votes can occur..."
    }
    ```
  - `event: done` — Completion signal with saved message identifier: `{"message_id": "..."}`
  - `event: error` — Actionable error notice: `{"message": "Rate limit exceeded. Please retry in 5s."}`

---

## 7. Study Studio AI Generation Tools (`/api/v1/generate`)

The platform provides **8 streaming generation endpoints** supporting **server-side document resolution** (`source_id` or `notebook_id`), avoiding the need to send full document text over the wire.

### Common Request Payload Schema (`NotesGenerationRequest`):
```json
{
  "notebook_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "source_id": "18f9bc62-c1ec-4c6e-8ff5-cf1f04495e50",
  "extracted_text": "Optional manual text fallback when no document is attached."
}
```

### Endpoints Summary (8 Streaming Tools):

| Endpoint | Method | Format | Description |
| :--- | :---: | :---: | :--- |
| `/api/v1/generate/notes` | `POST` | SSE Stream | Generates comprehensive revision notes with key concepts, definitions, and formulas. |
| `/api/v1/generate/summary` | `POST` | SSE Stream | Generates an executive summary covering main themes and academic conclusions. |
| `/api/v1/generate/5-mark-answer` | `POST` | SSE Stream | Generates concise exam responses (250–350 words) with bullet points and bold key terms. |
| `/api/v1/generate/10-mark-answer` | `POST` | SSE Stream | Generates in-depth essay-style responses (500–700 words) with sections and conclusion. |
| `/api/v1/generate/explain-simply` | `POST` | SSE Stream | Generates simplified analogies and plain-language concept breakdowns. |
| `/api/v1/generate/mcqs` | `POST` | JSON Stream | Generates interactive Multiple Choice Questions with choices, correct answer, and explanation. |
| `/api/v1/generate/viva-questions` | `POST` | JSON Stream | Generates oral exam viva voce questions with professor criteria and expected answers. |
| `/api/v1/generate/flashcards` | `POST` | JSON Stream | Generates term/definition flashcard decks for active recall. |

---

## 8. Persisted Study Materials (`/api/v1/notebooks/{id}/generate` & `/study-materials`)

Curriculum-aligned multi-chapter study materials generated across all sources in a workspace and saved persistently to PostgreSQL.

### `POST /api/v1/notebooks/{id}/generate/study-guide`
Generate a multi-chapter structured curriculum study guide.
- **Auth Required:** Yes (Bearer)
- **Request Body:**
  ```json
  {
    "title": "Comprehensive Midterm Study Guide",
    "focus_topics": ["Raft", "Paxos", "Vector Clocks", "Byzantine Fault Tolerance"]
  }
  ```
- **Response 201:** `StudyMaterialResponse` (type: `"study_guide"`).

### `POST /api/v1/notebooks/{id}/generate/flashcards`
Generate a persistent flashcard deck for the workspace.
- **Auth Required:** Yes (Bearer)
- **Request Body:**
  ```json
  {
    "title": "Module 1 Flashcard Deck",
    "num_cards": 10,
    "difficulty": "Mixed"
  }
  ```
- **Response 201:** `StudyMaterialResponse` (type: `"flashcards"`).

### `POST /api/v1/notebooks/{id}/generate/exam-paper`
Generate a full timed exam paper with section mark allocations (e.g. 50 or 100 marks) and model answer key.
- **Auth Required:** Yes (Bearer)
- **Request Body:**
  ```json
  {
    "title": "Final Examination Paper",
    "total_marks": 50,
    "question_types": ["five_mark", "ten_mark"],
    "difficulty": "Mixed",
    "include_answer_key": true
  }
  ```
- **Response 201:** `StudyMaterialResponse` (type: `"exam_paper"`).

### `GET /api/v1/notebooks/{id}/study-materials`
List all saved study materials belonging to an owned workspace.
- **Auth Required:** Yes (Bearer)
- **Response 200:** `list[StudyMaterialResponse]`.

### `GET /api/v1/study-materials/{id}`
Retrieve an individual study material by its unique identifier.
- **Auth Required:** Yes (Bearer)
- **Response 200:** `StudyMaterialResponse`.

### `DELETE /api/v1/study-materials/{id}`
Delete a saved study material.
- **Auth Required:** Yes (Bearer)
- **Response 204:** No Content.

---

## 9. Dashboard & Unified Search

### `GET /api/v1/dashboard/stats`
Retrieve personal learning metrics, count of uploaded documents, active chats, and study materials.
- **Auth Required:** Yes (Bearer)
- **Response 200:**
  ```json
  {
    "total_documents": 14,
    "total_conversations": 6,
    "total_notebooks": 4,
    "total_study_materials": 9,
    "recent_activity_count": 28
  }
  ```

### `GET /api/v1/search?q={query}`
Unified keyword search filtering across workspace titles, source documents, and chat messages.
- **Auth Required:** Yes (Bearer)
- **Response 200:** `SearchResultsResponse` grouping matching notebooks, sources, and conversations.
