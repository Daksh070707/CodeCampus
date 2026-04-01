import express from "express";
import jwt from "jsonwebtoken";
import { getSupabase } from "../config/supabase.js";
import { verifyFirebaseIdToken, verifyFirebaseToken } from "../middleware/firebaseAuth.js";

const router = express.Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === "string" && UUID_REGEX.test(value);
}

function normalizeEmail(email) {
  if (typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

function normalizeRole(role) {
  if (typeof role !== "string") return "";
  return role.trim().toLowerCase();
}

function buildLast7Days() {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);

    days.push({
      name: labels[day.getDay()],
      key: day.toISOString().slice(0, 10),
      signups: 0,
      posts: 0,
    });
  }

  return days;
}

function getDayKey(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function resolveRowTimestamp(row) {
  if (!row) return null;
  return row.created_at || row.updated_at || null;
}

async function resolveProfileForRequest(supabase, firebaseUid, decoded) {
  // 1) Firebase flow: match by firebase_uid.
  if (firebaseUid && !isUuid(firebaseUid)) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("firebase_uid", firebaseUid)
      .limit(1);
    if (error) throw error;
    if (data && data[0]) return data[0];
  }

  // 2) Email/password JWT flow: token id is usually profiles.id UUID.
  if (decoded?.id && isUuid(decoded.id)) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", decoded.id)
      .limit(1);
    if (error) throw error;
    if (data && data[0]) return data[0];
  }

  // 3) Fallback by email if available.
  if (decoded?.email) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", decoded.email)
      .limit(1);
    if (error) throw error;
    if (data && data[0]) return data[0];
  }

  return null;
}

async function ensureProfileForRequest(supabase, firebaseUid, decoded) {
  const existing = await resolveProfileForRequest(supabase, firebaseUid, decoded);
  if (existing) return existing;

  const payload = {
    name: decoded?.name || decoded?.email || "User",
    email: decoded?.email || null,
    role: decoded?.role || "student",
    created_at: new Date().toISOString(),
  };

  // For Firebase users, store firebase_uid.
  if (firebaseUid && !isUuid(firebaseUid)) {
    payload.firebase_uid = firebaseUid;
  }

  // For non-Firebase JWT users, persist the known UUID as id.
  if (decoded?.id && isUuid(decoded.id)) {
    payload.id = decoded.id;
  }

  const { data, error } = await supabase.from("profiles").insert([payload]).select().limit(1);
  if (error) throw error;
  return (data && data[0]) || null;
}

/* REGISTER */
router.post("/register", async (req, res) => {
  try {
    const { name, password, role } = req.body;
    const email = normalizeEmail(req.body?.email);

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    let supabase
    try {
      supabase = getSupabase()
    } catch (e) {
      return res.status(500).json({ message: e.message })
    }

    // Enforce one email -> one profile id across all auth paths
    const { data: existingProfiles, error: existingErr } = await supabase
      .from("profiles")
      .select("id,email,role")
      .eq("email", email)
      .limit(1);

    if (existingErr) {
      return res.status(500).json({ message: existingErr.message });
    }

    if (existingProfiles && existingProfiles[0]) {
      return res.status(409).json({ message: "This email is already linked to an existing account. Please login instead." });
    }

    // create user using Supabase admin API (service role key required)
    // Auto-confirm email so users can sign in immediately after registration
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
      email_confirm: true
    });

    if (createError) {
      return res.status(400).json({ message: createError.message });
    }

    const user = createData.user || createData;

    // create a profile row in 'profiles' table
    try {
      await supabase.from('profiles').upsert({ id: user.id, name, email, role, created_at: new Date().toISOString() });
    } catch (e) {
      // ignore profile upsert errors
    }

    res.status(201).json({ message: "User registered successfully", user: { id: user.id, name, role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* LOGIN */
router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    let supabase
    try {
      supabase = getSupabase()
    } catch (e) {
      return res.status(500).json({ message: e.message })
    }

    // sign in via Supabase
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data?.user) {
      return res.status(400).json({ message: (error && error.message) || 'Invalid credentials' });
    }

    const user = data.user;
    const role = (user.user_metadata && user.user_metadata.role) || 'student';

    const token = jwt.sign({ id: user.id, role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, name: user.user_metadata?.name || user.email, role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* EXCHANGE Firebase ID token -> backend JWT + upsert profile */
router.post("/firebase", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.body.token;
    if (!token) return res.status(400).json({ message: "Missing Firebase ID token" });

    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(token);
    } catch (e) {
      return res.status(401).json({ message: "Invalid Firebase ID token" });
    }

    const firebaseUid = decoded.uid;
    const email = normalizeEmail(decoded.email || "");
    const emailVerified = decoded.email_verified === true;
    const signInProvider = decoded.firebase?.sign_in_provider || "";

    // Enforce verification for email/password Firebase accounts.
    if (signInProvider === "password" && !emailVerified) {
      return res.status(403).json({ message: "Email not verified. Please verify your email before logging in." });
    }

    const name = decoded.name || decoded.email || null;
    const roleInput = req.body?.role || null;
    const requestedRole = normalizeRole(roleInput);
    const collegeInput = req.body?.college || null;
    const avatarInput = req.body?.avatar_url || null;

    let supabase;
    try {
      supabase = getSupabase();
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }

    // Ensure a profile row exists for this Firebase UID
    const { data: profiles, error: profileErr } = await supabase.from("profiles").select("*").eq("firebase_uid", firebaseUid).limit(1);
    if (profileErr) return res.status(500).json({ message: profileErr.message });

    // Resolve profiles by email and only enforce hard blocks for role mismatches.
    let emailProfiles = [];
    let profileByEmail = null;
    let roleConflictProfile = null;
    if (email) {
      const { data, error: emailErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email);

      if (emailErr) return res.status(500).json({ message: emailErr.message });
      emailProfiles = data || [];
      profileByEmail = emailProfiles.find((p) => p.firebase_uid === firebaseUid) || emailProfiles[0] || null;
      roleConflictProfile = requestedRole
        ? emailProfiles.find((p) => {
            const role = normalizeRole(p.role);
            return role && role !== requestedRole;
          })
        : null;
    }

    let profile = (profiles && profiles[0]) || null;
    if (!profile) {
      if (profileByEmail) {
        if (roleConflictProfile) {
          const conflictRole = normalizeRole(roleConflictProfile.role);
          return res.status(409).json({
            message: `This email is already registered as ${conflictRole}. Please login as ${conflictRole}.`,
          });
        }

        const updates = {
          firebase_uid: firebaseUid,
          name: name || profileByEmail.name,
          email: email || profileByEmail.email,
          role: profileByEmail.role || roleInput || "student",
          college: collegeInput || profileByEmail.college || null,
          avatar_url: avatarInput || profileByEmail.avatar_url || null,
        };

        const { data: linked, error: linkErr } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", profileByEmail.id)
          .select()
          .limit(1);
        if (linkErr) return res.status(500).json({ message: linkErr.message });
        profile = linked && linked[0];
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from("profiles")
          .insert([
            {
              firebase_uid: firebaseUid,
              name,
              email,
              role: roleInput || null,
              college: collegeInput || null,
              avatar_url: avatarInput || null,
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .limit(1);
        if (insertErr) return res.status(500).json({ message: insertErr.message });
        profile = inserted && inserted[0];
      }
    } else {
      // update basic fields if missing
      try {
        const currentProfileRole = normalizeRole(profile.role);
        if (requestedRole && currentProfileRole && requestedRole !== currentProfileRole) {
          return res.status(409).json({
            message: `This email is already registered as ${currentProfileRole}. Please login as ${currentProfileRole}.`,
          });
        }

        if (roleConflictProfile) {
          const conflictRole = normalizeRole(roleConflictProfile.role);
          return res.status(409).json({
            message: `This email is already registered as ${conflictRole}. Please login as ${conflictRole}.`,
          });
        }

        const updates = {
          name: name || profile.name,
        };
        if (!profileByEmail || profileByEmail.id === profile.id) {
          updates.email = email || profile.email;
        }
        if (roleInput) updates.role = roleInput;
        if (collegeInput) updates.college = collegeInput;
        if (avatarInput) updates.avatar_url = avatarInput;

        await supabase.from("profiles").update(updates).eq("firebase_uid", firebaseUid);
      } catch (e) {
        // ignore
      }
    }

    const role = profile?.role || roleInput || "student";
    const backendToken = jwt.sign({ id: firebaseUid, role }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "7d" });

    return res.json({ token: backendToken, user: { id: profile?.id || null, firebase_uid: firebaseUid, role, name: profile?.name || name, email: profile?.email || email } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

/* GET /api/auth/profile - Get current user profile */
router.get("/profile", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const decoded = req.firebaseDecoded || {};
    const supabase = getSupabase();

    const profile = await ensureProfileForRequest(supabase, firebaseUid, decoded);
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    res.json({ profile });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* PUT /api/auth/profile - Update current user profile */
router.put("/profile", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const decoded = req.firebaseDecoded || {};
    const supabase = getSupabase();
    const { name, college, avatar_url, role } = req.body || {};

    console.log("UPDATE PROFILE: firebaseUid=", firebaseUid, "payload=", { name, college, avatar_url, role });

    if (role !== undefined) {
      return res.status(403).json({ message: "Role cannot be changed from profile settings" });
    }

    if (!firebaseUid) {
      console.log("ERROR: No firebaseUid in request");
      return res.status(400).json({ message: "No firebaseUid in token" });
    }

    const payload = {};
    if (name !== undefined) payload.name = name;
    if (college !== undefined) payload.college = college;
    if (avatar_url !== undefined) payload.avatar_url = avatar_url;

    if (Object.keys(payload).length === 0) {
      console.log("WARNING: Empty payload for profile update");
      return res.status(400).json({ message: "No fields to update" });
    }

    console.log("Updating profile with payload:", payload);

    let existingProfile;
    try {
      existingProfile = await ensureProfileForRequest(supabase, firebaseUid, decoded);
    } catch (checkErr) {
      console.error("Error checking/creating profile:", checkErr.message);
      return res.status(500).json({ message: `Database check error: ${checkErr.message}` });
    }

    if (!existingProfile?.id) {
      return res.status(404).json({ message: "Profile not found. Please ensure your email is verified and try again." });
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", existingProfile.id)
      .select()
      .limit(1);

    console.log("Update response - error:", error, "data:", data);

    if (error) {
      console.error("Supabase update error:", error.message);
      return res.status(500).json({ message: `Database error: ${error.message}` });
    }

    const profile = data && data[0];
    if (!profile) {
      console.error("No profile returned after update");
      return res.status(500).json({ message: "Update succeeded but profile not returned" });
    }

    console.log("Profile updated successfully:", profile.id);
    res.json({ profile });
  } catch (error) {
    console.error("Update profile exception:", error);
    res.status(500).json({ message: error.message });
  }
});

/* GET /api/auth/analytics/weekly - Weekly analytics for dashboard */
router.get("/analytics/weekly", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const decoded = req.firebaseDecoded || {};
    const supabase = getSupabase();

    const profile = await ensureProfileForRequest(supabase, firebaseUid, decoded);
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    const weekly = buildLast7Days();
    const indexByKey = new Map(weekly.map((row, idx) => [row.key, idx]));
    const { data: signupRows, error: signupErr } = await supabase
      .from("profiles")
      .select("created_at,updated_at")
      .limit(5000);

    if (signupErr) {
      console.warn("[ANALYTICS] profiles query failed:", signupErr.message);
    }

    const { data: postRows, error: postErr } = await supabase
      .from("posts")
      .select("created_at,updated_at,source")
      .limit(5000);
    if (postErr) {
      return res.status(500).json({ message: postErr.message });
    }

    for (const row of signupRows || []) {
      const key = getDayKey(resolveRowTimestamp(row));
      if (!key) continue;
      const idx = indexByKey.get(key);
      if (idx === undefined) continue;
      weekly[idx].signups += 1;
    }

    for (const row of postRows || []) {
      const key = getDayKey(resolveRowTimestamp(row));
      if (!key) continue;
      const idx = indexByKey.get(key);
      if (idx === undefined) continue;
      weekly[idx].posts += 1;
    }

    const totals = weekly.reduce(
      (acc, row) => {
        acc.signups += row.signups;
        acc.posts += row.posts;
        return acc;
      },
      { signups: 0, posts: 0 }
    );

    return res.json({
      data: weekly,
      totals,
      scope: "platform",
      meta: {
        signupRowsScanned: (signupRows || []).length,
        postRowsScanned: (postRows || []).length,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

/* POST /api/auth/join-college-community - Auto-join student to their college community */
router.post("/join-college-community", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const decoded = req.firebaseDecoded || {};
    const { college } = req.body || {};
    
    if (!college || !college.trim()) {
      return res.status(400).json({ message: "College name is required" });
    }

    const supabase = getSupabase();

    let profile;
    try {
      profile = await ensureProfileForRequest(supabase, firebaseUid, decoded);
    } catch (profileErr) {
      return res.status(500).json({ message: profileErr.message });
    }
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const studentId = profile.id;

    // Try to use the RPC function if it exists
    try {
      const { data, error } = await supabase.rpc('add_student_to_college_community', {
        p_student_id: studentId,
        p_college_name: college.trim()
      });

      if (error && error.code !== 'PGRST110') { // PGRST110 means function doesn't exist
        console.warn("RPC error:", error.message);
        // Fall through to manual community creation
      } else if (!error) {
        return res.json({ message: `Successfully joined ${college} community`, community_id: data });
      }
    } catch (rpcError) {
      console.warn("RPC call failed, attempting manual community join:", rpcError.message);
    }

    // If RPC doesn't exist, manually create/join community
    // Get or create college community
    const { data: existingCommunity, error: communityCheckErr } = await supabase
      .from('college_communities')
      .select('id')
      .eq('college_name', college.trim())
      .limit(1);

    if (communityCheckErr && communityCheckErr.code !== 'PGRST116') {
      // PGRST116 means table doesn't exist, which is fine
      console.warn("Community check error:", communityCheckErr.message);
    }

    let communityId = null;

    if (existingCommunity && existingCommunity.length > 0) {
      communityId = existingCommunity[0].id;
    } else if (!communityCheckErr || communityCheckErr.code === 'PGRST116') {
      // Table might not exist, try to create community
      try {
        const { data: newCommunity, error: createError } = await supabase
          .from('college_communities')
          .insert([{
            college_name: college.trim(),
            description: `Official community for ${college.trim()} students`
          }])
          .select()
          .limit(1);

        if (createError && createError.code !== 'PGRST116') {
          console.warn("Create community error:", createError.message);
        } else if (newCommunity && newCommunity.length > 0) {
          communityId = newCommunity[0].id;
        }
      } catch (e) {
        console.warn("Manual community creation failed:", e.message);
      }
    }

    // Add student to community
    if (communityId) {
      try {
        await supabase
          .from('community_members')
          .insert([{
            community_id: communityId,
            user_id: studentId,
            role: 'member'
          }])
          .select();

        return res.json({ message: `Successfully joined ${college} community`, community_id: communityId });
      } catch (memberError) {
        // Might already be a member
        console.log("Community member insert (may already exist):", memberError.message);
        return res.json({ message: `You are now part of ${college} community` });
      }
    }

    // If we couldn't create the community structure, still consider it a success
    res.json({ message: `College set to ${college}. Community features will be available when configured.` });

  } catch (error) {
    console.error("Join college community error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
