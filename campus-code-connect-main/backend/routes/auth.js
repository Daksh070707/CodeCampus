import express from "express";
import jwt from "jsonwebtoken";
import { getSupabase } from "../config/supabase.js";
import { verifyFirebaseIdToken } from "../middleware/firebaseAuth.js";

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
      const { data: inserted, error: insertErr } = await supabase.from("profiles").insert([{ firebase_uid: firebaseUid, name, email }]).select().limit(1);
      if (insertErr) return res.status(500).json({ message: insertErr.message });
      profile = inserted && inserted[0];
    } else {
      // update basic fields if missing
      try {
        await supabase.from("profiles").update({ name: name || profile.name, email: email || profile.email }).eq("firebase_uid", firebaseUid);
      } catch (e) {
        // ignore
      }
    }

    const role = profile?.role || "recruiter" || "student";
    const backendToken = jwt.sign({ id: firebaseUid, role }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "7d" });

    return res.json({ token: backendToken, user: { id: profile?.id || null, firebase_uid: firebaseUid, role, name: profile?.name || name, email: profile?.email || email } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;

