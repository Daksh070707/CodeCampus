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
 * Ensure a profile row exists for the supplied user id.
 * If the row doesn't exist it will be created.
 */
export async function upsertProfile(profile: Partial<Profile> & { id?: string; firebase_uid?: string }) {
  // Prefer matching by firebase_uid (if provided), then by email, then id.
  if (profile.firebase_uid) {
    // try to find existing by firebase_uid
    let existing: any = null;
    let selErr: any = null;
    try {
      const res = await supabase.from('profiles').select('*').eq('firebase_uid', profile.firebase_uid).limit(1);
      existing = (res.data as any[])?.[0] ?? null;
      selErr = res.error;
    } catch (e) {
      existing = null;
      selErr = null;
    }
    if (selErr) throw selErr;
    if (existing) {
      const { data: updatedArr, error: updErr } = await supabase.from('profiles').update({ ...profile }).eq('firebase_uid', profile.firebase_uid).select().limit(1);
      if (updErr) throw updErr;
      return (updatedArr as any)?.[0] as Profile | null;
    }

    // insert new profile with firebase_uid
    const insertBody = {
      firebase_uid: profile.firebase_uid ?? null,
      name: profile.name ?? null,
      email: profile.email ?? null,
      role: profile.role ?? null,
      college: profile.college ?? null,
      avatar_url: profile.avatar_url ?? null,
    };
    const { data: inserted, error: insErr } = await supabase.from('profiles').insert([insertBody], { returning: 'representation' });
    if (insErr) throw insErr;
    return (inserted as any)?.[0] as Profile | null;
  }

  // Fallback: perform a normal upsert (useful for server-side flows that use UUID ids)
  const { data, error } = await supabase.from('profiles').upsert([profile as any], { returning: 'representation' });
  if (error) throw error;
  return data?.[0] as Profile | null;
}

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

export default { upsertProfile, getProfile };
