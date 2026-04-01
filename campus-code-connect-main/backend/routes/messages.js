import express from "express";
import { getSupabase } from "../config/supabase.js";
import { verifyFirebaseToken } from "../middleware/firebaseAuth.js";

const router = express.Router();

// UUID validator
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === "string" && UUID_REGEX.test(value);
}

// Profile resolver - supports both Firebase and email/password auth
async function resolveCurrentProfile(supabase, firebaseUid, decoded, select = "id") {
  if (firebaseUid && !isUuid(firebaseUid)) {
    const { data, error } = await supabase.from("profiles").select(select).eq("firebase_uid", firebaseUid).limit(1);
    if (error) throw error;
    if (data && data[0]) return data[0];
  }

  if (firebaseUid && isUuid(firebaseUid)) {
    const { data, error } = await supabase.from("profiles").select(select).eq("id", firebaseUid).limit(1);
    if (error) throw error;
    if (data && data[0]) return data[0];
  }

  if (decoded?.email) {
    const { data, error } = await supabase.from("profiles").select(select).eq("email", decoded.email).limit(1);
    if (error) throw error;
    if (data && data[0]) return data[0];
  }

  return null;
}

// GET /api/messages/conversations - list user's conversations
router.get("/conversations", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();

    // Use multi-path profile resolver
    const profile = await resolveCurrentProfile(supabase, firebaseUid, req.firebaseDecoded, "id,name,avatar_url");
    
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

    // Use multi-path profile resolver
    const me = await resolveCurrentProfile(supabase, firebaseUid, req.firebaseDecoded, "id");
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

    const { data, error } = await supabase
      .from("messages")
      .select("id,content,sender_id,created_at,image_url,attachment_url,attachment_name,is_read")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(1000);
    
    if (error) return res.status(500).json({ message: error.message });

    // fetch sender profiles
    const uids = Array.from(new Set((data || []).map((m) => m.sender_id).filter(Boolean)));
    let profilesMap = {};
    if (uids.length) {
      const { data: profiles } = await supabase.from("profiles").select("id,name,avatar_url").in("id", uids);
      (profiles || []).forEach((p) => (profilesMap[p.id] = p));
    }

    const enriched = (data || []).map((m) => ({ 
      ...m, 
      author: profilesMap[m.sender_id]?.name || "", 
      avatar: profilesMap[m.sender_id]?.avatar_url || "" 
    }));
    res.json({ messages: enriched });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST send message in conversation
router.post("/conversations/:id/messages", verifyFirebaseToken, async (req, res) => {
  try {
    const convId = req.params.id;
    const { content, image_url, attachment_url, attachment_name } = req.body;
    
    // Allow message if either content exists or attachments exist
    const hasContent = content && content.toString().trim();
    const hasAttachments = image_url || attachment_url;
    if (!hasContent && !hasAttachments) {
      return res.status(400).json({ message: "Message must have content or attachments" });
    }

    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();

    // Use multi-path profile resolver
    const me = await resolveCurrentProfile(supabase, firebaseUid, req.firebaseDecoded, "id");
    if (!me) return res.status(400).json({ message: "Profile not found" });

    const payload = {
      conversation_id: convId,
      sender_id: me.id,
      content: content ? content.toString().trim() : null,
      image_url: image_url || null,
      attachment_url: attachment_url || null,
      attachment_name: attachment_name || null,
      created_at: new Date().toISOString()
    };
    
    const { data: inserted, error: insertErr } = await supabase
      .from("messages")
      .insert([payload])
      .select("id,content,sender_id,created_at,image_url,attachment_url,attachment_name,is_read")
      .limit(1);
    
    if (insertErr) return res.status(500).json({ message: insertErr.message });

    // Fetch sender profile for response
    const msgData = inserted[0];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,name,avatar_url")
      .eq("id", me.id)
      .limit(1);
    
    const profile = profiles && profiles[0];
    const enrichedMsg = {
      ...msgData,
      author: profile?.name || "",
      avatar: profile?.avatar_url || ""
    };

    res.status(201).json({ message: enrichedMsg });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE /api/messages/conversations/:convId/messages/:msgId - delete a message
router.delete("/conversations/:convId/messages/:msgId", verifyFirebaseToken, async (req, res) => {
  try {
    const { convId, msgId } = req.params;
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();

    // Get the message to verify sender
    const { data: message, error: fetchErr } = await supabase
      .from("messages")
      .select("id,sender_id,conversation_id")
      .eq("id", msgId)
      .limit(1);
    
    if (fetchErr) return res.status(500).json({ message: fetchErr.message });
    if (!message || message.length === 0) {
      return res.status(404).json({ message: "Message not found" });
    }

    const msg = message[0];
    
    // Verify the user is the sender
    const me = await resolveCurrentProfile(supabase, firebaseUid, req.firebaseDecoded, "id");
    if (!me) return res.status(400).json({ message: "Profile not found" });
    if (msg.sender_id !== me.id) {
      return res.status(403).json({ message: "You can only delete your own messages" });
    }

    // Verify conversation ID matches
    if (msg.conversation_id !== convId) {
      return res.status(400).json({ message: "Message does not belong to this conversation" });
    }

    // Delete the message
    const { error: deleteErr } = await supabase
      .from("messages")
      .delete()
      .eq("id", msgId);
    
    if (deleteErr) return res.status(500).json({ message: deleteErr.message });

    console.log("[DELETE] Message deleted:", msgId);
    res.json({ success: true, message: "Message deleted successfully" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
