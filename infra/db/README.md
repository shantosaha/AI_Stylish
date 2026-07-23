# Database Migrations

SQL migrations for the AI Stylish PostgreSQL database, numbered in sequence.

## Running migrations

When using Supabase:
1. Copy the SQL from `0001_baseline.sql`
2. Paste into the Supabase SQL editor in your project dashboard
3. Click "Run"

For local development with PostgreSQL:
```bash
psql -U postgres -d ai_stylish < 0001_baseline.sql
```

## Schema overview

See the IMPLEMENTATION_PLAN.md §6 (Data layer) for design rationale. Key principles:
- Raw media (body_images, wardrobe_images) stays separate from derived results (body_analysis_results, item_analysis_results)
- recommendation_runs stores a complete context snapshot + 3 outfit references independently
- outfit_history is separate from runs — favorites/worn/feedback outlive any single run
- sync_queue is keyed on user_id (not user_profile_id) per the Diagram Pack class diagram
- Partial unique indexes enforce one primary body image and one primary wardrobe image per owner

## Future migrations

Add new migration files in sequence:
- `0002_phase_2_features.sql`
- `0003_phase_3_features.sql`
- etc.
