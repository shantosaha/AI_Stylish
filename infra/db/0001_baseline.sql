-- AI Personal Wardrobe Assistant - Baseline Schema
-- Phase 0-1: Core tables for users, profiles, and authentication

-- Users table (managed by auth provider, but we track locally)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User profiles (one per account per the design)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  bio TEXT,
  style_preferences JSONB DEFAULT '{}',
  processing_mode VARCHAR(50) DEFAULT 'auto', -- auto, local_preferred, cloud_preferred
  tone_preference VARCHAR(50) DEFAULT 'practical', -- practical, direct, encouraging - value set designed in Phase 7, doc only specifies the default
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Body images for analysis
CREATE TABLE body_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url VARCHAR(1024) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure only one primary body image per user
CREATE UNIQUE INDEX idx_body_images_user_primary ON body_images(user_id)
WHERE is_primary = TRUE;

-- Body analysis results (separate from raw images)
CREATE TABLE body_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body_shape VARCHAR(100),
  skin_tone VARCHAR(100),
  face_shape VARCHAR(100),
  height VARCHAR(50),
  proportions JSONB DEFAULT '{}',
  confidence FLOAT DEFAULT 0.0,
  corrections JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wardrobe items
CREATE TABLE wardrobe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL, -- tops, bottoms, outerwear, shoes, accessories, bags, jewelry
  name VARCHAR(255) NOT NULL,
  color VARCHAR(100),
  pattern VARCHAR(100),
  material VARCHAR(100),
  brand VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wardrobe item images (separate from analysis results)
CREATE TABLE wardrobe_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wardrobe_item_id UUID NOT NULL REFERENCES wardrobe_items(id) ON DELETE CASCADE,
  image_url VARCHAR(1024) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure only one primary image per wardrobe item
CREATE UNIQUE INDEX idx_wardrobe_images_item_primary ON wardrobe_images(wardrobe_item_id)
WHERE is_primary = TRUE;

-- Item analysis results (auto-detected tags, separate from raw images)
CREATE TABLE item_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wardrobe_item_id UUID NOT NULL REFERENCES wardrobe_items(id) ON DELETE CASCADE,
  detected_category VARCHAR(50),
  confidence FLOAT DEFAULT 0.0,
  detected_color VARCHAR(100),
  detected_pattern VARCHAR(100),
  detected_material VARCHAR(100),
  detected_brand VARCHAR(100),
  corrections JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Phase 4: Context engine
-- NOTE: keyed on user_id -> users.id (not user_profile_id -> user_profiles.id)
-- for consistency with every other table in this schema; documents/04's
-- canonical DDL uses user_profile_id, but the established convention in this
-- codebase (see the sync_queue note above) is user_id. Table/column names
-- otherwise match documents/04 verbatim.
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL DEFAULT 'device_calendar', -- device_calendar, manual
  external_id VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  start_ts TIMESTAMP NOT NULL,
  end_ts TIMESTAMP,
  location VARCHAR(255),
  inferred_event_type VARCHAR(50),
  inferred_formality VARCHAR(50),
  context_json JSONB DEFAULT '{}',
  corrections JSONB DEFAULT '{}', -- not in documents/04 canonical DDL; added for the
                                   -- corrections-audit pattern used on every other
                                   -- AI-inferred field in this codebase
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_calendar_events_user_time ON calendar_events(user_id, start_ts);

-- recurrence_rule is free text and intentionally never parsed - routine
-- applicability is decided purely by time_block matching the current
-- computed block (see apps/api/context.py resolve_time_block).
CREATE TABLE routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  recurrence_rule VARCHAR(255) NOT NULL,
  time_block VARCHAR(50), -- morning, workday, evening, night
  default_event_type VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_hash VARCHAR(64) NOT NULL, -- rounded "lat,lon" string, not a cryptographic hash
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  forecast_json JSONB DEFAULT '{}'
);
CREATE INDEX idx_weather_cache_user_fetch ON weather_cache(user_id, fetched_at DESC);

-- Outfits (combinations of wardrobe items). Field names/FKs match
-- documents/04's canonical DDL (top/bottom/outerwear/shoe_item_id slots,
-- not a wardrobe_item_ids array); user_id kept per the drift note above
-- rather than the doc's user_profile_id.
CREATE TABLE outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  top_item_id UUID REFERENCES wardrobe_items(id) ON DELETE SET NULL,
  bottom_item_id UUID REFERENCES wardrobe_items(id) ON DELETE SET NULL,
  outerwear_item_id UUID REFERENCES wardrobe_items(id) ON DELETE SET NULL,
  shoe_item_id UUID REFERENCES wardrobe_items(id) ON DELETE SET NULL,
  accessory_item_ids_json JSONB NOT NULL DEFAULT '[]', -- always empty through Phase 6
  score NUMERIC(7,2) DEFAULT 0.0,
  explanation_tags_json JSONB NOT NULL DEFAULT '[]',
  -- Not in documents/04's canonical DDL. Phase 9: a richer, natural-language
  -- styling note from the AI Provider Router's cloud path, additive to
  -- explanation_tags_json (never a replacement) - null whenever
  -- cloud_preferred/auto resolves to local, or the call fails for any reason.
  cloud_explanation TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_outfits_user_created ON outfits(user_id, created_at DESC);

-- Recommendation runs (snapshot of one recommendation session with 3 outfits)
CREATE TABLE recommendation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  context_snapshot_json JSONB NOT NULL DEFAULT '{}', -- weather, events, routine, location snapshot
  main_outfit_id UUID REFERENCES outfits(id) ON DELETE SET NULL,
  alt_1_outfit_id UUID REFERENCES outfits(id) ON DELETE SET NULL,
  alt_2_outfit_id UUID REFERENCES outfits(id) ON DELETE SET NULL,
  refined_from_run_id UUID REFERENCES recommendation_runs(id) ON DELETE SET NULL, -- not in documents/04; Phase 7 chat-refinement lineage
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_recommendation_runs_user_created ON recommendation_runs(user_id, created_at DESC);

-- Outfit history (worn/liked/skipped feedback, separate from runs)
CREATE TABLE outfit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  recommendation_run_id UUID REFERENCES recommendation_runs(id) ON DELETE SET NULL,
  feedback_code VARCHAR(50), -- like, worn, favorite, too_hot, too_cold, too_formal, too_casual, not_my_style, skip
  is_favorite BOOLEAN DEFAULT FALSE,
  worn_at TIMESTAMP,
  repeat_group_hash VARCHAR(64), -- order-independent hash of the outfit's item-slot ids, computed at feedback-write time
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_outfit_history_repeat_hash ON outfit_history(repeat_group_hash);

-- Preview assets (rendered outfit previews). No user_id column, same as
-- documents/04's canonical DDL - ownership flows through outfit_id.
CREATE TABLE preview_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  preview_type VARCHAR(50) NOT NULL, -- combined_card, mannequin, collage, realistic
  local_uri VARCHAR(1024),
  cloud_uri VARCHAR(1024),
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, running, ready, failed
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sync queue for offline changes (Phase 8). Field names/enum match
-- documents/04's canonical DDL exactly (object_type/object_id/action/
-- payload_json/status/retry_count/last_error) - this table was a Phase-0
-- stub with drifted names (entity_type/entity_id/operation/is_synced/
-- synced_at) until Phase 8 actually built the replay endpoint against it.
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  object_type VARCHAR(50) NOT NULL, -- wardrobe_item, outfit_feedback
  object_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL, -- update, create
  payload_json JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(50) NOT NULL DEFAULT 'queued', -- queued, running, done, failed
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_wardrobe_items_user ON wardrobe_items(user_id);
CREATE INDEX idx_body_images_user ON body_images(user_id);
CREATE INDEX idx_body_analysis_results_user ON body_analysis_results(user_id);
CREATE INDEX idx_outfit_history_user ON outfit_history(user_id);
CREATE INDEX idx_preview_assets_outfit ON preview_assets(outfit_id);
CREATE INDEX idx_sync_queue_user ON sync_queue(user_id);
CREATE INDEX idx_sync_queue_status ON sync_queue(status);
