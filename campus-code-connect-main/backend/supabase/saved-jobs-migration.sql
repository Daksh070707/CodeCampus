-- Migration for saved jobs functionality
-- Run this in Supabase SQL Editor

-- Create saved_jobs table for students to save jobs they're interested in
create table if not exists saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  job_id uuid references jobs(id) on delete cascade,
  created_at timestamptz default now(),
  constraint unique_saved_job unique (user_id, job_id)
);

-- Add index for faster lookups
create index if not exists idx_saved_jobs_user_id on saved_jobs(user_id);
create index if not exists idx_saved_jobs_job_id on saved_jobs(job_id);

-- Enable Row Level Security
alter table saved_jobs enable row level security;

-- Allow users to see their own saved jobs
create policy "saved_jobs_select_own" on saved_jobs for select using (user_id = auth.uid());

-- Allow users to save jobs
create policy "saved_jobs_insert_own" on saved_jobs for insert with check (user_id = auth.uid());

-- Allow users to unsave jobs
create policy "saved_jobs_delete_own" on saved_jobs for delete using (user_id = auth.uid());
