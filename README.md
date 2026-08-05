# AI Academic Assistant

> A modern, full-stack AI-powered learning environment built to transform academic study materials into interactive study notes, exam preparation guides, flashcards, MCQs, and real-time AI tutor conversations.

---

## Project Overview

**AI Academic Assistant** is an intelligent web application designed for students and educators. By uploading study documents (such as lecture PDFs, textbook chapters, or research papers), users can generate high-yield study materials, test their knowledge with interactive quizzes, practice viva voce questions, and hold distraction-free AI tutor chats linked directly to their course materials.

---

## Features

- **📄 PDF Upload**: Fast, drag-and-drop file upload interface for study documents and textbook chapters.
- **🔍 PDF Text Extraction**: Automatic client and server-side text extraction and indexing via Python PDF parsers.
- **💬 AI Chat**: Context-aware AI tutor chat powered by Google Gemini API with smart auto-scroll and persistent conversation history.
- **📘 Notes Generation**: One-click creation of structured key concept summaries, bullet points, and definitions.
- **✍️ 5-Mark Answers**: High-yield medium-length exam model answers.
- **📝 10-Mark Answers**: Comprehensive long-form exam answers with detailed headings, introduction, body, and conclusion.
- **❓ MCQ Generation**: Interactive Multiple-Choice Question quizzes with real-time scoring, instant answer feedback, and performance summaries.
- **🎤 Viva Questions**: Oral exam practice suite with answer reveal and self-rating feedback.
- **💡 Explain Simply**: Simplified conceptual breakdowns for complex topics using analogies and plain language.
- **🧠 Flashcards**: Interactive 3D flip-card study deck for key definitions and term memorization.
- **✒️ Markdown Rendering**: High-fidelity GitHub-flavored Markdown rendering including styled tables, syntax-highlighted code blocks with copy button, blockquotes, and callouts.
- **⚡ Streaming Responses**: Server-Sent Events (SSE) live streaming for instant AI response generation without waiting.
- **🔍 Focus Mode**: One-click distraction-free study layout that hides sidebars and maximizes conversation viewport.
- **🎨 Theme System (Catppuccin)**: Built-in support for official Catppuccin theme variants (**Mocha**, **Macchiato**, **Frappé**, **Latte**) with automatic Dark Reader compatibility.
- **📱 Responsive Design**: Optimized layout across mobile (320px–412px), tablet (768px), and desktop viewports with zero overflow.
- **🐳 Docker Support**: Multi-stage containerization with Docker & Docker Compose for isolated development and production deployment.
- **🚂 Railway Backend**: FastAPI backend connected to managed PostgreSQL database deployed on Railway.
- **▲ Vercel Frontend**: Vite + React frontend configured for single-command Vercel / Railway static deployment.

---

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript & Vite
- **Styling**: Tailwind CSS, Vanilla CSS Design System, Lucide React Icons
- **Animation**: Framer Motion
- **Storage**: IndexedDB & LocalStorage for offline resource caching and theme persistence

### Backend
- **Framework**: Python 3.10+ with FastAPI
- **ORM & DB**: SQLAlchemy 2.0 (Async), AsyncPG, Alembic Migrations
- **PDF Processing**: PyPDF2 / pdfplumber

### AI Integration
- **LLM Engine**: Google Gemini API (`gemini-2.5-flash` / `gemini-3.6-flash`)
- **Transport**: Server-Sent Events (SSE) for streaming text generation

### Database
- PostgreSQL (Railway Managed / Local)

### Deployment
- **Backend**: Railway Cloud Services
- **Frontend**: Vercel Platform / Railway Static Hosting
- **Containers**: Docker & Docker Compose

---

## Screenshots

> *Placeholder: Add application screenshots below*

### Dashboard
![Dashboard Mockup](docs/screenshots/dashboard.png)

### Upload
![Upload Mockup](docs/screenshots/upload.png)

### Workspace
![Workspace Mockup](docs/screenshots/workspace.png)

### Chat
![Chat Mockup](docs/screenshots/chat.png)

### Settings
![Settings Mockup](docs/screenshots/settings.png)

### Mobile View
![Mobile Mockup](docs/screenshots/mobile.png)

---

## Installation

### Local Setup

#### Prerequisites
- Node.js 18+ & npm
- Python 3.10+ & pip
- PostgreSQL database instance

---

### Backend Setup

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # Windows PowerShell:
   .venv\Scripts\Activate.ps1
   # Linux/macOS:
   source .venv/bin/activate
   ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables (copy `.env.example`):
   ```bash
   cp .env.example .env
   ```

5. Apply database migrations:
   ```bash
   alembic upgrade head
   ```

6. Start the FastAPI backend dev server:
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```

---

### Frontend Setup

1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (copy `.env.example`):
   ```bash
   cp .env.example .env
   ```

4. Start the frontend development server:
   ```bash
   npm run dev
   ```

---

### Docker Setup

To launch the entire application stack using Docker Compose:

```bash
docker-compose up --build
```

---

### Environment Variables

Reference the root `.env.example` template:

```env
# Backend Environment Variables
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/ai_academic_assistant
GEMINI_API_KEY=your_google_gemini_api_key_here
CORS_ORIGINS=http://localhost:5173,https://your-frontend.vercel.app

# Frontend Environment Variables
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

## Deployment

### Railway (Backend & Database)
1. Link your GitHub repository to [Railway.app](https://railway.app).
2. Provision a **PostgreSQL** database service on Railway.
3. Deploy the `backend/` service using the root `backend/Dockerfile`.
4. Set required variables in Railway settings: `DATABASE_URL` and `GEMINI_API_KEY`.
5. Run database migrations via Railway CLI: `alembic upgrade head`.

### Vercel (Frontend)
1. Import the repository into [Vercel](https://vercel.com).
2. Set Root Directory to `frontend`.
3. Set Build Command to `npm run build` and Output Directory to `dist`.
4. Add Environment Variable `VITE_API_BASE_URL` pointing to your deployed Railway backend URL.

---

## Project Structure

```
ai-academic-assistant/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI REST endpoints & routes (dashboard, document, chat, generation)
│   │   ├── core/            # App configuration, security, database session setup
│   │   ├── models/          # SQLAlchemy database models (Document, Conversation, Message, Result)
│   │   ├── schemas/         # Pydantic data schemas & request/response validation
│   │   └── services/        # Business logic, Gemini API client, PDF text extraction
│   ├── migrations/          # Alembic database migration scripts
│   ├── Dockerfile           # Backend container build configuration
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components, MarkdownContent, Layout wrappers
│   │   ├── features/        # State context providers (ThemeContext, ConversationContext, DocumentContext)
│   │   ├── pages/           # Application views (DashboardPage, WorkspacePage, SettingsPage)
│   │   ├── lib/             # API client, IndexedDB storage helpers, export utilities
│   │   └── styles/          # Global CSS tokens and Catppuccin theme variables
│   ├── Dockerfile           # Frontend container build configuration
│   └── package.json         # Node.js dependencies and scripts
├── docs/                    # Project documentation, architecture guides, and API specs
├── .env.example             # Environment configuration template
├── .gitignore               # Ignored files registry
└── README.md                # Project documentation
```

---

## API Reference

Detailed endpoint descriptions, payloads, and response schema specs are documented in [docs/API.md](docs/API.md).

---

## Documentation

For in-depth architecture guidelines, prompt design rationale, and project reports, refer to the documentation suite in `docs/`:

- [API Specification](docs/API.md)
- [Architecture Guide](docs/Architecture.md)
- [Prompt Engineering Guidelines](docs/PromptEngineering.md)
- [Concept Note](docs/ConceptNote.md)
- [Project Report](docs/ProjectReport.md)

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Author

Created & Maintained by **Krrish Dang** ([@KrrishDang](https://github.com/KrrishDang)).
