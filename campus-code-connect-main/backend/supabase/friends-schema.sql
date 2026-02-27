-- =====================================================
-- FRIENDS & CONNECTIONS SYSTEM FOR CODECAMPUS
-- Run this in Supabase SQL Editor
-- =====================================================

-- Connections/Friends table
CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Ensure a user can't have duplicate connection requests
  CONSTRAINT unique_connection UNIQUE (user_id, friend_id),
  -- Ensure a user can't send a request to themselves
  CONSTRAINT no_self_connection CHECK (user_id != friend_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_friend_id ON connections(friend_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
CREATE INDEX IF NOT EXISTS idx_connections_user_status ON connections(user_id, status);
CREATE INDEX IF NOT EXISTS idx_connections_friend_status ON connections(friend_id, status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_connections_updated_at ON connections;
CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to send friend request (prevents duplicates and reverse requests)
CREATE OR REPLACE FUNCTION send_friend_request(sender_id uuid, receiver_id uuid)
RETURNS jsonb AS $$
DECLARE
  existing_request connections;
  reverse_request connections;
  new_request connections;
BEGIN
  -- Check if users are the same
  IF sender_id = receiver_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot send friend request to yourself');
  END IF;

  -- Check if request already exists
  SELECT * INTO existing_request FROM connections 
  WHERE user_id = sender_id AND friend_id = receiver_id;
  
  IF existing_request.id IS NOT NULL THEN
    IF existing_request.status = 'pending' THEN
      RETURN jsonb_build_object('success', false, 'message', 'Friend request already sent');
    ELSIF existing_request.status = 'accepted' THEN
      RETURN jsonb_build_object('success', false, 'message', 'Already friends');
    ELSIF existing_request.status = 'blocked' THEN
      RETURN jsonb_build_object('success', false, 'message', 'Cannot send request');
    END IF;
  END IF;

  -- Check for reverse request (they sent us a request)
  SELECT * INTO reverse_request FROM connections 
  WHERE user_id = receiver_id AND friend_id = sender_id;
  
  IF reverse_request.id IS NOT NULL AND reverse_request.status = 'pending' THEN
    -- Auto-accept if they already sent us a request
    UPDATE connections SET status = 'accepted', updated_at = NOW()
    WHERE id = reverse_request.id;
    
    -- Create reciprocal connection
    INSERT INTO connections (user_id, friend_id, status)
    VALUES (sender_id, receiver_id, 'accepted')
    RETURNING * INTO new_request;
    
    RETURN jsonb_build_object('success', true, 'message', 'Friend request accepted automatically', 'auto_accepted', true);
  END IF;

  -- Create new friend request
  INSERT INTO connections (user_id, friend_id, status)
  VALUES (sender_id, receiver_id, 'pending')
  RETURNING * INTO new_request;

  RETURN jsonb_build_object('success', true, 'message', 'Friend request sent', 'request', row_to_json(new_request));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept friend request
CREATE OR REPLACE FUNCTION accept_friend_request(request_id uuid, accepter_id uuid)
RETURNS jsonb AS $$
DECLARE
  friend_request connections;
  reciprocal_connection connections;
BEGIN
  -- Get the request
  SELECT * INTO friend_request FROM connections 
  WHERE id = request_id AND friend_id = accepter_id AND status = 'pending';
  
  IF friend_request.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Friend request not found');
  END IF;

  -- Update to accepted
  UPDATE connections SET status = 'accepted', updated_at = NOW()
  WHERE id = request_id;

  -- Create reciprocal connection
  INSERT INTO connections (user_id, friend_id, status)
  VALUES (accepter_id, friend_request.user_id, 'accepted')
  ON CONFLICT (user_id, friend_id) 
  DO UPDATE SET status = 'accepted', updated_at = NOW()
  RETURNING * INTO reciprocal_connection;

  RETURN jsonb_build_object('success', true, 'message', 'Friend request accepted');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decline/remove friend request or unfriend
CREATE OR REPLACE FUNCTION remove_connection(connection_id uuid, user_id_param uuid)
RETURNS jsonb AS $$
DECLARE
  conn connections;
  reverse_conn connections;
BEGIN
  -- Get the connection
  SELECT * INTO conn FROM connections 
  WHERE id = connection_id AND (user_id = user_id_param OR friend_id = user_id_param);
  
  IF conn.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Connection not found');
  END IF;

  -- Delete the connection
  DELETE FROM connections WHERE id = connection_id;

  -- Delete reciprocal connection if it exists
  IF conn.status = 'accepted' THEN
    DELETE FROM connections 
    WHERE user_id = conn.friend_id AND friend_id = conn.user_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Connection removed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View to get all friends (bidirectional)
CREATE OR REPLACE VIEW user_friends AS
SELECT DISTINCT
  c.user_id,
  CASE 
    WHEN c.user_id < c.friend_id THEN c.user_id
    ELSE c.friend_id
  END as person1_id,
  CASE 
    WHEN c.user_id < c.friend_id THEN c.friend_id
    ELSE c.user_id
  END as person2_id,
  p.id as friend_profile_id,
  p.name as friend_name,
  p.email as friend_email,
  p.avatar_url as friend_avatar,
  p.role as friend_role,
  p.college as friend_college,
  c.created_at as friends_since
FROM connections c
JOIN profiles p ON (
  (c.friend_id = p.id AND c.user_id != p.id) OR
  (c.user_id = p.id AND c.friend_id != p.id)
)
WHERE c.status = 'accepted'
  AND (c.user_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.jwt() ->> 'sub')
       OR c.friend_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.jwt() ->> 'sub'));

-- Row Level Security
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- Users can see their own connections (sent and received)
DROP POLICY IF EXISTS "connections_select_own" ON connections;
CREATE POLICY "connections_select_own" ON connections 
  FOR SELECT USING (
    user_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.jwt() ->> 'sub')
    OR friend_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.jwt() ->> 'sub')
  );

-- Users can insert their own friend requests
DROP POLICY IF EXISTS "connections_insert_own" ON connections;
CREATE POLICY "connections_insert_own" ON connections 
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.jwt() ->> 'sub')
  );

-- Users can update connections they're part of
DROP POLICY IF EXISTS "connections_update_own" ON connections;
CREATE POLICY "connections_update_own" ON connections 
  FOR UPDATE USING (
    user_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.jwt() ->> 'sub')
    OR friend_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.jwt() ->> 'sub')
  );

-- Users can delete connections they're part of
DROP POLICY IF EXISTS "connections_delete_own" ON connections;
CREATE POLICY "connections_delete_own" ON connections 
  FOR DELETE USING (
    user_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.jwt() ->> 'sub')
    OR friend_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.jwt() ->> 'sub')
  );

-- Grant access
GRANT SELECT ON user_friends TO authenticated;
GRANT SELECT ON user_friends TO anon;

-- =====================================================
-- COMPLETE! Friends system is ready.
-- =====================================================
