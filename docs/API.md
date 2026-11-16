# API Specification — AI Academic Assistant

This document provides the authoritative API reference for **AI Academic Assistant** (API Version: `v1`, Base Path: `/api/v1`).

---

## 1. Authentication & Security Conventions

All secured endpoints require standard HTTP Bearer token authentication in the `Authorization` header:
```http
Authorization: Bearer <jwt_access_token>
```

### Security Invariants:
- **Tenant Scoping:** Every operation is scoped to `current_user.id`.
- **Anti-Enumeration 404s:** Accessing an entity owned by another user returns HTTP `404 Not Found` rather than `403 Forbidden`.
- **Metadata Protection:** Source endpoints never return physical `storage_key` or raw multi-megabyte `extracted_text`.

---

## 2. Health & System Status

### `GET /health`
System health check and database connectivity verification.
- **Auth Required:** No
- **Response 200 (Healthy):**
  ```json
  {
    "status": "healthy",
    "database": "connected",
    "gemini_configured": true,
    "storage": "local",
    "version": "2.0.0"
  }
  ```
- **Response 503 (Unhealthy):** Database disconnected or startup check failed.

---

## 3. Authentication (`/api/v1/auth`)

### `POST /api/v1/auth/register`
Create a new user account.
- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "email": "student@university.edu",
    "password": "SecurePassword123!",
    "name": "Alex Mercer"
  }
  ```
- **Response 201:**
  ```json
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "student@university.edu",
    "name": "Alex Mercer",
    "role": "user",
    "is_active": true,
    "created_at": "2026-11-16T12:00:00Z"
  }
  ```

### `POST /api/v1/auth/login`
Authenticate and obtain JWT access token (OAuth2 password form).
- **Auth Required:** No
- **Request Body (form-data):** `username` (email), `password`
- **Response 200:**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "token_type": "bearer",
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "email": "student@university.edu",
      "name": "Alex Mercer"
    }
  }
  ```

### `GET /api/v1/auth/me`
Retrieve profile of currently authenticated user.
- **Auth Required:** Yes (Bearer)
- **Response 200:** `UserResponse` object.

### `POST /api/v1/auth/logout`
Client token invalidation notice.
- **Auth Required:** Yes (Bearer)
- **Response 204:** No Content.

---

## 4. Academic Chats & Notebook Workspaces (`/api/v1/notebooks`)

Every academic chat workspace is backed by a `Notebook` record containing sources, conversations, and study materials.

### `POST /api/v1/notebooks`
Create a new academic workspace.
- **Auth Required:** Yes (Bearer)
- **Request Body:**
  ```json
  {
    "title": "CS301: Distributed Systems",
    "description": "Fall 2026 lecture slides, reading assignments, and exam review."
  }
  ```
- **Response 201:** `NotebookResponse` object.

### `GET /api/v1/notebooks`
List all academic workspaces owned by the authenticated user with counts.
- **Auth Required:** Yes (Bearer)
- **Response 200:**
  ```json
  [
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "title": "CS301: Distributed Systems",
      "description": "Fall 2026 lecture slides...",
      "source_count": 3,
      "conversation_count": 1,
      "created_at": "2026-11-16T12:00:00Z",
      "updated_at": "2026-11-16T12:30:00Z"
    }
  ]
  ```

### `GET /api/v1/notebooks/{id}`
Retrieve full workspace details including sources metadata and attached conversations.
- **Auth Required:** Yes (Bearer)
- **Response 200:** `NotebookDetailResponse` object.

### `PATCH /api/v1/notebooks/{id}`
Update workspace title or description.
- **Auth Required:** Yes (Bearer)
- **Request Body:** `{"title": "New Title"}`
- **Response 200:** Updated `NotebookResponse`.

### `DELETE /api/v1/notebooks/{id}`
Delete workspace and cascade-delete attached sources, conversations, messages, and study materials.
- **Auth Required:** Yes (Bearer)
- **Response 204:** No Content.

---

## 5. Multi-Format Sources Rail (`/api/v1/notebooks/{id}/sources` & `/api/v1/sources/{id}`)

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

All Study Studio endpoints support **server-side document resolution** (`source_id` or `notebook_id`), avoiding the need to send full document text over the wire.

### Common Request Payload Schema (`NotesGenerationRequest`):
```json
{
  "notebook_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "source_id": "18f9bc62-c1ec-4c6e-8ff5-cf1f04495e50",
  "extracted_text": "Optional manual text when no document is attached."
}
```

### Endpoints Summary:

| Endpoint | Method | Format | Description |
| :--- | :---: | :---: | :--- |
| `/api/v1/generate/notes` | `POST` | SSE Stream | Generates comprehensive revision notes with key concepts, definitions, and formulas. |
| `/api/v1/generate/summary` | `POST` | SSE Stream | Generates an executive summary covering main themes and academic conclusions. |
| `/api/v1/generate/five-marks` | `POST` | SSE Stream | Generates concise exam responses (150–200 words) with bullet points and bold key terms. |
| `/api/v1/generate/ten-marks` | `POST` | SSE Stream | Generates in-depth essay-style responses (400–500 words) with sections and conclusion. |
| `/api/v1/generate/explanation` | `POST` | SSE Stream | Generates simplified ELI5 analogies and plain-language concept breakdowns. |
| `/api/v1/generate/mcqs` | `POST` | JSON | Generates interactive Multiple Choice Questions with choices, correct answer, and explanation. |
| `/api/v1/generate/viva` | `POST` | JSON | Generates oral exam viva voce questions with professor criteria and expected answers. |
| `/api/v1/generate/flashcards` | `POST` | JSON | Generates term/definition flashcard decks for active recall. |

---

## 8. Saved Study Materials (`/api/v1/notebooks/{id}/study-materials`)

Curriculum-aligned multi-chapter study materials saved persistently to the workspace.

### `POST /api/v1/notebooks/{id}/study-materials/study-guide`
Generate a multi-chapter structured curriculum study guide.
- **Auth Required:** Yes (Bearer)
- **Request Body:**
  ```json
  {
    "title": "Comprehensive Midterm Study Guide",
    "focus_topics": "Raft, Paxos, Vector Clocks, Byzantine Fault Tolerance"
  }
  ```
- **Response 201:** `StudyMaterialResponse` (type: `"study_guide"`).

### `POST /api/v1/notebooks/{id}/study-materials/flashcards`
Generate a persistent flashcard deck for the workspace.
- **Auth Required:** Yes (Bearer)
- **Response 201:** `StudyMaterialResponse` (type: `"flashcards"`).

### `POST /api/v1/notebooks/{id}/study-materials/exam-paper`
Generate a full timed exam paper with section mark allocations (e.g. 50 or 100 marks) and model answer key.
- **Auth Required:** Yes (Bearer)
- **Response 201:** `StudyMaterialResponse` (type: `"exam_paper"`).

### `GET /api/v1/notebooks/{id}/study-materials`
List all saved study materials belonging to an owned workspace.
- **Auth Required:** Yes (Bearer)
- **Response 200:** `list[StudyMaterialResponse]`.

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
