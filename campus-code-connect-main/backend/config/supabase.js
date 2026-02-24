import dotenv from "dotenv";
dotenv.config();
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
// Support multiple env names: prefer the explicit service key, then the service-role name
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY

let supabaseClient = null
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('Supabase URL or service role key not set. Backend Supabase client will be unavailable until configured in backend/.env')
} else {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  } catch (e) {
    console.warn('Failed to create Supabase client:', e.message)
    supabaseClient = null
  }
}

export function getSupabase() {
  if (!supabaseClient) {
    throw new Error('Supabase client is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in backend/.env')
  }
  return supabaseClient
}

export default getSupabase
