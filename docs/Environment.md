# Environment Variables Specification

This document provides the definitive specification for all environment variables used across **AI Academic Assistant** (backend and frontend). Configuration is managed using strongly-typed Pydantic v2 `BaseSettings` in `backend/app/core/config.py` and Vite build-time environment resolution in `frontend/src/lib/api.ts`.

---

## 1. Backend Environment Variables

The backend application reads environment variables at startup via `dotenv.load_dotenv(override=False)` and validates them through Pydantic. System and container environment variables always take precedence over values in a local `.env` file.

### 1.1 Complete Configuration Matrix

| Variable | Alias | Type | Default Value | Required | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | — | `string` | *(None)* | **Yes** | PostgreSQL connection URL. Automatically coerced from `postgresql://` to `postgresql+psycopg://`. |
| `DB_CONNECT_TIMEOUT_SECONDS` | — | `float` | `60.0` | No | Maximum time in seconds to wait for PostgreSQL readiness before startup abort. |
| `DB_CONNECT_RETRY_INTERVAL` | — | `float` | `1.0` | No | Polling retry interval in seconds during database readiness checks. |
| `GOOGLE_API_KEY` | `GEMINI_API_KEY` | `SecretStr` | *(None)* | **Yes (AI ops)** | Google Gemini API key used for chat, RAG, and Study Studio generation. |
| `GEMINI_MODEL` | — | `string` | `gemini-2.5-flash` | No | Gemini model name used for inference. |
| `GEMINI_TIMEOUT_SECONDS` | — | `float` | `45.0` | No | Timeout in seconds for individual Gemini API requests. |
| `GEMINI_MAX_RETRIES` | — | `integer` | `3` | No | Number of retry attempts on transient Gemini API rate limits or network errors. |
| `JWT_SECRET_KEY` | `SECRET_KEY` | `SecretStr` | *(Dev fallback)* | **Yes (in prod)** | Signing secret for HS256 JWT tokens. Must be >= 32 characters in staging/production. |
| `JWT_ALGORITHM` | — | `string` | `HS256` | No | Cryptographic algorithm for signing access tokens. |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | — | `integer` | `1440` (24h) | No | Expiration time for access tokens in minutes. |
| `SESSION_SECRET` | — | `string` | `generate-a-secure...` | No | Secret string for session cookie signing. |
| `APP_ENV` | — | `string` | `development` | No | Application environment: `development`, `staging`, or `production`. |
| `LOG_LEVEL` | — | `string` | `INFO` | No | Python logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`). |
| `CORS_ORIGINS` | — | `string` | `http://localhost:5173,...` | No | Comma-separated list of permitted browser origins for CORS requests. |
| `STORAGE_BACKEND` | — | `string` | `local` | No | Source document storage provider: `local` filesystem or `s3`. |
| `UPLOAD_DIR` | — | `string` | `uploads` | No | Local directory where uploaded source documents are stored. |
| `MAX_UPLOAD_SIZE_BYTES` | — | `integer` | `20971520` (20 MB) | No | Maximum allowed upload size per document in bytes. |
| `MAX_PDF_PAGES` | — | `integer` | `500` | No | Maximum allowed page count for PDF extractions before truncation. |
| `GROUNDING_CHUNK_SIZE` | — | `integer` | `1200` | No | Character count per document text chunk during RAG indexing. |
| `GROUNDING_CHUNK_OVERLAP` | — | `integer` | `200` | No | Character overlap between consecutive chunks. |
| `GROUNDING_MAX_CONTEXT_CHARS` | — | `integer` | `32000` | No | Hard budget limit for text injected into `<grounding_context>` tags. |
| `AWS_REGION` | — | `string` | *(None)* | No (S3 only) | AWS region for S3 document storage (e.g., `us-east-1`). |
| `AWS_S3_BUCKET` | — | `string` | *(None)* | No (S3 only) | AWS S3 bucket name when `STORAGE_BACKEND=s3`. |
| `AWS_ACCESS_KEY_ID` | — | `string` | *(None)* | No (S3 only) | AWS access key for S3 bucket operations. |
| `AWS_SECRET_ACCESS_KEY` | — | `SecretStr` | *(None)* | No (S3 only) | AWS secret access key for S3 bucket operations. |

---

### 1.2 Critical Security Rules & Production Validation

1. **JWT Secret Enforcement:**
   - In `development` (`APP_ENV=development`), if `JWT_SECRET_KEY` is omitted or contains a placeholder, the backend safely falls back to an isolated dev secret.
   - In `production` or `staging`, the backend **fails fast** on startup if `JWT_SECRET_KEY` is missing, contains known placeholder values (e.g. `your_jwt_secret_key_here`, `change-me`, `secret`), or is shorter than 32 characters.
   - Generate a strong secret:
     ```bash
     python -c "import secrets; print(secrets.token_hex(32))"
     ```

2. **Database URL Coercion:**
   - SQLAlchemy 2.0 with the modern `psycopg` (v3) driver requires the URL scheme `postgresql+psycopg://`.
   - The settings validator automatically converts legacy `postgresql://` schemes into `postgresql+psycopg://` to prevent driver mismatches on cloud platforms like Railway.

3. **CORS Origins Handling:**
   - Development defaults (`http://localhost:5173`, `http://localhost:3000`, `http://localhost:4173`, and their `127.0.0.1` equivalents) are automatically appended to `CORS_ORIGINS`.
   - In production, set `CORS_ORIGINS` to your frontend production URL (e.g., `https://ai-academic-assistant-tan.vercel.app`).

---

## 2. Frontend Environment Variables

The frontend React application is bundled using Vite. Only variables prefixed with `VITE_` are exposed to the browser runtime.

| Variable | Type | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `string` | `http://localhost:8000/api/v1` | Base URL of the backend API endpoints. Must include the `/api/v1` prefix. |

> [!NOTE]
> In production (Vercel), `VITE_API_BASE_URL` should point to your Railway backend deployment (e.g., `https://web-production-xxxx.up.railway.app/api/v1`).

---

## 3. Template Configuration Files

### 3.1 Backend `.env` (Development Example)

```ini
APP_ENV=development
LOG_LEVEL=INFO

# Database (PostgreSQL via psycopg v3)
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/ai_academic_assistant
DB_CONNECT_TIMEOUT_SECONDS=60.0
DB_CONNECT_RETRY_INTERVAL=1.0

# Gemini AI Engine
GOOGLE_API_KEY=AIzaSyYourActualKeyHere
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TIMEOUT_SECONDS=45.0
GEMINI_MAX_RETRIES=3

# Security & Authentication (32+ chars)
JWT_SECRET_KEY=v2_studyhub_dev_secret_key_only_for_local_development_32chars
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440
SESSION_SECRET=local-session-secret-dev-only

# Storage & Uploads
STORAGE_BACKEND=local
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE_BYTES=20971520
MAX_PDF_PAGES=500

# RAG Grounding Budgets
GROUNDING_CHUNK_SIZE=1200
GROUNDING_CHUNK_OVERLAP=200
GROUNDING_MAX_CONTEXT_CHARS=32000

# Network & CORS
CORS_ORIGINS=http://localhost:5173
```

### 3.2 Frontend `.env` (Development Example)

```ini
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### 3.3 Production Environment Variables (Railway & Vercel)

#### Railway (Backend Service):
```ini
APP_ENV=production
LOG_LEVEL=INFO
DATABASE_URL=${{Postgres.DATABASE_URL}}
GOOGLE_API_KEY=your_production_google_gemini_api_key
JWT_SECRET_KEY=9f8c7b6a5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a
CORS_ORIGINS=https://ai-academic-assistant-tan.vercel.app
STORAGE_BACKEND=local
UPLOAD_DIR=/app/uploads
```

#### Vercel (Frontend Project):
```ini
VITE_API_BASE_URL=https://your-railway-backend-url.up.railway.app/api/v1
```
