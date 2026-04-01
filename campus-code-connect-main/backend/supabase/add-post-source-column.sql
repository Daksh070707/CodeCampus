-- Add source channel to posts so Feed and Community remain independent
-- Safe to run multiple times

ALTER TABLE posts
ADD COLUMN IF NOT EXISTS source text;

-- Backfill existing posts:
-- community: posts that already have a college
-- feed: posts without a college
UPDATE posts
SET source = CASE
  WHEN college IS NOT NULL AND btrim(college) <> '' THEN 'community'
  ELSE 'feed'
END
WHERE source IS NULL OR btrim(source) = '';

-- Add check constraint only if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'posts_source_check'
  ) THEN
    ALTER TABLE posts
    ADD CONSTRAINT posts_source_check CHECK (source IN ('feed', 'community'));
  END IF;
END $$;

-- Helpful index for fast tab filtering
CREATE INDEX IF NOT EXISTS idx_posts_source_created_at ON posts(source, created_at DESC);

SELECT source, count(*) AS total
FROM posts
GROUP BY source
ORDER BY source;
