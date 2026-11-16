# Testing & Verification Guide

This document details the test suites, testing methodologies, and verification procedures for **AI Academic Assistant**.

---

## 1. Quality & Testing Standards

The repository adheres to strict engineering and quality policies:
- **Test-Driven Development (TDD):** For bug fixes and new capabilities, write failing assertions first, implement the minimal viable code, and refactor.
- **No Test Suppression:** Never delete, skip (`@pytest.mark.skip`), comment out, or weaken existing assertions to force passing runs.
- **Zero Mocking of Core Contracts:** Test contracts directly against real DTO schemas, response parsers, and state machines.
- **Multi-Tenant Data Isolation:** Verify that queries and endpoints enforce ownership scoping (`user_id == current_user.id`) and return HTTP 404 on cross-user resource access.

---

## 2. Backend Test Suite

The backend test suite is implemented using Python's built-in `unittest` runner and `pytest`.

### 2.1 Backend Test Directory (`backend/tests/`)

| Test File | Description | Focus Areas |
| :--- | :--- | :--- |
| `test_generation.py` | Unit tests for Study Studio generation tools | Validates prompt construction, schema enforcement, JSON output repair, and server-side document resolution for all 8 tools. (36 tests) |
| `test_database_startup_and_migration_lifecycle.py` | Lifecycle & startup verification | Validates single-path migration runner (`app.db.migrate`), PostgreSQL advisory locking (`7238423`), bounded readiness retries, and lifespan non-blocking health check. (5 tests) |
| `test_auth.py` | Authentication & authorization | User registration, login, JWT issuance, password hashing (bcrypt), token expiration, and credential isolation. |
| `test_notebooks.py` | Academic workspace data model | Notebook/Chat creation, updating, deletion, user scoping, and foreign key cascades. |
| `test_sources.py` | Source ingestion & security | Multi-format upload, PyMuPDF extraction, status transitions, and payload sanitization (ensuring `extracted_text` and `storage_key` are excluded from API responses). |
| `test_grounding.py` | Grounded RAG & citations | Text chunking, token budget enforcement, `<grounding_context>` injection defense, and citation formatting. |
| `test_study_materials.py` | Study materials engine | Persistence and retrieval of generated notes, summaries, flashcards, and exam papers. |
| `test_railway_v1_migration_compatibility.py` | Alembic migration audit | Validates linear migration history up to head (`b2c3d4e5f6a7`) and legacy table compatibility. |
| `test_e2e_release_audit.py` | End-to-end integration | Validates full workspace lifecycle from user registration to source upload, chat streaming, and tool generation. |

### 2.2 Running Backend Tests

#### Run Generation & Study Studio Tests (36 tests):
```powershell
# Windows PowerShell
$env:PYTHONPATH="backend"
python -m unittest backend/tests/test_generation.py -v
```

```bash
# Linux / macOS / WSL2
export PYTHONPATH="backend"
python -m unittest backend/tests/test_generation.py -v
```

#### Run Database Startup & Advisory Lock Tests (5 tests):
```powershell
# Windows PowerShell
$env:PYTHONPATH="backend"
python -m unittest backend/tests/test_database_startup_and_migration_lifecycle.py -v
```

```bash
# Linux / macOS / WSL2
export PYTHONPATH="backend"
python -m unittest backend/tests/test_database_startup_and_migration_lifecycle.py -v
```

#### Run Complete Backend Test Suite:
```powershell
# Windows PowerShell
$env:PYTHONPATH="backend"
python -m unittest discover -s backend/tests -p "test_*.py" -v
```

---

## 3. Frontend Test Suite

The frontend leverages Node's native test runner (`node --test`) for fast, deterministic unit and component verification without heavy browser overhead.

### 3.1 Test Coverage Matrix (11 Suites, 162 Tests)

| Test File | Test Count | Coverage & Assertions |
| :--- | :--- | :--- |
| `tests/test_all_12_routes.mjs` | 13 | Audit of all 12 registered application routes and catch-all `/404` routing. |
| `tests/test_app_shell_and_navigation.mjs` | 16 | Route-aware sidebar matching, dynamic breadcrumbs, user initials generation, 8px grid offset, and keyboard shortcuts (`Ctrl+K`, `Ctrl+B`). |
| `tests/test_auth_and_theme.mjs` | 24 | Pre-paint zero-flash theme script in `index.html`, 8-scenario theme resolution matrix, and strict brand naming (`AI Academic Assistant`). |
| `tests/test_chat_landing_and_workspace.mjs` | 18 | Chat-centric workspace layout, pinned composer with auto-scroll, empty states, and suggested prompts. |
| `tests/test_notebook_hub.mjs` | 14 | Workspace listing, search filtering, tag matching, and card navigation. |
| `tests/test_notebook_workspace.mjs` | 18 | 3-panel workspace integration (Sources Rail, Chat, Study Studio), panel toggling, and layout responsiveness. |
| `tests/test_primitive_components.mjs` | 18 | Low-level design system tokens, button sizing, form input ARIA labels, tab circular navigation, and dialog modal roles. |
| `tests/test_public_landing_page.mjs` | 8 | Public entry landing page, interactive hero demo, brand token compliance, and motion preferences (`prefers-reduced-motion`). |
| `tests/test_responsive_accessibility.mjs` | 12 | WCAG AA color contrast (Midnight Black `#0B0B0C` and Electric Lime `#C6F432` > 12:1), 375px mobile viewport checks, and screen reader ARIA roles. |
| `tests/test_sources_rail.mjs` | 11 | Source upload contracts, file size formatting, status badge mapping (`processing`, `completed`, `failed`), and source removal. |
| `tests/test_study_studio.mjs` | 18 | Generation contracts for all 8 tools, payload construction, flashcard flip mechanics, exam mark allocation, and client-side guardrails. |

### 3.2 Running Frontend Tests

```bash
# Run all 11 frontend test suites
npm --prefix frontend test -- --run
```

Expected output:
```text
ℹ tests 162
ℹ suites 0
ℹ pass 162
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

### 3.3 Verifying Frontend Production Build

Always verify that TypeScript compilation and Vite bundling succeed without errors:

```bash
npm --prefix frontend run build
```

Expected output:
```text
✓ built in ~4.5s
dist/index.html
dist/assets/index-*.css
dist/assets/vendor-*.js
dist/assets/index-*.js
```

---

## 4. Pre-Flight Verification Sequence

Before submitting pull requests or cutting a release, execute this automated pre-flight checklist:

```powershell
# 1. Run Backend Unit Tests
$env:PYTHONPATH="backend"
python -m unittest backend/tests/test_generation.py

# 2. Run Database Lifecycle & Advisory Lock Tests
python -m unittest backend/tests/test_database_startup_and_migration_lifecycle.py

# 3. Run Frontend Unit & Integration Tests (162 tests)
npm --prefix frontend test -- --run

# 4. Verify TypeScript & Production Build
npm --prefix frontend run build

# 5. Check Working Tree Cleanliness
git diff --check
git status --short
```
