-- Remove Dummy Users Migration
-- This script removes all test/seed/dummy users from the database
-- Keeps only real users who have logged in (have valid firebase_uid)

-- Step 1: Identify dummy users (those without firebase_uid or with test emails)
-- These are users created via seed-db.js who never authenticated via Firebase

-- Step 2: Delete related data for dummy users
-- Delete likes from dummy users
DELETE FROM likes 
WHERE user_id IN (
  SELECT id FROM profiles 
  WHERE firebase_uid IS NULL
    OR firebase_uid = ''
    OR email LIKE '%@lords.edu'
    OR email LIKE '%@iitb.edu'
    OR email LIKE '%@google.com'
    OR email LIKE '%test%'
);

-- Delete comments from dummy users
DELETE FROM comments 
WHERE user_id IN (
  SELECT id FROM profiles 
  WHERE firebase_uid IS NULL
    OR firebase_uid = ''
    OR email LIKE '%@lords.edu'
    OR email LIKE '%@iitb.edu'
    OR email LIKE '%@google.com'
    OR email LIKE '%test%'
);

-- Delete posts from dummy users
DELETE FROM posts 
WHERE user_id IN (
  SELECT id FROM profiles 
  WHERE firebase_uid IS NULL
    OR firebase_uid = ''
    OR email LIKE '%@lords.edu'
    OR email LIKE '%@iitb.edu'
    OR email LIKE '%@google.com'
    OR email LIKE '%test%'
);

-- Step 3: Delete the dummy users themselves
-- Only delete profiles that have no firebase_uid (never logged in via real Firebase)
DELETE FROM profiles 
WHERE firebase_uid IS NULL
  OR firebase_uid = ''
  OR email LIKE '%@lords.edu'
  OR email LIKE '%@iitb.edu'
  OR email LIKE '%@google.com'
  OR email LIKE '%test%';

-- Step 4: Verify deletion
-- Show remaining users (should only be real users with Firebase UID)
SELECT id, name, email, firebase_uid, role, created_at 
FROM profiles 
WHERE firebase_uid IS NOT NULL AND firebase_uid != ''
ORDER BY created_at DESC;
