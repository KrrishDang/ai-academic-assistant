# API Specification

## Endpoints Summary

### Dashboard & Analytics
- `GET /api/v1/dashboard/stats`: Returns overall user stats (documents, chats, study materials generated, weekly study activity).

### Document Management
- `GET /api/v1/documents`: List uploaded study documents.
- `POST /api/v1/documents/upload`: Upload a PDF document and extract text.
- `GET /api/v1/documents/{document_id}`: Get document metadata and extracted text.
- `DELETE /api/v1/documents/{document_id}`: Delete document.

### AI Conversations & Chat
- `GET /api/v1/conversations`: List active conversations.
- `POST /api/v1/conversations`: Create a new conversation session.
- `GET /api/v1/conversations/{conversation_id}/messages`: Fetch chat message history.
- `POST /api/v1/conversations/{conversation_id}/messages`: Send message and stream Gemini response via SSE.

### Study Material Generation
- `POST /api/v1/generate/notes`: Generate structured key concept study notes.
- `POST /api/v1/generate/five-marks`: Generate 5-mark model answers.
- `POST /api/v1/generate/ten-marks`: Generate 10-mark long-form model answers.
- `POST /api/v1/generate/mcqs`: Generate MCQ quiz questions JSON.
- `POST /api/v1/generate/viva`: Generate oral exam viva questions & answers.
- `POST /api/v1/generate/explanation`: Generate simplified analogies and plain-language topic explanations.
- `POST /api/v1/generate/flashcards`: Generate term & definition flashcards JSON.
- `POST /api/v1/generate/summary`: Generate document executive summary.
