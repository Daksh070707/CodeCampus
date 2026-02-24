import express from "express";
import { getSupabase } from "../config/supabase.js";
import { verifyFirebaseToken } from "../middleware/firebaseAuth.js";

const router = express.Router();

// GET /api/messages/conversations - list user's conversations
router.get("/conversations", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();

    const { data: profiles, error: pErr } = await supabase.from("profiles").select("id,name,avatar_url").eq("firebase_uid", firebaseUid).limit(1);
    if (pErr) return res.status(500).json({ message: pErr.message });
    const profile = (profiles && profiles[0]) || null;
    if (!profile) return res.status(400).json({ message: "Profile not found" });

    // fetch conversations where user is a participant, include last message
    const { data, error } = await supabase
      .from("conversations as c")
      .select(`c.id, c.title, c.is_group, c.created_at, messages:messages(content,created_at,sender_id)`)
      .in("c.id", (await supabase.from("participants").select("conversation_id").eq("user_id", profile.id)).then(r => (r.data || []).map(x => x.conversation_id)))
      .order("created_at", { foreignTable: "c", ascending: false });

    if (error) return res.status(500).json({ message: error.message });

    // simplify last message
    const convs = (data || []).map((c) => {
      const last = (c.messages || []).length ? c.messages[c.messages.length - 1] : null;
      return { id: c.id, title: c.title, is_group: c.is_group, lastMessage: last ? last.content : null, lastAt: last ? last.created_at : c.created_at };
    });

    res.json({ conversations: convs });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/messages/conversations - create conversation
router.post("/conversations", verifyFirebaseToken, async (req, res) => {
  try {
    const { title, participantIds } = req.body; // participantIds: array of profile ids
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();

    const { data: profiles, error: pErr } = await supabase.from("profiles").select("id").eq("firebase_uid", firebaseUid).limit(1);
    if (pErr) return res.status(500).json({ message: pErr.message });
    const me = (profiles && profiles[0]) || null;
    if (!me) return res.status(400).json({ message: "Profile not found" });

    const { data: inserted, error: insertErr } = await supabase.from("conversations").insert([{ title: title || null, is_group: Array.isArray(participantIds) && participantIds.length > 1 }]).select().limit(1);
    if (insertErr) return res.status(500).json({ message: insertErr.message });
    const conv = inserted[0];

    // insert participants (include self)
    const pids = Array.isArray(participantIds) ? Array.from(new Set([...participantIds, me.id])) : [me.id];
    const rows = pids.map((uid) => ({ conversation_id: conv.id, user_id: uid }));
    await supabase.from("participants").insert(rows);

    res.status(201).json({ conversation: conv });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET messages for a conversation
router.get("/conversations/:id/messages", verifyFirebaseToken, async (req, res) => {
  try {
    const convId = req.params.id;
    const supabase = getSupabase();

    const { data, error } = await supabase.from("messages").select("id,content,sender_id,created_at").eq("conversation_id", convId).order("created_at", { ascending: true }).limit(1000);
    if (error) return res.status(500).json({ message: error.message });

    // fetch sender profiles
    const uids = Array.from(new Set((data || []).map((m) => m.sender_id).filter(Boolean)));
    let profilesMap = {};
    if (uids.length) {
      const { data: profiles } = await supabase.from("profiles").select("id,name,avatar_url").in("id", uids);
      (profiles || []).forEach((p) => (profilesMap[p.id] = p));
    }

    const enriched = (data || []).map((m) => ({ ...m, author: profilesMap[m.sender_id]?.name || "", avatar: profilesMap[m.sender_id]?.avatar_url || "" }));
    res.json({ messages: enriched });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST send message in conversation
router.post("/conversations/:id/messages", verifyFirebaseToken, async (req, res) => {
  try {
    const convId = req.params.id;
    const { content } = req.body;
    if (!content || !content.toString().trim()) return res.status(400).json({ message: "Missing content" });

    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();

    const { data: profiles, error: pErr } = await supabase.from("profiles").select("id").eq("firebase_uid", firebaseUid).limit(1);
    if (pErr) return res.status(500).json({ message: pErr.message });
    const me = (profiles && profiles[0]) || null;
    if (!me) return res.status(400).json({ message: "Profile not found" });

    const payload = { conversation_id: convId, sender_id: me.id, content: content.toString(), created_at: new Date().toISOString() };
    const { data: inserted, error: insertErr } = await supabase.from("messages").insert([payload]).select().limit(1);
    if (insertErr) return res.status(500).json({ message: insertErr.message });

    res.status(201).json({ message: inserted[0] });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
