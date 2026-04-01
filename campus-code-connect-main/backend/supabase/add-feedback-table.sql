-- Migration: Add Feedback Table
-- Allows users to submit feedback, feature requests, and bug reports

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can insert feedback (no authentication required)
CREATE POLICY "feedback_insert_public" ON feedback
  FOR INSERT
  WITH CHECK (true);

-- Only authenticated users can view feedback (but each can only view their own)
CREATE POLICY "feedback_select_own" ON feedback
  FOR SELECT
  USING (email = current_user_email() OR current_user_role() = 'admin');

-- Add comment
COMMENT ON TABLE feedback IS 'User feedback, bug reports, and feature requests';
COMMENT ON COLUMN feedback.category IS 'Type: general, bug, feature, support';
COMMENT ON COLUMN feedback.status IS 'Status: new, reviewing, addressed, closed';
