-- Supabase profiles table and RLS policies
-- Run this in Supabase SQL editor or via psql

-- Using text id so it can work with external auth providers (Firebase uid or Supabase auth uid)
create table if not exists public.profiles (
  id text primary key,
  name text,
  email text,
  role text,
  college text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Allow users to insert their own profile (auth.uid() must match the id)
create policy "profiles_insert_self" on public.profiles
  for insert
  with check (auth.uid() = id);

-- Allow users to select their own profile
create policy "profiles_select_self" on public.profiles
  for select
  using (auth.uid() = id);

-- Allow users to update their own profile
create policy "profiles_update_self" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Allow users to delete their own profile (optional)
create policy "profiles_delete_self" on public.profiles
  for delete
  using (auth.uid() = id);

-- Optional index on email for faster lookups
create index if not exists idx_profiles_email on public.profiles (email);
