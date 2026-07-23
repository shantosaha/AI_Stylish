# AI Personal Wardrobe Assistant

Monorepo for the AI Personal Wardrobe Assistant project. See `IMPLEMENTATION_PLAN.md` for the full build-ready plan and `documents/README.md` for planning documentation.

## Repository Structure

```
AI_Stylish/
├── documents/           # Planning documents (Concept, PRD, TRD, System Design, UI, Diagrams, Build Execution)
├── IMPLEMENTATION_PLAN.md  # Build-ready execution plan
├── CLAUDE.md            # Claude Code project guidance
├── apps/
│   ├── mobile/          # Expo React Native app (iOS + Android + Web)
│   └── api/             # FastAPI backend
├── packages/
│   └── shared/          # Shared TypeScript DTOs, enums, constants
└── infra/
    └── db/              # SQL migrations
```

## Phase 0: Repository & Shell Setup

Current status: Scaffolding complete. The following components are in place:

- ✅ Expo app shell (React Native + Expo Router)
- ✅ FastAPI skeleton with health check endpoint
- ✅ Shared TypeScript package (DTOs, enums, constants)
- ✅ Database schema migration (PostgreSQL baseline)
- ✅ Monorepo wiring with npm workspaces

### Exit Criteria
- ✅ App boots on iOS/Android/Web simulators (Expo Router configured)
- ✅ API `/health` endpoint returns 200 OK (verified with health check)

## Phase 1: Foundation

Current status: Complete. Auth, profile, and core navigation work end-to-end.

- ✅ Auth endpoints (`POST /auth/signup`, `POST /auth/login`) backed by hashed passwords + JWT
- ✅ `GET/PUT /profile` — one `user_profiles` row per account, with `processing_mode` as a first-class field
- ✅ Mobile auth flow (login/signup screens, session persisted via SecureStore/localStorage, auto-rehydration on launch)
- ✅ Home tab (empty-state wardrobe placeholder) and Profile tab (editable name + AI processing mode + logout)
- ✅ Loading, error, and empty states for the auth/profile epic

### Exit Criteria
- ✅ A user can sign up, log in, and see an empty Home/Profile screen on a fresh install (verified end-to-end in-browser)

## Getting Started

### Install dependencies
```bash
npm install
```

### Build shared package
```bash
npm run build:shared
```

### Run mobile app
```bash
npm run dev:mobile
```

Then select:
- `i` for iOS simulator
- `a` for Android simulator
- `w` for web

### Run API (local development)
```bash
cd apps/api
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
python main.py
```

Visit `http://localhost:8000/health` to verify the API is running.

Set `EXPO_PUBLIC_API_URL` (defaults to `http://localhost:8000`) when starting the mobile app if the API runs elsewhere, e.g.:
```bash
EXPO_PUBLIC_API_URL=http://localhost:8000 npm run dev:mobile
```

## Next Phase

**Phase 2: Wardrobe & vision** — Wardrobe CRUD, image upload, auto clothing detection + tag proposal, manual correction UI.

See `IMPLEMENTATION_PLAN.md` §4 for the full phased roadmap and exit criteria for each phase.