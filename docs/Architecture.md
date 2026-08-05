# Architecture Documentation

## Monorepo Architecture Overview

The **AI Academic Assistant** monorepo follows a decoupled clean architecture:

1. **Frontend Layer**: Built with React 18, TypeScript, Vite, Tailwind CSS, and Framer Motion. Uses React Contexts (`ThemeContext`, `ConversationContext`, `DocumentContext`) for state and IndexedDB for local offline caching of generated study resources.
2. **Backend Service Layer**: Built with Python FastAPI, Pydantic, SQLAlchemy 2.0 (Async), AsyncPG, and Alembic. Implements clean repository patterns for database persistence and SSE stream response wrappers.
3. **AI Integration**: Communicates with Google Gemini API via official SDK with streaming response support and custom system prompts tailored for academic content.
4. **Data Layer**: PostgreSQL managed instance on Railway for user documents, conversations, messages, and saved results.
