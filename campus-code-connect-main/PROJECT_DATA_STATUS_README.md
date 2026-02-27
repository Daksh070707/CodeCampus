# Project Data + Backend Connectivity README

This document summarizes where data is stored, what is properly connected, what is local-only, and the complete SQL pack to stabilize recruiter/jobs/pipeline/messaging dependencies.

## 1) High-level architecture

- Frontend: Vite + React (recruiter and student pages)
- Active backend: `backend/` (Express + Supabase + Firebase token auth)
- Inactive legacy backend: `backend_disabled/` (not used by current app)
- Primary database: Supabase Postgres (schema in `backend/supabase/schema.sql`)
- Auth token in frontend: localStorage `token` (Firebase ID token)

## 2) Data storage map (tabular)

| Feature/Tab | Stored Where | Main Data Objects | Backend Connected? | Status |
|---|---|---|---|---|
| Login/Register/Auth | Browser + Supabase | localStorage: token/user/role, table: profiles | Yes (`/api/auth/*`) | Connected |
| Recruiter Jobs | Supabase | jobs | Yes (`/api/recruiter/jobs`) | Connected only if full jobs columns exist |
| Recruiter Pipeline | Supabase | applications + joins to jobs/profiles | Yes (`/api/recruiter/applicants`) | Connected only if applications table + FKs are correct |
| Recruiter Candidates | Supabase | profiles(role=student) | Yes (`/api/recruiter/candidates`) | Connected |
| Recruiter Saved Candidates | Supabase | recruiter_saved_candidates | Yes (`/api/recruiter/saved-candidates`) | Connected |
| Recruiter Interviews | Supabase | recruiter_interviews | Yes (`/api/recruiter/interviews`) | Connected if table exists |
| Recruiter Settings | Supabase | recruiter_settings | Yes (`/api/recruiter/settings`) | Connected |
| Recruiter Company Profile page | Browser only | localStorage: recruiterProfile | No API | Not backend persisted |
| Student Settings page | Browser only | localStorage: userSettings | No API | Not backend persisted |
| Saved Posts | Mixed | localStorage bookmarked IDs + table posts | Partial | IDs local-only, posts in DB |
| Messaging (Recruiter) | Supabase + backend | conversations, participants, messages (+ optional metadata/RPC) | Yes (`/api/messages/*`) | Mostly connected; metadata/RPC may be missing |
| Legacy backend folder | N/A | backend_disabled | No | Not connected |

## 3) What is not persisted in backend (important)

- Recruiter company profile page values are localStorage-only
- Student settings page values are localStorage-only
- Saved posts list IDs are localStorage-only (not synced across devices)
- Pipeline history/audit trail table is not present (only current stage/status stored)

## 4) Known failure patterns you saw

- Missing columns in jobs (team/status/recruiter_id/etc.)
- Missing applications table in schema cache
- Ambiguous embed between applications and profiles (candidate_id vs recruiter_id)

## 5) Complete SQL fix pack (run in Supabase SQL Editor)

Run this entire script in one query. It is idempotent (safe to re-run).

```sql
BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- A) Ensure jobs table exists and has required columns
-- =========================================================
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid,
  title text NOT NULL DEFAULT '',
  team text,
  company text,
  location text,
  type text,
  salary text,
  posted text,
  deadline text,
  status text DEFAULT 'Open',
  match int DEFAULT 0,
  skills text[],
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS recruiter_id uuid;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS team text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS salary text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS posted text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS deadline text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS status text DEFAULT 'Open';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS match int DEFAULT 0;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS skills text[];
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- FK jobs -> profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_recruiter_id_fkey'
  ) THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT jobs_recruiter_id_fkey
      FOREIGN KEY (recruiter_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =========================================================
-- B) Ensure applications table exists and has required columns
-- =========================================================
CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid,
  candidate_id uuid,
  recruiter_id uuid,
  status text DEFAULT 'New',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS job_id uuid;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS candidate_id uuid;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS recruiter_id uuid;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS status text DEFAULT 'New';
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Normalize FKs so embed names are predictable
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_job_id_fkey;
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_candidate_id_fkey;
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_recruiter_id_fkey;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_candidate_id_fkey
  FOREIGN KEY (candidate_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_recruiter_id_fkey
  FOREIGN KEY (recruiter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Optional uniqueness to prevent duplicate apply per job/candidate
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_application'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT unique_application UNIQUE (job_id, candidate_id);
  END IF;
END $$;

-- =========================================================
-- C) Recruiter support tables
-- =========================================================
CREATE TABLE IF NOT EXISTS public.recruiter_saved_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_saved_candidate UNIQUE (recruiter_id, candidate_id)
);

CREATE TABLE IF NOT EXISTS public.recruiter_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  candidate_name text,
  job_title text,
  interviewer text,
  interview_date date,
  interview_time text,
  location text,
  status text DEFAULT 'Scheduled',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recruiter_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_members jsonb DEFAULT '[]'::jsonb,
  notifications jsonb DEFAULT '{"emailUpdates": true, "interviewReminders": true, "dailyDigest": false}'::jsonb,
  default_pipeline text[] DEFAULT array['New','Screen','Interview','Offer','Hired'],
  updated_at timestamptz DEFAULT now()
);

-- =========================================================
-- D) Messaging support (minimum expected by current backend)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  is_group boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  last_message_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_by uuid[] DEFAULT array[]::uuid[]
);

-- Extra table referenced by backend/messages route for unread_count
CREATE TABLE IF NOT EXISTS public.conversation_participants_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  unread_count int DEFAULT 0,
  last_read_at timestamptz,
  CONSTRAINT unique_conv_user_metadata UNIQUE (conversation_id, user_id)
);

-- RPC used by recruiter messages frontend
CREATE OR REPLACE FUNCTION public.mark_conversation_as_read(
  p_conversation_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.conversation_participants_metadata (conversation_id, user_id, unread_count, last_read_at)
  VALUES (p_conversation_id, p_user_id, 0, now())
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET unread_count = 0, last_read_at = now();
END;
$$;

-- =========================================================
-- E) Performance indexes
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_jobs_recruiter_id ON public.jobs(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);

CREATE INDEX IF NOT EXISTS idx_applications_recruiter_id ON public.applications(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON public.applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON public.applications(created_at);

CREATE INDEX IF NOT EXISTS idx_saved_candidates_recruiter ON public.recruiter_saved_candidates(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_interviews_recruiter ON public.recruiter_interviews(recruiter_id);

CREATE INDEX IF NOT EXISTS idx_participants_conv ON public.participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON public.participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_metadata_conv_user ON public.conversation_participants_metadata(conversation_id, user_id);

COMMIT;

-- Force PostgREST schema cache refresh
NOTIFY pgrst, 'reload schema';

-- =========================================================
-- F) Verification queries
-- =========================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles','jobs','applications','recruiter_saved_candidates','recruiter_interviews','recruiter_settings',
    'conversations','participants','messages','conversation_participants_metadata'
  )
ORDER BY table_name;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'jobs'
ORDER BY ordinal_position;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'applications'
ORDER BY ordinal_position;
```

## 6) Backend query note (important)

Because `applications` has two foreign keys to `profiles` (`candidate_id` and `recruiter_id`), pipeline embeds must use explicit FK hints to avoid ambiguity.

Current safe style used in backend recruiter route:

- jobs embed via `jobs!applications_job_id_fkey(...)`
- candidate embed via `profiles!applications_candidate_id_fkey(...)`

## 7) Final checklist

- Run SQL fix pack above
- Restart backend server
- Refresh recruiter pages
- Validate:
  - Jobs page loads without missing-column errors
  - Pipeline page loads without schema/relationship errors
  - Candidate stage updates work
  - Messaging loads conversations and unread counts without missing table/RPC errors

## 8) Current connection summary

- Active backend connected: Yes (`backend/`)
- Legacy backend connected: No (`backend_disabled/`)
- Recruiter core persistence (jobs/pipeline/candidates/saved/interviews/settings): Database-backed once schema is aligned
- Some non-recruiter UI preferences still local-only by design (settings/profile/bookmarks)
