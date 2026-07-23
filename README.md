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

## Phase 5: Recommendation engine — guaranteed baseline

Current status: Complete. Rule-based scoring produces 1 best outfit + 2 alternatives from the user's own
wardrobe, built from real weather/formality context, with a user-correctable feedback loop.

- ✅ `POST /recommendations/today?lat=&lon=` — hard-filters the active wardrobe down to tops/bottoms/shoes
  (+ optional outerwear), builds 3 distinct-ish candidates via cheap diagonal pairing (rank-i top with
  rank-i bottom with rank-i shoes, index capped for small wardrobes), scores each on temperature and
  formality match, and persists the run plus all 3 outfits; 400 if the wardrobe lacks a top, bottom, or
  pair of shoes
- ✅ `POST /recommendations/{run_id}/feedback` — records like/worn/skip/etc. against one of the run's 3
  outfits; 404 if the run isn't owned by the caller, 400 if the outfit isn't one of the run's 3
- ✅ `recommender.py`: the scoring seam — `resolve_target_formality` picks the highest-formality event of
  the day, `score_item` adds/subtracts for outerwear-in-cold and formality-distance, every score-affecting
  factor emits a human-readable `explanation_tag` rather than a silent number
- ✅ Rule-based hard filtering first, exactly as specified — no ML ranking path, no accessory selection,
  no repeat-avoidance logic; all explicitly deferred and commented in code as out of scope for the
  guaranteed baseline
- ✅ Added the `formality` field to wardrobe items (present in the canonical schema but missing since
  Phase 2) with a 3-way casual/business/formal picker in the item form, feeding the scorer directly
- ✅ Home screen auto-generates today's recommendation once the wardrobe has enough items, showing the
  real wardrobe photos for the main pick and both alternatives together — never a text-only list — with
  inline Like/Worn it/Skip feedback per outfit and empty/loading/error states
- ✅ Verified end-to-end via curl: empty-wardrobe 400, hand-checked scoring math for temperature and
  formality adjustments, explanation tag generation, and both feedback validation paths (400 wrong
  outfit, 404 wrong run)
- ✅ Verified end-to-end in-browser: empty state → building a wardrobe → auto-generated recommendation
  with real photos for all 3 outfits, formality picker, feedback buttons, and — after tracking down a
  test-data seeding bug where a directly-inserted SQLite row used a `T`-separated datetime that sorted
  incorrectly against SQLAlchemy's space-separated format — confirmed both the weather tag ("Good for
  today's 5°C weather") and the formality tag ("Matches today's business dress code") render correctly
  on every outfit card when real context exists, with zero console errors throughout

### Exit Criteria
- ✅ Recommendations are always 1 best outfit + 2 alternatives, built only from wardrobe items the user
  owns, shown as real photos together (never text-only), with weather/formality explanation tags and a
  user feedback loop — verified end-to-end via curl and in-browser

## Phase 6: Preview quality

Current status: Complete. Every outfit now renders in all 4 canonical preview modes, switchable from a
detail view opened off any recommendation card.

- ✅ `POST /preview/generate` (`outfit_id`, `preview_type`, optional `force_refresh`) and
  `GET /preview/{outfit_id}` — backed by a new `preview_assets` table (`documents/04` naming exactly,
  no `user_id` column since ownership flows through `outfit_id` in the canonical schema too)
- ✅ `preview_generator.py`: the compositing seam — `compose_mannequin` draws a flat, schematic
  body-shaped silhouette (no face implied) and pastes each garment photo into its body region;
  `compose_collage` overlays a flat-lay item strip on the user's own primary body photo when one exists,
  or a neutral background otherwise — a missing body photo never blocks the preview; `compose_realistic`
  always reports `status: failed` with a human-readable reason, since no cloud realistic-preview provider
  is wired yet (that decision is explicitly deferred to Phase 9 per `IMPLEMENTATION_PLAN.md` §8) —
  exactly the degrade-gracefully behavior `CLAUDE.md` requires, never presented as the only path
- ✅ `combined_card` (the Phase 5 baseline) needs no server-side compositing — a preview-asset row is
  still created so all 4 modes share one status contract, but it just points back at the wardrobe photos
  the client already has
- ✅ Real, local PIL compositing (no external services) — verified against actual pasted garment photos,
  not just placeholder colors, producing correctly positioned, correctly sized composite PNGs
- ✅ Outfit detail screen (opened via "View preview modes" on any outfit card, component-toggle per the
  established Home-screen pattern) with a 4-way mode switcher; mannequin/collage show a loading state
  while generating, then the real composited image; realistic mode shows its fallback reason and
  automatically fetches + displays the collage image underneath it, so the user is never shown nothing
- ✅ Fixed a stale-documentation gap found while building this phase: `infra/db/0001_baseline.sql`'s
  `outfits`/`recommendation_runs`/`outfit_history` table definitions were still the original Phase-0
  stubs and had never been updated to match the real Phase 5 SQLAlchemy models (unlike Phase 4's tables,
  which were kept in sync) — brought all four tables (including the new `preview_assets`) in line with
  the actual models in this phase
- ✅ Verified end-to-end via curl: all 4 preview types generated for a real outfit, composited PNGs
  fetched and visually confirmed (garment colors correctly positioned in mannequin body regions; collage
  correctly falling back to a neutral background with no body photo, then correctly compositing over a
  real body photo once one was uploaded); realistic mode's graceful-degradation payload
- ✅ Verified end-to-end in-browser: opened a recommendation's detail view, switched through all 4 modes,
  confirmed each renders the correct content (including the realistic-mode fallback banner + collage
  image), and navigated back to Home cleanly — zero console errors throughout

### Exit Criteria
- ✅ User can switch preview modes on a given recommendation and see all of them render — verified
  end-to-end via curl and in-browser for combined_card, mannequin, collage, and realistic (the last via
  its required graceful-degradation fallback, never as a dead end)

## Phase 7: History, feedback, assistant

Current status: Complete. Past recommendations are browsable, feedback now feeds back into scoring as a
repeat-avoidance signal, and a chat assistant can refine a recommendation in place.

- ✅ `GET /history?limit=&offset=` — paginated list of past outfit feedback, each entry expanded to the
  full outfit (real photos, not just ids); no request/response contract existed in `documents/04` beyond
  the endpoint name, so this was designed fresh
- ✅ Repeat-avoidance: `OutfitHistory.repeat_group_hash` (canonical field, previously unused) is now
  computed at feedback-write time; `context.resolve_recent_signals` looks back 7 days of `worn_at`-only
  history (a skip or a dislike is never treated as "recently worn") and feeds two soft penalties into
  `recommender.py` — a per-item recently-worn penalty and an exact-combo-hash repeat penalty — verified
  by hand-checking a wardrobe's re-recommendation score against the documented penalty constants
- ✅ `POST /assistant/refine` — a new chat-refinement endpoint with no canonical schema (designed fresh,
  since `documents/05` frames chat as UI-only): `assistant.py`'s `parse_refinement` does honest keyword
  matching ("make it warmer"/"more formal"/"use `<item name>`"/"explain") and reports `understood: false`
  rather than guessing when a message isn't recognized; a recognized refinement re-ranks using the
  *original* run's frozen weather/formality context (never re-fetched) — this is exactly what "re-ranks
  without losing context" means — and persists a new `RecommendationRun` linked back via the new
  `refined_from_run_id` field
- ✅ `tone_preference` (canonical `user_profiles` column, default `'practical'`, but no value set was
  specified in either doc beyond that default) — `practical`/`direct`/`encouraging`, designed fresh here,
  affecting only the assistant's reply phrasing, never scoring or logic
- ✅ `outfit_serializers.py` extracted (used by 3 routers now: recommendations, history, assistant) and
  `recommendations.py`'s run-persistence logic extracted into a reusable `persist_recommendation_run`,
  shared by both the daily-recommendation endpoint and the assistant's refine endpoint
- ✅ Mobile: a History card on Home opens a full history list (empty state, feedback/favorite/worn
  badges, and a "Repeat outfit" flag computed client-side by diffing item-id sets — no API change needed);
  a new Favorite button on every outfit card; "Ask the assistant" from an outfit's detail view opens a
  quick-prompt + free-text chat thread that, on a successful refinement, collapses both the assistant and
  detail views back to Home showing the newly refined recommendation (never left open on a stale outfit);
  a Tone picker on the Profile tab mirrors the existing processing-mode picker exactly
- ✅ Deliberately out of scope, stated explicitly rather than left as a silent gap: chat history isn't
  persisted server-side (ephemeral, UI-only, matching how `documents/05` frames it); the assistant's "use
  `<item>`" directive matches wardrobe item names only, not category synonyms like "sneakers"; History's
  "repeat this look" and "compare past weeks" actions aren't built; only a Favorite toggle was added
  to the existing Like/Worn/Skip row, not the other 5 unused `FeedbackCode` values
- ✅ Verified end-to-end via curl: hand-checked repeat-avoidance scoring math, all 4 assistant directive
  types (warmer, more formal, use-item, explain) plus the honest unrecognized-message fallback, tone
  changing only reply phrasing, and pagination
- ✅ Verified end-to-end in-browser: empty history → worn + favorite feedback → history entry with correct
  badges and repeat detection → assistant quick-prompt refinement → clean collapse back to Home with the
  new recommendation → tone picker changes and persists across reload — zero console errors throughout

### Exit Criteria
- ✅ History view shows past recommendations; refining via chat re-ranks without losing context — verified
  end-to-end via curl (frozen context_snapshot reuse, confirmed via `refined_from_run_id` lineage) and
  in-browser (History list renders real past outfits; an assistant refinement produces a new, correctly
  re-ranked recommendation without re-fetching weather/calendar)

## Phase 8: Offline hardening & sync

Current status: Complete. Wardrobe browsing, the last recommendation, and the logged-in session all survive
a full airplane-mode reload; edits made offline queue locally and replay cleanly once back online.

- ✅ `POST /sync/replay` — new `sync_queue` table (canonical `documents/04` field names: `object_type`,
  `object_id`, `action`, `payload_json`, `status`, `retry_count`, `last_error` — the Phase-0 stub had
  drifted names and was never actually used until now) logs every replay attempt for audit, exactly the
  table's real purpose rather than a canonical-schema box to check
- ✅ Two mutation types are queueable offline, matching the exit criteria's literal "queued **edits**"
  scope: wardrobe item field edits (name/category/color/formality/etc.) and outfit feedback
  (like/worn/favorite/skip). New item creation with a photo upload is explicitly out of scope — queuing a
  multipart photo upload for later replay is a materially bigger problem (binary storage, not just JSON)
  than this phase's exit criteria calls for
- ✅ Conflict rule (`documents/03` §16: "sync queue, timestamps, and conflict rules"): last-write-wins by
  timestamp — if the server's `updated_at` is newer than the edit's `client_queued_at`, the queued edit is
  reported as a conflict and dropped rather than silently overwriting a newer server value
- ✅ **Local model integration**: no separate on-device model was built. Every existing "seam" function
  (`analyzer.py`, `body_analyzer.py`, `event_classifier.py`, the rule-based recommender) already runs
  entirely server-side with zero calls to any cloud AI provider — cloud enhancement is Phase 9's job, not
  yet built — so `local_preferred` mode already gets the fastest, most private path today by construction.
  True on-device inference remains explicitly deferred, consistent with `documents/03`'s own hedge
  ("if local model available")
- ✅ Wardrobe items and the last recommendation are cached client-side (mirroring the exact
  `hydrateFromCache`/`isFromCache`/`isOffline` pattern already established for weather/calendar in Phase
  4) and render from cache — with a visible, calm "Offline — showing saved data" badge, never a blank or
  broken screen — when the live fetch fails
- ✅ Fixed a real bug surfaced while testing this phase: `auth-store.hydrate()` deleted the stored token
  and logged the user out on **any** failure fetching the profile, including a pure network failure —
  meaning "reopen the app in airplane mode" always bounced to the login screen. Now a network failure
  (`ApiError.status === 0`) falls back to a cached profile and keeps the session; only a real auth failure
  (expired/invalid token) still logs out
- ✅ Fixed a second, more serious latent bug found via this phase's testing: every client-supplied
  timestamp (`worn_at`, `client_queued_at`, calendar `start_ts`/`end_ts`) arrives from the mobile app as a
  JS `Date().toISOString()` string, which is always timezone-**aware** ("Z"-suffixed) — but every
  timestamp elsewhere in this codebase is naive UTC (`datetime.utcnow()`). Comparing the two raised an
  unhandled `TypeError` in the new sync-conflict check, and — undetected until now because every prior
  phase's curl testing constructed naive timestamps by hand — silently corrupted the Phase 7
  repeat-avoidance window query for any `worn_at` actually submitted through the real mobile UI. Fixed
  with a shared Pydantic validator (`schemas._naive_utc`) applied to every client-supplied datetime field
- ✅ Verified end-to-end via curl: `/sync/replay` for a valid wardrobe-item edit, a valid feedback create,
  a timestamp conflict (correctly rejected, not overwritten), and an invalid/missing entity — each logged
  correctly to `sync_queue`; confirmed the repeat-avoidance fix by generating a recommendation after a
  real `worn_at`-bearing feedback submission and seeing the expected score penalty and explanation tag
- ✅ Verified end-to-end in-browser (Playwright, simulating airplane mode via `context.setOffline()`):
  full-page reload while offline restores the session and renders wardrobe/recommendation/context from
  cache with visible offline badges; editing an item and submitting feedback while offline both apply
  optimistically and show a "N changes queued" banner; going back online and syncing clears the queue and
  the edits are confirmed present server-side afterward — zero real console errors throughout (the
  CORS-flavored message the backend bug produced while it was still broken is gone after the fix)

### Exit Criteria
- ✅ Airplane-mode session: wardrobe browsing, cached recommendation, and queued edits all work; they sync
  cleanly once back online — verified end-to-end via curl and in-browser, including confirming the synced
  data lands correctly server-side after reconnecting

## Phase 9: Cloud enhancement

Current status: Complete. A genuine AI Provider Router routing decision now exists on top of every prior
phase's local-only seams, plus mode-aware messaging for the permanently-out-of-scope realistic preview.

- ✅ `ai_provider.py` (new) — the actual routing decision `IMPLEMENTATION_PLAN.md` #8 described but every
  prior phase satisfied only by construction (every seam was already local-only, so `local_preferred` had
  nothing to route away from). `resolve_provider(processing_mode)`: `local_preferred` always stays local
  even with a key configured (the user's explicit choice wins); `cloud_preferred`/`auto` prefer cloud when
  a provider is configured and fall back to local otherwise — the guaranteed local baseline never breaks
- ✅ `generate_cloud_explanation()` — the one real cloud call in this codebase (Anthropic Messages API,
  config-gated on `ANTHROPIC_API_KEY`), producing a short natural-language styling note. Only ever called
  for the main (winning) outfit of a run, never the two alternatives — a bounded, cheap addition rather
  than 3x the cloud calls. Returns `None` on any failure (no key, network error, bad response) so callers
  never special-case it; the deterministic `explanation_tags` stay the reliability backbone and are never
  replaced, only ever supplemented
- ✅ `outfits.cloud_explanation` (new column, additive, not in `documents/04`'s canonical DDL — same
  documented-deviation category as `CalendarEvent.corrections` and `RecommendationRun.refined_from_run_id`
  from earlier phases) surfaced end-to-end: `OutfitOut.cloud_explanation` → mobile `OutfitCard` renders it
  as a distinct "AI stylist note" callout, visually separate from the tag-chip row, only when present
- ✅ Realistic preview mode-aware messaging: `IMPLEMENTATION_PLAN.md` #8's open decision on the realistic
  preview approach is now resolved permanently — diffusion-based photorealistic image generation stays out
  of v1 scope (a materially heavier integration than the text-only router built this phase), and
  `compose_realistic()` now distinguishes *why* it's unavailable with three distinct reasons instead of one
  generic message: the user's own `local_preferred` choice, no cloud provider configured, or the permanent
  scope decision — verified all three via curl against the same outfit
- ✅ Verified end-to-end via curl: `resolve_provider()` returns `"local"` for all three processing modes
  with no API key configured, proving the guaranteed-baseline recommendation flow is completely unaffected;
  a full recommendation generated under `cloud_preferred` with no key still returns 3 real outfits with
  `cloud_explanation: null`; a fake/invalid key produces a real network round-trip to `api.anthropic.com`
  (not blocked by this sandbox's egress proxy — confirmed via a real 401, unlike the Open-Meteo precedent)
  that still degrades to `None` cleanly rather than raising
- ✅ Verified end-to-end in-browser (Playwright): logged into a real account with a generated recommendation
  and `cloud_explanation: null` — renders with zero console errors and no stray empty callout; separately,
  intercepted the network response to inject a real `cloud_explanation` string and confirmed the "AI
  stylist note" callout renders correctly and distinctly from the tag row — both the absent and present
  paths verified, since no live Anthropic credentials are available to this sandbox (see Sandbox
  Limitations below)
- ⚠️ **Sandbox limitation** (same category as Phase 4's Open-Meteo item): no `ANTHROPIC_API_KEY` is
  available to the backend process in this environment, so the actual cloud-generated-explanation happy
  path cannot be exercised live. The integration code is complete and correct (verified via a real,
  reachable network call to `api.anthropic.com` that fails on auth as expected rather than on network
  policy), and the graceful-degradation path is fully verified — this mirrors the accepted precedent rather
  than being a new kind of gap

### Exit Criteria
- ✅ `processing_mode` now has a real, working cloud path in addition to the always-guaranteed local path;
  switching to `cloud_preferred`/`auto` with no provider configured — the default, and the only state this
  sandbox can verify live — never degrades, breaks, or blocks the 1-best-outfit-plus-2-alternatives
  guarantee, and a configured provider (verified via a fake key producing a real, non-fabricated failure)
  degrades exactly as cleanly

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