-- ========================================================================
-- COMPLETE RECRUITER FUNCTIONALITY FIX
-- Run this entire script in Supabase SQL Editor
-- ========================================================================
-- This will create/fix all tables needed for recruiter features:
-- - Jobs table (with all columns)
-- - Applications table (pipeline)
-- - Recruiter saved candidates
-- - Recruiter interviews
-- - Recruiter settings
-- ========================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================================================
-- 1. FIX JOBS TABLE
-- ========================================================================

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Add all required columns
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS recruiter_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS team text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deadline text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS status text DEFAULT 'Open';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS posted text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS match int DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS skills text[];
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_jobs_recruiter_id ON jobs(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);

-- ========================================================================
-- 2. FIX APPLICATIONS TABLE (Pipeline)
-- ========================================================================

CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  recruiter_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'New',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_application UNIQUE (job_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_recruiter_id ON applications(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- ========================================================================
-- 3. FIX RECRUITER SAVED CANDIDATES TABLE
-- ========================================================================

CREATE TABLE IF NOT EXISTS recruiter_saved_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_saved_candidate UNIQUE (recruiter_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_recruiter_saved_candidates_recruiter_id ON recruiter_saved_candidates(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_saved_candidates_candidate_id ON recruiter_saved_candidates(candidate_id);

-- ========================================================================
-- 4. FIX RECRUITER INTERVIEWS TABLE
-- ========================================================================

CREATE TABLE IF NOT EXISTS recruiter_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  candidate_name text,
  job_title text,
  interviewer text,
  interview_date date,
  interview_time text,
  location text,
  status text DEFAULT 'Scheduled',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recruiter_interviews_recruiter_id ON recruiter_interviews(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_interviews_date ON recruiter_interviews(interview_date);
CREATE INDEX IF NOT EXISTS idx_recruiter_interviews_status ON recruiter_interviews(status);

-- ========================================================================
-- 5. FIX RECRUITER SETTINGS TABLE
-- ========================================================================

CREATE TABLE IF NOT EXISTS recruiter_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recruiter_settings_recruiter_id ON recruiter_settings(recruiter_id);

-- ========================================================================
-- VERIFICATION QUERIES
-- ========================================================================

-- Check jobs table columns
SELECT 'JOBS TABLE COLUMNS:' as info;
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'jobs' 
ORDER BY ordinal_position;

-- Check applications table columns
SELECT 'APPLICATIONS TABLE COLUMNS:' as info;
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'applications' 
ORDER BY ordinal_position;

-- Check other tables exist
SELECT 'ALL RECRUITER TABLES:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('jobs', 'applications', 'recruiter_saved_candidates', 'recruiter_interviews', 'recruiter_settings')
ORDER BY table_name;

-- ========================================================================
-- SUCCESS MESSAGE
-- ========================================================================
-- If you see the verification results above without errors, you're done!
-- Now refresh your browser on /recruiter/jobs and /recruiter/applicants
-- ========================================================================
