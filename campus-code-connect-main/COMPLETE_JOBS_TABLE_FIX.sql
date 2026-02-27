-- ========================================================================
-- COMPLETE FIX FOR JOBS TABLE - RUN THIS IN SUPABASE SQL EDITOR
-- ========================================================================
-- This adds all missing columns that the recruiter endpoints need

-- Add recruiter_id (CRITICAL - links jobs to recruiter)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS recruiter_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Add all job detail columns
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS team text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deadline text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS status text DEFAULT 'Open';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS description text;

-- Add optional/additional columns used in schema
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS posted text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS match int DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS skills text[];

-- Add timestamps if missing
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_recruiter_id ON jobs(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);

-- ========================================================================
-- VERIFICATION - This will show you all columns in the jobs table
-- ========================================================================
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'jobs' 
ORDER BY ordinal_position;

-- ========================================================================
-- Expected columns after running this:
-- - id (uuid, primary key)
-- - recruiter_id (uuid, foreign key to profiles)
-- - title (text)
-- - team (text)
-- - company (text)
-- - location (text)
-- - type (text)
-- - salary (text)
-- - deadline (text)
-- - status (text, default 'Open')
-- - description (text)
-- - posted (text)
-- - match (integer)
-- - skills (text array)
-- - created_at (timestamptz)
-- ========================================================================
