import express from "express";
import { getSupabase } from "../config/supabase.js";
import { verifyFirebaseToken } from "../middleware/firebaseAuth.js";

const router = express.Router();

// GET /api/messages/conversations - list user's conversations
router.get("/conversations", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();

    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id,name,avatar_url")
      .eq("firebase_uid", firebaseUid)
      .limit(1);
    
    if (pErr) return res.status(500).json({ message: pErr.message });
    const profile = (profiles && profiles[0]) || null;
    if (!profile) return res.status(400).json({ message: "Profile not found" });

    // Get conversation IDs where user is a participant
    const { data: participantData } = await supabase
      .from("participants")
      .select("conversation_id")
      .eq("user_id", profile.id);
    
    const conversationIds = (participantData || []).map(p => p.conversation_id);
    
    if (conversationIds.length === 0) {
      return res.json({ conversations: [] });
    }

    // Fetch conversations with details
    const { data: conversations, error: convErr } = await supabase
      .from("conversations")
      .select("id, title, is_group, created_at, last_message_at")
      .in("id", conversationIds)
      .order("last_message_at", { ascending: false });
    
    if (convErr) return res.status(500).json({ message: convErr.message });

    // Fetch unread counts
    const { data: unreadData } = await supabase
      .from("conversation_participants_metadata")
      .select("conversation_id, unread_count")
      .eq("user_id", profile.id)
      .in("conversation_id", conversationIds);
    
    const unreadMap = {};
    (unreadData || []).forEach(u => {
      unreadMap[u.conversation_id] = u.unread_count || 0;
    });

    // Fetch last message for each conversation
    const enrichedConversations = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { data: lastMessages } = await supabase
          .from("messages")
          .select("content, created_at, sender_id")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1);
        
        const lastMessage = lastMessages && lastMessages[0];
        
        return {
          id: conv.id,
          title: conv.title,
          is_group: conv.is_group,
          lastMessage: lastMessage ? lastMessage.content : null,
          lastAt: lastMessage ? lastMessage.created_at : conv.created_at,
          unread_count: unreadMap[conv.id] || 0
        };
      })
    );

    res.json({ conversations: enrichedConversations });
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
