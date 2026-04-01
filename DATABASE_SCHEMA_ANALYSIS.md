# Database Schema Analysis - CodeCampus

## 1. Profiles/Users Table Structure

### Main Table: `profiles`
Location: [backend/supabase/schema.sql](backend/supabase/schema.sql#L9-L18)

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid text UNIQUE,
  name text,
  email text UNIQUE,
  username text,
  role text,
  college text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);
```

### Key Fields:
| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key, auto-generated |
| `firebase_uid` | text (UNIQUE) | **PRIMARY user identifier for Firebase auth** |
| `name` | text | User's display name |
| `email` | text (UNIQUE) | Email address |
| `username` | text | Searchable username (added via migration) |
| `role` | text | **User type indicator** - `'student'`, `'recruiter'`, `'mentor'` |
| `college` | text | College/University name (students only) |
| `avatar_url` | text | Avatar image URL |
| `created_at` | timestamptz | Account creation timestamp |

### Indexes for Performance:
- `idx_profiles_email` - Fast email lookups
- `idx_profiles_firebase_uid` - Fast Firebase UID lookups
- `idx_profiles_username` - Fast username searches

---

## 2. How Users Are Created and Identified

### User Creation Flow

#### A. Authentication Path (Firebase + Supabase)
[Backend Route: backend/routes/auth.js](backend/routes/auth.js)

**Endpoint: `POST /api/auth/firebase`**
1. Client sends Firebase ID token in Authorization header
2. Backend verifies token with Firebase Admin SDK
3. Extracts: `uid`, `email`, `name`
4. Checks if profile exists for `firebase_uid`
5. If NOT exists:
   ```javascript
   INSERT INTO profiles (
     firebase_uid,    // From Firebase token.uid
     name,           // From Firebase token.name
     email,          // From Firebase token.email
     role,           // From request body (optional)
     college,        // From request body (optional)
     avatar_url      // From request body (optional)
   )
   ```
6. Issues JWT token with structure: `{ id: firebase_uid, role }`

#### B. Registration Path (Email/Password)
**Endpoint: `POST /api/auth/register`**
1. Client sends `name`, `email`, `password`, `role`
2. Creates Supabase auth user with service role key
3. Auto-confirms email (no verification needed)
4. Creates profile row in `profiles` table:
   ```javascript
   INSERT INTO profiles (
     id: user.id,    // Supabase user ID (UUID)
     name,
     email,
     role
   )
   ```

### User Identification Methods:

| Method | Use Case | Field |
|--------|----------|-------|
| **Firebase UID** | Primary auth identifier | `firebase_uid` |
| **Email** | Email-based lookups | `email` |
| **UUID (Supabase)** | Internal database references | `id` |
| **Username** | Searchable display identifier | `username` |

---

## 3. Fields Indicating Dummy vs Real Users

### ⚠️ **NO EXPLICIT "DUMMY" FIELD IN SCHEMA**

The `profiles` table does **NOT have**:
- `is_dummy` boolean
- `is_test` boolean
- `status` field (like 'active', 'inactive')
- `verified` boolean

### How to Distinguish Dummy Users:

#### Method 1: **Email Domain Pattern**
```sql
-- Dummy users created by seed script typically have:
-- @lords.edu, @iitb.edu, @mu.edu, etc. (college domains)
-- OR: @university.edu, @google.com (seed data patterns)

-- Real users typically have:
-- @company-email.com, @outlook.com, @gmail.com, etc.
```

#### Method 2: **Firebase UID Check**
```sql
-- Dummy users: firebase_uid is NULL
-- Real users: firebase_uid is NOT NULL

SELECT * FROM profiles WHERE firebase_uid IS NULL;  -- Dummy/seed data
SELECT * FROM profiles WHERE firebase_uid IS NOT NULL;  -- Real users
```

#### Method 3: **Avatar URL Pattern**
```sql
-- Dummy users: Use DiceBear API
-- avatar_url LIKE 'https://api.dicebear.com/%'

-- Real users: Custom URLs or provider URLs
```

#### Method 4: **Created_at Timestamp**
```sql
-- Seed data typically created in batches with past dates
-- Real users created incrementally
```

#### Method 5: **Role + College Combination**
```sql
-- Dummy recruiters: role='recruiter' AND college IS NULL
-- Real students: role='student' AND college IS NOT NULL
-- Recruiters: role='recruiter' AND firebase_uid IS NOT NULL
```

---

## 4. Seed Data and Test User Creation Scripts

### Seed Files Location
[backend/supabase/](backend/supabase/)
- `seed-data.sql` - SQL-based dummy data (12 users)
- `schema.sql` - Includes dummy INSERT statements

### JavaScript Seed Script
[backend/scripts/seed-db.js](backend/scripts/seed-db.js)

**Run with:** `node scripts/seed-db.js`

#### Dummy Users Created:

**Students** (25+ from Mumbai colleges):
```javascript
[
  { name: 'Arjun Patel', email: 'arjun.patel@lords.edu', role: 'student', college: 'Lords Universal College' },
  { name: 'Priya Sharma', email: 'priya.sharma@lords.edu', role: 'student', college: 'Lords Universal College' },
  { name: 'Rahul Singh', email: 'rahul.singh@iitb.edu', role: 'student', college: 'IIT Bombay' },
  // ... 22+ more students
]
```

**Recruiters** (from seed-data.sql):
```javascript
[
  { name: 'Sophia Johnson', email: 'sophia@google.com', role: 'recruiter', college: null },
  { name: 'Vikram Desai', email: 'vikram@microsoft.com', role: 'recruiter', college: null }
]
```

### Colleges Included in Seed:
```
Lords Universal College, IIT Bombay, Mumbai University, VJTI, Thadomal Shahani,
St. Xavier's College, Rizvi College, DJ Sanghvi, K.J. Somaiya, SVKM NMIMS,
Mithibai College, NIIE, Bombay College of Pharmacy, SNDT Women's University,
Atharva College, Fr. Conceicao Rodriguez, Usha Mittal Institute, ICT,
NarseeMonjee Institute, Jaslok Institute, MIT Pune, Ramrao Adik Institute,
Pillai College, Vidyalankar School, Thakur College, Terna, VES-IT,
Xavier Institute of Engineering, Global Institute of Technology, NIEMS
```

### Seed Data Created:
- ✅ **Profiles** - Dummy users with fake emails and DiceBear avatars
- ✅ **Posts** - Sample posts from dummy users
- ✅ **Conversations** - Messaging channels
- ✅ **Participants** - Users in conversations
- ✅ **Comments** - Sample comments on posts

---

## 5. Connection and Auth Configuration

### Supabase Configuration
[backend/config/supabase.js](backend/config/supabase.js)

```javascript
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = 
  process.env.SUPABASE_SERVICE_KEY || 
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY

// Creates Supabase client with service role key
// Service role key allows admin operations (bypasses RLS)
```

### Environment Variables (.env)
```
VITE_SUPABASE_URL=https://qcmcfqmsudgaggsvxcpx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Firebase Configuration
[backend/middleware/firebaseAuth.js](backend/middleware/firebaseAuth.js)

**Initialization:**
- Reads from `FIREBASE_SERVICE_ACCOUNT_PATH` (JSON file path)
- Or from `FIREBASE_SERVICE_ACCOUNT` (inline JSON)
- Uses Firebase Admin SDK to verify tokens

**Token Verification:**
```javascript
// Supports both:
1. Firebase ID tokens (from client)
2. Backend JWT tokens (issued server-side)

// Token structure in requests:
Authorization: "Bearer <firebase_id_token_or_jwt>"
```

### Auth Middleware Flow
[backend/middleware/firebaseAuth.js](backend/middleware/firebaseAuth.js)

```javascript
verifyFirebaseToken(req, res, next)
  ↓
1. Extract Bearer token from Authorization header
2. Try verifying as Firebase ID token
   ├─ Success: Set req.firebaseUid and proceed
   └─ Fail: Try backend JWT
      ├─ Success: Set req.firebaseUid from JWT payload
      └─ Fail: Return 401 Unauthorized
3. Next middleware processes authenticated request
```

### Database Access Control
[backend/supabase/schema.sql](backend/supabase/schema.sql#L176-L210)

**Row Level Security (RLS) Policies:**

| Table | Policy | Effect |
|-------|--------|--------|
| `profiles` | `profiles_public_select` | Anyone can read all profiles |
| `profiles` | `profiles_insert_own` | User can only insert their own profile (id = auth.uid()) |
| `profiles` | `profiles_update_own` | User can only update their own profile |
| `posts` | `posts_public_select` | Anyone can read posts |
| `posts` | `posts_insert_own` | User can only insert own posts |
| `posts` | `posts_delete_own` | User can only delete own posts |

**Note:** Service role key used by backend **bypasses all RLS policies** for admin operations.

---

## 6. Related Tables (User Context)

### Jobs Table (Recruiter Posts)
```sql
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid REFERENCES profiles(id),  -- Links to recruiter
  title text NOT NULL,
  company text,
  status text DEFAULT 'Open',                 -- Job status
  created_at timestamptz DEFAULT now()
);
```

### Applications Table (Job Applications Pipeline)
```sql
CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id),
  candidate_id uuid REFERENCES profiles(id),  -- Links to student profile
  recruiter_id uuid REFERENCES profiles(id),  -- Links to recruiter
  status text DEFAULT 'New',                  -- Application status
  created_at timestamptz DEFAULT now()
);
```

### Connections Table (Friend System)
[backend/supabase/friends-schema.sql](backend/supabase/friends-schema.sql)
```sql
CREATE TABLE connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  friend_id uuid REFERENCES profiles(id),
  status text CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamptz DEFAULT now()
);
```

### Community Members Table (College Communities)
[backend/supabase/college-communities-migration.sql](backend/supabase/college-communities-migration.sql)
```sql
CREATE TABLE community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES college_communities(id),
  user_id uuid REFERENCES profiles(id),
  role TEXT DEFAULT 'member',  -- 'admin' or 'member'
  joined_at timestamptz DEFAULT now()
);
```

---

## 7. Key Insights

### ✅ What Works
- **Clear user identification**: Firebase UID + email are unique
- **Role-based access**: `role` field clearly separates students/recruiters/mentors
- **Strong references**: All user-related tables properly reference `profiles.id`
- **Seed data available**: 25+ test users with realistic data structure

### ⚠️ Potential Issues
- **No is_dummy field**: Dummy users not explicitly marked - must rely on patterns
- **Firebase UID can be NULL**: Seed users created without Firebase auth
- **No user status field**: Can't easily deactivate/block users at table level
- **DiceBear avatars**: All seed users use predictable avatar pattern

### 🔍 Detection Recommendations

**To identify dummy users reliably:**
```sql
-- Query: Find all likely dummy users
SELECT * FROM profiles
WHERE 
  firebase_uid IS NULL                                    -- No Firebase auth
  OR email LIKE '%@%.edu'                                 -- College email
  OR email LIKE '%@google.com' OR email LIKE '%@microsoft.com'
  OR avatar_url LIKE '%dicebear%'                         -- DiceBear avatar
  OR created_at < NOW() - INTERVAL '7 days' AND role = 'recruiter';
```

---

## 8. Quick Reference - Migration Files

| File | Purpose |
|------|---------|
| [schema.sql](backend/supabase/schema.sql) | Main tables: profiles, posts, jobs, applications, messaging |
| [friends-schema.sql](backend/supabase/friends-schema.sql) | Connections/friends system with status tracking |
| [college-communities-migration.sql](backend/supabase/college-communities-migration.sql) | College-based communities and members |
| [add-username-migration.sql](backend/supabase/add-username-migration.sql) | Added username column for searchability |
| [add-team-column-migration.sql](backend/supabase/add-team-column-migration.sql) | Team column for recruiter jobs |
| [saved-jobs-migration.sql](backend/supabase/saved-jobs-migration.sql) | Saved jobs for students |
