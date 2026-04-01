import express from "express";
import { getSupabase } from "../config/supabase.js";
import { verifyFirebaseToken } from "../middleware/firebaseAuth.js";

const router = express.Router();

function normalizeCollege(value) {
  if (!value || typeof value !== "string") return null;
  return value.trim().replace(/\s+/g, " ");
}

async function resolveProfile(supabase, firebaseUid, decoded) {
  // 1) Standard path: profile linked by firebase_uid.
  if (firebaseUid) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,name,college,avatar_url,role,email,firebase_uid")
      .eq("firebase_uid", firebaseUid)
      .limit(1);
    if (error) throw error;
    if (data && data[0]) return data[0];
  }

  // 2) JWT login path: token id may be profiles.id UUID.
  if (decoded?.id) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,name,college,avatar_url,role,email,firebase_uid")
      .eq("id", decoded.id)
      .limit(1);
    if (error) throw error;
    if (data && data[0]) return data[0];
  }

  // 3) Fallback by email when available.
  if (decoded?.email) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,name,college,avatar_url,role,email,firebase_uid")
      .eq("email", decoded.email)
      .limit(1);
    if (error) throw error;
    if (data && data[0]) return data[0];
  }

  return null;
}


// POST /api/posts
// Expects Authorization: Bearer <Firebase ID Token>
// Body: { content, title?, tags?, code? }
router.post("/", verifyFirebaseToken, async (req, res) => {
  try {
    const decoded = req.firebaseDecoded;
    const firebaseUid = req.firebaseUid;

    let supabase;
    try {
      supabase = getSupabase();
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }

    let profile;
    try {
      profile = await resolveProfile(supabase, firebaseUid, decoded);
    } catch (profileErr) {
      return res.status(500).json({ message: profileErr.message });
    }

    const { content, title, tags, code, image, document_link, source } = req.body;
    const normalizedContent = typeof content === "string" ? content.toString() : "";
    const hasText = normalizedContent.trim().length > 0;
    const hasAttachment = Boolean(code || image || document_link);
    if (!hasText && !hasAttachment) {
      return res.status(400).json({ message: "Missing content" });
    }

    const isCommunityPost = source === "community";
    const postSource = isCommunityPost ? "community" : "feed";
    const normalizedCollege = isCommunityPost
      ? normalizeCollege(profile?.college || req.body?.college || null)
      : null;

    const payload = {
      user_id: profile ? profile.id : null,
      author: profile?.name || decoded.name || decoded.email || "Anonymous",
      title: title || null,
      content: hasText ? normalizedContent : null,
      college: normalizedCollege,
      code: code || null,
      image: image || null,
      document_link: document_link || null,
      source: postSource,
      tags: Array.isArray(tags) ? tags : null,
      created_at: new Date().toISOString(),
    };

    let inserted = null;
    const { data: firstInsert, error: firstErr } = await supabase
      .from("posts")
      .insert([payload])
      .select()
      .limit(1);

    if (!firstErr) {
      inserted = firstInsert;
    } else {
      // Fallback for older schemas that do not yet have optional columns (e.g. document_link, image).
      const errMessage = String(firstErr.message || "");
      const missingOptionalColumn =
        errMessage.includes("document_link") || errMessage.includes("image");

      if (!missingOptionalColumn) {
        return res.status(500).json({ message: firstErr.message, details: firstErr });
      }

      const fallbackBase = hasText ? normalizedContent : "";
      const fallbackContent = document_link
        ? `${fallbackBase}${fallbackBase ? "\n\n" : ""}Link: ${document_link}`
        : fallbackBase;

      const fallbackPayload = {
        user_id: profile ? profile.id : null,
        author: profile?.name || decoded.name || decoded.email || "Anonymous",
        title: title || null,
        content: fallbackContent || null,
        college: normalizedCollege,
        code: code || null,
        source: postSource,
        tags: Array.isArray(tags) ? tags : null,
        created_at: new Date().toISOString(),
      };

      const { data: secondInsert, error: secondErr } = await supabase
        .from("posts")
        .insert([fallbackPayload])
        .select()
        .limit(1);

      if (secondErr) {
        return res.status(500).json({ message: secondErr.message, details: secondErr });
      }

      inserted = secondInsert;
    }

    return res.status(201).json({ post: (inserted && inserted[0]) || null });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// POST /api/posts/:id/like  -> add a like (service role insert)
router.post('/:id/like', verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const postId = req.params.id;

    let supabase;
    try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ message: e.message }); }

    let profile;
    try {
      profile = await resolveProfile(supabase, firebaseUid, req.firebaseDecoded);
    } catch (profileErr) {
      return res.status(500).json({ message: profileErr.message });
    }
    if (!profile) return res.status(400).json({ message: 'Profile not found' });

    // check existing like
    const { data: existing, error: existErr } = await supabase.from('likes').select('id').eq('post_id', postId).eq('user_id', profile.id).limit(1);
    if (existErr) return res.status(500).json({ message: existErr.message });

    if (existing && existing.length) {
      // already liked
      return res.status(200).json({ liked: true });
    }

    const { data: inserted, error: insertErr } = await supabase.from('likes').insert([{ post_id: postId, user_id: profile.id, created_at: new Date().toISOString() }]);
    if (insertErr) return res.status(500).json({ message: insertErr.message, details: insertErr });

    // increment posts.likes
    try {
      await supabase.from('posts').update({ likes: (await (async () => {
        const { data } = await supabase.from('posts').select('likes').eq('id', postId).limit(1);
        return ((data && data[0] && data[0].likes) || 0) + 1;
      })()) }).eq('id', postId);
    } catch (e) {
      // ignore post count update errors
    }

    return res.status(201).json({ liked: true });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// DELETE /api/posts/:id/like -> remove a like
router.delete('/:id/like', verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const postId = req.params.id;

    let supabase;
    try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ message: e.message }); }

    let profile;
    try {
      profile = await resolveProfile(supabase, firebaseUid, req.firebaseDecoded);
    } catch (profileErr) {
      return res.status(500).json({ message: profileErr.message });
    }
    if (!profile) return res.status(400).json({ message: 'Profile not found' });

    const { error: delErr } = await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', profile.id);
    if (delErr) return res.status(500).json({ message: delErr.message });

    // decrement posts.likes
    try {
      await supabase.from('posts').update({ likes: (await (async () => {
        const { data } = await supabase.from('posts').select('likes').eq('id', postId).limit(1);
        return Math.max(0, ((data && data[0] && data[0].likes) || 1) - 1);
      })()) }).eq('id', postId);
    } catch (e) {}

    return res.json({ liked: false });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// POST /api/posts/:id/comments -> add a comment (service role)
router.post('/:id/comments', verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const postId = req.params.id;
    const { content } = req.body;
    if (!content || !content.toString().trim()) return res.status(400).json({ message: 'Missing content' });

    let supabase;
    try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ message: e.message }); }

    let profile;
    try {
      profile = await resolveProfile(supabase, firebaseUid, req.firebaseDecoded);
    } catch (profileErr) {
      return res.status(500).json({ message: profileErr.message });
    }
    if (!profile) return res.status(400).json({ message: 'Profile not found' });

    const payload = { post_id: postId, user_id: profile.id, content: content.toString(), created_at: new Date().toISOString() };
    const { data: inserted, error: insertErr } = await supabase.from('comments').insert([payload]);
    if (insertErr) return res.status(500).json({ message: insertErr.message, details: insertErr });

    // increment posts.comments
    try {
      await supabase.from('posts').update({ comments: (await (async () => {
        const { data } = await supabase.from('posts').select('comments').eq('id', postId).limit(1);
        return ((data && data[0] && data[0].comments) || 0) + 1;
      })()) }).eq('id', postId);
    } catch (e) {}

    return res.status(201).json({ comment: inserted && inserted[0] });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// DELETE /api/posts/:id -> delete own post
router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const postId = req.params.id;

    let supabase;
    try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ message: e.message }); }

    let profile;
    try {
      profile = await resolveProfile(supabase, firebaseUid, req.firebaseDecoded);
    } catch (profileErr) {
      return res.status(500).json({ message: profileErr.message });
    }
    if (!profile) return res.status(400).json({ message: 'Profile not found' });

    const { data: rows, error: findErr } = await supabase
      .from('posts')
      .select('id,user_id')
      .eq('id', postId)
      .limit(1);

    if (findErr) return res.status(500).json({ message: findErr.message });
    const post = rows && rows[0];
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (!post.user_id || post.user_id !== profile.id) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }

    const { error: deleteErr } = await supabase.from('posts').delete().eq('id', postId);
    if (deleteErr) return res.status(500).json({ message: deleteErr.message });

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
