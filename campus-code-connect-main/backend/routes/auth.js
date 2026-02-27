import express from "express";
import jwt from "jsonwebtoken";
import { getSupabase } from "../config/supabase.js";
import { verifyFirebaseIdToken, verifyFirebaseToken } from "../middleware/firebaseAuth.js";

const router = express.Router();

/* REGISTER */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    let supabase
    try {
      supabase = getSupabase()
    } catch (e) {
      return res.status(500).json({ message: e.message })
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
      await supabase.from('profiles').upsert({ id: user.id, name, email, role });
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
    const { email, password } = req.body;

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
    const email = decoded.email || null;
    const name = decoded.name || decoded.email || null;
    const roleInput = req.body?.role || null;
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

    let profile = (profiles && profiles[0]) || null;
    if (!profile) {
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
          },
        ])
        .select()
        .limit(1);
      if (insertErr) return res.status(500).json({ message: insertErr.message });
      profile = inserted && inserted[0];
    } else {
      // update basic fields if missing
      try {
        const updates = {
          name: name || profile.name,
          email: email || profile.email,
        };
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
    const supabase = getSupabase();

    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("firebase_uid", firebaseUid)
      .limit(1);
    
    if (profileErr) return res.status(500).json({ message: profileErr.message });
    
    const profile = (profiles && profiles[0]) || null;
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
    const supabase = getSupabase();
    const { name, college, avatar_url, role } = req.body || {};

    console.log("UPDATE PROFILE: firebaseUid=", firebaseUid, "payload=", { name, college, avatar_url, role });

    if (!firebaseUid) {
      console.log("ERROR: No firebaseUid in request");
      return res.status(400).json({ message: "No firebaseUid in token" });
    }

    const payload = {};
    if (name !== undefined) payload.name = name;
    if (college !== undefined) payload.college = college;
    if (avatar_url !== undefined) payload.avatar_url = avatar_url;
    if (role !== undefined) payload.role = role;

    if (Object.keys(payload).length === 0) {
      console.log("WARNING: Empty payload for profile update");
      return res.status(400).json({ message: "No fields to update" });
    }

    console.log("Updating profile with payload:", payload);

    // First, check if profile exists
    const { data: existingProfiles, error: checkErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("firebase_uid", firebaseUid)
      .limit(1);

    if (checkErr) {
      console.error("Error checking profile existence:", checkErr.message);
      return res.status(500).json({ message: `Database check error: ${checkErr.message}` });
    }

    if (!existingProfiles || existingProfiles.length === 0) {
      console.error("Profile not found for firebase_uid:", firebaseUid);
      return res.status(404).json({ message: "Profile not found. Please ensure your email is verified and try again." });
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("firebase_uid", firebaseUid)
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

export default router;

