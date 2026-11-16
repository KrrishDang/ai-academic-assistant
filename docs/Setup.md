# Local Development Setup Guide — AI Academic Assistant

This guide provides tested, step-by-step instructions for running **AI Academic Assistant** locally on **Windows 11 (PowerShell)** and **WSL2 / Linux (Ubuntu)**.

---

## 1. Prerequisites

Ensure the following tools are installed on your machine:

| Component | Minimum Version | Verification Command |
| :--- | :--- | :--- |
| **Node.js** | `18.x` or `20.x`+ | `node --version` |
| **npm** | `9.x` or `10.x`+ | `npm --version` |
| **Python** | `3.10`, `3.11`, `3.12`, or `3.13` | `python --version` |
| **PostgreSQL** | `14.x` to `17.x` (or managed URL) | `psql --version` |
| **Git** | `2.x`+ | `git --version` |

---

## 2. Windows 11 Local Setup (PowerShell)

### A. Clone the Repository
```powershell
git clone https://github.com/KrrishDang/ai-academic-assistant.git
cd ai-academic-assistant
```

### B. Backend Setup
1. Navigate to the `backend/` directory:
   ```powershell
   cd backend
   ```
2. Create and activate a virtual environment:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
   *(If execution policy errors occur, run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`)*

3. Install backend dependencies:
   ```powershell
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```powershell
   Copy-Item .env.example .env
   ```
   Open `.env` and set:
   - `DATABASE_URL`: `postgresql+psycopg://postgres:yourpassword@localhost:5432/ai_academic_assistant`
   - `GOOGLE_API_KEY`: Your Gemini API key from [Google AI Studio](https://aistudio.google.com/)
   - `JWT_SECRET_KEY`: A secure random string (generate with: `python -c "import secrets; print(secrets.token_hex(32))"`)

5. Initialize the database and apply migrations:
   ```powershell
   python -m app.db.migrate
   ```

6. Start the FastAPI development server:
   ```powershell
   uvicorn app.main:app --reload --port 8000
   ```
   *The backend will be available at: `http://localhost:8000` (API documentation: `http://localhost:8000/docs`)*

---

### C. Frontend Setup
In a new PowerShell terminal:

1. Navigate to the `frontend/` directory:
   ```powershell
   cd frontend
   ```

2. Install npm dependencies:
   ```powershell
   npm install
   ```

3. Configure environment variables:
   ```powershell
   Copy-Item .env.example .env
   ```
   Ensure `.env` contains:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   ```

4. Start the Vite development server:
   ```powershell
   npm run dev
   ```
   *The frontend will be available at: `http://localhost:5173`*

---

## 3. WSL2 / Linux (Ubuntu) Setup

### A. System Packages
```bash
sudo apt update && sudo apt install -y python3 python3-venv python3-pip nodejs npm postgresql postgresql-contrib
```

### B. Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

cp .env.example .env
# Edit .env with your favorite editor (nano/vim)
nano .env

# Run database migrations
python -m app.db.migrate

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### C. Frontend Setup
```bash
cd ../frontend
npm install
cp .env.example .env
npm run dev -- --host
```

---

## 4. Verifying Local Setup

1. **Verify Backend Health:**
   ```bash
   curl http://localhost:8000/health
   ```
   Expected response:
   ```json
   {
     "status": "healthy",
     "database": "connected",
     "gemini_configured": true,
     "storage": "local",
     "version": "2.0.0"
   }
   ```

2. **Verify Frontend Unit Tests:**
   ```bash
   npm --prefix frontend test -- --run
   ```
   Expected output: `162 passed, 0 failed`.

3. **Verify Frontend Production Build:**
   ```bash
   npm --prefix frontend run build
   ```
   Expected output: Clean bundle generated with 0 TypeScript errors in `frontend/dist`.
