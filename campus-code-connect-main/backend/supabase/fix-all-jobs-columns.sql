-- Complete fix for all missing columns in jobs table
-- Run this in Supabase SQL Editor

-- Add all potentially missing columns
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

-- Verify all columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'jobs' 
ORDER BY ordinal_position;
