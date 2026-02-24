import { createClient } from '@supabase/supabase-js'

// Read Vite env vars in the browser, fallback to process.env for Node contexts
const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Friendly warning for local dev if env vars are missing
  // Do NOT commit secrets into source control; use .env in project root instead.
  // Example: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
  // eslint-disable-next-line no-console
  console.warn('Supabase URL or anon key not set. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env')
}

export const supabaseClient = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '')

export default supabaseClient
