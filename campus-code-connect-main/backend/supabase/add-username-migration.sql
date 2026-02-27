-- =====================================================
-- MIGRATION: Add username column to profiles table
-- Run this in Supabase SQL Editor if the profiles table already exists
-- =====================================================

-- Add username column if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username text;

-- Create index for faster searches on username
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Update seed data (optional - set username based on email or name)
UPDATE profiles 
SET username = LOWER(REPLACE(SUBSTRING_INDEX(email, '@', 1), '.', '_'))
WHERE username IS NULL AND email IS NOT NULL;

-- You can now search by username, name, and email in the connections API
SELECT 'Migration completed successfully' as status;
