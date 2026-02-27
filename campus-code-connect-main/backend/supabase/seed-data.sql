-- =====================================================
-- SEED DATA FOR CODECAMPUS - DUMMY USERS & POSTS
-- Run this in Supabase SQL Editor
-- =====================================================

-- Insert dummy profiles
INSERT INTO profiles (id, name, email, role, college, avatar_url, created_at) VALUES
-- Students
(gen_random_uuid(), 'Sarah Chen', 'sarah.chen@university.edu', 'student', 'Stanford University', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', NOW() - INTERVAL '30 days'),
(gen_random_uuid(), 'Rahul Singh', 'rahul.singh@university.edu', 'student', 'IIT Delhi', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul', NOW() - INTERVAL '25 days'),
(gen_random_uuid(), 'Emma Wilson', 'emma.wilson@university.edu', 'student', 'UC Berkeley', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma', NOW() - INTERVAL '20 days'),
(gen_random_uuid(), 'Arjun Patel', 'arjun.patel@university.edu', 'student', 'MIT', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun', NOW() - INTERVAL '18 days'),
(gen_random_uuid(), 'Priya Sharma', 'priya.sharma@university.edu', 'student', 'IIT Bombay', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya', NOW() - INTERVAL '15 days'),
(gen_random_uuid(), 'James Murphy', 'james.murphy@university.edu', 'student', 'Harvard University', 'https://api.dicebear.com/7.x/avataaars/svg?seed=James', NOW() - INTERVAL '12 days'),
(gen_random_uuid(), 'Zara Khan', 'zara.khan@university.edu', 'student', 'BITS Pilani', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zara', NOW() - INTERVAL '10 days'),
(gen_random_uuid(), 'Oliver Chen', 'oliver.chen@university.edu', 'student', 'Stanford University', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver', NOW() - INTERVAL '8 days'),
(gen_random_uuid(), 'Neha Gupta', 'neha.gupta@university.edu', 'student', 'Delhi University', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Neha', NOW() - INTERVAL '7 days'),
(gen_random_uuid(), 'Liam O''Brien', 'liam.obrien@university.edu', 'student', 'UC Berkeley', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Liam', NOW() - INTERVAL '5 days'),
-- Recruiters & Mentors
(gen_random_uuid(), 'Sophia Johnson', 'sophia@google.com', 'recruiter', null, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia', NOW() - INTERVAL '20 days'),
(gen_random_uuid(), 'Vikram Desai', 'vikram@microsoft.com', 'mentor', null, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram', NOW() - INTERVAL '22 days');

-- Get the inserted profile IDs for use in posts and connections
WITH inserted_profiles AS (
  SELECT id, name, email, role, college FROM profiles 
  WHERE email LIKE '%@university.edu' OR email LIKE '%@google.com' OR email LIKE '%@microsoft.com'
  ORDER BY created_at DESC
  LIMIT 12
)
INSERT INTO posts (user_id, author, title, content, college, role, avatar_url, tags, created_at) 
SELECT 
  id,
  name,
  CASE (ROW_NUMBER() OVER (PARTITION BY id ORDER BY id)) % 4 
    WHEN 1 THEN 'Just completed my React project!'
    WHEN 2 THEN 'Looking for internship opportunities in web dev'
    WHEN 3 THEN 'Tips for acing technical interviews'
    ELSE 'Building an awesome full-stack application'
  END,
  CASE (ROW_NUMBER() OVER (PARTITION BY id ORDER BY id)) % 4 
    WHEN 1 THEN 'Just finished building a full-stack e-commerce platform with React, Node.js, and PostgreSQL. Used Redux for state management and Tailwind CSS for styling. Deployed on Vercel! 🚀'
    WHEN 2 THEN 'Graduating in 2024 and looking for opportunities in software development, preferably in web technologies. Open to relocating. Portfolio: github.com/example'
    WHEN 3 THEN 'Key tips from my interview preparation:\n1. Practice LeetCode consistently\n2. System design is crucial\n3. Behavioral questions matter\n4. Mock interviews helped a lot'
    ELSE 'Currently working on a machine learning model for image classification. Using TensorFlow and Python. If anyone wants to collaborate on open-source projects, let me know!'
  END,
  college,
  role,
  REPLACE(REPLACE(REPLACE(REPLACE(name, ' ', ''), '.', ''), '''', ''), '@', ''),
  ARRAY['react', 'nodejs', 'web-development', 'fullstack']::text[],
  NOW() - (ROW_NUMBER() OVER (PARTITION BY id ORDER BY id) || ' days')::INTERVAL
FROM inserted_profiles;

-- Insert sample conversations and messages
WITH user_list AS (
  SELECT id FROM profiles 
  WHERE email LIKE '%@university.edu'
  LIMIT 5
),
conv_data AS (
  INSERT INTO conversations (title, is_group, created_at)
  VALUES 
    ('Sarah & Rahul', false, NOW() - INTERVAL '10 days'),
    ('Emma & Arjun', false, NOW() - INTERVAL '8 days'),
    ('Priya & James', false, NOW() - INTERVAL '5 days'),
    ('Project Discussion Group', true, NOW() - INTERVAL '3 days')
  RETURNING id, title
)
INSERT INTO participants (conversation_id, user_id, joined_at)
SELECT 
  (SELECT id FROM conv_data LIMIT 1),
  id,
  NOW() - INTERVAL '10 days'
FROM (SELECT id FROM profiles WHERE email IN ('sarah.chen@university.edu', 'rahul.singh@university.edu') LIMIT 2)
UNION ALL
SELECT 
  (SELECT id FROM conv_data OFFSET 1 LIMIT 1),
  id,
  NOW() - INTERVAL '8 days'
FROM (SELECT id FROM profiles WHERE email IN ('emma.wilson@university.edu', 'arjun.patel@university.edu') LIMIT 2)
UNION ALL
SELECT 
  (SELECT id FROM conv_data OFFSET 2 LIMIT 1),
  id,
  NOW() - INTERVAL '5 days'
FROM (SELECT id FROM profiles WHERE email IN ('priya.sharma@university.edu', 'james.murphy@university.edu') LIMIT 2);

-- Insert some sample messages
WITH conv_data AS (
  SELECT 
    c.id as conv_id,
    array_agg(DISTINCT p1.user_id) as user_ids
  FROM conversations c
  JOIN participants p1 ON c.id = p1.conversation_id
  WHERE c.is_group = false
  GROUP BY c.id
  LIMIT 1
),
msg_data AS (
  SELECT 
    conv_id,
    user_ids[1] as user1_id,
    COALESCE(user_ids[2], user_ids[1]) as user2_id
  FROM conv_data
)
INSERT INTO messages (conversation_id, sender_id, content, created_at)
SELECT 
  m.conv_id,
  m.user1_id,
  'Hey! How are you doing? I saw your post about React, impressive project!',
  NOW() - INTERVAL '9 days'
FROM msg_data m
UNION ALL
SELECT 
  m.conv_id,
  m.user2_id,
  'Thanks! Yeah, I''ve been learning a lot. Would love to collaborate sometime!',
  NOW() - INTERVAL '8 days'
FROM msg_data m
UNION ALL
SELECT 
  m.conv_id,
  m.user1_id,
  'Definitely! Let''s connect on GitHub',
  NOW() - INTERVAL '8 days'
FROM msg_data m;

-- Insert some sample likes on posts
WITH ranked_likes AS (
  SELECT 
    p.id as post_id,
    pr.id as user_id,
    ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY pr.id) as rn
  FROM posts p
  CROSS JOIN (SELECT id FROM profiles WHERE role = 'student' LIMIT 3) pr
)
INSERT INTO likes (post_id, user_id, created_at)
SELECT 
  post_id,
  user_id,
  NOW() - INTERVAL '2 days'
FROM ranked_likes
WHERE rn <= 2
ON CONFLICT DO NOTHING;

-- Insert sample comments on posts
WITH post_comments AS (
  SELECT 
    p.id as post_id, 
    pr.id as commenter_id,
    ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY pr.id) as rn
  FROM posts p
  JOIN profiles pr ON pr.role = 'student' AND pr.id != p.user_id
  WHERE p.user_id IS NOT NULL
  LIMIT 10
)
INSERT INTO comments (post_id, user_id, content, created_at)
SELECT 
  post_id,
  commenter_id,
  CASE rn % 3
    WHEN 1 THEN 'Great work! This is really impressive. 👏'
    WHEN 2 THEN 'Would love to know more about your tech stack!'
    ELSE 'Let''s collaborate on this!'
  END,
  NOW() - INTERVAL '3 days'
FROM post_comments;

-- Create some sample connections/friendships
WITH profiles_list AS (
  SELECT id, name FROM profiles 
  WHERE email LIKE '%@university.edu'
  ORDER BY created_at DESC
)
INSERT INTO connections (user_id, friend_id, status, created_at, updated_at)
SELECT 
  p1.id,
  p2.id,
  'accepted',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '15 days'
FROM (SELECT id FROM profiles_list OFFSET 0 LIMIT 1) p1
CROSS JOIN (SELECT id FROM profiles_list OFFSET 1 LIMIT 3) p2
UNION ALL
SELECT 
  p1.id,
  p2.id,
  'pending',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
FROM (SELECT id FROM profiles_list OFFSET 2 LIMIT 1) p1
CROSS JOIN (SELECT id FROM profiles_list OFFSET 4 LIMIT 2) p2
ON CONFLICT DO NOTHING;

-- Update post statistics with actual counts
UPDATE posts p
SET 
  likes = (SELECT COUNT(*) FROM likes WHERE post_id = p.id),
  comments = (SELECT COUNT(*) FROM comments WHERE post_id = p.id)
WHERE p.user_id IS NOT NULL;

COMMIT;

-- =====================================================
-- SEED DATA COMPLETE!
-- You now have dummy users, posts, connections, and messages
-- =====================================================
