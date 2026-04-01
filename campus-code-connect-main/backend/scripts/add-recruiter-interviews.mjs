import { Client } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const connection = process.env.SUPABASE_DB_URL || process.env.SUPABASE_CONNECTION_STRING
if (!connection) {
  console.error('Set SUPABASE_DB_URL in env to apply migration')
  process.exit(1)
}

const sql = `
-- Recruiter interviews table
create table if not exists recruiter_interviews (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid references profiles(id) on delete cascade,
  candidate_name text,
  job_title text,
  interviewer text,
  interview_date date,
  interview_time text,
  location text,
  status text default 'Scheduled',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for faster lookups
create index if not exists idx_interviews_recruiter on recruiter_interviews(recruiter_id);
`

async function run(){
  const client = new Client({ connectionString: connection })
  await client.connect()
  try{
    await client.query(sql)
    console.log('✅ Recruiter interviews table created successfully')
  }catch(e){
    console.error('❌ Failed to create table:', e.message)
    process.exitCode = 1
  }finally{
    await client.end()
  }
}

run()
