# Graph Report - ai-academic-assistant  (2026-11-16)

## Corpus Check
- 166 files · ~89,181 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 19 file(s) not represented in the graph (top: (none) 13, .example 3, .ini 1)

## Summary
- 1562 nodes · 4141 edges · 84 communities (50 shown, 34 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 337 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Authentication & Security Architecture
- Navigation & App Shell Verification
- Course Notebooks API
- Conversation & Ownership Invariants
- Study Materials Generation API
- Notebook Sources Authorization Tests
- Conversations & Streaming Chat API
- Legacy Generation API Endpoints
- Study Material Schemas
- Frontend UI Control Primitives
- Frontend API Client Core
- Frontend Generation API Integration
- Alembic Migrations & RBAC Evolution
- Auth Route Handlers & User Sessions
- Grounded RAG & Citation Service
- Source Deletion & Storage Management
- Frontend Document Context
- SSE Event Framing & Streaming
- Study Material Security Tests
- App Shell Layout & Sidebar
- Document Upload & Extraction Services
- Frontend Conversation State Management
- Chat Message History Management
- Password Hashing & Bcrypt Security
- Frontend Empty & Skeleton States
- Gemini Client & Resilient Streaming
- Backend Runtime Configuration
- JSON Parser & Structured Output Validation
- Frontend Design System Tokens
- Document Entity & Ownership Mapping
- Course Notebook Model & Relations
- Database Session & Engine Lifecycle
- Frontend Dark Light Theme Context
- Frontend Button UI Primitive
- User Model & Role-Based Access Control
- Notebook Source Entity Model
- Notebook Workspace Page Orchestrator
- Course Notebooks Hub Page
- Document Ingestion & Parsing Tests
- Multi-Format File Parser Service
- Chat Workspace Conversation Interface
- Frontend Auth Context & Token Store
- Frontend Badge & Status Tag Primitives
- Legacy Documents REST API
- Frontend Study Studio Workspace Tab
- Frontend Sources Rail & Document Drawer
- Frontend Input & Form Primitives
- Frontend Modal Dialog Primitives
- Academic Study Prompt Engineering
- Document Security & Ownership Tests
- Frontend Linting & Tooling Configuration
- Frontend Card Component Primitives
- Database Migration Invariant Tests
- Conversation Request & Response Schemas
- Authentication Integration Test Suite
- Frontend Authentication Hook & State
- PDF Document Extraction Service
- Dashboard Activity & Analytics Schemas
- Initial Document Persistence Migration
- End-to-End Release Audit Journey
- PostgreSQL Constraint Regression Tests
- Frontend Motion & Icon Dependencies
- TypeScript Node Configuration
- Document Markdown & Text Export
- Notebooks & Sources Migration Schema
- Source Rail Modal Props Interfaces
- Gemini API Configuration Errors
- Office Document Test Fixture Generator
- Frontend Build Scripts & NPM Config
- Markdown Renderer & Code Syntax Blocks
- Design System CSS Custom Tokens
- Tailwind CSS Design Framework Config
- TypeScript Compiler Configuration
- Vite Bundler & React Plugin Setup

## God Nodes (most connected - your core abstractions)
1. `User` - 76 edges
2. `Notebook` - 62 edges
3. `cn()` - 51 edges
4. `Button` - 50 edges
5. `react` - 49 edges
6. `Conversation` - 44 edges
7. `Source` - 42 edges
8. `get_settings()` - 41 edges
9. `lucide-react` - 37 edges
10. `GenerationService` - 36 edges

## Surprising Connections (you probably didn't know these)
- `get_optional_current_user()` --uses--> `User`  [INFERRED]
  backend/app/api/auth.py → backend/app/models/user.py
- `register_user()` --uses--> `User`  [INFERRED]
  backend/app/api/auth.py → backend/app/models/user.py
- `login_user()` --uses--> `User`  [INFERRED]
  backend/app/api/auth.py → backend/app/models/user.py
- `get_me()` --uses--> `User`  [INFERRED]
  backend/app/api/auth.py → backend/app/models/user.py
- `_get_conversation_or_404()` --uses--> `Conversation`  [INFERRED]
  backend/app/api/conversations.py → backend/app/models/conversation.py

## Import Cycles
- None detected.

## Communities (84 total, 34 thin omitted)

### Community 0 - "Authentication & Security Architecture"
Cohesion: 0.14
Nodes (4): get_settings(), create_access_token(), decode_access_token(), Base

### Community 1 - "Navigation & App Shell Verification"
Cohesion: 0.07
Nodes (21): applyTheme(), defaultHeaders(), getAuthToken(), getContrastRatio(), getInitialTheme(), getItem(), getLuminance(), mediaListeners (+13 more)

### Community 2 - "Course Notebooks API"
Cohesion: 0.10
Nodes (14): get_current_user(), create_notebook(), delete_notebook(), get_notebook_conversations(), get_notebook_detail(), list_notebook_sources(), list_notebooks(), update_notebook() (+6 more)

### Community 3 - "Conversation & Ownership Invariants"
Cohesion: 0.07
Nodes (7): check_conversation_ownership_consistency(), Conversation, Notebook, Source, TestGroundingService, override_get_db(), TestNotebooksAPI

### Community 4 - "Study Materials Generation API"
Cohesion: 0.11
Nodes (13): delete_study_material(), generate_notebook_exam_paper(), generate_notebook_flashcards(), generate_notebook_study_guide(), get_study_material(), list_notebook_study_materials(), StudyMaterial, StudyMaterialResponse (+5 more)

### Community 6 - "Conversations & Streaming Chat API"
Cohesion: 0.09
Nodes (6): get_optional_current_user(), create_conversation(), get_dashboard_stats(), global_search(), Message, Document

### Community 7 - "Legacy Generation API Endpoints"
Cohesion: 0.13
Nodes (15): explain_simply(), generate_five_mark(), generate_flashcards(), generate_mcqs(), generate_notes(), generate_summary(), generate_ten_mark(), generate_viva() (+7 more)

### Community 8 - "Study Material Schemas"
Cohesion: 0.12
Nodes (14): ExamPaperContent, ExamPaperGenerateRequest, ExamQuestionItem, FlashcardItem, FlashcardsContent, StudyMaterialSummaryResponse, Config, MCQMetadataSchema (+6 more)

### Community 9 - "Frontend UI Control Primitives"
Cohesion: 0.12
Nodes (28): Checkbox, CheckboxProps, DropdownMenu(), ErrorState(), Select, SelectProps, SelectSize, Spinner() (+20 more)

### Community 10 - "Frontend API Client Core"
Cohesion: 0.09
Nodes (28): ActivityResponse, ALLOWED_SOURCE_EXTENSIONS, DashboardStatsResponse, deleteStudyMaterial(), ExamPaperContent, ExamPaperGenerateRequest, ExamQuestionItem, FlashcardItem (+20 more)

### Community 11 - "Frontend Generation API Integration"
Cohesion: 0.16
Nodes (28): explainSimply(), generateFiveMarkAnswer(), generateFlashcards(), generateMcqs(), generateNotes(), generateSummary(), generateTenMarkAnswer(), generateVivaQuestions() (+20 more)

### Community 12 - "Alembic Migrations & RBAC Evolution"
Cohesion: 0.08
Nodes (9): upgrade(), upgrade(), upgrade(), upgrade(), downgrade(), upgrade(), downgrade(), upgrade() (+1 more)

### Community 13 - "Auth Route Handlers & User Sessions"
Cohesion: 0.09
Nodes (7): get_me(), login_user(), register_user(), TokenResponse, UserLoginRequest, UserRegisterRequest, UserResponse

### Community 15 - "Source Deletion & Storage Management"
Cohesion: 0.11
Nodes (4): SourceProcessingError, SourceService, SourceValidationError, StagedSource

### Community 16 - "Frontend Document Context"
Cohesion: 0.15
Nodes (26): DocumentContext, DocumentContextType, DocumentProvider(), deleteDocument(), DocumentResponse, getAnonymousSessionId(), listDocuments(), MessageResponse (+18 more)

### Community 17 - "SSE Event Framing & Streaming"
Cohesion: 0.11
Nodes (7): event_stream(), event_stream(), _sse_event(), get_generation_service(), ChunkService, GeminiService, GenerationService

### Community 19 - "App Shell Layout & Sidebar"
Cohesion: 0.15
Nodes (19): AppShell(), AppShellProps, NavigationSidebar(), NavigationSidebarProps, NavItemDef, WorkspaceHeader(), WorkspaceHeaderProps, IconButton (+11 more)

### Community 20 - "Document Upload & Extraction Services"
Cohesion: 0.14
Nodes (3): ExtractionService, PdfProcessingError, PdfService

### Community 21 - "Frontend Conversation State Management"
Cohesion: 0.17
Nodes (23): ConversationContext, ConversationContextType, ConversationProvider(), chatInConversation(), CitationItem, createConversation(), createNotebookConversation(), defaultHeaders() (+15 more)

### Community 22 - "Chat Message History Management"
Cohesion: 0.16
Nodes (8): chat_in_conversation(), delete_conversation(), delete_message(), edit_message_and_regenerate(), get_conversation_messages(), _get_conversation_or_404(), list_conversations(), rename_conversation()

### Community 23 - "Password Hashing & Bcrypt Security"
Cohesion: 0.11
Nodes (5): hash_password(), _pre_hash_password(), verify_password(), TestSecurityUtilities, TestStudyMaterialsPostgreSQL

### Community 24 - "Frontend Empty & Skeleton States"
Cohesion: 0.21
Nodes (19): EmptyState(), EmptyStateProps, Skeleton(), SkeletonProps, ToastContext, ToastContextValue, ToastItem, ToastType (+11 more)

### Community 28 - "JSON Parser & Structured Output Validation"
Cohesion: 0.14
Nodes (5): _error_response(), handle_http_exception(), handle_unexpected_error(), handle_validation_error(), register_exception_handlers()

### Community 29 - "Frontend Design System Tokens"
Cohesion: 0.11
Nodes (4): create_document_storage(), DocumentStorage, LocalDocumentStorage, S3DocumentStorage

### Community 30 - "Document Entity & Ownership Mapping"
Cohesion: 0.11
Nodes (20): name, private, type, version, autoprefixer, clsx, eslint, @eslint/js (+12 more)

### Community 32 - "Database Session & Engine Lifecycle"
Cohesion: 0.18
Nodes (14): App(), AppLayout(), ProtectedRoute(), getInitialTheme(), resolveActiveTheme(), ResolvedTheme, Theme, ThemeContext (+6 more)

### Community 33 - "Frontend Dark Light Theme Context"
Cohesion: 0.21
Nodes (16): ChatSidebar(), useConversations(), EnrichedDocument, useDocuments(), DocumentLibrary(), DocumentUpload(), onDrop(), onInputChange() (+8 more)

### Community 34 - "Frontend Button UI Primitive"
Cohesion: 0.16
Nodes (3): DocumentService, StagedUpload, UploadValidationError

### Community 37 - "Notebook Source Entity Model"
Cohesion: 0.23
Nodes (11): Button, ButtonProps, ButtonSize, ButtonVariant, Dialog(), DialogProps, ErrorStateProps, IconButtonProps (+3 more)

### Community 38 - "Notebook Workspace Page Orchestrator"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, allowSyntheticDefaultImports, baseUrl, esModuleInterop, isolatedModules, jsx, lib (+11 more)

### Community 39 - "Course Notebooks Hub Page"
Cohesion: 0.15
Nodes (5): delete_document(), list_documents(), rename_document(), replace_document(), upload_document()

### Community 40 - "Document Ingestion & Parsing Tests"
Cohesion: 0.17
Nodes (4): get_study_service(), FlashcardsGenerateRequest, StudyGuideGenerateRequest, NotebookStudyService

### Community 41 - "Multi-Format File Parser Service"
Cohesion: 0.15
Nodes (8): FlashcardSchema, FlashcardsResponseSchema, parse_and_validate_flashcards(), parse_and_validate_viva(), VivaMetadataSchema, VivaQuestionSchema, VivaResponseSchema, TestJsonParser

### Community 43 - "Frontend Auth Context & Token Store"
Cohesion: 0.29
Nodes (11): Badge, BadgeProps, BadgeVariant, DropdownItem, DropdownMenuProps, SourceCard(), SourcesRail(), SourceViewerModal() (+3 more)

### Community 45 - "Legacy Documents REST API"
Cohesion: 0.15
Nodes (6): DocumentRenameRequest, DocumentResponse, Config, DocumentUploadResponse, MessageSearchResponse, SearchResultsResponse

### Community 46 - "Frontend Study Studio Workspace Tab"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 48 - "Frontend Input & Form Primitives"
Cohesion: 0.13
Nodes (5): configure_logging(), create_application(), lifespan(), run_migrations_offline(), run_migrations_online()

### Community 49 - "Frontend Modal Dialog Primitives"
Cohesion: 0.20
Nodes (5): NotebookCreateRequest, NotebookDetailResponse, NotebookResponse, NotebookSummaryResponse, NotebookUpdateRequest

### Community 52 - "Frontend Linting & Tooling Configuration"
Cohesion: 0.12
Nodes (16): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss (+8 more)

### Community 53 - "Frontend Card Component Primitives"
Cohesion: 0.49
Nodes (11): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, useAuth() (+3 more)

### Community 55 - "Conversation Request & Response Schemas"
Cohesion: 0.21
Nodes (5): ChatMessageRequest, ConversationCreateRequest, ConversationRenameRequest, MessageResponse, Config

### Community 57 - "Frontend Authentication Hook & State"
Cohesion: 0.30
Nodes (11): AuthContext, AuthContextType, AuthProvider(), getAuthToken(), getCurrentUser(), loginUser(), registerUser(), setAuthToken() (+3 more)

### Community 59 - "Dashboard Activity & Analytics Schemas"
Cohesion: 0.24
Nodes (4): ConversationResponse, Config, ActivityResponse, DashboardStatsResponse

### Community 60 - "Initial Document Persistence Migration"
Cohesion: 0.22
Nodes (3): downgrade(), upgrade(), upgrade()

### Community 63 - "Frontend Motion & Icon Dependencies"
Cohesion: 0.22
Nodes (9): dependencies, clsx, framer-motion, lucide-react, @radix-ui/react-slot, react, react-dom, react-router-dom (+1 more)

### Community 64 - "TypeScript Node Configuration"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, noEmit, skipLibCheck, include

### Community 66 - "Notebooks & Sources Migration Schema"
Cohesion: 0.32
Nodes (4): downgrade(), _ensure_index(), upgrade(), _validate_or_create_fk()

### Community 67 - "Source Rail Modal Props Interfaces"
Cohesion: 0.29
Nodes (7): DeleteSourceDialogProps, SourceCardProps, SourcesRailProps, SourceViewerModalProps, ConversationResponse, SourceResponse, StudyStudioPanelProps

### Community 70 - "Frontend Build Scripts & NPM Config"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, preview, test

### Community 71 - "Markdown Renderer & Code Syntax Blocks"
Cohesion: 0.60
Nodes (5): CodeBlock(), MarkdownContent(), MarkdownContentProps, parseInlineStyles(), TableBlock()

## Knowledge Gaps
- **7 isolated node(s):** `@types/node`, `@types/react`, `@types/react-dom`, `autoprefixer`, `eslint` (+2 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 676 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Course Notebooks API` to `Authentication & Security Architecture`, `Conversation & Ownership Invariants`, `Study Materials Generation API`, `User Model & Role-Based Access Control`, `Conversations & Streaming Chat API`, `Course Notebooks Hub Page`, `Notebook Sources Authorization Tests`, `Chat Workspace Conversation Interface`, `Auth Route Handlers & User Sessions`, `Study Material Security Tests`, `Chat Message History Management`, `Password Hashing & Bcrypt Security`, `Authentication Integration Test Suite`, `Course Notebook Model & Relations`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Are the 46 inferred relationships involving `User` (e.g. with `get_current_user()` and `get_me()`) actually correct?**
  _`User` has 46 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@types/node`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Authentication & Security Architecture` be split into smaller, more focused modules?**
  _Cohesion score 0.1355111917725348 - nodes in this community are weakly interconnected._
- **Why does `Settings` connect `Backend Runtime Configuration` to `Authentication & Security Architecture`, `Frontend Button UI Primitive`, `Conversation & Ownership Invariants`, `Gemini API Configuration Errors`, `Study Material Schemas`, `Document Ingestion & Parsing Tests`, `Frontend Badge & Status Tag Primitives`, `Grounded RAG & Citation Service`, `Frontend Sources Rail & Document Drawer`, `Source Deletion & Storage Management`, `SSE Event Framing & Streaming`, `Document Upload & Extraction Services`, `Frontend Design System Tokens`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Are the 26 inferred relationships involving `Notebook` (e.g. with `create_conversation()` and `create_notebook()`) actually correct?**
  _`Notebook` has 26 INFERRED edges - model-reasoned connections that need verification._
- **Should `Navigation & App Shell Verification` be split into smaller, more focused modules?**
  _Cohesion score 0.06775510204081632 - nodes in this community are weakly interconnected._