# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**IA360° Dashboard** is a full-stack web application for prioritizing AI initiatives at PGMais. It integrates with Jira to pull initiative data and provides multiple dashboard views for analysis and project management.

- **Frontend:** React 18 + Vite 6 with Tailwind CSS
- **Backend:** FastAPI with Supabase
- **Authentication:** Google OAuth with email domain restriction (pgmais.com.br)
- **Database:** Supabase (PostgreSQL)
- **External Integration:** Jira API

## Project Structure

```
├── frontend/                 # React + Vite SPA
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React context (Auth, etc.)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API client services
│   │   ├── utils/           # Utility functions
│   │   ├── App.jsx          # Main app component with view routing
│   │   ├── index.css        # Tailwind styles + custom CSS
│   │   └── main.jsx         # Vite entry point
│   ├── vite.config.js       # Vite configuration
│   └── package.json
├── backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── main.py          # FastAPI app setup, middleware, route inclusion
│   │   ├── config.py        # Settings from environment variables (Pydantic)
│   │   ├── auth/            # Google OAuth + JWT verification
│   │   ├── database/        # Supabase client initialization
│   │   ├── initiatives/     # Initiatives CRUD, calculations
│   │   └── jira/            # Jira API integration service
│   ├── requirements.txt      # Python dependencies
│   ├── .env                  # Environment variables (not in git)
│   └── .venv/               # Python virtual environment
├── supabase/                 # Supabase migrations & configuration
├── docs/                     # Documentation
└── .env.example              # Template for environment variables
```

## Common Development Commands

### Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server (Vite on port 5173)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Backend

```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment (one-time setup)
python -m venv .venv
source .venv/Scripts/activate  # Windows
source .venv/bin/activate      # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Run API server (Uvicorn on port 8001 by default)
uvicorn app.main:app --reload --port 8001

# Check API health
curl http://localhost:8001/health
```

### Environment Setup

1. Copy `.env.example` to `.env` in the backend directory
2. Fill in required variables:
   - Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET`
   - Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - Jira: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`
   - Email domain restriction: `ALLOWED_EMAIL_DOMAIN` (default: pgmais.com.br)
   - Frontend URL for CORS: `FRONTEND_URL` (default: http://localhost:5173)

## Architecture

### Frontend Architecture

**Views** (hash-based routing in App.jsx):
- **Dashboard** (`#dashboard`) — Main analytics and metrics view
- **Timeline** (`#timeline`) — Project timeline visualization
- **Deliveries** (`#entregas`) — Delivery tracking
- **Admin/Costs** (`#admin`) — Cost data and admin controls

**Key Patterns:**
- **AuthContext** (`contexts/AuthContext`) — Manages Google OAuth flow and user session, required for all protected views
- **useInitiatives hook** — Fetches and manages initiatives data
- **Components** are organized by feature (Auth, Views, Admin, etc.)
- **Services** layer handles API calls to backend via Axios
- **Tailwind CSS** with custom CSS in `index.css` for theme and dark mode support
- **Drag & drop** uses DnD Kit (`@dnd-kit/core`, `@dnd-kit/sortable`)

### Backend Architecture

**FastAPI Modules:**
- **main.py** — App initialization, CORS middleware (restricted to frontend URL), route registration
- **config.py** — Settings loaded from `.env` via Pydantic BaseSettings
- **auth/** — JWT verification, domain checking for Google OAuth
- **database/** — Supabase client setup
- **initiatives/** — Core routes and business logic:
  - `router.py` — API endpoints (GET/POST/PUT/PATCH)
  - `models.py` — Pydantic models for request/response validation
  - `calculations.py` — Business logic for metrics and aggregations
- **jira/** — Service for syncing initiative data from Jira

**Key Architectural Decisions:**
- CORS is **restricted to the specific frontend URL** (not wildcard) — required for security with OAuth
- JWT tokens from Supabase are verified via `python-jose`
- All requests require valid JWT in `Authorization` header
- Domain restriction (`@pgmais.com.br`) enforced at auth level

## Database

**Supabase (PostgreSQL)** is the source of truth for:
- Initiatives and their metadata
- User preferences
- Computed metrics and aggregations

**Jira Integration:**
- Jira is a source of initiative data, synced into Supabase
- Backend fetches from Jira API and updates initiative records
- See `docs/jira-fields-reference.md` for Jira field mappings

## Key Files to Know

- **frontend/src/App.jsx** — View routing, authentication check, user display logic
- **frontend/src/contexts/AuthContext.jsx** — Supabase auth provider setup, login/logout flows
- **backend/app/main.py** — FastAPI app setup and middleware
- **backend/app/initiatives/router.py** — API endpoints for initiatives
- **backend/app/config.py** — Environment variable schema
- **docs/jira-fields-reference.md** — Jira field mappings and API usage

## Running the Full Application

1. **Backend:** `cd backend && source .venv/bin/activate && uvicorn app.main:app --reload`
2. **Frontend:** `cd frontend && npm run dev`
3. **Access:** http://localhost:5173 (redirects to login if not authenticated)
4. **Test API:** http://localhost:8001/health

## Testing & Code Quality

- **Frontend:** No test suite currently configured (consider adding Vitest + React Testing Library if needed)
- **Backend:** No test suite currently configured (consider adding pytest if needed)
- **Linting:** Frontend uses Vite defaults; no ESLint config visible. Consider adding for consistency with PGMais brand guide.

## Git Workflow

- **Main branch:** Stable production-ready code
- **Master branch:** Current development branch (tracked in `.git`)
- Commit messages follow conventional format (fix:, feat:, docs:, etc.)
- Recent work focuses on dashboard UI improvements, chart redesigns, and color refinements

## Notes for Future Work

1. **CI/CD:** No GitHub Actions or deployment pipeline configured yet
2. **Email Domain:** Currently hardcoded to `pgmais.com.br` — make configurable if expanding to other domains
3. **Styling:** Uses Tailwind CSS; PGMais brand guide available in memory for color/typography rules
4. **Dark Mode:** Supported in components (see `isDarkMode` parameter in chart functions)
5. **Deployment:** Consider Vercel for frontend, cloud function hosting for FastAPI backend
