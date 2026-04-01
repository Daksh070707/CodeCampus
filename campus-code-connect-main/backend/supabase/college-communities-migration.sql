-- College Communities Schema
-- Add college-based community features to CodeCampus

-- Create college_communities table
CREATE TABLE IF NOT EXISTS college_communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_name TEXT UNIQUE NOT NULL,
  description TEXT,
  member_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create community_members table
CREATE TABLE IF NOT EXISTS community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES college_communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'admin' or 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_college_communities_name ON college_communities(college_name);
CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_role ON community_members(role);

-- Enable RLS
ALTER TABLE college_communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for college_communities
CREATE POLICY "college_communities_select_public" ON college_communities
  FOR SELECT USING (true);

CREATE POLICY "college_communities_insert_service" ON college_communities
  FOR INSERT WITH CHECK (true);

CREATE POLICY "college_communities_update_admin" ON college_communities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = college_communities.id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = college_communities.id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
    )
  );

-- RLS Policies for community_members
CREATE POLICY "community_members_select_members" ON community_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM community_members cm2
      WHERE cm2.community_id = community_members.community_id
      AND cm2.user_id = auth.uid()
    )
  );

CREATE POLICY "community_members_insert_own" ON community_members
  FOR INSERT WITH CHECK (user_id = auth.uid() OR true);

CREATE POLICY "community_members_update_admin" ON community_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_members.community_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
    )
  );

CREATE POLICY "community_members_delete_admin_or_self" ON community_members
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_members.community_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
    )
  );

-- Trigger to update member count when members are added/removed
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE college_communities
  SET member_count = (
    SELECT COUNT(*) FROM community_members
    WHERE community_id = COALESCE(NEW.community_id, OLD.community_id)
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.community_id, OLD.community_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER community_member_count_trigger
AFTER INSERT OR DELETE ON community_members
FOR EACH ROW
EXECUTE FUNCTION update_community_member_count();

-- Helper function to add student to college community
CREATE OR REPLACE FUNCTION add_student_to_college_community(
  p_student_id UUID,
  p_college_name TEXT
)
RETURNS UUID AS $$
DECLARE
  v_community_id UUID;
BEGIN
  -- Get or create community for this college
  SELECT id INTO v_community_id FROM college_communities
  WHERE college_name = p_college_name;
  
  IF v_community_id IS NULL THEN
    INSERT INTO college_communities (college_name, description)
    VALUES (p_college_name, 'Community for ' || p_college_name || ' students')
    RETURNING id INTO v_community_id;
  END IF;
  
  -- Add student to community (if not already a member)
  INSERT INTO community_members (community_id, user_id, role)
  VALUES (v_community_id, p_student_id, 'member')
  ON CONFLICT (community_id, user_id) DO NOTHING;
  
  RETURN v_community_id;
END;
$$ LANGUAGE plpgsql;
