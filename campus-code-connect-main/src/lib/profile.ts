import { supabase } from "./supabase";

export type Profile = {
  id: string;
  firebase_uid?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  college?: string | null;
  avatar_url?: string | null;
};

/**
 * Fetch a profile by ID, Firebase UID, or email.
 * This is a read-only operation using anon client.
 * Profile updates must go through the backend /api/auth/profile endpoint.
 */
export async function getProfile(id: string) {
  if (!id) return null;

  const isEmail = id.includes('@');
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUuid = uuidRegex.test(id);

  // If it's an email address, look up by email first
  if (isEmail) {
    const { data: emailArr, error: emailErr } = await supabase.from('profiles').select('*').eq('email', id).limit(1);
    if (emailErr) {
      if ((emailErr as any).code === 'PGRST116') return null;
      throw emailErr;
    }
    return (emailArr as any)?.[0] as Profile | null;
  }

  // If the input is not a UUID, treat it as a Firebase UID and try that column first
  if (!isUuid) {
    try {
      const res = await supabase.from('profiles').select('*').eq('firebase_uid', id).limit(1);
      if (res.error) throw res.error;
      const byFirebase = (res.data as any[])?.[0] ?? null;
      if (byFirebase) return byFirebase as Profile;
    } catch (e) {
      // swallow and continue to safe fallback below
    }
  }

  // If it's a UUID (or previous lookup failed), query by id only when the input is a valid UUID
  if (isUuid) {
    const { data: idArr, error: idErr } = await supabase.from('profiles').select('*').eq('id', id).limit(1);
    if (idErr) {
      if ((idErr as any).code === 'PGRST116') return null;
      throw idErr;
    }
    return (idArr as any)?.[0] as Profile | null;
  }

  // Not an email or UUID and no firebase match
  return null;
}

export default { getProfile };
