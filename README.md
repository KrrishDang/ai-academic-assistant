# AI Academic Assistant

A production-ready academic assistant helping students upload study materials (PDFs) and generate Study Notes, exam answers, MCQs, viva preparation lists, and simplified explanations utilizing Google Gemini.

---

## 1. Project Structure

```
ai-academic-assistant/
├── backend/                # FastAPI application backend
│   ├── app/                # Clean Architecture services, schemas, and models
│   ├── migrations/         # Alembic database migrations
│   ├── uploads/            # Local document storage directory (ephemeral)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/               # Vite + React + TypeScript frontend
│   ├── src/                # Pages, features, and context providers
│   ├── Dockerfile
│   └── package.json
├── .env.example            # Master configuration reference template
└── README.md               # Monorepo setup guide
```

---

## 2. Quick Start

### Prerequisites
* Python 3.10+
* Node.js 18+
* PostgreSQL DB

---

### Backend Setup
1. Change directory to `/backend`:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables (copy `.env.example` to `.env` in backend/):
   ```bash
   cp .env.example .env
   ```
5. Apply database migrations:
   ```bash
   alembic upgrade head
   ```
6. Run the FastAPI development server:
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```

---

### Frontend Setup
1. Change directory to `/frontend`:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Configure environment variables (copy `.env.example` to `.env` in frontend/):
   ```bash
   cp .env.example .env
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
