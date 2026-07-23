# AI Personal Wardrobe Assistant — Implementation Plan

Build-ready execution plan synthesized from the 7 planning documents in `documents/`. This is the primary reference for building the MVP with Claude Code. It does not redefine the product — it sequences and operationalizes what the Concept, PRD, TRD, System Design Document, Interface Design Pack, Diagram Pack, and Build Execution Pack already agreed.

## 1. Project summary

A men's-first hybrid AI wardrobe assistant. Core contract, unchanged across every phase of the build:

- Recommend **one best outfit plus two alternatives**, built only from clothes the user already owns.
- Show the **exact wardrobe item photos together** in one visual outfit surface — never text-only.
- Combine **body-aware analysis**, style preferences, calendar/routine context, location, and live weather.
- Support **hybrid processing** — local/on-device by default where possible, cloud-enhanced when selected or needed — and remain useful offline.
- All automatic detections (body traits, clothing tags, event inference) must be **user-correctable**.
- V1 is **men-only**, **single profile per account**, no shopping/commerce features.

Any implementation decision that weakens this contract (e.g. dropping editable corrections, or making cloud processing mandatory) is a regression, not a simplification.

## 2. Repository structure

Monorepo, one client app and one API service, shared contracts in one place:

```
AI_Stylish/
├── documents/              # source planning docs (already committed)
├── IMPLEMENTATION_PLAN.md  # this file
├── CLAUDE.md                # Claude Code project guidance
├── apps/
│   ├── mobile/              # Expo React Native app (iOS + Android + Web via RN Web)
│   └── api/                 # FastAPI backend
├── packages/
│   └── shared/              # shared TypeScript DTOs, enums, constants used by mobile + generated API types
└── infra/
    └── db/                  # SQL migrations, starting from the baseline schema in documents/04
```

Rationale: keeps entity/endpoint/enum names identical between client and server (a named risk in the Build Execution Pack — "keep naming aligned with Group A and Group B documents so future implementation does not drift").

## 3. Tech stack (pinned from TRD / System Design Document)

| Layer | Choice |
|---|---|
| Client | React Native + Expo, Expo Router, React Native Web, TypeScript |
| Client state | Zustand or TanStack Query + lightweight local state |
| Client local persistence | SQLite via Expo SQLite (Drizzle/WatermelonDB only if complexity later demands it) |
| Backend | FastAPI (Python) |
| Background jobs | FastAPI BackgroundTasks + cron/scheduled workers for MVP; Celery/RQ only if volume demands it later |
| Database | PostgreSQL via Supabase (managed Postgres + Auth + Storage, generous free tier) |
| Media storage | Supabase Storage (cloud sync path); device-local storage first for local-first mode |
| Weather | Open-Meteo |
| Calendar | Native device calendar bridge (Google/Apple/device-linked calendars without separate provider sync) |
| AI | Multi-provider cloud router (OpenAI/Gemini/Claude swappable) + on-device models (Gemma small variants / MobileCLIP-like / ONNX / Core ML / TFLite depending on platform) |
| Deployment (later) | Expo/EAS + Vercel (web), FastAPI on Railway/Render, Supabase for Postgres/Auth/Storage |

Do not introduce a different stack component without updating this file and `documents/03_TRD.docx`'s intent — the TRD explicitly favors free-tier/open-source-first, modular, and swappable providers.

## 4. Phased roadmap

Merges the Build Execution Pack's Phase 0–8 with the PRD's Milestone 1–7 into one authoritative sequence. Each phase ends with a working, demoable slice — no phase should leave the app in a broken state.

| Phase | Scope | Exit criteria |
|---|---|---|
| **0 — Repo & shell** | Monorepo scaffold, Expo app shell, FastAPI skeleton, CI lint/test hooks, shared package wiring. | App boots on iOS/Android/Web simulators; API returns a health check. |
| **1 — Foundation** | Auth (signup/login/recover), single `user_profiles` row per account, local DB bootstrap, settings shell, core navigation (Expo Router). | A user can sign up, log in, and see an empty Home/Profile screen on a fresh install. |
| **2 — Wardrobe & vision** | Wardrobe CRUD, image upload (camera/gallery), auto clothing detection + tag proposal, manual correction UI, wardrobe categories (tops/bottoms/outerwear/shoes/accessories/bags/jewelry). | User can add an item by photo, see auto-tags, edit them, and see it persist. |
| **3 — Body profile** | 1–6 person photo upload, body analysis pipeline (shape, proportions, skin tone, face shape), confidence display, correction screen. | Uploading a full-body photo produces reviewable, editable structured traits. |
| **4 — Context engine** | Calendar read + normalization, routine/time-block model, location + weather background fetch with caching/staleness handling. | `/context/today` returns a real weather + event + routine snapshot, cached for offline reuse. |
| **5 — Recommendation engine (guaranteed baseline)** | Hard filtering → candidate generation → rule-based scoring → 1 best + 2 alternatives → deterministic **combined item card** preview (no AI image generation yet). | End-to-end: open app → see one real outfit recommendation built from owned items, using real context. **This is the minimum credible product demo — stop here if time-constrained**, per the Build Execution Pack. |
| **6 — Preview quality** | Mannequin layout, outfit collage on user photo (default v1 mode). Realistic AI preview scoped as enhancement, not baseline. | User can switch preview modes on a given recommendation and see all of them render. |
| **7 — History, feedback, assistant** | Worn/favorite/feedback capture, repeat-avoidance logic, chat-based refinement ("make it warmer/more formal"), tone selection. | History view shows past recommendations; refining via chat re-ranks without losing context. |
| **8 — Offline hardening & sync** | Local model integration for offline tagging/analysis/recommendation, sync queue + replay, conflict handling. | Airplane-mode session: wardrobe browsing, cached recommendation, and queued edits all work; they sync cleanly once back online. |
| **9 — Cloud enhancement** | Multi-provider routing polish, realistic AI preview mode, richer explanation generation. | Cloud-preferred mode measurably improves preview/explanation quality without breaking the local-preferred path. |

## 5. Task breakdown pattern

Every feature-level task must be split by delivery surface, not shipped as a single happy-path API. Per the Build Execution Pack: *"'Wardrobe auto-tagging' is not one task."* Standard breakdown for any epic:

1. Client upload/input flow
2. API endpoint + validation
3. Analysis/processing + storage (structured fields, not just JSON blobs)
4. Correction/edit UI (user override always wins)
5. Empty / loading / error / offline states (see `documents/05_Product_Interface_Design.docx` §"Important states" per screen)
6. Tests (unit + at least one integration path)

Apply this to every epic in Phases 2–8: wardrobe ingestion, body analysis, context engine, recommendation, preview, history/feedback, sync.

## 6. Data layer

Use the baseline PostgreSQL schema in `documents/04_System_Design_Document.docx` §6 verbatim as migration `0001_baseline.sql` in `infra/db/`. Key structural rules to preserve:

- Raw media (`body_images`, `wardrobe_images`) stays separate from derived structured results (`body_analysis_results`, `item_analysis_results`) — enables reprocessing and mode changes without touching business tables.
- `recommendation_runs` stores the context snapshot + 3 resolved outfit references (main/alt1/alt2) independently from `outfits`, so a run can always be replayed/audited.
- `outfit_history` is separate from `recommendation_runs` — favorites/worn/feedback outlive any single run.
- `sync_queue` is keyed on `user_id` (not `user_profile_id`) — confirmed correct in the Diagram Pack's class diagram; do not "fix" this during implementation.
- Partial unique indexes enforce one primary body image and one primary wardrobe image per owner — keep these constraints in the migration, don't move that rule into application code only.

## 7. API implementation order

Follow the endpoint catalog in `documents/04` and `documents/03`, built in phase order so each phase's endpoints are usable standalone:

1. `POST /auth/signup`, `POST /auth/login` (Phase 1)
2. `GET/PUT /profile` (Phase 1)
3. `GET/POST /wardrobe/items`, `PUT/DELETE /wardrobe/items/{id}`, `POST /wardrobe/items/{id}/analyze` (Phase 2)
4. `POST /body-images`, `POST /body-analysis/run` (Phase 3)
5. `GET /context/today` (Phase 4)
6. `POST /recommendations/today`, `POST /recommendations/{id}/feedback` (Phase 5)
7. `POST /preview/generate` (Phase 6)
8. `GET /history` (Phase 7)

Conventions to hold: JSON only, stable UUIDs, `processing_mode` accepted wherever a task can run local/cloud/auto, heavy tasks return `pending/running/ready/failed` status with 202 Accepted, staleness indicators on any cached weather/context response.

## 8. AI / ML integration approach

- **Processing mode** is a first-class per-user (and optionally per-task) setting: `auto`, `local_preferred`, `cloud_preferred`. Implement the `AI Provider Router` as a single seam from day one, even before more than one provider exists — this is what the TRD calls a "multi-provider cloud AI interface from day one."
- **Deterministic collage composition is the guaranteed default preview**, explicitly per the TRD: fast, explainable, runs locally. AI realistic preview is enhancement-only and must degrade gracefully to collage/mannequin on unsupported devices or failures — never the only path.
- Recommendation scoring is **hybrid from day one**: rule-based hard filtering first (weather/formality/exclusions), then rule-based + learned-preference + optional model rerank score. Do not build a pure-ML-first ranking path — the docs are explicit that rules must remain the reliability backbone.

## 9. Testing & QA strategy

Map directly to the PRD's acceptance criteria (`documents/02` §7). Minimum bar before a phase is considered done:

- Every `US-01`…`US-09` acceptance criterion has at least one corresponding automated test or documented manual QA script.
- Given/When/Then epics (profile & body analysis, wardrobe ingestion, context engine, recommendation & preview) each get explicit test cases for the "wrong detection → user correction → correction persists" path — this correction loop is a repeated non-negotiable requirement across every doc and is easy to skip when only testing the happy path.
- Offline behavior table in `documents/03` §10.1 becomes a literal test matrix (one row per feature × offline behavior).

## 10. Working with Claude Code on this repo

Carried from the Build Execution Pack's Prompt Pack summary:

- Ask for **one vertical slice at a time** (e.g. "wardrobe item upload end-to-end," not "build the wardrobe module").
- Always require the agent to state its **file list, tests, and assumptions** before/with the change.
- Editable detections and graceful preview fallback are **not optional extras** — reject any implementation that hardcodes AI output as final.
- Keep entity, endpoint, and screen naming identical to `documents/04` (System Design Document) and `documents/05` (Interface Design Pack) — this repo's biggest asset so far is that nothing has drifted; preserve that.
- Prefer stable vertical slices over large speculative builds; maintain the guaranteed baseline path (auth → wardrobe → context → recommendation → 1 preview mode) at all times once Phase 5 is reached.

## 11. Open items carried forward (not blocking, tracked here)

1. **Biometric data handling** — body/face/skin-tone analysis touches sensitive data categories in some jurisdictions (GDPR special category, US state biometric laws). Explicitly deferred by the user for MVP; revisit before any public or regulated launch.
2. **Business plan** — no monetization, team, timeline, or budget defined in any planning doc. Confirmed as a genuine open gap, not yet needed.
3. **Diagram Pack cosmetic issues** — User Flow diagram has an overlapping-text rendering bug on the "Accept the look? / End / Next day?" node; DFD Level 1 is missing two data-flow arrows (D1/D2 → process 4.0) that DFD Level 2 draws correctly. Informational only, does not block implementation.
4. **Realistic preview generation approach** — TRD §17.1 leaves this intentionally open (diffusion/image-edit pipeline vs. compositing-first + AI enhancement). Decide during Phase 9, not before.
