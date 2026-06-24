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
  free_analyses_limit INTEGER NOT NULL DEFAULT 3,  -- lifetime cap for free tier; Pro capped via monthly session count (15/mo)
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

-- Per-scan cost breakdown — Gemini + Cloudinary + Vercel compute estimates.
CREATE TABLE IF NOT EXISTS scan_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID,
  user_id UUID,
  sport TEXT,
  status TEXT NOT NULL,
  pipeline TEXT NOT NULL,
  video_duration_sec INTEGER NOT NULL DEFAULT 0,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  gemini_usd NUMERIC NOT NULL DEFAULT 0,
  cloudinary_usd NUMERIC NOT NULL DEFAULT 0,
  compute_usd NUMERIC NOT NULL DEFAULT 0,
  total_usd NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_costs_user_id ON scan_costs(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_costs_created_at ON scan_costs(created_at);

-- Affiliate/creator codes — each code pays a commission per sale, either a
-- flat amount or a percentage of the sale, set per creator.
CREATE TABLE IF NOT EXISTS affiliate_codes (
  code TEXT PRIMARY KEY,
  creator_name TEXT NOT NULL,
  commission_type TEXT NOT NULL DEFAULT 'percent', -- 'percent' or 'flat'
  commission_value NUMERIC NOT NULL DEFAULT 0,      -- percent (0-100) or flat USD amount
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ledger of commissions owed/paid per sale attributed to an affiliate code.
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL REFERENCES affiliate_codes(code) ON DELETE CASCADE,
  creator_name TEXT NOT NULL,
  stripe_session_id TEXT UNIQUE,
  sale_amount_usd NUMERIC NOT NULL DEFAULT 0,
  commission_usd NUMERIC NOT NULL DEFAULT 0,
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_code ON affiliate_commissions(code);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_paid ON affiliate_commissions(paid);

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS invite_code TEXT;
ALTER TABLE scan_costs ADD COLUMN IF NOT EXISTS invite_code TEXT;

-- Free tier is 3 scans, not 1 — fix the default for new signups and bump
-- existing free users who hadn't already used more than 1.
ALTER TABLE users ALTER COLUMN free_analyses_limit SET DEFAULT 3;
UPDATE users SET free_analyses_limit = 3 WHERE free_analyses_limit < 3;

-- Client-side error log — lets the operator see real user errors without
-- needing device access or a support ticket.
CREATE TABLE IF NOT EXISTS client_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message TEXT NOT NULL,
  stack TEXT,
  context TEXT,
  url TEXT,
  user_agent TEXT,
  user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_errors_created_at ON client_errors(created_at);

-- These two were never actually applied to production (left as commented
-- templates above by mistake), so every report save silently fell back to
-- a smaller payload that also dropped landmark_summary/follow_up_comparison/
-- secondary_weaknesses (same insert, one missing column fails the whole row).
ALTER TABLE reports ADD COLUMN IF NOT EXISTS pose_quality JSONB;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS confirmed_events JSONB NOT NULL DEFAULT '[]';

-- Public testimonial submissions — link goes out to real users so the
-- operator doesn't have to text each person individually for a review.
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  body TEXT NOT NULL,
  rating INTEGER,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_testimonials_created_at ON testimonials(created_at);
