# Database Migrations — AI Academic Assistant

This directory contains the Alembic database migrations and environment configuration for the **AI Academic Assistant** PostgreSQL database.

---

## Migration Architecture & Safety Guarantees

In production and local environments, database migrations are orchestrated through the resilient startup runner:
`python -m app.db.migrate`

### Core Safeguards:
1. **PostgreSQL Session-Level Advisory Locking (`7238423`)**:
   - Acquires `SELECT pg_advisory_lock(7238423)` on a dedicated autocommit connection before running migrations.
   - Passes that exact connection into `migrations/env.py` via `alembic_cfg.attributes["connection"]`.
   - Prevents race conditions and schema corruption during concurrent multi-replica container deployments on Railway.
   - Automatically released in a `finally` block or freed by PostgreSQL if the session disconnects.
2. **Bounded Exponential Backoff Readiness Polling**:
   - Polls database connectivity for up to 60 seconds (`db_connect_timeout_seconds`).
   - Gracefully handles transient database cold-starts, connection delays, and PostgreSQL SQLSTATE `57P03` ("FATAL: the database system is starting up").
3. **Single Execution Path**:
   - Migrations execute **exclusively** during the container pre-startup lifecycle (`backend/Dockerfile`).
   - The FastAPI application `lifespan` handler does not run migrations, eliminating duplicate context initialization.

---

## Migration History (11 Revisions to Head)

| # | Revision ID | Name & Purpose | Parent Revision |
| :-: | :--- | :--- | :--- |
| **1** | `20260716_0001` | `create_documents` — Initial documents table, title, file metadata, extraction status. | *None (Base)* |
| **2** | `5039b9889bdc` | `add_users_table_and_user_id_to_documents` — User accounts table, password hash, role. | `20260716_0001` |
| **3** | `53013a0468a4` | `create_conversations_and_messages` — Chat conversation sessions and message history. | `5039b9889bdc` |
| **4** | `3291b52f8d8d` | `add_rbac_columns` — Role-based access control, account verification, ban status. | `53013a0468a4` |
| **5** | `20d81b1b5bec` | `add_admin_and_developer_tables` — Audit logs and developer API keys. | `3291b52f8d8d` |
| **6** | `61a84f3e9b10` | `add_session_id_to_documents_and_conversations` — Guest/anonymous session grouping. | `20d81b1b5bec` |
| **7** | `7a9b8c7d6e5f` | `add_display_name_to_users` — Display name customization on user profile. | `61a84f3e9b10` |
| **8** | `8a1b2c3d4e5f` | `add_notebooks_and_sources` — Academic notebook containers and attached multi-format sources. | `7a9b8c7d6e5f` |
| **9** | `9c8d7e6f5a4b` | `enforce_notebook_conversation_ownership` — Strict foreign key constraint linking conversations to notebooks and users. | `8a1b2c3d4e5f` |
| **10** | `a1b2c3d4e5f6` | `add_extracted_text_to_sources` — Adds full parsed text storage column to sources table. | `9c8d7e6f5a4b` |
| **11** | `b2c3d4e5f6a7` | `create_study_materials` — Persisted study materials (study guides, flashcard decks, exam papers). | `a1b2c3d4e5f6` |

**Target Head Revision:** `b2c3d4e5f6a7`

---

## Execution Commands

### Apply Migrations Locally
From the `backend/` directory with an active virtual environment:
```bash
python -m app.db.migrate
```

### Check Current Migration Revision
```bash
alembic current
```

### View Migration History
```bash
alembic history --verbose
```

### Create a New Migration Revision (Developers Only)
```bash
alembic revision -m "description_of_changes"
```
*(Always review auto-generated migrations carefully and test upgrade/downgrade before staging.)*
