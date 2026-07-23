# AI_Stylish — AI Personal Wardrobe Assistant

Men's-first hybrid AI wardrobe assistant. Recommends one best outfit plus two alternatives from the user's *own* wardrobe, using body-aware analysis, style preferences, calendar/routine context, location, and live weather, then shows the exact wardrobe item photos together in one visual outfit preview.

## Before doing anything else

Read `IMPLEMENTATION_PLAN.md` at the repo root — it is the build-ready synthesis of all planning documents and defines repo structure, tech stack, phase sequencing, API order, and data model. Source planning documents live in `documents/` (`documents/README.md` indexes them); the System Design Document (`documents/04`) is the source of truth for entity, table, and endpoint naming — never rename or restructure those without updating it.

## Non-negotiable product contract

Any change that weakens these is a regression, not a simplification:

- Recommendations are always **1 best outfit + 2 alternatives**, built only from wardrobe items the user actually owns.
- Output is always **visual** — the real wardrobe item photos shown together — never a text-only list.
- All AI detections (body traits, clothing tags, event/occasion inference) must remain **user-correctable**, and corrections must override the AI value going forward.
- Processing mode (`auto` / `local_preferred` / `cloud_preferred`) is a first-class, per-user setting from day one — don't hardcode a single provider or make cloud mandatory.
- **Deterministic collage preview is the guaranteed baseline.** Realistic AI-generated preview is an enhancement mode that must degrade gracefully, never the only path.
- V1 scope: men-only styling, single profile per account, no shopping/commerce features.

## How to work in this repo

- One vertical slice at a time (e.g. "wardrobe item upload end-to-end," not "the wardrobe module").
- Every feature task splits into: client flow, API endpoint, storage, correction/edit UI, empty/loading/error/offline states, tests — see `IMPLEMENTATION_PLAN.md` §5.
- State your file list, tests, and assumptions alongside any non-trivial change.
- Follow the phase order in `IMPLEMENTATION_PLAN.md` §4; each phase should leave the app in a working, demoable state. Phase 5 ("guaranteed baseline": auth → wardrobe → context → recommendation → 1 preview mode) is the minimum credible product — don't build past it without that path working end to end.
- Keep naming identical to `documents/04_System_Design_Document.docx` and `documents/05_Product_Interface_Design.docx`. This project's biggest asset is that nothing has drifted between planning and design — preserve that discipline into code.
