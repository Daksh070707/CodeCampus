import express from "express";
import { getSupabase } from "../config/supabase.js";
import { verifyFirebaseToken } from "../middleware/firebaseAuth.js";

const router = express.Router();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === "string" && UUID_REGEX.test(value);
}

async function resolveCurrentProfile(supabase, firebaseUid, decoded, select = "id") {
  console.log(`[RESOLVE] Starting profile resolution: firebaseUid=${firebaseUid}, select="${select}"`);
  console.log(`[RESOLVE] Is UUID: ${isUuid(firebaseUid)}`);
  console.log(`[RESOLVE] Decoded:`, { email: decoded?.email, aud: decoded?.aud });

  if (firebaseUid && !isUuid(firebaseUid)) {
    console.log(`[RESOLVE] Attempting firebase_uid lookup...`);
    const { data, error } = await supabase.from("profiles").select(select).eq("firebase_uid", firebaseUid).limit(1);
    if (error) {
      console.error(`[RESOLVE] firebase_uid lookup error:`, error);
      throw error;
    }
    console.log(`[RESOLVE] firebase_uid lookup result:`, data);
    if (data && data[0]) {
      console.log(`[RESOLVE] ✓ Found profile by firebase_uid`);
      return data[0];
    }
  }

  if (firebaseUid && isUuid(firebaseUid)) {
    console.log(`[RESOLVE] Attempting UUID id lookup...`);
    const { data, error } = await supabase.from("profiles").select(select).eq("id", firebaseUid).limit(1);
    if (error) {
      console.error(`[RESOLVE] UUID lookup error:`, error);
      throw error;
    }
    console.log(`[RESOLVE] UUID lookup result:`, data);
    if (data && data[0]) {
      console.log(`[RESOLVE] ✓ Found profile by UUID id`);
      return data[0];
    }
  }

  if (decoded?.email) {
    console.log(`[RESOLVE] Attempting email lookup for: ${decoded.email}...`);
    const { data, error } = await supabase.from("profiles").select(select).eq("email", decoded.email).limit(1);
    if (error) {
      console.error(`[RESOLVE] Email lookup error:`, error);
      throw error;
    }
    console.log(`[RESOLVE] Email lookup result:`, data);
    if (data && data[0]) {
      console.log(`[RESOLVE] ✓ Found profile by email`);
      return data[0];
    }
  }

  console.log(`[RESOLVE] ✗ No profile found for any of the lookup methods`);
  return null;
}

// GET /api/connections/profile - Get current user's profile
router.get("/profile", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();

    let profile;
    try {
      profile = await resolveCurrentProfile(supabase, firebaseUid, req.firebaseDecoded, "*");
    } catch (pErr) {
      return res.status(500).json({ message: pErr.message });
    }

    if (!profile) return res.status(400).json({ message: "Profile not found" });

    res.json({ profile });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/connections/friends - Get list of friends
router.get("/friends", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();

    console.log(`[CONNECTIONS] Fetching friends for user ${firebaseUid}`);

    let profile;
    try {
      profile = await resolveCurrentProfile(supabase, firebaseUid, req.firebaseDecoded, "id");
    } catch (pErr) {
      return res.status(500).json({ message: pErr.message });
    }
    if (!profile) return res.status(400).json({ message: "Profile not found" });

    // Get all accepted connections
    const { data: connections, error } = await supabase
      .from("connections")
      .select(`
        id,
        user_id,
        friend_id,
        created_at,
        friend:profiles!connections_friend_id_fkey(id, name, email, avatar_url, role, college)
      `)
      .eq("user_id", profile.id)
      .eq("status", "accepted");

    if (error) {
      console.error(`[CONNECTIONS] Friends fetch error:`, error.message);
      return res.status(500).json({ message: error.message });
    }

    const friends = (connections || []).map(c => ({
      connection_id: c.id,
      ...c.friend,
      friends_since: c.created_at
    }));

    console.log(`[CONNECTIONS] Friends found:`, friends.length);

    res.json({ friends });
  } catch (e) {
    console.error("[CONNECTIONS] Friends error:", e);
    res.status(500).json({ message: e.message });
  }
});

// GET /api/connections/search - Search for users by name, email, or username
router.get("/search", verifyFirebaseToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      console.log(`[CONNECTIONS] Search called with empty query`);
      return res.json({ users: [] });
    }

    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();

    console.log(`[CONNECTIONS] ========== SEARCH START ==========`);
    console.log(`[CONNECTIONS] Search query: "${q}"`);
    console.log(`[CONNECTIONS] Current user Firebase UID: ${firebaseUid}`);

    // Get current user
    let profile;
    try {
      profile = await resolveCurrentProfile(supabase, firebaseUid, req.firebaseDecoded, "id, role, name, email");
    } catch (pErr) {
      console.error(`[CONNECTIONS] Current user fetch error:`, pErr.message);
      return res.status(500).json({ message: pErr.message });
    }

    if (!profile) {
      console.error(`[CONNECTIONS] Profile not found for identifier: ${firebaseUid}`);
      return res.status(400).json({ message: "Profile not found" });
    }

    console.log(`[CONNECTIONS] Current user found:`, { id: profile.id, role: profile.role, name: profile.name });

    // Search for users by name, email, or username (case-insensitive)
    // Using OR filters to search across multiple fields
    const searchFilter = `name.ilike.%${q}%,email.ilike.%${q}%`;
    console.log(`[CONNECTIONS] Executing search with filter:`, searchFilter);

    const { data: foundUsers, error: searchErr } = await supabase
      .from("profiles")
      .select("id, name, email, avatar_url, role, college")
      .neq("id", profile.id) // Exclude current user
      .or(searchFilter)
      .limit(30);

    if (searchErr) {
      console.error(`[CONNECTIONS] Search query error:`, searchErr.message);
      return res.status(500).json({ message: searchErr.message });
    }

    console.log(`[CONNECTIONS] Found ${foundUsers?.length || 0} users matching query`);
    if (foundUsers && foundUsers.length > 0) {
      console.log(`[CONNECTIONS] First 3 results:`, foundUsers.slice(0, 3).map(u => ({ id: u.id, name: u.name, email: u.email })));
    }

    // Get connection status for each found user
    const usersWithStatus = await Promise.all((foundUsers || []).map(async (user) => {
      try {
        const { data: connOutgoing } = await supabase
          .from("connections")
          .select("id, status")
          .eq("user_id", profile.id)
          .eq("friend_id", user.id)
          .limit(1);

        const { data: connIncoming } = await supabase
          .from("connections")
          .select("id, status")
          .eq("user_id", user.id)
          .eq("friend_id", profile.id)
          .limit(1);

        let status = "none";
        let requestId = null;
        if (connOutgoing && connOutgoing[0]) {
          status = connOutgoing[0].status === "accepted" ? "friends" : "request_sent";
          requestId = connOutgoing[0].id;
        } else if (connIncoming && connIncoming[0]) {
          status = connIncoming[0].status === "accepted" ? "friends" : "request_received";
          requestId = connIncoming[0].id;
        }

        return {
          ...user,
          connection_status: status,
          request_id: requestId
        };
      } catch (e) {
        console.error(`[CONNECTIONS] Error processing user ${user.id}:`, e.message);
        return {
          ...user,
          connection_status: "none",
          request_id: null
        };
      }
    }));

    console.log(`[CONNECTIONS] Search complete. Returning ${usersWithStatus.length} results with status`);
    console.log(`[CONNECTIONS] ========== SEARCH END ==========`);

    res.json({ users: usersWithStatus });
  } catch (e) {
    console.error("[CONNECTIONS] Search error:", e);
    console.error("[CONNECTIONS] Stack trace:", e.stack);
    res.status(500).json({ message: e.message });
  }
});

// GET /api/connections/all - Get all users for discover tab
router.get("/all", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();

    console.log(`[CONNECTIONS] ========== ALL USERS START ==========`);
    console.log(`[CONNECTIONS] Firebase UID:`, firebaseUid);
    console.log(`[CONNECTIONS] Is UUID:`, isUuid(firebaseUid));
    console.log(`[CONNECTIONS] Decoded:`, req.firebaseDecoded);

    // Get current user
    let profile;
    try {
      console.log(`[CONNECTIONS] Attempting to resolve current profile...`);
      profile = await resolveCurrentProfile(supabase, firebaseUid, req.firebaseDecoded, "id");
      console.log(`[CONNECTIONS] Profile resolved:`, profile);
    } catch (pErr) {
      console.error(`[CONNECTIONS] Current user fetch ERROR:`, pErr);
      console.error(`[CONNECTIONS] Error message:`, pErr.message);
      console.error(`[CONNECTIONS] Error stack:`, pErr.stack);
      return res.status(500).json({ message: `Profile resolution failed: ${pErr.message}` });
    }

    if (!profile) {
      console.error(`[CONNECTIONS] Profile not found for identifier: ${firebaseUid}`);
      return res.status(400).json({ message: "Profile not found" });
    }

    console.log(`[CONNECTIONS] Current user ID: ${profile.id}`);

    // Get all users except current user
    console.log(`[CONNECTIONS] Fetching all users except ${profile.id}...`);
    const { data: allUsers, error: fetchErr } = await supabase
      .from("profiles")
      .select("id, name, email, avatar_url, role, college")
      .neq("id", profile.id)
      .limit(100);

    if (fetchErr) {
      console.error(`[CONNECTIONS] Fetch all users DB ERROR:`, fetchErr);
      return res.status(500).json({ message: `Database error: ${fetchErr.message}` });
    }

    console.log(`[CONNECTIONS] Found ${allUsers?.length || 0} total users`);

    // Get connection status for each user
    const usersWithStatus = await Promise.all((allUsers || []).map(async (user) => {
      try {
        const { data: connOutgoing } = await supabase
          .from("connections")
          .select("id, status")
          .eq("user_id", profile.id)
          .eq("friend_id", user.id)
          .limit(1);

        const { data: connIncoming } = await supabase
          .from("connections")
          .select("id, status")
          .eq("user_id", user.id)
          .eq("friend_id", profile.id)
          .limit(1);

        let status = "none";
        let requestId = null;
        if (connOutgoing && connOutgoing[0]) {
          status = connOutgoing[0].status === "accepted" ? "friends" : "request_sent";
          requestId = connOutgoing[0].id;
        } else if (connIncoming && connIncoming[0]) {
          status = connIncoming[0].status === "accepted" ? "friends" : "request_received";
          requestId = connIncoming[0].id;
        }

        return {
          ...user,
          connection_status: status,
          request_id: requestId
        };
      } catch (e) {
        console.error(`[CONNECTIONS] Error processing user ${user.id}:`, e.message);
        return {
          ...user,
          connection_status: "none",
          request_id: null
        };
      }
    }));

    console.log(`[CONNECTIONS] Returning ${usersWithStatus.length} users with status`);
    console.log(`[CONNECTIONS] ========== ALL USERS END ==========`);
    res.json({ users: usersWithStatus });
  } catch (e) {
    console.error("[CONNECTIONS] Fetch all GENERAL error:", e);
    console.error("[CONNECTIONS] Stack trace:", e.stack);
    res.status(500).json({ message: `Server error: ${e.message}` });
  }
});

// GET /api/connections/requests - Get pending friend requests
router.get("/requests", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();

    console.log(`[CONNECTIONS] Fetching requests for user ${firebaseUid}`);

    let profile;
    try {
      profile = await resolveCurrentProfile(supabase, firebaseUid, req.firebaseDecoded, "id");
    } catch (pErr) {
      return res.status(500).json({ message: pErr.message });
    }
    if (!profile) return res.status(400).json({ message: "Profile not found" });

    // Get received requests (where I'm the friend_id)
    const { data: received, error: recErr } = await supabase
      .from("connections")
      .select(`
        id,
        user_id,
        created_at,
        sender:profiles!connections_user_id_fkey(id, name, email, avatar_url, role, college)
      `)
      .eq("friend_id", profile.id)
      .eq("status", "pending");

    // Get sent requests (where I'm the user_id)
    const { data: sent, error: sentErr } = await supabase
      .from("connections")
      .select(`
        id,
        friend_id,
        created_at,
        receiver:profiles!connections_friend_id_fkey(id, name, email, avatar_url, role, college)
      `)
      .eq("user_id", profile.id)
      .eq("status", "pending");

    if (recErr || sentErr) {
      console.error(`[CONNECTIONS] Request fetch errors:`, { recErr: recErr?.message, sentErr: sentErr?.message });
      return res.status(500).json({ message: recErr?.message || sentErr?.message });
    }

    const receivedRequests = (received || []).map(r => ({
      request_id: r.id,
      type: "received",
      ...r.sender,
      created_at: r.created_at
    }));

    const sentRequests = (sent || []).map(r => ({
      request_id: r.id,
      type: "sent",
      ...r.receiver,
      created_at: r.created_at
    }));

    console.log(`[CONNECTIONS] Requests found:`, { received: receivedRequests.length, sent: sentRequests.length });

    res.json({ 
      received: receivedRequests, 
      sent: sentRequests,
      total_received: receivedRequests.length,
      total_sent: sentRequests.length
    });
  } catch (e) {
    console.error("[CONNECTIONS] Requests error:", e);
    res.status(500).json({ message: e.message });
  }
});

// POST /api/connections/send - Send friend request
router.post("/send", verifyFirebaseToken, async (req, res) => {
  try {
    const { friend_id } = req.body;
    if (!friend_id) return res.status(400).json({ message: "friend_id required" });

    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();

    console.log(`[CONNECTIONS] Sending friend request from ${firebaseUid} to ${friend_id}`);

    let profile;
    try {
      profile = await resolveCurrentProfile(supabase, firebaseUid, req.firebaseDecoded, "id");
    } catch (pErr) {
      return res.status(500).json({ message: pErr.message });
    }
    if (!profile) return res.status(400).json({ message: "Profile not found" });

    // Use the send_friend_request function
    const { data, error } = await supabase.rpc("send_friend_request", {
      sender_id: profile.id,
      receiver_id: friend_id
    });

    console.log(`[CONNECTIONS] Friend request result:`, { success: data?.success, message: data?.message, error: error?.message });

    if (error) return res.status(500).json({ message: error.message });

    if (!data.success) {
      return res.status(400).json({ message: data.message });
    }

    res.status(201).json(data);
  } catch (e) {
    console.error("[CONNECTIONS] Send error:", e);
    res.status(500).json({ message: e.message });
  }
});

// POST /api/connections/accept - Accept friend request
router.post("/accept", verifyFirebaseToken, async (req, res) => {
  try {
    const { request_id } = req.body;
    if (!request_id) return res.status(400).json({ message: "request_id required" });

    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();

    console.log(`[CONNECTIONS] Accepting friend request ${request_id}`);

    let profile;
    try {
      profile = await resolveCurrentProfile(supabase, firebaseUid, req.firebaseDecoded, "id");
    } catch (pErr) {
      return res.status(500).json({ message: pErr.message });
    }
    if (!profile) return res.status(400).json({ message: "Profile not found" });

    // Use the accept_friend_request function
    const { data, error } = await supabase.rpc("accept_friend_request", {
      request_id: request_id,
      accepter_id: profile.id
    });

    console.log(`[CONNECTIONS] Accept result:`, { success: data?.success, message: data?.message, error: error?.message });

    if (error) return res.status(500).json({ message: error.message });

    if (!data.success) {
      return res.status(400).json({ message: data.message });
    }

    res.json(data);
  } catch (e) {
    console.error("[CONNECTIONS] Accept error:", e);
    res.status(500).json({ message: e.message });
  }
});

// DELETE /api/connections/:id - Decline request or unfriend
router.delete("/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const connection_id = req.params.id;
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();

    console.log(`[CONNECTIONS] Removing/declining connection ${connection_id}`);

    let profile;
    try {
      profile = await resolveCurrentProfile(supabase, firebaseUid, req.firebaseDecoded, "id");
    } catch (pErr) {
      return res.status(500).json({ message: pErr.message });
    }
    if (!profile) return res.status(400).json({ message: "Profile not found" });

    // Use the remove_connection function
    const { data, error } = await supabase.rpc("remove_connection", {
      connection_id: connection_id,
      user_id_param: profile.id
    });

    console.log(`[CONNECTIONS] Remove result:`, { success: data?.success, message: data?.message, error: error?.message });

    if (error) return res.status(500).json({ message: error.message });

    if (!data.success) {
      return res.status(400).json({ message: data.message });
    }

    res.json(data);
  } catch (e) {
    console.error("[CONNECTIONS] Remove error:", e);
    res.status(500).json({ message: e.message });
  }
});

// GET /api/connections/status/:userId - Check connection status with a user
router.get("/status/:userId", verifyFirebaseToken, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();

    let profile;
    try {
      profile = await resolveCurrentProfile(supabase, firebaseUid, req.firebaseDecoded, "id");
    } catch (pErr) {
      return res.status(500).json({ message: pErr.message });
    }
    if (!profile) return res.status(400).json({ message: "Profile not found" });

    // Check if there's a connection in either direction
    const { data: outgoing } = await supabase
      .from("connections")
      .select("id, status")
      .eq("user_id", profile.id)
      .eq("friend_id", targetUserId)
      .limit(1);

    const { data: incoming } = await supabase
      .from("connections")
      .select("id, status")
      .eq("user_id", targetUserId)
      .eq("friend_id", profile.id)
      .limit(1);

    let status = "none";
    let connection_id = null;

    if (outgoing && outgoing[0]) {
      status = outgoing[0].status === "accepted" ? "friends" : "request_sent";
      connection_id = outgoing[0].id;
    } else if (incoming && incoming[0]) {
      status = incoming[0].status === "accepted" ? "friends" : "request_received";
      connection_id = incoming[0].id;
    }

    res.json({ status, connection_id });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/connections/start-conversation - Start a conversation with a friend
router.post("/start-conversation", verifyFirebaseToken, async (req, res) => {
  try {
    const { friend_id } = req.body;
    if (!friend_id) return res.status(400).json({ message: "friend_id required" });

    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();

    let myProfile;
    try {
      myProfile = await resolveCurrentProfile(supabase, firebaseUid, req.firebaseDecoded, "id, name");
    } catch (pErr) {
      return res.status(500).json({ message: pErr.message });
    }
    if (!myProfile) return res.status(400).json({ message: "Profile not found" });

    // Get friend's profile
    const { data: friendProfiles } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("id", friend_id)
      .limit(1);

    const friendProfile = friendProfiles && friendProfiles[0];
    if (!friendProfile) return res.status(400).json({ message: "Friend not found" });

    // Check if conversation already exists between these two users
    const { data: existingParticipants } = await supabase
      .from("participants")
      .select("conversation_id")
      .in("user_id", [myProfile.id, friend_id]);

    if (existingParticipants && existingParticipants.length > 0) {
      // Find conversations where both users are participants
      const convIds = existingParticipants.map(p => p.conversation_id);
      const convCounts = {};
      convIds.forEach(id => {
        convCounts[id] = (convCounts[id] || 0) + 1;
      });

      const existingConvId = Object.keys(convCounts).find(id => convCounts[id] === 2);
      
      if (existingConvId) {
        const { data: existingConv } = await supabase
          .from("conversations")
          .select("*")
          .eq("id", existingConvId)
          .limit(1);

        if (existingConv && existingConv[0]) {
          return res.json({ conversation: existingConv[0], existed: true });
        }
      }
    }

    // Create new conversation
    const conversationTitle = `${myProfile.name} & ${friendProfile.name}`;
    const { data: newConv, error: convErr } = await supabase
      .from("conversations")
      .insert([{ title: conversationTitle, is_group: false }])
      .select()
      .limit(1);

    if (convErr) return res.status(500).json({ message: convErr.message });
    const conversation = newConv[0];

    // Add both users as participants
    const { error: partErr } = await supabase
      .from("participants")
      .insert([
        { conversation_id: conversation.id, user_id: myProfile.id },
        { conversation_id: conversation.id, user_id: friend_id }
      ]);

    if (partErr) return res.status(500).json({ message: partErr.message });

    res.status(201).json({ conversation, existed: false });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
