-- Supabase / Postgres schema for CodeCampus
-- Run this in Supabase SQL editor or via provided apply script.

-- enable uuid generation
create extension if not exists "pgcrypto";

-- Profiles table (users)
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique,
  role text,
  college text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Posts table
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  author text,
  title text,
  content text,
  college text,
  code text,
  tags text[],
  likes int default 0,
  comments int default 0,
  avatar_url text,
  role text,
  created_at timestamptz default now()
);

-- Example indexes for faster lookups
create index if not exists idx_posts_user_id on posts(user_id);
create index if not exists idx_profiles_email on profiles(email);

-- Jobs table
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text,
  location text,
  type text,
  salary text,
  posted text,
  deadline text,
  match int default 0,
  skills text[],
  description text,
  created_at timestamptz default now()
);

-- Comments table
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  content text not null,
  created_at timestamptz default now()
);

-- Likes table (one like per user per post)
create table if not exists likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  constraint unique_like unique (post_id, user_id)
);

-- Notifications table
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text,
  payload jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

-- Messaging tables
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  title text,
  is_group boolean default false,
  created_at timestamptz default now()
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id) on delete set null,
  content text not null,
  created_at timestamptz default now(),
  read_by uuid[] default array[]::uuid[]
);

-- Indexes
create index if not exists idx_jobs_company on jobs(company);
create index if not exists idx_comments_post_id on comments(post_id);
create index if not exists idx_likes_post_id on likes(post_id);

-- Enable Row Level Security (RLS) and add basic policies
-- Note: service_role key bypasses RLS; keep that safe on backend only.

alter table profiles enable row level security;
-- Allow anyone to read profiles
create policy "profiles_public_select" on profiles for select using (true);
-- Allow users to insert their own profile (id must match auth.uid())
create policy "profiles_insert_own" on profiles for insert with check (id = auth.uid());
-- Allow users to update their profile
create policy "profiles_update_own" on profiles for update using (id = auth.uid()) with check (id = auth.uid());

alter table posts enable row level security;
create policy "posts_public_select" on posts for select using (true);
create policy "posts_insert_own" on posts for insert with check (user_id = auth.uid());
create policy "posts_update_own" on posts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "posts_delete_own" on posts for delete using (user_id = auth.uid());

alter table comments enable row level security;
create policy "comments_public_select" on comments for select using (true);
create policy "comments_insert_own" on comments for insert with check (user_id = auth.uid());
create policy "comments_delete_own" on comments for delete using (user_id = auth.uid());

alter table likes enable row level security;
create policy "likes_public_select" on likes for select using (true);
create policy "likes_insert_own" on likes for insert with check (user_id = auth.uid());
create policy "likes_delete_own" on likes for delete using (user_id = auth.uid());

alter table jobs enable row level security;
create policy "jobs_public_select" on jobs for select using (true);

alter table notifications enable row level security;
create policy "notifications_select_own" on notifications for select using (user_id = auth.uid());
create policy "notifications_insert_service" on notifications for insert with check (true);

alter table conversations enable row level security;
create policy "conversations_select_participant" on conversations for select using (
  exists (select 1 from participants p where p.conversation_id = conversations.id and p.user_id = auth.uid())
);
create policy "conversations_insert_service" on conversations for insert with check (true);

alter table participants enable row level security;
create policy "participants_insert_own" on participants for insert with check (user_id = auth.uid());
create policy "participants_select_own" on participants for select using (user_id = auth.uid());

alter table messages enable row level security;
create policy "messages_select_participant" on messages for select using (
  exists (select 1 from participants p where p.conversation_id = messages.conversation_id and p.user_id = auth.uid())
);
create policy "messages_insert_own" on messages for insert with check (sender_id = auth.uid());

-- Sample seed data (small) — optional, safe to remove on production
insert into profiles (id, name, email, role, college)
values
  (gen_random_uuid(), 'Alice Student', 'alice@example.com', 'student', 'State University'),
  (gen_random_uuid(), 'Bob Recruiter', 'bob@company.com', 'recruiter', null)
on conflict do nothing;

insert into jobs (title, company, location, type, salary, posted, deadline, match, skills, description)
values
  ('Software Engineering Intern','Acme Corp','Remote','Internship','$40-60/hr','2 days ago','2025-01-15',90, array['React','TypeScript','Node.js'],'Work on scalable services'),
  ('Frontend Developer','Stripe','San Francisco, CA','Full-time','$140k-$160k','3 days ago','2025-02-01',85, array['React','TypeScript','GraphQL'],'Build delightful UIs')
on conflict do nothing;

-- End of schema
