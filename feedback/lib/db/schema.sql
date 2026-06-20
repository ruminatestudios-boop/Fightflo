-- Feedback — Supabase schema
-- Run in Supabase SQL editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sport TEXT NOT NULL DEFAULT 'boxing',
  level TEXT NOT NULL DEFAULT 'intermediate',
  is_pro BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_customer_id TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'none',
  free_analyses_used INTEGER NOT NULL DEFAULT 0,
  free_analyses_limit INTEGER NOT NULL DEFAULT 1,  -- lifetime cap for free tier; Pro capped via monthly session count (15/mo)
  bonus_scans INTEGER NOT NULL DEFAULT 0  -- Pro top-up credits (used after monthly 15)
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sport TEXT NOT NULL,
  level TEXT NOT NULL,
  video_url TEXT NOT NULL,
  video_duration INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'uploading',
  session_number INTEGER NOT NULL DEFAULT 1,
  progress_step TEXT DEFAULT 'uploading',
  progress_message TEXT DEFAULT 'Uploading your video...',
  cloudinary_public_id TEXT,
  display_name TEXT,
  summary TEXT,
  thumbnail_url TEXT,
  parent_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sport TEXT NOT NULL,
  positives JSONB NOT NULL DEFAULT '[]',
  main_weakness JSONB NOT NULL DEFAULT '{}',
  pattern_insight TEXT NOT NULL DEFAULT '',
  drill JSONB NOT NULL DEFAULT '{}',
  coach_summary TEXT NOT NULL DEFAULT '',
  raw_landmark_data JSONB,
  clips JSONB NOT NULL DEFAULT '[]',
  pose_quality JSONB,
  confirmed_events JSONB NOT NULL DEFAULT '[]',
  landmark_summary JSONB,
  follow_up_comparison JSONB,
  export_video_url TEXT
);

CREATE TABLE IF NOT EXISTS weaknesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  weakness_type TEXT NOT NULL,
  first_detected_session INTEGER NOT NULL,
  current_session INTEGER NOT NULL,
  initial_count INTEGER NOT NULL,
  current_count INTEGER NOT NULL,
  trend TEXT NOT NULL DEFAULT 'stable',
  percentage_change FLOAT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  fixed_at_session INTEGER
);

CREATE TABLE IF NOT EXISTS clips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  timestamp TEXT NOT NULL,
  clip_url TEXT NOT NULL,
  clip_type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_reports_session_id ON reports(session_id);
CREATE INDEX IF NOT EXISTS idx_weaknesses_user_id ON weaknesses(user_id);
CREATE INDEX IF NOT EXISTS idx_clips_report_id ON clips(report_id);

-- ALTER TABLE users ADD COLUMN IF NOT EXISTS bonus_scans INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE sessions ADD COLUMN IF NOT EXISTS summary TEXT;
-- ALTER TABLE sessions ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
-- ALTER TABLE reports ADD COLUMN IF NOT EXISTS pose_quality JSONB;
-- ALTER TABLE reports ADD COLUMN IF NOT EXISTS confirmed_events JSONB NOT NULL DEFAULT '[]';
-- ALTER TABLE reports ADD COLUMN IF NOT EXISTS landmark_summary JSONB;
-- ALTER TABLE sessions ADD COLUMN IF NOT EXISTS parent_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL;
-- ALTER TABLE reports ADD COLUMN IF NOT EXISTS follow_up_comparison JSONB;
-- ALTER TABLE reports ADD COLUMN IF NOT EXISTS export_video_url TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS secondary_weaknesses JSONB NOT NULL DEFAULT '[]';

-- Selective beta invite links — each code has its own capped scan budget,
-- separate from the single CREW_ACCESS_TOKEN (which stays unlimited/daily for personal testing).
CREATE TABLE IF NOT EXISTS invite_codes (
  code TEXT PRIMARY KEY,
  label TEXT,
  total_limit INTEGER NOT NULL,
  used_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
