# HOW TO FIX THE JOBS TABLE COMPLETELY

## The Problem
Your jobs table is missing multiple columns. The backend code expects these columns:
- id, title, team, company, location, type, salary, deadline, status, description, created_at, recruiter_id

## Quick Fix (Copy-Paste into Supabase SQL Editor)

```sql
-- Add all missing columns at once
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS team text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deadline text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS status text DEFAULT 'Open';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS posted text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS match int DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS skills text[];

-- Verify what columns exist now
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'jobs' 
ORDER BY ordinal_position;
```

## Steps to Apply:

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project** (qcmcfqmsudgaggsvxcpx)
3. **Click "SQL Editor"** in the left sidebar
4. **Click "+ New query"**
5. **Paste the SQL above**
6. **Click "Run"** or press Ctrl+Enter
7. **Check the results** - you should see a list of all columns

## Alternative: Apply Full Schema

If you want to ensure everything is correct:

1. Open `backend/supabase/schema.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Run it (it won't break existing data - it uses `CREATE TABLE IF NOT EXISTS`)

## After Running the SQL:

1. Refresh your browser on `/recruiter/jobs`
2. The error should be gone
3. You should see either job listings or "No jobs yet"

## If You're Still Getting Errors:

Let me know which column is missing and I'll help you debug further.
