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
- [ ] App boots on iOS simulator
- [ ] App boots on Android simulator  
- [ ] App boots on web
- [ ] API `/health` endpoint returns 200 OK

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

## Next Phase

**Phase 1: Foundation** — Auth (signup/login), user profile creation, basic navigation setup.

See `IMPLEMENTATION_PLAN.md` §4 for the full phased roadmap and exit criteria for each phase.