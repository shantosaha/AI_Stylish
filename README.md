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

## Phase 2: Wardrobe & vision

Current status: Complete. Wardrobe CRUD, photo upload, auto-tagging, and correction all work end-to-end.

- ✅ `GET/POST /wardrobe/items`, `PUT/DELETE /wardrobe/items/{id}`, `POST /wardrobe/items/{id}/analyze`
- ✅ Photo upload (multipart) with local-disk media storage (swappable for Supabase Storage later)
- ✅ Auto-tagging seam (`analyzer.py`): real dominant-color detection today, pluggable for a local/cloud
  model later without changing the API contract — every detection is a low-confidence proposal stored
  in a normal editable field, never a final value
- ✅ Correction UI: every auto-tagged field (name, category, color, pattern, material, brand) is editable;
  corrections are diffed against the original detection and logged to `item_analysis_results.corrections`
- ✅ Wardrobe tab: grid list, empty/loading/error states, add-item flow (camera or library), item detail/edit,
  delete, and a "discard" path that removes an uncommitted upload if the user backs out
- ✅ Home tab reflects live wardrobe item count

### Exit Criteria
- ✅ User can add an item by photo, see auto-tags, edit them, and see it persist (verified end-to-end
  in-browser, including corrections surviving a reload and a full create → correct → view → delete cycle)

## Phase 3: Body profile

Current status: Complete. Photo upload, body analysis, and correction all work end-to-end.

- ✅ `POST/GET /body-images`, `DELETE /body-images/{id}` — up to 6 photos per account, one primary
  (auto-reassigned to the next photo if the primary is deleted)
- ✅ `POST /body-analysis/run`, `GET/PUT /body-analysis` — one current analysis per account, corrections
  diffed and logged the same way as wardrobe item corrections
- ✅ `body_analyzer.py`: the same honest-heuristic seam as the wardrobe analyzer — real (non-identifying)
  skin-tone color sampling, explicit low-confidence placeholders for body/face shape, and no fabricated
  guess for height (left null rather than invented) since no reliable heuristic exists for it yet
- ✅ Body profile screen (reached from the Profile tab): photo grid with primary badge and delete,
  camera/library upload, "Run analysis" with a visible confidence percentage, and an editable correction
  form for every detected field
- ✅ Deliberately does no face recognition or identity-linked processing, consistent with the biometric-data
  handling item deferred in `IMPLEMENTATION_PLAN.md` §11

### Exit Criteria
- ✅ Uploading a full-body photo produces reviewable, editable structured traits (verified end-to-end
  in-browser: upload → analyze → correct → persists across reload → photo delete)

## Phase 4: Context engine

Current status: Complete. Weather, calendar events, and routines all feed into a single cached snapshot.

- ✅ `GET /context/today?lat=&lon=` — aggregates weather, today's calendar events, and the current
  routine block into one response; always returns a real `routine_block` even with zero events/routines
- ✅ `POST /calendar-events/sync`, `GET /calendar-events/today`, `PUT/DELETE /calendar-events/{id}`,
  `GET/POST /routines`, `DELETE /routines/{id}`
- ✅ `weather.py`: real Open-Meteo integration (free, no API key) with a `weather_cache` table —
  fresh-serve, TTL-based refetch, and graceful stale-fallback if the provider is unreachable rather
  than failing the whole request. Verified end-to-end against real cache states (fresh/expired/no-cache);
  the live Open-Meteo call itself could not be exercised in this session because the sandbox's egress
  policy blocks `api.open-meteo.com` — the graceful-degradation path this triggered is itself proof the
  fallback logic works correctly, but the true happy-path response has not been observed from this session
- ✅ `event_classifier.py`: keyword-based `inferred_event_type`/`inferred_formality`, same honest
  low-confidence-and-always-correctable pattern as the wardrobe/body analyzers; corrections diffed and
  logged the same way
- ✅ Routine model is deliberately simplified — `recurrence_rule` is free text and never parsed;
  applicability is decided purely by `time_block` (morning/workday/evening/night) matching a
  deterministic server-side time computation, so the endpoint is always satisfiable
- ✅ Home screen context card (weather, routine, event summary, offline/stale badges) plus a "Today"
  management screen (component-toggle, not routing) for manual event entry, event corrections, and
  routines — reachable by tapping the card
- ✅ Real `expo-calendar` device sync alongside manual entry — `expo-calendar` has no web platform
  support at all, so the on-device read path is verified by code review and a synthetic-payload backend
  test of the sync endpoint's contract, not a live UI test; the manual-entry path (which doubles as the
  required correction UI) is fully end-to-end verified
- ✅ Offline behavior verified end-to-end: last snapshot persists locally, renders instantly on reload
  with an "Offline — showing saved data" badge if the live fetch fails, and clears once connectivity
  returns

### Exit Criteria
- ✅ `/context/today` returns a real weather + event + routine snapshot, cached for offline reuse
  (verified end-to-end in-browser and via curl, including simulated network failure and recovery)

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

**Phase 5: Recommendation engine (guaranteed baseline)** — Hard filtering → candidate generation → rule-based scoring → 1 best + 2 alternatives → deterministic combined-item-card preview. This is the minimum credible product demo per the Build Execution Pack.

See `IMPLEMENTATION_PLAN.md` §4 for the full phased roadmap and exit criteria for each phase.