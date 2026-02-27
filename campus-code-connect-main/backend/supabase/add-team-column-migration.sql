-- Migration: Add missing 'team' column to jobs table
-- This adds the column only if it doesn't already exist

DO $$ 
BEGIN
    -- Check if the 'team' column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'jobs' 
        AND column_name = 'team'
    ) THEN
        ALTER TABLE jobs ADD COLUMN team text;
        RAISE NOTICE 'Column "team" added to jobs table';
    ELSE
        RAISE NOTICE 'Column "team" already exists in jobs table';
    END IF;
END $$;

-- Verify the column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'jobs' 
ORDER BY ordinal_position;
