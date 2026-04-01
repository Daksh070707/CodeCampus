-- Add optional attachment/link columns to posts table
-- Safe to run multiple times

ALTER TABLE posts
ADD COLUMN IF NOT EXISTS image text;

ALTER TABLE posts
ADD COLUMN IF NOT EXISTS document_link text;

-- Optional: help debug/verify column presence
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'posts'
  AND column_name IN ('image', 'document_link')
ORDER BY column_name;
