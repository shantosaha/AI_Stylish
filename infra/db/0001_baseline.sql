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

-- Outfits (combinations of wardrobe items)
CREATE TABLE outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wardrobe_item_ids UUID[] NOT NULL,
  score FLOAT DEFAULT 0.0,
  explanation TEXT,
  tags VARCHAR(255)[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recommendation runs (snapshot of one recommendation session with 3 outfits)
CREATE TABLE recommendation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  context JSONB NOT NULL, -- weather, events, routine, location snapshot
  main_outfit_id UUID NOT NULL REFERENCES outfits(id),
  alt_outfit_1_id UUID NOT NULL REFERENCES outfits(id),
  alt_outfit_2_id UUID NOT NULL REFERENCES outfits(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Outfit history (worn/liked/skipped feedback, separate from runs)
CREATE TABLE outfit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outfit_id UUID NOT NULL REFERENCES outfits(id),
  recommendation_run_id UUID REFERENCES recommendation_runs(id),
  feedback VARCHAR(50), -- liked, worn, skipped, neutral
  worn_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Preview assets (rendered outfit previews)
CREATE TABLE preview_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  preview_type VARCHAR(50) NOT NULL, -- card, mannequin, collage, realistic
  image_url VARCHAR(1024) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sync queue for offline changes
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  operation VARCHAR(50) NOT NULL, -- create, update, delete
  payload JSONB NOT NULL,
  is_synced BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_wardrobe_items_user ON wardrobe_items(user_id);
CREATE INDEX idx_body_images_user ON body_images(user_id);
CREATE INDEX idx_body_analysis_results_user ON body_analysis_results(user_id);
CREATE INDEX idx_recommendation_runs_user ON recommendation_runs(user_id);
CREATE INDEX idx_outfit_history_user ON outfit_history(user_id);
CREATE INDEX idx_sync_queue_user ON sync_queue(user_id);
CREATE INDEX idx_sync_queue_synced ON sync_queue(is_synced);
