# 🔧 QUICK FIX FOR RECRUITER FEATURES

## The Problem
Your database is missing the `recruiter_id` column (and possibly others) in the jobs table. This breaks all recruiter functionality.

## ✅ THE FIX (Copy-Paste This)

### Step 1: Go to Supabase SQL Editor
1. Open: https://supabase.com/dashboard
2. Select your project: **qcmcfqmsudgaggsvxcpx**
3. Click **"SQL Editor"** in the left sidebar
4. Click **"+ New query"**

### Step 2: Copy and Paste This SQL

```sql
-- Fix Jobs Table - Add missing columns
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS recruiter_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS team text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deadline text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS status text DEFAULT 'Open';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_recruiter_id ON jobs(recruiter_id);

-- Verify it worked
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'jobs' ORDER BY ordinal_position;
```

### Step 3: Run It
- Click **"Run"** button (or press `Ctrl+Enter`)
- You should see a list of columns at the bottom

### Step 4: Refresh Your Browser
- Go to `/recruiter/jobs`
- The error should be gone!

---

## 📋 COMPLETE FIX (If you want all recruiter features)

If you want to ensure EVERYTHING works (pipeline, interviews, etc.), use the **complete fix**:

**File:** `FIX_ALL_RECRUITER_TABLES.sql`

This file contains SQL to create/fix ALL recruiter-related tables:
- ✅ Jobs table
- ✅ Applications table (pipeline)
- ✅ Saved candidates
- ✅ Interviews
- ✅ Settings

Just copy the entire contents of that file and run it in SQL Editor.

---

## ⚠️ If You Get Errors

### "relation jobs does not exist"
The jobs table doesn't exist at all. Run the complete schema:
1. Open `backend/supabase/schema.sql`
2. Copy everything
3. Paste in SQL Editor
4. Run it

### "column already exists"
That's OK! The SQL uses `IF NOT EXISTS` so it won't break anything.

### "foreign key violation"
This means the `profiles` table doesn't have the referenced ID. Make sure you have user profiles created.

---

## ✅ After Running the SQL

1. **Backend is running** (should already be on port 5000)
2. **Refresh browser** on `/recruiter/jobs`
3. **Should see:**
   - Job listings (if you created any)
   - OR "No jobs yet" message
   - **NO red error toast**

---

## 🎯 Quick Test

After running the SQL, run this in your terminal:
```bash
node check-missing-columns.js
```

Should output: `✅ ALL COLUMNS ARE WORKING!`
